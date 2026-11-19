// Calcul formel de la calculatrice d'entraînement (dérivées, primitives) et mode examen.
// Lancer : node --test tests/js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../assets/core.js');

const close = (a, b, msg) => assert.ok(Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)), `${a} ≉ ${b} ${msg || ''}`);
const calc = (s, o) => C.calcLatex(s, o);
/** Valeur d'une expression LaTeX en x = t (le résultat formel est relu par le même analyseur). */
const at = (latex, t) => C.evalNode(C.parseLatex(latex), { x: t }, false);
const numDeriv = (f, t, h = 1e-5) => (f(t + h) - f(t - h)) / (2 * h);

test('dérivées : résultats simplifiés comme sur une copie', () => {
  const cases = {
    '\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(x^{3}\\right)': '3x^{2}',
    '\\frac{d}{dx}\\left(3x^{2}+2x+1\\right)': '6x+2',
    '\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(\\sin\\left(2x\\right)\\right)': '2\\cos\\left(2x\\right)',
    '\\frac{d}{dx}\\left(e^{3x}\\right)': '3e^{3x}',
    '\\frac{d}{dx}\\left(\\ln\\left(x\\right)\\right)': '\\frac{1}{x}',
    '\\frac{d}{dx}\\left(\\frac{1}{x}\\right)': '-\\frac{1}{x^{2}}',
    '\\frac{d}{dx}\\left(\\sqrt{x}\\right)': '\\frac{1}{2\\sqrt{x}}',
    '\\frac{d}{dx}\\left(\\frac{x^{2}}{2}\\right)': 'x',
    '\\frac{d}{dx}\\left(-x^{2}+4x\\right)': '-2x+4'
  };
  for (const [src, tex] of Object.entries(cases)) {
    const r = calc(src);
    assert.equal(r.kind, 'expr', src);
    assert.equal(r.latex, tex, src);
  }
});

test('dérivées : justes en tout point (comparées à la dérivée numérique)', () => {
  const exprs = ['x^{3}-2x', '\\sin\\left(x\\right)\\cos\\left(x\\right)', 'x\\,e^{x}', '\\frac{x+1}{x-1}', '\\ln\\left(x^{2}+1\\right)',
    '\\sqrt{x}', '2^{x}', '\\tan\\left(x\\right)', '\\arctan\\left(x\\right)', 'x^{x}', '\\frac{1}{\\sqrt{x}}', '\\cos^{2}\\left(x\\right)'];
  for (const e of exprs) {
    const d = calc('\\frac{d}{dx}\\left(' + e + '\\right)');
    for (const t of [0.3, 1.7, 2.9]) {
      close(at(d.latex, t), numDeriv((x) => at(e, x), t), `d/dx(${e}) en ${t} : ${d.latex}`);
    }
  }
});

test('dérivée évaluée en un point : barre |_{x=a}', () => {
  assert.deepEqual(calc('\\left.\\frac{d}{dx}\\left(x^{3}\\right)\\right|_{x=2}'), { kind: 'number', value: 12 });
  assert.deepEqual(calc('\\left.\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(x^{2}\\right)\\right\\vert_{x=3}'), { kind: 'number', value: 6 });
  assert.deepEqual(calc('\\left.x^{3}\\right|_{x=2}'), { kind: 'number', value: 8 });
  assert.deepEqual(calc('\\frac{d}{dx}\\left(5\\right)'), { kind: 'number', value: 0 }, 'dérivée d’une constante');
});

test('primitives : formes usuelles avec + C', () => {
  const cases = {
    '\\int x^{2}\\,\\mathrm{d}x': '\\frac{x^{3}}{3}+C',
    '\\int 3x^{2}+2x+1\\,\\mathrm{d}x': 'x^{3}+x^{2}+x+C',
    '\\int \\cos\\left(2x\\right)\\,\\mathrm{d}x': '\\frac{\\sin\\left(2x\\right)}{2}+C',
    '\\int e^{-x}\\,\\mathrm{d}x': '-e^{-x}+C',
    '\\int \\frac{1}{x}\\,\\mathrm{d}x': '\\ln\\left|x\\right|+C',
    '\\int \\frac{1}{\\sqrt{x}}\\,\\mathrm{d}x': '2\\sqrt{x}+C',
    '\\int 5\\,\\mathrm{d}x': '5x+C',
    '\\int \\frac{1}{x^{2}}\\,dx': '-\\frac{1}{x}+C',
    '\\int 0\\,dx': 'C'
  };
  for (const [src, tex] of Object.entries(cases)) {
    const r = calc(src);
    assert.equal(r.kind, 'expr', src);
    assert.equal(r.primitive, true, src);
    assert.equal(r.latex, tex, src);
  }
});

test('primitives : la dérivée de F redonne f', () => {
  const fs = ['x(x+1)', '\\sin\\left(3x+1\\right)', '\\frac{2}{2x+1}', '4e^{2x}', '\\frac{3}{\\left(x+1\\right)^{2}}', '\\sqrt{2x+1}',
    '\\pi x', '\\frac{x^{3}-x}{x}', '6\\cos\\left(x\\right)-2', '2^{x}'];
  for (const f of fs) {
    const F = calc('\\int ' + f + '\\,\\mathrm{d}x').latex.replace(/\+C$/, '');
    for (const t of [0.4, 1.3, 2.2]) close(numDeriv((x) => at(F, x), t), at(f, t), `∫ ${f} dx = ${F}`);
  }
});

test('primitive introuvable : message qui renvoie au calcul à la main', () => {
  assert.throws(() => calc('\\int x\\,e^{x}\\,\\mathrm{d}x'), (e) => e instanceof C.CalcError && /à la main/.test(e.message));
});

test('les intégrales définies restent numériques (Simpson)', () => {
  const r = calc('\\int_{0}^{1}x^{2}\\,\\mathrm{d}x');
  assert.equal(r.kind, 'number');
  close(r.value, 1 / 3);
  close(calc('\\int_{0}^{\\pi}\\frac{d}{dx}\\left(\\sin\\left(x\\right)\\right)\\,\\mathrm{d}x').value, 0, 'dérivée dans une intégrale');
});

test('mode examen : seules les fonctions d’une calculatrice standard', () => {
  const exam = { exam: true };
  for (const [src, re] of [
    ['\\int_{0}^{1}x\\,\\mathrm{d}x', /intégrales/], ['\\int x\\,\\mathrm{d}x', /intégrales/],
    ['\\frac{d}{dx}\\left(x^{2}\\right)', /dérive pas/], ['\\sum_{k=1}^{3}k', /somme/], ['\\prod_{k=1}^{3}k', /produit/]
  ]) {
    assert.throws(() => calc(src, exam), (e) => e instanceof C.CalcError && /^Mode examen/.test(e.message) && re.test(e.message), src);
    assert.throws(() => C.evaluateLatex(src, exam), /Mode examen/, src);
  }
  // les calculs ordinaires restent possibles
  assert.deepEqual(calc('\\frac{3}{4}+1', exam), { kind: 'number', value: 1.75 });
  close(calc('\\sqrt{2}\\times\\ln\\left(10\\right)+\\sin\\left(30\\right)', { exam: true, angle: 'deg' }).value, Math.SQRT2 * Math.log(10) + 0.5);
  close(calc('7{,}92\\times10^{8}', exam).value, 7.92e8);
});

test('simplification stable (appliquer deux fois ne change rien)', () => {
  for (const src of ['x^{3}+2x-x', '\\frac{x^{3}}{x}', '2\\cdot 3x\\cdot x', '\\frac{6x}{4}', 'x-x', '\\left(x^{2}\\right)^{3}', 'e^{\\ln\\left(x\\right)}']) {
    const once = C.simplify(C.parseLatex(src));
    assert.equal(C.toLatex(C.simplify(once)), C.toLatex(once), src);
  }
  assert.equal(C.toLatex(C.simplify(C.parseLatex('x^{3}+2x-x'))), 'x^{3}+x');
  assert.equal(C.toLatex(C.simplify(C.parseLatex('\\frac{6x}{4}'))), '\\frac{3x}{2}');
  assert.equal(C.toLatex(C.simplify(C.parseLatex('x-x'))), '0');
  assert.equal(C.toLatex(C.simplify(C.parseLatex('\\left(x^{2}\\right)^{3}'))), 'x^{6}');
});

test('erreurs de dérivation compréhensibles', () => {
  assert.throws(() => calc('\\frac{\\mathrm{d}y}{\\mathrm{d}x}'), /dérive une expression/);
  assert.throws(() => calc('f\'\\left(2\\right)'), /d\/dx/);
  assert.throws(() => calc('\\frac{d}{dx}'), /dériver/);
  assert.throws(() => C.evaluateLatex('\\frac{d}{2}+1'), /Variable « d »/, 'une vraie fraction d/2 n’est pas une dérivée');
});
