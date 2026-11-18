import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronRight as Chevron,
  CircleDot,
  CircleHelp,
  History,
  Info,
  Palette,
  RefreshCw,
  ShieldCheck,
  Users,
  WifiOff,
} from 'lucide-react';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { navigate, type Route } from '../app/router';
import { lock, useData, useHasPin, useStorageMode, useToday, wipeEverything } from '../app/store';
import { content } from '../content';
import { addDays, addMonths, daysInMonth, diffDays, makeISO, parts, startOfWeek, toDayNumber, todayISO } from '../domain/dates';
import type { PartnerCalendarDay, PartnerJournalDay } from '../domain/partner';
import { rotate } from '../domain/tipRotation';
import { PHASES, SYMPTOM_IDS, type ISODate } from '../domain/types';
import { formatDate, strings } from '../i18n';
import { refreshPartnerView, usePartnerSnapshot, usePartnerSync } from '../partner/PartnerSync';
import { relativeTime } from '../partner/time';
import { InstallButton } from '../ui/InstallApp';
import { ConfirmSheet } from '../ui/Sheet';
import { Notice, Screen, type TabItem } from '../ui/Shell';
import { About, AppearanceSettings, PinSheet, type PinMode } from './Settings';

/**
 * The partner's app: the same look as the owner's, read-only, built from the summary she shares.
 * Nothing here can change her journal; the only actions are refreshing and this device's own settings.
 */

/** "Updated 2 minutes ago", offline / stopped notices and a refresh button. */
function SyncStatus() {
  const p = strings().partnerMode;
  const view = useData().partnerView;
  const sync = usePartnerSync();
  const checked = sync.at ?? (view?.checkedAt ? Date.parse(view.checkedAt) : undefined);
  return (
    <div className="stack stack-2">
      {view?.revoked && (
        <Notice attention icon={<Info size={20} aria-hidden="true" />}>
          <p>{p.revoked}</p>
        </Notice>
      )}
      {sync.state === 'offline' && !view?.revoked && (
        <Notice icon={<WifiOff size={20} aria-hidden="true" />}>
          <p>{p.offline}</p>
        </Notice>
      )}
      <div className="tips-toolbar">
        <p className="caption" role="status">
          {checked ? p.updated(relativeTime(checked)) : p.settings.never}
        </p>
        {!view?.revoked && (
          <button
            type="button"
            className="btn btn-quiet btn-small"
            aria-busy={sync.state === 'checking' || undefined}
            onClick={() => void refreshPartnerView()}
          >
            <RefreshCw size={15} aria-hidden="true" />
            {p.refresh}
          </button>
        )}
      </div>
    </div>
  );
}

/** Tags for one day of the journal: flow, symptoms with their intensity, mood, energy. */
function DayTags({ day }: { day: PartnerJournalDay }) {
  const s = strings();
  const f = s.partnerMode.feelings;
  const items: Array<{ text: string; detail?: string }> = [];
  if (day.flow) items.push({ text: day.flow === 'unspecified' ? s.phase.menstruation : f.flow(s.flow[day.flow]) });
  for (const id of SYMPTOM_IDS) {
    const intensity = day.symptoms?.[id];
    if (intensity) items.push({ text: s.symptom[id], detail: s.intensity[intensity].toLowerCase() });
  }
  if (day.mood) items.push({ text: f.mood(s.mood[day.mood]) });
  if (day.energy) items.push({ text: f.energy(s.energy[day.energy]) });
  if (items.length === 0) return null;
  return (
    <ul className="tags">
      {items.map((item) => (
        <li key={item.text} className="tag">
          {item.text}
          {item.detail && <span className="tag-detail"> · {item.detail}</span>}
        </li>
      ))}
    </ul>
  );
}

function Waiting({ title }: { title: string }) {
  return (
    <Screen title={title} settings profile={false}>
      <div className="stack stack-5">
        <SyncStatus />
        <p className="ink-2">{strings().partnerMode.verify.waiting}</p>
      </div>
    </Screen>
  );
}

// ---- Azi ----------------------------------------------------------------------------------

export function PartnerToday() {
  const s = strings();
  const p = s.partnerMode;
  const snapshot = usePartnerSnapshot();
  const today = useToday();
  const [shift, setShift] = useState(0);
  if (!snapshot) return <Waiting title={p.todayTitle} />;

  // The summary may be a day or two old (her phone offline): count from when it was made.
  const lag = Math.max(0, diffDays(today, snapshot.today));
  const cycle = snapshot.cycle;
  const cycleDay = cycle?.cycleDay !== undefined ? cycle.cycleDay + lag : undefined;
  const daysUntil = cycle?.daysUntil !== undefined ? cycle.daysUntil - lag : undefined;
  const phase = cycle?.phase;
  const todayEntry = snapshot.journal?.find((d) => d.date === today);
  const tips = phase ? rotate(content().partner.partnerTips[phase], cycleDay ?? toDayNumber(today), 2, shift) : [];

  let next: ReactNode = null;
  if (cycle && cycle.status !== 'no_data') {
    if (cycle.status === 'late' || (daysUntil !== undefined && daysUntil < 0))
      next = <p className="strong">{p.next.late(Math.max(1, -(daysUntil ?? 0)))}</p>;
    else if (cycle.status === 'due') next = <p className="strong">{p.next.due}</p>;
    else if (daysUntil !== undefined)
      next = (
        <>
          <p className="strong">{p.next.inDays(daysUntil)}</p>
          {cycle.next && (
            <p className="small ink-2">
              {p.next.between(formatDate(cycle.next.earliest, 'dayMonthLong'), formatDate(cycle.next.latest, 'dayMonthLong'))}
            </p>
          )}
        </>
      );
  }

  return (
    <Screen title={p.todayTitle} subtitle={p.subtitle(snapshot.name)} settings profile={false}>
      <div className="stack stack-5">
        <SyncStatus />

        {!snapshot.permissions.phase ? (
          <p className="ink-2">{p.phaseHidden}</p>
        ) : !cycle || cycle.status === 'no_data' ? (
          <p className="ink-2">{p.noCycle}</p>
        ) : (
          <section className="phase-card" data-phase={phase} aria-label={phase ? s.phase[phase] : p.todayTitle}>
            {phase && (
              <p className="phase-line">
                <span className="swatch" aria-hidden="true" />
                <span className="strong">{s.phase[phase]}</span>
              </p>
            )}
            {cycleDay !== undefined && <p className="partner-day">{p.cycleDay(cycleDay)}</p>}
            {next}
          </section>
        )}

        <section className="stack stack-2" aria-labelledby="partner-feelings">
          <h2 id="partner-feelings">{p.feelings.title}</h2>
          {!snapshot.permissions.journal ? (
            <p className="ink-2">{p.feelings.hidden}</p>
          ) : todayEntry ? (
            <>
              <DayTags day={todayEntry} />
              {todayEntry.note && <p className="small ink-2 note-preview">{todayEntry.note}</p>}
            </>
          ) : (
            <p className="ink-2">{p.feelings.nothing}</p>
          )}
        </section>

        {tips.length > 0 && (
          <section className="stack stack-3" aria-labelledby="partner-help">
            <div className="tips-toolbar">
              <h2 id="partner-help">{p.help.title}</h2>
              <button type="button" className="btn btn-quiet btn-small" onClick={() => setShift((n) => n + 1)}>
                {p.help.more}
                <span aria-hidden="true">↻</span>
              </button>
            </div>
            <ul className="tip-cards">
              {tips.map((tip) => (
                <li key={tip.id} className="card tight stack stack-1">
                  <h3>{tip.title}</h3>
                  <p className="small ink-2">{tip.body}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {snapshot.showFertility && (snapshot.permissions.phase || snapshot.permissions.calendar) && <p className="caption">{p.estimateWarning}</p>}
      </div>
    </Screen>
  );
}

// ---- Calendar -----------------------------------------------------------------------------

function describeDay(date: ISODate, day: PartnerCalendarDay | undefined, today: ISODate): string {
  const s = strings();
  const c = s.calendar;
  const out = [formatDate(date, 'full')];
  if (date === today) out.push(c.aria.today);
  if (day?.phase && !day.period) out.push(s.phaseInSentence[day.phase]);
  if (day?.period === 'logged') out.push(c.aria.periodLogged);
  if (day?.period === 'predicted') out.push(c.aria.periodPredicted);
  if (day?.ovulation) out.push(c.aria.ovulation);
  else if (day?.fertile) out.push(c.aria.fertile);
  return out.join(', ');
}

export function PartnerCalendar() {
  const s = strings();
  const c = s.calendar;
  const p = s.partnerMode;
  const snapshot = usePartnerSnapshot();
  const today = useToday();
  const [month, setMonth] = useState(() => ({ year: parts(today).year, month: parts(today).month }));
  const [selected, setSelected] = useState<ISODate>(today);
  const headingId = useId();
  const days = useMemo(() => new Map((snapshot?.calendar ?? []).map((d) => [d.date, d])), [snapshot]);
  const journal = useMemo(() => new Map((snapshot?.journal ?? []).map((d) => [d.date, d])), [snapshot]);
  if (!snapshot) return <Waiting title={c.title} />;
  if (!snapshot.permissions.calendar) {
    return (
      <Screen title={c.title} settings profile={false}>
        <div className="stack stack-5">
          <SyncStatus />
          <p className="ink-2">{p.calendarHidden}</p>
        </div>
      </Screen>
    );
  }

  const first = snapshot.calendar?.[0]?.date;
  const last = snapshot.calendar?.at(-1)?.date;
  const monthStart = makeISO(month.year, month.month, 1);
  const monthEnd = makeISO(month.year, month.month, daysInMonth(month.year, month.month));
  const gridStart = startOfWeek(monthStart);
  const weeks: ISODate[][] = [];
  for (let d = gridStart; d <= monthEnd; d = addDays(d, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
  const shift = (delta: number) => setMonth((m) => addMonths(m.year, m.month, delta));
  const canPrev = !first || first < monthStart;
  const canNext = !last || last > monthEnd;
  const sel = days.get(selected);
  const selJournal = journal.get(selected);
  const title = formatDate(monthStart, 'monthYear');

  return (
    <Screen title={c.title} settings profile={false}>
      <div className="stack stack-5">
        <SyncStatus />
        <section className="stack stack-3" aria-label={c.gridLabel(title)}>
          <div className="cal-nav">
            <button type="button" className="icon-btn outlined" aria-label={c.prevMonth} disabled={!canPrev} onClick={() => shift(-1)}>
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <h2 className="cal-month" aria-live="polite">
              {title}
            </h2>
            <button type="button" className="icon-btn outlined" aria-label={c.nextMonth} disabled={!canNext} onClick={() => shift(1)}>
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          </div>
          <table className="cal" aria-label={c.gridLabel(title)}>
            <thead>
              <tr>
                {c.weekdaysShort.map((label, i) => (
                  <th key={label + i} scope="col" abbr={c.weekdaysLong[i]}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week[0]}>
                  {week.map((date, col) => {
                    const day = days.get(date);
                    const phase = day?.phase;
                    const prev = col > 0 ? days.get(week[col - 1]!)?.phase : undefined;
                    const nextPhase = col < 6 ? days.get(week[col + 1]!)?.phase : undefined;
                    const run = phase
                      ? prev === phase
                        ? nextPhase === phase
                          ? 'mid'
                          : 'end'
                        : nextPhase === phase
                          ? 'start'
                          : 'single'
                      : undefined;
                    const inMonth = date >= monthStart && date <= monthEnd;
                    return (
                      <td key={date} className={inMonth ? 'cal-cell' : 'cal-cell outside'} data-phase={phase} data-run={run}>
                        <button
                          type="button"
                          className="cal-day"
                          aria-label={describeDay(date, day, today)}
                          aria-current={date === today ? 'date' : undefined}
                          aria-pressed={date === selected}
                          onClick={() => setSelected(date)}
                        >
                          <span className="cal-num" data-period={day?.period} data-ovulation={day?.ovulation ? '' : undefined}>
                            {parts(date).day}
                          </span>
                          <span className="cal-marks" aria-hidden="true">
                            {day?.fertile && <i className="mark mark-fertile" />}
                            {journal.has(date) && <i className="mark mark-entry" />}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card tight stack stack-2" aria-live="polite" aria-labelledby={`${headingId}-day`}>
          <h2 id={`${headingId}-day`} className="cal-detail-title">
            {formatDate(selected, 'weekdayDayMonth')}
          </h2>
          {sel?.phase && (
            <p className="phase-line" data-phase={sel.phase}>
              <span className="swatch" aria-hidden="true" />
              <span>{s.phase[sel.phase]}</span>
            </p>
          )}
          <ul className="small ink-2 stack stack-1">
            {sel?.period === 'logged' && <li>{c.legend.periodLogged}</li>}
            {sel?.period === 'predicted' && <li>{c.detail.periodPredicted}</li>}
            {sel?.ovulation && <li>{c.detail.ovulation}</li>}
            {sel?.fertile && !sel.ovulation && <li>{c.detail.fertile}</li>}
          </ul>
          {selJournal && <DayTags day={selJournal} />}
          {!sel && !selJournal && <p className="small ink-2">{c.detail.noInfo}</p>}
        </section>

        <ul className="cal-legend" aria-label={c.legend.title}>
          {PHASES.filter((ph) => snapshot.showFertility || ph === 'menstruation').map((ph) => (
            <li key={ph} data-phase={ph}>
              <span className="legend-band" aria-hidden="true" />
              {s.phase[ph]}
            </li>
          ))}
          <li>
            <span className="cal-num legend-num" data-period="predicted" aria-hidden="true" />
            {c.legend.periodPredicted}
          </li>
          {snapshot.showFertility && (
            <li>
              <span className="legend-mark" aria-hidden="true">
                <i className="mark mark-fertile" />
              </span>
              {c.legend.fertile}
            </li>
          )}
        </ul>
        {snapshot.showFertility && <p className="caption">{p.estimateWarning}</p>}
      </div>
    </Screen>
  );
}

// ---- Istoric ------------------------------------------------------------------------------

export function PartnerHistory() {
  const s = strings();
  const h = s.partnerMode.history;
  const snapshot = usePartnerSnapshot();
  if (!snapshot) return <Waiting title={h.title} />;
  const days = snapshot.journal ?? [];
  return (
    <Screen title={h.title} subtitle={snapshot.permissions.journal ? h.lead : undefined} settings profile={false}>
      <div className="stack stack-5">
        <SyncStatus />
        {!snapshot.permissions.journal ? (
          <p className="ink-2">{h.hidden}</p>
        ) : days.length === 0 ? (
          <p className="ink-2">{h.empty}</p>
        ) : (
          <ul className="stack stack-3">
            {days.map((day) => (
              <li key={day.date} className="card tight stack stack-2">
                <h2 className="h3-like cal-detail-title">{formatDate(day.date, 'weekdayDayMonth')}</h2>
                <DayTags day={day} />
                {day.note && (
                  <p className="small">
                    <span className="strong">{h.note}: </span>
                    {day.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Screen>
  );
}

// ---- Setări -------------------------------------------------------------------------------

export function PartnerSettings() {
  const s = strings();
  const p = s.partnerMode.settings;
  const pr = s.settings.privacy;
  const view = useData().partnerView;
  const hasPin = useHasPin();
  const storage = useStorageMode();
  const [pinMode, setPinMode] = useState<PinMode | null>(null);
  const [confirm, setConfirm] = useState(false);
  const rows: Array<{ route: Route; icon: typeof Palette; text: { title: string; hint: string } }> = [
    { route: 'setari-aspect', icon: Palette, text: s.settings.sections.appearance },
    { route: 'setari-despre', icon: CircleHelp, text: s.settings.sections.about },
  ];
  return (
    <Screen title={p.title} back>
      <div className="stack stack-6">
        <section className="settings-group" aria-labelledby="partner-connection">
          <h2 id="partner-connection">{p.connection}</h2>
          <div className="card tight stack stack-2">
            <p className="phase-line">
              <Users size={18} aria-hidden="true" />
              <span>{view && p.connectedSince(formatDate(todayISO(new Date(view.connectedAt)), 'long'))}</span>
            </p>
            <p className="small ink-2">{view?.checkedAt ? p.lastUpdate(relativeTime(Date.parse(view.checkedAt))) : p.never}</p>
            <div>
              <button type="button" className="btn btn-danger-quiet btn-small" onClick={() => setConfirm(true)}>
                {p.disconnect}
              </button>
            </div>
          </div>
        </section>

        {storage !== 'plain' && (
          <section className="settings-group" aria-labelledby="partner-lock">
            <h2 id="partner-lock">{pr.lockTitle}</h2>
            <div className="card tight stack stack-3">
              <p className="small ink-2 phase-line">
                <ShieldCheck size={16} aria-hidden="true" />
                <span>{pr.pinHint}</span>
              </p>
              <div className="row">
                {hasPin ? (
                  <>
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => setPinMode('change')}>
                      {pr.changePin}
                    </button>
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => setPinMode('remove')}>
                      {pr.removePin}
                    </button>
                    <button type="button" className="btn btn-quiet btn-small" onClick={() => void lock()}>
                      {pr.lockNow}
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn-primary btn-small" onClick={() => setPinMode('set')}>
                    {pr.setPin}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        <ul className="list">
          {rows.map(({ route, icon: Icon, text }) => (
            <li key={route}>
              <a
                className="list-row"
                href={`#${route}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(route);
                }}
              >
                <Icon size={22} aria-hidden="true" />
                <span className="grow">
                  <span className="strong">{text.title}</span>
                  <span className="caption">{text.hint}</span>
                </span>
                <Chevron size={20} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <div>
          <InstallButton className="btn btn-secondary btn-small" />
        </div>
      </div>

      <PinSheet mode={pinMode} onClose={() => setPinMode(null)} />
      <ConfirmSheet
        open={confirm}
        title={p.disconnectTitle}
        body={p.disconnectBody}
        confirmLabel={p.disconnectConfirm}
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          void wipeEverything();
        }}
      />
    </Screen>
  );
}

export const PARTNER_TABS: TabItem[] = [
  { route: 'azi', icon: CircleDot, label: () => strings().partnerMode.nav.today },
  { route: 'calendar', icon: CalendarDays, label: () => strings().partnerMode.nav.calendar },
  { route: 'jurnal', icon: History, label: () => strings().partnerMode.nav.history },
];

export const partnerRoutes = (route: Route): ReactNode => {
  switch (route) {
    case 'calendar':
      return <PartnerCalendar />;
    case 'jurnal':
      return <PartnerHistory />;
    case 'setari':
    case 'profil':
      return <PartnerSettings />;
    case 'setari-aspect':
      return <AppearanceSettings />;
    case 'setari-despre':
      return <About />;
    default:
      return <PartnerToday />;
  }
};
