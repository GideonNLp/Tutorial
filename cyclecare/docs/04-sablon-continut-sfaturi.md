# Șablon de conținut: sfaturi pe faze și pe simptome

> **Statut: schiță redacțională, nevalidată medical.** Fiecare text trebuie revizuit de un medic înainte de lansare.
> Versiunea conținutului: `2026-11-schita-2`.
>
> Document generat din `src/content/ro/tips.ts` cu `npm run docs:content`. Nu îl edita direct: schimbă fișierul sursă și regenerează. Aplicația afișează exact aceste texte.

## 1. Cum se folosește șablonul

Conținutul are trei părți, fiecare cu o structură fixă:

| Parte | Când apare în aplicație | Structură |
|---|---|---|
| Sfaturi pe faze | Ecranul „Sfaturi” (faza curentă este preselectată) și „Un sfat pentru azi” pe ecranul principal | pentru fiecare fază: un rezumat și o explicație hormonală („De ce se întâmplă asta?”); 4 teme (alimentație, mișcare, somn, piele) × 7 sfaturi; fiecare sfat are identificator, titlu, text și explicația „De ce ajută?” |
| Sfaturi pe simptome | Ecranul „Sfaturi”, pentru simptomele notate recent | pentru fiecare simptom: 2–3 sugestii („Ce poate ajuta”) și un paragraf „Când merită să ceri sfatul unui medic” |
| Semnalizări | Ecranele „Azi” și „Sfaturi”, când o regulă este îndeplinită | titlu și mesaj cu valori completate automat; fiecare are o regulă de declanșare |

Pentru o limbă nouă se copiază fișierele în `src/content/<limbă>/` (`tips.ts` și `phaseTips.ts`) și se traduc textele, păstrând identificatorii.

### Cum sunt afișate sfaturile pe faze

- Ecranul „Sfaturi” arată câte **3 sfaturi** din cele 7 ale temei alese, sub formă de carduri. Setul se alege după ziua ciclului (fără ciclu cunoscut, după dată): în zile consecutive începe din locuri diferite, așa că același set revine abia după o săptămână. Butonul „Alte idei ↻” trece la setul următor.
- Fiecare card are tema (cu pictogramă), titlul, textul, explicația „De ce ajută?” (închisă până la apăsare) și butonul „Am aplicat ✓”, care marchează sfatul pentru ziua de azi. Marcajele se păstrează criptat, cu jurnalul, și sunt uitate după 60 de zile.
- Rezumatul fazei apare într-un card colorat în culoarea fazei, cu explicația „De ce se întâmplă asta?”.

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
| `why` | da | „De ce ajută?”: legătura cu hormonii din fază, 1–2 propoziții, fără promisiuni |
| revizuit de / data | la lansare | De adăugat în fluxul editorial: cine a validat medical textul și când |
| sursă | recomandat | Ghidul sau sursa pe care se sprijină afirmația |

## 2. Sfaturi pe faze

### Menstruație

**Pe scurt:** Corpul elimină mucoasa uterului, iar nivelul hormonilor este scăzut. Multe persoane au mai puțină energie în primele zile. E în regulă să încetinești.

**De ce se întâmplă asta?** La începutul ciclului, estrogenul și progesteronul sunt la cel mai scăzut nivel. Scăderea progesteronului de la finalul ciclului trecut declanșează eliminarea mucoasei uterului. Uterul se contractă cu ajutorul unor substanțe numite prostaglandine, care pot da și crampe. Spre finalul menstruației, estrogenul începe din nou să crească.

| ID | Temă | Titlu | Text | De ce ajută? |
|---|---|---|---|---|
| `men-nut-1` | Alimentație | Alimente bogate în fier | Lintea, fasolea, spanacul, ouăle sau carnea roșie pot ajuta la refacerea fierului pierdut prin sângerare. Vitamina C din legume și fructe îi ajută absorbția. | Prin sângerare se pierde și fier. Cu hormonii la nivel scăzut, oboseala se simte mai ușor, iar fierul ajută la transportul oxigenului în corp. |
| `men-nut-2` | Alimentație | Lichide și mese calde | Apa și ceaiurile calde pot face balonarea și crampele mai ușor de dus. Dacă ai poftă de dulce, o gustare cu proteine ține foamea departe mai mult timp. | Prostaglandinele care contractă uterul pot schimba și ritmul digestiei. Lichidele și mâncarea caldă sunt mai ușor de tolerat de un abdomen sensibil. |
| `men-nut-3` | Alimentație | Pește gras sau nuci în meniu | Somonul, sardinele, nucile sau semințele de in aduc grăsimi omega-3. O porție de câteva ori pe săptămână este un reper bun. | Grăsimile omega-3 participă la reglarea inflamației. Unele studii arată că pot face mai blânde crampele, care sunt legate de prostaglandine. |
| `men-nut-4` | Alimentație | Gustări cu magneziu | Semințele de dovleac, migdalele, banana sau ciocolata neagră sunt gustări bogate în magneziu. | Magneziul ajută mușchii să se relaxeze, inclusiv musculatura uterului. Pentru unele persoane, asta înseamnă crampe mai ușoare. |
| `men-nut-5` | Alimentație | O cană de ceai de ghimbir | Ceaiul de ghimbir sau de mușețel poate fi o pauză caldă și liniștitoare în zilele cu crampe. | Ghimbirul pare să reducă producția de prostaglandine, iar căldura băuturii relaxează. Efectul este modest, dar unele persoane îl simt. |
| `men-nut-6` | Alimentație | Mai puțină sare în primele zile | Mâncarea foarte sărată poate accentua balonarea. Condimentează cu ierburi, lămâie sau usturoi. | Scăderea hormonilor de la finalul ciclului face corpul să rețină mai multă apă, iar sarea adaugă la această retenție. |
| `men-nut-7` | Alimentație | Mese mici, mai dese | Dacă pofta de mâncare scade sau apare greața, mesele mici la câteva ore distanță sunt mai ușor de dus. | Prostaglandinele din aceste zile pot da greață sau pot tăia pofta de mâncare. Mesele mici păstrează energia constantă fără să încarce stomacul. |
| `men-mov-1` | Mișcare | Mișcare blândă | Plimbările, întinderile sau yoga ușoară reduc disconfortul pentru unele persoane. Dacă ai chef de antrenamentul obișnuit, nu există un motiv general să îl eviți. | Mișcarea ușoară crește circulația în zona bazinului și eliberează endorfine, analgezicele naturale ale corpului, care pot contrabalansa crampele. |
| `men-mov-2` | Mișcare | Odihna contează | În zilele cu flux abundent sau cu crampe puternice, odihna face la fel de mult ca mișcarea. | Cu estrogenul și progesteronul la minim, multe persoane au mai puțină energie în primele zile. Corpul își revine mai repede dacă îl lași să se odihnească. |
| `men-mov-3` | Mișcare | Plimbare de 20 de minute | O plimbare în ritm lejer, de preferat afară, poate ușura crampele și ridica moralul. | Mersul eliberează endorfine și relaxează musculatura, iar lumina naturală susține dispoziția când hormonii sunt la cel mai scăzut nivel. |
| `men-mov-4` | Mișcare | Întinderi pentru spate și șolduri | Poziția copilului, pisica-vaca sau genunchii la piept, câte 30 de secunde fiecare, pot detensiona zona lombară. | Contracțiile uterului, produse de prostaglandine, se simt adesea și în spate și în coapse. Întinderile relaxează mușchii din jur. |
| `men-mov-5` | Mișcare | Respiră cu abdomenul | Inspiră lent pe nas cinci secunde, lasă abdomenul să se umfle, apoi expiră pe gură șase secunde. Repetă câteva minute. | Respirația lentă calmează sistemul nervos și poate reduce felul în care simți durerea în zilele în care prostaglandinele contractă uterul. |
| `men-mov-6` | Mișcare | Antrenează-te după energie | Dacă te simți bine, antrenamentul obișnuit e în regulă. Dacă nu, scurtează-l sau alege o variantă mai ușoară. | Nivelul scăzut de hormoni nu afectează pe toată lumea la fel. Unele persoane au chiar mai multă energie spre finalul menstruației, când estrogenul începe să crească. |
| `men-mov-7` | Mișcare | Înot sau bicicletă ușoară | Mișcările ritmice, fără sărituri, sunt adesea mai confortabile în zilele cu flux abundent. | Mișcarea ritmică ușoară susține circulația și eliberează endorfine fără să solicite abdomenul sensibil în zilele în care uterul se contractă. |
| `men-sle-1` | Somn | Căldură înainte de culcare | O sticlă cu apă caldă pe abdomen sau un duș cald pot relaxa mușchii și pot ușura adormitul. | Căldura relaxează musculatura uterului și reduce crampele produse de prostaglandine, care altfel te pot trezi noaptea. |
| `men-sle-2` | Somn | Ore regulate | Mergi la culcare și trezește-te la ore apropiate de cele obișnuite. Oboseala din primele zile se resimte mai puțin după un somn regulat. | Când hormonii sunt la minim, oboseala se simte mai puternic. Un program regulat ajută ceasul intern să compenseze. |
| `men-sle-3` | Somn | Dormi pe o parte, cu o pernă | Somnul pe o parte, cu o pernă între genunchi, poate reduce presiunea pe abdomen și pe spate. | Poziția ușor ghemuită relaxează mușchii abdominali din jurul uterului, care se contractă în aceste zile. |
| `men-sle-4` | Somn | Protecție potrivită pentru noapte | Un absorbant de noapte, o cupă sau lenjerie menstruală potrivită fluxului tău te scutesc de treziri ca să verifici. | Fluxul este de obicei mai abundent în primele două zile, după scăderea bruscă a progesteronului. Protecția potrivită înseamnă un somn neîntrerupt. |
| `men-sle-5` | Somn | Cameră răcoroasă și întunecată | O cameră în jur de 18–19 °C și întunericul complet ajută la un somn mai adânc. | Fără progesteron, temperatura corpului este mai joasă în aceste zile. O cameră răcoroasă ajută corpul să intre ușor în somnul profund. |
| `men-sle-6` | Somn | Un pui de somn scurt | Dacă oboseala e mare, un pui de somn de 20 de minute, înainte de ora 15, te poate reface fără să strice somnul de noapte. | Pierderea de sânge și nivelul scăzut de hormoni pot face primele zile mai obositoare. Un somn scurt reîncarcă fără să tulbure ritmul de noapte. |
| `men-sle-7` | Somn | Fără cafeină după-amiaza | Cafeaua, ceaiul negru sau băuturile energizante după ora 14 pot îngreuna adormitul. | Cafeina strânge vasele de sânge și poate accentua crampele pentru unele persoane, iar efectul ei de trezire durează multe ore. |
| `men-ski-1` | Piele | Rutină simplă | Pielea poate fi mai sensibilă și mai uscată. Un produs de curățare blând și o cremă hidratantă sunt de ajuns. | Cu estrogenul la minim, pielea produce mai puține substanțe hidratante și poate deveni mai uscată și mai sensibilă. |
| `men-ski-2` | Piele | Amână tratamentele agresive | Epilarea cu ceară sau exfolierea puternică pot fi mai dureroase în aceste zile. Dacă poți, programează-le mai târziu. | Sensibilitatea la durere tinde să fie mai mare în timpul menstruației, iar pielea reacționează mai ușor la iritații când hormonii sunt la minim. |
| `men-ski-3` | Piele | Cremă mai bogată seara | Dacă pielea se simte trasă, folosește seara o cremă cu ceramide sau glicerină. | Estrogenul ajută pielea să rețină apa. Când este la cel mai scăzut nivel, bariera pielii pierde mai multă umezeală. |
| `men-ski-4` | Piele | Apă și somn împotriva cearcănelor | Lichidele suficiente și somnul regulat pot reduce aspectul obosit din primele zile. | Pierderea de sânge și nivelul scăzut de hormoni se pot vedea pe piele ca paloare sau cearcăne mai vizibile. |
| `men-ski-5` | Piele | Spală-ți fața după sport | Transpirația lăsată pe piele poate irita, mai ales când pielea este mai sensibilă. | Pielea este mai reactivă în aceste zile, pentru că estrogenul, care o protejează, este la cel mai scăzut nivel. |
| `men-ski-6` | Piele | Grijă blândă pentru zona intimă | Schimbă absorbantul sau tamponul regulat și spală zona doar cu apă sau cu un produs blând, fără parfum. | Sângele schimbă temporar aciditatea zonei intime, iar parfumurile și frecarea pot irita pielea mai sensibilă din aceste zile. |
| `men-ski-7` | Piele | Buze și mâini hidratate | Un balsam de buze și o cremă de mâini la îndemână ajută pielea uscată. | Uscăciunea vine din nivelul scăzut de estrogen, care în restul ciclului ajută pielea să păstreze apa. |

### Faza foliculară

**Pe scurt:** După menstruație, estrogenul crește treptat. Multe persoane simt mai multă energie și o dispoziție mai bună.

**De ce se întâmplă asta?** După menstruație, glanda hipofiză trimite hormonul FSH către ovare, unde se maturizează foliculii. Aceștia produc estrogen, care crește de la o zi la alta. Estrogenul reface mucoasa uterului și influențează și creierul: multe persoane observă mai multă energie, concentrare și o dispoziție mai bună.

| ID | Temă | Titlu | Text | De ce ajută? |
|---|---|---|---|---|
| `fol-nut-1` | Alimentație | Farfurie variată | Legume, cereale integrale, proteine și grăsimi bune. Nu există o dietă specială pentru această fază; contează varietatea. | În această fază corpul își reface rezervele după menstruație și construiește noua mucoasă a uterului, sub acțiunea estrogenului. Varietatea îi dă tot ce îi trebuie. |
| `fol-nut-2` | Alimentație | Proteine la fiecare masă | Dacă faci mai multă mișcare, proteinele din ouă, lactate, leguminoase, pește sau carne susțin refacerea mușchilor. | Cu estrogenul în creștere, multe persoane au energie pentru mai multă mișcare, iar proteinele ajută mușchii să se refacă după efort. |
| `fol-nut-3` | Alimentație | Încearcă un aliment nou | Alege o legumă sau o rețetă pe care n-ai mai gătit-o. Energia și curiozitatea sunt adesea mai mari acum. | Estrogenul stimulează dopamina, care susține motivația și curiozitatea. E un moment bun pentru obiceiuri noi. |
| `fol-nut-4` | Alimentație | Alimente fermentate | Iaurtul, chefirul, varza murată sau murăturile în saramură pot susține flora intestinală. | Intestinul participă la eliminarea estrogenului folosit de corp. O floră intestinală echilibrată ajută acest proces să decurgă normal. |
| `fol-nut-5` | Alimentație | Refă rezerva de fier | Mai păstrează câteva zile leguminoasele, verdețurile sau carnea, alături de legume crude bogate în vitamina C. | Imediat după menstruație rezervele de fier pot fi mai mici, iar corpul are nevoie de el pentru energia care crește odată cu estrogenul. |
| `fol-nut-6` | Alimentație | Carbohidrați buni înainte de sport | Ovăzul, pâinea integrală sau cartofii dulci, cu o oră-două înainte de antrenament, dau energie constantă. | În faza foliculară sensibilitatea la insulină tinde să fie mai bună, așa că mușchii folosesc eficient carbohidrații. |
| `fol-nut-7` | Alimentație | Semințe în iaurt sau salată | O lingură de semințe de in, dovleac sau floarea-soarelui adaugă fibre și grăsimi bune. | Fibrele ajută intestinul să elimine estrogenul folosit, iar grăsimile bune sunt materia primă din care corpul produce hormoni. |
| `fol-mov-1` | Mișcare | Un moment bun pentru efort | Dacă simți mai multă energie, poți încerca antrenamente mai intense sau ceva nou: alergare, exerciții de forță, dans. | Estrogenul în creștere susține energia, rezistența și refacerea mușchilor, așa că efortul mai mare poate părea mai ușor acum. |
| `fol-mov-2` | Mișcare | Crește treptat | Mărește durata sau intensitatea pas cu pas, ca să eviți accidentările. | Chiar dacă energia crește odată cu estrogenul, mușchii și tendoanele au nevoie de timp să se obișnuiască cu un efort nou. |
| `fol-mov-3` | Mișcare | Exerciții de forță | Două-trei antrenamente pe săptămână cu greutăți, benzi elastice sau greutatea corpului întăresc mușchii și oasele. | Estrogenul protejează mușchii și oasele. Multe persoane simt că progresează mai ușor la forță în această fază. |
| `fol-mov-4` | Mișcare | Încearcă un sport nou | O clasă de dans, un traseu nou de alergare sau un sport pe care l-ai tot amânat. | Estrogenul crește nivelul de dopamină și serotonină, care susțin motivația și dorința de a încerca lucruri noi. |
| `fol-mov-5` | Mișcare | Intervale scurte | Alternează un minut de efort intens cu două minute ușoare, de 5–6 ori, pe bicicletă sau la alergare. | În faza foliculară corpul pare să tolereze bine efortul intens și să se refacă repede după el. |
| `fol-mov-6` | Mișcare | Mișcare împreună cu cineva | Programează o plimbare, o drumeție sau un sport de echipă cu prietenii. | Pe măsură ce estrogenul crește, multe persoane se simt mai sociabile, iar mișcarea împreună e mai ușor de păstrat. |
| `fol-mov-7` | Mișcare | Notează-ți progresul | Scrie distanța, greutățile sau durata. Vei vedea cum variază forma ta de-a lungul ciclului. | Hormonii schimbă energia de la o fază la alta. Notițele te ajută să-ți planifici efortul după propriul tipar. |
| `fol-sle-1` | Somn | Păstrează ritmul | Chiar dacă ai energie, șapte până la nouă ore de somn rămân reperul pentru majoritatea adulților. | Estrogenul favorizează un somn odihnitor, dar energia de peste zi te poate tenta să te culci târziu. Un ritm stabil păstrează beneficiul. |
| `fol-sle-2` | Somn | Lumină dimineața | Lumina naturală în prima parte a zilei ajută ceasul intern și adormitul de seara. | Lumina de dimineață reglează melatonina și cortizolul, iar un ceas intern stabil sprijină și echilibrul hormonilor ciclului. |
| `fol-sle-3` | Somn | Cină cu ore înainte de somn | Încearcă să mănânci cu cel puțin două-trei ore înainte de culcare. | Ca să adormi, temperatura corpului scade puțin. În faza foliculară, fără progesteron, ea este deja mai joasă, iar o cină devreme nu o mai ridică. |
| `fol-sle-4` | Somn | Antrenamentele intense, mai devreme | Încheie efortul intens cu cel puțin trei ore înainte de culcare, ca să lași corpul să se liniștească. | Efortul intens crește temperatura și adrenalina. Cu energia mare adusă de estrogen, e tentant să te antrenezi seara târziu. |
| `fol-sle-5` | Somn | Un ritual scurt de seară | Aceeași succesiune în fiecare seară (duș, citit, lumină slabă) îi spune corpului că urmează somnul. | Un obicei stabil ajută creierul să elibereze melatonina la timp, iar ritmul format acum te ajută și în fazele în care somnul e mai fragil. |
| `fol-sle-6` | Somn | Telefonul departe de pat | Lasă telefonul să se încarce în altă cameră sau măcar departe de pat. | Lumina ecranelor întârzie melatonina. Cu energia ridicată adusă de estrogen, telefonul te poate ține în priză mai mult decât îți dai seama. |
| `fol-sle-7` | Somn | Recuperează somnul pierdut | Dacă ai dormit prost în zilele de menstruație, acum e momentul să recuperezi. | Estrogenul favorizează un somn mai profund și mai puțin întrerupt, așa că odihna din această fază e de obicei mai eficientă. |
| `fol-ski-1` | Piele | Hidratare și protecție solară | Pielea este adesea mai echilibrată acum. O cremă hidratantă și protecția solară zilnică sunt baza. | Estrogenul stimulează colagenul și hidratarea, așa că pielea arată adesea mai bine acum. Protecția solară păstrează acest efect. |
| `fol-ski-2` | Piele | Produse noi, pe rând | Dacă vrei să încerci un produs nou, introdu câte unul, ca să vezi cum reacționează pielea. | Pielea este mai stabilă când estrogenul crește, deci e mai ușor să vezi cum reacționează la un produs nou. |
| `fol-ski-3` | Piele | Exfoliere blândă, o dată pe săptămână | Un exfoliant chimic blând sau o lavetă moale îndepărtează celulele moarte. | Pielea se reînnoiește mai bine când estrogenul crește, iar o exfoliere ușoară îi lasă loc să strălucească. |
| `fol-ski-4` | Piele | Programează acum epilarea | Epilarea, pensarea sau tratamentele cosmetice sunt adesea mai suportabile în aceste zile. | Pe măsură ce estrogenul crește, sensibilitatea la durere tinde să scadă față de zilele de menstruație. |
| `fol-ski-5` | Piele | Ser cu vitamina C dimineața | Un ser cu vitamina C, sub cremă și protecție solară, poate uniformiza tenul. | Vitamina C susține producția de colagen, pe care estrogenul o stimulează deja în această fază. |
| `fol-ski-6` | Piele | Hidratează-te din interior | Apa băută regulat se vede și pe piele, mai ales după zilele de menstruație. | Estrogenul ajută pielea să rețină apa. Când are destul lichid la dispoziție, efectul se vede mai bine. |
| `fol-ski-7` | Piele | Demachiere completă seara | Chiar dacă pielea arată bine, îndepărtează machiajul și protecția solară înainte de culcare. | Pielea echilibrată din această fază rămâne așa dacă porii nu se încarcă peste noapte, înainte ca sebumul să crească în jurul ovulației. |

### Ovulație

**Pe scurt:** În jurul ovulației, estrogenul atinge un vârf. Unele persoane se simt pline de energie; altele simt o durere scurtă într-o parte a abdomenului sau observă secreții mai abundente și elastice.

**De ce se întâmplă asta?** Când estrogenul atinge vârful, hipofiza eliberează brusc hormonul LH, care declanșează ovulația: un ovul este eliberat din ovar. În aceeași perioadă crește puțin și testosteronul. După ovulație, foliculul rămas începe să producă progesteron, iar temperatura corpului urcă ușor.

| ID | Temă | Titlu | Text | De ce ajută? |
|---|---|---|---|---|
| `ovu-nut-1` | Alimentație | Apă pe parcursul zilei | Temperatura corpului crește ușor după ovulație. Bea apă regulat, mai ales dacă faci mișcare. | După ovulație, progesteronul ridică temperatura corpului cu câteva zecimi de grad, iar corpul pierde mai multă apă prin transpirație. |
| `ovu-nut-2` | Alimentație | Fibre | Legumele, fructele și cerealele integrale susțin digestia, care se poate schimba ușor în aceste zile. | Schimbările hormonale bruște din jurul ovulației pot influența ritmul digestiei, iar fibrele îl ajută să rămână regulat. |
| `ovu-nut-3` | Alimentație | Legume crucifere | Broccoli, conopida, varza sau rucola sunt ușor de adăugat la orice masă. | Ficatul procesează estrogenul ajuns la vârf, iar legumele crucifere conțin compuși studiați pentru rolul lor în acest proces. |
| `ovu-nut-4` | Alimentație | Gustări ușoare și proaspete | Fructele, legumele crude, iaurtul sau hummusul sunt potrivite când pofta de mâncare e mai mică. | În jurul ovulației, estrogenul ridicat tinde să reducă apetitul, așa că mesele ușoare sunt adesea suficiente. |
| `ovu-nut-5` | Alimentație | Zinc din semințe și leguminoase | Semințele de dovleac, năutul, lintea sau ouăle aduc zinc. | Zincul participă la producerea hormonilor și la sănătatea pielii, care poate deveni mai grasă când testosteronul crește ușor. |
| `ovu-nut-6` | Alimentație | O farfurie colorată | Fructe de pădure, ardei, roșii, verdețuri: cu cât mai multe culori, cu atât mai multe vitamine. | Ovulația este însoțită de o mică reacție inflamatorie în ovar. Legumele și fructele colorate aduc antioxidanți care susțin echilibrul general. |
| `ovu-nut-7` | Alimentație | Mai puțin alcool zilele acestea | Dacă bei, alege porții mici și alternează cu apă. | Alcoolul încarcă ficatul, care tocmai procesează vârful de estrogen, și poate tulbura somnul când temperatura corpului începe să urce. |
| `ovu-mov-1` | Mișcare | Folosește energia | Dacă te simți în formă, este un moment bun pentru antrenamente mai solicitante sau pentru activități în grup. | Vârful de estrogen și creșterea ușoară a testosteronului pot aduce forță, viteză și chef de mișcare. |
| `ovu-mov-2` | Mișcare | Încălzire atentă | Fă o încălzire bună înainte de efortul intens și oprește-te dacă apare o durere neobișnuită. | Estrogenul ridicat face ligamentele puțin mai elastice, ceea ce, după unele studii, crește ușor riscul de întinderi. |
| `ovu-mov-3` | Mișcare | Sport de echipă sau clasă de grup | Un meci, o clasă de spinning sau de dans alături de alții pot fi mai motivante acum. | Multe persoane se simt mai sociabile și mai încrezătoare în jurul ovulației, odată cu vârful de estrogen și de testosteron. |
| `ovu-mov-4` | Mișcare | Antrenament de forță | Încearcă o serie în plus sau o greutate puțin mai mare, cu tehnica bine controlată. | Testosteronul și estrogenul ridicate susțin forța musculară, iar unele persoane au cele mai bune rezultate acum. |
| `ovu-mov-5` | Mișcare | Protejează-ți genunchii | La sărituri și schimbări bruște de direcție, aterizează cu genunchii ușor îndoiți și aliniați cu vârfurile picioarelor. | Estrogenul ridicat poate face ligamentele mai laxe, iar o tehnică bună protejează articulațiile. |
| `ovu-mov-6` | Mișcare | Adaptează efortul la durerea de ovulație | O durere ușoară, de câteva ore, într-o parte a abdomenului poate apărea la ovulație. Dacă o simți, alege o zi mai ușoară. | Când foliculul se deschide ca să elibereze ovulul, puțin lichid poate irita zona. Durerea trece de obicei într-o zi; dacă este puternică, merită discutată cu un medic. |
| `ovu-mov-7` | Mișcare | Răcorește-te după efort | Un duș călduț și haine lejere după antrenament ajută corpul să se răcească. | Imediat după ovulație, progesteronul ridică temperatura de bază a corpului, așa că transpiri mai repede. |
| `ovu-sle-1` | Somn | Cameră răcoroasă | Dacă îți este mai cald noaptea, aerisește înainte de culcare și alege așternuturi ușoare. | Progesteronul care apare după ovulație ridică temperatura corpului, iar un corp mai cald adoarme mai greu. |
| `ovu-sle-2` | Somn | Rutină de seară | Lasă ecranele cu o jumătate de oră înainte de culcare, mai ales dacă energia de peste zi te ține în priză. | Vârful de estrogen poate aduce multă energie și o minte activă; o rutină calmă ajută creierul să treacă spre somn. |
| `ovu-sle-3` | Somn | Pijamale din bumbac | Materialele naturale, care lasă pielea să respire, ajută dacă transpiri noaptea. | Creșterea temperaturii de după ovulație, adusă de progesteron, poate face nopțile mai calde. |
| `ovu-sle-4` | Somn | Temperatura, la aceeași oră | Dacă notezi temperatura bazală, măsoar-o dimineața, înainte să te ridici din pat, mereu la aceeași oră. | După ovulație, progesteronul ridică temperatura cu aproximativ 0,2–0,5 °C. O măsurare constantă face ca această creștere să se vadă în grafic. |
| `ovu-sle-5` | Somn | Cafeaua doar dimineața | Ultima cafea înainte de prânz ajută somnul de noapte. | Cu energia ridicată de vârful de estrogen, cafeina în plus te poate ține în priză până seara târziu. |
| `ovu-sle-6` | Somn | Liniștește mintea înainte de somn | Câteva minute de citit, de respirație lentă sau de scris înainte de culcare. | Estrogenul stimulează creierul și poate ține gândurile active seara; un moment de liniște ajută trecerea spre somn. |
| `ovu-sle-7` | Somn | Somn în plus după antrenamente grele | Dacă te antrenezi mai intens zilele acestea, adaugă o jumătate de oră de somn. | Mușchii se refac în somnul profund. Când hormonii susțin efortul mare, odihna completează antrenamentul. |
| `ovu-ski-1` | Piele | Curățare blândă | Pielea poate produce mai mult sebum. Curăță fața dimineața și seara, fără să freci. | Creșterea ușoară a testosteronului din jurul ovulației stimulează glandele care produc sebum. |
| `ovu-ski-2` | Piele | Produse care nu încarcă porii | Dacă observi pori încărcați, alege produse non-comedogenice. | Sebumul în plus, stimulat de hormonii din această fază, poate bloca porii mai ușor. |
| `ovu-ski-3` | Piele | Hidratant ușor, tip gel | Pielea mai grasă se simte mai bine cu o textură ușoară, care hidratează fără să lucească. | Pielea produce mai mult sebum odată cu testosteronul, dar are nevoie în continuare de apă. |
| `ovu-ski-4` | Piele | O mască de argilă pe zona T | O mască de argilă, o dată în aceste zile, pe frunte, nas și bărbie, poate absorbi sebumul în plus. | Zona T are cele mai multe glande sebacee, iar ele sunt cele mai sensibile la creșterea ușoară a testosteronului. |
| `ovu-ski-5` | Piele | Protecție solară, chiar și pe nor | Folosește zilnic un produs cu factor de protecție, inclusiv în zilele înnorate. | Pentru unele persoane, estrogenul ridicat face pielea mai predispusă la pete pigmentare la soare. |
| `ovu-ski-6` | Piele | Mâinile departe de față | Mâinile duc pe față impurități care pot încărca porii. | Cu sebumul crescut în aceste zile, porii se pot bloca mai ușor, iar impuritățile adăugate accentuează asta. |
| `ovu-ski-7` | Piele | Schimbă fața de pernă | O față de pernă curată, schimbată de două ori pe săptămână, ajută pielea mai grasă. | Sebumul în plus din această fază se adună pe pernă și ajunge înapoi pe piele în fiecare noapte. |

### Faza luteală

**Pe scurt:** După ovulație crește progesteronul. Spre finalul fazei, unele persoane observă balonare, sensibilitate la sâni, pofte sau schimbări de dispoziție. Sunt frecvente, dar nu trebuie să fie greu de îndurat.

**De ce se întâmplă asta?** După ovulație, foliculul rămas în ovar produce progesteron, iar estrogenul crește din nou, mai puțin. Progesteronul încălzește corpul, încetinește digestia și poate crește pofta de mâncare. Dacă nu apare o sarcină, ambii hormoni scad în ultimele zile, ceea ce poate aduce balonare, sensibilitate la sâni sau schimbări de dispoziție, apoi menstruația.

| ID | Temă | Titlu | Text | De ce ajută? |
|---|---|---|---|---|
| `lut-nut-1` | Alimentație | Mese regulate | Mesele la ore regulate, cu proteine și fibre, pot tempera poftele și variațiile de energie. | Progesteronul crește puțin consumul de energie al corpului și pofta de mâncare. Mesele regulate țin foamea sub control. |
| `lut-nut-2` | Alimentație | Mai puțină sare, cafea și alcool | Pentru unele persoane, reducerea lor în zilele dinaintea menstruației diminuează balonarea, sensibilitatea sânilor și iritabilitatea. | Scăderea hormonilor din ultimele zile face corpul să rețină apă, iar sarea, cafeina și alcoolul pot accentua acest efect. |
| `lut-nut-3` | Alimentație | Carbohidrați care țin de foame | Ovăzul, cartofii dulci, orezul integral sau leguminoasele potolesc poftele mai bine decât dulciurile. | Înainte de menstruație, serotonina poate scădea odată cu estrogenul, iar carbohidrații complecși îi susțin producția fără salturi de glicemie. |
| `lut-nut-4` | Alimentație | Calciu din lactate sau verdețuri | Iaurtul, brânza, migdalele sau verdețurile închise la culoare aduc calciu. | Unele studii arată că un aport bun de calciu poate reduce simptomele din zilele dinaintea menstruației, legate de variațiile hormonale. |
| `lut-nut-5` | Alimentație | Ciocolată neagră, cu măsură | Dacă ai poftă de dulce, câteva pătrățele de ciocolată neagră pot fi o alegere bună. | Poftele de dulce sunt legate de scăderea serotoninei dinaintea menstruației. Ciocolata neagră aduce și magneziu. |
| `lut-nut-6` | Alimentație | O gustare pregătită dinainte | Ține la îndemână o gustare sățioasă: nuci, un fruct cu iaurt sau hummus cu legume. | Progesteronul poate crește apetitul în a doua parte a ciclului, iar o gustare planificată previne alegerile făcute pe fugă. |
| `lut-nut-7` | Alimentație | Alimente cu vitamina B6 | Bananele, năutul, peștele sau cartofii aduc vitamina B6. | Vitamina B6 participă la producerea serotoninei, care poate scădea în zilele dinaintea menstruației. |
| `lut-mov-1` | Mișcare | Efort moderat | Mersul pe jos, înotul sau bicicleta pot ajuta dispoziția și balonarea. Dacă energia scade, alege un efort mai ușor. | Progesteronul ridică temperatura corpului și pulsul, așa că același efort poate părea mai greu decât în prima parte a ciclului. |
| `lut-mov-2` | Mișcare | Întinderi și respirație | Câteva minute de întinderi sau de respirație lentă pot reduce tensiunea din zilele dinaintea menstruației. | Scăderea hormonilor dinaintea menstruației poate crește tensiunea și iritabilitatea; respirația lentă calmează sistemul nervos. |
| `lut-mov-3` | Mișcare | Pilates sau yoga | O sesiune de 20–30 de minute de pilates sau yoga lucrează mușchii fără să te epuizeze. | În faza luteală multe persoane se refac mai greu după efortul intens, iar mișcarea controlată menține forța fără stres în plus. |
| `lut-mov-4` | Mișcare | Apă la îndemână la antrenament | Ia o sticlă de apă cu tine și bea câte puțin la fiecare pauză. | Progesteronul ridică temperatura corpului, iar transpirația începe mai devreme în timpul efortului. |
| `lut-mov-5` | Mișcare | O plimbare după masă | Zece-cincisprezece minute de mers după masa principală. | Progesteronul încetinește digestia; mersul ușor după masă poate reduce balonarea și senzația de greutate. |
| `lut-mov-6` | Mișcare | Ajustează intensitatea | Dacă un antrenament obișnuit pare mai greu, scade puțin ritmul sau greutatea, fără să renunți. | Temperatura și pulsul mai ridicate în această fază fac efortul să pară mai solicitant, chiar dacă forța rămâne aceeași. |
| `lut-mov-7` | Mișcare | Mișcare în aer liber | O drumeție ușoară sau o plimbare în parc îmbină mișcarea cu lumina naturală. | Lumina și mișcarea susțin serotonina, care tinde să scadă în ultimele zile dinaintea menstruației. |
| `lut-sle-1` | Somn | Mai mult timp pentru somn | Somnul poate fi mai agitat înainte de menstruație. Culcă-te ceva mai devreme și evită cafeaua după-amiaza. | Scăderea progesteronului în ultimele zile ale ciclului poate face somnul mai superficial și mai întrerupt. |
| `lut-sle-2` | Somn | Pune gândurile pe hârtie | Dacă mintea nu se oprește seara, notează ce te preocupă înainte de culcare. | Variațiile de estrogen și progesteron dinaintea menstruației pot accentua îngrijorările; scrise pe hârtie, ocupă mai puțin loc seara. |
| `lut-sle-3` | Somn | Răcorește dormitorul | Aerisește camera și alege o plapumă mai subțire. | Progesteronul ține temperatura corpului cu câteva zecimi de grad mai sus în toată faza luteală, iar căldura întrerupe somnul. |
| `lut-sle-4` | Somn | Cină ușoară | O cină cu legume și proteine, fără mâncăruri foarte grase sau picante, cu câteva ore înainte de culcare. | Progesteronul încetinește digestia, iar o cină grea poate aduce balonare și un somn agitat. |
| `lut-sle-5` | Somn | Un ceai cald, fără cafeină | Un ceai de mușețel, tei sau roiniță poate face parte din ritualul de seară. | Un ritual cald și liniștitor ajută corpul să se relaxeze în zilele în care scăderea hormonilor face adormitul mai greu. |
| `lut-sle-6` | Somn | Confort pentru sânii sensibili | Un bustier moale sau o pernă ținută în brațe pot face somnul pe o parte mai confortabil. | Progesteronul și estrogenul pot face țesutul sânilor să rețină apă în a doua parte a ciclului, de unde sensibilitatea. |
| `lut-sle-7` | Somn | Ora de culcare, aceeași | Chiar și în weekend, păstrează ora de culcare în limita unei ore față de restul săptămânii. | Somnul mai fragil din zilele dinaintea menstruației, legat de scăderea progesteronului, se ține mai bine într-un program constant. |
| `lut-ski-1` | Piele | Atenție la erupții | Înainte de menstruație pot apărea coșuri. Produsele cu acid salicilic sau cu peroxid de benzoil pot ajuta; folosește-le conform prospectului. | Când estrogenul scade la finalul ciclului, efectul testosteronului devine relativ mai mare, iar glandele sebacee produc mai mult. |
| `lut-ski-2` | Piele | Nu stoarce coșurile | Atinsul și storsul pot lăsa urme. Dacă acneea te deranjează constant, un dermatolog poate recomanda un tratament. | Pielea inflamată din această fază se reface mai greu dacă este atinsă, iar urmele rămân mai mult timp. |
| `lut-ski-3` | Piele | Curăță pielea după sport | Spală-te pe față cât mai repede după ce transpiri. | Progesteronul crește temperatura și transpirația, iar transpirația amestecată cu sebum poate încărca porii. |
| `lut-ski-4` | Piele | Compresă rece dimineața | O compresă rece, câteva minute dimineața, poate reduce aspectul umflat al feței. | Retenția de apă dinaintea menstruației, legată de variațiile hormonale, se vede adesea pe față, mai ales dimineața. |
| `lut-ski-5` | Piele | Tratează doar coșul, nu toată fața | Aplică produsele pentru coșuri doar acolo unde au apărut, ca să nu usuci restul pielii. | Erupțiile hormonale apar de obicei pe bărbie și pe linia maxilarului, iar restul pielii are nevoie în continuare de hidratare. |
| `lut-ski-6` | Piele | Un prosop doar pentru față | Un prosop curat, folosit doar pentru față și schimbat des, reduce impuritățile care ajung pe piele. | Cu glandele sebacee mai active în această fază, porii încărcați se inflamează mai ușor. |
| `lut-ski-7` | Piele | Un moment de răsfăț | O baie caldă sau o rutină de îngrijire mai lungă seara poate fi un mod de a te relaxa. | Scăderea hormonilor dinaintea menstruației poate aduce tensiune și iritabilitate; grija față de corp ajută și starea de spirit. |

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
