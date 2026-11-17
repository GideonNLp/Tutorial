import { useLayoutEffect, useRef, type RefObject } from 'react';
import { EASE_OUT, prefersReducedMotion, stagger } from './motion';

/**
 * Animates content that was replaced in place (another month, another list of tips), so the
 * change reads as a change instead of a blink. Nothing runs on first display or when a kept-alive
 * page is merely shown again.
 *
 * `stagger`: the element's children arrive one after another.
 * `slide`: the element comes in from the side the change points to (numeric keys: larger = from the right).
 */
export function useEnterOnChange<T extends HTMLElement>(key: string | number, effect: 'stagger' | 'slide', target?: RefObject<T | null>) {
  const own = useRef<T>(null);
  const ref = target ?? own;
  const previous = useRef(key);

  useLayoutEffect(() => {
    const el = ref.current;
    const before = previous.current;
    previous.current = key;
    if (!el || before === key || prefersReducedMotion() || typeof el.animate !== 'function') return;
    if (effect === 'stagger') {
      stagger(el.children, { step: 35 });
      return;
    }
    const direction = typeof key === 'number' && typeof before === 'number' ? Math.sign(key - before) : 1;
    el.animate(
      [
        { opacity: 0, transform: `translate3d(${direction * 28}px, 0, 0)` },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ],
      { duration: 280, easing: EASE_OUT },
    );
  }, [key, effect, ref]);

  return ref;
}
