// Banque de questions et chronogrammes du chapitre « Électricité en régime variable » (physique-1re/electricite-variable.js).
// Lancer : node --test tests/js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../../assets/core.js');
const Bank = require('../../physique-1re/electricite-variable.js');

const ROOT = path.join(__dirname, '..', '..');
const PAGE = fs.readFileSync(path.join(ROOT, 'physique-1re', 'electricite-variable.html'), 'utf8');
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
const UNITS = ['V', 's', 'ms', 'µs', 'Hz'];
const SEC = { s: 1, ms: 1e-3, 'µs': 1e-6 };
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
  // élision : « d’amplitude », « l’oscilloscope » (jamais « de amplitude »)
  assert.doesNotMatch(s.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' '), /(^|[\s(])(de|du|le|au) (?:[aeéiou]|[AEÉIOU][a-zé])/, `élision manquante : ${where}`);
  let depth = 0;
  for (const ch of s.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/\\[{}]/g, '')) { if (ch === '{') depth++; if (ch === '}') depth--; assert.ok(depth >= 0, `accolades : ${where}`); }
  assert.equal(depth, 0, `accolades déséquilibrées : ${where}`);
}
const typed = (qn) => String(Number(qn.answer.toPrecision(3))).replace('.', ',');
const close = (a, b, rel = 5e-3) => Math.abs(a - b) <= rel * Math.max(1e-9, Math.abs(b)) + 1e-9;
const svgsOf = (html) => [...html.matchAll(/<svg[\s\S]*?<\/svg>/g)].map((m) => m[0]);
/** Nombre écrit sur un dessin ou dans un énoncé (« 0,5 », « −10 », « 1 000 ») → valeur. */
const val = (s) => Number(s.replace(/[\s  ]/g, '').replace('−', '-').replace(',', '.'));
/** Nombre écrit par texNum (« 0{,}25 », « 1\,000 », « 4\times 10^{-4} ») → valeur. */
function texVal(s) {
  const m = /^(-?[\d{},\\]+?)(?:\\times\s*10\^\{(-?\d+)\})?$/.exec(s.trim());
  return Number(m[1].replace(/\{,\}/g, '.').replace(/\\,/g, '')) * (m[2] ? Math.pow(10, +m[2]) : 1);
}

/* ---------- lecture d'un chronogramme : ce que l'élève voit ---------- */
/**
 * Repère d'un chronogramme : les graduations numérotées donnent la correspondance dessin ↔ valeurs ;
 * la courbe est relue point par point. Renvoie { pts: [[t, u]], tUnit, yl }.
 */
function readChrono(svg) {
  const tx = [], ty = [];
  for (const m of svg.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)" text-anchor="(?:middle|end)" class="tk (tx|ty)">([^<]+)<\/text>/g)) {
    if (m[3] === 'tx') tx.push([val(m[4]), +m[1]]); else ty.push([val(m[4]), +m[2] - 4.5]);
  }
  assert.ok(tx.length >= 2 && ty.length >= 2, 'au moins deux graduations numérotées par axe');
  const lin = (list) => {
    const a = list.reduce((p, q) => (q[0] < p[0] ? q : p)), b = list.reduce((p, q) => (q[0] > p[0] ? q : p));
    const k = (b[1] - a[1]) / (b[0] - a[0]);
    // toutes les graduations sont alignées (pas d'erreur d'échelle)
    for (const [v, p] of list) assert.ok(Math.abs(a[1] + (v - a[0]) * k - p) < 0.3, `graduation ${v} mal placée`);
    return (p) => a[0] + (p - a[1]) / k;
  };
  const X = lin(tx), Y = lin(ty);
  const d = /<g class="sig[^"]*"[^>]*><path d="([^"]+)"\/><\/g>/.exec(svg)[1];
  const pts = d.slice(1).split('L').map((p) => { const [x, y] = p.split(' ').map(Number); return [X(x), Y(y)]; });
  const tUnit = (/class="q">t<\/tspan> \(([^)]+)\)/.exec(svg) || [])[1];
  return { pts, tUnit };
}
/** Instants des sommets d'une courbe (points les plus hauts, un par sommet). */
function peaks(pts) {
  const hi = Math.max(...pts.map((p) => p[1])), lo = Math.min(...pts.map((p) => p[1])), tol = (hi - lo) * 0.004;
  const out = [];
  pts.forEach((p, i) => {
    if (p[1] < hi - tol) return;
    if (i > 0 && pts[i - 1][1] > p[1]) return;
    if (i < pts.length - 1 && pts[i + 1][1] > p[1]) return;
    // un sommet peut compter plusieurs points à la même hauteur (au dixième de pixel près) : on n'en garde qu'un
    if (!out.length || p[0] - out[out.length - 1] > 0.02 * Math.abs(pts[pts.length - 1][0] - pts[0][0])) out.push(p[0]);
  });
  return out;
}
/** Fronts verticaux (créneaux, dents de scie) : { t, from, to }. */
function edges(pts) {
  const out = [], us = pts.map((p) => p[1]), range = Math.max(...us) - Math.min(...us), span = Math.abs(pts[pts.length - 1][0] - pts[0][0]);
  for (let i = 1; i < pts.length; i++) {
    // un front : même instant (au dixième de pixel près), saut d'au moins 20 % de l'étendue
    const dt = Math.abs(pts[i][0] - pts[i - 1][0]);
    if (dt < span * 1e-4 && Math.abs(pts[i][1] - pts[i - 1][1]) > 0.2 * range) out.push({ t: (pts[i][0] + pts[i - 1][0]) / 2, from: pts[i - 1][1], to: pts[i][1] });
  }
  return out;
}
/** Valeur de la ligne brisée à l'instant t (interpolation). */
function at(pts, t) {
  for (let i = 1; i < pts.length; i++) {
    const [t0, u0] = pts[i - 1], [t1, u1] = pts[i];
    if (t >= t0 && t <= t1 && t1 > t0) return u0 + (u1 - u0) * (t - t0) / (t1 - t0);
  }
  return pts[pts.length - 1][1];
}
/** Valeurs moyenne et efficace de la courbe tracée entre a et b (intégrale exacte d'une ligne brisée, segments coupés en a et b). */
function stats(pts, a, b) {
  let s1 = 0, s2 = 0;
  for (let i = 1; i < pts.length; i++) {
    let [t0, u0] = pts[i - 1], [t1, u1] = pts[i];
    if (t1 <= a || t0 >= b || t1 <= t0) continue;
    if (t0 < a) { u0 = at(pts, a); t0 = a; }
    if (t1 > b) { u1 = u0 + (pts[i][1] - u0) * (b - t0) / (pts[i][0] - t0); t1 = b; }
    const dt = t1 - t0;
    s1 += (u0 + u1) / 2 * dt; s2 += (u0 * u0 + u0 * u1 + u1 * u1) / 3 * dt;
  }
  return { moy: s1 / (b - a), eff: Math.sqrt(s2 / (b - a)) };
}
/**
 * Période d'un signal tracé : écart entre deux fronts identiques (créneaux, dents de scie), sinon entre deux
 * passages successifs par la mi-hauteur en montant (instants interpolés, précis au dixième de pixel).
 */
function periodOf(pts) {
  const e = edges(pts);
  if (e.length) {
    const first = e[0], same = e.filter((x) => Math.abs(x.from - first.from) < 1e-3 && Math.abs(x.to - first.to) < 1e-3);
    if (same.length >= 2) return { T: same[1].t - same[0].t, a: same[0].t };
  }
  const us = pts.map((p) => p[1]), mid = (Math.max(...us) + Math.min(...us)) / 2, ups = [], all = [];
  for (let i = 1; i < pts.length; i++) {
    const [t0, u0] = pts[i - 1], [t1, u1] = pts[i];
    if (t1 <= t0 || (u0 - mid) * (u1 - mid) > 0 || u0 === mid) continue;
    const t = t0 + (mid - u0) * (t1 - t0) / (u1 - u0);
    all.push(t); if (u1 > u0) ups.push(t);
  }
  if (ups.length >= 2) return { T: ups[1] - ups[0], a: ups[0] };
  // moins de deux montées dans la fenêtre : une demi-période sépare deux passages successifs par la mi-hauteur
  assert.ok(all.length >= 2, 'au moins une demi-période complète visible');
  return { T: 2 * (all[1] - all[0]), a: all[0] };
}
/** Écran d'oscilloscope : trace relue en divisions. */
function readOsc(svg) {
  const r = /<rect class="scr" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/.exec(svg).map(Number);
  const D = r[3] / 10, cy = r[2] + r[4] / 2;
  assert.ok(Math.abs(r[4] / 8 - D) < 1e-9, 'divisions carrées : 10 × 8');
  const d = /<g class="sig[^"]*"[^>]*><path d="([^"]+)"\/><\/g>/.exec(svg)[1];
  return d.slice(1).split('L').map((p) => { const [x, y] = p.split(' ').map(Number); return [(x - r[1]) / D, (cy - y) / D]; });
}
const SETTINGS = /Balayage horizontal : <b>([\d,]+) (ms|µs)\/div<\/b> · sensibilité verticale : <b>([\d,]+) V\/div<\/b>/;

/* ---------- textes d'un dessin : restent dans le cadre ---------- */
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"' };
function em(str) { return [...str].reduce((a, ch) => a + (/[\s,.:;'’!|iIl1j()]/.test(ch) ? 0.3 : /[0-9]/.test(ch) ? 0.58 : /[A-ZΩµ]/.test(ch) ? 0.68 : /[=+−?≈⟨⟩]/.test(ch) ? 0.6 : 0.52), 0); }
function textWidth(html, size, sub) {
  let w = 0;
  html.replace(/<tspan class="sub"[^>]*>([^<]*)<\/tspan>|<[^>]+>|([^<]+)/g, (all, sb, txt) => {
    if (sb) w += em(sb) * sub; else if (txt) w += em(txt.replace(/&\w+;/g, (e) => ENT[e] || 'x')) * size;
    return '';
  });
  return w;
}
// tailles des textes (unités du dessin), comme dans style.css : ordinateur, puis téléphone (dessin réduit, textes grossis)
const SIZES = { desk: { sym: 26, tk: 12.5, ax: 13.5, cap: 13.5, text: 14, sub: 11 }, phone: { sym: 30, tk: 16, ax: 16.5, cap: 16.5, text: 17, sub: 13 } };
function checkFigure(s, screen = 'desk') {
  assert.match(s, /^<svg class="fig chrono(?: mini| osc)?" viewBox="0 0 (\d+) (\d+)" role="img" aria-label="[^"]{20,}">/);
  assert.doesNotMatch(s, /NaN|undefined|\bnull\b|Infinity/);
  const [, W, H] = /viewBox="0 0 (\d+) (\d+)"/.exec(s).map(Number);
  for (const m of s.matchAll(/ (?:cx|x)="([\d.-]+)"/g)) assert.ok(+m[1] >= -0.5 && +m[1] <= W + 0.5, `élément hors du cadre (x = ${m[1]})`);
  for (const m of s.matchAll(/ (?:cy|y)="([\d.-]+)"/g)) assert.ok(+m[1] >= -0.5 && +m[1] <= H + 0.5, `élément hors du cadre (y = ${m[1]})`);
  for (const m of s.matchAll(/<path[^>]* d="([^"]+)"/g)) {
    for (const p of m[1].matchAll(/[MLHVZ]\s*([\d.-]+)?(?: ([\d.-]+))?/g)) {
      if (p[1] === undefined) continue;
      const cmd = p[0][0];
      if (cmd === 'V') assert.ok(+p[1] >= -0.5 && +p[1] <= H + 0.5, `tracé hors du cadre (y = ${p[1]})`);
      else assert.ok(+p[1] >= -0.5 && +p[1] <= W + 0.5, `tracé hors du cadre (x = ${p[1]})`);
      if ((cmd === 'M' || cmd === 'L') && p[2] !== undefined) assert.ok(+p[2] >= -0.5 && +p[2] <= H + 0.5, `tracé hors du cadre (y = ${p[2]})`);
    }
  }
  for (const m of s.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)"(?: text-anchor="(\w+)")?(?: class="([\w ]+)")?>([\s\S]*?)<\/text>/g)) {
    const x = +m[1], y = +m[2], anchor = m[3] || 'start', cls = m[4] || '';
    const lines = m[5].split(/<tspan x="[^"]*" y="[^"]*">/);
    const Z = SIZES[screen], size = /\bsym\b/.test(cls) ? Z.sym : /\btk\b/.test(cls) ? Z.tk : /\bax\b/.test(cls) ? Z.ax : /\bcap\b/.test(cls) ? Z.cap : Z.text;
    const w = Math.max(...lines.map((l) => textWidth(l, size, Z.sub)));
    const left = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x, right = left + w;
    const shown = lines.map((l) => l.replace(/<[^>]+>/g, '')).join(' / ');
    assert.ok(left >= -1 && right <= W + 1, `${screen} : texte « ${shown} » hors du dessin (${Math.round(left)}–${Math.round(right)} sur 0–${W})`);
    assert.ok(y - size * 0.8 >= -1 && y + (lines.length - 1) * 17 + 4 <= H + 1, `texte « ${shown} » hors du dessin en hauteur (y = ${y} sur ${H})`);
  }
}

test('les macros et les couleurs du chapitre existent (app.js, style.css, deux thèmes)', () => {
  for (const m of ['\\QTp', '\\Qf', '\\QUmax', '\\Qmoy', '\\QUeff', '\\QUalt', '\\Qut']) assert.ok(MACROS.has(m), m);
  const vals = (v) => [...CSS.matchAll(new RegExp(`--${v}: (#[0-9a-f]{6});`, 'g'))].map((m) => m[1]);
  for (const cls of ['per', 'f', 'moy', 'eff']) {
    assert.ok(Q_CLASSES.has(cls), `.q-${cls}`);
    assert.equal(vals('q-' + cls).length, 2, `--q-${cls} : thème sombre et thème clair`);
  }
  // teintes de la palette validée : moyenne bleue (comme la tension continue du générateur), efficace verte,
  // période ambre (comme une durée), fréquence rose
  assert.deepEqual(vals('q-moy'), vals('q-gen'));
  assert.deepEqual(vals('q-eff'), vals('q-I'));
  assert.deepEqual(vals('q-per'), vals('q-t'));
  assert.deepEqual(vals('q-f'), vals('q-P'));
  // les chronogrammes ont leurs styles
  for (const sel of ['.chrono .sig path', '.chrono .hl path', '.chrono .tk', '.chrono .mk path', '.osc .scr', '.fig.chrono']) assert.ok(CSS.includes(sel), sel);
});

test('graphiques « Manipuler » : seulement le trio validé (tension, moyenne, efficace) et l’encre du texte', () => {
  const script = PAGE.slice(PAGE.lastIndexOf('<script>'));
  const used = new Set([...script.matchAll(/g\.(?:fn|seg|area|poly|point|arrow|text)\([^;]*?'(--[\w-]+)'/g)].map((m) => m[1]));
  for (const c of used) assert.ok(['--q-u', '--q-moy', '--q-eff', '--text', '--muted'].includes(c), `couleur ${c} sur un graphique`);
  assert.ok(used.has('--q-u') && used.has('--q-moy') && used.has('--q-eff'));
  // les légendes des graphiques citent les mêmes couleurs
  const legends = [...PAGE.matchAll(/<ul class="legend">([\s\S]*?)<\/ul>/g)].map((m) => m[1]).join('');
  for (const m of legends.matchAll(/var\((--[\w-]+)\)/g)) assert.ok(['--q-u', '--q-moy', '--q-eff', '--text'].includes(m[1]), m[1]);
});

test('chaque type de question : réponse finie, texte propre, solution', () => {
  const B = Bank.make(seeded(42));
  for (const [kind, gen] of Object.entries(B.kinds)) {
    for (let i = 0; i < 250; i++) {
      const qn = gen();
      const where = `${kind} #${i} « ${qn.html.replace(/<svg[\s\S]*?<\/svg>/g, '[dessin]').slice(0, 100)} »`;
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
        // seule une valeur moyenne peut être négative ; durées, fréquences et valeurs efficaces sont positives
        if (qn.unit !== 'V' || /efficace|maximale|amplitude/.test(qn.ask)) assert.ok(qn.answer > 0, `réponse négative : ${where}`);
        assert.ok(UNITS.includes(qn.unit), `unité : ${where}`);
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
      const sci = C.fmtNum(qn.answer, 3).replace(/\s/g, '').replace('×10', '*10^').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (e) => e.replace(/⁻/g, '-').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(d)));
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
  assert.ok(recognised > 3000, `seulement ${recognised} erreurs reconnues`);
});

test('lire un chronogramme : valeur maximale, période, fréquence et valeur efficace se relisent sur le dessin', () => {
  const B = Bank.make(seeded(11)), seen = new Set();
  for (let i = 0; i < 400; i++) {
    const qn = B.kinds.lectureSinus(), [svg] = svgsOf(qn.html), { pts, tUnit } = readChrono(svg);
    assert.ok(tUnit in SEC, `unité de temps lisible : ${tUnit}`);
    const Umax = Math.max(...pts.map((p) => p[1])), Umin = Math.min(...pts.map((p) => p[1])), { T } = periodOf(pts);
    assert.ok(close(Umin, -Umax, 0.01), 'sinusoïde centrée sur zéro');
    const what = /Donne la (valeur maximale|période|fréquence|valeur efficace)/.exec(qn.ask)[1];
    seen.add(what);
    const want = { 'valeur maximale': Umax, 'période': T, 'fréquence': 1 / (T * SEC[tUnit]), 'valeur efficace': Umax / Math.SQRT2 }[what];
    if (what === 'période') assert.equal(qn.unit, tUnit);
    assert.ok(close(qn.answer, want), `${what} : ${qn.answer} ≠ ${want}`);
  }
  assert.equal(seen.size, 4);
});

test('lire un oscillogramme : divisions × réglages', () => {
  const B = Bank.make(seeded(12)), seen = new Set();
  for (let i = 0; i < 400; i++) {
    const qn = B.kinds.oscillogramme(), [svg] = svgsOf(qn.html), pts = readOsc(svg), set = SETTINGS.exec(qn.html);
    assert.ok(set, 'réglages de l’oscilloscope affichés');
    const bal = val(set[1]), sens = val(set[3]), u = set[2];
    const nA = Math.max(...pts.map((p) => p[1])), { T: nT } = periodOf(pts);
    assert.ok(nA > 0.9 && nA <= 3.6, 'la trace reste dans l’écran');
    assert.ok(Math.abs(nA * 2 - Math.round(nA * 2)) < 0.02 && Math.abs(nT * 2 - Math.round(nT * 2)) < 0.02, 'lecture à la demi-division');
    const what = /Donne la (valeur maximale|période|fréquence|valeur efficace)/.exec(qn.ask)[1];
    seen.add(what);
    const want = { 'valeur maximale': nA * sens, 'période': nT * bal, 'fréquence': 1 / (nT * bal * SEC[u]), 'valeur efficace': nA * sens / Math.SQRT2 }[what];
    if (what === 'période') assert.equal(qn.unit, u);
    assert.ok(close(qn.answer, want), `${what} : ${qn.answer} ≠ ${want}`);
  }
  assert.equal(seen.size, 4);
});

test('créneaux : la valeur moyenne et la valeur efficace se recalculent sur une période du dessin', () => {
  const B = Bank.make(seeded(13));
  for (let i = 0; i < 300; i++) {
    for (const kind of ['moyenneCreneau', 'efficaceCreneau']) {
      const qn = B.kinds[kind](), [svg] = svgsOf(qn.html), { pts } = readChrono(svg), { T, a } = periodOf(pts), st = stats(pts, a, a + T);
      // lecture au dixième de pixel : écart toléré de 0,4 % de la plus grande tension du signal
      const span = Math.max(...pts.map((x) => Math.abs(x[1])));
      assert.ok(Math.abs(qn.answer - (kind === 'moyenneCreneau' ? st.moy : st.eff)) < 0.004 * span, `${kind} : ${qn.answer} ≠ ${JSON.stringify(st)}`);
      // les paliers et les fronts tombent sur le quadrillage (lecture exacte)
      for (const [t, u] of pts) { assert.ok(Math.abs(u - Math.round(u)) < 0.02, `palier ${u}`); assert.ok(Number.isFinite(t)); }
    }
  }
});

test('composante continue : ⟨u⟩, amplitude et Ueff = √(⟨u⟩² + Ualt,eff²) se relisent sur le dessin', () => {
  const B = Bank.make(seeded(14)), seen = new Set();
  for (let i = 0; i < 400; i++) {
    const qn = B.kinds.composante();
    if (!/<svg/.test(qn.html)) {
      // lectures du multimètre : DC puis AC
      const [dc, ac] = [...qn.html.matchAll(/\\\(([-\d{},\\]+)\\ \\mathrm\{V\}\\\)/g)].map((m) => texVal(m[1]));
      assert.ok(close(qn.answer, Math.hypot(dc, ac)));
      seen.add('multi');
      continue;
    }
    const { pts } = readChrono(svgsOf(qn.html)[0]), { T, a } = periodOf(pts), st = stats(pts, a, a + T);
    const hi = Math.max(...pts.map((p) => p[1])), lo = Math.min(...pts.map((p) => p[1]));
    assert.ok(Math.abs(st.moy - (hi + lo) / 2) < 0.004 * (hi - lo), 'une sinusoïde est symétrique par rapport à sa valeur moyenne');
    const what = /Donne (la valeur moyenne|l’amplitude|la valeur efficace)/.exec(qn.ask)[1];
    seen.add(what);
    const want = { 'la valeur moyenne': (hi + lo) / 2, 'l’amplitude': (hi - lo) / 2, 'la valeur efficace': st.eff }[what];
    assert.ok(close(qn.answer, want), `${what} : ${qn.answer} ≠ ${want}`);
  }
  assert.equal(seen.size, 4);
});

test('tension alternative : la réponse juste suit la valeur moyenne du dessin', () => {
  const B = Bank.make(seeded(15));
  let alt = 0, not = 0;
  for (let i = 0; i < 400; i++) {
    const qn = B.kinds.alternatif(), { pts } = readChrono(svgsOf(qn.html)[0]), { T, a } = periodOf(pts), { moy } = stats(pts, a, a + T);
    const right = qn.choices[qn.answer].html, span = Math.max(...pts.map((p) => Math.abs(p[1])));
    if (Math.abs(moy) < 0.01 * span) { alt++; assert.match(right, /^Oui : sa valeur moyenne est nulle/); }
    else {
      not++;
      const shown = texVal(/^Non : sa valeur moyenne vaut \\\(([-\d{},\\]+)\\ \\mathrm\{V\}\\\)/.exec(right)[1]);
      assert.ok(Math.abs(shown - moy) < 0.004 * span, `${shown} ≠ ${moy}`);
    }
  }
  assert.ok(alt > 50 && not > 50, `${alt} alternatives, ${not} non alternatives`);
});

test('tracer : seul le bon chronogramme a la période et la valeur maximale demandées', () => {
  const B = Bank.make(seeded(16));
  for (let i = 0; i < 200; i++) {
    const qn = B.kinds.tracer();
    let Tw = (/\\QTp = ([\d{},\\]+)\\ \\mathrm\{ms\}/.exec(qn.html) || [])[1];
    const f = (/\\Qf = ([\d{},\\]+)\\ \\mathrm\{Hz\}/.exec(qn.html) || [])[1];
    Tw = Tw ? texVal(Tw) : 1000 / texVal(f);
    const Uw = texVal(/\\QUmax = ([\d{},\\]+)\\ \\mathrm\{V\}/.exec(qn.html)[1]);
    qn.choices.forEach((c, j) => {
      const { pts, tUnit } = readChrono(svgsOf(c.html)[0]), U = Math.max(...pts.map((p) => p[1]));
      let T;
      try { T = periodOf(pts).T; } catch (e) { T = Infinity; } // moins d'une demi-période visible : ce n'est pas la période demandée
      assert.equal(tUnit, 'ms');
      const ok = close(T, Tw) && close(U, Uw);
      assert.equal(ok, j === qn.answer, `choix ${j} : T = ${T} ms, Umax = ${U} V (attendu ${Tw} ms, ${Uw} V)`);
    });
  }
});

test('fréquence, période, valeur efficace : f × T = 1 et Ueff = Umax / √2 à partir de l’énoncé', () => {
  const B = Bank.make(seeded(17));
  for (let i = 0; i < 300; i++) {
    let qn = B.kinds.frequence();
    const T = /\\QTp = ([\d{},\\]+)\\ (\\mathrm\{(?:ms|s)\}|\\mu\\mathrm\{s\})/.exec(qn.html), f = /\\Qf = ([\d{},\\]+)\\ \\mathrm\{Hz\}/.exec(qn.html);
    if (T) { const k = T[2].includes('mu') ? 1e-6 : T[2].includes('ms') ? 1e-3 : 1; assert.equal(qn.unit, 'Hz'); assert.ok(close(qn.answer * texVal(T[1]) * k, 1)); }
    else { assert.equal(qn.unit, 'ms'); assert.ok(close(qn.answer / 1000 * texVal(f[1]), 1)); }
    qn = B.kinds.efficace();
    const um = /\\QUmax = ([\d{},\\]+)\\ \\mathrm\{V\}/.exec(qn.html), ue = /\\QUeff = ([\d{},\\]+)\\ \\mathrm\{V\}/.exec(qn.html);
    if (um) assert.ok(close(qn.answer, texVal(um[1]) / Math.SQRT2)); else assert.ok(close(qn.answer, texVal(ue[1]) * Math.SQRT2));
  }
});

test('régime continu ou variable : la bonne description suit la forme du dessin', () => {
  const B = Bank.make(seeded(18));
  for (let i = 0; i < 200; i++) {
    const qn = B.kinds.nature(), { pts } = readChrono(svgsOf(qn.html)[0]), right = qn.choices[qn.answer].html;
    const us = pts.map((p) => p[1]), flat = Math.max(...us) - Math.min(...us) < 1e-6;
    // monotone : les variations non nulles gardent toutes le même signe
    const signs = new Set();
    for (let k = 1; k < us.length; k++) if (Math.abs(us[k] - us[k - 1]) > 1e-6) signs.add(Math.sign(us[k] - us[k - 1]));
    const monotone = signs.size <= 1;
    const want = flat ? /continu/ : monotone ? /non périodique/ : /variable, tension périodique/;
    assert.match(right, want);
  }
});

test('exemples de la fiche : les dessins redonnent les résultats écrits dans les solutions', () => {
  // exercice 1 : oscillogrammes 1 et 2
  let r = readChrono(F.osc1(false)), p = periodOf(r.pts);
  assert.ok(close(p.T, 70) && close(Math.max(...r.pts.map((x) => x[1])), 4));
  r = readChrono(F.osc2(false)); p = periodOf(r.pts);
  assert.ok(close(p.T, 2.2) && close(Math.max(...r.pts.map((x) => x[1])), 12));
  assert.equal(Math.round(1 / 0.070 * 10) / 10, 14.3);
  assert.equal(Math.round(1 / 0.0022), 455);
  // exercice 2 : figures 10 et 11 tracées
  r = readChrono(F.fig10(true)); p = periodOf(r.pts);
  assert.ok(close(p.T, 20) && close(Math.max(...r.pts.map((x) => x[1])), 25));
  r = readChrono(F.fig11(true)); p = periodOf(r.pts);
  assert.ok(close(p.T, 5) && close(Math.max(...r.pts.map((x) => x[1])), 0.3));
  assert.match(F.fig11(true), /--q-I\)/, 'une intensité est tracée en vert');
  // exercice 3 : signaux a, b, c
  const want = { a: [5, -2, Math.sqrt(20)], b: [50, 3.6, Math.sqrt(32.4)], c: [50, 2, Math.sqrt(112 / 3)] };
  for (const k of ['a', 'b', 'c']) {
    r = readChrono(F.ex3(k, false)); p = periodOf(r.pts);
    const st = stats(r.pts, p.a, p.a + p.T);
    assert.ok(close(p.T, want[k][0]) && close(st.moy, want[k][1], 0.002) && close(st.eff, want[k][2], 0.002), `signal ${k} : ${JSON.stringify([p.T, st])}`);
  }
  // exercice 5 : 2,5 div × 2 V/div = 5 V, 2 div × 0,5 ms/div = 1 ms ; créneau 3 V / −5 V, T = 400 µs
  const o = readOsc(F.ex5a(false));
  assert.ok(close(Math.max(...o.map((x) => x[1])), 2.5) && close(periodOf(o).T, 2));
  r = readChrono(F.ex5b(false)); p = periodOf(r.pts);
  assert.ok(close(p.T, 400) && close(stats(r.pts, p.a, p.a + p.T).moy, -1));
  // exemple du cours 2 : ⟨U⟩ = 2 V, Um = 3 V, Ueff = √8,5
  r = readChrono(F.coursExemple()); p = periodOf(r.pts);
  const st = stats(r.pts, p.a, p.a + p.T);
  assert.ok(close(st.moy, 2, 0.01) && close(st.eff, Math.sqrt(8.5), 0.01));
  // les résultats écrits dans la page
  for (const s of ['\\approx 14{,}3\\ \\mathrm{Hz}', '\\approx 455\\ \\mathrm{Hz}', '\\approx 2{,}83\\ \\mathrm{V}', '\\approx 8{,}49\\ \\mathrm{V}', '= -2\\ \\mathrm{V}', '\\sqrt{20} \\approx 4{,}47',
    '= 3{,}6\\ \\mathrm{V}', '\\sqrt{32{,}4} \\approx 5{,}69', '\\approx 6{,}11\\ \\mathrm{V}', '= 1\\,000\\ \\mathrm{Hz}', '\\approx 3{,}54\\ \\mathrm{V}', '= 2\\,500\\ \\mathrm{Hz}', '= -1\\ \\mathrm{V}', '\\sqrt{8{,}5} \\approx 2{,}92']) {
    assert.ok(PAGE.includes(s), `résultat absent de la page : ${s}`);
  }
});

test('dessins : SVG accessibles, textes lisibles qui restent dans le cadre', () => {
  const B = Bank.make(seeded(19));
  const figs = [F.regimes(), F.motif(), F.periode(), F.valeurs(), F.oscilloCours(), F.tracer(), F.moyenne(), F.alternatif(), F.efficace(), F.decomposition(), F.coursExemple()];
  for (const sol of [false, true]) figs.push(F.osc1(sol), F.osc2(sol), F.fig10(sol), F.fig11(sol), F.ex3('a', sol), F.ex3('b', sol), F.ex3('c', sol), F.ex5a(sol), F.ex5b(sol));
  for (const kind of ['nature', 'lectureSinus', 'oscillogramme', 'moyenneCreneau', 'efficaceCreneau', 'composante', 'alternatif', 'tracer']) {
    for (let i = 0; i < 40; i++) { const q = B.kinds[kind](); figs.push(...svgsOf(q.html)); (q.choices || []).forEach((c) => figs.push(...svgsOf(c.html))); }
  }
  assert.ok(figs.length > 300);
  figs.forEach((f) => checkFigure(f));
  // sur téléphone, les textes grossissent (sauf dans les petits tracés des QCM) : ils restent dans le dessin
  figs.filter((f) => !/class="fig chrono mini"/.test(f)).forEach((f) => checkFigure(f, 'phone'));
});

test('évaluation : 8 questions, 20 points, une question sur chaque notion', () => {
  const B = Bank.make(seeded(3));
  for (let i = 0; i < 100; i++) {
    const ex = B.exam();
    assert.equal(ex.length, Bank.EXAM_QUESTIONS);
    assert.equal(ex.reduce((s, q) => s + q.points, 0), 20);
    const kinds = ex.map((q) => q.kind);
    for (const k of ['frequence', 'efficace', 'moyenneCreneau', 'efficaceCreneau', 'alternatif']) assert.ok(kinds.includes(k), k);
    assert.ok(kinds.some((k) => k === 'lectureSinus' || k === 'oscillogramme'));
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

test('page : chaque carte « à revoir » existe, chaque dessin est fait par la banque', () => {
  const ids = new Set([...PAGE.matchAll(/ id="([\w-]+)"/g)].map((m) => m[1]));
  const B = Bank.make(seeded(9));
  for (const [kind, gen] of Object.entries(B.kinds)) for (let i = 0; i < 60; i++) { const q = gen(); assert.ok(ids.has(q.ref), `${kind} : carte #${q.ref} absente`); }
  const wanted = [...PAGE.matchAll(/<figure class="fig-wrap" data-fig="(\w+)">/g)].map((m) => m[1]);
  assert.ok(wanted.length >= 25);
  const script = PAGE.slice(PAGE.lastIndexOf('<script>'));
  for (const k of wanted) assert.match(script, new RegExp(`\\b${k}: function \\(\\) \\{ return F\\.\\w+\\(`), `dessin ${k} non fait`);
  // le chapitre est le 6ᵉ de la physique de 1re, juste après « Électricité en régime continu »
  const man = fs.readFileSync(path.join(ROOT, 'assets', 'chapters.js'), 'utf8');
  const slugs = [...man.slice(man.indexOf('"id": "physique-1re"'), man.indexOf('"id": "maths"')).matchAll(/"slug": "([\w-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(slugs.slice(0, 6), ['energie-enjeux', 'energie-interne', 'energie-chimique', 'combustions', 'electricite-continu', 'electricite-variable']);
});
