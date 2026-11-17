# Șablon de conținut: sfaturi pe faze și pe simptome

> **Statut: schiță redacțională, nevalidată medical.** Fiecare text trebuie revizuit de un medic înainte de lansare.
> Versiunea conținutului: `2026-11-schita-1`.
>
> Document generat din `src/content/ro/tips.ts` cu `npm run docs:content`. Nu îl edita direct: schimbă fișierul sursă și regenerează. Aplicația afișează exact aceste texte.

## 1. Cum se folosește șablonul

Conținutul are trei părți, fiecare cu o structură fixă:

| Parte | Când apare în aplicație | Structură |
|---|---|---|
| Sfaturi pe faze | Ecranul „Sfaturi” (faza curentă este preselectată) și „Un sfat pentru azi” pe ecranul principal | 4 faze × 4 teme (alimentație, mișcare, somn, piele) × 2 sfaturi; fiecare sfat are identificator, titlu și text |
| Sfaturi pe simptome | Ecranul „Sfaturi”, pentru simptomele notate recent | pentru fiecare simptom: 2–3 sugestii („Ce poate ajuta”) și un paragraf „Când merită să ceri sfatul unui medic” |
| Semnalizări | Ecranele „Azi” și „Sfaturi”, când o regulă este îndeplinită | titlu și mesaj cu valori completate automat; fiecare are o regulă de declanșare |

Pentru o limbă nouă se copiază fișierul în `src/content/<limbă>/tips.ts` și se traduc textele, păstrând identificatorii.

### Reguli de ton

- Persoana a II-a singular, ton cald și direct, fără diminutive.
- Formulări neutre ca gen: „dacă simți oboseală”, nu „dacă ești obosită”.
- Niciun diagnostic și nicio afecțiune numită ca explicație pentru ce a notat persoana.
- Fără afirmații categorice: „poate ajuta”, „unele persoane observă”, „merită discutat cu un medic”. Niciodată „vindecă”, „trebuie”, „sigur”.
- Fără doze de medicamente. Pentru orice medicament: „cere sfatul farmacistului sau al medicului”.
- Îndemnul către medic este concret (ce semne contează) și fără alarmism. Pentru urgențe se indică 112.
- Orice estimare este numită estimare.

### Câmpurile unui sfat

| Câmp | Obligatoriu | Descriere |
|---|---|---|
| `id` | da | Identificator stabil (de ex. `men-nut-1`), folosit la traducere și la urmărirea reviziei medicale |
| `title` | da | Cel mult ~40 de caractere; spune ce face sfatul, nu ce promite |
| `body` | da | 1–2 propoziții, cel mult ~220 de caractere |
| revizuit de / data | la lansare | De adăugat în fluxul editorial: cine a validat medical textul și când |
| sursă | recomandat | Ghidul sau sursa pe care se sprijină afirmația |

## 2. Sfaturi pe faze

### Menstruație

**Pe scurt:** Corpul elimină mucoasa uterului, iar nivelul hormonilor este scăzut. Multe persoane au mai puțină energie în primele zile. E în regulă să încetinești.

| ID | Temă | Titlu | Text |
|---|---|---|---|
| `men-nut-1` | Alimentație | Alimente bogate în fier | Lintea, fasolea, spanacul, ouăle sau carnea roșie pot ajuta la refacerea fierului pierdut prin sângerare. Vitamina C din legume și fructe îi ajută absorbția. |
| `men-nut-2` | Alimentație | Lichide și mese calde | Apa și ceaiurile calde pot face balonarea și crampele mai ușor de dus. Dacă ai poftă de dulce, o gustare cu proteine ține foamea departe mai mult timp. |
| `men-mov-1` | Mișcare | Mișcare blândă | Plimbările, întinderile sau yoga ușoară reduc disconfortul pentru unele persoane. Dacă ai chef de antrenamentul obișnuit, nu există un motiv general să îl eviți. |
| `men-mov-2` | Mișcare | Odihna contează | În zilele cu flux abundent sau cu crampe puternice, odihna face la fel de mult ca mișcarea. |
| `men-sle-1` | Somn | Căldură înainte de culcare | O sticlă cu apă caldă pe abdomen sau un duș cald pot relaxa mușchii și pot ușura adormitul. |
| `men-sle-2` | Somn | Ore regulate | Mergi la culcare și trezește-te la ore apropiate de cele obișnuite. Oboseala din primele zile se resimte mai puțin după un somn regulat. |
| `men-ski-1` | Piele | Rutină simplă | Pielea poate fi mai sensibilă și mai uscată. Un produs de curățare blând și o cremă hidratantă sunt de ajuns. |
| `men-ski-2` | Piele | Amână tratamentele agresive | Epilarea cu ceară sau exfolierea puternică pot fi mai dureroase în aceste zile. Dacă poți, programează-le mai târziu. |

### Faza foliculară

**Pe scurt:** După menstruație, estrogenul crește treptat. Multe persoane simt mai multă energie și o dispoziție mai bună.

| ID | Temă | Titlu | Text |
|---|---|---|---|
| `fol-nut-1` | Alimentație | Farfurie variată | Legume, cereale integrale, proteine și grăsimi bune. Nu există o dietă specială pentru această fază; contează varietatea. |
| `fol-nut-2` | Alimentație | Proteine la fiecare masă | Dacă faci mai multă mișcare, proteinele din ouă, lactate, leguminoase, pește sau carne susțin refacerea mușchilor. |
| `fol-mov-1` | Mișcare | Un moment bun pentru efort | Dacă simți mai multă energie, poți încerca antrenamente mai intense sau ceva nou: alergare, exerciții de forță, dans. |
| `fol-mov-2` | Mișcare | Crește treptat | Mărește durata sau intensitatea pas cu pas, ca să eviți accidentările. |
| `fol-sle-1` | Somn | Păstrează ritmul | Chiar dacă ai energie, șapte până la nouă ore de somn rămân reperul pentru majoritatea adulților. |
| `fol-sle-2` | Somn | Lumină dimineața | Lumina naturală în prima parte a zilei ajută ceasul intern și adormitul de seara. |
| `fol-ski-1` | Piele | Hidratare și protecție solară | Pielea este adesea mai echilibrată acum. O cremă hidratantă și protecția solară zilnică sunt baza. |
| `fol-ski-2` | Piele | Produse noi, pe rând | Dacă vrei să încerci un produs nou, introdu câte unul, ca să vezi cum reacționează pielea. |

### Ovulație

**Pe scurt:** În jurul ovulației, estrogenul atinge un vârf. Unele persoane se simt pline de energie; altele simt o durere scurtă într-o parte a abdomenului sau observă secreții mai abundente și elastice.

| ID | Temă | Titlu | Text |
|---|---|---|---|
| `ovu-nut-1` | Alimentație | Apă pe parcursul zilei | Temperatura corpului crește ușor după ovulație. Bea apă regulat, mai ales dacă faci mișcare. |
| `ovu-nut-2` | Alimentație | Fibre | Legumele, fructele și cerealele integrale susțin digestia, care se poate schimba ușor în aceste zile. |
| `ovu-mov-1` | Mișcare | Folosește energia | Dacă te simți în formă, este un moment bun pentru antrenamente mai solicitante sau pentru activități în grup. |
| `ovu-mov-2` | Mișcare | Încălzire atentă | Fă o încălzire bună înainte de efortul intens și oprește-te dacă apare o durere neobișnuită. |
| `ovu-sle-1` | Somn | Cameră răcoroasă | Dacă îți este mai cald noaptea, aerisește înainte de culcare și alege așternuturi ușoare. |
| `ovu-sle-2` | Somn | Rutină de seară | Lasă ecranele cu o jumătate de oră înainte de culcare, mai ales dacă energia de peste zi te ține în priză. |
| `ovu-ski-1` | Piele | Curățare blândă | Pielea poate produce mai mult sebum. Curăță fața dimineața și seara, fără să freci. |
| `ovu-ski-2` | Piele | Produse care nu încarcă porii | Dacă observi pori încărcați, alege produse non-comedogenice. |

### Faza luteală

**Pe scurt:** După ovulație crește progesteronul. Spre finalul fazei, unele persoane observă balonare, sensibilitate la sâni, pofte sau schimbări de dispoziție. Sunt frecvente, dar nu trebuie să fie greu de îndurat.

| ID | Temă | Titlu | Text |
|---|---|---|---|
| `lut-nut-1` | Alimentație | Mese regulate | Mesele la ore regulate, cu proteine și fibre, pot tempera poftele și variațiile de energie. |
| `lut-nut-2` | Alimentație | Mai puțină sare, cafea și alcool | Pentru unele persoane, reducerea lor în zilele dinaintea menstruației diminuează balonarea, sensibilitatea sânilor și iritabilitatea. |
| `lut-mov-1` | Mișcare | Efort moderat | Mersul pe jos, înotul sau bicicleta pot ajuta dispoziția și balonarea. Dacă energia scade, alege un efort mai ușor. |
| `lut-mov-2` | Mișcare | Întinderi și respirație | Câteva minute de întinderi sau de respirație lentă pot reduce tensiunea din zilele dinaintea menstruației. |
| `lut-sle-1` | Somn | Mai mult timp pentru somn | Somnul poate fi mai agitat înainte de menstruație. Culcă-te ceva mai devreme și evită cafeaua după-amiaza. |
| `lut-sle-2` | Somn | Pune gândurile pe hârtie | Dacă mintea nu se oprește seara, notează ce te preocupă înainte de culcare. |
| `lut-ski-1` | Piele | Atenție la erupții | Înainte de menstruație pot apărea coșuri. Produsele cu acid salicilic sau cu peroxid de benzoil pot ajuta; folosește-le conform prospectului. |
| `lut-ski-2` | Piele | Nu stoarce coșurile | Atinsul și storsul pot lăsa urme. Dacă acneea te deranjează constant, un dermatolog poate recomanda un tratament. |

## 3. Sfaturi pe simptome

Un simptom primește o fișă de sfaturi dacă a fost notat în ultimele 3 zile sau în cel puțin 2 din ultimele 14 zile. Fișele sunt ordonate după numărul de zile în care simptomul a fost notat.

### Durere

#### Crampe (`cramps`)

**Ce poate ajuta**

- Căldură pe abdomen sau pe zona lombară: o sticlă cu apă caldă, o pernă electrică sau un duș cald.
- Mișcare ușoară, cum ar fi mersul pe jos sau întinderile.
- Unele persoane observă o ameliorare cu magneziu sau cu un calmant obișnuit. Cere sfatul farmacistului sau al medicului înainte, mai ales dacă iei și alte medicamente.

**Când merită să ceri sfatul unui medic:** Dacă durerea te împiedică să îți vezi de zi, nu cedează la calmantele obișnuite, s-a schimbat față de cum o știai sau apare și în afara menstruației.

#### Dureri de cap (`headache`)

**Ce poate ajuta**

- Apă și o masă la timp: deshidratarea și foamea sunt declanșatori frecvenți.
- Odihnă într-o cameră liniștită și întunecată; o compresă rece pe frunte sau pe ceafă.
- Notează când apar durerile. Dacă vin în aceleași zile ale ciclului, tiparul îi este util medicului.

**Când merită să ceri sfatul unui medic:** Dacă durerile sunt frecvente sau foarte puternice, ori vin cu tulburări de vedere, amorțeli sau greață. Pentru o durere bruscă și neobișnuit de intensă, sună la 112.

#### Dureri de spate (`backache`)

**Ce poate ajuta**

- Căldură pe zona lombară.
- Întinderi blânde și schimbarea poziției, dacă stai mult pe scaun.
- O plimbare scurtă poate relaxa musculatura.

**Când merită să ceri sfatul unui medic:** Dacă durerea persistă după menstruație, coboară pe picior, vine cu febră sau cu probleme la urinare.

#### Sensibilitate la sâni (`breast_tenderness`)

**Ce poate ajuta**

- Un sutien comod, cu susținere bună, inclusiv la efort.
- Pentru unele persoane ajută mai puțină cafea și mai puțină sare în zilele dinaintea menstruației.
- Comprese calde sau reci, după cum te simți mai bine.

**Când merită să ceri sfatul unui medic:** Dacă simți un nodul, observi secreții din mamelon sau schimbări ale pielii, ori dacă sensibilitatea nu trece după menstruație.

### Digestie

#### Balonare (`bloating`)

**Ce poate ajuta**

- Mese mai mici și mai dese, mâncate fără grabă.
- Mai puțină sare și mai puține băuturi carbogazoase; mai multă apă.
- O plimbare după masă ajută digestia.

**Când merită să ceri sfatul unui medic:** Dacă balonarea este prezentă aproape zilnic timp de câteva săptămâni ori vine cu dureri, scădere în greutate sau schimbări ale tranzitului.

#### Greață (`nausea`)

**Ce poate ajuta**

- Mese mici și dese, cu alimente simple: pâine prăjită, orez, banane.
- Ghimbir sau ceai de mentă, în înghițituri mici.
- Aer proaspăt și evitarea mirosurilor puternice.

**Când merită să ceri sfatul unui medic:** Dacă greața durează mai multe zile ori vine cu vărsături repetate sau dureri puternice. Dacă este posibilă o sarcină, un test te poate lămuri.

#### Constipație (`constipation`)

**Ce poate ajuta**

- Mai multe fibre: legume, fructe, cereale integrale, leguminoase.
- Apă suficientă pe parcursul zilei.
- Mișcare zilnică, fie și o plimbare.

**Când merită să ceri sfatul unui medic:** Dacă durează mai mult de două-trei săptămâni, vine cu dureri puternice sau observi sânge în scaun.

#### Diaree (`diarrhea`)

**Ce poate ajuta**

- Lichide în cantitate suficientă, ca să eviți deshidratarea.
- Alimente ușoare: orez, banane, pâine prăjită, supă.
- Evită pentru moment cafeaua, alcoolul și mâncarea foarte grasă.

**Când merită să ceri sfatul unui medic:** Dacă durează mai mult de două-trei zile ori vine cu febră, sânge în scaun sau semne de deshidratare.

#### Pofte alimentare (`cravings`)

**Ce poate ajuta**

- Mese regulate, cu proteine și fibre, ca să nu ajungi la foame mare.
- Dacă ai poftă de dulce, combină-l cu ceva sățios: fructe cu iaurt, ciocolată neagră cu nuci.
- Poftele dinaintea menstruației sunt frecvente. Nu ai de ce să te învinovățești pentru ele.

**Când merită să ceri sfatul unui medic:** Dacă relația cu mâncarea îți provoacă suferință sau simți că pierzi controlul asupra meselor. Un medic sau un psiholog te poate ajuta.

### Piele

#### Acnee (`acne`)

**Ce poate ajuta**

- Curăță fața blând, de două ori pe zi, și nu stoarce coșurile.
- Alege produse non-comedogenice. Cele cu acid salicilic sau cu peroxid de benzoil pot ajuta, folosite conform prospectului.
- Schimbă des fața de pernă și demachiază-te înainte de culcare.

**Când merită să ceri sfatul unui medic:** Dacă acneea este dureroasă, lasă urme sau nu se ameliorează în câteva săptămâni. Un dermatolog poate recomanda un tratament.

### Stare generală

#### Oboseală (`fatigue`)

**Ce poate ajuta**

- Somn la ore regulate și, dacă se poate, o pauză scurtă peste zi.
- Mese echilibrate, cu alimente bogate în fier, mai ales în zilele de menstruație.
- Mișcare ușoară: uneori dă mai multă energie decât odihna prelungită.

**Când merită să ceri sfatul unui medic:** Dacă oboseala ține săptămâni la rând, nu trece cu odihnă sau vine cu amețeli, paloare ori menstruații abundente. Analizele de sânge pot arăta, de exemplu, o lipsă de fier.

#### Insomnie (`insomnia`)

**Ce poate ajuta**

- Ore fixe de culcare și de trezire, inclusiv în weekend.
- Fără cafea după-amiaza și fără ecrane în ultima jumătate de oră dinainte de somn.
- O cameră răcoroasă, întunecată și liniștită.

**Când merită să ceri sfatul unui medic:** Dacă dormi prost de cel puțin trei ori pe săptămână, mai multe săptămâni la rând, sau dacă lipsa somnului îți afectează ziua.

#### Amețeli (`dizziness`)

**Ce poate ajuta**

- Așază-te sau întinde-te până trece și ridică-te încet.
- Bea apă și mănâncă ceva, dacă a trecut mult de la ultima masă.
- Notează când apare: legătura cu menstruația sau cu mesele îi este utilă medicului.

**Când merită să ceri sfatul unui medic:** Dacă amețelile se repetă ori vin cu palpitații sau cu menstruații abundente. Pentru leșin sau dureri în piept, sună la 112.

### Emoții

#### Iritabilitate (`irritability`)

**Ce poate ajuta**

- Pauze scurte peste zi și câteva respirații lente când simți că se adună tensiunea.
- Mișcare: chiar și douăzeci de minute de mers pot schimba starea.
- Spune-le celor apropiați că treci prin zile mai grele. Ajută să nu duci totul în tăcere.

**Când merită să ceri sfatul unui medic:** Dacă iritabilitatea dinaintea menstruației îți afectează în mod repetat relațiile sau munca.

#### Anxietate (`anxiety`)

**Ce poate ajuta**

- Respirație lentă: inspiră patru secunde, expiră șase, timp de câteva minute.
- Mai puțină cafea și mai puțin alcool, care pot accentua neliniștea.
- Mișcare și timp petrecut afară.

**Când merită să ceri sfatul unui medic:** Dacă anxietatea este prezentă în majoritatea zilelor, vine cu atacuri de panică sau te împiedică să faci lucruri obișnuite. Un medic sau un psiholog te poate ajuta.

#### Tristețe (`sadness`)

**Ce poate ajuta**

- Vorbește cu cineva în care ai încredere.
- Păstrează câteva repere simple: mese, somn, puțină mișcare, lumină naturală.
- Ai răbdare cu tine. Stările dinaintea menstruației sunt reale și, de cele mai multe ori, trec.

**Când merită să ceri sfatul unui medic:** Dacă tristețea durează mai mult de două săptămâni, revine puternic înaintea fiecărei menstruații sau îți ia cheful de lucrurile care îți plăceau. Dacă ai gânduri de a-ți face rău, sună la 112 sau mergi la cea mai apropiată unitate de primiri urgențe.

#### Schimbări de dispoziție (`mood_swings`)

**Ce poate ajuta**

- Notează-le în jurnal: după două-trei cicluri poți vedea dacă apar în aceleași zile.
- Somn suficient, mese regulate și mișcare, mai ales în a doua parte a ciclului.
- Dacă poți, planifică lucrurile solicitante în zilele în care știi că te simți mai bine.

**Când merită să ceri sfatul unui medic:** Dacă schimbările de dispoziție sunt puternice, apar aproape la fiecare ciclu și îți afectează viața de zi cu zi. Există tratament și sprijin pentru simptomele premenstruale severe.

## 4. Semnalizări: simptome neobișnuite sau persistente

O semnalizare spune ce s-a înregistrat și invită la o discuție cu un medic. Nu numește nicio afecțiune.
Persoana o poate ascunde („Am înțeles”); dacă regula este încă îndeplinită, reapare după 30 de zile.
Pragurile urmează descrierile FIGO pentru frecvența, regularitatea și durata sângerării menstruale și sunt definite într-un singur loc (`THRESHOLDS` în `src/domain/insights.ts`). **Trebuie validate medical.**

| Semnalizare | Tip | Regulă de declanșare | Titlu | Mesaj (exemplu cu valori) |
|---|---|---|---|---|
| `cycle_short` | de discutat cu un medic | Cel puțin 2 dintre ultimele 6 cicluri valide au durat mai puțin de 24 de zile. | Cicluri scurte | 2 dintre ultimele cicluri au durat mai puțin de 24 de zile. Ciclurile scurte care se repetă merită discutate cu un medic ginecolog. |
| `cycle_long` | de discutat cu un medic | Cel puțin 2 dintre ultimele 6 cicluri valide au durat mai mult de 38 de zile. | Cicluri lungi | 2 dintre ultimele cicluri au durat mai mult de 38 de zile. Ciclurile lungi care se repetă merită discutate cu un medic ginecolog. |
| `cycle_irregular` | de discutat cu un medic | Există cel puțin 3 cicluri valide, iar diferența dintre cel mai lung și cel mai scurt dintre ultimele 6 este mai mare de 9 zile. | Cicluri cu durată variabilă | Ultimele cicluri au avut între 24 și 36 de zile. Variațiile mari pot apărea în anumite perioade ale vieții, dar merită menționate la un control. Estimările sunt mai puțin precise în această situație. |
| `period_long` | de discutat cu un medic | Cel puțin 2 dintre ultimele 6 menstruații au durat mai mult de 8 zile. | Menstruații lungi | 2 dintre ultimele menstruații au durat mai mult de 8 zile. Sângerările prelungite merită discutate cu un medic. |
| `period_heavy` | de discutat cu un medic | La fiecare dintre ultimele două menstruații încheiate, fluxul „abundent” a fost notat în cel puțin 3 zile. | Flux abundent mai multe zile la rând | La ultimele două menstruații ai notat flux abundent în cel puțin 3 zile. Dacă schimbi foarte des absorbantul, observi cheaguri mari sau simți o oboseală accentuată, vorbește cu un medic. |
| `no_period` | de discutat cu un medic | Ciclul curent a depășit 90 de zile. | Nicio menstruație notată de mult timp | Au trecut 95 de zile de la ultima menstruație notată. Dacă nu este vorba doar despre zile rămase nenotate, lipsa menstruației timp de peste trei luni merită discutată cu un medic. Dacă este posibilă o sarcină, un test te poate lămuri. |
| `period_late` | informativ | Ziua de azi a trecut de capătul intervalului estimat pentru următoarea menstruație, iar ciclul are cel mult 90 de zile. | Menstruația întârzie | Menstruația întârzie cu 6 zile față de estimare. Întârzierile au multe cauze posibile: stres, schimbări de program, boală, efort intens, sarcină. Dacă este posibilă o sarcină, un test te poate lămuri. |
| `bleeding_between` | de discutat cu un medic | În cel puțin 2 dintre ultimele 3 cicluri există spotting sau sângerare la mai mult de 2 zile distanță de o menstruație. | Sângerări între menstruații | Ai notat sângerări între menstruații în 2 dintre ultimele cicluri. Când se repetă, merită discutate cu un medic ginecolog. |
| `symptom_severe` | de discutat cu un medic | Un simptom a fost notat cu intensitate „sever” în cel puțin 2 zile din ultimele 30. | Crampe, cu intensitate severă | Ai notat „crampe” cu intensitate severă în 2 zile din ultimele 30. Nu este ceva ce trebuie doar îndurat: un medic te poate ajuta să afli cauza și ce opțiuni ai. |
| `symptom_persistent` | de discutat cu un medic | Un simptom a fost notat în cel puțin 7 din ultimele 14 zile (și nu îndeplinește deja regula de intensitate severă). | Crampe, aproape zilnic | Ai notat „crampe” în 8 zile din ultimele 14. Când un simptom ține atât de mult, merită discutat cu un medic. |
| `symptom_new` | informativ | Jurnalul are cel puțin 60 de zile, iar simptomul a fost notat în cel puțin 3 din ultimele 14 zile și deloc în cele 90 de zile dinainte. | Crampe, un simptom nou în jurnal | Ai notat „crampe” în 3 zile din ultimele 14, deși nu apărea în jurnal în lunile dinainte. Urmărește cum evoluează; dacă persistă sau te îngrijorează, cere sfatul unui medic. |
| `low_mood` | de discutat cu un medic | Dispoziția a fost notată „scăzută” sau „foarte scăzută” în cel puțin 7 din ultimele 14 zile. | Dispoziție scăzută în multe zile | Ai notat o dispoziție scăzută în 7 zile din ultimele 14. Nu este nevoie să treci prin asta fără sprijin: un medic sau un psiholog te poate ajuta. Dacă ai gânduri de a-ți face rău, sună la 112. |

## 5. Avertismente fixe

Aceste texte însoțesc orice estimare și nu pot fi ascunse de conținutul editorial.

| Unde apare | Text |
|---|---|
| Lângă orice estimare de fertilitate (Azi, Calendar) | Zilele fertile și ovulația sunt estimări. Nu sunt un mijloc sigur de contracepție. |
| La alegerea obiectivului „Contracepție” și, după aceea, în locul avertismentului scurt | CycleCare nu este un mijloc de contracepție. Estimările zilelor fertile pot greși cu mai multe zile și nu pot preveni o sarcină. Un medic te poate ajuta să alegi o metodă potrivită. |
| La finalul ecranului „Sfaturi” | Sfaturile sunt informații generale, nu recomandări medicale, și nu înlocuiesc discuția cu un medic. Dacă ceva te îngrijorează, cere o părere de specialitate. |
| Despre CycleCare | CycleCare este un instrument de urmărire și informare. Nu este un dispozitiv medical, nu pune diagnostice și nu poate fi folosit ca metodă de contracepție. |
| Despre CycleCare | Estimările pornesc de la datele pe care le notezi și presupun cicluri naturale. Sunt mai puțin de încredere în primele luni de folosire, la cicluri neregulate, în timpul contracepției hormonale, după naștere, în perioada de alăptare și la perimenopauză. |

## 6. Șablon gol pentru conținut nou

```ts
// Sfat pe fază
{ id: '<faza>-<tema>-<nr>', title: '<titlu scurt>', body: '<1–2 propoziții, fără promisiuni>' }

// Fișă de simptom
<simptom>: {
  helps: ['<sugestie 1>', '<sugestie 2>', '<sugestie 3, opțional>'],
  doctor: '<semnele concrete pentru care merită cerut sfatul unui medic>',
}

// Semnalizare
<regulă>: {
  title: (numeSimptom) => '<ce s-a observat, pe scurt>',
  body: (valori, numeSimptom, zile) => '<ce s-a înregistrat, cu cifre> + <invitația de a discuta cu un medic>',
}
```

### Listă de verificare înainte de publicare

- [ ] Textul a fost validat de un medic (nume, specialitate, dată).
- [ ] Nu conține diagnostice, doze sau promisiuni de rezultat.
- [ ] Îndemnul către medic numește semne concrete.
- [ ] Formulările sunt neutre ca gen și la persoana a II-a singular.
- [ ] Identificatorul este unic și nu a fost refolosit pentru alt text.
- [ ] Documentul a fost regenerat (`npm run docs:content`).
