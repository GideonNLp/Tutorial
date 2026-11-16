// Renders the two content documents from the same modules the app uses:
//   docs/04-sablon-continut-sfaturi.md            ← src/content/ro/tips.ts (+ thresholds, UI labels)
//   docs/05-consimtamant-si-confidentialitate.md  ← src/content/ro/legal.ts
// Run with `npm run docs:content`. A unit test fails when the committed files are out of date.

const PHASE_ORDER = ['menstruation', 'follicular', 'ovulation', 'luteal'];
const CATEGORY_ORDER = ['nutrition', 'movement', 'sleep', 'skin'];
const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ');

/** Example values used to show each message as the person would read it. */
const FLAG_EXAMPLES = {
  cycle_short: { count: 2, days: 24 },
  cycle_long: { count: 2, days: 38 },
  cycle_irregular: { shortest: 24, longest: 36, range: 12 },
  period_long: { count: 2, days: 8 },
  period_heavy: { days: 3 },
  no_period: { days: 95 },
  period_late: { days: 6 },
  bleeding_between: { count: 2 },
  symptom_severe: { days: 2, window: 30 },
  symptom_persistent: { days: 8, window: 14 },
  symptom_new: { days: 3, window: 14 },
  low_mood: { days: 7, window: 14 },
};

const flagConditions = (T) => ({
  cycle_short: `Cel puțin ${T.repeatCount} dintre ultimele 6 cicluri valide au durat mai puțin de ${T.shortCycleDays} de zile.`,
  cycle_long: `Cel puțin ${T.repeatCount} dintre ultimele 6 cicluri valide au durat mai mult de ${T.longCycleDays} de zile.`,
  cycle_irregular: `Există cel puțin 3 cicluri valide, iar diferența dintre cel mai lung și cel mai scurt dintre ultimele 6 este mai mare de ${T.irregularRangeDays} zile.`,
  period_long: `Cel puțin ${T.repeatCount} dintre ultimele 6 menstruații au durat mai mult de ${T.longPeriodDays} zile.`,
  period_heavy: `La fiecare dintre ultimele două menstruații încheiate, fluxul „abundent” a fost notat în cel puțin ${T.heavyDaysPerPeriod} zile.`,
  no_period: `Ciclul curent a depășit ${T.noPeriodDays} de zile.`,
  period_late: `Ziua de azi a trecut de capătul intervalului estimat pentru următoarea menstruație, iar ciclul are cel mult ${T.noPeriodDays} de zile.`,
  bleeding_between: `În cel puțin ${T.repeatCount} dintre ultimele 3 cicluri există spotting sau sângerare la mai mult de 2 zile distanță de o menstruație.`,
  symptom_severe: `Un simptom a fost notat cu intensitate „sever” în cel puțin ${T.severeDays} zile din ultimele ${T.severeWindow}.`,
  symptom_persistent: `Un simptom a fost notat în cel puțin ${T.persistentDays} din ultimele ${T.persistentWindow} zile (și nu îndeplinește deja regula de intensitate severă).`,
  symptom_new: `Jurnalul are cel puțin ${T.newSymptomMinHistory} de zile, iar simptomul a fost notat în cel puțin ${T.newSymptomDays} din ultimele ${T.newSymptomWindow} zile și deloc în cele ${T.newSymptomQuietDays} de zile dinainte.`,
  low_mood: `Dispoziția a fost notată „scăzută” sau „foarte scăzută” în cel puțin ${T.lowMoodDays} din ultimele ${T.lowMoodWindow} zile.`,
});

export function renderTipsDoc({ tips, ro, thresholds: T, severity, symptomGroups }) {
  const lines = [];
  const out = (...parts) => lines.push(...parts);
  const conditions = flagConditions(T);

  out(
    '# Șablon de conținut: sfaturi pe faze și pe simptome',
    '',
    '> **Statut: schiță redacțională, nevalidată medical.** Fiecare text trebuie revizuit de un medic înainte de lansare.',
    `> Versiunea conținutului: \`${tips.TIPS_VERSION}\`.`,
    '>',
    '> Document generat din `src/content/ro/tips.ts` cu `npm run docs:content`. Nu îl edita direct: schimbă fișierul sursă și regenerează. Aplicația afișează exact aceste texte.',
    '',
    '## 1. Cum se folosește șablonul',
    '',
    'Conținutul are trei părți, fiecare cu o structură fixă:',
    '',
    '| Parte | Când apare în aplicație | Structură |',
    '|---|---|---|',
    '| Sfaturi pe faze | Ecranul „Sfaturi” (faza curentă este preselectată) și „Un sfat pentru azi” pe ecranul principal | 4 faze × 4 teme (alimentație, mișcare, somn, piele) × 2 sfaturi; fiecare sfat are identificator, titlu și text |',
    '| Sfaturi pe simptome | Ecranul „Sfaturi”, pentru simptomele notate recent | pentru fiecare simptom: 2–3 sugestii („Ce poate ajuta”) și un paragraf „Când merită să ceri sfatul unui medic” |',
    '| Semnalizări | Ecranele „Azi” și „Sfaturi”, când o regulă este îndeplinită | titlu și mesaj cu valori completate automat; fiecare are o regulă de declanșare |',
    '',
    'Pentru o limbă nouă se copiază fișierul în `src/content/<limbă>/tips.ts` și se traduc textele, păstrând identificatorii.',
    '',
    '### Reguli de ton',
    '',
    '- Persoana a II-a singular, ton cald și direct, fără diminutive.',
    '- Formulări neutre ca gen: „dacă simți oboseală”, nu „dacă ești obosită”.',
    '- Niciun diagnostic și nicio afecțiune numită ca explicație pentru ce a notat persoana.',
    '- Fără afirmații categorice: „poate ajuta”, „unele persoane observă”, „merită discutat cu un medic”. Niciodată „vindecă”, „trebuie”, „sigur”.',
    '- Fără doze de medicamente. Pentru orice medicament: „cere sfatul farmacistului sau al medicului”.',
    '- Îndemnul către medic este concret (ce semne contează) și fără alarmism. Pentru urgențe se indică 112.',
    '- Orice estimare este numită estimare.',
    '',
    '### Câmpurile unui sfat',
    '',
    '| Câmp | Obligatoriu | Descriere |',
    '|---|---|---|',
    '| `id` | da | Identificator stabil (de ex. `men-nut-1`), folosit la traducere și la urmărirea reviziei medicale |',
    '| `title` | da | Cel mult ~40 de caractere; spune ce face sfatul, nu ce promite |',
    '| `body` | da | 1–2 propoziții, cel mult ~220 de caractere |',
    '| revizuit de / data | la lansare | De adăugat în fluxul editorial: cine a validat medical textul și când |',
    '| sursă | recomandat | Ghidul sau sursa pe care se sprijină afirmația |',
    '',
    '## 2. Sfaturi pe faze',
    '',
  );

  for (const phase of PHASE_ORDER) {
    const content = tips.phaseTips[phase];
    out(`### ${ro.phase[phase]}`, '', `**Pe scurt:** ${content.summary}`, '');
    out('| ID | Temă | Titlu | Text |', '|---|---|---|---|');
    for (const category of CATEGORY_ORDER) {
      for (const tip of content.tips[category]) out(`| \`${tip.id}\` | ${ro.tips.category[category]} | ${cell(tip.title)} | ${cell(tip.body)} |`);
    }
    out('');
  }

  out(
    '## 3. Sfaturi pe simptome',
    '',
    `Un simptom primește o fișă de sfaturi dacă a fost notat în ultimele ${T.recentDays} zile sau în cel puțin ${T.recentRepeat} din ultimele ${T.recentWindow} zile. Fișele sunt ordonate după numărul de zile în care simptomul a fost notat.`,
    '',
  );
  for (const [group, ids] of Object.entries(symptomGroups)) {
    out(`### ${ro.symptomGroup[group]}`, '');
    for (const id of ids) {
      const advice = tips.symptomTips[id];
      out(`#### ${ro.symptom[id]} (\`${id}\`)`, '', '**Ce poate ajuta**', '');
      for (const line of advice.helps) out(`- ${line}`);
      out('', `**Când merită să ceri sfatul unui medic:** ${advice.doctor}`, '');
    }
  }

  out(
    '## 4. Semnalizări: simptome neobișnuite sau persistente',
    '',
    'O semnalizare spune ce s-a înregistrat și invită la o discuție cu un medic. Nu numește nicio afecțiune.',
    `Persoana o poate ascunde („Am înțeles”); dacă regula este încă îndeplinită, reapare după ${T.dismissDays} de zile.`,
    'Pragurile urmează descrierile FIGO pentru frecvența, regularitatea și durata sângerării menstruale și sunt definite într-un singur loc (`THRESHOLDS` în `src/domain/insights.ts`). **Trebuie validate medical.**',
    '',
    '| Semnalizare | Tip | Regulă de declanșare | Titlu | Mesaj (exemplu cu valori) |',
    '|---|---|---|---|---|',
  );
  const days = ro.common.days;
  for (const kind of Object.keys(tips.flagTexts)) {
    const text = tips.flagTexts[kind];
    const name = kind.startsWith('symptom_') ? ro.symptom.cramps : '';
    out(
      `| \`${kind}\` | ${severity[kind] === 'attention' ? 'de discutat cu un medic' : 'informativ'} | ${cell(conditions[kind])} | ${cell(text.title(name))} | ${cell(text.body(FLAG_EXAMPLES[kind], name, days))} |`,
    );
  }

  out(
    '',
    '## 5. Avertismente fixe',
    '',
    'Aceste texte însoțesc orice estimare și nu pot fi ascunse de conținutul editorial.',
    '',
    '| Unde apare | Text |',
    '|---|---|',
    `| Lângă orice estimare de fertilitate (Azi, Calendar) | ${cell(ro.contraceptionWarning)} |`,
    `| La alegerea obiectivului „Contracepție” și, după aceea, în locul avertismentului scurt | ${cell(ro.contraceptionGoalWarning)} |`,
    `| La finalul ecranului „Sfaturi” | ${cell(ro.tips.disclaimer)} |`,
    `| Despre CycleCare | ${cell(ro.settings.about.notMedical)} |`,
    `| Despre CycleCare | ${cell(ro.settings.about.estimates)} |`,
    '',
    '## 6. Șablon gol pentru conținut nou',
    '',
    '```ts',
    '// Sfat pe fază',
    "{ id: '<faza>-<tema>-<nr>', title: '<titlu scurt>', body: '<1–2 propoziții, fără promisiuni>' }",
    '',
    '// Fișă de simptom',
    '<simptom>: {',
    "  helps: ['<sugestie 1>', '<sugestie 2>', '<sugestie 3, opțional>'],",
    "  doctor: '<semnele concrete pentru care merită cerut sfatul unui medic>',",
    '}',
    '',
    '// Semnalizare',
    '<regulă>: {',
    "  title: (numeSimptom) => '<ce s-a observat, pe scurt>',",
    "  body: (valori, numeSimptom, zile) => '<ce s-a înregistrat, cu cifre> + <invitația de a discuta cu un medic>',",
    '}',
    '```',
    '',
    '### Listă de verificare înainte de publicare',
    '',
    '- [ ] Textul a fost validat de un medic (nume, specialitate, dată).',
    '- [ ] Nu conține diagnostice, doze sau promisiuni de rezultat.',
    '- [ ] Îndemnul către medic numește semne concrete.',
    '- [ ] Formulările sunt neutre ca gen și la persoana a II-a singular.',
    '- [ ] Identificatorul este unic și nu a fost refolosit pentru alt text.',
    '- [ ] Documentul a fost regenerat (`npm run docs:content`).',
    '',
  );
  return lines.join('\n');
}

export function renderLegalDoc({ legal }) {
  const lines = [];
  const out = (...parts) => lines.push(...parts);
  const c = legal.consentText;
  const p = legal.privacyPolicy;

  out(
    '# Texte pentru consimțământ și declarația de confidențialitate',
    '',
    '> **Statut: schiță. De verificat de un specialist juridic înainte de orice lansare.**',
    `> Versiunea textelor: \`${legal.LEGAL_VERSION}\`, actualizată la ${legal.LEGAL_UPDATED}.`,
    '>',
    '> Document generat din `src/content/ro/legal.ts` cu `npm run docs:content`. Aplicația afișează exact aceste texte: ecranul de consimțământ din onboarding și „Setări → Confidențialitate și securitate → Citește declarația de confidențialitate”.',
    '',
    '## 1. Ce presupun textele',
    '',
    'Textele descriu aplicația așa cum este construită:',
    '',
    '- toate datele rămân pe dispozitiv, criptate (AES-256-GCM); nu există cont, server, instrumente de analiză sau SDK-uri ale unor terți;',
    '- versiunea web este configurată (Content-Security-Policy) să nu poată comunica cu alte servere;',
    '- singurele „ieșiri” de date sunt cele inițiate de persoană: raportul PDF și exportul JSON, salvate pe dispozitivul ei;',
    '- consimțământul este cerut înainte de prima întrebare despre ciclu, cu două căsuțe nebifate din oficiu;',
    '- dovada consimțământului (tipul, versiunea textului, data și ora) este păstrată în seiful criptat de pe dispozitiv;',
    '- retragerea consimțământului șterge toate datele.',
    '',
    'Dacă produsul primește funcții online, textele trebuie rescrise și consimțământul cerut din nou (vezi secțiunea 5).',
    '',
    '## 2. Ecranul de consimțământ',
    '',
    `### ${c.title}`,
    '',
    c.intro,
    '',
  );
  for (const point of c.points) out(`**${point.title}.** ${point.body}`, '');
  out(
    'Căsuțe de bifat (ambele obligatorii, nebifate din oficiu):',
    '',
    `- [ ] ${c.healthCheckbox}`,
    `- [ ] ${c.ageCheckbox}`,
    '',
    '| Element | Text |',
    '|---|---|',
    `| Legătură | ${cell(c.policyLink)} |`,
    `| Buton principal | ${cell(c.accept)} |`,
    `| Buton secundar | ${cell(c.decline)} |`,
    `| Mesaj după refuz | ${cell(c.declineInfo)} |`,
    `| Eroare: prima căsuță nebifată | ${cell(c.missingHealth)} |`,
    `| Eroare: a doua căsuță nebifată | ${cell(c.missingAge)} |`,
    '',
    '## 3. Șablon pentru un acord separat',
    '',
    'Nicio partajare cu terți nu are loc fără un acord explicit și separat. Aplicația nu partajează nimic, deci acest ecran nu este folosit încă; șablonul fixează forma pe care o va avea orice cerere viitoare. Fiecare acord se cere punctual, pentru o singură funcție, nu poate fi bifat din oficiu și nu condiționează restul aplicației.',
    '',
    `**${c.separateConsentTemplate.title}**`,
    '',
    c.separateConsentTemplate.body,
    '',
    `Butoane: „${c.separateConsentTemplate.accept}” / „${c.separateConsentTemplate.decline}”.`,
    '',
    `## 4. ${p.title}`,
    '',
    `> ${p.draftNotice}`,
    '',
  );
  for (const section of p.sections) {
    out(`### ${section.heading}`, '');
    const paragraphs = section.paragraphs ?? [];
    const lead = section.bullets ? paragraphs.slice(0, 1) : paragraphs;
    for (const paragraph of lead) out(paragraph, '');
    if (section.bullets) {
      for (const bullet of section.bullets) out(`- ${bullet}`);
      out('');
      for (const paragraph of paragraphs.slice(1)) out(paragraph, '');
    }
  }
  out(
    '## 5. Întrebări pentru jurist',
    '',
    'Punctele de mai jos nu apar în aplicație. Sunt deciziile și verificările de care depinde forma finală a textelor.',
    '',
  );
  legal.legalReviewNotes.forEach((note, i) => out(`${i + 1}. ${note}`));
  out('');
  return lines.join('\n');
}
