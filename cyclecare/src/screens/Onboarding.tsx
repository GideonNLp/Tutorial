import { Check, ChevronLeft, Info } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { requestNotifications } from '../app/platform';
import { completeOnboarding, useStorageMode, useToday } from '../app/store';
import { content } from '../content';
import { diffDays, isValidISODate } from '../domain/dates';
import { DEFAULT_CYCLE_LENGTH, DEFAULT_PERIOD_LENGTH } from '../domain/prediction';
import { GOALS, type Goal, type ISODate } from '../domain/types';
import { strings } from '../i18n';
import { ErrorText, MultiChips, Stepper, Switch } from '../ui/controls';
import { PIN_PATTERN, PinFields } from '../ui/PinFields';
import { PolicyText } from '../ui/PolicyText';
import { Sheet } from '../ui/Sheet';
import { StepStack } from '../ui/StepStack';
import { Notice } from '../ui/Shell';
import { haptic } from '../ui/haptics';

type Step = 'welcome' | 'consent' | 'lastPeriod' | 'cycleLength' | 'periodLength' | 'goals' | 'finish';
const QUESTION_STEPS: Step[] = ['consent', 'lastPeriod', 'cycleLength', 'periodLength', 'goals', 'finish'];

export function Onboarding() {
  const s = strings();
  const o = s.onboarding;
  const today = useToday();
  const storage = useStorageMode();
  const [step, setStep] = useState<Step>('welcome');
  const [busy, setBusy] = useState(false);

  const [lastPeriod, setLastPeriod] = useState<ISODate | ''>('');
  const [lastPeriodError, setLastPeriodError] = useState(false);
  const [cycleLength, setCycleLength] = useState<number | undefined>(undefined);
  const [cycleDraft, setCycleDraft] = useState(DEFAULT_CYCLE_LENGTH);
  const [periodLength, setPeriodLength] = useState<number | undefined>(undefined);
  const [periodDraft, setPeriodDraft] = useState(DEFAULT_PERIOD_LENGTH);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [pin, setPin] = useState('');
  const [pinRepeat, setPinRepeat] = useState('');
  const [pinError, setPinError] = useState<string | undefined>(undefined);
  const [reminder, setReminder] = useState(false);

  const [forward, setForward] = useState(true);

  const index = QUESTION_STEPS.indexOf(step);
  const back = () => {
    setForward(false);
    setStep(index <= 0 ? 'welcome' : QUESTION_STEPS[index - 1]!);
  };
  const go = (next: Step) => {
    setForward(true);
    setStep(next);
  };

  const finish = async () => {
    if (pin || pinRepeat) {
      if (!PIN_PATTERN.test(pin)) return setPinError(o.finish.pinInvalid);
      if (pin !== pinRepeat) return setPinError(o.finish.pinMismatch);
    }
    setBusy(true);
    try {
      await completeOnboarding({
        lastPeriodStart: lastPeriod || undefined,
        cycleLength,
        periodLength,
        goals,
        pin: pin || undefined,
        periodReminder: reminder,
      });
      haptic('success');
    } finally {
      setBusy(false);
    }
  };

  const shell = (title: string, body: ReactNode, actions: ReactNode) => (
    <div className="onb">
      <header className="onb-top">
        <button type="button" className="icon-btn outlined" aria-label={s.common.back} onClick={back}>
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
        <p className="caption" aria-live="polite">
          {o.progress(index + 1, QUESTION_STEPS.length)}
        </p>
        <div className="onb-progress" aria-hidden="true">
          <span style={{ width: `${((index + 1) / QUESTION_STEPS.length) * 100}%` }} />
        </div>
      </header>
      <main className="onb-body stack stack-5">
        <h1 tabIndex={-1} data-page-title="">
          {title}
        </h1>
        {body}
      </main>
      <footer className="onb-actions">{actions}</footer>
    </div>
  );

  const renderStep = (): ReactNode => {
    if (step === 'welcome') {
      return (
        <div className="onb">
          <main className="onb-body onb-welcome stack stack-5">
            <BrandMark />
            <div className="stack stack-3">
              <p className="brand-name">{s.common.appName}</p>
              <h1>{o.welcome.title}</h1>
              <p className="lead">{o.welcome.lead}</p>
            </div>
            <ul className="stack stack-3">
              {o.welcome.points.map((point) => (
                <li key={point} className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                  <Check size={20} aria-hidden="true" style={{ flex: 'none', marginTop: '0.2rem' }} />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </main>
          <footer className="onb-actions">
            <button type="button" className="btn btn-primary btn-block" onClick={() => go('consent')}>
              {o.welcome.start}
            </button>
            {__PREVIEW__ && (
              <p className="caption" style={{ textAlign: 'center' }}>
                {o.welcome.previewNote}
              </p>
            )}
          </footer>
        </div>
      );
    }

    if (step === 'consent') {
      return <ConsentStep shell={shell} busy={busy} onAccept={() => go('lastPeriod')} />;
    }

    if (step === 'lastPeriod') {
      const tooOld = lastPeriod !== '' && isValidISODate(lastPeriod) && diffDays(today, lastPeriod) > 90;
      return shell(
        o.lastPeriod.title,
        <div className="field">
          <label className="field-label" htmlFor="last-period">
            {o.lastPeriod.label}
          </label>
          <p className="field-hint" id="last-period-hint">
            {o.lastPeriod.hint}
          </p>
          <input
            id="last-period"
            className="input"
            type="date"
            max={today}
            value={lastPeriod}
            aria-invalid={lastPeriodError || undefined}
            aria-describedby={`last-period-hint${lastPeriodError ? ' last-period-error' : ''}`}
            onChange={(e) => {
              setLastPeriod(e.target.value);
              setLastPeriodError(false);
            }}
          />
          {lastPeriodError && <ErrorText id="last-period-error">{o.lastPeriod.future}</ErrorText>}
          {tooOld && <Notice icon={<Info size={18} aria-hidden="true" />}>{o.lastPeriod.tooOld}</Notice>}
        </div>,
        <>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => {
              if (!isValidISODate(lastPeriod) || lastPeriod > today) return setLastPeriodError(true);
              go('cycleLength');
            }}
          >
            {s.common.next}
          </button>
          <button
            type="button"
            className="btn btn-quiet btn-block"
            onClick={() => {
              setLastPeriod('');
              go('cycleLength');
            }}
          >
            {o.lastPeriod.skip}
          </button>
        </>,
      );
    }

    if (step === 'cycleLength') {
      return shell(
        o.cycleLength.title,
        <Stepper label={o.cycleLength.label} hint={o.cycleLength.hint} value={cycleDraft} min={21} max={45} onChange={setCycleDraft} />,
        <>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => {
              setCycleLength(cycleDraft);
              go('periodLength');
            }}
          >
            {s.common.next}
          </button>
          <button
            type="button"
            className="btn btn-quiet btn-block"
            onClick={() => {
              setCycleLength(undefined);
              go('periodLength');
            }}
          >
            {o.cycleLength.skip}
          </button>
        </>,
      );
    }

    if (step === 'periodLength') {
      return shell(
        o.periodLength.title,
        <Stepper label={o.periodLength.label} hint={o.periodLength.hint} value={periodDraft} min={2} max={10} onChange={setPeriodDraft} />,
        <>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => {
              setPeriodLength(periodDraft);
              go('goals');
            }}
          >
            {s.common.next}
          </button>
          <button
            type="button"
            className="btn btn-quiet btn-block"
            onClick={() => {
              setPeriodLength(undefined);
              go('goals');
            }}
          >
            {o.periodLength.skip}
          </button>
        </>,
      );
    }

    if (step === 'goals') {
      return shell(
        o.goals.title,
        <>
          <MultiChips
            legend={o.goals.title}
            hideLegend
            hint={o.goals.hint}
            options={GOALS.map((g) => ({ value: g, label: s.goal[g] }))}
            values={goals}
            onToggle={(goal, selected) => setGoals((list) => (selected ? [...list, goal] : list.filter((g) => g !== goal)))}
          />
          {goals.length > 0 && (
            <ul className="stack stack-2 small ink-2">
              {GOALS.filter((g) => goals.includes(g)).map((g) => (
                <li key={g}>
                  <span className="strong">{s.goal[g]}:</span> {s.goalHint[g].charAt(0).toLowerCase() + s.goalHint[g].slice(1)}.
                </li>
              ))}
            </ul>
          )}
          {goals.includes('contraception') && (
            <Notice attention icon={<Info size={20} aria-hidden="true" />}>
              <p role="alert">{s.contraceptionGoalWarning}</p>
            </Notice>
          )}
        </>,
        <>
          <button type="button" className="btn btn-primary btn-block" onClick={() => go('finish')}>
            {s.common.next}
          </button>
          <button
            type="button"
            className="btn btn-quiet btn-block"
            onClick={() => {
              setGoals([]);
              go('finish');
            }}
          >
            {s.common.skip}
          </button>
        </>,
      );
    }

    return shell(
      o.finish.title,
      <>
        <p className="lead">{o.finish.lead}</p>
        <p className="small ink-2">
          {cycleLength === undefined && periodLength === undefined
            ? o.finish.summaryDefault
            : [cycleLength !== undefined && o.finish.summaryCycle(cycleLength), periodLength !== undefined && o.finish.summaryPeriod(periodLength)]
                .filter(Boolean)
                .join('. ') + '.'}
        </p>
        {storage !== 'plain' && (
          <section className="card tight stack stack-3" aria-labelledby="onb-pin">
            <div className="stack stack-1">
              <h2 id="onb-pin">{o.finish.pinTitle}</h2>
              <p className="small ink-2">{o.finish.pinBody}</p>
            </div>
            <PinFields
              label={o.finish.pinLabel}
              repeatLabel={o.finish.pinRepeat}
              pin={pin}
              repeat={pinRepeat}
              onPin={(v) => {
                setPin(v);
                setPinError(undefined);
              }}
              onRepeat={(v) => {
                setPinRepeat(v);
                setPinError(undefined);
              }}
              error={pinError}
            />
            <p className="caption">{o.finish.pinWarning}</p>
          </section>
        )}
        <section className="card tight">
          <Switch
            label={o.finish.reminderTitle}
            hint={o.finish.reminderBody}
            checked={reminder}
            onChange={(on) => {
              setReminder(on);
              if (on) void requestNotifications();
            }}
          />
        </section>
      </>,
      <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={() => void finish()}>
        {busy ? s.common.loading : o.finish.open}
      </button>,
    );
  };

  return (
    <StepStack id={step} forward={forward}>
      {renderStep()}
    </StepStack>
  );
}

function ConsentStep(props: { shell: (title: string, body: ReactNode, actions: ReactNode) => ReactNode; busy: boolean; onAccept: () => void }) {
  const c = content().legal.consentText;
  const [health, setHealth] = useState(false);
  const [age, setAge] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [declined, setDeclined] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const policy = content().legal.privacyPolicy;

  return props.shell(
    c.title,
    <>
      <p>{c.intro}</p>
      <dl className="stack consent-points">
        {c.points.map((point) => (
          <div key={point.title}>
            <dt className="strong">{point.title}</dt>
            <dd className="ink-2">{point.body}</dd>
          </div>
        ))}
      </dl>
      <div>
        <button type="button" className="btn btn-quiet" onClick={() => setPolicyOpen(true)}>
          {c.policyLink}
        </button>
      </div>
      <div className="card tight">
        <label className="check-row">
          <input
            type="checkbox"
            checked={health}
            aria-describedby={error ? 'consent-error' : undefined}
            onChange={(e) => {
              setHealth(e.target.checked);
              setError(undefined);
              setDeclined(false);
            }}
          />
          <span>{c.healthCheckbox}</span>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={age}
            aria-describedby={error ? 'consent-error' : undefined}
            onChange={(e) => {
              setAge(e.target.checked);
              setError(undefined);
            }}
          />
          <span>{c.ageCheckbox}</span>
        </label>
        {error && <ErrorText id="consent-error">{error}</ErrorText>}
      </div>
      {declined && (
        <Notice icon={<Info size={18} aria-hidden="true" />}>
          <p role="status">{c.declineInfo}</p>
        </Notice>
      )}
      <Sheet open={policyOpen} onClose={() => setPolicyOpen(false)} title={policy.title}>
        <PolicyText />
      </Sheet>
    </>,
    <>
      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={props.busy}
        onClick={() => {
          if (!health) return setError(c.missingHealth);
          if (!age) return setError(c.missingAge);
          props.onAccept();
        }}
      >
        {c.accept}
      </button>
      <button
        type="button"
        className="btn btn-quiet btn-block"
        onClick={() => {
          setHealth(false);
          setDeclined(true);
        }}
      >
        {c.decline}
      </button>
    </>,
  );
}

/** A small dial: four phase arcs and a bead. Decorative. */
export function BrandMark({ size = 72 }: { size?: number }) {
  return (
    <svg className="brandmark" width={size} height={size} viewBox="0 0 72 72" aria-hidden="true">
      <g fill="none" strokeWidth="9">
        <path d="M36 8 A28 28 0 0 1 58.9 19.9" stroke="var(--menstruation)" />
        <path d="M60.6 22.6 A28 28 0 0 1 61.6 47.4" stroke="var(--follicular)" />
        <path d="M60.1 50.3 A28 28 0 0 1 49.3 60.6" stroke="var(--ovulation)" />
        <path d="M46.4 62 A28 28 0 1 1 32.9 8.2" stroke="var(--luteal)" />
      </g>
      <circle cx="61.9" cy="34" r="6.5" fill="var(--surface)" stroke="var(--ink)" strokeWidth="3" />
    </svg>
  );
}
