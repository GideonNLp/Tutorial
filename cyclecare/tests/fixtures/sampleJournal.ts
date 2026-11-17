import { addDays, diffDays } from '../../src/domain/dates';
import { ovulationOffset } from '../../src/domain/prediction';
import type { CervicalMucus, DayLog, DayLogs, Flow, Intensity, ISODate, Profile, Scale5, SymptomId } from '../../src/domain/types';

/**
 * Test fixture: about seven months of plausible journal entries ending on `today`.
 * Used by the unit tests, the end-to-end tests and the documentation screenshots.
 * It is not part of the app: the shipped build contains no sample data.
 * Deterministic for a given `today`, so screenshots and assertions are reproducible.
 */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FLOW_PATTERNS: Record<number, Flow[]> = {
  4: ['medium', 'heavy', 'medium', 'light'],
  5: ['medium', 'heavy', 'medium', 'light', 'light'],
  6: ['light', 'medium', 'heavy', 'medium', 'light', 'light'],
};

/** Most recent completed cycle first. */
const PAST_CYCLE_LENGTHS = [28, 27, 30, 26, 29, 28, 27];
const PAST_PERIOD_LENGTHS = [5, 4, 5, 6, 5, 4, 5];
const CURRENT_CYCLE_DAY = 12;
const CURRENT_PERIOD_LENGTH = 5;

export const NOTES = [
  'Zi aglomerată, somn puțin. Seara am făcut o plimbare scurtă.',
  'Crampe puternice dimineața, au cedat după o sticlă cu apă caldă.',
  'Multă energie azi, antrenament bun.',
  'Poftă de dulce după-amiaza. Am băut mai multă apă.',
  'Durere de cap spre seară, probabil de la ecran.',
];

export const SAMPLE_DEVICE = 'Inel';

export function sampleJournal(today: ISODate, nowISO: string): { logs: DayLogs; profile: Profile } {
  const rand = mulberry32(20261115);
  const logs: DayLogs = {};
  const entry = (date: ISODate): DayLog => (logs[date] ??= { date, updatedAt: nowISO });
  const symptom = (date: ISODate, id: SymptomId, intensity: Intensity) => {
    if (date > today) return;
    const log = entry(date);
    log.symptoms = { ...log.symptoms, [id]: intensity };
  };
  const pick = <T>(items: T[]): T => items[Math.floor(rand() * items.length)]!;
  const clamp5 = (n: number): Scale5 => Math.min(5, Math.max(1, Math.round(n))) as Scale5;

  // Cycle start dates, oldest first; the last one is the cycle that is running.
  const currentStart = addDays(today, -(CURRENT_CYCLE_DAY - 1));
  const cycles: Array<{ start: ISODate; length: number; period: number; current: boolean }> = [
    { start: currentStart, length: 28, period: CURRENT_PERIOD_LENGTH, current: true },
  ];
  let cursor = currentStart;
  PAST_CYCLE_LENGTHS.forEach((length, i) => {
    cursor = addDays(cursor, -length);
    cycles.unshift({ start: cursor, length, period: PAST_PERIOD_LENGTHS[i]!, current: false });
  });

  cycles.forEach((cycle, index) => {
    const recent = index >= cycles.length - 4;
    const ov = ovulationOffset(cycle.length);
    const lastOffset = cycle.current ? diffDays(today, cycle.start) : cycle.length - 1;

    // Flow
    FLOW_PATTERNS[cycle.period]!.forEach((flow, d) => {
      const date = addDays(cycle.start, d);
      if (date <= today) entry(date).flow = flow;
    });
    if (!cycle.current && rand() < 0.4) entry(addDays(cycle.start, cycle.period)).flow = 'spotting';

    // Symptoms around the period
    const heavyCramps = cycle.current || rand() < 0.35;
    symptom(cycle.start, 'cramps', heavyCramps ? 3 : 2);
    symptom(addDays(cycle.start, 1), 'cramps', heavyCramps ? 3 : 2);
    if (rand() < 0.7) symptom(addDays(cycle.start, 2), 'cramps', cycle.current ? 2 : 1);
    if (rand() < 0.6) symptom(cycle.start, 'backache', pick([1, 2]));
    symptom(cycle.start, 'fatigue', 2);
    if (rand() < 0.5) symptom(addDays(cycle.start, 1), 'fatigue', pick([1, 2]));
    if (rand() < 0.5) symptom(cycle.start, 'bloating', 1);

    // Premenstrual days
    for (let d = cycle.length - 6; d < cycle.length; d++) {
      const date = addDays(cycle.start, d);
      const closeness = d - (cycle.length - 7);
      if (d <= cycle.length - 2 && rand() < 0.75) symptom(date, 'breast_tenderness', closeness > 3 ? 2 : 1);
      if (d >= cycle.length - 4 && rand() < 0.7) symptom(date, 'bloating', pick([1, 2]));
      if (d >= cycle.length - 4 && rand() < 0.55) symptom(date, 'irritability', pick([1, 2]));
      if (d >= cycle.length - 3 && rand() < 0.5) symptom(date, 'cravings', 1);
      if (d >= cycle.length - 5 && index % 2 === 0 && rand() < 0.6) symptom(date, 'acne', pick([1, 2]));
      if (d >= cycle.length - 2 && rand() < 0.35) symptom(date, 'insomnia', 1);
    }
    // A headache or two per cycle, anywhere.
    for (let i = 0; i < 2; i++) {
      if (rand() < 0.7) symptom(addDays(cycle.start, Math.floor(rand() * cycle.length)), 'headache', pick([1, 2]));
    }

    // Mood and energy follow the phases, with some noise; most days are logged.
    for (let d = 0; d <= lastOffset; d++) {
      const date = addDays(cycle.start, d);
      if (date !== today && rand() > 0.85) continue;
      let mood = 4;
      let energy = 4;
      if (d < 2) [mood, energy] = [3, 2];
      else if (d < cycle.period) [mood, energy] = [3, 3];
      else if (d >= ov - 1 && d <= ov + 1) [mood, energy] = [4.6, 4.6];
      else if (d >= cycle.length - 5) [mood, energy] = [2.6, 2.6];
      else if (d > ov + 1) [mood, energy] = [3.8, 3.4];
      const log = entry(date);
      log.mood = clamp5(mood + (rand() - 0.5) * 1.4);
      log.energy = clamp5(energy + (rand() - 0.5) * 1.4);
    }

    // Basal temperature and cervical mucus for the recent cycles.
    if (recent) {
      for (let d = 0; d <= lastOffset; d++) {
        const date = addDays(cycle.start, d);
        if (rand() > 0.85) continue;
        const base = d > ov ? 36.76 : 36.38;
        const celsius = Math.round((base + (rand() - 0.5) * 0.24) * 100) / 100;
        entry(date).bbt = cycle.current ? { celsius, source: 'manual' } : { celsius, source: 'import', device: SAMPLE_DEVICE };
      }
      for (let d = cycle.period; d <= Math.min(lastOffset, ov + 3); d++) {
        let mucus: CervicalMucus = 'dry';
        if (d >= ov - 1 && d <= ov) mucus = 'eggwhite';
        else if (d >= ov - 3 && d < ov - 1) mucus = 'watery';
        else if (d >= ov - 6 && d < ov - 3) mucus = 'creamy';
        else if (d > cycle.period + 1) mucus = 'sticky';
        if (rand() < 0.8) entry(addDays(cycle.start, d)).mucus = mucus;
      }
    }
  });

  // Recent, visible details for the home and tips screens.
  symptom(addDays(today, -1), 'headache', 2);
  symptom(addDays(today, -2), 'headache', 1);
  entry(addDays(today, -1)).note = NOTES[4];
  entry(addDays(currentStart, 0)).note = NOTES[1];
  entry(addDays(today, -4)).note = NOTES[2];
  entry(addDays(currentStart, -3)).note = NOTES[3];
  entry(addDays(currentStart, -20)).note = NOTES[0];

  const profile: Profile = {
    goals: ['general', 'symptoms'],
    typicalCycleLength: 28,
    typicalPeriodLength: 5,
    showFertility: true,
    showIntimacy: true,
  };
  return { logs, profile };
}
