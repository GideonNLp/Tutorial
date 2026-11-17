import { Fingerprint, LockKeyhole } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { pinRetryAfter, unlockWithBiometrics, unlockWithPin, useHasBiometric, wipeEverything } from '../app/store';
import { strings } from '../i18n';
import { ErrorText } from '../ui/controls';
import { ConfirmSheet, Sheet } from '../ui/Sheet';
import { BrandMark } from './Onboarding';
import { haptic } from '../ui/haptics';

export function LockScreen() {
  const s = strings();
  const l = s.lock;
  const hasBiometric = useHasBiometric();
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [retryAfter, setRetryAfter] = useState(pinRetryAfter());
  const [now, setNow] = useState(Date.now());
  const [forgot, setForgot] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const waiting = Math.max(0, Math.ceil((retryAfter - now) / 1000));
  useEffect(() => {
    if (waiting <= 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waiting > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async () => {
    if (busy || waiting > 0 || pin.length < 4) return;
    setBusy(true);
    const result = await unlockWithPin(pin);
    setBusy(false);
    haptic(result.ok ? 'success' : 'warning');
    if (result.ok) return;
    setPin('');
    if (result.reason === 'paused') {
      setRetryAfter(result.retryAfter);
      setNow(Date.now());
      setMessage(undefined);
    } else if (result.reason === 'wrong_pin') {
      setMessage(l.wrong(result.attemptsLeft));
    } else {
      setMessage(s.errors.generic);
    }
    inputRef.current?.focus();
  };

  const biometric = async () => {
    setBusy(true);
    const result = await unlockWithBiometrics();
    setBusy(false);
    if (!result.ok) setMessage(l.biometricFailed);
  };

  return (
    <div className="onb lock">
      <main className="onb-body stack stack-5" style={{ alignItems: 'center', textAlign: 'center' }}>
        <BrandMark size={64} />
        <div className="stack stack-2">
          <h1>{l.title}</h1>
          <p className="ink-2">
            <LockKeyhole size={16} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> {l.prompt}
          </p>
        </div>
        <form
          className="stack stack-3 lock-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="sr-only" htmlFor="unlock-pin">
            {l.prompt}
          </label>
          <input
            id="unlock-pin"
            ref={inputRef}
            className="input pin-input num"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={8}
            value={pin}
            disabled={waiting > 0}
            aria-describedby="unlock-message"
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, '').slice(0, 8));
              setMessage(undefined);
            }}
          />
          <div id="unlock-message" aria-live="assertive">
            {waiting > 0 ? <ErrorText>{l.paused(waiting)}</ErrorText> : message ? <ErrorText>{message}</ErrorText> : null}
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy || waiting > 0 || pin.length < 4} aria-busy={busy || undefined}>
            {l.unlock}
          </button>
          {hasBiometric && (
            <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => void biometric()}>
              <Fingerprint size={20} aria-hidden="true" />
              {l.biometric}
            </button>
          )}
          <button type="button" className="btn btn-quiet btn-block" onClick={() => setForgot(true)}>
            {l.forgot}
          </button>
        </form>
      </main>

      <Sheet open={forgot} onClose={() => setForgot(false)} title={l.forgotTitle}>
        <p>
          {l.forgotBody} {l.keepsServerCopy}
        </p>
        <div className="sheet-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setForgot(false)}>
            {s.common.cancel}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              setForgot(false);
              setConfirmWipe(true);
            }}
          >
            {l.wipe}
          </button>
        </div>
      </Sheet>
      <ConfirmSheet
        open={confirmWipe}
        title={s.settings.privacy.deleteConfirmTitle}
        body={`${s.settings.privacy.deleteBody} ${s.lock.keepsServerCopy}`}
        confirmLabel={s.settings.privacy.deleteConfirm}
        danger
        onCancel={() => setConfirmWipe(false)}
        onConfirm={() => void wipeEverything({ keepServerCopy: true })}
      />
    </div>
  );
}

/** Shown when a vault exists but its key is gone, so the journal cannot be decrypted. */
export function BrokenVaultScreen() {
  const s = strings();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="onb lock">
      <main className="onb-body stack stack-5">
        <h1>{s.lock.unavailableTitle}</h1>
        <p>{s.lock.unavailableBody}</p>
        <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>
          {s.lock.wipe}
        </button>
      </main>
      <ConfirmSheet
        open={confirm}
        title={s.settings.privacy.deleteConfirmTitle}
        body={`${s.settings.privacy.deleteBody} ${s.lock.keepsServerCopy}`}
        confirmLabel={s.settings.privacy.deleteConfirm}
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={() => void wipeEverything({ keepServerCopy: true })}
      />
    </div>
  );
}
