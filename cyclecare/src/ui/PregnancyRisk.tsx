import { CalendarCheck, CircleAlert, Heart, Pill } from 'lucide-react';
import type { ContactAssessment, DayChance } from '../domain/pregnancyRisk';
import type { IntimacyLog } from '../domain/types';
import { strings } from '../i18n';

/** Three short bars filled up to the level; dashed when there is no estimate. Text always says the same. */
export function ChanceScale({ level }: { level: DayChance }) {
  return (
    <span className="risk-scale" data-level={level} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

/** One sentence for the risk of a day's contact, and why. */
export function contactExplanation(assessment: ContactAssessment, log: IntimacyLog): string[] {
  const p = strings().pregnancy;
  const lines = [p.contactRisk(p.risk[assessment.risk])];
  if (assessment.nonVaginal) {
    lines.push(log.activities.includes('anal') ? p.explain.anal : p.explain.not_relevant);
    return lines;
  }
  lines.push(p.explain[assessment.protection === 'not_relevant' ? 'unspecified' : assessment.protection]);
  // With reliable contraception the day of the cycle hardly matters, so it is not discussed.
  if (assessment.protection !== 'ongoing') lines.push(p.dayReason[assessment.chance.reason]);
  return lines;
}

export const RiskIcons = { emergency: CircleAlert, test: CalendarCheck, taken: Pill, log: Heart };
