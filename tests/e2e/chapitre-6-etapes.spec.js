// Chapitres en 6 étapes (physique-1re/energie-enjeux, physique-1re/energie-interne) : parcours complet,
// widgets « Manipuler », brouillon intégré, calculatrice d'entraînement / d'examen, aucune erreur dans la console.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const URL = 'physique-1re/energie-enjeux.html';
const KEY = 'progress:physique-1re/energie-enjeux';
// chapitres refondus : même parcours (série de 5, évaluation sur 20, validation)
const CHAPTERS = [
  { url: URL, key: 'physique-1re/energie-enjeux', widget: '#w-energie', next: /energie-interne\.html$/ },
  { url: 'physique-1re/energie-interne.html', key: 'physique-1re/energie-interne', widget: '#w-du', next: /mesures-incertitudes\.html$/ }
];
const SIX_STEPS = CHAPTERS.map((c) => c.url);
const ROOT = path.resolve(__dirname, '..', '..');
const manifest = JSON.parse(/\/\* BEGIN-JSON \*\/([\s\S]*)\/\* END-JSON \*\//
  .exec(fs.readFileSync(path.join(ROOT, 'assets', 'chapters.js'), 'utf8'))[1]);
const PAGES = ['index.html'].concat(...manifest.subjects.map((s) => s.chapters.map((c) => `${s.id}/${c.slug}.html`)));

async function openPage(page, url = URL) {
  await page.goto(url);
  await page.waitForFunction(() => window.Course && document.querySelector('.topbar'));
  await page.evaluate(() => document.fonts && document.fonts.ready);
}
const open = (page, url = URL) => openPage(page, url);
const progress = (page, key = KEY) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), key);
const typed = (x) => String(Number(x.toPrecision(4))).replace('.', ',');

/** Répond juste à la question d'entraînement en cours, puis passe à la suivante. */
async function answerRight(page) {
  const cur = await page.evaluate(() => { const c = document.querySelector('#w-drill').courseDrill.current(); return { mcq: !!c.choices, a: c.answer }; });
  if (cur.mcq) await page.locator('#w-drill .choice').nth(cur.a).click();
  else {
    await page.locator('#w-drill .answer input').fill(typed(cur.a));
    await page.locator('#w-drill .drill-check').click();
  }
  await expect(page.locator('#w-drill .verdict.ok')).toBeVisible();
  await page.locator('#w-drill .verdict .btn', { hasText: 'Question suivante' }).click();
}
/** Remplit la copie : juste (ok = true) ou fausse. */
async function fillExam(page, ok) {
  const qs = await page.evaluate(() => document.querySelector('#exam').courseExam.questions().map((q) => ({ mcq: !!q.choices, a: q.answer, n: q.choices ? q.choices.length : 0 })));
  const cards = page.locator('#exam .exam-q');
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i], card = cards.nth(i);
    if (q.mcq) await card.locator('.choice').nth(ok ? q.a : (q.a + 1) % q.n).click();
    else await card.locator('input').fill(ok ? typed(q.a) : typed(q.a * 3.7));
  }
}

for (const ch of CHAPTERS) test.describe(`chapitre en 6 étapes : ${ch.key}`, () => {
  const KEY = 'progress:' + ch.key;
  const open = (page, url = ch.url) => openPage(page, url);
  test('structure : six étapes dans l’ordre, grille bento à 2 colonnes sur ordinateur, 1 sur téléphone', async ({ page }) => {
    await open(page);
    const ids = await page.locator('main section.step').evaluateAll((s) => s.map((x) => x.id));
    expect(ids).toEqual(['cours', 'exemples', 'manipuler', 'entrainement', 'evaluation', 'validation']);
    await expect(page.locator('.steps a')).toHaveCount(6);
    const cols = await page.locator('#cours .bento').first().evaluate((b) => getComputedStyle(b).gridTemplateColumns.split(' ').length);
    const width = page.viewportSize().width;
    expect(cols).toBe(width > 860 ? 2 : 1);
    // les éléments larges prennent toute la ligne
    const w = await page.locator(ch.widget).boundingBox(), g = await page.locator('#manipuler .bento').boundingBox();
    expect(Math.abs(w.width - g.width)).toBeLessThan(2);
    // conteneur élargi sur ordinateur (1200–1280 px)
    if (width >= 1366) {
      const main = await page.locator('main.chapter').boundingBox();
      expect(main.width).toBeGreaterThan(1150);
      expect(main.width).toBeLessThanOrEqual(1280);
    }
  });

  test('parcours : série de 5 → évaluation ; < 15/20 reverrouille ; ≥ 15/20 valide', async ({ page, isMobile }) => {
    test.skip(isMobile, 'logique indépendante de l’appareil : vérifiée sur ordinateur');
    await open(page);
    await page.evaluate((k) => localStorage.removeItem(k), KEY);
    await page.reload();
    await page.waitForFunction(() => window.Course);
    await expect(page.locator('#exam .exam-lock h3')).toHaveText('Évaluation verrouillée');
    await expect(page.locator('.steps a[data-step="evaluation"]')).toHaveClass(/is-locked/);
    await expect(page.locator('#validation-card .btn.is-locked')).toBeDisabled();

    // une erreur casse la série
    for (let i = 0; i < 3; i++) await answerRight(page);
    expect((await progress(page, KEY)).streak).toBe(3);
    // passer une question coûte la série : il faut confirmer
    await page.locator('#w-drill .drill-new').click();
    await expect(page.locator('#w-drill .drill-new')).toContainText('série repart à 0');
    expect((await progress(page, KEY)).streak).toBe(3);
    await page.locator('#w-drill .drill-new').click();
    expect((await progress(page, KEY)).streak).toBe(0);
    for (let i = 0; i < 4; i++) await answerRight(page);
    // 5e bonne réponse : le déblocage est le bouton principal
    const cur = await page.evaluate(() => { const c = document.querySelector('#w-drill').courseDrill.current(); return { mcq: !!c.choices, a: c.answer }; });
    if (cur.mcq) await page.locator('#w-drill .choice').nth(cur.a).click();
    else { await page.locator('#w-drill .answer input').fill(typed(cur.a)); await page.locator('#w-drill .drill-check').click(); }
    await expect(page.locator('#w-drill .verdict.unlock .v-title')).toHaveText('Évaluation débloquée !');
    await expect(page.locator('#w-drill .verdict.unlock a.btn:not(.ghost)')).toHaveText(/Passer l’évaluation/);
    await page.locator('#w-drill .verdict .btn', { hasText: 'Question suivante' }).click();
    await expect(page.locator('#exam .exam-lock h3')).toHaveText('Évaluation débloquée');
    await expect(page.locator('#w-drill .streak')).toContainText('5');

    // progression conservée après rechargement
    await page.reload();
    await page.waitForFunction(() => window.Course);
    await expect(page.locator('#exam .exam-lock h3')).toHaveText('Évaluation débloquée');

    // copie ratée : note < 15, évaluation reverrouillée
    await page.locator('#exam .btn', { hasText: 'Commencer' }).click();
    await expect(page.locator('#exam .exam-q')).toHaveCount(8);
    await expect(page.locator('#ws-exam .sheet[data-exam="1"]')).toHaveCount(1);
    await fillExam(page, false);
    await page.locator('#exam .btn', { hasText: 'Rendre ma copie' }).click();
    await expect(page.locator('#exam .score.fail')).toBeVisible();
    await expect(page.locator('#exam .score.fail .review a').first()).toHaveAttribute('href', /^#c-/); // notions à revoir
    await expect(page.locator('#exam .score')).toBeFocused();
    let st = await progress(page, KEY);
    expect(st.unlocked).toBe(false);
    expect(st.lastScore).toBeLessThan(15);
    await expect(page.locator('.steps a[data-step="evaluation"]')).toHaveClass(/is-locked/);
    await expect(page.locator('#ws-train .sheet:not([data-exam])')).toHaveCount(1); // brouillon revenu en entraînement

    // nouvelle série de 5, puis copie juste
    for (let i = 0; i < 5; i++) await answerRight(page);
    await page.locator('#exam .btn', { hasText: 'Nouvelle copie' }).click();
    await fillExam(page, true);
    await page.locator('#exam .btn', { hasText: 'Rendre ma copie' }).click();
    await expect(page.locator('#exam .score.pass .score-num')).toContainText('20');
    st = await progress(page, KEY);
    expect(st.validated).toBe(true);
    expect(await page.evaluate((k) => localStorage.getItem('done:' + k), ch.key)).toBe('1');
    await expect(page.locator('#validation-card.is-valid h3')).toHaveText('Chapitre validé');
    await expect(page.locator('#validation-card a.btn', { hasText: 'Chapitre suivant' })).toHaveAttribute('href', ch.next);
    // l'accueil marque le chapitre comme terminé
    await open(page, 'index.html');
    await expect(page.locator('#physique-1re .card.done')).toHaveCount(1);
  });

  test('copie incomplète : confirmation avant de rendre', async ({ page, isMobile }) => {
    test.skip(isMobile, 'logique indépendante de l’appareil');
    await open(page);
    await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ unlocked: true, streak: 5, best: 5 })), KEY);
    await page.reload();
    await page.waitForFunction(() => window.Course);
    await page.locator('#exam .btn', { hasText: 'Commencer' }).click();
    await page.locator('#exam .btn', { hasText: 'Rendre ma copie' }).click();
    await expect(page.locator('#exam .exam-actions .note')).toContainText('sans réponse');
    await expect(page.locator('#exam .btn', { hasText: 'Rendre quand même' })).toBeVisible();
    await expect(page.locator('#exam .score')).toHaveCount(0);
  });

  test('évaluation : la copie en cours survit à un rechargement', async ({ page, isMobile }) => {
    test.skip(isMobile, 'logique indépendante de l’appareil');
    await open(page);
    await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ unlocked: true, streak: 5, best: 5 })), KEY);
    await page.reload();
    await page.waitForFunction(() => window.Course);
    await page.locator('#exam .btn', { hasText: 'Commencer' }).click();
    await expect(page.locator('#exam .exam-title')).toBeFocused();
    const before = await page.evaluate(() => document.querySelector('#exam').courseExam.questions().map((q) => q.html));
    const input = page.locator('#exam .exam-q input').first();
    await input.fill('12,5');
    await page.reload();
    await page.waitForFunction(() => window.Course);
    await expect(page.locator('#exam .exam-note')).toContainText('Copie reprise');
    expect(await page.evaluate(() => document.querySelector('#exam').courseExam.questions().map((q) => q.html))).toEqual(before);
    await expect(page.locator('#exam .exam-q input').first()).toHaveValue('12,5');
    // chaque question numérique a son bouton calculatrice
    const numeric = await page.locator('#exam .exam-q input').count();
    await expect(page.locator('#exam .exam-q .drill-calc')).toHaveCount(numeric);
  });

  test('entraînement : bordure verte quand c’est juste, jamais rouge', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { const r = document.querySelector('#w-drill'); for (let i = 0; i < 50 && r.courseDrill.current().choices; i++) r.courseDrill.next(); });
    const a = await page.evaluate(() => document.querySelector('#w-drill').courseDrill.current().answer);
    await page.locator('#w-drill .answer input').fill('0,000001');
    await page.locator('#w-drill .drill-check').click();
    await expect(page.locator('#w-drill .answer')).toHaveClass(/is-ko/);
    await page.locator('#w-drill .answer input').fill(typed(a));
    await page.locator('#w-drill .drill-check').click();
    await expect(page.locator('#w-drill .answer')).toHaveClass(/is-ok/);
    await expect(page.locator('#w-drill .answer')).not.toHaveClass(/is-ko/);
    await expect(page.locator('#w-drill .drill-new')).toBeHidden(); // un seul « Question suivante »
  });

  test('entraînement : une erreur fréquente est expliquée avant la solution', async ({ page }) => {
    await open(page);
    await page.evaluate(() => { const r = document.querySelector('#w-drill'); for (let i = 0; i < 50 && !(r.courseDrill.current().traps || []).length; i++) r.courseDrill.next(); });
    const trap = await page.evaluate(() => {
      const c = document.querySelector('#w-drill').courseDrill.current();
      const t = c.traps.find((x) => Math.abs(x.value - c.answer) > Math.abs(c.answer) * 0.02);
      return t.value;
    });
    await page.locator('#w-drill .answer input').fill(typed(trap));
    await page.locator('#w-drill .drill-check').click();
    await expect(page.locator('#w-drill .verdict.hint .v-title')).toHaveText('Erreur fréquente');
    await expect(page.locator('#w-drill .solution-panel')).toHaveCount(0);
    await page.locator('#w-drill .answer input').fill('1');
    await page.locator('#w-drill .drill-check').click();
    await expect(page.locator('#w-drill .verdict.ko')).toBeVisible();
    await expect(page.locator('#w-drill .solution-panel')).toBeVisible();
  });
});

/* ---------- Chapitre 1 : widgets propres au chapitre ---------- */
test.describe('chapitre 1 : L’énergie et ses enjeux', () => {
  test('couleurs : la grandeur a la même couleur dans la formule, le curseur et le graphique', async ({ page }) => {
    await open(page);
    const c = await page.evaluate(() => {
      const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
      const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
      const formulaP = getComputedStyle(document.querySelector('#w-energie .lab-formula .q-P')).color;
      const sliderTone = getComputedStyle(document.querySelector('#w-energie .slider')).getPropertyValue('--tone').trim();
      return { qP: rgb(css('--q-P')), formulaP, slider: sliderTone, plot: window.Course.color('--q-P') };
    });
    expect(c.formulaP).toBe(c.qP);
    expect(c.slider.toLowerCase()).toBe(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--q-P').trim().toLowerCase()));
    expect(c.plot.toLowerCase()).toBe(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--q-P').trim().toLowerCase()));
  });

  test('manipuler : préréglages et cartes d’indicateurs réactives', async ({ page }) => {
    await open(page);
    const w = page.locator('#w-energie');
    await w.locator('.preset', { hasText: 'Four' }).click();
    await expect(w.locator('.preset', { hasText: 'Four' })).toHaveAttribute('aria-pressed', 'true');
    await expect(w.locator('.kpi').nth(1).locator('.kpi-value')).toContainText('3,3'); // 2,2 kW × 1,5 h
    await expect(w.locator('.dt-out')).toHaveText('1 h 30 min');
    const c = page.locator('#w-chaine');
    await c.locator('.preset', { hasText: 'électrique' }).click();
    await expect(c.locator('.live-chain')).toContainText('Moteur électrique');
    await expect(c.locator('.badge.good').first()).toBeVisible();
    await expect(c.locator('.kpi').first().locator('.kpi-value')).toContainText('45'); // 0,9 × 50 kWh
  });

  test('chaînes énergétiques : rien n’est rogné, le convertisseur est un ovale', async ({ page }) => {
    await open(page);
    const r = await page.locator('.chain').evaluateAll((chains) => chains.map((c) => ({ over: c.scrollWidth - c.clientWidth, radius: getComputedStyle(c.querySelector('.chain-conv')).borderTopLeftRadius })));
    for (const x of r) expect(x.over).toBeLessThanOrEqual(1);
    expect(r[0].radius).toContain('%');
  });

});

/* ---------- Chapitre 2 : énergie interne ---------- */
test.describe('chapitre 2 : énergie interne', () => {
  const URL2 = 'physique-1re/energie-interne.html';
  test('couleurs : T, c et m ont la même couleur dans la formule, le curseur et le graphique', async ({ page }) => {
    await open(page, URL2);
    const r = await page.evaluate(() => {
      const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim().toLowerCase();
      const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
      const w = document.querySelector('#w-du');
      return ['T', 'c', 'm'].map((q) => ({
        q, want: css('--q-' + q), rgb: rgb(css('--q-' + q)),
        formula: getComputedStyle(w.querySelector('.lab-formula .q-' + q)).color,
        slider: getComputedStyle(w.querySelector(`.slider[style*="--q-${q})"]`)).getPropertyValue('--tone').trim().toLowerCase(),
        plot: window.Course.color('--q-' + q).toLowerCase()
      }));
    });
    for (const x of r) {
      expect(x.formula, x.q).toBe(x.rgb);
      expect(x.slider, x.q).toBe(x.want);
      expect(x.plot, x.q).toBe(x.want);
    }
  });

  test('manipuler : ΔU = m·c·ΔT, signe de ΔU et matériau le plus proche', async ({ page }) => {
    await open(page, URL2);
    const w = page.locator('#w-du');
    await w.locator('.preset', { hasText: 'Lait' }).click();
    await expect(w.locator('.preset', { hasText: 'Lait' })).toHaveAttribute('aria-pressed', 'true');
    await expect(w.locator('.kpi').nth(0).locator('.kpi-value')).toContainText('−33'); // ΔT = 37 − 70 (vrai signe moins)
    await expect(w.locator('.kpi').nth(1).locator('.kpi-value')).toContainText('37,6'); // 0,3 × 3 800 × (−33) J = −37,6 kJ
    await expect(w.locator('.kpi').nth(1).locator('.kpi-sub')).toContainText('perd');
    await expect(w.locator('.kpi').nth(3).locator('.kpi-value')).toHaveText('lait');
    await w.locator('.preset', { hasText: 'Eau' }).click();
    await expect(w.locator('.kpi').nth(1).locator('.kpi-value')).toContainText('878'); // exercice 2.1 : 877 800 J
    await expect(w.locator('.kpi').nth(1).locator('.kpi-sub')).toContainText('gagne');
  });

  test('manipuler : paliers de changement d’état à température constante', async ({ page }) => {
    await open(page, URL2);
    const w = page.locator('#w-chauffe');
    await w.locator('.preset', { hasText: 'Glace qui fond' }).click();
    await expect(w.locator('.kpi').nth(0).locator('.kpi-value')).toContainText(/^0\s*°C/);
    await expect(w.locator('.kpi').nth(1).locator('.kpi-value')).toHaveText('En fusion');
    await expect(w.locator('.kpi').nth(1).locator('.kpi-sub')).toContainText('% de la glace a fondu');
    await w.locator('.preset', { hasText: 'Eau qui bout' }).click();
    await expect(w.locator('.kpi').nth(0).locator('.kpi-value')).toContainText('100');
    await expect(w.locator('.kpi').nth(1).locator('.kpi-value')).toHaveText('En ébullition');
    // le curseur d'énergie s'adapte à la masse : 0,5 kg demande moitié moins d'énergie
    await w.locator('.preset', { hasText: '0,5 kg' }).click();
    expect(Number(await w.locator('[data-k="Q"]').getAttribute('max'))).toBe(1574);
    await expect(w.locator('.kpi').nth(1).locator('.kpi-value')).toHaveText('Vapeur');
    await expect(w.locator('.kpi').nth(0).locator('.kpi-value')).toContainText('120');
  });

  test('manipuler : calorimètre isolé, la somme des ΔU est nulle', async ({ page }) => {
    await open(page, URL2);
    const w = page.locator('#w-calo');
    for (const p of ['Aluminium', 'Plomb', 'Zinc']) {
      await w.locator('.preset', { hasText: p }).click();
      await expect(w.locator('.kpi').nth(4).locator('.kpi-value')).toHaveText(/^0\s*J$/);
      await expect(w.locator('.kpi').nth(4).locator('.badge.good')).toBeVisible();
    }
    await w.locator('.preset', { hasText: 'Aluminium' }).click();
    await expect(w.locator('.kpi').nth(0).locator('.kpi-value')).toContainText('25'); // exemple de la page : 25 °C
    await expect(w.locator('.kpi').nth(3).locator('.kpi-sub')).toContainText('cède');
  });

  test('cours : figures lisibles, rien ne déborde des cartes', async ({ page }) => {
    await open(page, URL2);
    const r = await page.locator('#cours .fig').evaluateAll((f) => f.map((x) => ({ w: x.getBoundingClientRect().width, card: x.closest('.box').getBoundingClientRect().width })));
    expect(r.length).toBe(2);
    for (const x of r) { expect(x.w).toBeGreaterThan(240); expect(x.w).toBeLessThanOrEqual(x.card); }
    const over = await page.locator('#cours .box, #exemples .box').evaluateAll((b) => b.filter((x) => x.scrollWidth > x.clientWidth + 1).length);
    expect(over).toBe(0);
  });
});

/* ---------- Brouillon intégré : écran partagé, aiguillage des symboles, modes de la calculatrice ---------- */
async function readyWorkspace(page, host) {
  await page.locator(host).scrollIntoViewIfNeeded();
  await page.waitForSelector(`${host} .sheet[data-ready="1"]`, { timeout: 30000 });
}
const setCalc = (page, host, latex) => page.locator(`${host} .calc-field`).evaluate((f, l) => {
  if (f.setValue) f.setValue(l); else f.value = l;
  f.dispatchEvent(new Event('input', { bubbles: true }));
}, latex);

test.describe('brouillon intégré', () => {
  test('ordinateur : feuille et calculatrice côte à côte, sélecteur « Utiliser les symboles sur »', async ({ page }) => {
    test.skip(page.viewportSize().width < 760, 'sur téléphone : bouton qui ouvre le brouillon en plein écran');
    await open(page);
    await readyWorkspace(page, '#ws-train');
    const sheet = page.locator('#ws-train .sheet');
    await expect(sheet).toHaveClass(/is-inline/);
    await expect(sheet).toHaveClass(/is-split/);
    const paper = await sheet.locator('.sheet-paper').boundingBox(), calc = await sheet.locator('.calc-view').boundingBox();
    expect(calc.x).toBeGreaterThan(paper.x + paper.width - 2); // côte à côte
    await expect(sheet.locator('.route-label')).toHaveText('Utiliser les symboles sur');
    // symboles vers la calculatrice
    await sheet.locator('.mode-opt[data-mode="calc"]').click();
    await sheet.locator('.kb-tab', { hasText: '123' }).click();
    await sheet.locator('.kb-pane.is-active .key[data-k="7"]').click();
    await expect(sheet.locator('.calc-result')).toHaveText('= 7');
    // symboles vers la feuille : la calculatrice ne bouge plus
    await sheet.locator('.mode-opt[data-mode="sheet"]').click();
    await sheet.locator('.kb-tab', { hasText: '123' }).click();
    await sheet.locator('.kb-pane.is-active .key[data-k="8"]').click();
    expect(await sheet.locator('.sheet-lines math-field, .sheet-lines .line').last().evaluate((f) => f.getValue ? f.getValue('latex') : f.value)).toContain('8');
    await expect(sheet.locator('.calc-result')).toHaveText('= 7');
  });

  test('entraînement : la calculatrice dérive, cherche une primitive et intègre', async ({ page }) => {
    test.skip(page.viewportSize().width < 760, 'vérifiée sur grand écran');
    await open(page);
    await readyWorkspace(page, '#ws-train');
    const res = page.locator('#ws-train .calc-result');
    await setCalc(page, '#ws-train', '\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(x^{3}\\right)');
    await expect(res).toHaveClass(/is-expr/);
    await expect(res.locator('.katex-mathml annotation')).toHaveText('=3x^{2}');
    await setCalc(page, '#ws-train', '\\int x^{2}\\,\\mathrm{d}x');
    await expect(res.locator('.katex-mathml annotation')).toHaveText('=\\frac{x^{3}}{3}+C');
    await setCalc(page, '#ws-train', '\\int_{0}^{1}x^{2}\\,\\mathrm{d}x');
    await expect(res).toHaveText('= 0,3333333333');
    // les touches avancées ne sont pas verrouillées en entraînement
    await expect(page.locator('#ws-train .sheet')).not.toHaveAttribute('data-exam', '1');
  });

  test('évaluation : calculatrice en mode examen (fonctions standard seulement)', async ({ page }) => {
    test.skip(page.viewportSize().width < 760, 'vérifiée sur grand écran');
    await open(page);
    await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ unlocked: true, streak: 5, best: 5 })), KEY);
    await page.reload();
    await page.waitForFunction(() => window.Course);
    await page.locator('#exam .btn', { hasText: 'Commencer' }).click();
    await readyWorkspace(page, '#ws-exam');
    const sheet = page.locator('#ws-exam .sheet');
    await expect(sheet).toHaveAttribute('data-exam', '1');
    await expect(sheet.locator('.exam-flag')).toBeVisible();
    const res = sheet.locator('.calc-result');
    await setCalc(page, '#ws-exam', '\\int_{0}^{1}x^{2}\\,\\mathrm{d}x');
    await expect(res).toContainText('Mode examen');
    await setCalc(page, '#ws-exam', '\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(x^{3}\\right)');
    await expect(res).toContainText('Mode examen');
    await setCalc(page, '#ws-exam', '\\frac{3}{4}+\\sqrt{16}');
    await expect(res).toHaveText('= 4,75');
    // touche intégrale refusée côté calculatrice, permise sur la feuille
    await sheet.locator('.mode-opt[data-mode="calc"]').click();
    await sheet.locator('.kb-tab', { hasText: 'Symboles' }).click();
    await sheet.locator('.kb-pane.is-active .key[data-k="\\\\int_a^b"]').click();
    await expect(res).toContainText('Mode examen');
    await sheet.locator('.mode-opt[data-mode="sheet"]').click();
    await sheet.locator('.kb-tab', { hasText: 'Symboles' }).click();
    await sheet.locator('.kb-pane.is-active .key[data-k="\\\\int_a^b"]').click();
    expect(await sheet.locator('.sheet-lines math-field').last().evaluate((f) => f.getValue('latex'))).toContain('\\int');
    // « Utiliser comme réponse » remplit la question qui a le focus
    await page.locator('#exam .exam-q input').first().focus();
    await setCalc(page, '#ws-exam', '2\\times3');
    await sheet.locator('.calc-use').click();
    await expect(page.locator('#exam .exam-q input').first()).toHaveValue('6');
  });

  test('téléphone : bouton « Brouillon et calculatrice » qui ouvre le plein écran', async ({ page }) => {
    test.skip(page.viewportSize().width >= 760, 'sur grand écran, le brouillon est intégré à la page');
    await open(page);
    const launch = page.locator('#ws-train .workspace-launch');
    await launch.scrollIntoViewIfNeeded();
    await expect(launch).toBeVisible();
    await expect(page.locator('#ws-train .sheet')).toBeHidden();
    await launch.click();
    const sheet = page.locator('body > .sheet');
    await expect(sheet).toBeVisible();
    await page.waitForSelector('body > .sheet[data-ready="1"]', { timeout: 30000 });
    const box = await sheet.boundingBox(), vp = page.viewportSize();
    expect(box.width).toBeGreaterThanOrEqual(vp.width - 1);
    await sheet.locator('.sheet-close').click();
    await expect(page.locator('#ws-train .sheet')).toHaveCount(1); // revenu à sa place
    expect(await page.evaluate(() => document.documentElement.classList.contains('fs-lock'))).toBe(false);
  });
});

/* ---------- Zéro erreur dans la console ---------- */
test.describe('aucune erreur dans la console', () => {
  test.skip(({ isMobile }) => isMobile, 'vérifié sur ordinateur (le code est le même)');
  for (const url of PAGES) {
    test(url, async ({ page }) => {
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error' || (SIX_STEPS.includes(url) && m.type() === 'warning')) errors.push(`${m.type()}: ${m.text()}`); });
      page.on('pageerror', (e) => errors.push(e.message));
      await open(page, url);
      await page.waitForTimeout(300);
      expect(errors).toEqual([]);
    });
  }
});
