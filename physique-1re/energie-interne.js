/* ==========================================================================
   Chapitre 2 — Énergie interne : banque de questions paramétrées.
   Inspirée des fiches d'exercices du chapitre (conversions °C ↔ K, énergie pour
   chauffer ou refroidir, signe de Q, refroidissement de la vapeur d'une centrale,
   calorimètre : capacité thermique d'un métal et énergie massique de fusion) et
   du cours (agitation thermique, transferts thermiques, ΔU = m·c·ΔT, Q = m·L).

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

  /* ---------- données du cours et des fiches ---------- */
  var C_EAU = 4180, C_GLACE = 2100, C_VAPEUR = 1850; // J·kg⁻¹·°C⁻¹
  var L_FUS_EAU = 334e3, L_VAP_EAU = 2260e3;        // J·kg⁻¹
  /** Capacités thermiques massiques (cours, remarques 2 et 3 ; fiches d'exercices). */
  var MATERIALS = {
    eau: { n: 'eau', c: 4180 }, lait: { n: 'lait', c: 3800 }, ethanol: { n: 'éthanol', c: 2424 },
    aluminium: { n: 'aluminium', c: 894.5 }, zinc: { n: 'zinc', c: 389 }, plomb: { n: 'plomb', c: 129 },
    mercure: { n: 'mercure', c: 138 }, cuivre: { n: 'cuivre', c: 385 }, fer: { n: 'fer', c: 444 }
  };
  /** Changements d'état : nom, état de départ, état d'arrivée, énergie reçue (+1) ou cédée (−1). */
  var STATE_CHANGES = [
    { n: 'fusion', from: 'solide', to: 'liquide', s: 1 }, { n: 'solidification', from: 'liquide', to: 'solide', s: -1 },
    { n: 'vaporisation', from: 'liquide', to: 'gazeux', s: 1 }, { n: 'liquéfaction', from: 'gazeux', to: 'liquide', s: -1 },
    { n: 'sublimation', from: 'solide', to: 'gazeux', s: 1 }, { n: 'condensation', from: 'gazeux', to: 'solide', s: -1 }
  ];
  var MODES = {
    conduction: 'l’agitation thermique se transmet de proche en proche <b>sans déplacement de matière</b> (seul mode de transfert dans les solides)',
    convection: 'l’agitation thermique se transmet <b>avec déplacement de matière</b>, au sein d’un liquide ou d’un gaz',
    rayonnement: 'un corps chaud émet une <b>onde électromagnétique</b>, qui se propage même dans le vide'
  };
  var TRANSFERS = [
    { n: 'La poignée métallique d’une casserole posée sur le feu devient chaude.', m: 'conduction' },
    { n: 'Une cuillère en métal plongée dans un thé chaud chauffe jusqu’au bout du manche.', m: 'conduction' },
    { n: 'L’énergie thermique traverse le mur en béton d’une maison, de l’intérieur vers l’extérieur.', m: 'conduction' },
    { n: 'L’air chauffé par un radiateur monte et réchauffe toute la pièce.', m: 'convection' },
    { n: 'Dans une casserole, l’eau chaude du fond monte et l’eau froide descend.', m: 'convection' },
    { n: 'Le vent froid qui souffle sur une façade la refroidit.', m: 'convection' },
    { n: 'Le Soleil chauffe la Terre à travers le vide de l’espace.', m: 'rayonnement' },
    { n: 'On se réchauffe les mains à distance devant un feu de cheminée.', m: 'rayonnement' },
    { n: 'Une caméra thermique détecte à distance la chaleur émise par un corps humain.', m: 'rayonnement' }
  ];
  /** Situations dont le signe de Q est connu (+1 : le système reçoit de l'énergie). */
  var SIGNS = [
    { n: 'On chauffe de l’eau dans une bouilloire.', s: 1, sys: 'l’eau' },
    { n: 'Un morceau de plomb est amené de 25 °C à 230 °C.', s: 1, sys: 'le plomb' },
    { n: 'Un glaçon fond dans un verre, à 0 °C.', s: 1, sys: 'le glaçon', phase: true },
    { n: 'De l’eau bout et se vaporise dans une casserole, à 100 °C.', s: 1, sys: 'l’eau', phase: true },
    { n: 'Du lait chauffé à 70 °C est refroidi à 37 °C dans un réfrigérateur.', s: -1, sys: 'le lait' },
    { n: 'Un café chaud refroidit sur une table.', s: -1, sys: 'le café' },
    { n: 'De la vapeur d’eau se liquéfie sur une vitre froide.', s: -1, sys: 'la vapeur d’eau', phase: true },
    { n: 'L’eau d’un bac à glaçons gèle dans le congélateur, à 0 °C.', s: -1, sys: 'l’eau', phase: true }
  ];

  /** Solides fondus au calorimètre (exercice 5) : énergie massique et température de fusion. */
  var FUSIBLE = [
    { n: 'heptadécane', L: 213e3, Tf: 22, m: [100, 120, 150] },
    { n: 'gallium', L: 80.1e3, Tf: 29.8, m: [150, 200, 250] },
    { n: 'acide stéarique', L: 199e3, Tf: 69, m: [50, 80, 100] }
  ];

  /* ---------- outils d'écriture ---------- */
  var DEG = '\\ {}^{\\circ}\\mathrm{C}';
  var UC = '\\ \\mathrm{J\\cdot kg^{-1}\\cdot {}^{\\circ}C^{-1}}';
  var UNIT_C = 'J·kg⁻¹·°C⁻¹';
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function m(t) { return '\\(' + t + '\\)'; }
  function q(unitTex, x, sig) { return T(x, sig) + '\\ \\mathrm{' + unitTex + '}'; }
  function deg(x) { return T(x, 4) + DEG; }
  function steps(list) { return '<ol class="steps-list">' + list.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>'; }
  function ask(what, unit) { return 'Donne ' + what + ' en ' + unit + ', à 3 chiffres significatifs.'; }
  function data(list) { return '<p class="note">Données : ' + list.join(' ; ') + '.</p>'; }
  function cData(mat) { return m('c_{\\text{' + mat.n + '}} = ' + T(mat.c, 4) + UC); }
  /** Masse affichée : en g (avec conversion à faire) ou en kg. */
  function mass(kg, grams) { return grams ? q('g', kg * 1000, 4) : q('kg', kg, 4); }
  function massStep(kg, grams) { return grams ? 'Masse en kilogrammes : ' + m('\\Qm = ' + q('g', kg * 1000, 4) + ' = ' + q('kg', kg, 4)) + '.' : null; }
  function clean(list) { return list.filter(Boolean); }
  /** Articles avec élision : « d’aluminium », « de zinc », « de l’aluminium », « l’heptadécane », « à l’heptadécane ». */
  function vowel(n) { return /^[aeéèiouyh]/i.test(n); }
  function de(n) { return (vowel(n) ? 'd’' : 'de ') + n; }
  function du(n) { return (vowel(n) ? 'de l’' : 'du ') + n; }
  function le(n) { return (vowel(n) ? 'l’' : 'le ') + n; }
  function au(n) { return (vowel(n) ? 'à l’' : 'au ') + n; }

  function make(rng) {
    rng = rng || Math.random;
    function R(a, b) { return a + Math.floor(rng() * (b - a + 1)); }
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
    /** Unité de la réponse : J, ou kJ pour les grandes énergies (une fois sur deux). */
    function energyUnit(x) { return Math.abs(x) >= 1e5 && rng() < 0.5 ? { u: 'kJ', f: 1e-3, word: 'kilojoules (kJ)' } : { u: 'J', f: 1, word: 'joules (J)' }; }

    /* ---- conversions °C ↔ K (exercice 1) ---- */
    function conversion() {
      if (rng() < 0.5) {
        var tc = P([-250, -196, -40, -18, -10, 15, 25, 37, 100, 250, 660, 1500, 5000]), k = tc + 273;
        var traps = [{ value: tc - 273, msg: 'Pour passer des °C aux kelvins, on <b>ajoute</b> 273 : ' + m('\\QT(\\mathrm{K}) = \\QT({}^{\\circ}\\mathrm{C}) + 273') + '.' }];
        if (tc < 0) traps.push({ value: 273 - tc, msg: 'Attention au signe : ' + m(T(tc, 5) + ' + 273 = ' + T(k, 5)) + ' (on ajoute 273 à un nombre <b>négatif</b>).' });
        return {
          type: 'Conversion °C → K', ask: 'Donne la température en kelvins (K), à l’unité près.', unit: 'K', answer: k, tol: 0.6, sig: 5, traps: traps,
          html: '<p>Convertis la température ' + m('\\QT = ' + deg(tc)) + ' en kelvins.</p>',
          solution: steps([
            'Relation du cours : ' + m('\\QT(\\mathrm{K}) = \\QT({}^{\\circ}\\mathrm{C}) + 273') + '.',
            m('\\QT = ' + T(tc, 5) + ' + 273 = ' + q('K', k, 5)) + '.'
          ])
        };
      }
      var tk = P([1, 4, 77, 100, 200, 253, 293, 310, 373, 450, 600, 1000, 5000, 5800]), c = tk - 273;
      var traps2 = [{ value: tk + 273, msg: 'Pour passer des kelvins aux °C, on <b>retire</b> 273 : ' + m('\\QT({}^{\\circ}\\mathrm{C}) = \\QT(\\mathrm{K}) - 273') + '.' }];
      if (c < 0) traps2.push({ value: -c, msg: 'Le signe compte : ' + m(T(tk, 5) + ' - 273 = ' + T(c, 5)) + '. Cette température est en dessous de 0 °C.' });
      return {
        type: 'Conversion K → °C', ask: 'Donne la température en degrés Celsius (°C), à l’unité près.', unit: '°C', answer: c, tol: 0.6, sig: 5, traps: traps2,
        html: '<p>Convertis la température ' + m('\\QT = ' + q('K', tk, 5)) + ' en degrés Celsius.</p>',
        solution: steps([
          'Relation du cours : ' + m('\\QT({}^{\\circ}\\mathrm{C}) = \\QT(\\mathrm{K}) - 273') + '.',
          m('\\QT = ' + T(tk, 5) + ' - 273 = ' + deg(c)) + '.'
        ])
      };
    }

    /* ---- ΔU = m·c·(T_final − T_initial) : échauffement (exercice 2) ---- */
    var HEAT = [
      function () { var V = P([0.5, 1, 1.2, 1.5, 1.7]); return { mat: MATERIALS.eau, kg: V, text: 'Une bouilloire chauffe ' + m(T(V) + '\\ \\mathrm{L}') + ' d’eau (' + m('\\Qm = ' + q('kg', V)) + ')', Ti: P([12, 15, 18, 20]), Tf: 100, who: 'l’eau' }; },
      function () { var V = P([2, 3, 5, 50, 150, 200]); return { mat: MATERIALS.eau, kg: V, text: 'On chauffe ' + m(T(V) + '\\ \\mathrm{L}') + ' d’eau (' + m('\\Qm = ' + q('kg', V)) + ')', Ti: P([10, 15, 20]), Tf: P([60, 65, 70, 90]), who: 'l’eau' }; },
      function () { var kg = P([2.5, 12, 45, 120]); return { mat: MATERIALS.plomb, kg: kg, text: 'Un morceau de plomb de masse ' + m('\\Qm = ' + q('kg', kg)) + ' est chauffé', Ti: P([20, 25]), Tf: P([180, 230, 300]), who: 'le plomb' }; },
      function () { var kg = P([0.25, 0.4, 0.85]); return { mat: MATERIALS.aluminium, kg: kg, grams: true, text: 'Une poêle en aluminium de masse ' + m('\\Qm = ' + mass(kg, true)) + ' est chauffée', Ti: P([20, 22]), Tf: P([150, 180, 220]), who: 'la poêle' }; },
      function () { var kg = P([0.3, 0.5, 0.75]); return { mat: MATERIALS.zinc, kg: kg, grams: true, text: 'Une plaque de zinc de masse ' + m('\\Qm = ' + mass(kg, true)) + ' est chauffée', Ti: P([18, 20]), Tf: P([80, 120, 150]), who: 'le zinc' }; },
      function () { var kg = P([0.2, 0.25, 0.5]); return { mat: MATERIALS.ethanol, kg: kg, grams: true, text: 'On chauffe ' + m(mass(kg, true)) + ' d’éthanol', Ti: P([15, 20]), Tf: P([40, 60]), who: 'l’éthanol' }; },
      function () { var kg = P([0.2, 0.25, 0.309]); return { mat: MATERIALS.lait, kg: kg, grams: true, text: 'On réchauffe un biberon contenant ' + m(mass(kg, true)) + ' de lait', Ti: P([4, 5]), Tf: P([37, 40]), who: 'le lait' }; }
    ];
    var COOL = [
      function () { var kg = P([0.25, 0.3, 0.309]); return { mat: MATERIALS.lait, kg: kg, grams: true, text: 'Un bol de ' + m(mass(kg, true)) + ' de lait, chauffé de manière excessive, est refroidi dans un réfrigérateur', Ti: P([60, 65, 70]), Tf: P([37, 40]), who: 'le lait' }; },
      function () { var kg = P([0.2, 0.25, 0.33]); return { mat: MATERIALS.eau, kg: kg, grams: true, text: 'Un thé (assimilé à de l’eau) de masse ' + m('\\Qm = ' + mass(kg, true)) + ' refroidit', Ti: P([80, 85, 90]), Tf: P([45, 50, 60]), who: 'le thé' }; },
      function () { var V = P([8, 12, 20]); return { mat: MATERIALS.eau, kg: V, text: 'Les ' + m(T(V) + '\\ \\mathrm{L}') + ' d’eau (' + m('\\Qm = ' + q('kg', V)) + ') d’un radiateur se refroidissent', Ti: P([65, 70, 75]), Tf: P([35, 40, 45]), who: 'l’eau' }; },
      function () { var kg = P([0.045, 0.12, 0.5]); return { mat: MATERIALS.plomb, kg: kg, grams: true, text: 'Une pièce de plomb de masse ' + m('\\Qm = ' + mass(kg, true)) + ' refroidit', Ti: P([150, 180, 200]), Tf: P([20, 25]), who: 'le plomb' }; },
      function () { var kg = P([0.6, 0.9, 1.2]); return { mat: MATERIALS.aluminium, kg: kg, text: 'Un plat en aluminium de masse ' + m('\\Qm = ' + q('kg', kg)) + ', sorti du four, refroidit', Ti: P([180, 200, 220]), Tf: P([25, 30]), who: 'le plat' }; }
    ];
    function deltaU(cool) {
      var s = P(cool ? COOL : HEAT)(), c = s.mat.c, dT = s.Tf - s.Ti, ans = s.kg * c * dT, U = energyUnit(ans);
      var traps = [
        { value: -ans * U.f, msg: cool
          ? 'Le signe compte : ' + s.who + ' <b>refroidit</b>, il perd de l’énergie, donc ' + m('\\QQ < 0') + '. ' + m('\\QdT = \\QTf - \\QTi') + ' est négatif ici.'
          : m('\\QdT = \\QTf - \\QTi') + ', dans cet ordre : ' + s.who + ' chauffe, il gagne de l’énergie, ' + m('\\QU > 0') + '.' },
        { value: s.kg * c * (s.Tf + 273 - s.Ti) * U.f, msg: 'Une <b>différence</b> de températures est la même en °C et en K : ne convertis pas une seule des deux températures.' },
        { value: s.kg * c * s.Tf * U.f, msg: 'Il faut la <b>variation</b> de température ' + m('\\QdT = \\QTf - \\QTi') + ', pas la température finale seule.' }
      ];
      if (s.grams) traps.push({ value: ans * 1000 * U.f, msg: 'La masse doit être en <b>kilogrammes</b> : ' + m(T(s.kg * 1000, 4) + '\\ \\mathrm{g} = ' + T(s.kg, 4) + '\\ \\mathrm{kg}') + '.' });
      if (U.u === 'kJ') traps.push({ value: ans, msg: 'Ce résultat est en <b>joules</b>. La question demande des kJ : divise par 1 000.' });
      var what = cool ? 'l’énergie Q échangée, avec son signe,' : 'la variation d’énergie interne ΔU';
      return {
        type: cool ? 'Refroidissement : signe de Q' : 'Échauffement : ΔU = m·c·ΔT',
        ask: ask(what, U.word), unit: U.u, answer: ans * U.f, traps: traps,
        html: '<p>' + s.text + ' de ' + m(deg(s.Ti)) + ' à ' + m(deg(s.Tf)) + '.</p><p>' + (cool ? 'Calcule l’énergie ' + m('\\QQ') + ' échangée lors de ce transfert thermique.' : 'Calcule la variation de son énergie interne ' + m('\\QU') + '.') + '</p>' + data([cData(s.mat)]),
        solution: steps(clean([
          massStep(s.kg, s.grams),
          'Variation de température : ' + m('\\QdT = \\QTf - \\QTi = ' + T(s.Tf, 4) + ' - ' + T(s.Ti, 4) + ' = ' + deg(dT)) + '.',
          m((cool ? '\\QQ' : '\\QU') + ' = \\Qm \\times \\Qc \\times \\QdT = ' + T(s.kg, 4) + ' \\times ' + T(c, 4) + ' \\times (' + T(dT, 4) + ') = ' + q('J', ans)) + (U.u === 'kJ' ? ' ' + m('= ' + q('kJ', ans / 1000)) : '') + '.',
          cool ? m('\\QQ < 0') + ' : ' + s.who + ' cède de l’énergie au milieu extérieur (son énergie interne diminue).' : m('\\QU > 0') + ' : ' + s.who + ' gagne de l’énergie.'
        ]))
      };
    }
    function heat() { return deltaU(false); }
    function cool() { return deltaU(true); }

    /* ---- signe de Q (exercice 2.2 et cours, remarque 1) ---- */
    function sign() {
      var s = P(SIGNS), plus = 'Q &gt; 0 : le système reçoit de l’énergie', minus = 'Q &lt; 0 : le système cède de l’énergie', zero = 'Q = 0 : il n’y a pas d’échange d’énergie';
      var wrongSign = s.phase
        ? 'Même à température constante, un changement d’état demande un échange d’énergie : ' + (s.s > 0 ? 'il faut <b>fournir</b> de l’énergie pour rompre les liaisons entre particules.' : 'des liaisons se forment et le corps <b>libère</b> de l’énergie.')
        : 'Regarde le sens de la variation de température : ' + (s.s > 0 ? m('\\QTf > \\QTi') + ', donc ' + m('\\QQ > 0') + '.' : m('\\QTf < \\QTi') + ', donc ' + m('\\QQ < 0') + '.');
      var o = {
        type: 'Signe de Q', ask: 'Choisis la bonne réponse.',
        html: '<p>' + s.n + '</p><p>Le système étudié est <b>' + s.sys + '</b>. Quel est le signe de l’énergie ' + m('\\QQ') + ' qu’il échange ?</p>',
        solution: '<p>' + (s.s > 0 ? m('\\QQ > 0') + ' : ' + s.sys + ' reçoit de l’énergie' : m('\\QQ < 0') + ' : ' + s.sys + ' cède de l’énergie') +
          (s.phase ? ' (changement d’état, à température constante).' : ' (sa température ' + (s.s > 0 ? 'augmente' : 'diminue') + ').') + '</p>'
      };
      o.choices = [
        { html: plus, why: s.s > 0 ? undefined : wrongSign },
        { html: minus, why: s.s < 0 ? undefined : wrongSign },
        { html: zero, why: s.phase ? 'Un changement d’état se fait à température constante, mais il y a bien un échange d’énergie : ' + m('\\QQ = \\Qm \\times \\QL') + '.' : 'La température change : il y a forcément un échange d’énergie.' }
      ];
      o.answer = s.s > 0 ? 0 : 1;
      return o;
    }

    /* ---- retourner la formule : m, T_final ou c ---- */
    function findMass() {
      var water = rng() < 0.6, mat = water ? MATERIALS.eau : P([MATERIALS.aluminium, MATERIALS.plomb, MATERIALS.zinc]);
      var kg = water ? P([0.5, 1.2, 2.5, 4, 10, 25]) : P([0.8, 1.5, 2.5, 6]), Ti = P([10, 15, 20]), Tf = water ? P([45, 60, 65, 80]) : P([120, 150, 200]);
      var dT = Tf - Ti, Q = C.roundSig(kg * mat.c * dT, 3), ans = Q / (mat.c * dT);
      return {
        type: 'Retrouver une masse', ask: ask('la masse m', 'kilogrammes (kg)'), unit: 'kg', answer: ans,
        html: '<p>On dispose d’une énergie ' + m('\\QQ = ' + q('J', Q)) + ' pour chauffer ' + (water ? 'de l’eau' : 'un bloc ' + de(mat.n)) + ' de ' + m(deg(Ti)) + ' à ' + m(deg(Tf)) + '.</p><p>Quelle masse ' + m('\\Qm') + ' peut-on chauffer ?</p>' + data([cData(mat)]),
        traps: [
          { value: Q / (mat.c * Tf), msg: 'Il faut la <b>variation</b> de température ' + m('\\QdT = \\QTf - \\QTi = ' + deg(dT)) + ', pas la température finale.' },
          { value: ans * 1000, msg: 'Ce résultat est en <b>grammes</b>. La question demande des kilogrammes.' },
          { value: Q / mat.c, msg: 'Tu as oublié ' + m('\\QdT') + ' : ' + m('\\Qm = \\dfrac{\\QQ}{\\Qc \\times \\QdT}') + '.' }
        ],
        solution: steps([
          'De ' + m('\\QQ = \\Qm \\times \\Qc \\times \\QdT') + ' on tire ' + m('\\Qm = \\dfrac{\\QQ}{\\Qc \\times \\QdT}') + '.',
          m('\\QdT = ' + T(Tf) + ' - ' + T(Ti) + ' = ' + deg(dT)) + '.',
          m('\\Qm = \\dfrac{' + T(Q) + '}{' + T(mat.c, 4) + ' \\times ' + T(dT) + '} = ' + q('kg', ans)) + '.'
        ])
      };
    }
    function finalT() {
      var mat = P([MATERIALS.eau, MATERIALS.aluminium, MATERIALS.zinc, MATERIALS.plomb, MATERIALS.ethanol]);
      var kg = mat === MATERIALS.eau ? P([0.5, 1, 2, 3]) : P([0.4, 0.8, 1.2, 2]), Ti = P([12, 15, 18, 20]), dTwant = P([15, 25, 35, 40, 55]);
      var Q = C.roundSig(kg * mat.c * dTwant, 3), inKJ = Q >= 1e4, dT = Q / (kg * mat.c), ans = Ti + dT;
      var Qtex = inKJ ? q('kJ', Q / 1000) : q('J', Q);
      var traps = [
        { value: dT, msg: 'Ça, c’est la <b>variation</b> ' + m('\\QdT = \\dfrac{\\QQ}{\\Qm \\times \\Qc}') + '. Ajoute la température initiale : ' + m('\\QTf = \\QTi + \\QdT') + '.' },
        { value: Ti - dT, msg: 'Le corps reçoit de l’énergie (' + m('\\QQ > 0') + ') : sa température <b>augmente</b>. ' + m('\\QTf = \\QTi + \\QdT') + '.' }
      ];
      if (inKJ) traps.push({ value: Ti + dT / 1000, msg: 'L’énergie est en <b>kJ</b> : convertis-la en joules (× 1 000) avant de diviser.' });
      return {
        type: 'Température finale', ask: ask('la température finale', 'degrés Celsius (°C)'), unit: '°C', answer: ans, traps: traps,
        html: '<p>On fournit une énergie ' + m('\\QQ = ' + Qtex) + ' à ' + m(q('kg', kg)) + ' ' + de(mat.n) + ', initialement à ' + m(deg(Ti)) + '. Il n’y a pas de changement d’état.</p><p>Quelle est sa température finale ' + m('\\QTf') + ' ?</p>' + data([cData(mat)]),
        solution: steps(clean([
          inKJ ? 'Énergie en joules : ' + m('\\QQ = ' + q('J', Q)) + '.' : null,
          'De ' + m('\\QQ = \\Qm \\times \\Qc \\times \\QdT') + ' : ' + m('\\QdT = \\dfrac{\\QQ}{\\Qm \\times \\Qc} = \\dfrac{' + T(Q) + '}{' + T(kg) + ' \\times ' + T(mat.c, 4) + '} = ' + deg(dT)) + '.',
          m('\\QTf = \\QTi + \\QdT = ' + T(Ti) + ' + ' + T(dT) + ' = ' + deg(ans)) + '.'
        ]))
      };
    }
    function findC() {
      var mat = P([MATERIALS.aluminium, MATERIALS.zinc, MATERIALS.plomb, MATERIALS.cuivre, MATERIALS.fer]);
      var kg = P([0.2, 0.25, 0.5, 0.8]), Ti = P([18, 20]), Tf = P([60, 70, 90, 120]), dT = Tf - Ti;
      var Q = C.roundSig(kg * mat.c * dT, 3), kJ = rng() < 0.5, ans = Q / (kg * dT);
      return {
        type: 'Capacité thermique massique', ask: ask('la capacité thermique massique c', UNIT_C), unit: UNIT_C, answer: ans,
        html: '<p>Pour faire passer un bloc de métal inconnu de masse ' + m('\\Qm = ' + mass(kg, true)) + ' de ' + m(deg(Ti)) + ' à ' + m(deg(Tf)) + ', il faut lui fournir ' + m('\\QQ = ' + (kJ ? q('kJ', Q / 1000) : q('J', Q))) + '.</p><p>Calcule la capacité thermique massique ' + m('\\Qc') + ' de ce métal.</p>',
        traps: [
          { value: ans / 1000, msg: 'Unités du système international : ' + m('\\QQ') + ' en <b>joules</b> et ' + m('\\Qm') + ' en <b>kilogrammes</b> (' + m(T(kg * 1000) + '\\ \\mathrm{g} = ' + T(kg) + '\\ \\mathrm{kg}') + ').' },
          { value: Q / (kg * Tf), msg: 'Il faut la <b>variation</b> de température ' + m('\\QdT = ' + deg(dT)) + '.' },
          { value: kg * dT / Q, msg: 'C’est l’inverse : ' + m('\\Qc = \\dfrac{\\QQ}{\\Qm \\times \\QdT}') + '.' }
        ],
        solution: steps(clean([
          'Unités : ' + m('\\Qm = ' + q('kg', kg)) + (kJ ? ', ' + m('\\QQ = ' + q('J', Q)) : '') + ', ' + m('\\QdT = ' + T(Tf) + ' - ' + T(Ti) + ' = ' + deg(dT)) + '.',
          m('\\Qc = \\dfrac{\\QQ}{\\Qm \\times \\QdT} = \\dfrac{' + T(Q) + '}{' + T(kg) + ' \\times ' + T(dT) + '} = ' + T(ans) + UC) + '.',
          'Valeur proche de celle ' + du(mat.n) + ' (' + m(T(mat.c, 4)) + ') : le bloc est sans doute en ' + mat.n + '.'
        ]))
      };
    }

    /* ---- Q = m·L : changement d'état (cours IV) ---- */
    var LATENT = [
      function () { var kg = P([0.05, 0.2, 0.25, 0.5]); return { kg: kg, grams: true, L: L_FUS_EAU, ch: 'fusion', s: 1, text: 'On fait fondre ' + m(mass(kg, true)) + ' de glace à 0 °C.', Lname: 'L_{\\text{fus}}', sub: 'eau' }; },
      function () { var kg = P([0.25, 0.5, 1, 1.5, 2]); return { kg: kg, L: L_VAP_EAU, ch: 'vaporisation', s: 1, text: 'On vaporise ' + m(q('kg', kg)) + ' d’eau à 100 °C.', Lname: 'L_{\\text{vap}}', sub: 'eau' }; },
      function () { var kg = P([0.5, 2, 2.5]); return { kg: kg, L: 397e3, ch: 'fusion', s: 1, text: 'On fait fondre ' + m(q('kg', kg)) + ' d’aluminium à sa température de fusion (660 °C).', Lname: 'L_{\\text{fus}}', sub: 'aluminium' }; },
      function () { var kg = P([0.1, 0.15]); return { kg: kg, grams: true, L: 213e3, ch: 'fusion', s: 1, text: 'On fait fondre ' + m(mass(kg, true)) + ' d’heptadécane solide à sa température de fusion (22 °C).', Lname: 'L_{\\text{fus}}', sub: 'heptadécane' }; },
      function () { var kg = P([0.3, 0.45]); return { kg: kg, grams: true, L: L_FUS_EAU, ch: 'solidification', s: -1, text: 'Dans un congélateur, ' + m(mass(kg, true)) + ' d’eau à 0 °C se transforment en glace à 0 °C.', Lname: 'L_{\\text{fus}}', sub: 'eau' }; },
      function () { var kg = P([0.5, 1]); return { kg: kg, L: L_VAP_EAU, ch: 'liquéfaction', s: -1, text: 'Dans le circuit secondaire d’une centrale, ' + m(q('kg', kg)) + ' de vapeur d’eau à 100 °C se liquéfie.', Lname: 'L_{\\text{vap}}', sub: 'eau' }; }
    ];
    function latent() {
      var s = P(LATENT)(), ans = s.s * s.kg * s.L, U = energyUnit(ans);
      var traps = [
        { value: s.s * s.kg / s.L * U.f, msg: 'On <b>multiplie</b> : ' + m('\\QQ = \\Qm \\times \\QL') + '.' }
      ];
      if (U.u === 'J') traps.push({ value: ans / 1000, msg: m('\\QL') + ' est donnée en <b>kJ/kg</b> : ' + m(T(s.L / 1000, 4) + '\\ \\mathrm{kJ\\cdot kg^{-1}} = ' + T(s.L, 4) + '\\ \\mathrm{J\\cdot kg^{-1}}') + '. Sinon le résultat est en kJ.' });
      if (s.s < 0) traps.push({ value: -ans * U.f, msg: 'La ' + s.ch + ' est la transformation inverse de la ' + (s.ch === 'solidification' ? 'fusion' : 'vaporisation') + ' : le corps <b>cède</b> de l’énergie, ' + m('\\QQ = -\\Qm \\times \\QL < 0') + '.' });
      if (s.grams) traps.push({ value: ans * 1000 * U.f, msg: 'La masse doit être en <b>kilogrammes</b> : ' + m(T(s.kg * 1000, 4) + '\\ \\mathrm{g} = ' + T(s.kg, 4) + '\\ \\mathrm{kg}') + '.' });
      if (U.u === 'kJ') traps.push({ value: ans, msg: 'Ce résultat est en <b>joules</b>. La question demande des kJ.' });
      var Ltex = s.Lname.replace('L_', '\\QL_');
      return {
        type: 'Changement d’état : Q = m·L', ask: ask('l’énergie Q échangée' + (s.s < 0 ? ', avec son signe,' : ''), U.word), unit: U.u, answer: ans * U.f, traps: traps,
        html: '<p>' + s.text + '</p><p>Calcule l’énergie ' + m('\\QQ') + ' échangée lors de cette ' + s.ch + '.</p>' + data([m(Ltex + ' = ' + T(s.L / 1000, 4) + '\\ \\mathrm{kJ\\cdot kg^{-1}}') + ' (' + s.sub + ')']),
        solution: steps(clean([
          massStep(s.kg, s.grams),
          m(Ltex + ' = ' + T(s.L / 1000, 4) + '\\ \\mathrm{kJ\\cdot kg^{-1}} = ' + T(s.L, 4) + '\\ \\mathrm{J\\cdot kg^{-1}}') + '.',
          s.s > 0
            ? 'La ' + s.ch + ' demande de l’énergie : ' + m('\\QQ = \\Qm \\times \\QL = ' + T(s.kg, 4) + ' \\times ' + T(s.L, 4) + ' = ' + q('J', ans)) + (U.u === 'kJ' ? ' ' + m('= ' + q('kJ', ans / 1000)) : '') + '.'
            : 'La ' + s.ch + ' libère de l’énergie : ' + m('\\QQ = -\\Qm \\times \\QL = -' + T(s.kg, 4) + ' \\times ' + T(s.L, 4) + ' = ' + q('J', ans)) + (U.u === 'kJ' ? ' ' + m('= ' + q('kJ', ans / 1000)) : '') + '.',
          'La température reste constante pendant tout le changement d’état.'
        ]))
      };
    }

    /* ---- plusieurs étapes : chauffage + changement d'état (exercice 3) ---- */
    function multiStep() {
      if (rng() < 0.5) {
        var kg = P([0.2, 0.5, 1, 2]), Ti = P([-5, -10, -18, -20]), Tf = P([10, 15, 20, 25]);
        var q1 = kg * C_GLACE * (0 - Ti), q2 = kg * L_FUS_EAU, q3 = kg * C_EAU * Tf, tot = (q1 + q2 + q3) / 1000;
        return {
          type: 'Plusieurs étapes', ask: ask('l’énergie totale Q', 'kilojoules (kJ)'), unit: 'kJ', answer: tot,
          html: '<p>On sort du congélateur ' + m(q('kg', kg)) + ' de glace à ' + m(deg(Ti)) + '. On la chauffe jusqu’à obtenir de l’eau liquide à ' + m(deg(Tf)) + '.</p><p>Calcule l’énergie totale ' + m('\\QQ') + ' reçue.</p>' +
            data([m('\\Qc_{\\text{glace}} = ' + T(C_GLACE, 4) + UC), m('\\QL_{\\text{fus}} = 334\\ \\mathrm{kJ\\cdot kg^{-1}}'), m('\\Qc_{\\text{eau}} = ' + T(C_EAU, 4) + UC)]),
          traps: [
            { value: (q1 + q3) / 1000, msg: 'Tu as oublié la <b>fusion</b> à 0 °C : pendant le palier, la température ne change pas mais il faut ' + m('\\QQ_2 = \\Qm \\times \\QL_{\\text{fus}}') + '.' },
            { value: (q2 + q3) / 1000, msg: 'Il faut d’abord réchauffer la glace de ' + m(deg(Ti)) + ' à ' + m(deg(0)) + ' : ' + m('\\QQ_1 = \\Qm \\times \\Qc_{\\text{glace}} \\times \\QdT') + '.' },
            { value: (q1 + q2) / 1000, msg: 'Il reste à chauffer l’eau liquide de 0 °C à ' + m(deg(Tf)) + ' : ' + m('\\QQ_3 = \\Qm \\times \\Qc_{\\text{eau}} \\times \\QdT') + '.' },
            { value: q2 / 1000, msg: 'La fusion seule ne suffit pas : ajoute les deux échauffements (glace, puis eau liquide).' }
          ],
          solution: steps([
            'Glace de ' + m(deg(Ti)) + ' à 0 °C : ' + m('\\QQ_1 = ' + T(kg) + ' \\times ' + T(C_GLACE, 4) + ' \\times ' + T(-Ti) + ' = ' + q('J', q1)) + '.',
            'Fusion à 0 °C : ' + m('\\QQ_2 = \\Qm \\times \\QL_{\\text{fus}} = ' + T(kg) + ' \\times 334\\,000 = ' + q('J', q2)) + '.',
            'Eau liquide de 0 °C à ' + m(deg(Tf)) + ' : ' + m('\\QQ_3 = ' + T(kg) + ' \\times ' + T(C_EAU, 4) + ' \\times ' + T(Tf) + ' = ' + q('J', q3)) + '.',
            m('\\QQ = \\QQ_1 + \\QQ_2 + \\QQ_3 = ' + q('kJ', tot)) + '.'
          ])
        };
      }
      var kgv = P([0.5, 1, 2]), Tv = P([110, 120, 130, 150]), Tl = P([40, 50, 60, 80]);
      var a = kgv * C_VAPEUR * (100 - Tv), b = -kgv * L_VAP_EAU, d = kgv * C_EAU * (Tl - 100), sum = (a + b + d) / 1000;
      return {
        type: 'Plusieurs étapes', ask: ask('l’énergie totale Q, avec son signe,', 'kilojoules (kJ)'), unit: 'kJ', answer: sum,
        html: '<p>Dans une centrale, on refroidit ' + m(q('kg', kgv)) + ' de vapeur d’eau de ' + m(deg(Tv)) + ' jusqu’à de l’eau liquide à ' + m(deg(Tl)) + '.</p><p>Calcule l’énergie totale ' + m('\\QQ') + ' échangée par cette eau.</p>' +
          data([m('\\Qc_{\\text{vapeur}} = ' + T(C_VAPEUR, 4) + UC), m('\\QL_{\\text{vap}} = 2\\,260\\ \\mathrm{kJ\\cdot kg^{-1}}'), m('\\Qc_{\\text{eau}} = ' + T(C_EAU, 4) + UC)]),
        traps: [
          { value: -sum, msg: 'L’eau <b>refroidit</b> et se liquéfie : elle cède de l’énergie, ' + m('\\QQ < 0') + '.' },
          { value: (a + d) / 1000, msg: 'Tu as oublié la <b>liquéfaction</b> à 100 °C : ' + m('\\QQ_2 = -\\Qm \\times \\QL_{\\text{vap}}') + ', c’est le plus gros terme.' },
          { value: (a - b + d) / 1000, msg: 'La liquéfaction <b>libère</b> de l’énergie : son terme est négatif, ' + m('\\QQ_2 = -\\Qm \\times \\QL_{\\text{vap}}') + '.' },
          { value: (b + d) / 1000, msg: 'Il faut d’abord refroidir la vapeur de ' + m(deg(Tv)) + ' à 100 °C : ' + m('\\QQ_1 = \\Qm \\times \\Qc_{\\text{vapeur}} \\times \\QdT') + '.' }
        ],
        solution: steps([
          'Vapeur de ' + m(deg(Tv)) + ' à 100 °C : ' + m('\\QQ_1 = ' + T(kgv) + ' \\times ' + T(C_VAPEUR, 4) + ' \\times (' + T(100 - Tv) + ') = ' + q('J', a)) + '.',
          'Liquéfaction à 100 °C : ' + m('\\QQ_2 = -\\Qm \\times \\QL_{\\text{vap}} = -' + T(kgv) + ' \\times 2\\,260\\,000 = ' + q('J', b)) + '.',
          'Eau liquide de 100 °C à ' + m(deg(Tl)) + ' : ' + m('\\QQ_3 = ' + T(kgv) + ' \\times ' + T(C_EAU, 4) + ' \\times (' + T(Tl - 100) + ') = ' + q('J', d)) + '.',
          m('\\QQ = \\QQ_1 + \\QQ_2 + \\QQ_3 = ' + q('kJ', sum)) + ' : l’eau cède cette énergie (à l’eau de la rivière, par exemple).'
        ])
      };
    }

    /* ---- système isolé : ΣΔU = 0 (exercices 3, 4 et 5) ---- */
    function mixing() {
      var bath = rng() < 0.4, m1 = bath ? P([30, 40, 50]) : P([0.5, 2, 3]), m2 = bath ? P([60, 70, 80]) : P([1, 1.5, 2.5, 4]); // m1 ≠ m2
      var T1 = bath ? P([55, 60, 65]) : P([60, 70, 80, 90]), T2 = bath ? P([12, 15]) : P([10, 15, 20]);
      var ans = (m1 * T1 + m2 * T2) / (m1 + m2);
      var what = bath ? function (x) { return m(T(x) + '\\ \\mathrm{L}') + ' d’eau'; } : function (x) { return m(q('kg', x)) + ' d’eau'; };
      return {
        type: 'Température d’équilibre', ask: ask('la température d’équilibre', 'degrés Celsius (°C)'), unit: '°C', answer: ans,
        html: '<p>' + (bath ? 'Dans une baignoire bien isolée, on mélange ' : 'Dans un récipient parfaitement isolé, on mélange ') + what(m1) + ' à ' + m(deg(T1)) + ' et ' + what(m2) + ' à ' + m(deg(T2)) + '.</p><p>Calcule la température d’équilibre ' + m('\\QTeq') + ' (on néglige le récipient).</p>',
        traps: [
          { value: (T1 + T2) / 2, msg: 'Ce n’est pas la moyenne simple : la plus grande masse d’eau « pèse » plus. Écris ' + m('\\QU_1 + \\QU_2 = 0') + '.' },
          { value: (m2 * T1 + m1 * T2) / (m1 + m2), msg: 'Tu as croisé les masses : chaque masse va avec <b>sa</b> température initiale.' }
        ],
        solution: steps([
          'Système isolé : ' + m('\\QU_1 + \\QU_2 = 0') + ', soit ' + m('m_1 \\Qc (\\QTeq - T_1) + m_2 \\Qc (\\QTeq - T_2) = 0') + '.',
          'On simplifie par ' + m('\\Qc') + ' : ' + m('\\QTeq = \\dfrac{m_1 T_1 + m_2 T_2}{m_1 + m_2} = \\dfrac{' + T(m1) + ' \\times ' + T(T1) + ' + ' + T(m2) + ' \\times ' + T(T2) + '}{' + T(m1) + ' + ' + T(m2) + '}') + '.',
          m('\\QTeq = ' + deg(ans)) + ', entre les deux températures initiales, plus près de celle de la plus grande masse.'
        ])
      };
    }
    /** Calorimètre (exercice 4) : capacité thermique massique d'un métal. */
    function calorC() {
      var metal = P([MATERIALS.aluminium, MATERIALS.zinc, MATERIALS.cuivre, MATERIALS.fer]);
      var Mc = P([300, 400, 500]) / 1000, cc = P([748, 750, 800]), m1 = P([150, 200, 250]) / 1000, T1 = P([18, 20, 22]);
      // masse de métal choisie pour que l'eau s'échauffe d'au moins 3 °C (mesure exploitable)
      var T2 = P([80, 88, 90, 95]), k0 = m1 * C_EAU + Mc * cc;
      var m2 = Math.max(P([100, 150, 200, 250]), Math.ceil(3 * k0 / (metal.c * (T2 - T1 - 3)) * 20) * 50) / 1000;
      var Teq = Math.round((k0 * T1 + m2 * metal.c * T2) / (k0 + m2 * metal.c) * 10) / 10;
      var Ue = m1 * C_EAU * (Teq - T1), Uk = Mc * cc * (Teq - T1), Us = -(Ue + Uk), ans = Us / (m2 * (Teq - T2));
      return {
        type: 'Calorimètre : capacité thermique', ask: ask('la capacité thermique massique du métal', UNIT_C), unit: UNIT_C, answer: ans,
        html: '<p>Un calorimètre parfaitement isolé (masse ' + m(q('g', Mc * 1000)) + ', ' + m('\\Qc_{\\text{cal}} = ' + T(cc) + UC) + ') contient ' + m(q('g', m1 * 1000)) + ' d’eau à ' + m(deg(T1)) + '.</p>' +
          '<p>On y plonge un solide métallique de ' + m(q('g', m2 * 1000)) + ' à ' + m(deg(T2)) + '. La température d’équilibre est ' + m('\\QTeq = ' + deg(Teq)) + '.</p><p>Calcule la capacité thermique massique ' + m('\\Qc') + ' du métal.</p>' + data([m('\\Qc_{\\text{eau}} = ' + T(C_EAU, 4) + UC)]),
        traps: [
          { value: -Ue / (m2 * (Teq - T2)), msg: 'Tu as oublié le <b>calorimètre</b> : lui aussi passe de ' + m(deg(T1)) + ' à ' + m(deg(Teq)) + ' et reçoit ' + m('\\QU_{\\text{cal}} = ' + q('J', Uk)) + '.' },
          { value: -ans, msg: 'Une capacité thermique est <b>positive</b>. Le métal refroidit : ' + m('\\QU_{\\text{métal}} < 0') + ' et ' + m('\\QTeq - T_2 < 0') + ', le quotient est positif.' },
          { value: ans / 1000, msg: 'Les masses doivent être en <b>kilogrammes</b> (' + m(T(m2 * 1000) + '\\ \\mathrm{g} = ' + T(m2) + '\\ \\mathrm{kg}') + ').' },
          { value: Us / (m2 * (T1 - T2)), msg: 'Le métal passe de ' + m(deg(T2)) + ' à ' + m(deg(Teq)) + ' (et non à la température initiale de l’eau).' }
        ],
        solution: steps([
          'Eau : ' + m('\\QU_{\\text{eau}} = ' + T(m1) + ' \\times ' + T(C_EAU, 4) + ' \\times (' + T(Teq, 4) + ' - ' + T(T1) + ') = ' + q('J', Ue)) + '.',
          'Calorimètre : ' + m('\\QU_{\\text{cal}} = ' + T(Mc) + ' \\times ' + T(cc) + ' \\times (' + T(Teq, 4) + ' - ' + T(T1) + ') = ' + q('J', Uk)) + '.',
          'Système isolé : ' + m('\\QU_{\\text{eau}} + \\QU_{\\text{cal}} + \\QU_{\\text{métal}} = 0') + ', donc ' + m('\\QU_{\\text{métal}} = ' + q('J', Us)) + '.',
          m('\\Qc = \\dfrac{\\QU_{\\text{métal}}}{m_2 \\times (\\QTeq - T_2)} = \\dfrac{' + T(Us) + '}{' + T(m2) + ' \\times (' + T(Teq - T2, 4) + ')} = ' + T(ans) + UC) + '.',
          'Valeur proche de celle ' + du(metal.n) + ' (' + m(T(metal.c, 4)) + ') : le solide est sans doute en ' + metal.n + '.'
        ])
      };
    }
    /** Calorimètre (exercice 5) : énergie massique de fusion d'un solide. */
    function calorL() {
      var s = P(FUSIBLE), Mc = P([300, 400, 500]) / 1000, cc = P([748, 750]), m1 = P([200, 250, 300, 400]) / 1000, m2 = P(s.m) / 1000;
      // situation cohérente : l'eau chaude descend de « drop » et finit un peu au-dessus de la température de fusion
      var drop = m2 * s.L / (m1 * C_EAU + Mc * cc), T1 = Math.ceil(s.Tf + 1.5 + drop + P([0, 1, 2, 3, 5]));
      var Tend = Math.round((T1 - drop) * 10) / 10;
      var Ue = m1 * C_EAU * (Tend - T1), Uk = Mc * cc * (Tend - T1), Us = -(Ue + Uk), ans = Us / m2 / 1000;
      return {
        type: 'Calorimètre : énergie de fusion', ask: ask('l’énergie massique de fusion', 'kJ·kg⁻¹'), unit: 'kJ·kg⁻¹', answer: ans,
        html: '<p>Dans un calorimètre parfaitement isolé (masse ' + m(q('g', Mc * 1000)) + ', ' + m('\\Qc_{\\text{cal}} = ' + T(cc) + UC) + '), on verse ' + m(q('g', m1 * 1000)) + ' d’eau à ' + m(deg(T1)) + '.</p>' +
          '<p>On ajoute ' + m(q('g', m2 * 1000)) + ' ' + de(s.n) + ' solide, à sa température de fusion (' + m(deg(s.Tf)) + '). Il fond entièrement ; la température finale est ' + m(deg(Tend)) + '. On admet que toute l’énergie reçue par ' + le(s.n) + ' sert à le faire fondre.</p>' +
          '<p>Calcule son énergie massique de fusion ' + m('\\QL_{\\text{fus}}') + '.</p>' + data([m('\\Qc_{\\text{eau}} = ' + T(C_EAU, 4) + UC)]),
        traps: [
          { value: -Ue / m2 / 1000, msg: 'Tu as oublié le <b>calorimètre</b> : il refroidit aussi et cède ' + m(q('J', -Uk)) + ' ' + au(s.n) + '.' },
          { value: -ans, msg: cap(le(s.n)) + ' <b>reçoit</b> de l’énergie pour fondre : ' + m('\\QU_{\\text{' + s.n + '}} > 0') + ', donc ' + m('\\QL_{\\text{fus}} > 0') + '.' },
          { value: ans * 1000, msg: 'Ce résultat est en <b>J/kg</b>. La question demande des kJ/kg : divise par 1 000.' },
          { value: ans / 1000, msg: 'La masse ' + de(s.n) + ' doit être en <b>kilogrammes</b> : ' + m(T(m2 * 1000) + '\\ \\mathrm{g} = ' + T(m2) + '\\ \\mathrm{kg}') + '.' }
        ],
        solution: steps([
          'Eau : ' + m('\\QU_{\\text{eau}} = ' + T(m1) + ' \\times ' + T(C_EAU, 4) + ' \\times (' + T(Tend, 4) + ' - ' + T(T1) + ') = ' + q('J', Ue)) + '.',
          'Calorimètre : ' + m('\\QU_{\\text{cal}} = ' + T(Mc) + ' \\times ' + T(cc) + ' \\times (' + T(Tend, 4) + ' - ' + T(T1) + ') = ' + q('J', Uk)) + '.',
          'Système isolé : ' + m('\\QU_{\\text{' + s.n + '}} = -(\\QU_{\\text{eau}} + \\QU_{\\text{cal}}) = ' + q('J', Us)) + '.',
          m('\\QL_{\\text{fus}} = \\dfrac{\\QU_{\\text{' + s.n + '}}}{\\Qm} = \\dfrac{' + T(Us) + '}{' + T(m2) + '} = ' + T(ans * 1000) + '\\ \\mathrm{J\\cdot kg^{-1}} = ' + T(ans) + '\\ \\mathrm{kJ\\cdot kg^{-1}}') + '.',
          'Valeur de référence : ' + m(T(s.L / 1000, 4) + '\\ \\mathrm{kJ\\cdot kg^{-1}}') + '.'
        ])
      };
    }

    /* ---- lien avec le chapitre 1 : durée de chauffe ---- */
    function duration() {
      var Pw = P([1500, 2000, 2200, 2400]), V = P([0.5, 1, 1.2, 1.5, 1.7]), Ti = P([12, 15, 20]), Q = V * C_EAU * (100 - Ti), ans = Q / Pw;
      return {
        type: 'Durée de chauffe', ask: ask('la durée Δt', 'secondes (s)'), unit: 's', answer: ans,
        html: '<p>Une bouilloire de puissance ' + m('\\QP = ' + q('W', Pw, 4)) + ' chauffe ' + m(T(V) + '\\ \\mathrm{L}') + ' d’eau (' + m('\\Qm = ' + q('kg', V)) + ') de ' + m(deg(Ti)) + ' à ' + m(deg(100)) + '. Toute l’énergie électrique sert à chauffer l’eau.</p><p>Combien de temps ' + m('\\Qt') + ' faut-il ?</p>' + data([m('\\Qc_{\\text{eau}} = ' + T(C_EAU, 4) + UC)]),
        traps: [
          { value: ans / 60, msg: 'Ce résultat est en <b>minutes</b>. Avec ' + m('\\QQ') + ' en joules et ' + m('\\QP') + ' en watts, ' + m('\\Qt') + ' sort directement en secondes.' },
          { value: Q / (Pw / 1000), msg: 'La puissance doit être en <b>watts</b> (pas en kW) pour obtenir des secondes.' },
          { value: Pw / Q, msg: 'C’est l’inverse : ' + m('\\Qt = \\dfrac{\\QQ}{\\QP}') + '.' }
        ],
        solution: steps([
          'Énergie reçue par l’eau : ' + m('\\QQ = \\Qm \\times \\Qc \\times \\QdT = ' + T(V) + ' \\times ' + T(C_EAU, 4) + ' \\times ' + T(100 - Ti) + ' = ' + q('J', Q)) + '.',
          'Chapitre 1 : ' + m('\\QQ = \\QP \\times \\Qt') + ', donc ' + m('\\Qt = \\dfrac{\\QQ}{\\QP} = \\dfrac{' + T(Q) + '}{' + T(Pw, 4) + '} = ' + q('s', ans)) + ', soit ' + C.fmtDuration(ans) + '.'
        ])
      };
    }

    /* ---- QCM du cours ---- */
    function transfer() {
      var t = P(TRANSFERS), names = ['conduction', 'convection', 'rayonnement'];
      var o = mcq({
        type: 'Modes de transfert thermique',
        html: '<p>' + t.n + '</p><p>Quel est le principal mode de transfert thermique ?</p>',
        solution: '<p><b>' + cap(t.m) + '</b> : ' + MODES[t.m] + '.</p>'
      }, t.m, names.filter(function (x) { return x !== t.m; }).map(function (x) { return { html: x, why: cap(x) + ' : ' + MODES[x] + '. Ce n’est pas le cas ici.' }; }));
      return o;
    }
    function stateName() {
      var s = P(STATE_CHANGES);
      if (rng() < 0.5) {
        var others = shuffle(STATE_CHANGES.filter(function (x) { return x !== s; })).slice(0, 3);
        return mcq({
          type: 'Changements d’état',
          html: '<p>Comment s’appelle le passage de l’état <b>' + s.from + '</b> à l’état <b>' + s.to + '</b> ?</p>',
          solution: '<p>' + cap(s.from) + ' → ' + s.to + ' : <b>' + s.n + '</b>. Le changement d’état se fait à température constante.</p>'
        }, s.n, others.map(function (x) { return { html: x.n, why: 'La ' + x.n + ' est le passage de l’état ' + x.from + ' à l’état ' + x.to + '.' }; }));
      }
      var wrong = shuffle(STATE_CHANGES.filter(function (x) { return x !== s; })).slice(0, 3);
      return mcq({
        type: 'Changements d’état',
        html: '<p>La <b>' + s.n + '</b> est le passage :</p>',
        solution: '<p>La ' + s.n + ' est le passage de l’état <b>' + s.from + '</b> à l’état <b>' + s.to + '</b>.</p>'
      }, 'de l’état ' + s.from + ' à l’état ' + s.to, wrong.map(function (x) { return { html: 'de l’état ' + x.from + ' à l’état ' + x.to, why: 'Ça, c’est la ' + x.n + '.' }; }));
    }
    var CONCEPTS = [
      function () { return mcq({ type: 'Température', ref: 'c-unites', html: '<p>Dans le système international, l’unité de température est :</p>', solution: '<p>Le <b>kelvin</b> (K). Le degré Celsius est une unité usuelle ; le degré Fahrenheit est utilisé dans les pays anglo-saxons.</p>' },
        'le kelvin (K)', [{ html: 'le degré Celsius (°C)', why: 'Le degré Celsius est une unité <b>usuelle</b>, pas celle du système international.' }, { html: 'le degré Fahrenheit (°F)', why: 'Le degré Fahrenheit est utilisé dans les pays anglo-saxons ; ce n’est pas l’unité SI.' }, 'le joule (J)']); },
      function () { return mcq({ type: 'Agitation thermique', ref: 'c-agitation', html: '<p>Quand la température d’un corps augmente, le mouvement des molécules ou des ions qui le constituent :</p>', solution: '<p>Il <b>augmente</b> : c’est l’agitation thermique.</p>' },
        'augmente : c’est l’agitation thermique', [{ html: 'diminue', why: 'C’est l’inverse : plus le corps est chaud, plus ses particules s’agitent.' }, 'ne change pas', 's’arrête']); },
      function () { return mcq({ type: 'Énergie interne', ref: 'c-energie-interne', html: '<p>L’énergie interne ' + m('U') + ' d’un système est :</p>', solution: '<p>L’énergie <b>microscopique</b> des particules qui le constituent : énergie d’interaction entre particules et énergie cinétique (agitation) de ces particules.</p>' },
        'l’énergie microscopique de ses particules (interactions et agitation)', [{ html: 'l’énergie cinétique du système qui se déplace', why: 'Le mouvement d’ensemble du système relève de l’énergie <b>mécanique</b>, pas de l’énergie interne.' }, 'l’énergie électrique qu’il consomme', 'sa température en kelvins']); },
      function () { return mcq({ type: 'Changements d’état', ref: 'c-etats', html: '<p>Pendant le changement d’état d’un corps pur, sa température :</p>', solution: '<p>Elle <b>reste constante</b> : des liaisons entre particules sont formées ou rompues, mais l’agitation thermique n’augmente pas.</p>' },
        'reste constante', [{ html: 'augmente', why: 'L’énergie reçue sert à rompre des liaisons, pas à augmenter l’agitation : la température ne change pas.' }, 'diminue', 'augmente puis diminue']); },
      function () { return mcq({ type: 'Capacité thermique massique', ref: 'c-capacite', html: '<p>Pour l’eau, ' + m('\\Qc = 4\\,180' + UC) + '. Cela signifie qu’il faut :</p>', solution: '<p>4 180 J pour augmenter de 1 °C la température de <b>1 kg</b> d’eau.</p>' },
        '4 180 J pour élever de 1 °C la température de 1 kg d’eau', [{ html: '4 180 J pour faire bouillir 1 kg d’eau', why: 'Faire bouillir demande bien plus : il faut chauffer jusqu’à 100 °C puis vaporiser.' }, '4 180 J pour élever de 1 °C la température de 1 g d’eau', '4 180 W pour chauffer 1 kg d’eau']); },
      function () { return mcq({ type: 'Transfert thermique', ref: 'c-sens', html: '<p>Spontanément, un transfert thermique s’effectue :</p>', solution: '<p>Du corps le plus <b>chaud</b> vers le corps le plus <b>froid</b>.</p>' },
        'du corps le plus chaud vers le corps le plus froid', [{ html: 'du corps le plus froid vers le corps le plus chaud', why: 'Jamais spontanément : un réfrigérateur y arrive, mais en consommant de l’énergie électrique.' }, 'du corps le plus lourd vers le plus léger', 'dans les deux sens à la fois, de façon égale']); },
      function () { return mcq({ type: 'Modes de transfert thermique', ref: 'c-modes', html: '<p>Quel est le seul mode de transfert thermique possible dans un solide ?</p>', solution: '<p>La <b>conduction</b> : l’agitation thermique se transmet de proche en proche, sans déplacement de matière.</p>' },
        'la conduction', [{ html: 'la convection', why: 'La convection demande un <b>déplacement de matière</b> : elle n’existe que dans les liquides et les gaz.' }, { html: 'le rayonnement', why: 'Le rayonnement se propage surtout dans les milieux transparents et le vide ; dans un solide opaque, c’est la conduction.' }]); },
      function () { return mcq({ type: 'Température', ref: 'c-unites', html: '<p>À quelle température en °C correspond 0 K (le zéro absolu) ?</p>', solution: '<p>' + m('0 - 273 = -273\\ {}^{\\circ}\\mathrm{C}') + ' : plus aucune agitation thermique, on ne peut pas descendre plus bas.</p>' },
        '−273 °C', [{ html: '0 °C', why: '0 °C, c’est la fusion de la glace : 273 K.' }, '273 °C', '−100 °C']); },
      function () { return mcq({ type: 'Calorimétrie', ref: 'c-methode-calo', html: '<p>Dans un calorimètre parfaitement isolé, l’eau, le calorimètre et un solide échangent de l’énergie. Quelle relation est vraie ?</p>', solution: '<p>Aucun échange avec l’extérieur : ' + m('\\QU_{\\text{eau}} + \\QU_{\\text{cal}} + \\QU_{\\text{solide}} = 0') + '. L’énergie cédée par le corps chaud est reçue par les corps froids.</p>' },
        m('\\QU_{\\text{eau}} + \\QU_{\\text{cal}} + \\QU_{\\text{solide}} = 0'), [{ html: m('\\QU_{\\text{eau}} = \\QU_{\\text{solide}}'), why: 'Les deux variations sont de <b>signes opposés</b> (l’un gagne, l’autre perd) et on oublie le calorimètre.' }, m('\\QU_{\\text{eau}} + \\QU_{\\text{cal}} = \\QU_{\\text{solide}}'), m('\\QU_{\\text{eau}} \\times \\QU_{\\text{cal}} \\times \\QU_{\\text{solide}} = 0')]); }
    ];
    function concept() { return P(CONCEPTS)(); }

    /* ---- tirage ---- */
    var RAW = {
      conversion: conversion, heat: heat, cool: cool, sign: sign, findMass: findMass, finalT: finalT, findC: findC,
      latent: latent, multiStep: multiStep, mixing: mixing, calorC: calorC, calorL: calorL, duration: duration,
      transfer: transfer, stateName: stateName, concept: concept
    };
    // carte du cours à revoir pour chaque type de question (lien « À revoir » après l'évaluation)
    var REF = {
      conversion: 'c-unites', heat: 'c-delta-u', cool: 'c-signe', sign: 'c-signe', findMass: 'c-methode-du', finalT: 'c-methode-du',
      findC: 'c-capacite', latent: 'c-chgt', multiStep: 'c-methode-etapes', mixing: 'c-methode-calo', calorC: 'c-methode-calo',
      calorL: 'c-methode-calo', duration: 'c-delta-u', transfer: 'c-modes', stateName: 'c-etats', concept: 'c-unites'
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
      conversion: 3, heat: 3, cool: 3, sign: 2, findMass: 1, finalT: 2, findC: 1, latent: 3, multiStep: 2, mixing: 2,
      calorC: 2, calorL: 1, duration: 1, transfer: 2, stateName: 2, concept: 2
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
        pts('conversion', 2), pts('transfer', 2), pts(P(['stateName', 'concept', 'sign']), 2),
        pts('heat', 3), pts('cool', 3), pts('latent', 2),
        pts(rng() < 0.5 ? 'multiStep' : 'mixing', 3), pts(rng() < 0.5 ? 'calorC' : 'calorL', 3)
      ];
    }
    return { training: training, exam: exam, kinds: KINDS };
  }

  return {
    make: make, MATERIALS: MATERIALS, STATE_CHANGES: STATE_CHANGES, TRANSFERS: TRANSFERS, SIGNS: SIGNS, FUSIBLE: FUSIBLE,
    C_EAU: C_EAU, C_GLACE: C_GLACE, C_VAPEUR: C_VAPEUR, L_FUS_EAU: L_FUS_EAU, L_VAP_EAU: L_VAP_EAU, EXAM_QUESTIONS: 8
  };
});
