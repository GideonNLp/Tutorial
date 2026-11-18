/**
 * Textele de consimțământ și declarația de confidențialitate, în română.
 *
 * SCHIȚĂ. Trebuie verificate de un specialist juridic înainte de orice lansare.
 * Datele operatorului vin din configurare (`VITE_OPERATOR_NAME` etc., vezi `.env.example`); cât timp
 * lipsesc, rămân vizibile ca spații de completat, între paranteze drepte. După verificarea juridică,
 * `VITE_LEGAL_REVIEWED=true` scoate mențiunea de schiță și notele pentru jurist din textul afișat.
 * Întrebările deschise pentru jurist sunt în docs/05-consimtamant-si-confidentialitate.md,
 * generat din acest fișier (`npm run docs:content`).
 *
 * Textele descriu exact ce face aplicația: totul rămâne pe dispozitiv, criptat, fără cont; singura
 * excepție, la alegere și cu acord separat, este rezumatul criptat cap-coadă al Modului Partener.
 * Dacă produsul primește alte funcții online (copie în cloud, sincronizare), textele trebuie rescrise,
 * iar utilizatorii trebuie să își dea din nou acordul. Traducerea în engleză este în `../en/legal.ts`
 * și trebuie ținută la zi odată cu acest fișier.
 */

import { APP_NAME, LEGAL_REVIEWED, OPERATOR } from '../../app/config';

export const LEGAL_VERSION: string = '2026-11-schita-6';
export const LEGAL_UPDATED: string = '2026-11-17';

export const consentText = {
  title: 'Datele tale rămân la tine',
  intro: `Ca să funcționeze, ${APP_NAME} păstrează date despre sănătatea ta: zilele de menstruație, simptomele, dispoziția, temperatura, notele pe care le scrii și, numai dacă alegi să le notezi, contactele intime și contracepția folosită. Înainte să notezi ceva, iată ce se întâmplă cu ele.`,
  points: [
    {
      title: 'Unde sunt păstrate',
      body: 'Doar pe acest dispozitiv, criptate. Nu există cont, iar noi nu le putem vedea.',
    },
    {
      title: 'La ce folosesc',
      body: 'La calcularea estimărilor și a statisticilor și la alegerea sfaturilor pe care ți le arătăm. La nimic altceva.',
    },
    {
      title: 'Cine le mai vede',
      body: 'Nimeni. Nu le partajăm, nu le vindem și nu le folosim pentru reclame. Dacă vrei, poți invita o persoană în Modul Partener sau poți păstra o copie criptată a jurnalului pe serverul aplicației, pe care nu o putem citi; pentru fiecare îți cerem un acord separat.',
    },
    {
      title: 'Ce poți face oricând',
      body: 'Poți exporta sau șterge totul din Setări. Dacă îți retragi acordul, datele sunt șterse.',
    },
  ],
  healthCheckbox: `Sunt de acord ca ${APP_NAME} să prelucreze, pe acest dispozitiv, datele privind sănătatea și viața intimă pe care le introduc, în scopurile descrise mai sus.`,
  ageCheckbox: 'Am cel puțin 16 ani sau am acordul unui părinte ori al unui tutore.',
  policyLink: 'Citește declarația de confidențialitate',
  accept: 'Sunt de acord și continui',
  decline: 'Nu sunt de acord',
  declineInfo: 'Fără acest acord, aplicația nu poate păstra nimic. Nu am salvat nicio informație; poți închide pagina.',
  missingHealth: 'Bifează acordul pentru prelucrarea datelor ca să poți continua.',
  missingAge: 'Confirmă vârsta sau acordul unui părinte ori tutore ca să poți continua.',
  /** Șablon pentru un acord separat, cerut punctual, dacă va exista vreodată o funcție de partajare. */
  separateConsentTemplate: {
    title: 'Acord separat pentru [funcție]',
    body: `Ca să [scopul funcției], ${APP_NAME} ar trimite către [destinatar] următoarele date: [lista exactă]. Datele ar fi folosite doar pentru [scop] și păstrate [durată]. Poți refuza: restul aplicației funcționează la fel. Îți poți retrage acordul oricând din Setări.`,
    accept: 'Sunt de acord cu această partajare',
    decline: 'Nu acum',
  },
};

export interface PolicySection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

/** O notă pentru jurist, vizibilă în text doar cât timp acesta nu a fost verificat. */
const reviewNote = (note: string): string => (LEGAL_REVIEWED ? '' : ` [${note}]`);

export const privacyPolicy: { title: string; draftNotice: string | undefined; sections: PolicySection[] } = {
  title: 'Declarație de confidențialitate',
  draftNotice: LEGAL_REVIEWED
    ? undefined
    : 'Schiță de lucru, versiunea din 17 noiembrie 2026. Textul nu a fost încă verificat de un specialist juridic.',
  sections: [
    {
      heading: '1. Pe scurt',
      bullets: [
        `${APP_NAME} păstrează datele tale pe dispozitivul tău, criptate; o copie criptată pe server există doar dacă o pornești tu.`,
        'Nu îți cerem e-mail, număr de telefon sau cont. Numele (sau o poreclă) și poza de profil sunt opționale și rămân, și ele, doar pe dispozitiv.',
        'Nu avem acces la datele tale și nu le transmitem nimănui. Dacă alegi Modul Partener, un rezumat ales de tine ajunge, criptat cap-coadă, doar pe telefonul persoanei invitate. Dacă alegi copia de siguranță, o copie criptată a jurnalului este păstrată pe serverul aplicației, iar noi nu o putem citi.',
        'Nu folosim reclame, instrumente de analiză sau alte servicii ale unor terți.',
        'Poți exporta sau șterge totul oricând.',
      ],
    },
    {
      heading: '2. Cine suntem',
      paragraphs: [
        `Aplicația ${APP_NAME} este oferită de ${OPERATOR.name ?? '[denumirea operatorului]'}, cu sediul în ${OPERATOR.address ?? '[adresă]'}, înregistrată sub nr. ${OPERATOR.registration ?? '[număr de înregistrare]'} („noi”).`,
        `Pentru întrebări despre datele tale ne poți scrie la ${OPERATOR.email ?? '[adresă de e-mail]'}.${
          OPERATOR.dpo
            ? ` Responsabilul cu protecția datelor poate fi contactat la ${OPERATOR.dpo}.`
            : reviewNote('Dacă este desemnat un responsabil cu protecția datelor: datele de contact ale acestuia.')
        }`,
      ],
    },
    {
      heading: '3. Ce date prelucrează aplicația',
      paragraphs: ['Aplicația lucrează doar cu informațiile pe care le introduci sau le imporți tu:'],
      bullets: [
        'date despre ciclu: zilele de menstruație și intensitatea fluxului, durata obișnuită a ciclului și a menstruației;',
        'jurnalul zilnic: simptome și intensitatea lor, dispoziție, nivel de energie, temperatură bazală, secreție cervicală, note libere;',
        'viața intimă, numai dacă alegi să o notezi: zilele cu contact intim, felul contactului și contracepția folosită;',
        'profilul, dacă îl completezi: un nume sau o poreclă și o poză de profil, micșorată pe dispozitiv la 256 × 256 de pixeli (fișierul original nu este păstrat);',
        'obiectivele alese la început (de exemplu, urmărire generală sau planificarea unei sarcini);',
        'setări: memento-uri, denumirile medicamentelor pentru care ceri memento, temă, dimensiunea textului;',
        'dovada acordului tău: data și versiunea textului acceptat.',
      ],
    },
    {
      heading: '4. Date privind sănătatea',
      paragraphs: [
        'Cele mai multe dintre aceste informații sunt date privind sănătatea, pe care Regulamentul general privind protecția datelor (GDPR) le protejează în mod special. Le prelucrăm numai pe baza consimțământului tău explicit, dat la prima deschidere a aplicației (art. 6 alin. (1) lit. a) și art. 9 alin. (2) lit. a) din GDPR).',
        'Contactele intime și contracepția pe care alegi să le notezi sunt date privind viața sexuală, protejate la fel de strict. Notarea lor este opțională, ele nu apar în raportul PDF, iar inimioarele din calendar pot fi ascunse din Setări → Confidențialitate și securitate.',
        'Îți poți retrage consimțământul oricând, din Setări → Confidențialitate și securitate. Retragerea șterge datele de pe dispozitiv și nu afectează legalitatea prelucrării de până atunci.',
      ],
    },
    {
      heading: '5. Unde sunt păstrate și cum sunt protejate',
      bullets: [
        'Datele sunt păstrate pe dispozitivul tău, în spațiul de stocare al aplicației (și, doar dacă pornești copia de siguranță, într-o copie criptată pe serverul aplicației).',
        'Sunt criptate în repaus cu AES-256-GCM. Cheia de criptare este păstrată de sistemul dispozitivului și nu poate fi exportată.',
        'Dacă setezi un PIN, cheia de criptare este protejată suplimentar cu o cheie derivată din PIN (PBKDF2-HMAC-SHA-256, 600 000 de iterații). PIN-ul nu este stocat nicăieri și nu poate fi recuperat.',
        'Deblocarea biometrică folosește senzorul dispozitivului. Amprenta sau imaginea feței nu ajung la aplicație.',
        'Aplicația nu transmite datele tale prin internet, cu două excepții pe care le alegi tu: Modul Partener și copia de siguranță (secțiunea 7). Aplicația este livrată prin HTTPS și este configurată să nu poată comunica decât cu propriul server.',
        'Codul de recuperare este generat pe telefonul tău și păstrat doar în jurnalul criptat de pe el; nu este trimis nicăieri. Din el se derivă cheia care criptează copia, deci fără el copia nu poate fi deschisă de nimeni, nici de noi, și nici codul nu poate fi refăcut.',
        'Dacă pe viitor apare o funcție care presupune transmiterea de date (de exemplu, o copie de siguranță în cloud), aceasta va fi opțională, criptată integral pe dispozitiv înainte de transmitere, transmisă numai prin conexiuni criptate (TLS) și activată doar cu acordul tău separat.',
      ],
    },
    {
      heading: '6. La ce folosim datele',
      bullets: [
        'pentru a calcula ziua ciclului, fazele, estimarea următoarei menstruații și a zilelor fertile;',
        'pentru a-ți arăta statistici, sfaturi potrivite și observații despre ce ai notat;',
        'pentru a-ți afișa memento-urile pe care le-ai cerut;',
        'pentru a-ți afișa numele și poza în profil, dacă le-ai adăugat;',
        'pentru a estima, din contactele intime notate și din ciclul tău, riscul sau șansa de sarcină;',
        'pentru a crea, la cererea ta, raportul PDF sau exportul de date.',
      ],
      paragraphs: [
        'Toate aceste calcule se fac pe dispozitivul tău. Nu luăm decizii automate cu efecte juridice asupra ta și nu creăm profiluri în scopuri de marketing.',
      ],
    },
    {
      heading: '7. Cu cine partajăm datele',
      paragraphs: [
        'Cu nimeni. Nu vindem, nu închiriem și nu transmitem datele tale către terți, parteneri de publicitate, angajatori, asigurători sau autorități, pentru că nu le deținem.',
        'Raportul PDF și exportul de date sunt create pe dispozitivul tău și ajung doar la cine alegi tu să le arăți sau să le trimiți.',
        'Modul Partener, numai dacă îl pornești, cu acordul tău separat: telefonul tău calculează un rezumat cu ce ai ales să vadă persoana invitată (faza, calendarul cu estimările, simptomele și dispoziția din ultimele 14 zile, notițele). Contactele intime, temperatura, secreția cervicală și poza de profil nu sunt trimise niciodată. Rezumatul este criptat pe telefonul tău cu o cheie pe care o au doar cele două telefoane și trece prin serverul aplicației, care păstrează doar textul criptat, fără să îl poată citi. Serverul este găzduit de furnizorul de găzduire al aplicației [denumirea furnizorului și țara în care sunt păstrate datele].',
        'Copia de siguranță pe server, numai dacă o pornești, cu acordul tău separat: telefonul tău criptează întregul jurnal (zilele notate, inclusiv contactele intime, notele și profilul) cu o cheie făcută din codul de recuperare, pe care o ai doar tu, și trimite copia serverului aplicației, cel descris mai sus. Serverul păstrează cel mult trei versiuni (ultima, una de cel puțin o zi și una de cel puțin o săptămână mai veche), nu le poate citi și vede doar mărimea lor și momentul actualizării.',
        'Poți opri copia oricând: ea este ștearsă de pe server, cu toate versiunile. O șterg și „Șterge toate datele” și retragerea acordului. Dacă ți-ai uitat PIN-ul și ai început de la zero, copia rămâne pe server, ca s-o poți restaura cu codul de recuperare; o poți șterge apoi din Setări → Copie de siguranță.',
        'Asocierea se face cu un cod de 6 caractere, valabil 10 minute, și cu șase cifre de verificare pe care le compari pe cele două ecrane. Poți schimba oricând ce vede partenerul sau poți opri partajarea; atunci copia criptată este ștearsă de pe server. Persoana invitată păstrează pe telefonul ei, criptat, ultimul rezumat primit, până se deconectează.',
        'Orice altă partajare ar fi posibilă numai cu acordul tău explicit și separat, cerut pentru fiecare caz în parte, cu indicarea exactă a datelor, a destinatarului și a scopului.',
      ],
    },
    {
      heading: '8. Notificări',
      paragraphs: [
        'Memento-urile sunt generate pe dispozitiv. În mod implicit, textul notificării este discret și nu menționează ciclul sau medicamentele. Poți schimba sau opri memento-urile oricând.',
      ],
    },
    {
      heading: '9. Date importate din dispozitive purtabile',
      paragraphs: [
        'Dacă alegi să imporți temperatura bazală dintr-un fișier exportat de o brățară, un inel sau un termometru, fișierul este citit pe dispozitivul tău și nu este trimis nicăieri.',
      ],
    },
    {
      heading: '10. Cât timp păstrăm datele',
      paragraphs: [
        `Datele rămân pe dispozitivul tău până când le ștergi din aplicație, îți retragi acordul, ștergi datele site-ului din browser sau dezinstalezi aplicația. Noi nu păstrăm nicio copie, cu excepția rezumatului criptat al Modului Partener și a copiei de siguranță criptate, care sunt șterse când le oprești sau ștergi toate datele.${reviewNote('Perioada maximă de păstrare a unei copii care nu mai este actualizată, de exemplu după un telefon pierdut.')}`,
        'Atenție: dacă pierzi dispozitivul sau ștergi aplicația fără un export, datele nu pot fi recuperate.',
      ],
    },
    {
      heading: '11. Drepturile tale',
      paragraphs: ['Potrivit GDPR ai următoarele drepturi, pe care le poți exercita direct din aplicație:'],
      bullets: [
        'acces: toate datele sunt vizibile în aplicație și pot fi exportate;',
        'rectificare: poți modifica orice înregistrare din jurnal și din setări;',
        'ștergere: Setări → Confidențialitate și securitate → Șterge toate datele;',
        'portabilitate: Setări → Datele mele → Exportă datele, într-un format structurat (JSON);',
        'retragerea consimțământului: Setări → Confidențialitate și securitate;',
        'restricționare și opoziție: deoarece datele sunt doar la tine, oprirea folosirii aplicației oprește orice prelucrare.',
      ],
    },
    {
      heading: '12. Plângeri',
      paragraphs: [
        'Dacă crezi că drepturile tale au fost încălcate, te poți adresa Autorității Naționale de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), www.dataprotection.ro, sau autorității de protecție a datelor din țara UE în care locuiești. Ne-ar ajuta să ne scrii mai întâi nouă, ca să putem rezolva problema.',
      ],
    },
    {
      heading: '13. Vârsta minimă',
      paragraphs: [
        `Îți poți da singur acordul dacă ai cel puțin 16 ani. Sub această vârstă este nevoie de acordul unui părinte sau al unui tutore.${reviewNote('De confirmat de jurist: mecanismul de verificare și vârsta aplicabilă.')}`,
      ],
    },
    {
      heading: `14. Ce nu este ${APP_NAME}`,
      paragraphs: [
        `${APP_NAME} este un instrument de urmărire și informare. Nu este un dispozitiv medical, nu pune diagnostice și nu înlocuiește consultul medical. Estimările zilelor fertile nu sunt un mijloc de contracepție.`,
      ],
    },
    {
      heading: '15. Schimbări ale acestei declarații',
      paragraphs: [
        'Dacă modificăm felul în care sunt prelucrate datele, te anunțăm în aplicație înainte ca schimbarea să se aplice. Pentru orice schimbare care presupune noi scopuri sau noi destinatari îți vom cere din nou acordul.',
      ],
    },
  ],
};

/** Întrebări pentru jurist. Apar doar în documentație, nu în aplicație. */
export const legalReviewNotes: string[] = [
  'Calitatea de operator. Datele nu părăsesc dispozitivul și furnizorul nu are acces la ele. De analizat dacă furnizorul este operator în sensul art. 4 pct. 7 GDPR pentru prelucrarea făcută local de aplicație (el stabilește scopurile și mijloacele prin felul în care e construită aplicația) sau dacă se aplică, pentru utilizator, excepția activităților personale. Schița pornește prudent de la ipoteza că furnizorul este operator.',
  'Temeiul juridic. Schița folosește consimțământul explicit (art. 9 alin. (2) lit. a)). De confirmat formularea căsuței de bifat, faptul că nu este bifată din oficiu și modul în care se păstrează dovada (acum: data și versiunea textului, în seiful criptat de pe dispozitiv).',
  'Minori. Legea nr. 190/2018 și art. 8 GDPR: de confirmat vârsta aplicabilă în România pentru consimțământul la serviciile societății informaționale și dacă o simplă declarație este suficientă pentru o aplicație folosită și de adolescente. De decis dacă produsul se adresează și persoanelor sub 16 ani și cum se obține acordul părintelui.',
  'Evaluarea impactului (DPIA). Prelucrarea de date privind sănătatea, chiar locală, poate impune o evaluare a impactului (art. 35 GDPR și lista ANSPDCP). De stabilit dacă este necesară în varianta fără server și, sigur, înainte de orice funcție online.',
  'Statutul de dispozitiv medical. De verificat, față de Regulamentul (UE) 2017/745, că funcțiile și formulările (estimarea zilelor fertile, semnalarea simptomelor, raportul pentru medic) nu fac din aplicație un dispozitiv medical. Mesajele spun explicit că aplicația nu este un mijloc de contracepție și nu pune diagnostice; orice afirmație de tip „previne sarcina” sau „detectează” ar schimba încadrarea.',
  'Sfaturile de sănătate. Conținutul din „Sfaturi” trebuie validat de un medic. De verificat și regulile privind publicitatea și informațiile despre medicamente (aplicația nu numește doze și trimite la farmacist sau medic).',
  'Notificările și ePrivacy. Stocarea locală este strict necesară serviciului cerut de utilizator; de confirmat că nu este nevoie de un acord separat de tip cookie (Legea nr. 506/2004).',
  'Versiunile din magazinele de aplicații. Apple și Google cer declarații proprii despre date („privacy nutrition labels”, „Data safety”) și au reguli speciale pentru aplicațiile de sănătate și pentru HealthKit / Health Connect. Textele trebuie aliniate cu acestea.',
  'Funcții viitoare. Copia în cloud, sincronizarea sau trimiterea raportului către medic schimbă fundamental analiza: apar persoane împuternicite, transferuri, durate de păstrare, obligații de securitate și de notificare a incidentelor. Fiecare are nevoie de acord separat (șablonul este inclus) și de o actualizare a declarației.',
  'Modul Partener. Odată cu el, operatorul prelucrează date (criptate cap-coadă) pe un server, iar furnizorul de găzduire devine persoană împuternicită: de verificat contractul (art. 28 GDPR), locul în care sunt păstrate datele și eventualele transferuri în afara SEE, evaluarea impactului (DPIA) și dacă datele criptate cap-coadă, pe care operatorul nu le poate citi, sunt totuși date personale pentru operator (identificatorul canalului și momentele actualizărilor rămân vizibile). De analizat și riscul de control coercitiv (o persoană presată să partajeze): partajarea se poate opri oricând, fără ca partenerul să fie avertizat altfel decât prin oprirea actualizărilor; de decis dacă e nevoie de mai mult (de exemplu, o oprire discretă sau o amintire periodică a faptului că partajarea este activă). Persoana invitată primește date despre sănătatea altcuiva: de stabilit ce informare și ce acord i se cer.',
  'Copia de siguranță pe server. Date privind sănătatea, inclusiv viața intimă, ajung criptate cap-coadă pe un server. De analizat: rolul furnizorului de găzduire (persoană împuternicită, art. 28 GDPR), evaluarea impactului (DPIA), locul în care sunt păstrate datele, perioada de păstrare a unei copii care nu mai este actualizată (acum nelimitată; o ștergere automată trebuie să țină cont că un jurnal nemodificat nu mai este retrimis și ar fi șters deși persoana îl folosește), accesul prin cod (cine are codul poate citi și șterge copia), pierderea codului (datele devin irecuperabile, lucru spus explicit în aplicație), copia care rămâne pe server după „Am uitat PIN-ul” (necesară pentru scopul copiei, dar de justificat) și dreptul la ștergere.',
  'Viața intimă și riscul de sarcină. Datele despre viața sexuală sunt o categorie specială distinctă (art. 9 alin. (1) GDPR). Schița le include în acordul general, cu mențiune explicită în textul căsuței; de decis dacă este nevoie de un acord separat, cerut la prima notare a unui contact intim, și ce se întâmplă cu utilizatorii care și-au dat acordul pe o versiune anterioară a textului. Estimarea riscului de sarcină trebuie verificată față de Regulamentul (UE) 2017/745: aplicațiile care spun în ce zile se poate evita o sarcină sunt certificate ca dispozitive medicale. Formulările evită „zi sigură”, nivelul cel mai mic este „scăzut, dar nu zero”, iar fiecare afișare amintește că estimarea nu este o metodă de contracepție. Textele despre contracepția de urgență și testul de sarcină trebuie validate de un medic.',
  'Profilul. Numele și poza de profil sunt opționale, rămân pe dispozitiv și nu sunt folosite pentru identificare (poza nu este prelucrată ca dată biometrică). De confirmat că mențiunea din secțiunea 3 este suficientă și că poza poate înfățișa și alte persoane decât utilizatorul (de exemplu, o fotografie de grup).',
  'Datele celor apropiați. Notele libere pot conține informații despre alte persoane (de exemplu, partener). De decis dacă este nevoie de o mențiune.',
  'Limba și accesibilitatea. Declarația trebuie să rămână ușor de înțeles (art. 12 GDPR), inclusiv pentru adolescenți, și disponibilă în fiecare limbă în care este oferită aplicația.',
];
