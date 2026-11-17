/**
 * Consent texts and privacy notice, in English: a translation of `../ro/legal.ts`.
 *
 * DRAFT, like the Romanian original. It must be reviewed by a legal specialist before any launch, and
 * kept in step with the Romanian text: any change there needs the same change here.
 * The questions for the lawyer are written once, in Romanian (docs/05-consimtamant-si-confidentialitate.md).
 */

import { APP_NAME, LEGAL_REVIEWED, OPERATOR } from '../../app/config';
import type { PolicySection } from '../ro/legal';

export { legalReviewNotes } from '../ro/legal';
export type { PolicySection } from '../ro/legal';

/** The same text version as Romanian, marked as the English translation (it is stored with the consent). */
export const LEGAL_VERSION: string = '2026-11-draft-5-en';
export const LEGAL_UPDATED: string = '2026-11-17';

export const consentText = {
  title: 'Your data stays with you',
  intro: `To work, ${APP_NAME} keeps data about your health: your period days, symptoms, mood, temperature, the notes you write and, only if you choose to log them, sex and the contraception used. Before you log anything, here is what happens to it.`,
  points: [
    {
      title: 'Where it is kept',
      body: 'Only on this device, encrypted. There is no account, and we cannot see it.',
    },
    {
      title: 'What it is used for',
      body: 'To calculate estimates and statistics and to choose the tips we show you. Nothing else.',
    },
    {
      title: 'Who else sees it',
      body: 'No one. We don’t share it, sell it or use it for advertising. If you want, you can invite one person in Partner mode; we then ask for your separate consent and you choose what they see.',
    },
    {
      title: 'What you can do at any time',
      body: 'You can export or delete everything in Settings. If you withdraw your consent, the data is deleted.',
    },
  ],
  healthCheckbox: `I agree that ${APP_NAME} may process, on this device, the data about my health and sex life that I enter, for the purposes described above.`,
  ageCheckbox: 'I am at least 16 years old, or I have the consent of a parent or guardian.',
  policyLink: 'Read the privacy notice',
  accept: 'I agree and continue',
  decline: 'I don’t agree',
  declineInfo: 'Without this consent, the app can’t keep anything. We haven’t saved any information; you can close the page.',
  missingHealth: 'Tick the consent to data processing to continue.',
  missingAge: 'Confirm your age or a parent’s or guardian’s consent to continue.',
  /** Template for a separate consent, asked for a specific purpose, should a sharing feature ever exist. */
  separateConsentTemplate: {
    title: 'Separate consent for [feature]',
    body: `To [purpose of the feature], ${APP_NAME} would send the following data to [recipient]: [exact list]. The data would be used only for [purpose] and kept for [duration]. You can say no: the rest of the app works the same. You can withdraw your consent at any time in Settings.`,
    accept: 'I agree to this sharing',
    decline: 'Not now',
  },
};

/** A note for the lawyer, shown in the text only until it has been reviewed. */
const reviewNote = (note: string): string => (LEGAL_REVIEWED ? '' : ` [${note}]`);

export const privacyPolicy: { title: string; draftNotice: string | undefined; sections: PolicySection[] } = {
  title: 'Privacy notice',
  draftNotice: LEGAL_REVIEWED
    ? undefined
    : 'Working draft, version of 17 November 2026, translated from Romanian. The text has not yet been reviewed by a legal specialist.',
  sections: [
    {
      heading: '1. In short',
      bullets: [
        `${APP_NAME} keeps your data only on your device, encrypted.`,
        'We don’t ask for your email, phone number or an account. Your name (or a nickname) and profile photo are optional and also stay only on the device.',
        'We have no access to your data and we don’t pass it to anyone. If you choose Partner mode, a summary you pick reaches, end-to-end encrypted, only the phone of the person you invited.',
        'We don’t use advertising, analytics tools or other third-party services.',
        'You can export or delete everything at any time.',
      ],
    },
    {
      heading: '2. Who we are',
      paragraphs: [
        `The ${APP_NAME} app is provided by ${OPERATOR.name ?? '[name of the controller]'}, with its registered office at ${OPERATOR.address ?? '[address]'}, registered under no. ${OPERATOR.registration ?? '[registration number]'} (“we”).`,
        `For questions about your data you can write to us at ${OPERATOR.email ?? '[email address]'}.${
          OPERATOR.dpo
            ? ` The data protection officer can be contacted at ${OPERATOR.dpo}.`
            : reviewNote('If a data protection officer is appointed: their contact details.')
        }`,
      ],
    },
    {
      heading: '3. What data the app processes',
      paragraphs: ['The app works only with the information you enter or import yourself:'],
      bullets: [
        'cycle data: period days and flow intensity, your usual cycle and period length;',
        'the daily journal: symptoms and their intensity, mood, energy level, basal body temperature, cervical mucus, free-text notes;',
        'your sex life, only if you choose to log it: days with sex, the kind of contact and the contraception used;',
        'your profile, if you fill it in: a name or nickname and a profile photo, scaled down on the device to 256 × 256 pixels (the original file is not kept);',
        'the goals chosen at the start (for example, general tracking or planning a pregnancy);',
        'settings: reminders, the names of medicines you ask to be reminded about, theme, text size, language;',
        'proof of your consent: the date and the version of the text you accepted.',
      ],
    },
    {
      heading: '4. Health data',
      paragraphs: [
        'Most of this information is health data, which the General Data Protection Regulation (GDPR) gives special protection. We process it only on the basis of your explicit consent, given the first time you open the app (Art. 6(1)(a) and Art. 9(2)(a) GDPR).',
        'Sex and contraception that you choose to log are data about your sex life and are protected just as strictly. Logging them is optional, they don’t appear in the PDF report, and the hearts in the calendar can be hidden in Settings → Privacy and security.',
        'You can withdraw your consent at any time in Settings → Privacy and security. Withdrawing deletes the data from the device and doesn’t affect the lawfulness of processing before that.',
      ],
    },
    {
      heading: '5. Where it is kept and how it is protected',
      bullets: [
        'The data is kept only on your device, in the app’s storage.',
        'It is encrypted at rest with AES-256-GCM. The encryption key is kept by the device’s system and cannot be exported.',
        'If you set a PIN, the encryption key is additionally protected with a key derived from the PIN (PBKDF2-HMAC-SHA-256, 600,000 iterations). The PIN is not stored anywhere and cannot be recovered.',
        'Biometric unlock uses the device’s sensor. Your fingerprint or face image never reaches the app.',
        'The app doesn’t send your data over the internet, with one exception that you choose: Partner mode (section 7). The app is delivered over HTTPS and is set up so that it can only communicate with its own server.',
        'If a feature that involves sending data (for example, a cloud backup) appears in the future, it will be optional, fully encrypted on the device before it is sent, sent only over encrypted connections (TLS), and turned on only with your separate consent.',
      ],
    },
    {
      heading: '6. What we use the data for',
      bullets: [
        'to calculate your cycle day, the phases, and estimates of your next period and fertile days;',
        'to show you statistics, suitable tips and observations about what you have logged;',
        'to show the reminders you asked for;',
        'to show your name and photo in your profile, if you added them;',
        'to estimate, from the sex you logged and your cycle, the risk or chance of pregnancy;',
        'to create, when you ask, the PDF report or the data export.',
      ],
      paragraphs: [
        'All these calculations happen on your device. We don’t make automated decisions with legal effects on you and we don’t create profiles for marketing purposes.',
      ],
    },
    {
      heading: '7. Who we share the data with',
      paragraphs: [
        'No one. We don’t sell, rent or pass your data to third parties, advertising partners, employers, insurers or authorities, because we don’t hold it.',
        'The PDF report and the data export are created on your device and reach only whoever you choose to show or send them to.',
        'Partner mode, only if you turn it on, with your separate consent: your phone works out a summary of what you chose to let the invited person see (the phase, the calendar with estimates, symptoms and mood from the last 14 days, your notes). Sex, temperature, cervical mucus and your profile photo are never sent. The summary is encrypted on your phone with a key that only the two phones have, and passes through the app’s server, which keeps only the encrypted text and cannot read it. The server is hosted by the app’s hosting provider [name of the provider and the country where the data is kept].',
        'Pairing uses a 6-character code, valid for 10 minutes, and six verification digits that you compare on the two screens. You can change what your partner sees or stop sharing at any time; the encrypted copy is then deleted from the server. The invited person keeps the last summary received, encrypted on their phone, until they disconnect.',
        'Any other sharing would only be possible with your explicit, separate consent, asked for each case, stating exactly the data, the recipient and the purpose.',
      ],
    },
    {
      heading: '8. Notifications',
      paragraphs: [
        'Reminders are created on the device. By default, the notification text is discreet and doesn’t mention your cycle or medicines. You can change or turn off reminders at any time.',
      ],
    },
    {
      heading: '9. Data imported from wearables',
      paragraphs: [
        'If you choose to import basal body temperature from a file exported by a bracelet, ring or thermometer, the file is read on your device and is not sent anywhere.',
      ],
    },
    {
      heading: '10. How long we keep the data',
      paragraphs: [
        'The data stays on your device until you delete it in the app, withdraw your consent, clear the site data in your browser or uninstall the app. We keep no copy, except for the encrypted Partner mode summary, which is deleted when you stop sharing or delete all data.',
        'Please note: if you lose the device or delete the app without an export, the data cannot be recovered.',
      ],
    },
    {
      heading: '11. Your rights',
      paragraphs: ['Under the GDPR you have the following rights, which you can exercise directly in the app:'],
      bullets: [
        'access: all the data is visible in the app and can be exported;',
        'rectification: you can change any entry in the journal and in settings;',
        'erasure: Settings → Privacy and security → Delete all data;',
        'portability: Settings → My data → Export data, in a structured format (JSON);',
        'withdrawing consent: Settings → Privacy and security;',
        'restriction and objection: because the data is only with you, stopping using the app stops any processing.',
      ],
    },
    {
      heading: '12. Complaints',
      paragraphs: [
        'If you believe your rights have been breached, you can contact the Romanian National Supervisory Authority for Personal Data Processing (ANSPDCP), www.dataprotection.ro, or the data protection authority in the EU country where you live. It would help us if you wrote to us first, so we can try to fix the problem.',
      ],
    },
    {
      heading: '13. Minimum age',
      paragraphs: [
        `You can give consent yourself if you are at least 16. Below that age, the consent of a parent or guardian is needed.${reviewNote('To be confirmed by the lawyer: the verification mechanism and the applicable age.')}`,
      ],
    },
    {
      heading: `14. What ${APP_NAME} is not`,
      paragraphs: [
        `${APP_NAME} is a tool for tracking and information. It is not a medical device, it doesn’t diagnose and it doesn’t replace a medical consultation. Fertile-day estimates are not a form of contraception.`,
      ],
    },
    {
      heading: '15. Changes to this notice',
      paragraphs: [
        'If we change the way the data is processed, we will tell you in the app before the change applies. For any change that involves new purposes or new recipients, we will ask for your consent again.',
      ],
    },
  ],
};
