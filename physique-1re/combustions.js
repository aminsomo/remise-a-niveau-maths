/* ==========================================================================
   Chapitre 4 — Équation de réaction et molécules : banque de questions paramétrées.
   Inspirée de la fiche d'exercices du chapitre (combustion du pentane, du
   propane, de l'éthanol et de l'hentriacontane, tableaux d'avancement) et des
   deux cours (hydrocarbures, alcools, combustion complète ou incomplète,
   n = m / M, n = V / Vm, avancement, réactif limitant).

   Chaque générateur renvoie { type, ask, html, answer, unit, traps, solution }
   (ou, pour un QCM, { type, ask, html, choices, answer, solution }).
   Les « pièges » sont les erreurs fréquentes : elles sont expliquées à l'élève
   avant la solution complète.
   Utilisé par la page (window.ChapterBank) et par les tests (node --test).
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../assets/core.js'));
  else root.ChapterBank = factory(root.CourseCore);
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';
  var T = C.texNum;

  /* ---------- données de la fiche ---------- */
  var MA = { C: 12, H: 1, O: 16 }; // masses molaires atomiques (g·mol⁻¹)
  var VM = 24;                      // volume molaire des gaz (L·mol⁻¹)
  var ORDER = ['C', 'H', 'O'];

  /** Masse molaire d'une molécule { C, H, O } (g·mol⁻¹). */
  function molar(f) { return ORDER.reduce(function (s, e) { return s + (f[e] || 0) * MA[e]; }, 0); }
  /** Formule brute en LaTeX (dans \mathrm{…}) : C_{3}H_{8}, CO_{2}, H_{2}O. */
  function ftex(f) {
    return ORDER.map(function (e) { var k = f[e]; return k ? e + (k > 1 ? '_{' + k + '}' : '') : ''; }).join('');
  }
  var SUB = '₀₁₂₃₄₅₆₇₈₉';
  /** Formule brute en texte : C₃H₈. */
  function fu(f) {
    return ORDER.map(function (e) { var k = f[e]; return k ? e + (k > 1 ? String(k).replace(/\d/g, function (d) { return SUB[d]; }) : '') : ''; }).join('');
  }

  /* ---------- familles et noms (cours 1) ---------- */
  var PREFIX = ['', 'méth', 'éth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'déc'];
  var LONG = {
    11: 'undécane', 12: 'dodécane', 13: 'tridécane', 14: 'tétradécane', 15: 'pentadécane', 16: 'hexadécane',
    17: 'heptadécane', 18: 'octadécane', 19: 'nonadécane', 20: 'icosane', 21: 'hénicosane', 22: 'docosane',
    23: 'tricosane', 24: 'tétracosane', 25: 'pentacosane', 26: 'hexacosane', 27: 'heptacosane', 28: 'octacosane',
    29: 'nonacosane', 30: 'triacontane', 31: 'hentriacontane'
  };
  function alkaneName(n) { return n <= 10 ? PREFIX[n] + 'ane' : LONG[n]; }
  /** Alcane CnH2n+2 (liaisons simples). */
  function alkane(n) { return { n: alkaneName(n), f: { C: n, H: 2 * n + 2 }, fam: 'alcane', k: n }; }
  /** Alcène CnH2n (une liaison double C=C), n ≥ 2. */
  function alkene(n) { return { n: PREFIX[n] + 'ène', f: { C: n, H: 2 * n }, fam: 'alcène', k: n }; }
  /** Alcool CnH2n+1OH (groupe hydroxyle en bout de chaîne). */
  function alcohol(n) { return { n: n <= 2 ? PREFIX[n] + 'anol' : PREFIX[n] + 'an-1-ol', f: { C: n, H: 2 * n + 2, O: 1 }, fam: 'alcool', k: n }; }
  /** Écriture CnH2n+1OH d'un alcool : CH_{3}OH, C_{2}H_{5}OH. */
  function alcTex(n) { return 'C' + (n > 1 ? '_{' + n + '}' : '') + 'H_{' + (2 * n + 1) + '}OH'; }
  /** Formules semi-développées (chaînes linéaires) en LaTeX. */
  var BOND = '\\text{–}';
  function semiAlkane(n) {
    if (n === 1) return 'CH_4';
    var a = ['CH_3']; for (var i = 2; i < n; i++) a.push('CH_2'); a.push('CH_3');
    return a.join(BOND);
  }
  function semiAlkene(n) { // double liaison en tête de chaîne : CH2=CH–CH3
    var a = ['CH_2', 'CH']; for (var i = 3; i < n; i++) a.push('CH_2'); if (n > 2) a.push('CH_3'); else a[1] = 'CH_2';
    return a[0] + '{=}' + a.slice(1).join(BOND);
  }
  function semiAlcohol(n) {
    var a = ['CH_3']; for (var i = 2; i <= n; i++) a.push('CH_2'); if (n === 1) a = ['CH_3'];
    return a.join(BOND) + BOND + 'OH';
  }

  /** Espèces de la fiche et du cours. */
  var SPECIES = {
    methane: alkane(1), ethane: alkane(2), propane: alkane(3), butane: alkane(4), pentane: alkane(5),
    hexane: alkane(6), heptane: alkane(7), octane: alkane(8), hentriacontane: alkane(31),
    ethene: alkene(2), propene: alkene(3),
    methanol: alcohol(1), ethanol: alcohol(2), propanol: alcohol(3),
    O2: { n: 'dioxygène', f: { O: 2 }, gas: true },
    CO2: { n: 'dioxyde de carbone', f: { C: 1, O: 2 }, gas: true },
    H2O: { n: 'eau', f: { H: 2, O: 1 } }
  };
  ['methane', 'ethane', 'propane', 'butane'].forEach(function (k) { SPECIES[k].gas = true; });

  function isInt(x) { return Math.abs(x - Math.round(x)) < 1e-9; }
  /**
   * Combustion complète de CxHyOz : a CxHyOz + b O2 → c CO2 + d H2O,
   * avec les plus petits nombres entiers (conservation des éléments C, H et O).
   */
  function balance(f) {
    var x = f.C, y = f.H, z = f.O || 0;
    for (var k = 1; k <= 4; k++) {
      var b = k * (x + y / 4 - z / 2), d = k * y / 2;
      if (isInt(b) && isInt(d)) return { a: k, b: Math.round(b), c: k * x, d: Math.round(d) };
    }
    return null;
  }
  /** Nombres d'atomes de chaque élément, côté réactifs et côté produits. */
  function atoms(f, B) {
    var z = f.O || 0;
    return {
      C: [B.a * f.C, B.c], H: [B.a * f.H, 2 * B.d], O: [B.a * z + 2 * B.b, 2 * B.c + B.d]
    };
  }

  /* ---------- outils d'écriture ---------- */
  var UM = '\\ \\mathrm{g\\cdot mol^{-1}}';
  var UVM = '\\ \\mathrm{L\\cdot mol^{-1}}';
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function m(t) { return '\\(' + t + '\\)'; }
  function q(unitTex, x, sig) { return T(x, sig) + '\\ \\mathrm{' + unitTex + '}'; }
  function mol(x, sig) { return q('mol', x, sig); }
  function mr(f) { return '\\mathrm{' + ftex(f) + '}'; }
  function steps(list) { return '<ol class="steps-list">' + list.filter(Boolean).map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>'; }
  function ask(what, unit) { return 'Donne ' + what + ' en ' + unit + ', à 3 chiffres significatifs.'; }
  function data(list) { return '<p class="note">Données : ' + list.join(' ; ') + '.</p>'; }
  var DATA_M = m('\\QM(\\mathrm{C}) = 12' + UM) + ' ; ' + m('\\QM(\\mathrm{H}) = 1' + UM) + ' ; ' + m('\\QM(\\mathrm{O}) = 16' + UM);
  var DATA_VM = m('\\QVm = 24' + UVM);
  /** Articles avec élision : « d’éthanol », « de butane », « de l’éthanol », « l’éthanol ». */
  function vowel(n) { return /^[aeéèiouyh]/i.test(n); }
  function de(n) { return (vowel(n) ? 'd’' : 'de ') + n; }
  function du(n) { return (vowel(n) ? 'de l’' : 'du ') + n; }
  function le(n) { return (vowel(n) ? 'l’' : 'le ') + n; }
  /** Nombre stœchiométrique devant une formule (1 ne s'écrit pas). */
  function coef(k) { return k === 1 ? '' : k + '\\,'; }
  /** Équation de combustion complète ajustée, en LaTeX. */
  function eqTex(f, B) {
    return coef(B.a) + mr(f) + ' + ' + coef(B.b) + '\\mathrm{O_2} \\longrightarrow ' + coef(B.c) + '\\mathrm{CO_2} + ' + coef(B.d) + '\\mathrm{H_2O}';
  }
  /** Détail du calcul de M : 3 × 12 + 8 × 1 = 44 g/mol. */
  function molarLine(f) {
    var parts = ORDER.filter(function (e) { return f[e]; }).map(function (e) { return (f[e] > 1 ? f[e] + ' \\times ' : '') + MA[e]; });
    return m('\\QM(' + mr(f) + ') = ' + parts.join(' + ') + ' = ' + T(molar(f)) + UM);
  }
  /** Nombre lisible dans un tableau HTML : 0,1 · 2,5 · 0 (jamais −0). */
  function num(x, sig) { if (Math.abs(x) < 1e-9) return '0'; return C.fmtNum(x, sig || 3).replace('-', '−'); }

  /**
   * Tableau d'avancement HTML : état initial, en cours, final.
   * n0O = null quand le dioxygène est en excès.
   */
  function advTable(f, B, n0f, n0O, xm) {
    function red(n0, k) { return num(n0) + ' − ' + (k === 1 ? '' : k) + '<i>x</i>'; }
    function prod(k) { return (k === 1 ? '' : k) + '<i>x</i>'; }
    var exc = n0O === null;
    var head = '<tr><th scope="col" colspan="2">Équation</th><th scope="col">' + m(coef(B.a) + mr(f)) + '</th><th scope="col">' + m('+\\ ' + coef(B.b) + '\\mathrm{O_2}') +
      '</th><th scope="col">' + m('\\longrightarrow\\ ' + coef(B.c) + '\\mathrm{CO_2}') + '</th><th scope="col">' + m('+\\ ' + coef(B.d) + '\\mathrm{H_2O}') + '</th></tr>';
    var rows = [
      ['État initial', m('x = 0'), num(n0f), exc ? 'excès' : num(n0O), '0', '0'],
      ['En cours', m('x'), red(n0f, B.a), exc ? 'excès' : red(n0O, B.b), prod(B.c), prod(B.d)],
      ['État final', m('x_{\\max} = ' + T(xm)), num(n0f - B.a * xm), exc ? 'excès' : num(n0O - B.b * xm), num(B.c * xm), num(B.d * xm)]
    ];
    return '<div class="table-scroll"><table class="adv"><caption>Quantités de matière en mol</caption><thead>' + head + '</thead><tbody>' +
      rows.map(function (r) { return '<tr><th scope="row">' + r[0] + '</th>' + r.slice(1).map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>';
  }

  function make(rng) {
    rng = rng || Math.random;
    function P(arr) { return arr[Math.floor(rng() * arr.length)]; }
    function shuffle(a) {
      a = a.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    }
    /** QCM : bonne réponse + distracteurs mélangés ; why = explication d'un distracteur. */
    function mcq(o, right, wrongs) {
      var all = shuffle([{ html: right, ok: true }].concat(wrongs.map(function (w) { return typeof w === 'string' ? { html: w } : w; })));
      o.choices = all.map(function (c) { return { html: c.html, why: c.why }; });
      o.answer = all.findIndex(function (c) { return c.ok; });
      o.ask = o.ask || 'Choisis la bonne réponse.';
      return o;
    }

    /* ---- famille d'une molécule (cours 1, I et II) ---- */
    var FAMILY = { alcane: 'un alcane', 'alcène': 'un alcène', alcool: 'un alcool', autre: 'ni un hydrocarbure, ni un alcool' };
    function family() {
      var kind = P(['alcane', 'alcane', 'alcène', 'alcool', 'autre']), semi = rng() < 0.4, s, shown, info;
      if (kind === 'alcane') { s = alkane(P([1, 2, 3, 4, 5, 6, 7, 8])); shown = semi && s.k <= 5 ? semiAlkane(s.k) : ftex(s.f); }
      else if (kind === 'alcène') { s = alkene(P([2, 3, 4, 5, 6])); shown = semi && s.k <= 4 ? semiAlkene(s.k) : ftex(s.f); }
      else if (kind === 'alcool') { s = alcohol(P([1, 2, 3, 4])); shown = semi && s.k <= 3 ? semiAlcohol(s.k) : alcTex(s.k); }
      else { s = P([SPECIES.CO2, SPECIES.H2O, SPECIES.O2, { n: 'monoxyde de carbone', f: { C: 1, O: 1 } }]); shown = ftex(s.f); }
      var n = s.k, h = s.f.H;
      info = {
        alcane: 'Un <b>alcane</b> ne contient que C et H, avec seulement des liaisons simples : ' + m('\\mathrm{C_nH_{2n+2}}') + '.',
        'alcène': 'Un <b>alcène</b> ne contient que C et H, avec une liaison double C=C : ' + m('\\mathrm{C_nH_{2n}}') + '.',
        alcool: 'Un <b>alcool</b> possède un groupe hydroxyle OH porté par un atome de carbone : ' + m('\\mathrm{C_nH_{2n+1}OH}') + '.',
        autre: 'Un hydrocarbure ne contient que des atomes C et H ; un alcool porte un groupe OH lié à un carbone.'
      };
      function why(chosen) {
        if (kind === 'alcane' && chosen === 'alcène') return 'Ici ' + m('n = ' + n) + ' et il y a ' + h + ' atomes H, soit ' + m('2n + 2') + ' : c’est un alcane, sans liaison double.';
        if (kind === 'alcène' && chosen === 'alcane') return 'Un alcane à ' + n + ' carbones aurait ' + m('2n + 2 = ' + (2 * n + 2)) + ' atomes H. Ici il y en a ' + h + ', soit ' + m('2n') + ' : une liaison double, c’est un alcène.';
        if (chosen === 'alcool') return 'Un alcool contient un groupe <b>OH</b> lié à un carbone. ' + (kind === 'autre' ? 'Ici il n’y en a pas.' : 'Il n’y a pas d’oxygène dans cette molécule.');
        if (kind === 'alcool') return 'La molécule contient un groupe OH : ce n’est pas un hydrocarbure (seulement C et H). ' + info.alcool;
        if (kind === 'autre') return 'Cette molécule contient de l’oxygène sans groupe OH lié à un carbone : ce n’est ni un hydrocarbure, ni un alcool.';
        if (chosen === 'autre') return 'La molécule ne contient que des atomes C et H : c’est un hydrocarbure.';
        return info[chosen];
      }
      return mcq({
        type: 'Reconnaître une famille', ref: kind === 'alcool' ? 'c-alcools' : 'c-hydrocarbures',
        html: '<p>À quelle famille appartient la molécule ' + m('\\mathrm{' + shown + '}') + ' ?</p>',
        solution: '<p>' + m('\\mathrm{' + shown + '}') + ' est ' + FAMILY[kind] + (s.n && kind !== 'autre' ? ' (' + le(s.n) + ')' : '') + '. ' + (kind === 'autre' ? info.autre : info[kind]) + '</p>'
      }, FAMILY[kind], Object.keys(FAMILY).filter(function (k) { return k !== kind; }).map(function (k) { return { html: FAMILY[k], why: why(k) }; }));
    }

    /* ---- nom ↔ formule brute d'un alcane ---- */
    function name() {
      var n = P([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), s = alkane(n), toFormula = rng() < 0.55;
      var sol = '<p>Préfixe <b>' + PREFIX[n] + '-</b> : ' + n + ' atome' + (n > 1 ? 's' : '') + ' de carbone. Un alcane a ' + m('2n + 2 = ' + (2 * n + 2)) + ' atomes d’hydrogène : ' + m(mr(s.f)) + ', ' + le(s.n) + '.</p>';
      if (toFormula) {
        var wrongs = [{ html: m(mr({ C: n, H: 2 * n + 1 })), why: 'Un alcane a ' + m('2n + 2') + ' atomes H : ' + m('2 \\times ' + n + ' + 2 = ' + (2 * n + 2)) + '.' }];
        if (n >= 2) wrongs.push({ html: m(mr({ C: n, H: 2 * n })), why: m('\\mathrm{C_nH_{2n}}') + ' est la formule d’un <b>alcène</b> (une liaison double), pas d’un alcane.' });
        var other = n === 10 ? 9 : n + 1;
        wrongs.push({ html: m(mr(alkane(other).f)), why: 'Le préfixe ' + PREFIX[n] + '- veut dire ' + n + ' atome' + (n > 1 ? 's' : '') + ' de carbone ; ' + m(mr(alkane(other).f)) + ' est ' + le(alkaneName(other)) + '.' });
        return mcq({ type: 'Nom et formule brute', ref: 'c-noms', html: '<p>Quelle est la formule brute ' + du(s.n) + ' ?</p>', solution: sol }, m(mr(s.f)), wrongs);
      }
      var near = n <= 2 ? [n + 1, n + 2] : [n - 1, n + 1 > 10 ? n - 2 : n + 1];
      var ws = near.map(function (k) { return { html: cap(alkaneName(k)), why: 'Le préfixe donne le nombre de carbones : ' + PREFIX[k] + '- = ' + k + ', ici il y en a ' + n + '.' }; });
      if (n >= 2) ws.push({ html: cap(PREFIX[n] + 'ène'), why: 'La terminaison <b>-ène</b> désigne un alcène (liaison double, ' + m('\\mathrm{C_nH_{2n}}') + '). Ici ' + m((2 * n + 2) + ' = 2n + 2') + ' : c’est un alcane, terminaison <b>-ane</b>.' });
      return mcq({ type: 'Nom et formule brute', ref: 'c-noms', html: '<p>Comment s’appelle l’alcane de formule brute ' + m(mr(s.f)) + ' ?</p>', solution: sol }, cap(s.n), ws);
    }

    /* ---- nombre d'atomes : CnH2n+2, CnH2n+1OH (exercice 4.1) ---- */
    function formulaH() {
      var v = P(['H', 'H', 'C', 'alcool']);
      if (v === 'H') {
        var n = P([3, 5, 6, 8, 12, 16, 20, 25, 31]);
        return {
          type: 'Formule brute d’un alcane', ask: 'Donne un nombre entier.', unit: 'atomes H', answer: 2 * n + 2,
          html: '<p>Un alcane possède ' + n + ' atomes de carbone' + (n === 31 ? ' (l’hentriacontane de la cire d’abeille)' : '') + '.</p><p>Combien possède-t-il d’atomes d’hydrogène ?</p>',
          traps: [
            { value: 2 * n, msg: m('\\mathrm{C_nH_{2n}}') + ' est la formule d’un <b>alcène</b>. Un alcane a ' + m('2n + 2') + ' atomes H.' },
            { value: 2 * n + 1, msg: 'Formule générale d’un alcane : ' + m('\\mathrm{C_nH_{2n+2}}') + ', soit ' + m('2 \\times ' + n + ' + 2') + '.' },
            { value: 4 * n, msg: 'Seul le méthane a 4 H par carbone : les carbones du milieu de la chaîne n’en portent que 2. Formule : ' + m('2n + 2') + '.' }
          ],
          solution: steps(['Formule générale d’un alcane : ' + m('\\mathrm{C_nH_{2n+2}}') + ', avec ' + m('n = ' + n) + '.', m('2n + 2 = 2 \\times ' + n + ' + 2 = ' + (2 * n + 2)) + ' : ' + m(mr(alkane(n).f)) + '.'])
        };
      }
      if (v === 'C') {
        var k = P([4, 6, 7, 9, 10, 14, 18]), H = 2 * k + 2;
        return {
          type: 'Formule brute d’un alcane', ask: 'Donne un nombre entier.', unit: 'atomes C', answer: k,
          html: '<p>Un alcane possède ' + H + ' atomes d’hydrogène.</p><p>Combien possède-t-il d’atomes de carbone ?</p>',
          traps: [
            { value: H / 2, msg: 'Le nombre de H vaut ' + m('2n + 2') + ', pas ' + m('2n') + ' : ' + m('2n + 2 = ' + H) + ' donne ' + m('n = \\dfrac{' + H + ' - 2}{2}') + '.' },
            { value: (H + 2) / 2, msg: 'On <b>retire</b> 2 avant de diviser par 2 : ' + m('n = \\dfrac{' + H + ' - 2}{2}') + '.' },
            { value: H - 2, msg: 'Après avoir retiré 2, divise encore par 2 : ' + m('2n = ' + (H - 2)) + '.' }
          ],
          solution: steps(['Un alcane : ' + m('\\mathrm{C_nH_{2n+2}}') + ', donc ' + m('2n + 2 = ' + H) + '.', m('2n = ' + (H - 2)) + ', donc ' + m('n = ' + k) + ' : ' + m(mr(alkane(k).f)) + ', ' + le(alkaneName(k)) + '.'])
        };
      }
      var a = P([1, 2, 3, 4, 5]), s = alcohol(a);
      return {
        type: 'Formule brute d’un alcool', ask: 'Donne un nombre entier.', unit: 'atomes H', answer: 2 * a + 2,
        html: '<p>' + cap(le(s.n)) + ' est un alcool à ' + a + ' atome' + (a > 1 ? 's' : '') + ' de carbone, de formule ' + m('\\mathrm{C_nH_{2n+1}OH}') + '.</p><p>Combien la molécule possède-t-elle d’atomes d’hydrogène en tout ?</p>',
        traps: [
          { value: 2 * a + 1, msg: 'N’oublie pas l’atome H du groupe hydroxyle <b>OH</b> : ' + m('(2n + 1) + 1') + '.' },
          { value: 2 * a, msg: 'Dans ' + m('\\mathrm{C_nH_{2n+1}OH}') + ', compte ' + m('2n + 1') + ' atomes H sur la chaîne, plus celui du groupe OH.' }
        ],
        solution: steps([m('\\mathrm{C_nH_{2n+1}OH}') + ' avec ' + m('n = ' + a) + ' : ' + m('\\mathrm{' + alcTex(a) + '}') + '.', 'Atomes H : ' + m((2 * a + 1) + ' + 1 = ' + (2 * a + 2)) + ' ; formule brute ' + m(mr(s.f)) + '.'])
      };
    }

    /* ---- masse molaire moléculaire (exercice 4.2) ---- */
    function molarMass() {
      var s = P([SPECIES.methane, SPECIES.propane, SPECIES.butane, SPECIES.pentane, SPECIES.octane, SPECIES.hentriacontane, SPECIES.ethanol,
        SPECIES.methanol, SPECIES.propanol, SPECIES.ethene, SPECIES.O2, SPECIES.CO2, SPECIES.H2O]);
      var f = s.f, M = molar(f), noMult = ORDER.reduce(function (t, e) { return t + (f[e] ? MA[e] : 0); }, 0);
      var traps = [
        { value: noMult, msg: 'Multiplie la masse molaire de chaque atome par le <b>nombre</b> de ces atomes dans la molécule (les indices).' },
        { value: (f.C || 0) * 1 + (f.H || 0) * 12 + (f.O || 0) * 16, msg: m('\\QM(\\mathrm{C}) = 12') + ' et ' + m('\\QM(\\mathrm{H}) = 1') + ' : ne les inverse pas.' }
      ];
      if (f.O && f.C) traps.push({ value: M - 16 * f.O, msg: 'N’oublie pas l’atome d’<b>oxygène</b> de la molécule.' });
      return {
        type: 'Masse molaire moléculaire', ask: ask('la masse molaire M', 'g·mol⁻¹'), unit: 'g·mol⁻¹', answer: M, traps: traps,
        html: '<p>Calcule la masse molaire ' + m('\\QM') + ' ' + du(s.n) + ' ' + m(mr(f)) + '.</p>' + data([DATA_M]),
        solution: steps(['On additionne les masses molaires de tous les atomes de la molécule.', molarLine(f) + '.'])
      };
    }

    /* ---- n = m / M (exercices 3.2 et 4.4) ---- */
    function nFromMass() {
      var s = P([SPECIES.ethanol, SPECIES.propane, SPECIES.butane, SPECIES.pentane, SPECIES.octane, SPECIES.hentriacontane, SPECIES.methane, SPECIES.H2O, SPECIES.CO2, SPECIES.O2]);
      var M = molar(s.f), n = P([0.05, 0.1, 0.2, 0.25, 0.5, 1.5, 2, 3, 4.5]), g = C.roundSig(n * M, 3), kg = g >= 400 && rng() < 0.5, ans = g / M;
      if (s === SPECIES.hentriacontane) { g = P([10, 20, 50]); kg = false; ans = g / M; }
      var shown = kg ? q('kg', g / 1000) : q('g', g);
      var traps = [
        { value: g * M, msg: 'On <b>divise</b> la masse par la masse molaire : ' + m('\\Qn = \\dfrac{\\Qm}{\\QM}') + '.' },
        { value: M / g, msg: 'C’est l’inverse : ' + m('\\Qn = \\dfrac{\\Qm}{\\QM}') + ', la masse au numérateur.' },
        { value: g / ORDER.reduce(function (t, e) { return t + (s.f[e] ? MA[e] : 0); }, 0), msg: 'La masse molaire est fausse : multiplie chaque masse atomique par le nombre d’atomes. ' + molarLine(s.f) + '.' }
      ];
      if (kg) traps.push({ value: ans / 1000, msg: 'La masse molaire est en g/mol : convertis la masse en <b>grammes</b> (' + m(shown + ' = ' + q('g', g)) + ').' });
      return {
        type: 'Quantité de matière : n = m / M', ask: ask('la quantité de matière n', 'moles (mol)'), unit: 'mol', answer: ans, traps: traps,
        html: '<p>On dispose de ' + m('\\Qm = ' + shown) + ' ' + de(s.n) + ' ' + m(mr(s.f)) + '.</p><p>Calcule la quantité de matière ' + m('\\Qn') + ' correspondante.</p>' + data([DATA_M]),
        solution: steps([
          molarLine(s.f) + '.',
          kg ? 'Masse en grammes : ' + m(shown + ' = ' + q('g', g)) + '.' : null,
          m('\\Qn = \\dfrac{\\Qm}{\\QM} = \\dfrac{' + T(g, 4) + '}{' + T(M) + '} = ' + mol(ans)) + '.'
        ])
      };
    }

    /* ---- n = V / Vm (cours 2, I) ---- */
    function nFromVolume() {
      var s = P([SPECIES.O2, SPECIES.CO2, SPECIES.methane, SPECIES.propane, SPECIES.butane]), n = P([0.02, 0.05, 0.2, 0.5, 1.5, 2.5, 4, 10, 50]);
      var L = n * VM, unit = L < 2 ? 'mL' : L > 500 ? 'm^3' : 'L', shown = unit === 'mL' ? L * 1000 : unit === 'm^3' ? L / 1000 : L;
      var traps = [
        { value: L * VM, msg: 'On <b>divise</b> le volume par le volume molaire : ' + m('\\Qn = \\dfrac{\\QV}{\\QVm}') + '.' },
        { value: VM / L, msg: 'C’est l’inverse : ' + m('\\Qn = \\dfrac{\\QV}{\\QVm}') + ', le volume au numérateur.' }
      ];
      if (unit === 'mL') traps.push({ value: n * 1000, msg: m('\\QVm') + ' est en L/mol : convertis le volume en <b>litres</b> (' + m('1\\ \\mathrm{mL} = 10^{-3}\\ \\mathrm{L}') + ').' });
      if (unit === 'm^3') traps.push({ value: n / 1000, msg: m('\\QVm') + ' est en L/mol : convertis le volume en <b>litres</b> (' + m('1\\ \\mathrm{m^{3}} = 1\\,000\\ \\mathrm{L}') + ').' });
      return {
        type: 'Quantité de matière d’un gaz : n = V / Vm', ask: ask('la quantité de matière n', 'moles (mol)'), unit: 'mol', answer: n, traps: traps,
        html: '<p>Un récipient contient ' + m('\\QV = ' + q(unit, shown)) + ' ' + de(s.n) + ' ' + m(mr(s.f)) + ' gazeux.</p><p>Calcule la quantité de matière ' + m('\\Qn') + ' de ce gaz.</p>' + data([DATA_VM]),
        solution: steps([
          unit !== 'L' ? 'Volume en litres : ' + m('\\QV = ' + q(unit, shown) + ' = ' + q('L', L)) + '.' : null,
          m('\\Qn = \\dfrac{\\QV}{\\QVm} = \\dfrac{' + T(L, 4) + '}{24} = ' + mol(n)) + '.'
        ])
      };
    }

    /* ---- m = n × M ou V = n × Vm (exercices 2.5, 3.7 et 3.8) ---- */
    function massOrVolume() {
      var s = P([SPECIES.CO2, SPECIES.H2O, SPECIES.O2, SPECIES.CO2]), n = P([0.15, 0.4, 0.6, 1.2, 2.5, 4, 6, 15]), M = molar(s.f);
      var wantV = s.gas && rng() < 0.5;
      if (wantV) {
        var V = n * VM;
        return {
          type: 'Volume d’un gaz : V = n × Vm', ask: ask('le volume V', 'litres (L)'), unit: 'L', answer: V, ref: 'c-n-volume',
          html: '<p>Une combustion produit ' + m('\\Qn = ' + mol(n)) + ' ' + de(s.n) + ' ' + m(mr(s.f)) + '.</p><p>Calcule le volume ' + m('\\QV') + ' de ce gaz.</p>' + data([DATA_VM]),
          traps: [
            { value: n / VM, msg: 'De ' + m('\\Qn = \\dfrac{\\QV}{\\QVm}') + ' on tire ' + m('\\QV = \\Qn \\times \\QVm') + ' : on <b>multiplie</b>.' },
            { value: VM / n, msg: 'On multiplie : ' + m('\\QV = \\Qn \\times \\QVm') + '.' },
            { value: n * M, msg: 'Ça, c’est la <b>masse</b> en grammes (' + m('\\Qm = \\Qn \\times \\QM') + '). Pour un volume de gaz, on utilise ' + m('\\QVm') + '.' }
          ],
          solution: steps([m('\\QV = \\Qn \\times \\QVm = ' + T(n) + ' \\times 24 = ' + q('L', V)) + '.'])
        };
      }
      return {
        type: 'Masse : m = n × M', ask: ask('la masse m', 'grammes (g)'), unit: 'g', answer: n * M,
        html: '<p>Une combustion produit ' + m('\\Qn = ' + mol(n)) + ' ' + de(s.n) + ' ' + m(mr(s.f)) + '.</p><p>Calcule la masse ' + m('\\Qm') + ' correspondante.</p>' + data([DATA_M]),
        traps: [
          { value: n / M, msg: 'De ' + m('\\Qn = \\dfrac{\\Qm}{\\QM}') + ' on tire ' + m('\\Qm = \\Qn \\times \\QM') + ' : on <b>multiplie</b>.' },
          { value: M / n, msg: 'On multiplie : ' + m('\\Qm = \\Qn \\times \\QM') + '.' },
          { value: n * ORDER.reduce(function (t, e) { return t + (s.f[e] ? MA[e] : 0); }, 0), msg: 'La masse molaire est fausse : ' + molarLine(s.f) + '.' },
          s.gas ? { value: n * VM, msg: 'Ça, c’est le <b>volume</b> en litres. Pour une masse, on utilise ' + m('\\QM') + '.' } : null
        ].filter(Boolean),
        solution: steps([molarLine(s.f) + '.', m('\\Qm = \\Qn \\times \\QM = ' + T(n) + ' \\times ' + T(M) + ' = ' + q('g', n * M)) + '.'])
      };
    }

    /* ---- ajuster une équation de combustion (exercices 1.1, 2.1, 3.3) ---- */
    var BALANCE_POOL = ['methane', 'ethane', 'propane', 'butane', 'pentane', 'hexane', 'octane', 'ethene', 'propene', 'methanol', 'ethanol', 'propanol'];
    function balanceSteps(s, B) {
      var f = s.f, z = f.O || 0, half = B.a === 2;
      var bFrac = f.C + f.H / 4 - z / 2;
      return steps([
        'Carbone : ' + f.C + ' atome' + (f.C > 1 ? 's' : '') + ' C dans ' + m(mr(f)) + ', donc ' + m(f.C + '\\,\\mathrm{CO_2}') + '.',
        'Hydrogène : ' + f.H + ' atomes H, et chaque ' + m('\\mathrm{H_2O}') + ' en contient 2, donc ' + m((f.H / 2) + '\\,\\mathrm{H_2O}') + '.',
        'Oxygène à droite : ' + m('2 \\times ' + f.C + ' + ' + (f.H / 2) + ' = ' + (2 * f.C + f.H / 2)) + ' atomes O' + (z ? ', dont ' + z + ' apporté par ' + le(s.n) : '') +
          ' ; il faut donc ' + m((z ? '\\dfrac{' + (2 * f.C + f.H / 2) + ' - ' + z + '}{2}' : '\\dfrac{' + (2 * f.C + f.H / 2) + '}{2}') + ' = ' + T(bFrac)) + ' molécules ' + m('\\mathrm{O_2}') + '.',
        half ? 'Les nombres stœchiométriques doivent être entiers : on multiplie tout par 2.' : null,
        'Équation ajustée : ' + m(eqTex(f, B)) + '.'
      ]);
    }
    function coefficient() {
      var key = P(BALANCE_POOL), s = SPECIES[key], f = s.f, B = balance(f), z = f.O || 0;
      var target = P(B.a === 2 ? ['b', 'b', 'c', 'd', 'a'] : ['b', 'b', 'c', 'd']);
      var label = { a: m(mr(f)), b: m('\\mathrm{O_2}'), c: m('\\mathrm{CO_2}'), d: m('\\mathrm{H_2O}') }[target];
      var traps = [];
      if (target === 'b') {
        if (B.a === 2) traps.push({ value: B.b / 2, msg: 'Avec un seul ' + m(mr(f)) + ', il faudrait ' + m(T(B.b / 2)) + ' ' + m('\\mathrm{O_2}') + ' : les nombres stœchiométriques sont <b>entiers</b>, on multiplie tout par 2.' });
        if (z) traps.push({ value: B.a * (f.C + f.H / 4), msg: 'Compte aussi l’atome O de ' + le(s.n) + ' : le dioxygène n’apporte que les atomes O qui manquent.' });
        traps.push({ value: 2 * B.b, msg: 'Ça, c’est le nombre d’<b>atomes</b> O. Chaque molécule ' + m('\\mathrm{O_2}') + ' en apporte 2 : divise par 2.' });
      }
      if (target === 'd') {
        traps.push({ value: B.a * f.H, msg: 'Chaque molécule ' + m('\\mathrm{H_2O}') + ' contient <b>2</b> atomes H : divise le nombre d’atomes H par 2.' });
        if (B.a === 2) traps.push({ value: B.d / 2, msg: 'L’équation commence par ' + m('2\\,' + mr(f)) + ' : il y a deux fois plus d’atomes H à placer.' });
      }
      if (target === 'c') {
        if (B.a === 2) traps.push({ value: B.c / 2, msg: 'L’équation commence par ' + m('2\\,' + mr(f)) + ' : ' + m('2 \\times ' + f.C + ' = ' + B.c) + ' atomes C, donc ' + B.c + ' ' + m('\\mathrm{CO_2}') + '.' });
        traps.push({ value: 2 * B.c, msg: 'Chaque molécule ' + m('\\mathrm{CO_2}') + ' contient un seul atome C : autant de ' + m('\\mathrm{CO_2}') + ' que d’atomes C.' });
      }
      if (target === 'a') traps.push({ value: 1, msg: 'Avec 1 ' + m(mr(f)) + ', le nombre de ' + m('\\mathrm{O_2}') + ' ne serait pas entier : on multiplie tout par 2.' });
      var sq = '\\square\\,';
      return {
        type: 'Ajuster une équation de combustion', ask: 'Donne un nombre entier (les plus petits entiers possibles).', unit: '', answer: B[target], traps: traps,
        html: '<p>Ajuste l’équation de la combustion complète ' + du(s.n) + ' avec les plus petits nombres entiers :</p><p class="formula-line">' + m(sq + mr(f) + ' + ' + sq + '\\mathrm{O_2} \\longrightarrow ' + sq + '\\mathrm{CO_2} + ' + sq + '\\mathrm{H_2O}') + '</p><p>Quel est le nombre stœchiométrique devant ' + label + ' ?</p>',
        solution: balanceSteps(s, B)
      };
    }
    function equation() {
      var key = P(BALANCE_POOL), s = SPECIES[key], f = s.f, B = balance(f), z = f.O || 0, A = atoms(f, B);
      var right = m(eqTex(f, B));
      var wrongs = [];
      var bAlt = B.b + (rng() < 0.5 || B.b === 1 ? 1 : -1);
      wrongs.push({ html: m(eqTex(f, { a: B.a, b: bAlt, c: B.c, d: B.d })), why: 'Compte les atomes O : à gauche ' + m((B.a * z ? B.a * z + ' + ' : '') + '2 \\times ' + bAlt + ' = ' + (B.a * z + 2 * bAlt)) + ', à droite ' + m(A.O[1]) + '. L’équation n’est pas ajustée.' });
      if (B.a * f.H !== B.d) wrongs.push({ html: m(eqTex(f, { a: B.a, b: B.b, c: B.c, d: B.a * f.H })), why: 'Compte les atomes H : à gauche ' + m(A.H[0]) + ', à droite ' + m('2 \\times ' + (B.a * f.H) + ' = ' + (2 * B.a * f.H)) + '. Chaque ' + m('\\mathrm{H_2O}') + ' contient 2 atomes H.' });
      // combustion incomplète ajustée : produit du monoxyde de carbone
      var k = 1, bc;
      for (k = 1; k <= 4; k++) { bc = k * (f.C / 2 + f.H / 4 - z / 2); if (isInt(bc)) break; }
      var inc = coef(k) + mr(f) + ' + ' + coef(Math.round(bc)) + '\\mathrm{O_2} \\longrightarrow ' + coef(k * f.C) + '\\mathrm{CO} + ' + coef(k * f.H / 2) + '\\mathrm{H_2O}';
      if (Math.round(bc) > 0) wrongs.push({ html: m(inc), why: 'Cette équation est ajustée, mais elle forme du <b>monoxyde de carbone</b> CO : c’est une combustion incomplète. Une combustion complète ne donne que ' + m('\\mathrm{CO_2}') + ' et ' + m('\\mathrm{H_2O}') + '.' });
      return mcq({
        type: 'Équation de combustion', ref: 'c-ajuster',
        html: '<p>Quelle équation décrit la combustion <b>complète</b> ' + du(s.n) + ' ' + m(mr(f)) + ', correctement ajustée ?</p>',
        solution: '<p>Bilan des atomes : C ' + m(A.C[0] + ' = ' + A.C[1]) + ', H ' + m(A.H[0] + ' = ' + A.H[1]) + ', O ' + m(A.O[0] + ' = ' + A.O[1]) + '.</p>' + balanceSteps(s, B)
      }, right, wrongs);
    }

    /* ---- tableau d'avancement : x_max, réactif limitant, état final (exercices 1 et 3) ---- */
    var SCEN = ['methane', 'propane', 'pentane', 'ethanol', 'ethene', 'butane', 'octane'];
    function scenario(allowStoich) {
      for (var k = 0; k < 80; k++) {
        var key = P(SCEN), s = SPECIES[key], B = balance(s.f), n0f = P([0.1, 0.2, 0.4, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10]);
        var stoich = allowStoich && rng() < 0.2, r = stoich ? 1 : P([0.4, 0.5, 0.6, 0.75, 0.8, 1.25, 1.5, 2, 2.5]);
        var n0O = stoich ? B.b * n0f / B.a : C.roundSig(B.b * n0f / B.a * r, 2);
        var xf = n0f / B.a, xo = n0O / B.b;
        if (!stoich && Math.abs(xo / xf - 1) < 0.08) continue;
        return { s: s, B: B, n0f: n0f, n0O: n0O, xf: xf, xo: xo, xm: Math.min(xf, xo), lim: stoich ? 'both' : xf < xo ? 'fuel' : 'O2' };
      }
      return null;
    }
    function scenText(c) {
      return '<p>On fait brûler ' + m(mol(c.n0f)) + ' ' + de(c.s.n) + ' dans ' + m(mol(c.n0O)) + ' de dioxygène. Équation de la combustion complète :</p><p class="formula-line">' + m(eqTex(c.s.f, c.B)) + '</p>';
    }
    function xLines(c) {
      var F = mr(c.s.f), a = c.B.a, b = c.B.b;
      return [
        'Si ' + m(F) + ' est limitant : ' + m(T(c.n0f) + ' - ' + (a === 1 ? '' : a) + 'x = 0') + ', donc ' + m('x = ' + (a === 1 ? '' : '\\dfrac{' + T(c.n0f) + '}{' + a + '} = ') + T(c.xf, 4) + '\\ \\mathrm{mol}') + '.',
        'Si ' + m('\\mathrm{O_2}') + ' est limitant : ' + m(T(c.n0O, 4) + ' - ' + b + 'x = 0') + ', donc ' + m('x = \\dfrac{' + T(c.n0O, 4) + '}{' + b + '} = ' + T(c.xo, 4) + '\\ \\mathrm{mol}') + '.',
        c.lim === 'both' ? 'Les deux valeurs sont égales : ' + m('x_{\\max} = ' + mol(c.xm, 4)) + ', les deux réactifs disparaissent en même temps (mélange stœchiométrique).'
          : 'On garde la plus petite valeur : ' + m('x_{\\max} = ' + mol(c.xm, 4)) + ' ; ' + (c.lim === 'fuel' ? le(c.s.n) : 'le dioxygène') + ' est le réactif limitant.'
      ];
    }
    function xmax() {
      var c = scenario(false), larger = Math.max(c.xf, c.xo);
      var traps = [{ value: larger, msg: 'On garde la <b>plus petite</b> des deux valeurs : la transformation s’arrête dès qu’un réactif a disparu.' }];
      traps.push({ value: c.n0O, msg: 'Pour le dioxygène, ' + m(T(c.n0O, 4) + ' - ' + c.B.b + 'x = 0') + ' : divise par le nombre stœchiométrique ' + c.B.b + '.' });
      if (c.B.a > 1) traps.push({ value: c.n0f, msg: 'L’équation commence par ' + m(c.B.a + '\\,' + mr(c.s.f)) + ' : ' + m(T(c.n0f) + ' - ' + c.B.a + 'x = 0') + ', divise par ' + c.B.a + '.' });
      traps.push({ value: c.n0O * c.B.b, msg: 'De ' + m(T(c.n0O, 4) + ' - ' + c.B.b + 'x = 0') + ' on tire ' + m('x = \\dfrac{' + T(c.n0O, 4) + '}{' + c.B.b + '}') + ' : on divise.' });
      return {
        type: 'Avancement maximal', ask: ask('l’avancement maximal', 'moles (mol)'), unit: 'mol', answer: c.xm, traps: traps,
        html: scenText(c) + '<p>Calcule l’avancement maximal ' + m('x_{\\max}') + '.</p>',
        solution: steps(xLines(c)) + advTable(c.s.f, c.B, c.n0f, c.n0O, c.xm)
      };
    }
    function limiting() {
      var c = scenario(true), F = m(mr(c.s.f));
      var labels = { fuel: cap(le(c.s.n)) + ' ' + F, O2: 'Le dioxygène ' + m('\\mathrm{O_2}'), both: 'Aucun : les deux disparaissent en même temps' };
      var both = 'Les deux réactifs disparaissent pour la même valeur ' + m('x = ' + T(c.xm, 4)) + ' mol : aucun ne s’épuise avant l’autre (mélange stœchiométrique).';
      var why = {
        fuel: c.lim === 'both' ? both : 'Calcule les deux valeurs de ' + m('x') + ' : ' + m(mr(c.s.f)) + ' disparaît pour ' + m('x = ' + T(c.xf, 4)) + ' mol, le dioxygène pour ' + m('x = ' + T(c.xo, 4)) + ' mol. Le limitant donne la plus petite.',
        O2: c.lim === 'both' ? both : 'Calcule les deux valeurs de ' + m('x') + ' : le dioxygène disparaît pour ' + m('x = \\dfrac{' + T(c.n0O, 4) + '}{' + c.B.b + '} = ' + T(c.xo, 4)) + ' mol, ' + le(c.s.n) + ' pour ' + m('x = ' + T(c.xf, 4)) + ' mol.',
        both: 'Les deux valeurs de ' + m('x') + ' sont différentes (' + m(T(c.xf, 4)) + ' et ' + m(T(c.xo, 4)) + ' mol) : un seul réactif disparaît en premier.'
      };
      // erreur classique : comparer les quantités initiales sans diviser par les nombres stœchiométriques
      var raw = ' Attention : on ne compare pas directement ' + m(T(c.n0f)) + ' et ' + m(T(c.n0O, 4)) + ' mol, il faut d’abord diviser par les nombres stœchiométriques.';
      return mcq({
        type: 'Réactif limitant', ref: 'c-avancement',
        html: scenText(c) + '<p>Quel est le réactif limitant ?</p>',
        solution: steps(xLines(c))
      }, labels[c.lim], Object.keys(labels).filter(function (k) { return k !== c.lim; }).map(function (k) {
        return { html: labels[k], why: why[k] + (k === 'fuel' && c.lim === 'O2' && c.n0f < c.n0O ? raw : '') };
      }));
    }
    function finalState() {
      var c = scenario(false), what = P(['CO2', 'H2O', 'rest', 'CO2']), larger = Math.max(c.xf, c.xo), B = c.B;
      var restFuel = c.lim === 'O2', n0 = restFuel ? c.n0f : c.n0O, k = restFuel ? B.a : B.b;
      var label = { CO2: 'de dioxyde de carbone ' + m('\\mathrm{CO_2}') + ' formé', H2O: 'd’eau ' + m('\\mathrm{H_2O}') + ' formée', rest: (restFuel ? de(c.s.n) : 'de dioxygène') + ' restant (réactif en excès)' }[what];
      var ans, traps = [];
      if (what === 'CO2' || what === 'H2O') {
        var kk = what === 'CO2' ? B.c : B.d;
        ans = kk * c.xm;
        if (kk !== 1) traps.push({ value: c.xm, msg: 'L’équation donne ' + m(kk + '\\,\\mathrm{' + (what === 'CO2' ? 'CO_2' : 'H_2O') + '}') + ' : à l’état final, ' + m('n = ' + kk + 'x_{\\max}') + '.' });
        traps.push({ value: kk * larger, msg: 'Le bon avancement maximal est la <b>plus petite</b> valeur de ' + m('x') + ' : ' + m('x_{\\max} = ' + T(c.xm, 4)) + ' mol.' });
        var nLim = c.lim === 'fuel' ? c.n0f : c.n0O;
        traps.push({ value: kk * nLim, msg: 'On multiplie l’<b>avancement maximal</b> ' + m('x_{\\max} = ' + T(c.xm, 4)) + ' mol, pas la quantité initiale du réactif limitant.' });
      } else {
        ans = n0 - k * c.xm;
        if (k !== 1) traps.push({ value: n0 - c.xm, msg: 'À l’état final, il reste ' + m(T(n0, 4) + ' - ' + k + 'x_{\\max}') + ' : n’oublie pas le nombre stœchiométrique ' + k + '.' });
        traps.push({ value: k * c.xm, msg: 'Ça, c’est la quantité <b>consommée</b>. Il reste ce qu’il y avait au départ moins ce qui a réagi.' });
        traps.push({ value: n0, msg: 'Une partie a réagi : il reste ' + m(T(n0, 4) + ' - ' + (k === 1 ? '' : k) + 'x_{\\max}') + '.' });
        traps.push({ value: n0 - k * larger, msg: 'Le bon avancement maximal est la <b>plus petite</b> valeur de ' + m('x') + ' : ' + m('x_{\\max} = ' + T(c.xm, 4)) + ' mol.' });
      }
      return {
        type: 'État final', ask: ask('la quantité de matière', 'moles (mol)'), unit: 'mol', answer: ans, traps: traps,
        html: scenText(c) + '<p>Calcule la quantité de matière ' + label + ' à l’état final.</p>',
        solution: steps(xLines(c).concat([
          what === 'rest' ? 'Il reste ' + m((restFuel ? 'n(' + mr(c.s.f) + ')' : 'n(\\mathrm{O_2})') + ' = ' + T(n0, 4) + ' - ' + (k === 1 ? '' : k + ' \\times ') + T(c.xm, 4) + ' = ' + mol(ans)) + '.'
            : m('n(\\mathrm{' + (what === 'CO2' ? 'CO_2' : 'H_2O') + '}) = ' + ((what === 'CO2' ? B.c : B.d) === 1 ? '' : (what === 'CO2' ? B.c : B.d) + ' \\times ') + T(c.xm, 4) + ' = ' + mol(ans)) + '.'
        ])) + advTable(c.s.f, B, c.n0f, c.n0O, c.xm)
      };
    }

    /* ---- d'une masse de combustible aux produits (exercices 2.5, 3.6 à 3.8, 4.4 à 4.8), dioxygène en excès ---- */
    var MASS_FUELS = ['ethanol', 'propane', 'butane', 'pentane', 'octane', 'hentriacontane', 'methane'];
    function fromMass() {
      var s = SPECIES[P(MASS_FUELS)], f = s.f, B = balance(f), M = molar(f);
      var n = s === SPECIES.hentriacontane ? P([10, 20, 50]) / M : P([0.1, 0.2, 0.5, 1, 1.5, 2, 3]);
      var g = s === SPECIES.hentriacontane ? n * M : C.roundSig(n * M, 3);
      n = g / M;
      var xm = n / B.a, what = P(['nCO2', 'VCO2', 'mH2O', 'mCO2', 'nH2O']);
      var nC = B.c * xm, nH = B.d * xm;
      var vals = { nCO2: nC, nH2O: nH, VCO2: nC * VM, mH2O: nH * 18, mCO2: nC * 44 };
      var units = { nCO2: ['mol', 'moles (mol)'], nH2O: ['mol', 'moles (mol)'], VCO2: ['L', 'litres (L)'], mH2O: ['g', 'grammes (g)'], mCO2: ['g', 'grammes (g)'] };
      var words = {
        nCO2: 'la quantité de matière de dioxyde de carbone formée', nH2O: 'la quantité de matière d’eau formée',
        VCO2: 'le volume de dioxyde de carbone formé', mH2O: 'la masse d’eau formée', mCO2: 'la masse de dioxyde de carbone formée'
      };
      var ans = vals[what], prodK = /CO2/.test(what) ? B.c / B.a : B.d / B.a;
      var traps = [{ value: ans / prodK, msg: 'Le tableau d’avancement donne ' + (/CO2/.test(what) ? m(B.c + 'x_{\\max}') + ' de ' + m('\\mathrm{CO_2}') : m(B.d + 'x_{\\max}') + ' d’eau') + ' : n’oublie pas le nombre stœchiométrique.' }];
      traps.push({ value: ans * M, msg: 'Commence par convertir la masse en quantité de matière : ' + m('\\Qn = \\dfrac{\\Qm}{\\QM}') + '.' });
      if (what === 'VCO2') traps.push({ value: nC, msg: 'Ça, c’est la quantité de matière. Le volume vaut ' + m('\\QV = \\Qn \\times \\QVm') + '.' });
      if (what === 'mH2O' || what === 'mCO2') traps.push({ value: what === 'mH2O' ? nH : nC, msg: 'Ça, c’est la quantité de matière. La masse vaut ' + m('\\Qm = \\Qn \\times \\QM') + '.' });
      if (B.a > 1) traps.push({ value: ans * B.a, msg: 'L’équation commence par ' + m(B.a + '\\,' + mr(f)) + ' : ' + m('x_{\\max} = \\dfrac{\\Qn}{' + B.a + '}') + '.' });
      var last = {
        nCO2: null, nH2O: null,
        VCO2: m('\\QV = \\Qn \\times \\QVm = ' + T(nC, 4) + ' \\times 24 = ' + q('L', ans)) + '.',
        mH2O: m('\\QM(\\mathrm{H_2O}) = 18' + UM) + ', donc ' + m('\\Qm = \\Qn \\times \\QM = ' + T(nH, 4) + ' \\times 18 = ' + q('g', ans)) + '.',
        mCO2: m('\\QM(\\mathrm{CO_2}) = 44' + UM) + ', donc ' + m('\\Qm = \\Qn \\times \\QM = ' + T(nC, 4) + ' \\times 44 = ' + q('g', ans)) + '.'
      }[what];
      return {
        type: 'Des réactifs aux produits', ask: ask(words[what].replace(/ formée?$/, ''), units[what][1]), unit: units[what][0], answer: ans, traps: traps, ref: 'c-exces',
        html: '<p>On fait brûler ' + m('\\Qm = ' + q('g', g, 4)) + ' ' + de(s.n) + ' ' + m(mr(f)) + ' dans un excès de dioxygène. La combustion est complète :</p><p class="formula-line">' + m(eqTex(f, B)) + '</p><p>Calcule ' + words[what] + '.</p>' + data([DATA_M].concat(what === 'VCO2' ? [DATA_VM] : [])),
        solution: steps([
          molarLine(f) + ', donc ' + m('\\Qn = \\dfrac{\\Qm}{\\QM} = \\dfrac{' + T(g, 4) + '}{' + T(M) + '} = ' + mol(n, 4)) + '.',
          'Le dioxygène est en excès : ' + le(s.n) + ' est le réactif limitant, ' + m('x_{\\max} = ' + (B.a === 1 ? '' : '\\dfrac{' + T(n, 4) + '}{' + B.a + '} = ') + mol(xm, 4)) + '.',
          /CO2/.test(what) ? m('n(\\mathrm{CO_2}) = ' + (B.c === 1 ? '' : B.c + ' \\times ') + T(xm, 4) + ' = ' + mol(nC, 4)) + '.' : m('n(\\mathrm{H_2O}) = ' + (B.d === 1 ? '' : B.d + ' \\times ') + T(xm, 4) + ' = ' + mol(nH, 4)) + '.',
          last
        ])
      };
    }

    /* ---- combustion incomplète (exercice 4.10, cours 1 III.3) ---- */
    function incomplete() {
      if (rng() < 0.25) {
        var askCO = rng() < 0.5;
        return {
          type: 'Combustion incomplète', ask: 'Donne un nombre entier.', unit: '', answer: askCO ? 2 : 6,
          html: '<p>Lors d’une combustion incomplète du méthane, il se forme de l’eau, du dioxyde de carbone, du carbone et du monoxyde de carbone :</p><p class="formula-line">' +
            m('4\\,\\mathrm{CH_4} + ' + (askCO ? '6' : '\\square') + '\\,\\mathrm{O_2} \\longrightarrow 8\\,\\mathrm{H_2O} + \\mathrm{CO_2} + \\mathrm{C} + ' + (askCO ? '\\square' : '2') + '\\,\\mathrm{CO}') + '</p><p>Quel nombre faut-il écrire à la place du carré ?</p>',
          traps: askCO ? [{ value: 4, msg: 'Compte les atomes O : à gauche ' + m('6 \\times 2 = 12') + ' ; à droite ' + m('8 + 2 = 10') + ' sans le CO. Il manque 2 atomes O, et chaque CO en apporte un.' }, { value: 1, msg: 'Vérifie les atomes C : ' + m('4 = 1 + 1 + \\square') + '.' }]
            : [{ value: 12, msg: 'Ça, c’est le nombre d’<b>atomes</b> O. Chaque ' + m('\\mathrm{O_2}') + ' en apporte 2 : divise par 2.' }, { value: 8, msg: 'C’est le nombre de molécules ' + m('\\mathrm{O_2}') + ' pour une combustion complète de 4 ' + m('\\mathrm{CH_4}') + '. Ici une partie du carbone ne s’oxyde pas.' }],
          solution: steps([
            'Atomes C : ' + m('4 = 1 + 1 + 2') + ' ; atomes H : ' + m('4 \\times 4 = 16 = 8 \\times 2') + '.',
            'Atomes O à droite : ' + m('8 + 2 + 2 = 12') + ', donc ' + m('12 / 2 = 6\\ \\mathrm{O_2}') + '.',
            m('4\\,\\mathrm{CH_4} + 6\\,\\mathrm{O_2} \\longrightarrow 8\\,\\mathrm{H_2O} + \\mathrm{CO_2} + \\mathrm{C} + 2\\,\\mathrm{CO}') + '.'
          ])
        };
      }
      var n = P([3, 5, 7, 9, 31]), s = alkane(n), b = (n + 3) / 2;
      return {
        type: 'Combustion incomplète', ask: 'Donne un nombre entier.', unit: '', answer: b,
        html: '<p>Le dioxygène manque : ' + le(s.n) + ' ' + m(mr(s.f)) + ' brûle en formant ' + (n - 1) + ' fois plus de carbone C que de dioxyde de carbone, et pas de monoxyde de carbone :</p><p class="formula-line">' +
          m(mr(s.f) + ' + \\square\\,\\mathrm{O_2} \\longrightarrow ' + (n - 1) + '\\,\\mathrm{C} + \\mathrm{CO_2} + ' + (n + 1) + '\\,\\mathrm{H_2O}') + '</p><p>Quel est le nombre stœchiométrique du dioxygène ?</p>',
        traps: [
          { value: (3 * n + 1) / 2, msg: 'Ça, c’est la combustion <b>complète</b> (' + n + ' ' + m('\\mathrm{CO_2}') + '). Ici, seul un atome C sort sous forme de ' + m('\\mathrm{CO_2}') + ' : il faut beaucoup moins de dioxygène.' },
          { value: n + 3, msg: 'Ça, c’est le nombre d’<b>atomes</b> O. Chaque ' + m('\\mathrm{O_2}') + ' en apporte 2 : divise par 2.' },
          { value: (n + 2) / 2, msg: 'La molécule ' + m('\\mathrm{CO_2}') + ' contient <b>2</b> atomes O.' }
        ],
        solution: steps([
          'Atomes C : ' + m(n + ' = ' + (n - 1) + ' + 1') + ' ; atomes H : ' + m((2 * n + 2) + ' = ' + (n + 1) + ' \\times 2') + '.',
          'Atomes O à droite : ' + m('2 + ' + (n + 1) + ' = ' + (n + 3)) + ', apportés par ' + m('\\dfrac{' + (n + 3) + '}{2} = ' + b) + ' molécules ' + m('\\mathrm{O_2}') + '.',
          m(mr(s.f) + ' + ' + b + '\\,\\mathrm{O_2} \\longrightarrow ' + (n - 1) + '\\,\\mathrm{C} + \\mathrm{CO_2} + ' + (n + 1) + '\\,\\mathrm{H_2O}') + '.'
        ])
      };
    }

    /* ---- QCM du cours ---- */
    var CONCEPTS = [
      function () { return mcq({ type: 'Hydrocarbures', ref: 'c-hydrocarbures', html: '<p>Les molécules d’un hydrocarbure ne contiennent que :</p>', solution: '<p>Des atomes de <b>carbone</b> et d’<b>hydrogène</b> (d’où le nom : hydro-carbure).</p>' },
        'des atomes de carbone et d’hydrogène', [{ html: 'des atomes de carbone, d’hydrogène et d’oxygène', why: 'Avec de l’oxygène, ce n’est plus un hydrocarbure (par exemple un alcool).' }, { html: 'des atomes d’hydrogène et d’oxygène', why: 'Il n’y a pas de carbone : c’est par exemple l’eau.' }, { html: 'des liaisons doubles', why: 'Un alcane, hydrocarbure lui aussi, n’a que des liaisons simples.' }]); },
      function () { return mcq({ type: 'Alcanes et alcènes', ref: 'c-hydrocarbures', html: '<p>Un alcane est un hydrocarbure qui comporte :</p>', solution: '<p>Seulement des <b>liaisons simples</b>. Sa formule brute générale est ' + m('\\mathrm{C_nH_{2n+2}}') + '.</p>' },
        'seulement des liaisons simples', [{ html: 'au moins une liaison double', why: 'Une liaison double C=C, c’est un <b>alcène</b> (' + m('\\mathrm{C_nH_{2n}}') + ').' }, { html: 'un groupe hydroxyle OH', why: 'Le groupe OH caractérise un <b>alcool</b>, et un hydrocarbure n’a pas d’oxygène.' }]); },
      function () { return mcq({ type: 'Alcools', ref: 'c-alcools', html: '<p>Une molécule d’alcool possède :</p>', solution: '<p>Un <b>groupe hydroxyle OH</b> porté par un atome de carbone qui n’est lié à aucun autre groupe caractéristique ni engagé dans une double liaison.</p>' },
        'un groupe hydroxyle OH porté par un atome de carbone', [{ html: 'une liaison double C=C', why: 'Une liaison double C=C caractérise un alcène.' }, { html: 'seulement des atomes C et H', why: 'Seulement C et H : c’est un hydrocarbure. Un alcool contient un atome O.' }, 'un atome d’azote']); },
      function () { return mcq({ type: 'Formule semi-développée', ref: 'c-alcools', html: '<p>Quelle est la formule semi-développée de l’éthanol ' + m('\\mathrm{C_2H_6O}') + ' ?</p>', solution: '<p>' + m('\\mathrm{CH_3' + BOND + 'CH_2' + BOND + 'OH}') + ' : deux carbones, et le groupe OH porté par un carbone.</p>' },
        m('\\mathrm{CH_3' + BOND + 'CH_2' + BOND + 'OH}'), [{ html: m('\\mathrm{CH_3' + BOND + 'O' + BOND + 'CH_3}'), why: 'Même formule brute ' + m('\\mathrm{C_2H_6O}') + ', mais l’atome O est entre deux carbones : pas de groupe OH, ce n’est pas un alcool.' }, { html: m('\\mathrm{CH_3' + BOND + 'CH_3}'), why: 'C’est l’éthane ' + m('\\mathrm{C_2H_6}') + ' : il manque l’atome d’oxygène.' }, { html: m('\\mathrm{CH_2{=}CH' + BOND + 'OH}'), why: 'Il n’y a que 4 atomes H, et le carbone qui porte OH est engagé dans une double liaison : ce n’est pas un alcool.' }]); },
      function () { return mcq({ type: 'Combustion complète', ref: 'c-complete', html: '<p>La combustion complète d’un hydrocarbure ou d’un alcool produit :</p>', solution: '<p>Du <b>dioxyde de carbone</b> ' + m('\\mathrm{CO_2}') + ' et de l’<b>eau</b> ' + m('\\mathrm{H_2O}') + '.</p>' },
        'du dioxyde de carbone et de l’eau', [{ html: 'du monoxyde de carbone et du carbone', why: 'Ces produits apparaissent quand le dioxygène manque : combustion <b>incomplète</b>.' }, { html: 'du dihydrogène et du dioxygène', why: 'Le dioxygène est un réactif (le comburant), pas un produit.' }, { html: 'seulement de l’eau', why: 'Les atomes C du combustible se retrouvent dans le dioxyde de carbone.' }]); },
      function () { return mcq({ type: 'Combustion incomplète', ref: 'c-incomplete', html: '<p>Si le dioxygène est en quantité insuffisante, la combustion produit, en plus du dioxyde de carbone et de l’eau :</p>', solution: '<p>Du <b>monoxyde de carbone</b> CO (toxique) et du <b>carbone</b> C (les suies).</p>' },
        'du monoxyde de carbone et du carbone', [{ html: 'du dihydrogène', why: 'Les atomes H se retrouvent toujours dans l’eau.' }, { html: 'encore plus de dioxyde de carbone', why: 'Le manque de dioxygène donne au contraire des produits moins oxygénés : CO et C.' }, 'du dioxygène']); },
      function () { return mcq({ type: 'Ajuster une équation', ref: 'c-ajuster', html: '<p>Ajuster une équation de réaction, c’est :</p>', solution: '<p>Choisir les <b>nombres stœchiométriques</b> pour que chaque élément (C, H, O…) ait autant d’atomes du côté des réactifs que du côté des produits.</p>' },
        'choisir les nombres devant les formules pour conserver chaque élément', [{ html: 'modifier les indices des formules', why: 'On ne touche jamais aux formules : ' + m('\\mathrm{C_3H_8}') + ' reste ' + m('\\mathrm{C_3H_8}') + '. On ne change que les nombres placés devant.' }, { html: 'avoir autant de molécules à gauche qu’à droite', why: 'Le nombre de molécules peut changer : ' + m('\\mathrm{C_3H_8} + 5\\,\\mathrm{O_2} \\longrightarrow 3\\,\\mathrm{CO_2} + 4\\,\\mathrm{H_2O}') + ' donne 6 molécules à gauche et 7 à droite.' }]); },
      function () { return mcq({ type: 'Réactif limitant', ref: 'c-avancement', html: '<p>Le réactif limitant est :</p>', solution: '<p>Le réactif <b>entièrement consommé</b> en premier : sa disparition arrête la transformation.</p>' },
        'le réactif entièrement consommé en premier', [{ html: 'le réactif introduit en plus petite quantité', why: 'Pas toujours : il faut tenir compte des nombres stœchiométriques. Avec 5 mol de ' + m('\\mathrm{CH_4}') + ' et 9 mol de ' + m('\\mathrm{O_2}') + ', c’est ' + m('\\mathrm{O_2}') + ' qui manque (' + m('9 / 2 = 4{,}5 < 5') + ').' }, { html: 'le réactif en excès', why: 'Le réactif en excès est celui qui <b>reste</b> à la fin.' }, { html: 'le produit formé en plus grande quantité', why: 'Le réactif limitant est un réactif, pas un produit.' }]); },
      function () { return mcq({ type: 'Avancement', ref: 'c-avancement', html: '<p>L’avancement ' + m('x') + ' d’une transformation s’exprime en :</p>', solution: '<p>En <b>moles</b> (mol), comme les quantités de matière du tableau.</p>' },
        'moles (mol)', [{ html: 'grammes (g)', why: 'Les cases du tableau d’avancement sont des quantités de matière, en mol.' }, { html: 'litres (L)', why: 'Un volume de gaz se calcule ensuite avec ' + m('\\QV = \\Qn \\times \\QVm') + ', mais l’avancement est en mol.' }, { html: m('\\mathrm{g\\cdot mol^{-1}}'), why: 'C’est l’unité d’une masse molaire.' }]); },
      function () { return mcq({ type: 'Avancement', ref: 'c-avancement', html: '<p>Une transformation chimique s’arrête lorsque :</p>', solution: '<p>Un réactif a <b>complètement disparu</b> : c’est le réactif limitant.</p>' },
        'un réactif a complètement disparu', [{ html: 'tous les réactifs ont disparu', why: 'Seulement dans un mélange stœchiométrique. En général, il reste le réactif en excès.' }, { html: 'les produits sont en même quantité que les réactifs', why: 'Aucune règle de ce genre : on arrête quand un réactif atteint 0 mol.' }]); },
      function () { return mcq({ type: 'Volume molaire', ref: 'c-n-volume', html: '<p>Le volume molaire ' + m('\\QVm = 24\\ \\mathrm{L\\cdot mol^{-1}}') + ' signifie que :</p>', solution: '<p>Une mole de <b>n’importe quel gaz</b> occupe 24 L (à 20 °C et sous la pression atmosphérique).</p>' },
        'une mole de n’importe quel gaz occupe 24 L', [{ html: 'une mole de dioxygène a une masse de 24 g', why: 'Ça, ce serait une masse molaire (en g/mol). Celle du dioxygène vaut 32 g/mol.' }, { html: 'seul le dioxygène occupe 24 L par mole', why: 'Le volume molaire est le même pour tous les gaz, dans les mêmes conditions.' }, { html: 'une mole d’eau liquide occupe 24 L', why: 'Le volume molaire ne concerne que les <b>gaz</b> : une mole d’eau liquide occupe 18 mL.' }]); },
      function () { return mcq({ type: 'Alcools', ref: 'c-alcools', html: '<p>La formule brute générale d’un alcool est :</p>', solution: '<p>' + m('\\mathrm{C_nH_{2n+1}OH}') + ' : une chaîne d’alcane dont un H est remplacé par OH.</p>' },
        m('\\mathrm{C_nH_{2n+1}OH}'), [{ html: m('\\mathrm{C_nH_{2n+2}}'), why: 'C’est la formule d’un <b>alcane</b>.' }, { html: m('\\mathrm{C_nH_{2n}}'), why: 'C’est la formule d’un <b>alcène</b>.' }, { html: m('\\mathrm{C_nH_{2n}OH}'), why: 'Il manque un atome H : ' + m('\\mathrm{C_nH_{2n+1}OH}') + ' (l’éthanol ' + m('\\mathrm{C_2H_5OH}') + ').' }]); }
    ];
    function concept() { return P(CONCEPTS)(); }

    /* ---- tirage ---- */
    var RAW = {
      family: family, name: name, formulaH: formulaH, molarMass: molarMass, nFromMass: nFromMass, nFromVolume: nFromVolume,
      massOrVolume: massOrVolume, coefficient: coefficient, equation: equation, xmax: xmax, limiting: limiting,
      finalState: finalState, fromMass: fromMass, incomplete: incomplete, concept: concept
    };
    // carte du cours à revoir pour chaque type de question (lien « À revoir » après l'évaluation)
    var REF = {
      family: 'c-hydrocarbures', name: 'c-noms', formulaH: 'c-hydrocarbures', molarMass: 'c-masse-molaire', nFromMass: 'c-n-masse',
      nFromVolume: 'c-n-volume', massOrVolume: 'c-n-masse', coefficient: 'c-ajuster', equation: 'c-ajuster', xmax: 'c-xmax',
      limiting: 'c-avancement', finalState: 'c-xmax', fromMass: 'c-exces', incomplete: 'c-incomplete', concept: 'c-avancement'
    };
    /**
     * Type, carte du cours à revoir, et pièges exploitables : une erreur fréquente à moins de 3 % de la
     * bonne réponse se confondrait avec un simple arrondi, on ne la signale pas.
     */
    function tag(kind, o) {
      o.kind = kind; o.ref = o.ref || REF[kind];
      if (o.traps) o.traps = o.traps.filter(function (t) { return isFinite(t.value) && Math.abs(t.value - o.answer) > 0.03 * Math.abs(o.answer) + (o.tol || 0); });
      return o;
    }
    var KINDS = {};
    Object.keys(RAW).forEach(function (k) { KINDS[k] = function () { return tag(k, RAW[k]()); }; });
    var WEIGHTS = {
      family: 2, name: 2, formulaH: 2, molarMass: 3, nFromMass: 3, nFromVolume: 2, massOrVolume: 2, coefficient: 3,
      equation: 2, xmax: 3, limiting: 2, finalState: 3, fromMass: 3, incomplete: 1, concept: 2
    };
    var last = null;
    function training() {
      var keys = Object.keys(WEIGHTS).filter(function (k) { return k !== last; });
      var total = keys.reduce(function (s, k) { return s + WEIGHTS[k]; }, 0), r = rng() * total, pick = keys[0];
      for (var i = 0; i < keys.length; i++) { r -= WEIGHTS[keys[i]]; if (r < 0) { pick = keys[i]; break; } }
      last = pick;
      return KINDS[pick]();
    }
    /** Copie d'évaluation : 8 questions, 20 points. */
    function exam() {
      function pts(kind, p) { var o = KINDS[kind](); o.points = p; return o; }
      return [
        pts(P(['family', 'name']), 2), pts(P(['equation', 'concept']), 2), pts('coefficient', 2),
        pts(P(['molarMass', 'nFromMass']), 3), pts(P(['nFromVolume', 'massOrVolume']), 2),
        pts('xmax', 3), pts(P(['finalState', 'limiting']), 3), pts('fromMass', 3)
      ];
    }
    return { training: training, exam: exam, kinds: KINDS };
  }

  return {
    make: make, SPECIES: SPECIES, MA: MA, VM: VM, EXAM_QUESTIONS: 8,
    molar: molar, balance: balance, atoms: atoms, ftex: ftex, fu: fu, alkane: alkane, alkaneName: alkaneName, advTable: advTable
  };
});
