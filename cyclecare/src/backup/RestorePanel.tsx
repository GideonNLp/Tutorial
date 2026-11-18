import { FileUp, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { partnerAvailable } from '../app/config';
import { readFileAsText } from '../app/platform';
import { todayISO } from '../domain/dates';
import type { AppData } from '../domain/types';
import { formatDate, strings } from '../i18n';
import type { BackupVersionInfo } from '../partner/api';
import { ChoiceChips, ErrorText } from '../ui/controls';
import { formatRecoveryCode, isRecoveryCode, normalizeRecoveryCode } from './crypto';
import { fetchBackup, listBackups, openFile, type FileFailure, type RestoreFailure } from './flows';

/**
 * Finding a copy and showing what is in it, before anything is replaced: the code, then either the
 * server (with the versions it holds) or an encrypted file. The same panel serves a new phone's first
 * screen and the Settings of a phone that already has a journal; what happens on "Restore" is the caller's.
 */
export interface RestoreChoice {
  data: AppData;
  code: string;
  /** The version on the server this journal came from; none for a file. */
  etag?: string;
}

interface Found extends RestoreChoice {
  source: 'server' | 'file';
  updatedAt?: string;
  role?: BackupVersionInfo['role'];
  versions?: BackupVersionInfo[];
}

export function RestorePanel(props: {
  initialCode?: string;
  /** Look on the server as soon as the panel opens (the code is known: this phone's own). */
  autoSearch?: boolean;
  confirmLabel: string;
  warning?: string;
  onChoose: (choice: RestoreChoice) => void;
}) {
  const t = strings().backup.restore;
  const fileId = useId();
  const codeId = useId();
  const [text, setText] = useState(props.initialCode ? formatRecoveryCode(props.initialCode) : '');
  const [error, setError] = useState<string | undefined>(undefined);
  const [working, setWorking] = useState(false);
  const [found, setFound] = useState<Found | undefined>(undefined);

  const failure = (reason: RestoreFailure | FileFailure): string => {
    switch (reason) {
      case 'offline':
        return t.offline;
      case 'not_found':
        return t.notFound;
      case 'wrong_key':
        return t.wrongKey;
      case 'not_a_backup':
        return t.notABackup;
      case 'corrupt':
      case 'unsupported':
      case 'invalid':
        return t.unreadable;
      default:
        return t.server;
    }
  };

  /** The code as typed, if it can be one; otherwise says what is wrong with it. */
  const code = (): string | undefined => {
    const normalized = normalizeRecoveryCode(text);
    if (!normalized) {
      setError(t.needCode);
      return undefined;
    }
    if (!isRecoveryCode(normalized)) {
      setError(t.codeInvalid);
      return undefined;
    }
    return normalized;
  };

  const loadVersion = async (c: string, role: BackupVersionInfo['role'], versions: BackupVersionInfo[]) => {
    const res = await fetchBackup(c, role, new Date().toISOString());
    if (!res.ok) return setError(failure(res.reason));
    setFound({ source: 'server', data: res.data, code: c, etag: res.etag, updatedAt: res.updatedAt, role, versions });
  };

  const search = async () => {
    setError(undefined);
    setFound(undefined);
    const c = code();
    if (!c) return;
    setWorking(true);
    try {
      const list = await listBackups(c);
      if (!list.ok) return setError(failure(list.reason));
      await loadVersion(c, list.value[0]?.role ?? 'latest', list.value);
    } finally {
      setWorking(false);
    }
  };

  const pickFile = async (file: File | undefined) => {
    setError(undefined);
    setFound(undefined);
    if (!file) return;
    const c = code();
    if (!c) return;
    setWorking(true);
    try {
      const res = await openFile(c, await readFileAsText(file), new Date().toISOString());
      if (res.ok) setFound({ source: 'file', data: res.data, code: c });
      else setError(failure(res.reason));
    } catch {
      setError(t.unreadable);
    } finally {
      setWorking(false);
    }
  };

  const started = useRef(false);
  useEffect(() => {
    if (props.autoSearch && !started.current) {
      started.current = true;
      void search();
    }
    // The search reads the screen's current state: it runs once, when the panel opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const days = found ? Object.keys(found.data.logs).sort() : [];

  return (
    <div className="stack stack-4">
      <p className="ink-2">{t.lead}</p>
      <div className="field">
        <label className="field-label" htmlFor={codeId}>
          {t.codeLabel}
        </label>
        <p className="field-hint" id={`${codeId}-hint`}>
          {t.codeHint}
        </p>
        <input
          id={codeId}
          className="input recovery-input"
          value={text}
          maxLength={40}
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-invalid={error && !found ? true : undefined}
          aria-describedby={`${codeId}-hint${error ? ` ${codeId}-error` : ''}`}
          onChange={(e) => {
            setText(e.target.value.toUpperCase());
            setError(undefined);
            setFound(undefined);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && partnerAvailable()) void search();
          }}
        />
        {error && <ErrorText id={`${codeId}-error`}>{error}</ErrorText>}
      </div>

      <div className="row">
        {partnerAvailable() && (
          <button
            type="button"
            className="btn btn-secondary btn-small"
            disabled={working}
            aria-busy={working || undefined}
            onClick={() => void search()}
          >
            <Search size={16} aria-hidden="true" />
            {t.search}
          </button>
        )}
        <label className="btn btn-secondary btn-small" htmlFor={fileId}>
          <FileUp size={16} aria-hidden="true" />
          {t.file}
        </label>
        <input
          id={fileId}
          className="sr-only"
          type="file"
          accept=".cyclecare,application/json"
          onChange={(e) => {
            void pickFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      {found && (
        <section className="card card-flat tight stack stack-3" aria-live="polite" data-testid="restore-found">
          <p className="strong">
            {days.length === 0 ? t.found(0, '', '') : t.found(days.length, formatDate(days[0]!, 'long'), formatDate(days[days.length - 1]!, 'long'))}
          </p>
          {found.updatedAt && <p className="small ink-2">{t.savedAt(formatDate(todayISO(new Date(found.updatedAt)), 'long'))}</p>}
          {found.versions && found.versions.length > 1 && (
            <ChoiceChips
              legend={t.versionLabel}
              value={found.role}
              options={found.versions.map((v) => ({
                value: v.role,
                label: `${strings().backup.server.roles[v.role]} · ${formatDate(todayISO(new Date(v.updatedAt)), 'dayMonth')}`,
              }))}
              onChange={(role) => {
                if (role) void loadVersion(found.code, role, found.versions!);
              }}
            />
          )}
          {props.warning && <p className="small ink-2">{props.warning}</p>}
          <div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => props.onChoose({ data: found.data, code: found.code, etag: found.source === 'server' ? found.etag : undefined })}
            >
              {props.confirmLabel}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
