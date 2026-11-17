import { useId } from 'react';
import type { MascotMood } from '../domain/mascot';

/**
 * The capybara who lives in the middle of the cycle dial, drawn here as SVG with volume: radial
 * gradients for the fur, a fine fur texture, soft shadows and glossy eyes. Every colour comes from
 * the design tokens (`--capy-*` and the phase colours), so it follows the theme; nothing is loaded
 * from anywhere, so it works offline and within the content security policy. Purely decorative:
 * every drawing is aria-hidden.
 *
 * The head is drawn once, in a 120-unit box (x 13–107, y 0–101), and reused by the peeking
 * capybara and the full poses. Gradient ids are unique per drawing, as several can be on the page.
 */

type Eyes = 'open' | 'happy' | 'sleepy';
type Mouth = 'smile' | 'open';
type Hat = 'leaf' | 'yuzu' | 'flower';

function useRefs() {
  const base = `capy${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (name: string) => `${base}-${name}`;
}
type Refs = ReturnType<typeof useRefs>;
const paint = (r: Refs, name: string) => `url(#${r(name)})`;

/** A gradient stop coloured from a token (`.capy-s-<tone>` in screens.css). */
function S({ at, tone, alpha }: { at: number; tone: string; alpha?: number }) {
  return <stop offset={at} className={`capy-s-${tone}`} stopOpacity={alpha} />;
}

function Defs({ r }: { r: Refs }) {
  const fur = (
    <>
      <S at={0} tone="fur-light" />
      <S at={0.55} tone="fur" />
      <S at={1} tone="fur-dark" />
    </>
  );
  const fade = (tone: string, alpha = 1) => (
    <>
      <S at={0} tone={tone} alpha={alpha} />
      <S at={1} tone={tone} alpha={0} />
    </>
  );
  return (
    <defs>
      <radialGradient id={r('head')} cx="0.36" cy="0.28" r="0.9" fx="0.3" fy="0.2">
        {fur}
      </radialGradient>
      <radialGradient id={r('body')} cx="0.42" cy="0.3" r="0.85" fx="0.36" fy="0.22">
        {fur}
      </radialGradient>
      <radialGradient id={r('limb')} cx="0.4" cy="0.3" r="0.85">
        <S at={0} tone="fur-light" />
        <S at={0.65} tone="fur" />
        <S at={1} tone="fur-dark" />
      </radialGradient>
      <radialGradient id={r('ear')} cx="0.5" cy="0.62" r="0.7">
        <S at={0} tone="fur" />
        <S at={1} tone="fur-dark" />
      </radialGradient>
      <radialGradient id={r('earIn')} cx="0.5" cy="0.72" r="0.75">
        <S at={0} tone="ear" />
        <S at={0.75} tone="fur-dark" />
        <S at={1} tone="fur-dark" />
      </radialGradient>
      <radialGradient id={r('snout')} cx="0.5" cy="0.12" r="0.95" fy="0.05">
        <S at={0} tone="cream" />
        <S at={0.35} tone="fur-light" />
        <S at={0.8} tone="fur" />
        <S at={1} tone="fur-dark" />
      </radialGradient>
      <radialGradient id={r('nose')} cx="0.4" cy="0.28" r="0.85">
        <S at={0} tone="fur-dark" />
        <S at={1} tone="nose" />
      </radialGradient>
      <radialGradient id={r('eye')} cx="0.45" cy="0.4" r="0.65">
        <S at={0} tone="iris" />
        <S at={0.72} tone="ink" />
        <S at={1} tone="ink" />
      </radialGradient>
      <radialGradient id={r('blush')}>{fade('blush', 0.85)}</radialGradient>
      <radialGradient id={r('gloss')}>{fade('shine', 0.5)}</radialGradient>
      <radialGradient id={r('belly')}>{fade('cream', 0.6)}</radialGradient>
      <radialGradient id={r('shadow')}>{fade('shadow')}</radialGradient>
      <linearGradient id={r('leaf')} x1="0" y1="0" x2="1" y2="1">
        <S at={0} tone="leaf-light" />
        <S at={1} tone="follicular" />
      </linearGradient>
      <radialGradient id={r('fruit')} cx="0.36" cy="0.3" r="0.8">
        <S at={0} tone="star-light" />
        <S at={1} tone="ovulation" />
      </radialGradient>
      <radialGradient id={r('petal')} cx="0.5" cy="0.8" r="0.9">
        <S at={0} tone="shine" />
        <S at={1} tone="blush" />
      </radialGradient>
      <linearGradient id={r('mug')} x1="0" y1="0" x2="1" y2="0">
        <S at={0} tone="menstruation" />
        <S at={0.32} tone="mug-light" />
        <S at={0.7} tone="menstruation" />
        <S at={1} tone="menstruation" />
      </linearGradient>
      <radialGradient id={r('tea')} cx="0.4" cy="0.35" r="0.8">
        <S at={0} tone="fur" />
        <S at={1} tone="nose" />
      </radialGradient>
      <linearGradient id={r('blanket')} x1="0" y1="0" x2="0.3" y2="1">
        <S at={0} tone="blanket-light" />
        <S at={1} tone="luteal" />
      </linearGradient>
      <pattern id={r('tex')} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
        <path className="capy-tex" d="M1 5.6 q1.2 -2 2.6 -3.2 M4.6 6.6 q0.8 -1.5 2 -2.2" />
      </pattern>
      <filter id={r('blur')} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.2" />
      </filter>
      {/* The body behind the number fades out downwards and to the sides. */}
      <radialGradient
        id={r('fade')}
        cx="60"
        cy="84"
        r="54"
        gradientTransform="translate(60 84) scale(1 0.9) translate(-60 -84)"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0" stopColor="#fff" />
        <stop offset="0.45" stopColor="#fff" />
        <stop offset="1" stopColor="#000" />
      </radialGradient>
      <mask id={r('mask')} maskUnits="userSpaceOnUse" x="-10" y="-10" width="140" height="160">
        <rect x="-10" y="-10" width="140" height="160" fill={paint(r, 'fade')} />
      </mask>
    </defs>
  );
}

// ---------------------------------------------------------------- the head

/* A capybara's head is a wide loaf: a flat top, nearly straight sides and a broad, blunt snout. */
const HEAD = 'M60 16 C84 16 104 20 106 40 C108 56 108 76 102 88 C96 98 80 102 60 102 C40 102 24 98 18 88 C12 76 12 56 14 40 C16 20 36 16 60 16 Z';
const SNOUT = 'M60 55 C82 55 96 62 96 78 C96 94 82 102 60 102 C38 102 24 94 24 78 C24 62 38 55 60 55 Z';
const NOSE = 'M42 66 C42 61 50 59.5 60 59.5 C70 59.5 78 61 78 66 C78 71.5 70 74 60 74 C50 74 42 71.5 42 66 Z';
const EYE_Y = 45;

/** One eye; `side` points outwards, where the lashes go. */
function Eye({ r, x, kind, side }: { r: Refs; x: number; kind: Eyes; side: -1 | 1 }) {
  const y = EYE_Y;
  if (kind === 'happy') {
    return (
      <>
        <path className="capy-line capy-line-eye" d={`M${x - 8} ${y + 3} Q${x} ${y - 7} ${x + 8} ${y + 3}`} />
        <path className="capy-lash" d={`M${x + side * 8} ${y + 2.6} l${side * 3.4} -2.4`} />
      </>
    );
  }
  if (kind === 'sleepy') {
    return (
      <>
        <path className="capy-line capy-line-eye" d={`M${x - 8} ${y - 1} Q${x} ${y + 6.5} ${x + 8} ${y - 1}`} />
        <path className="capy-lash" d={`M${x + side * 7.6} ${y} l${side * 3.4} 2.6 M${x + side * 4.5} ${y + 3.6} l${side * 1.6} 3`} />
      </>
    );
  }
  return (
    <>
      <path className="capy-lid" d={`M${x - 8.5} ${y - 4.5} Q${x} ${y - 13} ${x + 8.5} ${y - 4.5}`} />
      <g className="capy-eye">
        <ellipse cx={x} cy={y} rx={7.4} ry={8.4} fill={paint(r, 'eye')} />
        <circle className="capy-shine" cx={x + 2.4} cy={y - 3.2} r={2.8} />
        <circle className="capy-shine capy-shine-soft" cx={x - 2.4} cy={y + 3.1} r={1.3} />
      </g>
      <path className="capy-lash" d={`M${x + side * 7.4} ${y - 5.6} l${side * 3.6} -3 M${x + side * 8.6} ${y - 2} l${side * 4} -1.2`} />
    </>
  );
}

function HatOn({ r, hat }: { r: Refs; hat: Hat }) {
  if (hat === 'yuzu') {
    return (
      <g className="capy-hat capy-yuzu">
        <ellipse cx={60} cy={16.5} rx={9} ry={2.6} fill={paint(r, 'shadow')} />
        <circle cx={60} cy={7.5} r={9.5} fill={paint(r, 'fruit')} />
        <ellipse className="capy-shine capy-shine-soft" cx={56} cy={3.6} rx={3} ry={1.8} />
        <path d="M61 -1.5 C65 -7.5 73 -7.5 76.5 -3.5 C71.5 0.5 65.5 0.8 61 -1.5 Z" fill={paint(r, 'leaf')} />
      </g>
    );
  }
  if (hat === 'flower') {
    return (
      <g className="capy-hat capy-flower">
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse key={angle} cx={76} cy={11} rx={4.4} ry={6.4} fill={paint(r, 'petal')} transform={`rotate(${angle} 76 17)`} />
        ))}
        <circle cx={76} cy={17} r={3.6} fill={paint(r, 'fruit')} />
        <path d="M66 21 C61 18 57 20 56 23 C60 25 64 24 66 21 Z" fill={paint(r, 'leaf')} />
      </g>
    );
  }
  return (
    <g className="capy-hat capy-leaf">
      <path className="capy-stem" d="M60 16 Q59 10 61 5" />
      <path d="M60 10 C52 3 43 5 41 10 C47 15 55 14 60 10 Z" fill={paint(r, 'leaf')} />
      <path d="M61 8 C66 0 76 0 80 5 C74 12 65 12 61 8 Z" fill={paint(r, 'leaf')} />
      <path className="capy-vein" d="M58 10 Q50 8.2 44 9.6 M63.4 7.6 Q71 4.2 77.6 5" />
    </g>
  );
}

function Head({ r, eyes, mouth, hat }: { r: Refs; eyes: Eyes; mouth: Mouth; hat: Hat }) {
  return (
    <>
      <g className="capy-ear capy-ear-l">
        <g transform="rotate(-25 25 22)">
          <ellipse cx={25} cy={22} rx={8.5} ry={7.5} fill={paint(r, 'ear')} />
          <ellipse cx={25.6} cy={23.4} rx={4.4} ry={3.8} fill={paint(r, 'earIn')} />
        </g>
      </g>
      <g className="capy-ear capy-ear-r">
        <g transform="rotate(25 95 22)">
          <ellipse cx={95} cy={22} rx={8.5} ry={7.5} fill={paint(r, 'ear')} />
          <ellipse cx={94.4} cy={23.4} rx={4.4} ry={3.8} fill={paint(r, 'earIn')} />
        </g>
      </g>
      <path d={HEAD} fill={paint(r, 'head')} />
      <path className="capy-texture" d={HEAD} fill={paint(r, 'tex')} />
      <ellipse cx={38} cy={26} rx={17} ry={6.5} transform="rotate(-10 38 26)" fill={paint(r, 'gloss')} />
      <ellipse cx={21} cy={64} rx={8} ry={5} fill={paint(r, 'blush')} />
      <ellipse cx={99} cy={64} rx={8} ry={5} fill={paint(r, 'blush')} />
      {/* The snout stands out from the face: a soft shadow round it, light on its top. */}
      <path className="capy-snout-edge" d={SNOUT} />
      <path d={SNOUT} fill={paint(r, 'snout')} />
      <path className="capy-texture" d={SNOUT} fill={paint(r, 'tex')} />
      <path d={NOSE} fill={paint(r, 'nose')} />
      <ellipse className="capy-nostril" cx={49} cy={66.5} rx={2.6} ry={1.5} transform="rotate(28 49 66.5)" />
      <ellipse className="capy-nostril" cx={71} cy={66.5} rx={2.6} ry={1.5} transform="rotate(-28 71 66.5)" />
      <ellipse className="capy-shine capy-shine-nose" cx={55} cy={62.6} rx={6.5} ry={1.7} />
      <path className="capy-mouth" d="M60 74 L60 79.5" />
      {mouth === 'open' ? (
        <>
          <path className="capy-mouth-open" d="M51 79.5 Q60 81 69 79.5 Q68 92 60 92 Q52 92 51 79.5 Z" />
          <path className="capy-tongue" d="M54.5 88 Q60 85 65.5 88 Q63.5 92 60 92 Q56.5 92 54.5 88 Z" />
        </>
      ) : (
        <path className="capy-mouth" d="M51 80 Q55.5 85 60 80.5 Q64.5 85 69 80" />
      )}
      <Eye r={r} x={36} kind={eyes} side={-1} />
      <Eye r={r} x={84} kind={eyes} side={1} />
      <HatOn r={r} hat={hat} />
    </>
  );
}

// ---------------------------------------------------------------- peeking over the day number

/** A paw resting on the top edge of the number at x, claws over the edge, its shadow on the digit. */
function EdgePaw({ r, x, className }: { r: Refs; x: number; className: string }) {
  return (
    <g className={className}>
      <ellipse cx={x} cy={92.5} rx={11} ry={3.6} fill={paint(r, 'shadow')} filter={paint(r, 'blur')} />
      <path
        d={`M${x - 10.5} 86.5 C${x - 11.5} 79 ${x - 6} 74.5 ${x} 74.5 C${x + 6} 74.5 ${x + 11.5} 79 ${x + 10.5} 86.5 C${x + 9.5} 90 ${x - 9.5} 90 ${x - 10.5} 86.5 Z`}
        fill={paint(r, 'limb')}
      />
      <path className="capy-toe" d={`M${x - 3.6} 84.4 v3.6 M${x + 3.6} 84.4 v3.6`} />
      <ellipse className="capy-claw" cx={x - 6.4} cy={89.4} rx={1.6} ry={2.2} />
      <ellipse className="capy-claw" cx={x} cy={90.2} rx={1.6} ry={2.3} />
      <ellipse className="capy-claw" cx={x + 6.4} cy={89.4} rx={1.6} ry={2.2} />
    </g>
  );
}

const SHOULDERS = 'M10 108 C10 90 32 82 60 82 C88 82 110 90 110 108 C110 128 88 140 60 140 C32 140 10 128 10 108 Z';

/**
 * The capybara hiding behind the day number: head, ears and shoulders behind the digits (the body
 * fades into the dial below their top), and two paws resting on the top edge of the digits, in front
 * of them. Both drawings share one box, in which the line y = 84 is the top of the digits.
 */
export function CapybaraPeek() {
  const r = useRefs();
  return (
    <>
      <svg className="capy capy-peek capy-peek-back" viewBox="0 -6 120 146" aria-hidden="true" focusable="false">
        <Defs r={r} />
        <g className="capy-bob">
          <g mask={paint(r, 'mask')}>
            <path d={SHOULDERS} fill={paint(r, 'body')} />
            <path className="capy-texture" d={SHOULDERS} fill={paint(r, 'tex')} />
          </g>
          <Head r={r} eyes="open" mouth="smile" hat="leaf" />
        </g>
      </svg>
      <svg className="capy capy-peek capy-peek-front" viewBox="0 -6 120 146" aria-hidden="true" focusable="false">
        <EdgePaw r={r} x={31} className="capy-paw capy-paw-l" />
        <EdgePaw r={r} x={89} className="capy-paw capy-paw-r" />
      </svg>
    </>
  );
}

// ---------------------------------------------------------------- the whole capybara

const round = (n: number) => Math.round(n * 100) / 100;

/** A star with `points` points around (x, y). */
function starPath(x: number, y: number, outer: number, points = 5, inner = 0.48): string {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 ? outer * inner : outer;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    d += `${i ? 'L' : 'M'}${round(x + radius * Math.cos(angle))} ${round(y + radius * Math.sin(angle))} `;
  }
  return `${d}Z`;
}

/** A four-pointed, curved sparkle around (x, y). */
function sparklePath(x: number, y: number, s: number): string {
  const k = s / 6;
  return `M${x} ${y - s} Q${x + k} ${y - k} ${x + s} ${y} Q${x + k} ${y + k} ${x} ${y + s} Q${x - k} ${y + k} ${x - s} ${y} Q${x - k} ${y - k} ${x} ${y - s} Z`;
}

/** A front paw seen from the front, with three claws. */
function Paw({ r, x, y, claws = 'down' }: { r: Refs; x: number; y: number; claws?: 'down' | 'up' }) {
  const c = claws === 'down' ? 1 : -1;
  return (
    <>
      <ellipse cx={x} cy={y} rx={11} ry={10} fill={paint(r, 'limb')} />
      <ellipse className="capy-claw" cx={x - 5.5} cy={y + c * 8.6} rx={1.7} ry={2.3} />
      <ellipse className="capy-claw" cx={x} cy={y + c * 9.6} rx={1.7} ry={2.4} />
      <ellipse className="capy-claw" cx={x + 5.5} cy={y + c * 8.6} rx={1.7} ry={2.3} />
    </>
  );
}

/** An arm raised from the shoulder at (sx, sy) to the paw at (px, py). */
function RaisedArm({ r, sx, sy, px, py }: { r: Refs; sx: number; sy: number; px: number; py: number }) {
  const out = px < sx ? -1 : 1;
  return (
    <>
      <path className="capy-arm" d={`M${sx} ${sy} Q${(sx + px) / 2 + out * 6} ${(sy + py) / 2 + 6} ${px} ${py}`} />
      <path className="capy-arm-light" d={`M${sx} ${sy - 4} Q${(sx + px) / 2 + out * 4} ${(sy + py) / 2} ${px} ${py - 3}`} />
      <Paw r={r} x={px} y={py} claws="up" />
    </>
  );
}

const POSE: Record<MascotMood, { eyes: Eyes; mouth: Mouth; hat: Hat }> = {
  menstruation: { eyes: 'sleepy', mouth: 'smile', hat: 'leaf' },
  follicular: { eyes: 'open', mouth: 'open', hat: 'leaf' },
  ovulation: { eyes: 'happy', mouth: 'open', hat: 'flower' },
  luteal: { eyes: 'sleepy', mouth: 'smile', hat: 'leaf' },
  hello: { eyes: 'open', mouth: 'smile', hat: 'yuzu' },
};

const BODY = 'M100 90 C140 90 162 116 162 146 C162 174 138 188 100 188 C62 188 38 174 38 146 C38 116 60 90 100 90 Z';

/** A steaming mug held in both paws. */
function Mug({ r }: { r: Refs }) {
  return (
    <g className="capy-tea">
      <path className="capy-steam" d="M91 128 q-4 -5 0 -10 q4 -5 0 -10" />
      <path className="capy-steam capy-steam-2" d="M100 126 q-4 -5 0 -10 q4 -5 0 -10" />
      <path className="capy-steam capy-steam-3" d="M109 128 q-4 -5 0 -10 q4 -5 0 -10" />
      <ellipse cx={100} cy={171} rx={24} ry={5} fill={paint(r, 'shadow')} filter={paint(r, 'blur')} />
      <path className="capy-mug-handle" d="M118 140 C132 140 134 160 118 162" />
      <path d="M82 132 L82 162 C82 169 90 172 100 172 C110 172 118 169 118 162 L118 132 Z" fill={paint(r, 'mug')} />
      <ellipse className="capy-mug-rim" cx={100} cy={132} rx={18} ry={5} />
      <ellipse cx={100} cy={133} rx={14.5} ry={3.4} fill={paint(r, 'tea')} />
      <path className="capy-mug-shine" d="M87 138 L87 162" />
      <path className="capy-mug-heart" d="M100 160 C92 154 94 147 100 150.5 C106 147 108 154 100 160 Z" />
      <Paw r={r} x={83} y={152} />
      <Paw r={r} x={117} y={152} />
    </g>
  );
}

const TRIM: ReadonlyArray<readonly [number, number]> = [
  [50, 126],
  [60, 116],
  [72, 109.5],
  [86, 105.5],
  [100, 104.5],
  [114, 105.5],
  [128, 109.5],
  [140, 116],
  [150, 126],
];
const DOTS: ReadonlyArray<readonly [number, number]> = [
  [62, 140],
  [84, 132],
  [108, 136],
  [132, 132],
  [146, 152],
  [72, 162],
  [98, 158],
  [124, 162],
  [54, 168],
];

/** A fluffy blanket wrapped around the shoulders, held under the chin. */
function Blanket({ r }: { r: Refs }) {
  return (
    <g className="capy-blanket">
      <path
        d="M42 132 C44 112 66 102 100 102 C134 102 156 112 158 132 L162 170 Q152 180 142 172 Q132 182 122 174 Q112 184 100 175 Q88 184 78 174 Q68 182 58 172 Q48 180 38 170 Z"
        fill={paint(r, 'blanket')}
      />
      {DOTS.map(([x, y]) => (
        <circle key={`${x}-${y}`} className="capy-blanket-dot" cx={x} cy={y} r={2.6} />
      ))}
      {TRIM.map(([x, y]) => (
        <circle key={`${x}-${y}`} className="capy-fluff" cx={x} cy={y} r={7.5} />
      ))}
      <Paw r={r} x={84} y={114} />
      <Paw r={r} x={116} y={114} />
    </g>
  );
}

/**
 * The whole capybara, sitting, in a pose for the phase: a steaming cup of tea during the period,
 * arms up with sparkles in the follicular phase, a flower and stars at ovulation, wrapped in a fluffy
 * blanket in the luteal phase, and a wave, with a yuzu on its head, when there is no phase to show.
 */
export function Capybara({ mood }: { mood: MascotMood }) {
  const r = useRefs();
  const { eyes, mouth, hat } = POSE[mood];
  return (
    <svg className="capy capy-full" data-mood={mood} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <Defs r={r} />
      <ellipse cx={100} cy={190} rx={64} ry={8} fill={paint(r, 'shadow')} />

      {mood === 'follicular' && (
        <>
          <RaisedArm r={r} sx={64} sy={126} px={36} py={80} />
          <RaisedArm r={r} sx={136} sy={126} px={164} py={80} />
        </>
      )}
      {mood === 'hello' && (
        <g className="capy-wave">
          <RaisedArm r={r} sx={136} sy={126} px={166} py={86} />
        </g>
      )}

      <path d={BODY} fill={paint(r, 'body')} />
      <path className="capy-texture" d={BODY} fill={paint(r, 'tex')} />
      <ellipse cx={100} cy={154} rx={36} ry={30} fill={paint(r, 'belly')} />
      <ellipse cx={100} cy={107} rx={44} ry={8} fill={paint(r, 'shadow')} filter={paint(r, 'blur')} />
      {[68, 132].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={184} rx={19} ry={9} fill={paint(r, 'limb')} />
          <ellipse className="capy-claw" cx={x - 8} cy={190.5} rx={1.8} ry={2.2} />
          <ellipse className="capy-claw" cx={x} cy={192} rx={1.8} ry={2.3} />
          <ellipse className="capy-claw" cx={x + 8} cy={190.5} rx={1.8} ry={2.2} />
        </g>
      ))}

      {(mood === 'ovulation' || mood === 'hello') && (
        <>
          <path className="capy-crease" d="M58 118 Q62 138 74 146" />
          <Paw r={r} x={78} y={148} />
        </>
      )}
      {mood === 'ovulation' && (
        <>
          <path className="capy-crease" d="M142 118 Q138 138 126 146" />
          <Paw r={r} x={122} y={148} />
        </>
      )}
      {mood === 'menstruation' && <Mug r={r} />}
      {mood === 'luteal' && <Blanket r={r} />}

      <g transform="translate(40 4)">
        <Head r={r} eyes={eyes} mouth={mouth} hat={hat} />
      </g>

      {mood === 'follicular' && (
        <g className="capy-sparkles">
          <path d={sparklePath(22, 56, 9)} fill={paint(r, 'leaf')} />
          <path d={sparklePath(180, 48, 11)} fill={paint(r, 'leaf')} />
          <path d={sparklePath(176, 126, 7)} fill={paint(r, 'leaf')} />
        </g>
      )}
      {mood === 'ovulation' && (
        <g className="capy-sparkles">
          <path d={starPath(24, 50, 11)} fill={paint(r, 'fruit')} />
          <path d={starPath(178, 40, 13)} fill={paint(r, 'fruit')} />
          <path d={starPath(176, 124, 8)} fill={paint(r, 'fruit')} />
        </g>
      )}
      {mood === 'luteal' && (
        <g className="capy-zzz">
          <path className="capy-z" d="M150 40 h12 l-12 13 h12" />
          <path className="capy-z capy-z-2" d="M168 20 h8 l-8 9 h8" />
        </g>
      )}
    </svg>
  );
}
