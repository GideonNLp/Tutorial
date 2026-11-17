import { CircleAlert, Stethoscope } from 'lucide-react';
import { useMemo, useState } from 'react';
import { update, useData, useTimeline, useToday } from '../app/store';
import { toast } from '../app/ui';
import { content, TIP_CATEGORIES, type TipCategory } from '../content';
import { computeFlags, recentSymptoms, visibleFlags } from '../domain/insights';
import { toDayNumber } from '../domain/dates';
import { currentPhase } from '../domain/prediction';
import { rotate, toggleApplied } from '../domain/tipRotation';
import { PHASES, type Phase } from '../domain/types';
import { strings } from '../i18n';
import { ChoiceChips, Segmented } from '../ui/controls';
import { Notice, Screen } from '../ui/Shell';
import { flagText, visiblePhase } from '../ui/summaries';
import { haptic } from '../ui/haptics';
import { TipCard, Why } from '../ui/TipCard';
import { useEnterOnChange } from '../ui/useEnterOnChange';

const TIPS_SHOWN = 3;

export function TipsScreen() {
  const s = strings();
  const t = s.tips;
  const data = useData();
  const today = useToday();
  const timeline = useTimeline();
  const tips = content().tips;
  const nowPhase = visiblePhase(currentPhase(timeline), data.profile.showFertility);
  const [phase, setPhase] = useState<Phase>(nowPhase ?? 'menstruation');
  const [category, setCategory] = useState<TipCategory>('nutrition');

  const flags = useMemo(
    () => visibleFlags(computeFlags(timeline, data.logs), data.dismissedFlags, today),
    [timeline, data.logs, data.dismissedFlags, today],
  );
  const recent = useMemo(() => recentSymptoms(data.logs, today), [data.logs, today]);

  // Three tips at a time, chosen by the day of the cycle, so the page reads differently every day.
  const [shift, setShift] = useState(0);
  const seed = timeline.dayInfo(today).cycleDay ?? toDayNumber(today);
  const phaseContent = tips.phaseTips[phase];
  const allTips = phaseContent.tips[category];
  const shown = rotate(allTips, seed, TIPS_SHOWN, shift);
  const tipList = useEnterOnChange<HTMLUListElement>(`${phase}/${category}/${shift}`, 'stagger');

  const toggleTip = (id: string) => {
    if (data.appliedTips[id] !== today) haptic('success');
    update((d) => ({ ...d, appliedTips: toggleApplied(d.appliedTips, id, today) }));
  };

  const dismiss = (id: string) => {
    update((d) => ({ ...d, dismissedFlags: { ...d.dismissedFlags, [id]: today } }));
    toast(t.flags.dismissed, {
      action: {
        label: s.common.undo,
        run: () => {
          update((d) => {
            const { [id]: _removed, ...rest } = d.dismissedFlags;
            return { ...d, dismissedFlags: rest };
          });
          toast(t.flags.restored);
        },
      },
    });
  };

  return (
    <Screen title={t.title} settings>
      <div className="stack stack-6">
        {flags.length > 0 && (
          <section className="stack stack-3" aria-labelledby="tips-flags">
            <div className="stack stack-1">
              <h2 id="tips-flags">{t.flags.title}</h2>
              <p className="small ink-2">{t.flags.intro}</p>
            </div>
            {flags.map((flag) => {
              const text = flagText(flag);
              return (
                <Notice key={flag.id} attention={flag.severity === 'attention'} icon={<CircleAlert size={20} aria-hidden="true" />}>
                  <h3>{text.title}</h3>
                  <p>{text.body}</p>
                  <div>
                    <button type="button" className="btn btn-quiet" onClick={() => dismiss(flag.id)}>
                      {t.flags.dismiss}
                    </button>
                  </div>
                </Notice>
              );
            })}
          </section>
        )}

        <section className="stack" aria-labelledby="tips-phase">
          <div className="stack stack-1">
            <h2 id="tips-phase">{t.phase.title}</h2>
            {!nowPhase && <p className="small ink-2">{t.phase.none}</p>}
          </div>
          <ChoiceChips
            legend={t.phase.choose}
            hideLegend
            options={PHASES.map((p) => ({ value: p, label: s.phase[p], hint: p === nowPhase ? t.phase.current : undefined }))}
            value={phase}
            onChange={(p) => {
              if (!p) return;
              setPhase(p);
              setShift(0);
            }}
          />
          <div className="phase-card" data-phase={phase}>
            <p className="phase-line">
              <span className="swatch" aria-hidden="true" />
              <span>
                <span className="strong">{s.phase[phase]}</span>
                {phase === nowPhase && <span className="ink-2"> · {t.phase.current}</span>}
              </span>
            </p>
            <p>{phaseContent.summary}</p>
            <Why label={t.whyPhase}>{phaseContent.hormones}</Why>
          </div>
          <Segmented
            legend={t.categoryLabel}
            hideLegend
            options={TIP_CATEGORIES.map((c) => ({ value: c, label: t.category[c] }))}
            value={category}
            onChange={(c) => {
              setCategory(c);
              setShift(0);
            }}
          />
          <div className="tips-toolbar">
            <p className="caption">{t.rotation(shown.length, allTips.length)}</p>
            <button
              type="button"
              className="btn btn-quiet btn-small"
              onClick={() => {
                haptic('light');
                setShift((n) => n + 1);
              }}
            >
              {t.more}
              <span aria-hidden="true">↻</span>
            </button>
          </div>
          <ul className="tip-cards" aria-live="polite" ref={tipList}>
            {shown.map((tip) => (
              <li key={tip.id}>
                <TipCard
                  tip={tip}
                  category={category}
                  phase={phase}
                  applied={data.appliedTips[tip.id] === today}
                  onToggle={() => toggleTip(tip.id)}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="stack" aria-labelledby="tips-symptoms">
          <h2 id="tips-symptoms">{t.symptoms.title}</h2>
          {recent.length === 0 ? (
            <p className="ink-2">{t.symptoms.empty}</p>
          ) : (
            recent.map((item) => {
              const advice = tips.symptomTips[item.symptom];
              return (
                <article key={item.symptom} className="card tight stack stack-3 symptom-card">
                  <div className="stack stack-1">
                    <h3>{s.symptom[item.symptom]}</h3>
                    <p className="caption">{t.symptoms.logged(item.days)}</p>
                  </div>
                  <div className="stack stack-2">
                    <h4>{t.symptoms.helps}</h4>
                    <ul className="bullets small">
                      {advice.helps.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  <Notice icon={<Stethoscope size={18} aria-hidden="true" />}>
                    <h4>{t.symptoms.doctor}</h4>
                    <p>{advice.doctor}</p>
                  </Notice>
                </article>
              );
            })
          )}
        </section>

        <p className="caption">{t.disclaimer}</p>
      </div>
    </Screen>
  );
}
