// Banque de questions du chapitre « Équation de réaction et molécules » (physique-1re/combustions.js).
// Lancer : node --test tests/js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../../assets/core.js');
const Bank = require('../../physique-1re/combustions.js');

const PAGE = fs.readFileSync(path.join(__dirname, '..', '..', 'physique-1re', 'combustions.html'), 'utf8');
const APP = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'app.js'), 'utf8');
const CSS = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'style.css'), 'utf8');
const S = Bank.SPECIES;

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
  assert.doesNotMatch(s, /NaN|undefined|Infinity|\[object|null/, where);
  for (const mac of s.match(/\\Q[A-Za-z]+/g) || []) assert.ok(MACROS.has(mac), `macro inconnue ${mac} : ${where}`);
  // élision : « d’éthanol », « de l’eau » (jamais « de éthanol »)
  assert.doesNotMatch(s.replace(/<[^>]+>/g, ' '), /(^|[\s(])(de|du|le|au) [aeéiouAEÉIOU]/, `élision manquante : ${where}`);
  let depth = 0;
  for (const ch of s.replace(/\\[{}]/g, '')) { if (ch === '{') depth++; if (ch === '}') depth--; assert.ok(depth >= 0, `accolades : ${where}`); }
  assert.equal(depth, 0, `accolades déséquilibrées : ${where}`);
}
const typed = (qn) => String(Number(qn.answer.toPrecision(qn.sig || 3))).replace('.', ',');
/** Nombre écrit par texNum (« 0{,}25 », « 1\,000 ») → valeur. */
const texVal = (s) => Number(s.replace(/\{,\}/g, '.').replace(/\\,/g, ''));
const SCEN_FUELS = ['methane', 'propane', 'pentane', 'ethanol', 'ethene', 'butane', 'octane'].map((k) => S[k]);
/** Scénario d'une question de tableau d'avancement : combustible, quantités initiales. */
function parseScenario(html) {
  const r = /On fait brûler \\\(([\d{},\\]+)\\ \\mathrm\{mol\}\\\) d(?:e |’)(.+?) dans \\\(([\d{},\\]+)\\ \\mathrm\{mol\}\\\) de dioxygène/.exec(html);
  assert.ok(r, html);
  const s = SCEN_FUELS.find((x) => x.n === r[2]);
  assert.ok(s, r[2]);
  return { s, B: Bank.balance(s.f), n0f: texVal(r[1]), n0O: texVal(r[3]) };
}

test('les macros et les couleurs du chapitre existent (app.js, style.css, deux thèmes)', () => {
  for (const m of ['\\Qn', '\\QM', '\\QVm', '\\Qm', '\\QV']) assert.ok(MACROS.has(m), m);
  for (const cls of ['q-n', 'q-M', 'q-fuel', 'q-O2', 'q-CO2', 'q-H2O', 'q-reac', 'q-prod']) {
    assert.match(CSS, new RegExp(`\\.${cls} \\{ color: var\\(--${cls}\\); \\}`), cls);
    assert.equal((CSS.match(new RegExp(`--${cls}: #[0-9a-f]{6};`, 'g')) || []).length, 2, `--${cls} : thème sombre et thème clair`);
  }
  // l'eau garde le vert de l'eau du chapitre 2, dans les deux thèmes
  const vals = (v) => [...CSS.matchAll(new RegExp(`--${v}: (#[0-9a-f]{6});`, 'g'))].map((m) => m[1]);
  assert.deepEqual(vals('q-H2O'), vals('q-w'));
});

test('chaque type de question : réponse finie, texte propre, solution', () => {
  const B = Bank.make(seeded(42));
  for (const [kind, gen] of Object.entries(B.kinds)) {
    for (let i = 0; i < 250; i++) {
      const qn = gen();
      const where = `${kind} #${i} « ${qn.html.slice(0, 80)} »`;
      assert.ok(qn.type && qn.html && qn.ask, where);
      assert.ok(qn.solution && qn.solution.length > 20, `solution manquante : ${where}`);
      texts(qn).forEach((s) => checkText(s, where));
      if (qn.choices) {
        assert.ok(qn.choices.length >= 2, where);
        assert.ok(Number.isInteger(qn.answer) && qn.answer >= 0 && qn.answer < qn.choices.length, where);
        const labels = qn.choices.map((c) => c.html);
        assert.equal(new Set(labels).size, labels.length, `choix en double : ${where}`);
        assert.equal(qn.choices[qn.answer].why, undefined, `la bonne réponse n’a pas d’explication d’erreur : ${where}`);
        qn.choices.forEach((c, j) => { if (j !== qn.answer) assert.ok(c.why || typeof c.html === 'string', where); });
      } else {
        assert.ok(Number.isFinite(qn.answer) && qn.answer > 0, `réponse non finie ou non positive : ${where}`);
        // unité pour une grandeur ; pas d'unité pour un nombre stœchiométrique (entier)
        if (!qn.unit) assert.ok(Number.isInteger(qn.answer), `unité manquante : ${where}`);
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
  assert.ok(recognised > 4000, `seulement ${recognised} erreurs reconnues`);
});

test('ajustement : chaque équation de combustion complète conserve C, H et O, avec les plus petits entiers', () => {
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const mols = Object.values(S).filter((s) => s.f.C && s.f.H).concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 17, 31].map(Bank.alkane));
  for (const s of mols) {
    const B = Bank.balance(s.f), A = Bank.atoms(s.f, B);
    for (const e of ['C', 'H', 'O']) assert.equal(A[e][0], A[e][1], `${s.n} : élément ${e}`);
    for (const k of ['a', 'b', 'c', 'd']) assert.ok(Number.isInteger(B[k]) && B[k] >= 1, `${s.n} : ${k}`);
    assert.equal(gcd(gcd(B.a, B.b), gcd(B.c, B.d)), 1, `${s.n} : pas les plus petits entiers`);
  }
  // équations du cours et de la fiche
  const eq = (k) => { const B = Bank.balance(S[k].f); return [B.a, B.b, B.c, B.d]; };
  assert.deepEqual(eq('methane'), [1, 2, 1, 2]);
  assert.deepEqual(eq('propane'), [1, 5, 3, 4]); // le cours 2 écrit « 2 O₂ » par erreur : c'est 5 O₂
  assert.deepEqual(eq('butane'), [2, 13, 8, 10]);
  assert.deepEqual(eq('pentane'), [1, 8, 5, 6]);
  assert.deepEqual(eq('octane'), [2, 25, 16, 18]);
  assert.deepEqual(eq('ethanol'), [1, 3, 2, 3]);
  assert.deepEqual(eq('hentriacontane'), [1, 47, 31, 32]);
  // une équation qui n'est pas ajustée est repérée élément par élément
  const A = Bank.atoms(S.propane.f, { a: 1, b: 1, c: 1, d: 1 });
  assert.deepEqual(A, { C: [3, 1], H: [8, 2], O: [2, 3] });
});

test('familles, formules brutes et masses molaires', () => {
  for (let n = 1; n <= 31; n++) {
    const a = Bank.alkane(n);
    assert.equal(a.f.H, 2 * n + 2);
    assert.ok(a.n.endsWith('ane'), a.n);
    assert.equal(Bank.molar(a.f), 14 * n + 2);
  }
  assert.equal(Bank.alkaneName(5), 'pentane');
  assert.equal(Bank.alkaneName(31), 'hentriacontane');
  assert.equal(S.ethene.f.H, 2 * S.ethene.f.C); // alcène CnH2n
  assert.deepEqual(S.ethanol.f, { C: 2, H: 6, O: 1 }); // C2H5OH = C2H6O
  const M = (k) => Bank.molar(S[k].f);
  assert.deepEqual(['O2', 'H2O', 'CO2', 'methane', 'propane', 'pentane', 'ethanol', 'hentriacontane'].map(M), [32, 18, 44, 16, 44, 72, 46, 436]);
  assert.equal(Bank.fu(S.hentriacontane.f), 'C₃₁H₆₄');
  assert.equal(Bank.ftex(S.CO2.f), 'CO_{2}');
});

test('QCM des familles : la bonne réponse suit la composition de la molécule', () => {
  const B = Bank.make(seeded(3));
  for (let i = 0; i < 400; i++) {
    const qn = B.kinds.family();
    const right = qn.choices[qn.answer].html;
    const f = /\\mathrm\{(.+?)\}\\\) \?/.exec(qn.html)[1];
    if (/OH/.test(f)) assert.equal(right, 'un alcool', f);
    else if (/O/.test(f)) assert.equal(right, 'ni un hydrocarbure, ni un alcool', f);
    else if (/=/.test(f)) assert.equal(right, 'un alcène', f);
    else {
      const nC = (f.match(/C(?:_\{?(\d+)\}?)?/g) || []).reduce((s, x) => s + (Number((/\d+/.exec(x) || [1])[0])), 0);
      const nH = (f.match(/H_\{?(\d+)\}?/g) || []).reduce((s, x) => s + Number(/\d+/.exec(x)[0]), 0);
      if (/–/.test(f)) assert.equal(right, 'un alcane', f); // chaîne semi-développée sans liaison double
      else assert.equal(right, nH === 2 * nC + 2 ? 'un alcane' : 'un alcène', f);
    }
  }
});

test('tableau d’avancement : x_max est la plus petite valeur, l’état final n’a rien de négatif', () => {
  const B = Bank.make(seeded(17));
  const lims = new Set();
  for (let i = 0; i < 400; i++) {
    const qn = B.kinds.xmax();
    const c = parseScenario(qn.html);
    const xf = c.n0f / c.B.a, xo = c.n0O / c.B.b;
    assert.ok(Math.abs(qn.answer - Math.min(xf, xo)) < 1e-9 * Math.max(1, qn.answer), qn.html);
    assert.ok(Math.abs(xf / xo - 1) >= 0.079, 'les deux réactifs ne sont jamais presque stœchiométriques');
    lims.add(xf < xo ? 'fuel' : 'O2');
    assert.ok(C.matchTrap(Math.max(xf, xo), qn.traps, qn.answer), 'garder la plus grande valeur est reconnu');
    // le tableau de la solution : 3 lignes, aucune quantité négative, le limitant à 0
    const finals = /État final<\/th>(.*?)<\/tr>/.exec(qn.solution)[1];
    const cells = [...finals.matchAll(/<td>(.*?)<\/td>/g)].map((m) => m[1]).slice(1);
    assert.equal(cells.length, 4);
    for (const v of cells) assert.doesNotMatch(v, /−/, `quantité négative : ${v}`);
    assert.ok(cells.slice(0, 2).includes('0'), 'le réactif limitant est entièrement consommé');
  }
  assert.deepEqual([...lims].sort(), ['O2', 'fuel']);
});

test('état final et réactif limitant cohérents avec l’équation', () => {
  const B = Bank.make(seeded(23));
  const asked = new Set();
  for (let i = 0; i < 400; i++) {
    const qn = B.kinds.finalState();
    const c = parseScenario(qn.html), xm = Math.min(c.n0f / c.B.a, c.n0O / c.B.b);
    const want = /CO_2\}\\\) formé/.test(qn.html) ? c.B.c * xm
      : /H_2O\}\\\) formée/.test(qn.html) ? c.B.d * xm
      : c.n0f / c.B.a < c.n0O / c.B.b ? c.n0O - c.B.b * xm : c.n0f - c.B.a * xm;
    asked.add(/restant/.test(qn.html) ? 'reste' : /CO_2/.test(qn.html.split('Calcule')[1]) ? 'CO2' : 'H2O');
    assert.ok(Math.abs(qn.answer - want) < 1e-9 * Math.max(1, want), `${qn.answer} ≠ ${want} : ${qn.html}`);
    const l = B.kinds.limiting();
    const s = parseScenario(l.html), xf = s.n0f / s.B.a, xo = s.n0O / s.B.b;
    const right = l.choices[l.answer].html;
    if (Math.abs(xf - xo) < 1e-9) assert.match(right, /Aucun/);
    else if (xf < xo) assert.ok(right.includes(s.s.n), right);
    else assert.match(right, /dioxygène/);
  }
  assert.deepEqual([...asked].sort(), ['CO2', 'H2O', 'reste']);
});

test('d’une masse de combustible aux produits (exercices 2, 3 et 4) : chaîne de calcul complète', () => {
  const B = Bank.make(seeded(31));
  const seen = new Set();
  for (let i = 0; i < 400; i++) {
    const qn = B.kinds.fromMass();
    const r = /\\Qm = ([\d{},\\]+)\\ \\mathrm\{g\}\\\) d(?:e |’)(.+?) \\\(/.exec(qn.html);
    const s = Object.values(S).find((x) => x.n === r[2]);
    const Bal = Bank.balance(s.f), n = texVal(r[1]) / Bank.molar(s.f), xm = n / Bal.a;
    const want = { mol: /dioxyde/.test(qn.html.split('Calcule')[1]) ? Bal.c * xm : Bal.d * xm, L: Bal.c * xm * 24, g: /eau/.test(qn.html.split('Calcule')[1]) ? Bal.d * xm * 18 : Bal.c * xm * 44 }[qn.unit];
    // la masse affichée est arrondie à 4 chiffres : écart relatif < 0,05 %
    assert.ok(Math.abs(qn.answer / want - 1) < 5e-4, `${qn.answer} ≠ ${want} : ${qn.html}`);
    seen.add(qn.unit);
    assert.ok(qn.traps.some((t) => /Commence par convertir/.test(t.msg)), 'oublier n = m / M');
  }
  assert.deepEqual([...seen].sort(), ['L', 'g', 'mol']);
});

test('nombres stœchiométriques demandés : ceux de l’équation ajustée, pièges propres aux alcools et aux « × 2 »', () => {
  const B = Bank.make(seeded(9));
  let alcohol = 0, doubled = 0;
  for (let i = 0; i < 500; i++) {
    const qn = B.kinds.coefficient();
    const s = Object.values(S).find((x) => qn.html.includes('combustion complète ' + (/^[aeéiouh]/.test(x.n) ? 'de l’' : 'du ') + x.n + ' '));
    assert.ok(s, qn.html);
    const Bal = Bank.balance(s.f);
    const target = /devant \\\(\\mathrm\{O_2\}/.test(qn.html) ? 'b' : /devant \\\(\\mathrm\{CO_2\}/.test(qn.html) ? 'c' : /devant \\\(\\mathrm\{H_2O\}/.test(qn.html) ? 'd' : 'a';
    assert.equal(qn.answer, Bal[target], qn.html);
    if (target === 'b' && s.f.O) { alcohol++; assert.ok(qn.traps.some((t) => /atome O de/.test(t.msg)), 'oublier l’oxygène de l’alcool'); }
    if (target === 'b' && Bal.a === 2) { doubled++; assert.ok(C.matchTrap(Bal.b / 2, qn.traps, qn.answer), 'nombre non entier'); }
  }
  assert.ok(alcohol > 10 && doubled > 10);
  // combustion incomplète : atomes conservés
  for (let i = 0; i < 100; i++) {
    const qn = B.kinds.incomplete();
    const r = /\\mathrm\{C_\{(\d+)\}H_\{(\d+)\}\} \+ \\square/.exec(qn.html);
    if (!r) { assert.ok([2, 6].includes(qn.answer)); continue; }
    const n = Number(r[1]);
    assert.equal(Number(r[2]), 2 * n + 2);
    assert.equal(2 * qn.answer, 2 + (n + 1), 'atomes O : CO₂ + (n + 1) H₂O');
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
  for (let i = 0; i < 900; i++) {
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
  for (let i = 0; i < 600; i++) qs.push(B.training());
  for (let i = 0; i < 20; i++) qs.push(...B.exam());
  for (const qn of qs) {
    assert.ok(qn.ref, `${qn.kind} sans carte de cours`);
    assert.ok(PAGE.includes(`id="${qn.ref}"`), `carte #${qn.ref} absente de la page (${qn.kind})`);
  }
});

test('valeurs des exercices de la fiche et des exemples du cours retrouvées', () => {
  const xmax = (k, n0f, n0O) => { const B = Bank.balance(S[k].f); return Math.min(n0f / B.a, n0O === null ? Infinity : n0O / B.b); };
  // cours 2, exemple 1 : 5 mol CH4 + 12 mol O2 → x_max = 5 ; reste 2 mol O2 ; 5 mol CO2 ; 10 mol H2O
  assert.equal(xmax('methane', 5, 12), 5);
  assert.equal(12 - 2 * 5, 2);
  // cours 2, exemple 2 : 4 mol de propane, O2 en excès → 12 mol CO2, 16 mol H2O
  assert.equal(3 * xmax('propane', 4, null), 12);
  assert.equal(4 * xmax('propane', 4, null), 16);
  // exercice 1 : pentane 0,10 mol + 2,0 mol O2 → x_max = 0,10 ; O2 1,2 ; CO2 0,50 ; H2O 0,60
  const x1 = xmax('pentane', 0.1, 2.0);
  assert.equal(x1, 0.1);
  assert.equal(C.roundSig(2.0 - 8 * x1, 3), 1.2);
  assert.equal(C.roundSig(5 * x1, 3), 0.5);
  assert.equal(C.roundSig(6 * x1, 3), 0.6);
  // exercice 2 : 5,0 mol de propane en excès d'O2 → 15 mol CO2 → 360 L
  assert.equal(3 * xmax('propane', 5, null) * Bank.VM, 360);
  // exercice 3 : 138 g d'éthanol (46 g/mol) = 3,0 mol ; 6,0 mol O2 limitant → x_max = 2,0 ; 4,0 mol CO2 (96 L) ; 6,0 mol H2O (108 g)
  const n3 = 138 / Bank.molar(S.ethanol.f), x3 = xmax('ethanol', n3, 6.0);
  assert.equal(n3, 3);
  assert.equal(x3, 2);
  assert.equal(3 - x3, 1);
  assert.equal(2 * x3 * Bank.VM, 96);
  assert.equal(3 * x3 * 18, 108);
  // exercice 4 : C31H64, 436 g/mol ; 20 g → 4,59 × 10⁻² mol ; 1,42 mol CO2 ; 1,47 mol H2O ; 62,6 g CO2 ; incomplète : 17 O2
  const n4 = 20 / Bank.molar(S.hentriacontane.f);
  assert.equal(C.roundSig(n4, 3), 0.0459);
  assert.equal(C.roundSig(31 * n4, 3), 1.42);
  assert.equal(C.roundSig(32 * n4, 3), 1.47);
  assert.equal(C.roundSig(31 * n4 * 44, 3), 62.6);
  assert.equal((31 + 3) / 2, 17);
  // combustion incomplète du méthane (cours 1) : 4 CH4 + 6 O2 → 8 H2O + CO2 + C + 2 CO
  assert.deepEqual([4, 16, 12], [1 + 1 + 2, 8 * 2, 8 + 2 + 2]);
});

test('la page cite les mêmes valeurs que ses solutions', () => {
  // équations en ligne : un groupe \\mathrm par espèce, pour que KaTeX puisse couper la ligne sur téléphone
  for (const v of ['\\mathrm{C_5H_{12}} + 8\\,\\mathrm{O_2}', 'C_3H_8 + 5\\,O_2', '2\\,C_4H_{10} + 13\\,O_2', '2\\,\\mathrm{C_8H_{18}} + 25\\,\\mathrm{O_2}', '\\mathrm{C_2H_6O} + 3\\,\\mathrm{O_2}',
    '\\mathrm{C_{31}H_{64}} + 47\\,\\mathrm{O_2}', '\\mathrm{C_{31}H_{64}} + 17\\,\\mathrm{O_2}', '4\\,CH_4 + 6\\,O_2', '0{,}25', '1,2', '360', '96', '108', '436', '4{,}59 \\times 10^{-2}', '62{,}6', '1,42', '1,47']) {
    assert.ok(PAGE.includes(v), `valeur ${v} absente de la page`);
  }
});

test('tableau HTML généré : en-tête de l’équation, trois lignes, « excès » pour un réactif en excès', () => {
  const html = Bank.advTable(S.propane.f, Bank.balance(S.propane.f), 4, null, 4);
  assert.equal((html.match(/<tr>/g) || []).length, 4);
  assert.match(html, /excès/);
  assert.match(html, /<td>12<\/td><td>16<\/td><\/tr><\/tbody>/);
  const t2 = Bank.advTable(S.methane.f, Bank.balance(S.methane.f), 5, 12, 5);
  assert.match(t2, /<td>12 − 2<i>x<\/i><\/td>/);
  assert.match(t2, /<td>0<\/td><td>2<\/td><td>5<\/td><td>10<\/td>/);
});

test('les listes d’étapes reprises après un tableau gardent la bonne numérotation', () => {
  // la numérotation des .steps-list est un compteur CSS : l'attribut start seul ne suffit pas
  const lists = [...PAGE.matchAll(/<ol class="steps-list" start="(\d+)"([^>]*)>/g)];
  assert.ok(lists.length >= 4);
  for (const [, start, rest] of lists) assert.match(rest, new RegExp(`counter-reset: s ${Number(start) - 1}"`), `start="${start}"`);
});

test('l’interrupteur des widgets ne déteint pas sur celui du brouillon (Texte / Stylo)', () => {
  // le brouillon a son propre .seg : les règles des widgets doivent rester limitées à .widget
  for (const line of CSS.split('\n')) {
    if (/^\.seg button|^\.seg \{ display: flex/.test(line)) assert.fail(`règle .seg non limitée aux widgets : ${line}`);
  }
  assert.match(CSS, /\.widget \.seg \{ display: flex;/);
  assert.match(CSS, /\.widget \.seg button\[aria-pressed="true"\]/);
});
