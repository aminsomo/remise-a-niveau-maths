/* ==========================================================================
   Remise à niveau STI2D → Prépa — moteur commun
   - barre de navigation, sommaire, chapitre précédent/suivant
   - thème clair/sombre, progression (localStorage)
   - quiz, exercices auto-générés ("drills"), traceur de courbes
   - rendu des formules avec KaTeX (si disponible)
   Les scripts propres à une page s'exécutent dans un écouteur
   DOMContentLoaded et utilisent l'objet global `Course`.
   ========================================================================== */
(function () {
  'use strict';

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
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = store.get('theme') || (prefersDark ? 'dark' : 'light');

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
  function slugify(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  }
  function fmt(x, d) {
    if (typeof x !== 'number' || !isFinite(x)) return '—';
    d = d === undefined ? 3 : d;
    var r = Math.round(x * Math.pow(10, d)) / Math.pow(10, d);
    if (Object.is(r, -0)) r = 0;
    return r.toLocaleString('fr-FR', { maximumFractionDigits: d });
  }
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function color(c) {
    if (!c) return cssVar('--c1');
    return c.indexOf('--') === 0 ? cssVar(c) : c;
  }
  /** Lit un nombre saisi : accepte la virgule, les fractions "a/b", "pi", "e", "sqrt(…)". */
  function parseNum(s) {
    if (s === null || s === undefined) return NaN;
    s = String(s).trim().replace(/\s+/g, '').replace(/,/g, '.').replace(/π/g, 'pi').replace(/−/g, '-');
    if (s === '') return NaN;
    if (!/^[0-9+\-*/().^a-z]*$/i.test(s)) return NaN;
    var expr = s.replace(/\^/g, '**')
      .replace(/\bpi\b/gi, '(Math.PI)')
      .replace(/\be\b/g, '(Math.E)')
      .replace(/\b(sqrt|ln|exp|cos|sin|tan)\(/g, function (m, f) {
        return { sqrt: 'Math.sqrt(', ln: 'Math.log(', exp: 'Math.exp(', cos: 'Math.cos(', sin: 'Math.sin(', tan: 'Math.tan(' }[f];
      });
    if (/[a-df-z]/i.test(expr.replace(/Math\.(PI|E|sqrt|log|exp|cos|sin|tan)/g, ''))) return NaN;
    try { var v = Function('"use strict";return (' + expr + ');')(); return typeof v === 'number' ? v : NaN; }
    catch (e) { return NaN; }
  }
  function tex(target, latex, display) {
    if (window.katex) {
      try { window.katex.render(latex, target, { displayMode: !!display, throwOnError: false }); return; }
      catch (e) { /* repli texte */ }
    }
    target.textContent = latex;
  }
  /** Rend les formules \( \) et \[ \] contenues dans un élément (utile pour du HTML injecté). */
  function renderMath(root) {
    if (window.renderMathInElement) {
      window.renderMathInElement(root, {
        delimiters: [
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false,
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'canvas']
      });
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
    var nav = el('nav', { 'aria-label': 'Matières' });
    COURSE.subjects.forEach(function (s) {
      var a = el('a', { href: ROOT + 'index.html#' + s.id, text: s.short || s.title });
      if (CHAPTER && CHAPTER.indexOf(s.id + '/') === 0) a.className = 'active';
      nav.appendChild(a);
    });
    var btn = el('button', { class: 'icon-btn', type: 'button', title: 'Changer de thème', 'aria-label': 'Changer de thème' });
    function label() { btn.textContent = document.documentElement.dataset.theme === 'dark' ? '☀' : '☾'; }
    label();
    btn.addEventListener('click', function () {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); label();
    });
    var brand = el('a', { class: 'brand', href: ROOT + 'index.html', html: 'STI2D <span>→</span> Prépa' });
    var bar = el('header', { class: 'topbar' }, [brand, nav, btn]);
    body.insertBefore(bar, body.firstChild);
  }

  /* ---------- page chapitre : sommaire + pied ---------- */
  function buildChapterLayout() {
    var main = document.querySelector('main.chapter');
    if (!main) return;
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
  function niceStep(raw) {
    var p = Math.pow(10, Math.floor(Math.log10(raw)));
    var m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }
  function piLabel(k) { // k multiples de π/2
    if (k === 0) return '0';
    var num = k, den = 2;
    if (k % 2 === 0) { num = k / 2; den = 1; }
    var s = num < 0 ? '−' : '';
    var a = Math.abs(num);
    return s + (a === 1 ? '' : a) + 'π' + (den === 2 ? '/2' : '');
  }

  /**
   * Course.plot(canvas, view, draw)
   * view : { xmin, xmax, ymin, ymax, grid, axes, piTicks, xlabel, ylabel, equal }
   * draw(g) reçoit un objet g : fn, point, seg, arrow, area, poly, text, X, Y, ctx…
   * Retourne { redraw(view?), view, onPointer(cb) }.
   */
  function plot(canvas, view, draw) {
    var P = {
      canvas: canvas,
      view: Object.assign({ xmin: -5, xmax: 5, ymin: -5, ymax: 5, grid: true, axes: true }, view || {}),
      draw: draw,
      pointerCb: null
    };
    P.redraw = function (v) { if (v) Object.assign(P.view, v); renderPlot(P); };
    P.onPointer = function (cb) { P.pointerCb = cb; };
    var dragging = false;
    function handle(type) {
      return function (ev) {
        if (!P.pointerCb) return;
        if (type === 'down') { dragging = true; canvas.setPointerCapture && canvas.setPointerCapture(ev.pointerId); }
        if (type === 'up') dragging = false;
        var r = canvas.getBoundingClientRect();
        var v = P.view, w = r.width, h = r.height;
        var x = v.xmin + (ev.clientX - r.left) / w * (v.xmax - v.xmin);
        var y = v.ymax - (ev.clientY - r.top) / h * (v.ymax - v.ymin);
        P.pointerCb(x, y, type, dragging);
      };
    }
    canvas.addEventListener('pointerdown', handle('down'));
    canvas.addEventListener('pointermove', handle('move'));
    canvas.addEventListener('pointerup', handle('up'));
    plots.push(P);
    renderPlot(P);
    return P;
  }

  function renderPlot(P) {
    var c = P.canvas, v = P.view;
    var dpr = window.devicePixelRatio || 1;
    var w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    var ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (v.equal) { // repère orthonormé : on ajuste y autour du centre
      var cy = (v.ymin + v.ymax) / 2, half = (v.xmax - v.xmin) * h / w / 2;
      v.ymin = cy - half; v.ymax = cy + half;
    }
    function X(x) { return (x - v.xmin) / (v.xmax - v.xmin) * w; }
    function Y(y) { return h - (y - v.ymin) / (v.ymax - v.ymin) * h; }
    var font = '12px ' + cssVar('--font');
    var axisCol = cssVar('--plot-axis'), gridCol = cssVar('--plot-grid'), textCol = cssVar('--muted');

    var sx = v.xstep || (v.piTicks ? Math.PI / 2 : niceStep((v.xmax - v.xmin) / 10));
    var sy = v.ystep || niceStep((v.ymax - v.ymin) / 8);
    ctx.lineWidth = 1;
    if (v.grid) {
      ctx.strokeStyle = gridCol; ctx.beginPath();
      for (var gx = Math.ceil(v.xmin / sx) * sx; gx <= v.xmax + 1e-9; gx += sx) { ctx.moveTo(X(gx) + .5, 0); ctx.lineTo(X(gx) + .5, h); }
      for (var gy = Math.ceil(v.ymin / sy) * sy; gy <= v.ymax + 1e-9; gy += sy) { ctx.moveTo(0, Y(gy) + .5); ctx.lineTo(w, Y(gy) + .5); }
      ctx.stroke();
    }
    if (v.axes) {
      var ax = Math.min(Math.max(Y(0), 0), h), ay = Math.min(Math.max(X(0), 0), w);
      ctx.strokeStyle = axisCol; ctx.lineWidth = 1.3; ctx.beginPath();
      ctx.moveTo(0, ax); ctx.lineTo(w, ax); ctx.moveTo(ay, 0); ctx.lineTo(ay, h); ctx.stroke();
      ctx.fillStyle = textCol; ctx.font = font;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      var k0 = Math.ceil(v.xmin / sx);
      for (var k = k0; k * sx <= v.xmax + 1e-9; k++) {
        var tx = k * sx; if (Math.abs(tx) < 1e-12) continue;
        var lbl = v.piTicks ? piLabel(k) : fmt(tx, 4);
        ctx.fillText(lbl, X(tx), Math.min(ax + 4, h - 14));
      }
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (var ty = Math.ceil(v.ymin / sy) * sy; ty <= v.ymax + 1e-9; ty += sy) {
        if (Math.abs(ty) < 1e-12) continue;
        ctx.fillText(fmt(ty, 4), Math.max(ay - 4, 30), Y(ty));
      }
      if (v.xlabel) { ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(v.xlabel, w - 4, ax - 4); }
      if (v.ylabel) { ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(v.ylabel, ay + 6, 4); }
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
          ctx.font = 'bold 13px ' + cssVar('--font'); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
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
          ctx.font = 'bold 13px ' + cssVar('--font'); ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
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
        ctx.font = (o.bold ? 'bold ' : '') + (o.size || 13) + 'px ' + cssVar('--font');
        ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.baseline || 'middle';
        ctx.fillText(str, X(x), Y(y)); ctx.restore();
      }
    };
    if (P.draw) P.draw(g);
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { plots.forEach(function (p) { p.redraw(); }); }, 120);
  });

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
    var input = row.querySelector('input') || row.appendChild(el('input', { type: 'text', inputmode: 'decimal', 'aria-label': 'Ta réponse', placeholder: 'ta réponse' }));
    var check = row.querySelector('.drill-check') || row.appendChild(el('button', { class: 'btn drill-check', type: 'button', text: 'Vérifier' }));
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
    check.addEventListener('click', verify);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') verify(); });
    nouveau.addEventListener('click', next);
    next();
  }

  /* ---------- page d'accueil ---------- */
  function buildHome() {
    var host = document.getElementById('subjects');
    if (!host) return;
    var totalCh = flat.length, totalDone = flat.filter(function (f) { return isDone(f.key); }).length;
    var st = document.getElementById('stat-chapters'); if (st) st.textContent = totalCh;
    var sd = document.getElementById('stat-done'); if (sd) sd.textContent = totalDone;
    COURSE.subjects.forEach(function (s) {
      var done = s.chapters.filter(function (c) { return isDone(s.id + '/' + c.slug); }).length;
      var sec = el('section', { class: 'subject', id: s.id, style: '--subject-color: var(--' + (s.color || 'accent') + ')' });
      var bar = el('span', { class: 'bar' }, [el('i', { style: 'width:' + (s.chapters.length ? Math.round(100 * done / s.chapters.length) : 0) + '%' })]);
      sec.appendChild(el('div', { class: 'subject-head' }, [
        el('h2', { text: s.title }), bar, el('small', { text: done + ' / ' + s.chapters.length + ' terminés' })
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
      host.appendChild(sec);
    });
  }

  /* ---------- initialisation ---------- */
  buildTopbar();
  buildChapterLayout();
  buildHome();
  buildQuizzes();
  renderMath(document.body);

  window.Course = {
    plot: plot, onInput: onInput, drill: drill, fmt: fmt, tex: tex, renderMath: renderMath,
    parseNum: parseNum, rand: rand, pick: pick, el: el, color: color, chapters: flat
  };
})();
