import { CalendarDays, ChartColumn, ChevronLeft, CircleDot, Lightbulb, NotebookPen, Settings, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { goBack, navigate, useRoute, type Route } from '../app/router';
import { useToasts } from '../app/ui';
import { strings } from '../i18n';

/** Screen title. Moves focus to itself when the screen appears, so screen readers announce the new view. */
export function ScreenHead(props: { title: string; subtitle?: string; back?: Route; settings?: boolean; actions?: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const s = strings();
  useEffect(() => {
    window.scrollTo(0, 0);
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <header className="screen-head">
      {props.back && (
        <button type="button" className="icon-btn outlined" aria-label={s.common.back} onClick={() => goBack(props.back!)}>
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
      )}
      <div className="titles">
        <h1 ref={ref} tabIndex={-1}>
          {props.title}
        </h1>
        {props.subtitle && <p className="caption">{props.subtitle}</p>}
      </div>
      {props.actions}
      {props.settings && (
        <button type="button" className="icon-btn outlined" aria-label={s.common.openSettings} onClick={() => navigate('setari')}>
          <Settings size={20} aria-hidden="true" />
        </button>
      )}
    </header>
  );
}

const TABS: Array<{ route: Route; icon: LucideIcon; label: () => string }> = [
  { route: 'azi', icon: CircleDot, label: () => strings().nav.today },
  { route: 'calendar', icon: CalendarDays, label: () => strings().nav.calendar },
  { route: 'jurnal', icon: NotebookPen, label: () => strings().nav.journal },
  { route: 'sfaturi', icon: Lightbulb, label: () => strings().nav.tips },
  { route: 'statistici', icon: ChartColumn, label: () => strings().nav.stats },
];

export function TabBar() {
  const route = useRoute();
  return (
    <nav className="tabbar" aria-label={strings().nav.label}>
      <ul>
        {TABS.map(({ route: to, icon: Icon, label }) => (
          <li key={to}>
            <a
              className="tab"
              href={`#${to}`}
              aria-current={route === to ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                navigate(to);
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
        <div className="toast" key={t.id}>
          {t.message}
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
