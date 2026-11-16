import { FileUp } from 'lucide-react';
import { useId, useState } from 'react';
import { readFileAsText } from '../app/platform';
import { update, useData, useToday } from '../app/store';
import { toast } from '../app/ui';
import { parseTemperatureCsv, type CsvImportResult } from '../domain/importCsv';
import type { DayLogs } from '../domain/types';
import { formatDate, strings } from '../i18n';
import { ErrorText } from './controls';
import { Sheet } from './Sheet';

/**
 * Imports basal temperatures from a CSV exported by a wearable. The file is read in the browser;
 * nothing is uploaded. Imported values are tagged with their source so they stay distinguishable.
 */
export function ImportTempsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = strings();
  const t = s.importTemps;
  const data = useData();
  const today = useToday();
  const fileId = useId();
  const deviceId = useId();
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState('');
  const [overwrite, setOverwrite] = useState(false);

  const reset = () => {
    setResult(null);
    setError(null);
    setDevice('');
    setOverwrite(false);
  };
  const close = () => {
    reset();
    onClose();
  };

  const onFile = async (file: File | undefined) => {
    setResult(null);
    setError(null);
    if (!file) return;
    try {
      const parsed = parseTemperatureCsv(await readFileAsText(file), today);
      if (parsed.problem) setError(t.problem[parsed.problem]);
      else if (parsed.readings.length === 0) setError(t.problem.none);
      else {
        setResult(parsed);
        if (!device) setDevice(file.name.replace(/\.[^.]+$/, '').slice(0, 40));
      }
    } catch {
      setError(t.problem.unreadable);
    }
  };

  const conflicts = result ? result.readings.filter((r) => data.logs[r.date]?.bbt?.source === 'manual').length : 0;

  const confirm = () => {
    if (!result) return;
    const now = new Date().toISOString();
    const label = device.trim() || t.deviceDefault;
    const readings = result.readings.filter((r) => overwrite || data.logs[r.date]?.bbt?.source !== 'manual');
    if (readings.length === 0) {
      close();
      return;
    }
    update((d) => {
      const logs: DayLogs = { ...d.logs };
      for (const r of readings) {
        logs[r.date] = { ...(logs[r.date] ?? { date: r.date, updatedAt: now }), bbt: { celsius: r.celsius, source: 'import', device: label }, updatedAt: now };
      }
      return {
        ...d,
        logs,
        importBatches: [
          ...d.importBatches.slice(-49),
          { id: `imp-${Date.now().toString(36)}`, importedAt: now, device: label, count: readings.length, from: readings[0]!.date, to: readings[readings.length - 1]!.date },
        ],
      };
    });
    toast(t.done(readings.length));
    close();
  };

  return (
    <Sheet open={open} onClose={close} title={t.title}>
      <div className="stack">
        <p>{t.intro}</p>
        <p className="small ink-2">{t.format}</p>
        <div>
          <label className="btn btn-secondary" htmlFor={fileId}>
            <FileUp size={18} aria-hidden="true" />
            {t.choose}
          </label>
          <input id={fileId} className="sr-only" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(e) => void onFile(e.target.files?.[0])} />
        </div>
        {error && <ErrorText>{error}</ErrorText>}
        {result && (
          <div className="stack stack-3" role="status">
            <p className="strong">
              {t.found(result.readings.length, formatDate(result.readings[0]!.date, 'dayMonth'), formatDate(result.readings[result.readings.length - 1]!.date, 'dayMonth'))}
            </p>
            {result.skipped > 0 && <p className="small ink-2">{t.skipped(result.skipped)}</p>}
            {result.detected?.convertedFromFahrenheit && <p className="small ink-2">{t.fahrenheit}</p>}
            {conflicts > 0 && (
              <label className="check-row">
                <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
                <span>
                  {t.conflicts(conflicts)} {t.overwrite}
                </span>
              </label>
            )}
            <div className="field">
              <label className="field-label" htmlFor={deviceId}>
                {t.device}
              </label>
              <input id={deviceId} className="input" value={device} maxLength={40} placeholder={t.devicePlaceholder} onChange={(e) => setDevice(e.target.value)} />
            </div>
          </div>
        )}
        <p className="caption">{t.native}</p>
        <div className="sheet-actions">
          <button type="button" className="btn btn-secondary" onClick={close}>
            {s.common.cancel}
          </button>
          <button type="button" className="btn btn-primary" disabled={!result} onClick={confirm}>
            {t.confirm}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
