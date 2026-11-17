import { Check, ChevronLeft, Info, Languages } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { requestNotifications } from '../app/platform';
import { partnerAvailable } from '../app/config';
import { completeOnboarding, setPrefs, startPartnerDevice, usePrefs, useStorageMode, useToday } from '../app/store';
import { isPairingCode, normalizePairingCode } from '../partner/crypto';
import { collectCredentials, joinPairing, type PartnerJoin } from '../partner/flows';
import { takeInviteCode } from '../partner/invite';
import { content } from '../content';
import { diffDays, isValidISODate } from '../domain/dates';
import { DEFAULT_CYCLE_LENGTH, DEFAULT_PERIOD_LENGTH } from '../domain/prediction';
import { GOALS, NICKNAME_MAX, type Goal, type ISODate } from '../domain/types';
import { normalizeNickname } from '../domain/user';
import { dictionaries, strings, type Locale } from '../i18n';
import { ErrorText, MultiChips, Stepper, Switch } from '../ui/controls';
import { InstallButton } from '../ui/InstallApp';
import { PinFields, validateNewPin, type PinError } from '../ui/PinFields';
import { PolicyText } from '../ui/PolicyText';
import { Sheet } from '../ui/Sheet';
import { StepStack } from '../ui/StepStack';
import { Notice } from '../ui/Shell';
import { haptic } from '../ui/haptics';

type Step = 'welcome' | 'partnerJoin' | 'partnerVerify' | 'consent' | 'nickname' | 'lastPeriod' | 'cycleLength' | 'periodLength' | 'goals' | 'finish';
const QUESTION_STEPS: Step[] = ['consent', 'nickname', 'lastPeriod', 'cycleLength', 'periodLength', 'goals', 'finish'];

/** The name to keep, if any (the step itself refuses names it cannot keep). */
function nicknameValue(raw: string): string | undefined {
  const result = normalizeNickname(raw);
  return result.ok ? result.value : undefined;
}

export function Onboarding() {
  const s = strings();
  const o = s.onboarding;
  const today = useToday();
  const storage = useStorageMode();
  // An invitation link opens straight on the partner's code screen, with the code filled in.
  const [inviteCode] = useState(() => (partnerAvailable() ? takeInviteCode() : undefined));
  const [step, setStep] = useState<Step>(inviteCode ? 'partnerJoin' : 'welcome');
  const [partnerCode, setPartnerCode] = useState(inviteCode ?? '');
  const [partnerError, setPartnerError] = useState<string | undefined>(undefined);
  const [partnerBusy, setPartnerBusy] = useState(false);
  const [join, setJoin] = useState<PartnerJoin | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState(false);
  const [lastPeriod, setLastPeriod] = useState<ISODate | ''>('');
  const [lastPeriodError, setLastPeriodError] = useState(false);
  const [cycleLength, setCycleLength] = useState<number | undefined>(undefined);
  const [cycleDraft, setCycleDraft] = useState(DEFAULT_CYCLE_LENGTH);
  const [periodLength, setPeriodLength] = useState<number | undefined>(undefined);
  const [periodDraft, setPeriodDraft] = useState(DEFAULT_PERIOD_LENGTH);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [pin, setPin] = useState('');
  const [pinRepeat, setPinRepeat] = useState('');
  const [pinError, setPinError] = useState<PinError | undefined>(undefined);
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
      const invalid = validateNewPin(pin, pinRepeat, { invalid: o.finish.pinInvalid, mismatch: o.finish.pinMismatch });
      if (invalid) return setPinError(invalid);
    }
    setBusy(true);
    try {
      await completeOnboarding({
        nickname: nicknameValue(nickname),
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

  const pm = s.partnerMode;

  const submitPartnerCode = async () => {
    const code = normalizePairingCode(partnerCode);
    if (!isPairingCode(code)) return setPartnerError(pm.join.invalid);
    setPartnerBusy(true);
    setPartnerError(undefined);
    const res = await joinPairing(code);
    setPartnerBusy(false);
    if (!res.ok) {
      haptic('warning');
      return setPartnerError(
        res.reason === 'not_found'
          ? pm.join.notFound
          : res.reason === 'conflict'
            ? pm.join.taken
            : res.reason === 'offline'
              ? s.share.errors.offline
              : s.share.errors.generic,
      );
    }
    setJoin(res.value);
    go('partnerVerify');
  };

  // Waiting for the owner to compare the digits and approve.
  useEffect(() => {
    if (step !== 'partnerVerify' || !join) return;
    let stopped = false;
    const timer = setInterval(async () => {
      const res = await collectCredentials(join);
      if (stopped) return;
      if (res.ok && res.value) {
        stopped = true;
        clearInterval(timer);
        haptic('success');
        await startPartnerDevice(res.value);
      } else if (!res.ok && res.reason !== 'offline' && res.reason !== 'server') {
        stopped = true;
        clearInterval(timer);
        setPartnerError(res.reason === 'not_found' ? pm.verify.rejected : pm.verify.failed);
      }
    }, 2000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [step, join, pm]);

  /** First-run screens for the partner: no progress bar, a way back to the welcome screen. */
  const partnerShell = (title: string, body: ReactNode, actions: ReactNode) => (
    <div className="onb">
      <header className="onb-top">
        <button
          type="button"
          className="icon-btn outlined"
          aria-label={s.common.back}
          onClick={() => {
            setJoin(undefined);
            setPartnerError(undefined);
            setForward(false);
            setStep(step === 'partnerVerify' ? 'partnerJoin' : 'welcome');
          }}
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
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
    if (step === 'partnerJoin') {
      return partnerShell(
        pm.join.title,
        <>
          <p className="ink-2">{pm.join.lead}</p>
          <div className="field">
            <label className="field-label" htmlFor="partner-code">
              {pm.join.label}
            </label>
            <p className="field-hint" id="partner-code-hint">
              {pm.join.hint}
            </p>
            <input
              id="partner-code"
              className="input pin-input"
              value={partnerCode}
              maxLength={8}
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="go"
              aria-invalid={partnerError ? true : undefined}
              aria-describedby={`partner-code-hint${partnerError ? ' partner-code-error' : ''}`}
              onChange={(e) => {
                setPartnerCode(e.target.value.toUpperCase());
                setPartnerError(undefined);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitPartnerCode();
              }}
            />
            {partnerError && <ErrorText id="partner-code-error">{partnerError}</ErrorText>}
          </div>
          <Notice icon={<Info size={18} aria-hidden="true" />}>
            <p>{pm.join.notice}</p>
          </Notice>
        </>,
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={partnerBusy}
          aria-busy={partnerBusy || undefined}
          onClick={() => void submitPartnerCode()}
        >
          {pm.join.submit}
        </button>,
      );
    }

    if (step === 'partnerVerify' && join) {
      return partnerShell(
        pm.verify.title,
        <>
          <p className="ink-2">{pm.verify.lead}</p>
          <p className="pair-code" data-testid="partner-digits">
            {join.digits}
          </p>
          {partnerError ? (
            <ErrorText>{partnerError}</ErrorText>
          ) : (
            <p className="caption" role="status">
              {pm.verify.waiting}
            </p>
          )}
        </>,
        null,
      );
    }

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
            <InstallButton className="btn btn-secondary btn-block" />
            {partnerAvailable() && (
              <div className="stack stack-1 onb-partner">
                <p className="caption">{pm.welcomeHint}</p>
                <button type="button" className="btn btn-quiet btn-block" onClick={() => go('partnerJoin')}>
                  {pm.welcomeAction}
                </button>
              </div>
            )}
            <LanguageSwitch />
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
      return <ConsentStep shell={shell} busy={busy} onAccept={() => go('nickname')} />;
    }

    if (step === 'nickname') {
      const next = () => {
        if (!normalizeNickname(nickname).ok) return setNicknameError(true);
        go('lastPeriod');
      };
      return shell(
        o.nickname.title,
        <div className="field">
          <label className="field-label" htmlFor="nickname">
            {o.nickname.label}
          </label>
          <p className="field-hint" id="nickname-hint">
            {o.nickname.hint}
          </p>
          <input
            id="nickname"
            className="input"
            value={nickname}
            maxLength={NICKNAME_MAX}
            autoComplete="nickname"
            autoCapitalize="words"
            enterKeyHint="next"
            placeholder={s.profile.namePlaceholder}
            aria-invalid={nicknameError || undefined}
            aria-describedby={`nickname-hint${nicknameError ? ' nickname-error' : ''}`}
            onChange={(e) => {
              setNickname(e.target.value);
              setNicknameError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') next();
            }}
          />
          {nicknameError && <ErrorText id="nickname-error">{s.profile.nameInvalid}</ErrorText>}
        </div>,
        <>
          <button type="button" className="btn btn-primary btn-block" onClick={next}>
            {s.common.next}
          </button>
          <button
            type="button"
            className="btn btn-quiet btn-block"
            onClick={() => {
              setNickname('');
              setNicknameError(false);
              go('lastPeriod');
            }}
          >
            {s.common.skip}
          </button>
        </>,
      );
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
      <button type="button" className="btn btn-primary btn-block" disabled={busy} aria-busy={busy || undefined} onClick={() => void finish()}>
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

/** The other languages, each named in itself, so someone who doesn't read the current one can still find theirs. */
function LanguageSwitch() {
  const { locale } = usePrefs();
  const others = (Object.keys(dictionaries) as Locale[]).filter((code) => code !== locale);
  if (others.length === 0) return null;
  return (
    <div className="row onb-lang">
      <Languages size={18} aria-hidden="true" />
      {others.map((code) => (
        <button
          key={code}
          type="button"
          className="btn btn-quiet btn-small"
          lang={dictionaries[code].meta.htmlLang}
          onClick={() => setPrefs({ locale: code })}
        >
          {dictionaries[code].meta.name}
        </button>
      ))}
    </div>
  );
}
