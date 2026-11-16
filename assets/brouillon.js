/* ==========================================================================
   Brouillon plein écran : feuille + calculatrice « comme au stylo »
   (ouvert par le bouton calculatrice placé à côté de « Vérifier »).

   - Interrupteur Feuille / Calculatrice en haut.
   - Les maths s'écrivent comme sur papier grâce à MathLive (chargé à la demande
     depuis un CDN, comme KaTeX) : une fraction a sa barre et deux cases, une
     intégrale ses deux bornes a et b, une racine son radical…
   - Feuille : une ligne = une zone mathématique ; Entrée crée une ligne, mode Stylo
     pour écrire au doigt. Contenu conservé par chapitre (localStorage).
   - Calculatrice : comprend fractions, racines, puissances, ∫ₐᵇ, Σ, ln, log, trigo…
     (core.js : compileLatex) ; résultat envoyable dans la feuille ou comme réponse.
   - Clavier intégré (onglets Symboles / 123 / abc) : sur téléphone et tablette,
     MathLive n'ouvre pas le clavier du système, c'est ce clavier qui sert.
   - Sans réseau (MathLive indisponible) : repli sur des champs texte simples.
   ========================================================================== */
(function () {
  'use strict';
  var Course = window.Course, CORE = window.CourseCore;
  if (!Course || !CORE) return;
  var el = Course.el, icon = Course.icon, store = Course.store;
  var CH = Course.chapter || 'accueil';
  var KEY_LINES = 'sheet2:' + CH, KEY_OLD = 'sheet:' + CH, KEY_INK = 'sheet-ink:' + CH;
  var K = CORE.CARET;
  var ML_VERSION = '0.111.4';
  var ML_BASE = 'https://cdn.jsdelivr.net/npm/mathlive@' + ML_VERSION;
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  /* ---------- touches ---------- */
  // { l: libellé (LaTeX rendu par KaTeX, ou texte si txt), i: LaTeX inséré (#? = case, #@ = ce qui précède),
  //   p: texte inséré en mode simple (‸ = curseur), a: nom accessible, w: touche large, c: classe }
  function k(l, i, p, a, extra) { return Object.assign({ l: l, i: i, p: p === undefined ? l : p, a: a }, extra || {}); }
  var SYM = [
    ['Fractions, puissances, racines', [
      k('\\frac{a}{b}', '\\frac{#@}{#?}', '(' + K + ')/()', 'fraction'),
      k('x^{2}', '#@^{2}', '²', 'au carré'), k('x^{3}', '#@^{3}', '³', 'au cube'), k('x^{n}', '#@^{#?}', '^(' + K + ')', 'puissance'),
      k('x_{n}', '#@_{#?}', '_' + K, 'indice'),
      k('\\sqrt{x}', '\\sqrt{#?}', '√(' + K + ')', 'racine carrée'), k('\\sqrt[n]{x}', '\\sqrt[#?]{#?}', '∛(' + K + ')', 'racine n-ième'),
      k('e^{x}', 'e^{#?}', 'e^(' + K + ')', 'exponentielle'), k('10^{n}', '10^{#?}', '10^(' + K + ')', 'dix puissance'),
      k('\\times10^{n}', '\\times10^{#?}', '×10^(' + K + ')', 'fois dix puissance'),
      k('(\\,)', '\\left(#?\\right)', '(' + K + ')', 'parenthèses'), k('|x|', '\\left|#?\\right|', '|' + K + '|', 'valeur absolue')
    ]],
    ['Analyse', [
      k('\\int_a^b', '\\int_{#?}^{#?}#?\\,\\mathrm{d}x', '∫[a ; b] (' + K + ') dx', 'intégrale de a à b'),
      k('\\int', '\\int #?\\,\\mathrm{d}x', '∫ (' + K + ') dx', 'intégrale'),
      k('\\sum_{k=1}^{n}', '\\sum_{k=#?}^{#?}#?', 'Σ', 'somme de k = … à …'),
      k('\\lim_{x\\to a}', '\\lim_{x\\to#?}#?', 'lim(x→' + K + ') ', 'limite'),
      k("f'(x)", "f^{\\prime}\\left(#?\\right)", "f′(" + K + ')', 'f prime de'),
      k('\\frac{\\mathrm{d}y}{\\mathrm{d}x}', '\\frac{\\mathrm{d}#?}{\\mathrm{d}#?}', 'dy/dx', 'dérivée d sur d'),
      k('\\Delta', '\\Delta', 'Δ', 'delta'), k('\\infty', '\\infty', '∞', 'infini'), k('\\to', '\\to', ' → ', 'tend vers'),
      k('[a;b]', '\\left\\lbrack #?;#?\\right\\rbrack', '[' + K + ' ; ]', 'intervalle')
    ]],
    ['Fonctions', [
      k('\\ln', '\\ln\\left(#?\\right)', 'ln(' + K + ')', 'logarithme népérien'), k('\\log', '\\log\\left(#?\\right)', 'log(' + K + ')', 'logarithme décimal'),
      k('\\exp', '\\exp\\left(#?\\right)', 'exp(' + K + ')', 'exponentielle'),
      k('\\sin', '\\sin\\left(#?\\right)', 'sin(' + K + ')'), k('\\cos', '\\cos\\left(#?\\right)', 'cos(' + K + ')'), k('\\tan', '\\tan\\left(#?\\right)', 'tan(' + K + ')'),
      k('\\sin^{-1}', '\\arcsin\\left(#?\\right)', 'arcsin(' + K + ')', 'arc sinus'), k('\\cos^{-1}', '\\arccos\\left(#?\\right)', 'arccos(' + K + ')', 'arc cosinus'),
      k('\\tan^{-1}', '\\arctan\\left(#?\\right)', 'arctan(' + K + ')', 'arc tangente'), k('f(x)', 'f\\left(#?\\right)', 'f(' + K + ')')
    ]],
    ['Relations et ensembles', [
      k('=', '=', ' = '), k('\\ne', '\\ne', ' ≠ ', 'différent de'), k('\\approx', '\\approx', ' ≈ ', 'environ égal'),
      k('<', '<', ' < '), k('>', '>', ' > '), k('\\le', '\\le', ' ≤ ', 'inférieur ou égal'), k('\\ge', '\\ge', ' ≥ ', 'supérieur ou égal'),
      k('\\pm', '\\pm', '±', 'plus ou moins'), k('\\Rightarrow', '\\Rightarrow', ' ⇒ ', 'implique'), k('\\Leftrightarrow', '\\Leftrightarrow', ' ⇔ ', 'équivaut à'),
      k('\\in', '\\in', ' ∈ ', 'appartient à'), k('\\notin', '\\notin', ' ∉ ', 'n’appartient pas à'), k('\\cap', '\\cap', ' ∩ ', 'inter'), k('\\cup', '\\cup', ' ∪ ', 'union'),
      k('\\emptyset', '\\emptyset', '∅', 'ensemble vide'), k('\\mathbb{R}', '\\mathbb{R}', 'ℝ'), k('\\mathbb{N}', '\\mathbb{N}', 'ℕ'), k('\\mathbb{Z}', '\\mathbb{Z}', 'ℤ'),
      k('\\mathbb{C}', '\\mathbb{C}', 'ℂ'), k('\\forall', '\\forall', '∀', 'pour tout'), k('\\exists', '\\exists', '∃', 'il existe')
    ]],
    ['Vecteurs et complexes', [
      k('\\vec{u}', '\\overrightarrow{#?}', '\u20d7', 'vecteur'), k('\\vec{u}\\cdot\\vec{v}', '\\cdot', '·', 'produit scalaire'),
      k('\\|\\vec{u}\\|', '\\left\\Vert #?\\right\\Vert', '‖' + K + '‖', 'norme'),
      k('i', 'i', 'i'), k('\\bar{z}', '\\overline{#?}', '\u0304', 'conjugué'), k('|z|', '\\left|#?\\right|', '|' + K + '|', 'module'),
      k('\\arg', '\\arg\\left(#?\\right)', 'arg(' + K + ')', 'argument')
    ]],
    ['Lettres grecques et unités', [
      k('\\alpha', '\\alpha', 'α'), k('\\beta', '\\beta', 'β'), k('\\theta', '\\theta', 'θ'), k('\\lambda', '\\lambda', 'λ'),
      k('\\mu', '\\mu', 'μ'), k('\\pi', '\\pi', 'π'), k('\\rho', '\\rho', 'ρ'), k('\\sigma', '\\sigma', 'σ'), k('\\tau', '\\tau', 'τ'),
      k('\\varphi', '\\varphi', 'φ'), k('\\omega', '\\omega', 'ω'), k('\\Omega', '\\Omega', 'Ω', 'ohm'), k('\\eta', '\\eta', 'η', 'rendement êta'),
      k('x^{\\circ}', '^{\\circ}', '°', 'degré'), k('\\%', '\\%', '%', 'pour cent')
    ]]
  ];
  var NUM = [
    k('\\sin', '\\sin\\left(#?\\right)', 'sin(' + K + ')', null, { c: 'fn' }), k('\\cos', '\\cos\\left(#?\\right)', 'cos(' + K + ')', null, { c: 'fn' }),
    k('\\tan', '\\tan\\left(#?\\right)', 'tan(' + K + ')', null, { c: 'fn' }), k('\\ln', '\\ln\\left(#?\\right)', 'ln(' + K + ')', 'ln', { c: 'fn' }),
    k('\\log', '\\log\\left(#?\\right)', 'log(' + K + ')', 'log', { c: 'fn' }), k('e^{x}', 'e^{#?}', 'e^(' + K + ')', 'exponentielle', { c: 'fn' }),
    k('7', '7'), k('8', '8'), k('9', '9'), k('\\div', '\\div', '÷', 'divisé par', { c: 'op' }), k('(\\,)', '\\left(#?\\right)', '(' + K + ')', 'parenthèses', { c: 'op' }), k('\\frac{a}{b}', '\\frac{#@}{#?}', '(' + K + ')/()', 'fraction', { c: 'op' }),
    k('4', '4'), k('5', '5'), k('6', '6'), k('\\times', '\\times', '×', 'fois', { c: 'op' }), k('x^{2}', '#@^{2}', '²', 'au carré', { c: 'op' }), k('x^{n}', '#@^{#?}', '^', 'puissance', { c: 'op' }),
    k('1', '1'), k('2', '2'), k('3', '3'), k('-', '-', '−', 'moins', { c: 'op' }), k('\\sqrt{x}', '\\sqrt{#?}', '√(' + K + ')', 'racine carrée', { c: 'op' }), k('x', 'x', 'x', 'x'),
    k('0', '0'), k(',', '{,}', ',', 'virgule'), k('\\pi', '\\pi', 'π', 'pi'), k('+', '+', '+', 'plus', { c: 'op' }), k('e', 'e', 'e', 'e'), k('\\text{Ans}', '\\operatorname{Ans}', 'Ans', 'résultat précédent')
  ];
  var ABC = ['azertyuiop', 'qsdfghjklm', 'wxcvbn'];

  /* ---------- état ---------- */
  var root, body, qBox, modeBtns, thumb, paper, lines, ink, inkCtx, penBtns, clearBtn, calcView, calcHost, result, hist, angleBtn, useBtn, sheetBtn, enterKey;
  var kbTabs, kbPanes, loadNote;
  var ctx = null, mode = store.get('sheet-mode') === 'calc' ? 'calc' : 'sheet', tool = 'text', angle = store.get('calc-angle') || 'rad';
  var ML = null, mlState = 'idle', active = null, calcField = null;
  var ans, lastValue = null, history = [], strokes = [], drawing = null, undoState = null, undoTimer = 0;

  /* ---------- chargement de MathLive ---------- */
  function loadMathLive() {
    if (mlState === 'ready') return Promise.resolve(true);
    if (mlState === 'failed') return Promise.resolve(false);
    if (loadMathLive.p) return loadMathLive.p;
    mlState = 'loading';
    loadMathLive.p = new Promise(function (resolve) {
      if (window.customElements && window.customElements.get('math-field')) { resolve(true); return; }
      var s = document.createElement('script');
      s.src = ML_BASE + '/mathlive.min.js';
      s.async = true;
      var to = setTimeout(function () { resolve(false); }, 12000);
      s.onload = function () { clearTimeout(to); resolve(!!(window.customElements && window.customElements.get('math-field'))); };
      s.onerror = function () { clearTimeout(to); resolve(false); };
      document.head.appendChild(s);
    }).then(function (ok) {
      mlState = ok ? 'ready' : 'failed';
      if (ok) {
        ML = window.MathfieldElement || (window.MathLive && window.MathLive.MathfieldElement);
        try {
          ML.fontsDirectory = ML_BASE + '/fonts';
          ML.soundsDirectory = null; ML.keypressSound = null; ML.plonkSound = null;
          ML.decimalSeparator = ',';
        } catch (e) { /* options facultatives */ }
      }
      return ok;
    });
    return loadMathLive.p;
  }

  /* ---------- champs (MathLive ou repli texte) ---------- */
  function makeField(kind, value) {
    var f;
    if (mlState === 'ready') {
      f = document.createElement('math-field');
      f.mathVirtualKeyboardPolicy = 'manual';
      f.setAttribute('math-virtual-keyboard-policy', 'manual');
      f.smartMode = false;
      f.className = kind === 'calc' ? 'mf calc-field' : 'mf line';
      f.setAttribute('aria-label', kind === 'calc' ? 'Calcul à effectuer' : 'Ligne du brouillon');
      if (value) f.value = value;
    } else {
      f = el(kind === 'calc' ? 'input' : 'input', { type: 'text', class: (kind === 'calc' ? 'calc-field' : 'line') + ' plain', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off',
        'aria-label': kind === 'calc' ? 'Calcul à effectuer' : 'Ligne du brouillon' });
      if (coarse && kind === 'calc') f.setAttribute('inputmode', 'none');
      f.value = value || '';
    }
    f.addEventListener('focusin', function () { active = f; });
    return f;
  }
  function isMath(f) { return f && f.tagName === 'MATH-FIELD'; }
  function fieldValue(f) { return isMath(f) ? f.getValue('latex') : f.value; }
  function insertKey(f, key) {
    if (!f) return;
    if (isMath(f)) {
      var tpl = key.space ? (f.mode === 'text' ? ' ' : '\\:') : key.i;
      f.insert(tpl, { selectionMode: 'placeholder', focus: !coarse, format: 'latex' });
      if (!coarse) f.focus();
    } else {
      var r = CORE.insertSnippet(f.value, f.selectionStart, f.selectionEnd, key.p);
      f.value = r.value; f.setSelectionRange(r.caret, r.caret);
      if (!coarse) f.focus();
    }
    f.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function command(f, name) {
    if (!f) return;
    if (isMath(f)) { f.executeCommand(name); }
    else {
      var s = f.selectionStart, e = f.selectionEnd;
      if (name === 'deleteBackward') { if (s === e && s > 0) s--; f.value = f.value.slice(0, s) + f.value.slice(e); f.setSelectionRange(s, s); }
      else if (name === 'moveToPreviousChar') f.setSelectionRange(Math.max(0, s - 1), Math.max(0, s - 1));
      else if (name === 'moveToNextChar' || name === 'moveToNextPlaceholder') f.setSelectionRange(Math.min(f.value.length, e + 1), Math.min(f.value.length, e + 1));
    }
    f.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function clearField(f) { if (!f) return; if (isMath(f)) f.setValue(''); else f.value = ''; f.dispatchEvent(new Event('input', { bubbles: true })); }

  /* ---------- feuille : lignes ---------- */
  function saveLines() {
    if (!lines) return;
    var vals = Array.prototype.map.call(lines.children, fieldValue);
    while (vals.length > 1 && !vals[vals.length - 1]) vals.pop();
    store.set(KEY_LINES, JSON.stringify({ math: mlState === 'ready', lines: vals }));
  }
  function readLines() {
    try {
      var o = JSON.parse(store.get(KEY_LINES) || 'null');
      if (o && o.lines) {
        // du texte simple ne se relit pas comme du LaTeX : on l'enveloppe dans \text{}
        if (!o.math && mlState === 'ready') return o.lines.map(function (t) { return t ? '\\text{' + t.replace(/[\\{}]/g, '') + '}' : ''; });
        return o.lines;
      }
    } catch (e) { /* données abîmées */ }
    var old = store.get(KEY_OLD);
    if (old) return old.split('\n').map(function (t) { return t && mlState === 'ready' ? '\\text{' + t.replace(/[\\{}]/g, '') + '}' : t; });
    return [''];
  }
  function addLine(after, value, focus) {
    var f = makeField('line', value);
    if (after && after.nextSibling) lines.insertBefore(f, after.nextSibling);
    else if (after) lines.appendChild(f);
    else lines.appendChild(f);
    f.addEventListener('input', saveLines);
    f.addEventListener('beforeinput', function (ev) {
      if (ev.inputType === 'insertLineBreak') { ev.preventDefault(); addLine(f, '', true); saveLines(); }
      else if (ev.inputType === 'deleteContentBackward' && !fieldValue(f) && lines.children.length > 1) {
        ev.preventDefault();
        var prev = f.previousSibling || f.nextSibling;
        f.remove(); saveLines();
        if (prev) { prev.focus(); active = prev; }
      }
    });
    if (!isMath(f)) f.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); addLine(f, '', true); saveLines(); } });
    if (focus) { setTimeout(function () { f.focus(); active = f; }, 0); }
    return f;
  }
  function fillLines() {
    lines.innerHTML = '';
    readLines().forEach(function (v) { addLine(null, v, false); });
    if (!lines.children.length) addLine(null, '', false);
    active = lines.lastChild;
  }

  /* ---------- calculatrice ---------- */
  function calcEval(commit) {
    var src = fieldValue(calcField).trim();
    lastValue = null;
    if (!src) { result.textContent = ''; result.className = 'calc-result'; return false; }
    try {
      var v = isMath(calcField) ? CORE.evaluateLatex(src, { angle: angle, ans: ans }) : CORE.evaluate(src, { angle: angle, ans: ans });
      lastValue = v;
      result.textContent = '= ' + CORE.fmtCalc(v);
      result.className = 'calc-result ' + (commit ? 'is-done' : 'is-preview');
      if (commit) {
        ans = v;
        history.unshift({ src: src, v: v, math: isMath(calcField) });
        history = history.slice(0, 8);
        renderHistory();
      }
      return true;
    } catch (e) {
      result.textContent = commit ? (e.message || 'Erreur') : '';
      result.className = 'calc-result' + (commit ? ' is-error' : '');
      return false;
    }
  }
  function renderHistory() {
    hist.innerHTML = '';
    history.forEach(function (h) {
      var b = el('button', { type: 'button', title: 'Reprendre ce calcul' });
      var expr = el('span', { class: 'h-expr' });
      if (h.math && window.katex) { try { window.katex.render(h.src, expr, { throwOnError: false }); } catch (e) { expr.textContent = h.src; } } else expr.textContent = h.src;
      b.appendChild(expr);
      b.appendChild(el('b', { text: '= ' + CORE.fmtCalc(h.v) }));
      b.addEventListener('click', function () {
        if (isMath(calcField)) calcField.setValue(h.src); else calcField.value = h.src;
        calcEval(false); if (!coarse) calcField.focus();
      });
      hist.appendChild(el('li', null, [b]));
    });
  }
  function resultLatex(v) {
    return CORE.fmtCalc(v).replace(/\u202f/g, '\\,').replace(/,/g, '{,}').replace(/ × 10\^(-?\d+)/, '\\times10^{$1}').replace('−', '-').replace('∞', '\\infty');
  }
  function answerText(v) { return String(parseFloat(v.toPrecision(12))).replace('.', ','); }
  function useAsAnswer() {
    if (!ctx || !ctx.input) return;
    if (lastValue === null && !calcEval(true)) return;
    ctx.input.value = answerText(lastValue);
    var input = ctx.input;
    closeSheet();
    input.focus();
  }
  function toSheet() {
    if (lastValue === null && !calcEval(true)) return;
    var src = fieldValue(calcField);
    var line = isMath(calcField) ? src + '=' + resultLatex(lastValue) : src + ' = ' + CORE.fmtCalc(lastValue);
    var last = lines.lastChild;
    if (last && !fieldValue(last)) { if (isMath(last)) last.setValue(line); else last.value = line; }
    else addLine(last, line, false);
    saveLines();
    flash(sheetBtn, 'Ajouté à la feuille');
  }
  function flash(b, msg) { var span = b.querySelector('span'), old = span.textContent; span.textContent = msg; setTimeout(function () { span.textContent = old; }, 1400); }

  /* ---------- stylo ---------- */
  function setupInk() {
    inkCtx = ink.getContext('2d');
    try { strokes = JSON.parse(store.get(KEY_INK) || '[]'); } catch (e) { strokes = []; }
    function pos(e) { var r = ink.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    ink.addEventListener('pointerdown', function (e) {
      if (tool !== 'pen') return;
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
      inkCtx.beginPath(); inkCtx.moveTo(q[0], q[1]); inkCtx.lineTo(p[0], p[1]); inkCtx.lineWidth = drawing.w; inkCtx.stroke();
    });
    function end() {
      if (!drawing) return;
      drawing = null;
      if (strokes.length > 400) strokes = strokes.slice(-400);
      store.set(KEY_INK, JSON.stringify(strokes.map(function (s) { return { w: s.w, pts: s.pts.map(function (p) { return [Math.round(p[0]), Math.round(p[1])]; }) }; })));
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
  function setTool(t) {
    tool = t;
    root.classList.toggle('is-pen', t === 'pen');
    penBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tool === t)); });
  }
  function clearOrUndo() {
    var span = clearBtn.querySelector('span');
    if (undoState) {
      if (undoState.tool === 'pen') { strokes = undoState.data; store.set(KEY_INK, JSON.stringify(strokes)); redrawInk(); }
      else { store.set(KEY_LINES, undoState.data); fillLines(); }
      undoState = null; clearTimeout(undoTimer); span.textContent = 'Effacer';
      return;
    }
    if (tool === 'pen') {
      if (!strokes.length) return;
      undoState = { tool: 'pen', data: strokes }; strokes = []; store.set(KEY_INK, '[]'); redrawInk();
    } else {
      saveLines();
      undoState = { tool: 'text', data: store.get(KEY_LINES) };
      store.set(KEY_LINES, JSON.stringify({ math: mlState === 'ready', lines: [''] })); fillLines();
    }
    span.textContent = 'Annuler';
    clearTimeout(undoTimer);
    undoTimer = setTimeout(function () { undoState = null; span.textContent = 'Effacer'; }, 6000);
  }

  /* ---------- construction ---------- */
  function btn(cls, html, attrs) { var b = el('button', Object.assign({ type: 'button', class: cls }, attrs || {})); b.innerHTML = html; return b; }
  function keyButton(key, cls) {
    var b = el('button', { type: 'button', class: 'key ' + (cls || '') + (key.c ? ' key-' + key.c : '') });
    if (key.a) { b.setAttribute('aria-label', key.a); b.title = key.a; }
    if (key.txt || !window.katex) b.textContent = key.txt ? key.l : key.p.replace(K, '').replace(/[()]/g, '') || key.l;
    else { try { window.katex.render(key.l, b, { throwOnError: false }); } catch (e) { b.textContent = key.l; } }
    b._key = key;
    b.dataset.k = key.l;
    return b;
  }
  function buildKeyboard() {
    var sym = el('div', { class: 'kb-pane kb-sym', role: 'tabpanel', id: 'kb-sym' });
    SYM.forEach(function (g) {
      var grid = el('div', { class: 'sym-grid' });
      g[1].forEach(function (key) { grid.appendChild(keyButton(key, 'sym')); });
      sym.appendChild(el('div', { class: 'sym-group' }, [el('p', { class: 'sym-label', text: g[0] }), grid]));
    });
    var num = el('div', { class: 'kb-pane kb-num', role: 'tabpanel', id: 'kb-num' });
    var ng = el('div', { class: 'num-grid' });
    NUM.forEach(function (key) { ng.appendChild(keyButton(key, '')); });
    num.appendChild(ng);
    var abc = el('div', { class: 'kb-pane kb-abc', role: 'tabpanel', id: 'kb-abc' });
    ABC.forEach(function (row) {
      var r = el('div', { class: 'abc-row' });
      row.split('').forEach(function (ch) { r.appendChild(keyButton(k(ch, ch, ch, null, { txt: true }), '')); });
      abc.appendChild(r);
    });
    var r4 = el('div', { class: 'abc-row' });
    var textKey = btn('key key-wide2', 'Texte', { 'aria-pressed': 'false', title: 'Écrire des mots (texte) au lieu de maths' });
    textKey.addEventListener('click', function () {
      var on = textKey.getAttribute('aria-pressed') !== 'true';
      textKey.setAttribute('aria-pressed', String(on));
      if (isMath(active)) active.executeCommand(['switchMode', on ? 'text' : 'math']);
    });
    r4.appendChild(textKey);
    r4.appendChild(keyButton(k('espace', ' ', ' ', 'espace', { txt: true, space: true }), 'key-space'));
    abc.appendChild(r4);

    kbPanes = [sym, num, abc];
    kbTabs = [['Symboles', 'kb-sym'], ['123', 'kb-num'], ['abc', 'kb-abc']].map(function (t, i) {
      var b = btn('kb-tab', t[0], { role: 'tab', 'aria-controls': t[1], 'aria-selected': 'false' });
      b.addEventListener('click', function () { selectTab(i); });
      return b;
    });
    var tabs = el('div', { class: 'kb-tabs', role: 'tablist', 'aria-label': 'Clavier' }, kbTabs);

    var nav = el('div', { class: 'kb-nav' });
    var NAV = [['←', 'moveToPreviousChar', 'Reculer'], ['→', 'moveToNextChar', 'Avancer'], ['case ▸', 'moveToNextPlaceholder', 'Case suivante'], ['⌫', 'deleteBackward', 'Effacer le caractère précédent']];
    NAV.forEach(function (n) {
      var b = btn('key key-nav', n[0], { 'aria-label': n[2], title: n[2] });
      b.addEventListener('click', function () { command(active, n[1]); });
      nav.appendChild(b);
    });
    var ac = btn('key key-ctl', 'AC', { 'aria-label': 'Tout effacer dans cette zone', title: 'Tout effacer dans cette zone' });
    ac.addEventListener('click', function () { clearField(active); if (active === calcField) calcEval(false); });
    nav.appendChild(ac);
    enterKey = btn('key key-eq', '↵', { 'aria-label': 'Nouvelle ligne' });
    enterKey.addEventListener('click', function () {
      if (mode === 'calc') calcEval(true);
      else { var f = addLine(active && active.parentNode === lines ? active : lines.lastChild, '', !coarse); active = f; saveLines(); }
    });
    nav.appendChild(enterKey);

    var kb = el('section', { class: 'kb', 'aria-label': 'Clavier mathématique' }, [tabs, sym, num, abc, nav]);
    // les touches ne prennent pas le focus : le curseur reste dans la zone d'écriture
    kb.addEventListener('pointerdown', function (e) { if (e.target.closest('.key, .kb-tab')) e.preventDefault(); });
    kb.addEventListener('click', function (e) {
      var b = e.target.closest('.key'); if (!b || !b._key) return;
      if (mode === 'sheet' && tool === 'pen') setTool('text');
      if (!active || (mode === 'calc' && active !== calcField) || (mode === 'sheet' && active.parentNode !== lines)) active = mode === 'calc' ? calcField : lines.lastChild;
      insertKey(active, b._key);
      if (active === calcField) calcEval(false);
    });
    return kb;
  }
  function selectTab(i) {
    kbTabs.forEach(function (t, j) { t.setAttribute('aria-selected', String(i === j)); t.tabIndex = i === j ? 0 : -1; });
    kbPanes.forEach(function (p, j) { p.classList.toggle('is-active', i === j); });
  }

  function build() {
    root = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-title' });
    root.hidden = true;

    /* barre du haut : titre, interrupteur Feuille / Calculatrice, fermer */
    var close = btn('sheet-icon sheet-close', icon('close'), { 'aria-label': 'Fermer le brouillon', title: 'Fermer (Échap)' });
    close.addEventListener('click', closeSheet);
    modeBtns = [btn('mode-opt', 'Feuille', { role: 'radio', 'data-mode': 'sheet' }), btn('mode-opt', 'Calculatrice', { role: 'radio', 'data-mode': 'calc' })];
    thumb = el('span', { class: 'mode-thumb', 'aria-hidden': 'true' });
    var sw = el('div', { class: 'mode-switch', role: 'radiogroup', 'aria-label': 'Mode' }, [thumb].concat(modeBtns));
    modeBtns.forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.mode); }); });
    qBox = el('div', { class: 'sheet-q', 'aria-label': 'Question en cours' });
    root.appendChild(el('header', { class: 'sheet-bar' }, [el('h2', { id: 'sheet-title', class: 'sheet-title', text: 'Brouillon' }), sw, close, qBox]));

    /* feuille */
    lines = el('div', { class: 'sheet-lines' });
    ink = el('canvas', { class: 'sheet-ink', 'aria-hidden': 'true' });
    penBtns = [btn('seg-btn', icon('text') + '<span>Texte</span>', { 'data-tool': 'text', 'aria-pressed': 'true', title: 'Écrire au clavier' }),
      btn('seg-btn', icon('pen') + '<span>Stylo</span>', { 'data-tool': 'pen', 'aria-pressed': 'false', title: 'Écrire au doigt ou au stylet' })];
    penBtns.forEach(function (b) { b.addEventListener('click', function () { setTool(b.dataset.tool); }); });
    clearBtn = btn('sheet-tool', icon('trash') + '<span>Effacer</span>', { title: 'Effacer la feuille (ou le dessin en mode Stylo)' });
    clearBtn.addEventListener('click', clearOrUndo);
    var paperTools = el('div', { class: 'paper-tools' }, [el('div', { class: 'seg', role: 'group', 'aria-label': 'Outil d’écriture' }, penBtns), clearBtn]);
    paper = el('section', { class: 'sheet-paper', 'aria-label': 'Feuille' }, [lines, ink, paperTools]);
    lines.addEventListener('click', function (e) { if (e.target === lines) { var l = lines.lastChild; if (l) { l.focus(); active = l; } } });

    /* calculatrice */
    angleBtn = btn('calc-flag', '', { 'aria-label': 'Unité d’angle' });
    angleBtn.addEventListener('click', function () { angle = angle === 'rad' ? 'deg' : 'rad'; store.set('calc-angle', angle); syncAngle(); calcEval(false); });
    calcHost = el('div', { class: 'calc-host' });
    result = el('output', { class: 'calc-result', 'aria-live': 'polite' });
    useBtn = btn('calc-act calc-use', icon('check') + '<span>Utiliser comme réponse</span>');
    useBtn.addEventListener('click', useAsAnswer);
    sheetBtn = btn('calc-act', icon('insert') + '<span>Vers la feuille</span>');
    sheetBtn.addEventListener('click', toSheet);
    hist = el('ol', { class: 'calc-history', 'aria-label': 'Historique des calculs' });
    calcView = el('section', { class: 'calc-view', 'aria-label': 'Calculatrice' }, [
      el('div', { class: 'calc-screen' }, [el('div', { class: 'calc-flags' }, [angleBtn, el('span', { class: 'calc-tip', text: 'Écris comme sur ta copie : fractions, ∫, Σ, racines…' })]), calcHost, result]),
      el('div', { class: 'calc-actions' }, [useBtn, sheetBtn]),
      hist
    ]);
    loadNote = el('p', { class: 'load-note', 'aria-live': 'polite' });

    body = el('div', { class: 'sheet-body' }, [paper, calcView, buildKeyboard(), loadNote]);
    root.appendChild(body);
    document.body.appendChild(root);
    setupInk();
    syncAngle();

    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeSheet(); }
      else if (e.key === 'Tab' && !(e.target && e.target.tagName === 'MATH-FIELD')) trapFocus(e);
    });
    if (window.visualViewport) {
      var fit = function () { if (root.hidden) return; var vv = window.visualViewport; root.style.height = vv.height + 'px'; root.style.top = vv.offsetTop + 'px'; };
      window.visualViewport.addEventListener('resize', fit);
      window.visualViewport.addEventListener('scroll', fit);
    }
  }
  function mountFields() {
    // (re)crée les zones d'écriture une fois MathLive chargé (ou en mode simple)
    root.classList.toggle('is-plain', mlState !== 'ready');
    loadNote.textContent = mlState === 'ready' ? '' : 'Éditeur mathématique indisponible (pas de connexion ?) : saisie simple.';
    fillLines();
    calcHost.innerHTML = '';
    calcField = makeField('calc', '');
    calcField.addEventListener('input', function () { calcEval(false); });
    calcField.addEventListener('beforeinput', function (ev) { if (ev.inputType === 'insertLineBreak') { ev.preventDefault(); calcEval(true); } });
    if (!isMath(calcField)) calcField.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); calcEval(true); } });
    calcHost.appendChild(calcField);
    root.dataset.ready = '1';
  }
  function syncAngle() {
    angleBtn.textContent = angle === 'rad' ? 'RAD' : 'DEG';
    angleBtn.title = angle === 'rad' ? 'Angles en radians (toucher pour passer en degrés)' : 'Angles en degrés (toucher pour passer en radians)';
  }
  function setMode(m) {
    mode = m;
    store.set('sheet-mode', m);
    root.dataset.mode = m;
    modeBtns.forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.mode === m)); b.tabIndex = b.dataset.mode === m ? 0 : -1; });
    enterKey.textContent = m === 'calc' ? '=' : '↵';
    enterKey.setAttribute('aria-label', m === 'calc' ? 'Calculer' : 'Nouvelle ligne');
    enterKey.title = enterKey.getAttribute('aria-label');
    selectTab(m === 'calc' ? 1 : 0);
    if (m === 'sheet') { redrawInk(); active = lines.lastChild; } else active = calcField;
    if (!coarse && active) setTimeout(function () { active.focus(); }, 0);
  }

  /* ---------- ouverture / fermeture ---------- */
  function trapFocus(e) {
    var f = Array.prototype.filter.call(root.querySelectorAll('button, input, math-field, [tabindex="0"]'), function (n) { return !n.disabled && n.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function openSheet(c) {
    if (!root) build();
    ctx = c || null;
    qBox.innerHTML = '';
    if (ctx && ctx.question) { qBox.innerHTML = ctx.question.innerHTML; qBox.hidden = !qBox.textContent.trim(); } else qBox.hidden = true;
    useBtn.hidden = !(ctx && ctx.input);
    root.hidden = false;
    root.style.height = ''; root.style.top = '';
    if (window.visualViewport) root.style.height = window.visualViewport.height + 'px';
    document.documentElement.classList.add('fs-lock');
    var go = function () {
      if (!root.dataset.ready) mountFields();
      setMode(mode);
      if (coarse) root.querySelector('.sheet-close').focus();
    };
    if (mlState === 'ready' || mlState === 'failed') go();
    else {
      root.dataset.loading = '1';
      loadNote.textContent = 'Chargement de l’éditeur mathématique…';
      loadMathLive().then(function () { delete root.dataset.loading; go(); });
    }
  }
  function closeSheet() {
    if (!root || root.hidden) return;
    saveLines();
    root.hidden = true;
    document.documentElement.classList.remove('fs-lock');
    if (ctx && ctx.opener && document.contains(ctx.opener)) ctx.opener.focus();
  }

  // Préchargement discret : dès qu'on s'approche d'un bouton calculatrice.
  document.addEventListener('pointerover', function (e) { if (e.target.closest && e.target.closest('.drill-calc')) loadMathLive(); }, { passive: true });
  document.addEventListener('focusin', function (e) { if (e.target.closest && e.target.closest('.drill-calc')) loadMathLive(); });

  window.CourseSheet = { open: openSheet, close: closeSheet, load: loadMathLive };
})();
