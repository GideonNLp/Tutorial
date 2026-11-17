import {
  Annoyed,
  Battery,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Check,
  ChevronLeft,
  ChevronRight,
  Frown,
  Laugh,
  Meh,
  Pencil,
  Plus,
  Smile,
  Zap,
} from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { flush, update, useData, useTimeline, useToday } from '../app/store';
import { JOURNAL_SECTIONS, setJournalDate, setJournalOpen, toast, useJournalDate, useJournalOpen, type JournalSection } from '../app/ui';
import { assessContact } from '../domain/pregnancyRisk';
import { addDays, parts, startOfWeek } from '../domain/dates';
import { updateDay, type DayPatch } from '../domain/journal';
import {
  FLOWS,
  MUCUS_TYPES,
  PROTECTIONS,
  SEX_ACTIVITIES,
  type IntimacyLog,
  type Protection,
  type SexActivity,
  SYMPTOM_GROUPS,
  SYMPTOM_IDS,
  type DayLog,
  type Intensity,
  type ISODate,
  type Scale5,
  type SymptomGroup,
  type SymptomId,
} from '../domain/types';
import { formatDate, formatNumber, strings } from '../i18n';
import { ChoiceChips, ErrorText, MultiChips, Scale, Segmented, Switch } from '../ui/controls';
import { contactExplanation } from '../ui/PregnancyRisk';
import { ImportTempsSheet } from '../ui/ImportTempsSheet';
import { Screen } from '../ui/Shell';
import { visiblePhase } from '../ui/summaries';
import { haptic } from '../ui/haptics';
import { prefersReducedMotion } from '../ui/motion';

const NOTE_MAX = 2000;
const CONFIRM_MS = 650;
const MOOD_ICONS = [Frown, Annoyed, Meh, Smile, Laugh];
const ENERGY_ICONS = [Battery, BatteryLow, BatteryMedium, BatteryFull, Zap];
const LEVELS: Scale5[] = [1, 2, 3, 4, 5];
const INTENSITIES: Intensity[] = [1, 2, 3];

export function JournalScreen() {
  const s = strings();
  const j = s.journal;
  const date = useJournalDate();
  const today = useToday();
  const data = useData();
  const timeline = useTimeline();
  const log: DayLog | undefined = data.logs[date];
  const info = timeline.dayInfo(date);
  const phase = visiblePhase(info.phase, data.profile.showFertility);
  const [justSaved, setJustSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(savedTimer.current), []);
  // Never show a future day (for example after the date changed while the app was open).
  useEffect(() => {
    if (date > today) setJournalDate(today);
  }, [date, today]);

  const patch = (change: DayPatch) => {
    if ('flow' in change) haptic('medium');
    update((d) => ({ ...d, logs: updateDay(d.logs, date, change, new Date().toISOString()) }));
    setJustSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setJustSaved(false), 2500);
  };

  const weekStart = startOfWeek(date);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const symptoms = log?.symptoms ?? {};
  const selectedSymptoms = SYMPTOM_IDS.filter((id) => symptoms[id] !== undefined);

  const toggleSymptom = (id: SymptomId, selected: boolean) => {
    const next = { ...symptoms };
    if (selected) next[id] = 2;
    else delete next[id];
    patch({ symptoms: next });
  };

  // ---- Folding: a day with entries opens as a compact summary; an empty day opens in full.
  const stored = useJournalOpen(date);
  const open: readonly JournalSection[] = stored ?? (log ? [] : JOURNAL_SECTIONS);
  useEffect(() => {
    if (stored === undefined) setJournalOpen(date, log ? [] : JOURNAL_SECTIONS);
    // Only the first visit of a day decides; later entries must not fold the page under the person's hands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, stored]);

  const rootRef = useRef<HTMLDivElement>(null);
  const [focusSection, setFocusSection] = useState<JournalSection | null>(null);
  const edit = (id: JournalSection) => {
    setJournalOpen(date, [...open.filter((x) => x !== id), id]);
    setFocusSection(id);
  };
  // Opening a section moves focus to its first control, so keyboard and screen-reader users land in it.
  useEffect(() => {
    if (!focusSection) return;
    const section = rootRef.current?.querySelector(`[data-section="${focusSection}"]`);
    section?.querySelector<HTMLElement>('input:not([disabled]), textarea, select, button:not([disabled])')?.focus();
    setFocusSection(null);
  }, [focusSection]);

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const foldTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(foldTimer.current), []);

  const saveDay = async () => {
    if (saveState !== 'idle') return;
    // A field still being typed in (the temperature) is committed when it loses focus.
    if (document.activeElement instanceof HTMLElement && rootRef.current?.contains(document.activeElement)) document.activeElement.blur();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const page = rootRef.current?.closest('.page');
    const invalid = page?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (invalid) {
      // Something cannot be kept as typed: stay open, next to the message.
      haptic('warning');
      invalid.focus();
      return;
    }
    setSaveState('saving');
    await flush();
    haptic('success');
    setSaveState('saved');
    toast(j.savedToast);
    foldTimer.current = setTimeout(
      () => {
        setJournalOpen(date, []);
        setSaveState('idle');
        page?.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      },
      // Long enough to read the confirmation on the button; not an animation, so it stays with reduced motion.
      CONFIRM_MS,
    );
  };

  const fold = (id: JournalSection, items: SummaryItem[], preview?: string): Fold => ({
    id,
    open: open.includes(id),
    items,
    preview,
    onEdit: edit,
  });
  const intimacy = log?.intimacy;
  const folds = {
    flow: fold('flow', log?.flow ? [{ text: log.flow === 'unspecified' ? j.periodNoIntensity : s.flow[log.flow] }] : []),
    symptoms: fold(
      'symptoms',
      selectedSymptoms.map((id) => ({ text: s.symptom[id], detail: s.intensity[symptoms[id]!].toLowerCase() })),
    ),
    mood: fold('mood', log?.mood ? [{ text: s.mood[log.mood] }] : []),
    energy: fold('energy', log?.energy ? [{ text: s.energy[log.energy] }] : []),
    bbt: fold(
      'bbt',
      log?.bbt
        ? [
            {
              text: `${formatNumber(log.bbt.celsius, 2)} °C`,
              detail: log.bbt.source === 'import' ? j.bbt.imported(log.bbt.device ?? s.importTemps.deviceDefault).toLowerCase() : undefined,
            },
          ]
        : [],
    ),
    mucus: fold('mucus', log?.mucus ? [{ text: s.mucus[log.mucus] }] : []),
    intimacy: fold(
      'intimacy',
      intimacy
        ? [
            { text: j.intimacyTag },
            ...intimacy.activities.map((a) => ({ text: s.sexActivity[a] })),
            ...intimacy.protection.map((p) => ({ text: s.protection[p] })),
            ...(intimacy.condomFailed ? [{ text: j.condomFailedTag }] : []),
          ]
        : [],
    ),
    note: fold('note', [], log?.note),
  };

  return (
    <Screen title={j.title} settings>
      <div className="stack stack-5" ref={rootRef}>
        <nav className="weekstrip" aria-label={j.weekLabel}>
          <button type="button" className="icon-btn" aria-label={j.prevWeek} onClick={() => setJournalDate(addDays(date, -7))}>
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <ul>
            {week.map((d, i) => (
              <li key={d}>
                <button
                  type="button"
                  className="weekday"
                  aria-current={d === date ? 'date' : undefined}
                  disabled={d > today}
                  onClick={() => setJournalDate(d)}
                >
                  <span className="sr-only">{`${formatDate(d, 'weekdayDayMonth')}${data.logs[d] ? `, ${j.hasEntry}` : ''}`}</span>
                  <span className="weekday-name" aria-hidden="true">
                    {s.calendar.weekdaysShort[i]}
                  </span>
                  <span className="weekday-num" aria-hidden="true">
                    {parts(d).day}
                  </span>
                  <span className={data.logs[d] ? 'weekday-dot on' : 'weekday-dot'} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="icon-btn"
            aria-label={j.nextWeek}
            disabled={addDays(weekStart, 7) > today}
            onClick={() => setJournalDate(addDays(date, 7) > today ? today : addDays(date, 7))}
          >
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        </nav>

        <div className="stack stack-1">
          <div className="row row-between">
            <h2>{formatDate(date, 'weekdayDayMonth')}</h2>
            {date !== today && (
              <button type="button" className="btn btn-quiet btn-small" onClick={() => setJournalDate(today)}>
                {j.goToday}
              </button>
            )}
          </div>
          {info.cycleDay !== undefined && (
            <p className="ink-2 phase-line" data-phase={phase}>
              {phase && <span className="swatch" aria-hidden="true" />}
              <span>{phase ? j.cycleInfo(info.cycleDay, s.phaseInSentence[phase]) : s.calendar.detail.cycleDay(info.cycleDay)}</span>
            </p>
          )}
          <p className="caption save-state" role="status">
            {justSaved ? (
              <>
                <Check size={14} aria-hidden="true" /> {j.savedNow}
              </>
            ) : (
              j.autosave
            )}
          </p>
        </div>

        <Section title={j.flow.title} fold={folds.flow}>
          <ChoiceChips
            legend={j.flow.title}
            hideLegend
            hint={j.flow.hint}
            options={FLOWS.map((f) => ({ value: f, label: s.flow[f] }))}
            value={log?.flow === 'unspecified' ? undefined : log?.flow}
            onChange={(flow) => patch({ flow })}
            clearable
          />
          {log?.flow === 'unspecified' && (
            <div className="stack stack-1">
              <p className="small ink-2">{j.flow.unspecified}</p>
              <div>
                <button type="button" className="btn btn-quiet btn-small" onClick={() => patch({ flow: undefined })}>
                  {j.flow.clear}
                </button>
              </div>
            </div>
          )}
        </Section>

        <Section title={j.symptoms.title} hint={j.symptoms.hint} fold={folds.symptoms}>
          {(Object.keys(SYMPTOM_GROUPS) as SymptomGroup[]).map((group) => (
            <MultiChips
              key={group}
              legend={s.symptomGroup[group]}
              options={SYMPTOM_GROUPS[group].map((id) => ({ value: id, label: s.symptom[id] }))}
              values={selectedSymptoms}
              onToggle={toggleSymptom}
            />
          ))}
          {selectedSymptoms.length > 0 && (
            <div className="stack stack-3 intensity-list">
              <h3>{j.symptoms.intensityTitle}</h3>
              {selectedSymptoms.map((id) => (
                <div className="intensity-row" key={id}>
                  <span className="small strong" aria-hidden="true">
                    {s.symptom[id]}
                  </span>
                  <Segmented
                    small
                    legend={j.symptoms.intensityFor(s.symptom[id])}
                    hideLegend
                    options={INTENSITIES.map((n) => ({ value: n, label: s.intensity[n] }))}
                    value={symptoms[id]!}
                    onChange={(n) => patch({ symptoms: { ...symptoms, [id]: n } })}
                  />
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title={j.mood.title} fold={folds.mood}>
          <Scale
            legend={j.mood.title}
            hideLegend
            options={LEVELS.map((n) => ({ value: n, label: s.mood[n], icon: iconFor(MOOD_ICONS, n) }))}
            value={log?.mood}
            onChange={(mood) => patch({ mood })}
          />
        </Section>

        <Section title={j.energy.title} fold={folds.energy}>
          <Scale
            legend={j.energy.title}
            hideLegend
            options={LEVELS.map((n) => ({ value: n, label: s.energy[n], icon: iconFor(ENERGY_ICONS, n) }))}
            value={log?.energy}
            onChange={(energy) => patch({ energy })}
          />
        </Section>

        <Section title={j.bbt.title} fold={folds.bbt}>
          <BbtField key={date} date={date} log={log} onChange={patch} />
        </Section>

        <Section title={j.mucus.title} fold={folds.mucus}>
          <ChoiceChips
            legend={j.mucus.title}
            hideLegend
            options={MUCUS_TYPES.map((m) => ({ value: m, label: s.mucus[m], hint: s.mucusHelp[m] }))}
            value={log?.mucus}
            onChange={(mucus) => patch({ mucus })}
            clearable
          />
        </Section>

        <IntimacySection key={`intimacy-${date}`} date={date} log={log} onChange={patch} fold={folds.intimacy} />

        <Section title={j.note.title} fold={folds.note}>
          <NoteField key={date} initial={log?.note ?? ''} onChange={(note) => patch({ note })} />
        </Section>

        {open.length > 0 && (
          // Stays at the bottom of the screen while sections are open, and settles after the last one.
          <div className="save-bar">
            <button
              type="button"
              className={saveState === 'saved' ? 'btn btn-primary btn-block btn-saved' : 'btn btn-primary btn-block'}
              aria-busy={saveState === 'saving' || undefined}
              onClick={() => void saveDay()}
            >
              {saveState === 'saved' ? (
                <>
                  <Check size={18} aria-hidden="true" />
                  {j.saved}
                </>
              ) : (
                j.save
              )}
            </button>
          </div>
        )}
      </div>
    </Screen>
  );
}

/**
 * Sexual activity for the day: one switch, then optional details. The risk of pregnancy for
 * the day is shown right under them, so the person sees what the details change.
 */
function IntimacySection({ date, log, onChange, fold }: { date: ISODate; log: DayLog | undefined; onChange: (patch: DayPatch) => void; fold: Fold }) {
  const s = strings();
  const j = s.journal.intimacy;
  const data = useData();
  const timeline = useTimeline();
  const intimacy = log?.intimacy;
  const set = (next: IntimacyLog | undefined) => onChange({ intimacy: next });

  const toggle = (on: boolean) => {
    if (on) return set({ activities: [], protection: [] });
    const before = intimacy;
    set(undefined);
    toast(j.removed, { action: { label: s.common.undo, run: () => set(before) } });
  };

  const assessment = intimacy ? assessContact(timeline, date, intimacy, data.profile.showFertility) : undefined;

  return (
    <Section title={j.title} hint={j.hint} fold={fold}>
      <Switch label={j.had} checked={!!intimacy} onChange={toggle} />
      {intimacy && assessment && (
        <>
          <MultiChips
            legend={j.activities}
            hint={j.activitiesHint}
            options={SEX_ACTIVITIES.map((a) => ({ value: a, label: s.sexActivity[a] }))}
            values={intimacy.activities}
            onToggle={(activity: SexActivity, on) =>
              set({ ...intimacy, activities: on ? [...intimacy.activities, activity] : intimacy.activities.filter((a) => a !== activity) })
            }
          />
          <MultiChips
            legend={j.protection}
            hint={j.protectionHint}
            options={PROTECTIONS.map((p) => ({ value: p, label: s.protection[p], hint: s.protectionHelp[p] }))}
            values={intimacy.protection}
            onToggle={(method: Protection, on) => {
              const protection = on ? [...intimacy.protection, method] : intimacy.protection.filter((p) => p !== method);
              const next: IntimacyLog = { ...intimacy, protection };
              if (!protection.includes('condom')) delete next.condomFailed;
              set(next);
            }}
          />
          {intimacy.protection.includes('condom') && (
            <Switch
              label={j.condomFailed}
              checked={!!intimacy.condomFailed}
              onChange={(failed) => {
                const next: IntimacyLog = { ...intimacy };
                if (failed) next.condomFailed = true;
                else delete next.condomFailed;
                set(next);
              }}
            />
          )}
          <div className="risk-note" role="status">
            {contactExplanation(assessment, intimacy).map((line, i) => (
              <p key={line} className={i === 0 ? 'strong' : 'small ink-2'}>
                {line}
              </p>
            ))}
          </div>
        </>
      )}
    </Section>
  );
}

function iconFor(icons: typeof MOOD_ICONS, level: Scale5): ReactNode {
  const Icon = icons[level - 1]!;
  return <Icon size={24} aria-hidden="true" />;
}

/** One item of a folded section: "Crampe" with the detail "sever". */
interface SummaryItem {
  text: string;
  detail?: string;
}

/** How a section looks once the day is saved: what was chosen, as small tags, and a way back in. */
interface Fold {
  id: JournalSection;
  open: boolean;
  items: SummaryItem[];
  /** Longer free text (the note), shown as a two-line preview instead of tags. */
  preview?: string;
  onEdit: (id: JournalSection) => void;
}

function Section({ title, hint, fold, children }: { title: string; hint?: string; fold?: Fold; children: ReactNode }) {
  const j = strings().journal;
  const headingId = useId();
  if (fold && !fold.open) {
    const empty = fold.items.length === 0 && !fold.preview;
    return (
      <section className="journal-section journal-summary" aria-labelledby={headingId} data-section={fold.id}>
        <div className="summary-head">
          <h2 id={headingId}>{title}</h2>
          <button
            type="button"
            className="btn btn-quiet btn-small summary-edit"
            aria-label={`${empty ? j.add : j.edit}: ${title}`}
            onClick={() => fold.onEdit(fold.id)}
          >
            {empty ? <Plus size={16} aria-hidden="true" /> : <Pencil size={15} aria-hidden="true" />}
            {empty ? j.add : j.edit}
          </button>
        </div>
        {empty ? (
          <p className="small muted">{j.nothing}</p>
        ) : fold.preview ? (
          <p className="small ink-2 note-preview">{fold.preview}</p>
        ) : (
          <ul className="tags">
            {fold.items.map((item) => (
              <li key={item.text + (item.detail ?? '')} className="tag">
                {item.text}
                {item.detail && <span className="tag-detail"> · {item.detail}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }
  return (
    <section className="journal-section stack stack-3" aria-labelledby={headingId} data-section={fold?.id}>
      <div className="stack stack-1">
        <h2 id={headingId}>{title}</h2>
        {hint && <p className="small ink-2">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function BbtField({ date, log, onChange }: { date: ISODate; log: DayLog | undefined; onChange: (patch: DayPatch) => void }) {
  const s = strings();
  const b = s.journal.bbt;
  const stored = log?.bbt;
  const [text, setText] = useState(stored ? formatNumber(stored.celsius, 2) : '');
  const [invalid, setInvalid] = useState(false);
  const [importing, setImporting] = useState(false);
  const focused = useRef(false);

  // Follow changes made elsewhere (an import) without fighting the person while they type.
  useEffect(() => {
    if (!focused.current) setText(stored ? formatNumber(stored.celsius, 2) : '');
  }, [stored]);

  const commit = () => {
    const raw = text.trim().replace(',', '.');
    if (raw === '') {
      setInvalid(false);
      if (stored) onChange({ bbt: undefined });
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 34 || value > 42) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    const celsius = Math.round(value * 100) / 100;
    if (celsius !== stored?.celsius) onChange({ bbt: { celsius, source: 'manual' } });
    setText(formatNumber(celsius, 2));
  };

  return (
    <div className="stack stack-3">
      <div className="field">
        <label className="field-label" htmlFor={`bbt-${date}`}>
          {b.label}
        </label>
        <p className="field-hint" id={`bbt-${date}-hint`}>
          {b.hint}
        </p>
        <input
          id={`bbt-${date}`}
          className="input input-short num"
          inputMode="decimal"
          autoComplete="off"
          placeholder="36,50"
          value={text}
          aria-invalid={invalid || undefined}
          aria-describedby={`bbt-${date}-hint${invalid ? ` bbt-${date}-error` : ''}`}
          onFocus={() => (focused.current = true)}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            focused.current = false;
            commit();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
        />
        {invalid && <ErrorText id={`bbt-${date}-error`}>{b.invalid}</ErrorText>}
        {stored?.source === 'import' && <p className="caption">{b.imported(stored.device ?? s.importTemps.deviceDefault)}</p>}
      </div>
      <div className="row">
        <button type="button" className="btn btn-secondary btn-small" onClick={() => setImporting(true)}>
          {b.importAction}
        </button>
        {stored && (
          <button
            type="button"
            className="btn btn-quiet btn-small"
            onClick={() => {
              setText('');
              setInvalid(false);
              onChange({ bbt: undefined });
            }}
          >
            {b.clear}
          </button>
        )}
      </div>
      <ImportTempsSheet open={importing} onClose={() => setImporting(false)} />
    </div>
  );
}

function NoteField({ initial, onChange }: { initial: string; onChange: (note: string) => void }) {
  const n = strings().journal.note;
  const [text, setText] = useState(initial);
  return (
    <div className="field">
      <label className="sr-only" htmlFor="journal-note">
        {n.label}
      </label>
      <textarea
        id="journal-note"
        className="textarea"
        maxLength={NOTE_MAX}
        placeholder={n.placeholder}
        value={text}
        aria-describedby="journal-note-count"
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value);
        }}
      />
      <p className="caption" id="journal-note-count">
        {n.counter(text.length, NOTE_MAX)}
      </p>
    </div>
  );
}
