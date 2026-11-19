import { Activity, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { ROUTES, collapseNav, finishTransition, getNav, useNav, usePeek, type Route } from '../app/router';
import { ErrorBoundary } from './ErrorBoundary';
import { hasInteracted } from './interaction';
import { revealScreen, runPageTransition, stagger, staggerTargets, tabDirection, whenFinished } from './motion';
import { attachSwipeBack } from './swipeBack';

/**
 * The page area of the unlocked app, behaving like a phone navigation stack.
 *
 * Every page lives in its own scroll container. Pages that are still "there" — the tabs already
 * visited and whatever sits under the current page — stay mounted but hidden (React `Activity`),
 * so returning to them finds the same scroll position, filters and half-typed fields.
 * While one page replaces another, both are visible and animated (see motion.ts).
 */
export function Navigator({ render }: { render: (route: Route) => ReactNode }) {
  const nav = useNav();
  const peek = usePeek();
  const stageRef = useRef<HTMLElement>(null);
  const transition = nav.transition;

  useLayoutEffect(() => {
    if (!transition) return;
    const stage = stageRef.current;
    const page = (route: Route) => stage?.querySelector<HTMLElement>(`:scope > .page[data-route="${route}"]`) ?? null;
    const animations = runPageTransition(transition.kind, page(transition.from), page(transition.to), tabDirection(transition.from, transition.to));
    if (animations.length === 0) {
      finishTransition(transition.id);
      return;
    }
    stage?.setAttribute('data-moving', transition.kind);
    let cancelled = false;
    whenFinished(animations).then(
      () => {
        if (!cancelled) finishTransition(transition.id);
      },
      () => undefined,
    );
    return () => {
      // Runs after the page list has been updated, so dropping the last frame shows no jump.
      cancelled = true;
      animations.forEach((a) => a.cancel());
      stage?.removeAttribute('data-moving');
    };
    // The transition object is replaced, never mutated: its id identifies it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transition?.id]);

  useEffect(() => {
    const stage = stageRef.current;
    return stage ? attachSwipeBack(stage) : undefined;
  }, []);

  // Leaving the unlocked app (lock, wipe): nothing but the current stack needs to come back.
  useEffect(() => () => collapseNav(), []);

  const mounted = peek && !nav.alive.includes(peek) ? ROUTES.filter((r) => r === peek || nav.alive.includes(r)) : nav.alive;

  return (
    <main id="main" className="stage" tabIndex={-1} ref={stageRef}>
      {mounted.map((route) => {
        const active = route === nav.route;
        const leaving = route === transition?.from;
        return (
          <Activity key={route} mode={active || leaving || route === peek ? 'visible' : 'hidden'}>
            <Page route={route} active={active} entering={transition?.to === route && transition.kind === 'fade'}>
              <ErrorBoundary>{render(route)}</ErrorBoundary>
            </Page>
          </Activity>
        );
      })}
    </main>
  );
}

function Page(props: { route: Route; active: boolean; entering: boolean; children: ReactNode }) {
  const { route, active } = props;
  const ref = useRef<HTMLDivElement>(null);
  const scrollTop = useRef(0);
  const lastFocus = useRef<HTMLElement | null>(null);
  const entered = useRef(false);

  // Runs each time the page is shown again: `Activity` re-creates effects, the refs keep their values.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = scrollTop.current;
    const onScroll = () => {
      scrollTop.current = el.scrollTop;
    };
    const onFocus = (e: FocusEvent) => {
      if (e.target instanceof HTMLElement && !e.target.hasAttribute('data-page-title')) lastFocus.current = e.target;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('focusin', onFocus);
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('focusin', onFocus);
    };
  }, []);

  // A page's blocks arrive one after another the first time it appears, and again whenever a tab
  // brings it back. Coming back with "Back" or a swipe shows the page as it was left.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const kind = getNav().transition?.kind;
    const first = !entered.current;
    entered.current = true;
    if (!first && kind !== 'fade') return;
    revealScreen(el);
    stagger(staggerTargets(el), { delay: kind === 'push' ? 90 : kind === 'fade' ? 40 : 30 });
  }, [active]);

  // Screen readers and keyboards follow the navigation: forward to the page title,
  // back to whatever was focused when the page was left.
  useEffect(() => {
    const el = ref.current;
    if (!el || !active || !hasInteracted()) return;
    const kind = getNav().transition?.kind;
    const previous = lastFocus.current;
    const returning = (kind === 'pop' || kind === 'none') && previous !== null && previous.isConnected && el.contains(previous);
    const target = returning ? previous : el.querySelector<HTMLElement>('[data-page-title]');
    target?.focus({ preventScroll: true });
  }, [active]);

  return (
    <div
      ref={ref}
      className="page"
      data-route={route}
      data-active={active ? '' : undefined}
      data-entering={props.entering ? '' : undefined}
      inert={!active}
    >
      {props.children}
    </div>
  );
}
