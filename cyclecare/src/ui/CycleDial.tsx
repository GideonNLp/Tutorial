import { Pencil } from 'lucide-react';
import { useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { clearOwnThought, loadOwnThought, saveOwnThought } from '../app/mascotThought';
import { diffDays } from '../domain/dates';
import { cleanThought, MASCOT_SHOW_MS, MASCOT_TURN_MS, mascotThought, THOUGHT_DELAY_MS, THOUGHT_MAX, type MascotMood } from '../domain/mascot';
import { FERTILE_DAYS_AFTER, FERTILE_DAYS_BEFORE, ovulationOffset, phaseAt, type Timeline } from '../domain/prediction';
import type { Phase } from '../domain/types';
import { strings } from '../i18n';
import { Capybara, CapybaraPeek } from './Capybara';
import { haptic } from './haptics';

/**
 * The cycle as a dial: day 1 at the top, clockwise. Phase arcs are estimates for the running cycle,
 * the bead marks today, the dashed arc at the top is the interval in which the next period is expected,
 * and the dotted arc marks the estimated fertile days.
 *
 * The middle of the dial is a card that turns over: on the front the cycle day, with a capybara
 * peeking over the number; on the back the capybara itself, in a pose for the phase, with a short
 * message. It turns back on a second tap or after a few seconds.
 */

const SIZE = 280;
const C = SIZE / 2;
const R = 104; // ring radius
const RING = 20; // ring thickness
const OUTER = R + 19; // radius of the outer track (fertile days, next-period interval)
const GAP = 2 / (2 * Math.PI * R); // 2px between arcs, as a fraction of the circle

/** A position in the dial's drawing as a share of its size, for an element laid over it. */
const percent = (value: number): string => `${((value / SIZE) * 100).toFixed(3)}%`;

function point(fraction: number, radius: number): [number, number] {
  const angle = fraction * 2 * Math.PI - Math.PI / 2;
  return [C + radius * Math.cos(angle), C + radius * Math.sin(angle)];
}

function arc(from: number, to: number, radius: number): string {
  const [x1, y1] = point(from, radius);
  const [x2, y2] = point(to, radius);
  const large = to - from > 0.5 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/**
 * What an arc of the dial stands for: one of the four phases, `overdue` (days after the expected
 * start of a period that has not come), or `rest` (everything but menstruation, when the person
 * switched phase and fertility estimates off).
 */
export type SpanKind = Phase | 'overdue' | 'rest';

export interface PhaseSpan {
  kind: SpanKind;
  /** 1-based cycle days, inclusive. */
  from: number;
  to: number;
}

/** Spans of the running cycle, for the dial and the legend under it. */
export function phaseSpans(timeline: Timeline, showFertility: boolean): { spans: PhaseSpan[]; total: number } {
  const { prediction } = timeline;
  const current = prediction.current;
  if (!current) return { spans: [], total: prediction.cycleLength };
  const total = Math.max(prediction.cycleLength, current.cycleDay);
  const periodEnd = diffDays(current.periodEnd, current.start);
  const spans: PhaseSpan[] = [];
  for (let d = 0; d < total; d++) {
    let kind: SpanKind = d >= prediction.cycleLength ? 'overdue' : phaseAt(d, prediction.cycleLength, periodEnd);
    if (!showFertility && kind !== 'menstruation' && kind !== 'overdue') kind = 'rest';
    const last = spans[spans.length - 1];
    if (last && last.kind === kind) last.to = d + 1;
    else spans.push({ kind, from: d + 1, to: d + 1 });
  }
  return { spans, total };
}

const strokeOf = (kind: SpanKind) => (kind === 'overdue' || kind === 'rest' ? 'var(--line-strong)' : `var(--${kind})`);

/**
 * The turning middle of the dial. Tapping it turns the card to the capybara; about a second later a
 * thought bubble appears beside it. Tapping the thought lets the person write their own; while they
 * do, the dial stays turned. The bubble is a sibling of the turning button, not a child of it, because
 * a button cannot hold other controls.
 */
function DialCenter({
  text,
  number,
  phaseLabel,
  mood,
  cycleDay,
  muted,
}: {
  text: string;
  number: string;
  phaseLabel?: string;
  mood: MascotMood;
  cycleDay: number;
  muted?: boolean;
}) {
  const s = strings();
  const t = s.mascot;
  const [flipped, setFlipped] = useState(false);
  const [thoughtOn, setThoughtOn] = useState(false);
  const [editing, setEditing] = useState(false);
  // Counts the showings, so each one brings the next default thought.
  const [turn, setTurn] = useState(0);
  const [own, setOwn] = useState<string | undefined>(() => loadOwnThought());
  const [draft, setDraft] = useState('');
  // What assistive technology is told after a save or a reset.
  const [note, setNote] = useState('');
  const thought = own ?? mascotThought(t.thoughts[mood], cycleDay, turn);

  // The thought comes once the turn is over, after a short pause.
  useEffect(() => {
    if (!flipped) return;
    const timer = setTimeout(() => setThoughtOn(true), MASCOT_TURN_MS + THOUGHT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [flipped]);

  // The dial turns back on its own, unless someone is writing a thought.
  useEffect(() => {
    if (!flipped || editing) return;
    const timer = setTimeout(() => {
      setFlipped(false);
      setThoughtOn(false);
    }, MASCOT_SHOW_MS);
    return () => clearTimeout(timer);
  }, [flipped, editing]);

  const toggle = () => {
    setNote('');
    if (editing) {
      // A tap on the dial while writing only stops writing; the draft is dropped, the dial stays turned.
      setEditing(false);
      return;
    }
    haptic('light');
    if (flipped) {
      setFlipped(false);
      setThoughtOn(false);
      return;
    }
    setTurn((n) => n + 1);
    setFlipped(true);
  };

  const startEdit = () => {
    setNote('');
    setDraft(thought);
    setEditing(true);
  };

  const save = () => {
    const clean = cleanThought(draft);
    if (!clean) {
      setEditing(false);
      return;
    }
    saveOwnThought(clean);
    setOwn(clean);
    setEditing(false);
    setNote(t.thought.saved);
  };

  const reset = () => {
    clearOwnThought();
    setOwn(undefined);
    setEditing(false);
    setNote(t.thought.resetDone);
  };

  const onDraftKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditing(false);
    }
  };

  const front = muted ? t.show : `${text}${phaseLabel ? `, ${phaseLabel}` : ''}. ${t.show}`;
  const at = text.lastIndexOf(number);
  const before = at >= 0 ? text.slice(0, at) : text;
  const after = at >= 0 ? text.slice(at + number.length) : '';
  const showBubble = thoughtOn || editing;

  return (
    <>
      <div className="dial-center">
        {/* Named after the face that shows, so the name always contains the visible text. */}
        <button
          type="button"
          className="dial-flip"
          data-flipped={flipped || undefined}
          data-editing={editing || undefined}
          aria-label={flipped ? t.hide : front}
          onClick={toggle}
        >
          <span className="dial-card">
            <span className="dial-face dial-front" aria-hidden="true">
              <span className={muted ? 'dial-day muted' : 'dial-day'}>
                {before}
                <span className="dial-num">
                  <CapybaraPeek />
                  {at >= 0 ? number : ''}
                </span>
                {after}
              </span>
              {/* A space between the lines, so tools that join the text read "Ziua 12 Faza…", as the name does. */}{' '}
              {phaseLabel && <span className="dial-phase">{phaseLabel}</span>}
            </span>
            <span className="dial-face dial-back" data-mood={mood} aria-hidden="true">
              <Capybara mood={mood} />
            </span>
          </span>
        </button>

        {flipped && showBubble && (
          <div className="dial-thought" data-editing={editing || undefined}>
            <div className="dial-bubble">
              {editing ? (
                <>
                  <textarea
                    className="dial-draft"
                    rows={2}
                    maxLength={THOUGHT_MAX}
                    value={draft}
                    placeholder={t.thought.placeholder}
                    aria-label={t.thought.label}
                    autoFocus
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onDraftKey}
                  />
                  <div className="dial-actions">
                    <button type="button" className="dial-action" onClick={save}>
                      {t.thought.save}
                    </button>
                    {own && (
                      <button type="button" className="dial-action dial-quiet" onClick={reset}>
                        {t.thought.reset}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <button type="button" className="dial-say" aria-label={`${thought}. ${t.thought.edit}`} onClick={startEdit}>
                  <span>{thought}</span>
                  <Pencil size={11} strokeWidth={2.4} aria-hidden="true" className="dial-pencil" />
                </button>
              )}
            </div>
            {!editing && (
              <span className="dial-trail" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            )}
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {note || (flipped && thoughtOn && !editing ? thought : '')}
      </p>
    </>
  );
}

export function CycleDial({
  timeline,
  showFertility,
  phaseLabel,
  mood,
}: {
  timeline: Timeline;
  showFertility: boolean;
  phaseLabel: string;
  mood: MascotMood;
}) {
  const s = strings();
  const { prediction } = timeline;
  const current = prediction.current;
  const { spans, total } = phaseSpans(timeline, showFertility);
  const late = prediction.status === 'late';

  if (!current) {
    return (
      <div className="dial-wrap">
        <svg className="dial" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={s.today.dialEmpty}>
          <circle cx={C} cy={C} r={R} fill="none" stroke="var(--line)" strokeWidth={RING} />
        </svg>
        <DialCenter text="–" number="–" mood="hello" cycleDay={0} muted />
      </div>
    );
  }

  const ov = ovulationOffset(prediction.cycleLength);
  const fertileFrom = Math.max(0, ov - FERTILE_DAYS_BEFORE) / total;
  const fertileTo = Math.min(total, ov + FERTILE_DAYS_AFTER + 1) / total;
  const h = Math.min(prediction.halfWidth, Math.floor(total / 2) - 1) / total;
  const today = (current.cycleDay - 0.5) / total;
  const [bx, by] = point(today, R);
  const [ox, oy] = point((ov + 0.5) / total, OUTER);
  const ticks = [1, 7, 14, 21, 28, 35, 42].filter((d) => d <= total && (d === 1 || total - d >= 3));

  return (
    <div className="dial-wrap">
      <svg className="dial" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={s.today.dialLabel(current.cycleDay, phaseLabel)}>
        {spans.map((span, index) => (
          // `pathLength` makes every arc one unit long, so the stylesheet can draw them with a single dash.
          <path
            key={span.from}
            className="dial-arc"
            style={{ '--i': index } as CSSProperties}
            pathLength={1}
            d={arc((span.from - 1) / total + GAP / 2, span.to / total - GAP / 2, R)}
            fill="none"
            stroke={strokeOf(span.kind)}
            strokeWidth={RING}
          />
        ))}
        {ticks.map((d) => {
          const [x, y] = point((d - 0.5) / total, R - RING / 2 - 12);
          return (
            <text key={d} x={x} y={y} className="dial-tick" textAnchor="middle" dominantBaseline="central">
              {d}
            </text>
          );
        })}
        {showFertility && (
          <>
            <path
              d={arc(fertileFrom, fertileTo, OUTER)}
              fill="none"
              stroke="var(--ovulation)"
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray="0.1 8"
            />
            <circle cx={ox} cy={oy} r={5.5} fill="var(--ovulation)" stroke="var(--surface)" strokeWidth={2} />
          </>
        )}
        {!late && (
          <>
            <path d={arc(1 - h, 0.9999, OUTER)} fill="none" stroke="var(--menstruation)" strokeWidth={4} strokeDasharray="7 5" />
            <path d={arc(0, h, OUTER)} fill="none" stroke="var(--menstruation)" strokeWidth={4} strokeDasharray="7 5" />
          </>
        )}
        <circle cx={bx} cy={by} r={15} fill="var(--surface)" stroke="var(--ink)" strokeWidth={3.5} />
        <circle cx={bx} cy={by} r={4.5} fill="var(--ink)" />
      </svg>
      {/* A soft ring that pulses outwards from today's bead; an element of its own, so it moves on the GPU. */}
      <span className="dial-pulse" aria-hidden="true" style={{ left: percent(bx), top: percent(by) }} />
      <DialCenter
        text={s.today.cycleDay(current.cycleDay)}
        number={String(current.cycleDay)}
        phaseLabel={phaseLabel}
        mood={mood}
        cycleDay={current.cycleDay}
      />
    </div>
  );
}
