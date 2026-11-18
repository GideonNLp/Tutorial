import { CopyIcon, FileDown, History, KeyRound, Share2, ShieldCheck } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { partnerAvailable } from '../app/config';
import { saveFile } from '../app/platform';
import {
  confirmRecoveryCode,
  ensureRecoveryCode,
  replaceRecoveryCode,
  restoreFromBackup,
  replaceJournal,
  startAutoBackup,
  stopAutoBackup,
  updateAutoBackup,
  useData,
  useToday,
} from '../app/store';
import { toast } from '../app/ui';
import { recoveryGroup, formatRecoveryCode } from '../backup/crypto';
import { useBackupSync } from '../backup/BackupSync';
import { listBackups, sealToFile } from '../backup/flows';
import { RestorePanel, type RestoreChoice } from '../backup/RestorePanel';
import { todayISO } from '../domain/dates';
import { formatDate, strings } from '../i18n';
import type { BackupVersionInfo } from '../partner/api';
import { relativeTime } from '../partner/time';
import { ErrorText, Switch } from '../ui/controls';
import { haptic } from '../ui/haptics';
import { ConfirmSheet, Sheet } from '../ui/Sheet';
import { Notice, Screen } from '../ui/Shell';

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="settings-group" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

/** The recovery code, in six groups of four, with ways to copy it or send it somewhere safe. */
function CodeCard({ code }: { code: string }) {
  const t = strings().backup.code;
  const shown = formatRecoveryCode(code).split('-');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatRecoveryCode(code));
      toast(t.copied);
    } catch {
      // The code is on the screen: it can be copied by hand.
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: strings().common.appName, text: formatRecoveryCode(code) });
    } catch {
      // The person closed the share sheet.
    }
  };

  return (
    <div className="stack stack-3">
      <p className="recovery-code" data-testid="recovery-code" aria-hidden="true">
        {shown.map((group, i) => (
          <span key={i}>{group}</span>
        ))}
      </p>
      <p className="sr-only">{t.label(code)}</p>
      <div className="row">
        <button type="button" className="btn btn-secondary btn-small" onClick={() => void copy()}>
          <CopyIcon size={16} aria-hidden="true" />
          {t.copy}
        </button>
        {typeof navigator.share === 'function' && matchMedia('(pointer: coarse)').matches && (
          <button type="button" className="btn btn-secondary btn-small" onClick={() => void share()}>
            <Share2 size={16} aria-hidden="true" />
            {t.share}
          </button>
        )}
      </div>
    </div>
  );
}

/** Asks for one group of the code, typed back: proof that it was written down, not only shown. */
function ConfirmCode({ code, onConfirmed }: { code: string; onConfirmed: () => void }) {
  const t = strings().backup.code;
  const id = useId();
  // Which group is asked is chosen once per time the code is shown.
  const [index] = useState(() => crypto.getRandomValues(new Uint8Array(1))[0]! % 6);
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);

  const submit = () => {
    if (value.toUpperCase().replace(/[\s-]/g, '') === recoveryGroup(code, index)) {
      haptic('success');
      onConfirmed();
    } else {
      setWrong(true);
      haptic('warning');
    }
  };

  return (
    <div className="stack stack-3">
      <h3 className="h3-like">{t.confirmTitle}</h3>
      <div className="field">
        <label className="field-label" htmlFor={id}>
          {t.confirmAsk(index + 1)}
        </label>
        <input
          id={id}
          className="input recovery-input"
          value={value}
          maxLength={6}
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-label={t.confirmLabel}
          aria-invalid={wrong ? true : undefined}
          aria-describedby={wrong ? `${id}-error` : undefined}
          onChange={(e) => {
            setValue(e.target.value.toUpperCase());
            setWrong(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
        {wrong && <ErrorText id={`${id}-error`}>{t.confirmWrong}</ErrorText>}
      </div>
      <div>
        <button type="button" className="btn btn-primary btn-small" onClick={submit}>
          {t.confirm}
        </button>
      </div>
    </div>
  );
}

/** Settings → Copie de siguranță, on the owner's device. */
export function BackupSettings() {
  const s = strings();
  const t = s.backup;
  const data = useData();
  const today = useToday();
  const sync = useBackupSync();
  const backup = data.backup;
  const auto = backup?.auto;
  const [reveal, setReveal] = useState(false);
  const [consent, setConsent] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [restoring, setRestoring] = useState<{ auto: boolean } | undefined>(undefined);
  const [versions, setVersions] = useState<BackupVersionInfo[]>([]);
  const [now, setNow] = useState(Date.now());

  // What the server holds right now, for as long as the copy is on.
  const code = backup?.code;
  const sent = auto?.lastAt;
  const taken = auto?.taken;
  useEffect(() => {
    if (!code || !auto || taken || !partnerAvailable()) {
      setVersions([]);
      return;
    }
    let stale = false;
    void listBackups(code).then((res) => {
      if (!stale && res.ok) setVersions(res.value);
    });
    return () => {
      stale = true;
    };
  }, [code, Boolean(auto), taken, sent]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const saveFileCopy = async () => {
    if (!backup) return;
    const text = await sealToFile(backup.code, data, new Date());
    const outcome = await saveFile(t.file.filename(today), new Blob([text], { type: 'application/json' }));
    if (outcome !== 'declined') toast(outcome === 'saved' ? t.file.saved : t.file.failed);
  };

  const restore = (choice: RestoreChoice) => {
    const before = data;
    restoreFromBackup(choice.data, choice.code, choice.etag);
    setRestoring(undefined);
    haptic('success');
    toast(t.restore.done, {
      action: {
        label: s.common.undo,
        run: () => {
          replaceJournal(before);
          toast(t.restore.undone);
        },
      },
      duration: 10000,
    });
  };

  const useThisPhone = async () => {
    if (!backup) return;
    const res = await listBackups(backup.code);
    if (!res.ok && res.reason !== 'not_found') return void toast(res.reason === 'offline' ? t.restore.offline : t.restore.server);
    updateAutoBackup({ taken: false, etag: res.ok ? res.value[0]?.etag : undefined, digest: undefined });
    haptic('success');
    toast(t.server.taken.resumed);
  };

  const statusLine = () => {
    if (sync === 'syncing') return t.server.status.syncing;
    if (sync === 'offline') return t.server.status.offline;
    if (sync === 'error') return t.server.status.error;
    return auto?.lastAt ? t.server.status.synced(relativeTime(Date.parse(auto.lastAt), now)) : t.server.status.waiting;
  };

  const confirmed = Boolean(backup?.confirmed);
  const unconfirmedCode = backup && !confirmed;

  return (
    <Screen title={s.settings.sections.backup.title} back>
      <div className="stack stack-6">
        <p className="ink-2">{t.intro}</p>

        <Group title={t.code.title}>
          {!backup && (
            <>
              <p className="ink-2">{t.code.lead}</p>
              <div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    ensureRecoveryCode();
                    setReveal(true);
                  }}
                >
                  <KeyRound size={18} aria-hidden="true" />
                  {t.code.create}
                </button>
              </div>
            </>
          )}

          {backup && (reveal || unconfirmedCode) && (
            <div className="card card-flat pair-card stack stack-3">
              <p className="small ink-2">{unconfirmedCode ? t.code.unconfirmed : t.code.lead}</p>
              <CodeCard code={backup.code} />
              {unconfirmedCode && (
                <ConfirmCode
                  code={backup.code}
                  onConfirmed={() => {
                    confirmRecoveryCode();
                    // Written down: from now on it is hidden until the person asks for it.
                    setReveal(false);
                  }}
                />
              )}
            </div>
          )}

          {backup && confirmed && (
            <div className="row">
              <button type="button" className="btn btn-secondary btn-small" aria-expanded={reveal} onClick={() => setReveal(!reveal)}>
                <ShieldCheck size={16} aria-hidden="true" />
                {reveal ? t.code.hide : t.code.show}
              </button>
              <button type="button" className="btn btn-quiet btn-small" onClick={() => setConfirmReplace(true)}>
                {t.code.replace}
              </button>
            </div>
          )}
        </Group>

        {backup && confirmed && (
          <Group title={t.file.title}>
            <p className="ink-2">{t.file.hint}</p>
            <div>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => void saveFileCopy()}>
                <FileDown size={16} aria-hidden="true" />
                {t.file.save}
              </button>
            </div>
          </Group>
        )}

        <Group title={t.server.title}>
          {!partnerAvailable() ? (
            <Notice icon={<History size={20} aria-hidden="true" />}>
              <p>{t.server.unavailable}</p>
            </Notice>
          ) : (
            <>
              <p className="ink-2">{t.server.hint}</p>
              <div className="card card-flat tight stack stack-3">
                <Switch
                  label={t.server.toggle}
                  hint={confirmed ? undefined : t.server.needCode}
                  checked={Boolean(auto)}
                  disabled={!confirmed}
                  onChange={(on) => (on ? setConsent(true) : setConfirmStop(true))}
                />
                {auto && !taken && (
                  <p className="small ink-2" role="status" data-testid="backup-status">
                    {statusLine()}
                  </p>
                )}
              </div>

              {auto && taken && (
                <Notice attention icon={<History size={20} aria-hidden="true" />}>
                  <div className="stack stack-2">
                    <p className="strong">{t.server.taken.title}</p>
                    <p>{t.server.taken.body}</p>
                    <div className="row">
                      <button type="button" className="btn btn-secondary btn-small" onClick={() => setRestoring({ auto: true })}>
                        {t.server.taken.useServer}
                      </button>
                      <button type="button" className="btn btn-secondary btn-small" onClick={() => void useThisPhone()}>
                        {t.server.taken.useThis}
                      </button>
                    </div>
                  </div>
                </Notice>
              )}

              {auto && versions.length > 0 && (
                <div className="stack stack-2">
                  <h3 className="h3-like">{t.server.versionsTitle}</h3>
                  <ul className="bullets small" data-testid="backup-versions">
                    {versions.map((v) => (
                      <li key={v.role}>
                        {t.server.roles[v.role]}: {formatDate(todayISO(new Date(v.updatedAt)), 'long')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {backup?.pendingDelete && backup.pendingDelete.length > 0 && <p className="small ink-2">{t.server.pending}</p>}

              {backup && (
                <div>
                  <button type="button" className="btn btn-danger-quiet" onClick={() => setConfirmStop(true)}>
                    {auto ? t.server.stop : t.server.delete}
                  </button>
                </div>
              )}
            </>
          )}
        </Group>

        <Group title={t.restore.title}>
          <div>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setRestoring({ auto: false })}>
              {t.restore.open}
            </button>
          </div>
        </Group>
      </div>

      <ConfirmSheet
        open={consent}
        title={t.server.consent.title}
        body={t.server.consent.body}
        confirmLabel={t.server.consent.accept}
        cancelLabel={t.server.consent.decline}
        onCancel={() => setConsent(false)}
        onConfirm={() => {
          setConsent(false);
          startAutoBackup();
          haptic('success');
        }}
      />
      <ConfirmSheet
        open={confirmStop}
        title={auto ? t.server.stopConfirmTitle : t.server.deleteConfirmTitle}
        body={auto ? t.server.stopConfirmBody : t.server.deleteConfirmBody}
        confirmLabel={auto ? t.server.stopConfirm : t.server.deleteConfirm}
        danger
        onCancel={() => setConfirmStop(false)}
        onConfirm={() => {
          setConfirmStop(false);
          void stopAutoBackup().then((result) => toast(result === 'deleted' ? t.server.stopped : t.server.stopPending));
        }}
      />
      <ConfirmSheet
        open={confirmReplace}
        title={t.code.replaceTitle}
        body={t.code.replaceBody}
        confirmLabel={t.code.replaceConfirm}
        danger
        onCancel={() => setConfirmReplace(false)}
        onConfirm={() => {
          setConfirmReplace(false);
          void replaceRecoveryCode().then(() => {
            setReveal(true);
            toast(t.code.replaced);
          });
        }}
      />
      <Sheet open={restoring !== undefined} onClose={() => setRestoring(undefined)} title={t.restore.title}>
        {restoring && (
          <RestorePanel
            initialCode={restoring.auto ? backup?.code : undefined}
            autoSearch={restoring.auto}
            confirmLabel={t.restore.confirm}
            warning={t.restore.replaces}
            onChoose={restore}
          />
        )}
      </Sheet>
    </Screen>
  );
}
