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
/** How far past the line between two tabs (in tab widths) the finger must go before the lens counts as over the next one. */
const STAY = 0.2;

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
  // A finger dragging along the bar: the lens follows it (see the handlers below).
  const [dragging, setDragging] = useState(false);
  const lensRef = useRef<HTMLSpanElement>(null);
  const spotRef = useRef(spot);
  spotRef.current = spot;
  // The lens while dragged: where it is, where the finger wants it, and the frame loop that brings the one to the other.
  const glide = useRef({ x: 0, target: 0, raf: 0, last: 0 });
  const press = useRef<{ id: number; startX: number; active: boolean } | null>(null);
  // The tab under the lens while it is dragged: the page changes to it only when the finger is lifted.
  const [preview, setPreview] = useState<number | null>(null);
  const previewRef = useRef<number | null>(null);
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

  /** Puts the lens at `x` (the list's own pixels), stretched a little along its movement, like a drop of water. */
  const placeLens = (x: number, stretch: number) => {
    const lens = lensRef.current;
    const sp = spotRef.current;
    if (!lens || !sp) return;
    lens.style.transform = `translate(${x.toFixed(2)}px, ${sp.y}px)`;
    lens.style.setProperty('--sx', (1 + stretch).toFixed(3));
    lens.style.setProperty('--sy', (1 - stretch * 0.55).toFixed(3));
  };
  /** The frame loop: the lens eases toward the finger (not jumping to it, which shows every little shake of the hand). */
  const runGlide = (now: number) => {
    const g = glide.current;
    const dt = Math.min(48, Math.max(1, now - (g.last || now - 16)));
    g.last = now;
    const before = g.x;
    g.x += (g.target - g.x) * (1 - Math.exp(-dt / 55));
    if (Math.abs(g.target - g.x) < 0.05) g.x = g.target;
    placeLens(g.x, Math.min(0.2, (Math.abs(g.x - before) / dt) * 0.1));
    g.raf = Math.abs(g.target - g.x) > 0 || press.current?.active ? requestAnimationFrame(runGlide) : 0;
  };
  const follow = (clientX: number) => {
    const list = listRef.current;
    const sp = spotRef.current;
    if (!list || !sp) return;
    const l = list.getBoundingClientRect(); // on screen, scale included
    const scale = l.width / list.offsetWidth || 1; // the bar swells while dragging: back to the list's own pixels
    const x = (clientX - l.left) / scale;
    // The lens stays inside the bar, centred on the finger.
    const g = glide.current;
    g.target = Math.min(Math.max(x - sp.w / 2, 4), list.offsetWidth - sp.w - 4);
    if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
      g.x = g.target;
      placeLens(g.x, 0);
    } else if (!g.raf) {
      g.last = 0;
      g.raf = requestAnimationFrame(runGlide);
    }
    // Which tab the lens is over, in tab widths from the left. It keeps the tab it is on until the finger is a good way
    // past the line (a fifth of a tab): a hand resting on the line shakes by a pixel or two, and without this the choice,
    // the bold label and the enlarged icon would flicker between the two tabs.
    const at = (x / list.offsetWidth) * tabs.length;
    const held = previewRef.current;
    const index = held !== null && at >= held - STAY && at <= held + 1 + STAY ? held : Math.min(tabs.length - 1, Math.max(0, Math.floor(at)));
    if (index !== previewRef.current) {
      // A tick each time the lens passes onto another tab (not for the one it started on).
      if (previewRef.current !== null) haptic('light');
      previewRef.current = index;
      setPreview(index);
    }
  };
  const endPress = (event: React.PointerEvent) => {
    const p = press.current;
    if (!p || p.id !== event.pointerId) return;
    press.current = null;
    if (p.active) {
      navRef.current?.releasePointerCapture?.(event.pointerId);
      cancelAnimationFrame(glide.current.raf);
      glide.current.raf = 0;
      // The finger is lifted: now the page goes to the tab the lens is over (a cancelled touch goes nowhere).
      const goTo = event.type === 'pointercancel' ? undefined : tabs[previewRef.current ?? -1];
      // The lens glides onto the tab it is over (or back to the one it left): its place is written now, and the
      // stylesheet, which stops following the finger the moment the drag ends, moves it there with a transition.
      const landing = listRef.current?.querySelectorAll<HTMLElement>('.tab')[goTo ? tabs.indexOf(goTo) : current];
      const sp = spotRef.current;
      if (landing && sp && lensRef.current) {
        lensRef.current.style.transform = `translate(${landing.offsetLeft + 4}px, ${sp.y}px)`;
        lensRef.current.style.setProperty('--sx', '1');
        lensRef.current.style.setProperty('--sy', '1');
      }
      previewRef.current = null;
      setPreview(null);
      setDragging(false);
      if (goTo && goTo.route !== getNav().route) navigate(goTo.route);
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
      data-dragging={dragging ? '' : undefined}
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
        press.current = { id: e.pointerId, startX: e.clientX, active: false };
        previewRef.current = null;
        dragged.current = false;
      }}
      onPointerMove={(e) => {
        const p = press.current;
        if (!p || p.id !== e.pointerId) return;
        if (!p.active) {
          if (Math.abs(e.clientX - p.startX) < 8) return; // still a tap
          p.active = true;
          dragged.current = true;
          // The lens starts from where it rests and catches up with the finger.
          glide.current.x = spotRef.current?.x ?? 0;
          setDragging(true);
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
            ref={lensRef}
            className="tab-indicator"
            aria-hidden="true"
            style={{ width: spot.w, height: spot.h, transform: `translate(${spot.x}px, ${spot.y}px)` }}
          />
        )}
        {tabs.map(({ route: to, icon: Icon, label }, index) => (
          <li key={to} style={{ '--index': index } as CSSProperties}>
            <a
              className="tab"
              draggable={false}
              href={`#${to}`}
              aria-current={route === to ? 'page' : undefined}
              data-preview={preview === index ? '' : undefined}
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
