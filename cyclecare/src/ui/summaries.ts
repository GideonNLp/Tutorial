import type { Flag } from '../domain/insights';
import type { DayLog, Phase } from '../domain/types';
import { content } from '../content';
import { formatNumber, strings } from '../i18n';

/**
 * Short phrases describing what a day holds, e.g. ["flux mediu", "2 simptome", "o notă"].
 * Intimate contacts are left out when the person chose to keep them out of sight.
 */
export function summarizeLog(log: DayLog | undefined, showIntimacy = true): string[] {
  if (!log) return [];
  const s = strings();
  const out: string[] = [];
  if (log.flow) out.push(s.flowSummary[log.flow]);
  const symptoms = Object.keys(log.symptoms ?? {}).length;
  if (symptoms) out.push(s.today.quick.symptoms(symptoms));
  if (log.mood) out.push(s.today.quick.mood(s.mood[log.mood]));
  if (log.energy) out.push(s.today.quick.energy(s.energy[log.energy]));
  if (log.bbt) out.push(s.today.quick.bbt(formatNumber(log.bbt.celsius, 2)));
  if (log.mucus) out.push(`${s.journal.mucus.title.toLowerCase()}: ${s.mucus[log.mucus].toLowerCase()}`);
  if (log.intimacy && showIntimacy) out.push(s.today.quick.intimacy);
  if (log.note) out.push(s.today.quick.note);
  return out;
}

export function flagText(flag: Flag): { title: string; body: string } {
  const s = strings();
  const name = flag.symptom ? s.symptom[flag.symptom] : '';
  const text = content().tips.flagTexts[flag.kind];
  return { title: text.title(name), body: text.body(flag.values, name, s.common.days) };
}

/**
 * With fertility estimates switched off (e.g. on hormonal contraception) only menstruation is shown:
 * the other phases assume a natural cycle and would be misleading.
 */
export function visiblePhase(phase: Phase | undefined, showFertility: boolean): Phase | undefined {
  return showFertility || phase === 'menstruation' ? phase : undefined;
}
