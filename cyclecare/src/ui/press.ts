/**
 * Press feedback: whatever is being pressed carries `data-pressed`, which the stylesheet turns
 * into a slight scale-down; on release it springs back.
 *
 * `:active` alone is not enough on touch screens: a quick tap ends before a frame is painted,
 * and iOS only applies it under conditions. Here the pressed state lasts at least a moment,
 * and ends as soon as the finger starts scrolling.
 */
const PRESSABLE = '.btn, .icon-btn, .avatar-btn, .tab, .list-row, .chip, .scale > label, .segmented > label, .cal-day, .weekday, .toast-action';
const MIN_VISIBLE_MS = 90;

let installed = false;

export function installPressFeedback(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  let pressed: Element | null = null;
  let since = 0;

  const release = () => {
    const el = pressed;
    if (!el) return;
    pressed = null;
    const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - since));
    setTimeout(() => el.removeAttribute('data-pressed'), wait);
  };

  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const el = e.target instanceof Element ? e.target.closest(PRESSABLE) : null;
      if (!el || el.matches(':disabled, [aria-disabled="true"]') || el.querySelector(':scope > input:disabled')) return;
      pressed?.removeAttribute('data-pressed');
      pressed = el;
      since = performance.now();
      el.setAttribute('data-pressed', '');
    },
    { passive: true },
  );
  for (const type of ['pointerup', 'pointercancel', 'blur'] as const) window.addEventListener(type, release, { passive: true });
  // A press that turns into a scroll is no longer a press.
  document.addEventListener('scroll', release, { capture: true, passive: true });
}
