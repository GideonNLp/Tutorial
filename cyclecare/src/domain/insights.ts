import { addDays, diffDays, eachDay } from './dates';
import type { Cycle } from './cycles';
import { MOVING_WINDOW, type Timeline } from './prediction';
import { isPeriodFlow, SYMPTOM_IDS, type DayLogs, type Intensity, type ISODate, type SymptomId } from './types';

/**
 * Rules that decide when the app suggests talking to a doctor, and which symptom tips to show.
 * The app never names a condition: a flag only states what was recorded and invites a conversation.
 * Thresholds follow the FIGO descriptions of normal cycle frequency, regularity and duration and
 * must be reviewed by a medical professional before release (see docs/04-sablon-continut-sfaturi.md).
 */
export const THRESHOLDS = {
  /** Cycles shorter than this are "frequent" (FIGO: fewer than 24 days). */
  shortCycleDays: 24,
  /** Cycles longer than this are "infrequent" (FIGO: more than 38 days). */
  longCycleDays: 38,
  /** Shortest-to-longest difference above this is "irregular" (FIGO: 8–10 days or more). */
  irregularRangeDays: 9,
  /** Bleeding for more than this many days is "prolonged" (FIGO: more than 8 days). */
  longPeriodDays: 8,
  /** How many of the recent cycles must show a pattern before it is flagged. */
  repeatCount: 2,
  /** Days without a recorded period before suggesting a check. */
  noPeriodDays: 90,
  /** Heavy-flow days per period that count as a heavy period. */
  heavyDaysPerPeriod: 3,
  /** Severe-intensity days in the last 30 that trigger a flag. */
  severeDays: 2,
  severeWindow: 30,
  /** Logged on at least this many of the last `persistentWindow` days. */
  persistentDays: 7,
  persistentWindow: 14,
  /** A symptom is "new" when it shows up this often … */
  newSymptomDays: 3,
  newSymptomWindow: 14,
  /** … after not being logged at all during this many earlier days … */
  newSymptomQuietDays: 90,
  /** … and the journal is at least this old. */
  newSymptomMinHistory: 60,
  /** Mood of 2 or lower on this many of the last 14 days. */
  lowMoodDays: 7,
  lowMoodWindow: 14,
  /** Symptom tips: logged within the last few days, or repeatedly in the recent window. */
  recentDays: 3,
  recentWindow: 14,
  recentRepeat: 2,
  /** A dismissed flag stays hidden for this long. */
  dismissDays: 30,
} as const;

export type FlagKind =
  | 'cycle_short'
  | 'cycle_long'
  | 'cycle_irregular'
  | 'period_long'
  | 'period_heavy'
  | 'no_period'
  | 'period_late'
  | 'bleeding_between'
  | 'symptom_severe'
  | 'symptom_persistent'
  | 'symptom_new'
  | 'low_mood';

/** `attention` = worth discussing with a doctor; `info` = good to know. */
export const FLAG_SEVERITY: Record<FlagKind, 'info' | 'attention'> = {
  cycle_short: 'attention',
  cycle_long: 'attention',
  cycle_irregular: 'attention',
  period_long: 'attention',
  period_heavy: 'attention',
  no_period: 'attention',
  period_late: 'info',
  bleeding_between: 'attention',
  symptom_severe: 'attention',
  symptom_persistent: 'attention',
  symptom_new: 'info',
  low_mood: 'attention',
};

export interface Flag {
  /** Stable key used for dismissing, e.g. `symptom_severe:cramps`. */
  id: string;
  kind: FlagKind;
  /** `attention` = worth discussing with a doctor; `info` = good to know. */
  severity: 'info' | 'attention';
  symptom?: SymptomId;
  /** Numbers quoted in the message. */
  values: Record<string, number>;
}

function countDays(logs: DayLogs, from: ISODate, to: ISODate, test: (date: ISODate) => boolean): number {
  let n = 0;
  for (const date of eachDay(from, to)) if (logs[date] && test(date)) n++;
  return n;
}

/** Days of bleeding or spotting that fall clearly between periods (not just before or after one). */
function bleedingBetweenDays(cycle: Cycle, nextStart: ISODate | undefined, logs: DayLogs, today: ISODate): number {
  const from = addDays(cycle.period.end, 3);
  const to = nextStart ? addDays(nextStart, -3) : today;
  if (to < from) return 0;
  return countDays(logs, from, to, (d) => {
    const flow = logs[d]?.flow;
    return flow === 'spotting' || isPeriodFlow(flow);
  });
}

export function computeFlags(timeline: Timeline, logs: DayLogs): Flag[] {
  const { cycles, stats, prediction, today } = timeline;
  const flags: Flag[] = [];
  const T = THRESHOLDS;

  // --- Cycle patterns (last six valid cycles) -------------------------------------------------
  const lengths = stats.lengths;
  const short = lengths.filter((l) => l < T.shortCycleDays).length;
  const long = lengths.filter((l) => l > T.longCycleDays).length;
  if (short >= T.repeatCount) {
    flags.push({ id: 'cycle_short', kind: 'cycle_short', severity: FLAG_SEVERITY.cycle_short, values: { count: short, days: T.shortCycleDays } });
  }
  if (long >= T.repeatCount) {
    flags.push({ id: 'cycle_long', kind: 'cycle_long', severity: FLAG_SEVERITY.cycle_long, values: { count: long, days: T.longCycleDays } });
  }
  if (lengths.length >= 3 && stats.shortest !== undefined && stats.longest !== undefined) {
    const range = stats.longest - stats.shortest;
    if (range > T.irregularRangeDays) {
      flags.push({
        id: 'cycle_irregular',
        kind: 'cycle_irregular',
        severity: FLAG_SEVERITY.cycle_irregular,
        values: { shortest: stats.shortest, longest: stats.longest, range },
      });
    }
  }

  // --- Period patterns ------------------------------------------------------------------------
  const longPeriods = stats.periodLengths.filter((l) => l > T.longPeriodDays).length;
  if (longPeriods >= T.repeatCount) {
    flags.push({ id: 'period_long', kind: 'period_long', severity: FLAG_SEVERITY.period_long, values: { count: longPeriods, days: T.longPeriodDays } });
  }

  const recentCycles = cycles.slice(-MOVING_WINDOW);
  const lastTwoPeriods = cycles.filter((c) => c.length !== undefined || diffDays(today, c.period.end) > 2).slice(-2);
  if (
    lastTwoPeriods.length === 2 &&
    lastTwoPeriods.every((c) => c.period.days.filter((d) => logs[d]?.flow === 'heavy').length >= T.heavyDaysPerPeriod)
  ) {
    flags.push({ id: 'period_heavy', kind: 'period_heavy', severity: FLAG_SEVERITY.period_heavy, values: { days: T.heavyDaysPerPeriod } });
  }

  const lastThree = recentCycles.slice(-3);
  const withBleeding = lastThree.filter((c) => {
    const next = cycles[c.index + 1];
    return c.intermenstrual.length > 0 || bleedingBetweenDays(c, next?.start, logs, today) > 0;
  }).length;
  if (withBleeding >= T.repeatCount) {
    flags.push({ id: 'bleeding_between', kind: 'bleeding_between', severity: FLAG_SEVERITY.bleeding_between, values: { count: withBleeding } });
  }

  // --- Late or missing period -----------------------------------------------------------------
  const current = prediction.current;
  if (current) {
    if (current.cycleDay > T.noPeriodDays) {
      flags.push({ id: 'no_period', kind: 'no_period', severity: FLAG_SEVERITY.no_period, values: { days: current.cycleDay - 1 } });
    } else if (prediction.status === 'late') {
      flags.push({
        // Tied to the cycle, so dismissing it does not hide a late period in a later cycle.
        id: `period_late:${current.start}`,
        kind: 'period_late',
        severity: FLAG_SEVERITY.period_late,
        values: { days: -current.daysUntil },
      });
    }
  }

  // --- Symptoms -------------------------------------------------------------------------------
  const firstLog = Object.keys(logs).sort()[0];
  const historyDays = firstLog ? diffDays(today, firstLog) : 0;
  for (const symptom of SYMPTOM_IDS) {
    const has = (d: ISODate) => logs[d]?.symptoms?.[symptom] !== undefined;
    const severe = countDays(logs, addDays(today, -(T.severeWindow - 1)), today, (d) => logs[d]?.symptoms?.[symptom] === 3);
    if (severe >= T.severeDays) {
      flags.push({
        id: `symptom_severe:${symptom}`,
        kind: 'symptom_severe',
        severity: FLAG_SEVERITY.symptom_severe,
        symptom,
        values: { days: severe, window: T.severeWindow },
      });
      continue;
    }
    const persistent = countDays(logs, addDays(today, -(T.persistentWindow - 1)), today, has);
    if (persistent >= T.persistentDays) {
      flags.push({
        id: `symptom_persistent:${symptom}`,
        kind: 'symptom_persistent',
        severity: FLAG_SEVERITY.symptom_persistent,
        symptom,
        values: { days: persistent, window: T.persistentWindow },
      });
      continue;
    }
    if (historyDays >= T.newSymptomMinHistory) {
      const recent = countDays(logs, addDays(today, -(T.newSymptomWindow - 1)), today, has);
      if (recent >= T.newSymptomDays) {
        const quietTo = addDays(today, -T.newSymptomWindow);
        const before = countDays(logs, addDays(quietTo, -(T.newSymptomQuietDays - 1)), quietTo, has);
        if (before === 0) {
          flags.push({
            id: `symptom_new:${symptom}`,
            kind: 'symptom_new',
            severity: FLAG_SEVERITY.symptom_new,
            symptom,
            values: { days: recent, window: T.newSymptomWindow },
          });
        }
      }
    }
  }

  const lowMood = countDays(logs, addDays(today, -(T.lowMoodWindow - 1)), today, (d) => (logs[d]?.mood ?? 5) <= 2);
  if (lowMood >= T.lowMoodDays) {
    flags.push({ id: 'low_mood', kind: 'low_mood', severity: FLAG_SEVERITY.low_mood, values: { days: lowMood, window: T.lowMoodWindow } });
  }

  return flags.sort((a, b) => Number(b.severity === 'attention') - Number(a.severity === 'attention'));
}

export function visibleFlags(flags: Flag[], dismissed: Record<string, ISODate>, today: ISODate): Flag[] {
  return flags.filter((f) => {
    const at = dismissed[f.id];
    return !at || diffDays(today, at) >= THRESHOLDS.dismissDays;
  });
}

export interface RecentSymptom {
  symptom: SymptomId;
  /** Days logged in the recent window. */
  days: number;
  lastLogged: ISODate;
  maxIntensity: Intensity;
}

/** Symptoms that earn a tips card: logged in the last few days, or repeatedly in the last two weeks. */
export function recentSymptoms(logs: DayLogs, today: ISODate): RecentSymptom[] {
  const T = THRESHOLDS;
  const from = addDays(today, -(T.recentWindow - 1));
  const found = new Map<SymptomId, RecentSymptom>();
  for (const date of eachDay(from, today)) {
    const symptoms = logs[date]?.symptoms;
    if (!symptoms) continue;
    for (const [id, intensity] of Object.entries(symptoms) as [SymptomId, Intensity][]) {
      const entry = found.get(id);
      if (entry) {
        entry.days++;
        entry.lastLogged = date;
        if (intensity > entry.maxIntensity) entry.maxIntensity = intensity;
      } else {
        found.set(id, { symptom: id, days: 1, lastLogged: date, maxIntensity: intensity });
      }
    }
  }
  return [...found.values()]
    .filter((s) => s.days >= T.recentRepeat || diffDays(today, s.lastLogged) < T.recentDays)
    .sort((a, b) => b.days - a.days || (a.lastLogged < b.lastLogged ? 1 : -1));
}
