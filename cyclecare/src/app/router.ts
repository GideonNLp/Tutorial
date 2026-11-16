import { createStore, useStore } from './miniStore';

/**
 * Hash routing with plain names (`#calendar`), so the system back button works and
 * a view can be bookmarked. Anything that is not a view (selected day, open dialog) stays in memory.
 */
export const ROUTES = [
  'azi',
  'calendar',
  'jurnal',
  'sfaturi',
  'statistici',
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

const route = createStore<Route>(typeof window === 'undefined' ? HOME : parse(readHash()));
let depth = 0;

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => route.set(parse(readHash())));
}

export function useRoute(): Route {
  return useStore(route, (r) => r);
}

export function currentRoute(): Route {
  return route.get();
}

export function navigate(to: Route, options: { replace?: boolean } = {}): void {
  if (to === route.get()) return;
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
  route.set(to);
}

/** Back to the previous view when we navigated here ourselves; otherwise to `fallback`. */
export function goBack(fallback: Route): void {
  if (depth > 0) {
    depth--;
    try {
      window.history.back();
      return;
    } catch {
      // fall through
    }
  }
  navigate(fallback, { replace: true });
}

/** After a wipe or a lock the previous view must not be restored. */
export function resetRoute(): void {
  depth = 0;
  navigate(HOME, { replace: true });
}
