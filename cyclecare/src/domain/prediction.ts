import { addDays, diffDays } from './dates';
import { buildCycles, cycleAt, PERIOD_MERGE_GAP, type Cycle } from './cycles';
import { isPeriodFlow, type DayLogs, type ISODate, type Phase, type Profile } from './types';

/**
 * Cycle prediction. The step-by-step description lives in docs/03-algoritm-predictie.md
 * and uses the same step numbers as the comments below.
 *
 * Nothing here is a medical device: the output is an estimate with an explicit interval,
 * and it must never be presented as a contraceptive method.
 */

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_LENGTH = 5;
/** Days between the estimated ovulation day and the next period. */
export const LUTEAL_PHASE_DAYS = 14;
/** Moving-average window: the most recent valid cycles. */
export const MOVING_WINDOW = 6;
/** Until this many cycles are recorded, the declared length fills the missing observations. */
export const PRIOR_OBSERVATIONS = 3;
/** Typical within-person variability (days) assumed before the records can show it. */
export const SIGMA_PRIOR = 3;
/** Weight of that assumption, expressed in degrees of freedom. */
export const SIGMA_PRIOR_WEIGHT = 2;
/** Normal quantile for a two-sided 80 % interval. */
export const Z_80 = 1.2816;
/** How many future cycles the calendar shows. */
export const FORECAST_CYCLES = 3;
export const FERTILE_DAYS_BEFORE = 5;
export const FERTILE_DAYS_AFTER = 1;

export interface LengthEstimate {
  /** Number of recorded values used. */
  sampleSize: number;
  /** Recorded values plus the declared value standing in for missing ones. */
  effectiveSize: number;
  mean: number;
  sd: number;
}

/**
 * Steps 5–6 — moving average and variability.
 * `lengths` are the valid cycle lengths inside the window, `prior` is the declared (or default) length.
 */
export function estimateLength(lengths: number[], prior: number): LengthEstimate {
  const n = lengths.length;
  const k = Math.max(0, PRIOR_OBSERVATIONS - n);
  const sum = lengths.reduce((a, b) => a + b, 0);
  const mean = (sum + k * prior) / (n + k);

  let sd = SIGMA_PRIOR;
  if (n >= 2) {
    const observedMean = sum / n;
    const sampleVariance = lengths.reduce((acc, x) => acc + (x - observedMean) ** 2, 0) / (n - 1);
    const variance =
      ((n - 1) * sampleVariance + SIGMA_PRIOR_WEIGHT * SIGMA_PRIOR ** 2) / (n - 1 + SIGMA_PRIOR_WEIGHT);
    sd = Math.sqrt(variance);
  }
  return { sampleSize: n, effectiveSize: n + k, mean, sd };
}

/**
 * Step 7 — half-width (in days) of the ~80 % prediction interval for the start of the
 * `cyclesAhead`-th next period (1 = the next one). Uncertainty grows with every cycle ahead.
 */
export function intervalHalfWidth(estimate: LengthEstimate, cyclesAhead = 1): number {
  const k = cyclesAhead;
  const sdAhead = estimate.sd * Math.sqrt(k + (k * k) / estimate.effectiveSize);
  return Math.max(1, Math.round(Z_80 * sdAhead));
}

export type Confidence = 'low' | 'medium' | 'high';

export function confidenceOf(sampleSize: number, halfWidth: number): Confidence {
  if (sampleSize >= 4 && halfWidth <= 3) return 'high';
  if (sampleSize >= 2 && halfWidth <= 5) return 'medium';
  return 'low';
}

export interface CycleStats {
  /** Valid completed cycle lengths in the moving window, oldest first. */
  lengths: number[];
  cycle: LengthEstimate;
  shortest?: number;
  longest?: number;
  /** Logged period lengths in the window (periods logged on a single day are left out). */
  periodLengths: number[];
  period: LengthEstimate;
}

export function computeStats(cycles: Cycle[], profile: Profile, today: ISODate): CycleStats {
  const lengths = cycles
    .filter((c) => c.valid && c.length !== undefined)
    .slice(-MOVING_WINDOW)
    .map((c) => c.length!);

  const periodLengths = cycles
    .filter((c) => {
      const finished = c.length !== undefined || diffDays(today, c.period.end) > PERIOD_MERGE_GAP;
      return finished && c.period.length >= 2;
    })
    .slice(-MOVING_WINDOW)
    .map((c) => c.period.length);

  return {
    lengths,
    cycle: estimateLength(lengths, profile.typicalCycleLength ?? DEFAULT_CYCLE_LENGTH),
    shortest: lengths.length ? Math.min(...lengths) : undefined,
    longest: lengths.length ? Math.max(...lengths) : undefined,
    periodLengths,
    period: estimateLength(periodLengths, profile.typicalPeriodLength ?? DEFAULT_PERIOD_LENGTH),
  };
}

export type PredictionStatus = 'no_data' | 'on_track' | 'due' | 'late';
export type PredictionBasis = 'none' | 'default' | 'declared' | 'history';

export interface ForecastCycle {
  /** Most likely first day of the period. */
  start: ISODate;
  /** Prediction interval for that first day. */
  earliest: ISODate;
  latest: ISODate;
  periodEnd: ISODate;
  ovulation: ISODate;
  fertileStart: ISODate;
  fertileEnd: ISODate;
  /** Last day of this forecast cycle. */
  end: ISODate;
}

export interface CurrentCycle {
  start: ISODate;
  /** 1-based. */
  cycleDay: number;
  /** `start + cycleLength`, not shifted when the period is late. */
  expectedNext: ISODate;
  earliest: ISODate;
  latest: ISODate;
  /** `expectedNext − today`; negative when the period is late. */
  daysUntil: number;
  ovulation: ISODate;
  fertileStart: ISODate;
  fertileEnd: ISODate;
  /** The logged period may still be going on (no bleeding-free gap long enough yet). */
  periodLikelyOngoing: boolean;
  /** Last day shown as (logged or predicted) menstruation in the current cycle. */
  periodEnd: ISODate;
}

export interface Prediction {
  basis: PredictionBasis;
  status: PredictionStatus;
  /** Rounded moving average, in days. */
  cycleLength: number;
  periodLength: number;
  /** Half-width of the interval for the next period, in days. */
  halfWidth: number;
  confidence: Confidence;
  /** Recorded cycles behind the estimate. */
  sampleSize: number;
  current?: CurrentCycle;
  /** Next period first, then following cycles. Empty when there is no data. */
  forecasts: ForecastCycle[];
}

export interface DayInfo {
  date: ISODate;
  phase?: Phase;
  /** 1-based day of the cycle the date falls in. */
  cycleDay?: number;
  /** The date is today or later, so everything about it is an estimate. */
  forecast: boolean;
  /** A period flow is logged on this day and it belongs to the period that opens a cycle. */
  periodLogged: boolean;
  /** Estimated period day with nothing logged. */
  periodPredicted: boolean;
  ovulationDay: boolean;
  fertile: boolean;
  /** A period-type flow logged outside the opening period (bleeding between periods). */
  intermenstrualBleed: boolean;
  spotting: boolean;
}

export interface Timeline {
  today: ISODate;
  cycles: Cycle[];
  stats: CycleStats;
  prediction: Prediction;
  dayInfo(date: ISODate): DayInfo;
}

/** 0-based offset of the estimated ovulation day inside a cycle of the given length. */
export function ovulationOffset(cycleLength: number): number {
  return Math.max(0, cycleLength - LUTEAL_PHASE_DAYS - 1);
}

/** Step 9 — phase of a day, from its 0-based offset in the cycle. Menstruation wins over everything. */
export function phaseAt(offset: number, cycleLength: number, periodEndOffset: number): Phase {
  if (offset <= periodEndOffset) return 'menstruation';
  const ov = ovulationOffset(cycleLength);
  if (offset < ov - 1) return 'follicular';
  if (offset <= ov + 1) return 'ovulation';
  return 'luteal';
}

function isFertileOffset(offset: number, cycleLength: number): boolean {
  const ov = ovulationOffset(cycleLength);
  return offset >= ov - FERTILE_DAYS_BEFORE && offset <= ov + FERTILE_DAYS_AFTER;
}

function forecastCycle(start: ISODate, cycleLength: number, periodLength: number, halfWidth: number): ForecastCycle {
  const ov = ovulationOffset(cycleLength);
  return {
    start,
    earliest: addDays(start, -halfWidth),
    latest: addDays(start, halfWidth),
    periodEnd: addDays(start, periodLength - 1),
    ovulation: addDays(start, ov),
    fertileStart: addDays(start, Math.max(0, ov - FERTILE_DAYS_BEFORE)),
    fertileEnd: addDays(start, ov + FERTILE_DAYS_AFTER),
    end: addDays(start, cycleLength - 1),
  };
}

/** Steps 1–10 for the whole journal. Pure: same input, same output; call it again after any change. */
export function buildTimeline(logs: DayLogs, profile: Profile, today: ISODate): Timeline {
  const cycles = buildCycles(logs);
  const stats = computeStats(cycles, profile, today);
  const cycleLength = Math.round(stats.cycle.mean);
  const periodLength = Math.min(14, Math.max(1, Math.round(stats.period.mean)));
  const halfWidth = intervalHalfWidth(stats.cycle, 1);
  const sampleSize = stats.cycle.sampleSize;

  const basis: PredictionBasis =
    cycles.length === 0
      ? 'none'
      : sampleSize > 0
        ? 'history'
        : profile.typicalCycleLength !== undefined
          ? 'declared'
          : 'default';

  const prediction: Prediction = {
    basis,
    status: 'no_data',
    cycleLength,
    periodLength,
    halfWidth,
    confidence: confidenceOf(sampleSize, halfWidth),
    sampleSize,
    forecasts: [],
  };

  const open = cycles[cycles.length - 1];
  if (open) {
    const expectedNext = addDays(open.start, cycleLength);
    const earliest = addDays(expectedNext, -halfWidth);
    const latest = addDays(expectedNext, halfWidth);
    const ov = ovulationOffset(cycleLength);
    const periodLikelyOngoing =
      diffDays(today, open.period.end) <= PERIOD_MERGE_GAP + 1 &&
      diffDays(today, open.start) < periodLength;
    const predictedEnd = addDays(open.start, periodLength - 1);
    prediction.current = {
      start: open.start,
      cycleDay: diffDays(today, open.start) + 1,
      expectedNext,
      earliest,
      latest,
      daysUntil: diffDays(expectedNext, today),
      ovulation: addDays(open.start, ov),
      fertileStart: addDays(open.start, Math.max(0, ov - FERTILE_DAYS_BEFORE)),
      fertileEnd: addDays(open.start, ov + FERTILE_DAYS_AFTER),
      periodLikelyOngoing,
      periodEnd: periodLikelyOngoing && predictedEnd > open.period.end ? predictedEnd : open.period.end,
    };
    prediction.status = today < earliest ? 'on_track' : today <= latest ? 'due' : 'late';

    // Step 10 — forecasts. A period cannot start in the past, so a late period is drawn from today.
    const firstStart = expectedNext < today ? today : expectedNext;
    for (let k = 0; k < FORECAST_CYCLES; k++) {
      const start = addDays(firstStart, k * cycleLength);
      const f = forecastCycle(start, cycleLength, periodLength, intervalHalfWidth(stats.cycle, k + 1));
      if (k === 0) {
        f.earliest = earliest < today ? today : earliest;
        f.latest = latest < start ? start : latest;
      }
      prediction.forecasts.push(f);
    }
  }

  const firstForecast = prediction.forecasts[0];
  const lastForecast = prediction.forecasts[prediction.forecasts.length - 1];

  function dayInfo(date: ISODate): DayInfo {
    const flow = logs[date]?.flow;
    const info: DayInfo = {
      date,
      forecast: date >= today,
      periodLogged: false,
      periodPredicted: false,
      ovulationDay: false,
      fertile: false,
      intermenstrualBleed: false,
      spotting: flow === 'spotting',
    };
    if (!open || !firstForecast || !lastForecast) return info;

    // Forecast cycles (from the predicted next period onwards).
    if (date >= firstForecast.start) {
      if (date > lastForecast.end) return info;
      const k = Math.floor(diffDays(date, firstForecast.start) / cycleLength);
      const f = prediction.forecasts[k];
      if (!f) return info;
      const offset = diffDays(date, f.start);
      // A late period is drawn from today, but today still belongs to the cycle that is running.
      info.cycleDay = date === today ? prediction.current!.cycleDay : offset + 1;
      info.phase = phaseAt(offset, cycleLength, periodLength - 1);
      info.periodPredicted = info.phase === 'menstruation';
      info.ovulationDay = date === f.ovulation;
      info.fertile = isFertileOffset(offset, cycleLength);
      return info;
    }

    const cycle = cycleAt(cycles, date);
    if (!cycle) return info;
    const offset = diffDays(date, cycle.start);
    info.cycleDay = offset + 1;
    const inOpeningPeriod = date <= cycle.period.end;
    if (isPeriodFlow(flow)) {
      if (inOpeningPeriod) info.periodLogged = true;
      else info.intermenstrualBleed = true;
    }

    if (cycle.length !== undefined) {
      // Completed cycle: phases are placed backwards from the real cycle length.
      if (!cycle.valid) {
        if (inOpeningPeriod) info.phase = 'menstruation';
        return info;
      }
      info.phase = phaseAt(offset, cycle.length, diffDays(cycle.period.end, cycle.start));
      info.ovulationDay = offset === ovulationOffset(cycle.length);
      info.fertile = isFertileOffset(offset, cycle.length);
      return info;
    }

    // Current cycle: logged period, then its predicted continuation, then estimated phases.
    const current = prediction.current!;
    const loggedEnd = diffDays(cycle.period.end, cycle.start);
    const shownEnd = date >= today ? diffDays(current.periodEnd, cycle.start) : loggedEnd;
    info.phase = phaseAt(offset, cycleLength, shownEnd);
    info.periodPredicted = info.phase === 'menstruation' && offset > loggedEnd;
    info.ovulationDay = date === current.ovulation;
    info.fertile = isFertileOffset(offset, cycleLength);
    return info;
  }

  return { today, cycles, stats, prediction, dayInfo };
}

/**
 * The phase the person is most likely in today, used for the home screen and the tips.
 * While a period is due or late but has not been logged, that is still the luteal phase.
 */
export function currentPhase(timeline: Timeline): Phase | undefined {
  const current = timeline.prediction.current;
  if (!current) return undefined;
  const info = timeline.dayInfo(timeline.today);
  if (info.periodLogged) return 'menstruation';
  if (timeline.today >= current.expectedNext) return 'luteal';
  return info.phase;
}
