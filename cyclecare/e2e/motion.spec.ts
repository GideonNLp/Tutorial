import { expect, test, type Page } from '@playwright/test';
import { openApp, openSettings, startEmpty, startWithJournal, tab } from './helpers';

/** What moved, sampled on every frame while a transition is running. */
interface Sample {
  t: number;
  moving: string;
  pages: Array<{ id: string; x: number; opacity: number; active: boolean }>;
}

/** Starts recording page positions; returns a function that hands back the samples so far. */
async function recordMotion(page: Page): Promise<() => Promise<Sample[]>> {
  await page.evaluate(() => {
    const samples: unknown[] = [];
    (window as unknown as { __motion: unknown[] }).__motion = samples;
    const frame = () => {
      for (const stage of document.querySelectorAll('.stage')) {
        const moving = stage.getAttribute('data-moving');
        if (!moving) continue;
        const pages = [...stage.querySelectorAll<HTMLElement>(':scope > .page')]
          .filter((p) => getComputedStyle(p).display !== 'none')
          .map((p) => ({
            id: p.dataset.route ?? p.dataset.step ?? '',
            x: Math.round(new DOMMatrix(getComputedStyle(p).transform).m41),
            opacity: Number(getComputedStyle(p).opacity),
            active: p.hasAttribute('data-active'),
          }));
        samples.push({ t: Date.now(), moving, pages });
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  return () => page.evaluate(() => (window as unknown as { __motion: Sample[] }).__motion.splice(0));
}

const settled = (page: Page) => expect(page.locator('.stage[data-moving]')).toHaveCount(0);
const track = (samples: Sample[], id: string) => samples.map((s) => s.pages.find((p) => p.id === id)).filter((p) => p !== undefined);
const scrollTop = (page: Page) => page.locator('.page[data-active]').evaluate((el) => el.scrollTop);

/** Setup runs with reduced motion (the suite's default); the part under test turns motion on. */
const withMotion = (page: Page) => page.emulateMedia({ reducedMotion: 'no-preference' });

test.describe('with motion', () => {
  test('opening Settings pushes the new page in from the right; back pops it out', async ({ page }) => {
    await startEmpty(page);
    await withMotion(page);
    const samples = await recordMotion(page);
    const width = page.viewportSize()!.width;

    await page.getByRole('button', { name: 'Setări', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Setări' })).toBeVisible();
    await settled(page);
    const push = await samples();
    expect(push.length).toBeGreaterThan(5);
    expect(new Set(push.map((s) => s.moving))).toEqual(new Set(['push']));
    // About 300 ms from the first moving frame to the last.
    const duration = push.at(-1)!.t - push[0]!.t;
    expect(duration).toBeGreaterThan(200);
    expect(duration).toBeLessThan(600);
    // The new page comes from the right edge and never goes backwards.
    const incoming = track(push, 'setari');
    expect(incoming[0]!.x).toBeGreaterThan(width * 0.5);
    expect(incoming.at(-1)!.x).toBeLessThan(width * 0.1);
    for (let i = 1; i < incoming.length; i++) expect(incoming[i]!.x).toBeLessThanOrEqual(incoming[i - 1]!.x);
    // The old page shifts a little to the left and fades, without leaving the screen.
    const outgoing = track(push, 'azi');
    expect(Math.min(...outgoing.map((p) => p.x))).toBeLessThan(-width * 0.15);
    expect(Math.min(...outgoing.map((p) => p.x))).toBeGreaterThan(-width * 0.4);
    expect(Math.min(...outgoing.map((p) => p.opacity))).toBeLessThan(0.7);
    // Afterwards only the new page is shown; the old one is kept, hidden.
    await expect(page.locator('.page[data-route="azi"]')).toBeHidden();

    await page.getByRole('button', { name: 'Înapoi' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Azi' })).toBeVisible();
    await settled(page);
    const pop = await samples();
    expect(new Set(pop.map((s) => s.moving))).toEqual(new Set(['pop']));
    const leaving = track(pop, 'setari');
    expect(leaving.at(-1)!.x).toBeGreaterThan(width * 0.6);
    for (let i = 1; i < leaving.length; i++) expect(leaving[i]!.x).toBeGreaterThanOrEqual(leaving[i - 1]!.x);
    // A popped page is gone, not just hidden.
    await expect(page.locator('.page[data-route="setari"]')).toHaveCount(0);
  });

  test('tabs cross-fade instead of jumping', async ({ page }) => {
    await startEmpty(page);
    await withMotion(page);
    const samples = await recordMotion(page);
    await tab(page, 'Calendar');
    await settled(page);
    const fade = await samples();
    expect(fade.length).toBeGreaterThan(3);
    expect(new Set(fade.map((s) => s.moving))).toEqual(new Set(['fade']));
    const incoming = track(fade, 'calendar');
    expect(incoming[0]!.opacity).toBeLessThan(0.6);
    await expect(page.locator('.page[data-route="calendar"]')).toHaveCSS('opacity', '1');
  });

  test('first-run steps move like the rest of the app', async ({ page }) => {
    await openApp(page);
    await withMotion(page);
    const samples = await recordMotion(page);
    await page.getByRole('button', { name: 'Începe' }).click();
    await expect(page.getByRole('heading', { name: 'Datele tale rămân la tine' })).toBeVisible();
    await settled(page);
    const forward = await samples();
    expect(new Set(forward.map((s) => s.moving))).toEqual(new Set(['push']));
    expect(track(forward, 'consent')[0]!.x).toBeGreaterThan(100);
    await expect(page.locator('.page')).toHaveCount(1);

    await page.getByRole('button', { name: 'Înapoi' }).click();
    await expect(page.getByRole('button', { name: 'Începe' })).toBeVisible();
    await settled(page);
    expect(new Set((await samples()).map((s) => s.moving))).toEqual(new Set(['pop']));
  });

  test('scroll position and filters survive tab changes and push / pop', async ({ page }) => {
    await startWithJournal(page);
    await withMotion(page);
    await tab(page, 'Sfaturi');
    await page.getByRole('radio', { name: 'Somn' }).check();
    await page.getByRole('radio', { name: /Faza luteală/ }).check();
    await page.locator('.page[data-active]').evaluate((el) => el.scrollTo(0, 420));
    expect(await scrollTop(page)).toBe(420);

    // Another tab and back.
    await tab(page, 'Statistici');
    await settled(page);
    expect(await scrollTop(page)).toBe(0);
    await page.getByRole('navigation', { name: 'Navigare principală' }).getByRole('link', { name: 'Sfaturi', exact: true }).click();
    await settled(page);
    await expect(page.locator('.page[data-active]')).toHaveAttribute('data-route', 'sfaturi');
    expect(await scrollTop(page)).toBe(420);
    await expect(page.getByRole('radio', { name: 'Somn' })).toBeChecked();
    await expect(page.getByRole('radio', { name: /Faza luteală/ })).toBeChecked();

    // Two levels into Settings and back out.
    await openSettings(page, 'Memento-uri');
    await settled(page);
    await page.getByRole('button', { name: 'Înapoi' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Setări' })).toBeVisible();
    await settled(page);
    await page.getByRole('button', { name: 'Înapoi' }).click();
    await settled(page);
    await expect(page.locator('.page[data-active]')).toHaveAttribute('data-route', 'sfaturi');
    expect(await scrollTop(page)).toBe(420);
    await expect(page.getByRole('radio', { name: 'Somn' })).toBeChecked();
  });

  test('the header turns into a compact bar with the title once the page scrolls', async ({ page }) => {
    await startWithJournal(page);
    await withMotion(page);
    const bar = page.locator('.page[data-active] .navbar');
    const small = bar.locator('.navbar-title');
    await expect(bar).not.toHaveAttribute('data-scrolled', '');
    await expect(small).toHaveCSS('opacity', '0');
    // At rest the settings button sits in the title row.
    const button = await bar.getByRole('button', { name: 'Setări', exact: true }).boundingBox();
    const title = await page.getByRole('heading', { level: 1, name: 'Azi' }).boundingBox();
    expect(Math.abs(button!.y - title!.y)).toBeLessThan(8);

    await page.locator('.page[data-active]').evaluate((el) => el.scrollTo(0, 300));
    await expect(bar).toHaveAttribute('data-scrolled', '');
    await expect(bar).toHaveAttribute('data-collapsed', '');
    await expect(small).toHaveCSS('opacity', '1');
    await expect(small).toHaveText('Azi');
    // The buttons stay reachable at the top of the screen.
    expect((await bar.getByRole('button', { name: 'Setări', exact: true }).boundingBox())!.y).toBeLessThan(24);

    // Tapping the bar returns to the top, like tapping the status bar.
    await small.locator('..').click({ position: { x: 60, y: 30 } });
    await expect.poll(() => scrollTop(page)).toBe(0);
    await expect(bar).not.toHaveAttribute('data-scrolled', '');
  });
});

test.describe('swipe back', () => {
  test.use({ hasTouch: true });

  async function touch(page: Page) {
    const cdp = await page.context().newCDPSession(page);
    const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', x?: number, y = 420) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: x === undefined ? [] : [{ x, y }] });
    return {
      start: (x: number) => send('touchStart', x),
      move: (x: number) => send('touchMove', x),
      end: () => send('touchEnd'),
    };
  }

  test('dragging from the left edge reveals the page underneath and completes past a third', async ({ page }) => {
    await startEmpty(page);
    await openSettings(page, 'Ciclul meu');
    await withMotion(page);
    const finger = await touch(page);
    const current = page.locator('.page[data-route="setari-ciclu"]');
    const under = page.locator('.page[data-route="setari"]');
    const x = (locator: typeof current) => locator.evaluate((el) => Math.round(new DOMMatrix(getComputedStyle(el).transform).m41));

    await finger.start(6);
    for (const to of [30, 80, 140, 200]) await finger.move(to);
    // The page follows the finger; the one underneath is visible, shifted and dimmed.
    await expect(page.locator('.stage')).toHaveAttribute('data-moving', 'drag');
    expect(await x(current)).toBe(194);
    await expect(under).toBeVisible();
    expect(await x(under)).toBeLessThan(0);
    expect(Number(await under.evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(1);
    // Nothing has been navigated yet.
    await expect(page).toHaveURL(/#setari-ciclu$/);

    await finger.end();
    await expect(page).toHaveURL(/#setari$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Setări' })).toBeVisible();
    await settled(page);
    await expect(current).toHaveCount(0);
    expect(await x(under)).toBe(0);
    await expect(under).toHaveCSS('opacity', '1');
  });

  test('a short drag springs back and stays on the page', async ({ page }) => {
    await startEmpty(page);
    await openSettings(page, 'Ciclul meu');
    await withMotion(page);
    const finger = await touch(page);
    await finger.start(6);
    for (const to of [30, 60, 70]) await finger.move(to);
    await page.waitForTimeout(120); // the finger rests: no flick
    await finger.move(70);
    await finger.end();
    await settled(page);
    await expect(page).toHaveURL(/#setari-ciclu$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Ciclul meu' })).toBeVisible();
    await expect(page.locator('.page[data-route="setari"]')).toBeHidden();
    await expect(page.locator('.page[data-route="setari-ciclu"]')).toHaveCSS('transform', 'none');
  });

  test('a quick flick completes even when it is short', async ({ page }) => {
    await startEmpty(page);
    await openSettings(page, 'Ciclul meu');
    await withMotion(page);
    const finger = await touch(page);
    await finger.start(6);
    for (const to of [25, 45, 70]) await finger.move(to);
    await finger.end();
    await expect(page).toHaveURL(/#setari$/);
    await settled(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Setări' })).toBeVisible();
  });

  test('a drag that starts away from the edge, or on a tab, does nothing', async ({ page }) => {
    await startEmpty(page);
    await withMotion(page);
    const finger = await touch(page);
    // On a tab there is nothing to go back to.
    await finger.start(6);
    for (const to of [60, 160, 260]) await finger.move(to);
    await expect(page.locator('.stage[data-moving]')).toHaveCount(0);
    await finger.end();
    await expect(page).toHaveURL(/#azi$|\/$/);

    await openSettings(page);
    await settled(page);
    await finger.start(120);
    for (const to of [180, 260, 330]) await finger.move(to);
    await expect(page.locator('.stage[data-moving]')).toHaveCount(0);
    await finger.end();
    await expect(page.getByRole('heading', { level: 1, name: 'Setări' })).toBeVisible();
  });
});

test('with reduced motion pages change at once', async ({ page }) => {
  await startEmpty(page);
  const samples = await recordMotion(page);
  await openSettings(page, 'Ciclul meu');
  await page.getByRole('button', { name: 'Înapoi' }).click();
  await tab(page, 'Calendar');
  expect(await samples()).toEqual([]);
});
