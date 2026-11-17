import type { Phase } from '../../domain/types';

/**
 * Sfaturi pentru partener: cum poate fi de ajutor în fiecare fază. Apar pe ecranul „Azi” al
 * partenerului, câte două, alese după ziua ciclului. Formulări neutre ca gen, fără presupuneri:
 * fiecare om trăiește ciclul altfel, iar cel mai bun sfat rămâne să întrebi.
 *
 * STATUT: schiță redacțională, de validat odată cu restul conținutului.
 */
export interface PartnerTip {
  id: string;
  title: string;
  body: string;
}

export const partnerTips: Record<Phase, PartnerTip[]> = {
  menstruation: [
    {
      id: 'p-men-1',
      title: 'Întreabă ce i-ar prinde bine',
      body: 'Unii vor liniște și o pătură, alții o plimbare sau companie. O întrebare simplă ajută mai mult decât orice presupunere.',
    },
    {
      id: 'p-men-2',
      title: 'Căldură la îndemână',
      body: 'O sticlă cu apă caldă sau un ceai cald pot ușura crampele. Pregătește-le fără să fie nevoie să fie cerute.',
    },
    { id: 'p-men-3', title: 'Preia o treabă', body: 'Gătitul, cumpărăturile sau vasele de azi pot face diferența într-o zi cu energie puțină.' },
    { id: 'p-men-4', title: 'Planuri flexibile', body: 'Dacă aveți ceva programat, lasă loc pentru o variantă mai liniștită, fără reproșuri.' },
    {
      id: 'p-men-5',
      title: 'Produse la îndemână',
      body: 'Dacă mergi la cumpărături, întreabă dacă e nevoie de absorbante, tampoane sau un analgezic obișnuit.',
    },
  ],
  follicular: [
    {
      id: 'p-fol-1',
      title: 'Propune ceva nou',
      body: 'Energia crește adesea în această fază: e un moment bun pentru o activitate nouă, o ieșire sau un plan împreună.',
    },
    { id: 'p-fol-2', title: 'Mișcare împreună', body: 'O plimbare lungă, o tură cu bicicleta sau un sport în doi pot fi binevenite acum.' },
    { id: 'p-fol-3', title: 'Susține planurile', body: 'Dacă apar idei sau proiecte noi, ascultă și încurajează. Interesul tău contează.' },
    { id: 'p-fol-4', title: 'Timp pentru prieteni', body: 'Multe persoane sunt mai sociabile acum. O seară cu prietenii poate fi o idee bună.' },
    { id: 'p-fol-5', title: 'Complimente sincere', body: 'Spune ce apreciezi. Un cuvânt bun ajunge în orice fază, dar acum e ușor de primit.' },
  ],
  ovulation: [
    {
      id: 'p-ovu-1',
      title: 'Petreceți timp de calitate',
      body: 'Energia și dispoziția sunt adesea ridicate. Planifică ceva ce vă place amândurora.',
    },
    {
      id: 'p-ovu-2',
      title: 'Discutați despre contracepție',
      body: 'Zilele fertile sunt doar estimări, nu o certitudine. Dacă nu vă doriți o sarcină, folosiți o metodă de contracepție de încredere.',
    },
    {
      id: 'p-ovu-3',
      title: 'Atenție la o durere scurtă',
      body: 'Unele persoane simt o durere de câteva ore într-o parte a abdomenului la ovulație. O vorbă bună și răbdarea ajută.',
    },
    {
      id: 'p-ovu-4',
      title: 'Apă la îndemână',
      body: 'După ovulație temperatura corpului crește puțin. O sticlă de apă la îndemână e un gest mic și util.',
    },
    { id: 'p-ovu-5', title: 'Ascultă activ', body: 'Pune întrebări și lasă timp pentru răspuns. Conversațiile lungi pot fi plăcute acum.' },
  ],
  luteal: [
    {
      id: 'p-lut-1',
      title: 'Mai multă răbdare',
      body: 'Spre finalul fazei pot apărea iritabilitate sau tristețe fără un motiv anume. Nu le lua personal.',
    },
    { id: 'p-lut-2', title: 'Seri liniștite', body: 'O cină simplă, un film sau o plimbare scurtă pot fi mai potrivite decât planurile aglomerate.' },
    {
      id: 'p-lut-3',
      title: 'O gustare preferată',
      body: 'Poftele sunt frecvente acum. O gustare preferată, oferită fără comentarii, e un gest mic și apreciat.',
    },
    {
      id: 'p-lut-4',
      title: 'Întreabă, nu presupune',
      body: 'Nu orice stare vine din ciclu. Întreabă cum merge ziua în loc să pui totul pe seama hormonilor.',
    },
    {
      id: 'p-lut-5',
      title: 'Ajută la somn',
      body: 'Somnul poate fi mai agitat înainte de menstruație. O cameră răcoroasă și liniștită ajută amândoi.',
    },
  ],
};
