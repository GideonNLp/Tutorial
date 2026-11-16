import { ChevronLeft, ChevronRight, Info, Pencil } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { update, useData, useTimeline, useToday } from '../app/store';
import { openJournal, selectCalendarDay, shiftMonth, toast, useCalendarMonth, useCalendarSelected, useCalendarYear } from '../app/ui';
import { addDays, addMonths, daysInMonth, makeISO, monthGrid, parts, startOfWeek } from '../domain/dates';
import { updateDay } from '../domain/journal';
import type { DayInfo } from '../domain/prediction';
import { isPeriodFlow, PHASES, type ISODate } from '../domain/types';
import { formatDate, strings } from '../i18n';
import { Notice, Screen } from '../ui/Shell';
import { summarizeLog, visiblePhase } from '../ui/summaries';

export function CalendarScreen() {
  const s = strings();
  const c = s.calendar;
  const data = useData();
  const today = useToday();
  const timeline = useTimeline();
  const year = useCalendarYear();
  const month = useCalendarMonth();
  const selected = useCalendarSelected();
  const showFertility = data.profile.showFertility;
  const [editing, setEditing] = useState(false);
  const [focusTarget, setFocusTarget] = useState<ISODate | null>(null);
  const gridRef = useRef<HTMLTableElement>(null);

  const weeks = useMemo(() => monthGrid(year, month), [year, month]);
  const infos = useMemo(() => {
    const map = new Map<ISODate, DayInfo>();
    for (const date of weeks.flat()) map.set(date, timeline.dayInfo(date));
    return map;
  }, [weeks, timeline]);

  useEffect(() => {
    if (!focusTarget) return;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusTarget}"]`)?.focus();
    setFocusTarget(null);
  }, [focusTarget, year, month]);

  const monthStart = makeISO(year, month, 1);
  const monthEnd = makeISO(year, month, daysInMonth(year, month));
  const inMonth = (date: ISODate) => date >= monthStart && date <= monthEnd;
  // Roving tabindex: exactly one day is in the tab order.
  const tabDate = inMonth(selected) ? selected : inMonth(today) ? today : monthStart;
  const monthTitle = formatDate(monthStart, 'monthYear');
  const todayParts = parts(today);
  const onCurrentMonth = todayParts.year === year && todayParts.month === month;

  const togglePeriod = (date: ISODate) => {
    if (date > today) return;
    const marked = isPeriodFlow(data.logs[date]?.flow);
    update((d) => ({ ...d, logs: updateDay(d.logs, date, { flow: marked ? undefined : 'unspecified' }, new Date().toISOString()) }));
    const label = formatDate(date, 'dayMonthLong');
    toast(marked ? c.edit.unmarked(label) : c.edit.marked(label));
  };

  const moveTo = (date: ISODate) => {
    selectCalendarDay(date);
    setFocusTarget(date);
  };

  const onKeyDown = (event: KeyboardEvent, date: ISODate) => {
    const { year: y, month: m, day } = parts(date);
    const sameDayIn = (delta: number) => {
      const target = addMonths(y, m, delta);
      return makeISO(target.year, target.month, Math.min(day, daysInMonth(target.year, target.month)));
    };
    const targets: Record<string, ISODate> = {
      ArrowLeft: addDays(date, -1),
      ArrowRight: addDays(date, 1),
      ArrowUp: addDays(date, -7),
      ArrowDown: addDays(date, 7),
      Home: startOfWeek(date),
      End: addDays(startOfWeek(date), 6),
      PageUp: sameDayIn(-1),
      PageDown: sameDayIn(1),
    };
    const target = targets[event.key];
    if (target) {
      event.preventDefault();
      moveTo(target);
    }
  };

  const describe = (date: ISODate, info: DayInfo): string => {
    const partsList = [formatDate(date, 'full')];
    if (date === today) partsList.push(c.aria.today);
    if (info.cycleDay) partsList.push(c.aria.cycleDay(info.cycleDay));
    const phase = visiblePhase(info.phase, showFertility);
    if (phase && !info.periodLogged && !info.periodPredicted) partsList.push(s.phaseInSentence[phase]);
    if (info.periodLogged) partsList.push(c.aria.periodLogged);
    if (info.periodPredicted) partsList.push(c.aria.periodPredicted);
    if (showFertility && info.ovulationDay) partsList.push(c.aria.ovulation);
    else if (showFertility && info.fertile) partsList.push(c.aria.fertile);
    if (info.intermenstrualBleed) partsList.push(c.aria.bleed);
    if (info.spotting) partsList.push(c.aria.spotting);
    if (info.overdue) partsList.push(c.aria.overdue);
    if (hasEntry(date)) partsList.push(c.aria.entry);
    return partsList.join(', ');
  };

  const hasEntry = (date: ISODate) => {
    const log = data.logs[date];
    return (
      !!log &&
      (log.note !== undefined ||
        log.symptoms !== undefined ||
        log.mood !== undefined ||
        log.energy !== undefined ||
        log.bbt !== undefined ||
        log.mucus !== undefined)
    );
  };

  const selectedInfo = timeline.dayInfo(selected);
  const selectedPhase = visiblePhase(selectedInfo.phase, showFertility);
  const selectedSummary = summarizeLog(data.logs[selected]);

  return (
    <Screen title={c.title} settings>
      <div className="cal-layout">
        <section className="stack stack-3" aria-label={c.gridLabel(monthTitle)}>
          <div className="cal-nav">
            <button type="button" className="icon-btn outlined" aria-label={c.prevMonth} onClick={() => shiftMonth(-1)}>
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <h2 className="cal-month" aria-live="polite">
              {monthTitle}
            </h2>
            <button type="button" className="icon-btn outlined" aria-label={c.nextMonth} onClick={() => shiftMonth(1)}>
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          </div>

          <table className={editing ? 'cal editing' : 'cal'} role="grid" aria-label={c.gridLabel(monthTitle)} ref={gridRef}>
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
                    const info = infos.get(date)!;
                    const phase = visiblePhase(info.phase, showFertility);
                    const prev = col > 0 ? visiblePhase(infos.get(week[col - 1]!)!.phase, showFertility) : undefined;
                    const next = col < 6 ? visiblePhase(infos.get(week[col + 1]!)!.phase, showFertility) : undefined;
                    const run = phase ? (prev === phase ? (next === phase ? 'mid' : 'end') : next === phase ? 'start' : 'single') : undefined;
                    const marked = isPeriodFlow(data.logs[date]?.flow);
                    const period = info.periodLogged ? 'logged' : info.periodPredicted ? 'predicted' : undefined;
                    return (
                      <td
                        key={date}
                        role="gridcell"
                        className={inMonth(date) ? 'cal-cell' : 'cal-cell outside'}
                        data-phase={phase}
                        data-run={run}
                        aria-selected={!editing && date === selected ? true : undefined}
                      >
                        <button
                          type="button"
                          className="cal-day"
                          data-date={date}
                          tabIndex={date === tabDate ? 0 : -1}
                          aria-label={describe(date, info)}
                          aria-current={date === today ? 'date' : undefined}
                          aria-pressed={editing ? marked : undefined}
                          disabled={editing && date > today}
                          onClick={() => (editing ? togglePeriod(date) : selectCalendarDay(date))}
                          onKeyDown={(e) => onKeyDown(e, date)}
                        >
                          <span className="cal-num" data-period={period} data-ovulation={showFertility && info.ovulationDay ? '' : undefined}>
                            {parts(date).day}
                          </span>
                          <span className="cal-marks" aria-hidden="true">
                            {showFertility && info.fertile && <i className="mark mark-fertile" />}
                            {(info.intermenstrualBleed || info.spotting) && <i className="mark mark-bleed" />}
                            {hasEntry(date) && <i className="mark mark-entry" />}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="row row-between">
            {editing ? (
              <button type="button" className="btn btn-primary btn-small" onClick={() => setEditing(false)}>
                {c.edit.done}
              </button>
            ) : (
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setEditing(true)}>
                <Pencil size={16} aria-hidden="true" />
                {c.edit.start}
              </button>
            )}
            {!onCurrentMonth && (
              <button type="button" className="btn btn-quiet btn-small" onClick={() => selectCalendarDay(today)}>
                {c.goToday}
              </button>
            )}
          </div>
          {editing && <p className="small ink-2">{c.edit.hint}</p>}
        </section>

        <div className="stack stack-5">
          {!editing && (
            <section className="card tight stack stack-2" aria-live="polite" aria-labelledby="day-heading">
              <h2 id="day-heading" className="cal-detail-title">
                {formatDate(selected, 'weekdayDayMonth')}
              </h2>
              {selectedInfo.cycleDay ? (
                <p className="phase-line" data-phase={selectedPhase}>
                  {selectedPhase && <span className="swatch" aria-hidden="true" />}
                  <span>
                    <span className="strong">{c.detail.cycleDay(selectedInfo.cycleDay)}</span>
                    {selectedPhase && !selectedInfo.periodPredicted ? `, ${s.phaseInSentence[selectedPhase]}` : ''}
                    {selectedInfo.forecast && selected !== today ? ` (${s.common.estimate})` : ''}
                  </span>
                </p>
              ) : (
                <p className="ink-2">{c.detail.noInfo}</p>
              )}
              {(selectedInfo.periodPredicted ||
                selectedInfo.overdue ||
                (showFertility && (selectedInfo.fertile || selectedInfo.ovulationDay)) ||
                selectedInfo.intermenstrualBleed) && (
                <ul className="small ink-2 stack stack-1">
                  {selectedInfo.periodPredicted && <li>{c.detail.periodPredicted}</li>}
                  {selectedInfo.overdue && <li>{c.detail.overdue}</li>}
                  {showFertility && selectedInfo.ovulationDay && <li>{c.detail.ovulation}</li>}
                  {showFertility && selectedInfo.fertile && !selectedInfo.ovulationDay && <li>{c.detail.fertile}</li>}
                  {selectedInfo.intermenstrualBleed && <li>{c.detail.bleed}</li>}
                </ul>
              )}
              {selected > today ? (
                <p className="small ink-2">{c.detail.future}</p>
              ) : (
                <>
                  <p className="small">{selectedSummary.length ? `${selectedSummary.join(', ')}.` : c.detail.nothing}</p>
                  <button type="button" className="btn btn-secondary btn-small" onClick={() => openJournal(selected)}>
                    {c.detail.open}
                  </button>
                </>
              )}
            </section>
          )}

          <section aria-labelledby="legend-heading" className="stack stack-2">
            <h2 id="legend-heading" className="h3-like">
              {c.legend.title}
            </h2>
            <ul className="cal-legend">
              {PHASES.filter((p) => showFertility || p === 'menstruation').map((p) => (
                <li key={p} data-phase={p}>
                  <span className="legend-band" aria-hidden="true" />
                  {s.phase[p]}
                </li>
              ))}
              <li>
                <span className="cal-num legend-num" data-period="logged" aria-hidden="true" />
                {c.legend.periodLogged}
              </li>
              <li>
                <span className="cal-num legend-num" data-period="predicted" aria-hidden="true" />
                {c.legend.periodPredicted}
              </li>
              {showFertility && (
                <>
                  <li>
                    <span className="cal-num legend-num" data-ovulation="" aria-hidden="true" />
                    {c.legend.ovulation}
                  </li>
                  <li>
                    <span className="legend-mark" aria-hidden="true">
                      <i className="mark mark-fertile" />
                    </span>
                    {c.legend.fertile}
                  </li>
                </>
              )}
              <li>
                <span className="legend-mark" aria-hidden="true">
                  <i className="mark mark-bleed" />
                </span>
                {c.legend.bleed}
              </li>
              <li>
                <span className="legend-mark" aria-hidden="true">
                  <i className="mark mark-entry" />
                </span>
                {c.legend.entry}
              </li>
            </ul>
            {showFertility && (
              <Notice icon={<Info size={18} aria-hidden="true" />}>
                <p>{data.profile.goals.includes('contraception') ? s.contraceptionGoalWarning : s.contraceptionWarning}</p>
              </Notice>
            )}
          </section>
        </div>
      </div>
    </Screen>
  );
}
