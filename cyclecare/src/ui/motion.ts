import type { TransitionKind } from '../app/router';

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
export const NAV_MS = 320;
export const FADE_MS = 200;
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
export function runPageTransition(kind: TransitionKind, from: HTMLElement | null, to: HTMLElement | null): Animation[] {
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
  } else {
    // Tab change: a short cross-fade, the new page settling in from slightly below.
    const fade: KeyframeAnimationOptions = { duration: FADE_MS, easing: EASE_OUT, fill: 'both' };
    animations.push(
      to.animate(
        [
          { opacity: 0, transform: 'translate3d(0, 6px, 0)' },
          { opacity: 1, transform: 'translate3d(0, 0, 0)' },
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

/**
 * Lets a group of items arrive one after another (30–50 ms apart), each rising a few pixels.
 * Used once when a screen first appears and when a list is replaced.
 */
export function stagger(items: Iterable<Element>, options: { step?: number; max?: number; delay?: number } = {}): void {
  if (prefersReducedMotion()) return;
  const step = options.step ?? 40;
  const max = options.max ?? 10;
  let index = 0;
  for (const item of items) {
    if (!canAnimate(item)) return;
    item.animate(
      [
        { opacity: 0, transform: 'translate3d(0, 10px, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ],
      { duration: 360, delay: (options.delay ?? 0) + Math.min(index, max) * step, easing: EASE_OUT, fill: 'backwards' },
    );
    index++;
  }
}
