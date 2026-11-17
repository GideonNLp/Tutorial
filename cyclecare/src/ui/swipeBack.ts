import { backTarget, completeSwipeBack, getNav, setPeek, subscribeNav, type Route } from '../app/router';
import { EASE_OUT, NAV_MS, prefersReducedMotion, underStyle, whenFinished } from './motion';

/**
 * Interactive "swipe from the left edge to go back".
 *
 * The finger drags the current page; the page underneath follows with the same parallax and
 * fade as the animated transition. Letting go past a third of the width, or with a flick,
 * completes the move; otherwise the page springs back.
 *
 * Pages declare `touch-action: pan-y`, so a horizontal drag is never claimed by the browser and
 * pointer events keep arriving; a vertical drag from the edge still scrolls (the browser then
 * cancels the pointer and the gesture is dropped).
 */
const EDGE = 24; // px from the left edge of the page area where the gesture may start
const SLOP = 10; // px of movement before the direction is decided
const COMPLETE_AT = 0.35; // share of the width
const FLICK = 0.45; // px per ms

interface Drag {
  pointerId: number;
  x0: number;
  y0: number;
  lastX: number;
  /** Recent positions, to tell a flick from a finger that came to rest. */
  trail: Array<{ x: number; t: number }>;
  width: number;
  from: Route;
  to: Route;
  active: boolean;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function attachSwipeBack(stage: HTMLElement): () => void {
  let drag: Drag | null = null;
  let settling = false;
  const page = (route: Route) => stage.querySelector<HTMLElement>(`:scope > .page[data-route="${route}"]`);

  const canStart = (clientX: number): Route | undefined => {
    if (drag || settling || getNav().transition) return undefined;
    if (clientX - stage.getBoundingClientRect().left > EDGE) return undefined;
    if (document.querySelector('dialog[open]')) return undefined;
    return backTarget();
  };

  const place = (dx: number) => {
    if (!drag) return;
    const current = page(drag.from);
    const under = page(drag.to);
    if (current) current.style.transform = `translate3d(${dx}px, 0, 0)`;
    if (under) Object.assign(under.style, underStyle(dx / drag.width));
  };

  const clearInline = (...elements: Array<HTMLElement | null>) => {
    for (const el of elements) {
      if (!el) continue;
      el.style.transform = '';
      el.style.opacity = '';
    }
  };

  const release = (complete: boolean) => {
    if (!drag) return;
    const { from, to, width } = drag;
    const dx = Math.min(width, Math.max(0, drag.lastX - drag.x0));
    drag = null;
    settling = true;

    const current = page(from);
    const under = page(to);
    const end = complete ? width : 0;
    const duration = prefersReducedMotion() ? 1 : Math.max(140, Math.min(NAV_MS, (Math.abs(end - dx) / width) * NAV_MS * 1.3));
    const timing: KeyframeAnimationOptions = { duration, easing: EASE_OUT, fill: 'both' };
    const animations: Animation[] = [];
    if (current?.animate) {
      animations.push(current.animate([{ transform: `translate3d(${dx}px, 0, 0)` }, { transform: `translate3d(${end}px, 0, 0)` }], timing));
    }
    if (under?.animate) animations.push(under.animate([underStyle(dx / width), underStyle(end / width)], timing));
    clearInline(current, under);

    let unsubscribe: (() => void) | undefined;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const done = () => {
      unsubscribe?.();
      clearTimeout(fallback);
      // One frame later the page list has caught up, so dropping the animations shows no jump.
      requestAnimationFrame(() => {
        animations.forEach((a) => a.cancel());
        setPeek(null);
        stage.removeAttribute('data-moving');
        settling = false;
      });
    };

    whenFinished(animations).then(
      () => {
        if (!complete) return done();
        unsubscribe = subscribeNav(() => {
          if (getNav().route !== from) done();
        });
        fallback = setTimeout(done, 800);
        completeSwipeBack(to);
      },
      () => done(),
    );
  };

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || !e.isPrimary) return;
    const to = canStart(e.clientX);
    if (!to) return;
    drag = {
      pointerId: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      lastX: e.clientX,
      trail: [{ x: e.clientX, t: e.timeStamp }],
      width: stage.clientWidth || 1,
      from: getNav().route,
      to,
      active: false,
    };
  };

  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;
    if (!drag.active) {
      if (Math.abs(dy) > SLOP && Math.abs(dy) > Math.abs(dx)) {
        drag = null; // a vertical drag: leave it to scrolling
        return;
      }
      if (dx < SLOP) return;
      drag.active = true;
      setPeek(drag.to);
      stage.setAttribute('data-moving', 'drag');
      try {
        stage.setPointerCapture(e.pointerId);
      } catch {
        // capture is a convenience, not a requirement
      }
    }
    drag.lastX = e.clientX;
    drag.trail.push({ x: e.clientX, t: e.timeStamp });
    if (drag.trail.length > 8) drag.trail.shift();
    place(Math.min(drag.width, Math.max(0, dx)));
  };

  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.active) {
      drag = null;
      return;
    }
    const progress = (drag.lastX - drag.x0) / drag.width;
    // Speed over the last 100 ms before letting go; a finger that rested first has none.
    const recent = drag.trail.filter((p) => e.timeStamp - p.t <= 100);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const velocity = first && last && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
    // A flick completes it; a finger that was moving back towards the edge cancels it.
    release(velocity > -0.1 && (progress > COMPLETE_AT || velocity > FLICK));
  };

  const onCancel = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (drag.active) release(false);
    else drag = null;
  };

  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onCancel);

  // iOS has its own edge swipe that moves through the browser history with a snapshot of the page.
  // Taking the touch at the edge keeps the two gestures from running at once; a plain tap there
  // is passed on as a click, because taking the touch also suppresses the click it would cause.
  let tap: { x: number; y: number; t: number } | null = null;
  const onTouchStart = (e: TouchEvent) => {
    tap = null;
    const touch = e.touches[0];
    if (e.touches.length !== 1 || !touch || !e.cancelable) return;
    if (touch.clientX - stage.getBoundingClientRect().left > EDGE || !backTarget() || document.querySelector('dialog[open]')) return;
    e.preventDefault();
    tap = { x: touch.clientX, y: touch.clientY, t: e.timeStamp };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = tap;
    tap = null;
    const touch = e.changedTouches[0];
    if (!start || !touch || e.timeStamp - start.t > 600) return;
    if (Math.abs(touch.clientX - start.x) > SLOP || Math.abs(touch.clientY - start.y) > SLOP) return;
    document
      .elementFromPoint(touch.clientX, touch.clientY)
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  };
  const ios = isIOS();
  if (ios) {
    stage.addEventListener('touchstart', onTouchStart, { passive: false });
    stage.addEventListener('touchend', onTouchEnd);
  }

  return () => {
    stage.removeEventListener('pointerdown', onDown);
    stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerup', onUp);
    stage.removeEventListener('pointercancel', onCancel);
    if (ios) {
      stage.removeEventListener('touchstart', onTouchStart);
      stage.removeEventListener('touchend', onTouchEnd);
    }
  };
}
