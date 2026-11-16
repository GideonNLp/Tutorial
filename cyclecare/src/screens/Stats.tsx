import { FileText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { saveFile } from '../app/platform';
import { useData, useTimeline, useToday } from '../app/store';
import { toast } from '../app/ui';
import { addDays } from '../domain/dates';
import { bbtSeries, cycleRows, moodByPhase, moodSeries, periodRuns, symptomMatrix } from '../domain/stats';
import { formatDate, formatMonthKey, formatNumber, strings } from '../i18n';
import { buildReportPdf } from '../pdf/report';
import { BbtChart, ChartFrame, CycleLengthChart, MoodChart } from '../ui/charts';
import { Segmented } from '../ui/controls';
import { Sheet } from '../ui/Sheet';
import { ScreenHead } from '../ui/Shell';

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined);
const HEAT_ROWS = 8;

export function StatsScreen() {
  const s = strings();
  const st = s.stats;
  const data = useData();
  const today = useToday();
  const timeline = useTimeline();
  const [exporting, setExporting] = useState(false);

  const view = useMemo(() => {
    const rows = cycleRows(timeline, data.logs, 14);
    const weeks = moodSeries(data.logs, today, 26);
    const bbtFrom = addDays(today, -44);
    return {
      rows,
      charted: rows.filter((r) => r.length !== undefined && r.valid).slice(-12),
      excluded: rows.filter((r) => r.length !== undefined && !r.valid).length,
      matrix: symptomMatrix(data.logs, today, 6),
      weeks,
      periods: periodRuns(timeline, weeks[0]!.weekStart, today),
      byPhase: moodByPhase(data.logs, timeline),
      bbtFrom,
      bbt: bbtSeries(data.logs, timeline, bbtFrom, today),
      bbtPeriods: periodRuns(timeline, bbtFrom, today),
    };
  }, [timeline, data.logs, today]);

  const { stats } = timeline;
  const avgCycle = mean(stats.lengths);
  const avgPeriod = mean(stats.periodLengths);
  const recorded = timeline.cycles.filter((c) => c.valid).length;
  const hasMood = view.weeks.some((w) => w.days > 0);
  const hasAnything = Object.keys(data.logs).length > 0;
  const heatRows = view.matrix.rows.slice(0, HEAT_ROWS);

  return (
    <div className="screen">
      <ScreenHead title={st.title} settings />
      {!hasAnything ? (
        <div className="stack stack-3">
          <h2>{st.empty.title}</h2>
          <p className="ink-2">{st.empty.body}</p>
        </div>
      ) : (
        <div className="stack stack-6">
          <section className="stack stack-3" aria-label={st.title}>
            <dl className="tiles">
              <Tile
                label={st.summary.avgCycle}
                value={avgCycle !== undefined ? formatNumber(avgCycle, 1) : st.summary.none}
                unit={avgCycle !== undefined ? st.summary.daysUnit : undefined}
              />
              <Tile
                label={st.summary.variation}
                value={
                  stats.shortest !== undefined && stats.longest !== undefined ? st.summary.range(stats.shortest, stats.longest) : st.summary.none
                }
                unit={stats.shortest !== undefined ? st.summary.daysUnit : undefined}
              />
              <Tile
                label={st.summary.avgPeriod}
                value={avgPeriod !== undefined ? formatNumber(avgPeriod, 1) : st.summary.none}
                unit={avgPeriod !== undefined ? st.summary.daysUnit : undefined}
              />
              <Tile label={st.summary.recorded} value={String(recorded)} />
            </dl>
            {stats.lengths.length > 0 && <p className="caption">{st.summary.basis(stats.lengths.length)}</p>}
          </section>

          <ChartFrame
            title={st.cycles.title}
            subtitle={st.cycles.subtitle}
            legend={
              view.charted.length > 0 ? (
                <ul className="chart-legend">
                  <li>
                    <span className="key-rect" style={{ background: 'var(--menstruation)' }} aria-hidden="true" />
                    {st.cycles.legendPeriod}
                  </li>
                  <li>
                    <span className="key-rect" style={{ background: 'var(--ink-2)' }} aria-hidden="true" />
                    {st.cycles.legendRest}
                  </li>
                </ul>
              ) : undefined
            }
            note={view.excluded > 0 ? <p className="caption">{st.cycles.excludedNote(view.excluded)}</p> : undefined}
            table={
              view.rows.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">{st.cycles.colStart}</th>
                      <th scope="col">{st.cycles.colLength}</th>
                      <th scope="col">{st.cycles.colPeriod}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.rows.map((row) => (
                      <tr key={row.start}>
                        <th scope="row">{formatDate(row.start, 'long')}</th>
                        <td>
                          {row.length !== undefined
                            ? `${row.length}${row.valid ? '' : ` (${st.cycles.excluded})`}`
                            : st.cycles.current(timeline.prediction.current?.cycleDay ?? 1)}
                        </td>
                        <td>{row.periodLength}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : undefined
            }
          >
            {view.charted.length > 0 ? (
              <CycleLengthChart
                rows={view.charted}
                label={st.cycles.chartLabel(view.charted.length, formatNumber(mean(view.charted.map((r) => r.length!)) ?? 0, 1))}
              />
            ) : (
              <p className="ink-2">{st.cyclesEmpty}</p>
            )}
          </ChartFrame>

          <ChartFrame title={st.symptoms.title} subtitle={st.symptoms.subtitle}>
            {heatRows.length === 0 ? (
              <p className="ink-2">{st.symptoms.empty}</p>
            ) : (
              <>
                <div className="chart-plot" style={{ overflowX: 'auto' }}>
                  <table className="heat">
                    <thead>
                      <tr>
                        <th scope="col">
                          <span className="sr-only">{st.symptoms.colSymptom}</span>
                        </th>
                        {view.matrix.months.map((month) => (
                          <th key={month} scope="col" abbr={formatMonthKey(month)}>
                            {formatMonthKey(month, 'monthShort')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatRows.map((row) => (
                        <tr key={row.symptom}>
                          <th scope="row">{s.symptom[row.symptom]}</th>
                          {row.counts.map((n, i) => (
                            <td
                              key={view.matrix.months[i]}
                              data-level={n > 0 ? Math.ceil((n / view.matrix.max) * 4) : undefined}
                              title={st.symptoms.tooltip(s.symptom[row.symptom], formatMonthKey(view.matrix.months[i]!), n, row.severe[i] ?? 0)}
                            >
                              {n > 0 ? n : <span className="sr-only">0</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="chart-legend" aria-hidden="true">
                  <li>
                    {st.symptoms.scaleLow}
                    {[1, 2, 3, 4].map((n) => (
                      <span key={n} className="key-rect" style={{ background: `var(--heat-${n})` }} />
                    ))}
                    {st.symptoms.scaleHigh}
                  </li>
                </ul>
                {view.matrix.rows.length > HEAT_ROWS && <p className="caption">{st.symptoms.more(view.matrix.rows.length - HEAT_ROWS)}</p>}
              </>
            )}
          </ChartFrame>

          <ChartFrame
            title={st.mood.title}
            subtitle={st.mood.subtitle}
            legend={
              hasMood ? (
                <ul className="chart-legend">
                  <li>
                    <span className="key-line" style={{ color: 'var(--ink)' }} aria-hidden="true" />
                    {st.mood.mood}
                  </li>
                  <li>
                    <span className="key-line" style={{ color: 'var(--line-strong)' }} aria-hidden="true" />
                    {st.mood.energy}
                  </li>
                  <li>
                    <span
                      className="key-rect"
                      style={{ background: 'var(--menstruation-tint)', boxShadow: 'inset 0 0 0 1px var(--menstruation)' }}
                      aria-hidden="true"
                    />
                    {st.mood.period}
                  </li>
                </ul>
              ) : undefined
            }
            table={
              hasMood ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">{st.mood.colWeek}</th>
                      <th scope="col">{st.mood.mood}</th>
                      <th scope="col">{st.mood.energy}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.weeks
                      .filter((w) => w.days > 0)
                      .map((w) => (
                        <tr key={w.weekStart}>
                          <th scope="row">{formatDate(w.weekStart, 'dayMonth')}</th>
                          <td>{w.mood !== undefined ? formatNumber(w.mood, 1) : st.summary.none}</td>
                          <td>{w.energy !== undefined ? formatNumber(w.energy, 1) : st.summary.none}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : undefined
            }
          >
            {hasMood ? <MoodChart points={view.weeks} periods={view.periods} label={st.mood.chartLabel} /> : <p className="ink-2">{st.mood.empty}</p>}
          </ChartFrame>

          {hasMood && data.profile.showFertility && view.byPhase.some((p) => p.days > 0) && (
            <section className="stack stack-3" aria-labelledby="by-phase">
              <div className="stack stack-1">
                <h2 id="by-phase" style={{ fontSize: '1.25rem' }}>
                  {st.byPhase.title}
                </h2>
                <p className="caption">{st.byPhase.subtitle}</p>
              </div>
              <div className="card tight phase-rows" role="table" aria-labelledby="by-phase">
                <div role="row" style={{ display: 'contents' }}>
                  <span role="columnheader" className="head">
                    {st.byPhase.colPhase}
                  </span>
                  <span role="columnheader" className="head">
                    {st.mood.mood}
                  </span>
                  <span role="columnheader" className="head">
                    {st.mood.energy}
                  </span>
                </div>
                {view.byPhase.map((p) => (
                  <div role="row" key={p.phase} style={{ display: 'contents' }} data-phase={p.phase}>
                    <span role="rowheader" className="name">
                      <span className="swatch" aria-hidden="true" />
                      {s.phase[p.phase]}
                    </span>
                    {[p.mood, p.energy].map((value, i) => (
                      <span role="cell" className="cell" key={i}>
                        <span className="strong num">{value !== undefined ? formatNumber(value, 1) : st.summary.none}</span>
                        <span className="meter" aria-hidden="true">
                          <span style={{ width: value !== undefined ? `${((value - 1) / 4) * 100}%` : 0 }} />
                        </span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}

          {view.bbt.length >= 2 && (
            <ChartFrame
              title={st.bbt.title}
              subtitle={st.bbt.subtitle}
              legend={
                <ul className="chart-legend">
                  <li>
                    <span
                      className="key-rect"
                      style={{ background: 'var(--menstruation-tint)', boxShadow: 'inset 0 0 0 1px var(--menstruation)' }}
                      aria-hidden="true"
                    />
                    {st.mood.period}
                  </li>
                </ul>
              }
              table={
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">{st.bbt.colDate}</th>
                      <th scope="col">{st.bbt.colValue}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.bbt.map((p) => (
                      <tr key={p.date}>
                        <th scope="row">{formatDate(p.date, 'dayMonth')}</th>
                        <td>{formatNumber(p.celsius, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            >
              <BbtChart points={view.bbt} periods={view.bbtPeriods} from={view.bbtFrom} to={today} label={st.bbt.chartLabel} />
            </ChartFrame>
          )}

          <section className="card stack stack-3" aria-labelledby="export-heading">
            <h2 id="export-heading" style={{ fontSize: '1.25rem' }}>
              {st.export.title}
            </h2>
            <p className="ink-2">{st.export.body}</p>
            <button type="button" className="btn btn-primary btn-block" onClick={() => setExporting(true)}>
              <FileText size={18} aria-hidden="true" />
              {st.export.open}
            </button>
          </section>
        </div>
      )}
      <ExportSheet open={exporting} onClose={() => setExporting(false)} />
    </div>
  );
}

function Tile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="tile">
      <dt className="tile-label">{label}</dt>
      <dd className="tile-value">
        {value}
        {unit && <span className="tile-unit"> {unit}</span>}
      </dd>
    </div>
  );
}

function ExportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = strings();
  const e = s.stats.export;
  const data = useData();
  const today = useToday();
  const [months, setMonths] = useState(6);
  const [notes, setNotes] = useState(false);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setBusy(true);
    try {
      const bytes = await buildReportPdf(data, today, { months, includeNotes: notes });
      const outcome = await saveFile(e.filename(today), new Blob([bytes], { type: 'application/pdf' }));
      toast(outcome === 'saved' ? e.saved : outcome === 'declined' ? e.declined : e.failed);
      if (outcome === 'saved') onClose();
    } catch (error) {
      console.error('CycleCare: PDF export failed', error);
      toast(e.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={e.title}>
      <div className="stack">
        <Segmented legend={e.range} options={[3, 6, 12].map((n) => ({ value: n, label: e.months(n) }))} value={months} onChange={setMonths} small />
        <label className="check-row">
          <input type="checkbox" checked={notes} onChange={(ev) => setNotes(ev.target.checked)} />
          <span>
            <span className="strong">{e.notes}</span>
            <br />
            <span className="field-hint">{e.notesHint}</span>
          </span>
        </label>
        <div className="sheet-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {s.common.cancel}
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void generate()}>
            {busy ? e.generating : e.generate}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
