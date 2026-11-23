// Banque de questions, schémas et chronogrammes du chapitre « Puissance électrique » (physique-1re/energie-electrique.js).
// Lancer : node --test tests/js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../../assets/core.js');
const Bank = require('../../physique-1re/energie-electrique.js');

const ROOT = path.join(__dirname, '..', '..');
const PAGE = fs.readFileSync(path.join(ROOT, 'physique-1re', 'energie-electrique.html'), 'utf8');
const APP = fs.readFileSync(path.join(ROOT, 'assets', 'app.js'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'assets', 'style.css'), 'utf8');
const F = Bank.FIG, PH = Bank.PHYS;

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
  // élision : « d’intensité », « l’énergie » (jamais « de intensité ») ; « de A » (un point) reste correct
  assert.doesNotMatch(s.replace(/<[^>]+>/g, ' '), /(^|[\s(])(de|du|le|au) (?:[aeéiou]|[AEÉIOU][a-zé])/, `élision manquante : ${where}`);
  // jamais deux « : » dans une même phrase de solution (« … : le dipôle fonctionne en récepteur : … »)
  for (const li of s.matchAll(/<li>([\s\S]*?)<\/li>/g)) assert.ok(li[1].replace(/\\\([\s\S]*?\\\)/g, '').split(' : ').length <= 3, `phrase trop hachée : ${where}`);
  let depth = 0;
  for (const ch of s.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/\\[{}]/g, '')) { if (ch === '{') depth++; if (ch === '}') depth--; assert.ok(depth >= 0, `accolades : ${where}`); }
  assert.equal(depth, 0, `accolades déséquilibrées : ${where}`);
}
const typed = (qn) => String(Number(qn.answer.toPrecision(qn.sig || 3))).replace('.', ',');
const close = (a, b, rel = 1e-6) => Math.abs(a - b) <= rel * Math.max(1, Math.abs(b));
const near = (a, b) => Math.abs(a - b) <= 0.006 * Math.abs(b) + 1e-12; // valeurs affichées à 3 ou 4 chiffres

/* ---------- lecture de ce que l'élève voit ---------- */
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"' };
/** Textes d'un SVG (indices recollés : « U_1 = 3 V » devient « U1 = 3 V »). */
function labels(svg) {
  return [...svg.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<tspan[^>]* y="[^"]*"[^>]*>/g, ' ').replace(/<[^>]+>/g, '').replace(/&\w+;/g, (e) => ENT[e]).replace(/\s+/g, ' ').trim());
}
/** « −12 V », « 250 mA », « 0,13 A » → valeur SI. */
function si(s) {
  const m = /(−?[\d\s  ]+(?:,\d+)?)\s*(mA|A|V|W|Ω)$/.exec(s.trim());
  assert.ok(m, `valeur illisible : « ${s} »`);
  const v = Number(m[1].replace(/[\s  ]/g, '').replace(',', '.').replace('−', '-'));
  return m[2] === 'mA' ? v / 1000 : v;
}
const svgOf = (html) => (/<svg[\s\S]*?<\/svg>/.exec(html) || [''])[0];
/** Nombre écrit par texNum (« -0{,}25 », « 1\,000 », « 3{,}6\times 10^{6} ») → valeur. */
const NUM = '(-?(?:[\\d{},]|\\\\,)+(?:\\\\times 10\\^\\{-?\\d+\\})?)';
function texVal(s) {
  const m = /^(.*?)(?:\\times 10\^\{(-?\d+)\})?$/.exec(s);
  return Number(m[1].replace(/\{,\}/g, '.').replace(/\\,/g, '')) * (m[2] ? Math.pow(10, +m[2]) : 1);
}
/** Valeur LaTeX qui suit « avant = » (avant : regex), suivie de l'unité unit. */
function grab(html, before, unit) {
  const m = new RegExp(before + ' = ' + NUM + (unit ? '\\\\ ' + unit : '')).exec(html);
  assert.ok(m, `« ${before} » introuvable dans « ${html.replace(/<svg[\s\S]*?<\/svg>/g, '').slice(0, 200)} »`);
  return texVal(m[1]);
}
const esc = (s) => s.replace(/[\\{}()^$.|?*+[\]]/g, '\\$&');
/**
 * Flèches d'un schéma : { lab, dir: [dx, dy] }. Flèche de tension : du début du trait vers la pointe ;
 * flèche d'intensité : de la base du triangle vers sa pointe.
 */
function arrowsOf(svg) {
  return [...svg.matchAll(/<g class="arr( cur)?"[^>]*>([\s\S]*?)<\/g>/g)].map((m) => {
    const lab = labels(m[2])[0] || '';
    if (m[1]) {
      const p = /d="M([\d.-]+) ([\d.-]+)L([\d.-]+) ([\d.-]+)L([\d.-]+) ([\d.-]+)Z"/.exec(m[2]).slice(1).map(Number);
      return { lab, cur: true, dir: [Math.sign(p[0] - (p[2] + p[4]) / 2), Math.sign(p[1] - (p[3] + p[5]) / 2)] };
    }
    const p = /<path d="M([\d.-]+) ([\d.-]+)L([\d.-]+) ([\d.-]+)"/.exec(m[2]).slice(1).map(Number);
    return { lab, cur: false, dir: [Math.sign(p[2] - p[0]), Math.sign(p[3] - p[1])] };
  });
}
const same = (a, b) => a.dir[0] === b.dir[0] && a.dir[1] === b.dir[1];
const opposite = (a, b) => a.dir[0] === -b.dir[0] && a.dir[1] === -b.dir[1];
/** Le bon choix d'un QCM (texte sans balises). */
const rightChoice = (qn) => qn.choices[qn.answer].html.replace(/<[^>]+>/g, '');

test('les macros et les couleurs du chapitre existent (app.js, style.css, deux thèmes)', () => {
  for (const m of ['\\QP', '\\QE', '\\Qt', '\\Qu', '\\QI', '\\QR', '\\Qk', '\\Qpt', '\\Qit', '\\Qut', '\\Qpm', '\\QUe', '\\QIe']) assert.ok(MACROS.has(m), m);
  // une tension efficace reste orange et une intensité efficace verte ; k est violet comme le rendement
  assert.match(APP, /'\\\\QUe': '\\\\htmlClass\{q-u\}/);
  assert.match(APP, /'\\\\QIe': '\\\\htmlClass\{q-I\}/);
  assert.match(APP, /'\\\\Qpt': '\\\\htmlClass\{q-P\}/);
  assert.match(APP, /'\\\\Qk': '\\\\htmlClass\{q-eta\}/);
  const vals = (v) => [...CSS.matchAll(new RegExp(`--${v}: (#[0-9a-f]{6});`, 'g'))].map((m) => m[1]);
  for (const cls of ['P', 'E', 't', 'u', 'I', 'R', 'eta', 'gen']) {
    assert.ok(Q_CLASSES.has(cls), `.q-${cls}`);
    assert.equal(vals('q-' + cls).length, 2, `--q-${cls} : thème sombre et thème clair`);
  }
  for (const sel of ['.circuit .w', '.circuit .arr path', '.circuit .arr .hd', '.fig.circuit', '.chrono .sig path', '.chrono .hl path', '.chrono .area', '.fig.chrono']) assert.ok(CSS.includes(sel), sel);
});

test('graphiques « Manipuler » : la puissance (rose) ne partage jamais un graphique avec la tension ou l’intensité', () => {
  const script = PAGE.slice(PAGE.lastIndexOf('<script>'));
  const parts = script.split('/* ---------- Manipuler').slice(1);
  assert.equal(parts.length, 3);
  // couleurs validées ensemble (validate_palette.js --pairs all, deux thèmes) : rose + bleu ; le gris et l'encre du texte sont neutres
  const allowed = [['--q-gen', '--muted', '--text'], ['--q-P', '--muted', '--text'], ['--q-P', '--muted', '--text']];
  parts.forEach((p, k) => {
    // toutes les couleurs écrites dans les appels de dessin (les deux branches d'un « ? : » comprises)
    const used = new Set([...p.matchAll(/g\.(?:fn|seg|area|poly|point|arrow|text)\(([^;]*)/g)].flatMap((m) => [...m[1].matchAll(/'(--[\w-]+)'/g)].map((x) => x[1])));
    for (const c of used) assert.ok(allowed[k].includes(c), `graphique ${k + 1} : couleur ${c}`);
    assert.ok(used.has(allowed[k][0]), `graphique ${k + 1} : ${allowed[k][0]}`);
  });
  // u(t) et i(t) sont dessinés à part, dans le chronogramme SVG au-dessus de p(t)
  const ui = F.ui({ k: 0.8, t0: 5 });
  const cols = new Set([...ui.matchAll(/class="sig" style="--c: var\((--[\w-]+)\)"/g)].map((m) => m[1]));
  assert.deepEqual([...cols].sort(), ['--q-I', '--q-u']);
  // les légendes des graphiques citent les mêmes couleurs
  const manip = PAGE.slice(PAGE.indexOf('id="manipuler"'), PAGE.indexOf('id="entrainement"'));
  for (const m of manip.matchAll(/<ul class="legend">([\s\S]*?)<\/ul>/g)) {
    for (const c of m[1].matchAll(/var\((--[\w-]+)\)/g)) assert.ok(['--q-gen', '--q-P', '--q-u', '--q-I', '--muted', '--text'].includes(c[1]), c[1]);
  }
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
        assert.ok(['V', 'A', 'W', 'J', 'kWh', 'h', 'Ω', ''].includes(qn.unit), `unité : ${where}`);
        // une réponse négative n'est demandée qu'avec son signe (convention)
        if (qn.answer < 0) assert.match(qn.ask, /avec son signe/, where);
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

test('conventions : la réponse juste suit le sens des flèches dessinées et le signe de U × I', () => {
  const B = Bank.make(seeded(11));
  let figs = 0, gens = 0;
  for (let i = 0; i < 400; i++) {
    let qn = B.kinds.convention(), s = svgOf(qn.html);
    if (s) {
      const ar = arrowsOf(s), u = ar.find((a) => !a.cur), cur = ar.find((a) => a.cur);
      assert.ok(same(u, cur) || opposite(u, cur));
      assert.equal(rightChoice(qn), 'la convention ' + (same(u, cur) ? 'générateur' : 'récepteur'));
      figs++;
    }
    qn = B.kinds.fonctionnement(); s = svgOf(qn.html);
    let gen, P;
    if (s) {
      const ar = arrowsOf(s), u = ar.find((a) => !a.cur), cur = ar.find((a) => a.cur);
      gen = same(u, cur);
      P = si(u.lab) * si(cur.lab);
    } else {
      gen = /fléché en convention générateur/.test(qn.html);
      P = grab(qn.html, esc('\\q{u}{U} \\times \\q{I}{I}'), esc('\\mathrm{W}'));
    }
    const recv = gen ? P < 0 : P > 0;
    if (!recv) gens++;
    assert.match(rightChoice(qn), recv ? /^en récepteur/ : /^en générateur/, qn.html.replace(/<svg[\s\S]*?<\/svg>/g, '[schéma]'));
  }
  assert.ok(figs > 150 && gens > 100 && gens < 300);
});

test('P = U × I, I = P / U, U = P / I : la réponse se recalcule à partir de l’énoncé', () => {
  const B = Bank.make(seeded(12));
  for (let i = 0; i < 300; i++) {
    let qn = B.kinds.puissance();
    const ar = arrowsOf(svgOf(qn.html)), U = si(ar.find((a) => !a.cur).lab), I = si(ar.find((a) => a.cur).lab);
    assert.ok(close(qn.answer, U * I), `${U} × ${I} ≠ ${qn.answer}`);
    qn = B.kinds.inverse();
    const P = grab(qn.html, esc('\\q{P}{P}') + '(?: = ' + esc('\\q{u}{U} \\times \\q{I}{I}') + ')?', esc('\\mathrm{W}'));
    if (qn.unit === 'A') assert.ok(close(qn.answer, P / grab(qn.html, esc('\\q{u}{U}'), esc('\\mathrm{V}'))));
    else assert.ok(close(qn.answer, P / grab(qn.html, esc('\\q{I}{I}'), esc('\\mathrm{A}'))));
  }
});

test('régime sinusoïdal : P = k × Ueff × Ieff, avec k = 1 pour un conducteur ohmique et Ueff = Umax / √2', () => {
  const B = Bank.make(seeded(13));
  const seen = new Set();
  for (let i = 0; i < 400; i++) {
    const qn = B.kinds.sinus(), h = qn.html;
    const k = /conducteur ohmique/.test(h) ? 1 : /\\Qk = /.test(h) ? grab(h, esc('\\Qk')) : null;
    const U = /U_\{\\max\}\} = /.test(h) ? grab(h, esc('\\q{u}{U_{\\max}}'), esc('\\mathrm{V}')) / Math.SQRT2 : grab(h, esc('\\QUe'), esc('\\mathrm{V}'));
    seen.add(qn.type);
    if (qn.type === 'Facteur de puissance') {
      const P = grab(h, esc('\\q{P}{P}'), esc('\\mathrm{W}')), I = grab(h, esc('\\QIe'), esc('\\mathrm{A}'));
      assert.ok(close(qn.answer, P / (U * I)));
      assert.ok(qn.answer >= 0.74 && qn.answer <= 0.96, 'un moteur : k entre 0,75 et 0,95');
    } else if (qn.type === 'Intensité efficace') {
      assert.ok(close(qn.answer, grab(h, esc('\\q{P}{P}'), esc('\\mathrm{W}')) / (k * U)));
    } else {
      assert.ok(close(qn.answer, k * U * grab(h, esc('\\QIe'), esc('\\mathrm{A}'))));
    }
  }
  assert.deepEqual([...seen].sort(), ['Facteur de puissance', 'Intensité efficace', 'Puissance moyenne en sinusoïdal']);
});

test('énergie : E = P × Δt en joules (durée en secondes) et en kWh (kW et heures), conversions', () => {
  const B = Bank.make(seeded(14));
  const seen = new Set();
  for (let i = 0; i < 400; i++) {
    const qn = B.kinds.energie(), h = qn.html;
    seen.add(qn.type);
    if (qn.type === 'Conversion d’énergie') {
      const x = grab(h, esc('\\QE'), '\\\\mathrm\\{k?Wh\\}'), wh = /\\mathrm\{Wh\}/.test(h);
      assert.ok(close(qn.answer, x * (wh ? 3600 : 3.6e6)));
    } else if (qn.type === 'Durée de fonctionnement') {
      assert.ok(close(qn.answer, grab(h, esc('\\QE'), esc('\\mathrm{kWh}')) / (grab(h, esc('\\q{P}{P}'), esc('\\mathrm{W}')) / 1000)));
    } else {
      const P = grab(h, esc('\\q{P}{P}'), esc('\\mathrm{W}'));
      const min = /pendant (\d+) min/.exec(h) || /pendant \\\(([\d{},]+)\\ \\mathrm\{min\}/.exec(h), hr = /pendant \\\(([\d{},]+)\\ \\mathrm\{h\}/.exec(h);
      const sec = min ? texVal(min[1]) * 60 : texVal(hr[1]) * 3600;
      assert.ok(close(qn.answer, qn.unit === 'J' ? P * sec : P * sec / 3.6e6), `${qn.type} : ${qn.answer}`);
    }
  }
  assert.equal(seen.size, 4);
});

test('effet Joule : P = R × I², E = R × I² × Δt, R = P / I², I = √(P / R)', () => {
  const B = Bank.make(seeded(15));
  const seen = new Set();
  const I = (h) => { const m = new RegExp(esc('\\q{I}{I}') + ' = ' + NUM + '\\\\ \\\\mathrm\\{(m?A)\\}').exec(h); return texVal(m[1]) / (m[2] === 'mA' ? 1000 : 1); };
  for (let i = 0; i < 400; i++) {
    const qn = B.kinds.joule(), h = qn.html;
    seen.add(qn.type);
    if (qn.type === 'Effet Joule : P = R × I²') assert.ok(close(qn.answer, grab(h, esc('\\q{R}{R}'), esc('\\Omega')) * I(h) ** 2));
    else if (qn.type === 'Effet Joule : énergie dissipée') assert.ok(close(qn.answer, grab(h, esc('\\q{R}{R}'), esc('\\Omega')) * I(h) ** 2 * +/pendant (\d+) min/.exec(h)[1] * 60));
    else if (qn.type === 'Effet Joule : calculer R') assert.ok(close(qn.answer, grab(h, esc('\\q{P}{P}'), esc('\\mathrm{W}')) / I(h) ** 2));
    else assert.ok(close(qn.answer, Math.sqrt(grab(h, esc('\\q{P}{P}'), esc('\\mathrm{W}')) / grab(h, esc('\\q{R}{R}'), esc('\\Omega')))));
  }
  assert.equal(seen.size, 4);
});

test('exercices 3, 4 et 5 : la grandeur demandée se recalcule avec les lois des nœuds, des mailles et d’Ohm', () => {
  const B = Bank.make(seeded(16));
  const val = (h, sym, unit) => grab(h, esc(sym), esc(unit));
  const target = (h) => (/Calcule (?:la puissance )?\\\(\\q\{\w+\}\{(\w)(?:_\{(\d)\})?\}\\\)/.exec(h) || []).slice(1).join('');
  for (let i = 0; i < 300; i++) {
    // exercice 3 : I₂ = I₃ − I₁, U₁ = U − U₃, P₂ = U₁ × I₂ (convention récepteur)
    let qn = B.kinds.circuit3(), h = qn.html;
    const I1 = val(h, '\\q{I}{I_{1}}', '\\mathrm{A}'), I3 = val(h, '\\q{I}{I_{3}}', '\\mathrm{A}'), U = val(h, '\\q{u}{U}', '\\mathrm{V}'), U3 = val(h, '\\q{u}{U_{3}}', '\\mathrm{V}');
    const I2 = I3 - I1, U1 = U - U3, P2 = U1 * I2;
    if (qn.choices) assert.match(rightChoice(qn), P2 > 0 ? /^en récepteur/ : /^en générateur/);
    else assert.ok(close(qn.answer, { I2, U1, P2 }[target(h)]), `exercice 3, ${target(h)} : ${qn.answer}`);
    assert.ok(U1 > 0 && I3 > 0);
    // exercice 4 : I₂ = U₂/R₂, I₃ = U₂/R₃, I₁ = I₂ + I₃, U₁ = R₁ I₁, U = U₁ + U₂, P = U × I₁
    qn = B.kinds.circuit4(); h = qn.html;
    const R1 = val(h, '\\q{R}{R_{1}}', '\\Omega'), R2 = val(h, '\\q{R}{R_{2}}', '\\Omega'), R3 = val(h, '\\q{R}{R_{3}}', '\\Omega'), U2 = val(h, '\\q{u}{U_{2}}', '\\mathrm{V}');
    const J1 = U2 / R2 + U2 / R3, V1 = R1 * J1, V = V1 + U2;
    assert.ok(close(qn.answer, { I2: U2 / R2, I1: J1, U1: V1, U: V, P: V * J1 }[target(h)]), `exercice 4, ${target(h)} : ${qn.answer}`);
    // bilan : la puissance reçue par AB est la somme des puissances Joule des trois résistances
    assert.ok(close(V * J1, R1 * J1 ** 2 + R2 * (U2 / R2) ** 2 + R3 * (U2 / R3) ** 2));
    // exercice 5 : U₂ = U − U₁, I₃ = P₃ / U₂, I₁ = U₁ / R₁, I₂ = I₁ + I₃, P₂ = U₂ × I₂
    qn = B.kinds.circuit5(); h = qn.html;
    const E = val(h, '\\q{u}{U}', '\\mathrm{V}'), W1 = val(h, '\\q{u}{U_{1}}', '\\mathrm{V}'), S1 = val(h, '\\q{R}{R_{1}}', '\\Omega'), P3 = val(h, '\\q{P}{P_{3}}', '\\mathrm{W}');
    const V2 = E - W1, K3 = P3 / V2, K1 = W1 / S1, K2 = K1 + K3;
    assert.ok(V2 > 0 && K2 > 0, 'D₂ reste un récepteur');
    if (qn.choices) {
      const d3 = /D_3/.test(qn.html.slice(qn.html.lastIndexOf('<p>')));
      assert.match(rightChoice(qn), (d3 ? P3 < 0 : K2 * V2 > 0) ? /^en récepteur/ : /^en générateur/);
    } else assert.ok(close(qn.answer, { U2: V2, I3: K3, I1: K1, I2: K2, P2: V2 * K2 }[target(h)]), `exercice 5, ${target(h)} : ${qn.answer}`);
    // bilan : le générateur fournit ce que reçoivent R₁, D₂ et D₃
    assert.ok(close(E * K1, W1 * K1 + V2 * K2 - P3, 1e-9));
  }
});

test('schémas des exercices : les flèches sont celles de la fiche (U₁ corrigée à l’exercice 4)', () => {
  const find = (ar, lab) => { const a = ar.find((x) => x.lab === lab); assert.ok(a, lab); return a; };
  // exercice 1 : U et I dans le même sens (convention générateur) ; exercice 2 : de sens opposés (convention récepteur)
  let ar = arrowsOf(F.ex1());
  assert.ok(same(find(ar, 'U'), find(ar, 'I')));
  ar = arrowsOf(F.ex2());
  assert.ok(opposite(find(ar, 'U'), find(ar, 'I')));
  // exercice 3 : U₁ vers la gauche, I₁ et I₂ vers la droite (convention récepteur pour R₁ et D₂) ; U et U₃ vers le haut
  ar = arrowsOf(F.ex3());
  ar.filter((a) => a.lab === 'U1').forEach((u) => { assert.ok(opposite(u, find(ar, 'I1'))); assert.ok(opposite(u, find(ar, 'I2'))); });
  assert.deepEqual(find(ar, 'U').dir, [0, -1]);
  assert.deepEqual(find(ar, 'U3').dir, [0, -1]);
  // exercice 4 : U₁ fléchée vers A, opposée à I₁ ; U₂ vers la gauche, opposée à I₂ et I₃ ; U vers la gauche
  ar = arrowsOf(F.ex4());
  assert.ok(opposite(find(ar, 'U1'), find(ar, 'I1')));
  assert.ok(opposite(find(ar, 'U2'), find(ar, 'I2')) && opposite(find(ar, 'U2'), find(ar, 'I3')));
  assert.deepEqual(find(ar, 'U').dir, [-1, 0]);
  // exercice 5 : D₃ en convention générateur (U₃ et le courant de D₃ vers le haut), D₂ en convention récepteur
  ar = arrowsOf(F.ex5());
  assert.deepEqual(find(ar, 'U3').dir, [0, -1]);
  assert.deepEqual(find(ar, 'I3').dir, [-1, 0]); // I₃ quitte D₃ par le haut et va vers le nœud
  assert.ok(opposite(find(ar, 'U2'), find(ar, 'I2')));
  assert.ok(same(find(ar, 'U'), find(ar, 'I1')));
});

test('physique du régime sinusoïdal : ⟨p(t)⟩ = k × Ueff × Ieff, p(t) entre Ueff Ieff (k − 1) et Ueff Ieff (k + 1)', () => {
  for (const [U, I, k] of [[230, 5, 0.8], [230, 8.7, 1], [10, 2, 1], [120, 3.3, 0.5]]) {
    let s = 0, lo = Infinity, hi = -Infinity;
    const n = 4000;
    for (let j = 0; j < n; j++) { const p = PH.p(U, I, k, (j + 0.5) * 20 / n); s += p; lo = Math.min(lo, p); hi = Math.max(hi, p); }
    assert.ok(close(s / n, PH.mean(U, I, k), 1e-9));
    assert.ok(Math.abs(hi - PH.max(U, I, k)) <= 1e-4 * U * I && Math.abs(lo - PH.min(U, I, k)) <= 1e-4 * U * I);
    // valeurs efficaces : u(t) et i(t) ont pour valeurs efficaces U et I
    let su = 0, si2 = 0;
    for (let j = 0; j < n; j++) { const t = (j + 0.5) * 20 / n; su += PH.u(U, t) ** 2; si2 += PH.i(I, k, t) ** 2; }
    assert.ok(close(Math.sqrt(su / n), U, 1e-9) && close(Math.sqrt(si2 / n), I, 1e-9));
  }
  // la figure du cours : un conducteur ohmique sous 10 V et 2 A, P = 20 W, p(t) de 0 à 40 W
  const pt = F.pt();
  assert.ok(labels(pt).includes('P = 20 W'));
  assert.match(pt.match(/aria-label="([^"]+)"/)[1], /entre 0 et 40 W/);
});

test('exemples de la fiche : les solutions de la page donnent les bons résultats', () => {
  // exercice 1 : I = −48 / −12 = 4 A ; exercice 2 : 24 × 3 = 72 W
  assert.ok(PAGE.includes('\\dfrac{-48}{-12} = 4\\ \\mathrm{A}'));
  assert.ok(PAGE.includes('24 \\times 3 = 72\\ \\mathrm{W}'));
  // exercice 3 : I₂ = 0,12 A, U₁ = 8 V, P₂ = 0,96 W et bilan 1,04 + 0,96 + 2,75 = 4,75 W
  assert.ok(close(0.25 - 0.13, 0.12) && close(8 * 0.12, 0.96) && close(8 * 0.13 + 0.96 + 11 * 0.25, 19 * 0.25));
  for (const s of ['0{,}25 - 0{,}13 = 0{,}12\\ \\mathrm{A}', '19 - 11 = 8\\ \\mathrm{V}', '8 \\times 0{,}12 = 0{,}96\\ \\mathrm{W}']) assert.ok(PAGE.includes(s), s);
  // exercice 4 : 0,45 A, 0,9 A, 9 V, 45 V, 40,5 W ; vérification par l'effet Joule
  assert.ok(close(45 * 0.9, 10 * 0.81 + 2 * 80 * 0.45 ** 2));
  for (const s of ['\\dfrac{36}{80} = 0{,}45\\ \\mathrm{A}', '0{,}45 + 0{,}45 = 0{,}9\\ \\mathrm{A}', '10 \\times 0{,}9 = 9\\ \\mathrm{V}', '9 + 36 = 45\\ \\mathrm{V}', '45 \\times 0{,}9 = 40{,}5\\ \\mathrm{W}']) assert.ok(PAGE.includes(s), s);
  // exercice 5 : U₂ = 9 V, I₃ = −0,02 A, I₁ = 0,3 A, I₂ = 0,28 A, P₂ = 2,52 W, bilan 3,6 W
  assert.ok(close(12 * 0.3, 3 * 0.3 + 9 * 0.28 + 0.18));
  for (const s of ['12 - 3 = 9\\ \\mathrm{V}', '\\dfrac{-0{,}18}{9} = -0{,}02\\ \\mathrm{A}', '\\dfrac{3}{10} = 0{,}3\\ \\mathrm{A}', '0{,}3 + (-0{,}02) = 0{,}28\\ \\mathrm{A}', '9 \\times 0{,}28 = 2{,}52\\ \\mathrm{W}']) assert.ok(PAGE.includes(s), s);
  // cours : moteur 0,8 × 230 × 5 = 920 W ; effet Joule 10 × 0,9² = 8,1 W, 8,1 × 600 = 4 860 J ; 6 kWh = 2,16 × 10⁷ J
  assert.ok(close(0.8 * 230 * 5, 920) && close(10 * 0.81, 8.1) && close(8.1 * 600, 4860) && close(6 * 3.6e6, 2.16e7));
  for (const s of ['0{,}8 \\times 230 \\times 5 = 920\\ \\mathrm{W}', '8{,}1 \\times 600 = 4\\,860\\ \\mathrm{J}', '2{,}16 \\times 10^{7}\\ \\mathrm{J}']) assert.ok(PAGE.includes(s), s);
});

/* ---------- textes d'un dessin : restent dans le cadre ---------- */
function em(str) { return [...str].reduce((a, ch) => a + (/[\s,.:;'’!|iIl1j()]/.test(ch) ? 0.3 : /[0-9]/.test(ch) ? 0.58 : /[A-ZΩµ]/.test(ch) ? 0.68 : /[=+−?≈⟨⟩→]/.test(ch) ? 0.6 : 0.52), 0); }
function textWidth(html, size, sub) {
  let w = 0;
  html.replace(/<tspan class="sub"[^>]*>([^<]*)<\/tspan>|<[^>]+>|([^<]+)/g, (all, sb, txt) => {
    if (sb) w += em(sb) * sub; else if (txt) w += em(txt.replace(/&\w+;/g, (e) => ENT[e] || 'x')) * size;
    return '';
  });
  return w;
}
// tailles des textes (unités du dessin), comme dans style.css. Schémas : mêmes tailles partout.
// Chronogrammes : ordinateur, puis téléphone (dessin réduit, textes grossis).
const CIRCUIT = { term: 11, small: 13.5, text: 15, sub: 12 };
const CHRONO = { desk: { sym: 26, tk: 12.5, ax: 13.5, cap: 13.5, text: 14, sub: 11 }, phone: { sym: 30, tk: 16, ax: 16.5, cap: 16.5, text: 17, sub: 13 } };
function checkBox(s, W, H, size, sub) {
  for (const m of s.matchAll(/ (?:cx|x)="([\d.-]+)"/g)) assert.ok(+m[1] >= -0.5 && +m[1] <= W + 0.5, `élément hors du cadre (x = ${m[1]})`);
  for (const m of s.matchAll(/ (?:cy|y)="([\d.-]+)"/g)) assert.ok(+m[1] >= -0.5 && +m[1] <= H + 0.5, `élément hors du cadre (y = ${m[1]})`);
  for (const m of s.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)"(?: text-anchor="(\w+)")?(?: class="([\w ]+)")?>([\s\S]*?)<\/text>/g)) {
    const x = +m[1], y = +m[2], anchor = m[3] || 'start', cls = m[4] || '';
    const lines = m[5].split(/<tspan x="[^"]*" y="[^"]*">/), z = size(cls);
    const w = Math.max(...lines.map((l) => textWidth(l, z, sub)));
    const left = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x, right = left + w;
    const shown = lines.map((l) => l.replace(/<[^>]+>/g, '')).join(' / ');
    assert.ok(left >= -1 && right <= W + 1, `texte « ${shown} » hors du dessin (${Math.round(left)}–${Math.round(right)} sur 0–${W})`);
    assert.ok(y - z * 0.8 >= -1 && y + (lines.length - 1) * 17 + 4 <= H + 1, `texte « ${shown} » hors du dessin en hauteur (y = ${y} sur ${H})`);
  }
}
function checkFigure(s, screen) {
  const m = /^<svg class="fig (circuit|chrono)" viewBox="0 0 (\d+) (\d+)" role="img" aria-label="[^"]{20,}">/.exec(s);
  assert.ok(m, s.slice(0, 120));
  assert.doesNotMatch(s, /NaN|undefined|\bnull\b|Infinity/);
  const W = +m[2], H = +m[3];
  if (m[1] === 'circuit') checkBox(s, W, H, (cls) => (/term/.test(cls) ? CIRCUIT.term : /nm|read|cap|sym/.test(cls) ? CIRCUIT.small : CIRCUIT.text), CIRCUIT.sub);
  else {
    const Z = CHRONO[screen];
    checkBox(s, W, H, (cls) => (/\bsym\b/.test(cls) ? Z.sym : /\btk\b/.test(cls) ? Z.tk : /\bax\b/.test(cls) ? Z.ax : /\bcap\b/.test(cls) ? Z.cap : Z.text), Z.sub);
  }
}

test('dessins : SVG accessibles, textes lisibles qui restent dans le cadre', () => {
  const B = Bank.make(seeded(17));
  const figs = [F.conventions(), F.ex1(), F.ex2(), F.ex3(), F.ex4(), F.ex5(), F.ui({ k: 1 }), F.ui({ k: 0.5, t0: 40 }), F.ui({ k: 0.8, t0: 0 }), F.pt(), F.carac(),
    F.dipole({ sym: 'D', iDir: 'r', uDir: 'r', ix: 'r', i: 'I = −4,9 A', u: 'U = −30 V' }), F.dipole({ sym: 'D', iDir: 'r', uDir: 'l', ix: 'r', i: 'I = 0 A', u: 'U = 0 V' })];
  for (const kind of ['convention', 'fonctionnement', 'puissance', 'circuit3', 'circuit4', 'circuit5']) {
    for (let i = 0; i < 40; i++) { const s = svgOf(B.kinds[kind]().html); if (s) figs.push(s); }
  }
  assert.ok(figs.length > 200);
  figs.forEach((f) => checkFigure(f, 'desk'));
  figs.filter((f) => /class="fig chrono"/.test(f)).forEach((f) => checkFigure(f, 'phone'));
});

test('évaluation : 8 questions, 20 points, une question sur chaque notion', () => {
  const B = Bank.make(seeded(3));
  for (let i = 0; i < 100; i++) {
    const ex = B.exam();
    assert.equal(ex.length, Bank.EXAM_QUESTIONS);
    assert.equal(ex.reduce((s, q) => s + q.points, 0), 20);
    const kinds = ex.map((q) => q.kind);
    for (const k of ['fonctionnement', 'sinus', 'energie', 'joule', 'circuit5']) assert.ok(kinds.includes(k), k);
    assert.ok(kinds.some((k) => k === 'puissance' || k === 'inverse'));
    assert.ok(kinds.some((k) => k === 'circuit3' || k === 'circuit4'));
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

test('page : chaque carte « à revoir » existe, chaque dessin est fait par la banque, le chapitre est le 7ᵉ', () => {
  const ids = new Set([...PAGE.matchAll(/ id="([\w-]+)"/g)].map((m) => m[1]));
  const B = Bank.make(seeded(9));
  for (const [kind, gen] of Object.entries(B.kinds)) for (let i = 0; i < 60; i++) { const q = gen(); assert.ok(ids.has(q.ref), `${kind} : carte #${q.ref} absente`); }
  const wanted = [...PAGE.matchAll(/<figure class="fig-wrap" data-fig="(\w+)">/g)].map((m) => m[1]);
  assert.ok(wanted.length >= 9);
  const script = PAGE.slice(PAGE.lastIndexOf('<script>'));
  for (const k of wanted) assert.match(script, new RegExp(`\\b${k}: function \\(\\) \\{ return F\\.\\w+\\(`), `dessin ${k} non fait`);
  // le chapitre est le 7ᵉ de la physique de 1re, juste après « Électricité en régime variable »
  const man = fs.readFileSync(path.join(ROOT, 'assets', 'chapters.js'), 'utf8');
  const sec = man.slice(man.indexOf('"id": "physique-1re"'), man.indexOf('"id": "maths"'));
  const slugs = [...sec.matchAll(/"slug": "([\w-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(slugs.slice(0, 7), ['energie-enjeux', 'energie-interne', 'energie-chimique', 'combustions', 'electricite-continu', 'electricite-variable', 'energie-electrique']);
  assert.match(sec, /"slug": "energie-electrique",\s*"title": "Puissance électrique"/);
});
