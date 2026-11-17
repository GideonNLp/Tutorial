import { CalendarDays, ChartColumn, ChevronLeft, CircleDot, Lightbulb, NotebookPen, Settings, type LucideIcon } from 'lucide-react';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { goBack, navigate, useRoute, type Route } from '../app/router';
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

  // Tab pages carry two buttons on the right: settings, then the profile picture in the corner.
  const classes = ['screen-head', props.back ? 'has-leading' : '', props.settings ? (withProfile ? 'has-trailing-2' : 'has-trailing') : '']
    .filter(Boolean)
    .join(' ');
  return (
    <>
      <header
        className={withProfile ? 'navbar has-actions-2' : 'navbar'}
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
              <button type="button" className="icon-btn outlined" aria-label={s.common.openSettings} onClick={() => navigate('setari')}>
                <Settings size={20} aria-hidden="true" />
              </button>
              {withProfile && <ProfileButton />}
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

export function TabBar({ tabs = TABS }: { tabs?: TabItem[] }) {
  const route = useRoute();
  return (
    <nav className="tabbar" aria-label={strings().nav.label}>
      <ul style={tabs.length === 5 ? undefined : { gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map(({ route: to, icon: Icon, label }) => (
          <li key={to}>
            <a
              className="tab"
              href={`#${to}`}
              aria-current={route === to ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                // Tapping the tab you are on goes back to the top of its page.
                if (route === to) scrollToTop(document.querySelector('.page[data-active]'));
                else navigate(to);
              }}
            >
              <span className="tab-icon">
                <Icon size={20} aria-hidden="true" />
              </span>
              {label()}
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
