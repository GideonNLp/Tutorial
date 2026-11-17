import { diffDays } from '../domain/dates';
import { FERTILE_DAYS_AFTER, FERTILE_DAYS_BEFORE, ovulationOffset, phaseAt, type Timeline } from '../domain/prediction';
import type { Phase } from '../domain/types';
import { strings } from '../i18n';

/**
 * The cycle as a dial: day 1 at the top, clockwise. Phase arcs are estimates for the running cycle,
 * the bead marks today, the dashed arc at the top is the interval in which the next period is expected,
 * and the dotted arc marks the estimated fertile days.
 */

const SIZE = 280;
const C = SIZE / 2;
const R = 104; // ring radius
const RING = 20; // ring thickness
const OUTER = R + 19; // radius of the outer track (fertile days, next-period interval)
const GAP = 2 / (2 * Math.PI * R); // 2px between arcs, as a fraction of the circle

function point(fraction: number, radius: number): [number, number] {
  const angle = fraction * 2 * Math.PI - Math.PI / 2;
  return [C + radius * Math.cos(angle), C + radius * Math.sin(angle)];
}

function arc(from: number, to: number, radius: number): string {
  const [x1, y1] = point(from, radius);
  const [x2, y2] = point(to, radius);
  const large = to - from > 0.5 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/**
 * What an arc of the dial stands for: one of the four phases, `overdue` (days after the expected
 * start of a period that has not come), or `rest` (everything but menstruation, when the person
 * switched phase and fertility estimates off).
 */
export type SpanKind = Phase | 'overdue' | 'rest';

export interface PhaseSpan {
  kind: SpanKind;
  /** 1-based cycle days, inclusive. */
  from: number;
  to: number;
}

/** Spans of the running cycle, for the dial and the legend under it. */
export function phaseSpans(timeline: Timeline, showFertility: boolean): { spans: PhaseSpan[]; total: number } {
  const { prediction } = timeline;
  const current = prediction.current;
  if (!current) return { spans: [], total: prediction.cycleLength };
  const total = Math.max(prediction.cycleLength, current.cycleDay);
  const periodEnd = diffDays(current.periodEnd, current.start);
  const spans: PhaseSpan[] = [];
  for (let d = 0; d < total; d++) {
    let kind: SpanKind = d >= prediction.cycleLength ? 'overdue' : phaseAt(d, prediction.cycleLength, periodEnd);
    if (!showFertility && kind !== 'menstruation' && kind !== 'overdue') kind = 'rest';
    const last = spans[spans.length - 1];
    if (last && last.kind === kind) last.to = d + 1;
    else spans.push({ kind, from: d + 1, to: d + 1 });
  }
  return { spans, total };
}

const strokeOf = (kind: SpanKind) => (kind === 'overdue' || kind === 'rest' ? 'var(--line-strong)' : `var(--${kind})`);

export function CycleDial({ timeline, showFertility, phaseLabel }: { timeline: Timeline; showFertility: boolean; phaseLabel: string }) {
  const s = strings();
  const { prediction } = timeline;
  const current = prediction.current;
  const { spans, total } = phaseSpans(timeline, showFertility);
  const late = prediction.status === 'late';

  if (!current) {
    return (
      <div className="dial-wrap" role="img" aria-label={s.today.dialEmpty}>
        <svg className="dial" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <circle cx={C} cy={C} r={R} fill="none" stroke="var(--line)" strokeWidth={RING} />
        </svg>
        <div className="dial-center" aria-hidden="true">
          <span className="dial-day muted">–</span>
        </div>
      </div>
    );
  }

  const ov = ovulationOffset(prediction.cycleLength);
  const fertileFrom = Math.max(0, ov - FERTILE_DAYS_BEFORE) / total;
  const fertileTo = Math.min(total, ov + FERTILE_DAYS_AFTER + 1) / total;
  const h = Math.min(prediction.halfWidth, Math.floor(total / 2) - 1) / total;
  const today = (current.cycleDay - 0.5) / total;
  const [bx, by] = point(today, R);
  const [ox, oy] = point((ov + 0.5) / total, OUTER);
  const ticks = [1, 7, 14, 21, 28, 35, 42].filter((d) => d <= total && (d === 1 || total - d >= 3));

  return (
    <div className="dial-wrap" role="img" aria-label={s.today.dialLabel(current.cycleDay, phaseLabel)}>
      <svg className="dial" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        {spans.map((span) => (
          <path
            key={span.from}
            d={arc((span.from - 1) / total + GAP / 2, span.to / total - GAP / 2, R)}
            fill="none"
            stroke={strokeOf(span.kind)}
            strokeWidth={RING}
          />
        ))}
        {ticks.map((d) => {
          const [x, y] = point((d - 0.5) / total, R - RING / 2 - 12);
          return (
            <text key={d} x={x} y={y} className="dial-tick" textAnchor="middle" dominantBaseline="central">
              {d}
            </text>
          );
        })}
        {showFertility && (
          <>
            <path
              d={arc(fertileFrom, fertileTo, OUTER)}
              fill="none"
              stroke="var(--ovulation)"
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray="0.1 8"
            />
            <circle cx={ox} cy={oy} r={5.5} fill="var(--ovulation)" stroke="var(--surface)" strokeWidth={2} />
          </>
        )}
        {!late && (
          <>
            <path d={arc(1 - h, 0.9999, OUTER)} fill="none" stroke="var(--menstruation)" strokeWidth={4} strokeDasharray="7 5" />
            <path d={arc(0, h, OUTER)} fill="none" stroke="var(--menstruation)" strokeWidth={4} strokeDasharray="7 5" />
          </>
        )}
        <circle cx={bx} cy={by} r={15} fill="var(--surface)" stroke="var(--ink)" strokeWidth={3.5} />
        <circle cx={bx} cy={by} r={4.5} fill="var(--ink)" />
      </svg>
      <div className="dial-center" aria-hidden="true">
        <span className="dial-day">{s.today.cycleDay(current.cycleDay)}</span>
        {phaseLabel && <span className="dial-phase">{phaseLabel}</span>}
      </div>
    </div>
  );
}
