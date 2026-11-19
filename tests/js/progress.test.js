// Progression d'un chapitre (série de 5, évaluation sur 20, validation à 15), pièges et formats.
// Lancer : node --test tests/js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../assets/core.js');

test('règles du parcours : série de 5, évaluation sur 20, validation à 15', () => {
  assert.deepEqual(C.GATE, { STREAK: 5, PASS: 15, TOTAL: 20 });
});

test('5 bonnes réponses de suite débloquent l’évaluation, une erreur remet la série à 0', () => {
  let st = C.progressDefaults();
  for (let i = 0; i < 4; i++) st = C.progressAnswer(st, true);
  assert.equal(st.streak, 4);
  assert.equal(st.unlocked, false);
  st = C.progressAnswer(st, false);
  assert.equal(st.streak, 0, 'une erreur casse la série');
  assert.equal(st.best, 4);
  for (let i = 0; i < 5; i++) st = C.progressAnswer(st, true);
  assert.equal(st.unlocked, true);
  st = C.progressAnswer(st, false);
  assert.equal(st.unlocked, true, 'une fois débloquée, l’évaluation le reste jusqu’à la prochaine copie');
  assert.equal(st.answered, 11);
  assert.equal(st.correct, 9);
});

test('note ≥ 15 : chapitre validé ; note < 15 : évaluation reverrouillée et nouvelle série exigée', () => {
  let st = C.progressDefaults();
  for (let i = 0; i < 5; i++) st = C.progressAnswer(st, true);
  const fail = C.progressExam(st, 14.5);
  assert.equal(fail.validated, false);
  assert.equal(fail.unlocked, false);
  assert.equal(fail.streak, 0);
  assert.equal(fail.attempts, 1);
  assert.equal(fail.lastScore, 14.5);
  let again = fail;
  for (let i = 0; i < 5; i++) again = C.progressAnswer(again, true);
  assert.equal(again.unlocked, true);
  const pass = C.progressExam(again, 15);
  assert.equal(pass.validated, true);
  assert.equal(pass.unlocked, true, 'on peut retenter pour améliorer sa note');
  assert.equal(pass.bestScore, 15);
  const later = C.progressExam(pass, 9);
  assert.equal(later.validated, true, 'une copie ratée après validation ne retire pas la validation');
  assert.equal(later.bestScore, 15);
  assert.equal(later.unlocked, false);
});

test('passer une question remet la série à 0 sans compter de réponse', () => {
  let st = C.progressDefaults();
  for (let i = 0; i < 3; i++) st = C.progressAnswer(st, true);
  const skipped = C.progressSkip(st);
  assert.equal(skipped.streak, 0);
  assert.equal(skipped.answered, 3);
  assert.equal(skipped.best, 3);
  assert.equal(st.streak, 3, 'état d’origine intact');
});

test('les fonctions de progression ne modifient pas l’état reçu', () => {
  const st = C.progressDefaults();
  C.progressAnswer(st, true);
  C.progressExam(st, 18);
  assert.deepEqual(st, C.progressDefaults());
});

test('progression enregistrée abîmée ou incomplète : valeurs par défaut', () => {
  assert.deepEqual(C.progressRead(null), C.progressDefaults());
  assert.deepEqual(C.progressRead('{oops'), C.progressDefaults());
  assert.deepEqual(C.progressRead('{"streak":"3","unlocked":1}'), C.progressDefaults(), 'types faux ignorés');
  const st = C.progressRead('{"streak":3,"unlocked":true,"bestScore":16,"extra":1}');
  assert.equal(st.streak, 3);
  assert.equal(st.unlocked, true);
  assert.equal(st.bestScore, 16);
  assert.equal(st.extra, undefined);
});

test('note d’une copie : somme des points des questions justes', () => {
  assert.equal(C.examScore([{ points: 3, ok: true }, { points: 2, ok: false }, { points: 5, ok: true }]), 8);
  assert.equal(C.examScore([]), 0);
});

test('réponse juste à 3 chiffres significatifs près', () => {
  assert.ok(C.isCorrect(7.92e8, 7.92e8));
  assert.ok(C.isCorrect(733, 733.333));
  assert.ok(!C.isCorrect(740, 733.333));
  assert.ok(!C.isCorrect(NaN, 1));
  assert.ok(C.isCorrect(3.1, 3, 0.2), 'tolérance donnée');
});

test('pièges : l’erreur fréquente est reconnue, sans jamais masquer la bonne réponse', () => {
  const traps = [{ value: 60, msg: 'minutes' }, { value: 1, msg: 'confondu' }, { value: NaN, msg: 'ignoré' }];
  assert.equal(C.matchTrap(60.5, traps, 1).msg, 'minutes');
  assert.equal(C.matchTrap(1, traps, 1), null, 'un piège égal à la réponse est ignoré');
  assert.equal(C.matchTrap(30, traps, 1), null);
  assert.equal(C.matchTrap(NaN, traps, 1), null);
  assert.equal(C.matchTrap(5, null, 1), null);
});

test('nombres de physique à la française', () => {
  assert.equal(C.roundSig(733.3333, 3), 733);
  assert.equal(C.roundSig(0.0123456, 2), 0.012);
  assert.equal(C.fmtNum(7.92e8), '7,92 × 10⁸');
  assert.equal(C.fmtNum(1.23e-4), '1,23 × 10⁻⁴');
  assert.equal(C.fmtNum(0.35), '0,35');
  assert.equal(C.fmtNum(1000).replace(/\s/g, ' '), '1 000');
  assert.equal(C.texNum(7.92e8), '7{,}92\\times 10^{8}');
  assert.equal(C.texNum(455000), '455\\,000');
  assert.equal(C.texNum(16.2), '16{,}2');
  assert.equal(C.texNum(3.6e6), '3{,}6\\times 10^{6}');
  assert.equal(C.texNum(9.999e5), '1\\times 10^{6}', 'l’arrondi peut changer d’ordre de grandeur');
  assert.equal(C.texNum(1000), '1\\,000', 'log10(1000) = 2,999… en flottants');
});

test('durées : … j … h … min … s', () => {
  assert.equal(C.fmtDuration(40), '40 s');
  assert.equal(C.fmtDuration(0), '0 s');
  assert.equal(C.fmtDuration(3600), '1 h');
  assert.equal(C.fmtDuration(150000), '1 j 17 h 40 min');
  assert.equal(C.fmtDuration(16250), '4 h 30 min 50 s');
  assert.equal(C.fmtDuration(-1), '—');
  assert.deepEqual(C.splitDuration(90061), { j: 1, h: 1, min: 1, s: 1 });
});

test('saisie de la notation scientifique comme sur une copie', () => {
  assert.equal(C.parseNum('7,92.10^8'), 7.92e8);
  assert.equal(C.parseNum('7,92 x 10^8'), 7.92e8);
  assert.equal(C.parseNum('7,92×10^8'), 7.92e8);
  assert.equal(C.parseNum('7,92e8'), 7.92e8);
  assert.equal(C.parseNum('2.10^3'), 2000);
  assert.equal(C.parseNum('2.5'), 2.5, 'le point décimal reste un point décimal');
});
