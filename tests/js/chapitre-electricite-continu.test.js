// Banque de questions et schémas du chapitre « Électricité en régime continu » (physique-1re/electricite-continu.js).
// Lancer : node --test tests/js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../../assets/core.js');
const Bank = require('../../physique-1re/electricite-continu.js');

const ROOT = path.join(__dirname, '..', '..');
const PAGE = fs.readFileSync(path.join(ROOT, 'physique-1re', 'electricite-continu.html'), 'utf8');
const APP = fs.readFileSync(path.join(ROOT, 'assets', 'app.js'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'assets', 'style.css'), 'utf8');
const F = Bank.FIG;

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
const Q_CLASSES = new Set([...CSS.matchAll(/^\.q-([A-Za-z0-9]+) \{ color: var\(--q-\1\); \}$/gm)].map((m) => m[1]));
function texts(qn) {
  const out = [qn.html, qn.solution || '', qn.ask || ''];
  (qn.traps || []).forEach((t) => out.push(t.msg));
  (qn.choices || []).forEach((c) => { out.push(c.html); if (c.why) out.push(c.why); });
  return out;
}
function checkText(s, where) {
  assert.equal(s.split('\\(').length, s.split('\\)').length, `\\( \\) déséquilibrés : ${where}`);
  assert.doesNotMatch(s, /NaN|undefined|Infinity|\[object|\bnull\b/, where); // « nulle » est un mot du cours
  for (const mac of s.match(/\\Q[A-Za-z]+/g) || []) assert.ok(MACROS.has(mac), `macro inconnue ${mac} : ${where}`);
  for (const m of s.matchAll(/\\q\{([A-Za-z0-9]+)\}/g)) assert.ok(Q_CLASSES.has(m[1]), `couleur inconnue q-${m[1]} : ${where}`);
  // élision : « d’intensité », « l’ampèremètre » (jamais « de intensité ») ; « de A » (un point) reste correct
  assert.doesNotMatch(s.replace(/<[^>]+>/g, ' '), /(^|[\s(])(de|du|le|au) (?:[aeéiou]|[AEÉIOU][a-zé])/, `élision manquante : ${where}`);
  let depth = 0;
  for (const ch of s.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/\\[{}]/g, '')) { if (ch === '{') depth++; if (ch === '}') depth--; assert.ok(depth >= 0, `accolades : ${where}`); }
  assert.equal(depth, 0, `accolades déséquilibrées : ${where}`);
}
const typed = (qn) => String(Number(qn.answer.toPrecision(qn.sig || 3))).replace('.', ',');

/* ---------- lecture des schémas : ce que l'élève voit ---------- */
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"' };
/** Textes d'un SVG (indices recollés : « U_1 = 3,2 V » devient « U1 = 3,2 V »). */
function labels(svg) {
  return [...svg.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<tspan[^>]* y="[^"]*"[^>]*>/g, ' ').replace(/<[^>]+>/g, '').replace(/&\w+;/g, (e) => ENT[e]).replace(/\s+/g, ' ').trim());
}
/** « 3,2 V », « 850 mA », « 0,325 A », « 470 Ω » → valeur SI. */
function si(s) {
  const m = /(−?[\d\s ]+(?:,\d+)?)\s*(mA|A|V|Ω)$/.exec(s.trim());
  assert.ok(m, `valeur illisible : « ${s} »`);
  const v = Number(m[1].replace(/[\s ]/g, '').replace(',', '.').replace('−', '-'));
  return m[2] === 'mA' ? v / 1000 : v;
}
/** Valeur d'une étiquette « NOM = valeur » ; null si « NOM = ? », undefined si absente. */
function labelVal(ls, name) {
  const l = ls.find((x) => x.startsWith(name + ' = '));
  if (!l) return undefined;
  const v = l.slice(name.length + 3);
  return v === '?' ? null : si(v);
}
const svgOf = (html) => (/<svg[\s\S]*?<\/svg>/.exec(html) || [''])[0];
/** Nombre écrit par texNum (« 0{,}25 », « 1\,000 ») → valeur. */
const texVal = (s) => Number(s.replace(/\{,\}/g, '.').replace(/\\,/g, ''));
/** Largeur approchée d'un texte de schéma (en unités du dessin), indices en plus petit. */
function em(str) { return [...str].reduce((a, ch) => a + (/[\s,.:;'’!|iIl1j]/.test(ch) ? 0.3 : /[0-9]/.test(ch) ? 0.58 : /[A-ZΩ]/.test(ch) ? 0.68 : /[=+−?]/.test(ch) ? 0.6 : 0.52), 0); }
function textWidth(html, size) {
  let w = 0;
  html.replace(/<tspan class="sub"[^>]*>([^<]*)<\/tspan>|<[^>]+>|([^<]+)/g, (all, sub, txt) => {
    if (sub) w += em(sub) * size * 0.8; else if (txt) w += em(txt.replace(/&\w+;/g, 'x')) * size;
    return '';
  });
  return w;
}
const close = (a, b, rel = 1e-6) => Math.abs(a - b) <= rel * Math.max(1, Math.abs(b));

test('les macros et les couleurs du chapitre existent (app.js, style.css, deux thèmes)', () => {
  for (const m of ['\\Qu', '\\QEg', '\\QI', '\\QR']) assert.ok(MACROS.has(m), m);
  const vals = (v) => [...CSS.matchAll(new RegExp(`--${v}: (#[0-9a-f]{6});`, 'g'))].map((m) => m[1]);
  for (const cls of ['u', 'gen', 'I', 'R', 'I1', 'I2']) {
    assert.ok(Q_CLASSES.has(cls), `.q-${cls}`);
    assert.equal(vals('q-' + cls).length, 2, `--q-${cls} : thème sombre et thème clair`);
  }
  // teintes reprises de la palette validée : tension orange, générateur bleu, intensité verte, résistance violette
  assert.deepEqual(vals('q-u'), vals('q-CO2'));
  assert.deepEqual(vals('q-gen'), vals('q-O2'));
  assert.deepEqual(vals('q-I'), vals('q-H2O'));
  assert.deepEqual(vals('q-R'), vals('q-reac'));
  // les trois couleurs du graphique de la loi des nœuds sont distinctes
  for (const t of [0, 1]) assert.equal(new Set(['q-I', 'q-I1', 'q-I2'].map((v) => vals(v)[t])).size, 3);
  // les schémas électriques ont leurs styles
  for (const sel of ['.circuit .w', '.circuit .arr path', '.circuit .arr .hd', '.circuit .arr text', '.fig.circuit']) assert.ok(CSS.includes(sel), sel);
});

test('chaque type de question : réponse finie, texte propre, solution', () => {
  const B = Bank.make(seeded(42));
  for (const [kind, gen] of Object.entries(B.kinds)) {
    for (let i = 0; i < 250; i++) {
      const qn = gen();
      const where = `${kind} #${i} « ${qn.html.replace(/<svg[\s\S]*?<\/svg>/g, '[schéma]').slice(0, 90)} »`;
      assert.ok(qn.type && qn.html && qn.ask, where);
      assert.ok(qn.solution && qn.solution.length > 20, `solution manquante : ${where}`);
      texts(qn).forEach((s) => checkText(s, where));
      if (qn.choices) {
        assert.ok(qn.choices.length >= 2, where);
        assert.ok(Number.isInteger(qn.answer) && qn.answer >= 0 && qn.answer < qn.choices.length, where);
        const lbls = qn.choices.map((c) => c.html);
        assert.equal(new Set(lbls).size, lbls.length, `choix en double : ${where}`);
        assert.equal(qn.choices[qn.answer].why, undefined, `la bonne réponse n’a pas d’explication d’erreur : ${where}`);
        qn.choices.forEach((c, j) => { if (j !== qn.answer) assert.ok(c.why, `distracteur sans explication : ${where}`); });
      } else {
        assert.ok(Number.isFinite(qn.answer) && qn.answer !== 0, `réponse non finie ou nulle : ${where}`);
        // seule une tension peut être négative (U_BA = −U_AB) ; intensités et résistances sont positives
        if (qn.unit !== 'V') assert.ok(qn.answer > 0, `réponse négative : ${where}`);
        assert.ok(['V', 'A', 'mA', 'Ω'].includes(qn.unit), `unité : ${where}`);
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
      assert.ok((qn.traps || []).length >= 1, `${kind} : au moins une erreur fréquente expliquée (« ${qn.html.replace(/<svg[\s\S]*?<\/svg>/g, '').slice(0, 120)} »)`);
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

test('loi des mailles : les tensions affichées sur le schéma vérifient E = U₁ + U₂ (+ U₃)', () => {
  const B = Bank.make(seeded(11));
  for (let i = 0; i < 300; i++) {
    const qn = B.kinds.mailleSerie(), ls = labels(svgOf(qn.html));
    const fill = (v) => (v === null ? qn.answer : v);
    const E = fill(labelVal(ls, 'E')), us = ['U1', 'U2', 'U3'].map((n) => labelVal(ls, n)).filter((v) => v !== undefined).map(fill);
    assert.ok(us.length === 2 || us.length === 3, ls.join(' | '));
    assert.ok(close(E, us.reduce((a, b) => a + b, 0)), `E = ${E}, U = ${us}`);
    assert.ok(us.every((u) => u > 0), 'chaque récepteur a une tension positive');
  }
});

test('exercice 1 : les tensions des mailles ABCDA et ADEA sont cohérentes', () => {
  const B = Bank.make(seeded(12));
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    const qn = B.kinds.mailleFleche(), ls = labels(svgOf(qn.html)), U = {};
    for (const n of ['AB', 'BC', 'CD', 'AD', 'EA', 'ED']) { const v = labelVal(ls, 'U' + n); if (v !== undefined) U[n] = v === null ? (seen.add(n), qn.answer) : v; }
    let checked = 0;
    if (['AB', 'BC', 'CD', 'AD'].every((n) => n in U)) { assert.ok(close(U.AD, U.AB + U.BC + U.CD)); checked++; }
    if (['AD', 'EA', 'ED'].every((n) => n in U)) { assert.ok(close(U.ED, U.AD + U.EA)); checked++; }
    assert.equal(checked, 1, ls.join(' | '));
  }
  assert.deepEqual([...seen].sort(), ['AD', 'CD', 'EA', 'ED']);
  // les valeurs de la fiche : 2 + 3 + 4 = 9 V, puis 3 + 9 = 12 V
  assert.ok(PAGE.includes('\\(\\q{u}{U_{AD}} = 2 + 3 + 4 = 9\\ \\mathrm{V}\\)'));
  assert.ok(PAGE.includes('\\(\\q{gen}{U_{ED}} = 3 + 9 = 12\\ \\mathrm{V}\\)'));
});

test('loi des nœuds : I₃ = I₁ + I₂ (exercice 2) et Σ entrants = Σ sortants (nœud à quatre fils)', () => {
  const B = Bank.make(seeded(13));
  for (let i = 0; i < 300; i++) {
    const qn = B.kinds.noeud(), ls = labels(svgOf(qn.html));
    // indications des ampèremètres A1, A2, A3, dans cet ordre
    const reads = ls.filter((l) => /^(\?|[\d\s ,]+ m?A)$/.test(l));
    assert.equal(reads.length, 3, ls.join(' | '));
    const [i1, i2, i3] = reads.map((r) => (r === '?' ? (qn.unit === 'mA' ? qn.answer / 1000 : qn.answer) : si(r)));
    assert.ok(close(i3, i1 + i2), `${i1} + ${i2} ≠ ${i3}`);
  }
  for (let i = 0; i < 300; i++) {
    const qn = B.kinds.noeudMulti(), ls = labels(svgOf(qn.html));
    const r = /Entrent dans le nœud : (.*?) ; en sortent : (.*?)\.<\/li>/.exec(qn.solution);
    const idx = (s) => [...s.matchAll(/I_\{(\d)\}/g)].map((m) => m[1]);
    const val = (k) => { const v = labelVal(ls, 'I' + k); return v === null ? qn.answer : v; };
    const sIn = idx(r[1]).reduce((a, k) => a + val(k), 0), sOut = idx(r[2]).reduce((a, k) => a + val(k), 0);
    assert.equal(idx(r[1]).length + idx(r[2]).length, 4);
    assert.ok(close(sIn, sOut), `${sIn} ≠ ${sOut}`);
  }
});

test('dérivation et série : même tension en dérivation, même intensité en série', () => {
  const B = Bank.make(seeded(14));
  for (let i = 0; i < 200; i++) {
    const qn = B.kinds.derivation(), ls = labels(svgOf(qn.html));
    const known = ['E', 'U1', 'U2'].map((n) => labelVal(ls, n)).filter((v) => typeof v === 'number');
    assert.equal(known.length, 1);
    assert.ok(close(qn.answer, known[0]));
    const s = B.kinds.serieIntensite(), a1 = /indique \\\(([\d{},]+)\\ \\mathrm\{A\}\\\)/.exec(s.html);
    assert.ok(close(s.unit === 'mA' ? s.answer / 1000 : s.answer, texVal(a1[1])));
  }
});

test('loi d’Ohm : U = R × I avec des unités converties (Ω, A, V)', () => {
  const B = Bank.make(seeded(15));
  const R = (h) => { const m = /\\q\{R\}\{R\} = ([\d{},\\]+)\\ (\\Omega|\\mathrm\{k\\Omega\})/.exec(h); return texVal(m[1]) * (m[2] === '\\Omega' ? 1 : 1000); };
  const I = (h) => texVal(/\\q\{I\}\{I\} = ([\d{},\\]+)\\ \\mathrm\{mA\}/.exec(h)[1]) / 1000;
  const U = (h) => texVal(/\\q\{u\}\{U\} = ([\d{},\\]+)\\ \\mathrm\{V\}/.exec(h)[1]);
  for (let i = 0; i < 300; i++) {
    let qn = B.kinds.ohmU(); assert.ok(close(qn.answer, R(qn.html) * I(qn.html)));
    qn = B.kinds.ohmR(); assert.ok(close(qn.answer, U(qn.html) / I(qn.html)));
    qn = B.kinds.ohmI(); assert.equal(qn.unit, 'mA'); assert.ok(close(qn.answer, U(qn.html) / R(qn.html) * 1000));
  }
});

test('exercices 3 et 4 : la résistance ou la grandeur demandée se recalcule à partir du schéma', () => {
  const B = Bank.make(seeded(16));
  for (let i = 0; i < 300; i++) {
    // n° 14 : R = (E − R₀ I) / I
    let qn = B.kinds.serieR(), ls = labels(svgOf(qn.html));
    let E = si(ls.find((l) => /^[\d,]+ V$/.test(l))), I = labelVal(ls, 'I'), ohms = ls.filter((l) => /Ω$/.test(l)).map(si);
    assert.ok(close(qn.answer, (E - ohms[0] * I) / I), ls.join(' | '));
    assert.ok(qn.answer > 50 && qn.answer < 2000);
    // n° 15 : R en dérivation avec Rp, après R₀
    qn = B.kinds.mixteR(); ls = labels(svgOf(qn.html));
    E = si(ls.find((l) => /^[\d,]+ V$/.test(l))); I = labelVal(ls, 'I'); ohms = ls.filter((l) => /Ω$/.test(l)).map(si);
    const up = E - ohms[0] * I, ir = I - up / ohms[1];
    assert.ok(ir > 0 && close(qn.answer, up / ir), ls.join(' | '));
    // exercice 3 : nœud C et mailles ABCFA, CDEFC
    qn = B.kinds.mixte(); ls = labels(svgOf(qn.html));
    E = labelVal(ls, 'E'); const u1 = labelVal(ls, 'U1'), i1 = labelVal(ls, 'I1'), i2 = labelVal(ls, 'I2');
    const u2 = E - u1, i3 = i1 - i2, target = /Calcule \\\(\\q\{\w+\}\{(\w)_\{(\d)\}\}\\\)/.exec(qn.html);
    const want = { I3: i3, U2: u2, U3: u2, R1: u1 / i1, R2: u2 / i2, R3: u2 / i3 }[target[1] + target[2]];
    assert.ok(i3 > 0 && u2 > 0);
    assert.ok(close(qn.answer, want), `${target[0]} : ${qn.answer} ≠ ${want}`);
  }
  // valeurs de la fiche : 505 Ω (n° 14) et 231 Ω (n° 15)
  assert.equal(Math.round((5 - 220 * 0.0069) / 0.0069), 505);
  const up = 5 - 470 * 0.008;
  assert.equal(Math.round(up / (0.008 - up / 470)), 231);
  assert.ok(PAGE.includes('\\approx 505\\ \\Omega') && PAGE.includes('\\approx 231\\ \\Omega'));
});

test('schémas : SVG accessibles, textes lisibles qui restent dans le dessin', () => {
  const B = Bank.make(seeded(17));
  const figs = [F.conventions(), F.coursMaille(), F.mesures(), F.ohm(), F.ex1(), F.ex2({ a1: '0,325 A', a3: '850 mA' }), F.ex2({ sol: true, a1: '0,325 A', a2: '0,525 A', a3: '850 mA' }),
    F.ex3(), F.ex4(13), F.ex4(14), F.ex4(15),
    F.parallel({ t: 'R', names: ['R_1', 'R_2'], E: 'E = 24 V', u: ['U_1 = 24 V', 'U_2 = 24 V'], i: 'I = 1 440 mA', i1: 'I_1 = 1 200 mA', i2: 'I_2 = 240 mA', colors: true, nodes: ['N', 'M'] }),
    F.loop({ recs: [{ t: 'R', name: 'R_1', u: 'U_1 = 12,5 V' }, { t: 'R', name: 'R_2', u: 'U_2 = 0,229 V' }, { t: 'R', name: 'R_3', u: 'U_3 = 11,3 V' }], E: 'E = 24 V', i: 'I = 22,9 mA', rot: true })];
  for (const kind of ['mailleSerie', 'mailleFleche', 'derivation', 'noeud', 'noeudMulti', 'serieIntensite', 'serieR', 'mixteR', 'mixte', 'convention', 'ohmU']) {
    for (let i = 0; i < 40; i++) { const s = svgOf(B.kinds[kind]().html); if (s) figs.push(s); }
  }
  assert.ok(figs.length > 300);
  for (const s of figs) {
    assert.match(s, /^<svg class="fig circuit" viewBox="(\d+) 0 (\d+) (\d+)" role="img" aria-label="[^"]{20,}">/);
    assert.doesNotMatch(s, /NaN|undefined|null/);
    const [, X0, W, H] = /viewBox="(\d+) 0 (\d+) (\d+)"/.exec(s).map(Number);
    for (const m of s.matchAll(/ (?:cx|x)="([\d.]+)"/g)) assert.ok(+m[1] >= X0 && +m[1] <= X0 + W, `élément hors du cadre (x = ${m[1]})`);
    for (const m of s.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)"(?: text-anchor="(\w+)")?(?: class="([\w ]+)")?>([\s\S]*?)<\/text>/g)) {
      const x = +m[1], y = +m[2], anchor = m[3] || 'start', cls = m[4] || '';
      const lines = m[5].split(/<tspan x="[^"]*" y="[^"]*">/);
      const size = /term/.test(cls) ? 11 : /nm|read|cap|sym/.test(cls) ? 13.5 : 15;
      const w = Math.max(...lines.map((l) => textWidth(l, size)));
      const left = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x, right = left + w;
      const shown = lines.map((l) => l.replace(/<[^>]+>/g, '')).join(' / ');
      assert.ok(left >= X0 - 1 && right <= X0 + W + 1, `texte « ${shown} » hors du schéma (${Math.round(left)}–${Math.round(right)} sur ${X0}–${X0 + W})`);
      assert.ok(y - size * 0.8 >= -1 && y + (lines.length - 1) * 17 <= H + 1, `texte « ${shown} » hors du schéma en hauteur (y = ${y} sur ${H})`);
    }
  }
});

test('évaluation : 8 questions, 20 points, une question sur chaque loi', () => {
  const B = Bank.make(seeded(3));
  for (let i = 0; i < 100; i++) {
    const ex = B.exam();
    assert.equal(ex.length, Bank.EXAM_QUESTIONS);
    assert.equal(ex.reduce((s, q) => s + q.points, 0), 20);
    const kinds = ex.map((q) => q.kind);
    assert.ok(kinds.includes('mailleFleche') && kinds.includes('serieR'));
    assert.ok(kinds.some((k) => k === 'noeud' || k === 'noeudMulti'));
    assert.ok(kinds.some((k) => /^ohm/.test(k)));
  }
});

test('entraînement : jamais deux fois le même type de suite, tous les types finissent par sortir', () => {
  const B = Bank.make(seeded(5)), seen = new Set();
  let last = null;
  for (let i = 0; i < 1500; i++) {
    const q = B.training();
    assert.notEqual(q.kind, last);
    last = q.kind; seen.add(q.kind);
  }
  assert.deepEqual([...seen].sort(), Object.keys(B.kinds).sort());
});

test('page : chaque carte « à revoir » existe, chaque schéma est dessiné par la banque', () => {
  const ids = new Set([...PAGE.matchAll(/ id="([\w-]+)"/g)].map((m) => m[1]));
  const B = Bank.make(seeded(9));
  for (const [kind, gen] of Object.entries(B.kinds)) for (let i = 0; i < 60; i++) { const q = gen(); assert.ok(ids.has(q.ref), `${kind} : carte #${q.ref} absente`); }
  const wanted = [...PAGE.matchAll(/<figure class="fig-wrap" data-fig="(\w+)">/g)].map((m) => m[1]);
  assert.ok(wanted.length >= 14);
  const script = PAGE.slice(PAGE.lastIndexOf('<script>'));
  for (const k of wanted) assert.match(script, new RegExp(`\\b${k}: function \\(\\) \\{ return F\\.\\w+\\(`), `schéma ${k} non dessiné`);
  // le chapitre est le 5ᵉ de la physique de 1re, juste après « Équation de réaction et molécules »
  const man = fs.readFileSync(path.join(ROOT, 'assets', 'chapters.js'), 'utf8');
  const slugs = [...man.slice(man.indexOf('"id": "physique-1re"'), man.indexOf('"id": "maths"')).matchAll(/"slug": "([\w-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(slugs.slice(0, 5), ['energie-enjeux', 'energie-interne', 'energie-chimique', 'combustions', 'electricite-continu']);
});
