import { Apple, Check, ChevronDown, Droplet, Footprints, Moon, type LucideIcon } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import type { Tip, TipCategory } from '../content';
import type { Phase } from '../domain/types';
import { strings } from '../i18n';

const CATEGORY_ICONS: Record<TipCategory, LucideIcon> = { nutrition: Apple, movement: Footprints, sleep: Moon, skin: Droplet };

/** A short explanation that opens on request ("De ce ajută?"). Native <details>: keyboard and screen readers work as is. */
export function Why({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="why">
      <summary>
        <span>{label}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <p className="small">{children}</p>
    </details>
  );
}

/** One tip as a card: theme, an action-shaped title, the how, the why, and "Am aplicat ✓". */
export function TipCard(props: { tip: Tip; category: TipCategory; phase: Phase; applied: boolean; onToggle: () => void }) {
  const { tip, category, phase, applied } = props;
  const t = strings().tips;
  const titleId = useId();
  const Icon = CATEGORY_ICONS[category];
  return (
    <article className="tip-card" data-applied={applied ? '' : undefined} aria-labelledby={titleId}>
      <div className="tip-card-top">
        <span className="tip-cat" data-phase={phase}>
          <Icon size={14} aria-hidden="true" />
          {t.category[category]}
        </span>
        {applied && (
          <span className="tip-done">
            <Check size={14} aria-hidden="true" />
            {t.appliedToday}
          </span>
        )}
      </div>
      <h3 id={titleId}>{tip.title}</h3>
      <p className="ink-2">{tip.body}</p>
      <Why label={t.why}>{tip.why}</Why>
      <div>
        <button
          type="button"
          className={applied ? 'btn btn-primary btn-small' : 'btn btn-secondary btn-small'}
          aria-pressed={applied}
          aria-describedby={titleId}
          onClick={props.onToggle}
        >
          {t.applied}
          <span aria-hidden="true">✓</span>
        </button>
      </div>
    </article>
  );
}
