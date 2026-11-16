import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generateDemoData } from '../src/domain/demoData';
import { emptyAppData } from '../src/domain/types';
import { PdfDocument } from '../src/pdf/pdf';
import { renderReport } from '../src/pdf/report';
import { parseTtf } from '../src/pdf/ttf';
import { NOW } from './helpers';

const load = (name: string) => parseTtf(new Uint8Array(readFileSync(new URL(`../src/pdf/fonts/${name}`, import.meta.url))));
const fonts = { regular: load('Figtree-Regular.subset.ttf'), bold: load('Figtree-SemiBold.subset.ttf') };
const latin1 = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes);

/** Every xref entry must point at the object it claims to. */
function checkXref(pdf: string): number {
  const start = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(pdf)![1]);
  expect(pdf.slice(start, start + 4)).toBe('xref');
  const lines = pdf.slice(start).split('\n');
  const count = Number(lines[1]!.split(' ')[1]);
  for (let id = 1; id < count; id++) {
    const offset = Number(lines[2 + id]!.slice(0, 10));
    expect(pdf.slice(offset, offset + `${id} 0 obj`.length)).toBe(`${id} 0 obj`);
  }
  return count;
}

describe('TrueType reader', () => {
  it('reads metrics and maps Romanian letters to glyphs', () => {
    const f = fonts.regular;
    expect(f.unitsPerEm).toBe(1000);
    expect(f.postScriptName).toMatch(/^Figtree/);
    expect(f.ascent).toBeGreaterThan(0);
    expect(f.descent).toBeLessThan(0);
    for (const ch of 'ăâîșțĂÂÎȘȚ„”–°') expect(f.glyphFor(ch.codePointAt(0)!), ch).toBeGreaterThan(0);
    expect(f.glyphFor(0x1f600)).toBe(0); // no emoji in the subset
    expect(f.advanceOf(f.glyphFor(0x57))).toBeGreaterThan(f.advanceOf(f.glyphFor(0x69))); // W is wider than i
  });
});

describe('PDF writer', () => {
  it('produces a structurally valid document with embedded fonts and Unicode maps', () => {
    const doc = new PdfDocument({ title: 'Probă „ș” și „ț”', lang: 'ro-RO', creator: 'CycleCare', created: new Date(2026, 10, 15, 9, 0, 0) }, fonts);
    doc.text('Menstruație, săptămână, îngrijire', 48, 80, { size: 12 });
    doc.text('Țară și șosea', 48, 100, { size: 12, font: 'bold' });
    doc.rect(48, 120, 100, 10, [179, 38, 79]);
    doc.addPage();
    doc.text('Pagina a doua', 48, 80, { size: 12 });
    const pdf = latin1(doc.finish());

    expect(pdf.startsWith('%PDF-1.7\n')).toBe(true);
    expect(checkXref(pdf)).toBe(4 + 2 * 5 + 2 * 2);
    expect(pdf).toContain('/Lang (ro-RO)');
    expect(pdf).toContain('/Count 2');
    expect(pdf).toContain('/Subtype /CIDFontType2');
    expect(pdf).toContain('/FontFile2');
    expect(pdf).toContain('/CreationDate (D:20261115090000)');
    // ș (U+0219) and ț (U+021B) are mapped back to Unicode for copy, search and screen readers.
    expect(pdf).toMatch(/<[0-9A-F]{4}> <0219>/);
    expect(pdf).toMatch(/<[0-9A-F]{4}> <021B>/);
  });

  it('measures text and replaces characters the font cannot draw', () => {
    const doc = new PdfDocument({ title: 't', lang: 'ro-RO', creator: 'c', created: new Date() }, fonts);
    expect(doc.textWidth('ii', 'regular', 10)).toBeCloseTo(2 * doc.textWidth('i', 'regular', 10), 6);
    expect(doc.textWidth('mm', 'bold', 10)).toBeGreaterThan(doc.textWidth('mm', 'regular', 10));
    expect(doc.textWidth('😀', 'regular', 10)).toBeCloseTo(doc.textWidth('?', 'regular', 10), 6);
    doc.text('ok 😀', 10, 10, { size: 10 });
    expect(() => doc.finish()).not.toThrow();
  });
});

describe('doctor report', () => {
  const today = '2026-11-15';
  const demo = generateDemoData(today, NOW);
  const data = { ...emptyAppData(), logs: demo.logs, profile: demo.profile };

  it('renders the demo journal into a multi-page PDF', () => {
    const bytes = renderReport(data, today, { months: 6, includeNotes: true }, fonts, new Date(2026, 10, 15, 9, 0, 0));
    // PDF_OUT=/some/file.pdf npm test — writes the report so it can be opened and looked at.
    if (process.env.PDF_OUT) writeFileSync(process.env.PDF_OUT, bytes);
    const pdf = latin1(bytes);
    const objects = checkXref(pdf);
    const pages = Number(/\/Count (\d+)/.exec(pdf)![1]);
    expect(pages).toBeGreaterThanOrEqual(2);
    expect(objects).toBe(4 + 10 + pages * 2);
    expect(bytes.length).toBeGreaterThan(45_000);
    expect(bytes.length).toBeLessThan(250_000);
  });

  it('is deterministic for the same input', () => {
    const at = new Date(2026, 10, 15, 9, 0, 0);
    const a = renderReport(data, today, { months: 3, includeNotes: false }, fonts, at);
    const b = renderReport(data, today, { months: 3, includeNotes: false }, fonts, at);
    expect(latin1(a)).toBe(latin1(b));
  });

  it('copes with an empty journal', () => {
    const bytes = renderReport(emptyAppData(), today, { months: 12, includeNotes: true }, fonts);
    expect(checkXref(latin1(bytes))).toBeGreaterThan(14);
  });
});
