import { content } from '../content';
import { diffDays, parts, toDayNumber } from '../domain/dates';
import { computeFlags } from '../domain/insights';
import { buildTimeline } from '../domain/prediction';
import { bbtSeries, lastMonths, moodByPhase, monthlyMood, periodRuns, symptomMatrix } from '../domain/stats';
import type { AppData, DayLogs, ISODate } from '../domain/types';
import { formatDate, formatMonthKey, formatNumber, strings } from '../i18n';
import boldUrl from './fonts/Figtree-SemiBold.subset.ttf?url';
import regularUrl from './fonts/Figtree-Regular.subset.ttf?url';
import { A4, PdfDocument, rgb, type FontKey, type Rgb } from './pdf';
import { parseTtf, type TtfFont } from './ttf';

/**
 * The report a person can hand to their doctor: cycles, symptoms, mood, temperature and,
 * if they choose, their notes — for a period of 3, 6 or 12 months. A4, generated on the device.
 * It contains recorded facts plus clearly labelled estimates; no names or identifiers.
 */

export interface ReportOptions {
  months: number;
  includeNotes: boolean;
}

const INK = rgb('#1F1B3A');
const INK2 = rgb('#4B4668');
const MUTED = rgb('#66617F');
const LINE = rgb('#DCD9EA');
const BERRY = rgb('#B3264F');
const BERRY_TINT = rgb('#F9E3EA');
const WHITE: Rgb = [255, 255, 255];

const MARGIN = 48;
const WIDTH = A4.width - 2 * MARGIN;
const BOTTOM = A4.height - 70;

interface Column {
  header: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

class Flow {
  y = MARGIN;
  constructor(readonly doc: PdfDocument) {}

  /** Starts a new page when `height` no longer fits. Returns true if it did. */
  ensure(height: number): boolean {
    if (this.y + height <= BOTTOM) return false;
    this.doc.addPage();
    this.y = MARGIN;
    return true;
  }

  wrap(text: string, font: FontKey, size: number, width: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (this.doc.textWidth(candidate, font, size) <= width) {
          line = candidate;
          continue;
        }
        if (line) lines.push(line);
        // A single word wider than the column is broken by characters.
        line = '';
        for (const ch of word) {
          if (this.doc.textWidth(line + ch, font, size) > width && line) {
            lines.push(line);
            line = ch;
          } else line += ch;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  paragraph(text: string, options: { font?: FontKey; size?: number; color?: Rgb; x?: number; width?: number; after?: number } = {}): void {
    const size = options.size ?? 9.5;
    const font = options.font ?? 'regular';
    const lineHeight = size * 1.42;
    for (const line of this.wrap(text, font, size, options.width ?? WIDTH)) {
      this.ensure(lineHeight);
      this.doc.text(line, options.x ?? MARGIN, this.y + size, { font, size, color: options.color ?? INK });
      this.y += lineHeight;
    }
    this.y += options.after ?? 4;
  }

  heading(text: string): void {
    this.y += 12;
    this.ensure(52); // never leave a heading alone at the bottom of a page
    this.doc.text(text, MARGIN, this.y + 12.5, { font: 'bold', size: 12.5, color: INK });
    this.y += 20;
  }

  keyValues(rows: Array<[string, string]>): void {
    for (const [label, value] of rows) {
      this.ensure(16);
      this.doc.text(label, MARGIN, this.y + 9.5, { size: 9.5, color: INK2 });
      this.doc.text(value, MARGIN + 230, this.y + 9.5, { size: 9.5, font: 'bold', color: INK });
      this.y += 16;
    }
    this.y += 4;
  }

  table(columns: Column[], rows: string[][], size = 8.5): void {
    const pad = 4;
    const lineHeight = size * 1.35;
    const header = () => {
      const lines = columns.map((c) => this.wrap(c.header, 'bold', size, c.width - pad * 2));
      const height = Math.max(...lines.map((l) => l.length)) * lineHeight + pad * 2;
      this.ensure(height + lineHeight + pad * 2);
      this.drawRow(columns, lines, 'bold', size, INK2, pad, lineHeight);
      this.y += height;
      this.doc.line(MARGIN, this.y, MARGIN + columns.reduce((a, c) => a + c.width, 0), this.y, INK2, 0.75);
    };
    header();
    for (const row of rows) {
      const lines = columns.map((c, i) => this.wrap(row[i] ?? '', i === 0 ? 'regular' : 'regular', size, c.width - pad * 2));
      const height = Math.max(...lines.map((l) => l.length)) * lineHeight + pad * 2;
      if (this.ensure(height)) header();
      this.drawRow(columns, lines, 'regular', size, INK, pad, lineHeight);
      this.y += height;
      this.doc.line(MARGIN, this.y, MARGIN + columns.reduce((a, c) => a + c.width, 0), this.y, LINE, 0.5);
    }
    this.y += 8;
  }

  private drawRow(columns: Column[], lines: string[][], font: FontKey, size: number, color: Rgb, pad: number, lineHeight: number): void {
    let x = MARGIN;
    columns.forEach((column, i) => {
      lines[i]!.forEach((line, n) => {
        const baseline = this.y + pad + size + n * lineHeight;
        if (column.align === 'right') this.doc.text(line, x + column.width - pad, baseline, { font, size, color, align: 'right' });
        else if (column.align === 'center') this.doc.text(line, x + column.width / 2, baseline, { font, size, color, align: 'center' });
        else this.doc.text(line, x + pad, baseline, { font, size, color });
      });
      x += column.width;
    });
  }
}

function inRange(logs: DayLogs, from: ISODate, to: ISODate): DayLogs {
  const out: DayLogs = {};
  for (const [date, log] of Object.entries(logs)) if (date >= from && date <= to) out[date] = log;
  return out;
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined);

/** Builds the PDF from already-loaded fonts. Pure and synchronous, so it can be tested without a browser. */
export function renderReport(data: AppData, today: ISODate, options: ReportOptions, fonts: Record<FontKey, TtfFont>, created = new Date()): Uint8Array {
  const s = strings();
  const p = s.pdf;
  const monthKeys = lastMonths(today, options.months);
  const from: ISODate = `${monthKeys[0]}-01`;
  const logs = inRange(data.logs, from, today);
  const timeline = buildTimeline(data.logs, data.profile, today);
  const cycles = timeline.cycles.filter((c) => c.start >= from);
  const completed = cycles.filter((c) => c.length !== undefined && c.valid);
  const lengths = completed.map((c) => c.length!);
  const periodLengths = cycles.filter((c) => c.length !== undefined && c.period.length >= 2).map((c) => c.period.length);
  const days = s.common.days;
  const dash = s.stats.summary.none;

  const doc = new PdfDocument({ title: p.title, subject: p.period(formatDate(from, 'long'), formatDate(today, 'long')), lang: s.meta.intl, creator: s.common.appName, created }, fonts);
  const flow = new Flow(doc);

  // ---- Title ---------------------------------------------------------------------------------
  doc.text(p.title, MARGIN, flow.y + 18, { font: 'bold', size: 18, color: INK });
  flow.y += 28;
  flow.paragraph(p.period(formatDate(from, 'long'), formatDate(today, 'long')), { size: 10, color: INK2, after: 0 });
  flow.paragraph(p.generated(formatDate(today, 'long')), { size: 10, color: INK2, after: 6 });
  doc.line(MARGIN, flow.y, MARGIN + WIDTH, flow.y, LINE, 0.75);

  // ---- Summary -------------------------------------------------------------------------------
  flow.heading(p.summary);
  const avg = mean(lengths);
  const avgPeriod = mean(periodLengths);
  flow.keyValues([
    [p.avgCycle, avg !== undefined ? p.daysValue(formatNumber(avg, 1)) : dash],
    [p.variation, lengths.length ? p.daysValue(`${Math.min(...lengths)}–${Math.max(...lengths)}`) : dash],
    [p.avgPeriod, avgPeriod !== undefined ? p.daysValue(formatNumber(avgPeriod, 1)) : dash],
    [p.recorded, String(completed.length)],
    [
      p.declared,
      p.declaredValue(
        data.profile.typicalCycleLength ? days(data.profile.typicalCycleLength) : p.unknown,
        data.profile.typicalPeriodLength ? days(data.profile.typicalPeriodLength) : p.unknown,
      ),
    ],
  ]);

  // ---- Cycles --------------------------------------------------------------------------------
  flow.heading(p.cycles);
  if (cycles.length === 0) {
    flow.paragraph(p.none, { color: INK2 });
  } else {
    if (completed.length > 0) {
      const shown = completed.slice(-14);
      const height = 118;
      flow.ensure(height + 30);
      flow.paragraph(p.cyclesChart, { size: 8, color: MUTED, after: 2 });
      const top = flow.y + 12;
      const base = top + height - 26;
      const yMax = Math.max(40, Math.ceil(Math.max(...shown.map((c) => c.length!)) / 10) * 10);
      const scale = (base - top) / yMax;
      const left = MARGIN + 20;
      const slot = (WIDTH - 20) / shown.length;
      const barWidth = Math.min(18, slot * 0.6);
      for (let t = 0; t <= yMax; t += 10) {
        const y = base - t * scale;
        doc.line(left, y, MARGIN + WIDTH, y, t === 0 ? INK2 : LINE, t === 0 ? 0.75 : 0.5);
        doc.text(String(t), left - 4, y + 2.5, { size: 7, color: MUTED, align: 'right' });
      }
      shown.forEach((cycle, i) => {
        const x = left + slot * (i + 0.5) - barWidth / 2;
        const period = Math.min(cycle.period.length, cycle.length!);
        doc.rect(x, base - cycle.length! * scale, barWidth, (cycle.length! - period) * scale - 1.5, INK2);
        doc.rect(x, base - period * scale, barWidth, period * scale, BERRY);
        doc.text(String(cycle.length), x + barWidth / 2, base - cycle.length! * scale - 3, { size: 7.5, font: 'bold', color: INK, align: 'center' });
        const { day, month } = parts(cycle.start);
        doc.text(`${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}`, x + barWidth / 2, base + 10, { size: 7, color: MUTED, align: 'center' });
      });
      flow.y = base + 18;
      // Legend
      doc.rect(MARGIN + 20, flow.y, 7, 7, BERRY);
      doc.text(s.stats.cycles.legendPeriod, MARGIN + 31, flow.y + 6.5, { size: 8, color: INK2 });
      const second = MARGIN + 31 + doc.textWidth(s.stats.cycles.legendPeriod, 'regular', 8) + 16;
      doc.rect(second, flow.y, 7, 7, INK2);
      doc.text(s.stats.cycles.legendRest, second + 11, flow.y + 6.5, { size: 8, color: INK2 });
      flow.y += 20;
    }
    flow.table(
      [
        { header: p.colIndex, width: 30 },
        { header: p.colStart, width: 110 },
        { header: p.colLength, width: 80, align: 'right' },
        { header: p.colPeriod, width: 80, align: 'right' },
        { header: p.colHeavy, width: 80, align: 'right' },
        { header: p.colNote, width: WIDTH - 380 },
      ],
      cycles.map((cycle, i) => {
        const notes: string[] = [];
        if (cycle.length === undefined) notes.push(p.inProgress);
        else if (!cycle.valid) notes.push(p.excluded);
        if (cycle.intermenstrual.length > 0) notes.push(p.betweenBleeding);
        return [
          String(i + 1),
          formatDate(cycle.start, 'long'),
          cycle.length !== undefined ? days(cycle.length) : dash,
          days(cycle.period.length),
          String(cycle.period.days.filter((d) => data.logs[d]?.flow === 'heavy').length),
          notes.join('; '),
        ];
      }),
    );
  }

  // ---- Symptoms ------------------------------------------------------------------------------
  flow.heading(p.symptoms);
  const matrix = symptomMatrix(logs, today, options.months);
  if (matrix.rows.length === 0) {
    flow.paragraph(p.none, { color: INK2 });
  } else {
    flow.paragraph(p.symptomsNote, { size: 8.5, color: INK2 });
    const monthWidth = Math.min(46, (WIDTH - 130 - 40) / matrix.months.length);
    flow.table(
      [
        { header: p.colSymptom, width: 130 },
        ...matrix.months.map((month) => ({ header: formatMonthKey(month, 'monthShort'), width: monthWidth, align: 'center' as const })),
        { header: p.colTotal, width: 40, align: 'right' as const },
      ],
      matrix.rows.map((row) => [
        s.symptom[row.symptom],
        ...row.counts.map((n, i) => (n === 0 ? '' : row.severe[i]! > 0 ? `${n} (${row.severe[i]})` : String(n))),
        String(row.total),
      ]),
      options.months > 6 ? 7.5 : 8.5,
    );
  }

  // ---- Mood and energy -----------------------------------------------------------------------
  flow.heading(p.mood);
  const moods = monthlyMood(logs, today, options.months);
  if (moods.every((month) => month.days === 0)) {
    flow.paragraph(p.none, { color: INK2 });
  } else {
    flow.paragraph(p.moodNote, { size: 8.5, color: INK2 });
    const fmt = (v: number | undefined) => (v === undefined ? dash : formatNumber(v, 1));
    flow.table(
      [
        { header: p.colMonth, width: 150 },
        { header: p.colMood, width: 90, align: 'right' },
        { header: p.colEnergy, width: 90, align: 'right' },
        { header: p.colDays, width: 90, align: 'right' },
      ],
      moods.map((month) => [formatMonthKey(month.month), fmt(month.mood), fmt(month.energy), String(month.days)]),
    );
    if (data.profile.showFertility) {
      const byPhase = moodByPhase(data.logs, timeline, diffDays(today, from));
      if (byPhase.some((phase) => phase.days > 0)) {
        flow.paragraph(p.byPhase, { font: 'bold', size: 9.5, after: 2 });
        flow.table(
          [
            { header: p.colPhase, width: 150 },
            { header: p.colMood, width: 90, align: 'right' },
            { header: p.colEnergy, width: 90, align: 'right' },
            { header: p.colDays, width: 90, align: 'right' },
          ],
          byPhase.map((phase) => [s.phase[phase.phase], fmt(phase.mood), fmt(phase.energy), String(phase.days)]),
        );
      }
    }
  }

  // ---- Basal temperature ---------------------------------------------------------------------
  const temps = bbtSeries(data.logs, timeline, from, today);
  if (temps.length >= 2) {
    flow.heading(p.bbt);
    flow.paragraph(p.bbtNote(temps.length), { size: 8.5, color: INK2 });
    const height = 120;
    flow.ensure(height + 16);
    const top = flow.y + 4;
    const base = top + height - 20;
    const left = MARGIN + 26;
    const right = MARGIN + WIDTH;
    const values = temps.map((t) => t.celsius);
    const lo = Math.floor((Math.min(...values) - 0.05) * 5) / 5;
    const hi = Math.ceil((Math.max(...values) + 0.05) * 5) / 5;
    const d0 = toDayNumber(from);
    const d1 = toDayNumber(today);
    const x = (date: ISODate) => left + ((toDayNumber(date) - d0) / Math.max(1, d1 - d0)) * (right - left);
    const y = (value: number) => base - ((value - lo) / Math.max(0.2, hi - lo)) * (base - top);
    for (const [start, end] of periodRuns(timeline, from, today)) doc.rect(x(start), top, Math.max(1, x(end) - x(start)), base - top, BERRY_TINT);
    const step = hi - lo > 1.2 ? 0.4 : 0.2;
    for (let t = lo; t <= hi + 1e-9; t += step) {
      doc.line(left, y(t), right, y(t), Math.abs(t - lo) < 1e-9 ? INK2 : LINE, 0.5);
      doc.text(formatNumber(t, 1), left - 4, y(t) + 2.5, { size: 7, color: MUTED, align: 'right' });
    }
    for (const month of monthKeys) {
      const first = `${month}-01`;
      if (first >= from) doc.text(formatMonthKey(month, 'monthShort'), x(first), base + 10, { size: 7, color: MUTED });
    }
    // Readings more than three days apart are not joined: a gap in the measurements stays visible.
    let segment: Array<[number, number]> = [];
    temps.forEach((t, i) => {
      if (i > 0 && diffDays(t.date, temps[i - 1]!.date) > 3) {
        if (segment.length === 1) doc.circle(segment[0]![0], segment[0]![1], 1.2, INK);
        doc.polyline(segment, INK, 1);
        segment = [];
      }
      segment.push([x(t.date), y(t.celsius)]);
    });
    if (segment.length === 1) doc.circle(segment[0]![0], segment[0]![1], 1.2, INK);
    doc.polyline(segment, INK, 1);
    flow.y = base + 16;
    doc.rect(left, flow.y, 7, 7, BERRY_TINT);
    doc.text(s.stats.mood.period, left + 11, flow.y + 6.5, { size: 8, color: INK2 });
    flow.y += 18;
  }

  // ---- Observations --------------------------------------------------------------------------
  const flags = computeFlags(timeline, data.logs);
  if (flags.length > 0) {
    flow.heading(p.observations);
    flow.paragraph(p.observationsNote, { size: 8.5, color: INK2 });
    const flagTexts = content().tips.flagTexts;
    for (const flag of flags) {
      const name = flag.symptom ? s.symptom[flag.symptom] : '';
      const text = flagTexts[flag.kind];
      flow.ensure(30);
      flow.paragraph(text.title(name), { font: 'bold', size: 9.5, after: 1 });
      flow.paragraph(text.body(flag.values, name, days), { size: 9, color: INK2, after: 6 });
    }
  }

  // ---- Notes ---------------------------------------------------------------------------------
  if (options.includeNotes) {
    flow.heading(p.notes);
    const notes = Object.values(logs)
      .filter((log) => log.note)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    if (notes.length === 0) flow.paragraph(p.none, { color: INK2 });
    for (const log of notes) {
      flow.ensure(28);
      flow.paragraph(formatDate(log.date, 'long'), { font: 'bold', size: 9, after: 1 });
      flow.paragraph(log.note!, { size: 9, color: INK2, after: 6 });
    }
  }

  // ---- Footer on every page ------------------------------------------------------------------
  const footer = flow.wrap(p.disclaimer, 'regular', 7.5, WIDTH - 70);
  for (let page = 0; page < doc.pageCount; page++) {
    const top = A4.height - 52;
    doc.line(MARGIN, top, MARGIN + WIDTH, top, LINE, 0.5, page);
    footer.forEach((line, i) => doc.text(line, MARGIN, top + 11 + i * 9.5, { size: 7.5, color: MUTED, page }));
    doc.text(p.page(page + 1, doc.pageCount), MARGIN + WIDTH, top + 11, { size: 7.5, color: MUTED, align: 'right', page });
  }
  // Keep white available for future use of knocked-out labels; referenced so the constant is not dropped.
  void WHITE;
  return doc.finish();
}

async function loadBytes(url: string): Promise<Uint8Array> {
  // The single-file build inlines the fonts as data: URLs; decode those without a network request.
  if (url.startsWith('data:')) {
    const binary = atob(url.slice(url.indexOf(',') + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Font could not be loaded: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

let fontsPromise: Promise<Record<FontKey, TtfFont>> | undefined;

/** Loads the embedded fonts on first use and builds the report. */
export async function buildReportPdf(data: AppData, today: ISODate, options: ReportOptions): Promise<Uint8Array<ArrayBuffer>> {
  fontsPromise ??= Promise.all([loadBytes(regularUrl), loadBytes(boldUrl)]).then(([regular, bold]) => ({
    regular: parseTtf(regular),
    bold: parseTtf(bold),
  }));
  const fonts = await fontsPromise.catch((error) => {
    fontsPromise = undefined;
    throw error;
  });
  return new Uint8Array(renderReport(data, today, options, fonts));
}
