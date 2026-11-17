import {
  Bell,
  ChevronRight,
  CircleDot,
  CircleHelp,
  Database,
  FileUp,
  Info,
  Palette,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { notificationStatus, readFileAsText, requestNotifications, saveFile, type NotificationStatus } from '../app/platform';
import type { AutoLock, TextSize, ThemePref } from '../app/prefs';
import { applyUpdate, useInstallState, useStoragePersisted, useUpdateReady } from '../app/pwa';
import { partnerAvailable } from '../app/config';
import { navigate, type Route } from '../app/router';
import {
  disableBiometrics,
  enableBiometrics,
  lock,
  removePin,
  replaceJournal,
  setPin,
  setPrefs,
  update,
  useData,
  useHasBiometric,
  useHasPin,
  usePrefs,
  useStorageMode,
  useToday,
  verifyPin,
  wipeEverything,
} from '../app/store';
import { toast } from '../app/ui';
import { todayISO } from '../domain/dates';
import { DEFAULT_CYCLE_LENGTH, DEFAULT_PERIOD_LENGTH } from '../domain/prediction';
import { GOALS, type AppData, type Goal, type MedicationReminder, type ReminderSettings } from '../domain/types';
import { dictionaries, formatDate, strings, type Locale } from '../i18n';
import { exportBackup, parseBackup } from '../storage/backup';
import { biometricsAvailable } from '../storage/webauthn';
import { ErrorText, MultiChips, Segmented, Stepper, Switch } from '../ui/controls';
import { ImportTempsSheet } from '../ui/ImportTempsSheet';
import { InstallButton } from '../ui/InstallApp';
import { PinFields, validateNewPin } from '../ui/PinFields';
import { PolicyText } from '../ui/PolicyText';
import { PartnerShareSettings } from './PartnerShareSettings';
import { ConfirmSheet, Sheet } from '../ui/Sheet';
import { Notice, Screen } from '../ui/Shell';
import { content } from '../content';
import { haptic } from '../ui/haptics';

export function SettingsScreen({ route }: { route: Route }) {
  switch (route) {
    case 'setari-ciclu':
      return <CycleSettings />;
    case 'setari-memento':
      return <ReminderSettingsScreen />;
    case 'setari-confidentialitate':
      return <PrivacySettings />;
    case 'setari-date':
      return <DataSettings />;
    case 'setari-partener':
      return <PartnerShareSettings />;
    case 'setari-aspect':
      return <AppearanceSettings />;
    case 'setari-despre':
      return <About />;
    case 'politica':
      return <Policy />;
    default:
      return <SettingsIndex />;
  }
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="settings-group" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------- index

function SettingsIndex() {
  const s = strings().settings;
  const rows: Array<{ route: Route; icon: LucideIcon; text: { title: string; hint: string } }> = [
    { route: 'setari-ciclu', icon: CircleDot, text: s.sections.cycle },
    { route: 'setari-memento', icon: Bell, text: s.sections.reminders },
    { route: 'setari-confidentialitate', icon: ShieldCheck, text: s.sections.privacy },
    { route: 'setari-date', icon: Database, text: s.sections.data },
    { route: 'setari-partener', icon: Users, text: s.sections.partner },
    { route: 'setari-aspect', icon: Palette, text: s.sections.appearance },
    { route: 'setari-despre', icon: CircleHelp, text: s.sections.about },
  ];
  return (
    <Screen title={s.title} back>
      <ul className="list">
        {rows.map(({ route, icon: Icon, text }) => (
          <li key={route}>
            <a
              className="list-row"
              href={`#${route}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(route);
              }}
            >
              <Icon size={22} aria-hidden="true" />
              <span className="grow">
                <span className="strong">{text.title}</span>
                <span className="caption">{text.hint}</span>
              </span>
              <ChevronRight size={20} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </Screen>
  );
}

// ---------------------------------------------------------------- cycle

function CycleSettings() {
  const s = strings();
  const c = s.settings.cycle;
  const { profile } = useData();
  const setProfile = (patch: Partial<AppData['profile']>) => update((d) => ({ ...d, profile: { ...d.profile, ...patch } }));

  const length = (
    label: string,
    value: number | undefined,
    fallback: number,
    min: number,
    max: number,
    key: 'typicalCycleLength' | 'typicalPeriodLength',
  ) => (
    <div className="card tight stack stack-3">
      {value !== undefined ? (
        <>
          <Stepper label={label} value={value} min={min} max={max} onChange={(n) => setProfile({ [key]: n })} />
          <div>
            <button type="button" className="btn btn-quiet btn-small" onClick={() => setProfile({ [key]: undefined })}>
              {c.unknown}
            </button>
          </div>
        </>
      ) : (
        <div className="row row-between">
          <span>
            <span className="strong">{label}</span>
            <br />
            <span className="field-hint">{c.unknown}</span>
          </span>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setProfile({ [key]: fallback })}>
            {s.common.add}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <Screen title={s.settings.sections.cycle.title} back>
      <div className="stack stack-5">
        <div className="stack stack-3">
          {length(c.cycleLength, profile.typicalCycleLength, DEFAULT_CYCLE_LENGTH, 21, 45, 'typicalCycleLength')}
          {length(c.periodLength, profile.typicalPeriodLength, DEFAULT_PERIOD_LENGTH, 2, 10, 'typicalPeriodLength')}
          <p className="small ink-2">{c.lengthsHint}</p>
        </div>
        <Group title={c.goals}>
          <MultiChips
            legend={c.goals}
            hideLegend
            options={GOALS.map((g) => ({ value: g, label: s.goal[g] }))}
            values={profile.goals}
            onToggle={(goal: Goal, on) => setProfile({ goals: on ? [...profile.goals, goal] : profile.goals.filter((g) => g !== goal) })}
          />
          {profile.goals.includes('contraception') && (
            <Notice attention icon={<Info size={20} aria-hidden="true" />}>
              <p>{s.contraceptionGoalWarning}</p>
            </Notice>
          )}
        </Group>
        <div className="card tight">
          <Switch label={c.fertility} hint={c.fertilityHint} checked={profile.showFertility} onChange={(on) => setProfile({ showFertility: on })} />
        </div>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- reminders

function ReminderSettingsScreen() {
  const s = strings();
  const r = s.settings.reminders;
  const data = useData();
  const reminders = data.reminders;
  const [status, setStatus] = useState<NotificationStatus>(notificationStatus());
  // A name is asked for once the person has left the field empty, not while they are still getting to it.
  const [touched, setTouched] = useState<string[]>([]);
  const nameMissing = (med: MedicationReminder) => med.name.trim() === '' && touched.includes(med.id);
  const set = (patch: Partial<ReminderSettings>) => update((d) => ({ ...d, reminders: { ...d.reminders, ...patch } }));
  const setMed = (id: string, patch: Partial<MedicationReminder>) =>
    set({ medications: reminders.medications.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const addMed = (name: string) =>
    set({
      medications: [...reminders.medications, { id: `med-${Date.now().toString(36)}`, name, time: '21:00', weekdays: [], enabled: true }],
    });

  // Removing is immediate; the toast offers to put the reminder back where it was.
  const removeMed = (med: MedicationReminder) => {
    const index = reminders.medications.findIndex((m) => m.id === med.id);
    set({ medications: reminders.medications.filter((m) => m.id !== med.id) });
    toast(r.medRemoved(med.name.trim() || r.medName), {
      action: {
        label: s.common.undo,
        run: () => {
          update((d) => {
            if (d.reminders.medications.some((m) => m.id === med.id)) return d;
            const medications = [...d.reminders.medications];
            medications.splice(Math.min(index, medications.length), 0, med);
            return { ...d, reminders: { ...d.reminders, medications } };
          });
          toast(r.medRestored);
        },
      },
    });
  };

  const timing = (key: 'period' | 'fertile', title: string, repeatLabel: string, disabledNote?: string) => {
    const value = reminders[key];
    const change = (patch: Partial<ReminderSettings['period']>) => set({ [key]: { ...value, ...patch } });
    return (
      <div className="card tight stack stack-3">
        <Switch
          label={title}
          hint={disabledNote}
          checked={value.enabled && !disabledNote}
          disabled={!!disabledNote}
          onChange={(on) => {
            change({ enabled: on });
            if (on && status === 'default') void requestNotifications().then(setStatus);
          }}
        />
        {value.enabled && !disabledNote && (
          <>
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <div className="field grow">
                <label className="field-label" htmlFor={`${key}-days`}>
                  {r.daysBefore}
                </label>
                <select
                  id={`${key}-days`}
                  className="select"
                  value={value.daysBefore}
                  onChange={(e) => change({ daysBefore: Number(e.target.value) })}
                >
                  {[0, 1, 2, 3, 5, 7].map((n) => (
                    <option key={n} value={n}>
                      {r.daysBeforeValue(n)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label" htmlFor={`${key}-time`}>
                  {r.time}
                </label>
                <input
                  id={`${key}-time`}
                  className="input"
                  type="time"
                  value={value.time}
                  onChange={(e) => e.target.value && change({ time: e.target.value })}
                />
              </div>
            </div>
            <Switch label={repeatLabel} checked={value.repeatDaily} onChange={(on) => change({ repeatDaily: on })} />
          </>
        )}
      </div>
    );
  };

  return (
    <Screen title={s.settings.sections.reminders.title} back>
      <div className="stack stack-5">
        <Notice icon={<Bell size={20} aria-hidden="true" />}>
          <p>{r.status[status]}</p>
          {status === 'default' && (
            <div>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => void requestNotifications().then(setStatus)}>
                {r.allow}
              </button>
            </div>
          )}
          <p className="caption">{r.webNote}</p>
        </Notice>

        <div className="card tight">
          <Switch label={r.discreet} hint={r.discreetHint} checked={reminders.discreet} onChange={(on) => set({ discreet: on })} />
        </div>

        {timing('period', r.period, r.repeatPeriod)}
        {timing('fertile', r.fertile, r.repeatFertile, data.profile.showFertility ? undefined : r.fertileHidden)}

        <Group title={r.medications}>
          {reminders.medications.length === 0 && <p className="ink-2">{r.medicationsEmpty}</p>}
          {reminders.medications.map((med) => (
            <div className="card tight med-card" key={med.id}>
              <div className="row" style={{ alignItems: 'flex-end' }}>
                <div className="field grow">
                  <label className="field-label" htmlFor={`${med.id}-name`}>
                    {r.medName}
                  </label>
                  <input
                    id={`${med.id}-name`}
                    className="input"
                    value={med.name}
                    maxLength={60}
                    placeholder={r.medNamePlaceholder}
                    aria-invalid={nameMissing(med) || undefined}
                    aria-describedby={nameMissing(med) ? `${med.id}-name-error` : undefined}
                    onChange={(e) => setMed(med.id, { name: e.target.value })}
                    onBlur={() => setTouched((ids) => (ids.includes(med.id) ? ids : [...ids, med.id]))}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor={`${med.id}-time`}>
                    {r.time}
                  </label>
                  <input
                    id={`${med.id}-time`}
                    className="input"
                    type="time"
                    value={med.time}
                    onChange={(e) => e.target.value && setMed(med.id, { time: e.target.value })}
                  />
                </div>
              </div>
              {nameMissing(med) && <ErrorText id={`${med.id}-name-error`}>{r.medNameRequired}</ErrorText>}
              <Switch
                label={r.everyDay}
                checked={med.weekdays.length === 0}
                onChange={(on) => setMed(med.id, { weekdays: on ? [] : [0, 1, 2, 3, 4] })}
              />
              {med.weekdays.length > 0 && (
                <fieldset>
                  <legend className="sr-only">{r.medDays}</legend>
                  <div className="weekday-toggles">
                    {s.calendar.weekdaysShort.map((label, day) => (
                      <label className="chip" key={day}>
                        <input
                          type="checkbox"
                          checked={med.weekdays.includes(day)}
                          aria-label={s.calendar.weekdaysLong[day]}
                          onChange={(e) =>
                            setMed(med.id, {
                              weekdays: e.target.checked ? [...med.weekdays, day].sort() : med.weekdays.filter((d) => d !== day),
                            })
                          }
                        />
                        <span className="chip-face" aria-hidden="true">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <div className="row row-between">
                <div className="grow">
                  <Switch label={r.enabledFor(med.name || r.medName)} checked={med.enabled} onChange={(on) => setMed(med.id, { enabled: on })} />
                </div>
              </div>
              <div>
                <button type="button" className="btn btn-quiet btn-small" onClick={() => removeMed(med)}>
                  <Trash2 size={16} aria-hidden="true" />
                  {r.removeMedication(med.name || r.medName)}
                </button>
              </div>
            </div>
          ))}
          <div className="row">
            {!reminders.medications.some((m) => m.name === r.pillName) && (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => {
                  addMed(r.pillName);
                  if (status === 'default') void requestNotifications().then(setStatus);
                }}
              >
                {r.addPill}
              </button>
            )}
            <button type="button" className="btn btn-secondary btn-small" onClick={() => addMed('')}>
              {r.addMedication}
            </button>
          </div>
        </Group>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- privacy & security

export type PinMode = 'set' | 'change' | 'remove';

export function PinSheet({ mode, onClose }: { mode: PinMode | null; onClose: () => void }) {
  const s = strings();
  const p = s.settings.privacy;
  const currentId = useId();
  const [current, setCurrent] = useState('');
  const [pin, setPinValue] = useState('');
  const [repeat, setRepeat] = useState('');
  // Each message is shown under the field it is about; `form` is for failures that belong to none.
  const [error, setError] = useState<{ field: 'current' | 'pin' | 'repeat' | 'form'; message: string } | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCurrent('');
    setPinValue('');
    setRepeat('');
    setError(undefined);
  }, [mode]);

  const submit = async () => {
    if (!mode) return;
    setBusy(true);
    try {
      if (mode !== 'set' && !(await verifyPin(current))) {
        haptic('warning');
        return setError({ field: 'current', message: p.wrongPin });
      }
      if (mode === 'remove') {
        await removePin();
        haptic('success');
        toast(p.pinRemoved);
        return onClose();
      }
      const invalid = validateNewPin(pin, repeat, { invalid: s.onboarding.finish.pinInvalid, mismatch: s.onboarding.finish.pinMismatch });
      if (invalid) return setError(invalid);
      await setPin(pin);
      haptic('success');
      toast(p.pinSet);
      onClose();
    } catch {
      setError({ field: 'form', message: s.errors.generic });
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'remove' ? p.removePin : mode === 'change' ? p.changePin : p.setPin;
  return (
    <Sheet open={mode !== null} onClose={onClose} title={title}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {mode !== 'set' && (
          <div className="field">
            <label className="field-label" htmlFor={currentId}>
              {p.currentPin}
            </label>
            <input
              id={currentId}
              className="input input-short num"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={8}
              value={current}
              aria-invalid={error?.field === 'current' || undefined}
              aria-describedby={error?.field === 'current' ? `${currentId}-error` : undefined}
              onChange={(e) => {
                setCurrent(e.target.value.replace(/\D/g, '').slice(0, 8));
                setError(undefined);
              }}
            />
            {error?.field === 'current' && <ErrorText id={`${currentId}-error`}>{error.message}</ErrorText>}
          </div>
        )}
        {mode !== 'remove' && (
          <>
            <PinFields
              label={p.newPin}
              repeatLabel={p.repeatPin}
              pin={pin}
              repeat={repeat}
              onPin={(v) => {
                setPinValue(v);
                setError(undefined);
              }}
              onRepeat={(v) => {
                setRepeat(v);
                setError(undefined);
              }}
              error={error?.field === 'pin' || error?.field === 'repeat' ? { field: error.field, message: error.message } : undefined}
            />
            <p className="caption">{s.onboarding.finish.pinWarning}</p>
          </>
        )}
        {error?.field === 'form' && <ErrorText>{error.message}</ErrorText>}
        <div className="sheet-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {s.common.cancel}
          </button>
          <button type="submit" className={mode === 'remove' ? 'btn btn-danger' : 'btn btn-primary'} disabled={busy} aria-busy={busy || undefined}>
            {title}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

function PrivacySettings() {
  const s = strings();
  const p = s.settings.privacy;
  const data = useData();
  const prefs = usePrefs();
  const hasPin = useHasPin();
  const hasBiometric = useHasBiometric();
  const storage = useStorageMode();
  const persisted = useStoragePersisted();
  const [pinMode, setPinMode] = useState<PinMode | null>(null);
  const [canBiometric, setCanBiometric] = useState(false);
  const [confirm, setConfirm] = useState<'delete' | 'withdraw' | null>(null);
  const consent = data.consents.find((c) => c.type === 'health_data_processing');

  useEffect(() => {
    void biometricsAvailable().then(setCanBiometric);
  }, []);

  const toggleBiometric = async (on: boolean) => {
    if (!on) {
      await disableBiometrics();
      return;
    }
    const ok = await enableBiometrics();
    toast(ok ? p.biometricOn : p.biometricFailed);
  };

  const autoLockValue = String(prefs.autoLock);

  return (
    <Screen title={s.settings.sections.privacy.title} back>
      <div className="stack stack-6">
        <Group title={p.lockTitle}>
          {storage === 'plain' ? (
            <Notice attention icon={<Info size={20} aria-hidden="true" />}>
              <p>{p.pinUnavailable}</p>
            </Notice>
          ) : (
            <div className="card tight stack">
              <div className="stack stack-1">
                <p className="strong">{hasPin ? p.pinOn : p.pinOff}</p>
                <p className="field-hint">{p.pinHint}</p>
              </div>
              <div className="row">
                {hasPin ? (
                  <>
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => setPinMode('change')}>
                      {p.changePin}
                    </button>
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => setPinMode('remove')}>
                      {p.removePin}
                    </button>
                    <button type="button" className="btn btn-quiet btn-small" onClick={() => void lock()}>
                      {p.lockNow}
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn-primary btn-small" onClick={() => setPinMode('set')}>
                    {p.setPin}
                  </button>
                )}
              </div>
              <Switch
                label={p.biometric}
                hint={!hasPin ? p.biometricNeedsPin : !canBiometric ? p.biometricUnavailable : p.biometricHint}
                checked={hasBiometric}
                disabled={!hasPin || (!canBiometric && !hasBiometric)}
                onChange={(on) => void toggleBiometric(on)}
              />
              {hasPin && (
                <div className="field">
                  <label className="field-label" htmlFor="auto-lock">
                    {p.autoLock}
                  </label>
                  <select
                    id="auto-lock"
                    className="select"
                    value={autoLockValue}
                    onChange={(e) => setPrefs({ autoLock: e.target.value === 'never' ? 'never' : (Number(e.target.value) as AutoLock) })}
                  >
                    {(['0', '1', '5', 'never'] as const).map((key) => (
                      <option key={key} value={key}>
                        {p.autoLockOptions[key]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </Group>

        <Group title={p.discretionTitle}>
          <div className="card tight">
            <Switch
              label={p.showIntimacy}
              hint={p.showIntimacyHint}
              checked={data.profile.showIntimacy}
              onChange={(on) => update((d) => ({ ...d, profile: { ...d.profile, showIntimacy: on } }))}
            />
          </div>
        </Group>

        <Group title={p.storageTitle}>
          <p>{p.storage[storage]}</p>
          {storage === 'encrypted' && persisted === false && <p className="small ink-2">{p.storageNotPersistent}</p>}
        </Group>

        <Group title={p.sharingTitle}>
          <p>
            {data.partner.share
              ? p.sharingOn(formatDate(todayISO(new Date(data.partner.share.connectedAt)), 'long'))
              : partnerAvailable()
                ? p.sharingOff
                : p.sharing}
          </p>
          {partnerAvailable() && (
            <div className="row">
              <button type="button" className="btn btn-secondary btn-small" onClick={() => navigate('setari-partener')}>
                {s.settings.sections.partner.title}
              </button>
            </div>
          )}
        </Group>

        <Group title={p.consentTitle}>
          {consent && <p>{p.consentGiven(formatDate(todayISO(new Date(consent.grantedAt)), 'long'), consent.textVersion)}</p>}
          <div className="row">
            <button type="button" className="btn btn-secondary btn-small" onClick={() => navigate('politica')}>
              {p.policy}
            </button>
            <button type="button" className="btn btn-danger-quiet btn-small" onClick={() => setConfirm('withdraw')}>
              {p.withdraw}
            </button>
          </div>
        </Group>

        <Group title={p.deleteTitle}>
          <p>{p.deleteBody}</p>
          <div>
            <button type="button" className="btn btn-danger" onClick={() => setConfirm('delete')}>
              <Trash2 size={18} aria-hidden="true" />
              {p.deleteAction}
            </button>
          </div>
        </Group>
      </div>

      <PinSheet mode={pinMode} onClose={() => setPinMode(null)} />
      <ConfirmSheet
        open={confirm !== null}
        title={p.deleteConfirmTitle}
        body={confirm === 'withdraw' ? `${p.withdrawBody} ${p.deleteConfirmBody}` : p.deleteConfirmBody}
        confirmLabel={p.deleteConfirm}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void wipeEverything().then(() => toast(p.deleted));
        }}
      />
    </Screen>
  );
}

// ---------------------------------------------------------------- data

function DataSettings() {
  const s = strings();
  const d = s.settings.data;
  const data = useData();
  const today = useToday();
  const fileId = useId();
  const [importing, setImporting] = useState(false);
  const [pending, setPending] = useState<AppData | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  const exportJson = async () => {
    const blob = new Blob([exportBackup(data, new Date())], { type: 'application/json' });
    const outcome = await saveFile(d.exportFilename(today), blob);
    if (outcome !== 'declined') toast(outcome === 'saved' ? d.exported : d.exportFailed);
  };

  const onFile = async (file: File | undefined) => {
    setError(undefined);
    if (!file) return;
    try {
      const result = parseBackup(await readFileAsText(file), new Date().toISOString());
      if (result.ok) setPending(result.data);
      else setError(d.importError[result.error]);
    } catch {
      setError(d.importError.not_json);
    }
  };

  return (
    <Screen title={s.settings.sections.data.title} back>
      <div className="stack stack-6">
        <Group title={d.pdfTitle}>
          <p className="ink-2">{d.pdfHint}</p>
          <div>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => navigate('statistici')}>
              {d.pdfOpen}
            </button>
          </div>
        </Group>

        <Group title={d.backupTitle}>
          <p className="ink-2">{d.backupHint}</p>
          <div className="row">
            <button type="button" className="btn btn-secondary btn-small" onClick={() => void exportJson()}>
              {d.export}
            </button>
            <label className="btn btn-secondary btn-small" htmlFor={fileId}>
              <FileUp size={16} aria-hidden="true" />
              {d.import}
            </label>
            <input
              id={fileId}
              className="sr-only"
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
          {error && <ErrorText>{error}</ErrorText>}
        </Group>

        <Group title={d.devicesTitle}>
          <p className="ink-2">{d.devicesHint}</p>
          <div>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setImporting(true)}>
              {d.importTemps}
            </button>
          </div>
          {data.importBatches.length > 0 && (
            <div className="stack stack-2">
              <h3>{d.batches}</h3>
              <ul className="bullets small">
                {data.importBatches.map((batch) => (
                  <li key={batch.id}>{d.batch(batch.device, batch.count, formatDate(todayISO(new Date(batch.importedAt)), 'long'))}</li>
                ))}
              </ul>
            </div>
          )}
        </Group>
      </div>

      <ImportTempsSheet open={importing} onClose={() => setImporting(false)} />
      <ConfirmSheet
        open={pending !== null}
        title={d.importConfirmTitle}
        body={d.importConfirmBody(pending ? Object.keys(pending.logs).length : 0)}
        confirmLabel={d.importConfirm}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const before = data;
          if (pending) replaceJournal(pending);
          setPending(null);
          haptic('success');
          toast(d.imported, {
            action: {
              label: s.common.undo,
              run: () => {
                replaceJournal(before);
                toast(d.importUndone);
              },
            },
            duration: 10000,
          });
        }}
      />
    </Screen>
  );
}

// ---------------------------------------------------------------- appearance

export function AppearanceSettings() {
  const s = strings();
  const a = s.settings.appearance;
  const prefs = usePrefs();
  return (
    <Screen title={s.settings.sections.appearance.title} back>
      <div className="stack stack-6">
        <Segmented
          legend={a.theme}
          options={(['system', 'light', 'dark'] as ThemePref[]).map((t) => ({ value: t, label: a.themes[t] }))}
          value={prefs.theme}
          onChange={(theme) => setPrefs({ theme })}
        />
        <div className="stack stack-3">
          <Segmented
            legend={a.textSize}
            hint={a.textSizeHint}
            options={(['small', 'normal', 'large', 'xlarge'] as TextSize[]).map((t) => ({ value: t, label: a.textSizes[t] }))}
            value={prefs.textSize}
            onChange={(textSize) => setPrefs({ textSize })}
          />
          <p className="text-sample" aria-hidden="true">
            {a.sample}
          </p>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="language">
            {a.language}
          </label>
          <select id="language" className="select" value={prefs.locale} onChange={(e) => setPrefs({ locale: e.target.value as Locale })}>
            {(Object.keys(dictionaries) as Locale[]).map((code) => (
              <option key={code} value={code}>
                {dictionaries[code].meta.name}
              </option>
            ))}
          </select>
          <p className="field-hint">{a.languageHint}</p>
        </div>
        <p className="small ink-2">{a.motion}</p>
      </div>
    </Screen>
  );
}

// ---------------------------------------------------------------- about & policy

export function About() {
  const s = strings();
  const a = s.settings.about;
  const install = useInstallState();
  const updateReady = useUpdateReady();

  return (
    <Screen title={s.settings.sections.about.title} subtitle={a.version(__APP_VERSION__)} back>
      <div className="stack stack-5">
        {updateReady && (
          <Notice icon={<RefreshCw size={20} aria-hidden="true" />}>
            <p className="strong">{a.update.ready}</p>
            <p>{a.update.hint}</p>
            <div>
              <button type="button" className="btn btn-primary btn-small" onClick={applyUpdate}>
                {a.update.apply}
              </button>
            </div>
          </Notice>
        )}
        <Notice attention icon={<Info size={20} aria-hidden="true" />}>
          <p>{a.notMedical}</p>
        </Notice>
        <p>{a.estimates}</p>
        <p className="strong">{a.emergency}</p>
        {install !== 'unavailable' && (
          <Group title={s.install.title}>
            {install === 'installed' ? (
              <p className="ink-2">{s.install.installed}</p>
            ) : (
              <>
                <p className="ink-2">{s.install.body}</p>
                <div>
                  <InstallButton className="btn btn-secondary btn-small" />
                </div>
              </>
            )}
          </Group>
        )}
        <p className="small ink-2">{a.licenses}</p>
      </div>
    </Screen>
  );
}

function Policy() {
  const policy = content().legal.privacyPolicy;
  return (
    <Screen title={policy.title} back>
      <PolicyText />
    </Screen>
  );
}
