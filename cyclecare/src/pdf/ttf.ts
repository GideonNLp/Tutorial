/**
 * Just enough of a TrueType reader to embed a font in a PDF: character → glyph mapping,
 * advance widths and the handful of metrics a PDF font descriptor needs.
 */
export interface TtfFont {
  bytes: Uint8Array;
  postScriptName: string;
  unitsPerEm: number;
  ascent: number;
  descent: number;
  capHeight: number;
  bbox: [number, number, number, number];
  italicAngle: number;
  /** 0 (.notdef) when the font has no glyph for the code point. */
  glyphFor(codePoint: number): number;
  /** Advance width in font units. */
  advanceOf(glyph: number): number;
}

export function parseTtf(bytes: Uint8Array): TtfFont {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tables = new Map<string, { offset: number; length: number }>();
  const numTables = view.getUint16(4);
  for (let i = 0; i < numTables; i++) {
    const record = 12 + i * 16;
    const tag = String.fromCharCode(bytes[record]!, bytes[record + 1]!, bytes[record + 2]!, bytes[record + 3]!);
    tables.set(tag, { offset: view.getUint32(record + 8), length: view.getUint32(record + 12) });
  }
  const table = (tag: string) => {
    const t = tables.get(tag);
    if (!t) throw new Error(`Font table missing: ${tag}`);
    return t.offset;
  };
  if (!tables.has('glyf')) throw new Error('Only TrueType (glyf) outlines can be embedded');

  const head = table('head');
  const unitsPerEm = view.getUint16(head + 18);
  const bbox: [number, number, number, number] = [
    view.getInt16(head + 36),
    view.getInt16(head + 38),
    view.getInt16(head + 40),
    view.getInt16(head + 42),
  ];

  const hhea = table('hhea');
  let ascent = view.getInt16(hhea + 4);
  let descent = view.getInt16(hhea + 6);
  const numberOfHMetrics = view.getUint16(hhea + 34);
  const hmtx = table('hmtx');
  const advanceOf = (glyph: number) => view.getUint16(hmtx + Math.min(glyph, numberOfHMetrics - 1) * 4);

  let capHeight = Math.round(ascent * 0.7);
  const os2 = tables.get('OS/2');
  if (os2) {
    ascent = view.getInt16(os2.offset + 68) || ascent;
    descent = view.getInt16(os2.offset + 70) || descent;
    if (view.getUint16(os2.offset) >= 2 && os2.length >= 90) capHeight = view.getInt16(os2.offset + 88);
  }
  const post = tables.get('post');
  const italicAngle = post ? view.getInt32(post.offset + 4) / 65536 : 0;

  // cmap: prefer a full-Unicode subtable (format 12), fall back to the BMP one (format 4).
  const cmap = table('cmap');
  let format4 = 0;
  let format12 = 0;
  for (let i = 0, n = view.getUint16(cmap + 2); i < n; i++) {
    const record = cmap + 4 + i * 8;
    const platform = view.getUint16(record);
    const encoding = view.getUint16(record + 2);
    const offset = cmap + view.getUint32(record + 4);
    const format = view.getUint16(offset);
    if (format === 12 && (platform === 0 || (platform === 3 && encoding === 10))) format12 = offset;
    if (format === 4 && (platform === 0 || (platform === 3 && encoding === 1))) format4 = offset;
  }
  if (!format4 && !format12) throw new Error('Font has no Unicode cmap');

  const cache = new Map<number, number>();
  const lookup = (cp: number): number => {
    if (format12) {
      const groups = view.getUint32(format12 + 12);
      let lo = 0;
      let hi = groups - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const g = format12 + 16 + mid * 12;
        if (cp < view.getUint32(g)) hi = mid - 1;
        else if (cp > view.getUint32(g + 4)) lo = mid + 1;
        else return view.getUint32(g + 8) + (cp - view.getUint32(g));
      }
      return 0;
    }
    if (cp > 0xffff) return 0;
    const segCount = view.getUint16(format4 + 6) / 2;
    const endCodes = format4 + 14;
    const startCodes = endCodes + segCount * 2 + 2;
    const deltas = startCodes + segCount * 2;
    const rangeOffsets = deltas + segCount * 2;
    for (let i = 0; i < segCount; i++) {
      if (cp > view.getUint16(endCodes + i * 2)) continue;
      const start = view.getUint16(startCodes + i * 2);
      if (cp < start) return 0;
      const delta = view.getInt16(deltas + i * 2);
      const rangeOffset = view.getUint16(rangeOffsets + i * 2);
      if (rangeOffset === 0) return (cp + delta) & 0xffff;
      const glyph = view.getUint16(rangeOffsets + i * 2 + rangeOffset + (cp - start) * 2);
      return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
    }
    return 0;
  };
  const glyphFor = (cp: number) => {
    let glyph = cache.get(cp);
    if (glyph === undefined) {
      glyph = lookup(cp);
      cache.set(cp, glyph);
    }
    return glyph;
  };

  // PostScript name (name id 6), used as the PDF font name.
  let postScriptName = 'EmbeddedFont';
  const name = tables.get('name');
  if (name) {
    const count = view.getUint16(name.offset + 2);
    const storage = name.offset + view.getUint16(name.offset + 4);
    for (let i = 0; i < count; i++) {
      const record = name.offset + 6 + i * 12;
      if (view.getUint16(record + 6) !== 6) continue;
      const platform = view.getUint16(record);
      const length = view.getUint16(record + 8);
      const offset = storage + view.getUint16(record + 10);
      let value = '';
      if (platform === 3 || platform === 0) for (let j = 0; j < length; j += 2) value += String.fromCharCode(view.getUint16(offset + j));
      else for (let j = 0; j < length; j++) value += String.fromCharCode(bytes[offset + j]!);
      if (value) postScriptName = value.replace(/[^A-Za-z0-9-]/g, '');
      if (platform === 3) break;
    }
  }

  return { bytes, postScriptName, unitsPerEm, ascent, descent, capHeight, bbox, italicAngle, glyphFor, advanceOf };
}
