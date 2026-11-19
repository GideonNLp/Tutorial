import { TAB_ROUTES, type Route, type TransitionKind } from '../app/router';

/**
 * Motion vocabulary, in one place.
 *
 * Page changes run on the Web Animations API (compositor-friendly transforms and opacity),
 * so they can be started, reversed and finished from code — which the swipe-back gesture needs.
 * Everything here does nothing when the person asked the system for reduced motion.
 */

/** The curve iOS uses for navigation: quick start, long soft landing. */
export const EASE_NAV = 'cubic-bezier(0.32, 0.72, 0, 1)';
export const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** A lightly damped spring for things that bounce back (a sheet let go, a released press). */
const SPRING =
  'linear(0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%, 1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%, 1.051 39.6%, 1.017 43.1%, 0.991, 0.977 51%, 0.974 53.8%, 0.975 57.1%, 0.997 69.8%, 1.003 76.9%, 1.004 83.8%, 1)';
function supportsLinearEasing(): boolean {
  try {
    return typeof CSS !== 'undefined' && CSS.supports('transition-timing-function', 'linear(0, 1)');
  } catch {
    return false;
  }
}
export const EASE_SPRING = supportsLinearEasing() ? SPRING : 'cubic-bezier(0.34, 1.56, 0.64, 1)';
export const NAV_MS = 320;
/** Changing tab: the new page comes in from this share of its width, and the old one leaves by 60% of it. */
export const TAB_SLIDE = 0.42;

/** Which way a tab change goes: 1 when the new tab lies to the right of the old one, -1 to the left, 0 when it is not a move between tabs. */
export function tabDirection(from: Route | undefined, to: Route | undefined): -1 | 0 | 1 {
  const a = (TAB_ROUTES as readonly Route[]).indexOf(from as Route);
  const b = (TAB_ROUTES as readonly Route[]).indexOf(to as Route);
  return a < 0 || b < 0 || a === b ? 0 : b > a ? 1 : -1;
}
export const FADE_MS = 240;
/** Blocks of a screen arrive this far apart: 50–80 ms reads as "one after another", not as a wave. */
export const STAGGER_STEP = 60;
/** Past this many blocks the rest arrive together, so a long screen does not take long to show. */
export const STAGGER_MAX = 8;
/** How long a screen carries `data-reveal`, the flag the stylesheet's entrance animations hang on. */
export const REVEAL_MS = 2600;
/** How far the page underneath is shifted while it is covered, as a share of its width. */
export const PARALLAX = 0.28;
/** How much the page underneath fades while it is covered. */
export const DIM = 0.55;

export function prefersReducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

const canAnimate = (el: Element): boolean => typeof el.animate === 'function';

/** Style of the page underneath for a given progress (0 = fully covered, 1 = fully revealed). */
export function underStyle(progress: number): { transform: string; opacity: string } {
  const p = Math.min(1, Math.max(0, progress));
  return { transform: `translate3d(${-PARALLAX * (1 - p) * 100}%, 0, 0)`, opacity: String(1 - DIM * (1 - p)) };
}

/**
 * Animates one page replacing another. Returns the running animations (empty when nothing moves);
 * they keep their final frame until cancelled, so the caller cancels them once the DOM has caught up.
 */
export function runPageTransition(kind: TransitionKind, from: HTMLElement | null, to: HTMLElement | null, direction: -1 | 0 | 1 = 0): Animation[] {
  if (kind === 'none' || prefersReducedMotion() || !to || !canAnimate(to)) return [];
  const slide: KeyframeAnimationOptions = { duration: NAV_MS, easing: EASE_NAV, fill: 'both' };
  const covered = underStyle(0);
  const revealed = underStyle(1);
  const animations: Animation[] = [];

  if (kind === 'push') {
    animations.push(to.animate([{ transform: 'translate3d(100%, 0, 0)' }, { transform: 'translate3d(0, 0, 0)' }], slide));
    if (from) animations.push(from.animate([revealed, covered], slide));
  } else if (kind === 'pop') {
    if (from) animations.push(from.animate([{ transform: 'translate3d(0, 0, 0)' }, { transform: 'translate3d(100%, 0, 0)' }], slide));
    animations.push(to.animate([covered, revealed], slide));
  } else if (direction !== 0) {
    // Tab change, as on iOS: the new page slides in from the side the tab lies on while the old one
    // drifts the other way and fades (the frosted veil over both is in depth.css).
    animations.push(
      to.animate(
        [
          { opacity: 0, transform: `translate3d(${direction * TAB_SLIDE * 100}%, 0, 0)` },
          { opacity: 1, transform: 'translate3d(0, 0, 0)' },
        ],
        slide,
      ),
    );
    if (from) {
      animations.push(
        from.animate(
          [
            { opacity: 1, transform: 'translate3d(0, 0, 0)' },
            { opacity: 0, transform: `translate3d(${-direction * TAB_SLIDE * 60}%, 0, 0)` },
          ],
          slide,
        ),
      );
    }
  } else {
    // Another change between pages of the same level: a short cross-fade, the new page settling in from slightly below and a hair smaller.
    const fade: KeyframeAnimationOptions = { duration: FADE_MS, easing: EASE_OUT, fill: 'both' };
    animations.push(
      to.animate(
        [
          { opacity: 0, transform: 'translate3d(0, 10px, 0) scale(0.988)' },
          { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
        ],
        fade,
      ),
    );
    if (from) animations.push(from.animate([{ opacity: 1 }, { opacity: 0 }], { ...fade, duration: FADE_MS * 0.6 }));
  }
  return animations;
}

export function whenFinished(animations: Animation[]): Promise<void> {
  return Promise.all(animations.map((a) => a.finished)).then(() => undefined);
}

/** The delay of the item at `index`: a step per item, up to `max` steps. */
export function staggerDelay(index: number, step = STAGGER_STEP, max = STAGGER_MAX): number {
  return Math.min(Math.max(0, index), max) * step;
}

/**
 * The blocks of a screen that arrive one after another: the children of its main column. A child
 * marked `data-stagger` is a wrapper only (a grid, a two-column layout): its own children count instead,
 * so the cards inside arrive separately.
 */
export function staggerTargets(page: ParentNode): Element[] {
  const blocks: Element[] = [];
  const visit = (parent: Element) => {
    for (const child of Array.from(parent.children)) {
      if (child.hasAttribute('data-stagger')) visit(child);
      else blocks.push(child);
    }
  };
  for (const column of Array.from(page.querySelectorAll(':scope .screen > .stack, :scope .screen > .list, :scope .screen > [data-stagger]'))) {
    visit(column);
  }
  return blocks;
}

/**
 * Lets a group of items arrive one after another, each rising a few pixels.
 * Used when a screen appears (first time, and every time a tab brings it back) and when a list is replaced.
 */
export function stagger(items: Iterable<Element>, options: { step?: number; max?: number; delay?: number } = {}): void {
  if (prefersReducedMotion()) return;
  let index = 0;
  for (const item of items) {
    if (!canAnimate(item)) return;
    item.animate(
      [
        { opacity: 0, transform: 'translate3d(0, 12px, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ],
      { duration: 420, delay: (options.delay ?? 0) + staggerDelay(index, options.step, options.max), easing: EASE_OUT, fill: 'backwards' },
    );
    index++;
  }
}

/**
 * Marks a screen as "arriving": the entrance animations of the stylesheet (arcs that draw, bars that grow,
 * lines that trace) run only while the mark is on, so they play when the screen is shown and not when
 * it merely comes back from under another one. The mark is put on again from scratch if it was still on.
 */
export function revealScreen(page: HTMLElement): void {
  if (prefersReducedMotion()) return;
  window.clearTimeout(Number(page.dataset.revealTimer));
  page.removeAttribute('data-reveal');
  void page.offsetWidth; // a new mark restarts the animations that hang on it
  page.setAttribute('data-reveal', '');
  page.dataset.revealTimer = String(window.setTimeout(() => page.removeAttribute('data-reveal'), REVEAL_MS));
}

/** A small springy pop for something that was just chosen: it shrinks a touch and settles back with a bounce. */
export function popChoice(face: HTMLElement): void {
  if (prefersReducedMotion() || !canAnimate(face)) return;
  face.animate([{ transform: 'scale(0.86)' }, { transform: 'scale(1)' }], { duration: 560, easing: EASE_SPRING });
  const icon = face.querySelector<SVGElement>('svg');
  if (icon && canAnimate(icon)) {
    icon.animate(
      [{ transform: 'scale(0.6) rotate(-14deg)' }, { transform: 'scale(1.2) rotate(6deg)', offset: 0.55 }, { transform: 'scale(1) rotate(0deg)' }],
      { duration: 520, easing: EASE_OUT },
    );
  }
}
