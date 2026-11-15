import { isValidISODate, makeISO } from './dates';
import type { ISODate } from './types';

/**
 * Basal-temperature import from a file exported by a wearable or its companion app.
 * The web prototype reads CSV; a native build would read the same values from
 * Apple HealthKit / Android Health Connect after a separate permission prompt.
 */

export interface TemperatureReading {
  date: ISODate;
  celsius: number;
}

export type CsvProblem = 'empty' | 'no_date_column' | 'no_temperature_column';

export interface CsvImportResult {
  readings: TemperatureReading[];
  /** Data rows that could not be used (bad date, value out of range, future date). */
  skipped: number;
  problem?: CsvProblem;
  detected?: { dateColumn: string; temperatureColumn: string; convertedFromFahrenheit: boolean };
}

const DATE_HEADER = /(^|[^a-z])(date|data|day|zi|ziua|time|timestamp|datetime)([^a-z]|$)/i;
const TEMP_HEADER = /(temp|bbt|celsius|fahrenheit|°)/i;

function detectDelimiter(line: string): string {
  const counts: Array<[string, number]> = [
    [';', (line.match(/;/g) ?? []).length],
    ['\t', (line.match(/\t/g) ?? []).length],
    [',', (line.match(/,/g) ?? []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0]![1] > 0 ? counts[0]![0] : ',';
}

function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      cells.push(cell.trim());
      cell = '';
    } else cell += ch;
  }
  cells.push(cell.trim());
  return cells;
}

/** Accepts `YYYY-MM-DD` (optionally followed by a time) and day-first `DD.MM.YYYY`, `DD/MM/YYYY`, `DD-MM-YYYY`. */
export function parseDateCell(value: string): ISODate | undefined {
  const v = value.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(v);
  if (m) {
    const iso = `${m[1]}-${m[2]}-${m[3]}`;
    return isValidISODate(iso) ? iso : undefined;
  }
  m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[,\s].*)?$/.exec(v);
  if (m) {
    const iso = makeISO(Number(m[3]), Number(m[2]), Number(m[1]));
    return isValidISODate(iso) ? iso : undefined;
  }
  return undefined;
}

function parseNumberCell(value: string): number | undefined {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export function parseTemperatureCsv(text: string, today: ISODate): CsvImportResult {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { readings: [], skipped: 0, problem: 'empty' };

  const delimiter = detectDelimiter(lines[0]!);
  const header = splitLine(lines[0]!, delimiter);
  const hasHeader = parseDateCell(header[0] ?? '') === undefined && header.some((h) => /[a-z]/i.test(h));

  let dateCol = 0;
  let tempCol = 1;
  if (hasHeader) {
    dateCol = header.findIndex((h) => DATE_HEADER.test(h));
    tempCol = header.findIndex((h, i) => i !== dateCol && TEMP_HEADER.test(h));
    if (dateCol < 0) return { readings: [], skipped: 0, problem: 'no_date_column' };
    if (tempCol < 0) return { readings: [], skipped: 0, problem: 'no_temperature_column' };
  } else if (header.length < 2) {
    return { readings: [], skipped: 0, problem: 'no_temperature_column' };
  }

  const rows = lines.slice(hasHeader ? 1 : 0).map((l) => splitLine(l, delimiter));
  const values = rows.map((r) => parseNumberCell(r[tempCol] ?? '')).filter((n): n is number => n !== undefined);
  // Body temperature in °F sits around 97–99; anything above 45 cannot be °C.
  const fahrenheit = values.length > 0 && values.every((n) => n > 45);

  const byDate = new Map<ISODate, number>();
  let skipped = 0;
  for (const row of rows) {
    const date = parseDateCell(row[dateCol] ?? '');
    let value = parseNumberCell(row[tempCol] ?? '');
    if (!date || value === undefined || date > today) {
      skipped++;
      continue;
    }
    if (fahrenheit) value = ((value - 32) * 5) / 9;
    if (value < 34 || value > 42) {
      skipped++;
      continue;
    }
    byDate.set(date, Math.round(value * 100) / 100);
  }

  const readings = [...byDate.entries()]
    .map(([date, celsius]) => ({ date, celsius }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  return {
    readings,
    skipped,
    detected: {
      dateColumn: hasHeader ? header[dateCol]! : '1',
      temperatureColumn: hasHeader ? header[tempCol]! : '2',
      convertedFromFahrenheit: fahrenheit,
    },
  };
}
