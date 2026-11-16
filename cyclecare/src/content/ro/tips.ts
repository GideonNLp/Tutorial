import type { FlagKind } from '../../domain/insights';
import type { Phase, SymptomId } from '../../domain/types';

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

export const TIPS_VERSION = '2026-11-schita-1';

export const TIP_CATEGORIES = ['nutrition', 'movement', 'sleep', 'skin'] as const;
export type TipCategory = (typeof TIP_CATEGORIES)[number];

export interface Tip {
  /** Identificator stabil, folosit la traducere și la revizia medicală. */
  id: string;
  title: string;
  body: string;
}

export interface PhaseTips {
  /** Două-trei propoziții despre ce se întâmplă, de obicei, în această fază. */
  summary: string;
  tips: Record<TipCategory, Tip[]>;
}

export const phaseTips: Record<Phase, PhaseTips> = {
  menstruation: {
    summary:
      'Corpul elimină mucoasa uterului, iar nivelul hormonilor este scăzut. Multe persoane au mai puțină energie în primele zile. E în regulă să încetinești.',
    tips: {
      nutrition: [
        {
          id: 'men-nut-1',
          title: 'Alimente bogate în fier',
          body: 'Lintea, fasolea, spanacul, ouăle sau carnea roșie pot ajuta la refacerea fierului pierdut prin sângerare. Vitamina C din legume și fructe îi ajută absorbția.',
        },
        {
          id: 'men-nut-2',
          title: 'Lichide și mese calde',
          body: 'Apa și ceaiurile calde pot face balonarea și crampele mai ușor de dus. Dacă ai poftă de dulce, o gustare cu proteine ține foamea departe mai mult timp.',
        },
      ],
      movement: [
        {
          id: 'men-mov-1',
          title: 'Mișcare blândă',
          body: 'Plimbările, întinderile sau yoga ușoară reduc disconfortul pentru unele persoane. Dacă ai chef de antrenamentul obișnuit, nu există un motiv general să îl eviți.',
        },
        {
          id: 'men-mov-2',
          title: 'Odihna contează',
          body: 'În zilele cu flux abundent sau cu crampe puternice, odihna face la fel de mult ca mișcarea.',
        },
      ],
      sleep: [
        {
          id: 'men-sle-1',
          title: 'Căldură înainte de culcare',
          body: 'O sticlă cu apă caldă pe abdomen sau un duș cald pot relaxa mușchii și pot ușura adormitul.',
        },
        {
          id: 'men-sle-2',
          title: 'Ore regulate',
          body: 'Mergi la culcare și trezește-te la ore apropiate de cele obișnuite. Oboseala din primele zile se resimte mai puțin după un somn regulat.',
        },
      ],
      skin: [
        {
          id: 'men-ski-1',
          title: 'Rutină simplă',
          body: 'Pielea poate fi mai sensibilă și mai uscată. Un produs de curățare blând și o cremă hidratantă sunt de ajuns.',
        },
        {
          id: 'men-ski-2',
          title: 'Amână tratamentele agresive',
          body: 'Epilarea cu ceară sau exfolierea puternică pot fi mai dureroase în aceste zile. Dacă poți, programează-le mai târziu.',
        },
      ],
    },
  },
  follicular: {
    summary: 'După menstruație, estrogenul crește treptat. Multe persoane simt mai multă energie și o dispoziție mai bună.',
    tips: {
      nutrition: [
        {
          id: 'fol-nut-1',
          title: 'Farfurie variată',
          body: 'Legume, cereale integrale, proteine și grăsimi bune. Nu există o dietă specială pentru această fază; contează varietatea.',
        },
        {
          id: 'fol-nut-2',
          title: 'Proteine la fiecare masă',
          body: 'Dacă faci mai multă mișcare, proteinele din ouă, lactate, leguminoase, pește sau carne susțin refacerea mușchilor.',
        },
      ],
      movement: [
        {
          id: 'fol-mov-1',
          title: 'Un moment bun pentru efort',
          body: 'Dacă simți mai multă energie, poți încerca antrenamente mai intense sau ceva nou: alergare, exerciții de forță, dans.',
        },
        {
          id: 'fol-mov-2',
          title: 'Crește treptat',
          body: 'Mărește durata sau intensitatea pas cu pas, ca să eviți accidentările.',
        },
      ],
      sleep: [
        {
          id: 'fol-sle-1',
          title: 'Păstrează ritmul',
          body: 'Chiar dacă ai energie, șapte până la nouă ore de somn rămân reperul pentru majoritatea adulților.',
        },
        {
          id: 'fol-sle-2',
          title: 'Lumină dimineața',
          body: 'Lumina naturală în prima parte a zilei ajută ceasul intern și adormitul de seara.',
        },
      ],
      skin: [
        {
          id: 'fol-ski-1',
          title: 'Hidratare și protecție solară',
          body: 'Pielea este adesea mai echilibrată acum. O cremă hidratantă și protecția solară zilnică sunt baza.',
        },
        {
          id: 'fol-ski-2',
          title: 'Produse noi, pe rând',
          body: 'Dacă vrei să încerci un produs nou, introdu câte unul, ca să vezi cum reacționează pielea.',
        },
      ],
    },
  },
  ovulation: {
    summary:
      'În jurul ovulației, estrogenul atinge un vârf. Unele persoane se simt pline de energie; altele simt o durere scurtă într-o parte a abdomenului sau observă secreții mai abundente și elastice.',
    tips: {
      nutrition: [
        {
          id: 'ovu-nut-1',
          title: 'Apă pe parcursul zilei',
          body: 'Temperatura corpului crește ușor după ovulație. Bea apă regulat, mai ales dacă faci mișcare.',
        },
        {
          id: 'ovu-nut-2',
          title: 'Fibre',
          body: 'Legumele, fructele și cerealele integrale susțin digestia, care se poate schimba ușor în aceste zile.',
        },
      ],
      movement: [
        {
          id: 'ovu-mov-1',
          title: 'Folosește energia',
          body: 'Dacă te simți în formă, este un moment bun pentru antrenamente mai solicitante sau pentru activități în grup.',
        },
        {
          id: 'ovu-mov-2',
          title: 'Încălzire atentă',
          body: 'Fă o încălzire bună înainte de efortul intens și oprește-te dacă apare o durere neobișnuită.',
        },
      ],
      sleep: [
        {
          id: 'ovu-sle-1',
          title: 'Cameră răcoroasă',
          body: 'Dacă îți este mai cald noaptea, aerisește înainte de culcare și alege așternuturi ușoare.',
        },
        {
          id: 'ovu-sle-2',
          title: 'Rutină de seară',
          body: 'Lasă ecranele cu o jumătate de oră înainte de culcare, mai ales dacă energia de peste zi te ține în priză.',
        },
      ],
      skin: [
        {
          id: 'ovu-ski-1',
          title: 'Curățare blândă',
          body: 'Pielea poate produce mai mult sebum. Curăță fața dimineața și seara, fără să freci.',
        },
        {
          id: 'ovu-ski-2',
          title: 'Produse care nu încarcă porii',
          body: 'Dacă observi pori încărcați, alege produse non-comedogenice.',
        },
      ],
    },
  },
  luteal: {
    summary:
      'După ovulație crește progesteronul. Spre finalul fazei, unele persoane observă balonare, sensibilitate la sâni, pofte sau schimbări de dispoziție. Sunt frecvente, dar nu trebuie să fie greu de îndurat.',
    tips: {
      nutrition: [
        {
          id: 'lut-nut-1',
          title: 'Mese regulate',
          body: 'Mesele la ore regulate, cu proteine și fibre, pot tempera poftele și variațiile de energie.',
        },
        {
          id: 'lut-nut-2',
          title: 'Mai puțină sare, cafea și alcool',
          body: 'Pentru unele persoane, reducerea lor în zilele dinaintea menstruației diminuează balonarea, sensibilitatea sânilor și iritabilitatea.',
        },
      ],
      movement: [
        {
          id: 'lut-mov-1',
          title: 'Efort moderat',
          body: 'Mersul pe jos, înotul sau bicicleta pot ajuta dispoziția și balonarea. Dacă energia scade, alege un efort mai ușor.',
        },
        {
          id: 'lut-mov-2',
          title: 'Întinderi și respirație',
          body: 'Câteva minute de întinderi sau de respirație lentă pot reduce tensiunea din zilele dinaintea menstruației.',
        },
      ],
      sleep: [
        {
          id: 'lut-sle-1',
          title: 'Mai mult timp pentru somn',
          body: 'Somnul poate fi mai agitat înainte de menstruație. Culcă-te ceva mai devreme și evită cafeaua după-amiaza.',
        },
        {
          id: 'lut-sle-2',
          title: 'Pune gândurile pe hârtie',
          body: 'Dacă mintea nu se oprește seara, notează ce te preocupă înainte de culcare.',
        },
      ],
      skin: [
        {
          id: 'lut-ski-1',
          title: 'Atenție la erupții',
          body: 'Înainte de menstruație pot apărea coșuri. Produsele cu acid salicilic sau cu peroxid de benzoil pot ajuta; folosește-le conform prospectului.',
        },
        {
          id: 'lut-ski-2',
          title: 'Nu stoarce coșurile',
          body: 'Atinsul și storsul pot lăsa urme. Dacă acneea te deranjează constant, un dermatolog poate recomanda un tratament.',
        },
      ],
    },
  },
};

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
