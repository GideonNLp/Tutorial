import type { FlagKind } from '../../domain/insights';
import type { SymptomId } from '../../domain/types';
import type { FlagText, SymptomTips } from '../ro/tips';

/**
 * Tip content in English: a translation of `../ro/tips.ts` and `../ro/phaseTips.ts`, with the same ids
 * (they are stored when a tip is marked “I tried it”, so a language switch keeps the marks).
 *
 * STATUS: editorial draft. Every text must be reviewed by a doctor before launch.
 *
 * Tone rules:
 *  - “may help”, “some people notice”, never “cures”, “must”, “certainly”;
 *  - no diagnosis and no medicine doses;
 *  - the nudge towards a doctor is concrete (which signs) and not alarming;
 *  - gender-neutral wording.
 */

export const TIPS_VERSION: string = '2026-11-draft-2-en';

export { phaseTips, TIP_CATEGORIES } from './phaseTips';
export type { PhaseTips, Tip, TipCategory } from './phaseTips';
export type { FlagText, SymptomTips } from '../ro/tips';

export const symptomTips: Record<SymptomId, SymptomTips> = {
  cramps: {
    helps: [
      'Warmth on your belly or lower back: a hot-water bottle, a heating pad or a warm shower.',
      'Gentle movement, such as walking or stretching.',
      'Some people notice relief with magnesium or a usual painkiller. Ask a pharmacist or doctor first, especially if you take other medicines.',
    ],
    doctor:
      'If the pain stops you from getting on with your day, doesn’t ease with usual painkillers, has changed from what you are used to, or also appears outside your period.',
  },
  headache: {
    helps: [
      'Water and meals on time: dehydration and hunger are common triggers.',
      'Rest in a quiet, dark room; a cold compress on your forehead or the back of your neck.',
      'Note when the headaches come. If they fall on the same days of your cycle, the pattern is useful to your doctor.',
    ],
    doctor:
      'If the headaches are frequent or very strong, or come with vision problems, numbness or nausea. For a sudden, unusually intense headache, call 112.',
  },
  backache: {
    helps: ['Warmth on your lower back.', 'Gentle stretches and changing position, if you sit a lot.', 'A short walk can relax the muscles.'],
    doctor: 'If the pain lasts after your period, spreads down your leg, or comes with a fever or problems passing urine.',
  },
  breast_tenderness: {
    helps: [
      'A comfortable, well-supporting bra, including during exercise.',
      'For some people, less coffee and less salt in the days before a period helps.',
      'Warm or cold compresses, whichever feels better.',
    ],
    doctor: 'If you feel a lump, notice discharge from the nipple or changes in the skin, or if the tenderness doesn’t go after your period.',
  },
  bloating: {
    helps: [
      'Smaller, more frequent meals, eaten without rushing.',
      'Less salt and fewer fizzy drinks; more water.',
      'A walk after a meal helps digestion.',
    ],
    doctor: 'If bloating is there almost every day for several weeks, or comes with pain, weight loss or changes in your bowel habits.',
  },
  nausea: {
    helps: [
      'Small, frequent meals with simple foods: toast, rice, bananas.',
      'Ginger or peppermint tea, in small sips.',
      'Fresh air and avoiding strong smells.',
    ],
    doctor: 'If the nausea lasts several days, or comes with repeated vomiting or strong pain. If a pregnancy is possible, a test can tell you.',
  },
  constipation: {
    helps: ['More fibre: vegetables, fruit, whole grains, pulses.', 'Enough water through the day.', 'Daily movement, even just a walk.'],
    doctor: 'If it lasts more than two or three weeks, comes with strong pain, or you notice blood in your stool.',
  },
  diarrhea: {
    helps: [
      'Enough fluids, to avoid dehydration.',
      'Light foods: rice, bananas, toast, soup.',
      'For now, avoid coffee, alcohol and very fatty food.',
    ],
    doctor: 'If it lasts more than two or three days, or comes with a fever, blood in your stool or signs of dehydration.',
  },
  cravings: {
    helps: [
      'Regular meals with protein and fibre, so you don’t get very hungry.',
      'If you crave something sweet, pair it with something filling: fruit with yoghurt, dark chocolate with nuts.',
      'Cravings before a period are common. There is no reason to feel guilty about them.',
    ],
    doctor: 'If your relationship with food causes you distress or you feel you lose control over meals. A doctor or a psychologist can help.',
  },
  acne: {
    helps: [
      'Cleanse your face gently, twice a day, and don’t squeeze spots.',
      'Choose non-comedogenic products. Those with salicylic acid or benzoyl peroxide may help, used as the leaflet says.',
      'Change your pillowcase often and remove make-up before bed.',
    ],
    doctor: 'If the acne is painful, leaves marks or doesn’t improve within a few weeks. A dermatologist can suggest a treatment.',
  },
  fatigue: {
    helps: [
      'Sleep at regular times and, if you can, a short break during the day.',
      'Balanced meals with iron-rich foods, especially on period days.',
      'Gentle movement: sometimes it gives more energy than a long rest.',
    ],
    doctor:
      'If the tiredness lasts for weeks, doesn’t go with rest, or comes with dizziness, paleness or heavy periods. Blood tests can show, for example, a lack of iron.',
  },
  insomnia: {
    helps: [
      'Fixed times for going to bed and getting up, weekends included.',
      'No coffee in the afternoon and no screens in the last half hour before sleep.',
      'A cool, dark and quiet room.',
    ],
    doctor: 'If you sleep badly at least three times a week for several weeks, or if the lack of sleep affects your day.',
  },
  dizziness: {
    helps: [
      'Sit or lie down until it passes, and get up slowly.',
      'Drink water and eat something if it has been a while since your last meal.',
      'Note when it happens: the link with your period or with meals is useful to your doctor.',
    ],
    doctor: 'If the dizziness keeps coming back, or comes with palpitations or heavy periods. For fainting or chest pain, call 112.',
  },
  irritability: {
    helps: [
      'Short breaks during the day and a few slow breaths when you feel tension building.',
      'Movement: even twenty minutes of walking can change your mood.',
      'Tell the people close to you that you are going through harder days. It helps not to carry everything in silence.',
    ],
    doctor: 'If irritability before your period repeatedly affects your relationships or your work.',
  },
  anxiety: {
    helps: [
      'Slow breathing: breathe in for four seconds, out for six, for a few minutes.',
      'Less coffee and less alcohol, which can make restlessness worse.',
      'Movement and time outdoors.',
    ],
    doctor:
      'If anxiety is there on most days, comes with panic attacks, or stops you from doing ordinary things. A doctor or a psychologist can help.',
  },
  sadness: {
    helps: [
      'Talk to someone you trust.',
      'Keep a few simple anchors: meals, sleep, a little movement, daylight.',
      'Be patient with yourself. Feelings before a period are real and, most of the time, they pass.',
    ],
    doctor:
      'If the sadness lasts more than two weeks, comes back strongly before every period, or takes away your interest in things you used to enjoy. If you have thoughts of harming yourself, call 112 or go to the nearest emergency department.',
  },
  mood_swings: {
    helps: [
      'Note them in your journal: after two or three cycles you may see whether they come on the same days.',
      'Enough sleep, regular meals and movement, especially in the second half of the cycle.',
      'If you can, plan demanding things for the days you know you feel better.',
    ],
    doctor:
      'If the mood swings are strong, come with almost every cycle and affect your daily life. There is treatment and support for severe premenstrual symptoms.',
  },
};

/**
 * Flag messages. Each says what was logged and invites a conversation with a doctor, without naming any condition.
 */
export const flagTexts: Record<FlagKind, FlagText> = {
  cycle_short: {
    title: () => 'Short cycles',
    body: (v, _n, days) =>
      `${v.count} of your recent cycles lasted less than ${days(v.days!)}. Short cycles that keep happening are worth discussing with a gynaecologist.`,
  },
  cycle_long: {
    title: () => 'Long cycles',
    body: (v, _n, days) =>
      `${v.count} of your recent cycles lasted more than ${days(v.days!)}. Long cycles that keep happening are worth discussing with a gynaecologist.`,
  },
  cycle_irregular: {
    title: () => 'Cycles of varying length',
    body: (v, _n, days) =>
      `Your recent cycles lasted between ${v.shortest} and ${days(v.longest!)}. Large variations can happen at certain times of life, but they are worth mentioning at a check-up. Estimates are less accurate in this situation.`,
  },
  period_long: {
    title: () => 'Long periods',
    body: (v, _n, days) =>
      `${v.count} of your recent periods lasted more than ${days(v.days!)}. Prolonged bleeding is worth discussing with a doctor.`,
  },
  period_heavy: {
    title: () => 'Heavy flow several days in a row',
    body: (v, _n, days) =>
      `In your last two periods you logged heavy flow on at least ${days(v.days!)}. If you change pads or tampons very often, notice large clots or feel very tired, talk to a doctor.`,
  },
  no_period: {
    title: () => 'No period logged for a long time',
    body: (v, _n, days) =>
      `It has been ${days(v.days!)} since your last logged period. If it is not just days left unlogged, having no period for more than three months is worth discussing with a doctor. If a pregnancy is possible, a test can tell you.`,
  },
  period_late: {
    title: () => 'Your period is late',
    body: (v, _n, days) =>
      `Your period is ${days(v.days!)} later than estimated. A late period has many possible causes: stress, a change of routine, illness, intense exercise, pregnancy. If a pregnancy is possible, a test can tell you.`,
  },
  bleeding_between: {
    title: () => 'Bleeding between periods',
    body: (v) =>
      `You logged bleeding between periods in ${v.count} of your recent cycles. When it keeps happening, it is worth discussing with a gynaecologist.`,
  },
  symptom_severe: {
    title: (name) => `${name}, severe`,
    body: (v, name, days) =>
      `You logged “${name.toLowerCase()}” as severe on ${days(v.days!)} of the last ${v.window}. It isn’t something you just have to put up with: a doctor can help you find the cause and your options.`,
  },
  symptom_persistent: {
    title: (name) => `${name}, almost every day`,
    body: (v, name, days) =>
      `You logged “${name.toLowerCase()}” on ${days(v.days!)} of the last ${v.window}. When a symptom lasts this long, it is worth discussing with a doctor.`,
  },
  symptom_new: {
    title: (name) => `${name}, a new symptom in your journal`,
    body: (v, name, days) =>
      `You logged “${name.toLowerCase()}” on ${days(v.days!)} of the last ${v.window}, although it didn’t appear in your journal in the months before. Keep an eye on how it develops; if it persists or worries you, ask a doctor.`,
  },
  low_mood: {
    title: () => 'Low mood on many days',
    body: (v, _n, days) =>
      `You logged a low mood on ${days(v.days!)} of the last ${v.window}. You don’t have to go through this without support: a doctor or a psychologist can help. If you have thoughts of harming yourself, call 112.`,
  },
};
