import { CalendarDays, ChartColumn, ChevronLeft, CircleDot, Lightbulb, NotebookPen, Settings, type LucideIcon } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { getNav, goBack, navigate, useRoute, type Route } from '../app/router';
import { dismissToast, useToasts } from '../app/ui';
import { strings } from '../i18n';
import { prefersReducedMotion } from './motion';
import { ProfileButton } from './Avatar';
import { haptic } from './haptics';

function scrollToTop(page: Element | null | undefined): void {
  page?.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/**
 * One screen: a navigation bar that stays at the top, the large title, then the content.
 *
 * At rest it looks like a plain header row (back button, title, settings button). Once the
 * page scrolls, the bar turns into frosted glass over the content and shows the title in small,
 * centred, while the large title scrolls away underneath — the way iOS navigation bars behave.
 */
export function Screen(props: {
  title: string;
  subtitle?: string;
  back?: boolean;
  settings?: boolean;
  /** The profile picture beside the settings button (tab pages of the owner's app). */
  profile?: boolean;
  children: ReactNode;
}) {
  const withProfile = props.settings && props.profile !== false;
  const barRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const s = strings();

  useLayoutEffect(() => {
    const bar = barRef.current;
    const title = titleRef.current;
    const page = bar?.closest('.page');
    if (!bar || !title || !page) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const scrolled = page.scrollTop > 2;
      // The small title takes over when the large one has slid under the bar.
      const collapsed = scrolled && title.getBoundingClientRect().bottom < bar.getBoundingClientRect().bottom - 6;
      bar.toggleAttribute('data-scrolled', scrolled);
      bar.toggleAttribute('data-collapsed', collapsed);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    page.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      page.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Tab pages carry one button on the right: the profile picture, which opens the profile and the
  // settings. A page without a profile (the partner's) has the settings button instead.
  const classes = ['screen-head', props.back ? 'has-leading' : '', props.settings ? 'has-trailing' : ''].filter(Boolean).join(' ');
  return (
    <>
      <header
        className="navbar"
        ref={barRef}
        onClick={(e) => {
          // Like tapping the status bar: a tap on the bar itself returns to the top.
          if (e.target instanceof Element && !e.target.closest('button')) scrollToTop(barRef.current?.closest('.page'));
        }}
      >
        <div className="navbar-inner">
          {props.back ? (
            <button type="button" className="icon-btn outlined" aria-label={s.common.back} onClick={() => goBack()}>
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
          ) : (
            <span />
          )}
          <span className="navbar-title" aria-hidden="true">
            {props.title}
          </span>
          {props.settings ? (
            <div className="navbar-actions">
              {withProfile ? (
                <ProfileButton />
              ) : (
                <button type="button" className="icon-btn outlined" aria-label={s.common.openSettings} onClick={() => navigate('setari')}>
                  <Settings size={20} aria-hidden="true" />
                </button>
              )}
            </div>
          ) : (
            <span />
          )}
        </div>
      </header>
      <div className="screen">
        <div className={classes}>
          <div className="titles">
            <h1 ref={titleRef} tabIndex={-1} data-page-title="">
              {props.title}
            </h1>
            {props.subtitle && <p className="caption">{props.subtitle}</p>}
          </div>
        </div>
        {props.children}
      </div>
    </>
  );
}

export interface TabItem {
  route: Route;
  icon: LucideIcon;
  label: () => string;
}

const TABS: TabItem[] = [
  { route: 'azi', icon: CircleDot, label: () => strings().nav.today },
  { route: 'calendar', icon: CalendarDays, label: () => strings().nav.calendar },
  { route: 'jurnal', icon: NotebookPen, label: () => strings().nav.journal },
  { route: 'sfaturi', icon: Lightbulb, label: () => strings().nav.tips },
  { route: 'statistici', icon: ChartColumn, label: () => strings().nav.stats },
];

/** How far the page has to be scrolled before the bar may fold up, and how much movement counts as a direction. */
const FOLD_AFTER = 48;
const FOLD_STEP = 10;

/**
 * Whether the bar folds: only the floating bar of a phone. Folding is a change of state, not a motion
 * (iOS folds its bar with Reduce Motion on as well); with reduced motion it simply happens at once,
 * because the stylesheet turns the transitions off.
 */
function foldingAllowed(): boolean {
  try {
    return matchMedia('(max-width: 55.99rem)').matches;
  } catch {
    return false;
  }
}

export function TabBar({ tabs = TABS }: { tabs?: TabItem[] }) {
  const route = useRoute();
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Where the current tab sits, so the lens behind it can glide there from the tab it was on.
  const [spot, setSpot] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // Scrolling down folds the bar up to the current tab; scrolling up (or touching it) unfolds it.
  const [folded, setFolded] = useState(false);
  const foldedRef = useRef(false);
  // A finger dragging along the bar: the lens follows it and the page changes under it (see the handlers below).
  const [lensX, setLensX] = useState<number | null>(null);
  const press = useRef<{ id: number; startX: number; active: boolean; pushed: boolean } | null>(null);
  const dragged = useRef(false);
  // A finger or a mouse is down on the bar: the focus it brings must not open the bar before the tap is handled.
  const pointerDown = useRef(false);
  const fold = (on: boolean) => {
    if (foldedRef.current === on) return;
    foldedRef.current = on;
    setFolded(on);
  };

  useLayoutEffect(() => {
    const list = listRef.current;
    const nav = navRef.current;
    if (!list || !nav) return;
    const measure = () => {
      const tab = list.querySelector<HTMLElement>('.tab[aria-current="page"]');
      if (!tab) return setSpot(null);
      // Layout sizes, not bounding rectangles: those include the transforms of the bar (it swells while a finger
      // drags along it and the tabs shrink when it folds), and measuring them would feed back into the layout.
      // The tab sits in the list's own coordinates (the list is its offset parent), at the list's own scale.
      const inset = 4;
      const next = {
        x: tab.offsetLeft + inset,
        y: tab.offsetTop + inset,
        w: tab.offsetWidth - 2 * inset,
        h: tab.offsetHeight - 2 * inset,
      };
      setSpot((was) => (was && was.x === next.x && was.y === next.y && was.w === next.w && was.h === next.h ? was : next));
      // What the folded bar needs to know: where the current tab is, how wide it is, and how wide the list is
      // when open (the list keeps that width while the bar around it narrows).
      if (!foldedRef.current) {
        nav.style.setProperty('--tab-x', `${tab.offsetLeft}px`);
        nav.style.setProperty('--tab-w', `${tab.offsetWidth}px`);
        nav.style.setProperty('--list-w', `${list.offsetWidth}px`);
      }
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(list);
    return () => watch.disconnect();
  }, [route, tabs.length]);

  // A new page starts unfolded; then the scrolling of the current page decides.
  useEffect(() => {
    fold(false);
    let last = 0;
    const onScroll = (event: Event) => {
      const page = event.target;
      if (!(page instanceof HTMLElement) || !page.classList.contains('page') || !page.hasAttribute('data-active')) return;
      if (!foldingAllowed()) return fold(false);
      // iOS lets a page bounce past its ends and settle back; that is not a scroll the other way.
      const y = Math.min(Math.max(0, page.scrollTop), Math.max(0, page.scrollHeight - page.clientHeight));
      if (y < FOLD_AFTER) {
        last = y;
        return fold(false);
      }
      if (Math.abs(y - last) < FOLD_STEP) return;
      fold(y > last);
      last = y;
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', onScroll, { capture: true });
  }, [route]);

  const follow = (clientX: number) => {
    const list = listRef.current;
    if (!list || !spot) return;
    const l = list.getBoundingClientRect(); // on screen, scale included
    const scale = l.width / list.offsetWidth || 1; // the bar swells while dragging: back to the list's own pixels
    const x = (clientX - l.left) / scale;
    // The lens stays inside the bar, centred on the finger.
    setLensX(Math.min(Math.max(x - spot.w / 2, 4), list.offsetWidth - spot.w - 4));
    const under = tabs[Math.min(tabs.length - 1, Math.max(0, Math.floor((x / list.offsetWidth) * tabs.length)))];
    if (under && under.route !== getNav().route) {
      // One history entry for the whole drag: the first change adds it, the next ones replace it.
      navigate(under.route, { replace: press.current?.pushed, instant: true });
      if (press.current) press.current.pushed = true;
      haptic('light');
    }
  };
  const endPress = (event: React.PointerEvent) => {
    const p = press.current;
    if (!p || p.id !== event.pointerId) return;
    press.current = null;
    if (p.active) {
      navRef.current?.releasePointerCapture?.(event.pointerId);
      setLensX(null); // the lens settles on the tab the page is now on
    }
  };

  const current = Math.max(
    0,
    tabs.findIndex((t) => t.route === route),
  );
  return (
    <nav
      ref={navRef}
      className="tabbar"
      aria-label={strings().nav.label}
      data-folded={folded ? '' : undefined}
      data-dragging={lensX !== null ? '' : undefined}
      style={{ '--active': current, '--count': tabs.length } as CSSProperties}
      onPointerDownCapture={() => {
        pointerDown.current = true;
      }}
      onPointerUpCapture={() => {
        pointerDown.current = false;
      }}
      onPointerCancel={(e) => {
        pointerDown.current = false;
        endPress(e);
      }}
      onPointerDown={(e) => {
        if (e.button !== 0 || foldedRef.current) return;
        press.current = { id: e.pointerId, startX: e.clientX, active: false, pushed: false };
        dragged.current = false;
      }}
      onPointerMove={(e) => {
        const p = press.current;
        if (!p || p.id !== e.pointerId) return;
        if (!p.active) {
          if (Math.abs(e.clientX - p.startX) < 8) return; // still a tap
          p.active = true;
          dragged.current = true;
          navRef.current?.setPointerCapture?.(e.pointerId);
          haptic('light');
        }
        follow(e.clientX);
      }}
      onPointerUp={endPress}
      onLostPointerCapture={(e) => {
        // On a touch screen the tab under the finger holds the pointer first and loses it when the bar takes it
        // over: only the bar losing it is the end of the drag.
        if (e.target === e.currentTarget) endPress(e);
      }}
      onFocus={() => {
        if (!pointerDown.current) fold(false);
      }}
    >
      <ul ref={listRef} style={tabs.length === 5 ? undefined : { gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {spot && (
          <span
            className="tab-indicator"
            aria-hidden="true"
            style={{ width: spot.w, height: spot.h, transform: `translate(${lensX ?? spot.x}px, ${spot.y}px)` }}
          />
        )}
        {tabs.map(({ route: to, icon: Icon, label }, index) => (
          <li key={to} style={{ '--index': index } as CSSProperties}>
            <a
              className="tab"
              draggable={false}
              href={`#${to}`}
              aria-current={route === to ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                // The end of a drag is not a tap on the tab under the finger.
                if (dragged.current) {
                  dragged.current = false;
                  return;
                }
                // The folded bar opens when touched; touching the tab it shows does nothing more. Another tab
                // can only be reached here by a screen reader or a keyboard: it opens the bar and goes there.
                if (foldedRef.current) {
                  fold(false);
                  if (route === to) return;
                }
                // Tapping the tab you are on goes back to the top of its page.
                if (route === to) scrollToTop(document.querySelector('.page[data-active]'));
                else navigate(to);
              }}
            >
              <span className="tab-icon">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="tab-label">{label()}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Toaster() {
  const toasts = useToasts();
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div className={t.leaving ? 'toast leaving' : 'toast'} key={t.id}>
          <span>{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                haptic('light');
                t.action!.run();
                dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function Notice(props: { icon?: ReactNode; attention?: boolean; children: ReactNode }) {
  return (
    <div className={props.attention ? 'notice notice-attention' : 'notice'}>
      {props.icon}
      <div className="grow stack stack-2">{props.children}</div>
    </div>
  );
}
