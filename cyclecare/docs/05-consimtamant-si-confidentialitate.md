# Texte pentru consimțământ și declarația de confidențialitate

> **Statut: schiță. De verificat de un specialist juridic înainte de orice lansare.**
> Versiunea textelor: `2026-11-schita-1`, actualizată la 2026-11-15.
>
> Document generat din `src/content/ro/legal.ts` cu `npm run docs:content`. Aplicația afișează exact aceste texte: ecranul de consimțământ din onboarding și „Setări → Confidențialitate și securitate → Citește declarația de confidențialitate”.

## 1. Ce presupun textele

Textele descriu prototipul așa cum este construit:

- toate datele rămân pe dispozitiv, criptate (AES-256-GCM); nu există cont, server, instrumente de analiză sau SDK-uri ale unor terți;
- versiunea web este configurată (Content-Security-Policy) să nu poată comunica cu alte servere;
- singurele „ieșiri” de date sunt cele inițiate de persoană: raportul PDF și exportul JSON, salvate pe dispozitivul ei;
- consimțământul este cerut înainte de prima întrebare despre ciclu, cu două căsuțe nebifate din oficiu;
- dovada consimțământului (tipul, versiunea textului, data și ora) este păstrată în seiful criptat de pe dispozitiv;
- retragerea consimțământului șterge toate datele.

Dacă produsul primește funcții online, textele trebuie rescrise și consimțământul cerut din nou (vezi secțiunea 5).

## 2. Ecranul de consimțământ

### Datele tale rămân la tine

Ca să funcționeze, CycleCare păstrează date despre sănătatea ta: zilele de menstruație, simptomele, dispoziția, temperatura și notele pe care le scrii. Înainte să notezi ceva, iată ce se întâmplă cu ele.

**Unde sunt păstrate.** Doar pe acest dispozitiv, criptate. Nu există cont și nu există server, iar noi nu le putem vedea.

**La ce folosesc.** La calcularea estimărilor și a statisticilor și la alegerea sfaturilor pe care ți le arătăm. La nimic altceva.

**Cine le mai vede.** Nimeni. Nu le partajăm, nu le vindem și nu le folosim pentru reclame. Orice partajare viitoare ar avea nevoie de un acord separat din partea ta.

**Ce poți face oricând.** Poți exporta sau șterge totul din Setări. Dacă îți retragi acordul, datele sunt șterse.

Căsuțe de bifat (ambele obligatorii, nebifate din oficiu):

- [ ] Sunt de acord ca CycleCare să prelucreze, pe acest dispozitiv, datele privind sănătatea pe care le introduc, în scopurile descrise mai sus.
- [ ] Am cel puțin 16 ani sau am acordul unui părinte ori al unui tutore.

| Element | Text |
|---|---|
| Legătură | Citește declarația de confidențialitate |
| Buton principal | Sunt de acord și continui |
| Buton secundar | Nu sunt de acord |
| Mesaj după refuz | Fără acest acord, aplicația nu poate păstra nimic. Nu am salvat nicio informație; poți închide pagina. |
| Eroare: prima căsuță nebifată | Bifează acordul pentru prelucrarea datelor ca să poți continua. |
| Eroare: a doua căsuță nebifată | Confirmă vârsta sau acordul unui părinte ori tutore ca să poți continua. |

## 3. Șablon pentru un acord separat

Nicio partajare cu terți nu are loc fără un acord explicit și separat. Prototipul nu partajează nimic, deci acest ecran nu este folosit încă; șablonul fixează forma pe care o va avea orice cerere viitoare. Fiecare acord se cere punctual, pentru o singură funcție, nu poate fi bifat din oficiu și nu condiționează restul aplicației.

**Acord separat pentru [funcție]**

Ca să [scopul funcției], CycleCare ar trimite către [destinatar] următoarele date: [lista exactă]. Datele ar fi folosite doar pentru [scop] și păstrate [durată]. Poți refuza: restul aplicației funcționează la fel. Îți poți retrage acordul oricând din Setări.

Butoane: „Sunt de acord cu această partajare” / „Nu acum”.

## 4. Declarație de confidențialitate

> Schiță de lucru, versiunea din 15 noiembrie 2026. Textul nu a fost încă verificat de un specialist juridic.

### 1. Pe scurt

- CycleCare păstrează datele tale doar pe dispozitivul tău, criptate.
- Nu îți cerem nume, e-mail, număr de telefon sau cont.
- Nu avem acces la datele tale și nu le transmitem nimănui.
- Nu folosim reclame, instrumente de analiză sau alte servicii ale unor terți.
- Poți exporta sau șterge totul oricând.

### 2. Cine suntem

Aplicația CycleCare este oferită de [denumirea operatorului], cu sediul în [adresă], înregistrată sub nr. [număr de înregistrare] („noi”).

Pentru întrebări despre datele tale ne poți scrie la [adresă de e-mail]. [Dacă este desemnat un responsabil cu protecția datelor: datele de contact ale acestuia.]

### 3. Ce date prelucrează aplicația

Aplicația lucrează doar cu informațiile pe care le introduci sau le imporți tu:

- date despre ciclu: zilele de menstruație și intensitatea fluxului, durata obișnuită a ciclului și a menstruației;
- jurnalul zilnic: simptome și intensitatea lor, dispoziție, nivel de energie, temperatură bazală, secreție cervicală, note libere;
- obiectivele alese la început (de exemplu, urmărire generală sau planificarea unei sarcini);
- setări: memento-uri, denumirile medicamentelor pentru care ceri memento, temă, dimensiunea textului;
- dovada acordului tău: data și versiunea textului acceptat.

### 4. Date privind sănătatea

Cele mai multe dintre aceste informații sunt date privind sănătatea, pe care Regulamentul general privind protecția datelor (GDPR) le protejează în mod special. Le prelucrăm numai pe baza consimțământului tău explicit, dat la prima deschidere a aplicației (art. 6 alin. (1) lit. a) și art. 9 alin. (2) lit. a) din GDPR).

Îți poți retrage consimțământul oricând, din Setări → Confidențialitate și securitate. Retragerea șterge datele de pe dispozitiv și nu afectează legalitatea prelucrării de până atunci.

### 5. Unde sunt păstrate și cum sunt protejate

- Datele sunt păstrate exclusiv pe dispozitivul tău, în spațiul de stocare al aplicației.
- Sunt criptate în repaus cu AES-256-GCM. Cheia de criptare este păstrată de sistemul dispozitivului și nu poate fi exportată.
- Dacă setezi un PIN, cheia de criptare este protejată suplimentar cu o cheie derivată din PIN (PBKDF2-HMAC-SHA-256, 600 000 de iterații). PIN-ul nu este stocat nicăieri și nu poate fi recuperat.
- Deblocarea biometrică folosește senzorul dispozitivului. Amprenta sau imaginea feței nu ajung la aplicație.
- Aplicația nu transmite datele tale prin internet. Versiunea web este livrată prin HTTPS și este configurată să nu poată comunica cu alte servere.
- Dacă pe viitor apare o funcție care presupune transmiterea de date (de exemplu, o copie de siguranță în cloud), aceasta va fi opțională, criptată integral pe dispozitiv înainte de transmitere, transmisă numai prin conexiuni criptate (TLS) și activată doar cu acordul tău separat.

### 6. La ce folosim datele

Toate aceste calcule se fac pe dispozitivul tău. Nu luăm decizii automate cu efecte juridice asupra ta și nu creăm profiluri în scopuri de marketing.

- pentru a calcula ziua ciclului, fazele, estimarea următoarei menstruații și a zilelor fertile;
- pentru a-ți arăta statistici, sfaturi potrivite și observații despre ce ai notat;
- pentru a-ți afișa memento-urile pe care le-ai cerut;
- pentru a crea, la cererea ta, raportul PDF sau exportul de date.

### 7. Cu cine partajăm datele

Cu nimeni. Nu vindem, nu închiriem și nu transmitem datele tale către terți, parteneri de publicitate, angajatori, asigurători sau autorități, pentru că nu le deținem.

Raportul PDF și exportul de date sunt create pe dispozitivul tău și ajung doar la cine alegi tu să le arăți sau să le trimiți.

Orice partajare viitoare ar fi posibilă numai cu acordul tău explicit și separat, cerut pentru fiecare caz în parte, cu indicarea exactă a datelor, a destinatarului și a scopului.

### 8. Notificări

Memento-urile sunt generate pe dispozitiv. În mod implicit, textul notificării este discret și nu menționează ciclul sau medicamentele. Poți schimba sau opri memento-urile oricând.

### 9. Date importate din dispozitive purtabile

Dacă alegi să imporți temperatura bazală dintr-un fișier exportat de o brățară, un inel sau un termometru, fișierul este citit pe dispozitivul tău și nu este trimis nicăieri.

În aplicația pentru telefon, importul din Apple Health sau Health Connect se face numai după ce îți dai acordul în fereastra de permisiuni a sistemului și doar pentru tipurile de date pe care le alegi. Poți revoca permisiunea din setările telefonului.

### 10. Cât timp păstrăm datele

Datele rămân pe dispozitivul tău până când le ștergi din aplicație, îți retragi acordul, ștergi datele site-ului din browser sau dezinstalezi aplicația. Noi nu păstrăm nicio copie.

Atenție: dacă pierzi dispozitivul sau ștergi aplicația fără un export, datele nu pot fi recuperate.

### 11. Drepturile tale

Potrivit GDPR ai următoarele drepturi, pe care le poți exercita direct din aplicație:

- acces: toate datele sunt vizibile în aplicație și pot fi exportate;
- rectificare: poți modifica orice înregistrare din jurnal și din setări;
- ștergere: Setări → Confidențialitate și securitate → Șterge toate datele;
- portabilitate: Setări → Datele mele → Exportă datele, într-un format structurat (JSON);
- retragerea consimțământului: Setări → Confidențialitate și securitate;
- restricționare și opoziție: deoarece datele sunt doar la tine, oprirea folosirii aplicației oprește orice prelucrare.

### 12. Plângeri

Dacă crezi că drepturile tale au fost încălcate, te poți adresa Autorității Naționale de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), www.dataprotection.ro. Ne-ar ajuta să ne scrii mai întâi nouă, ca să putem rezolva problema.

### 13. Vârsta minimă

Îți poți da singur acordul dacă ai cel puțin 16 ani. Sub această vârstă este nevoie de acordul unui părinte sau al unui tutore. [De confirmat de jurist: mecanismul de verificare și vârsta aplicabilă.]

### 14. Ce nu este CycleCare

CycleCare este un instrument de urmărire și informare. Nu este un dispozitiv medical, nu pune diagnostice și nu înlocuiește consultul medical. Estimările zilelor fertile nu sunt un mijloc de contracepție.

### 15. Schimbări ale acestei declarații

Dacă modificăm felul în care sunt prelucrate datele, te anunțăm în aplicație înainte ca schimbarea să se aplice. Pentru orice schimbare care presupune noi scopuri sau noi destinatari îți vom cere din nou acordul.

## 5. Întrebări pentru jurist

Punctele de mai jos nu apar în aplicație. Sunt deciziile și verificările de care depinde forma finală a textelor.

1. Calitatea de operator. Datele nu părăsesc dispozitivul și furnizorul nu are acces la ele. De analizat dacă furnizorul este operator în sensul art. 4 pct. 7 GDPR pentru prelucrarea făcută local de aplicație (el stabilește scopurile și mijloacele prin felul în care e construită aplicația) sau dacă se aplică, pentru utilizator, excepția activităților personale. Schița pornește prudent de la ipoteza că furnizorul este operator.
2. Temeiul juridic. Schița folosește consimțământul explicit (art. 9 alin. (2) lit. a)). De confirmat formularea căsuței de bifat, faptul că nu este bifată din oficiu și modul în care se păstrează dovada (acum: data și versiunea textului, în seiful criptat de pe dispozitiv).
3. Minori. Legea nr. 190/2018 și art. 8 GDPR: de confirmat vârsta aplicabilă în România pentru consimțământul la serviciile societății informaționale și dacă o simplă declarație este suficientă pentru o aplicație folosită și de adolescente. De decis dacă produsul se adresează și persoanelor sub 16 ani și cum se obține acordul părintelui.
4. Evaluarea impactului (DPIA). Prelucrarea de date privind sănătatea, chiar locală, poate impune o evaluare a impactului (art. 35 GDPR și lista ANSPDCP). De stabilit dacă este necesară în varianta fără server și, sigur, înainte de orice funcție online.
5. Statutul de dispozitiv medical. De verificat, față de Regulamentul (UE) 2017/745, că funcțiile și formulările (estimarea zilelor fertile, semnalarea simptomelor, raportul pentru medic) nu fac din aplicație un dispozitiv medical. Mesajele spun explicit că aplicația nu este un mijloc de contracepție și nu pune diagnostice; orice afirmație de tip „previne sarcina” sau „detectează” ar schimba încadrarea.
6. Sfaturile de sănătate. Conținutul din „Sfaturi” trebuie validat de un medic. De verificat și regulile privind publicitatea și informațiile despre medicamente (aplicația nu numește doze și trimite la farmacist sau medic).
7. Notificările și ePrivacy. Stocarea locală este strict necesară serviciului cerut de utilizator; de confirmat că nu este nevoie de un acord separat de tip cookie (Legea nr. 506/2004).
8. Versiunile din magazinele de aplicații. Apple și Google cer declarații proprii despre date („privacy nutrition labels”, „Data safety”) și au reguli speciale pentru aplicațiile de sănătate și pentru HealthKit / Health Connect. Textele trebuie aliniate cu acestea.
9. Funcții viitoare. Copia în cloud, sincronizarea sau trimiterea raportului către medic schimbă fundamental analiza: apar persoane împuternicite, transferuri, durate de păstrare, obligații de securitate și de notificare a incidentelor. Fiecare are nevoie de acord separat (șablonul este inclus) și de o actualizare a declarației.
10. Datele celor apropiați. Notele libere pot conține informații despre alte persoane (de exemplu, partener). De decis dacă este nevoie de o mențiune.
11. Limba și accesibilitatea. Declarația trebuie să rămână ușor de înțeles (art. 12 GDPR), inclusiv pentru adolescenți, și disponibilă în fiecare limbă în care este oferită aplicația.
