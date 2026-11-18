import { Download, Share, SquarePlus, Check, type LucideIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { promptInstall, useInstallState } from '../app/pwa';
import { setPrefs, usePrefs } from '../app/store';
import { toast } from '../app/ui';
import { strings } from '../i18n';
import { haptic } from './haptics';
import { Sheet } from './Sheet';

const STEP_ICONS: LucideIcon[] = [Share, SquarePlus, Check];

/**
 * "Install the app". Where the browser offers its own install prompt (Android, desktop Chrome
 * and Edge) the button opens it. iOS has no such prompt, so the button opens a short picture
 * guide to Share → "Add to Home Screen". Renders nothing when the app is already installed or
 * cannot be installed from here.
 */
export function InstallButton({ className = 'btn btn-primary' }: { className?: string }) {
  const state = useInstallState();
  const [guide, setGuide] = useState(false);
  const i = strings().install;
  if (state !== 'available' && state !== 'manual-ios') return null;

  const install = async () => {
    if (state === 'manual-ios') return setGuide(true);
    if ((await promptInstall()) === 'accepted') {
      haptic('success');
      toast(i.done);
    }
  };

  return (
    <>
      <button type="button" className={className} onClick={() => void install()}>
        <Download size={18} aria-hidden="true" />
        {i.action}
      </button>
      {state === 'manual-ios' && (
        <Sheet open={guide} onClose={() => setGuide(false)} title={i.ios.title}>
          <div className="stack">
            <p>{i.ios.intro}</p>
            <ol className="install-steps">
              {i.ios.steps.map((step, index) => {
                const Icon = STEP_ICONS[index] ?? Check;
                return (
                  <li key={step}>
                    <span className="install-step-icon" aria-hidden="true">
                      <Icon size={22} />
                    </span>
                    <span>
                      <span className="strong">{index + 1}.</span> {step}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="small ink-2">{i.ios.otherBrowser}</p>
            <p className="notice">{i.ios.separateData}</p>
            <div className="sheet-actions">
              <button type="button" className="btn btn-primary" onClick={() => setGuide(false)}>
                {i.ios.close}
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}

/** The invitation shown on the home screen until the app is installed or the person says "not now". */
export function InstallCard() {
  const state = useInstallState();
  const { installHintDismissed } = usePrefs();
  const headingId = useId();
  const i = strings().install;
  if (installHintDismissed || (state !== 'available' && state !== 'manual-ios')) return null;
  return (
    <section className="card card-flat tight stack stack-3" aria-labelledby={headingId}>
      <div className="stack stack-1">
        <h2 id={headingId} className="h3-like">
          {i.title}
        </h2>
        <p className="small ink-2">{i.body}</p>
      </div>
      <div className="row">
        <InstallButton className="btn btn-primary btn-small" />
        <button type="button" className="btn btn-quiet btn-small" onClick={() => setPrefs({ installHintDismissed: true })}>
          {i.later}
        </button>
      </div>
    </section>
  );
}
