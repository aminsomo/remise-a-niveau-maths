// Banque de questions du chapitre « Énergie chimique » (physique-1re/energie-chimique.js).
// Lancer : node --test tests/js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../../assets/core.js');
const Bank = require('../../physique-1re/energie-chimique.js');

const PAGE = fs.readFileSync(path.join(__dirname, '..', '..', 'physique-1re', 'energie-chimique.html'), 'utf8');
const APP = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'app.js'), 'utf8');
const CSS = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'style.css'), 'utf8');

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
  // élision : « d’éthanol », « de l’éthanol », « l’essence » (jamais « de éthanol »)
  assert.doesNotMatch(s.replace(/<[^>]+>/g, ' '), /(^|[\s(])(de|du|le|au) [aeéiouAEÉIOU]/, `élision manquante : ${where}`);
  let depth = 0;
  for (const ch of s.replace(/\\[{}]/g, '')) { if (ch === '{') depth++; if (ch === '}') depth--; assert.ok(depth >= 0, `accolades : ${where}`); }
  assert.equal(depth, 0, `accolades déséquilibrées : ${where}`);
}
const typed = (qn) => String(Number(qn.answer.toPrecision(qn.sig || 3))).replace('.', ',');

test('les macros de couleur du chapitre existent dans app.js et ont leur couleur dans style.css', () => {
  for (const m of ['\\QE', '\\QQ', '\\Qm', '\\Qdm', '\\QPC', '\\Qrho', '\\Qd', '\\QV', '\\Qc', '\\QT', '\\QdT']) assert.ok(MACROS.has(m), m);
  for (const cls of ['q-PC', 'q-rho', 'q-V']) {
    assert.match(CSS, new RegExp(`\\.${cls} \\{ color: var\\(--${cls}\\); \\}`), cls);
    assert.equal((CSS.match(new RegExp(`--${cls}: #[0-9a-f]{6};`, 'g')) || []).length, 2, `--${cls} : thème sombre et thème clair`);
  }
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
        assert.ok(Number.isFinite(qn.answer) && qn.answer > 0, `réponse non finie ou non positive : ${where}`);
        assert.ok(qn.unit, `unité manquante : ${where}`);
      }
    }
  }
});

test('une réponse arrondie à 3 chiffres significatifs est acceptée, aussi en notation scientifique', () => {
  const B = Bank.make(seeded(7));
  for (const [kind, gen] of Object.entries(B.kinds)) {
    for (let i = 0; i < 200; i++) {
      const qn = gen();
      if (qn.choices) continue;
      assert.ok(C.isCorrect(C.parseNum(typed(qn)), qn.answer, qn.tol), `${kind} : « ${typed(qn)} » refusé (attendu ${qn.answer})`);
      const sci = C.fmtNum(qn.answer, qn.sig || 3).replace(/\s/g, '').replace('×10', '*10^').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (e) => e.replace(/⁻/g, '-').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(d)));
      assert.ok(C.isCorrect(C.parseNum(sci), qn.answer, qn.tol), `${kind} : « ${sci} » refusé (attendu ${qn.answer})`);
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
        if (Math.abs(t.value - qn.answer) <= 2 * C.approxTol(qn.answer, true) || C.isCorrect(t.value, qn.answer, qn.tol)) continue;
        const v = C.parseNum(String(Number(t.value.toPrecision(3))).replace('.', ','));
        if (C.isCorrect(v, qn.answer, qn.tol)) continue;
        assert.ok(C.matchTrap(v, qn.traps, qn.answer), `${kind} : erreur « ${v} » non reconnue`);
        recognised++;
      }
    }
  }
  assert.ok(recognised > 3500, `seulement ${recognised} erreurs reconnues`);
});

test('E = m × PC : la masse est convertie en kg, oublier la conversion est reconnu', () => {
  const B = Bank.make(seeded(13));
  let grams = 0, tonnes = 0;
  for (let i = 0; i < 400; i++) {
    const qn = B.kinds.energy();
    const f = Object.values(Bank.FUELS).find((x) => qn.html.includes(`\\text{${x.n}}`));
    assert.ok(f, qn.html);
    const toJ = qn.unit === 'J' ? 1 : 1e6;
    const kg = qn.answer * toJ / (f.pc * 1e6);
    assert.ok(kg > 0.1 && kg < 4e4, `masse ${kg} kg`);
    if (/\\mathrm\{g\}/.test(qn.html)) { grams++; assert.ok(C.matchTrap(qn.answer * 1000, qn.traps, qn.answer), 'g non convertis'); }
    if (/\\mathrm\{t\}/.test(qn.html)) { tonnes++; assert.equal(qn.unit, 'J'); assert.ok(C.matchTrap(qn.answer / 1000, qn.traps, qn.answer), 't non converties'); }
    const div = qn.traps.find((t) => /multiplie/.test(t.msg));
    assert.ok(div && div.value < qn.answer, 'diviser au lieu de multiplier');
  }
  assert.ok(grams > 20 && tonnes > 20);
});

test('liquides : m = ρ × V, et oublier la masse volumique est une erreur fréquente', () => {
  const B = Bank.make(seeded(21));
  for (let i = 0; i < 300; i++) {
    const qn = B.kinds.liquid();
    const hit = qn.traps.find((t) => /n’a pas une masse de 1 kg/.test(t.msg));
    assert.ok(hit, 'piège « 1 L = 1 kg »');
    if (qn.unit === 'kg') assert.ok(qn.answer < hit.value, 'ces carburants sont moins denses que l’eau');
    const conv = qn.traps.find((t) => Math.abs(t.value / qn.answer - 1000) < 1e-6);
    assert.ok(conv, 'piège « litres non convertis en m³ »');
  }
});

test('consommation (exercice 16) : volume avec surconsommation, masse et énergie cohérents', () => {
  const B = Bank.make(seeded(16));
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    const qn = B.kinds.consumption();
    seen.add(qn.unit);
    const pct = Number(/(\d+)\\ \\%/.exec(qn.html)[1]);
    const conso = Number(/en moyenne \\\(([\d{},]+)/.exec(qn.html)[1].replace('{,}', '.'));
    const V = conso * (1 + pct / 100);
    const want = { L: V, kg: 0.789 * V, MJ: 0.789 * V * 26.8 }[qn.unit];
    assert.ok(Math.abs(qn.answer - want) < 1e-9, `${qn.unit} : ${qn.answer} ≠ ${want}`);
  }
  assert.deepEqual([...seen].sort(), ['L', 'MJ', 'kg']);
});

test('TP : situations réalistes, PC mesuré plus petit que le vrai PC', () => {
  const B = Bank.make(seeded(31));
  for (let i = 0; i < 300; i++) {
    const qn = B.kinds.tp();
    const [Ti, Tf] = [...qn.html.matchAll(/\\\((\d+(?:\{,\}\d+)?)\\ \{\}\^\{\\circ\}/g)].map((x) => Number(x[1].replace('{,}', '.')));
    assert.ok(Tf - Ti >= 8 && Tf - Ti <= 60, `élévation de température mesurable et sans ébullition : ${Ti} → ${Tf}`);
    if (qn.unit === '%') assert.ok(qn.answer > 30 && qn.answer < 65, `part reçue ${qn.answer} %`);
    else {
      const f = /lampe à alcool/.test(qn.html) ? Bank.FUELS.ethanol : Bank.FUELS.butane;
      assert.ok(qn.answer < f.pc && qn.answer > 0.3 * f.pc, `PC mesuré ${qn.answer} pour ${f.n}`);
    }
    const h = B.kinds.heatFuel();
    assert.ok(h.answer > 5 && h.answer < 600, `masse de gaz pour chauffer l’eau : ${h.answer} g`);
  }
});

test('identifier un combustible : la valeur calculée désigne une seule réponse', () => {
  const B = Bank.make(seeded(14));
  const all = Object.values(Bank.FUELS).concat(Object.values(Bank.ALCOHOLS));
  for (let i = 0; i < 300; i++) {
    const qn = B.kinds.identify();
    const g = Number(/brûle complètement \\\((\d+)/.exec(qn.html)[1]);
    const sciQ = /\\QQ = ([\d{},]+)\\times 10\^\{(\d+)\}/.exec(qn.html);
    const pc = Number(sciQ[1].replace('{,}', '.')) * 10 ** Number(sciQ[2]) / g; // kJ/g = MJ/kg
    const right = all.find((f) => qn.choices[qn.answer].html.startsWith(f.n + ' ('));
    assert.ok(right, qn.choices[qn.answer].html);
    for (const c of qn.choices) {
      const f = all.find((x) => c.html.startsWith(x.n + ' ('));
      const d = Math.abs(f.pc - pc);
      if (f === right) assert.ok(d / f.pc < 0.0005, `${f.n} : ${pc}`);
      else assert.ok(d > Math.abs(right.pc - pc) + 0.05, `${f.n} trop proche de ${right.n}`);
    }
  }
});

test('QCM du cours : les rôles dans la combustion et le signe des échanges sont cohérents', () => {
  for (const s of Bank.SITUATIONS) assert.ok(['combustible', 'comburant', 'activation', 'produit'].includes(s.role), s.what);
  // le dioxygène est toujours le comburant, jamais le combustible
  for (const s of Bank.SITUATIONS.filter((x) => /dioxygène/.test(x.what))) assert.equal(s.role, 'comburant');
  // cours : dissolution de la soude exothermique, du chlorure d'ammonium endothermique
  assert.equal(Bank.THERMO.find((t) => /soude \(/.test(t.n)).s, 1);
  assert.equal(Bank.THERMO.find((t) => /chlorure d’ammonium/.test(t.n)).s, -1);
  const B = Bank.make(seeded(4));
  for (let i = 0; i < 200; i++) {
    const r = B.kinds.role();
    assert.equal(r.choices.length, 4);
    const e = B.kinds.exoEndo();
    const t = Bank.THERMO.find((x) => e.html.includes(x.n));
    assert.ok(t, e.html);
    assert.equal(/^exothermique/.test(e.choices[e.answer].html), t.s > 0, e.html);
  }
});

test('évaluation : 8 questions, 20 points, au moins 5 calculs, valeurs renouvelées', () => {
  const B = Bank.make(seeded(99));
  const a = B.exam(), b = B.exam();
  assert.equal(a.length, Bank.EXAM_QUESTIONS);
  assert.equal(a.reduce((s, x) => s + x.points, 0), C.GATE.TOTAL);
  a.forEach((x) => assert.ok(x.points >= 2 && x.points <= 3));
  assert.notDeepEqual(a.map((x) => x.html), b.map((x) => x.html));
  for (let i = 0; i < 50; i++) assert.ok(B.exam().filter((x) => !x.choices).length >= 5);
});

test('entraînement : jamais deux fois le même type de question de suite, tous les types sortent', () => {
  const B = Bank.make(seeded(5));
  let prev = null;
  const seen = new Set();
  for (let i = 0; i < 700; i++) {
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
  for (let i = 0; i < 500; i++) qs.push(B.training());
  for (let i = 0; i < 20; i++) qs.push(...B.exam());
  for (const qn of qs) {
    assert.ok(qn.ref, `${qn.kind} sans carte de cours`);
    assert.ok(PAGE.includes(`id="${qn.ref}"`), `carte #${qn.ref} absente de la page (${qn.kind})`);
  }
});

test('valeurs des exercices de la fiche retrouvées (exercices 11, 14, 16 et 22)', () => {
  const F = Bank.FUELS, A = Bank.ALCOHOLS;
  // tableau de la fiche
  assert.deepEqual([F.methane, F.propane, F.butane, F.h2, F.essence, F.ethanol, F.kerosene].map((f) => f.pc), [50.0, 46.3, 45.6, 120.5, 42.7, 26.8, 43.0]);
  // exercice 11
  assert.ok(Math.abs(13 * F.butane.pc - 592.8) < 1e-9);
  assert.ok(Math.abs(5 * F.propane.pc - 231.5) < 1e-9);
  assert.ok(Math.abs(0.789 * 1.0 * F.ethanol.pc - 21.1452) < 1e-9);
  // exercice 14 : 6,00 g ; 30,7 MJ/kg → propan-1-ol
  assert.ok(Math.abs(182.7e3 / (A.propan2.pc * 1e6) - 6.0e-3) < 1e-9);
  const pc2 = 1.84e7 / 0.600 / 1e6;
  assert.ok(Math.abs(pc2 - A.propan1.pc) < Math.abs(pc2 - A.propan2.pc));
  // exercice 16 : 8,4 L ; 6,63 kg ; 178 MJ contre 224 MJ pour l'essence
  const V = 7.0 * 1.2, me = F.ethanol.rho * V / 1000;
  assert.ok(Math.abs(V - 8.4) < 1e-9);
  assert.ok(Math.abs(me - 6.6276) < 1e-9);
  assert.equal(C.roundSig(me * F.ethanol.pc, 3), 178);
  assert.equal(C.roundSig(F.essence.rho * 7.0 / 1000 * F.essence.pc, 3), 224);
  assert.equal(C.roundSig(224.175 / (0.789 * 26.8), 3), 10.6); // volume d'éthanol pour la même énergie
  // exercice 22 : rapport ≈ 2,8 ; 3,36 × 10¹² J ; 79 t d'essence ; 20 t brûlées avec 162 t de dioxygène
  assert.equal(C.roundSig(120 / 42.7, 2), 2.8);
  assert.equal(28e3 * 120e6, 3.36e12);
  assert.equal(C.roundSig(3.36e12 / 42.7e6, 3), 78700);
  assert.equal(C.roundSig(162 / 8 * 1e3 * 120e6, 2), 2.4e12);
  // TP de la page : 16 720 J ; 13,9 MJ/kg ; 52 %
  assert.equal(0.2 * 4180 * 20, 16720);
  assert.equal(C.roundSig(16720 / 1.2e-3 / 1e6, 3), 13.9);
  assert.equal(Math.round(16720 / 1.2e-3 / 26.8e6 * 100), 52);
});

test('la page cite les mêmes valeurs que ses solutions', () => {
  for (const v of ['592{,}8', '231{,}5', '21{,}1', '6{,}00', '30{,}7', '8{,}4', '6{,}63', '178', '224', '10{,}6', '3{,}36 \\times 10^{12}', '7{,}87 \\times 10^{4}', '16\\,720', '13{,}9', '2{,}4 \\times 10^{12}']) {
    assert.ok(PAGE.includes(v), `valeur ${v} absente de la page`);
  }
});
