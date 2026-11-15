// Tests unitaires des fonctions pures de assets/core.js — lancer : node --test tests/js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../assets/core.js');

const close = (a, b, msg) => assert.ok(Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b)), `${a} ≉ ${b} ${msg || ''}`);

test('evaluate : opérations et priorités', () => {
  assert.equal(C.evaluate('1+2*3'), 7);
  assert.equal(C.evaluate('(1+2)*3'), 9);
  assert.equal(C.evaluate('2^3^2'), 512, '^ est associatif à droite');
  assert.equal(C.evaluate('-2^2'), -4, 'le signe passe après la puissance');
  assert.equal(C.evaluate('2^-1'), 0.5);
  assert.equal(C.evaluate('10-4-3'), 3);
  assert.equal(C.evaluate('12/4/3'), 1);
});

test('evaluate : écriture française et symboles typographiques', () => {
  assert.equal(C.evaluate('2,5 × 4'), 10);
  assert.equal(C.evaluate('9 ÷ 3 − 1'), 2);
  assert.equal(C.evaluate('1 000 + 1'), 1001, 'les espaces de milliers sont ignorés');
  assert.equal(C.evaluate('3²'), 9);
  assert.equal(C.evaluate('2³'), 8);
  assert.equal(C.evaluate('√16'), 4);
  assert.equal(C.evaluate('∛27'), 3);
  close(C.evaluate('π'), Math.PI);
});

test('evaluate : multiplication implicite', () => {
  close(C.evaluate('2π'), 2 * Math.PI);
  assert.equal(C.evaluate('3(4+1)'), 15);
  assert.equal(C.evaluate('(1+1)(2+3)'), 10);
  close(C.evaluate('2√3'), 2 * Math.sqrt(3));
  close(C.evaluate('2pie'), 2 * Math.PI * Math.E, 'découpage pi·e');
});

test('evaluate : fonctions usuelles', () => {
  close(C.evaluate('ln(e)'), 1);
  close(C.evaluate('log(1000)'), 3);
  close(C.evaluate('exp(0)'), 1);
  close(C.evaluate('e^(2)'), Math.E ** 2);
  close(C.evaluate('sqrt(2)^2'), 2);
  close(C.evaluate('abs(-3)'), 3);
  close(C.evaluate('cos(pi)'), -1);
  close(C.evaluate('sin pi/2'), 0, 'sans parenthèses, l’argument s’arrête au premier opérateur');
  close(C.evaluate('sin(pi/2)'), 1);
});

test('evaluate : mode degrés', () => {
  close(C.evaluate('sin(30)', { angle: 'deg' }), 0.5);
  close(C.evaluate('cos(60)', { angle: 'deg' }), 0.5);
  close(C.evaluate('acos(0.5)', { angle: 'deg' }), 60);
  close(C.evaluate('arctan(1)', { angle: 'deg' }), 45);
  close(C.evaluate('atan(1)'), Math.PI / 4);
});

test('evaluate : pourcentage, factorielle, notation scientifique, Ans', () => {
  assert.equal(C.evaluate('50%'), 0.5);
  assert.equal(C.evaluate('200*15%'), 30);
  assert.equal(C.evaluate('5!'), 120);
  assert.equal(C.evaluate('3e8'), 3e8);
  assert.equal(C.evaluate('5e-3'), 0.005);
  close(C.evaluate('2e'), 2 * Math.E, '« 2e » sans exposant = 2 × e');
  assert.equal(C.evaluate('ans*2', { ans: 21 }), 42);
});

test('evaluate : parenthèses fermantes ajoutées en fin de saisie', () => {
  assert.equal(C.evaluate('2*(3+4'), 14);
  close(C.evaluate('sqrt(2*(8'), 4);
});

test('evaluate : erreurs explicites', () => {
  const bad = {
    '': /vide/, '1/0': /zéro/, 'ln(0)': /positif/, 'ln(-1)': /positif/, 'sqrt(-4)': /négatif/,
    'asin(2)': /entre/, '2+': /incomplète/, '(1+2))': /en trop/, 'x+1': /inconnu/, '2$3': /non reconnu/,
    '2.5!': /entier/, 'ans': /Ans/
  };
  for (const [src, re] of Object.entries(bad)) {
    assert.throws(() => C.evaluate(src), (e) => e instanceof C.CalcError && re.test(e.message), src);
  }
  assert.ok(Number.isNaN(C.tryEvaluate('1/0')));
});

test('evaluate : aucune exécution de code arbitraire', () => {
  for (const src of ['alert(1)', 'constructor', 'this', 'Math.PI', '__proto__', 'process.exit()']) {
    assert.ok(Number.isNaN(C.tryEvaluate(src)), src);
  }
});

test('parseNum : réponses d’élèves', () => {
  assert.equal(C.parseNum('2,5'), 2.5);
  assert.equal(C.parseNum('3/4'), 0.75);
  assert.equal(C.parseNum(' -2 '), -2);
  assert.equal(C.parseNum('−7'), -7);
  close(C.parseNum('ln(2)'), Math.LN2);
  close(C.parseNum('pi/3'), Math.PI / 3);
  assert.equal(C.parseNum('25 %'), 25, 'un % final est une unité');
  assert.equal(C.parseNum('25%'), 25);
  assert.ok(Number.isNaN(C.parseNum('')));
  assert.ok(Number.isNaN(C.parseNum(null)));
  assert.ok(Number.isNaN(C.parseNum('abc')));
  assert.ok(Number.isNaN(C.parseNum('1/0')));
});

test('fmt : arrondi à la française', () => {
  assert.equal(C.fmt(2.5), '2,5');
  assert.equal(C.fmt(1 / 3), '0,333');
  assert.equal(C.fmt(1 / 3, 1), '0,3');
  assert.equal(C.fmt(-0.0001), '0', 'pas de « -0 »');
  assert.equal(C.fmt(NaN), '—');
  assert.equal(C.fmt(Infinity), '—');
});

test('fmtCalc : affichage calculatrice', () => {
  assert.equal(C.fmtCalc(0.1 + 0.2), '0,3', 'pas d’artefact flottant');
  assert.equal(C.fmtCalc(1234567), '1 234 567');
  assert.equal(C.fmtCalc(-2.5), '−2,5');
  assert.equal(C.fmtCalc(3e8), '300 000 000');
  assert.equal(C.fmtCalc(6.02e23), '6,02 × 10^23');
  assert.equal(C.fmtCalc(1.6e-19), '1,6 × 10^-19');
  assert.equal(C.fmtCalc(1e-15), '1 × 10^-15', 'les très petites valeurs ne sont pas écrasées');
  assert.equal(C.fmtCalc(0), '0');
  assert.equal(C.evaluate('sin(pi)'), 0, 'bruit flottant de la trigo arrondi à 0');
  assert.equal(C.evaluate('cos(90)', { angle: 'deg' }), 0);
  assert.equal(C.fmtCalc(Infinity), '∞');
  assert.equal(C.fmtCalc(NaN), 'Erreur');
});

test('niceStep / tickStep : graduations lisibles', () => {
  assert.equal(C.niceStep(0.13), 0.1);
  assert.equal(C.niceStep(2.7), 2);
  assert.equal(C.niceStep(4), 5);
  assert.equal(C.niceStep(8), 10);
  assert.equal(C.niceStep(0), 1);
  // 41 unités sur un écran de téléphone (300 px) : au moins 50 px entre étiquettes
  const s = C.tickStep(41, 300, 50);
  assert.ok(300 * s / 41 >= 50, `pas ${s} trop serré`);
  assert.equal(s, 10);
  // le même axe sur grand écran garde des graduations plus fines
  assert.ok(C.tickStep(41, 1200, 50) < s);
  for (const [span, px] of [[0.001, 320], [1e6, 280], [7, 37], [3.3, 900]]) {
    const st = C.tickStep(span, px, 44);
    assert.ok(st > 0 && px * st / span >= 44, `${span} sur ${px}px → ${st}`);
  }
});

test('decimalsFor, piLabel, clampLabel', () => {
  assert.equal(C.decimalsFor(1), 0);
  assert.equal(C.decimalsFor(0.5), 1);
  assert.equal(C.decimalsFor(0.02), 2);
  assert.equal(C.decimalsFor(50), 0);
  assert.equal(C.piLabel(1), 'π/2');
  assert.equal(C.piLabel(2), 'π');
  assert.equal(C.piLabel(-4), '−2π');
  assert.deepEqual(C.clampLabel(5, 20, 300), { x: 2, align: 'left' });
  assert.deepEqual(C.clampLabel(295, 20, 300), { x: 298, align: 'right' });
  assert.deepEqual(C.clampLabel(150, 20, 300), { x: 150, align: 'center' });
});

test('insertSnippet : symboles et gabarits de la feuille', () => {
  const K = C.CARET;
  assert.equal(K, '‸');
  assert.deepEqual(C.insertSnippet('ab', 1, 1, '+'), { value: 'a+b', caret: 2 });
  assert.deepEqual(C.insertSnippet('', 0, 0, `(${K})/()`), { value: '()/()', caret: 1 });
  assert.deepEqual(C.insertSnippet('x+1', 0, 3, `(${K})/()`), { value: '(x+1)/()', caret: 4 }, 'la sélection est enveloppée');
  assert.deepEqual(C.insertSnippet('2', 1, 1, `^(${K})`), { value: '2^()', caret: 3 });
  assert.deepEqual(C.insertSnippet('', 0, 0, `|${K}|`), { value: '||', caret: 1 }, '« | » est un caractère normal');
  assert.deepEqual(C.insertSnippet('abc', 0, 3, 'π'), { value: 'π', caret: 1 }, 'remplace la sélection');
  assert.deepEqual(C.insertSnippet('abc', undefined, undefined, '!'), { value: 'abc!', caret: 4 }, 'sans curseur : à la fin');
  assert.equal(C.insertSnippet('abc', 99, 99, '=').value, 'abc=');
});

test('splitTopLevel : découpe des formules trop larges', () => {
  const Q = '\\qquad';
  assert.deepEqual(C.splitTopLevel('a = 1 \\qquad b = 2 \\qquad c', Q), ['a = 1', 'b = 2', 'c']);
  assert.deepEqual(C.splitTopLevel('\\text{x \\qquad y} \\qquad z', Q), ['\\text{x \\qquad y}', 'z'], 'pas dans les accolades');
  assert.deepEqual(C.splitTopLevel('\\frac{a}{b}', Q), ['\\frac{a}{b}']);
  assert.deepEqual(C.splitTopLevel('a \\qquadx', Q), ['a \\qquadx'], 'une autre commande qui commence pareil');
  assert.deepEqual(C.splitTopLevel('\\{1\\} \\qquad 2', Q), ['\\{1\\}', '2'], 'accolades échappées ignorées');
});

test('approxTol : arrondi au centième ou à 3 chiffres significatifs accepté', () => {
  const ok = (ans, typed, sig) => Math.abs(C.parseNum(typed) - ans) <= C.approxTol(ans, sig);
  assert.ok(ok(123.456, '123,46'));
  assert.ok(ok(2 / 3, '0,67'));
  assert.ok(ok(0.3333, '0,33'));
  assert.ok(ok(1.6e-19 * 2.01, '3,22e-19'), 'petites valeurs : 3 chiffres significatifs');
  assert.ok(ok(123456, '1,23e5', true), 'physique : 3 chiffres significatifs');
  assert.ok(ok(2.998e8, '3,00e8', true));
  assert.ok(!ok(123456, '1,2e5', true));
  assert.ok(!ok(123456, '123000'), 'maths : il faut le centième');
  assert.ok(ok(0.012345, '0,0123'));
  assert.ok(!ok(2 / 3, '0,6'), 'un arrondi trop grossier est refusé');
  assert.ok(!ok(123.456, '124'));
  assert.ok(!ok(3.2e-19, '3,4e-19'));
});
