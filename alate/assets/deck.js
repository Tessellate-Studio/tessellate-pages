// One-page deck: panels slide over each other, rails of cards slide sideways.
// - Every .panel is position: sticky. A panel taller than the screen gets a
//   negative --stick so it scrolls to its end before the next one covers it.
// - --cover (0 → 1) grows as the next panel slides over, so the covered
//   panel recedes like a card in the app's Home deck (CSS does the drawing).
// - .dots gets one link per panel with a data-title; the current one is marked.
// - Each .rail-wrap gets prev/next buttons and one dot per card.
(function () {
  var panels = Array.prototype.slice.call(document.querySelectorAll('.deck > .panel'));
  var dots = document.querySelector('.dots');
  var dotLinks = [];
  var nav = document.querySelector('.nav');

  if (dots) {
    panels.forEach(function (p, i) {
      if (!p.id) p.id = 'panel-' + (i + 1);
      var a = document.createElement('a');
      a.href = '#' + p.id;
      a.setAttribute('aria-label', p.getAttribute('data-title') || ('Section ' + (i + 1)));
      a.title = a.getAttribute('aria-label');
      dots.appendChild(a);
      dotLinks.push(a);
    });
  }

  function measure() {
    var vh = window.innerHeight;
    panels.forEach(function (p) {
      p.style.setProperty('--stick', '0px');
      var h = p.offsetHeight;
      p.style.setProperty('--stick', Math.min(0, vh - h) + 'px');
    });
    update();
  }

  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    var current = 0;
    for (var i = 0; i < panels.length; i++) {
      var next = panels[i + 1];
      var cover = 0;
      if (next) {
        var top = next.getBoundingClientRect().top;
        cover = Math.max(0, Math.min(1, 1 - top / vh));
      }
      panels[i].style.setProperty('--cover', cover.toFixed(3));
      if (panels[i].getBoundingClientRect().top <= vh * 0.5) current = i;
    }
    dotLinks.forEach(function (a, i) {
      if (i === current) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    if (dots) dots.classList.toggle('on-paper', panels[current] && panels[current].classList.contains('paper'));
    // The bar takes the colours of whichever panel is under it.
    if (nav) {
      var under = 0;
      for (var k = 0; k < panels.length; k++) if (panels[k].getBoundingClientRect().top <= 34) under = k;
      nav.classList.toggle('on-paper', panels[under] && panels[under].classList.contains('paper'));
    }
  }

  function onScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }

  // A stuck panel reports where it is stuck, not where it sits in the page,
  // so jumping to #id would go nowhere. Jump to its place in the flow instead:
  // the sum of the panels before it.
  function flowTop(panel) {
    var y = panel.parentNode.getBoundingClientRect().top + window.scrollY;
    for (var i = 0; i < panels.length && panels[i] !== panel; i++) y += panels[i].offsetHeight;
    return y;
  }
  function jump(id, smooth) {
    var p = document.getElementById(id);
    if (!p || panels.indexOf(p) < 0) return false;
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: flowTop(p), behavior: smooth && !reduce ? 'smooth' : 'auto' });
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (id && jump(id, true)) {
      e.preventDefault();
      history.replaceState(null, '', '#' + id);
      var p = document.getElementById(id);
      p.setAttribute('tabindex', '-1');
      p.focus({ preventScroll: true });
    }
  });

  if (panels.length) {
    if (location.hash) window.addEventListener('load', function () { jump(location.hash.slice(1), false); });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    measure();
  }

  // ---- Rails ----
  var ARROW = {
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'
  };

  document.querySelectorAll('.rail-wrap').forEach(function (wrap) {
    var rail = wrap.querySelector('.rail');
    if (!rail) return;
    var cards = Array.prototype.slice.call(rail.children);
    var label = rail.getAttribute('aria-label') || 'cards';

    var ctrl = document.createElement('div');
    ctrl.className = 'rail-ctrl';
    var dotBox = document.createElement('div');
    dotBox.className = 'rail-dots';
    var btns = document.createElement('div');
    btns.className = 'rail-btns';
    var prev = document.createElement('button');
    prev.type = 'button'; prev.innerHTML = ARROW.prev; prev.setAttribute('aria-label', 'Previous ' + label);
    var next = document.createElement('button');
    next.type = 'button'; next.innerHTML = ARROW.next; next.setAttribute('aria-label', 'Next ' + label);
    btns.appendChild(prev); btns.appendChild(next);
    ctrl.appendChild(dotBox); ctrl.appendChild(btns);
    wrap.appendChild(ctrl);

    var dotBtns = cards.map(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      var h = c.querySelector('h3');
      b.setAttribute('aria-label', 'Go to card ' + (i + 1) + (h ? ': ' + h.textContent.trim() : ''));
      b.addEventListener('click', function () { go(i); });
      dotBox.appendChild(b);
      return b;
    });

    function step() {
      var first = cards[0], second = cards[1];
      if (!first) return rail.clientWidth;
      return second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
    }
    function index() { return Math.round(rail.scrollLeft / step()); }
    function go(i) {
      i = Math.max(0, Math.min(cards.length - 1, i));
      rail.scrollTo({ left: i * step(), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    function sync() {
      var i = index();
      var atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
      if (atEnd) i = cards.length - 1;
      dotBtns.forEach(function (b, j) {
        if (j === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
      prev.disabled = rail.scrollLeft <= 4;
      next.disabled = atEnd;
    }
    prev.addEventListener('click', function () { go(index() - 1); });
    next.addEventListener('click', function () { go(index() + 1); });
    rail.addEventListener('scroll', function () { window.requestAnimationFrame(sync); }, { passive: true });
    rail.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index() - 1); }
    });
    window.addEventListener('resize', sync);
    sync();
  });
})();
