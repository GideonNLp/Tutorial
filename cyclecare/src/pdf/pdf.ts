import type { TtfFont } from './ttf';

/**
 * A small PDF writer: pages, vector shapes and Unicode text in embedded TrueType fonts.
 * It exists so that the report is generated on the device, with no library to trust and nothing
 * sent anywhere. Text is real text (searchable, readable aloud) thanks to the ToUnicode maps,
 * and the document carries its language and title.
 *
 * Coordinates in this API are in points from the TOP-LEFT of the page (y grows downwards).
 */

export type Rgb = [number, number, number];
export type FontKey = 'regular' | 'bold';

export const A4 = { width: 595.28, height: 841.89 };

interface EmbeddedFont {
  ttf: TtfFont;
  resource: string;
  /** glyph id → code point, for every glyph actually drawn. */
  used: Map<number, number>;
}

const num = (n: number) => (Math.round(n * 100) / 100).toString();
const hex4 = (n: number) => n.toString(16).toUpperCase().padStart(4, '0');
const color = (c: Rgb) => c.map((v) => num(v / 255)).join(' ');

export function rgb(hexColor: string): Rgb {
  const n = parseInt(hexColor.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** PDF text string as UTF-16BE hex, safe for any characters. */
function textString(value: string): string {
  let out = 'FEFF';
  for (const ch of value) {
    const cp = ch.codePointAt(0)!;
    if (cp > 0xffff) {
      const v = cp - 0x10000;
      out += hex4(0xd800 + (v >> 10)) + hex4(0xdc00 + (v & 0x3ff));
    } else out += hex4(cp);
  }
  return `<${out}>`;
}

export interface PdfMeta {
  title: string;
  subject?: string;
  /** BCP 47 language tag, e.g. `ro-RO`. */
  lang: string;
  creator: string;
  created: Date;
}

export class PdfDocument {
  private readonly fonts: Record<FontKey, EmbeddedFont>;
  private readonly pages: string[][] = [];

  constructor(
    private readonly meta: PdfMeta,
    fonts: Record<FontKey, TtfFont>,
  ) {
    this.fonts = {
      regular: { ttf: fonts.regular, resource: 'F1', used: new Map() },
      bold: { ttf: fonts.bold, resource: 'F2', used: new Map() },
    };
    this.addPage();
  }

  get pageCount(): number {
    return this.pages.length;
  }

  addPage(): number {
    this.pages.push([]);
    return this.pages.length - 1;
  }

  private ops(page?: number): string[] {
    return this.pages[page ?? this.pages.length - 1]!;
  }

  /** Characters the font cannot draw are replaced, so nothing renders as an empty box. */
  private glyphs(text: string, font: EmbeddedFont): number[] {
    const out: number[] = [];
    for (const ch of text.normalize('NFC')) {
      let cp = ch.codePointAt(0)!;
      if (cp === 0x09 || cp === 0x0a || cp === 0x0d || cp === 0xa0) cp = 0x20;
      let glyph = font.ttf.glyphFor(cp);
      if (glyph === 0) {
        cp = 0x3f; // '?'
        glyph = font.ttf.glyphFor(cp);
      }
      font.used.set(glyph, cp);
      out.push(glyph);
    }
    return out;
  }

  textWidth(text: string, font: FontKey, size: number): number {
    const f = this.fonts[font];
    let units = 0;
    for (const ch of text.normalize('NFC')) {
      const cp = ch.codePointAt(0)!;
      const glyph = f.ttf.glyphFor(cp === 0xa0 ? 0x20 : cp) || f.ttf.glyphFor(0x3f);
      units += f.ttf.advanceOf(glyph);
    }
    return (units / f.ttf.unitsPerEm) * size;
  }

  /** Draws one line of text; `y` is the baseline. */
  text(text: string, x: number, y: number, options: { font?: FontKey; size: number; color?: Rgb; align?: 'left' | 'right' | 'center'; page?: number }): void {
    if (!text) return;
    const key = options.font ?? 'regular';
    const font = this.fonts[key];
    let left = x;
    if (options.align === 'right') left = x - this.textWidth(text, key, options.size);
    else if (options.align === 'center') left = x - this.textWidth(text, key, options.size) / 2;
    const encoded = this.glyphs(text, font).map(hex4).join('');
    this.ops(options.page).push(
      `BT /${font.resource} ${num(options.size)} Tf ${color(options.color ?? [0, 0, 0])} rg ${num(left)} ${num(A4.height - y)} Td <${encoded}> Tj ET`,
    );
  }

  rect(x: number, y: number, width: number, height: number, fill: Rgb, page?: number): void {
    if (width <= 0 || height <= 0) return;
    this.ops(page).push(`${color(fill)} rg ${num(x)} ${num(A4.height - y - height)} ${num(width)} ${num(height)} re f`);
  }

  line(x1: number, y1: number, x2: number, y2: number, stroke: Rgb, width = 0.5, page?: number): void {
    this.ops(page).push(`${color(stroke)} RG ${num(width)} w ${num(x1)} ${num(A4.height - y1)} m ${num(x2)} ${num(A4.height - y2)} l S`);
  }

  polyline(points: Array<[number, number]>, stroke: Rgb, width = 1, page?: number): void {
    if (points.length < 2) return;
    const path = points.map(([x, y], i) => `${num(x)} ${num(A4.height - y)} ${i === 0 ? 'm' : 'l'}`).join(' ');
    this.ops(page).push(`${color(stroke)} RG ${num(width)} w 1 j 1 J ${path} S`);
  }

  circle(cx: number, cy: number, r: number, fill: Rgb, page?: number): void {
    const k = 0.5523 * r;
    const y = A4.height - cy;
    const p = (a: number, b: number) => `${num(a)} ${num(b)}`;
    this.ops(page).push(
      `${color(fill)} rg ${p(cx + r, y)} m ${p(cx + r, y + k)} ${p(cx + k, y + r)} ${p(cx, y + r)} c ` +
        `${p(cx - k, y + r)} ${p(cx - r, y + k)} ${p(cx - r, y)} c ${p(cx - r, y - k)} ${p(cx - k, y - r)} ${p(cx, y - r)} c ` +
        `${p(cx + k, y - r)} ${p(cx + r, y - k)} ${p(cx + r, y)} c f`,
    );
  }

  /** Serialises the document. */
  finish(): Uint8Array {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const offsets: number[] = [];
    let length = 0;
    const push = (data: string | Uint8Array) => {
      const bytes = typeof data === 'string' ? encoder.encode(data) : data;
      chunks.push(bytes);
      length += bytes.length;
    };
    const object = (id: number, body: string, stream?: Uint8Array) => {
      offsets[id] = length;
      push(`${id} 0 obj\n${body}\n`);
      if (stream) {
        push('stream\n');
        push(stream);
        push('\nendstream\n');
      }
      push('endobj\n');
    };

    // Object numbering: 1 catalog, 2 pages, 3 info, then 5 objects per font, then 2 per page.
    const fontKeys = Object.keys(this.fonts) as FontKey[];
    const fontBase = (i: number) => 4 + i * 5;
    const pageBase = (i: number) => 4 + fontKeys.length * 5 + i * 2;
    const total = pageBase(this.pages.length);

    push('%PDF-1.7\n%âãÏÓ\n');
    object(1, `<< /Type /Catalog /Pages 2 0 R /Lang (${this.meta.lang}) /ViewerPreferences << /DisplayDocTitle true >> >>`);
    object(2, `<< /Type /Pages /Count ${this.pages.length} /Kids [${this.pages.map((_, i) => `${pageBase(i)} 0 R`).join(' ')}] >>`);
    const d = this.meta.created;
    const stamp = `${d.getFullYear()}${[d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()].map((v) => String(v).padStart(2, '0')).join('')}`;
    object(
      3,
      `<< /Title ${textString(this.meta.title)}${this.meta.subject ? ` /Subject ${textString(this.meta.subject)}` : ''} /Creator ${textString(this.meta.creator)} /Producer ${textString(this.meta.creator)} /CreationDate (D:${stamp}) >>`,
    );

    fontKeys.forEach((key, i) => {
      const font = this.fonts[key];
      const { ttf } = font;
      const base = fontBase(i);
      const scale = 1000 / ttf.unitsPerEm;
      const name = `${'CYCARE'.slice(0, 5)}${String.fromCharCode(65 + i)}+${ttf.postScriptName}`;
      const glyphs = [...font.used.keys()].sort((a, b) => a - b);
      const widths = glyphs.map((g) => `${g} [${Math.round(ttf.advanceOf(g) * scale)}]`).join(' ');

      object(base, `<< /Type /Font /Subtype /Type0 /BaseFont /${name} /Encoding /Identity-H /DescendantFonts [${base + 1} 0 R] /ToUnicode ${base + 4} 0 R >>`);
      object(
        base + 1,
        `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> ` +
          `/FontDescriptor ${base + 2} 0 R /DW 1000 /W [${widths}] /CIDToGIDMap /Identity >>`,
      );
      object(
        base + 2,
        `<< /Type /FontDescriptor /FontName /${name} /Flags 32 /FontBBox [${ttf.bbox.map((v) => Math.round(v * scale)).join(' ')}] ` +
          `/ItalicAngle ${num(ttf.italicAngle)} /Ascent ${Math.round(ttf.ascent * scale)} /Descent ${Math.round(ttf.descent * scale)} ` +
          `/CapHeight ${Math.round(ttf.capHeight * scale)} /StemV ${key === 'bold' ? 120 : 80} /FontFile2 ${base + 3} 0 R >>`,
      );
      object(base + 3, `<< /Length ${ttf.bytes.length} /Length1 ${ttf.bytes.length} >>`, ttf.bytes);

      // Glyph → Unicode, so that the text can be copied, searched and read by assistive technology.
      const entries = glyphs.map((g) => `<${hex4(g)}> <${hex4(font.used.get(g)!)}>`);
      const blocks: string[] = [];
      for (let j = 0; j < entries.length; j += 100) {
        const block = entries.slice(j, j + 100);
        blocks.push(`${block.length} beginbfchar\n${block.join('\n')}\nendbfchar`);
      }
      const cmap = encoder.encode(
        '/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n' +
          '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n' +
          `1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n${blocks.join('\n')}\n` +
          'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend',
      );
      object(base + 4, `<< /Length ${cmap.length} >>`, cmap);
    });

    const fontResources = fontKeys.map((key, i) => `/${this.fonts[key].resource} ${fontBase(i)} 0 R`).join(' ');
    this.pages.forEach((ops, i) => {
      const base = pageBase(i);
      const content = encoder.encode(ops.join('\n'));
      object(
        base,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(A4.width)} ${num(A4.height)}] /Resources << /Font << ${fontResources} >> >> /Contents ${base + 1} 0 R >>`,
      );
      object(base + 1, `<< /Length ${content.length} >>`, content);
    });

    const xref = length;
    let table = `xref\n0 ${total}\n0000000000 65535 f \n`;
    for (let id = 1; id < total; id++) table += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    push(table);
    push(`trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

    const out = new Uint8Array(length);
    let at = 0;
    for (const chunk of chunks) {
      out.set(chunk, at);
      at += chunk.length;
    }
    return out;
  }
}
