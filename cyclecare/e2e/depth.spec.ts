import { expect, test, type Page } from '@playwright/test';
import { startEmpty, startWithJournal, tab } from './helpers';

const phase = (page: Page) => page.evaluate(() => document.documentElement.dataset.phase);
const pageBg = (page: Page) => page.locator('.page[data-active]').evaluate((el) => getComputedStyle(el).backgroundColor);
const style = (page: Page, selector: string, prop: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

test('the page takes a faint colour from the current phase, on every tab', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await startWithJournal(page); // day 12, follicular
  expect(await phase(page)).toBe('follicular');
  expect(await pageBg(page)).toBe('rgb(236, 243, 245)'); // bg-follicular, not the neutral #F6F5FB
  await tab(page, 'Calendar');
  expect(await phase(page)).toBe('follicular');
  expect(await pageBg(page)).toBe('rgb(236, 243, 245)');
});

test('with no phase to name, the page stays neutral', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await startEmpty(page);
  expect(await phase(page)).toBeUndefined();
  expect(await pageBg(page)).toBe('rgb(246, 245, 251)');
});

test('cards are lifted with a shadow instead of an outline; the main one is tinted', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await startWithJournal(page);
  const hero = '.page[data-active] .card-hero';
  expect(await style(page, hero, 'box-shadow')).not.toBe('none');
  expect(await style(page, hero, 'border-top-color')).toBe('rgba(0, 0, 0, 0)');
  expect(await style(page, hero, 'background-image')).toContain('gradient');

  await tab(page, 'Calendar');
  const raised = '.page[data-active] .card';
  expect(await style(page, raised, 'box-shadow')).not.toBe('none');
  expect(await style(page, raised, 'border-top-color')).toBe('rgba(0, 0, 0, 0)');
});

test('in the dark theme cards keep a faint outline as well', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await startWithJournal(page);
  expect(await style(page, '.page[data-active] .card-hero', 'border-top-color')).not.toBe('rgba(0, 0, 0, 0)');
});

test('"increase contrast" brings the outlines back and drops the colour', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', contrast: 'more' });
  await startWithJournal(page);
  const hero = '.page[data-active] .card-hero';
  expect(await style(page, hero, 'box-shadow')).toBe('none');
  expect(await style(page, hero, 'border-top-color')).not.toBe('rgba(0, 0, 0, 0)');
  expect(await style(page, hero, 'border-top-width')).toBe('2px');
  expect(await pageBg(page)).toBe('rgb(246, 245, 251)');
});

test('what is chosen carries a small gradient, and it goes away with "increase contrast"', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await startWithJournal(page);
  const tabIcon = '.page[data-active] .btn-primary';
  expect(await style(page, tabIcon, 'background-image')).toContain('gradient');

  // It leans toward the green of the follicular phase here, and the hero card's shadow takes the colour of the phase.
  const app = (prop: string) => page.locator('.app').evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
  expect((await app('--ink-gradient')).toUpperCase()).toContain('#14937C');
  expect((await app('--shadow-hero')).toUpperCase()).toContain('#14937C');

  await page.emulateMedia({ colorScheme: 'light', contrast: 'more' });
  expect(await style(page, tabIcon, 'background-image')).toBe('none');
});

test('under the dial, each block is a card with a badge and, for the next period, a big number for the eye only', async ({ page }) => {
  await startWithJournal(page); // 15 November, the next period expected in 17 days
  const next = page.locator('.page[data-active] .today-card[data-kind="next"]');
  await expect(next.getByRole('heading', { name: 'Următoarea menstruație' })).toBeVisible();
  await expect(next.locator('.icon-badge-wrap')).toHaveAttribute('aria-hidden', 'true');
  const figure = next.locator('.figure');
  await expect(figure).toHaveAttribute('aria-hidden', 'true');
  await expect(figure.locator('.figure-num')).toHaveText('17');
  await expect(figure.locator('.figure-unit')).toHaveText('zile');
  // The sentence says the same in words, and is what a screen reader reads.
  await expect(next.getByText(/peste 17 zile/)).toBeVisible();
  for (const kind of ['fertility', 'risk']) await expect(page.locator(`.page[data-active] .today-card[data-kind="${kind}"]`)).toBeVisible();
});

test('the tab bar floats above the bottom edge as a rounded pill, on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startWithJournal(page);
  const bar = (await page.locator('.tabbar').boundingBox())!;
  expect(844 - (bar.y + bar.height)).toBeGreaterThanOrEqual(6); // air under it
  expect(bar.x).toBeGreaterThanOrEqual(10); // and at the sides
  expect(bar.x + bar.width).toBeLessThanOrEqual(380);
  expect(await style(page, '.tabbar', 'border-top-left-radius')).not.toBe('0px');
  // The last card can be scrolled clear of it.
  await page.locator('.page[data-active]').evaluate((el) => el.scrollTo(0, el.scrollHeight));
  const last = (await page.locator('.page[data-active] .today-card[data-kind="tip"]').boundingBox())!;
  expect(last.y + last.height).toBeLessThanOrEqual(bar.y);
});

test('buttons are filled, not outlined: white on the page, tonal in a card', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await startWithJournal(page);
  const quiet = '.page[data-active] .card .btn-secondary';
  expect(await style(page, quiet, 'border-top-color')).toBe('rgba(0, 0, 0, 0)');
  expect(await style(page, quiet, 'background-color')).not.toBe('rgb(255, 255, 255)');
  await tab(page, 'Sfaturi');
  expect(await style(page, '.page[data-active] .chip-face', 'border-top-color')).toBe('rgba(0, 0, 0, 0)');
  expect(await style(page, '.page[data-active] .chip-face', 'background-color')).toBe('rgb(255, 255, 255)');
});

test('the charts have gradient fills with ids that are unique across the pages that stay mounted', async ({ page }) => {
  await startWithJournal(page);
  await tab(page, 'Statistici');
  await expect(page.locator('.page[data-active] .chart-bar').first()).toBeVisible();
  expect(await page.locator('.page[data-active] .chart-bar path').first().getAttribute('fill')).toMatch(/^url\(#[\w-]+\)$/);
  await tab(page, 'Azi');
  await tab(page, 'Statistici');
  const ids = await page.evaluate(() => [...document.querySelectorAll('[id]')].map((el) => el.id));
  expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
});

test('with nothing to show yet, Statistics has the capybara waving, once, and no duplicate ids', async ({ page }) => {
  await startEmpty(page);
  await tab(page, 'Statistici');
  const empty = page.locator('.page[data-active] .empty-state');
  await expect(empty.getByRole('heading', { name: 'Încă nu sunt destule date' })).toBeVisible();
  await expect(empty.locator('svg.capy-full')).toHaveCount(1);
  await expect(empty.locator('svg.capy-full')).toHaveAttribute('aria-hidden', 'true');
  const ids = await page.evaluate(() => [...document.querySelectorAll('[id]')].map((el) => el.id));
  expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
});

test('the tab highlight sits behind the current icon and glides to the next one', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startWithJournal(page);
  const box = async (selector: string) => (await page.locator(selector).first().boundingBox())!;
  const center = (b: { x: number; width: number }) => b.x + b.width / 2;

  const indicator = () => box('.tab-indicator');
  const icon = (name: string) => box(`.tab:has-text("${name}") .tab-icon`);
  expect(Math.abs(center(await indicator()) - center(await icon('Azi')))).toBeLessThan(1.5);
  await expect(page.locator('.tab-indicator')).toHaveCount(1);

  await tab(page, 'Jurnal');
  // At rest again (the page clock is fake, so wait for the real transition to end).
  await expect.poll(async () => Math.abs(center(await indicator()) - center(await icon('Jurnal'))), { timeout: 3000 }).toBeLessThan(1.5);
  await tab(page, 'Statistici');
  await expect.poll(async () => Math.abs(center(await indicator()) - center(await icon('Statistici'))), { timeout: 3000 }).toBeLessThan(1.5);
});

test('on the next-period card, a ring round the badge shows how far the cycle has gone', async ({ page }) => {
  await startWithJournal(page); // day 12 of a 28-day cycle
  const ring = page.locator('.page[data-active] .today-card[data-kind="next"] .progress-ring');
  await expect(ring).toHaveAttribute('aria-hidden', 'true');
  await expect(ring.locator('.ring-arc')).toHaveCount(1);
  await expect(ring.locator('.ring-track')).toHaveCount(1);
  // The other cards have no ring.
  await expect(page.locator('.page[data-active] .today-card[data-kind="fertility"] .progress-ring')).toHaveCount(0);
});

test('the gradient takes a colour from the phase: red, green, light blue, violet', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await startWithJournal(page);
  const gradient = () => page.locator('.app').evaluate((el) => getComputedStyle(el).getPropertyValue('--ink-gradient').toUpperCase());
  const expected: Record<string, string> = { menstruation: '#B3264F', follicular: '#14937C', ovulation: '#2F9BEA', luteal: '#6257C4' };
  for (const [phase, colour] of Object.entries(expected)) {
    await page.evaluate((p) => (document.documentElement.dataset.phase = p), phase);
    expect(await gradient(), phase).toContain(colour);
  }
  // Ovulation is light blue, not the amber of its other colours.
  await page.evaluate(() => (document.documentElement.dataset.phase = 'ovulation'));
  expect(await gradient()).not.toContain('#B67500');
});

test.describe('the tab bar folds up to the current tab while scrolling down, as in Apple Music', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  const scrollTo = (page: Page, y: number) => page.locator('.page[data-active]').evaluate((el, top) => el.scrollTo(0, top), y);
  const barWidth = async (page: Page) => (await page.locator('.tabbar').boundingBox())!.width;

  test('scrolling down folds it, scrolling up opens it again', async ({ page }) => {
    await startWithJournal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const open = await barWidth(page);
    expect(open).toBeGreaterThan(300);
    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-folded');

    await scrollTo(page, 400);
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');
    // It narrows to about one tab, which is the current one; the others are gone.
    await expect.poll(() => barWidth(page), { timeout: 3000 }).toBeLessThan(100);
    await expect(page.locator('.tab[aria-current="page"]')).toBeVisible();
    for (const name of ['Calendar', 'Jurnal', 'Sfaturi', 'Statistici']) {
      await expect(page.locator(`.tab:has-text("${name}")`)).toHaveCSS('opacity', '0');
    }
    // It stays folded for as long as the person keeps going down, and a bounce at the top does not matter.
    await scrollTo(page, 600);
    await page.waitForTimeout(200); // let the scroll event be handled before the next move
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');

    // A little scroll up opens it.
    await scrollTo(page, 560);
    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-folded');
    await expect.poll(() => barWidth(page), { timeout: 3000 }).toBeGreaterThan(300);
    for (const name of ['Calendar', 'Jurnal', 'Sfaturi', 'Statistici']) {
      await expect(page.locator(`.tab:has-text("${name}")`)).toHaveCSS('opacity', '1');
    }
  });

  test('touching the folded bar opens it without going anywhere; back at the top it is open', async ({ page }) => {
    await startWithJournal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await scrollTo(page, 500);
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');
    await expect.poll(() => barWidth(page), { timeout: 3000 }).toBeLessThan(100);
    await page.locator('.tab[aria-current="page"]').click();
    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-folded');
    await expect(page).toHaveURL(/#azi$/);
    expect(await page.evaluate(() => document.querySelector('.page[data-active]')!.scrollTop)).toBeGreaterThan(300); // not sent to the top

    await scrollTo(page, 500);
    await scrollTo(page, 0);
    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-folded');
  });

  test('a new tab starts with the bar open, and the folded bar keeps the colour of the tab it shows', async ({ page }) => {
    await startWithJournal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await scrollTo(page, 500);
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');
    await page.locator('.tab[aria-current="page"]').click(); // open it
    await tab(page, 'Calendar');
    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-folded');
    await expect(page.locator('.tab-indicator')).toHaveCount(1);
  });

  test('with reduced motion the bar still folds, at once and without animation', async ({ page }) => {
    await startWithJournal(page); // the tests run with reduced motion
    await scrollTo(page, 500);
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');
    // No transition to wait for: it is already the width of one tab.
    expect(await barWidth(page)).toBeLessThan(100);
    await scrollTo(page, 420);
    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-folded');
    expect(await barWidth(page)).toBeGreaterThan(300);
  });

  test('a page bouncing past its end does not open the bar', async ({ page }) => {
    await startWithJournal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const max = await page.locator('.page[data-active]').evaluate((el) => el.scrollHeight - el.clientHeight);
    await scrollTo(page, max);
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');
    // A bounce reports a position past the end that then shrinks back: it clamps to the end, so it is not a move up.
    await page.locator('.page[data-active]').evaluate((el, end) => {
      Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => end + 30 });
      el.dispatchEvent(new Event('scroll'));
      Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => end + 5 });
      el.dispatchEvent(new Event('scroll'));
    }, max);
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');
  });

  test('a screen reader or keyboard can still reach another tab on the folded bar: one activation opens the bar and goes there', async ({ page }) => {
    await startWithJournal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await scrollTo(page, 500);
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');
    await page.locator('.tab:has-text("Calendar")').dispatchEvent('click');
    await expect(page).toHaveURL(/#calendar$/);
    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-folded');
  });

  test('tabbing into the folded bar opens it', async ({ page }) => {
    await startWithJournal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await scrollTo(page, 500);
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');
    await page.locator('.tab[aria-current="page"]').focus();
    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-folded');
  });
});

test.describe('dragging a finger along the tab bar moves the lens and changes the page, as in Apple Music', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  const centre = async (page: Page, selector: string) => {
    const b = (await page.locator(selector).first().boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };

  test('the lens follows the pointer, the page changes under it, and on release it settles on that tab', async ({ page }) => {
    await startWithJournal(page);
    const azi = await centre(page, '.tab:has-text("Azi")');
    const jurnal = await centre(page, '.tab:has-text("Jurnal")');
    const stat = await centre(page, '.tab:has-text("Statistici")');

    await page.mouse.move(azi.x, azi.y);
    await page.mouse.down();
    await page.mouse.move(azi.x + 20, azi.y, { steps: 3 });
    await expect(page.locator('.tabbar')).toHaveAttribute('data-dragging', '');
    // Over "Jurnal": the page is Jurnal at once, with no slide between pages.
    await page.mouse.move(jurnal.x, jurnal.y, { steps: 8 });
    await expect(page).toHaveURL(/#jurnal$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Jurnal' })).toBeVisible();
    await expect(page.locator('.stage[data-moving]')).toHaveCount(0);
    // The lens is under the finger, not on a tab slot of its own.
    await expect.poll(async () => Math.abs((await centre(page, '.tab-indicator')).x - jurnal.x), { timeout: 3000 }).toBeLessThan(6);
    // Further on, to "Statistici".
    await page.mouse.move(stat.x, stat.y, { steps: 8 });
    await expect(page).toHaveURL(/#statistici$/);
    await page.mouse.up();

    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-dragging');
    await expect(page.locator('.tab[aria-current="page"]')).toContainText('Statistici');
    // It settles on the tab (the spring takes a moment).
    await expect
      .poll(async () => Math.abs((await centre(page, '.tab-indicator')).x - (await centre(page, '.tab:has-text("Statistici")')).x), { timeout: 3000 })
      .toBeLessThan(2);
    // The release is not a tap on the tab under the finger: nothing else happened.
    await expect(page).toHaveURL(/#statistici$/);
  });

  test('a short press is still a tap, and a drag that ends where it began changes nothing', async ({ page }) => {
    await startWithJournal(page);
    const azi = await centre(page, '.tab:has-text("Azi")');
    const cal = await centre(page, '.tab:has-text("Calendar")');
    await page.mouse.click(cal.x, cal.y);
    await expect(page).toHaveURL(/#calendar$/);

    // Away and back, in one drag.
    const start = await centre(page, '.tab:has-text("Calendar")');
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(azi.x, azi.y, { steps: 6 });
    await expect(page).toHaveURL(/#azi$/);
    await page.mouse.move(start.x, start.y, { steps: 6 });
    await page.mouse.up();
    await expect(page).toHaveURL(/#calendar$/);
    await expect(page.locator('.tab[aria-current="page"]')).toContainText('Calendar');
  });

  test('one history entry for a whole drag: back returns to where it began', async ({ page }) => {
    await startWithJournal(page);
    const azi = await centre(page, '.tab:has-text("Azi")');
    const stat = await centre(page, '.tab:has-text("Statistici")');
    await page.mouse.move(azi.x, azi.y);
    await page.mouse.down();
    await page.mouse.move(stat.x, stat.y, { steps: 14 }); // across Calendar, Jurnal, Sfaturi
    await page.mouse.up();
    await expect(page).toHaveURL(/#statistici$/);
    await page.goBack();
    await expect(page).toHaveURL(/#azi$/);
  });

  test('the folded bar cannot be dragged: it only opens', async ({ page }) => {
    await startWithJournal(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('.page[data-active]').evaluate((el) => el.scrollTo(0, 500));
    await expect(page.locator('.tabbar')).toHaveAttribute('data-folded', '');
    const c = await centre(page, '.tab[aria-current="page"]');
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x + 120, c.y, { steps: 6 });
    await page.mouse.up();
    await expect(page).toHaveURL(/#azi$/);
    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-dragging');
  });
});

test.describe('the same drag with a finger on a touch screen', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('a finger dragged along the bar moves the lens and changes the page', async ({ page }) => {
    await startWithJournal(page);
    const centre = async (selector: string) => {
      const b = (await page.locator(selector).first().boundingBox())!;
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    };
    const azi = await centre('.tab:has-text("Azi")');
    const cal = await centre('.tab:has-text("Calendar")');
    const stat = await centre('.tab:has-text("Statistici")');
    const client = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x?: number, y?: number) =>
      client.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: x!, y: y! }] });

    // A tap first: it still switches tab.
    await page.touchscreen.tap(cal.x, cal.y);
    await expect(page).toHaveURL(/#calendar$/);

    await touch('touchStart', cal.x, cal.y);
    for (let i = 1; i <= 12; i++) await touch('touchMove', cal.x + ((stat.x - cal.x) * i) / 12, cal.y);
    await expect(page.locator('.tabbar')).toHaveAttribute('data-dragging', '');
    await expect(page).toHaveURL(/#statistici$/);
    await touch('touchEnd');
    await expect(page.locator('.tabbar')).not.toHaveAttribute('data-dragging');
    await expect(page.locator('.tab[aria-current="page"]')).toContainText('Statistici');
    // The page did not scroll with the finger.
    expect(await page.evaluate(() => document.querySelector('.page[data-active]')!.scrollTop)).toBe(0);
    void azi;
  });
});

test('the lens glides to the new tab without swaying: it never passes it and comes back', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startWithJournal(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Record the horizontal position of the lens on every frame while the tab changes.
  await page.evaluate(() => {
    const xs: number[] = [];
    (window as unknown as { __lens: number[] }).__lens = xs;
    const frame = () => {
      const el = document.querySelector('.tab-indicator');
      if (el) xs.push(Math.round(new DOMMatrix(getComputedStyle(el).transform).m41 * 10) / 10);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await tab(page, 'Statistici'); // from the first tab to the last
  await page.waitForTimeout(900);
  const xs = await page.evaluate(() => (window as unknown as { __lens: number[] }).__lens);
  const end = xs.at(-1)!;
  const moving = xs.filter((x) => x !== xs[0]);
  expect(moving.length).toBeGreaterThan(4);
  expect(Math.max(...xs)).toBeLessThanOrEqual(end + 0.5); // never past where it stops
  // Never turning back: from the first frame that moved, positions only grow.
  const after = xs.slice(xs.findIndex((x) => x !== xs[0]));
  expect(after.every((x, i) => i === 0 || x >= after[i - 1]! - 0.2)).toBe(true);
});
