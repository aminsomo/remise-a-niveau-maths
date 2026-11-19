/* ==========================================================================
   Chapitre 1 — L'énergie et ses enjeux : banque de questions paramétrées.
   Inspirée des fiches d'exercices du chapitre (relation puissance-énergie,
   tableau d'appareils, moteur thermique, lampe solaire) et du cours
   (formes et sources d'énergie, chaîne énergétique, rendement, E = P × Δt).

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

  /* ---------- données du cours ---------- */
  // ordres de grandeur du cours + appareils des exercices
  var APPLIANCES = [
    { n: 'un réfrigérateur', P: 150 }, { n: 'un four à micro-ondes', P: 700 }, { n: 'un four électrique', P: 2200 },
    { n: 'une machine à laver', P: 3000 }, { n: 'une télévision', P: 100 }, { n: 'une ampoule', P: 40 },
    { n: 'une lampe de bureau', P: 60 }, { n: 'un lecteur DVD', P: 25 }, { n: 'un sèche-cheveux', P: 1200 }, { n: 'un radiateur électrique', P: 1500 }
  ];
  // durées : texte LaTeX et valeur en secondes
  function dur(h, min) {
    var tex = (h ? h + '\\ \\mathrm{h}' : '') + (h && min ? '\\ ' : '') + (min ? min + '\\ \\mathrm{min}' : '');
    return { tex: tex, s: (h * 60 + min) * 60, min: h * 60 + min, h: h + min / 60, hh: h, mm: min };
  }
  var DURATIONS = [dur(0, 5), dur(0, 10), dur(0, 12), dur(0, 15), dur(0, 20), dur(0, 45), dur(1, 15), dur(1, 30), dur(2, 0), dur(3, 10), dur(2, 45)];
  var FORMS = ['chimique', 'mécanique', 'électrique', 'thermique', 'rayonnement', 'nucléaire'];
  var CONVERTERS = [
    { n: 'un moteur thermique (diesel)', r: 'chimique', u: 'mécanique' },
    { n: 'un moteur électrique', r: 'électrique', u: 'mécanique' },
    { n: 'une cellule photovoltaïque', r: 'rayonnement', u: 'électrique' },
    { n: 'une ampoule', r: 'électrique', u: 'rayonnement' },
    { n: 'une batterie en charge', r: 'électrique', u: 'chimique' },
    { n: 'une batterie qui alimente une ampoule', r: 'chimique', u: 'électrique' },
    { n: 'l’alternateur d’une éolienne', r: 'mécanique', u: 'électrique' }
  ];
  var SOURCES = [
    { n: 'l’énergie hydraulique (barrage)', r: true }, { n: 'l’énergie solaire', r: true }, { n: 'l’énergie éolienne', r: true },
    { n: 'la géothermie', r: true, why: 'La chaleur du sous-sol se renouvelle en permanence : la géothermie est renouvelable.' },
    { n: 'la biomasse (bois, déchets végétaux)', r: true, why: 'La biomasse repousse en quelques années, rapide à l’échelle d’une vie humaine : elle est renouvelable.' },
    { n: 'le pétrole', r: false }, { n: 'le gaz naturel', r: false }, { n: 'le charbon', r: false },
    { n: 'l’énergie nucléaire (uranium)', r: false, why: 'L’uranium est extrait de mines et ne se reconstitue pas : le nucléaire n’est pas renouvelable.' }
  ];

  /* ---------- outils d'écriture ---------- */
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function m(t) { return '\\(' + t + '\\)'; }
  function q(unitTex, x, sig) { return T(x, sig) + '\\ \\mathrm{' + unitTex + '}'; }
  function steps(list) { return '<ol class="steps-list">' + list.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>'; }
  function ask(what, unit) { return 'Donne ' + what + ' en ' + unit + ', à 3 chiffres significatifs.'; }

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

    /* ---- E = P × Δt : énergie en joules (exercice 7.2) ---- */
    function energyJ() {
      var a = P(APPLIANCES), t = P(DURATIONS), E = a.P * t.s;
      return {
        type: 'Énergie en joules', ask: ask('l’énergie E', 'joules (J)'), unit: 'J', answer: E,
        html: '<p>' + cap(a.n) + ' de puissance ' + m('\\QP = ' + q('W', a.P)) + ' fonctionne pendant ' + m('\\Qt = ' + t.tex) + '.</p><p>Calcule l’énergie ' + m('\\QE') + ' qu’il reçoit.</p>',
        traps: [
          { value: a.P * t.min, msg: 'Tu as multiplié par des <b>minutes</b>. Pour obtenir des joules, ' + m('\\Qt') + ' doit être en <b>secondes</b> : 1 min = 60 s.' },
          { value: a.P * t.h, msg: 'Avec ' + m('\\Qt') + ' en heures, on obtient des <b>Wh</b>, pas des joules. Convertis la durée en secondes (1 h = 3 600 s).' },
          { value: E / 1000, msg: 'Ce résultat est en <b>kJ</b>. La question demande des joules.' },
          { value: a.P / t.s, msg: 'On <b>multiplie</b> : ' + m('\\QE = \\QP \\times \\Qt') + '.' }
        ],
        solution: steps([
          'Durée en secondes : ' + m('\\Qt = ' + t.tex + ' = ' + q('s', t.s, 6)) + '.',
          'Loi de Joule : ' + m('\\QE = \\QP \\times \\Qt = ' + T(a.P) + ' \\times ' + T(t.s, 6)) + '.',
          'Résultat : ' + m('\\QE = ' + q('J', E)) + '.'
        ])
      };
    }

    /* ---- E = P × Δt : énergie en kWh (exercices 7.2 et 8) ---- */
    function energyKWh() {
      var a = P(APPLIANCES), t = P(DURATIONS.filter(function (d) { return d.min >= 15; }));
      var E = a.P / 1000 * t.h;
      var traps = [
        { value: a.P * t.h, msg: 'Ce résultat est en <b>Wh</b> (puissance en W). Pour des kWh, la puissance doit être en kW : ' + m(T(a.P) + '\\ \\mathrm{W} = ' + T(a.P / 1000) + '\\ \\mathrm{kW}') + '.' },
        { value: a.P / 1000 * t.min, msg: 'La durée doit être en <b>heures</b> : ' + m(t.tex + ' = ' + T(t.h, 4) + '\\ \\mathrm{h}') + '.' },
        { value: a.P * t.s, msg: 'Ça, ce sont des <b>joules</b> (P en W, Δt en s). Pour des kWh : P en kW et Δt en h.' }
      ];
      if (t.hh && t.mm) traps.push({ value: a.P / 1000 * (t.hh + t.mm / 100), msg: m(t.tex) + ' ne vaut pas ' + m(T(t.hh + t.mm / 100, 4) + '\\ \\mathrm{h}') + ' : une heure compte 60 minutes, donc ' + m(t.mm + '\\ \\mathrm{min} = \\frac{' + t.mm + '}{60}\\ \\mathrm{h}') + '.' });
      return {
        type: 'Énergie en kWh', ask: ask('l’énergie E', 'kilowattheures (kWh)'), unit: 'kWh', answer: E, traps: traps,
        html: '<p>' + cap(a.n) + ' de puissance ' + m('\\QP = ' + q('W', a.P)) + ' fonctionne pendant ' + m('\\Qt = ' + t.tex) + '.</p><p>Quelle énergie ' + m('\\QE') + ' consomme-t-il, en kWh ?</p>',
        solution: steps([
          'Unités cohérentes : P en kW et Δt en h, alors E est en kWh.',
          m('\\QP = ' + q('kW', a.P / 1000)) + ' et ' + m('\\Qt = ' + t.tex + ' = ' + T(t.h, 4) + '\\ \\mathrm{h}') + '.',
          m('\\QE = \\QP \\times \\Qt = ' + T(a.P / 1000) + ' \\times ' + T(t.h, 4) + ' = ' + q('kWh', E)) + '.'
        ])
      };
    }

    /* ---- P = E / Δt (exercice 7.1) ---- */
    function power() {
      if (rng() < 0.5) {
        var Pw = P([25, 40, 60, 75, 150, 250, 500, 800, 1200, 2000]), t = P(DURATIONS);
        var E = C.roundSig(Pw * t.s, 3), ans = E / t.s;
        return {
          type: 'Puissance', ask: ask('la puissance P', 'watts (W)'), unit: 'W', answer: ans,
          html: '<p>Un appareil reçoit une énergie ' + m('\\QE = ' + q('J', E)) + ' pendant ' + m('\\Qt = ' + t.tex) + '.</p><p>Calcule sa puissance ' + m('\\QP') + '.</p>',
          traps: [
            { value: E / t.min, msg: 'Tu as divisé par des <b>minutes</b>. Avec E en joules, ' + m('\\Qt') + ' doit être en <b>secondes</b> pour obtenir des watts.' },
            { value: E / t.h, msg: 'Avec E en joules, ' + m('\\Qt') + ' doit être en secondes (pas en heures) : 1 h = 3 600 s.' },
            { value: E * t.s, msg: 'De ' + m('\\QE = \\QP \\times \\Qt') + ' on tire ' + m('\\QP = \\dfrac{\\QE}{\\Qt}') + ' : on <b>divise</b>.' },
            { value: t.s / E, msg: 'C’est l’inverse : ' + m('\\QP = \\dfrac{\\QE}{\\Qt}') + ' (énergie divisée par durée).' }
          ],
          solution: steps([
            'Durée en secondes : ' + m('\\Qt = ' + t.tex + ' = ' + q('s', t.s, 6)) + '.',
            m('\\QP = \\dfrac{\\QE}{\\Qt} = \\dfrac{' + T(E) + '}{' + T(t.s, 6) + '}') + '.',
            'Résultat : ' + m('\\QP = ' + q('W', ans)) + '.'
          ])
        };
      }
      var Ek = P([2, 5, 12, 18, 35, 60]), tm = P([12, 18, 24, 27, 36, 45, 48]), h = tm / 60, ansK = Ek / h;
      return {
        type: 'Puissance', ask: ask('la puissance P', 'kilowatts (kW)'), unit: 'kW', answer: ansK,
        html: '<p>Une installation consomme ' + m('\\QE = ' + q('kWh', Ek)) + ' en ' + m('\\Qt = ' + tm + '\\ \\mathrm{min}') + '.</p><p>Calcule sa puissance ' + m('\\QP') + ' en kW.</p>',
        traps: [
          { value: Ek / (tm / 100), msg: m(tm + '\\ \\mathrm{min}') + ' ne vaut pas ' + m(T(tm / 100) + '\\ \\mathrm{h}') + ' ! Une heure compte 60 minutes : ' + m(tm + '\\ \\mathrm{min} = \\frac{' + tm + '}{60}\\ \\mathrm{h} = ' + T(h, 4) + '\\ \\mathrm{h}') + '.' },
          { value: Ek / tm, msg: 'Des kWh divisés par des <b>heures</b> donnent des kW : convertis d’abord ' + m(tm + '\\ \\mathrm{min}') + ' en heures.' },
          { value: Ek * h, msg: 'On <b>divise</b> : ' + m('\\QP = \\dfrac{\\QE}{\\Qt}') + '.' }
        ],
        solution: steps([
          'E en kWh, donc Δt en h et P en kW : ' + m('\\Qt = \\dfrac{' + tm + '}{60} = ' + T(h, 4) + '\\ \\mathrm{h}') + '.',
          m('\\QP = \\dfrac{\\QE}{\\Qt} = \\dfrac{' + T(Ek) + '}{' + T(h, 4) + '} = ' + q('kW', ansK)) + '.'
        ])
      };
    }

    /* ---- Δt = E / P (exercice 7.3) ---- */
    function duration() {
      if (rng() < 0.5) {
        var Pw = P([40, 60, 150, 500, 1500]), ts0 = P([20, 40, 90, 150, 300, 600]);
        var Ek = C.roundSig(Pw * ts0 / 1000, 3), ans = Ek * 1000 / Pw;
        return {
          type: 'Durée', ask: ask('la durée Δt', 'secondes (s)'), unit: 's', answer: ans,
          html: '<p>Un appareil de puissance ' + m('\\QP = ' + q('W', Pw)) + ' reçoit une énergie ' + m('\\QE = ' + q('kJ', Ek)) + '.</p><p>Pendant combien de temps ' + m('\\Qt') + ' a-t-il fonctionné ?</p>',
          traps: [
            { value: Ek / Pw, msg: 'L’énergie est en <b>kJ</b> : convertis-la en joules (× 1 000) avant de diviser par la puissance en watts.' },
            { value: Pw / (Ek * 1000), msg: 'C’est l’inverse : ' + m('\\Qt = \\dfrac{\\QE}{\\QP}') + '.' },
            { value: Ek * 1000 * Pw, msg: 'De ' + m('\\QE = \\QP \\times \\Qt') + ' on tire ' + m('\\Qt = \\dfrac{\\QE}{\\QP}') + ' : on divise.' }
          ],
          solution: steps([
            'Énergie en joules : ' + m('\\QE = ' + q('kJ', Ek) + ' = ' + q('J', Ek * 1000)) + '.',
            m('\\Qt = \\dfrac{\\QE}{\\QP} = \\dfrac{' + T(Ek * 1000) + '}{' + T(Pw) + '} = ' + q('s', ans)) + ', soit ' + C.fmtDuration(ans) + '.'
          ])
        };
      }
      var Pk = P([5, 20, 40, 75, 120]), tsec = P([3600 * 2.5, 16250, 9000, 5400, 12600]);
      var EM = C.roundSig(Pk * 1000 * tsec / 1e6, 3), ans2 = EM * 1e6 / (Pk * 1000);
      return {
        type: 'Durée', ask: ask('la durée Δt', 'secondes (s)'), unit: 's', answer: ans2,
        html: '<p>Un moteur de puissance ' + m('\\QP = ' + q('kW', Pk)) + ' fournit une énergie ' + m('\\QE = ' + T(EM) + '\\times 10^{6}\\ \\mathrm{J}') + '.</p><p>Calcule la durée ' + m('\\Qt') + ' de fonctionnement en secondes.</p>',
        traps: [
          { value: EM * 1e6 / Pk, msg: 'La puissance est en <b>kW</b> : convertis-la en watts (× 1 000) pour obtenir des secondes.' },
          { value: EM / Pk, msg: 'Garde toutes les puissances de 10 : ' + m('\\QE = ' + T(EM * 1e6) + '\\ \\mathrm{J}') + ' et ' + m('\\QP = ' + T(Pk * 1000) + '\\ \\mathrm{W}') + '.' },
          { value: Pk * 1000 / (EM * 1e6), msg: 'C’est l’inverse : ' + m('\\Qt = \\dfrac{\\QE}{\\QP}') + '.' }
        ],
        solution: steps([
          'Unités du système international : ' + m('\\QP = ' + q('W', Pk * 1000)) + ', ' + m('\\QE = ' + q('J', EM * 1e6)) + '.',
          m('\\Qt = \\dfrac{\\QE}{\\QP} = \\dfrac{' + T(EM * 1e6) + '}{' + T(Pk * 1000) + '} = ' + q('s', ans2)) + '.',
          'Sous la forme … j … h … min … s : ' + C.fmtDuration(ans2) + '.'
        ])
      };
    }

    /* ---- conversions d'unités d'énergie (cours I, exercice 1.3, 2.3c) ---- */
    function conversion() {
      var k = R(0, 3);
      if (k === 0) {
        var x = P([0.5, 2, 5, 12, 35, 220, 1.5]);
        return {
          type: 'Conversion', ask: ask('cette énergie', 'joules (J)'), unit: 'J', answer: x * 3.6e6,
          html: '<p>Convertis ' + m(q('kWh', x)) + ' en joules.</p>',
          traps: [
            { value: x * 3600, msg: m('1\\ \\mathrm{kWh} = 3\\,600\\,000\\ \\mathrm{J}') + '. Le nombre 3 600 J correspond à <b>1 Wh</b>.' },
            { value: x / 3.6e6, msg: 'Le joule est une petite unité : il y a <b>plus</b> de joules que de kWh. On multiplie par ' + m('3{,}6 \\times 10^{6}') + '.' }
          ],
          solution: steps([m('1\\ \\mathrm{kWh} = 3{,}6 \\times 10^{6}\\ \\mathrm{J}') + '.', m(T(x) + ' \\times 3{,}6 \\times 10^{6} = ' + q('J', x * 3.6e6)) + '.'])
        };
      }
      if (k === 1) {
        var kwh = P([2, 4, 20, 50, 150, 0.5]), J = kwh * 3.6e6;
        return {
          type: 'Conversion', ask: ask('cette énergie', 'kilowattheures (kWh)'), unit: 'kWh', answer: kwh,
          html: '<p>Convertis ' + m(q('J', J)) + ' en kWh.</p>',
          traps: [
            { value: J / 3600, msg: 'Diviser par 3 600 donne des <b>Wh</b>. Pour des kWh, on divise par ' + m('3{,}6 \\times 10^{6}') + '.' },
            { value: J * 3.6e6, msg: 'Le kWh est une grande unité : il y en a <b>moins</b> que de joules. On divise par ' + m('3{,}6 \\times 10^{6}') + '.' }
          ],
          solution: steps([m('1\\ \\mathrm{kWh} = 3{,}6 \\times 10^{6}\\ \\mathrm{J}') + ', donc on divise.', m('\\dfrac{' + T(J) + '}{3{,}6 \\times 10^{6}} = ' + q('kWh', kwh)) + '.'])
        };
      }
      if (k === 2) {
        var wh = P([16.2, 11.3, 4.9, 25, 60, 120]);
        return {
          type: 'Conversion', ask: ask('cette énergie', 'joules (J)'), unit: 'J', answer: wh * 3600,
          html: '<p>Une batterie stocke ' + m(q('Wh', wh)) + '. Exprime cette énergie en joules (' + m('1\\ \\mathrm{Wh} = 3\\,600\\ \\mathrm{J}') + ').</p>',
          traps: [
            { value: wh * 3.6e6, msg: 'C’est pour des <b>kWh</b> qu’on multiplie par ' + m('3{,}6 \\times 10^{6}') + '. Ici l’énergie est en Wh : 1 Wh = 3 600 J.' },
            { value: wh / 3600, msg: 'Il y a plus de joules que de Wh : on <b>multiplie</b> par 3 600.' }
          ],
          solution: steps([m('1\\ \\mathrm{Wh} = 1\\ \\mathrm{W} \\times 3\\,600\\ \\mathrm{s} = 3\\,600\\ \\mathrm{J}') + '.', m(T(wh) + ' \\times 3\\,600 = ' + q('J', wh * 3600)) + '.'])
        };
      }
      var tep = P([2, 5, 10, 25, 0.5]);
      return {
        type: 'Conversion', ask: ask('cette énergie', 'kilowattheures (kWh)'), unit: 'kWh', answer: tep * 11600,
        html: '<p>Une entreprise consomme ' + m(q('tep', tep)) + ' (tonnes équivalent pétrole) par an. Convertis en kWh.</p>',
        traps: [{ value: tep / 11600, msg: m('1\\ \\mathrm{tep} = 11\\,600\\ \\mathrm{kWh}') + ' : on <b>multiplie</b> par 11 600.' }],
        solution: steps(['Une tep est l’énergie fournie par la combustion d’une tonne de pétrole : ' + m('1\\ \\mathrm{tep} = 11\\,600\\ \\mathrm{kWh}') + '.', m(T(tep) + ' \\times 11\\,600 = ' + q('kWh', tep * 11600)) + '.'])
      };
    }

    /* ---- rendement η = E_utile / E_reçue (exercices 1 et 2) ---- */
    var CONTEXTS = [
      { n: 'Un moteur électrique', r: 'électrique', u: 'mécanique', eta: [80, 95], unit: 'kWh', Er: [20, 40, 50, 80, 120] },
      { n: 'Une batterie', r: 'électrique (charge)', u: 'électrique (décharge)', eta: [60, 90], unit: 'Wh', Er: [12, 16.2, 20, 45, 60] },
      { n: 'Un moteur thermique', r: 'chimique', u: 'mécanique', eta: [25, 40], unit: 'kWh', Er: [300, 500, 733, 900] },
      { n: 'Un panneau photovoltaïque', r: 'rayonnement', u: 'électrique', eta: [15, 22], unit: 'kWh', Er: [10, 25, 40, 60] }
    ];
    function efficiency() {
      var c = P(CONTEXTS), Er = P(c.Er), eta = R(c.eta[0], c.eta[1]) / 100, Eu = C.roundSig(Er * eta, 3), ans = Eu / Er * 100;
      return {
        type: 'Rendement', ask: 'Donne le rendement η en %, à 3 chiffres significatifs.', unit: '%', answer: ans,
        html: '<p>' + c.n + ' reçoit une énergie ' + m('\\QEr = ' + q(c.unit, Er)) + ' (forme ' + c.r + ') et fournit une énergie ' + m('\\QEu = ' + q(c.unit, Eu)) + ' (forme ' + c.u + ').</p><p>Calcule son rendement ' + m('\\Qeta') + '.</p>',
        traps: [
          { value: Er / Eu * 100, msg: 'Un rendement est toujours <b>inférieur à 1</b> (100 %) : ' + m('\\Qeta = \\dfrac{\\QEu}{\\QEr}') + ', pas l’inverse.' },
          { value: Eu / Er, msg: 'Tu as donné ' + m('\\Qeta') + ' en écriture décimale ; la question le demande en <b>%</b> : multiplie par 100.' },
          { value: (Er - Eu) / Er * 100, msg: 'Ça, c’est la part <b>perdue</b>. Le rendement compare l’énergie <b>utile</b> à l’énergie reçue.' }
        ],
        solution: steps([
          m('\\Qeta = \\dfrac{\\QEu}{\\QEr} = \\dfrac{' + T(Eu) + '}{' + T(Er) + '} = ' + T(Eu / Er, 3)) + ' (sans unité, inférieur à 1).',
          'En pourcentage : ' + m('\\Qeta = ' + T(ans) + '\\ \\%') + '.'
        ])
      };
    }
    function useful() {
      var c = P(CONTEXTS), Er = P(c.Er), etaP = R(c.eta[0], c.eta[1]), eta = etaP / 100, Eu = eta * Er;
      return {
        type: 'Énergie utile', ask: ask('l’énergie utile', c.unit), unit: c.unit, answer: Eu,
        html: '<p>' + c.n + ' a un rendement ' + m('\\Qeta = ' + etaP + '\\ \\%') + '. Il reçoit ' + m('\\QEr = ' + q(c.unit, Er)) + '.</p><p>Calcule l’énergie utile ' + m('\\QEu') + '.</p>',
        traps: [
          { value: etaP * Er, msg: m('\\Qeta = ' + etaP + '\\ \\% = ' + T(eta) ) + ' : convertis le pourcentage en nombre décimal avant de multiplier.' },
          { value: Er / eta, msg: 'L’énergie utile est <b>plus petite</b> que l’énergie reçue : ' + m('\\QEu = \\Qeta \\times \\QEr') + ' (on multiplie).' },
          { value: (1 - eta) * Er, msg: 'Ça, c’est l’énergie <b>perdue</b>. L’énergie utile vaut ' + m('\\Qeta \\times \\QEr') + '.' }
        ],
        solution: steps([
          'De ' + m('\\Qeta = \\dfrac{\\QEu}{\\QEr}') + ' on tire ' + m('\\QEu = \\Qeta \\times \\QEr') + '.',
          m('\\QEu = ' + T(eta) + ' \\times ' + T(Er) + ' = ' + q(c.unit, Eu)) + '.'
        ])
      };
    }
    /* moteur thermique (exercice 1) : énergie mécanique sur une durée, puis énergie reçue */
    function received() {
      var Pk = P([75, 90, 110, 130, 150]), h = P([1, 1.5, 2, 3]), etaP = P([25, 28, 30, 32, 35, 38]), eta = etaP / 100;
      var Eu = Pk * h, Er = Eu / eta;
      var htex = h === 1.5 ? '1\\ \\mathrm{h}\\ 30\\ \\mathrm{min}' : T(h) + '\\ \\mathrm{h}';
      return {
        type: 'Énergie reçue', ask: ask('l’énergie reçue', 'kWh'), unit: 'kWh', answer: Er,
        html: '<p>Un moteur thermique diesel délivre une puissance mécanique ' + m('\\QPu = ' + q('kW', Pk)) + ' avec un rendement ' + m('\\Qeta = ' + etaP + '\\ \\%') + '. La voiture roule ' + m(htex) + '.</p><p>Calcule l’énergie ' + m('\\QEr') + ' reçue par le moteur (énergie chimique du gazole).</p>',
        traps: [
          { value: Eu, msg: 'Ça, c’est l’énergie <b>mécanique</b> (utile) ' + m('\\QEu = \\QPu \\times \\Qt') + '. Il faut ensuite remonter à l’énergie reçue.' },
          { value: Eu * eta, msg: 'L’énergie reçue est <b>plus grande</b> que l’énergie utile : on <b>divise</b> par ' + m('\\Qeta') + ' (' + m('\\QEr = \\dfrac{\\QEu}{\\Qeta}') + ').' },
          { value: Eu / etaP, msg: m('\\Qeta') + ' doit être sous forme décimale : ' + m(etaP + '\\ \\% = ' + T(eta)) + '.' },
          { value: Eu * (1 + eta), msg: 'On ne fait pas une addition : ' + m('\\QEr = \\dfrac{\\QEu}{\\Qeta}') + '.' }
        ],
        solution: steps([
          'Énergie mécanique (utile) : ' + m('\\QEu = \\QPu \\times \\Qt = ' + T(Pk) + ' \\times ' + T(h) + ' = ' + q('kWh', Eu)) + '.',
          m('\\QEr = \\dfrac{\\QEu}{\\Qeta} = \\dfrac{' + T(Eu) + '}{' + T(eta) + '} = ' + q('kWh', Er)) + '.'
        ])
      };
    }
    function lost() {
      if (rng() < 0.5) {
        var c = P(CONTEXTS), Er = P(c.Er), Eu = C.roundSig(Er * R(c.eta[0], c.eta[1]) / 100, 3), Ep = Er - Eu;
        return {
          type: 'Énergie perdue', ask: ask('l’énergie perdue', c.unit), unit: c.unit, answer: Ep,
          html: '<p>' + c.n + ' reçoit ' + m('\\QEr = ' + q(c.unit, Er)) + ' et fournit ' + m('\\QEu = ' + q(c.unit, Eu)) + '.</p><p>Calcule l’énergie perdue ' + m('\\QEp') + ' (pertes thermiques).</p>',
          traps: [
            { value: Er + Eu, msg: 'Conservation de l’énergie : ' + m('\\QEr = \\QEu + \\QEp') + ', donc ' + m('\\QEp = \\QEr - \\QEu') + ' (une soustraction).' },
            { value: Eu - Er, msg: 'Une énergie perdue est positive : ' + m('\\QEp = \\QEr - \\QEu') + ' (le plus grand moins le plus petit).' }
          ],
          solution: steps([
            'Conservation de l’énergie : ' + m('\\QEr = \\QEu + \\QEp') + '.',
            m('\\QEp = \\QEr - \\QEu = ' + T(Er) + ' - ' + T(Eu) + ' = ' + q(c.unit, Ep)) + '.'
          ])
        };
      }
      var Eu2 = P([120, 165, 220, 330]), etaP = P([25, 30, 35, 40]), eta = etaP / 100, Er2 = Eu2 / eta, Ep2 = Er2 - Eu2;
      return {
        type: 'Énergie perdue', ask: ask('l’énergie perdue', 'kWh'), unit: 'kWh', answer: Ep2,
        html: '<p>Un moteur thermique de rendement ' + m('\\Qeta = ' + etaP + '\\ \\%') + ' fournit une énergie mécanique ' + m('\\QEu = ' + q('kWh', Eu2)) + '.</p><p>Calcule l’énergie thermique dissipée ' + m('\\QEp') + '.</p>',
        traps: [
          { value: Eu2 * (1 - eta), msg: m('(1 - \\Qeta)') + ' s’applique à l’énergie <b>reçue</b>, pas à l’énergie utile. Calcule d’abord ' + m('\\QEr = \\dfrac{\\QEu}{\\Qeta}') + '.' },
          { value: Er2, msg: 'Ça, c’est l’énergie <b>reçue</b>. Il reste à retirer l’énergie utile : ' + m('\\QEp = \\QEr - \\QEu') + '.' },
          { value: Eu2 * eta, msg: 'Commence par l’énergie reçue : ' + m('\\QEr = \\dfrac{\\QEu}{\\Qeta}') + ', puis ' + m('\\QEp = \\QEr - \\QEu') + '.' }
        ],
        solution: steps([
          'Énergie reçue : ' + m('\\QEr = \\dfrac{\\QEu}{\\Qeta} = \\dfrac{' + T(Eu2) + '}{' + T(eta) + '} = ' + q('kWh', Er2, 4)) + '.',
          'Conservation : ' + m('\\QEp = \\QEr - \\QEu = ' + T(Er2, 4) + ' - ' + T(Eu2) + ' = ' + q('kWh', Ep2)) + '.'
        ])
      };
    }
    /* cellules photovoltaïques (exercice 2.2) */
    function usefulPower() {
      var Pr = P([4, 6, 8, 12, 20, 250]), etaP = P([15, 18, 20, 22, 25, 30]), eta = etaP / 100, Pu = eta * Pr;
      return {
        type: 'Puissance utile', ask: ask('la puissance utile', 'watts (W)'), unit: 'W', answer: Pu,
        html: '<p>Des cellules photovoltaïques reçoivent une puissance lumineuse ' + m('\\QPr = ' + q('W', Pr)) + ' et ont un rendement ' + m('\\Qeta = ' + etaP + '\\ \\%') + '.</p><p>Calcule la puissance électrique ' + m('\\QPu') + ' fournie à la batterie.</p>',
        traps: [
          { value: etaP * Pr, msg: 'Convertis le pourcentage : ' + m(etaP + '\\ \\% = ' + T(eta)) + '.' },
          { value: Pr / eta, msg: 'La puissance utile est <b>plus petite</b> que la puissance reçue : ' + m('\\QPu = \\Qeta \\times \\QPr') + '.' },
          { value: (1 - eta) * Pr, msg: 'Ça, c’est la puissance <b>perdue</b>.' }
        ],
        solution: steps([
          'Le rendement s’applique aussi aux puissances : ' + m('\\Qeta = \\dfrac{\\QPu}{\\QPr}') + '.',
          m('\\QPu = \\Qeta \\times \\QPr = ' + T(eta) + ' \\times ' + T(Pr) + ' = ' + q('W', Pu)) + '.'
        ])
      };
    }
    /* lampe solaire (exercice 2.5) : durée d'utilisation */
    function usageTime() {
      var E = P([8.4, 9.8, 11.3, 14.4, 18]), Pw = P([2, 3, 4, 5]), h = E / Pw;
      return {
        type: 'Durée de fonctionnement', ask: ask('la durée Δt', 'heures (h)'), unit: 'h', answer: h,
        html: '<p>La batterie d’une lampe solaire fournit ' + m('\\QE = ' + q('Wh', E)) + ' à l’ampoule, dont la puissance électrique est ' + m('\\QP = ' + q('W', Pw)) + '.</p><p>Combien de temps ' + m('\\Qt') + ' la lampe peut-elle éclairer ?</p>',
        traps: [
          { value: Pw / E, msg: 'C’est l’inverse : ' + m('\\Qt = \\dfrac{\\QE}{\\QP}') + '.' },
          { value: E * Pw, msg: 'De ' + m('\\QE = \\QP \\times \\Qt') + ' on tire ' + m('\\Qt = \\dfrac{\\QE}{\\QP}') + ' : on divise.' },
          { value: h * 60, msg: 'Ce résultat est en <b>minutes</b> : la question demande des heures. Avec E en Wh et P en W, ' + m('\\Qt') + ' sort directement en heures.' }
        ],
        solution: steps([
          'E en Wh et P en W : ' + m('\\Qt') + ' sort en heures.',
          m('\\Qt = \\dfrac{\\QE}{\\QP} = \\dfrac{' + T(E) + '}{' + T(Pw) + '} = ' + q('h', h)) + ', soit ' + C.fmtDuration(h * 3600).replace(/ \d+ s$/, '') + ' environ.'
        ])
      };
    }

    /* ---- QCM du cours ---- */
    function chainForm() {
      var c = P(CONVERTERS), which = P(['r', 'u', 'p']);
      var right = which === 'p' ? 'thermique' : c[which];
      var label = which === 'r' ? 'reçue (en entrée)' : which === 'u' ? 'utile (en sortie)' : 'perdue';
      var wrongs = shuffle(FORMS.filter(function (f) { return f !== right; })).slice(0, 3).map(function (f) {
        var why;
        if (c.n.indexOf('thermique') >= 0 && which === 'r' && f === 'thermique') why = 'Malgré son nom, un moteur thermique reçoit l’énergie <b>chimique</b> du carburant ; la combustion la libère.';
        else if (which === 'p') why = 'Dans un convertisseur, les pertes sont le plus souvent des <b>pertes thermiques</b> (échauffement).';
        else if (f === c[which === 'r' ? 'u' : 'r']) why = 'Ça, c’est l’énergie ' + (which === 'r' ? 'utile (en sortie)' : 'reçue (en entrée)') + ' de ce convertisseur.';
        return { html: f, why: why };
      });
      return mcq({
        type: 'Chaîne énergétique',
        html: '<p>Dans la chaîne énergétique de <b>' + c.n + '</b>, quelle est la forme de l’énergie ' + label + ' ?</p>',
        solution: '<p>' + cap(c.n) + ' : énergie <b>' + c.r + '</b> reçue → énergie <b>' + c.u + '</b> utile, avec des pertes <b>thermiques</b>.</p>'
      }, right, wrongs);
    }
    function renewable() {
      var s = P(SOURCES), right = s.r ? 'renouvelable' : 'non renouvelable';
      var o = {
        type: 'Sources d’énergie', html: '<p>' + cap(s.n) + ' est-elle une source d’énergie renouvelable ?</p>',
        solution: '<p>Une source d’énergie est <b>renouvelable</b> si son renouvellement naturel est rapide à l’échelle d’une vie humaine. ' +
          'Renouvelables : hydraulique, solaire, éolien, géothermique, biomasse. Non renouvelables : fossiles (pétrole, gaz, charbon) et nucléaire.</p>'
      };
      var why = s.why || 'Une source est renouvelable si son renouvellement naturel est rapide à l’échelle d’une vie humaine.';
      o.choices = [{ html: 'renouvelable', why: s.r ? undefined : why }, { html: 'non renouvelable', why: s.r ? why : undefined }];
      o.answer = s.r ? 0 : 1;
      o.ask = 'Choisis la bonne réponse.';
      return o;
    }
    var CONCEPTS = [
      function () { return mcq({ type: 'Unités', html: '<p>Quelle est l’unité de l’énergie dans le système international ?</p>', solution: '<p>L’énergie est notée E ; son unité SI est le <b>joule</b> (J).</p>' },
        'le joule (J)', [{ html: 'le watt (W)', why: 'Le watt est l’unité de la <b>puissance</b>.' }, { html: 'le kilowattheure (kWh)', why: 'Le kWh est bien une unité d’énergie, mais pas celle du système international.' }, 'le newton (N)']); },
      function () { return mcq({ type: 'Unités', html: '<p>Que vaut 1 kWh ?</p>', solution: '<p>' + m('1\\ \\mathrm{kWh} = 1\\,000\\ \\mathrm{W} \\times 3\\,600\\ \\mathrm{s} = 3\\,600\\,000\\ \\mathrm{J}') + '.</p>' },
        m('3\\,600\\,000\\ \\mathrm{J}'), [{ html: m('3\\,600\\ \\mathrm{J}'), why: '3 600 J, c’est <b>1 Wh</b> (1 W pendant 3 600 s).' }, m('1\\,000\\ \\mathrm{J}'), m('60\\,000\\ \\mathrm{J}')]); },
      function () { return mcq({ type: 'Unités', html: '<p>Que vaut 1 tep (tonne équivalent pétrole) ?</p>', solution: '<p>La tep est l’énergie fournie par la combustion d’une tonne de pétrole : ' + m('1\\ \\mathrm{tep} = 11\\,600\\ \\mathrm{kWh}') + '.</p>' },
        m('11\\,600\\ \\mathrm{kWh}'), [m('1\\,000\\ \\mathrm{kWh}'), m('3{,}6 \\times 10^{6}\\ \\mathrm{J}'), m('11\\,600\\ \\mathrm{J}')]); },
      function () { return mcq({ type: 'Conservation', ref: 'c-conservation', html: '<p>Pour un convertisseur, la conservation de l’énergie s’écrit :</p>', solution: '<p>' + m('\\QEr = \\QEu + \\QEp') + ' : rien ne se perd au sens strict, une partie de l’énergie reçue devient simplement inutile (pertes thermiques).</p>' },
        m('\\QEr = \\QEu + \\QEp'), [m('\\QEu = \\QEr + \\QEp'), m('\\QEr = \\QEu - \\QEp'), m('\\QEr = \\QEu \\times \\QEp')]); },
      function () { return mcq({ type: 'Rendement', ref: 'c-rendement', html: '<p>Le rendement ' + m('\\Qeta') + ' d’un convertisseur…</p>', solution: '<p>' + m('\\Qeta = \\dfrac{\\QEu}{\\QEr}') + ' n’a pas d’unité et il est <b>inférieur à 1</b> ; il peut s’exprimer en %.</p>' },
        'n’a pas d’unité et est inférieur à 1', [{ html: 'peut dépasser 1 si le convertisseur est très performant', why: 'Impossible : l’énergie utile ne peut pas dépasser l’énergie reçue (conservation de l’énergie).' }, 'se mesure en joules', 'se mesure en watts']); },
      function () { return mcq({ type: 'Unités', ref: 'c-joule', html: '<p>Si ' + m('\\QP') + ' est en kW et ' + m('\\Qt') + ' en heures, alors ' + m('\\QE = \\QP \\times \\Qt') + ' est en :</p>', solution: '<p>kW × h = <b>kWh</b>. (W × s = J ; W × h = Wh.)</p>' },
        'kWh', [{ html: 'J', why: 'On obtient des joules avec P en W et Δt en <b>secondes</b>.' }, 'Wh', 'kW']); }
    ];
    function concept() { return P(CONCEPTS)(); }

    /* ---- tirage ---- */
    var KINDS = {
      energyJ: energyJ, energyKWh: energyKWh, power: power, duration: duration, conversion: conversion,
      efficiency: efficiency, useful: useful, received: received, lost: lost, usefulPower: usefulPower, usageTime: usageTime,
      chainForm: chainForm, renewable: renewable, concept: concept
    };
    // carte du cours à revoir pour chaque type de question (lien « À revoir » après l'évaluation)
    var REF = {
      energyJ: 'c-joule', energyKWh: 'c-joule', power: 'c-methode-unites', duration: 'c-methode-unites', conversion: 'c-unites',
      efficiency: 'c-rendement', useful: 'c-methode-rendement', received: 'c-methode-rendement', lost: 'c-conservation',
      usefulPower: 'c-puissance', usageTime: 'c-joule', chainForm: 'c-chaine', renewable: 'c-sources', concept: 'c-unites'
    };
    function tag(kind, o) { o.kind = kind; o.ref = o.ref || REF[kind]; return o; }
    var WEIGHTS = { energyJ: 3, energyKWh: 3, power: 3, duration: 2, conversion: 2, efficiency: 3, useful: 2, received: 2, lost: 2, usefulPower: 1, usageTime: 1, chainForm: 2, renewable: 1, concept: 2 };
    var last = null;
    function training() {
      var keys = Object.keys(WEIGHTS).filter(function (k) { return k !== last; });
      var total = keys.reduce(function (s, k) { return s + WEIGHTS[k]; }, 0), r = rng() * total, pick = keys[0];
      for (var i = 0; i < keys.length; i++) { r -= WEIGHTS[keys[i]]; if (r < 0) { pick = keys[i]; break; } }
      last = pick;
      return tag(pick, KINDS[pick]());
    }
    /** Copie d'évaluation : 8 questions, 20 points. */
    function exam() {
      function pts(kind, p) { var o = tag(kind, KINDS[kind]()); o.points = p; return o; }
      return [
        pts('chainForm', 2), pts(rng() < 0.5 ? 'renewable' : 'concept', 2),
        pts('energyJ', 3), pts('energyKWh', 2), pts('power', 3), pts('conversion', 2),
        pts('efficiency', 3), pts(rng() < 0.5 ? 'received' : 'lost', 3)
      ];
    }
    return { training: training, exam: exam, kinds: KINDS };
  }

  return { make: make, APPLIANCES: APPLIANCES, CONVERTERS: CONVERTERS, SOURCES: SOURCES, FORMS: FORMS, EXAM_QUESTIONS: 8 };
});
