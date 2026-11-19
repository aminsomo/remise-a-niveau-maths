/* ==========================================================================
   Chapitre 3 — Énergie chimique : banque de questions paramétrées.
   Inspirée de la fiche d'exercices du chapitre (énergie libérée par un
   combustible, éteindre un feu, identification de deux alcools, consommation
   d'un carburant, Ariane 5) et du cours (système chimique, transformations
   exo- et endothermiques, combustion, pouvoir calorifique E = m × PC, dangers).

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

  /* ---------- données de la fiche d'exercices ---------- */
  /**
   * Pouvoirs calorifiques (MJ·kg⁻¹) du tableau de la fiche ; masses volumiques à l'état liquide (kg·m⁻³),
   * valeurs approchées : gaz liquéfiés sous pression (propane, butane) ou très froids (méthane −162 °C,
   * dihydrogène −253 °C).
   */
  var FUELS = {
    methane: { n: 'méthane', pc: 50.0, rho: 422, f: 'CH_4' },
    propane: { n: 'propane', pc: 46.3, rho: 500, f: 'C_3H_8' },
    butane: { n: 'butane', pc: 45.6, rho: 580, f: 'C_4H_{10}' },
    h2: { n: 'dihydrogène', pc: 120.5, rho: 71, f: 'H_2' },
    essence: { n: 'essence SP95', pc: 42.7, rho: 750 },
    ethanol: { n: 'éthanol', pc: 26.8, rho: 789, f: 'C_2H_6O' },
    kerosene: { n: 'kérosène', pc: 43.0, rho: 800 }
  };
  /** Exercice 14 : deux alcools de même formule brute C₃H₈O. */
  var ALCOHOLS = { propan1: { n: 'propan-1-ol', pc: 30.68 }, propan2: { n: 'propan-2-ol', pc: 30.45 } };
  var C_EAU = 4180; // J·kg⁻¹·°C⁻¹ (chapitre 2)

  /** Rôle des espèces dans une combustion (cours II.1, exercice 22). */
  var ROLES = {
    combustible: 'le combustible',
    comburant: 'le comburant',
    activation: 'l’énergie d’activation',
    produit: 'un produit de la combustion'
  };
  var ROLE_WHY = {
    combustible: 'Le <b>combustible</b> est l’espèce chimique qui brûle (le butane d’un briquet, l’essence d’un moteur…).',
    comburant: 'Le <b>comburant</b> est l’espèce chimique qui fait brûler : la plupart du temps le dioxygène de l’air.',
    activation: 'L’<b>énergie d’activation</b> amorce la combustion : une flamme, une étincelle. Ce n’est pas une espèce chimique.',
    produit: 'Un <b>produit</b> apparaît pendant la transformation (dioxyde de carbone, eau) ; il n’était pas là au départ.'
  };
  var SITUATIONS = [
    { n: 'Dans un briquet, le butane brûle au contact de l’air dès qu’une étincelle jaillit.', what: 'le butane', role: 'combustible' },
    { n: 'Dans un briquet, le butane brûle au contact de l’air dès qu’une étincelle jaillit.', what: 'le dioxygène de l’air', role: 'comburant' },
    { n: 'Dans un briquet, le butane brûle au contact de l’air dès qu’une étincelle jaillit.', what: 'l’étincelle', role: 'activation' },
    { n: 'Le moteur Vulcain d’Ariane 5 brûle du dihydrogène liquide avec du dioxygène liquide emporté dans la fusée.', what: 'le dihydrogène liquide', role: 'combustible' },
    { n: 'Le moteur Vulcain d’Ariane 5 brûle du dihydrogène liquide avec du dioxygène liquide emporté dans la fusée.', what: 'le dioxygène liquide', role: 'comburant' },
    { n: 'Le moteur Vulcain d’Ariane 5 brûle du dihydrogène liquide avec du dioxygène liquide ; il rejette de la vapeur d’eau.', what: 'la vapeur d’eau', role: 'produit' },
    { n: 'Dans le moteur d’une voiture, l’étincelle d’une bougie enflamme le mélange d’essence et d’air.', what: 'l’étincelle de la bougie', role: 'activation' },
    { n: 'Dans le moteur d’une voiture, l’étincelle d’une bougie enflamme le mélange d’essence et d’air.', what: 'l’essence', role: 'combustible' },
    { n: 'Sur une gazinière, on allume le méthane (gaz naturel) avec une allumette.', what: 'la flamme de l’allumette', role: 'activation' },
    { n: 'Un morceau de fusain (carbone pur) brûle dans un flacon de dioxygène : il se forme du dioxyde de carbone.', what: 'le carbone du fusain', role: 'combustible' },
    { n: 'Un morceau de fusain (carbone pur) brûle dans un flacon de dioxygène : il se forme du dioxyde de carbone.', what: 'le dioxyde de carbone', role: 'produit' },
    { n: 'Une bûche brûle dans une cheminée ouverte.', what: 'le dioxygène de l’air', role: 'comburant' }
  ];
  /** Transformations chimiques : exothermique (+1, libère de l'énergie) ou endothermique (−1). */
  var THERMO = [
    { n: 'On dissout des pastilles de soude (hydroxyde de sodium) dans l’eau : le bécher devient chaud.', s: 1 },
    { n: 'On dissout du chlorure d’ammonium dans l’eau : le bécher devient froid.', s: -1 },
    { n: 'Du butane brûle dans la flamme d’un réchaud de camping.', s: 1 },
    { n: 'On presse une poche de froid instantané (nitrate d’ammonium et eau) : elle se refroidit pour soigner une entorse.', s: -1 },
    { n: 'Dans une chaufferette, de la poudre de fer réagit avec le dioxygène de l’air : les mains se réchauffent.', s: 1 },
    { n: 'Dans un four à chaux, le calcaire ne se décompose que si on le chauffe sans arrêt.', s: -1 },
    { n: 'Le dihydrogène brûle dans le moteur d’une fusée.', s: 1 },
    { n: 'On verse de l’acide chlorhydrique sur de la soude : le mélange s’échauffe.', s: 1 }
  ];

  /* ---------- outils d'écriture ---------- */
  var UPC = '\\ \\mathrm{MJ\\cdot kg^{-1}}';
  var UC = '\\ \\mathrm{J\\cdot kg^{-1}\\cdot {}^{\\circ}C^{-1}}';
  var URHO = '\\ \\mathrm{kg\\cdot m^{-3}}';
  var DEG = '\\ {}^{\\circ}\\mathrm{C}';
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function m(t) { return '\\(' + t + '\\)'; }
  function q(unitTex, x, sig) { return T(x, sig) + '\\ \\mathrm{' + unitTex + '}'; }
  function steps(list) { return '<ol class="steps-list">' + list.filter(Boolean).map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>'; }
  function ask(what, unit) { return 'Donne ' + what + ' en ' + unit + ', à 3 chiffres significatifs.'; }
  function data(list) { return '<p class="note">Données : ' + list.join(' ; ') + '.</p>'; }
  function pcData(f) { return m('\\QPC_{\\text{' + f.n + '}} = ' + T(f.pc, 4) + UPC); }
  /** 1,84 × 10⁴ : écriture scientifique imposée (comme dans la fiche). */
  function sci(x, sig) {
    var e = Math.floor(Math.log10(Math.abs(x))), mt = C.roundSig(x / Math.pow(10, e), sig || 3);
    if (Math.abs(mt) >= 10) { mt = C.roundSig(mt / 10, sig || 3); e++; }
    return T(mt, sig || 3) + '\\times 10^{' + e + '}';
  }
  /** Articles avec élision : « d’éthanol », « de butane », « de l’éthanol », « l’éthanol ». */
  function vowel(n) { return /^[aeéèiouyh]/i.test(n); }
  function de(n) { return (vowel(n) ? 'd’' : 'de ') + n; }
  function du(n) { return (vowel(n) ? 'de l’' : 'du ') + n; }

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

    /* ---- E = m × PC (exercices 11 a, b et 22.3) ---- */
    var ENERGY = [
      function () { var kg = P([6, 10, 13]); return { f: FUELS.butane, kg: kg, text: 'Une bouteille de ' + m(q('kg', kg)) + ' de butane est entièrement brûlée.' }; },
      function () { var kg = P([5, 13, 35]); return { f: FUELS.propane, kg: kg, text: 'Une bouteille contient ' + m(q('kg', kg)) + ' de propane. On la brûle entièrement.' }; },
      function () { var g = P([190, 230, 450]); return { f: FUELS.butane, kg: g / 1000, grams: true, text: 'Une cartouche de camping contient ' + m(q('g', g)) + ' de butane, entièrement brûlé.' }; },
      function () { var kg = P([2, 4.5, 12]); return { f: FUELS.methane, kg: kg, text: 'Une chaudière brûle ' + m(q('kg', kg)) + ' de méthane (gaz naturel) en une journée.' }; },
      function () { var t = P([5, 20, 35]); return { f: FUELS.kerosene, kg: t * 1000, tonnes: true, text: 'Un avion de ligne brûle ' + m(q('t', t)) + ' de kérosène pendant un vol.' }; },
      function () { var t = P([25, 28]); return { f: FUELS.h2, kg: t * 1000, tonnes: true, text: 'L’étage principal d’Ariane 5 emporte ' + m(q('t', t)) + ' de dihydrogène liquide, entièrement brûlé.' }; },
      function () { var kg = P([30, 37.5, 45]); return { f: FUELS.essence, kg: kg, text: 'On brûle ' + m(q('kg', kg)) + ' d’essence SP95 (environ un plein).' }; }
    ];
    function energy() {
      var s = P(ENERGY)(), J = s.kg * s.f.pc * 1e6;
      var U = s.tonnes || rng() < 0.3 ? { u: 'J', f: 1, word: 'joules (J)' } : { u: 'MJ', f: 1e-6, word: 'mégajoules (MJ)' };
      var traps = [
        { value: U.u === 'MJ' ? s.kg / s.f.pc : s.kg / (s.f.pc * 1e6), msg: 'On <b>multiplie</b> la masse par le pouvoir calorifique : ' + m('\\QE = \\Qm \\times \\QPC') + '.' },
        U.u === 'MJ'
          ? { value: J, msg: 'Ce résultat est en <b>joules</b>. La question demande des mégajoules : ' + m('1\\ \\mathrm{MJ} = 10^{6}\\ \\mathrm{J}') + '.' }
          : { value: J / 1e6, msg: 'Ce résultat est en <b>mégajoules</b> (le PC est en MJ/kg). En joules : multiplie par ' + m('10^{6}') + '.' }
      ];
      if (s.grams) traps.push({ value: J * 1000 * U.f, msg: 'La masse doit être en <b>kilogrammes</b> : ' + m(T(s.kg * 1000, 4) + '\\ \\mathrm{g} = ' + T(s.kg, 4) + '\\ \\mathrm{kg}') + '.' });
      if (s.tonnes) traps.push({ value: J / 1000 * U.f, msg: 'La masse doit être en <b>kilogrammes</b> : ' + m('1\\ \\mathrm{t} = 1\\,000\\ \\mathrm{kg}') + '.' });
      return {
        type: 'Énergie libérée : E = m × PC', ask: ask('l’énergie libérée E', U.word), unit: U.u, answer: J * U.f, traps: traps,
        html: '<p>' + s.text + '</p><p>Calcule l’énergie ' + m('\\QE') + ' libérée par cette combustion.</p>' + data([pcData(s.f)]),
        solution: steps([
          s.grams ? 'Masse en kilogrammes : ' + m('\\Qm = ' + q('g', s.kg * 1000, 4) + ' = ' + q('kg', s.kg, 4)) + '.' : null,
          s.tonnes ? 'Masse en kilogrammes : ' + m('\\Qm = ' + q('t', s.kg / 1000, 4) + ' = ' + q('kg', s.kg, 4)) + '.' : null,
          m('\\QE = \\Qm \\times \\QPC = ' + T(s.kg, 4) + ' \\times ' + T(s.f.pc, 4) + ' = ' + q('MJ', J / 1e6, 4)) + '.',
          U.u === 'J' ? 'En joules : ' + m('\\QE = ' + T(J / 1e6, 4) + ' \\times 10^{6}\\ \\mathrm{J} = ' + q('J', J)) + '.' : null
        ])
      };
    }

    /* ---- liquide : m = ρ × V, puis E = m × PC (exercices 11 c et 16) ---- */
    var LIQUID = [
      function () { var V = P([0.5, 1, 1.5, 2]); return { f: FUELS.ethanol, V: V, d: 0.789, text: 'Une bouteille contient ' + m(q('L', V)) + ' d’éthanol, de densité ' + m('\\Qd = 0{,}789') + '.' }; },
      function () { var V = P([20, 40, 50, 60]); return { f: FUELS.essence, V: V, text: 'Le réservoir d’une voiture contient ' + m(q('L', V)) + ' d’essence SP95.' }; },
      function () { var V = P([150, 200, 250]); return { f: FUELS.kerosene, V: V, text: 'Un petit avion fait le plein avec ' + m(q('L', V)) + ' de kérosène.' }; },
      function () { var V = P([5, 10, 20]); return { f: FUELS.ethanol, V: V, text: 'Un jerrican contient ' + m(q('L', V)) + ' d’éthanol (biocarburant).' }; }
    ];
    function liquid() {
      var s = P(LIQUID)(), rL = s.f.rho / 1000, kg = rL * s.V, E = kg * s.f.pc, wantMass = rng() < 0.35;
      var given = s.d ? m('\\Qd = 0{,}789') + ' : ' + m('\\Qrho = 0{,}789\\ \\mathrm{kg\\cdot L^{-1}}') : m('\\Qrho = ' + T(s.f.rho, 4) + URHO);
      var conv = s.d
        ? 'Densité ' + m('\\Qd = 0{,}789') + ' : un litre d’éthanol a une masse de ' + m('0{,}789\\ \\mathrm{kg}') + ', soit ' + m('\\Qrho = 0{,}789\\ \\mathrm{kg\\cdot L^{-1}}') + '.'
        : 'Volume en mètres cubes : ' + m('\\QV = ' + q('L', s.V, 4) + ' = ' + T(s.V / 1000, 4) + '\\ \\mathrm{m^{3}}') + '.';
      var massLine = m('\\Qm = \\Qrho \\times \\QV = ' + (s.d ? '0{,}789 \\times ' + T(s.V, 4) : T(s.f.rho, 4) + ' \\times ' + T(s.V / 1000, 4)) + ' = ' + q('kg', kg, 4)) + '.';
      var noRho = { value: wantMass ? s.V : s.V * s.f.pc, msg: 'Un litre ' + de(s.f.n) + ' n’a pas une masse de 1 kg : calcule d’abord ' + m('\\Qm = \\Qrho \\times \\QV') + '.' };
      var noConv = { value: wantMass ? kg * 1000 : E * 1000, msg: s.d ? 'Avec une densité de 0,789, la masse volumique est ' + m('0{,}789\\ \\mathrm{kg\\cdot L^{-1}}') + ' (et non 789 kg par litre).' : m('\\Qrho') + ' est en ' + m('\\mathrm{kg\\cdot m^{-3}}') + ' : convertis le volume en ' + m('\\mathrm{m^{3}}') + ' (' + m('1\\ \\mathrm{L} = 10^{-3}\\ \\mathrm{m^{3}}') + ').' };
      var html = '<p>' + s.text + '</p>';
      if (wantMass) {
        return {
          type: 'Masse d’un liquide : m = ρ × V', ask: ask('la masse m', 'kilogrammes (kg)'), unit: 'kg', answer: kg,
          html: html + '<p>Calcule la masse ' + m('\\Qm') + ' de ce liquide.</p>' + data([given]),
          traps: [noRho, noConv, { value: s.V / rL, msg: 'On <b>multiplie</b> : ' + m('\\Qm = \\Qrho \\times \\QV') + ' (car ' + m('\\Qrho = \\dfrac{\\Qm}{\\QV}') + ').' }],
          solution: steps([conv, massLine])
        };
      }
      return {
        type: 'Énergie d’un volume de carburant', ask: ask('l’énergie libérée E', 'mégajoules (MJ)'), unit: 'MJ', answer: E,
        html: html + '<p>Calcule l’énergie ' + m('\\QE') + ' libérée par la combustion complète de ce liquide.</p>' + data([given, pcData(s.f)]),
        traps: [noRho, noConv, { value: E * 1e6, msg: 'Ce résultat est en <b>joules</b>. Avec le PC en MJ/kg, ' + m('\\QE') + ' sort directement en MJ.' }],
        solution: steps([conv, massLine, m('\\QE = \\Qm \\times \\QPC = ' + T(kg, 4) + ' \\times ' + T(s.f.pc, 4) + ' = ' + q('MJ', E)) + '.'])
      };
    }

    /* ---- m = E / PC (exercice 14.1) ---- */
    function findMass() {
      var small = rng() < 0.6;
      var f = P([ALCOHOLS.propan2, ALCOHOLS.propan1, FUELS.ethanol, FUELS.butane, FUELS.methane, FUELS.essence]);
      if (small) {
        var g = P([2, 4.5, 6, 8, 12.5]), EkJ = C.roundSig(g * f.pc, 4), ans = EkJ / f.pc;
        return {
          type: 'Retrouver une masse brûlée', ask: ask('la masse m brûlée', 'grammes (g)'), unit: 'g', answer: ans,
          html: '<p>La combustion complète ' + du(f.n) + ' fournit une énergie ' + m('\\QE = ' + q('kJ', EkJ, 4)) + '.</p><p>Calcule la masse ' + m('\\Qm') + ' qui a brûlé.</p>' + data([pcData(f)]),
          traps: [
            { value: ans / 1000, msg: 'Ce résultat est en <b>kilogrammes</b>. La question demande des grammes : ' + m('1\\ \\mathrm{kg} = 1\\,000\\ \\mathrm{g}') + '.' },
            { value: EkJ * f.pc, msg: 'C’est une division : de ' + m('\\QE = \\Qm \\times \\QPC') + ' on tire ' + m('\\Qm = \\dfrac{\\QE}{\\QPC}') + '.' },
            { value: ans * 1000, msg: 'Unités incohérentes : avec l’énergie en joules, le PC doit être en J/kg (' + m('\\times 10^{6}') + ') ; la masse sort alors en kg.' }
          ],
          solution: steps([
            'De ' + m('\\QE = \\Qm \\times \\QPC') + ' on tire ' + m('\\Qm = \\dfrac{\\QE}{\\QPC}') + ', en unités SI.',
            m('\\QE = ' + q('kJ', EkJ, 4) + ' = ' + sci(EkJ * 1e3, 4) + '\\ \\mathrm{J}') + ' ; ' + m('\\QPC = ' + T(f.pc, 4) + UPC + ' = ' + sci(f.pc * 1e6, 4) + '\\ \\mathrm{J\\cdot kg^{-1}}') + '.',
            m('\\Qm = \\dfrac{' + sci(EkJ * 1e3, 4) + '}{' + sci(f.pc * 1e6, 4) + '} = ' + sci(ans / 1000, 3) + '\\ \\mathrm{kg} = ' + q('g', ans)) + '.'
          ])
        };
      }
      var kg = P([0.5, 1.2, 3, 7.5]), EMJ = C.roundSig(kg * f.pc, 4), a = EMJ / f.pc;
      return {
        type: 'Retrouver une masse brûlée', ask: ask('la masse m brûlée', 'kilogrammes (kg)'), unit: 'kg', answer: a,
        html: '<p>Une installation a libéré ' + m('\\QE = ' + q('MJ', EMJ, 4)) + ' en brûlant ' + du(f.n) + '.</p><p>Quelle masse ' + m('\\Qm') + ' a été brûlée ?</p>' + data([pcData(f)]),
        traps: [
          { value: EMJ * f.pc, msg: 'C’est une division : ' + m('\\Qm = \\dfrac{\\QE}{\\QPC}') + '.' },
          { value: a * 1000, msg: 'Ce résultat est en <b>grammes</b>. La question demande des kilogrammes.' },
          { value: f.pc / EMJ, msg: 'C’est l’inverse : ' + m('\\Qm = \\dfrac{\\QE}{\\QPC}') + ', l’énergie au numérateur.' }
        ],
        solution: steps([
          'De ' + m('\\QE = \\Qm \\times \\QPC') + ' on tire ' + m('\\Qm = \\dfrac{\\QE}{\\QPC}') + ' (MJ divisés par MJ/kg : des kg).',
          m('\\Qm = \\dfrac{' + T(EMJ, 4) + '}{' + T(f.pc, 4) + '} = ' + q('kg', a)) + '.'
        ])
      };
    }

    /* ---- PC = Q / Δm (exercice 14.2) ---- */
    function findPC() {
      var f = P([ALCOHOLS.propan1, ALCOHOLS.propan2, FUELS.ethanol, FUELS.butane, FUELS.propane, FUELS.kerosene, FUELS.methane]);
      var g = P([200, 250, 400, 500, 600, 800]), QkJ = C.roundSig(g * f.pc, 3), ans = QkJ / g;
      return {
        type: 'Pouvoir calorifique : PC = Q / Δm', ask: ask('le pouvoir calorifique PC', 'MJ·kg⁻¹'), unit: 'MJ·kg⁻¹', answer: ans,
        html: '<p>La combustion complète d’une masse ' + m('\\Qdm = ' + q('g', g)) + ' d’un échantillon ' + du(f.n) + ' libère ' + m('\\QQ = ' + sci(QkJ, 3) + '\\ \\mathrm{kJ}') + ' d’énergie.</p><p>Calcule le pouvoir calorifique ' + m('\\QPC') + ' de ce combustible.</p>',
        traps: [
          { value: ans / 1000, msg: 'Unités : ' + m('\\QQ') + ' en joules et ' + m('\\Qdm') + ' en <b>kilogrammes</b> (' + m(T(g) + '\\ \\mathrm{g} = ' + T(g / 1000) + '\\ \\mathrm{kg}') + ').' },
          { value: ans * 1e6, msg: 'Ce résultat est en <b>J/kg</b>. La question demande des MJ/kg : divise par ' + m('10^{6}') + '.' },
          { value: g / QkJ, msg: 'C’est l’inverse : ' + m('\\QPC = \\dfrac{\\QQ}{\\Qdm}') + ', l’énergie au numérateur.' }
        ],
        solution: steps([
          'Unités SI : ' + m('\\QQ = ' + sci(QkJ, 3) + '\\ \\mathrm{kJ} = ' + sci(QkJ * 1e3, 3) + '\\ \\mathrm{J}') + ' ; ' + m('\\Qdm = ' + q('g', g) + ' = ' + q('kg', g / 1000)) + '.',
          m('\\QPC = \\dfrac{\\QQ}{\\Qdm} = \\dfrac{' + sci(QkJ * 1e3, 3) + '}{' + T(g / 1000) + '} = ' + sci(ans * 1e6, 3) + '\\ \\mathrm{J\\cdot kg^{-1}} = ' + T(ans) + UPC) + '.',
          'Valeur proche de celle ' + du(f.n) + ' (' + m(T(f.pc, 4) + UPC) + ').'
        ])
      };
    }

    /* ---- identifier un combustible par son PC (exercice 14.3) ---- */
    function identify() {
      var alcohols = rng() < 0.4, pool, right;
      if (alcohols) {
        right = P([ALCOHOLS.propan1, ALCOHOLS.propan2]);
        pool = [ALCOHOLS.propan1, ALCOHOLS.propan2, FUELS.ethanol, FUELS.butane];
      } else {
        right = P([FUELS.methane, FUELS.propane, FUELS.butane, FUELS.h2, FUELS.essence, FUELS.ethanol, FUELS.kerosene]);
        pool = [right].concat(shuffle([FUELS.methane, FUELS.propane, FUELS.butane, FUELS.h2, FUELS.essence, FUELS.ethanol, FUELS.kerosene].filter(function (x) { return x !== right; })).slice(0, 3));
      }
      var g = P([150, 250, 400, 500]), QkJ = C.roundSig(g * right.pc, 4), pc = QkJ / g;
      function label(f) { return f.n + ' (' + C.fmtNum(f.pc, 4) + ' MJ·kg⁻¹)'; }
      return mcq({
        type: 'Identifier un combustible',
        html: '<p>On brûle complètement ' + m(q('g', g)) + ' d’un combustible inconnu' + (alcohols ? ', de formule brute ' + m('\\mathrm{C_3H_8O}') : '') + '. L’énergie libérée vaut ' + m('\\QQ = ' + sci(QkJ, 4) + '\\ \\mathrm{kJ}') + '.</p><p>De quel combustible s’agit-il ?</p>',
        solution: '<p>' + m('\\QPC = \\dfrac{\\QQ}{\\Qdm} = \\dfrac{' + sci(QkJ * 1e3, 4) + '\\ \\mathrm{J}}{' + T(g / 1000) + '\\ \\mathrm{kg}} = ' + T(pc, 4) + UPC) + ' : c’est ' + (vowel(right.n) ? 'l’' : 'le ') + right.n + '.</p>' +
          (alcohols ? '<p>Le propan-1-ol et le propan-2-ol ont la même formule brute ' + m('\\mathrm{C_3H_8O}') + ' mais des pouvoirs calorifiques différents : ce sont deux molécules différentes (des isomères).</p>' : '')
      }, label(right), shuffle(pool.filter(function (x) { return x !== right; })).map(function (x) {
        return { html: label(x), why: 'Le calcul donne ' + m('\\QPC = ' + T(pc, 4) + UPC) + ', pas ' + m(T(x.pc, 4)) + '. Divise l’énergie en J par la masse en kg.' };
      }));
    }

    /* ---- même énergie, autre combustible (exercice 22.1) ---- */
    var EQUIV = [
      function () { var t = P([25, 28]); return { a: FUELS.h2, b: FUELS.essence, x: t, u: 't', text: 'Ariane 5 emporte ' + m(q('t', t)) + ' de dihydrogène.', want: 'Quelle masse d’essence SP95 libérerait la même énergie ?' }; },
      function () { var kg = P([1, 2, 5]); return { a: FUELS.h2, b: FUELS.essence, x: kg, u: 'kg', text: 'On compare ' + m(q('kg', kg)) + ' de dihydrogène et de l’essence SP95.', want: 'Quelle masse d’essence libère autant d’énergie que ce dihydrogène ?' }; },
      function () { var kg = P([30, 35, 40]); return { a: FUELS.essence, b: FUELS.ethanol, x: kg, u: 'kg', text: 'Un plein contient ' + m(q('kg', kg)) + ' d’essence SP95.', want: 'Quelle masse d’éthanol faudrait-il brûler pour libérer la même énergie ?' }; },
      function () { var kg = P([10, 13, 35]); return { a: FUELS.butane, b: FUELS.ethanol, x: kg, u: 'kg', text: 'Une bouteille contient ' + m(q('kg', kg)) + ' de butane.', want: 'Quelle masse d’éthanol libère la même énergie ?' }; },
      function () { var kg = P([4, 10, 20]); return { a: FUELS.methane, b: FUELS.ethanol, x: kg, u: 'kg', text: 'Une chaudière brûle ' + m(q('kg', kg)) + ' de méthane.', want: 'Quelle masse d’éthanol libérerait la même énergie ?' }; }
    ];
    function equivalent() {
      var s = P(EQUIV)(), ans = s.x * s.a.pc / s.b.pc, unit = s.u === 't' ? 'tonnes (t)' : 'kilogrammes (kg)';
      return {
        type: 'Même énergie, autre combustible', ask: ask('la masse', unit), unit: s.u, answer: ans,
        html: '<p>' + s.text + '</p><p>' + s.want + '</p>' + data([pcData(s.a), pcData(s.b)]),
        traps: [
          { value: s.x * s.b.pc / s.a.pc, msg: 'Rapport à l’envers : le combustible au PC le plus faible demande <b>plus</b> de masse pour la même énergie.' },
          { value: s.x, msg: 'Même masse ne veut pas dire même énergie : les deux PC sont différents.' },
          { value: s.x * s.a.pc, msg: 'Ça, c’est l’énergie ' + m('\\QE = \\Qm \\times \\QPC') + ' en ' + (s.u === 't' ? 'GJ' : 'MJ') + '. Divise-la ensuite par le PC de l’autre combustible.' }
        ],
        solution: steps([
          'Énergie libérée : ' + m('\\QE = ' + T(s.x, 4) + ' \\times ' + T(s.a.pc, 4) + ' = ' + T(s.x * s.a.pc, 4) + '\\ \\mathrm{' + (s.u === 't' ? 'GJ' : 'MJ') + '}') + (s.u === 't' ? ' (des tonnes fois des MJ/kg donnent des GJ)' : '') + '.',
          'Même énergie avec ' + (vowel(s.b.n) ? 'l’' : 'le ') + s.b.n + ' : ' + m('\\Qm = \\dfrac{\\QE}{\\QPC} = \\dfrac{' + T(s.x * s.a.pc, 4) + '}{' + T(s.b.pc, 4) + '} = ' + q(s.u, ans)) + '.',
          'Raccourci : ' + m('\\Qm = ' + T(s.x, 4) + ' \\times \\dfrac{' + T(s.a.pc, 4) + '}{' + T(s.b.pc, 4) + '}') + ' ; le rapport des PC vaut ' + m(T(s.a.pc / s.b.pc)) + '.'
        ])
      };
    }

    /* ---- consommation d'un carburant (exercice 16) ---- */
    function consumption() {
      var Cl = P([5.5, 6, 6.5, 7, 7.5, 8]), s = P([15, 20, 25, 30]), V = Cl * (1 + s / 100), kg = 0.789 * V, E = kg * 26.8;
      var what = P(['V', 'm', 'E']);
      var html = '<p>Une voiture roulant à l’éthanol consomme ' + m(T(s) + '\\ \\%') + ' de plus qu’une voiture à essence qui consomme en moyenne ' + m(q('L', Cl)) + ' aux 100 km.</p>';
      var d = [m('\\Qrho_{\\text{éthanol}} = 789' + URHO), pcData(FUELS.ethanol)];
      var vLine = m('\\QV = ' + T(Cl) + ' \\times (1 + \\dfrac{' + T(s) + '}{100}) = ' + T(Cl) + ' \\times ' + T(1 + s / 100) + ' = ' + q('L', V, 4)) + '.';
      var mLine = m('\\Qm = \\Qrho \\times \\QV = 789 \\times ' + T(V / 1000, 4) + ' = ' + q('kg', kg, 4)) + ' (avec ' + m('\\QV = ' + T(V / 1000, 4) + '\\ \\mathrm{m^{3}}') + ').';
      if (what === 'V') {
        return {
          type: 'Consommation : volume', ask: ask('le volume V d’éthanol', 'litres (L)'), unit: 'L', answer: V,
          html: html + '<p>Quel volume ' + m('\\QV') + ' d’éthanol consomme-t-elle pour parcourir 100 km ?</p>',
          traps: [
            { value: Cl * s / 100, msg: 'Ça, c’est seulement la <b>surconsommation</b>. Ajoute-la aux ' + m(q('L', Cl)) + ' : ' + m('\\QV = ' + T(Cl) + ' \\times ' + T(1 + s / 100)) + '.' },
            { value: Cl + s, msg: s + ' % n’est pas ' + s + ' litres : on prend ' + s + ' % <b>de</b> ' + m(q('L', Cl)) + '.' },
            { value: Cl * (1 - s / 100), msg: 'Surconsommation : la voiture à l’éthanol consomme <b>plus</b>, on multiplie par ' + m(T(1 + s / 100)) + '.' }
          ],
          solution: steps(['Augmenter de ' + m(T(s) + '\\ \\%') + ', c’est multiplier par ' + m('1 + \\dfrac{' + T(s) + '}{100} = ' + T(1 + s / 100)) + '.', vLine])
        };
      }
      if (what === 'm') {
        return {
          type: 'Consommation : masse', ask: ask('la masse m d’éthanol', 'kilogrammes (kg)'), unit: 'kg', answer: kg,
          html: html + '<p>Calcule la masse ' + m('\\Qm') + ' d’éthanol consommée pour parcourir 100 km.</p>' + data(d.slice(0, 1)),
          traps: [
            { value: V, msg: 'Un litre d’éthanol n’a pas une masse de 1 kg : ' + m('\\Qm = \\Qrho \\times \\QV') + '.' },
            { value: kg * 1000, msg: m('\\Qrho') + ' est en ' + m('\\mathrm{kg\\cdot m^{-3}}') + ' : le volume doit être en ' + m('\\mathrm{m^{3}}') + ' (' + m('1\\ \\mathrm{L} = 10^{-3}\\ \\mathrm{m^{3}}') + ').' },
            { value: 0.789 * Cl, msg: 'Il faut le volume d’<b>éthanol</b>, surconsommation comprise : ' + m('\\QV = ' + q('L', V, 4)) + '.' }
          ],
          solution: steps([vLine, mLine])
        };
      }
      return {
        type: 'Consommation : énergie', ask: ask('l’énergie E', 'mégajoules (MJ)'), unit: 'MJ', answer: E,
        html: html + '<p>Calcule l’énergie ' + m('\\QE') + ' fournie par la combustion de l’éthanol consommé sur 100 km.</p>' + data(d),
        traps: [
          { value: V * 26.8, msg: 'Le PC est une énergie <b>par kilogramme</b> : calcule d’abord la masse ' + m('\\Qm = \\Qrho \\times \\QV') + '.' },
          { value: 0.789 * Cl * 26.8, msg: 'Il faut le volume d’<b>éthanol</b>, surconsommation comprise : ' + m('\\QV = ' + q('L', V, 4)) + '.' },
          { value: E * 1000, msg: 'Le volume doit être en ' + m('\\mathrm{m^{3}}') + ' avec ' + m('\\Qrho') + ' en ' + m('\\mathrm{kg\\cdot m^{-3}}') + '.' }
        ],
        solution: steps([vLine, mLine, m('\\QE = \\Qm \\times \\QPC = ' + T(kg, 4) + ' \\times 26{,}8 = ' + q('MJ', E)) + '.'])
      };
    }

    /* ---- TP : mesurer un pouvoir calorifique avec une canette d'eau (lien chapitre 2) ---- */
    function tp() {
      var f, mw, Ti, dm, eta, dT, k;
      for (k = 0; k < 40; k++) {
        f = P([FUELS.ethanol, FUELS.butane]); mw = P([150, 200, 250, 300]); Ti = P([16, 18, 20]);
        dm = P([0.8, 1, 1.2, 1.5, 2]); eta = P([0.35, 0.4, 0.45, 0.5, 0.55, 0.6]);
        dT = Math.round(eta * dm / 1000 * f.pc * 1e6 / (mw / 1000 * C_EAU) * 2) / 2;
        if (dT >= 8 && dT <= 60) break;
      }
      var Tf = Ti + dT, Q = mw / 1000 * C_EAU * dT, pc = Q / (dm / 1000) / 1e6, eff = pc / f.pc * 100, wantEta = rng() < 0.3;
      var lamp = f === FUELS.ethanol ? 'une lampe à alcool (éthanol)' : 'un petit réchaud à butane';
      var html = '<p>En TP, on chauffe ' + m(q('g', mw)) + ' d’eau dans une canette avec ' + lamp + '. La température de l’eau passe de ' + m(T(Ti) + DEG) + ' à ' + m(T(Tf, 4) + DEG) + ' ; la masse de combustible a diminué de ' + m('\\Qdm = ' + q('g', dm)) + '.</p>';
      var s1 = 'Énergie reçue par l’eau (chapitre 2) : ' + m('\\QQ_{\\text{eau}} = \\Qm_{\\text{eau}} \\times \\Qc \\times \\QdT = ' + T(mw / 1000) + ' \\times ' + T(C_EAU, 4) + ' \\times ' + T(dT, 4) + ' = ' + q('J', Q, 4)) + '.';
      var s2 = m('\\QPC_{\\text{mesuré}} = \\dfrac{\\QQ_{\\text{eau}}}{\\Qdm} = \\dfrac{' + T(Q, 4) + '}{' + T(dm / 1000) + '} = ' + sci(pc * 1e6, 3) + '\\ \\mathrm{J\\cdot kg^{-1}} = ' + T(pc) + UPC) + '.';
      if (wantEta) {
        return {
          type: 'TP : part de l’énergie reçue', ask: 'Donne le pourcentage, à 3 chiffres significatifs.', unit: '%', answer: eff,
          html: html + '<p>Quel pourcentage de l’énergie libérée par la combustion l’eau a-t-elle reçu ?</p>' + data([m('\\Qc_{\\text{eau}} = 4\\,180' + UC), pcData(f)]),
          traps: [
            { value: 100 - eff, msg: 'Ça, c’est la part <b>perdue</b> (air, canette, flamme). La question demande la part reçue par l’eau.' },
            { value: f.pc / pc * 100, msg: 'Rapport à l’envers : part reçue = ' + m('\\dfrac{\\QQ_{\\text{eau}}}{\\QE}') + ', toujours inférieure à 100 %.' },
            { value: eff / 100, msg: 'Exprime le résultat en <b>pourcentage</b> : multiplie par 100.' }
          ],
          solution: steps([
            s1,
            'Énergie libérée par la combustion : ' + m('\\QE = \\Qdm \\times \\QPC = ' + T(dm / 1000) + ' \\times ' + sci(f.pc * 1e6, 4) + ' = ' + q('J', dm / 1000 * f.pc * 1e6, 4)) + '.',
            'Part reçue par l’eau : ' + m('\\dfrac{\\QQ_{\\text{eau}}}{\\QE} = \\dfrac{' + T(Q, 4) + '}{' + T(dm / 1000 * f.pc * 1e6, 4) + '} \\approx ' + T(eff) + '\\ \\%') + '. Le reste chauffe l’air et la canette.'
          ])
        };
      }
      return {
        type: 'TP : mesurer un PC', ask: ask('le pouvoir calorifique mesuré', 'MJ·kg⁻¹'), unit: 'MJ·kg⁻¹', answer: pc,
        html: html + '<p>On suppose que l’eau reçoit toute l’énergie libérée. Calcule le pouvoir calorifique ' + m('\\QPC') + ' mesuré.</p>' + data([m('\\Qc_{\\text{eau}} = 4\\,180' + UC)]),
        traps: [
          { value: pc * 1000, msg: 'La masse d’eau doit être en <b>kilogrammes</b> : ' + m(T(mw) + '\\ \\mathrm{g} = ' + T(mw / 1000) + '\\ \\mathrm{kg}') + '.' },
          { value: pc / 1000, msg: 'La masse brûlée doit être en <b>kilogrammes</b> : ' + m(T(dm) + '\\ \\mathrm{g} = ' + T(dm / 1000) + '\\ \\mathrm{kg}') + '.' },
          { value: pc * Tf / dT, msg: 'Il faut l’<b>élévation</b> de température ' + m('\\QdT = ' + T(Tf, 4) + ' - ' + T(Ti) + ' = ' + T(dT, 4) + DEG) + ', pas la température finale.' },
          { value: pc * 1e6, msg: 'Ce résultat est en <b>J/kg</b>. La question demande des MJ/kg : divise par ' + m('10^{6}') + '.' }
        ],
        solution: steps([
          s1, s2,
          'Valeur de référence : ' + m(T(f.pc, 4) + UPC) + '. La mesure est plus faible : une partie de l’énergie chauffe l’air et la canette (seulement ' + m(T(eff) + '\\ \\%') + ' va dans l’eau).'
        ])
      };
    }

    /* ---- masse de combustible pour chauffer de l'eau (lien chapitres 1 et 2) ---- */
    function heatFuel() {
      var f = P([FUELS.butane, FUELS.propane, FUELS.methane]), V = P([0.5, 1, 1.5, 2]), Ti = P([12, 15, 20]), eta = P([30, 40, 50, 60]);
      var Q = V * C_EAU * (100 - Ti), E = Q / (eta / 100), g = E / (f.pc * 1e6) * 1000;
      var where = f === FUELS.methane ? 'une gazinière (méthane)' : 'un réchaud ' + (f === FUELS.butane ? 'à butane' : 'au propane');
      return {
        type: 'Chauffer de l’eau avec un combustible', ask: ask('la masse de combustible', 'grammes (g)'), unit: 'g', answer: g,
        html: '<p>On porte ' + m(q('L', V)) + ' d’eau (' + m('\\Qm = ' + q('kg', V)) + ') de ' + m(T(Ti) + DEG) + ' à ' + m('100' + DEG) + ' sur ' + where + '. Seuls ' + m(T(eta) + '\\ \\%') + ' de l’énergie libérée par la flamme chauffent l’eau.</p><p>Quelle masse ' + m('\\Qm') + ' ' + de(f.n) + ' faut-il brûler ?</p>' + data([m('\\Qc_{\\text{eau}} = 4\\,180' + UC), pcData(f)]),
        traps: [
          { value: g * eta / 100, msg: 'Tu as oublié les pertes : la flamme doit libérer <b>plus</b> que ce que l’eau reçoit, ' + m('\\QE = \\dfrac{\\QQ_{\\text{eau}}}{' + T(eta / 100) + '}') + '.' },
          { value: g * Math.pow(eta / 100, 2), msg: 'On <b>divise</b> par la part utile (' + m(T(eta / 100)) + ') : l’énergie libérée est plus grande que l’énergie reçue par l’eau.' },
          { value: g / 1000, msg: 'Ce résultat est en <b>kilogrammes</b>. La question demande des grammes.' }
        ],
        solution: steps([
          'Énergie reçue par l’eau : ' + m('\\QQ_{\\text{eau}} = ' + T(V) + ' \\times ' + T(C_EAU, 4) + ' \\times (100 - ' + T(Ti) + ') = ' + q('J', Q, 4)) + '.',
          'Seuls ' + m(T(eta) + '\\ \\%') + ' de l’énergie libérée arrivent à l’eau : ' + m('\\QE = \\dfrac{' + T(Q, 4) + '}{' + T(eta / 100) + '} = ' + q('J', E, 4)) + '.',
          m('\\Qm = \\dfrac{\\QE}{\\QPC} = \\dfrac{' + T(E, 4) + '}{' + sci(f.pc * 1e6, 4) + '} = ' + T(g / 1000) + '\\ \\mathrm{kg} = ' + q('g', g)) + '.'
        ])
      };
    }

    /* ---- QCM du cours ---- */
    function role() {
      var s = P(SITUATIONS), keys = ['combustible', 'comburant', 'activation', 'produit'];
      return mcq({
        type: 'Combustible, comburant, énergie d’activation',
        html: '<p>' + s.n + '</p><p>Dans cette combustion, <b>' + s.what + '</b> est :</p>',
        solution: '<p>' + cap(s.what) + ' est ' + ROLES[s.role] + '. ' + ROLE_WHY[s.role] + '</p>'
      }, ROLES[s.role], keys.filter(function (k) { return k !== s.role; }).map(function (k) { return { html: ROLES[k], why: ROLE_WHY[k] }; }));
    }
    function exoEndo() {
      var s = P(THERMO), exo = 'exothermique : elle libère de l’énergie thermique', endo = 'endothermique : elle absorbe de l’énergie thermique';
      return mcq({
        type: 'Exothermique ou endothermique',
        html: '<p>' + s.n + '</p><p>Cette transformation chimique est :</p>',
        solution: '<p>' + (s.s > 0 ? '<b>Exothermique</b> : elle libère de l’énergie thermique, le milieu extérieur se réchauffe.' : '<b>Endothermique</b> : elle absorbe de l’énergie thermique, le milieu extérieur se refroidit.') + '</p>'
      }, s.s > 0 ? exo : endo, [
        { html: s.s > 0 ? endo : exo, why: s.s > 0 ? 'Le milieu se réchauffe : la transformation <b>libère</b> de l’énergie, elle est exothermique.' : 'Le milieu se refroidit (ou il faut chauffer sans arrêt) : la transformation <b>absorbe</b> de l’énergie, elle est endothermique.' },
        { html: 'ni l’un ni l’autre : il n’y a pas d’échange d’énergie', why: 'La température du milieu change : il y a forcément un échange d’énergie.' }
      ]);
    }
    var FIRE = [
      function () { return mcq({ type: 'Éteindre un feu', ref: 'c-triangle', html: '<p>Un morceau de fusain (carbone pur) brûle dans un flacon fermé rempli de dioxygène. La combustion s’arrête alors qu’il reste du fusain. Pourquoi ?</p>', solution: '<p>Le <b>dioxygène</b>, le comburant, a été entièrement consommé : sans comburant, la combustion ne peut pas continuer (il reste du combustible).</p>' },
        'le dioxygène (le comburant) a été entièrement consommé', [{ html: 'il n’y a plus d’énergie d’activation', why: 'Une combustion s’<b>auto-entretient</b> : l’énergie qu’elle libère sert d’énergie d’activation. Il manque autre chose.' }, { html: 'le fusain n’est pas un combustible', why: 'Le carbone du fusain brûle bien : c’est le combustible.' }, { html: 'le dioxyde de carbone formé est devenu le combustible', why: 'Le dioxyde de carbone est un <b>produit</b> de la combustion ; il ne brûle pas.' }]); },
      function () { return mcq({ type: 'Éteindre un feu', ref: 'c-extinction', html: '<p>L’huile d’une friteuse prend feu. Que faut-il faire ?</p>', solution: '<p>Couper le chauffage et <b>étouffer</b> le feu avec un couvercle ou une couverture anti-feu : on supprime le comburant (le dioxygène de l’air).</p>' },
        'couper le chauffage et couvrir avec un couvercle ou une couverture anti-feu', [{ html: 'verser de l’eau sur les flammes', why: 'Jamais d’eau sur de l’huile en feu : l’eau se vaporise d’un coup et projette l’huile enflammée (boule de feu).' }, { html: 'souffler fort sur les flammes', why: 'Souffler apporte encore plus de dioxygène, le comburant : le feu repart de plus belle.' }, { html: 'transporter la friteuse dehors', why: 'On risque de renverser l’huile enflammée et de se brûler. On étouffe le feu sur place.' }]); },
      function () { return mcq({ type: 'Triangle du feu', ref: 'c-extinction', html: '<p>On jette une couverture anti-feu sur une poubelle qui brûle. Quel élément du triangle du feu supprime-t-on ?</p>', solution: '<p>Le <b>comburant</b> : la couverture empêche le dioxygène de l’air d’arriver au feu (on l’étouffe).</p>' },
        'le comburant', [{ html: 'le combustible', why: 'Les déchets (le combustible) sont toujours là, sous la couverture.' }, { html: 'l’énergie d’activation', why: 'La couverture ne refroidit pas vraiment : elle coupe l’arrivée d’air.' }]); },
      function () { return mcq({ type: 'Triangle du feu', ref: 'c-extinction', html: '<p>Une gazinière brûle. On ferme le robinet d’arrivée du gaz. Quel élément du triangle du feu supprime-t-on ?</p>', solution: '<p>Le <b>combustible</b> : le méthane (gaz naturel) n’arrive plus, la flamme s’éteint.</p>' },
        'le combustible', [{ html: 'le comburant', why: 'L’air (et son dioxygène) est toujours là : c’est le gaz qui n’arrive plus.' }, { html: 'l’énergie d’activation', why: 'On n’a rien refroidi : on a coupé l’arrivée du gaz qui brûle.' }]); },
      function () { return mcq({ type: 'Triangle du feu', ref: 'c-extinction', html: '<p>Les pompiers arrosent un feu de forêt avec beaucoup d’eau. Quel élément du triangle du feu supprime-t-on surtout ?</p>', solution: '<p>L’<b>énergie d’activation</b> : l’eau refroidit le bois en dessous de la température où il peut s’enflammer ; la combustion ne s’auto-entretient plus.</p>' },
        'l’énergie d’activation (on refroidit)', [{ html: 'le combustible', why: 'Le bois est toujours là, mouillé : c’est sa température qui a baissé.' }, { html: 'le comburant', why: 'L’air est toujours présent autour de la forêt.' }]); },
      function () { return mcq({ type: 'Éteindre un feu', ref: 'c-extinction', html: '<p>Un extincteur à dioxyde de carbone éteint un feu car :</p>', solution: '<p>Le dioxyde de carbone, qui ne brûle pas, <b>chasse le dioxygène</b> de l’air autour du feu : on supprime le comburant.</p>' },
        'il chasse le dioxygène de l’air : il prive le feu de comburant', [{ html: 'le dioxyde de carbone est un combustible', why: 'Le dioxyde de carbone ne brûle pas : c’est un produit de combustion.' }, { html: 'il apporte de l’énergie d’activation', why: 'Apporter de l’énergie relancerait le feu au lieu de l’éteindre.' }, 'il transforme le combustible en eau']); }
    ];
    function fire() { return P(FIRE)(); }
    var DANGERS = [
      function () { return mcq({ type: 'Combustion incomplète', ref: 'c-incomplete', html: '<p>Une combustion est incomplète lorsque :</p>', solution: '<p>Le <b>dioxygène</b> de l’air n’est pas en quantité suffisante.</p>' },
        'le dioxygène de l’air n’est pas en quantité suffisante', [{ html: 'il y a trop de dioxygène', why: 'Avec beaucoup de dioxygène, la combustion est au contraire <b>complète</b>.' }, { html: 'le combustible a un trop grand pouvoir calorifique', why: 'Le PC ne décide pas si la combustion est complète : c’est la quantité de dioxygène.' }, 'l’énergie d’activation est trop grande']); },
      function () { return mcq({ type: 'Combustion incomplète', ref: 'c-incomplete', html: '<p>Une combustion incomplète produit, en plus de l’eau et du dioxyde de carbone :</p>', solution: '<p>Du <b>carbone</b> (suies, fumées noires) et du <b>monoxyde de carbone</b> CO, un gaz toxique.</p>' },
        'du carbone et du monoxyde de carbone', [{ html: 'du dioxygène et du dihydrogène', why: 'Le dioxygène est un réactif (consommé), pas un produit.' }, { html: 'seulement plus de dioxyde de carbone', why: 'Le manque de dioxygène produit au contraire du carbone et du monoxyde de carbone, moins oxydés.' }, 'de l’ozone et de l’azote']); },
      function () { return mcq({ type: 'Dangers des combustions', ref: 'c-risques', html: '<p>Le monoxyde de carbone CO est particulièrement dangereux parce que :</p>', solution: '<p>Il est <b>toxique</b> (intoxication, asphyxie) et <b>incolore et inodore</b> : seul un détecteur de monoxyde de carbone peut le signaler.</p>' },
        'il est toxique, incolore et inodore', [{ html: 'il a une odeur très forte', why: 'Justement non : il ne se sent pas, d’où l’intérêt d’un détecteur.' }, { html: 'il est le comburant des combustions', why: 'Le comburant est le dioxygène. Le CO est un produit de combustion incomplète.' }, 'il colore la flamme en bleu']); },
      function () { var p = P([['faire entretenir la chaudière chaque année', true], ['ventiler les pièces où fonctionne un appareil à combustion', true], ['installer un détecteur de monoxyde de carbone', false], ['installer un détecteur de fumée', false], ['avoir un extincteur dans la cuisine', false]]);
        return mcq({ type: 'Prévention ou protection', ref: 'c-risques', html: '<p>« ' + cap(p[0]) + ' » est un moyen :</p>', solution: '<p>' + (p[1] ? 'De <b>prévention</b> : il évite que le danger apparaisse (entretien des installations, ventilation des pièces).' : 'De <b>protection</b> : il ne supprime pas le danger, il alerte ou il aide à réagir quand il survient (détecteurs, extincteur).') + '</p>' },
          p[1] ? 'de prévention' : 'de protection', [{ html: p[1] ? 'de protection' : 'de prévention', why: p[1] ? 'Un moyen de protection alerte ou aide à réagir (détecteur, extincteur). Ici, on empêche le danger d’apparaître.' : 'Un moyen de prévention empêche le danger d’apparaître (entretien, ventilation). Ici, on est alerté ou on réagit.' }]); },
      function () { return mcq({ type: 'Dangers des combustions', ref: 'c-risques', html: '<p>Quels sont les risques liés aux combustions cités dans le cours ?</p>', solution: '<p><b>Asphyxie, intoxication, explosion, incendie.</b></p>' },
        'asphyxie, intoxication, explosion, incendie', [{ html: 'électrocution et irradiation', why: 'Ces risques concernent l’électricité et la radioactivité, pas les combustions.' }, 'gel et noyade', 'uniquement des brûlures légères']); }
    ];
    function danger() { return P(DANGERS)(); }
    var CONCEPTS = [
      function () { return mcq({ type: 'Système chimique', ref: 'c-systeme', html: '<p>Pour décrire l’état d’un système chimique, on précise :</p>', solution: '<p>La <b>nature</b> des espèces chimiques, leur <b>état physique</b>, la <b>température</b> et la <b>pression</b>.</p>' },
        'la nature des espèces chimiques, leur état physique, la température et la pression', [{ html: 'seulement la masse totale du système', why: 'La masse ne dit pas quelles espèces sont présentes ni dans quelles conditions.' }, 'seulement la couleur des espèces', 'la vitesse du système']); },
      function () { return mcq({ type: 'Transformation chimique', ref: 'c-transformation', html: '<p>Au cours d’une transformation chimique :</p>', solution: '<p>Les <b>réactifs</b> disparaissent (au moins en partie) et des <b>produits</b> apparaissent.</p>' },
        'des réactifs disparaissent et des produits apparaissent', [{ html: 'des produits disparaissent et des réactifs apparaissent', why: 'C’est l’inverse : les <b>réactifs</b> sont consommés, les <b>produits</b> sont formés.' }, { html: 'les espèces chimiques restent les mêmes', why: 'Ça, c’est une transformation physique (changement d’état, par exemple).' }]); },
      function () { return mcq({ type: 'Pouvoir calorifique', ref: 'c-pc', html: '<p>Le pouvoir calorifique d’un combustible est :</p>', solution: '<p>L’énergie thermique dégagée lors de la combustion <b>complète</b> d’un kilogramme de combustible avec le dioxygène.</p>' },
        'l’énergie thermique dégagée par la combustion complète d’un kilogramme de combustible', [{ html: 'la température de la flamme', why: 'Le PC est une énergie par kilogramme, pas une température.' }, { html: 'l’énergie qu’il faut pour allumer le combustible', why: 'Ça, c’est l’énergie d’activation.' }, 'la masse de dioxygène nécessaire']); },
      function () { return mcq({ type: 'Pouvoir calorifique', ref: 'c-pc', html: '<p>L’unité du pouvoir calorifique dans le système international est :</p>', solution: '<p>Le <b>joule par kilogramme</b> ' + m('\\mathrm{J\\cdot kg^{-1}}') + ' (on l’exprime souvent en ' + m('\\mathrm{MJ\\cdot kg^{-1}}') + ' ; on le donne parfois en ' + m('\\mathrm{J\\cdot mol^{-1}}') + ').</p>' },
        m('\\mathrm{J\\cdot kg^{-1}}'), [{ html: m('\\mathrm{J}'), why: 'Le joule est l’unité d’une énergie. Le PC est une énergie <b>par kilogramme</b>.' }, { html: m('\\mathrm{J\\cdot kg^{-1}\\cdot {}^{\\circ}C^{-1}}'), why: 'Ça, c’est l’unité de la capacité thermique massique ' + m('\\Qc') + ' (chapitre 2).' }, { html: m('\\mathrm{W}'), why: 'Le watt est l’unité d’une puissance (chapitre 1).' }]); },
      function () { return mcq({ type: 'Combustion', ref: 'c-combustion', html: '<p>Une fois amorcée, une combustion :</p>', solution: '<p>Elle <b>s’auto-entretient</b> : l’énergie qu’elle libère sert d’énergie d’activation pour la suite, tant qu’il reste du combustible et du comburant.</p>' },
        's’auto-entretient tant qu’il reste du combustible et du comburant', [{ html: 'a besoin d’une étincelle en permanence', why: 'L’étincelle ne sert qu’à l’amorcer : ensuite la réaction elle-même fournit l’énergie d’activation.' }, 'absorbe de l’énergie thermique', 's’arrête dès qu’on retire la flamme de l’allumette']); },
      function () { return mcq({ type: 'Combustion complète', ref: 'c-complete', html: '<p>La combustion complète du méthane ' + m('\\mathrm{CH_4}') + ' dans le dioxygène produit :</p>', solution: '<p>Du <b>dioxyde de carbone</b> et de l’<b>eau</b> : ' + m('\\mathrm{CH_4 + 2\\,O_2 \\rightarrow CO_2 + 2\\,H_2O}') + '.</p>' },
        'du dioxyde de carbone et de l’eau', [{ html: 'du monoxyde de carbone et du carbone', why: 'Ces produits apparaissent quand le dioxygène manque : combustion <b>incomplète</b>.' }, 'du dihydrogène et du dioxygène', 'du méthane et de l’eau']); },
      function () { return mcq({ type: 'Exothermique ou endothermique', ref: 'c-exo-endo', html: '<p>Une combustion est une transformation :</p>', solution: '<p><b>Exothermique</b> : elle libère de l’énergie thermique (c’est pour ça qu’on brûle des combustibles).</p>' },
        'exothermique', [{ html: 'endothermique', why: 'Une combustion chauffe son environnement : elle libère de l’énergie, elle est exothermique.' }, 'ni exothermique ni endothermique']); },
      function () { return mcq({ type: 'Pouvoir calorifique', ref: 'c-table', html: '<p>D’après le tableau des pouvoirs calorifiques, 1 kg de dihydrogène (120,5 MJ/kg) libère, par rapport à 1 kg d’essence SP95 (42,7 MJ/kg) :</p>', solution: '<p>' + m('\\dfrac{120{,}5}{42{,}7} \\approx 2{,}8') + ' : environ <b>trois fois plus</b> d’énergie.</p>' },
        'environ trois fois plus d’énergie', [{ html: 'environ trois fois moins d’énergie', why: 'Le dihydrogène a le plus grand PC du tableau : à masse égale, il libère plus.' }, { html: 'autant d’énergie', why: 'Les deux PC sont très différents : 120,5 contre 42,7 MJ/kg.' }, 'environ 78 fois plus d’énergie']); }
    ];
    function concept() { return P(CONCEPTS)(); }

    /* ---- tirage ---- */
    var RAW = {
      energy: energy, liquid: liquid, findMass: findMass, findPC: findPC, identify: identify, equivalent: equivalent,
      consumption: consumption, tp: tp, heatFuel: heatFuel, role: role, exoEndo: exoEndo, fire: fire, danger: danger, concept: concept
    };
    // carte du cours à revoir pour chaque type de question (lien « À revoir » après l'évaluation)
    var REF = {
      energy: 'c-energie', liquid: 'c-masse-volumique', findMass: 'c-methode', findPC: 'c-pc', identify: 'c-table', equivalent: 'c-energie',
      consumption: 'c-masse-volumique', tp: 'c-mesure', heatFuel: 'c-mesure', role: 'c-combustion', exoEndo: 'c-exo-endo',
      fire: 'c-extinction', danger: 'c-risques', concept: 'c-pc'
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
      energy: 3, liquid: 3, findMass: 2, findPC: 2, identify: 2, equivalent: 2, consumption: 2, tp: 2, heatFuel: 2,
      role: 2, exoEndo: 2, fire: 2, danger: 2, concept: 2
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
        pts(P(['role', 'exoEndo']), 2), pts(P(['fire', 'danger']), 2), pts('concept', 2),
        pts('energy', 3), pts('liquid', 3), pts(P(['findMass', 'findPC']), 3),
        pts(P(['consumption', 'equivalent']), 3), pts(P(['tp', 'heatFuel']), 2)
      ];
    }
    return { training: training, exam: exam, kinds: KINDS };
  }

  return {
    make: make, FUELS: FUELS, ALCOHOLS: ALCOHOLS, SITUATIONS: SITUATIONS, THERMO: THERMO, C_EAU: C_EAU, EXAM_QUESTIONS: 8
  };
});
