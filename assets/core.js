/* ==========================================================================
   Remise à niveau STI2D → Prépa — fonctions pures (sans DOM)
   Utilisées par app.js (navigateur, window.CourseCore) et par les tests
   unitaires (node --test, via module.exports).
   - evaluate : évaluateur d'expressions sûr (pas d'eval / Function)
   - parseNum : lecture tolérante d'une réponse d'élève
   - fmt, fmtCalc : affichage des nombres à la française
   - niceStep, tickStep, decimalsFor : graduations lisibles des graphiques
   - insertSnippet : insertion d'un symbole dans la feuille de brouillon
   ========================================================================== */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CourseCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- évaluateur d'expressions ---------- */
  var FUNCS = {
    sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1, arcsin: 1, arccos: 1, arctan: 1,
    ln: 1, log: 1, exp: 1, sqrt: 1, racine: 1, cbrt: 1, abs: 1
  };
  var CONSTS = { pi: Math.PI, e: Math.E };
  var NAMES = Object.keys(FUNCS).concat(Object.keys(CONSTS), ['ans'])
    .sort(function (a, b) { return b.length - a.length; });

  function CalcError(msg) { this.message = msg; this.name = 'CalcError'; }
  CalcError.prototype = Object.create(Error.prototype);

  /** Normalise la saisie : virgule décimale, symboles typographiques, espaces. */
  function normalize(src) {
    return String(src)
      .replace(/\s+/g, '')
      .replace(/,/g, '.')
      .replace(/[×·∙⋅]/g, '*')
      .replace(/÷/g, '/')
      .replace(/[−–—]/g, '-')
      .replace(/π/g, 'pi')
      .replace(/²/g, '^2')
      .replace(/³/g, '^3')
      .replace(/√/g, 'sqrt')
      .replace(/∛/g, 'cbrt')
      .toLowerCase();
  }

  function tokenize(s) {
    var toks = [], i = 0, m;
    while (i < s.length) {
      var c = s[i], rest = s.slice(i);
      if ((m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(rest))) {
        // « 3e8 » = notation scientifique ; « 2e » seul reste 2 × e
        toks.push({ t: 'num', v: parseFloat(m[0]) });
        i += m[0].length; continue;
      }
      if (/[a-z]/.test(c)) {
        var run = /^[a-z]+/.exec(rest)[0], j = 0;
        while (j < run.length) { // découpe gloutonne : « 2pie » → pi, e
          var name = null;
          for (var k = 0; k < NAMES.length; k++) {
            if (run.indexOf(NAMES[k], j) === j) { name = NAMES[k]; break; }
          }
          if (!name) throw new CalcError('Nom inconnu : « ' + run.slice(j) + ' »');
          toks.push(FUNCS[name] ? { t: 'fn', v: name } : { t: 'id', v: name });
          j += name.length;
        }
        i += run.length; continue;
      }
      if ('+-*/^()!%'.indexOf(c) >= 0) { toks.push({ t: c }); i++; continue; }
      throw new CalcError('Caractère non reconnu : « ' + c + ' »');
    }
    return toks;
  }

  /** sin(π) vaut 1,2·10⁻¹⁶ en flottants : on arrondit ce bruit à 0 (trigonométrie seulement). */
  function snap(v) { return Math.abs(v) < 1e-14 ? 0 : v; }

  function factorial(n) {
    if (n < 0 || Math.floor(n) !== n) throw new CalcError('La factorielle demande un entier positif');
    if (n > 170) return Infinity;
    var r = 1; for (var i = 2; i <= n; i++) r *= i; return r;
  }

  /**
   * evaluate(expr, opts) → nombre. Lève une CalcError en cas de saisie invalide.
   * opts.angle : 'rad' (défaut) ou 'deg' ; opts.ans : valeur de « Ans ».
   * Priorités : + − < × ÷ (et multiplication implicite) < signe < ^ (associatif à droite) < ! %.
   */
  function evaluate(expr, opts) {
    opts = opts || {};
    var deg = opts.angle === 'deg';
    var toks = tokenize(normalize(expr)), p = 0;
    if (!toks.length) throw new CalcError('Expression vide');
    function peek() { return toks[p]; }
    function eat(t) { if (toks[p] && toks[p].t === t) { p++; return true; } return false; }
    function startsPrimary(tk) { return tk && (tk.t === 'num' || tk.t === 'id' || tk.t === 'fn' || tk.t === '('); }

    function parseExpr() {
      var v = parseTerm();
      for (;;) {
        if (eat('+')) v += parseTerm();
        else if (eat('-')) v -= parseTerm();
        else return v;
      }
    }
    function parseTerm() {
      var v = parseUnary();
      for (;;) {
        if (eat('*')) v *= parseUnary();
        else if (eat('/')) {
          var d = parseUnary();
          if (d === 0) throw new CalcError('Division par zéro');
          v /= d;
        } else if (startsPrimary(peek())) v *= parsePower(); // 2pi, 3(4+1), (1+1)(2)
        else return v;
      }
    }
    function parseUnary() {
      if (eat('-')) return -parseUnary();
      if (eat('+')) return parseUnary();
      return parsePower();
    }
    function parsePower() {
      var b = parsePostfix();
      if (eat('^')) return Math.pow(b, parseUnary());
      return b;
    }
    function parsePostfix() {
      var v = parsePrimary();
      for (;;) {
        if (eat('!')) v = factorial(v);
        else if (eat('%')) v = v / 100;
        else return v;
      }
    }
    function applyFn(name, x) {
      var toRad = deg ? Math.PI / 180 : 1, fromRad = deg ? 180 / Math.PI : 1;
      switch (name) {
        case 'sin': return snap(Math.sin(x * toRad));
        case 'cos': return snap(Math.cos(x * toRad));
        case 'tan':
          if (Math.abs(Math.cos(x * toRad)) < 1e-12) throw new CalcError('tan non définie pour cet angle');
          return snap(Math.tan(x * toRad));
        case 'asin': case 'arcsin':
          if (x < -1 || x > 1) throw new CalcError('arcsin demande un nombre entre −1 et 1');
          return Math.asin(x) * fromRad;
        case 'acos': case 'arccos':
          if (x < -1 || x > 1) throw new CalcError('arccos demande un nombre entre −1 et 1');
          return Math.acos(x) * fromRad;
        case 'atan': case 'arctan': return Math.atan(x) * fromRad;
        case 'ln': if (x <= 0) throw new CalcError('ln demande un nombre strictement positif'); return Math.log(x);
        case 'log': if (x <= 0) throw new CalcError('log demande un nombre strictement positif'); return Math.log(x) / Math.LN10;
        case 'exp': return Math.exp(x);
        case 'sqrt': case 'racine': if (x < 0) throw new CalcError('Racine carrée d\'un nombre négatif'); return Math.sqrt(x);
        case 'cbrt': return Math.cbrt(x);
        case 'abs': return Math.abs(x);
      }
      throw new CalcError('Fonction inconnue');
    }
    function parsePrimary() {
      var tk = peek();
      if (!tk) throw new CalcError('Expression incomplète');
      if (tk.t === 'num') { p++; return tk.v; }
      if (tk.t === 'id') {
        p++;
        if (tk.v === 'ans') {
          if (typeof opts.ans !== 'number') throw new CalcError('Pas encore de résultat Ans');
          return opts.ans;
        }
        return CONSTS[tk.v];
      }
      if (tk.t === 'fn') {
        p++;
        // sin(30) ou sin 30 (l'argument s'arrête au premier opérateur)
        return applyFn(tk.v, peek() && peek().t === '(' ? parsePrimary() : parsePostfix());
      }
      if (eat('(')) {
        var v = parseExpr();
        if (!eat(')')) throw new CalcError('Parenthèse fermante manquante');
        return v;
      }
      throw new CalcError('Expression incomplète');
    }

    // Parenthèses fermantes manquantes en fin de saisie : on les ajoute (comme une calculatrice).
    var open = 0;
    toks.forEach(function (tk) { if (tk.t === '(') open++; else if (tk.t === ')') open--; });
    while (open-- > 0) toks.push({ t: ')' });

    var v = parseExpr();
    if (p < toks.length) throw new CalcError(toks[p].t === ')' ? 'Parenthèse fermante en trop' : 'Expression mal formée');
    if (typeof v !== 'number' || isNaN(v)) throw new CalcError('Résultat non défini');
    return v;
  }

  function tryEvaluate(expr, opts) {
    try { return evaluate(expr, opts); } catch (e) { return NaN; }
  }

  /** Lit une réponse d'élève : « 2,5 », « 3/4 », « -2 », « ln(2) », « pi/3 », « 2√3 »… NaN si illisible. */
  function parseNum(s) {
    if (s === null || s === undefined) return NaN;
    // « 25 % » répond à une question posée « en % » : le signe final est une unité, pas ÷ 100.
    var v = tryEvaluate(String(s).replace(/\s*%\s*$/, ''));
    return isFinite(v) ? v : NaN;
  }

  /* ---------- formatage ---------- */
  function fmt(x, d) {
    if (typeof x !== 'number' || !isFinite(x)) return '—';
    d = d === undefined ? 3 : d;
    var r = Math.round(x * Math.pow(10, d)) / Math.pow(10, d);
    if (Object.is(r, -0)) r = 0;
    return r.toLocaleString('fr-FR', { maximumFractionDigits: d });
  }

  /** Résultat de calculatrice : 10 chiffres significatifs, notation scientifique si très grand / petit. */
  function fmtCalc(x) {
    if (typeof x !== 'number' || isNaN(x)) return 'Erreur';
    if (!isFinite(x)) return x > 0 ? '∞' : '−∞';
    if (x === 0) return '0';
    var a = Math.abs(x);
    if (a >= 1e10 || a < 1e-6) {
      var ex = Math.floor(Math.log10(a)), m = x / Math.pow(10, ex);
      m = parseFloat(m.toPrecision(8));
      if (Math.abs(m) >= 10) { m /= 10; ex += 1; }
      return String(m).replace('.', ',').replace('-', '−') + ' × 10^' + ex;
    }
    var s = String(parseFloat(x.toPrecision(10)));
    var neg = s[0] === '-';
    if (neg) s = s.slice(1);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (neg ? '−' : '') + parts.join(',');
  }

  /* ---------- graduations ---------- */
  function niceStep(raw) {
    if (!(raw > 0) || !isFinite(raw)) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(raw)));
    var m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }
  /**
   * Pas de graduation pour une étendue `span` dessinée sur `pixels` px, en garantissant
   * au moins `minGap` px entre deux étiquettes (lisibilité sur téléphone).
   */
  function tickStep(span, pixels, minGap) {
    if (!(span > 0) || !(pixels > 0)) return 1;
    var n = Math.max(2, Math.floor(pixels / (minGap || 50)));
    var s = niceStep(span / n);
    for (var guard = 0; guard < 20 && pixels * s / span < (minGap || 50); guard++) s = niceStep(s * 2.5);
    return s;
  }
  /** Nombre de décimales utiles pour afficher les multiples d'un pas. */
  function decimalsFor(step) {
    if (!(step > 0)) return 0;
    return Math.max(0, Math.min(6, -Math.floor(Math.log10(step) + 1e-9)));
  }
  function piLabel(k) { // k multiples de π/2
    if (k === 0) return '0';
    var num = k, den = 2;
    if (k % 2 === 0) { num = k / 2; den = 1; }
    var s = num < 0 ? '−' : '';
    var a = Math.abs(num);
    return s + (a === 1 ? '' : a) + 'π' + (den === 2 ? '/2' : '');
  }
  /** Ancre horizontale d'une étiquette centrée en x, de largeur w, dans [0, W]. */
  function clampLabel(x, w, W, pad) {
    pad = pad || 2;
    if (x - w / 2 < pad) return { x: pad, align: 'left' };
    if (x + w / 2 > W - pad) return { x: W - pad, align: 'right' };
    return { x: x, align: 'center' };
  }

  /* ---------- formules ---------- */
  /**
   * Découpe un code LaTeX selon un séparateur (ex. « \\qquad ») situé hors accolades.
   * splitTopLevel('a \\qquad \\text{b \\qquad c}', '\\qquad') → ['a', '\\text{b \\qquad c}']
   */
  function splitTopLevel(tex, sep) {
    var parts = [], depth = 0, last = 0;
    for (var i = 0; i < tex.length; i++) {
      var c = tex[i];
      if (c === '\\' && tex.substr(i, sep.length) !== sep) { i++; continue; }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (depth === 0 && tex.substr(i, sep.length) === sep && !/[a-zA-Z]/.test(tex[i + sep.length] || '')) {
        parts.push(tex.slice(last, i)); last = i + sep.length; i += sep.length - 1;
      }
    }
    parts.push(tex.slice(last));
    return parts.map(function (x) { return x.trim(); }).filter(Boolean);
  }

  /* ---------- feuille de brouillon ---------- */
  /**
   * insertSnippet(value, start, end, snippet) → { value, caret }
   * Le caractère « ‸ » (CARET) du gabarit marque la position du curseur ; s'il y a une sélection,
   * elle est placée à cet endroit (ex. « (‸)/() » transforme « x+1 » sélectionné en « (x+1)/() »).
   * (« | » reste un caractère normal : il sert à écrire une valeur absolue.)
   */
  var CARET = '\u2038';
  function insertSnippet(value, start, end, snippet) {
    value = value || '';
    start = Math.max(0, Math.min(start === undefined ? value.length : start, value.length));
    end = Math.max(start, Math.min(end === undefined ? start : end, value.length));
    var sel = value.slice(start, end);
    var at = snippet.indexOf(CARET);
    var before, after, caret;
    if (at < 0) { before = snippet; after = ''; caret = start + snippet.length; }
    else {
      before = snippet.slice(0, at) + sel; after = snippet.slice(at + 1);
      caret = start + before.length;
    }
    return { value: value.slice(0, start) + before + after + value.slice(end), caret: caret };
  }

  return {
    evaluate: evaluate, tryEvaluate: tryEvaluate, parseNum: parseNum, CalcError: CalcError,
    fmt: fmt, fmtCalc: fmtCalc,
    niceStep: niceStep, tickStep: tickStep, decimalsFor: decimalsFor, piLabel: piLabel, clampLabel: clampLabel,
    insertSnippet: insertSnippet, CARET: CARET, splitTopLevel: splitTopLevel
  };
});
