import type { Phase } from '../../domain/types';
import type { PartnerTip } from '../ro/partnerTips';

export type { PartnerTip } from '../ro/partnerTips';

/**
 * Tips for the partner, in English: a translation of `../ro/partnerTips.ts`, with the same ids.
 * Gender-neutral, no assumptions: everyone experiences their cycle differently, and the best tip is still to ask.
 *
 * STATUS: editorial draft, to be reviewed with the rest of the content.
 */
export const partnerTips: Record<Phase, PartnerTip[]> = {
  menstruation: [
    {
      id: 'p-men-1',
      title: 'Ask what would help',
      body: 'Some people want quiet and a blanket, others a walk or company. A simple question helps more than any guess.',
    },
    {
      id: 'p-men-2',
      title: 'Warmth within reach',
      body: 'A hot-water bottle or a warm tea can ease cramps. Get them ready without waiting to be asked.',
    },
    { id: 'p-men-3', title: 'Take over a chore', body: 'Today’s cooking, shopping or dishes can make a difference on a low-energy day.' },
    { id: 'p-men-4', title: 'Flexible plans', body: 'If you have something planned, leave room for a quieter option, without complaints.' },
    {
      id: 'p-men-5',
      title: 'Supplies at hand',
      body: 'If you are going shopping, ask whether pads, tampons or a usual painkiller are needed.',
    },
  ],
  follicular: [
    {
      id: 'p-fol-1',
      title: 'Suggest something new',
      body: 'Energy often rises in this phase: a good time for a new activity, an outing or a plan together.',
    },
    { id: 'p-fol-2', title: 'Move together', body: 'A long walk, a bike ride or a sport for two may be welcome now.' },
    { id: 'p-fol-3', title: 'Back the plans', body: 'If new ideas or projects come up, listen and encourage. Your interest matters.' },
    { id: 'p-fol-4', title: 'Time with friends', body: 'Many people feel more sociable now. An evening with friends could be a good idea.' },
    { id: 'p-fol-5', title: 'Honest compliments', body: 'Say what you appreciate. A kind word lands in any phase, but now it is easy to take in.' },
  ],
  ovulation: [
    {
      id: 'p-ovu-1',
      title: 'Spend quality time',
      body: 'Energy and mood are often high. Plan something you both enjoy.',
    },
    {
      id: 'p-ovu-2',
      title: 'Talk about contraception',
      body: 'Fertile days are only estimates, not a certainty. If you don’t want a pregnancy, use a reliable method of contraception.',
    },
    {
      id: 'p-ovu-3',
      title: 'A brief pain is possible',
      body: 'Some people feel a pain for a few hours on one side of the abdomen at ovulation. A kind word and patience help.',
    },
    {
      id: 'p-ovu-4',
      title: 'Water within reach',
      body: 'After ovulation body temperature rises a little. A bottle of water within reach is a small, useful gesture.',
    },
    { id: 'p-ovu-5', title: 'Listen actively', body: 'Ask questions and leave time for the answer. Long conversations can be enjoyable now.' },
  ],
  luteal: [
    {
      id: 'p-lut-1',
      title: 'A little more patience',
      body: 'Towards the end of this phase, irritability or sadness can appear for no particular reason. Don’t take it personally.',
    },
    { id: 'p-lut-2', title: 'Quiet evenings', body: 'A simple dinner, a film or a short walk may suit better than busy plans.' },
    {
      id: 'p-lut-3',
      title: 'A favourite snack',
      body: 'Cravings are common now. A favourite snack, offered without comment, is a small and appreciated gesture.',
    },
    {
      id: 'p-lut-4',
      title: 'Ask, don’t assume',
      body: 'Not every mood comes from the cycle. Ask how the day is going instead of putting everything down to hormones.',
    },
    {
      id: 'p-lut-5',
      title: 'Help with sleep',
      body: 'Sleep can be more restless before a period. A cool, quiet room helps you both.',
    },
  ],
};
