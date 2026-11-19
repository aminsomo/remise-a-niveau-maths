/* ==========================================================================
   Remise à niveau STI2D → Prépa — moteur commun
   - barre de navigation, sommaire, chapitre précédent/suivant
   - thème clair/sombre, progression (localStorage)
   - quiz, exercices auto-générés ("drills"), traceur de courbes
   - rendu des formules avec KaTeX (si disponible)
   - plein écran des animations, brouillon + calculatrice (brouillon.js)
   Dépend de core.js (window.CourseCore : fonctions pures testées).
   Les scripts propres à une page s'exécutent dans un écouteur
   DOMContentLoaded et utilisent l'objet global `Course`.
   ========================================================================== */
(function () {
  'use strict';

  var CORE = window.CourseCore;

  var COURSE = window.COURSE || { subjects: [] };
  var body = document.body;
  var ROOT = body.dataset.root || '';
  var CHAPTER = body.dataset.chapter || null; // ex. "maths/suites"

  /* ---------- stockage tolérant aux erreurs ---------- */
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* navigation privée */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* idem */ } }
  };

  /* ---------- thème ---------- */
  var plots = [];
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    store.set('theme', t);
    plots.forEach(function (p) { p.redraw(); });
  }
  // Sombre par défaut (direction visuelle du site) ; le clair reste au choix de l'élève.
  document.documentElement.dataset.theme = store.get('theme') === 'light' ? 'light' : 'dark';

  /* ---------- utilitaires ---------- */
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'class') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  /* Icônes SVG dessinées (trait 2 px, couleur du texte). */
  var ICONS = {
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7h7"/><path d="M9 12h.01M12 12h.01M15 12h.01M9 15.5h.01M12 15.5h.01M15 15.5h.01M9 19h.01M12 19h3" stroke-width="2.4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    pen: '<path d="M4 20l1-4L16 5l3 3L8 19l-4 1z"/><path d="M14 7l3 3"/>',
    text: '<path d="M5 7V5h14v2M12 5v14M9 19h6"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    back: '<path d="M9 6h11v12H9l-6-6z"/><path d="M12 10l4 4M16 10l-4 4"/>',
    insert: '<path d="M4 12h13M12 6l6 6-6 6"/>',
    zoomIn: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.4-4.4M8 11h6M11 8v6"/>',
    zoomOut: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.4-4.4M8 11h6"/>',
    target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11.5V4a1.5 1.5 0 0 1 3 0v7.5M14 11.5V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L3.5 16a1.5 1.5 0 0 1 2.3-1.9L8 16"/>',
    flame: '<path d="M12 2.8c.9 3 4.8 5.3 4.8 10a4.8 4.8 0 0 1-9.6 0c0-2.5 1.3-4.2 2.7-5.3.1 1.9 1 3.1 2.2 3.6.2-2.9-.2-5.6-.1-8.3z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8.5 11V8a3.5 3.5 0 0 1 6.6-1.6"/>',
    award: '<circle cx="12" cy="9" r="5.5"/><path d="M8.7 13.4L7.5 21l4.5-2.4 4.5 2.4-1.2-7.6"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    retry: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4.5V9h4.5"/>',
    alert: '<path d="M12 3.5l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
    bulb: '<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
    play: '<rect x="3" y="5" width="18" height="14" rx="3.5"/><path d="M10.3 9.3v5.4l4.5-2.7z"/>',
    book: '<path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v12.5H8.5A3.5 3.5 0 0 1 5 17z"/><path d="M5 17a3.5 3.5 0 0 1 3.5-3.5H19"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="2.6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    expandSheet: '<path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6"/>'
  };
  function icon(name) {
    return '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
  }
  function slugify(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  }
  var fmt = CORE.fmt;
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function color(c) {
    if (!c) return cssVar('--c1');
    return c.indexOf('--') === 0 ? cssVar(c) : c;
  }
  /** Lit un nombre saisi : virgule, fractions « a/b », pi, e, sqrt(…), ln(…)… (évaluateur sûr de core.js). */
  var parseNum = CORE.parseNum;
  /**
   * Macros des grandeurs : chaque symbole porte la couleur de sa grandeur (classes .q-*),
   * la même que dans les curseurs, les cartes d'indicateurs et les graphiques.
   */
  var MACROS = {
    '\\QE': '\\htmlClass{q-E}{E}', '\\QEr': '\\htmlClass{q-E}{E_{\\text{reçue}}}',
    '\\QEu': '\\htmlClass{q-Eu}{E_{\\text{utile}}}', '\\QEp': '\\htmlClass{q-Ep}{E_{\\text{perdue}}}',
    '\\QP': '\\htmlClass{q-P}{P}', '\\Qt': '\\htmlClass{q-t}{\\Delta t}', '\\Qeta': '\\htmlClass{q-eta}{\\eta}',
    '\\QPr': '\\htmlClass{q-E}{P_{\\text{reçue}}}', '\\QPu': '\\htmlClass{q-Eu}{P_{\\text{utile}}}',
    '\\QPp': '\\htmlClass{q-Ep}{P_{\\text{perdue}}}', '\\q': '\\htmlClass{q-#1}{#2}'
  };
  function katexOptions(extra) {
    return Object.assign({
      throwOnError: false,
      trust: function (c) { return c.command === '\\htmlClass'; },
      strict: function (code) { return code === 'htmlExtension' ? 'ignore' : 'warn'; },
      macros: Object.assign({}, MACROS)
    }, extra || {});
  }
  function tex(target, latex, display) {
    if (window.katex) {
      try { window.katex.render(latex, target, katexOptions({ displayMode: !!display })); return; }
      catch (e) { /* repli texte */ }
    }
    target.textContent = latex;
  }
  /**
   * Une formule centrée qui enchaîne plusieurs égalités avec \qquad est trop large pour un
   * téléphone. Avant le rendu, on la découpe en morceaux posés dans une rangée qui passe à
   * la ligne (.math-row) : côte à côte sur ordinateur, les uns sous les autres sur mobile.
   */
  var splitTopLevel = CORE.splitTopLevel;
  function splitWideDisplays(root) {
    if (!document.createTreeWalker) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), found = [];
    while (walker.nextNode()) {
      var t = walker.currentNode;
      if (t.nodeValue.indexOf('\\[') >= 0 && t.nodeValue.indexOf('\\qquad') >= 0 &&
          !(t.parentNode.closest && t.parentNode.closest('script, pre, code, textarea, .katex'))) found.push(t);
    }
    found.forEach(function (t) {
      var src = t.nodeValue, re = /\\\[([\s\S]*?)\\\]/g, m, pos = 0, frag = document.createDocumentFragment(), changed = false;
      while ((m = re.exec(src))) {
        var parts = splitTopLevel(m[1], '\\qquad');
        if (parts.length < 2) continue;
        changed = true;
        frag.appendChild(document.createTextNode(src.slice(pos, m.index)));
        var row = el('span', { class: 'math-row' });
        parts.forEach(function (p) { row.appendChild(document.createTextNode('\\[' + p + '\\]')); row.appendChild(document.createTextNode(' ')); });
        frag.appendChild(row);
        pos = m.index + m[0].length;
      }
      if (!changed) return;
      frag.appendChild(document.createTextNode(src.slice(pos)));
      t.parentNode.replaceChild(frag, t);
    });
  }
  /** Rend les formules \( \) et \[ \] contenues dans un élément (utile pour du HTML injecté). */
  function renderMath(root) {
    splitWideDisplays(root);
    if (window.renderMathInElement) {
      window.renderMathInElement(root, katexOptions({
        delimiters: [
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false }
        ],
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'canvas']
      }));
    }
  }

  /* ---------- manifeste ---------- */
  var flat = [];
  COURSE.subjects.forEach(function (s) {
    s.chapters.forEach(function (c) {
      flat.push({ subject: s, chapter: c, key: s.id + '/' + c.slug, href: ROOT + s.id + '/' + c.slug + '.html' });
    });
  });
  function isDone(key) { return store.get('done:' + key) === '1'; }

  /* ---------- barre du haut ---------- */
  function buildTopbar() {
    var nav = el('nav', { 'aria-label': 'Matières', id: 'site-nav', class: 'site-nav' });
    COURSE.subjects.forEach(function (s) {
      var a = el('a', { href: ROOT + 'index.html#' + s.id, text: s.short || s.title });
      if (CHAPTER && CHAPTER.indexOf(s.id + '/') === 0) { a.className = 'active'; a.setAttribute('aria-current', 'true'); }
      nav.appendChild(a);
    });
    var theme = el('button', { class: 'icon-btn', type: 'button', title: 'Changer de thème', 'aria-label': 'Changer de thème' });
    function label() { theme.innerHTML = icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon'); }
    label();
    theme.addEventListener('click', function () {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); label();
    });
    // Sur téléphone, les matières passent dans un menu déroulant.
    var menu = el('button', { class: 'icon-btn menu-btn', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'site-nav', 'aria-label': 'Menu des matières' });
    menu.innerHTML = icon('menu');
    var brand = el('a', { class: 'brand', href: ROOT + 'index.html', html: 'STI2D <span>→</span> Prépa' });
    var bar = el('header', { class: 'topbar' }, [brand, nav, theme, menu]);
    function setOpen(open) {
      bar.classList.toggle('nav-open', open);
      menu.setAttribute('aria-expanded', String(open));
      menu.innerHTML = icon(open ? 'close' : 'menu');
    }
    menu.addEventListener('click', function () { setOpen(!bar.classList.contains('nav-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && bar.classList.contains('nav-open')) { setOpen(false); menu.focus(); } });
    body.insertBefore(bar, body.firstChild);
  }

  /* ---------- page chapitre : sommaire + pied ---------- */
  /* ---------- chapitre en 6 étapes : fil des étapes collant + pied ---------- */
  var STEP_STATE = {
    entrainement: function (st) { return st.unlocked ? icon('check') : icon('flame') + Math.min(st.streak, CORE.GATE.STREAK) + '/' + CORE.GATE.STREAK; },
    evaluation: function (st) { return st.unlocked ? (st.lastScore !== null ? st.lastScore + '/20' : icon('unlock')) : icon('lock'); },
    validation: function (st) { return st.validated ? icon('check') : ''; }
  };
  /** Même état, en mots (nom accessible du lien). */
  var STEP_SAY = {
    entrainement: function (st) { return st.unlocked ? 'série de ' + CORE.GATE.STREAK + ' réussie' : 'série ' + Math.min(st.streak, CORE.GATE.STREAK) + ' sur ' + CORE.GATE.STREAK; },
    evaluation: function (st) { return st.unlocked ? (st.lastScore !== null ? 'dernière note ' + st.lastScore + ' sur 20' : 'débloquée') : 'verrouillée'; },
    validation: function (st) { return st.validated ? 'chapitre validé' : 'pas encore validé'; }
  };
  function buildStepLayout(main) {
    var wrap = el('div', { class: 'layout-v2' });
    main.parentNode.insertBefore(wrap, main);
    wrap.appendChild(main);
    var steps = main.querySelectorAll('section.step');
    var ol = el('ol');
    var links = [];
    steps.forEach(function (sec, i) {
      var h = sec.querySelector('h2');
      var a = el('a', { href: '#' + sec.id }, [
        el('span', { class: 'step-dot', text: String(i + 1) }),
        el('span', { class: 'step-name', text: h ? h.textContent.trim() : sec.id }),
        el('span', { class: 'step-state', 'aria-hidden': 'true' })
      ]);
      a.dataset.step = sec.id;
      links.push(a);
      ol.appendChild(el('li', null, [a]));
    });
    var nav = el('nav', { class: 'steps', 'aria-label': 'Étapes du chapitre' }, [ol]);
    var head = main.querySelector('.chapter-head');
    if (head) head.insertAdjacentElement('afterend', nav); else main.insertBefore(nav, main.firstChild);
    function refresh(st) {
      links.forEach(function (a) {
        var f = STEP_STATE[a.dataset.step], s = a.querySelector('.step-state'), say = STEP_SAY[a.dataset.step];
        s.innerHTML = f ? f(st) : '';
        a.setAttribute('aria-label', a.querySelector('.step-name').textContent + (say ? ' : ' + say(st) : ''));
        a.classList.toggle('is-locked', a.dataset.step === 'evaluation' && !st.unlocked);
        a.classList.toggle('is-done', (a.dataset.step === 'validation' && st.validated) || (a.dataset.step === 'entrainement' && st.unlocked));
      });
    }
    onProgress(refresh);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          if (en.target === head) { links.forEach(function (a) { a.classList.remove('active'); a.removeAttribute('aria-current'); }); return; }
          links.forEach(function (a) {
            var on = a.dataset.step === en.target.id;
            a.classList.toggle('active', on);
            if (on) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
            if (on && a.scrollIntoView && ol.scrollWidth > ol.clientWidth) {
              ol.scrollTo({ left: a.parentNode.offsetLeft - 16, behavior: 'smooth' });
            }
          });
        });
      }, { rootMargin: '-30% 0px -60% 0px' });
      steps.forEach(function (s) { io.observe(s); });
      if (head) io.observe(head);
    }
    // pied : chapitre précédent (même matière) / suivant, ouvert seulement après validation
    var i = flat.findIndex(function (f) { return f.key === CHAPTER; });
    var subject = CHAPTER ? CHAPTER.split('/')[0] : '';
    var foot = el('nav', { class: 'chapter-foot', 'aria-label': 'Navigation entre chapitres' });
    var prev = i > 0 ? flat[i - 1] : null, next = i >= 0 && i < flat.length - 1 ? flat[i + 1] : null;
    if (prev && prev.subject.id !== subject) prev = null;
    foot.appendChild(prev ? el('a', { href: prev.href, text: '← ' + prev.chapter.title }) : el('span'));
    var nextSlot = el('span');
    foot.appendChild(nextSlot);
    main.appendChild(foot);
    if (next) onProgress(function (st) {
      var n = st.validated ? el('a', { href: next.href, text: next.chapter.title + ' →' })
        : el('span', { class: 'foot-locked', html: icon('lock') + esc(next.chapter.title) + ' : après validation' });
      foot.replaceChild(n, nextSlot);
      nextSlot = n;
    });
  }

  function buildChapterLayout() {
    var main = document.querySelector('main.chapter');
    if (!main) return;
    if (main.classList.contains('v2')) { buildStepLayout(main); return; }
    var wrap = el('div', { class: 'wrap layout' });
    var toc = el('aside', { class: 'toc', 'aria-label': 'Sommaire' });
    var list = el('ol');
    main.querySelectorAll('h2').forEach(function (h) {
      if (!h.id) h.id = slugify(h.textContent);
      list.appendChild(el('li', null, [el('a', { href: '#' + h.id, text: h.textContent })]));
    });
    toc.appendChild(el('p', { text: 'Sur cette page' }));
    toc.appendChild(list);
    main.parentNode.insertBefore(wrap, main);
    wrap.appendChild(toc);
    wrap.appendChild(main);

    // Sommaire repliable pour les écrans étroits (le sommaire latéral y est masqué).
    var mtoc = el('details', { class: 'toc-mobile' }, [el('summary', { text: 'Sur cette page' }), list.cloneNode(true)]);
    mtoc.addEventListener('click', function (e) { if (e.target.closest('a')) mtoc.open = false; });
    var head = main.querySelector('.chapter-head');
    if (head) head.insertAdjacentElement('afterend', mtoc); else main.insertBefore(mtoc, main.firstChild);

    // surlignage de la section courante
    if ('IntersectionObserver' in window) {
      var links = toc.querySelectorAll('a');
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id); });
          }
        });
      }, { rootMargin: '-15% 0px -75% 0px' });
      main.querySelectorAll('h2').forEach(function (h) { io.observe(h); });
    }

    // pied : précédent / terminé / suivant
    var i = flat.findIndex(function (f) { return f.key === CHAPTER; });
    var foot = el('nav', { class: 'chapter-foot', 'aria-label': 'Navigation entre chapitres' });
    var prev = i > 0 ? flat[i - 1] : null;
    var next = i >= 0 && i < flat.length - 1 ? flat[i + 1] : null;
    foot.appendChild(prev ? el('a', { href: prev.href, text: '← ' + prev.chapter.title }) : el('span'));
    if (CHAPTER) {
      var done = el('button', { class: 'btn done-toggle', type: 'button' });
      var refresh = function () {
        var d = isDone(CHAPTER);
        done.textContent = d ? '✓ Chapitre terminé' : 'Marquer comme terminé';
        done.classList.toggle('is-done', d);
      };
      done.addEventListener('click', function () {
        if (isDone(CHAPTER)) store.del('done:' + CHAPTER); else store.set('done:' + CHAPTER, '1');
        refresh();
      });
      refresh();
      foot.appendChild(done);
    }
    foot.appendChild(next ? el('a', { href: next.href, text: next.chapter.title + ' →' }) : el('span'));
    main.appendChild(foot);
  }

  /* ---------- quiz ---------- */
  function buildQuizzes() {
    document.querySelectorAll('.quiz').forEach(function (quiz) {
      var qs = quiz.querySelectorAll('.q');
      var score = el('p', { class: 'quiz-score', 'aria-live': 'polite' });
      score.hidden = true;
      var answered = 0, good = 0;
      qs.forEach(function (q) {
        var answer = parseInt(q.dataset.answer, 10);
        var items = q.querySelectorAll('.choices > li');
        items.forEach(function (li, idx) {
          var b = el('button', { type: 'button' });
          while (li.firstChild) b.appendChild(li.firstChild);
          li.appendChild(b);
          b.addEventListener('click', function () {
            if (q.classList.contains('answered')) return;
            q.classList.add('answered');
            answered++;
            if (idx === answer) good++;
            items.forEach(function (li2, j) {
              var bb = li2.querySelector('button');
              bb.disabled = true;
              if (j === answer) bb.classList.add('right');
              else if (j === idx) bb.classList.add('wrong');
            });
            if (answered === qs.length) {
              score.hidden = false;
              score.textContent = 'Score : ' + good + ' / ' + qs.length +
                (good === qs.length ? ' — parfait !' : good >= qs.length / 2 ? ' — bien, relis les explications.' : ' — reprends le cours puis recommence.');
              var again = el('button', { class: 'btn ghost', type: 'button', text: 'Recommencer', style: 'margin-left:1rem' });
              again.addEventListener('click', function () { location.reload(); });
              score.appendChild(again);
            }
          });
        });
      });
      quiz.appendChild(score);
    });
  }

  /* ---------- traceur de courbes ---------- */
  var piLabel = CORE.piLabel;

  /**
   * Course.plot(canvas, view, draw)
   * view : { xmin, xmax, ymin, ymax, grid, axes, piTicks, xlabel, ylabel, equal, positive }
 * (positive : pas d'étiquettes de graduation négatives, pour des grandeurs physiques positives)
   * draw(g) reçoit un objet g : fn, point, seg, arrow, area, poly, text, X, Y, ctx…
   * Retourne { redraw(view?), view, onPointer(cb) }.
   */
  function plot(canvas, view, draw) {
    var P = {
      canvas: canvas,
      view: Object.assign({ xmin: -5, xmax: 5, ymin: -5, ymax: 5, grid: true, axes: true }, view || {}),
      draw: draw,
      pointerCb: null,
      // caméra de l'élève (déplacement / zoom), indépendante de la fenêtre fixée par la page :
      // fx, fy en demi-largeurs de la fenêtre de base, z = facteur de zoom
      cam: { fx: 0, fy: 0, z: 1 },
      ev: null
    };
    P.redraw = function (v) { if (v) Object.assign(P.view, v); renderPlot(P); };
    P.onPointer = function (cb) { P.pointerCb = cb; if (P.tools) P.tools.setHand(true); };
    var raf = 0;
    function schedule() { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { renderPlot(P); }); }
    P.navigable = P.view.axes !== false && P.view.pan !== false;
    if (P.navigable) setupNavigation(P, schedule);

    var dragging = false;
    function handle(type) {
      return function (ev) {
        if (!P.pointerCb || (P.nav && P.nav.capturing(ev))) return;
        if (type === 'down') { dragging = true; canvas.setPointerCapture && canvas.setPointerCapture(ev.pointerId); }
        if (type === 'up') dragging = false;
        var d = P.toData(ev.clientX, ev.clientY);
        P.pointerCb(d[0], d[1], type, dragging);
      };
    }
    P.toData = function (clientX, clientY) {
      var r = canvas.getBoundingClientRect(), v = P.ev || P.view;
      return [v.xmin + (clientX - r.left) / r.width * (v.xmax - v.xmin), v.ymax - (clientY - r.top) / r.height * (v.ymax - v.ymin)];
    };
    canvas.addEventListener('pointerdown', handle('down'));
    canvas.addEventListener('pointermove', handle('move'));
    canvas.addEventListener('pointerup', handle('up'));
    canvas.addEventListener('pointercancel', handle('up'));
    canvas.coursePlot = P; // lecture seule, pour les tests de bout en bout
    plots.push(P);
    renderPlot(P);
    // Redessin dès que la taille réelle du canevas change (plein écran, rotation, sommaire…).
    if ('ResizeObserver' in window) {
      var last = canvas.clientWidth + 'x' + canvas.clientHeight;
      new ResizeObserver(function () {
        var now = canvas.clientWidth + 'x' + canvas.clientHeight;
        if (now === last) return;
        last = now;
        schedule();
      }).observe(canvas);
    }
    return P;
  }

  /**
   * Se déplacer dans le repère : glisser (souris, un doigt), pincer (deux doigts),
   * Ctrl + molette (ou molette seule en plein écran), boutons + − ⟲, flèches du clavier.
   * Si la page utilise déjà le glisser (déplacer un point), le déplacement passe par le bouton « main ».
   */
  function setupNavigation(P, schedule) {
    var canvas = P.canvas, cam = P.cam;
    var wrap = el('div', { class: 'plot-wrap' });
    canvas.parentNode.insertBefore(wrap, canvas);
    wrap.appendChild(canvas);
    canvas.setAttribute('tabindex', '0');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Graphique. Glisse pour te déplacer, pince ou Ctrl + molette pour zoomer ; au clavier : flèches, + et −, 0 pour recentrer.');

    var hand = false, handMode = false;
    function btn(name, label) {
      var b = el('button', { type: 'button', class: 'plot-tool', title: label, 'aria-label': label });
      b.innerHTML = icon(name);
      return b;
    }
    var bIn = btn('zoomIn', 'Zoomer'), bOut = btn('zoomOut', 'Dézoomer'), bHome = btn('target', 'Recentrer le graphique'), bHand = btn('hand', 'Se déplacer dans le repère');
    bHand.setAttribute('aria-pressed', 'false');
    bHand.hidden = true;
    var tools = el('div', { class: 'plot-tools' }, [bHand, bIn, bOut, bHome]);
    wrap.appendChild(tools);
    var hint = el('div', { class: 'plot-hint', 'aria-live': 'polite' });
    hint.hidden = true;
    wrap.appendChild(hint);
    var hintTimer = 0;
    function showHint(txt) { hint.textContent = txt; hint.hidden = false; clearTimeout(hintTimer); hintTimer = setTimeout(function () { hint.hidden = true; }, 1600); }

    function moved() { return Math.abs(cam.fx) > 1e-9 || Math.abs(cam.fy) > 1e-9 || Math.abs(cam.z - 1) > 1e-9; }
    function refresh() { bHome.hidden = !moved(); wrap.classList.toggle('is-moved', moved()); schedule(); }
    function base() { var v = P.view; return { cx: (v.xmin + v.xmax) / 2, cy: (v.ymin + v.ymax) / 2, hx: (v.xmax - v.xmin) / 2, hy: (v.ymax - v.ymin) / 2 }; }
    function pan(dxPix, dyPix) {
      var r = canvas.getBoundingClientRect(), ev = P.ev || P.view, b = base();
      cam.fx -= dxPix / r.width * (ev.xmax - ev.xmin) / b.hx;
      cam.fy += dyPix / r.height * (ev.ymax - ev.ymin) / b.hy;
      refresh();
    }
    function zoomAt(clientX, clientY, f) {
      var before = P.toData(clientX, clientY);
      cam.z = Math.min(200, Math.max(0.02, cam.z * f));
      P.ev = effectiveView(P, canvas.clientWidth, canvas.clientHeight);
      var after = P.toData(clientX, clientY), b = base();
      cam.fx += (before[0] - after[0]) / b.hx;
      cam.fy += (before[1] - after[1]) / b.hy;
      refresh();
    }
    function zoomCenter(f) { var r = canvas.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, f); }
    bIn.addEventListener('click', function () { zoomCenter(1.5); });
    bOut.addEventListener('click', function () { zoomCenter(1 / 1.5); });
    bHome.addEventListener('click', function () { cam.fx = cam.fy = 0; cam.z = 1; refresh(); canvas.focus(); });
    bHand.addEventListener('click', function () { handMode = !handMode; bHand.setAttribute('aria-pressed', String(handMode)); wrap.classList.toggle('hand-mode', handMode); });
    bHome.hidden = true;

    // gestes : un pointeur = déplacement, deux = pincer / déplacer
    var pts = {}, last = null;
    function count() { return Object.keys(pts).length; }
    function geom() {
      var k = Object.keys(pts), a = pts[k[0]], b2 = pts[k[1]];
      if (!b2) return { x: a.x, y: a.y, d: 0 };
      return { x: (a.x + b2.x) / 2, y: (a.y + b2.y) / 2, d: Math.hypot(a.x - b2.x, a.y - b2.y) };
    }
    function panAllowed() { return !hand || handMode || count() >= 2; }
    P.nav = { capturing: function (ev) { return panAllowed() && pts[ev.pointerId] !== undefined; } };
    canvas.addEventListener('pointerdown', function (ev) {
      if (ev.button !== undefined && ev.button > 0) return;
      pts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      if (!panAllowed()) { delete pts[ev.pointerId]; return; }
      canvas.setPointerCapture && canvas.setPointerCapture(ev.pointerId);
      last = geom();
      wrap.classList.add('is-dragging');
    });
    canvas.addEventListener('pointermove', function (ev) {
      if (!pts[ev.pointerId]) return;
      pts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      var g = geom();
      if (last) {
        pan(g.x - last.x, g.y - last.y);
        if (g.d && last.d) zoomAt(g.x, g.y, g.d / last.d);
      }
      last = g;
    });
    function up(ev) {
      if (!pts[ev.pointerId]) return;
      delete pts[ev.pointerId];
      last = count() ? geom() : null;
      if (!count()) wrap.classList.remove('is-dragging');
    }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', function (ev) {
      var inFs = !!canvas.closest('.is-fs');
      if (!(ev.ctrlKey || ev.metaKey || inFs)) { showHint('Ctrl + molette pour zoomer (ou les boutons + −)'); return; }
      ev.preventDefault();
      zoomAt(ev.clientX, ev.clientY, Math.exp(-ev.deltaY * (ev.deltaMode ? 0.05 : 0.0025)));
    }, { passive: false });
    canvas.addEventListener('keydown', function (ev) {
      var r = canvas.getBoundingClientRect(), step = 0.1;
      var map = { ArrowLeft: [-r.width * step, 0], ArrowRight: [r.width * step, 0], ArrowUp: [0, -r.height * step], ArrowDown: [0, r.height * step] };
      if (map[ev.key]) { ev.preventDefault(); pan(-map[ev.key][0], -map[ev.key][1]); }
      else if (ev.key === '+' || ev.key === '=') { ev.preventDefault(); zoomCenter(1.25); }
      else if (ev.key === '-' || ev.key === '_') { ev.preventDefault(); zoomCenter(0.8); }
      else if (ev.key === '0') { ev.preventDefault(); bHome.click(); }
    });
    P.tools = { setHand: function (on) { hand = on; bHand.hidden = !on; wrap.classList.toggle('has-hand', on); } };
  }

  /** Fenêtre réellement affichée = fenêtre de la page (orthonormée si besoin) + caméra de l'élève. */
  function effectiveView(P, w, h) {
    var v = P.view, cam = P.cam;
    if (v.equal && w && h) { // repère orthonormé : on ajuste y autour du centre
      var cy0 = (v.ymin + v.ymax) / 2, half = (v.xmax - v.xmin) * h / w / 2;
      v.ymin = cy0 - half; v.ymax = cy0 + half;
    }
    var hx = (v.xmax - v.xmin) / 2, hy = (v.ymax - v.ymin) / 2;
    var cx = (v.xmin + v.xmax) / 2 + cam.fx * hx, cy = (v.ymin + v.ymax) / 2 + cam.fy * hy;
    var e = Object.assign({}, v);
    e.xmin = cx - hx / cam.z; e.xmax = cx + hx / cam.z;
    e.ymin = cy - hy / cam.z; e.ymax = cy + hy / cam.z;
    return e;
  }

  function renderPlot(P) {
    var c = P.canvas;
    var dpr = window.devicePixelRatio || 1;
    var w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    var v = P.ev = effectiveView(P, w, h);
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    var ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    function X(x) { return (x - v.xmin) / (v.xmax - v.xmin) * w; }
    function Y(y) { return h - (y - v.ymin) / (v.ymax - v.ymin) * h; }
    // Taille de police : lisible sur téléphone, un peu plus grande en plein écran.
    var big = !!c.closest('.is-fs');
    var fsize = big ? 15 : (w < 480 ? 13 : 12.5);
    var font = '500 ' + fsize + 'px ' + cssVar('--font');
    var axisCol = cssVar('--plot-axis'), gridCol = cssVar('--plot-grid'), textCol = cssVar('--muted'), haloCol = cssVar('--bg');
    ctx.font = font;

    // Pas des graduations calculé en pixels : les étiquettes ne se chevauchent jamais.
    var spanX = v.xmax - v.xmin, spanY = v.ymax - v.ymin;
    var sx, sy;
    // pas imposé par la page, sauf s'il devient illisible après un dézoom (≥ étendue = « pas d'étiquettes »)
    if (v.xstep && (w * v.xstep / spanX >= 30 || v.xstep >= spanX)) sx = v.xstep;
    else if (v.piTicks) { sx = Math.PI / 2; while (w * sx / spanX < 46) sx *= 2; }
    else {
      sx = CORE.tickStep(spanX, w, 52);
      for (var tries = 0; tries < 4; tries++) { // élargit si les étiquettes sont longues (ex. 12 500)
        var dx = CORE.decimalsFor(sx), widest = Math.max(ctx.measureText(fmt(v.xmin, dx)).width, ctx.measureText(fmt(v.xmax, dx)).width);
        if (w * sx / spanX >= widest + 14) break;
        sx = CORE.niceStep(sx * 2.5);
      }
    }
    sy = v.ystep && (h * v.ystep / spanY >= 22 || v.ystep >= spanY) ? v.ystep : CORE.tickStep(spanY, h, fsize * 2.6);
    var decX = CORE.decimalsFor(sx), decY = CORE.decimalsFor(sy);

    function label(str, x, y, align, base) {
      ctx.textAlign = align; ctx.textBaseline = base;
      ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.strokeStyle = haloCol;
      ctx.strokeText(str, x, y);
      ctx.fillText(str, x, y);
    }

    ctx.lineWidth = 1;
    if (v.grid) {
      ctx.strokeStyle = gridCol; ctx.beginPath();
      for (var gx = Math.ceil(v.xmin / sx) * sx; gx <= v.xmax + 1e-9; gx += sx) { ctx.moveTo(Math.round(X(gx)) + .5, 0); ctx.lineTo(Math.round(X(gx)) + .5, h); }
      for (var gy = Math.ceil(v.ymin / sy) * sy; gy <= v.ymax + 1e-9; gy += sy) { ctx.moveTo(0, Math.round(Y(gy)) + .5); ctx.lineTo(w, Math.round(Y(gy)) + .5); }
      ctx.stroke();
    }
    if (v.axes) {
      var ax = Math.min(Math.max(Y(0), 0), h), ay = Math.min(Math.max(X(0), 0), w);
      ctx.strokeStyle = axisCol; ctx.lineWidth = 1.3; ctx.beginPath();
      ctx.moveTo(0, ax); ctx.lineTo(w, ax); ctx.moveTo(ay, 0); ctx.lineTo(ay, h); ctx.stroke();
      ctx.fillStyle = textCol; ctx.font = font;
      // étiquettes de l'axe des abscisses : sous l'axe, ou au-dessus s'il touche le bas
      var below = ax + 5 + fsize <= h;
      var k0 = Math.ceil(v.xmin / sx - 1e-9);
      for (var k = k0; k * sx <= v.xmax + 1e-9; k++) {
        var tx = k * sx; if (Math.abs(tx) < sx * 1e-6 || (v.positive && tx < 0)) continue;
        var lbl = v.piTicks ? piLabel(Math.round(tx / (Math.PI / 2))) : fmt(tx, decX);
        var pos = CORE.clampLabel(X(tx), ctx.measureText(lbl).width, w, 3);
        label(lbl, pos.x, below ? ax + 5 : ax - 5, pos.align, below ? 'top' : 'bottom');
      }
      // étiquettes de l'axe des ordonnées : à gauche de l'axe, ou à droite s'il touche le bord gauche
      var right = ay < 44;
      for (var ty = Math.ceil(v.ymin / sy - 1e-9) * sy; ty <= v.ymax + 1e-9; ty += sy) {
        if (Math.abs(ty) < sy * 1e-6 || (v.positive && ty < 0)) continue;
        var py = Y(ty);
        if (py < fsize * 0.6 || py > h - fsize * 0.6) continue;
        label(fmt(ty, decY), right ? ay + 6 : ay - 6, py, right ? 'left' : 'right', 'middle');
      }
      ctx.font = '600 ' + fsize + 'px ' + cssVar('--font');
      if (v.xlabel) label(v.xlabel, w - 4, below ? ax - 5 : ax + 5, 'right', below ? 'bottom' : 'top');
      if (v.ylabel) label(v.ylabel, right ? ay + 6 : ay + 6, 4, 'left', 'top');
      ctx.font = font;
    }

    var g = {
      ctx: ctx, X: X, Y: Y, w: w, h: h, view: v,
      fn: function (f, col, o) {
        o = o || {};
        var a = o.from !== undefined ? o.from : v.xmin, b = o.to !== undefined ? o.to : v.xmax;
        var n = Math.max(200, Math.round(w * 2));
        ctx.save(); ctx.strokeStyle = color(col); ctx.lineWidth = o.width || 2.2;
        if (o.dash) ctx.setLineDash(o.dash);
        ctx.beginPath();
        var pen = false, lastPy = null;
        for (var i = 0; i <= n; i++) {
          var x = a + (b - a) * i / n, y;
          try { y = f(x); } catch (e) { y = NaN; }
          var py = Y(y);
          if (!isFinite(py) || py < -5 * h || py > 6 * h || (lastPy !== null && Math.abs(py - lastPy) > 3 * h)) {
            pen = false; lastPy = isFinite(py) ? py : null; continue;
          }
          if (pen) ctx.lineTo(X(x), py); else { ctx.moveTo(X(x), py); pen = true; }
          lastPy = py;
        }
        ctx.stroke(); ctx.restore();
      },
      param: function (fx, fy, t0, t1, col, o) {
        o = o || {};
        ctx.save(); ctx.strokeStyle = color(col); ctx.lineWidth = o.width || 2.2;
        if (o.dash) ctx.setLineDash(o.dash);
        ctx.beginPath();
        for (var i = 0; i <= 400; i++) {
          var t = t0 + (t1 - t0) * i / 400;
          if (i === 0) ctx.moveTo(X(fx(t)), Y(fy(t))); else ctx.lineTo(X(fx(t)), Y(fy(t)));
        }
        ctx.stroke(); ctx.restore();
      },
      point: function (x, y, col, label, o) {
        o = o || {};
        ctx.save(); ctx.fillStyle = color(col);
        ctx.beginPath(); ctx.arc(X(x), Y(y), o.r || 4.5, 0, 2 * Math.PI); ctx.fill();
        if (label) {
          ctx.font = 'bold ' + (fsize + 1) + 'px ' + cssVar('--font'); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
          ctx.lineWidth = 3; ctx.strokeStyle = haloCol; ctx.lineJoin = 'round';
          ctx.strokeText(label, X(x) + 6, Y(y) - 4);
          ctx.fillText(label, X(x) + 6, Y(y) - 4);
        }
        ctx.restore();
      },
      seg: function (x1, y1, x2, y2, col, o) {
        o = o || {};
        ctx.save(); ctx.strokeStyle = color(col); ctx.lineWidth = o.width || 1.6;
        if (o.dash) ctx.setLineDash(o.dash);
        ctx.beginPath(); ctx.moveTo(X(x1), Y(y1)); ctx.lineTo(X(x2), Y(y2)); ctx.stroke(); ctx.restore();
      },
      arrow: function (x1, y1, x2, y2, col, label, o) {
        o = o || {};
        var X1 = X(x1), Y1 = Y(y1), X2 = X(x2), Y2 = Y(y2);
        var ang = Math.atan2(Y2 - Y1, X2 - X1), L = Math.hypot(X2 - X1, Y2 - Y1);
        ctx.save(); ctx.strokeStyle = ctx.fillStyle = color(col); ctx.lineWidth = o.width || 2.2;
        ctx.beginPath(); ctx.moveTo(X1, Y1); ctx.lineTo(X2, Y2); ctx.stroke();
        if (L > 4) {
          var s = Math.min(11, L / 2);
          ctx.beginPath(); ctx.moveTo(X2, Y2);
          ctx.lineTo(X2 - s * Math.cos(ang - .4), Y2 - s * Math.sin(ang - .4));
          ctx.lineTo(X2 - s * Math.cos(ang + .4), Y2 - s * Math.sin(ang + .4));
          ctx.closePath(); ctx.fill();
        }
        if (label) {
          ctx.font = 'bold ' + (fsize + 1) + 'px ' + cssVar('--font'); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
          ctx.lineWidth = 3; ctx.strokeStyle = haloCol; ctx.lineJoin = 'round';
          ctx.strokeText(label, (X1 + X2) / 2 + 6, (Y1 + Y2) / 2 - 4);
          ctx.fillText(label, (X1 + X2) / 2 + 6, (Y1 + Y2) / 2 - 4);
        }
        ctx.restore();
      },
      area: function (f, a, b, col, o) {
        o = o || {};
        var lower = o.lower || function () { return 0; };
        ctx.save(); ctx.fillStyle = color(col); ctx.globalAlpha = o.alpha || 0.22;
        ctx.beginPath(); var n = 200;
        for (var i = 0; i <= n; i++) { var x = a + (b - a) * i / n; var yy = Y(f(x)); if (i === 0) ctx.moveTo(X(x), yy); else ctx.lineTo(X(x), yy); }
        for (var j = n; j >= 0; j--) { var x2 = a + (b - a) * j / n; ctx.lineTo(X(x2), Y(lower(x2))); }
        ctx.closePath(); ctx.fill(); ctx.restore();
      },
      poly: function (pts, col, o) {
        o = o || {};
        ctx.save(); ctx.strokeStyle = ctx.fillStyle = color(col); ctx.lineWidth = o.width || 1.6;
        ctx.beginPath();
        pts.forEach(function (p, i) { if (i === 0) ctx.moveTo(X(p[0]), Y(p[1])); else ctx.lineTo(X(p[0]), Y(p[1])); });
        if (o.close) ctx.closePath();
        if (o.fill) { ctx.globalAlpha = o.alpha || 0.2; ctx.fill(); ctx.globalAlpha = 1; }
        ctx.stroke(); ctx.restore();
      },
      circle: function (x, y, r, col, o) {
        o = o || {};
        ctx.save(); ctx.strokeStyle = color(col); ctx.lineWidth = o.width || 1.6;
        if (o.dash) ctx.setLineDash(o.dash);
        ctx.beginPath(); ctx.ellipse(X(x), Y(y), Math.abs(X(x + r) - X(x)), Math.abs(Y(y + r) - Y(y)), 0, 0, 2 * Math.PI);
        ctx.stroke(); ctx.restore();
      },
      text: function (x, y, str, col, o) {
        o = o || {};
        ctx.save(); ctx.fillStyle = color(col || '--text');
        ctx.font = (o.bold ? 'bold ' : '') + ((o.size || 13) + (big ? 2 : 0)) + 'px ' + cssVar('--font');
        ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.baseline || 'middle';
        var tx = X(x) + (o.dx || 0), ty = Y(y) + (o.dy || 0);
        if (o.halo) { ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = cssVar('--bg'); ctx.strokeText(str, tx, ty); }
        ctx.fillText(str, tx, ty); ctx.restore();
      }
    };
    if (P.draw) P.draw(g);
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { plots.forEach(function (p) { p.redraw(); }); }, 120);
  });

  /* ---------- plein écran des animations ---------- */
  /**
   * Chaque .widget qui contient un graphique reçoit un bouton « plein écran ».
   * Le widget passe en position fixe (fonctionne aussi sur iPhone, où l'API Fullscreen
   * n'existe pas pour les éléments) ; on demande en plus le vrai plein écran quand le
   * navigateur le permet (Android, ordinateur, iPad) pour masquer les barres du navigateur.
   * Graphique à gauche et réglages à droite en paysage, réglages sous le graphique en portrait.
   */
  var fsActive = null;
  function nativeFsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function setupFullscreen(widget) {
    if (!widget.querySelector('canvas')) return;
    var btn = el('button', { class: 'icon-btn fs-btn', type: 'button', 'aria-label': 'Afficher en plein écran', title: 'Plein écran' });
    btn.innerHTML = icon('expand');
    widget.classList.add('has-fs');
    widget.insertBefore(btn, widget.firstChild);
    var saved = null;

    function enter() {
      if (fsActive) fsActive.exit();
      var nodes = Array.prototype.slice.call(widget.childNodes).filter(function (n) { return n !== btn; });
      var head = el('div', { class: 'fs-head' }), stage = el('div', { class: 'fs-stage' }), panel = el('div', { class: 'fs-panel' });
      nodes.forEach(function (n) {
        if (n.nodeType !== 1) { panel.appendChild(n); return; }
        if (n.tagName === 'CANVAS' || n.querySelector('canvas')) stage.appendChild(n);
        else if (n.classList.contains('widget-title') || n.tagName === 'H3') head.appendChild(n);
        else panel.appendChild(n);
      });
      head.appendChild(btn);
      widget.appendChild(head); widget.appendChild(stage); widget.appendChild(panel);
      saved = { nodes: nodes, head: head, stage: stage, panel: panel, scrollY: window.scrollY };
      widget.classList.add('is-fs');
      widget.setAttribute('role', 'dialog');
      widget.setAttribute('aria-modal', 'true');
      document.documentElement.classList.add('fs-lock');
      btn.innerHTML = icon('close');
      btn.setAttribute('aria-label', 'Quitter le plein écran'); btn.title = 'Quitter le plein écran';
      var req = widget.requestFullscreen || widget.webkitRequestFullscreen;
      if (req) {
        try { var pr = req.call(widget); if (pr && pr.catch) pr.catch(function () { /* refusé : le mode fixe suffit */ }); }
        catch (e) { /* idem */ }
      }
      fsActive = api;
      btn.focus();
    }
    function exit() {
      if (!saved) return;
      var s = saved; saved = null;
      if (nativeFsElement() === widget) {
        var ex = document.exitFullscreen || document.webkitExitFullscreen;
        if (ex) { try { var pr = ex.call(document); if (pr && pr.catch) pr.catch(function () {}); } catch (e) { /* ignoré */ } }
      }
      widget.insertBefore(btn, widget.firstChild);
      s.nodes.forEach(function (n) { widget.appendChild(n); });
      [s.head, s.stage, s.panel].forEach(function (d) { if (d.parentNode) d.parentNode.removeChild(d); });
      widget.classList.remove('is-fs');
      widget.removeAttribute('role'); widget.removeAttribute('aria-modal');
      document.documentElement.classList.remove('fs-lock');
      btn.innerHTML = icon('expand');
      btn.setAttribute('aria-label', 'Afficher en plein écran'); btn.title = 'Plein écran';
      window.scrollTo(0, s.scrollY);
      fsActive = null;
      btn.focus();
    }
    var api = { exit: exit, widget: widget };
    btn.addEventListener('click', function () { if (saved) exit(); else enter(); });
  }
  function onNativeFsChange() {
    // Sortie du plein écran natif (touche Échap, geste retour Android) : on quitte aussi le mode fixe.
    if (fsActive && nativeFsElement() !== fsActive.widget) fsActive.exit();
  }
  document.addEventListener('fullscreenchange', onNativeFsChange);
  document.addEventListener('webkitfullscreenchange', onNativeFsChange);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && fsActive) fsActive.exit(); });

  /* ---------- contrôles ---------- */
  /**
   * Course.onInput(root, fn) : appelle fn(vals) à chaque modification d'un champ [data-k]
   * situé dans root. Les <output data-show="k"> affichent la valeur du champ k.
   */
  function onInput(root, fn) {
    if (typeof root === 'string') root = document.querySelector(root);
    function read() {
      var vals = {};
      root.querySelectorAll('[data-k]').forEach(function (inp) {
        var k = inp.dataset.k;
        if (inp.type === 'checkbox') vals[k] = inp.checked;
        else if (inp.type === 'range' || inp.type === 'number') vals[k] = parseFloat(inp.value);
        else vals[k] = inp.value;
      });
      // remplissage coloré des curseurs (.slider) : --pct = position du curseur
      root.querySelectorAll('input[type="range"]').forEach(function (inp) {
        var lo = parseFloat(inp.min) || 0, hi = parseFloat(inp.max), v = parseFloat(inp.value);
        if (isFinite(hi) && hi > lo) inp.style.setProperty('--pct', ((v - lo) / (hi - lo) * 100).toFixed(2) + '%');
      });
      root.querySelectorAll('output[data-show]').forEach(function (o) {
        var v = vals[o.dataset.show];
        o.textContent = typeof v === 'number' ? fmt(v, parseInt(o.dataset.digits || '3', 10)) : v;
      });
      fn(vals);
    }
    root.addEventListener('input', read);
    root.addEventListener('change', read);
    read();
    return read;
  }

  /* ---------- exercices auto-générés ---------- */
  /**
   * Course.drill(root, gen) : gen() renvoie { q: "LaTeX" | {html}, answer: nombre, tol?, explain?: "HTML" }.
   * root doit contenir .drill-q, input, .drill-check, .drill-new, .feedback (créés si absents).
   */
  function rand(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function drill(root, gen) {
    if (typeof root === 'string') root = document.querySelector(root);
    var qEl = root.querySelector('.drill-q') || root.appendChild(el('div', { class: 'drill-q' }));
    var row = root.querySelector('.drill') || root.appendChild(el('div', { class: 'drill' }));
    var input = row.querySelector('input') || row.appendChild(el('input', { type: 'text', 'aria-label': 'Ta réponse', placeholder: 'ta réponse' }));
    input.setAttribute('autocomplete', 'off'); input.setAttribute('autocapitalize', 'off'); input.setAttribute('spellcheck', 'false');
    if (!input.placeholder) input.placeholder = 'ta réponse';
    var check = row.querySelector('.drill-check') || row.appendChild(el('button', { class: 'btn drill-check', type: 'button', text: 'Vérifier' }));
    // Bouton « calculatrice » juste à côté de « Vérifier » : ouvre le brouillon (brouillon.js).
    var calc = row.querySelector('.drill-calc');
    if (!calc) {
      calc = el('button', { class: 'btn ghost icon-only drill-calc', type: 'button', title: 'Brouillon et calculatrice', 'aria-label': 'Ouvrir le brouillon et la calculatrice', 'aria-haspopup': 'dialog' });
      calc.innerHTML = icon('calc');
      check.insertAdjacentElement('afterend', calc);
    }
    var nouveau = row.querySelector('.drill-new') || row.appendChild(el('button', { class: 'btn ghost drill-new', type: 'button', text: 'Nouvelle question' }));
    var fb = root.querySelector('.feedback') || root.appendChild(el('p', { class: 'feedback', 'aria-live': 'polite' }));
    var streakEl = root.querySelector('.streak') || root.appendChild(el('p', { class: 'hint streak' }));
    var cur, streak = 0, total = 0, ok = 0;
    function next() {
      cur = gen();
      input.value = ''; fb.textContent = ''; fb.className = 'feedback';
      if (cur.html) { qEl.innerHTML = cur.html; renderMath(qEl); }
      else tex(qEl, cur.q, true);
    }
    function verify() {
      var v = parseNum(input.value);
      if (isNaN(v)) { fb.className = 'feedback ko'; fb.textContent = 'Saisie non reconnue (ex. : 2,5 ou 3/4 ou -2).'; return; }
      total++;
      var tol = cur.tol !== undefined ? cur.tol : 1e-6 + 1e-6 * Math.abs(cur.answer);
      var good = Math.abs(v - cur.answer) <= tol;
      if (good) { ok++; streak++; } else streak = 0;
      fb.className = 'feedback ' + (good ? 'ok' : 'ko');
      fb.innerHTML = (good ? '✓ Correct !' : '✗ Pas tout à fait. Réponse attendue : ' + fmt(cur.answer, 4) + '.') +
        (cur.explain ? ' <span style="font-weight:400">' + cur.explain + '</span>' : '');
      renderMath(fb);
      streakEl.textContent = ok + ' / ' + total + ' réussies' + (streak >= 3 ? ' · série de ' + streak + ' 🔥' : '');
    }
    // Accès en lecture pour les tests de bout en bout (vérifient chaque générateur).
    root.courseDrill = { current: function () { return cur; }, next: function () { next(); } };
    check.addEventListener('click', verify);
    calc.addEventListener('click', function () {
      if (window.CourseSheet) window.CourseSheet.open({ question: qEl, input: input, verify: verify, opener: calc });
    });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') verify(); });
    nouveau.addEventListener('click', next);
    next();
  }

  /* ==========================================================================
     Parcours d'un chapitre en 6 étapes : entraînement → évaluation → validation
     La progression (série, déblocage, notes) est enregistrée dans localStorage
     sous « progress:<chapitre> » ; les règles sont dans core.js (GATE, progress*).
     ========================================================================== */
  var coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function badgeHtml(b) { return '<span class="badge ' + esc(b.cls || 'info') + '">' + (b.icon ? icon(b.icon) : '') + esc(b.text) + '</span>'; }
  function progressKey(ch) { return 'progress:' + (ch || CHAPTER); }
  function getProgress(ch) { return CORE.progressRead(store.get(progressKey(ch))); }
  function setProgress(st, ch) {
    store.set(progressKey(ch), JSON.stringify(st));
    if (st.validated) store.set('done:' + (ch || CHAPTER), '1');
    document.dispatchEvent(new CustomEvent('course:progress', { detail: st }));
  }
  /** fn(état) maintenant, puis à chaque changement de progression. */
  function onProgress(fn) {
    document.addEventListener('course:progress', function (e) { fn(e.detail); });
    fn(getProgress());
  }
  function nextChapter() {
    var i = flat.findIndex(function (f) { return f.key === CHAPTER; });
    return i >= 0 && i < flat.length - 1 ? flat[i + 1] : null;
  }
  function scrollToId(id) {
    var t = document.getElementById(id);
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  /** Jauge « série de 5 » (5 segments). */
  function gateEl() {
    var N = CORE.GATE.STREAK, bar = el('div', { class: 'gate-bar', 'aria-hidden': 'true' });
    for (var i = 0; i < N; i++) bar.appendChild(el('i'));
    var txt = el('span'), count = el('b');
    var g = el('div', { class: 'gate', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(N) }, [el('div', { class: 'gate-label' }, [txt, count]), bar]);
    g.update = function (st) {
      var n = Math.min(st.streak, N), open = st.unlocked;
      g.classList.toggle('open', open);
      Array.prototype.forEach.call(bar.children, function (b, k) { b.classList.toggle('on', open || k < n); });
      txt.textContent = open ? 'Évaluation débloquée' : 'Série pour débloquer l’évaluation';
      count.textContent = (open ? N : n) + ' / ' + N;
      g.setAttribute('aria-valuenow', String(open ? N : n));
      g.setAttribute('aria-label', txt.textContent + ' : ' + count.textContent);
    };
    return g;
  }
  function verdictEl(kind, iconName, title, html, actions) {
    var v = el('div', { class: 'verdict ' + kind, role: kind === 'ok' ? 'status' : 'alert' }, [
      el('span', { class: 'v-icon', html: icon(iconName) }),
      el('p', { class: 'v-title', text: title }),
      el('div', { class: 'v-text', html: html || '' })
    ]);
    if (actions && actions.length) v.appendChild(el('div', { class: 'v-actions' }, actions));
    renderMath(v);
    return v;
  }
  function answerText(q) {
    if (q.choices) return q.choices[q.answer].html;
    return CORE.fmtNum(q.answer, q.sig || 3) + (q.unit ? ' ' + q.unit : '');
  }
  var CHEERS = ['Exact !', 'Bravo !', 'Parfait !', 'Bien vu !', 'Juste !'];

  /**
   * Course.trainer(racine, générateur, options) : entraînement « à la Duolingo ».
   * Le générateur renvoie { type, ask, html, answer, unit, tol?, traps?: [{ value, msg }], solution }
   * ou, pour un QCM, { type, ask, html, choices: [{ html, why? }], answer: indice, solution }.
   * Une réponse juste du premier coup fait monter la série ; 5 de suite débloquent l'évaluation.
   * Une erreur fréquente reconnue (piège) est expliquée avant la solution complète.
   * options.workspace : hôte du brouillon + calculatrice intégré à la page.
   */
  function trainer(root, gen, opts) {
    opts = opts || {};
    if (typeof root === 'string') root = document.querySelector(root);
    root.classList.add('trainer');
    root.innerHTML = '';
    var streak = el('span', { class: 'streak', title: 'Bonnes réponses de suite, du premier coup' });
    var gate = gateEl(), stats = el('span', { class: 'trainer-stats' });
    root.appendChild(el('div', { class: 'trainer-top' }, [streak, gate, stats]));

    var badge = el('span', { class: 'badge info' }), ask = el('p', { class: 'q-ask' });
    var qEl = el('div', { class: 'drill-q' });
    var input = el('input', { type: 'text', 'aria-label': 'Ta réponse', placeholder: 'Ta réponse', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'done' });
    var unit = el('span', { class: 'unit' });
    var check = el('button', { class: 'btn drill-check', type: 'button', text: 'Vérifier' });
    var calc = el('button', { class: 'btn ghost icon-only drill-calc', type: 'button', title: 'Brouillon et calculatrice en plein écran', 'aria-label': 'Ouvrir le brouillon et la calculatrice en plein écran', 'aria-haspopup': 'dialog' });
    calc.innerHTML = icon('calc');
    var skip = el('button', { class: 'btn ghost drill-new', type: 'button', text: 'Passer' });
    var answer = el('div', { class: 'answer' }, [el('label', { class: 'field' }, [input, unit]), check, calc, skip]);
    var formats = el('p', { class: 'formats', text: 'Formats acceptés : 2,5 · 3/4 · 7,92e8 · 7,92 × 10^8' });
    answer.addEventListener('animationend', function () { answer.classList.remove('shake'); });
    input.addEventListener('input', function () { answer.classList.remove('is-ko'); });
    var choices = el('ul', { class: 'choices-grid' });
    var verdict = el('div', { class: 'verdict-host', 'aria-live': 'polite' });
    var sol = el('div', { class: 'solution-host' });
    var fb = el('p', { class: 'feedback sr-only', 'aria-live': 'polite' });
    root.appendChild(el('div', { class: 'trainer-body' }, [el('div', { class: 'q-type' }, [badge]), ask, qEl, answer, formats, choices, verdict, sol, fb]));

    var cur = null, attempts = 0, done = false, unlockedBefore = getProgress().unlocked, skipArmed = 0;
    function refreshTop(st, bump) {
      streak.innerHTML = icon('flame') + '<span>' + st.streak + '</span><span class="sr-only"> bonnes réponses de suite</span>';
      streak.classList.toggle('hot', st.streak > 0);
      if (bump) { streak.classList.remove('bump'); void streak.offsetWidth; streak.classList.add('bump'); }
      gate.update(st);
      stats.textContent = st.answered ? st.correct + ' juste' + (st.correct > 1 ? 's' : '') + ' sur ' + st.answered : '';
    }
    function context() { return { question: qEl, input: cur && !cur.choices ? input : null, verify: function () { submit(parseNum(input.value)); }, opener: calc }; }
    function next(focus) {
      cur = gen(); attempts = 0; done = false;
      badge.textContent = cur.type || 'Question';
      ask.textContent = cur.ask || ''; ask.hidden = !cur.ask;
      if (cur.html) { qEl.innerHTML = cur.html; renderMath(qEl); } else tex(qEl, cur.q || '', true);
      verdict.innerHTML = ''; sol.innerHTML = '';
      fb.textContent = ''; fb.className = 'feedback sr-only';
      var mcq = !!cur.choices;
      answer.hidden = mcq; formats.hidden = mcq; choices.hidden = !mcq;
      answer.classList.remove('shake', 'is-ko', 'is-ok');
      skip.hidden = false; disarmSkip();
      if (mcq) buildChoices();
      else { input.value = ''; input.disabled = false; check.disabled = false; unit.textContent = cur.unit || ''; }
      if (window.CourseSheet && window.CourseSheet.setContext) window.CourseSheet.setContext(context(), 'train');
      if (focus) {
        if (mcq) { var f = choices.querySelector('.choice'); if (f) f.focus({ preventScroll: true }); }
        else if (!coarse) input.focus({ preventScroll: true });
      }
    }
    function buildChoices() {
      choices.innerHTML = '';
      cur.choices.forEach(function (c, i) {
        var b = el('button', { type: 'button', class: 'choice' }, [el('span', { class: 'key-hint', text: 'ABCDEF'[i] })]);
        var t = el('span', { html: c.html });
        b.appendChild(t);
        b.addEventListener('click', function () { submit(NaN, i, b); });
        choices.appendChild(el('li', null, [b]));
      });
      renderMath(choices);
    }
    function showSolution() {
      if (!cur.solution || sol.firstChild) return;
      sol.appendChild(el('div', { class: 'solution-panel', html: cur.solution }));
      renderMath(sol);
    }
    function nextBtn(ghost) {
      var b = el('button', { type: 'button', class: ghost ? 'btn ghost' : 'btn' });
      b.innerHTML = 'Question suivante' + icon('arrowRight');
      b.addEventListener('click', function () { next(true); });
      return b;
    }
    function solBtn() {
      var b = el('button', { type: 'button', class: 'btn ghost', text: 'Voir la correction' });
      b.addEventListener('click', function () { showSolution(); b.remove(); });
      return b;
    }
    function lock() {
      done = true;
      input.disabled = true; check.disabled = true;
      skip.hidden = true; // le bouton « Question suivante » est dans le verdict
      choices.querySelectorAll('.choice').forEach(function (b) { b.disabled = true; });
    }
    function submit(value, idx, btn) {
      if (done || !cur) return;
      var mcq = !!cur.choices, ok;
      if (mcq) ok = idx === cur.answer;
      else {
        if (isNaN(value)) {
          verdict.innerHTML = '';
          verdict.appendChild(verdictEl('hint', 'alert', 'Saisie non reconnue', 'Écris un nombre : <b>2,5</b> · <b>3/4</b> · <b>7,92e8</b> ou <b>7,92 × 10^8</b>.'));
          return;
        }
        ok = CORE.isCorrect(value, cur.answer, cur.tol);
      }
      attempts++;
      var st = getProgress();
      if (attempts === 1) { st = CORE.progressAnswer(st, ok); setProgress(st); }
      verdict.innerHTML = '';
      if (ok) {
        lock();
        answer.classList.remove('is-ko'); answer.classList.add('is-ok');
        if (btn) btn.classList.add('right');
        fb.className = 'feedback sr-only ok'; fb.textContent = 'Correct';
        var justUnlocked = st.unlocked && !unlockedBefore;
        unlockedBefore = st.unlocked;
        var msg = attempts === 1
          ? (justUnlocked ? '<p>' + CORE.GATE.STREAK + ' bonnes réponses de suite, du premier coup. Tu peux passer l’évaluation sur 20, ou continuer à t’entraîner.</p>' : st.streak > 1 ? '<p>' + st.streak + ' bonnes réponses de suite.</p>' : '')
          : '<p>La série reprend à la prochaine question.</p>';
        var acts = [];
        if (justUnlocked) {
          var go = el('a', { class: 'btn', href: '#evaluation' });
          go.innerHTML = 'Passer l’évaluation' + icon('arrowRight');
          acts.push(go, nextBtn(true));
        } else acts.push(nextBtn());
        if (cur.solution) {
          var see = el('button', { type: 'button', class: 'btn ghost', text: 'Voir la correction' });
          see.addEventListener('click', function () { showSolution(); see.remove(); });
          acts.push(see);
        }
        var v = verdictEl(justUnlocked ? 'ok unlock' : 'ok', justUnlocked ? 'unlock' : 'check', justUnlocked ? 'Évaluation débloquée !' : attempts === 1 ? pick(CHEERS) : 'Juste, cette fois !', msg, acts);
        verdict.appendChild(v);
        refreshTop(st, attempts === 1);
        acts[0].focus({ preventScroll: true });
        return;
      }
      fb.className = 'feedback sr-only ko'; fb.textContent = 'Pas tout à fait';
      answer.classList.remove('shake'); void answer.offsetWidth; answer.classList.add('shake', 'is-ko');
      if (btn) { btn.classList.add('wrong'); btn.disabled = true; }
      refreshTop(st, false);
      if (attempts === 1) {
        var trap = mcq ? (cur.choices[idx].why ? { msg: cur.choices[idx].why } : null) : CORE.matchTrap(value, cur.traps, cur.answer);
        var retry = el('button', { type: 'button', class: 'btn' });
        retry.innerHTML = icon('retry') + 'Réessayer';
        retry.addEventListener('click', function () {
          verdict.innerHTML = '';
          if (mcq) { var f = choices.querySelector('.choice:not(:disabled)'); if (f) f.focus(); }
          else { input.select(); input.focus(); }
        });
        verdict.appendChild(verdictEl('hint', trap ? 'alert' : 'bulb', trap ? 'Erreur fréquente' : 'Pas tout à fait',
          (trap ? trap.msg : (cur.hint || 'Relis la consigne : unités, conversions, formule. Puis réessaie.')) + '<p class="note">La série repart à 0 ; tu peux corriger ta réponse.</p>',
          [retry, solBtn()]));
        if (!mcq && !coarse) { input.select(); }
        return;
      }
      lock();
      if (mcq) choices.querySelectorAll('.choice')[cur.answer].classList.add('right');
      var nb = nextBtn();
      verdict.appendChild(verdictEl('ko', 'close', 'Voici la correction', 'Réponse attendue : <b>' + answerText(cur) + '</b>', [nb]));
      showSolution();
      nb.focus({ preventScroll: true });
    }
    check.addEventListener('click', function () { submit(parseNum(input.value)); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (done) next(true); else submit(parseNum(input.value)); } });
    // Passer une question coûte la série : on le dit, et on demande de confirmer.
    function disarmSkip() { clearTimeout(skipArmed); skipArmed = 0; skip.textContent = 'Passer'; skip.removeAttribute('aria-describedby'); }
    skip.addEventListener('click', function () {
      if (!done) {
        var st = getProgress();
        if (st.streak && !skipArmed) {
          skip.textContent = 'Passer : la série repart à 0';
          skipArmed = setTimeout(disarmSkip, 4000);
          return;
        }
        if (st.streak) setProgress(CORE.progressSkip(st));
      }
      next(true);
    });
    root.addEventListener('keydown', function (e) {
      if (!cur || !cur.choices || done || e.target.tagName === 'INPUT') return;
      var k = 'abcdef'.indexOf(e.key.toLowerCase()), n = '123456'.indexOf(e.key);
      var i = k >= 0 ? k : n;
      var b = choices.querySelectorAll('.choice')[i];
      if (b && !b.disabled) { e.preventDefault(); b.click(); }
    });
    calc.addEventListener('click', function () { if (window.CourseSheet) window.CourseSheet.open(context()); });
    document.addEventListener('course:progress', function (e) { refreshTop(e.detail, false); });
    refreshTop(getProgress(), false);
    // Accès en lecture pour les tests de bout en bout (vérifient chaque générateur).
    root.courseDrill = { current: function () { return cur; }, next: function () { next(false); } };
    next(false);
    if (opts.workspace && window.CourseSheet) window.CourseSheet.mount(opts.workspace, { mode: 'train', ctx: context() });
    return root.courseDrill;
  }

  /**
   * Course.exam(racine, { build, workspace, trainWorkspace }) : évaluation sur 20 points.
   * Verrouillée tant que la série de 5 n'est pas faite ; calculatrice en mode examen ;
   * ≥ 15/20 valide le chapitre, sinon l'évaluation se reverrouille (nouvelle série de 5).
   * build() renvoie les questions : générateurs de l'entraînement + { points }.
   */
  function exam(root, opts) {
    if (typeof root === 'string') root = document.querySelector(root);
    var state = 'idle', qs = [], cards = [], gradedBox = null;
    var ws = opts.workspace || null;
    if (ws) ws.hidden = true;
    // La copie en cours est gardée : un rechargement ou un changement d'appli ne l'efface pas.
    var SAVE = 'exam:' + CHAPTER;
    function saveCopy() {
      if (state !== 'running') return;
      store.set(SAVE, JSON.stringify({ qs: qs, answers: cards.map(function (c) { return c.q.choices ? (c.choice === undefined ? null : c.choice) : c.input.value; }) }));
    }
    function savedCopy() {
      try { var o = JSON.parse(store.get(SAVE) || 'null'); return o && o.qs && o.qs.length && o.answers ? o : null; } catch (e) { return null; }
    }
    function total() { return qs.reduce(function (s, q) { return s + q.points; }, 0); }
    function render(st) {
      if (state === 'running') return;
      if (state === 'graded') { if (gradedBox) gradedBox.update(st); return; }
      root.innerHTML = '';
      var open = st.unlocked;
      var box = el('div', { class: 'exam-lock' + (open ? ' open' : '') });
      box.appendChild(el('div', { class: 'lock-icon', html: icon(open ? 'unlock' : 'lock') }));
      var col = el('div');
      if (!open) {
        col.appendChild(el('h3', { text: 'Évaluation verrouillée' }));
        col.appendChild(el('p', { html: 'Réussis <b>' + CORE.GATE.STREAK + ' réponses de suite</b>, du premier coup, dans l’Entraînement pour la débloquer.' }));
        if (st.attempts && st.lastScore !== null && st.lastScore < CORE.GATE.PASS) {
          col.appendChild(el('p', { html: 'Dernière copie : <b>' + st.lastScore + '/20</b>. Il faut une nouvelle série de ' + CORE.GATE.STREAK + ' pour retenter.' }));
        }
        var g = gateEl(); g.update(st); col.appendChild(g);
        var go = el('a', { class: 'btn ghost', href: '#entrainement' });
        go.innerHTML = 'Aller à l’entraînement' + icon('arrowRight');
        col.appendChild(go);
      } else {
        col.appendChild(el('h3', { text: st.validated ? 'Chapitre validé : tu peux retenter l’évaluation' : 'Évaluation débloquée' }));
        col.appendChild(el('p', { html: st.validated && st.bestScore !== null
          ? 'Meilleure note : <b>' + st.bestScore + '/20</b>. Une nouvelle copie ne peut pas retirer la validation.'
          : 'Une copie de ' + (opts.count || 8) + ' questions, corrigée à la fin. Il faut au moins <b>' + CORE.GATE.PASS + '/20</b> pour valider le chapitre.' }));
        col.appendChild(el('ul', { class: 'exam-rules' }, [
          el('li', { html: icon('award') + 'Sur 20 points' }),
          el('li', { html: icon('list') + (opts.count || 8) + ' questions' }),
          el('li', { html: icon('calc') + 'Calculatrice en mode examen' }),
          el('li', { html: icon('check') + 'Validé à partir de ' + CORE.GATE.PASS + '/20' })
        ]));
        var start = el('button', { class: 'btn', type: 'button' });
        start.innerHTML = 'Commencer l’évaluation' + icon('arrowRight');
        start.addEventListener('click', function () { begin(); });
        col.appendChild(start);
      }
      box.appendChild(col);
      root.appendChild(box);
    }
    function begin(saved) {
      qs = saved ? saved.qs : opts.build();
      state = 'running';
      root.innerHTML = '';
      cards = [];
      var title = el('h3', { class: 'exam-title', tabindex: '-1', text: 'Ta copie : ' + qs.length + ' questions, sur 20 points' });
      root.appendChild(title);
      root.appendChild(el('p', { class: 'note exam-note', text: (saved ? 'Copie reprise là où tu l’avais laissée. ' : '') +
        'Pas de limite de temps. Calculatrice en mode examen (calculs standard seulement). Réponds à 3 chiffres significatifs.' }));
      var sheet = el('div', { class: 'exam-sheet' });
      qs.forEach(function (q, i) {
        var card = el('div', { class: 'exam-q' });
        card.appendChild(el('div', { class: 'exam-q-head' }, [el('span', { class: 'qn', text: q.type || 'Question' }), el('span', { class: 'pts', text: q.points + ' pt' + (q.points > 1 ? 's' : '') })]));
        var text = el('div', { class: 'q-text', html: q.html + (q.ask ? '<p class="note">' + esc(q.ask) + '</p>' : '') });
        card.appendChild(text);
        var c = { q: q, card: card, text: text };
        if (q.choices) {
          var list = el('ul', { class: 'choices-grid' });
          c.buttons = q.choices.map(function (ch, j) {
            var b = el('button', { type: 'button', class: 'choice', 'aria-pressed': 'false' }, [el('span', { class: 'key-hint', text: 'ABCDEF'[j] }), el('span', { html: ch.html })]);
            b.addEventListener('click', function () {
              c.buttons.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
              c.choice = j; counter(); saveCopy();
            });
            list.appendChild(el('li', null, [b]));
            return b;
          });
          card.appendChild(list);
        } else {
          c.input = el('input', { type: 'text', 'aria-label': 'Réponse à la question ' + (i + 1), placeholder: 'Ta réponse', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
          c.input.addEventListener('input', function () { counter(); saveCopy(); });
          c.input.addEventListener('focus', function () {
            if (window.CourseSheet && window.CourseSheet.setContext) window.CourseSheet.setContext({ question: text, input: c.input }, 'exam');
          });
          // calculatrice (mode examen) en plein écran, sans quitter la question
          var cb = el('button', { class: 'btn ghost icon-only drill-calc', type: 'button', title: 'Brouillon et calculatrice', 'aria-label': 'Brouillon et calculatrice pour la question ' + (i + 1), 'aria-haspopup': 'dialog' });
          cb.innerHTML = icon('calc');
          cb.addEventListener('click', function () { if (window.CourseSheet) window.CourseSheet.open({ question: text, input: c.input, opener: cb }); });
          card.appendChild(el('div', { class: 'answer' }, [el('label', { class: 'field' }, [c.input, el('span', { class: 'unit', text: q.unit || '' })]), cb]));
        }
        cards.push(c);
        sheet.appendChild(card);
      });
      root.appendChild(sheet);
      var progress = el('span', { class: 'exam-progress' });
      var warn = el('p', { class: 'note', hidden: '' });
      var send = el('button', { class: 'btn', type: 'button', text: 'Rendre ma copie' });
      var confirmPending = false;
      function counter() {
        var n = cards.filter(answered).length;
        progress.textContent = n + ' / ' + cards.length + ' réponses';
        if (confirmPending) { confirmPending = false; warn.hidden = true; send.textContent = 'Rendre ma copie'; }
      }
      send.addEventListener('click', function () {
        var missing = cards.length - cards.filter(answered).length;
        if (missing && !confirmPending) {
          confirmPending = true;
          warn.hidden = false;
          warn.textContent = missing + ' question' + (missing > 1 ? 's' : '') + ' sans réponse (0 point). Rendre quand même ?';
          send.textContent = 'Rendre quand même';
          return;
        }
        grade();
      });
      root.appendChild(el('div', { class: 'exam-actions' }, [send, progress, warn]));
      if (saved) cards.forEach(function (c, k) {
        var a = saved.answers[k];
        if (c.q.choices) { if (typeof a === 'number' && c.buttons[a]) { c.choice = a; c.buttons[a].setAttribute('aria-pressed', 'true'); } }
        else if (typeof a === 'string') c.input.value = a;
      });
      counter();
      saveCopy();
      renderMath(root);
      if (ws && window.CourseSheet) { ws.hidden = false; window.CourseSheet.mount(ws, { mode: 'exam' }); }
      if (!saved) {
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
        title.focus({ preventScroll: true });
      }
    }
    function answered(c) { return c.q.choices ? c.choice !== undefined : c.input.value.trim() !== ''; }
    function grade() {
      var items = cards.map(function (c) {
        var ok = c.q.choices ? c.choice === c.q.answer : CORE.isCorrect(parseNum(c.input.value), c.q.answer, c.q.tol);
        return { ok: ok, points: c.q.points, c: c };
      });
      var score = CORE.examScore(items);
      var st = CORE.progressExam(getProgress(), score);
      state = 'graded';
      store.del(SAVE);
      var note = root.querySelector('.exam-note'); if (note) note.remove();
      var t = root.querySelector('.exam-title'); if (t) t.textContent = 'Ta copie corrigée';
      root.querySelectorAll('.exam-q .drill-calc').forEach(function (b) { b.remove(); });
      items.forEach(function (it) {
        var c = it.c;
        c.card.classList.add(it.ok ? 'is-ok' : 'is-ko');
        c.card.querySelector('.pts').textContent = (it.ok ? c.q.points : 0) + ' / ' + c.q.points + ' pt' + (c.q.points > 1 ? 's' : '');
        if (c.input) c.input.disabled = true;
        if (c.buttons) c.buttons.forEach(function (b, j) { b.disabled = true; if (j === c.q.answer) b.classList.add('right'); else if (j === c.choice) b.classList.add('wrong'); });
        var corr = el('div', { class: 'correction', html: '<p>' + (it.ok ? 'Juste.' : 'Réponse attendue : <b>' + answerText(c.q) + '</b>') + '</p>' });
        if (c.q.solution) {
          var d = el('details', { class: 'solution' }, [el('summary', { text: 'Voir la correction détaillée' }), el('div', { class: 'sol-body', html: c.q.solution })]);
          corr.appendChild(d);
        }
        c.card.appendChild(corr);
      });
      var actions = root.querySelector('.exam-actions');
      if (actions) actions.remove();
      gradedBox = scoreBox(score, total(), items.filter(function (it) { return !it.ok; }).map(function (it) { return it.c.q; }));
      root.insertBefore(gradedBox, root.firstChild);
      renderMath(root);
      if (window.CourseSheet) {
        if (opts.trainWorkspace) window.CourseSheet.mount(opts.trainWorkspace, { mode: 'train' });
        else window.CourseSheet.setExam(false);
      }
      if (ws) ws.hidden = true;
      setProgress(st);
      gradedBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      gradedBox.focus({ preventScroll: true });
    }
    function scoreBox(score, outOf, missed) {
      var pass = score >= CORE.GATE.PASS;
      var box = el('div', { class: 'score ' + (pass ? 'pass' : 'fail'), role: 'status', tabindex: '-1' });
      box.appendChild(el('div', { class: 'score-num', html: score + '<small>/' + outOf + '</small>' }));
      var col = el('div');
      col.appendChild(el('h3', { text: pass ? 'Chapitre validé' : 'Pas encore validé' }));
      col.appendChild(el('p', { text: pass
        ? 'Bravo : ' + score + '/20, le chapitre est validé. Relis les corrections des questions manquées, puis passe au chapitre suivant.'
        : 'Il faut au moins ' + CORE.GATE.PASS + '/20. Revois les notions ci-dessous, puis refais une série de ' + CORE.GATE.STREAK + ' bonnes réponses en Entraînement : l’évaluation se rouvrira.' }));
      // notions des questions manquées, avec un lien vers la carte du cours
      var seen = {}, review = el('ul', { class: 'review', 'aria-label': 'Notions à revoir' });
      (missed || []).forEach(function (q) {
        var k = (q.ref || '') + '|' + q.type;
        if (seen[k]) return;
        seen[k] = 1;
        review.appendChild(el('li', null, [el('a', { href: q.ref ? '#' + q.ref : '#cours', html: icon('book') + esc(q.type || 'Question') })]));
      });
      if (review.children.length) {
        col.appendChild(el('p', { class: 'note', text: pass ? 'Pour aller plus loin, revois :' : 'À revoir dans le cours :' }));
        col.appendChild(review);
      }
      var acts = el('div', { class: 'exam-actions' });
      col.appendChild(acts);
      box.appendChild(col);
      box.update = function (st) {
        acts.innerHTML = '';
        if (pass) {
          var nx = nextChapter();
          if (nx) { var a = el('a', { class: 'btn', href: nx.href }); a.innerHTML = 'Chapitre suivant' + icon('arrowRight'); acts.appendChild(a); }
          acts.appendChild(el('a', { class: 'btn ghost', href: '#validation', text: 'Voir la validation' }));
        } else {
          var back = el('a', { class: 'btn', href: '#entrainement' });
          back.innerHTML = icon('retry') + 'Retour à l’entraînement';
          acts.appendChild(back);
        }
        if (st.unlocked) {
          var again = el('button', { class: 'btn ghost', type: 'button', text: 'Nouvelle copie' });
          again.addEventListener('click', function () { state = 'idle'; gradedBox = null; render(getProgress()); begin(); });
          acts.appendChild(again);
        }
      };
      box.update(getProgress());
      return box;
    }
    onProgress(render);
    var resume = savedCopy();
    if (resume && getProgress().unlocked) begin(resume);
    else if (resume) store.del(SAVE);
    root.courseExam = {
      state: function () { return state; },
      questions: function () { return qs; },
      start: function () { if (state !== 'running' && getProgress().unlocked) { state = 'idle'; begin(); } }
    };
    return root.courseExam;
  }

  /** Course.validation(racine) : état du chapitre et passage au suivant (après ≥ 15/20). */
  function validation(root) {
    if (typeof root === 'string') root = document.querySelector(root);
    onProgress(function (st) {
      root.innerHTML = '';
      root.classList.toggle('is-valid', st.validated);
      root.appendChild(el('div', { class: 'seal', html: icon(st.validated ? 'award' : 'lock') }));
      var col = el('div');
      col.appendChild(el('h3', { text: st.validated ? 'Chapitre validé' : 'Chapitre pas encore validé' }));
      col.appendChild(el('p', { html: st.validated
        ? 'Meilleure note : <b>' + st.bestScore + '/20</b>. Tu peux passer au chapitre suivant.'
        : 'Pour valider : une série de <b>' + CORE.GATE.STREAK + '</b> bonnes réponses en Entraînement, puis au moins <b>' + CORE.GATE.PASS + '/20</b> à l’évaluation.' }));
      var stats = el('div', { class: 'valid-stats' });
      var rate = st.answered ? Math.round(100 * st.correct / st.answered) + ' %' : '—';
      [['Meilleure série', String(st.best), '--accent'], ['Réussite à l’entraînement', rate, '--ok'],
        ['Meilleure note', st.bestScore !== null ? st.bestScore + '/20' : '—', '--violet'], ['Copies rendues', String(st.attempts), '--amber']].forEach(function (k) {
        stats.appendChild(el('div', { class: 'kpi', style: '--tone: var(' + k[2] + ')' }, [el('p', { class: 'kpi-label', text: k[0] }), el('p', { class: 'kpi-value', text: k[1] })]));
      });
      col.appendChild(stats);
      var acts = el('div', { class: 'valid-actions' }), nx = nextChapter();
      if (nx) {
        if (st.validated) {
          var a = el('a', { class: 'btn', href: nx.href });
          a.innerHTML = 'Chapitre suivant : ' + esc(nx.chapter.title) + icon('arrowRight');
          acts.appendChild(a);
        } else {
          var b = el('button', { class: 'btn is-locked', type: 'button', disabled: '', title: 'Valide d’abord ce chapitre (≥ ' + CORE.GATE.PASS + '/20)' });
          b.innerHTML = icon('lock') + 'Chapitre suivant après validation';
          acts.appendChild(b);
        }
      }
      var t = el('a', { class: 'btn ghost', href: st.unlocked ? '#evaluation' : '#entrainement', text: st.unlocked ? 'Aller à l’évaluation' : 'Continuer l’entraînement' });
      acts.appendChild(t);
      col.appendChild(acts);
      root.appendChild(col);
    });
  }

  /**
   * Course.presets(hôte, [{ label, values: { clé: valeur } }], après?) : boutons de préréglages
   * qui placent les curseurs du widget. Un réglage à la main désélectionne le préréglage.
   */
  function presets(host, list, after) {
    if (typeof host === 'string') host = document.querySelector(host);
    var widget = host.closest('.widget') || document.body;
    var btns = list.map(function (p) {
      var b = el('button', { type: 'button', class: 'preset', 'aria-pressed': 'false', text: p.label });
      b.addEventListener('click', function () {
        Object.keys(p.values).forEach(function (k) { var inp = widget.querySelector('[data-k="' + k + '"]'); if (inp) inp.value = p.values[k]; });
        if (after) after(p);
        var any = widget.querySelector('[data-k]');
        if (any) any.dispatchEvent(new Event('input', { bubbles: true }));
        btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      });
      host.appendChild(b);
      return b;
    });
    widget.addEventListener('input', function (e) { if (e.isTrusted) btns.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); });
    list.forEach(function (p, k) {
      var match = Object.keys(p.values).every(function (key) { var inp = widget.querySelector('[data-k="' + key + '"]'); return inp && parseFloat(inp.value) === p.values[key]; });
      if (match) btns[k].setAttribute('aria-pressed', 'true');
    });
    return btns;
  }

  /**
   * Course.kpis(hôte, [{ id, label (HTML, formules permises), tone: '--q-E' }]) → maj({ id: { value, unit, sub, badge } }).
   * Cartes d'indicateurs réactives (valeur en chiffres tabulaires, pastille de statut facultative).
   */
  function kpis(host, defs) {
    if (typeof host === 'string') host = document.querySelector(host);
    var cells = {};
    defs.forEach(function (d) {
      var value = el('p', { class: 'kpi-value' }), sub = el('p', { class: 'kpi-sub' });
      var card = el('div', { class: 'kpi', style: '--tone: var(' + (d.tone || '--accent') + ')' }, [el('p', { class: 'kpi-label', html: d.label }), value, sub]);
      host.appendChild(card);
      cells[d.id] = { card: card, value: value, sub: sub };
    });
    renderMath(host);
    return function update(vals) {
      Object.keys(vals).forEach(function (id) {
        var c = cells[id], v = vals[id];
        if (!c || !v) return;
        var html = esc(v.value) + (v.unit ? '<span class="unit">' + esc(v.unit) + '</span>' : '');
        if (c.value.innerHTML !== html) c.value.innerHTML = html;
        var sub = v.badge ? badgeHtml(v.badge) : esc(v.sub || '');
        if (c.sub.innerHTML !== sub) c.sub.innerHTML = sub;
        c.sub.hidden = !sub;
      });
    };
  }

  /**
   * Course.fitChain(chaîne) : une chaîne énergétique trop large pour sa carte passe à la verticale
   * (rien n'est rogné sur téléphone). Appelée au chargement, au redimensionnement, et par la page
   * après une mise à jour du contenu d'une chaîne animée.
   */
  function fitChain(c) {
    c.classList.remove('is-vertical');
    if (c.scrollWidth <= c.clientWidth + 1) return;
    c.classList.add('is-vertical');
    var node = c.querySelector('.chain-conv');
    if (node) c.style.setProperty('--loss-max', Math.max(80, c.clientWidth - node.offsetWidth - 12) + 'px');
  }
  function setupChains() {
    var chains = document.querySelectorAll('.chain');
    chains.forEach(fitChain);
    if ('ResizeObserver' in window) {
      var widths = new WeakMap();
      var ro = new ResizeObserver(function (entries) {
        entries.forEach(function (en) {
          var w = Math.round(en.contentRect.width);
          if (widths.get(en.target) === w) return;
          widths.set(en.target, w);
          fitChain(en.target);
        });
      });
      chains.forEach(function (c) { ro.observe(c); });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { chains.forEach(fitChain); });
  }

  /* ---------- page d'accueil ---------- */
  function buildHome() {
    var host = document.getElementById('subjects');
    if (!host) return;
    var totalCh = flat.length, totalDone = flat.filter(function (f) { return isDone(f.key); }).length;
    var st = document.getElementById('stat-chapters'); if (st) st.textContent = totalCh;
    var sd = document.getElementById('stat-done'); if (sd) sd.textContent = totalDone;
    var levels = COURSE.levels || [], groups = {};
    levels.forEach(function (l) {
      var g = el('section', { class: 'level', id: 'niveau-' + l.id, 'aria-labelledby': 'titre-' + l.id }, [
        el('h2', { class: 'level-title', id: 'titre-' + l.id, text: l.title })
      ]);
      if (l.desc) g.appendChild(el('p', { class: 'lead', text: l.desc }));
      groups[l.id] = g; host.appendChild(g);
    });
    COURSE.subjects.forEach(function (s) {
      var parent = groups[s.level] || host;
      var done = s.chapters.filter(function (c) { return isDone(s.id + '/' + c.slug); }).length;
      var sec = el('section', { class: 'subject', id: s.id, style: '--subject-color: var(--' + (s.color || 'accent') + ')' });
      var bar = el('span', { class: 'bar' }, [el('i', { style: 'width:' + (s.chapters.length ? Math.round(100 * done / s.chapters.length) : 0) + '%' })]);
      sec.appendChild(el('div', { class: 'subject-head' }, [
        el(parent === host ? 'h2' : 'h3', { text: s.title }), bar, el('small', { text: done + ' / ' + s.chapters.length + ' terminés' })
      ]));
      if (s.desc) sec.appendChild(el('p', { class: 'lead', text: s.desc }));
      var cards = el('div', { class: 'cards' });
      s.chapters.forEach(function (c, i) {
        var tags = el('div', { class: 'tags' });
        (c.tags || []).forEach(function (t) { tags.appendChild(el('span', { class: 'tag' + (t === 'essentiel' ? ' prio' : ''), text: t })); });
        cards.appendChild(el('a', { class: 'card' + (isDone(s.id + '/' + c.slug) ? ' done' : ''), href: ROOT + s.id + '/' + c.slug + '.html' }, [
          el('span', { class: 'num', text: String(i + 1).padStart(2, '0') }),
          el('h3', { text: c.title }),
          el('p', { text: c.summary }),
          tags
        ]));
      });
      if (!s.chapters.length) cards.appendChild(el('p', { class: 'hint', text: 'Chapitres en préparation.' }));
      sec.appendChild(cards);
      parent.appendChild(sec);
    });
  }

  /* ---------- initialisation ---------- */
  buildTopbar();
  buildChapterLayout();
  buildHome();
  buildQuizzes();
  renderMath(document.body);
  document.querySelectorAll('main table').forEach(function (t) {
    if (!t.parentNode.classList.contains('table-scroll')) {
      var sc = el('div', { class: 'table-scroll' }); t.parentNode.insertBefore(sc, t); sc.appendChild(t);
    }
  });
  document.querySelectorAll('.widget').forEach(setupFullscreen);
  setupChains();

  window.Course = {
    plot: plot, onInput: onInput, drill: drill, fmt: fmt, tex: tex, renderMath: renderMath,
    parseNum: parseNum, rand: rand, pick: pick, el: el, color: color, chapters: flat,
    icon: icon, store: store, chapter: CHAPTER, approx: CORE.approxTol,
    trainer: trainer, exam: exam, validation: validation, presets: presets, kpis: kpis,
    progress: getProgress, setProgress: setProgress, onProgress: onProgress, nextChapter: nextChapter,
    esc: esc, scrollToId: scrollToId, fitChain: fitChain
  };
})();
