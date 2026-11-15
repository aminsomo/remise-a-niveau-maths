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

test('brouillon : feuille noire plein écran, symboles, calculatrice, réponse', async ({ page }) => {
  await open(page, 'maths/suites.html');
  const drill = page.locator('#w-drill');
  await drill.locator('.drill-calc').click();
  const sheet = page.locator('.sheet');
  await expect(sheet).toBeVisible();
  const vp = page.viewportSize();
  const box = await sheet.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(vp.width - 1);
  expect(box.height).toBeGreaterThanOrEqual(vp.height - 2);
  const bg = await sheet.evaluate((n) => getComputedStyle(n).backgroundColor);
  expect(bg).toBe('rgb(11, 12, 14)');
  // la question en cours est rappelée en haut
  await expect(page.locator('.sheet-q')).toContainText(/Calcule|Calculer|calcule/);

  // symboles → feuille
  const text = page.locator('.sheet-text');
  const tabSym = page.locator('.sheet-tabs .tab').first();
  if (await tabSym.isVisible()) await tabSym.click();
  await page.locator('.sym[data-ins="π"]').click();
  await page.locator('.sym', { hasText: 'a/b' }).click();
  await expect(text).toHaveValue(/π\(\)\/\(\)/);

  // calculatrice : 12 × 3 + 2² = 40
  const tabCalc = page.locator('.sheet-tabs .tab').nth(1);
  if (await tabCalc.isVisible()) await tabCalc.click();
  const key = (label) => page.locator('.calc-keys .key').filter({ hasText: new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).first();
  for (const k of ['1', '2', '×', '3', '+', '2', 'x²']) await key(k).click();
  await expect(page.locator('.calc-result')).toHaveText('= 40');
  await key('=').click();
  await expect(page.locator('.calc-result')).toHaveClass(/is-done/);
  // erreur lisible
  await key('AC').click();
  for (const k of ['1', '÷', '0', '=']) await key(k).click();
  await expect(page.locator('.calc-result')).toHaveText(/zéro/);
  // degrés
  await key('AC').click();
  await page.locator('.calc-flag', { hasText: /RAD|DEG/ }).click();
  await expect(page.locator('.calc-flag').first()).toHaveText('DEG');
  for (const k of ['cos', '6', '0', ')', '=']) await key(k).click();
  await expect(page.locator('.calc-result')).toHaveText('= 0,5');

  // utiliser comme réponse → remplit le champ et ferme
  await page.locator('.calc-use').click();
  await expect(sheet).toBeHidden();
  await expect(drill.locator('input')).toHaveValue('0,5');
  expect(await page.evaluate(() => document.documentElement.classList.contains('fs-lock'))).toBe(false);

  // la feuille est conservée après rechargement
  await page.reload();
  await page.waitForFunction(() => window.Course);
  await page.locator('#w-drill .drill-calc').click();
  await expect(page.locator('.sheet-text')).toHaveValue(/π\(\)\/\(\)/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.sheet')).toBeHidden();
});

test('brouillon : écriture au stylo et effacement annulable', async ({ page }) => {
  await open(page, 'maths/suites.html');
  await page.locator('#w-drill .drill-calc').click();
  await page.locator('.seg-btn[data-mode="pen"]').click();
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

test('graphique lisible : texte des graduations d’au moins 12 px', async ({ page }) => {
  await open(page, 'maths/suites.html');
  // on relit la police réellement utilisée par le canevas lors du dernier dessin
  const size = await page.evaluate(() => {
    const c = document.querySelector('#w-suite canvas');
    return parseFloat(c.getContext('2d').font.match(/(\d+(\.\d+)?)px/)[1]);
  });
  expect(size).toBeGreaterThanOrEqual(12);
});
