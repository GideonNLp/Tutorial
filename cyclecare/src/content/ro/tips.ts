import type { FlagKind } from '../../domain/insights';
import type { SymptomId } from '../../domain/types';

/**
 * Conținutul sfaturilor, în română. Acesta este și șablonul de conținut pentru alte limbi:
 * aceeași structură, alt text. Documentul docs/04-sablon-continut-sfaturi.md este generat din acest fișier
 * (`npm run docs:content`), deci textul din aplicație și cel din documentație nu pot să difere.
 *
 * STATUT: schiță redacțională. Fiecare text trebuie validat de un medic înainte de lansare.
 *
 * Reguli de ton:
 *  - „poate ajuta”, „unele persoane observă”, niciodată „vindecă”, „trebuie”, „sigur”;
 *  - niciun diagnostic și nicio doză de medicament;
 *  - îndemnul către medic este concret (ce semne) și fără alarmism;
 *  - formulări neutre ca gen.
 */

export const TIPS_VERSION: string = '2026-11-schita-2';

export { phaseTips, TIP_CATEGORIES } from './phaseTips';
export type { PhaseTips, Tip, TipCategory } from './phaseTips';

export interface SymptomTips {
  /** Sugestii de îngrijire, fără doze și fără promisiuni. */
  helps: string[];
  /** Continuă propoziția „Când merită să ceri sfatul unui medic”. */
  doctor: string;
}

export const symptomTips: Record<SymptomId, SymptomTips> = {
  cramps: {
    helps: [
      'Căldură pe abdomen sau pe zona lombară: o sticlă cu apă caldă, o pernă electrică sau un duș cald.',
      'Mișcare ușoară, cum ar fi mersul pe jos sau întinderile.',
      'Unele persoane observă o ameliorare cu magneziu sau cu un calmant obișnuit. Cere sfatul farmacistului sau al medicului înainte, mai ales dacă iei și alte medicamente.',
    ],
    doctor:
      'Dacă durerea te împiedică să îți vezi de zi, nu cedează la calmantele obișnuite, s-a schimbat față de cum o știai sau apare și în afara menstruației.',
  },
  headache: {
    helps: [
      'Apă și o masă la timp: deshidratarea și foamea sunt declanșatori frecvenți.',
      'Odihnă într-o cameră liniștită și întunecată; o compresă rece pe frunte sau pe ceafă.',
      'Notează când apar durerile. Dacă vin în aceleași zile ale ciclului, tiparul îi este util medicului.',
    ],
    doctor:
      'Dacă durerile sunt frecvente sau foarte puternice, ori vin cu tulburări de vedere, amorțeli sau greață. Pentru o durere bruscă și neobișnuit de intensă, sună la 112.',
  },
  backache: {
    helps: [
      'Căldură pe zona lombară.',
      'Întinderi blânde și schimbarea poziției, dacă stai mult pe scaun.',
      'O plimbare scurtă poate relaxa musculatura.',
    ],
    doctor: 'Dacă durerea persistă după menstruație, coboară pe picior, vine cu febră sau cu probleme la urinare.',
  },
  breast_tenderness: {
    helps: [
      'Un sutien comod, cu susținere bună, inclusiv la efort.',
      'Pentru unele persoane ajută mai puțină cafea și mai puțină sare în zilele dinaintea menstruației.',
      'Comprese calde sau reci, după cum te simți mai bine.',
    ],
    doctor: 'Dacă simți un nodul, observi secreții din mamelon sau schimbări ale pielii, ori dacă sensibilitatea nu trece după menstruație.',
  },
  bloating: {
    helps: [
      'Mese mai mici și mai dese, mâncate fără grabă.',
      'Mai puțină sare și mai puține băuturi carbogazoase; mai multă apă.',
      'O plimbare după masă ajută digestia.',
    ],
    doctor:
      'Dacă balonarea este prezentă aproape zilnic timp de câteva săptămâni ori vine cu dureri, scădere în greutate sau schimbări ale tranzitului.',
  },
  nausea: {
    helps: [
      'Mese mici și dese, cu alimente simple: pâine prăjită, orez, banane.',
      'Ghimbir sau ceai de mentă, în înghițituri mici.',
      'Aer proaspăt și evitarea mirosurilor puternice.',
    ],
    doctor:
      'Dacă greața durează mai multe zile ori vine cu vărsături repetate sau dureri puternice. Dacă este posibilă o sarcină, un test te poate lămuri.',
  },
  constipation: {
    helps: [
      'Mai multe fibre: legume, fructe, cereale integrale, leguminoase.',
      'Apă suficientă pe parcursul zilei.',
      'Mișcare zilnică, fie și o plimbare.',
    ],
    doctor: 'Dacă durează mai mult de două-trei săptămâni, vine cu dureri puternice sau observi sânge în scaun.',
  },
  diarrhea: {
    helps: [
      'Lichide în cantitate suficientă, ca să eviți deshidratarea.',
      'Alimente ușoare: orez, banane, pâine prăjită, supă.',
      'Evită pentru moment cafeaua, alcoolul și mâncarea foarte grasă.',
    ],
    doctor: 'Dacă durează mai mult de două-trei zile ori vine cu febră, sânge în scaun sau semne de deshidratare.',
  },
  cravings: {
    helps: [
      'Mese regulate, cu proteine și fibre, ca să nu ajungi la foame mare.',
      'Dacă ai poftă de dulce, combină-l cu ceva sățios: fructe cu iaurt, ciocolată neagră cu nuci.',
      'Poftele dinaintea menstruației sunt frecvente. Nu ai de ce să te învinovățești pentru ele.',
    ],
    doctor: 'Dacă relația cu mâncarea îți provoacă suferință sau simți că pierzi controlul asupra meselor. Un medic sau un psiholog te poate ajuta.',
  },
  acne: {
    helps: [
      'Curăță fața blând, de două ori pe zi, și nu stoarce coșurile.',
      'Alege produse non-comedogenice. Cele cu acid salicilic sau cu peroxid de benzoil pot ajuta, folosite conform prospectului.',
      'Schimbă des fața de pernă și demachiază-te înainte de culcare.',
    ],
    doctor: 'Dacă acneea este dureroasă, lasă urme sau nu se ameliorează în câteva săptămâni. Un dermatolog poate recomanda un tratament.',
  },
  fatigue: {
    helps: [
      'Somn la ore regulate și, dacă se poate, o pauză scurtă peste zi.',
      'Mese echilibrate, cu alimente bogate în fier, mai ales în zilele de menstruație.',
      'Mișcare ușoară: uneori dă mai multă energie decât odihna prelungită.',
    ],
    doctor:
      'Dacă oboseala ține săptămâni la rând, nu trece cu odihnă sau vine cu amețeli, paloare ori menstruații abundente. Analizele de sânge pot arăta, de exemplu, o lipsă de fier.',
  },
  insomnia: {
    helps: [
      'Ore fixe de culcare și de trezire, inclusiv în weekend.',
      'Fără cafea după-amiaza și fără ecrane în ultima jumătate de oră dinainte de somn.',
      'O cameră răcoroasă, întunecată și liniștită.',
    ],
    doctor: 'Dacă dormi prost de cel puțin trei ori pe săptămână, mai multe săptămâni la rând, sau dacă lipsa somnului îți afectează ziua.',
  },
  dizziness: {
    helps: [
      'Așază-te sau întinde-te până trece și ridică-te încet.',
      'Bea apă și mănâncă ceva, dacă a trecut mult de la ultima masă.',
      'Notează când apare: legătura cu menstruația sau cu mesele îi este utilă medicului.',
    ],
    doctor: 'Dacă amețelile se repetă ori vin cu palpitații sau cu menstruații abundente. Pentru leșin sau dureri în piept, sună la 112.',
  },
  irritability: {
    helps: [
      'Pauze scurte peste zi și câteva respirații lente când simți că se adună tensiunea.',
      'Mișcare: chiar și douăzeci de minute de mers pot schimba starea.',
      'Spune-le celor apropiați că treci prin zile mai grele. Ajută să nu duci totul în tăcere.',
    ],
    doctor: 'Dacă iritabilitatea dinaintea menstruației îți afectează în mod repetat relațiile sau munca.',
  },
  anxiety: {
    helps: [
      'Respirație lentă: inspiră patru secunde, expiră șase, timp de câteva minute.',
      'Mai puțină cafea și mai puțin alcool, care pot accentua neliniștea.',
      'Mișcare și timp petrecut afară.',
    ],
    doctor:
      'Dacă anxietatea este prezentă în majoritatea zilelor, vine cu atacuri de panică sau te împiedică să faci lucruri obișnuite. Un medic sau un psiholog te poate ajuta.',
  },
  sadness: {
    helps: [
      'Vorbește cu cineva în care ai încredere.',
      'Păstrează câteva repere simple: mese, somn, puțină mișcare, lumină naturală.',
      'Ai răbdare cu tine. Stările dinaintea menstruației sunt reale și, de cele mai multe ori, trec.',
    ],
    doctor:
      'Dacă tristețea durează mai mult de două săptămâni, revine puternic înaintea fiecărei menstruații sau îți ia cheful de lucrurile care îți plăceau. Dacă ai gânduri de a-ți face rău, sună la 112 sau mergi la cea mai apropiată unitate de primiri urgențe.',
  },
  mood_swings: {
    helps: [
      'Notează-le în jurnal: după două-trei cicluri poți vedea dacă apar în aceleași zile.',
      'Somn suficient, mese regulate și mișcare, mai ales în a doua parte a ciclului.',
      'Dacă poți, planifică lucrurile solicitante în zilele în care știi că te simți mai bine.',
    ],
    doctor:
      'Dacă schimbările de dispoziție sunt puternice, apar aproape la fiecare ciclu și îți afectează viața de zi cu zi. Există tratament și sprijin pentru simptomele premenstruale severe.',
  },
};

export interface FlagText {
  /** `name` este denumirea simptomului, pentru semnalările legate de un simptom. */
  title: (name: string) => string;
  body: (values: Record<string, number>, name: string, days: (n: number) => string) => string;
}

/**
 * Mesajele de semnalizare. Fiecare spune ce s-a înregistrat și invită la o discuție cu un medic,
 * fără să numească vreo afecțiune.
 */
export const flagTexts: Record<FlagKind, FlagText> = {
  cycle_short: {
    title: () => 'Cicluri scurte',
    body: (v, _n, days) =>
      `${v.count} dintre ultimele cicluri au durat mai puțin de ${days(v.days!)}. Ciclurile scurte care se repetă merită discutate cu un medic ginecolog.`,
  },
  cycle_long: {
    title: () => 'Cicluri lungi',
    body: (v, _n, days) =>
      `${v.count} dintre ultimele cicluri au durat mai mult de ${days(v.days!)}. Ciclurile lungi care se repetă merită discutate cu un medic ginecolog.`,
  },
  cycle_irregular: {
    title: () => 'Cicluri cu durată variabilă',
    body: (v, _n, days) =>
      `Ultimele cicluri au avut între ${v.shortest} și ${days(v.longest!)}. Variațiile mari pot apărea în anumite perioade ale vieții, dar merită menționate la un control. Estimările sunt mai puțin precise în această situație.`,
  },
  period_long: {
    title: () => 'Menstruații lungi',
    body: (v, _n, days) =>
      `${v.count} dintre ultimele menstruații au durat mai mult de ${days(v.days!)}. Sângerările prelungite merită discutate cu un medic.`,
  },
  period_heavy: {
    title: () => 'Flux abundent mai multe zile la rând',
    body: (v, _n, days) =>
      `La ultimele două menstruații ai notat flux abundent în cel puțin ${days(v.days!)}. Dacă schimbi foarte des absorbantul, observi cheaguri mari sau simți o oboseală accentuată, vorbește cu un medic.`,
  },
  no_period: {
    title: () => 'Nicio menstruație notată de mult timp',
    body: (v, _n, days) =>
      `Au trecut ${days(v.days!)} de la ultima menstruație notată. Dacă nu este vorba doar despre zile rămase nenotate, lipsa menstruației timp de peste trei luni merită discutată cu un medic. Dacă este posibilă o sarcină, un test te poate lămuri.`,
  },
  period_late: {
    title: () => 'Menstruația întârzie',
    body: (v, _n, days) =>
      `Menstruația întârzie cu ${days(v.days!)} față de estimare. Întârzierile au multe cauze posibile: stres, schimbări de program, boală, efort intens, sarcină. Dacă este posibilă o sarcină, un test te poate lămuri.`,
  },
  bleeding_between: {
    title: () => 'Sângerări între menstruații',
    body: (v) =>
      `Ai notat sângerări între menstruații în ${v.count} dintre ultimele cicluri. Când se repetă, merită discutate cu un medic ginecolog.`,
  },
  symptom_severe: {
    title: (name) => `${name}, cu intensitate severă`,
    body: (v, name, days) =>
      `Ai notat „${name.toLowerCase()}” cu intensitate severă în ${days(v.days!)} din ultimele ${v.window}. Nu este ceva ce trebuie doar îndurat: un medic te poate ajuta să afli cauza și ce opțiuni ai.`,
  },
  symptom_persistent: {
    title: (name) => `${name}, aproape zilnic`,
    body: (v, name, days) =>
      `Ai notat „${name.toLowerCase()}” în ${days(v.days!)} din ultimele ${v.window}. Când un simptom ține atât de mult, merită discutat cu un medic.`,
  },
  symptom_new: {
    title: (name) => `${name}, un simptom nou în jurnal`,
    body: (v, name, days) =>
      `Ai notat „${name.toLowerCase()}” în ${days(v.days!)} din ultimele ${v.window}, deși nu apărea în jurnal în lunile dinainte. Urmărește cum evoluează; dacă persistă sau te îngrijorează, cere sfatul unui medic.`,
  },
  low_mood: {
    title: () => 'Dispoziție scăzută în multe zile',
    body: (v, _n, days) =>
      `Ai notat o dispoziție scăzută în ${days(v.days!)} din ultimele ${v.window}. Nu este nevoie să treci prin asta fără sprijin: un medic sau un psiholog te poate ajuta. Dacă ai gânduri de a-ți face rău, sună la 112.`,
  },
};
