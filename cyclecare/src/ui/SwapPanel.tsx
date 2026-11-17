import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { EASE_OUT, prefersReducedMotion } from './motion';

const SWAP_MS = 340;

/**
 * A panel whose content is replaced by something of another size (the details of the day chosen in
 * the calendar). When `swapKey` changes the new content fades and rises in, and the panel eases from the
 * old height to the new one instead of jumping. The first render, and a screen coming back from the
 * background, do not move. Nothing moves under reduced motion.
 */
export function SwapPanel(props: { swapKey: string | number; className?: string; innerClassName?: string; children: ReactNode }) {
  const { swapKey } = props;
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const last = useRef<{ key: string | number; height: number } | null>(null);

  // After every commit, so the remembered height is always the one of the previous commit.
  useLayoutEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    // The content's own height: the panel's is the thing being animated.
    const height = content.getBoundingClientRect().height;
    const before = last.current;
    last.current = { key: swapKey, height };
    if (!before || before.key === swapKey || before.height < 1 || height < 1 || prefersReducedMotion() || typeof box.animate !== 'function') return;

    content.animate(
      [
        { opacity: 0, transform: 'translate3d(0, 10px, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ],
      { duration: SWAP_MS, easing: EASE_OUT },
    );
    if (Math.abs(before.height - height) < 1) return;
    box.style.overflow = 'hidden';
    const done = () => {
      box.style.overflow = '';
    };
    box.animate([{ height: `${before.height}px` }, { height: `${height}px` }], { duration: SWAP_MS, easing: EASE_OUT }).finished.then(done, done);
  });

  return (
    <div ref={outer} className={props.className}>
      <div ref={inner} className={props.innerClassName}>
        {props.children}
      </div>
    </div>
  );
}
