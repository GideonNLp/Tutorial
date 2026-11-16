import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { addDays, fromDayNumber, parts, toDayNumber } from '../domain/dates';
import type { BbtPoint, CycleRow, WeekPoint } from '../domain/stats';
import type { ISODate } from '../domain/types';
import { formatDate, formatNumber, strings } from '../i18n';

/**
 * Charts, drawn as plain SVG at the container's real pixel width (so text never scales).
 * Rules followed throughout: thin marks, hairline solid grid, a 2px surface gap between touching
 * fills, one y-axis per chart, text in text colours (never the series colour), a legend whenever
 * there are two series, a tooltip on hover / arrow keys, and a table with the same numbers.
 */

function useWidth(): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(240, Math.round(el.clientWidth)));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/** Which mark the pointer or the arrow keys are on. */
function useCursor(count: number) {
  const [index, setIndex] = useState<number | null>(null);
  const clamp = (i: number) => Math.min(count - 1, Math.max(0, i));
  const onKeyDown = (e: KeyboardEvent) => {
    const next: Record<string, number | null> = {
      ArrowRight: clamp((index ?? -1) + 1),
      ArrowLeft: clamp((index ?? count) - 1),
      Home: 0,
      End: count - 1,
      Escape: null,
    };
    if (e.key in next) {
      e.preventDefault();
      setIndex(next[e.key]!);
    }
  };
  return { index, setIndex, clamp, onKeyDown };
}

function pointerX(e: PointerEvent<SVGSVGElement>): number {
  return e.clientX - e.currentTarget.getBoundingClientRect().left;
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const shift = x < 84 ? '-16px' : x > width - 84 ? 'calc(-100% + 16px)' : '-50%';
  return (
    <div className="chart-tip" style={{ left: x, top: y, transform: `translate(${shift}, calc(-100% - 8px))` }} aria-hidden="true">
      {children}
    </div>
  );
}

export function ChartFrame(props: {
  title: string;
  subtitle?: string;
  legend?: ReactNode;
  note?: ReactNode;
  table?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="chart">
      <figcaption className="chart-head stack stack-1">
        <h2>{props.title}</h2>
        {props.subtitle && <p className="caption">{props.subtitle}</p>}
      </figcaption>
      {props.children}
      {props.legend}
      {props.note}
      {props.table && (
        <details className="table-view">
          <summary>{strings().stats.table}</summary>
          <div className="table-scroll">{props.table}</div>
        </details>
      )}
    </figure>
  );
}

const dayMonth = (iso: ISODate) => {
  const { day, month } = parts(iso);
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}`;
};

/** Top-rounded column (square at the baseline). */
function column(x: number, top: number, width: number, bottom: number, radius = 4): string {
  const r = Math.min(radius, width / 2, Math.max(0, bottom - top));
  return `M${x} ${bottom}V${top + r}Q${x} ${top} ${x + r} ${top}H${x + width - r}Q${x + width} ${top} ${x + width} ${top + r}V${bottom}Z`;
}

// ---------------------------------------------------------------- cycle lengths

export function CycleLengthChart({ rows, label }: { rows: CycleRow[]; label: string }) {
  const s = strings();
  const [ref, W] = useWidth();
  const cursor = useCursor(rows.length);
  const H = 208;
  const m = { l: 28, r: 8, t: 22, b: 26 };
  const plotW = W - m.l - m.r;
  const plotH = H - m.t - m.b;
  const yMax = Math.max(40, Math.ceil(Math.max(...rows.map((r) => r.length ?? 0)) / 10) * 10);
  const y = (v: number) => m.t + plotH - (v / yMax) * plotH;
  const slot = plotW / rows.length;
  const barW = Math.min(24, slot * 0.62);
  const cx = (i: number) => m.l + slot * (i + 0.5);
  const ticks = Array.from({ length: yMax / 10 + 1 }, (_, i) => i * 10);
  const labelEvery = slot < 34 ? 2 : 1;
  const active = cursor.index !== null ? rows[cursor.index] : undefined;

  return (
    <div className="chart-plot">
      <div className="chart-canvas" ref={ref} style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          role="img"
          aria-label={label}
          tabIndex={0}
          onKeyDown={cursor.onKeyDown}
          onBlur={() => cursor.setIndex(null)}
          onPointerMove={(e) => cursor.setIndex(cursor.clamp(Math.floor((pointerX(e) - m.l) / slot)))}
          onPointerDown={(e) => cursor.setIndex(cursor.clamp(Math.floor((pointerX(e) - m.l) / slot)))}
          onPointerLeave={() => cursor.setIndex(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className={t === 0 ? 'chart-baseline' : 'chart-grid'} x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} />
              <text className="chart-axis" x={m.l - 6} y={y(t)} textAnchor="end" dominantBaseline="central">
                {t}
              </text>
            </g>
          ))}
          {rows.map((row, i) => {
            const length = row.length ?? 0;
            const period = Math.min(row.periodLength, length);
            const x = cx(i) - barW / 2;
            const dim = cursor.index !== null && cursor.index !== i;
            return (
              <g key={row.start} opacity={dim ? 0.45 : 1}>
                {/* period days at the base, the rest of the cycle above, separated by a 2px gap */}
                <rect x={x} y={y(period)} width={barW} height={y(0) - y(period)} fill="var(--menstruation)" />
                <path d={column(x, y(length), barW, y(period) - 2)} fill="var(--ink-2)" />
                <text className="chart-value" x={cx(i)} y={y(length) - 7} textAnchor="middle">
                  {length}
                </text>
                {(rows.length - 1 - i) % labelEvery === 0 && (
                  <text className="chart-axis" x={cx(i)} y={H - 8} textAnchor="middle">
                    {dayMonth(row.start)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {active && cursor.index !== null && (
          <Tooltip x={cx(cursor.index)} y={y(active.length ?? 0) - 14} width={W}>
            <strong>{s.common.days(active.length ?? 0)}</strong>
            <br />
            {formatDate(active.start, 'long')}, {s.stats.cycles.period(active.periodLength)}
          </Tooltip>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- mood and energy

interface LineSeries {
  key: 'mood' | 'energy';
  color: string;
}
const SERIES: LineSeries[] = [
  { key: 'mood', color: 'var(--ink)' },
  { key: 'energy', color: 'var(--line-strong)' },
];

export function MoodChart({ points, periods, label }: { points: WeekPoint[]; periods: Array<[ISODate, ISODate]>; label: string }) {
  const s = strings();
  const [ref, W] = useWidth();
  const cursor = useCursor(points.length);
  const H = 196;
  const m = { l: 22, r: 12, t: 12, b: 24 };
  const plotW = W - m.l - m.r;
  const plotH = H - m.t - m.b;
  const d0 = toDayNumber(points[0]!.weekStart);
  const d1 = toDayNumber(points[points.length - 1]!.weekStart) + 6;
  const x = (dayNumber: number) => m.l + ((dayNumber - d0) / (d1 - d0)) * plotW;
  const y = (v: number) => m.t + plotH - ((v - 1) / 4) * plotH;
  const centers = points.map((p) => x(toDayNumber(p.weekStart) + 3));

  const path = (key: LineSeries['key']) => {
    let d = '';
    let pen = false;
    points.forEach((p, i) => {
      const v = p[key];
      if (v === undefined) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${centers[i]!.toFixed(1)} ${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const isolated = (key: LineSeries['key'], i: number) =>
    points[i]![key] !== undefined && points[i - 1]?.[key] === undefined && points[i + 1]?.[key] === undefined;
  const lastIndex = (key: LineSeries['key']) => {
    for (let i = points.length - 1; i >= 0; i--) if (points[i]![key] !== undefined) return i;
    return -1;
  };

  // Month names along the x-axis, at the first day of each month inside the range.
  const months: Array<{ at: number; label: string }> = [];
  for (let n = d0; n <= d1; n++) {
    const iso = fromDayNumber(n);
    if (iso.endsWith('-01') && x(n) < W - m.r - 24) months.push({ at: x(n), label: formatDate(iso, 'monthShort') });
  }

  const nearest = (px: number) => {
    let best = 0;
    centers.forEach((c, i) => {
      if (Math.abs(c - px) < Math.abs(centers[best]! - px)) best = i;
    });
    return best;
  };
  const active = cursor.index !== null ? points[cursor.index] : undefined;

  return (
    <div className="chart-plot">
      <div className="chart-canvas" ref={ref} style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          role="img"
          aria-label={label}
          tabIndex={0}
          onKeyDown={cursor.onKeyDown}
          onBlur={() => cursor.setIndex(null)}
          onPointerMove={(e) => cursor.setIndex(nearest(pointerX(e)))}
          onPointerDown={(e) => cursor.setIndex(nearest(pointerX(e)))}
          onPointerLeave={() => cursor.setIndex(null)}
        >
          {periods.map(([from, to]) => {
            const left = Math.max(m.l, x(toDayNumber(from)));
            const right = Math.min(W - m.r, x(toDayNumber(to) + 1));
            return right > left ? <rect key={from} x={left} y={m.t} width={right - left} height={plotH} fill="var(--menstruation-tint)" /> : null;
          })}
          {[1, 2, 3, 4, 5].map((t) => (
            <g key={t}>
              <line className={t === 1 ? 'chart-baseline' : 'chart-grid'} x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} />
              <text className="chart-axis" x={m.l - 8} y={y(t)} textAnchor="end" dominantBaseline="central">
                {t}
              </text>
            </g>
          ))}
          {months.map((mo) => (
            <text key={mo.at} className="chart-axis" x={mo.at} y={H - 7}>
              {mo.label}
            </text>
          ))}
          {active && cursor.index !== null && (
            <line className="chart-baseline" x1={centers[cursor.index]} x2={centers[cursor.index]} y1={m.t} y2={m.t + plotH} />
          )}
          {SERIES.map((series) => {
            const last = lastIndex(series.key);
            return (
              <g key={series.key}>
                <path d={path(series.key)} fill="none" stroke={series.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {points.map((p, i) =>
                  isolated(series.key, i) && i !== last ? (
                    <circle key={p.weekStart} cx={centers[i]} cy={y(p[series.key]!)} r={3} fill={series.color} />
                  ) : null,
                )}
                {last >= 0 && (
                  <circle cx={centers[last]} cy={y(points[last]![series.key]!)} r={4.5} fill={series.color} stroke="var(--surface)" strokeWidth={2} />
                )}
                {active && cursor.index !== null && active[series.key] !== undefined && (
                  <circle
                    cx={centers[cursor.index]}
                    cy={y(active[series.key]!)}
                    r={4.5}
                    fill={series.color}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                )}
              </g>
            );
          })}
        </svg>
        {active && cursor.index !== null && (
          <Tooltip x={centers[cursor.index]!} y={m.t + 26} width={W}>
            {s.stats.mood.weekOf(formatDate(active.weekStart, 'dayMonth'))}
            <br />
            <strong>{active.mood !== undefined ? formatNumber(active.mood, 1) : s.stats.mood.noValue}</strong> {s.stats.mood.mood.toLowerCase()}
            <br />
            <strong>{active.energy !== undefined ? formatNumber(active.energy, 1) : s.stats.mood.noValue}</strong> {s.stats.mood.energy.toLowerCase()}
          </Tooltip>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- basal temperature

export function BbtChart({
  points,
  periods,
  from,
  to,
  label,
}: {
  points: BbtPoint[];
  periods: Array<[ISODate, ISODate]>;
  from: ISODate;
  to: ISODate;
  label: string;
}) {
  const s = strings();
  const [ref, W] = useWidth();
  const cursor = useCursor(points.length);
  const H = 196;
  const m = { l: 34, r: 12, t: 12, b: 24 };
  const plotW = W - m.l - m.r;
  const plotH = H - m.t - m.b;
  const d0 = toDayNumber(from);
  const d1 = toDayNumber(to);
  const values = points.map((p) => p.celsius);
  const lo = Math.floor((Math.min(...values) - 0.05) * 5) / 5;
  const hi = Math.ceil((Math.max(...values) + 0.05) * 5) / 5;
  const x = (dayNumber: number) => m.l + ((dayNumber - d0) / Math.max(1, d1 - d0)) * plotW;
  const y = (v: number) => m.t + plotH - ((v - lo) / Math.max(0.2, hi - lo)) * plotH;
  const xs = points.map((p) => x(toDayNumber(p.date)));
  const step = hi - lo > 1.2 ? 0.4 : 0.2;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + 1e-9; t += step) ticks.push(Math.round(t * 10) / 10);
  const weeks: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 7)) weeks.push(d);

  const nearest = (px: number) => {
    let best = 0;
    xs.forEach((c, i) => {
      if (Math.abs(c - px) < Math.abs(xs[best]! - px)) best = i;
    });
    return best;
  };
  const active = cursor.index !== null ? points[cursor.index] : undefined;
  const last = points.length - 1;

  return (
    <div className="chart-plot">
      <div className="chart-canvas" ref={ref} style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          role="img"
          aria-label={label}
          tabIndex={0}
          onKeyDown={cursor.onKeyDown}
          onBlur={() => cursor.setIndex(null)}
          onPointerMove={(e) => cursor.setIndex(nearest(pointerX(e)))}
          onPointerDown={(e) => cursor.setIndex(nearest(pointerX(e)))}
          onPointerLeave={() => cursor.setIndex(null)}
        >
          {periods.map(([pf, pt]) => {
            const left = Math.max(m.l, x(toDayNumber(pf) - 0.5));
            const right = Math.min(W - m.r, x(toDayNumber(pt) + 0.5));
            return right > left ? <rect key={pf} x={left} y={m.t} width={right - left} height={plotH} fill="var(--menstruation-tint)" /> : null;
          })}
          {ticks.map((t, i) => (
            <g key={t}>
              <line className={i === 0 ? 'chart-baseline' : 'chart-grid'} x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} />
              <text className="chart-axis" x={m.l - 6} y={y(t)} textAnchor="end" dominantBaseline="central">
                {formatNumber(t, 1)}
              </text>
            </g>
          ))}
          {weeks.map((d) =>
            x(toDayNumber(d)) < W - m.r - 20 ? (
              <text key={d} className="chart-axis" x={x(toDayNumber(d))} y={H - 7}>
                {dayMonth(d)}
              </text>
            ) : null,
          )}
          {active && cursor.index !== null && (
            <line className="chart-baseline" x1={xs[cursor.index]} x2={xs[cursor.index]} y1={m.t} y2={m.t + plotH} />
          )}
          <path
            d={points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xs[i]!.toFixed(1)} ${y(p.celsius).toFixed(1)}`).join('')}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {last >= 0 && <circle cx={xs[last]} cy={y(points[last]!.celsius)} r={4.5} fill="var(--ink)" stroke="var(--surface)" strokeWidth={2} />}
          {active && cursor.index !== null && (
            <circle cx={xs[cursor.index]} cy={y(active.celsius)} r={4.5} fill="var(--ink)" stroke="var(--surface)" strokeWidth={2} />
          )}
        </svg>
        {active && cursor.index !== null && (
          <Tooltip x={xs[cursor.index]!} y={y(active.celsius) - 4} width={W}>
            <strong>{formatNumber(active.celsius, 2)} °C</strong>
            <br />
            {formatDate(active.date, 'dayMonth')}
            {active.cycleDay ? `, ${s.calendar.aria.cycleDay(active.cycleDay)}` : ''}
          </Tooltip>
        )}
      </div>
    </div>
  );
}
