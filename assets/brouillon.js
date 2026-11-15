/* ==========================================================================
   Brouillon plein écran + calculatrice (ouvert par le bouton calculatrice
   placé à côté de « Vérifier » dans chaque exercice d'entraînement).
   - feuille noire : on y tape ses calculs (clavier ou palette de symboles)
     ou on y écrit au doigt / au stylet (mode Stylo) ;
   - palette : opérations, fractions, puissances, racines, ln, log, ∫, Σ, lim…
   - calculatrice scientifique (évaluateur sûr de core.js) dont le résultat
     peut être envoyé dans la feuille ou utilisé comme réponse.
   Le contenu de la feuille est conservé par chapitre (localStorage).
   Mise en page : calculatrice à droite sur ordinateur et iPad paysage,
   onglets Symboles / Calculatrice sous la feuille sur téléphone.
   ========================================================================== */
(function () {
  'use strict';
  var Course = window.Course, CORE = window.CourseCore;
  if (!Course || !CORE) return;
  var el = Course.el, icon = Course.icon, store = Course.store;
  var KEY = 'sheet:' + (Course.chapter || 'accueil');
  var INK_KEY = 'sheet-ink:' + (Course.chapter || 'accueil');
  var K = CORE.CARET;
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  /* ---------- palette de symboles ---------- */
  // [libellé affiché, texte inséré (‸ = position du curseur), nom accessible]
  var GROUPS = [
    ['Opérations', [
      ['+', '+'], ['−', '−', 'moins'], ['×', '×', 'fois'], ['÷', '÷', 'divisé par'], ['=', ' = '], ['±', '±', 'plus ou moins'],
      ['( )', '(' + K + ')', 'parenthèses'], ['[ ]', '[' + K + ']', 'crochets'], ['a/b', '(' + K + ')/()', 'fraction'], ['%', '%', 'pour cent']
    ]],
    ['Puissances et racines', [
      ['x²', '²', 'au carré'], ['x³', '³', 'au cube'], ['xⁿ', '^(' + K + ')', 'puissance'], ['x⁻¹', '⁻¹', 'inverse'],
      ['√', '√(' + K + ')', 'racine carrée'], ['∛', '∛(' + K + ')', 'racine cubique'], ['eˣ', 'e^(' + K + ')', 'exponentielle'],
      ['×10ⁿ', '×10^(' + K + ')', 'fois dix puissance']
    ]],
    ['Fonctions', [
      ['ln', 'ln(' + K + ')', 'logarithme népérien'], ['log', 'log(' + K + ')', 'logarithme décimal'], ['exp', 'exp(' + K + ')', 'exponentielle'],
      ['sin', 'sin(' + K + ')'], ['cos', 'cos(' + K + ')'], ['tan', 'tan(' + K + ')'], ['|x|', '|' + K + '|', 'valeur absolue'],
      ['f(x)', 'f(' + K + ')'], ["f ′", '′', 'prime']
    ]],
    ['Analyse', [
      ['∫', '∫ (' + K + ') dx', 'intégrale'], ['∫ₐᵇ', '∫[a ; b] (' + K + ') dx', 'intégrale de a à b'], ['Σ', 'Σ', 'somme'],
      ['lim', 'lim(x→' + K + ') ', 'limite'], ['→', ' → ', 'tend vers'], ['∞', '∞', 'infini'], ['Δ', 'Δ', 'delta'],
      ['dy/dx', 'dy/dx'], ['u⃗', '⃗', 'flèche de vecteur sur la lettre précédente'], ['z̄', '̄', 'barre de conjugué sur la lettre précédente']
    ]],
    ['Relations et ensembles', [
      ['≠', ' ≠ ', 'différent'], ['≈', ' ≈ ', 'environ égal'], ['<', ' < '], ['>', ' > '], ['≤', ' ≤ ', 'inférieur ou égal'], ['≥', ' ≥ ', 'supérieur ou égal'],
      ['⇒', ' ⇒ ', 'implique'], ['⇔', ' ⇔ ', 'équivaut'], ['∈', ' ∈ ', 'appartient'], ['∉', ' ∉ ', "n'appartient pas"],
      ['∩', ' ∩ ', 'inter'], ['∪', ' ∪ ', 'union'], ['∅', '∅', 'ensemble vide'],
      ['ℝ', 'ℝ'], ['ℕ', 'ℕ'], ['ℤ', 'ℤ'], ['ℂ', 'ℂ'], ['∀', '∀', 'pour tout'], ['∃', '∃', 'il existe']
    ]],
    ['Lettres grecques et unités', [
      ['π', 'π', 'pi'], ['θ', 'θ', 'thêta'], ['α', 'α', 'alpha'], ['β', 'β', 'bêta'], ['λ', 'λ', 'lambda'], ['μ', 'μ', 'mu'],
      ['ω', 'ω', 'oméga'], ['φ', 'φ', 'phi'], ['ρ', 'ρ', 'rhô'], ['σ', 'σ', 'sigma'], ['Ω', 'Ω', 'ohm'], ['°', '°', 'degré'], ['‰', '‰', 'pour mille']
    ]]
  ];

  /* ---------- touches de la calculatrice ---------- */
  // [libellé, action ou texte inséré, libellé 2nde, texte 2nde, classe]
  var KEYS = [
    ['sin', 'sin(', 'sin⁻¹', 'arcsin(', 'fn'], ['cos', 'cos(', 'cos⁻¹', 'arccos(', 'fn'], ['tan', 'tan(', 'tan⁻¹', 'arctan(', 'fn'],
    ['ln', 'ln(', 'eˣ', 'e^(', 'fn'], ['log', 'log(', '10ˣ', '10^(', 'fn'],
    ['√', '√(', '∛', '∛(', 'fn'], ['x²', '²', 'x³', '³', 'fn'], ['xʸ', '^', null, null, 'fn'], ['π', 'π', null, null, 'fn'], ['e', 'e', null, null, 'fn'],
    ['(', '(', null, null, 'op'], [')', ')', null, null, 'op'], ['%', '%', null, null, 'op'], ['⌫', '#del', null, null, 'ctl'], ['AC', '#clear', null, null, 'ctl'],
    ['7', '7'], ['8', '8'], ['9', '9'], ['÷', '÷', null, null, 'op'], ['×10ⁿ', '×10^', null, null, 'fn'],
    ['4', '4'], ['5', '5'], ['6', '6'], ['×', '×', null, null, 'op'], ['Ans', 'Ans', null, null, 'fn'],
    ['1', '1'], ['2', '2'], ['3', '3'], ['−', '−', null, null, 'op'], ['n!', '!', null, null, 'fn'],
    ['0', '0', null, null, 'wide'], [',', ','], ['+', '+', null, null, 'op'], ['=', '#eval', null, null, 'eq']
  ];
  var KEY_NAMES = { '⌫': 'Effacer le dernier caractère', 'AC': 'Tout effacer', '−': 'moins', '×': 'fois', '÷': 'divisé par',
    'xʸ': 'puissance', 'x²': 'au carré', '√': 'racine carrée', 'n!': 'factorielle', '×10ⁿ': 'fois dix puissance', '=': 'Calculer' };

  var root, paper, text, ink, inkCtx, qBox, clearBtn, modeBtns, tabs, panels;
  var expr, result, angleBtn, secondBtn, useBtn, sheetBtn, hist;
  var ctx = null, mode = 'text', angle = store.get('calc-angle') || 'rad', second = false;
  var ans, lastValue = null, justEvaluated = false, history = [];
  var strokes = [], drawing = null, undoState = null, undoTimer = 0;

  function btn(cls, html, attrs) {
    var b = el('button', Object.assign({ type: 'button', class: cls }, attrs || {}));
    b.innerHTML = html;
    return b;
  }

  function build() {
    root = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-title' });
    root.hidden = true;

    /* barre du haut */
    var close = btn('sheet-icon sheet-close', icon('close'), { 'aria-label': 'Fermer le brouillon', title: 'Fermer (Échap)' });
    close.addEventListener('click', closeSheet);
    modeBtns = [
      btn('seg-btn', icon('text') + '<span>Texte</span>', { 'data-mode': 'text', 'aria-pressed': 'true' }),
      btn('seg-btn', icon('pen') + '<span>Stylo</span>', { 'data-mode': 'pen', 'aria-pressed': 'false' })
    ];
    modeBtns.forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.mode); }); });
    clearBtn = btn('sheet-tool', icon('trash') + '<span>Effacer</span>', { title: 'Effacer la feuille (ou le dessin en mode Stylo)' });
    clearBtn.addEventListener('click', clearOrUndo);
    qBox = el('div', { class: 'sheet-q', 'aria-label': 'Question en cours' });
    var bar = el('header', { class: 'sheet-bar' }, [
      el('h2', { id: 'sheet-title', class: 'sheet-title', text: 'Brouillon' }),
      qBox,
      el('div', { class: 'sheet-tools' }, [el('div', { class: 'seg', role: 'group', 'aria-label': 'Outil d’écriture' }, modeBtns), clearBtn, close])
    ]);

    /* feuille */
    text = el('textarea', { class: 'sheet-text', 'aria-label': 'Feuille de brouillon', placeholder: 'Écris tes calculs ici… (les symboles sont en dessous)',
      spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off' });
    text.value = store.get(KEY) || '';
    var saveT = 0;
    text.addEventListener('input', function () { clearTimeout(saveT); saveT = setTimeout(function () { store.set(KEY, text.value); }, 300); });
    ink = el('canvas', { class: 'sheet-ink', 'aria-hidden': 'true' });
    paper = el('section', { class: 'sheet-paper', 'aria-label': 'Feuille' }, [text, ink]);
    setupInk();

    /* symboles */
    var sym = el('section', { class: 'sheet-symbols', id: 'sheet-symbols', role: 'tabpanel', 'aria-label': 'Symboles mathématiques' });
    GROUPS.forEach(function (g) {
      var grid = el('div', { class: 'sym-grid' });
      g[1].forEach(function (s) {
        var b = el('button', { type: 'button', class: 'sym', text: s[0], 'data-ins': s[1] });
        if (s[2]) { b.setAttribute('aria-label', s[2]); b.title = s[2]; }
        grid.appendChild(b);
      });
      sym.appendChild(el('div', { class: 'sym-group' }, [el('p', { class: 'sym-label', text: g[0] }), grid]));
    });
    sym.addEventListener('pointerdown', function (e) { if (e.target.closest('.sym')) e.preventDefault(); }); // garde le curseur dans la feuille
    sym.addEventListener('click', function (e) {
      var b = e.target.closest('.sym'); if (!b) return;
      if (mode !== 'text') setMode('text');
      insertInto(text, b.dataset.ins);
      store.set(KEY, text.value);
    });

    /* calculatrice */
    angleBtn = btn('calc-flag', '', { 'aria-label': 'Unité d’angle' });
    angleBtn.addEventListener('click', function () { angle = angle === 'rad' ? 'deg' : 'rad'; store.set('calc-angle', angle); syncFlags(); preview(); });
    secondBtn = btn('calc-flag', '2nde', { 'aria-pressed': 'false', title: 'Fonctions secondes (sin⁻¹, eˣ, 10ˣ, ∛, x³)' });
    secondBtn.addEventListener('click', function () { second = !second; syncFlags(); });
    expr = el('input', { class: 'calc-expr', type: 'text', 'aria-label': 'Calcul à effectuer', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', enterkeyhint: 'done' });
    if (coarse) expr.setAttribute('inputmode', 'none'); // le clavier de la calculatrice remplace celui du téléphone
    result = el('output', { class: 'calc-result', 'aria-live': 'polite' });
    expr.addEventListener('input', function () { justEvaluated = false; preview(); });
    expr.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); evaluateNow(); } });
    var keys = el('div', { class: 'calc-keys' });
    KEYS.forEach(function (k) {
      var b = btn('key' + (k[4] ? ' key-' + k[4] : ''), k[0], { 'data-ins': k[1] });
      if (k[2]) { b.dataset.alt = k[2]; b.dataset.altIns = k[3]; b.dataset.label = k[0]; }
      if (KEY_NAMES[k[0]]) b.setAttribute('aria-label', KEY_NAMES[k[0]]);
      keys.appendChild(b);
    });
    keys.addEventListener('pointerdown', function (e) { if (e.target.closest('.key')) e.preventDefault(); });
    keys.addEventListener('click', function (e) {
      var b = e.target.closest('.key'); if (!b) return;
      var ins = second && b.dataset.altIns ? b.dataset.altIns : b.dataset.ins;
      if (second && b.dataset.altIns) { second = false; syncFlags(); }
      press(ins);
    });
    useBtn = btn('calc-act calc-use', icon('check') + '<span>Utiliser comme réponse</span>');
    useBtn.addEventListener('click', useAsAnswer);
    sheetBtn = btn('calc-act', icon('insert') + '<span>Vers la feuille</span>');
    sheetBtn.addEventListener('click', function () {
      if (lastValue === null && !evaluateNow()) return;
      var line = (expr.dataset.done || expr.value) + ' = ' + CORE.fmtCalc(lastValue);
      var v = text.value;
      text.value = v + (v && !/\n$/.test(v) ? '\n' : '') + line + '\n';
      store.set(KEY, text.value);
      flash(sheetBtn, 'Ajouté à la feuille');
    });
    hist = el('ol', { class: 'calc-history', 'aria-label': 'Historique des calculs' });
    hist.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      expr.value = b.dataset.expr; justEvaluated = false; preview();
    });
    var calc = el('section', { class: 'sheet-calc', id: 'sheet-calc', role: 'tabpanel', 'aria-label': 'Calculatrice' }, [
      el('div', { class: 'calc-screen' }, [el('div', { class: 'calc-flags' }, [angleBtn, secondBtn]), expr, result]),
      keys,
      el('div', { class: 'calc-actions' }, [useBtn, sheetBtn]),
      hist
    ]);

    /* onglets (téléphone) */
    tabs = [
      btn('tab', 'Symboles', { role: 'tab', 'aria-controls': 'sheet-symbols', 'aria-selected': 'true' }),
      btn('tab', 'Calculatrice', { role: 'tab', 'aria-controls': 'sheet-calc', 'aria-selected': 'false' })
    ];
    panels = [sym, calc];
    tabs.forEach(function (t, i) { t.addEventListener('click', function () { selectTab(i); }); });
    var tablist = el('div', { class: 'sheet-tabs', role: 'tablist', 'aria-label': 'Outils' }, tabs);

    root.appendChild(bar);
    root.appendChild(el('div', { class: 'sheet-body' }, [paper, tablist, sym, calc]));
    document.body.appendChild(root);
    selectTab(store.get('sheet-tab') === '1' ? 1 : 0);
    syncFlags();

    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeSheet(); }
      else if (e.key === 'Tab') trapFocus(e);
    });
    if (window.visualViewport) {
      // Clavier virtuel iOS / Android : la feuille se cale sur la zone réellement visible.
      var fit = function () {
        if (root.hidden) return;
        var vv = window.visualViewport;
        root.style.height = vv.height + 'px';
        root.style.top = vv.offsetTop + 'px';
      };
      window.visualViewport.addEventListener('resize', fit);
      window.visualViewport.addEventListener('scroll', fit);
    }
  }

  function selectTab(i) {
    tabs.forEach(function (t, j) { t.setAttribute('aria-selected', String(i === j)); t.tabIndex = i === j ? 0 : -1; });
    panels.forEach(function (p, j) { p.classList.toggle('is-active', i === j); });
    store.set('sheet-tab', String(i));
  }

  function syncFlags() {
    angleBtn.textContent = angle === 'rad' ? 'RAD' : 'DEG';
    angleBtn.title = angle === 'rad' ? 'Angles en radians (toucher pour passer en degrés)' : 'Angles en degrés (toucher pour passer en radians)';
    secondBtn.setAttribute('aria-pressed', String(second));
    root.querySelectorAll('.key[data-alt]').forEach(function (b) {
      b.textContent = second ? b.dataset.alt : b.dataset.label;
    });
  }

  function insertInto(field, snippet) {
    var r = CORE.insertSnippet(field.value, field.selectionStart, field.selectionEnd, snippet);
    field.value = r.value;
    field.setSelectionRange(r.caret, r.caret);
    if (!coarse || field === text) field.focus();
  }

  /* ---------- calculatrice ---------- */
  function press(ins) {
    if (ins === '#eval') { evaluateNow(); return; }
    if (ins === '#clear') { expr.value = ''; result.textContent = ''; result.className = 'calc-result'; lastValue = null; justEvaluated = false; return; }
    if (ins === '#del') {
      var s = expr.selectionStart, e = expr.selectionEnd;
      if (s === null || s === undefined) { s = e = expr.value.length; }
      if (s === e && s > 0) s--;
      expr.value = expr.value.slice(0, s) + expr.value.slice(e);
      expr.setSelectionRange(s, s);
      justEvaluated = false; preview();
      return;
    }
    if (justEvaluated) {
      // Après « = » : un opérateur poursuit le calcul avec Ans, un chiffre en commence un nouveau.
      expr.value = /^[+−×÷^²³%!]/.test(ins) ? 'Ans' : '';
      expr.setSelectionRange(expr.value.length, expr.value.length);
      justEvaluated = false;
    }
    insertInto(expr, ins);
    preview();
  }
  function preview() {
    lastValue = null;
    if (!expr.value.trim()) { result.textContent = ''; result.className = 'calc-result'; return; }
    try {
      var v = CORE.evaluate(expr.value, { angle: angle, ans: ans });
      result.textContent = '= ' + CORE.fmtCalc(v);
      result.className = 'calc-result is-preview';
    } catch (e) { result.textContent = ''; result.className = 'calc-result'; }
  }
  function evaluateNow() {
    if (!expr.value.trim()) return false;
    try {
      var v = CORE.evaluate(expr.value, { angle: angle, ans: ans });
      ans = v; lastValue = v; justEvaluated = true;
      expr.dataset.done = expr.value;
      result.textContent = '= ' + CORE.fmtCalc(v);
      result.className = 'calc-result is-done';
      history.unshift({ e: expr.value, v: v });
      history = history.slice(0, 8);
      hist.innerHTML = '';
      history.forEach(function (h) {
        var b = el('button', { type: 'button', 'data-expr': h.e, title: 'Reprendre ce calcul' });
        b.appendChild(el('span', { text: h.e }));
        b.appendChild(el('b', { text: '= ' + CORE.fmtCalc(h.v) }));
        hist.appendChild(el('li', null, [b]));
      });
      return true;
    } catch (e) {
      lastValue = null; justEvaluated = false;
      result.textContent = e.message || 'Erreur';
      result.className = 'calc-result is-error';
      return false;
    }
  }
  /** Nombre → texte que parseNum relit à l'identique (virgule, notation 6,02e23). */
  function answerText(v) {
    var s = String(parseFloat(v.toPrecision(12)));
    return s.replace('.', ',');
  }
  function useAsAnswer() {
    if (!ctx || !ctx.input) return;
    if (lastValue === null && !evaluateNow()) return;
    ctx.input.value = answerText(lastValue);
    var input = ctx.input;
    closeSheet();
    input.focus();
  }
  function flash(b, msg) {
    var span = b.querySelector('span'), old = span.textContent;
    span.textContent = msg;
    setTimeout(function () { span.textContent = old; }, 1400);
  }

  /* ---------- mode stylo ---------- */
  function setupInk() {
    inkCtx = ink.getContext('2d');
    try { strokes = JSON.parse(store.get(INK_KEY) || '[]'); } catch (e) { strokes = []; }
    function pos(e) { var r = ink.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    ink.addEventListener('pointerdown', function (e) {
      if (mode !== 'pen') return;
      e.preventDefault();
      ink.setPointerCapture && ink.setPointerCapture(e.pointerId);
      drawing = { w: e.pointerType === 'pen' ? 2.2 : 2.8, pts: [pos(e)] };
      strokes.push(drawing);
    });
    ink.addEventListener('pointermove', function (e) {
      if (!drawing) return;
      var pts = drawing.pts, p = pos(e), q = pts[pts.length - 1];
      if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) < 1.5) return;
      pts.push(p);
      inkCtx.beginPath(); inkCtx.moveTo(q[0], q[1]); inkCtx.lineTo(p[0], p[1]);
      inkCtx.lineWidth = drawing.w; inkCtx.stroke();
    });
    function end() {
      if (!drawing) return;
      drawing = null;
      if (strokes.length > 400) strokes = strokes.slice(-400);
      store.set(INK_KEY, JSON.stringify(strokes.map(function (s) {
        return { w: s.w, pts: s.pts.map(function (p) { return [Math.round(p[0]), Math.round(p[1])]; }) };
      })));
    }
    ink.addEventListener('pointerup', end);
    ink.addEventListener('pointercancel', end);
    if ('ResizeObserver' in window) new ResizeObserver(redrawInk).observe(paper);
  }
  function redrawInk() {
    var dpr = window.devicePixelRatio || 1, w = paper.clientWidth, h = paper.clientHeight;
    if (!w || !h) return;
    ink.width = Math.round(w * dpr); ink.height = Math.round(h * dpr);
    inkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    inkCtx.lineCap = inkCtx.lineJoin = 'round';
    inkCtx.strokeStyle = '#f4f1e8';
    strokes.forEach(function (s) {
      inkCtx.lineWidth = s.w; inkCtx.beginPath();
      s.pts.forEach(function (p, i) { if (i) inkCtx.lineTo(p[0], p[1]); else inkCtx.moveTo(p[0], p[1]); });
      if (s.pts.length === 1) inkCtx.lineTo(s.pts[0][0] + .1, s.pts[0][1]);
      inkCtx.stroke();
    });
  }
  function setMode(m) {
    mode = m;
    root.classList.toggle('is-pen', m === 'pen');
    modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === m)); });
    if (m === 'text' && !coarse) text.focus();
  }

  /* ---------- effacer (avec annulation) ---------- */
  function clearOrUndo() {
    var span = clearBtn.querySelector('span');
    if (undoState) {
      if (undoState.mode === 'pen') { strokes = undoState.data; store.set(INK_KEY, JSON.stringify(strokes)); redrawInk(); }
      else { text.value = undoState.data; store.set(KEY, text.value); }
      undoState = null; clearTimeout(undoTimer); span.textContent = 'Effacer';
      return;
    }
    if (mode === 'pen') {
      if (!strokes.length) return;
      undoState = { mode: 'pen', data: strokes }; strokes = []; store.set(INK_KEY, '[]'); redrawInk();
    } else {
      if (!text.value) return;
      undoState = { mode: 'text', data: text.value }; text.value = ''; store.set(KEY, '');
    }
    span.textContent = 'Annuler';
    clearTimeout(undoTimer);
    undoTimer = setTimeout(function () { undoState = null; span.textContent = 'Effacer'; }, 6000);
  }

  /* ---------- ouverture / fermeture ---------- */
  function focusables() {
    return Array.prototype.filter.call(root.querySelectorAll('button, textarea, input, [tabindex="0"]'), function (n) {
      return !n.disabled && n.offsetParent !== null;
    });
  }
  function trapFocus(e) {
    var f = focusables(); if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function openSheet(c) {
    if (!root) build();
    ctx = c || null;
    qBox.innerHTML = '';
    if (ctx && ctx.question) {
      qBox.innerHTML = ctx.question.innerHTML;
      qBox.hidden = !qBox.textContent.trim();
    } else qBox.hidden = true;
    useBtn.hidden = !(ctx && ctx.input);
    root.hidden = false;
    root.style.height = ''; root.style.top = '';
    if (window.visualViewport) { root.style.height = window.visualViewport.height + 'px'; }
    document.documentElement.classList.add('fs-lock');
    redrawInk();
    // Sur écran tactile, on ne donne pas le focus à la feuille : le clavier masquerait tout.
    if (coarse) root.querySelector('.sheet-close').focus();
    else text.focus();
  }
  function closeSheet() {
    if (!root || root.hidden) return;
    store.set(KEY, text.value);
    root.hidden = true;
    document.documentElement.classList.remove('fs-lock');
    if (ctx && ctx.opener && document.contains(ctx.opener)) ctx.opener.focus();
  }

  window.CourseSheet = { open: openSheet, close: closeSheet, evaluate: CORE.evaluate };
})();
