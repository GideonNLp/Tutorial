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

    await page.getByRole('button', { name: 'Profil și setări', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
    await settled(page);
    const push = await samples();
    expect(push.length).toBeGreaterThan(5);
    expect(new Set(push.map((s) => s.moving))).toEqual(new Set(['push']));
    // About 300 ms from the first moving frame to the last.
    const duration = push.at(-1)!.t - push[0]!.t;
    expect(duration).toBeGreaterThan(200);
    expect(duration).toBeLessThan(600);
    // The new page comes from the right edge and never goes backwards.
    const incoming = track(push, 'profil');
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
    const leaving = track(pop, 'profil');
    expect(leaving.at(-1)!.x).toBeGreaterThan(width * 0.6);
    for (let i = 1; i < leaving.length; i++) expect(leaving[i]!.x).toBeGreaterThanOrEqual(leaving[i - 1]!.x);
    // A popped page is gone, not just hidden.
    await expect(page.locator('.page[data-route="profil"]')).toHaveCount(0);
  });

  test('tabs move instead of jumping: they fade as they slide', async ({ page }) => {
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

  test('tabs slide in from the side they lie on, and the old page drifts the other way', async ({ page }) => {
    await startEmpty(page);
    await withMotion(page);
    const width = page.viewportSize()!.width;
    const samples = await recordMotion(page);

    // Azi -> Calendar: to the right.
    await tab(page, 'Calendar');
    await settled(page);
    const right = await samples();
    const comingIn = track(right, 'calendar');
    expect(comingIn[0]!.x).toBeGreaterThan(width * 0.1); // starts to the right...
    expect(comingIn.at(-1)!.x).toBe(0); // ...and lands
    expect(comingIn.map((p) => p!.x)).toEqual([...comingIn.map((p) => p!.x)].sort((a, b) => b - a)); // never going back
    const leaving = track(right, 'azi');
    expect(leaving.some((p) => p!.x < -5)).toBe(true); // the old page moves left

    // Calendar -> Azi: the other way round.
    await tab(page, 'Azi');
    await settled(page);
    const left = await samples();
    expect(track(left, 'azi')[0]!.x).toBeLessThan(-width * 0.1);
    expect(track(left, 'calendar').some((p) => p!.x > 5)).toBe(true);
    await expect(page.locator('.page[data-route="azi"]')).toHaveCSS('transform', 'none');
  });

  test('a veil of frosted glass passes over the page while the tabs slide', async ({ page }) => {
    await startEmpty(page);
    await withMotion(page);
    const veil = () =>
      page.evaluate(() => {
        const stage = document.querySelector('.stage')!;
        const after = getComputedStyle(stage, '::after');
        return { content: after.content, blur: after.backdropFilter || (after as unknown as { webkitBackdropFilter: string }).webkitBackdropFilter };
      });
    expect((await veil()).content).not.toBe('"\"\""'); // nothing while the page is still
    await page.evaluate(() => {
      (window as unknown as { __veil: unknown[] }).__veil = [];
      const frame = () => {
        const stage = document.querySelector('.stage');
        if (stage?.hasAttribute('data-moving')) {
          const after = getComputedStyle(stage, '::after');
          (window as unknown as { __veil: unknown[] }).__veil.push({
            content: after.content,
            blur: after.backdropFilter,
            opacity: Number(after.opacity),
          });
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    await tab(page, 'Calendar');
    await settled(page);
    const frames = await page.evaluate(() => (window as unknown as { __veil: Array<{ content: string; blur: string; opacity: number }> }).__veil);
    expect(frames.length).toBeGreaterThan(3);
    expect(frames.every((f) => f.blur.includes('blur'))).toBe(true);
    expect(Math.max(...frames.map((f) => f.opacity))).toBeGreaterThan(0.5); // it clouds over in the middle
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
    await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
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
    const button = await bar.getByRole('button', { name: 'Profil și setări', exact: true }).boundingBox();
    const title = await page.getByRole('heading', { level: 1, name: 'Azi' }).boundingBox();
    expect(Math.abs(button!.y - title!.y)).toBeLessThan(8);

    await page.locator('.page[data-active]').evaluate((el) => el.scrollTo(0, 300));
    await expect(bar).toHaveAttribute('data-scrolled', '');
    await expect(bar).toHaveAttribute('data-collapsed', '');
    await expect(small).toHaveCSS('opacity', '1');
    await expect(small).toHaveText('Azi');
    // The buttons stay reachable at the top of the screen.
    expect((await bar.getByRole('button', { name: 'Profil și setări', exact: true }).boundingBox())!.y).toBeLessThan(24);

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
    const under = page.locator('.page[data-route="profil"]');
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
    await expect(page).toHaveURL(/#profil$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
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
    await expect(page.locator('.page[data-route="profil"]')).toBeHidden();
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
    await expect(page).toHaveURL(/#profil$/);
    await settled(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
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
    await expect(page.getByRole('heading', { level: 1, name: 'Profil' })).toBeVisible();
  });
});

test.describe('sheets', () => {
  const panelY = (page: Page) => page.locator('.sheet-panel').evaluate((el) => Math.round(new DOMMatrix(getComputedStyle(el).transform).m42));

  async function openReportSheet(page: Page) {
    await startWithJournal(page);
    await tab(page, 'Statistici');
    await withMotion(page);
    await page.getByRole('button', { name: 'Creează raportul PDF' }).click();
    const dialog = page.getByRole('dialog', { name: 'Raport pentru medic' });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  test('a sheet rises from the bottom edge and closes by sliding back down', async ({ page }) => {
    await startWithJournal(page);
    await tab(page, 'Statistici');
    await withMotion(page);
    // Watch the panel from the moment it exists.
    await page.evaluate(() => {
      const ys: number[] = [];
      (window as unknown as { __sheet: number[] }).__sheet = ys;
      const frame = () => {
        const panel = document.querySelector('dialog[open] .sheet-panel');
        if (panel) ys.push(Math.round(new DOMMatrix(getComputedStyle(panel).transform).m42));
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    const ys = () => page.evaluate(() => (window as unknown as { __sheet: number[] }).__sheet.splice(0));

    await page.getByRole('button', { name: 'Creează raportul PDF' }).click();
    const dialog = page.getByRole('dialog', { name: 'Raport pentru medic' });
    await expect(dialog).toBeVisible();
    await expect.poll(() => panelY(page)).toBe(0);
    const rising = await ys();
    expect(rising[0]).toBeGreaterThan(150); // starts below the edge…
    expect(rising.filter((y) => y > 0).length).toBeGreaterThan(4); // …and takes several frames to arrive
    // Its bottom edge is the bottom of the screen.
    const box = (await page.locator('.sheet-panel').boundingBox())!;
    expect(Math.round(box.y + box.height)).toBe(page.viewportSize()!.height);

    await dialog.getByRole('button', { name: 'Închide' }).click();
    await expect(dialog).toBeHidden();
    const falling = await ys();
    expect(Math.max(...falling)).toBeGreaterThan(150);
    expect(falling.filter((y) => y > 0).length).toBeGreaterThan(3);
  });

  test('dragging the sheet down past a third closes it; a short drag springs back', async ({ page }) => {
    const dialog = await openReportSheet(page);
    await expect.poll(() => panelY(page)).toBe(0);
    const head = (await page.locator('.sheet-head').boundingBox())!;
    const x = head.x + 150;
    const y = head.y + 24;

    // A short pull: the sheet follows, then returns.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 30, { steps: 3 });
    expect(await panelY(page)).toBe(30);
    await page.waitForTimeout(150); // rest, so it is not a flick
    await page.mouse.move(x, y + 31);
    await page.mouse.up();
    await expect.poll(() => panelY(page)).toBe(0);
    await expect(dialog).toBeVisible();

    // A long pull closes it.
    const height = (await page.locator('.sheet-panel').boundingBox())!.height;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + height * 0.5, { steps: 6 });
    expect(await panelY(page)).toBeGreaterThan(height * 0.4);
    await page.mouse.up();
    await expect(dialog).toBeHidden();
    // The page underneath is usable again.
    await expect(page.getByRole('button', { name: 'Creează raportul PDF' })).toBeEnabled();
  });

  test('Escape and a tap outside close the sheet', async ({ page }) => {
    const dialog = await openReportSheet(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Creează raportul PDF' })).toBeFocused();

    await page.getByRole('button', { name: 'Creează raportul PDF' }).click();
    await expect(dialog).toBeVisible();
    await expect.poll(() => panelY(page)).toBe(0);
    await page.mouse.click(195, 60); // on the dimmed page above the sheet
    await expect(dialog).toBeHidden();
  });

  test('leaving the page closes its sheet', async ({ page }) => {
    const dialog = await openReportSheet(page);
    await page.goBack(); // the system back button
    await expect(dialog).toBeHidden();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  });

  test.describe('by touch', () => {
    test.use({ hasTouch: true });

    test('pulling the content down drags the sheet when it is scrolled to the top', async ({ page }) => {
      const dialog = await openReportSheet(page);
      await expect.poll(() => panelY(page)).toBe(0);
      const body = (await page.locator('.sheet-body').boundingBox())!;
      const cdp = await page.context().newCDPSession(page);
      const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', y?: number) =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: y === undefined ? [] : [{ x: body.x + 40, y }] });
      const y0 = body.y + 20;
      await send('touchStart', y0);
      for (const dy of [12, 60, 140, 220]) await send('touchMove', y0 + dy);
      expect(await panelY(page)).toBeGreaterThan(150);
      await send('touchEnd');
      await expect(dialog).toBeHidden();
    });
  });

  test('on a wide screen the sheet is a centred dialog', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 800 });
    await openReportSheet(page);
    const panel = page.locator('.sheet-panel');
    await expect(panel).toHaveCSS('opacity', '1');
    const box = (await panel.boundingBox())!;
    expect(Math.abs(box.y + box.height / 2 - 400)).toBeLessThan(4);
    expect(Math.abs(box.x + box.width / 2 - 550)).toBeLessThan(4);
    await expect(page.locator('.sheet-grabber')).toBeHidden();
  });
});

test.describe('small movements', () => {
  test('a pressed button shrinks and springs back', async ({ page }) => {
    await startEmpty(page);
    await withMotion(page);
    const button = page.getByRole('button', { name: 'Deschide jurnalul', exact: true });
    const scale = () => button.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(button).toHaveAttribute('data-pressed', '');
    await expect.poll(scale).toBeCloseTo(0.97, 2);
    await page.mouse.move(box.x + box.width / 2, box.y - 200); // slide off: no click
    await page.mouse.up();
    await expect(button).not.toHaveAttribute('data-pressed', '');
    await expect.poll(scale).toBeCloseTo(1, 2);
    await expect(page.getByRole('heading', { level: 1, name: 'Azi' })).toBeVisible();
  });

  test('a new list of tips arrives one item after another', async ({ page }) => {
    await startWithJournal(page);
    await tab(page, 'Sfaturi');
    await withMotion(page);
    await page.getByRole('radio', { name: 'Somn' }).check();
    const delays = await page
      .locator('.tip-cards > li')
      .evaluateAll((items) => items.map((li) => li.getAnimations().map((a) => Number(a.effect?.getTiming().delay))[0]));
    expect(delays.length).toBeGreaterThan(1);
    expect(delays[0]).toBe(0);
    for (let i = 1; i < delays.length; i++) {
      const step = delays[i]! - delays[i - 1]!;
      expect(step).toBeGreaterThanOrEqual(50);
      expect(step).toBeLessThanOrEqual(80);
    }
  });

  test('glass: the tab bar and the scrolled header blur what is behind them', async ({ page }) => {
    await startWithJournal(page);
    const blur = (selector: string, pseudo?: string) =>
      page.evaluate(([sel, ps]) => getComputedStyle(document.querySelector(sel!)!, ps).backdropFilter, [selector, pseudo] as const);
    expect(await blur('.tabbar')).toContain('blur(20px)');
    expect(await blur('.page[data-active] .navbar', '::before')).toContain('blur(20px)');
    // Translucent, in the same colour as before.
    const tabbar = await page.evaluate(() => getComputedStyle(document.querySelector('.tabbar')!).backgroundColor);
    expect(tabbar).toMatch(/0\.8\)$|\/ 0\.8\)$/);

    // "Increase contrast" turns the glass back into solid surfaces.
    await page.emulateMedia({ contrast: 'more' });
    expect(await blur('.tabbar')).toBe('none');
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.tabbar')!).backgroundColor)).toBe('rgb(255, 255, 255)');
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
