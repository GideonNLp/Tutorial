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
  Smile,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { update, useData, useTimeline, useToday } from '../app/store';
import { setJournalDate, useJournalDate } from '../app/ui';
import { addDays, parts, startOfWeek } from '../domain/dates';
import { updateDay, type DayPatch } from '../domain/journal';
import {
  FLOWS,
  MUCUS_TYPES,
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
import { ChoiceChips, ErrorText, MultiChips, Scale, Segmented } from '../ui/controls';
import { ImportTempsSheet } from '../ui/ImportTempsSheet';
import { Screen } from '../ui/Shell';
import { visiblePhase } from '../ui/summaries';
import { haptic } from '../ui/haptics';

const NOTE_MAX = 2000;
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

  return (
    <Screen title={j.title} settings>
      <div className="stack stack-5">
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

        <Section title={j.flow.title}>
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

        <Section title={j.symptoms.title} hint={j.symptoms.hint}>
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

        <Section title={j.mood.title}>
          <Scale
            legend={j.mood.title}
            hideLegend
            options={LEVELS.map((n) => ({ value: n, label: s.mood[n], icon: iconFor(MOOD_ICONS, n) }))}
            value={log?.mood}
            onChange={(mood) => patch({ mood })}
          />
        </Section>

        <Section title={j.energy.title}>
          <Scale
            legend={j.energy.title}
            hideLegend
            options={LEVELS.map((n) => ({ value: n, label: s.energy[n], icon: iconFor(ENERGY_ICONS, n) }))}
            value={log?.energy}
            onChange={(energy) => patch({ energy })}
          />
        </Section>

        <Section title={j.bbt.title}>
          <BbtField key={date} date={date} log={log} onChange={patch} />
        </Section>

        <Section title={j.mucus.title}>
          <ChoiceChips
            legend={j.mucus.title}
            hideLegend
            options={MUCUS_TYPES.map((m) => ({ value: m, label: s.mucus[m], hint: s.mucusHelp[m] }))}
            value={log?.mucus}
            onChange={(mucus) => patch({ mucus })}
            clearable
          />
        </Section>

        <Section title={j.note.title}>
          <NoteField key={date} initial={log?.note ?? ''} onChange={(note) => patch({ note })} />
        </Section>
      </div>
    </Screen>
  );
}

function iconFor(icons: typeof MOOD_ICONS, level: Scale5): ReactNode {
  const Icon = icons[level - 1]!;
  return <Icon size={24} aria-hidden="true" />;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="journal-section stack stack-3">
      <div className="stack stack-1">
        <h2>{title}</h2>
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
