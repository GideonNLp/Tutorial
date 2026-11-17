import { Info, Link2, ShieldCheck, Users } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { partnerAvailable } from '../app/config';
import { setPartnerPermissions, startShare, stopShare, useData, useTimeline } from '../app/store';
import { toast } from '../app/ui';
import { buildPartnerSnapshot } from '../domain/partner';
import type { PartnerPermissions } from '../domain/types';
import { formatDate, strings } from '../i18n';
import { newChannelSecrets } from '../partner/crypto';
import { approvePairing, checkPairing, closePairing, deleteShare, openPairing, pushSnapshot, type OwnerPairing } from '../partner/flows';
import { useShareSync } from '../partner/OwnerSync';
import { relativeTime } from '../partner/time';
import { Switch } from '../ui/controls';
import { haptic } from '../ui/haptics';
import { ConfirmSheet } from '../ui/Sheet';
import { Notice, Screen } from '../ui/Shell';
import { todayISO } from '../domain/dates';

type Step =
  | { kind: 'idle' }
  | { kind: 'consent' }
  | { kind: 'busy' }
  | { kind: 'waiting'; pairing: OwnerPairing }
  | { kind: 'verify'; pairing: OwnerPairing; partnerPub: string; digits: string };

const POLL_MS = 2000;

/** Settings → Partener, on the owner's device. */
export function PartnerShareSettings() {
  const s = strings();
  const t = s.share;
  const data = useData();
  const timeline = useTimeline();
  const sync = useShareSync();
  const share = data.partner.share;
  const permissions = data.partner.permissions;
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [confirmStop, setConfirmStop] = useState(false);
  const [now, setNow] = useState(Date.now());
  const titleId = useId();

  // A pairing left open when the screen goes away is closed on the relay too.
  const open = useRef<OwnerPairing | undefined>(undefined);
  useEffect(() => {
    open.current = step.kind === 'waiting' || step.kind === 'verify' ? step.pairing : undefined;
  }, [step]);
  useEffect(
    () => () => {
      if (open.current) void closePairing(open.current);
    },
    [],
  );

  // Waiting for the partner to type the code: look every two seconds, count the time down.
  useEffect(() => {
    if (step.kind !== 'waiting') return;
    const { pairing } = step;
    let stopped = false;
    const tick = async () => {
      setNow(Date.now());
      if (Date.now() >= pairing.expiresAt) {
        setStep({ kind: 'idle' });
        setMessage(t.code.expired);
        return;
      }
      const res = await checkPairing(pairing);
      if (stopped) return;
      if (res.ok && res.value) {
        haptic('medium');
        setStep({ kind: 'verify', pairing, ...res.value });
      } else if (!res.ok && res.reason === 'not_found') {
        setStep({ kind: 'idle' });
        setMessage(t.code.expired);
      }
    };
    const timer = setInterval(() => void tick(), POLL_MS);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      stopped = true;
      clearInterval(timer);
      clearInterval(clock);
    };
  }, [step, t]);

  const fail = (reason: string) => {
    setStep({ kind: 'idle' });
    setMessage(reason === 'offline' ? t.errors.offline : t.errors.generic);
    haptic('warning');
  };

  const invite = async () => {
    setStep({ kind: 'busy' });
    setMessage(undefined);
    const res = await openPairing();
    if (!res.ok) return fail(res.reason);
    setStep({ kind: 'waiting', pairing: res.value });
  };

  const approve = async (pairing: OwnerPairing, partnerPub: string) => {
    setStep({ kind: 'busy' });
    const nowISO = new Date().toISOString();
    const shareToBe = { ...newChannelSecrets(), connectedAt: nowISO };
    // The channel exists, with the first summary, before the partner goes looking for it.
    const first = await pushSnapshot(shareToBe, buildPartnerSnapshot(data, timeline, nowISO));
    if (!first.ok) return fail(first.reason);
    // Only what reading needs: the write token never leaves this device.
    const approved = await approvePairing(pairing, partnerPub, { channelId: shareToBe.channelId, dataKey: shareToBe.dataKey });
    if (!approved.ok) {
      void deleteShare(shareToBe);
      return fail(approved.reason);
    }
    startShare(shareToBe);
    haptic('success');
    setStep({ kind: 'idle' });
    // The partner's device collects the sealed credentials within seconds; the record expires anyway.
    setTimeout(() => void closePairing(pairing), 60_000);
  };

  const reject = (pairing: OwnerPairing) => {
    void closePairing(pairing);
    setStep({ kind: 'idle' });
    setMessage(t.verify.rejected);
  };

  const shareLink = async (code: string) => {
    const url = `${location.origin}${location.pathname}#partener=${code}`;
    const text = t.code.linkText(code);
    try {
      const coarse = matchMedia('(pointer: coarse)').matches;
      if (coarse && typeof navigator.share === 'function') {
        await navigator.share({ title: s.common.appName, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast(t.code.copied);
    } catch {
      // The person closed the share sheet, or the clipboard is blocked: the code is on screen anyway.
    }
  };

  const setPermission = (key: keyof PartnerPermissions, on: boolean) => {
    const next = { ...permissions, [key]: on };
    if (key === 'journal' && !on) next.notes = false;
    setPartnerPermissions(next);
  };

  if (!partnerAvailable()) {
    return (
      <Screen title={s.settings.sections.partner.title} back>
        <Notice icon={<Info size={20} aria-hidden="true" />}>
          <p>{t.unavailable}</p>
        </Notice>
      </Screen>
    );
  }

  const busy = step.kind === 'busy';
  const secondsLeft = step.kind === 'waiting' ? Math.max(0, Math.round((step.pairing.expiresAt - now) / 1000)) : 0;

  return (
    <Screen title={s.settings.sections.partner.title} back>
      <div className="stack stack-6">
        {!share && <p className="ink-2">{t.intro}</p>}

        {share && (
          <section className="card tight stack stack-2" aria-labelledby={titleId}>
            <p className="phase-line" id={titleId}>
              <Users size={18} aria-hidden="true" />
              <span className="strong">{t.connected(formatDate(todayISO(new Date(share.connectedAt)), 'long'))}</span>
            </p>
            <p className="small ink-2" role="status">
              {sync.state === 'syncing'
                ? t.status.syncing
                : sync.state === 'offline'
                  ? t.status.offline
                  : sync.state === 'error'
                    ? t.status.error
                    : sync.at
                      ? t.status.synced(relativeTime(sync.at, now))
                      : t.status.waiting}
            </p>
          </section>
        )}

        <section className="settings-group" aria-labelledby={`${titleId}-perm`}>
          <h2 id={`${titleId}-perm`}>{t.permissionsTitle}</h2>
          <div className="card tight stack stack-3">
            {(['phase', 'calendar', 'journal', 'notes'] as const).map((key) => (
              <Switch
                key={key}
                label={t.permissions[key].label}
                hint={key === 'notes' && !permissions.journal ? t.notesNeedJournal : t.permissions[key].hint}
                checked={key === 'notes' ? permissions.journal && permissions.notes : permissions[key]}
                disabled={key === 'notes' && !permissions.journal}
                onChange={(on) => setPermission(key, on)}
              />
            ))}
          </div>
          <p className="small ink-2 phase-line">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>{t.never}</span>
          </p>
        </section>

        {message && (
          <Notice attention icon={<Info size={20} aria-hidden="true" />}>
            <p role="alert">{message}</p>
          </Notice>
        )}

        {!share && (step.kind === 'idle' || step.kind === 'busy' || step.kind === 'consent') && (
          <div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              aria-busy={busy || undefined}
              onClick={() => setStep({ kind: 'consent' })}
            >
              <Link2 size={18} aria-hidden="true" />
              {t.invite}
            </button>
          </div>
        )}

        {step.kind === 'waiting' && (
          <section className="card stack stack-3 pair-card" aria-labelledby={`${titleId}-code`}>
            <h2 id={`${titleId}-code`} className="h3-like">
              {t.code.title}
            </h2>
            <p className="pair-code" aria-hidden="true">
              {step.pairing.code.slice(0, 3)} {step.pairing.code.slice(3)}
            </p>
            <p className="sr-only">{t.code.label(step.pairing.code)}</p>
            <p className="small ink-2">{t.code.lead}</p>
            <p className="caption" role="status">
              {t.code.waiting} {t.code.expires(`${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`)}
            </p>
            <div className="row">
              <button type="button" className="btn btn-secondary btn-small" onClick={() => void shareLink(step.pairing.code)}>
                <Link2 size={16} aria-hidden="true" />
                {t.code.copyLink}
              </button>
              <button
                type="button"
                className="btn btn-quiet btn-small"
                onClick={() => {
                  void closePairing(step.pairing);
                  setStep({ kind: 'idle' });
                }}
              >
                {t.code.cancel}
              </button>
            </div>
          </section>
        )}

        {step.kind === 'verify' && (
          <section className="card stack stack-3 pair-card" aria-labelledby={`${titleId}-verify`}>
            <h2 id={`${titleId}-verify`} className="h3-like">
              {t.verify.title}
            </h2>
            <p className="small ink-2">{t.verify.lead}</p>
            <p className="pair-code" data-testid="owner-digits">
              {step.digits}
            </p>
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={() => void approve(step.pairing, step.partnerPub)}>
                {t.verify.approve}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => reject(step.pairing)}>
                {t.verify.reject}
              </button>
            </div>
          </section>
        )}

        {share && (
          <div>
            <button type="button" className="btn btn-danger-quiet" onClick={() => setConfirmStop(true)}>
              {t.stop}
            </button>
          </div>
        )}
      </div>

      <ConfirmSheet
        open={step.kind === 'consent'}
        title={t.consent.title}
        body={t.consent.body}
        confirmLabel={t.consent.accept}
        cancelLabel={t.consent.decline}
        onCancel={() => setStep({ kind: 'idle' })}
        onConfirm={() => void invite()}
      />
      <ConfirmSheet
        open={confirmStop}
        title={t.stopConfirmTitle}
        body={t.stopConfirmBody}
        confirmLabel={t.stopConfirm}
        danger
        onCancel={() => setConfirmStop(false)}
        onConfirm={() => {
          setConfirmStop(false);
          void stopShare().then((result) => toast(result === 'deleted' ? t.stopped : t.stopPending));
        }}
      />
    </Screen>
  );
}
