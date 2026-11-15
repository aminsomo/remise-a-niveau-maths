// Tests de bout en bout : affichage mobile, plein écran des graphiques, brouillon + calculatrice.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const manifest = JSON.parse(/\/\* BEGIN-JSON \*\/([\s\S]*)\/\* END-JSON \*\//
  .exec(fs.readFileSync(path.join(ROOT, 'assets', 'chapters.js'), 'utf8'))[1]);
const PAGES = ['index.html'].concat(...manifest.subjects.map((s) => s.chapters.map((c) => `${s.id}/${c.slug}.html`)));

async function open(page, url) {
  await page.goto(url);
  await page.waitForFunction(() => window.Course && document.querySelector('.topbar'));
  await page.evaluate(() => document.fonts && document.fonts.ready);
}

/**
 * Éléments visibles qui dépassent à droite de l'écran. Un élément rogné par un ancêtre
 * (overflow non visible) qui, lui, tient dans l'écran ne compte pas : c'est le cas des
 * zones défilantes prévues (formules longues, tableaux) et du MathML caché de KaTeX.
 */
async function overflowing(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const clipped = (el) => {
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if ((cs.overflowX !== 'visible' || cs.clipPath !== 'none') && a.getBoundingClientRect().right <= W + 1) return true;
      }
      return false;
    };
    const bad = [];
    for (const el of document.querySelectorAll('main *, .topbar *, .hero *')) {
      if (el.closest('.katex-mathml') || (el.ownerSVGElement)) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.right <= W + 1) continue;
      if (clipped(el)) continue;
      bad.push(`${el.tagName.toLowerCase()}.${String(el.className)} « ${(el.textContent || '').trim().slice(0, 40)} » → ${Math.round(r.right)} > ${W}`);
    }
    return { scroll: document.documentElement.scrollWidth - W, bad: bad.slice(0, 6) };
  });
}

test.describe('aucun débordement horizontal', () => {
  for (const url of PAGES) {
    test(url, async ({ page }) => {
      await open(page, url);
      const o = await overflowing(page);
      expect(o.bad, 'éléments qui sortent de l’écran').toEqual([]);
      expect(o.scroll, 'la page ne doit pas défiler horizontalement').toBeLessThanOrEqual(1);
    });
  }
});

test('menu des matières sur téléphone, barre complète sur ordinateur', async ({ page, isMobile }) => {
  await open(page, 'maths/suites.html');
  const nav = page.locator('#site-nav');
  const menu = page.locator('.menu-btn');
  const narrow = (page.viewportSize().width <= 760);
  if (narrow) {
    await expect(nav).toBeHidden();
    await menu.click();
    await expect(nav).toBeVisible();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.locator('a').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(nav).toBeHidden();
  } else {
    await expect(menu).toBeHidden();
    await expect(nav).toBeVisible();
  }
});

test('le curseur inutile est vraiment masqué (attribut hidden)', async ({ page }) => {
  await open(page, 'maths/suites.html');
  const w = page.locator('#w-suite');
  await w.locator('select[data-k="type"]').selectOption('g');
  await expect(w.locator('.only-g')).toBeVisible();
  await expect(w.locator('.only-a')).toBeHidden();
  await w.locator('select[data-k="type"]').selectOption('a');
  await expect(w.locator('.only-a')).toBeVisible();
  await expect(w.locator('.only-g')).toBeHidden();
});

test('chaque graphique a un bouton plein écran qui fonctionne', async ({ page }) => {
  await open(page, 'maths/suites.html');
  const w = page.locator('#w-suite');
  const btn = w.locator('.fs-btn');
  await expect(btn).toBeVisible();
  const box = await btn.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(40); // cible tactile
  const before = await w.evaluate((n) => Array.from(n.children).map((c) => c.tagName + '.' + c.className).join('|'));
  const small = await w.locator('canvas').boundingBox();

  await btn.click();
  await expect(w).toHaveClass(/is-fs/);
  const vp = page.viewportSize();
  const full = await w.boundingBox();
  expect(full.width).toBeGreaterThanOrEqual(vp.width - 1);
  expect(full.height).toBeGreaterThanOrEqual(vp.height - 2);
  const big = await w.locator('canvas').boundingBox();
  expect(big.width * big.height).toBeGreaterThan(small.width * small.height * 0.99);
  // les réglages restent utilisables en plein écran
  const slider = w.locator('input[data-k="N"]');
  await slider.scrollIntoViewIfNeeded();
  await expect(slider).toBeVisible();
  await slider.fill('10');
  await expect(w.locator('output[data-show="N"]')).toHaveText('10');
  await expect(w.locator('.readout')).toContainText('u_9');
  // aucune barre de défilement de page pendant le plein écran
  expect(await page.evaluate(() => document.documentElement.classList.contains('fs-lock'))).toBe(true);

  await w.locator('.fs-btn').click();
  await expect(w).not.toHaveClass(/is-fs/);
  const after = await w.evaluate((n) => Array.from(n.children).map((c) => c.tagName + '.' + c.className).join('|'));
  expect(after).toBe(before);
  expect(await page.evaluate(() => document.documentElement.classList.contains('fs-lock'))).toBe(false);

  // Échap quitte aussi
  await btn.click();
  await expect(w).toHaveClass(/is-fs/);
  await page.keyboard.press('Escape');
  await expect(w).not.toHaveClass(/is-fs/);
});

test('tous les widgets à graphique de toutes les pages ont le bouton plein écran', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'vérification structurelle : une seule fois');
  for (const url of PAGES.slice(1)) {
    await open(page, url);
    const missing = await page.evaluate(() => Array.from(document.querySelectorAll('.widget'))
      .filter((w) => w.querySelector('canvas') && !w.querySelector(':scope > .fs-btn')).length);
    expect(missing, url).toBe(0);
  }
});

test('chaque exercice a un bouton calculatrice juste après « Vérifier »', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'vérification structurelle : une seule fois');
  let drills = 0;
  for (const url of PAGES.slice(1)) {
    await open(page, url);
    const r = await page.evaluate(() => Array.from(document.querySelectorAll('.drill-check')).map((c) =>
      !!(c.nextElementSibling && c.nextElementSibling.classList.contains('drill-calc') && c.nextElementSibling.querySelector('svg'))));
    drills += r.length;
    expect(r.every(Boolean), url).toBe(true);
  }
  expect(drills).toBeGreaterThan(10);
});

/* ---------- Brouillon : feuille et calculatrice « comme au stylo » ---------- */
async function openSheet(page) {
  await page.locator('#w-drill .drill-calc').click();
  await expect(page.locator('.sheet')).toBeVisible();
  await page.waitForSelector('.sheet[data-ready="1"]', { timeout: 30000 });
}
const kkey = (page, k) => page.locator(`.kb-pane.is-active .key[data-k="${k.replace(/\\/g, '\\\\')}"]`).first();
const tab = (page, name) => page.locator('.kb-tab', { hasText: name }).click();
const nextBox = (page) => page.locator('.key-nav[aria-label="Case suivante"]').click();

test('brouillon : feuille noire plein écran, maths écrites comme au stylo', async ({ page }) => {
  await open(page, 'maths/suites.html');
  await openSheet(page);
  const sheet = page.locator('.sheet');
  const vp = page.viewportSize(), box = await sheet.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(vp.width - 1);
  expect(box.height).toBeGreaterThanOrEqual(vp.height - 2);
  expect(await sheet.evaluate((n) => getComputedStyle(n).backgroundColor)).toBe('rgb(11, 12, 14)');
  await expect(page.locator('.sheet-q')).toContainText(/Calcule|calcule/);
  await page.locator('.mode-opt[data-mode="sheet"]').click();
  await expect(page.locator('.mode-opt[data-mode="sheet"]')).toHaveAttribute('aria-checked', 'true');

  // fraction : une barre et deux cases ; intégrale : deux bornes
  await tab(page, 'Symboles');
  await kkey(page, '\\frac{a}{b}').click();
  await tab(page, '123');
  await kkey(page, '1').click(); await nextBox(page); await kkey(page, '2').click();
  const line = page.locator('.sheet-lines math-field').first();
  expect(await line.evaluate((f) => f.getValue('latex'))).toMatch(/\\frac\{?1\}?\{?2\}?/);
  await page.locator('.key-eq').click(); // ↵ : nouvelle ligne
  await expect(page.locator('.sheet-lines math-field')).toHaveCount(2);
  await tab(page, 'Symboles');
  await kkey(page, '\\int_a^b').click();
  const l2 = await page.locator('.sheet-lines math-field').nth(1).evaluate((f) => f.getValue('latex'));
  expect(l2).toContain('\\int_');
  expect(l2).toContain('placeholder');

  // conservé après rechargement
  await page.keyboard.press('Escape');
  await page.reload();
  await page.waitForFunction(() => window.Course);
  await openSheet(page);
  await page.locator('.mode-opt[data-mode="sheet"]').click();
  expect(await page.locator('.sheet-lines math-field').first().evaluate((f) => f.getValue('latex'))).toMatch(/frac/);
});

test('brouillon : calculatrice avec intégrale, fraction, réponse', async ({ page }) => {
  await open(page, 'maths/suites.html');
  await openSheet(page);
  await page.locator('.mode-opt[data-mode="calc"]').click();
  await expect(page.locator('.mode-opt[data-mode="calc"]')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.kb-tab', { hasText: '123' })).toHaveAttribute('aria-selected', 'true');
  // ∫₀¹ x² dx
  await tab(page, 'Symboles');
  await kkey(page, '\\int_a^b').click();
  await tab(page, '123');
  await kkey(page, '0').click(); await nextBox(page);
  await kkey(page, '1').click(); await nextBox(page);
  await kkey(page, 'x').click(); await kkey(page, 'x^{2}').click();
  await expect(page.locator('.calc-result')).toHaveText('= 0,3333333333');
  await page.locator('.key-eq').click();
  await expect(page.locator('.calc-result')).toHaveClass(/is-done/);
  // erreur compréhensible : case vide
  await page.locator('.key-ctl', { hasText: 'AC' }).click();
  await kkey(page, '\\frac{a}{b}').click();
  await page.locator('.key-eq').click();
  await expect(page.locator('.calc-result')).toHaveText(/case est vide/i);
  // 3/4 + 1 → 1,75, utilisé comme réponse
  await page.locator('.key-ctl', { hasText: 'AC' }).click();
  await kkey(page, '3').click(); await kkey(page, '\\frac{a}{b}').click(); await kkey(page, '4').click();
  await page.locator('.key-nav[aria-label="Avancer"]').click();
  await kkey(page, '+').click(); await kkey(page, '1').click();
  await expect(page.locator('.calc-result')).toHaveText('= 1,75');
  // vers la feuille, puis réponse
  await page.locator('.calc-act', { hasText: 'Vers la feuille' }).click();
  await page.locator('.calc-use').click();
  await expect(page.locator('.sheet')).toBeHidden();
  await expect(page.locator('#w-drill input')).toHaveValue('1,75');
  expect(await page.evaluate(() => document.documentElement.classList.contains('fs-lock'))).toBe(false);
  // degrés
  await page.locator('#w-drill .drill-calc').click();
  await page.locator('.calc-flag').click();
  await expect(page.locator('.calc-flag')).toHaveText('DEG');
  await page.locator('.key-ctl', { hasText: 'AC' }).click();
  await kkey(page, '\\cos').click(); await kkey(page, '6').click(); await kkey(page, '0').click();
  await expect(page.locator('.calc-result')).toHaveText('= 0,5');
});

test('brouillon : écriture au stylo et effacement annulable', async ({ page }) => {
  await open(page, 'maths/suites.html');
  await openSheet(page);
  await page.locator('.mode-opt[data-mode="sheet"]').click();
  await page.locator('.seg-btn[data-tool="pen"]').click();
  const ink = await page.locator('.sheet-ink').boundingBox();
  await page.mouse.move(ink.x + 30, ink.y + 40);
  await page.mouse.down();
  await page.mouse.move(ink.x + 90, ink.y + 60, { steps: 6 });
  await page.mouse.move(ink.x + 140, ink.y + 30, { steps: 6 });
  await page.mouse.up();
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('sheet-ink:maths/suites') || '[]').length);
  expect(await saved()).toBe(1);
  await page.locator('.sheet-tool').click();
  expect(await saved()).toBe(0);
  await expect(page.locator('.sheet-tool')).toContainText('Annuler');
  await page.locator('.sheet-tool').click();
  expect(await saved()).toBe(1);
});

test('brouillon sans réseau : repli sur une saisie simple', async ({ page }) => {
  await page.route('**/mathlive@*/**', (r) => r.abort());
  await open(page, 'maths/suites.html');
  await openSheet(page);
  await expect(page.locator('.load-note')).toContainText('saisie simple');
  await page.locator('.mode-opt[data-mode="calc"]').click();
  await page.locator('.calc-field').fill('3/4+1');
  await page.locator('.calc-field').press('Enter');
  await expect(page.locator('.calc-result')).toHaveText('= 1,75');
});

test('graphique lisible : texte des graduations d’au moins 12 px', async ({ page }) => {
  await open(page, 'maths/suites.html');
  // on relit la police réellement utilisée par le canevas lors du dernier dessin
  const size = await page.evaluate(() => {
    const c = document.querySelector('#w-suite canvas');
    return parseFloat(c.getContext('2d').font.match(/(\d+(\.\d+)?)px/)[1]);
  });
  expect(size).toBeGreaterThanOrEqual(12);
});

/* ---------- Se déplacer dans un graphique ---------- */
const view = (loc) => loc.evaluate((c) => { const v = c.coursePlot.ev; return { xmin: v.xmin, xmax: v.xmax, ymin: v.ymin, ymax: v.ymax }; });

test('graphique : zoom, déplacement, recentrage', async ({ page, isMobile }) => {
  await open(page, 'maths/suites.html');
  const w = page.locator('#w-suite'), canvas = w.locator('canvas');
  await canvas.scrollIntoViewIfNeeded();
  const v0 = await view(canvas);
  const home = w.locator('.plot-tool[aria-label="Recentrer le graphique"]');
  await expect(home).toBeHidden();

  await w.locator('.plot-tool[aria-label="Zoomer"]').click();
  const v1 = await view(canvas);
  expect((v1.xmax - v1.xmin) / (v0.xmax - v0.xmin)).toBeCloseTo(1 / 1.5, 3);
  await expect(home).toBeVisible();

  // glisser vers la gauche : on voit plus loin à droite
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  const v2 = await view(canvas);
  expect(v2.xmin).toBeGreaterThan(v1.xmin + (v1.xmax - v1.xmin) * 0.3);

  // les curseurs de la page ne réinitialisent pas la vue de l'élève
  await w.locator('input[data-k="N"]').fill('30');
  const v3 = await view(canvas);
  expect(v3.xmin).toBeGreaterThan(v0.xmin);

  await home.click();
  const v4 = await view(canvas);
  expect(v4.xmax - v4.xmin).toBeCloseTo((await canvas.evaluate((c) => c.coursePlot.view.xmax - c.coursePlot.view.xmin)), 5);
  await expect(home).toBeHidden();

  if (!isMobile) {
    // Ctrl + molette zoome ; la molette seule laisse défiler la page
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -300);
    await page.keyboard.up('Control');
    const v5 = await view(canvas);
    expect(v5.xmax - v5.xmin).toBeLessThan(v4.xmax - v4.xmin);
    // clavier
    await canvas.focus();
    await page.keyboard.press('0');
    await page.keyboard.press('ArrowRight');
    const v6 = await view(canvas);
    expect(v6.xmin).toBeGreaterThan(v4.xmin);
  }
});

test('graphique où l’on déplace un point : le glisser reste au point, la main active le déplacement', async ({ page }) => {
  await open(page, 'maths/complexes.html');
  const canvas = page.locator('canvas').first();
  await canvas.scrollIntoViewIfNeeded();
  const wrap = canvas.locator('xpath=..');
  const hand = wrap.locator('.plot-tool[aria-label="Se déplacer dans le repère"]');
  await expect(hand).toBeVisible();
  const v0 = await view(canvas);
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5, { steps: 4 });
  await page.mouse.up();
  expect(await view(canvas)).toEqual(v0);
  await hand.click();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4, { steps: 4 });
  await page.mouse.up();
  expect((await view(canvas)).xmin).toBeGreaterThan(v0.xmin);
});

test('chaque graphique avec axes propose les outils de navigation', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'vérification structurelle : une seule fois');
  for (const url of PAGES.slice(1)) {
    await open(page, url);
    const r = await page.evaluate(() => Array.from(document.querySelectorAll('canvas.plot')).filter((c) => c.coursePlot && c.coursePlot.navigable)
      .map((c) => !!(c.parentElement.classList.contains('plot-wrap') && c.parentElement.querySelector('.plot-tools'))));
    expect(r.every(Boolean), url).toBe(true);
  }
});
