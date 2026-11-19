import { CircleAlert, Droplets, Gauge, Info, Lightbulb, NotebookPen, ShieldAlert, Sprout, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { reminderText } from '../app/lifecycle';
import { navigate } from '../app/router';
import { update, useData, useStorageMode, useTimeline, useToday } from '../app/store';
import { openJournal, toast } from '../app/ui';
import { content, TIP_CATEGORIES } from '../content';
import { diffDays, toDayNumber } from '../domain/dates';
import { computeFlags, visibleFlags } from '../domain/insights';
import { updateDay } from '../domain/journal';
import { currentPhase } from '../domain/prediction';
import { reminderOccurrences } from '../domain/reminders';
import { FLOWS, type Flow } from '../domain/types';
import { formatDate, formatRange, strings } from '../i18n';
import { ChoiceChips } from '../ui/controls';
import { CycleDial, phaseSpans } from '../ui/CycleDial';
import { mascotMood } from '../domain/mascot';
import { InstallCard } from '../ui/InstallApp';
import { Notice, Screen } from '../ui/Shell';
import { flagText, summarizeLog, visiblePhase } from '../ui/summaries';
import { haptic } from '../ui/haptics';
import { summarizePregnancyRisk } from '../domain/pregnancyRisk';
import { ChanceScale, RiskIcons } from '../ui/PregnancyRisk';

/** The head of a card on this screen: a round badge in the colour of the card, then its heading. */
function CardHead({ icon: Icon, id, children }: { icon: LucideIcon; id: string; children: ReactNode }) {
  return (
    <div className="today-card-head">
      <span className="icon-badge" aria-hidden="true">
        <Icon size={20} />
      </span>
      <h2 id={id}>{children}</h2>
    </div>
  );
}

/** A big number with its unit, for the eye only: the sentences under it say the same, so it is hidden from readers. */
function Figure({ num, unit }: { num: string; unit?: string }) {
  return (
    <p className="figure" aria-hidden="true">
      <span className="figure-num">{num}</span>
      {unit && <span className="figure-unit">{unit}</span>}
    </p>
  );
}

export function TodayScreen() {
  const s = strings();
  const data = useData();
  const today = useToday();
  const timeline = useTimeline();
  const storage = useStorageMode();
  const { prediction } = timeline;
  const current = prediction.current;
  const showFertility = data.profile.showFertility;
  const phase = visiblePhase(currentPhase(timeline), showFertility);
  const todayInfo = timeline.dayInfo(today);
  const todayLog = data.logs[today];
  const late = prediction.status === 'late';
  const { goals } = data.profile;

  const flags = useMemo(
    () => visibleFlags(computeFlags(timeline, data.logs), data.dismissedFlags, today),
    [timeline, data.logs, data.dismissedFlags, today],
  );
  const risk = useMemo(() => summarizePregnancyRisk(timeline, data.logs, showFertility), [timeline, data.logs, showFertility]);
  const reminders = useMemo(
    () => reminderOccurrences(data.reminders, prediction, showFertility, today, today),
    [data.reminders, prediction, showFertility, today],
  );

  // One tip a day, rotating through the four themes for the current phase.
  const tip = useMemo(() => {
    if (!phase) return undefined;
    const n = toDayNumber(today);
    const category = TIP_CATEGORIES[n % TIP_CATEGORIES.length]!;
    const tips = content().tips.phaseTips[phase].tips[category];
    return { category, tip: tips[Math.floor(n / TIP_CATEGORIES.length) % tips.length]! };
  }, [phase, today]);

  const phaseLabel = late ? s.today.late : todayInfo.periodLogged && current ? s.phase.menstruation : phase ? s.phase[phase] : '';
  const mood = mascotMood(todayInfo.periodLogged && current ? 'menstruation' : phase, late);
  const { spans } = phaseSpans(timeline, showFertility);
  const forecast = prediction.forecasts[0];
  const summary = summarizeLog(todayLog, data.profile.showIntimacy);

  const setFlow = (flow: Flow | undefined) => {
    haptic('medium');
    update((d) => ({ ...d, logs: updateDay(d.logs, today, { flow }, new Date().toISOString()) }));
    toast(s.common.saved);
  };

  // The goals chosen at the start only change what comes first.
  const fertilityFirst = goals.includes('conception') && !goals.includes('contraception');
  const symptomsFirst = goals.includes('symptoms');

  const nextBlock = current && forecast && (
    <section aria-labelledby="next-heading" className="card today-card stack stack-2" data-kind="next" data-tap="">
      <CardHead icon={Droplets} id="next-heading">
        {s.today.next.heading}
      </CardHead>
      {late ? (
        <Figure num={String(-current.daysUntil)} unit={s.today.next.figure.lateUnit(-current.daysUntil)} />
      ) : prediction.status === 'due' ? null : current.daysUntil <= 1 ? (
        <Figure num={current.daysUntil <= 0 ? s.today.next.figure.today : s.today.next.figure.tomorrow} />
      ) : (
        <Figure num={String(current.daysUntil)} unit={s.today.next.figure.unit(current.daysUntil)} />
      )}
      {late ? (
        <>
          <p className="lead strong">{s.today.next.late(-current.daysUntil)}</p>
          <p className="ink-2">{s.today.next.lateHint}</p>
        </>
      ) : prediction.status === 'due' ? (
        <p className="lead strong">{s.today.next.due(formatDate(forecast.latest, 'dayMonthLong'))}</p>
      ) : (
        <>
          <p className="lead strong">
            {s.today.next.between(formatDate(forecast.earliest, 'dayMonthLong'), formatDate(forecast.latest, 'dayMonthLong'))}
          </p>
          <p className="ink-2">{s.today.next.likely(formatDate(forecast.start, 'dayMonthLong'), current.daysUntil)}</p>
        </>
      )}
      <p className="caption">
        {s.today.confidence[prediction.confidence]}.{' '}
        {prediction.basis === 'history'
          ? s.today.basis.history(prediction.sampleSize)
          : prediction.basis === 'declared'
            ? s.today.basis.declared
            : s.today.basis.default}
      </p>
    </section>
  );
  const fertilityBlock = current && showFertility && (
    <section aria-labelledby="fertility-heading" className="card today-card stack stack-2" data-kind="fertility" data-tap="">
      <CardHead icon={Sprout} id="fertility-heading">
        {s.today.fertility.heading}
      </CardHead>
      {!late &&
        (() => {
          const upcoming = current.fertileEnd >= today ? current : forecast;
          const until = upcoming ? diffDays(upcoming.fertileStart, today) : 0;
          return until > 0 ? <Figure num={String(until)} unit={s.today.fertility.untilUnit(until)} /> : null;
        })()}
      {late ? (
        // With the period overdue nobody knows where this cycle stands, so no fertile days are claimed.
        <p>{s.today.fertility.unreliable}</p>
      ) : (
        <>
          {todayInfo.ovulationDay ? (
            <p className="strong">{s.today.fertility.todayOvulation}</p>
          ) : (
            todayInfo.fertile && <p className="strong">{s.today.fertility.todayFertile}</p>
          )}
          {(() => {
            const next = current.fertileEnd >= today ? current : forecast;
            return next ? (
              <>
                <p>{s.today.fertility.window(formatRange(next.fertileStart, next.fertileEnd))}</p>
                <p className="ink-2">{s.today.fertility.ovulation(formatDate(next.ovulation, 'dayMonth'))}</p>
              </>
            ) : null;
          })()}
        </>
      )}
      <Notice icon={<Info size={18} aria-hidden="true" />}>
        <p>{data.profile.goals.includes('contraception') ? s.contraceptionGoalWarning : s.contraceptionWarning}</p>
      </Notice>
    </section>
  );
  const p = s.pregnancy;
  const showRisk = risk.contacts.length > 0 || (!!current && showFertility);
  const pregnancyBlock = showRisk && (
    <section aria-labelledby="pregnancy-heading" className="card today-card stack stack-2" data-kind="risk" data-tap="">
      <CardHead icon={Gauge} id="pregnancy-heading">
        {fertilityFirst ? p.titleChance : p.titleRisk}
      </CardHead>
      <p className="risk-today">
        <ChanceScale level={risk.today.level} />
        <span className="strong">{p.today(p.chance[risk.today.level])}</span>
      </p>
      <p className="ink-2">{p.reason[risk.today.reason]}</p>
      <p>
        {risk.contacts.length === 0
          ? p.cycleNone
          : `${p.cycleContacts(risk.contacts.length)} ${risk.highest ? p.cycleHighest(p.risk[risk.highest.risk], formatDate(risk.highest.date, 'dayMonthLong')) : ''}`}
      </p>
      {risk.emergency && (
        <Notice attention icon={<RiskIcons.emergency size={20} aria-hidden="true" />}>
          <p>{p.emergency(formatDate(risk.emergency.until, 'dayMonthLong'))}</p>
        </Notice>
      )}
      {risk.emergencyTaken && (
        <Notice icon={<RiskIcons.taken size={20} aria-hidden="true" />}>
          <p>{p.emergencyTaken}</p>
        </Notice>
      )}
      {risk.test && (
        <Notice attention={risk.test.now} icon={<RiskIcons.test size={20} aria-hidden="true" />}>
          <p>
            {risk.test.now
              ? p.testNow
              : current
                ? p.testFrom(formatDate(risk.test.from, 'dayMonthLong'))
                : p.testAfter(formatDate(risk.test.from, 'dayMonthLong'))}
          </p>
        </Notice>
      )}
      <p className="caption">{p.disclaimer}</p>
      <div>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => openJournal(today)}>
          <RiskIcons.log size={16} aria-hidden="true" />
          {p.log}
        </button>
      </div>
    </section>
  );

  const quickBlock = (
    <section className="card stack stack-3" aria-labelledby="quick-heading" data-tap="">
      <h2 id="quick-heading">{s.today.quick.title}</h2>
      <ChoiceChips
        legend={s.today.quick.flow}
        options={FLOWS.map((f) => ({ value: f, label: s.flow[f] }))}
        value={todayLog?.flow === 'unspecified' ? undefined : todayLog?.flow}
        onChange={setFlow}
        clearable
      />
      <p className="small ink-2">{summary.length ? `${s.today.quick.logged} ${summary.join(', ')}.` : s.today.quick.nothing}</p>
      <button type="button" className="btn btn-primary btn-block" onClick={() => openJournal(today)}>
        <NotebookPen size={18} aria-hidden="true" />
        {s.today.quick.open}
      </button>
    </section>
  );
  const remindersBlock = reminders.length > 0 && (
    <section aria-labelledby="reminders-heading">
      <h2 id="reminders-heading" className="section-title">
        {s.today.reminders.title}
      </h2>
      <ul className="list">
        {reminders.map((o) => (
          <li key={o.id} className="list-row">
            <span className="strong num">{o.time}</span>
            <span className="grow">{reminderText(o).body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
  const flagsBlock = flags.length > 0 && (
    <section aria-labelledby="flags-heading" className="stack stack-3">
      <h2 id="flags-heading">{s.today.flags.title}</h2>
      {flags.slice(0, 2).map((flag) => {
        const text = flagText(flag);
        return (
          <Notice key={flag.id} attention={flag.severity === 'attention'} icon={<CircleAlert size={20} aria-hidden="true" />}>
            <h3>{text.title}</h3>
            <p>{text.body}</p>
          </Notice>
        );
      })}
      <div>
        <button type="button" className="btn btn-quiet" onClick={() => navigate('sfaturi')}>
          {s.today.flags.seeAll}
        </button>
      </div>
    </section>
  );
  const tipBlock = tip && phase && (
    <section aria-labelledby="tip-heading" className="card today-card stack stack-2" data-kind="tip" data-tap="">
      <CardHead icon={Lightbulb} id="tip-heading">
        {s.today.tip.title}
      </CardHead>
      <p className="caption">
        {s.phase[phase]}, {s.tips.category[tip.category].toLowerCase()}
      </p>
      <h3>{tip.tip.title}</h3>
      <p className="ink-2">{tip.tip.body}</p>
      <div>
        <button type="button" className="btn btn-quiet" onClick={() => navigate('sfaturi')}>
          {s.today.tip.more}
        </button>
      </div>
    </section>
  );

  return (
    <Screen title={s.today.title} subtitle={formatDate(today, 'weekdayDayMonth')} settings>
      <div className="stack stack-5">
        {storage !== 'encrypted' && (
          <Notice attention icon={<ShieldAlert size={20} aria-hidden="true" />}>
            <p>{storage === 'plain' ? s.today.storage.plain : s.today.storage.session}</p>
          </Notice>
        )}

        <InstallCard />

        <div className="today-grid" data-stagger="">
          <section className="card card-hero today-cycle" aria-labelledby="cycle-heading">
            <h2 id="cycle-heading" className="sr-only">
              {s.today.legendTitle}
            </h2>
            <CycleDial timeline={timeline} showFertility={showFertility} phaseLabel={phaseLabel} mood={mood} />
            {current ? (
              <ul className="phase-legend" aria-label={s.today.legendTitle}>
                {spans.map((span) => (
                  <li key={span.from} data-phase={span.kind}>
                    <span className="swatch" aria-hidden="true" />
                    <span>
                      <span className="strong">
                        {span.kind === 'overdue' ? s.today.overdue : span.kind === 'rest' ? s.today.restOfCycle : s.phase[span.kind]}
                      </span>
                      <span className="caption"> {s.today.legendDays(span.from, span.to)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state stack stack-3">
                <h3>{s.today.noData.title}</h3>
                <p className="ink-2">{s.today.noData.body}</p>
                <button type="button" className="btn btn-primary" onClick={() => openJournal(today)}>
                  <NotebookPen size={18} aria-hidden="true" />
                  {s.today.noData.action}
                </button>
              </div>
            )}
          </section>

          <div className="stack stack-5" data-stagger="">
            {fertilityFirst ? fertilityBlock : nextBlock}
            {fertilityFirst ? nextBlock : fertilityBlock}
            {pregnancyBlock}
          </div>
        </div>

        {symptomsFirst && flagsBlock}
        {quickBlock}
        {remindersBlock}
        {!symptomsFirst && flagsBlock}
        {tipBlock}
      </div>
    </Screen>
  );
}
