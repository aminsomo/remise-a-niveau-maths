// Banque de questions du chapitre « Énergie interne » (physique-1re/energie-interne.js).
// Lancer : node --test tests/js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../../assets/core.js');
const Bank = require('../../physique-1re/energie-interne.js');

const PAGE = fs.readFileSync(path.join(__dirname, '..', '..', 'physique-1re', 'energie-interne.html'), 'utf8');
const APP = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'app.js'), 'utf8');

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
function seeded(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// macros définies dans assets/app.js (couleurs des grandeurs)
const MACROS = new Set([...APP.matchAll(/'\\\\(Q[A-Za-z]*)':/g)].map((m) => '\\' + m[1]));
function texts(qn) {
  const out = [qn.html, qn.solution || '', qn.ask || ''];
  (qn.traps || []).forEach((t) => out.push(t.msg));
  (qn.choices || []).forEach((c) => { out.push(c.html); if (c.why) out.push(c.why); });
  return out;
}
function checkText(s, where) {
  assert.equal(s.split('\\(').length, s.split('\\)').length, `\\( \\) déséquilibrés : ${where}`);
  assert.doesNotMatch(s, /NaN|undefined|Infinity|\[object/, where);
  for (const mac of s.match(/\\Q[A-Za-z]+/g) || []) assert.ok(MACROS.has(mac), `macro inconnue ${mac} : ${where}`);
  // élision : « d’aluminium », « de l’aluminium », « l’heptadécane » (jamais « de aluminium »)
  assert.doesNotMatch(s.replace(/<[^>]+>/g, ' '), /(^|[\s(])(de|du|le|au) [aeéiouAEÉIOU]/, `élision manquante : ${where}`);
  let depth = 0;
  for (const ch of s.replace(/\\[{}]/g, '')) { if (ch === '{') depth++; if (ch === '}') depth--; assert.ok(depth >= 0, `accolades : ${where}`); }
  assert.equal(depth, 0, `accolades déséquilibrées : ${where}`);
}
const typed = (qn) => String(Number(qn.answer.toPrecision(qn.sig || 3))).replace('.', ',');

test('les macros de couleur du chapitre existent dans app.js', () => {
  for (const m of ['\\QU', '\\QQ', '\\QT', '\\QdT', '\\QTi', '\\QTf', '\\QTeq', '\\Qm', '\\Qc', '\\QL']) assert.ok(MACROS.has(m), m);
});

test('chaque type de question : réponse finie, texte propre, solution', () => {
  const B = Bank.make(seeded(42));
  for (const [kind, gen] of Object.entries(B.kinds)) {
    for (let i = 0; i < 250; i++) {
      const qn = gen();
      const where = `${kind} #${i} « ${qn.html.slice(0, 70)} »`;
      assert.ok(qn.type && qn.html && qn.ask, where);
      assert.ok(qn.solution && qn.solution.length > 20, `solution manquante : ${where}`);
      texts(qn).forEach((s) => checkText(s, where));
      if (qn.choices) {
        assert.ok(qn.choices.length >= 2, where);
        assert.ok(Number.isInteger(qn.answer) && qn.answer >= 0 && qn.answer < qn.choices.length, where);
        const labels = qn.choices.map((c) => c.html);
        assert.equal(new Set(labels).size, labels.length, `choix en double : ${where}`);
        assert.equal(qn.choices[qn.answer].why, undefined, `la bonne réponse n’a pas d’explication d’erreur : ${where}`);
      } else {
        assert.ok(Number.isFinite(qn.answer) && qn.answer !== 0, `réponse non finie ou nulle : ${where}`);
        assert.ok(qn.unit, `unité manquante : ${where}`);
      }
    }
  }
});

test('une réponse arrondie (3 chiffres significatifs, ou à l’unité pour les conversions) est acceptée', () => {
  const B = Bank.make(seeded(7));
  for (const [kind, gen] of Object.entries(B.kinds)) {
    for (let i = 0; i < 200; i++) {
      const qn = gen();
      if (qn.choices) continue;
      assert.ok(C.isCorrect(C.parseNum(typed(qn)), qn.answer, qn.tol), `${kind} : « ${typed(qn)} » refusé (attendu ${qn.answer})`);
      // signe moins typographique et notation scientifique d'élève
      const sci = C.fmtNum(qn.answer, qn.sig || 3).replace(/\s/g, '').replace('×10', '*10^').replace(/[⁰-⁹⁻]+/g, (e) => e.replace(/⁻/g, '-').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(d)));
      assert.ok(C.isCorrect(C.parseNum(sci), qn.answer, qn.tol), `${kind} : « ${sci} » refusé (attendu ${qn.answer})`);
    }
  }
});

test('conversions : 273 ou 273,15 acceptés, le mauvais sens reconnu comme erreur fréquente', () => {
  const B = Bank.make(seeded(3));
  for (let i = 0; i < 300; i++) {
    const qn = B.kinds.conversion();
    const toK = qn.unit === 'K';
    const t = Number(/\\QT = (-?\d+(?:\\,\d+)*)/.exec(qn.html)[1].replace(/\\,/g, ''));
    assert.equal(qn.answer, toK ? t + 273 : t - 273);
    assert.ok(C.isCorrect(toK ? t + 273.15 : t - 273.15, qn.answer, qn.tol), 'convention 273,15');
    assert.ok(!C.isCorrect(qn.answer + 2, qn.answer, qn.tol), 'tolérance serrée (à l’unité)');
    assert.ok(C.matchTrap(toK ? t - 273 : t + 273, qn.traps, qn.answer), 'sens de la conversion');
  }
});

test('les pièges ne se confondent jamais avec la bonne réponse et sont reconnus', () => {
  const B = Bank.make(seeded(2024));
  let recognised = 0;
  for (const [kind, gen] of Object.entries(B.kinds)) {
    for (let i = 0; i < 200; i++) {
      const qn = gen();
      if (qn.choices) continue;
      assert.ok((qn.traps || []).length >= 1, `${kind} : au moins une erreur fréquente expliquée`);
      assert.equal(C.matchTrap(qn.answer, qn.traps, qn.answer), null, `${kind} : la bonne réponse déclenche un piège`);
      for (const t of qn.traps) {
        if (Math.abs(t.value - qn.answer) <= 2 * C.approxTol(qn.answer, true) || C.isCorrect(t.value, qn.answer, qn.tol)) continue; // piège ignoré (égal à la réponse)
        const v = C.parseNum(String(Number(t.value.toPrecision(3))).replace('.', ','));
        if (C.isCorrect(v, qn.answer, qn.tol)) continue;
        assert.ok(C.matchTrap(v, qn.traps, qn.answer), `${kind} : erreur « ${v} » non reconnue`);
        recognised++;
      }
    }
  }
  assert.ok(recognised > 3000, `seulement ${recognised} erreurs reconnues`);
});

test('refroidissement : Q est négatif, et oublier le signe est une erreur fréquente', () => {
  const B = Bank.make(seeded(8));
  for (let i = 0; i < 200; i++) {
    const qn = B.kinds.cool();
    assert.ok(qn.answer < 0, qn.html);
    const hit = C.matchTrap(-qn.answer, qn.traps, qn.answer);
    assert.ok(hit && /signe|négatif/.test(hit.msg), 'oubli du signe expliqué');
    const h = B.kinds.heat();
    assert.ok(h.answer > 0, h.html);
  }
});

test('plusieurs étapes : oublier le changement d’état est reconnu', () => {
  const B = Bank.make(seeded(12));
  for (let i = 0; i < 200; i++) {
    const qn = B.kinds.multiStep();
    const latent = qn.traps.find((t) => /fusion|liquéfaction/.test(t.msg) && /oublié/.test(t.msg));
    assert.ok(latent, 'piège « changement d’état oublié »');
    assert.ok(C.matchTrap(latent.value, qn.traps, qn.answer) === latent);
    assert.ok(Math.abs(qn.answer) > Math.abs(latent.value) || qn.answer < 0, 'la chaleur latente compte');
  }
});

test('calorimètre : situations cohérentes et réponses physiquement plausibles', () => {
  const B = Bank.make(seeded(31));
  for (let i = 0; i < 300; i++) {
    const c = B.kinds.calorC();
    assert.ok(c.answer > 300 && c.answer < 1000, `c = ${c.answer} (métaux du cours : 385 à 894,5)`);
    const l = B.kinds.calorL();
    const s = Bank.FUSIBLE.find((x) => l.html.includes(x.n));
    assert.ok(s, l.html);
    assert.ok(Math.abs(l.answer - s.L / 1000) / (s.L / 1000) < 0.03, `L = ${l.answer} kJ/kg pour ${s.n}`);
    const tf = /température finale est \\\((-?[\d{},]+)/.exec(l.html)[1].replace('{,}', '.');
    assert.ok(Number(tf) >= s.Tf + 1, `le liquide finit au-dessus de sa fusion (${tf} °C, fusion ${s.Tf} °C)`);
    const mx = B.kinds.mixing();
    assert.ok(mx.answer > 10 && mx.answer < 90, 'température d’équilibre entre les deux');
  }
});

test('évaluation : 8 questions, 20 points, valeurs renouvelées à chaque copie', () => {
  const B = Bank.make(seeded(99));
  const a = B.exam(), b = B.exam();
  assert.equal(a.length, Bank.EXAM_QUESTIONS);
  assert.equal(a.reduce((s, x) => s + x.points, 0), C.GATE.TOTAL);
  a.forEach((x) => assert.ok(x.points >= 2 && x.points <= 3));
  assert.notDeepEqual(a.map((x) => x.html), b.map((x) => x.html));
  // au moins 5 questions de calcul (le cœur du chapitre)
  assert.ok(a.filter((x) => !x.choices).length >= 5);
});

test('entraînement : jamais deux fois le même type de question de suite, tous les types sortent', () => {
  const B = Bank.make(seeded(5));
  let prev = null;
  const seen = new Set();
  for (let i = 0; i < 600; i++) {
    const qn = B.training();
    assert.notEqual(qn.kind, prev);
    prev = qn.kind;
    seen.add(qn.kind);
  }
  assert.equal(seen.size, Object.keys(B.kinds).length);
});

test('chaque question renvoie à une carte du cours qui existe dans la page', () => {
  const B = Bank.make(seeded(11));
  const qs = [];
  for (let i = 0; i < 400; i++) qs.push(B.training());
  for (let i = 0; i < 20; i++) qs.push(...B.exam());
  for (const qn of qs) {
    assert.ok(qn.ref, `${qn.kind} sans carte de cours`);
    assert.ok(PAGE.includes(`id="${qn.ref}"`), `carte #${qn.ref} absente de la page (${qn.kind})`);
  }
});

test('valeurs des exercices de la fiche retrouvées (exercices 1 à 5)', () => {
  // exercice 1 : conversions avec 273
  assert.deepEqual([30, -10, -250, 5000].map((t) => t + 273), [303, 263, 23, 5273]);
  assert.deepEqual([100, 450, 1, 5000].map((t) => t - 273), [-173, 177, -272, 4727]);
  // exercice 2 : eau, lait (signe), plomb
  assert.equal(3.0 * 4180 * (90 - 20), 877800);
  const lait = 0.309 * 3800 * (37 - 70);
  assert.ok(lait < 0 && Math.abs(lait + 38748.6) < 1e-6);
  assert.equal(C.texNum(lait), '-38\\,700');
  assert.equal(120 * 129 * (230 - 25), 3173400);
  // exercice 3 : 1 kg de vapeur de 130 °C à de l'eau liquide à 60 °C, rivière à 13 °C
  const Q = 1 * Bank.C_VAPEUR * (100 - 130) - 1 * Bank.L_VAP_EAU + 1 * Bank.C_EAU * (60 - 100);
  assert.equal(Q, -2482700);
  assert.ok(Math.abs(-Q / (Bank.C_EAU * (60 - 13)) - 12.64) < 0.01);
  // exemples de la page (valeurs cohérentes, choisies pour la page)
  assert.ok(Math.abs((0.2 * 4180 * 5 + 0.4 * 748 * 5) / (0.1 * (88 - 25)) - 900.95) < 0.01); // c de l'aluminium
  assert.ok(Math.abs(-(0.2 * 4180 * (27 - 45) + 0.5 * 750 * (27 - 45)) / 0.1 - 217980) < 1e-6); // L de l'heptadécane
  assert.ok(Math.abs((1850 * 20 + 2260e3 + 4180 * 50) / (4180 * 35) - 17.13) < 0.01); // centrale de l'exemple
});

test('la page cite les mêmes valeurs que ses solutions', () => {
  for (const v of ['501\\,600', '-21\\,850', '1\\,431\\,200', '992\\,500', '-2\\,506\\,000', '17{,}1', '-5\\,676', '901', '21\\,798', '218']) {
    assert.ok(PAGE.includes(v), `valeur ${v} absente de la page`);
  }
});
