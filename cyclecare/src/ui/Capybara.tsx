import type { MascotMood } from '../domain/mascot';

/**
 * The capybara who lives in the middle of the cycle dial. Plain SVG drawn here, coloured from the
 * design tokens (`--capy-*` and the phase colours), so it follows the theme, works offline and needs
 * nothing the content security policy would block. Purely decorative: every instance is aria-hidden.
 *
 * The head is drawn once, in a 100 × 84 box, and reused by the peeking head and the full poses.
 */

type Eyes = 'open' | 'happy' | 'sleepy';
type Mouth = 'smile' | 'open';

const EYE_Y = 34;

function Eye({ x, kind }: { x: number; kind: Eyes }) {
  if (kind === 'happy') return <path className="capy-line" d={`M${x - 4} ${EYE_Y + 2} Q${x} ${EYE_Y - 4} ${x + 4} ${EYE_Y + 2}`} />;
  if (kind === 'sleepy') return <path className="capy-line" d={`M${x - 4} ${EYE_Y} Q${x} ${EYE_Y + 4} ${x + 4} ${EYE_Y}`} />;
  return (
    <g className="capy-eye">
      <ellipse className="capy-ink" cx={x} cy={EYE_Y} rx={3.3} ry={3.8} />
      <circle className="capy-shine" cx={x + 1.2} cy={EYE_Y - 1.4} r={1.2} />
    </g>
  );
}

/**
 * A capybara's face: a wide, loaf-shaped head, small ears set at the top corners, eyes high and far
 * apart, and a big blunt snout with a broad dark nose.
 */
function Head({ eyes, mouth }: { eyes: Eyes; mouth: Mouth }) {
  return (
    <>
      <ellipse className="capy-shade" cx={25} cy={17} rx={6.5} ry={5.5} />
      <ellipse className="capy-ear" cx={25.5} cy={17.6} rx={2.8} ry={2.2} />
      <ellipse className="capy-shade" cx={75} cy={17} rx={6.5} ry={5.5} />
      <ellipse className="capy-ear" cx={74.5} cy={17.6} rx={2.8} ry={2.2} />
      <rect className="capy-fur" x={14} y={13} width={72} height={67} rx={25} ry={23} />
      <path className="capy-tuft" d="M45 14 Q48 7 51 13 Q54 7 57 14" />
      <Eye x={32} kind={eyes} />
      <Eye x={68} kind={eyes} />
      <ellipse className="capy-blush" cx={22} cy={49} rx={5} ry={3} />
      <ellipse className="capy-blush" cx={78} cy={49} rx={5} ry={3} />
      <rect className="capy-muzzle" x={27} y={42} width={46} height={35} rx={17} />
      <ellipse className="capy-shade" cx={50} cy={51} rx={11.5} ry={6.5} />
      <ellipse className="capy-ink capy-nostril" cx={45.5} cy={51.5} rx={1.6} ry={2.3} />
      <ellipse className="capy-ink capy-nostril" cx={54.5} cy={51.5} rx={1.6} ry={2.3} />
      <path className="capy-line capy-philtrum" d="M50 57.5 L50 61" />
      {mouth === 'open' ? (
        <>
          <path className="capy-ink" d="M44 61 L56 61 Q55 68.5 50 68.5 Q45 68.5 44 61 Z" />
          <path className="capy-tongue" d="M46.6 65.6 Q50 63.6 53.4 65.6 Q52 68.4 50 68.4 Q48 68.4 46.6 65.6 Z" />
        </>
      ) : (
        <path className="capy-line" d="M44 61.5 Q47 65 50 62 Q53 65 56 61.5" />
      )}
    </>
  );
}

/**
 * Only the top of the head (ears, crown, eyes), as if the capybara were hiding behind the day number
 * and peeking over it. The cut below the eyes sits on the top edge of the digits.
 */
export function CapybaraPeek() {
  return (
    <svg className="capy capy-peek" viewBox="10 6 80 35" aria-hidden="true" focusable="false">
      <g className="capy-bob">
        <Head eyes="open" mouth="smile" />
      </g>
    </svg>
  );
}

/** A four-pointed sparkle centred on (x, y). */
function Sparkle({ x, y, size, className }: { x: number; y: number; size: number; className: string }) {
  const s = size;
  const k = size / 6;
  return (
    <path
      className={className}
      d={`M${x} ${y - s} Q${x + k} ${y - k} ${x + s} ${y} Q${x + k} ${y + k} ${x} ${y + s} Q${x - k} ${y + k} ${x - s} ${y} Q${x - k} ${y - k} ${x} ${y - s} Z`}
    />
  );
}

/** An arm raised from the shoulder at (sx, sy) to the paw at (px, py). */
function RaisedArm({ sx, sy, px, py }: { sx: number; sy: number; px: number; py: number }) {
  return (
    <>
      <path className="capy-arm" d={`M${sx} ${sy} L${px} ${py}`} />
      <circle className="capy-shade" cx={px} cy={py} r={5.5} />
    </>
  );
}

const POSE: Record<MascotMood, { eyes: Eyes; mouth: Mouth }> = {
  menstruation: { eyes: 'sleepy', mouth: 'smile' },
  follicular: { eyes: 'open', mouth: 'open' },
  ovulation: { eyes: 'happy', mouth: 'open' },
  luteal: { eyes: 'sleepy', mouth: 'smile' },
  hello: { eyes: 'open', mouth: 'smile' },
};

/**
 * The whole capybara, in a pose for the phase: a warm cup of tea during the period, arms up and a
 * sprout in the follicular phase, a little yuzu and a grin at ovulation, wrapped in a blanket in the
 * luteal phase, and a wave when there is no phase to show.
 */
export function Capybara({ mood }: { mood: MascotMood }) {
  const { eyes, mouth } = POSE[mood];
  return (
    <svg className="capy capy-full" data-mood={mood} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      {/* Behind the body: raised arms. */}
      {mood === 'follicular' && (
        <>
          <RaisedArm sx={40} sy={80} px={22} py={58} />
          <RaisedArm sx={80} sy={80} px={98} py={58} />
        </>
      )}
      {mood === 'hello' && (
        <g className="capy-wave">
          <RaisedArm sx={80} sy={82} px={99} py={62} />
        </g>
      )}

      {/* Body, neck and feet. */}
      <ellipse className="capy-shade" cx={45} cy={112} rx={9} ry={5} />
      <ellipse className="capy-shade" cx={75} cy={112} rx={9} ry={5} />
      <ellipse className="capy-fur" cx={60} cy={90} rx={34} ry={24} />
      <rect className="capy-fur" x={36} y={50} width={48} height={32} rx={14} />

      {/* In front of the body. */}
      {mood === 'menstruation' && (
        <g className="capy-tea">
          <path className="capy-steam" d="M56 84 q-3 -3.5 0 -7 q3 -3.5 0 -7" />
          <path className="capy-steam capy-steam-2" d="M64 84 q-3 -3.5 0 -7 q3 -3.5 0 -7" />
          <path className="capy-mug-handle" d="M71 92 q7 0 7 6 q0 6 -7 6" />
          <rect className="capy-mug" x={48} y={87} width={24} height={21} rx={5} />
          <ellipse className="capy-tea-top" cx={60} cy={88.5} rx={9.5} ry={2} />
          <ellipse className="capy-shade" cx={48.5} cy={98} rx={5.5} ry={5} />
          <ellipse className="capy-shade" cx={71.5} cy={98} rx={5.5} ry={5} />
        </g>
      )}
      {mood === 'luteal' && (
        <>
          <path className="capy-blanket" d="M24 114 Q20 80 38 70 Q60 60 82 70 Q100 80 96 114 Z" />
          <path className="capy-blanket-stripe" d="M27 96 Q60 84 93 96" />
          <path className="capy-blanket-stripe" d="M25 106 Q60 94 95 106" />
          <ellipse className="capy-shade" cx={50} cy={71} rx={5.5} ry={4.5} />
          <ellipse className="capy-shade" cx={70} cy={71} rx={5.5} ry={4.5} />
        </>
      )}
      {(mood === 'ovulation' || mood === 'hello') && (
        <>
          <ellipse className="capy-shade" cx={42} cy={92} rx={5.5} ry={5} />
          {mood === 'ovulation' && <ellipse className="capy-shade" cx={78} cy={92} rx={5.5} ry={5} />}
        </>
      )}

      {/* The head, scaled into place. */}
      <g transform="translate(24 6) scale(0.72)">
        <Head eyes={eyes} mouth={mouth} />
      </g>

      {/* On and around the head. */}
      {mood === 'follicular' && (
        <>
          <path className="capy-sprout-stem" d="M60 15 Q60 10 60 6" />
          <path className="capy-sprout" d="M60 8 Q52 2 47 7 Q53 12 60 8 Z" />
          <path className="capy-sprout" d="M60 7 Q67 0 73 4 Q68 11 60 7 Z" />
          <g className="capy-sparkles">
            <Sparkle x={12} y={34} size={5} className="capy-sparkle-follicular" />
            <Sparkle x={108} y={30} size={6} className="capy-sparkle-follicular" />
            <Sparkle x={106} y={82} size={4} className="capy-sparkle-follicular" />
          </g>
        </>
      )}
      {mood === 'ovulation' && (
        <>
          <g className="capy-yuzu">
            <circle className="capy-yuzu-fruit" cx={60} cy={12} r={7} />
            <path className="capy-yuzu-leaf" d="M61 6 Q66 0 71 3 Q67 8 61 6 Z" />
          </g>
          <g className="capy-sparkles">
            <Sparkle x={18} y={30} size={5} className="capy-sparkle-ovulation" />
            <Sparkle x={103} y={40} size={6} className="capy-sparkle-ovulation" />
          </g>
        </>
      )}
      {mood === 'luteal' && (
        <g className="capy-zzz">
          <path className="capy-z" d="M92 22 h7 l-7 8 h7" />
          <path className="capy-z capy-z-2" d="M103 10 h5 l-5 6 h5" />
        </g>
      )}
    </svg>
  );
}
