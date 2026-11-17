import { createStore, useStore } from './miniStore';

/**
 * Hash routing with plain names (`#calendar`), so the system back button works and a view can be
 * bookmarked. Anything that is not a view (selected day, open dialog) stays in memory.
 *
 * On top of the current route the router keeps what a phone navigation stack needs:
 *  - `stack`: the pages below the current one (a tab, then Settings, then one of its sections…);
 *  - `alive`: the pages kept mounted, so going back or switching tabs finds scroll position and
 *    filters as they were;
 *  - `transition`: which two pages are on screen while one replaces the other, and how.
 */
export const ROUTES = [
  'azi',
  'calendar',
  'jurnal',
  'sfaturi',
  'statistici',
  'profil',
  'setari',
  'setari-ciclu',
  'setari-memento',
  'setari-confidentialitate',
  'setari-date',
  'setari-aspect',
  'setari-despre',
  'politica',
] as const;
export type Route = (typeof ROUTES)[number];
export const HOME: Route = 'azi';

export const TAB_ROUTES = ['azi', 'calendar', 'jurnal', 'sfaturi', 'statistici'] as const satisfies readonly Route[];
export const isTab = (route: Route): boolean => (TAB_ROUTES as readonly Route[]).includes(route);

/** How deep a page sits: tabs are the ground floor, each push goes one level up. */
export function depthOf(route: Route): number {
  if (isTab(route)) return 0;
  if (route === 'setari' || route === 'profil') return 1;
  return route === 'politica' ? 3 : 2;
}

/** Where "back" leads when there is no history to return to (the page was opened from a link). */
export function parentOf(route: Route): Route | undefined {
  if (isTab(route)) return undefined;
  if (route === 'setari' || route === 'profil') return HOME;
  return route === 'politica' ? 'setari-confidentialitate' : 'setari';
}

/** `push` / `pop`: the stack grows or shrinks. `fade`: a tab change. `none`: no animation (already shown by a gesture). */
export type TransitionKind = 'push' | 'pop' | 'fade' | 'none';

export interface Transition {
  id: number;
  from: Route;
  to: Route;
  kind: TransitionKind;
}

export interface NavState {
  route: Route;
  stack: Route[];
  alive: Route[];
  transition: Transition | null;
}

const order = (routes: Route[]): Route[] => ROUTES.filter((r) => routes.includes(r));

export function initialNav(route: Route): NavState {
  return { route, stack: [route], alive: [route], transition: null };
}

/** The state once the two pages have finished trading places: only tabs and the stack stay mounted. */
export function settleNav(state: NavState): NavState {
  if (!state.transition) return state;
  const alive = state.alive.filter((r) => isTab(r) || state.stack.includes(r));
  return { ...state, alive, transition: null };
}

/** Pure navigation step: where things stand after going to `to`. */
export function nextNav(current: NavState, to: Route, id: number, forced?: TransitionKind): NavState {
  // Already there (for example the hashchange event that echoes our own navigation): leave a running transition alone.
  if (to === current.route) return current;
  const state = settleNav(current);
  const from = state.route;

  let stack: Route[];
  let kind: TransitionKind;
  const at = state.stack.indexOf(to);
  if (at >= 0) {
    // Going back to a page that is still underneath.
    stack = state.stack.slice(0, at + 1);
    kind = 'pop';
  } else if (isTab(to)) {
    stack = [to];
    kind = 'fade';
  } else {
    const depth = depthOf(to);
    stack = [...state.stack.filter((r) => depthOf(r) < depth), to];
    kind = depth > depthOf(from) ? 'push' : depth < depthOf(from) ? 'pop' : 'fade';
  }
  const alive = order([...state.alive.filter((r) => isTab(r) || stack.includes(r)), ...stack, from]);
  return { route: to, stack, alive, transition: { id, from, to, kind: forced ?? kind } };
}

function parse(hash: string): Route {
  const name = hash.replace(/^#\/?/, '');
  return (ROUTES as readonly string[]).includes(name) ? (name as Route) : HOME;
}

function readHash(): string {
  try {
    return window.location.hash;
  } catch {
    return '';
  }
}

const hasWindow = typeof window !== 'undefined';
const nav = createStore<NavState>(initialNav(hasWindow ? parse(readHash()) : HOME));
let depth = 0;
let transitionId = 0;
/** Set by the swipe-back gesture: the page it revealed is already in place, so the next change to it must not animate. */
let shownByGesture: Route | undefined;
/** A page the swipe-back gesture is revealing right now; kept mounted and visible below the current one. */
const peek = createStore<Route | null>(null);

function go(to: Route): void {
  const forced = shownByGesture === to ? 'none' : undefined;
  shownByGesture = undefined;
  nav.set((state) => nextNav(state, to, ++transitionId, forced));
}

if (hasWindow) {
  window.addEventListener('hashchange', () => go(parse(readHash())));
}

export const getNav = nav.get;
export const subscribeNav = nav.subscribe;
export const useNav = (): NavState => useStore(nav, (s) => s);
export const useRoute = (): Route => useStore(nav, (s) => s.route);
export const usePeek = (): Route | null => useStore(peek, (p) => p);

export function navigate(to: Route, options: { replace?: boolean } = {}): void {
  if (to === nav.get().route) return;
  try {
    if (options.replace) {
      window.history.replaceState(null, '', `#${to}`);
    } else {
      window.location.hash = to;
      depth++;
    }
  } catch {
    // History not available (sandboxed frame): keep routing in memory.
  }
  go(to);
}

/** Back to the previous view when we navigated here ourselves; otherwise to the page's parent. */
export function goBack(fallback: Route | undefined = parentOf(nav.get().route)): void {
  if (depth > 0) {
    depth--;
    try {
      window.history.back();
      return;
    } catch {
      // fall through
    }
  }
  if (fallback) navigate(fallback, { replace: true });
}

/** The page a "back" would reveal: the one underneath in the stack, or the parent after a direct link. */
export function backTarget(): Route | undefined {
  const { stack, route } = nav.get();
  return stack.length > 1 ? stack[stack.length - 2] : parentOf(route);
}

/** The two pages have finished trading places. */
export function finishTransition(id: number): void {
  nav.set((state) => (state.transition?.id === id ? settleNav(state) : state));
}

/** Swipe-back: show the page underneath while the finger drags the current one. */
export function setPeek(route: Route | null): void {
  peek.set(route);
}

/** Swipe-back completed: go back, and do not animate a change the gesture has already shown. */
export function completeSwipeBack(revealed: Route): void {
  shownByGesture = revealed;
  goBack();
  // If "back" led somewhere else after all, the flag must not leak into a later navigation.
  setTimeout(() => {
    if (shownByGesture === revealed) shownByGesture = undefined;
  }, 1000);
}

/** Drops pages that are neither the current one nor underneath it (used when the app locks). */
export function collapseNav(): void {
  nav.set((state) => {
    const settled = settleNav(state);
    return { ...settled, alive: order(settled.stack) };
  });
}

/** After a wipe or a first run the previous view must not be restored. */
export function resetRoute(): void {
  depth = 0;
  try {
    window.history.replaceState(null, '', `#${HOME}`);
  } catch {
    // no history here
  }
  shownByGesture = undefined;
  peek.set(null);
  nav.set(initialNav(HOME));
}
