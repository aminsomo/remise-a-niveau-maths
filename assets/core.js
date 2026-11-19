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

  /* ---------- évaluation d'une expression LaTeX (calculatrice « comme au stylo ») ---------- */
  /*
   * Le brouillon produit du LaTeX (MathLive) : \frac{1}{2}, \sqrt[3]{8}, x^{2}, \int_{0}^{1}x^{2}\,\mathrm{d}x,
   * \sum_{k=1}^{10}k, \ln\left(2\right), \left|-3\right|, \frac{\mathrm{d}}{\mathrm{d}x}\left(x^{3}\right)…
   * On l'analyse en un arbre (AST) :
   *  - evalNode en calcule la valeur (les variables — x d'une intégrale, k d'une somme — sont lues dans env) ;
   *  - derive, primitive, simplify et toLatex font du calcul formel (dérivées, primitives) pour la
   *    calculatrice d'entraînement ; le mode examen (opts.exam) refuse intégrales, dérivées et sommes.
   */
  var LATEX_FUNCS = { sin: 1, cos: 1, tan: 1, arcsin: 1, arccos: 1, arctan: 1, ln: 1, log: 1, exp: 1, sinh: 1, cosh: 1, tanh: 1 };
  var SPACES = { ',': 1, ';': 1, ':': 1, '!': 1, ' ': 1, quad: 1, qquad: 1, thinspace: 1, medspace: 1, thickspace: 1, enspace: 1 };

  function latexPrepare(src) {
    return String(src)
      .replace(/\\(left|right)\./g, '') // délimiteurs invisibles : \left. … \right|_{x=a}
      .replace(/\\(left|right|bigl|bigr|Bigl|Bigr|big|Big)(?![a-zA-Z])/g, '')
      .replace(/\\(mathrm|operatorname|text|mathit)\{\s*d\s*\}/g, '\\diffd ')
      .replace(/\\differentialD(?![a-zA-Z])/g, '\\diffd ')
      .replace(/\\(mathrm|operatorname|text)\{\s*Ans\s*\}/gi, '\\ans ')
      .replace(/\\(mathrm|operatorname|text)\{\s*e\s*\}/g, 'e')
      .replace(/\\(mathrm|operatorname)\{\s*(sin|cos|tan|ln|log|exp|arcsin|arccos|arctan)\s*\}/g, '\\$2 ')
      .replace(/\\exponentialE(?![a-zA-Z])/g, 'e')
      .replace(/\\[dt]frac(?![a-zA-Z])/g, '\\frac')
      .replace(/\\(cdot|times|ast)(?![a-zA-Z])/g, '*')
      .replace(/\\div(?![a-zA-Z])/g, '/')
      .replace(/\\(lvert|rvert|vert|mid)(?![a-zA-Z])/g, '|')
      .replace(/\\\{/g, '(').replace(/\\\}/g, ')')
      .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, '\\pi ');
  }

  function latexTokenize(s) {
    var toks = [], i = 0, m;
    while (i < s.length) {
      var c = s[i], rest = s.slice(i);
      if (/\s/.test(c)) { i++; continue; }
      if ((m = /^\d+(?:(?:\{,\}|[.,])\d+)?/.exec(rest)) || (m = /^(?:\{,\}|[.,])\d+/.exec(rest))) {
        toks.push({ t: 'num', v: parseFloat(m[0].replace('{,}', '.').replace(',', '.')), raw: m[0] });
        i += m[0].length; continue;
      }
      if (c === '\\') {
        if ((m = /^\\([a-zA-Z]+)/.exec(rest))) {
          i += m[0].length;
          if (!SPACES[m[1]]) toks.push({ t: 'cmd', v: m[1] });
          continue;
        }
        var nx = s[i + 1];
        i += 2;
        if (nx === '%') toks.push({ t: '%' });
        else if (nx === '|') toks.push({ t: '|' });
        else if (!SPACES[nx]) throw new CalcError('Symbole non reconnu : \\' + (nx || ''));
        continue;
      }
      if (/[a-zA-Z]/.test(c)) { toks.push({ t: 'id', v: c }); i++; continue; }
      if ('+-*/^_(){}[]|!%=\''.indexOf(c) >= 0) { toks.push({ t: c }); i++; continue; }
      throw new CalcError('Caractère non reconnu : « ' + c + ' »');
    }
    return toks;
  }

  function simpson(f, a, b, n) {
    if (a === b) return 0;
    n = n || 1000;
    var h = (b - a) / n, s = f(a) + f(b);
    for (var i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h);
    var r = s * h / 3;
    if (!isFinite(r)) throw new CalcError('Intégrale non calculable : la fonction n’est pas définie partout sur l’intervalle');
    return r;
  }

  /* ---------- arbre (AST) ---------- */
  function nd(k, o) { o = o || {}; o.k = k; return o; }
  function nNum(v) { return { k: 'num', v: v }; }
  function nVar(n) { return { k: 'var', n: n }; }
  function bin(k, a, b) { return { k: k, a: a, b: b }; }
  var CHILD_KEYS = ['a', 'b', 'body', 'lo', 'hi', 'from', 'to', 'val', 'base', 'idx'];
  function children(n) {
    var out = [];
    CHILD_KEYS.forEach(function (key) { if (n[key] && typeof n[key] === 'object') out.push(n[key]); });
    return out;
  }
  function walk(n, fn) { fn(n); children(n).forEach(function (c) { walk(c, fn); }); }
  function dependsOn(n, v) {
    var found = false;
    walk(n, function (m) { if (m.k === 'var' && m.n === v) found = true; });
    return found;
  }

  /**
   * parseLatex(latex, opts) → AST (lève CalcError). opts.ans : valeur de Ans.
   */
  function parseLatex(src, opts) {
    opts = opts || {};
    var toks = latexTokenize(latexPrepare(src)), p = 0, inIntegrand = 0;
    if (!toks.length) throw new CalcError('Expression vide');
    function peek(k) { return toks[p + (k || 0)]; }
    function is(t, v) { var tk = toks[p]; return !!tk && tk.t === t && (v === undefined || tk.v === v); }
    function eat(t, v) { if (is(t, v)) { p++; return true; } return false; }
    function expect(t, msg) { if (!eat(t)) throw new CalcError(msg || 'Expression mal formée'); }
    function isDiff() {
      if (is('cmd', 'diffd')) return true;
      return inIntegrand > 0 && is('id', 'd') && peek(1) && peek(1).t === 'id';
    }
    function startsPrimary() {
      var tk = peek();
      if (!tk || isDiff()) return false;
      if (tk.t === 'cmd') return tk.v !== 'diffd';
      return tk.t === 'num' || tk.t === 'id' || tk.t === '(' || tk.t === '{' || tk.t === '[';
    }
    function parseExpr() {
      var v = parseTerm();
      for (;;) {
        if (eat('+')) v = bin('add', v, parseTerm());
        else if (eat('-')) v = bin('sub', v, parseTerm());
        else if (is('|') && peek(1) && peek(1).t === '_') { p += 2; v = parseAt(v); }
        else return v;
      }
    }
    function parseTerm() {
      var v = parseUnary();
      for (;;) {
        if (eat('*')) v = bin('mul', v, parseUnary());
        else if (eat('/')) v = bin('div', v, parseUnary());
        else if (startsPrimary()) v = bin('mul', v, parsePower());
        else return v;
      }
    }
    function parseUnary() {
      if (eat('-')) return nd('neg', { a: parseUnary() });
      if (eat('+')) return parseUnary();
      return parsePower();
    }
    /** En LaTeX, un argument sans accolades est un seul caractère : \\frac12 = 1/2, x^23 = x²·3. */
    function singleDigit() {
      var tk = peek();
      if (tk && tk.t === 'num' && /^\d\d/.test(tk.raw)) {
        var d = +tk.raw[0];
        tk.raw = tk.raw.slice(1); tk.v = parseFloat(tk.raw.replace('{,}', '.').replace(',', '.'));
        return nNum(d);
      }
      return null;
    }
    /** argument d'un ^ ou d'un _ : {groupe} ou un seul symbole */
    function parseScript() {
      if (eat('{')) { var g = parseExpr(); expect('}', 'Accolade fermante manquante'); return g; }
      if (is('cmd', 'circ')) { p++; return 'circ'; }
      var one = singleDigit(); if (one) return one;
      if (is('num') || is('id') || is('cmd')) return parsePrimary();
      throw new CalcError('Exposant incomplet');
    }
    function parsePower() {
      var b = parsePostfix();
      while (is('^')) {
        p++;
        if (is('{') && peek(1) && peek(1).t === 'cmd' && peek(1).v === 'circ' && peek(2) && peek(2).t === '}') { p += 3; b = nd('deg', { a: b }); continue; }
        var e = parseScript();
        if (e === 'circ') { b = nd('deg', { a: b }); continue; }
        b = bin('pow', b, e);
      }
      return b;
    }
    /** barre d'évaluation : expr |_{x=a} (écrite \left. … \right|_{x=a}) */
    function parseAt(body) {
      if (!eat('{')) throw new CalcError('Écris la valeur sous la forme x = a après la barre');
      var vt = peek();
      if (!vt || vt.t !== 'id') throw new CalcError('Écris la valeur sous la forme x = a après la barre');
      p++;
      expect('=', 'Écris la valeur sous la forme x = a après la barre');
      var val = parseExpr();
      expect('}', 'Accolade fermante manquante');
      return nd('at', { body: body, v: vt.v, val: val });
    }
    function parsePostfix() {
      var v = parsePrimary();
      for (;;) {
        if (eat('!')) v = nd('fact', { a: v });
        else if (eat('%')) v = nd('pct', { a: v });
        else if (is('\'')) throw new CalcError('Pour dériver, utilise la touche d/dx : la notation f′ ne se calcule pas ici');
        else return v;
      }
    }
    function group() {
      if (eat('{')) { var g = parseExpr(); expect('}', 'Accolade fermante manquante'); return g; }
      return singleDigit() || parsePrimary();
    }
    function parseFunction(name) {
      var pw = null, base = null;
      for (;;) {
        if (eat('^')) pw = parseScript();
        else if (eat('_')) base = parseScript();
        else break;
      }
      if (pw === 'circ') pw = null;
      // \sin^{-1} = arcsin
      if (pw && /^(sin|cos|tan)$/.test(name)) {
        try { if (evalNode(pw, {}, false) === -1) { name = 'arc' + name; pw = null; } } catch (e) { /* exposant variable */ }
      }
      var arg = (is('(') || is('{') || is('[') || is('|')) ? parsePrimary() : parsePower();
      var f = nd('fn', { n: name, a: arg });
      if (base && base !== 'circ') f.base = base;
      return pw ? bin('pow', f, pw) : f;
    }
    function parseBounds() {
      var lo = null, hi = null;
      for (var k = 0; k < 2; k++) {
        if (eat('_')) lo = parseScript();
        else if (eat('^')) hi = parseScript();
      }
      return { lo: lo === 'circ' ? null : lo, hi: hi === 'circ' ? null : hi };
    }
    /** \frac{d}{dx}(…), \frac{d(…)}{dx} → nœud « dérivée » ; sinon on revient en arrière (fraction ordinaire). */
    function tryDerivative() {
      var save = p;
      function fail() { p = save; return null; }
      if (!eat('{')) return fail();
      if (!(eat('cmd', 'diffd') || eat('id', 'd'))) return fail();
      var inner = null;
      if (!is('}')) { try { inner = parseExpr(); } catch (e) { return fail(); } }
      if (!eat('}') || !eat('{')) return fail();
      if (!(eat('cmd', 'diffd') || eat('id', 'd'))) return fail();
      var vt = peek();
      if (!vt || vt.t !== 'id') return fail();
      p++;
      if (!eat('}')) return fail();
      if (inner && inner.k === 'var' && inner.n !== vt.v) {
        throw new CalcError('Écris d/d' + vt.v + '( expression ) : la calculatrice dérive une expression, pas une fonction nommée');
      }
      if (!inner && !peek()) throw new CalcError('Écris l’expression à dériver après d/d' + vt.v);
      return nd('diff', { body: inner || parseTerm(), v: vt.v });
    }
    function parsePrimary() {
      var tk = peek();
      if (!tk) throw new CalcError('Expression incomplète');
      if (tk.t === 'num') { p++; return nNum(tk.v); }
      if (tk.t === '(' || tk.t === '[' || tk.t === '{') {
        p++;
        var close = tk.t === '(' ? ')' : tk.t === '[' ? ']' : '}';
        var g = parseExpr();
        if (!eat(close)) { if (!(close === ')' && p >= toks.length)) throw new CalcError('Parenthèse fermante manquante'); }
        return g;
      }
      if (tk.t === '|') {
        p++; var a = parseExpr(); expect('|', 'Barre de valeur absolue manquante');
        return nd('abs', { a: a });
      }
      if (tk.t === 'id') {
        p++;
        if (tk.v === 'e') return nd('const', { n: 'e', v: Math.E });
        return nVar(tk.v);
      }
      if (tk.t === 'cmd') {
        p++;
        var c = tk.v;
        if (c === 'pi') return nd('const', { n: 'pi', v: Math.PI });
        if (c === 'ans') {
          if (typeof opts.ans !== 'number') throw new CalcError('Pas encore de résultat Ans');
          return nNum(opts.ans);
        }
        if (c === 'placeholder') { if (eat('{')) { while (p < toks.length && !eat('}')) p++; } throw new CalcError('Une case est vide : complète-la'); }
        if (c === 'frac') {
          var dv = tryDerivative();
          if (dv) return dv;
          var num = group(), den = group();
          return bin('div', num, den);
        }
        if (c === 'sqrt') {
          var idx = null;
          if (eat('[')) { idx = parseExpr(); expect(']', 'Crochet fermant manquant'); }
          return nd('root', { a: group(), idx: idx });
        }
        if (LATEX_FUNCS[c]) return parseFunction(c);
        if (c === 'int') {
          var bd = parseBounds();
          if (!bd.lo !== !bd.hi) throw new CalcError('Il faut les deux bornes a et b de l’intégrale');
          inIntegrand++;
          var body = isDiff() ? nNum(1) : parseExpr();
          inIntegrand--;
          if (!(eat('cmd', 'diffd') || eat('id', 'd'))) throw new CalcError('Il manque « dx » à la fin de l’intégrale');
          var vt = peek(); if (!vt || vt.t !== 'id') throw new CalcError('Variable d’intégration manquante après d'); p++;
          return nd('int', { lo: bd.lo, hi: bd.hi, body: body, v: vt.v });
        }
        if (c === 'sum' || c === 'prod') {
          if (!eat('_')) throw new CalcError('Écris la somme sous la forme k = début en bas');
          var hasBrace = eat('{');
          var iv = peek(); if (!iv || iv.t !== 'id') throw new CalcError('Indice de la somme manquant'); p++;
          expect('=', 'Écris l’indice sous la forme k = début');
          var from = parseExpr();
          if (hasBrace) expect('}', 'Accolade fermante manquante');
          if (!eat('^')) throw new CalcError('Il manque la borne du haut de la somme');
          var to = parseScript();
          return nd(c, { i: iv.v, from: from, to: to, body: parseTerm() });
        }
        if (c === 'infty') throw new CalcError('∞ n’est pas un nombre : la calculatrice ne calcule pas de limite');
        if (c === 'lim') throw new CalcError('Les limites ne se calculent pas à la calculatrice');
        throw new CalcError('Commande non reconnue : \\' + c);
      }
      if (tk.t === '=') throw new CalcError('Un seul calcul à la fois, sans signe =');
      throw new CalcError('Expression incomplète');
    }
    var root = parseExpr();
    if (p < toks.length) {
      var t = toks[p];
      throw new CalcError(t.t === '=' ? 'Un seul calcul à la fois, sans signe =' : t.t === ')' || t.t === '}' ? 'Parenthèse fermante en trop' : 'Expression mal formée');
    }
    return root;
  }

  function applyLatexFn(name, x, deg) {
    var toRad = deg ? Math.PI / 180 : 1, fromRad = deg ? 180 / Math.PI : 1;
    switch (name) {
      case 'sin': return snap(Math.sin(x * toRad));
      case 'cos': return snap(Math.cos(x * toRad));
      case 'tan':
        if (Math.abs(Math.cos(x * toRad)) < 1e-12) throw new CalcError('tan non définie pour cet angle');
        return snap(Math.tan(x * toRad));
      case 'arcsin': if (x < -1 || x > 1) throw new CalcError('arcsin demande un nombre entre −1 et 1'); return Math.asin(x) * fromRad;
      case 'arccos': if (x < -1 || x > 1) throw new CalcError('arccos demande un nombre entre −1 et 1'); return Math.acos(x) * fromRad;
      case 'arctan': return Math.atan(x) * fromRad;
      case 'ln': if (x <= 0) throw new CalcError('ln demande un nombre strictement positif'); return Math.log(x);
      case 'log': if (x <= 0) throw new CalcError('log demande un nombre strictement positif'); return Math.log(x) / Math.LN10;
      case 'exp': return Math.exp(x);
      case 'sinh': return Math.sinh(x);
      case 'cosh': return Math.cosh(x);
      case 'tanh': return Math.tanh(x);
    }
    throw new CalcError('Fonction inconnue');
  }

  /** Valeur d'un nœud. env : valeurs des variables liées ; deg : angles en degrés. */
  function evalNode(n, env, deg) {
    function ev(m) { return evalNode(m, env, deg); }
    switch (n.k) {
      case 'num': case 'const': return n.v;
      case 'var':
        if (env && typeof env[n.n] === 'number') return env[n.n];
        throw new CalcError('Variable « ' + n.n + ' » sans valeur : elle n’a de sens que dans une intégrale, une somme ou une dérivée');
      case 'add': return ev(n.a) + ev(n.b);
      case 'sub': return ev(n.a) - ev(n.b);
      case 'mul': return ev(n.a) * ev(n.b);
      case 'div': {
        var x = ev(n.a), y = ev(n.b);
        if (y === 0) throw new CalcError('Division par zéro');
        return x / y;
      }
      case 'neg': return -ev(n.a);
      case 'pow': {
        var r = Math.pow(ev(n.a), ev(n.b));
        if (isNaN(r)) throw new CalcError('Puissance non définie');
        return r;
      }
      case 'deg': return deg ? ev(n.a) : ev(n.a) * Math.PI / 180;
      case 'fact': return factorial(ev(n.a));
      case 'pct': return ev(n.a) / 100;
      case 'abs': return Math.abs(ev(n.a));
      case 'root': {
        var xr = ev(n.a);
        if (!n.idx) { if (xr < 0) throw new CalcError('Racine carrée d’un nombre négatif'); return Math.sqrt(xr); }
        var ni = ev(n.idx);
        if (ni === 0) throw new CalcError('Racine d’indice 0');
        if (xr < 0) { if (Math.round(ni) === ni && Math.abs(ni) % 2 === 1) return -Math.pow(-xr, 1 / ni); throw new CalcError('Racine paire d’un nombre négatif'); }
        return Math.pow(xr, 1 / ni);
      }
      case 'fn': {
        var xa = ev(n.a);
        if (n.n === 'log' && n.base) {
          var b = ev(n.base);
          if (b <= 0 || b === 1) throw new CalcError('Base de logarithme invalide');
          if (xa <= 0) throw new CalcError('log demande un nombre strictement positif');
          return Math.log(xa) / Math.log(b);
        }
        return applyLatexFn(n.n, xa, deg);
      }
      case 'int': {
        if (!n.lo) return ev(primitive(n.body, n.v));
        var lo = ev(n.lo), hi = ev(n.hi), e2 = Object.assign({}, env);
        if (!isFinite(lo) || !isFinite(hi)) throw new CalcError('Bornes infinies non prises en charge');
        return simpson(function (t) { e2[n.v] = t; return evalNode(n.body, e2, deg); }, lo, hi);
      }
      case 'sum': case 'prod': {
        var a = ev(n.from), bb = ev(n.to), e3 = Object.assign({}, env), isSum = n.k === 'sum', acc = isSum ? 0 : 1;
        if (Math.round(a) !== a || Math.round(bb) !== bb) throw new CalcError('Les bornes d’une somme sont des entiers');
        if (bb - a > 1e6) throw new CalcError('Somme trop longue');
        for (var k2 = a; k2 <= bb; k2++) { e3[n.i] = k2; acc = isSum ? acc + evalNode(n.body, e3, deg) : acc * evalNode(n.body, e3, deg); }
        return acc;
      }
      case 'at': {
        var e4 = Object.assign({}, env);
        e4[n.v] = ev(n.val);
        return evalNode(n.body, e4, deg);
      }
      case 'diff': return evalNode(simplify(derive(n.body, n.v)), env, deg);
    }
    throw new CalcError('Expression mal formée');
  }

  /* ---------- calcul formel : coefficients exacts ---------- */
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
  function isInt(x) { return typeof x === 'number' && Math.floor(x) === x && Math.abs(x) < 1e12; }
  /** Coefficient : rationnel exact { p, q } ou décimal { f }. */
  function rat(p, q) {
    if (q < 0) { p = -p; q = -q; }
    var g = gcd(p, q) || 1;
    p /= g; q /= g;
    if (Math.abs(p) > 1e12 || q > 1e12) return { f: p / q };
    return { p: p, q: q };
  }
  var ONE = { p: 1, q: 1 }, ZERO = { p: 0, q: 1 };
  function cVal(c) { return c.f !== undefined ? c.f : c.p / c.q; }
  function cOfNumber(v) { return isInt(v) ? { p: v, q: 1 } : { f: v }; }
  function cMul(a, b) { return a.f !== undefined || b.f !== undefined ? { f: cVal(a) * cVal(b) } : rat(a.p * b.p, a.q * b.q); }
  function cDiv(a, b) {
    if (cVal(b) === 0) throw new CalcError('Division par zéro');
    return a.f !== undefined || b.f !== undefined ? { f: cVal(a) / cVal(b) } : rat(a.p * b.q, a.q * b.p);
  }
  function cAdd(a, b) { return a.f !== undefined || b.f !== undefined ? { f: cVal(a) + cVal(b) } : rat(a.p * b.q + b.p * a.q, a.q * b.q); }
  function cNeg(a) { return a.f !== undefined ? { f: -a.f } : { p: -a.p, q: a.q }; }
  function cAbs(a) { return cVal(a) < 0 ? cNeg(a) : a; }
  function cIsZero(a) { return cVal(a) === 0; }
  function cIsOne(a) { return cVal(a) === 1; }
  /** Nœud → coefficient, s'il s'agit d'un nombre écrit (pas π ni e). */
  function coefOf(n) {
    if (n.k === 'num') return cOfNumber(n.v);
    if (n.k === 'neg') { var a = coefOf(n.a); return a && cNeg(a); }
    if (n.k === 'div' || n.k === 'mul') {
      var x = coefOf(n.a), y = coefOf(n.b);
      if (!x || !y) return null;
      if (n.k === 'mul') return cMul(x, y);
      return cVal(y) === 0 ? null : cDiv(x, y);
    }
    return null;
  }
  function cNode(c) {
    if (c.f !== undefined) return c.f < 0 ? nd('neg', { a: nNum(-c.f) }) : nNum(c.f);
    var v = c.q === 1 ? nNum(Math.abs(c.p)) : bin('div', nNum(Math.abs(c.p)), nNum(c.q));
    return c.p < 0 ? nd('neg', { a: v }) : v;
  }
  function key(n) { return toLatex(n); }

  /* ---------- simplification ---------- */
  function simplify(n) {
    switch (n.k) {
      case 'num': return n.v < 0 ? nd('neg', { a: nNum(-n.v) }) : n;
      case 'const': case 'var': return n;
      case 'add': case 'sub': case 'neg': return simplifySum(n);
      case 'mul': case 'div': return buildProduct(prodParts(bin(n.k, simplify(n.a), simplify(n.b))));
      case 'pow': return simplifyPow(simplify(n.a), simplify(n.b));
      case 'fn': return simplifyFn(n.n, simplify(n.a), n.base ? simplify(n.base) : null);
      case 'root': {
        var a = simplify(n.a), idx = n.idx ? simplify(n.idx) : null, ca = coefOf(a);
        if (!idx && ca && ca.f === undefined && ca.p >= 0) {
          var sp = Math.round(Math.sqrt(ca.p)), sq = Math.round(Math.sqrt(ca.q));
          if (sp * sp === ca.p && sq * sq === ca.q) return cNode(rat(sp, sq));
        }
        return nd('root', { a: a, idx: idx });
      }
    }
    var copy = Object.assign({}, n);
    CHILD_KEYS.forEach(function (k) { if (copy[k] && typeof copy[k] === 'object') copy[k] = simplify(copy[k]); });
    return copy;
  }
  /** Produit aplati : coefficient, facteurs du numérateur et du dénominateur (puissances regroupées). */
  function prodParts(n) {
    var parts = { c: ONE, num: [], den: [] };
    (function flat(m, inv) {
      if (m.k === 'mul') { flat(m.a, inv); flat(m.b, inv); return; }
      if (m.k === 'div') { flat(m.a, inv); flat(m.b, !inv); return; }
      if (m.k === 'neg') { parts.c = cNeg(parts.c); flat(m.a, inv); return; }
      var co = coefOf(m);
      if (co) { parts.c = inv ? cDiv(parts.c, co) : cMul(parts.c, co); return; }
      (inv ? parts.den : parts.num).push(m);
    })(n, false);
    // regroupe x · x² → x³ et x³ / x → x² (exposants numériques seulement)
    var order = [], pw = {};
    function add(f, sign) {
      var base = f, e = ONE;
      if (f.k === 'pow') { var ce = coefOf(f.b); if (ce) { base = f.a; e = ce; } }
      var kk = key(base);
      if (!pw[kk]) { pw[kk] = { base: base, e: ZERO, other: [] }; order.push(kk); }
      if (base === f && f.k === 'pow') pw[kk].other.push({ f: f, sign: sign });
      else pw[kk].e = cAdd(pw[kk].e, sign > 0 ? e : cNeg(e));
    }
    parts.num.forEach(function (f) { add(f, 1); });
    parts.den.forEach(function (f) { add(f, -1); });
    var num = [], den = [];
    order.forEach(function (kk) {
      var g = pw[kk], e = g.e;
      g.other.forEach(function (o) { (o.sign > 0 ? num : den).push(o.f); });
      if (cIsZero(e) && !g.other.length) return;
      if (cIsZero(e)) return;
      var neg = cVal(e) < 0, ea = cAbs(e);
      (neg ? den : num).push(cIsOne(ea) ? g.base : simplifyPow(g.base, cNode(ea)));
    });
    function rank(f) { return f.k === 'const' ? 0 : (f.k === 'var' || (f.k === 'pow' && f.a.k === 'var')) ? 1 : 2; }
    function sortF(list) { return list.map(function (f, i) { return { f: f, i: i }; }).sort(function (x, y) { return rank(x.f) - rank(y.f) || x.i - y.i; }).map(function (o) { return o.f; }); }
    parts.num = sortF(num); parts.den = sortF(den);
    return parts;
  }
  function buildProduct(parts) {
    var c = parts.c;
    if (cIsZero(c)) return nNum(0);
    var negative = cVal(c) < 0, ca = cAbs(c);
    var top = [], bottom = [];
    if (ca.f !== undefined) { if (ca.f !== 1) top.push(nNum(ca.f)); }
    else { if (ca.p !== 1) top.push(nNum(ca.p)); if (ca.q !== 1) bottom.push(nNum(ca.q)); }
    top = top.concat(parts.num); bottom = bottom.concat(parts.den);
    function mul(a, b) { return bin('mul', a, b); }
    var t = top.length ? top.reduce(mul) : nNum(1);
    var r = bottom.length ? bin('div', t, bottom.reduce(mul)) : t;
    return negative ? nd('neg', { a: r }) : r;
  }
  function polyDegree(rest) {
    if (!rest) return -Infinity;
    if (rest.k === 'var') return 1;
    if (rest.k === 'pow' && rest.a.k === 'var') { var c = coefOf(rest.b); return c ? cVal(c) : 0; }
    if (rest.k === 'mul') return Math.max(polyDegree(rest.a), 0) + Math.max(polyDegree(rest.b), 0);
    if (rest.k === 'div') { var d = polyDegree(rest.a); return d === -Infinity ? 0 : d; }
    return 0;
  }
  function simplifySum(n) {
    var terms = [], byKey = {};
    (function collect(m, sign) {
      if (m.k === 'add') { collect(m.a, sign); collect(m.b, sign); return; }
      if (m.k === 'sub') { collect(m.a, sign); collect(m.b, -sign); return; }
      if (m.k === 'neg') { collect(m.a, -sign); return; }
      var s = simplify(m);
      if (s.k === 'add' || s.k === 'sub' || s.k === 'neg') { collect(s, sign); return; }
      collectTerm(s, sign);
    })(n, 1);
    function collectTerm(s, sign) {
      if (s.k === 'neg') { collectTerm(s.a, -sign); return; }
      var parts = s.k === 'mul' || s.k === 'div' ? prodParts(s) : null, c, rest;
      var co = coefOf(s);
      if (co) { c = co; rest = null; }
      else if (parts) { c = parts.c; rest = parts.num.length || parts.den.length ? buildProduct({ c: ONE, num: parts.num, den: parts.den }) : null; }
      else { c = ONE; rest = s; }
      if (sign < 0) c = cNeg(c);
      var kk = rest ? key(rest) : '#';
      if (!byKey[kk]) { byKey[kk] = { c: ZERO, rest: rest }; terms.push(kk); }
      byKey[kk].c = cAdd(byKey[kk].c, c);
    }
    var list = terms.map(function (kk, i) { return { t: byKey[kk], i: i }; })
      .filter(function (o) { return !cIsZero(o.t.c); })
      .sort(function (x, y) { return polyDegree(y.t.rest) - polyDegree(x.t.rest) || x.i - y.i; });
    if (!list.length) return nNum(0);
    var out = null;
    list.forEach(function (o) {
      var c = o.t.c, negative = cVal(c) < 0, node;
      var ca = cAbs(c);
      if (!o.t.rest) node = cNode(ca);
      else if (cIsOne(ca)) node = o.t.rest;
      else node = buildProduct(prodParts(bin('mul', cNode(ca), o.t.rest)));
      if (!out) out = negative ? nd('neg', { a: node }) : node;
      else out = bin(negative ? 'sub' : 'add', out, node);
    });
    return out;
  }
  function simplifyPow(a, b) {
    var ca = coefOf(a), cb = coefOf(b);
    if (cb && cIsZero(cb)) return nNum(1);
    if (cb && cIsOne(cb)) return a;
    if (ca && cIsOne(ca)) return nNum(1);
    if (ca && cb && cb.f === undefined && cb.q === 1 && Math.abs(cb.p) <= 30 && ca.f === undefined) {
      var e = cb.p, r = ONE;
      for (var i = 0; i < Math.abs(e); i++) r = cMul(r, ca);
      return cNode(e < 0 ? cDiv(ONE, r) : r);
    }
    if (cb && cb.f === undefined && cb.p === 1 && cb.q === 2) return nd('root', { a: a, idx: null });
    if (cb && cVal(cb) < 0) return buildProduct(prodParts(bin('div', nNum(1), simplifyPow(a, cNode(cNeg(cb))))));
    if (a.k === 'pow' && cb) { var ci = coefOf(a.b); if (ci) return simplifyPow(a.a, cNode(cMul(ci, cb))); }
    if (a.k === 'const' && a.n === 'e' && b.k === 'fn' && b.n === 'ln') return b.a;
    return bin('pow', a, b);
  }
  function simplifyFn(name, a, base) {
    var ca = coefOf(a);
    if (name === 'exp') return simplifyPow(nd('const', { n: 'e', v: Math.E }), a);
    if (name === 'ln') {
      if (a.k === 'const' && a.n === 'e') return nNum(1);
      if (ca && cIsOne(ca)) return nNum(0);
      if (a.k === 'pow' && a.a.k === 'const' && a.a.n === 'e') return a.b;
    }
    if (ca && cIsZero(ca)) {
      if (name === 'sin' || name === 'tan' || name === 'arcsin' || name === 'arctan' || name === 'sinh' || name === 'tanh') return nNum(0);
      if (name === 'cos' || name === 'cosh') return nNum(1);
    }
    var f = nd('fn', { n: name, a: a });
    if (base) f.base = base;
    return f;
  }

  /* ---------- dérivée ---------- */
  var E_CONST = { k: 'const', n: 'e', v: Math.E };
  function fn(name, a) { return nd('fn', { n: name, a: a }); }
  function derive(n, v) {
    if (!dependsOn(n, v)) return nNum(0);
    function D(m) { return derive(m, v); }
    var a = n.a, b = n.b;
    switch (n.k) {
      case 'var': return nNum(n.n === v ? 1 : 0);
      case 'add': return bin('add', D(a), D(b));
      case 'sub': return bin('sub', D(a), D(b));
      case 'neg': return nd('neg', { a: D(a) });
      case 'mul': return bin('add', bin('mul', D(a), b), bin('mul', a, D(b)));
      case 'div': return bin('div', bin('sub', bin('mul', D(a), b), bin('mul', a, D(b))), bin('pow', b, nNum(2)));
      case 'pow':
        if (!dependsOn(b, v)) return bin('mul', bin('mul', b, bin('pow', a, bin('sub', b, nNum(1)))), D(a));
        if (a.k === 'const' && a.n === 'e') return bin('mul', n, D(b));
        if (!dependsOn(a, v)) return bin('mul', bin('mul', n, fn('ln', a)), D(b));
        return bin('mul', n, bin('add', bin('mul', D(b), fn('ln', a)), bin('div', bin('mul', b, D(a)), a)));
      case 'root':
        if (!n.idx) return bin('div', D(a), bin('mul', nNum(2), nd('root', { a: a, idx: null })));
        return derive(bin('pow', a, bin('div', nNum(1), n.idx)), v);
      case 'abs': return bin('div', bin('mul', a, D(a)), nd('abs', { a: a }));
      case 'pct': return bin('div', D(a), nNum(100));
      case 'fn': {
        var da = D(a);
        switch (n.n) {
          case 'sin': return bin('mul', fn('cos', a), da);
          case 'cos': return nd('neg', { a: bin('mul', fn('sin', a), da) });
          case 'tan': return bin('div', da, bin('pow', fn('cos', a), nNum(2)));
          case 'ln': return bin('div', da, a);
          case 'log': return bin('div', da, bin('mul', a, fn('ln', n.base || nNum(10))));
          case 'exp': return bin('mul', bin('pow', E_CONST, a), da);
          case 'arcsin': return bin('div', da, nd('root', { a: bin('sub', nNum(1), bin('pow', a, nNum(2))), idx: null }));
          case 'arccos': return nd('neg', { a: bin('div', da, nd('root', { a: bin('sub', nNum(1), bin('pow', a, nNum(2))), idx: null })) });
          case 'arctan': return bin('div', da, bin('add', nNum(1), bin('pow', a, nNum(2))));
          case 'sinh': return bin('mul', fn('cosh', a), da);
          case 'cosh': return bin('mul', fn('sinh', a), da);
          case 'tanh': return bin('div', da, bin('pow', fn('cosh', a), nNum(2)));
        }
        break;
      }
      case 'diff': return derive(simplify(derive(n.body, n.v)), v);
    }
    throw new CalcError('La calculatrice ne sait pas dériver cette expression (n!, degrés, intégrale…) : fais-le à la main');
  }

  /* ---------- primitive ---------- */
  var NO_PRIMITIVE = 'Primitive introuvable par la calculatrice : cherche une forme connue (u′eᵘ, u′/u, u′uⁿ…) et calcule-la à la main';
  /** Polynôme en v (exposants entiers, éventuellement négatifs) : { exposant: coefficient } ou null. */
  function toPoly(n, v) {
    function add(p, q, sign) {
      var r = Object.assign({}, p);
      Object.keys(q).forEach(function (e) { r[e] = cAdd(r[e] || ZERO, sign < 0 ? cNeg(q[e]) : q[e]); });
      return r;
    }
    function mul(p, q) {
      var r = {};
      Object.keys(p).forEach(function (e1) {
        Object.keys(q).forEach(function (e2) { var e = +e1 + +e2; r[e] = cAdd(r[e] || ZERO, cMul(p[e1], q[e2])); });
      });
      return r;
    }
    var co = coefOf(n);
    if (co) return { 0: co };
    switch (n.k) {
      case 'var': return n.n === v ? { 1: ONE } : null;
      case 'add': case 'sub': {
        var p = toPoly(n.a, v), q = toPoly(n.b, v);
        return p && q ? add(p, q, n.k === 'add' ? 1 : -1) : null;
      }
      case 'neg': { var pn = toPoly(n.a, v); return pn && add({}, pn, -1); }
      case 'mul': { var pa = toPoly(n.a, v), pb = toPoly(n.b, v); return pa && pb ? mul(pa, pb) : null; }
      case 'div': {
        var top = toPoly(n.a, v), bot = toPoly(n.b, v);
        if (!top || !bot) return null;
        var ks = Object.keys(bot).filter(function (e) { return !cIsZero(bot[e]); });
        if (ks.length !== 1) return null;
        var r = {};
        Object.keys(top).forEach(function (e) { r[+e - +ks[0]] = cDiv(top[e], bot[ks[0]]); });
        return r;
      }
      case 'pow': {
        var ce = coefOf(n.b);
        if (!ce || ce.f !== undefined || ce.q !== 1) return null;
        if (n.a.k === 'var' && n.a.n === v) { var o = {}; o[ce.p] = ONE; return o; }
        if (ce.p < 0 || ce.p > 12) return null;
        var base = toPoly(n.a, v);
        if (!base) return null;
        var res = { 0: ONE };
        for (var i = 0; i < ce.p; i++) res = mul(res, base);
        return res;
      }
    }
    return null;
  }
  /** Coefficient k si n = k·v + b (k ≠ 0, constant), sinon null. */
  function linCoef(n, v) {
    if (!toPoly(n, v)) return null;
    var d = simplify(derive(n, v));
    if (dependsOn(d, v)) return null;
    var c = coefOf(d);
    if (c && cIsZero(c)) return null;
    return d;
  }
  function lnAbs(u) { return fn('ln', nd('abs', { a: u })); }
  function primitive1(f, v) {
    var k, u;
    if (toPoly(f, v)) return primitive(f, v);
    if (f.k === 'pow' && !dependsOn(f.b, v) && (k = linCoef(f.a, v))) {
      u = f.a;
      var m = coefOf(f.b);
      if (m && cVal(m) === -1) return bin('div', lnAbs(u), k);
      return bin('div', bin('pow', u, bin('add', f.b, nNum(1))), bin('mul', k, bin('add', f.b, nNum(1))));
    }
    if (f.k === 'pow' && !dependsOn(f.a, v) && (k = linCoef(f.b, v))) {
      if (f.a.k === 'const' && f.a.n === 'e') return bin('div', f, k);
      return bin('div', f, bin('mul', k, fn('ln', f.a)));
    }
    if (f.k === 'root' && !f.idx && (k = linCoef(f.a, v))) {
      return bin('div', bin('mul', nNum(2), bin('pow', f.a, bin('div', nNum(3), nNum(2)))), bin('mul', nNum(3), k));
    }
    if (f.k === 'fn' && (k = linCoef(f.a, v))) {
      u = f.a;
      if (f.n === 'sin') return nd('neg', { a: bin('div', fn('cos', u), k) });
      if (f.n === 'cos') return bin('div', fn('sin', u), k);
      if (f.n === 'exp') return bin('div', bin('pow', E_CONST, u), k);
    }
    throw new CalcError(NO_PRIMITIVE);
  }
  function reciprocal(f) {
    if (f.k === 'pow') return bin('pow', f.a, nd('neg', { a: f.b }));
    if (f.k === 'root' && !f.idx) return bin('pow', f.a, nd('neg', { a: bin('div', nNum(1), nNum(2)) }));
    return bin('pow', f, nNum(-1));
  }
  function primitive(n, v) {
    n = simplify(n);
    if (!dependsOn(n, v)) return bin('mul', n, nVar(v));
    var poly = toPoly(n, v);
    if (poly) {
      var out = null;
      Object.keys(poly).map(Number).sort(function (x, y) { return y - x; }).forEach(function (e) {
        var c = poly[e];
        if (cIsZero(c)) return;
        var t = e === -1 ? bin('mul', cNode(c), lnAbs(nVar(v)))
          : bin('mul', cNode(cDiv(c, cOfNumber(e + 1))), bin('pow', nVar(v), nNum(e + 1)));
        out = out ? bin('add', out, t) : t;
      });
      return out || nNum(0);
    }
    switch (n.k) {
      case 'add': return bin('add', primitive(n.a, v), primitive(n.b, v));
      case 'sub': return bin('sub', primitive(n.a, v), primitive(n.b, v));
      case 'neg': return nd('neg', { a: primitive(n.a, v) });
      case 'mul': case 'div': {
        var parts = prodParts(n);
        var dep = function (f) { return dependsOn(f, v); };
        var K = buildProduct({ c: parts.c, num: parts.num.filter(function (f) { return !dep(f); }), den: parts.den.filter(function (f) { return !dep(f); }) });
        var dn = parts.num.filter(dep), dd = parts.den.filter(dep), F;
        if (dn.length === 1 && !dd.length) F = primitive1(dn[0], v);
        else if (!dn.length && dd.length === 1) F = primitive1(reciprocal(dd[0]), v);
        if (!F) throw new CalcError(NO_PRIMITIVE);
        return bin('mul', K, F);
      }
    }
    var F1 = primitive1(n, v);
    if (!F1) throw new CalcError(NO_PRIMITIVE);
    return F1;
  }

  /* ---------- écriture LaTeX d'un arbre ---------- */
  function texNumber(v) {
    if (v < 0) return '-' + texNumber(-v);
    if (isInt(v)) return String(v);
    var s = String(parseFloat(v.toPrecision(10)));
    var m = /^([\d.]+)e([+-]\d+)$/.exec(s);
    if (m) return m[1].replace('.', '{,}') + '\\times10^{' + (+m[2]) + '}';
    return s.replace('.', '{,}');
  }
  function prec(n) {
    switch (n.k) {
      case 'add': case 'sub': return 1;
      case 'neg': return 2;
      case 'num': return n.v < 0 ? 2 : 6;
      case 'int': case 'sum': case 'prod': case 'diff': return 2.5;
      case 'mul': return 3;
      case 'pow': return 4;
    }
    return 6;
  }
  function startsWithDigit(n) {
    if (n.k === 'num') return true;
    if (n.k === 'mul' || n.k === 'pow') return startsWithDigit(n.a);
    return false;
  }
  function toLatex(n) {
    function wrap(m, min) { var s = toLatex(m); return prec(m) < min ? '\\left(' + s + '\\right)' : s; }
    switch (n.k) {
      case 'num': return texNumber(n.v);
      case 'const': return n.n === 'pi' ? '\\pi' : 'e';
      case 'var': return n.n;
      case 'add': return toLatex(n.a) + '+' + wrap(n.b, 2.5);
      case 'sub': return toLatex(n.a) + '-' + wrap(n.b, 2.5);
      case 'neg': return '-' + wrap(n.a, 3);
      case 'mul': {
        var L = wrap(n.a, 3), R = wrap(n.b, 3.5);
        var sep = startsWithDigit(n.b) && prec(n.b) >= 3.5 ? '\\times ' : n.a.k === 'num' ? '' : '\\,';
        return L + sep + R;
      }
      case 'div': return '\\frac{' + toLatex(n.a) + '}{' + toLatex(n.b) + '}';
      case 'pow': {
        var ex = '^{' + toLatex(n.b) + '}';
        if (n.a.k === 'const' && n.a.n === 'e') return 'e' + ex;
        if (n.a.k === 'fn' && /^(sin|cos|tan|ln)$/.test(n.a.n) && n.b.k === 'num' && isInt(n.b.v) && n.b.v > 0) {
          return '\\' + n.a.n + ex + '\\left(' + toLatex(n.a.a) + '\\right)';
        }
        var simple = n.a.k === 'var' || n.a.k === 'const' || (n.a.k === 'num' && n.a.v >= 0);
        return (simple ? toLatex(n.a) : '\\left(' + toLatex(n.a) + '\\right)') + ex;
      }
      case 'fn': {
        if (n.n === 'exp') return 'e^{' + toLatex(n.a) + '}';
        var head = '\\' + n.n + (n.base ? '_{' + toLatex(n.base) + '}' : '');
        if (n.a.k === 'abs') return head + '\\left|' + toLatex(n.a.a) + '\\right|';
        return head + '\\left(' + toLatex(n.a) + '\\right)';
      }
      case 'root': return '\\sqrt' + (n.idx ? '[' + toLatex(n.idx) + ']' : '') + '{' + toLatex(n.a) + '}';
      case 'abs': return '\\left|' + toLatex(n.a) + '\\right|';
      case 'deg': return wrap(n.a, 6) + '^{\\circ}';
      case 'fact': return wrap(n.a, 6) + '!';
      case 'pct': return wrap(n.a, 6) + '\\%';
      case 'int': return '\\int' + (n.lo ? '_{' + toLatex(n.lo) + '}^{' + toLatex(n.hi) + '}' : '') + toLatex(n.body) + '\\,\\mathrm{d}' + n.v;
      case 'sum': case 'prod': return '\\' + n.k + '_{' + n.i + '=' + toLatex(n.from) + '}^{' + toLatex(n.to) + '}' + wrap(n.body, 3);
      case 'diff': return '\\frac{\\mathrm{d}}{\\mathrm{d}' + n.v + '}\\left(' + toLatex(n.body) + '\\right)';
      case 'at': return '\\left.' + toLatex(n.body) + '\\right|_{' + n.v + '=' + toLatex(n.val) + '}';
    }
    return '?';
  }

  /* ---------- analyse complète : mode examen, calcul formel ---------- */
  var EXAM_MSG = {
    int: 'Mode examen : la calculatrice ne calcule pas les intégrales. Trouve une primitive F, puis calcule F(b) − F(a) à la main.',
    diff: 'Mode examen : la calculatrice ne dérive pas. Calcule la dérivée à la main.',
    sum: 'Mode examen : pas de somme Σ automatique. Écris les termes et additionne-les.',
    prod: 'Mode examen : pas de produit Π automatique. Écris les facteurs et multiplie-les.'
  };
  function freeVars(n, bound, out) {
    bound = bound || {}; out = out || {};
    function inner(m, name) { var b = Object.assign({}, bound); b[name] = 1; freeVars(m, b, out); }
    if (n.k === 'var') { if (!bound[n.n]) out[n.n] = 1; return out; }
    if (n.k === 'int' && n.lo) { freeVars(n.lo, bound, out); freeVars(n.hi, bound, out); inner(n.body, n.v); return out; }
    if (n.k === 'sum' || n.k === 'prod') { freeVars(n.from, bound, out); freeVars(n.to, bound, out); inner(n.body, n.i); return out; }
    if (n.k === 'at') { freeVars(n.val, bound, out); inner(n.body, n.v); return out; }
    children(n).forEach(function (c) { freeVars(c, bound, out); });
    return out;
  }
  /** Remplace dérivées et primitives par leur résultat formel. */
  function expandSymbolic(n, flags) {
    var copy = Object.assign({}, n);
    CHILD_KEYS.forEach(function (k) { if (copy[k] && typeof copy[k] === 'object') copy[k] = expandSymbolic(copy[k], flags); });
    if (copy.k === 'diff') { flags.symbolic = true; return simplify(derive(copy.body, copy.v)); }
    if (copy.k === 'int' && !copy.lo) { flags.symbolic = true; flags.primitive = true; return simplify(primitive(copy.body, copy.v)); }
    return copy;
  }
  function analyzeLatex(src, opts) {
    opts = opts || {};
    var ast = parseLatex(src, opts);
    if (opts.exam) walk(ast, function (m) { if (EXAM_MSG[m.k]) throw new CalcError(EXAM_MSG[m.k]); });
    var flags = { symbolic: false, primitive: false };
    ast = expandSymbolic(ast, flags);
    return { ast: ast, symbolic: flags.symbolic, primitive: flags.primitive };
  }

  /**
   * compileLatex(latex, opts) → fonction env → nombre (lève CalcError).
   * opts.angle : 'rad' | 'deg' ; opts.ans : valeur de Ans ; opts.exam : mode examen.
   */
  function compileLatex(src, opts) {
    opts = opts || {};
    var ast = analyzeLatex(src, opts).ast, deg = opts.angle === 'deg';
    return function (env) { return evalNode(ast, env || {}, deg); };
  }

  function evaluateLatex(src, opts) {
    var v = compileLatex(src, opts)({});
    if (typeof v !== 'number' || isNaN(v)) throw new CalcError('Résultat non défini');
    return v;
  }

  /**
   * Calcul de la calculatrice : { kind: 'number', value } ou, pour une dérivée ou une primitive
   * qui reste une expression en x, { kind: 'expr', latex } (primitive : « + C » ajouté).
   */
  function calcLatex(src, opts) {
    opts = opts || {};
    var a = analyzeLatex(src, opts);
    if (a.primitive || (a.symbolic && Object.keys(freeVars(a.ast)).length)) {
      var tex = toLatex(a.ast);
      if (a.primitive) tex = tex === '0' ? 'C' : tex + '+C';
      return { kind: 'expr', latex: tex, primitive: a.primitive };
    }
    var v = evalNode(a.ast, {}, opts.angle === 'deg');
    if (typeof v !== 'number' || isNaN(v)) throw new CalcError('Résultat non défini');
    return { kind: 'number', value: v };
  }

  /** Dérivée et primitive formelles d'une expression LaTeX (en LaTeX). */
  function deriveLatex(src, v) { return toLatex(simplify(derive(analyzeLatex(src).ast, v || 'x'))); }
  function primitiveLatex(src, v) { return toLatex(simplify(primitive(analyzeLatex(src).ast, v || 'x'))); }

  /** Lit une réponse d'élève : « 2,5 », « 3/4 », « -2 », « ln(2) », « pi/3 », « 2√3 »… NaN si illisible. */
  function parseNum(s) {
    if (s === null || s === undefined) return NaN;
    // « 25 % » répond à une question posée « en % » : le signe final est une unité, pas ÷ 100.
    // Écritures d'élève de la notation scientifique : « 7,92.10^8 » et « 7,92 x 10^8 » = 7,92 × 10⁸.
    var v = tryEvaluate(String(s).replace(/\s*%\s*$/, '').replace(/(\d)\s*(?:\.|[xX])\s*(?=10\s*\^)/g, '$1*'));
    return isFinite(v) ? v : NaN;
  }

  /**
   * Tolérance d'un exercice dont la réponse n'est pas entière.
   * - par défaut (maths) : arrondi au centième ; pour |a| < 0,1, 3 chiffres significatifs ;
   * - sig = true (physique) : 3 chiffres significatifs, quelle que soit la taille du nombre.
   */
  function approxTol(a, sig) {
    a = Math.abs(a);
    if (sig || a < 0.1) return a * 0.0051 + 1e-300;
    return 0.0051;
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

  /* ---------- nombres pour la physique ---------- */
  /** Exposant décimal de |x| (robuste : log10(1000) vaut 2,9999… en flottants). */
  function exp10(a) {
    var e = Math.floor(Math.log10(a));
    if (Math.pow(10, e + 1) <= a) e++;
    if (Math.pow(10, e) > a) e--;
    return e;
  }
  function roundSig(x, n) {
    if (typeof x !== 'number' || !isFinite(x) || x === 0) return x;
    return Number(x.toPrecision(n || 3));
  }
  var SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  function sup(n) { return String(n).replace('-', '⁻').replace(/\d/g, function (d) { return SUP[d]; }); }
  function sciParts(x, sig) {
    var r = roundSig(x, sig), e = exp10(Math.abs(r)), m = roundSig(r / Math.pow(10, e), sig);
    if (Math.abs(m) >= 10) { m = roundSig(m / 10, sig); e++; }
    return { m: m, e: e, sci: e >= 6 || e <= -4 };
  }
  /** Nombre à la française (texte) : sig chiffres significatifs, 7,92 × 10⁸ si très grand ou très petit. */
  function fmtNum(x, sig) {
    sig = sig || 3;
    if (typeof x !== 'number' || !isFinite(x)) return '—';
    if (x === 0) return '0';
    var s = sciParts(x, sig);
    return s.sci ? fmt(s.m, 12) + ' × 10' + sup(s.e) : fmt(roundSig(x, sig), 12);
  }
  /** Même chose en LaTeX : 7{,}92\times 10^{8}, 455\,000, 0{,}35. */
  function texNum(x, sig) {
    sig = sig || 3;
    if (typeof x !== 'number' || !isFinite(x)) return '?';
    if (x === 0) return '0';
    function dec(v) { return fmt(v, 12).replace(',', '{,}').replace(/[\u202f\u00a0 ]/g, '\\,').replace('−', '-'); }
    var s = sciParts(x, sig);
    return s.sci ? dec(s.m) + '\\times 10^{' + s.e + '}' : dec(roundSig(x, sig));
  }
  /** Durée en secondes → { j, h, min, s } (arrondie à la seconde). */
  function splitDuration(sec) {
    var s = Math.round(sec), j = Math.floor(s / 86400); s -= j * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    return { j: j, h: h, min: m, s: s };
  }
  /** « 1 j 2 h 3 min 4 s » (les unités nulles en tête sont omises). */
  function fmtDuration(sec) {
    if (typeof sec !== 'number' || !isFinite(sec) || sec < 0) return '—';
    var d = splitDuration(sec), parts = [];
    if (d.j) parts.push(d.j + ' j');
    if (d.h) parts.push(d.h + ' h');
    if (d.min) parts.push(d.min + ' min');
    if (d.s || !parts.length) parts.push(d.s + ' s');
    return parts.join(' ');
  }

  /* ---------- entraînement et évaluation : réponses, pièges, progression ---------- */
  /** Règles de progression d'un chapitre : série pour débloquer l'évaluation, note pour valider. */
  var GATE = { STREAK: 5, PASS: 15, TOTAL: 20 };
  /** Réponse juste ? tol : tolérance absolue (défaut : 3 chiffres significatifs). */
  function isCorrect(value, answer, tol) {
    if (typeof value !== 'number' || isNaN(value)) return false;
    if (tol === undefined) tol = approxTol(answer, true);
    return Math.abs(value - answer) <= tol;
  }
  /**
   * Erreur fréquente reconnue : premier piège { value, msg } proche de la valeur saisie (1,5 %),
   * en ignorant un piège qui se confondrait avec la bonne réponse.
   */
  function matchTrap(value, traps, answer) {
    if (!traps || typeof value !== 'number' || isNaN(value)) return null;
    for (var i = 0; i < traps.length; i++) {
      var t = traps[i];
      if (!t || typeof t.value !== 'number' || !isFinite(t.value)) continue;
      if (typeof answer === 'number' && Math.abs(t.value - answer) <= 2 * approxTol(answer, true)) continue;
      var tol = t.tol !== undefined ? t.tol : Math.max(Math.abs(t.value) * 0.015, 1e-12);
      if (Math.abs(value - t.value) <= tol) return t;
    }
    return null;
  }
  function progressDefaults() {
    return { streak: 0, best: 0, answered: 0, correct: 0, unlocked: false, attempts: 0, lastScore: null, bestScore: null, validated: false };
  }
  /** Relit la progression enregistrée (JSON abîmé ou incomplet → valeurs par défaut). */
  function progressRead(raw) {
    var st = progressDefaults(), o = null;
    try { o = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { o = null; }
    if (o && typeof o === 'object') {
      Object.keys(st).forEach(function (k) {
        var ok = st[k] === null ? typeof o[k] === 'number' && isFinite(o[k]) : typeof o[k] === typeof st[k];
        if (ok) st[k] = o[k];
      });
    }
    return st;
  }
  /** Une réponse d'entraînement : la série monte (ou repart à 0) ; 5 de suite débloquent l'évaluation. */
  function progressAnswer(st, ok) {
    var n = Object.assign(progressDefaults(), st);
    n.answered++;
    if (ok) { n.correct++; n.streak++; } else n.streak = 0;
    n.best = Math.max(n.best, n.streak);
    if (n.streak >= GATE.STREAK) n.unlocked = true;
    return n;
  }
  /** Question passée sans répondre : la série repart à 0 (on ne choisit pas ses questions). */
  function progressSkip(st) {
    var n = Object.assign(progressDefaults(), st);
    n.streak = 0;
    return n;
  }
  /** Résultat d'une évaluation : ≥ 15/20 valide le chapitre ; sinon elle se reverrouille et la série repart à 0. */
  function progressExam(st, score) {
    var n = Object.assign(progressDefaults(), st);
    n.attempts++;
    n.lastScore = score;
    n.bestScore = n.bestScore === null ? score : Math.max(n.bestScore, score);
    if (score >= GATE.PASS) { n.validated = true; n.unlocked = true; }
    else { n.unlocked = false; n.streak = 0; }
    return n;
  }
  /** Note d'une copie : somme des points des questions justes. */
  function examScore(items) {
    return items.reduce(function (s, it) { return s + (it.ok ? it.points : 0); }, 0);
  }

  return {
    evaluate: evaluate, tryEvaluate: tryEvaluate, parseNum: parseNum, CalcError: CalcError, approxTol: approxTol,
    fmt: fmt, fmtCalc: fmtCalc,
    niceStep: niceStep, tickStep: tickStep, decimalsFor: decimalsFor, piLabel: piLabel, clampLabel: clampLabel,
    insertSnippet: insertSnippet, CARET: CARET, splitTopLevel: splitTopLevel,
    compileLatex: compileLatex, evaluateLatex: evaluateLatex, simpson: simpson,
    parseLatex: parseLatex, calcLatex: calcLatex, deriveLatex: deriveLatex, primitiveLatex: primitiveLatex,
    toLatex: toLatex, simplify: simplify, derive: derive, primitive: primitive, evalNode: evalNode,
    roundSig: roundSig, fmtNum: fmtNum, texNum: texNum, splitDuration: splitDuration, fmtDuration: fmtDuration,
    GATE: GATE, isCorrect: isCorrect, matchTrap: matchTrap, progressDefaults: progressDefaults, progressRead: progressRead,
    progressAnswer: progressAnswer, progressSkip: progressSkip, progressExam: progressExam, examScore: examScore
  };
});
