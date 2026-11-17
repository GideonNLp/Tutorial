import { describe, expect, it } from 'vitest';
import { parseDateCell, parseTemperatureCsv } from '../src/domain/importCsv';

const today = '2026-11-15';

describe('temperature CSV import', () => {
  it('reads a comma-separated file with ISO dates', () => {
    const r = parseTemperatureCsv('date,temperature\n2026-11-01,36.42\n2026-11-02,36.51\n', today);
    expect(r.problem).toBeUndefined();
    expect(r.readings).toEqual([
      { date: '2026-11-01', celsius: 36.42 },
      { date: '2026-11-02', celsius: 36.51 },
    ]);
    expect(r.detected).toMatchObject({ dateColumn: 'date', temperatureColumn: 'temperature', convertedFromFahrenheit: false });
  });

  it('reads Romanian-style exports: semicolons, day-first dates, decimal commas', () => {
    const r = parseTemperatureCsv('﻿Data;Temperatura bazală (°C);Notă\r\n01.11.2026;36,42;\r\n2.11.2026;36,5;ok\r\n', today);
    expect(r.readings).toEqual([
      { date: '2026-11-01', celsius: 36.42 },
      { date: '2026-11-02', celsius: 36.5 },
    ]);
  });

  it('finds the columns wherever they are and ignores the others', () => {
    const r = parseTemperatureCsv('id,Timestamp,Steps,Skin Temp\n1,2026-11-03T06:30:00Z,5200,36.60\n', today);
    expect(r.readings).toEqual([{ date: '2026-11-03', celsius: 36.6 }]);
  });

  it('converts Fahrenheit', () => {
    const r = parseTemperatureCsv('date,bbt\n2026-11-01,97.7\n2026-11-02,98.2\n', today);
    expect(r.detected?.convertedFromFahrenheit).toBe(true);
    expect(r.readings.map((x) => x.celsius)).toEqual([36.5, 36.78]);
  });

  it('works without a header row', () => {
    const r = parseTemperatureCsv('2026-11-01;36,40\n2026-11-02;36,45\n', today);
    expect(r.readings).toHaveLength(2);
  });

  it('skips rows it cannot use and reports how many', () => {
    const r = parseTemperatureCsv(
      'date,temp\n2026-11-01,36.4\nnot a date,36.4\n2026-11-02,\n2026-11-03,29.0\n2026-12-25,36.5\n2026-11-01,36.6\n',
      today,
    );
    expect(r.skipped).toBe(4);
    expect(r.readings).toEqual([{ date: '2026-11-01', celsius: 36.6 }]); // last value for a day wins
  });

  it('explains what is missing', () => {
    expect(parseTemperatureCsv('', today).problem).toBe('empty');
    expect(parseTemperatureCsv('name,value\nx,1\n', today).problem).toBe('no_date_column');
    expect(parseTemperatureCsv('date,steps\n2026-11-01,5000\n', today).problem).toBe('no_temperature_column');
  });

  it('parses date cells', () => {
    expect(parseDateCell('2026-11-01 07:00')).toBe('2026-11-01');
    expect(parseDateCell('1/11/2026')).toBe('2026-11-01');
    expect(parseDateCell('31.02.2026')).toBeUndefined();
    expect(parseDateCell('Nov 1')).toBeUndefined();
  });
});
