// Banque de questions du chapitre « L'énergie et ses enjeux » (physique-1re/energie-enjeux.js).
// Lancer : node --test tests/js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../assets/core.js');
const Bank = require('../../physique-1re/energie-enjeux.js');

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
function seeded(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const MACROS = new Set(['\\QE', '\\QEr', '\\QEu', '\\QEp', '\\QP', '\\Qt', '\\Qeta', '\\QPr', '\\QPu', '\\QPp']);
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
}

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
        assert.ok(Number.isFinite(qn.answer) && qn.answer > 0, `réponse non finie : ${where}`);
        assert.ok(qn.unit, `unité manquante : ${where}`);
      }
    }
  }
});

test('une réponse arrondie à 3 chiffres significatifs est acceptée', () => {
  const B = Bank.make(seeded(7));
  for (const [kind, gen] of Object.entries(B.kinds)) {
    for (let i = 0; i < 200; i++) {
      const qn = gen();
      if (qn.choices) continue;
      const typed = String(Number(qn.answer.toPrecision(3))).replace('.', ',');
      assert.ok(C.isCorrect(C.parseNum(typed), qn.answer, qn.tol), `${kind} : « ${typed} » refusé (attendu ${qn.answer})`);
    }
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
        if (Math.abs(t.value - qn.answer) <= 2 * C.approxTol(qn.answer, true)) continue; // piège ignoré (égal à la réponse)
        const typed = C.parseNum(String(Number(t.value.toPrecision(3))).replace('.', ','));
        const hit = C.matchTrap(typed, qn.traps, qn.answer);
        assert.ok(hit, `${kind} : erreur « ${typed} » non reconnue`);
        recognised++;
      }
    }
  }
  assert.ok(recognised > 1000);
});

test('évaluation : 8 questions, 20 points, valeurs renouvelées à chaque copie', () => {
  const B = Bank.make(seeded(99));
  const a = B.exam(), b = B.exam();
  assert.equal(a.length, Bank.EXAM_QUESTIONS);
  assert.equal(a.reduce((s, x) => s + x.points, 0), C.GATE.TOTAL);
  a.forEach((x) => assert.ok(x.points >= 2 && x.points <= 3));
  assert.notDeepEqual(a.map((x) => x.html), b.map((x) => x.html));
});

test('entraînement : jamais deux fois le même type de question de suite', () => {
  const B = Bank.make(seeded(5));
  let prev = null;
  const seen = new Set();
  for (let i = 0; i < 400; i++) {
    const qn = B.training();
    assert.notEqual(qn.kind, prev);
    prev = qn.kind;
    seen.add(qn.kind);
  }
  assert.equal(seen.size, Object.keys(B.kinds).length, 'tous les types de questions sortent');
});

test('chaque question renvoie à une carte du cours qui existe dans la page', () => {
  const fs = require('fs'), path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'physique-1re', 'energie-enjeux.html'), 'utf8');
  const B = Bank.make(seeded(11));
  const qs = [];
  for (let i = 0; i < 300; i++) qs.push(B.training());
  for (let i = 0; i < 20; i++) qs.push(...B.exam());
  for (const qn of qs) {
    assert.ok(qn.ref, `${qn.kind} sans carte de cours`);
    assert.ok(html.includes(`id="${qn.ref}"`), `carte #${qn.ref} absente de la page (${qn.kind})`);
  }
});

test('valeurs des exercices du cours retrouvées (moteur diesel, lampe solaire)', () => {
  // moteur de l’exercice 1 : 110 kW pendant 2 h, rendement 30 %
  const Eu = 110 * 2, Er = Eu / 0.3;
  assert.equal(Eu, 220);
  assert.ok(Math.abs(Er - 733.33) < 0.01);
  assert.ok(Math.abs((Er - Eu) - 513.33) < 0.01);
  assert.equal(C.texNum(Eu * 3.6e6), '7{,}92\\times 10^{8}');
  // lampe solaire de l’exercice 2 : 6 W, 30 %, 9 h, 11,3 Wh
  const Pu = 0.3 * 6, E = Pu * 9;
  assert.ok(Math.abs(Pu - 1.8) < 1e-9);
  assert.ok(Math.abs(E - 16.2) < 1e-9);
  assert.equal(C.fmtNum(E * 3600), C.fmtNum(58320));
  assert.ok(Math.abs(11.3 / E - 0.6975) < 1e-4);
});
