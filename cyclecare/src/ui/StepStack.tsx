import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { runPageTransition, whenFinished } from './motion';

interface Leaving {
  id: string;
  node: ReactNode;
  forward: boolean;
}

/**
 * A linear flow (the first-run questions) shown one step at a time, with the same push / pop
 * movement as the main navigation. The step being left stays on screen, frozen, until the next
 * one has slid over it. Each step scrolls on its own.
 */
export function StepStack({ id, forward, children }: { id: string; forward: boolean; children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const lastNode = useRef<ReactNode>(children);
  const [state, setState] = useState<{ current: string; leaving: Leaving | null }>({ current: id, leaving: null });

  // The step changed: keep the previous one's last rendering while it moves out.
  if (state.current !== id) setState({ current: id, leaving: { id: state.current, node: lastNode.current, forward } });
  const leaving = state.current === id ? state.leaving : null;

  useLayoutEffect(() => {
    lastNode.current = children;
  });

  useLayoutEffect(() => {
    if (!leaving) return;
    const stage = stageRef.current;
    const page = (step: string) => stage?.querySelector<HTMLElement>(`:scope > .page[data-step="${step}"]`) ?? null;
    const to = page(state.current);
    to?.querySelector<HTMLElement>('[data-page-title]')?.focus({ preventScroll: true });
    const finish = () => setState((s) => (s.leaving === leaving ? { ...s, leaving: null } : s));
    const animations = runPageTransition(leaving.forward ? 'push' : 'pop', page(leaving.id), to);
    if (animations.length === 0) {
      finish();
      return;
    }
    let cancelled = false;
    whenFinished(animations).then(
      () => {
        if (!cancelled) finish();
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
      animations.forEach((a) => a.cancel());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);

  return (
    <div className="stage" ref={stageRef} data-moving={leaving ? (leaving.forward ? 'push' : 'pop') : undefined}>
      {leaving && (
        // Going back, the step being left slides away above the one it uncovers.
        <div className="page" key={leaving.id} data-step={leaving.id} inert style={{ zIndex: leaving.forward ? 0 : 2 }}>
          {leaving.node}
        </div>
      )}
      <div className="page" key={id} data-step={id} data-active="">
        {children}
      </div>
    </div>
  );
}
