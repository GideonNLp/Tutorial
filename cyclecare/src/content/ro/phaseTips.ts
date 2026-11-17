import type { Phase } from '../../domain/types';

/**
 * Sfaturile pe faze, în română. Fac parte din conținutul exportat de `tips.ts` și sunt redate
 * în docs/04-sablon-continut-sfaturi.md (`npm run docs:content`).
 *
 * STATUT: schiță redacțională. Fiecare text, inclusiv explicațiile „De ce ajută?”, trebuie validat
 * de un medic înainte de lansare. Regulile de ton sunt cele din `tips.ts`.
 *
 * Pentru fiecare fază și temă sunt 7 sfaturi; ecranul „Sfaturi” arată câte 3, alese după ziua
 * ciclului, iar „Alte idei” trece la următoarele trei.
 */

export const TIP_CATEGORIES = ['nutrition', 'movement', 'sleep', 'skin'] as const;
export type TipCategory = (typeof TIP_CATEGORIES)[number];

export interface Tip {
  /** Identificator stabil, folosit la traducere, la revizia medicală și pentru „Am aplicat”. */
  id: string;
  /** Ce faci, spus scurt (cel mult ~40 de caractere). */
  title: string;
  /** Cum, în 1–2 propoziții. */
  body: string;
  /** „De ce ajută?”: legătura cu hormonii din această fază, pe scurt și fără promisiuni. */
  why: string;
}

export interface PhaseTips {
  /** Două-trei propoziții despre ce se întâmplă, de obicei, în această fază. */
  summary: string;
  /** „De ce se întâmplă asta?”: ce fac hormonii în această fază. */
  hormones: string;
  tips: Record<TipCategory, Tip[]>;
}

export const phaseTips: Record<Phase, PhaseTips> = {
  menstruation: {
    summary:
      'Corpul elimină mucoasa uterului, iar nivelul hormonilor este scăzut. Multe persoane au mai puțină energie în primele zile. E în regulă să încetinești.',
    hormones:
      'La începutul ciclului, estrogenul și progesteronul sunt la cel mai scăzut nivel. Scăderea progesteronului de la finalul ciclului trecut declanșează eliminarea mucoasei uterului. Uterul se contractă cu ajutorul unor substanțe numite prostaglandine, care pot da și crampe. Spre finalul menstruației, estrogenul începe din nou să crească.',
    tips: {
      nutrition: [
        {
          id: 'men-nut-1',
          title: 'Alimente bogate în fier',
          body: 'Lintea, fasolea, spanacul, ouăle sau carnea roșie pot ajuta la refacerea fierului pierdut prin sângerare. Vitamina C din legume și fructe îi ajută absorbția.',
          why: 'Prin sângerare se pierde și fier. Cu hormonii la nivel scăzut, oboseala se simte mai ușor, iar fierul ajută la transportul oxigenului în corp.',
        },
        {
          id: 'men-nut-2',
          title: 'Lichide și mese calde',
          body: 'Apa și ceaiurile calde pot face balonarea și crampele mai ușor de dus. Dacă ai poftă de dulce, o gustare cu proteine ține foamea departe mai mult timp.',
          why: 'Prostaglandinele care contractă uterul pot schimba și ritmul digestiei. Lichidele și mâncarea caldă sunt mai ușor de tolerat de un abdomen sensibil.',
        },
        {
          id: 'men-nut-3',
          title: 'Pește gras sau nuci în meniu',
          body: 'Somonul, sardinele, nucile sau semințele de in aduc grăsimi omega-3. O porție de câteva ori pe săptămână este un reper bun.',
          why: 'Grăsimile omega-3 participă la reglarea inflamației. Unele studii arată că pot face mai blânde crampele, care sunt legate de prostaglandine.',
        },
        {
          id: 'men-nut-4',
          title: 'Gustări cu magneziu',
          body: 'Semințele de dovleac, migdalele, banana sau ciocolata neagră sunt gustări bogate în magneziu.',
          why: 'Magneziul ajută mușchii să se relaxeze, inclusiv musculatura uterului. Pentru unele persoane, asta înseamnă crampe mai ușoare.',
        },
        {
          id: 'men-nut-5',
          title: 'O cană de ceai de ghimbir',
          body: 'Ceaiul de ghimbir sau de mușețel poate fi o pauză caldă și liniștitoare în zilele cu crampe.',
          why: 'Ghimbirul pare să reducă producția de prostaglandine, iar căldura băuturii relaxează. Efectul este modest, dar unele persoane îl simt.',
        },
        {
          id: 'men-nut-6',
          title: 'Mai puțină sare în primele zile',
          body: 'Mâncarea foarte sărată poate accentua balonarea. Condimentează cu ierburi, lămâie sau usturoi.',
          why: 'Scăderea hormonilor de la finalul ciclului face corpul să rețină mai multă apă, iar sarea adaugă la această retenție.',
        },
        {
          id: 'men-nut-7',
          title: 'Mese mici, mai dese',
          body: 'Dacă pofta de mâncare scade sau apare greața, mesele mici la câteva ore distanță sunt mai ușor de dus.',
          why: 'Prostaglandinele din aceste zile pot da greață sau pot tăia pofta de mâncare. Mesele mici păstrează energia constantă fără să încarce stomacul.',
        },
      ],
      movement: [
        {
          id: 'men-mov-1',
          title: 'Mișcare blândă',
          body: 'Plimbările, întinderile sau yoga ușoară reduc disconfortul pentru unele persoane. Dacă ai chef de antrenamentul obișnuit, nu există un motiv general să îl eviți.',
          why: 'Mișcarea ușoară crește circulația în zona bazinului și eliberează endorfine, analgezicele naturale ale corpului, care pot contrabalansa crampele.',
        },
        {
          id: 'men-mov-2',
          title: 'Odihna contează',
          body: 'În zilele cu flux abundent sau cu crampe puternice, odihna face la fel de mult ca mișcarea.',
          why: 'Cu estrogenul și progesteronul la minim, multe persoane au mai puțină energie în primele zile. Corpul își revine mai repede dacă îl lași să se odihnească.',
        },
        {
          id: 'men-mov-3',
          title: 'Plimbare de 20 de minute',
          body: 'O plimbare în ritm lejer, de preferat afară, poate ușura crampele și ridica moralul.',
          why: 'Mersul eliberează endorfine și relaxează musculatura, iar lumina naturală susține dispoziția când hormonii sunt la cel mai scăzut nivel.',
        },
        {
          id: 'men-mov-4',
          title: 'Întinderi pentru spate și șolduri',
          body: 'Poziția copilului, pisica-vaca sau genunchii la piept, câte 30 de secunde fiecare, pot detensiona zona lombară.',
          why: 'Contracțiile uterului, produse de prostaglandine, se simt adesea și în spate și în coapse. Întinderile relaxează mușchii din jur.',
        },
        {
          id: 'men-mov-5',
          title: 'Respiră cu abdomenul',
          body: 'Inspiră lent pe nas cinci secunde, lasă abdomenul să se umfle, apoi expiră pe gură șase secunde. Repetă câteva minute.',
          why: 'Respirația lentă calmează sistemul nervos și poate reduce felul în care simți durerea în zilele în care prostaglandinele contractă uterul.',
        },
        {
          id: 'men-mov-6',
          title: 'Antrenează-te după energie',
          body: 'Dacă te simți bine, antrenamentul obișnuit e în regulă. Dacă nu, scurtează-l sau alege o variantă mai ușoară.',
          why: 'Nivelul scăzut de hormoni nu afectează pe toată lumea la fel. Unele persoane au chiar mai multă energie spre finalul menstruației, când estrogenul începe să crească.',
        },
        {
          id: 'men-mov-7',
          title: 'Înot sau bicicletă ușoară',
          body: 'Mișcările ritmice, fără sărituri, sunt adesea mai confortabile în zilele cu flux abundent.',
          why: 'Mișcarea ritmică ușoară susține circulația și eliberează endorfine fără să solicite abdomenul sensibil în zilele în care uterul se contractă.',
        },
      ],
      sleep: [
        {
          id: 'men-sle-1',
          title: 'Căldură înainte de culcare',
          body: 'O sticlă cu apă caldă pe abdomen sau un duș cald pot relaxa mușchii și pot ușura adormitul.',
          why: 'Căldura relaxează musculatura uterului și reduce crampele produse de prostaglandine, care altfel te pot trezi noaptea.',
        },
        {
          id: 'men-sle-2',
          title: 'Ore regulate',
          body: 'Mergi la culcare și trezește-te la ore apropiate de cele obișnuite. Oboseala din primele zile se resimte mai puțin după un somn regulat.',
          why: 'Când hormonii sunt la minim, oboseala se simte mai puternic. Un program regulat ajută ceasul intern să compenseze.',
        },
        {
          id: 'men-sle-3',
          title: 'Dormi pe o parte, cu o pernă',
          body: 'Somnul pe o parte, cu o pernă între genunchi, poate reduce presiunea pe abdomen și pe spate.',
          why: 'Poziția ușor ghemuită relaxează mușchii abdominali din jurul uterului, care se contractă în aceste zile.',
        },
        {
          id: 'men-sle-4',
          title: 'Protecție potrivită pentru noapte',
          body: 'Un absorbant de noapte, o cupă sau lenjerie menstruală potrivită fluxului tău te scutesc de treziri ca să verifici.',
          why: 'Fluxul este de obicei mai abundent în primele două zile, după scăderea bruscă a progesteronului. Protecția potrivită înseamnă un somn neîntrerupt.',
        },
        {
          id: 'men-sle-5',
          title: 'Cameră răcoroasă și întunecată',
          body: 'O cameră în jur de 18–19 °C și întunericul complet ajută la un somn mai adânc.',
          why: 'Fără progesteron, temperatura corpului este mai joasă în aceste zile. O cameră răcoroasă ajută corpul să intre ușor în somnul profund.',
        },
        {
          id: 'men-sle-6',
          title: 'Un pui de somn scurt',
          body: 'Dacă oboseala e mare, un pui de somn de 20 de minute, înainte de ora 15, te poate reface fără să strice somnul de noapte.',
          why: 'Pierderea de sânge și nivelul scăzut de hormoni pot face primele zile mai obositoare. Un somn scurt reîncarcă fără să tulbure ritmul de noapte.',
        },
        {
          id: 'men-sle-7',
          title: 'Fără cafeină după-amiaza',
          body: 'Cafeaua, ceaiul negru sau băuturile energizante după ora 14 pot îngreuna adormitul.',
          why: 'Cafeina strânge vasele de sânge și poate accentua crampele pentru unele persoane, iar efectul ei de trezire durează multe ore.',
        },
      ],
      skin: [
        {
          id: 'men-ski-1',
          title: 'Rutină simplă',
          body: 'Pielea poate fi mai sensibilă și mai uscată. Un produs de curățare blând și o cremă hidratantă sunt de ajuns.',
          why: 'Cu estrogenul la minim, pielea produce mai puține substanțe hidratante și poate deveni mai uscată și mai sensibilă.',
        },
        {
          id: 'men-ski-2',
          title: 'Amână tratamentele agresive',
          body: 'Epilarea cu ceară sau exfolierea puternică pot fi mai dureroase în aceste zile. Dacă poți, programează-le mai târziu.',
          why: 'Sensibilitatea la durere tinde să fie mai mare în timpul menstruației, iar pielea reacționează mai ușor la iritații când hormonii sunt la minim.',
        },
        {
          id: 'men-ski-3',
          title: 'Cremă mai bogată seara',
          body: 'Dacă pielea se simte trasă, folosește seara o cremă cu ceramide sau glicerină.',
          why: 'Estrogenul ajută pielea să rețină apa. Când este la cel mai scăzut nivel, bariera pielii pierde mai multă umezeală.',
        },
        {
          id: 'men-ski-4',
          title: 'Apă și somn împotriva cearcănelor',
          body: 'Lichidele suficiente și somnul regulat pot reduce aspectul obosit din primele zile.',
          why: 'Pierderea de sânge și nivelul scăzut de hormoni se pot vedea pe piele ca paloare sau cearcăne mai vizibile.',
        },
        {
          id: 'men-ski-5',
          title: 'Spală-ți fața după sport',
          body: 'Transpirația lăsată pe piele poate irita, mai ales când pielea este mai sensibilă.',
          why: 'Pielea este mai reactivă în aceste zile, pentru că estrogenul, care o protejează, este la cel mai scăzut nivel.',
        },
        {
          id: 'men-ski-6',
          title: 'Grijă blândă pentru zona intimă',
          body: 'Schimbă absorbantul sau tamponul regulat și spală zona doar cu apă sau cu un produs blând, fără parfum.',
          why: 'Sângele schimbă temporar aciditatea zonei intime, iar parfumurile și frecarea pot irita pielea mai sensibilă din aceste zile.',
        },
        {
          id: 'men-ski-7',
          title: 'Buze și mâini hidratate',
          body: 'Un balsam de buze și o cremă de mâini la îndemână ajută pielea uscată.',
          why: 'Uscăciunea vine din nivelul scăzut de estrogen, care în restul ciclului ajută pielea să păstreze apa.',
        },
      ],
    },
  },
  follicular: {
    summary: 'După menstruație, estrogenul crește treptat. Multe persoane simt mai multă energie și o dispoziție mai bună.',
    hormones:
      'După menstruație, glanda hipofiză trimite hormonul FSH către ovare, unde se maturizează foliculii. Aceștia produc estrogen, care crește de la o zi la alta. Estrogenul reface mucoasa uterului și influențează și creierul: multe persoane observă mai multă energie, concentrare și o dispoziție mai bună.',
    tips: {
      nutrition: [
        {
          id: 'fol-nut-1',
          title: 'Farfurie variată',
          body: 'Legume, cereale integrale, proteine și grăsimi bune. Nu există o dietă specială pentru această fază; contează varietatea.',
          why: 'În această fază corpul își reface rezervele după menstruație și construiește noua mucoasă a uterului, sub acțiunea estrogenului. Varietatea îi dă tot ce îi trebuie.',
        },
        {
          id: 'fol-nut-2',
          title: 'Proteine la fiecare masă',
          body: 'Dacă faci mai multă mișcare, proteinele din ouă, lactate, leguminoase, pește sau carne susțin refacerea mușchilor.',
          why: 'Cu estrogenul în creștere, multe persoane au energie pentru mai multă mișcare, iar proteinele ajută mușchii să se refacă după efort.',
        },
        {
          id: 'fol-nut-3',
          title: 'Încearcă un aliment nou',
          body: 'Alege o legumă sau o rețetă pe care n-ai mai gătit-o. Energia și curiozitatea sunt adesea mai mari acum.',
          why: 'Estrogenul stimulează dopamina, care susține motivația și curiozitatea. E un moment bun pentru obiceiuri noi.',
        },
        {
          id: 'fol-nut-4',
          title: 'Alimente fermentate',
          body: 'Iaurtul, chefirul, varza murată sau murăturile în saramură pot susține flora intestinală.',
          why: 'Intestinul participă la eliminarea estrogenului folosit de corp. O floră intestinală echilibrată ajută acest proces să decurgă normal.',
        },
        {
          id: 'fol-nut-5',
          title: 'Refă rezerva de fier',
          body: 'Mai păstrează câteva zile leguminoasele, verdețurile sau carnea, alături de legume crude bogate în vitamina C.',
          why: 'Imediat după menstruație rezervele de fier pot fi mai mici, iar corpul are nevoie de el pentru energia care crește odată cu estrogenul.',
        },
        {
          id: 'fol-nut-6',
          title: 'Carbohidrați buni înainte de sport',
          body: 'Ovăzul, pâinea integrală sau cartofii dulci, cu o oră-două înainte de antrenament, dau energie constantă.',
          why: 'În faza foliculară sensibilitatea la insulină tinde să fie mai bună, așa că mușchii folosesc eficient carbohidrații.',
        },
        {
          id: 'fol-nut-7',
          title: 'Semințe în iaurt sau salată',
          body: 'O lingură de semințe de in, dovleac sau floarea-soarelui adaugă fibre și grăsimi bune.',
          why: 'Fibrele ajută intestinul să elimine estrogenul folosit, iar grăsimile bune sunt materia primă din care corpul produce hormoni.',
        },
      ],
      movement: [
        {
          id: 'fol-mov-1',
          title: 'Un moment bun pentru efort',
          body: 'Dacă simți mai multă energie, poți încerca antrenamente mai intense sau ceva nou: alergare, exerciții de forță, dans.',
          why: 'Estrogenul în creștere susține energia, rezistența și refacerea mușchilor, așa că efortul mai mare poate părea mai ușor acum.',
        },
        {
          id: 'fol-mov-2',
          title: 'Crește treptat',
          body: 'Mărește durata sau intensitatea pas cu pas, ca să eviți accidentările.',
          why: 'Chiar dacă energia crește odată cu estrogenul, mușchii și tendoanele au nevoie de timp să se obișnuiască cu un efort nou.',
        },
        {
          id: 'fol-mov-3',
          title: 'Exerciții de forță',
          body: 'Două-trei antrenamente pe săptămână cu greutăți, benzi elastice sau greutatea corpului întăresc mușchii și oasele.',
          why: 'Estrogenul protejează mușchii și oasele. Multe persoane simt că progresează mai ușor la forță în această fază.',
        },
        {
          id: 'fol-mov-4',
          title: 'Încearcă un sport nou',
          body: 'O clasă de dans, un traseu nou de alergare sau un sport pe care l-ai tot amânat.',
          why: 'Estrogenul crește nivelul de dopamină și serotonină, care susțin motivația și dorința de a încerca lucruri noi.',
        },
        {
          id: 'fol-mov-5',
          title: 'Intervale scurte',
          body: 'Alternează un minut de efort intens cu două minute ușoare, de 5–6 ori, pe bicicletă sau la alergare.',
          why: 'În faza foliculară corpul pare să tolereze bine efortul intens și să se refacă repede după el.',
        },
        {
          id: 'fol-mov-6',
          title: 'Mișcare împreună cu cineva',
          body: 'Programează o plimbare, o drumeție sau un sport de echipă cu prietenii.',
          why: 'Pe măsură ce estrogenul crește, multe persoane se simt mai sociabile, iar mișcarea împreună e mai ușor de păstrat.',
        },
        {
          id: 'fol-mov-7',
          title: 'Notează-ți progresul',
          body: 'Scrie distanța, greutățile sau durata. Vei vedea cum variază forma ta de-a lungul ciclului.',
          why: 'Hormonii schimbă energia de la o fază la alta. Notițele te ajută să-ți planifici efortul după propriul tipar.',
        },
      ],
      sleep: [
        {
          id: 'fol-sle-1',
          title: 'Păstrează ritmul',
          body: 'Chiar dacă ai energie, șapte până la nouă ore de somn rămân reperul pentru majoritatea adulților.',
          why: 'Estrogenul favorizează un somn odihnitor, dar energia de peste zi te poate tenta să te culci târziu. Un ritm stabil păstrează beneficiul.',
        },
        {
          id: 'fol-sle-2',
          title: 'Lumină dimineața',
          body: 'Lumina naturală în prima parte a zilei ajută ceasul intern și adormitul de seara.',
          why: 'Lumina de dimineață reglează melatonina și cortizolul, iar un ceas intern stabil sprijină și echilibrul hormonilor ciclului.',
        },
        {
          id: 'fol-sle-3',
          title: 'Cină cu ore înainte de somn',
          body: 'Încearcă să mănânci cu cel puțin două-trei ore înainte de culcare.',
          why: 'Ca să adormi, temperatura corpului scade puțin. În faza foliculară, fără progesteron, ea este deja mai joasă, iar o cină devreme nu o mai ridică.',
        },
        {
          id: 'fol-sle-4',
          title: 'Antrenamentele intense, mai devreme',
          body: 'Încheie efortul intens cu cel puțin trei ore înainte de culcare, ca să lași corpul să se liniștească.',
          why: 'Efortul intens crește temperatura și adrenalina. Cu energia mare adusă de estrogen, e tentant să te antrenezi seara târziu.',
        },
        {
          id: 'fol-sle-5',
          title: 'Un ritual scurt de seară',
          body: 'Aceeași succesiune în fiecare seară (duș, citit, lumină slabă) îi spune corpului că urmează somnul.',
          why: 'Un obicei stabil ajută creierul să elibereze melatonina la timp, iar ritmul format acum te ajută și în fazele în care somnul e mai fragil.',
        },
        {
          id: 'fol-sle-6',
          title: 'Telefonul departe de pat',
          body: 'Lasă telefonul să se încarce în altă cameră sau măcar departe de pat.',
          why: 'Lumina ecranelor întârzie melatonina. Cu energia ridicată adusă de estrogen, telefonul te poate ține în priză mai mult decât îți dai seama.',
        },
        {
          id: 'fol-sle-7',
          title: 'Recuperează somnul pierdut',
          body: 'Dacă ai dormit prost în zilele de menstruație, acum e momentul să recuperezi.',
          why: 'Estrogenul favorizează un somn mai profund și mai puțin întrerupt, așa că odihna din această fază e de obicei mai eficientă.',
        },
      ],
      skin: [
        {
          id: 'fol-ski-1',
          title: 'Hidratare și protecție solară',
          body: 'Pielea este adesea mai echilibrată acum. O cremă hidratantă și protecția solară zilnică sunt baza.',
          why: 'Estrogenul stimulează colagenul și hidratarea, așa că pielea arată adesea mai bine acum. Protecția solară păstrează acest efect.',
        },
        {
          id: 'fol-ski-2',
          title: 'Produse noi, pe rând',
          body: 'Dacă vrei să încerci un produs nou, introdu câte unul, ca să vezi cum reacționează pielea.',
          why: 'Pielea este mai stabilă când estrogenul crește, deci e mai ușor să vezi cum reacționează la un produs nou.',
        },
        {
          id: 'fol-ski-3',
          title: 'Exfoliere blândă, o dată pe săptămână',
          body: 'Un exfoliant chimic blând sau o lavetă moale îndepărtează celulele moarte.',
          why: 'Pielea se reînnoiește mai bine când estrogenul crește, iar o exfoliere ușoară îi lasă loc să strălucească.',
        },
        {
          id: 'fol-ski-4',
          title: 'Programează acum epilarea',
          body: 'Epilarea, pensarea sau tratamentele cosmetice sunt adesea mai suportabile în aceste zile.',
          why: 'Pe măsură ce estrogenul crește, sensibilitatea la durere tinde să scadă față de zilele de menstruație.',
        },
        {
          id: 'fol-ski-5',
          title: 'Ser cu vitamina C dimineața',
          body: 'Un ser cu vitamina C, sub cremă și protecție solară, poate uniformiza tenul.',
          why: 'Vitamina C susține producția de colagen, pe care estrogenul o stimulează deja în această fază.',
        },
        {
          id: 'fol-ski-6',
          title: 'Hidratează-te din interior',
          body: 'Apa băută regulat se vede și pe piele, mai ales după zilele de menstruație.',
          why: 'Estrogenul ajută pielea să rețină apa. Când are destul lichid la dispoziție, efectul se vede mai bine.',
        },
        {
          id: 'fol-ski-7',
          title: 'Demachiere completă seara',
          body: 'Chiar dacă pielea arată bine, îndepărtează machiajul și protecția solară înainte de culcare.',
          why: 'Pielea echilibrată din această fază rămâne așa dacă porii nu se încarcă peste noapte, înainte ca sebumul să crească în jurul ovulației.',
        },
      ],
    },
  },
  ovulation: {
    summary:
      'În jurul ovulației, estrogenul atinge un vârf. Unele persoane se simt pline de energie; altele simt o durere scurtă într-o parte a abdomenului sau observă secreții mai abundente și elastice.',
    hormones:
      'Când estrogenul atinge vârful, hipofiza eliberează brusc hormonul LH, care declanșează ovulația: un ovul este eliberat din ovar. În aceeași perioadă crește puțin și testosteronul. După ovulație, foliculul rămas începe să producă progesteron, iar temperatura corpului urcă ușor.',
    tips: {
      nutrition: [
        {
          id: 'ovu-nut-1',
          title: 'Apă pe parcursul zilei',
          body: 'Temperatura corpului crește ușor după ovulație. Bea apă regulat, mai ales dacă faci mișcare.',
          why: 'După ovulație, progesteronul ridică temperatura corpului cu câteva zecimi de grad, iar corpul pierde mai multă apă prin transpirație.',
        },
        {
          id: 'ovu-nut-2',
          title: 'Fibre',
          body: 'Legumele, fructele și cerealele integrale susțin digestia, care se poate schimba ușor în aceste zile.',
          why: 'Schimbările hormonale bruște din jurul ovulației pot influența ritmul digestiei, iar fibrele îl ajută să rămână regulat.',
        },
        {
          id: 'ovu-nut-3',
          title: 'Legume crucifere',
          body: 'Broccoli, conopida, varza sau rucola sunt ușor de adăugat la orice masă.',
          why: 'Ficatul procesează estrogenul ajuns la vârf, iar legumele crucifere conțin compuși studiați pentru rolul lor în acest proces.',
        },
        {
          id: 'ovu-nut-4',
          title: 'Gustări ușoare și proaspete',
          body: 'Fructele, legumele crude, iaurtul sau hummusul sunt potrivite când pofta de mâncare e mai mică.',
          why: 'În jurul ovulației, estrogenul ridicat tinde să reducă apetitul, așa că mesele ușoare sunt adesea suficiente.',
        },
        {
          id: 'ovu-nut-5',
          title: 'Zinc din semințe și leguminoase',
          body: 'Semințele de dovleac, năutul, lintea sau ouăle aduc zinc.',
          why: 'Zincul participă la producerea hormonilor și la sănătatea pielii, care poate deveni mai grasă când testosteronul crește ușor.',
        },
        {
          id: 'ovu-nut-6',
          title: 'O farfurie colorată',
          body: 'Fructe de pădure, ardei, roșii, verdețuri: cu cât mai multe culori, cu atât mai multe vitamine.',
          why: 'Ovulația este însoțită de o mică reacție inflamatorie în ovar. Legumele și fructele colorate aduc antioxidanți care susțin echilibrul general.',
        },
        {
          id: 'ovu-nut-7',
          title: 'Mai puțin alcool zilele acestea',
          body: 'Dacă bei, alege porții mici și alternează cu apă.',
          why: 'Alcoolul încarcă ficatul, care tocmai procesează vârful de estrogen, și poate tulbura somnul când temperatura corpului începe să urce.',
        },
      ],
      movement: [
        {
          id: 'ovu-mov-1',
          title: 'Folosește energia',
          body: 'Dacă te simți în formă, este un moment bun pentru antrenamente mai solicitante sau pentru activități în grup.',
          why: 'Vârful de estrogen și creșterea ușoară a testosteronului pot aduce forță, viteză și chef de mișcare.',
        },
        {
          id: 'ovu-mov-2',
          title: 'Încălzire atentă',
          body: 'Fă o încălzire bună înainte de efortul intens și oprește-te dacă apare o durere neobișnuită.',
          why: 'Estrogenul ridicat face ligamentele puțin mai elastice, ceea ce, după unele studii, crește ușor riscul de întinderi.',
        },
        {
          id: 'ovu-mov-3',
          title: 'Sport de echipă sau clasă de grup',
          body: 'Un meci, o clasă de spinning sau de dans alături de alții pot fi mai motivante acum.',
          why: 'Multe persoane se simt mai sociabile și mai încrezătoare în jurul ovulației, odată cu vârful de estrogen și de testosteron.',
        },
        {
          id: 'ovu-mov-4',
          title: 'Antrenament de forță',
          body: 'Încearcă o serie în plus sau o greutate puțin mai mare, cu tehnica bine controlată.',
          why: 'Testosteronul și estrogenul ridicate susțin forța musculară, iar unele persoane au cele mai bune rezultate acum.',
        },
        {
          id: 'ovu-mov-5',
          title: 'Protejează-ți genunchii',
          body: 'La sărituri și schimbări bruște de direcție, aterizează cu genunchii ușor îndoiți și aliniați cu vârfurile picioarelor.',
          why: 'Estrogenul ridicat poate face ligamentele mai laxe, iar o tehnică bună protejează articulațiile.',
        },
        {
          id: 'ovu-mov-6',
          title: 'Adaptează efortul la durerea de ovulație',
          body: 'O durere ușoară, de câteva ore, într-o parte a abdomenului poate apărea la ovulație. Dacă o simți, alege o zi mai ușoară.',
          why: 'Când foliculul se deschide ca să elibereze ovulul, puțin lichid poate irita zona. Durerea trece de obicei într-o zi; dacă este puternică, merită discutată cu un medic.',
        },
        {
          id: 'ovu-mov-7',
          title: 'Răcorește-te după efort',
          body: 'Un duș călduț și haine lejere după antrenament ajută corpul să se răcească.',
          why: 'Imediat după ovulație, progesteronul ridică temperatura de bază a corpului, așa că transpiri mai repede.',
        },
      ],
      sleep: [
        {
          id: 'ovu-sle-1',
          title: 'Cameră răcoroasă',
          body: 'Dacă îți este mai cald noaptea, aerisește înainte de culcare și alege așternuturi ușoare.',
          why: 'Progesteronul care apare după ovulație ridică temperatura corpului, iar un corp mai cald adoarme mai greu.',
        },
        {
          id: 'ovu-sle-2',
          title: 'Rutină de seară',
          body: 'Lasă ecranele cu o jumătate de oră înainte de culcare, mai ales dacă energia de peste zi te ține în priză.',
          why: 'Vârful de estrogen poate aduce multă energie și o minte activă; o rutină calmă ajută creierul să treacă spre somn.',
        },
        {
          id: 'ovu-sle-3',
          title: 'Pijamale din bumbac',
          body: 'Materialele naturale, care lasă pielea să respire, ajută dacă transpiri noaptea.',
          why: 'Creșterea temperaturii de după ovulație, adusă de progesteron, poate face nopțile mai calde.',
        },
        {
          id: 'ovu-sle-4',
          title: 'Temperatura, la aceeași oră',
          body: 'Dacă notezi temperatura bazală, măsoar-o dimineața, înainte să te ridici din pat, mereu la aceeași oră.',
          why: 'După ovulație, progesteronul ridică temperatura cu aproximativ 0,2–0,5 °C. O măsurare constantă face ca această creștere să se vadă în grafic.',
        },
        {
          id: 'ovu-sle-5',
          title: 'Cafeaua doar dimineața',
          body: 'Ultima cafea înainte de prânz ajută somnul de noapte.',
          why: 'Cu energia ridicată de vârful de estrogen, cafeina în plus te poate ține în priză până seara târziu.',
        },
        {
          id: 'ovu-sle-6',
          title: 'Liniștește mintea înainte de somn',
          body: 'Câteva minute de citit, de respirație lentă sau de scris înainte de culcare.',
          why: 'Estrogenul stimulează creierul și poate ține gândurile active seara; un moment de liniște ajută trecerea spre somn.',
        },
        {
          id: 'ovu-sle-7',
          title: 'Somn în plus după antrenamente grele',
          body: 'Dacă te antrenezi mai intens zilele acestea, adaugă o jumătate de oră de somn.',
          why: 'Mușchii se refac în somnul profund. Când hormonii susțin efortul mare, odihna completează antrenamentul.',
        },
      ],
      skin: [
        {
          id: 'ovu-ski-1',
          title: 'Curățare blândă',
          body: 'Pielea poate produce mai mult sebum. Curăță fața dimineața și seara, fără să freci.',
          why: 'Creșterea ușoară a testosteronului din jurul ovulației stimulează glandele care produc sebum.',
        },
        {
          id: 'ovu-ski-2',
          title: 'Produse care nu încarcă porii',
          body: 'Dacă observi pori încărcați, alege produse non-comedogenice.',
          why: 'Sebumul în plus, stimulat de hormonii din această fază, poate bloca porii mai ușor.',
        },
        {
          id: 'ovu-ski-3',
          title: 'Hidratant ușor, tip gel',
          body: 'Pielea mai grasă se simte mai bine cu o textură ușoară, care hidratează fără să lucească.',
          why: 'Pielea produce mai mult sebum odată cu testosteronul, dar are nevoie în continuare de apă.',
        },
        {
          id: 'ovu-ski-4',
          title: 'O mască de argilă pe zona T',
          body: 'O mască de argilă, o dată în aceste zile, pe frunte, nas și bărbie, poate absorbi sebumul în plus.',
          why: 'Zona T are cele mai multe glande sebacee, iar ele sunt cele mai sensibile la creșterea ușoară a testosteronului.',
        },
        {
          id: 'ovu-ski-5',
          title: 'Protecție solară, chiar și pe nor',
          body: 'Folosește zilnic un produs cu factor de protecție, inclusiv în zilele înnorate.',
          why: 'Pentru unele persoane, estrogenul ridicat face pielea mai predispusă la pete pigmentare la soare.',
        },
        {
          id: 'ovu-ski-6',
          title: 'Mâinile departe de față',
          body: 'Mâinile duc pe față impurități care pot încărca porii.',
          why: 'Cu sebumul crescut în aceste zile, porii se pot bloca mai ușor, iar impuritățile adăugate accentuează asta.',
        },
        {
          id: 'ovu-ski-7',
          title: 'Schimbă fața de pernă',
          body: 'O față de pernă curată, schimbată de două ori pe săptămână, ajută pielea mai grasă.',
          why: 'Sebumul în plus din această fază se adună pe pernă și ajunge înapoi pe piele în fiecare noapte.',
        },
      ],
    },
  },
  luteal: {
    summary:
      'După ovulație crește progesteronul. Spre finalul fazei, unele persoane observă balonare, sensibilitate la sâni, pofte sau schimbări de dispoziție. Sunt frecvente, dar nu trebuie să fie greu de îndurat.',
    hormones:
      'După ovulație, foliculul rămas în ovar produce progesteron, iar estrogenul crește din nou, mai puțin. Progesteronul încălzește corpul, încetinește digestia și poate crește pofta de mâncare. Dacă nu apare o sarcină, ambii hormoni scad în ultimele zile, ceea ce poate aduce balonare, sensibilitate la sâni sau schimbări de dispoziție, apoi menstruația.',
    tips: {
      nutrition: [
        {
          id: 'lut-nut-1',
          title: 'Mese regulate',
          body: 'Mesele la ore regulate, cu proteine și fibre, pot tempera poftele și variațiile de energie.',
          why: 'Progesteronul crește puțin consumul de energie al corpului și pofta de mâncare. Mesele regulate țin foamea sub control.',
        },
        {
          id: 'lut-nut-2',
          title: 'Mai puțină sare, cafea și alcool',
          body: 'Pentru unele persoane, reducerea lor în zilele dinaintea menstruației diminuează balonarea, sensibilitatea sânilor și iritabilitatea.',
          why: 'Scăderea hormonilor din ultimele zile face corpul să rețină apă, iar sarea, cafeina și alcoolul pot accentua acest efect.',
        },
        {
          id: 'lut-nut-3',
          title: 'Carbohidrați care țin de foame',
          body: 'Ovăzul, cartofii dulci, orezul integral sau leguminoasele potolesc poftele mai bine decât dulciurile.',
          why: 'Înainte de menstruație, serotonina poate scădea odată cu estrogenul, iar carbohidrații complecși îi susțin producția fără salturi de glicemie.',
        },
        {
          id: 'lut-nut-4',
          title: 'Calciu din lactate sau verdețuri',
          body: 'Iaurtul, brânza, migdalele sau verdețurile închise la culoare aduc calciu.',
          why: 'Unele studii arată că un aport bun de calciu poate reduce simptomele din zilele dinaintea menstruației, legate de variațiile hormonale.',
        },
        {
          id: 'lut-nut-5',
          title: 'Ciocolată neagră, cu măsură',
          body: 'Dacă ai poftă de dulce, câteva pătrățele de ciocolată neagră pot fi o alegere bună.',
          why: 'Poftele de dulce sunt legate de scăderea serotoninei dinaintea menstruației. Ciocolata neagră aduce și magneziu.',
        },
        {
          id: 'lut-nut-6',
          title: 'O gustare pregătită dinainte',
          body: 'Ține la îndemână o gustare sățioasă: nuci, un fruct cu iaurt sau hummus cu legume.',
          why: 'Progesteronul poate crește apetitul în a doua parte a ciclului, iar o gustare planificată previne alegerile făcute pe fugă.',
        },
        {
          id: 'lut-nut-7',
          title: 'Alimente cu vitamina B6',
          body: 'Bananele, năutul, peștele sau cartofii aduc vitamina B6.',
          why: 'Vitamina B6 participă la producerea serotoninei, care poate scădea în zilele dinaintea menstruației.',
        },
      ],
      movement: [
        {
          id: 'lut-mov-1',
          title: 'Efort moderat',
          body: 'Mersul pe jos, înotul sau bicicleta pot ajuta dispoziția și balonarea. Dacă energia scade, alege un efort mai ușor.',
          why: 'Progesteronul ridică temperatura corpului și pulsul, așa că același efort poate părea mai greu decât în prima parte a ciclului.',
        },
        {
          id: 'lut-mov-2',
          title: 'Întinderi și respirație',
          body: 'Câteva minute de întinderi sau de respirație lentă pot reduce tensiunea din zilele dinaintea menstruației.',
          why: 'Scăderea hormonilor dinaintea menstruației poate crește tensiunea și iritabilitatea; respirația lentă calmează sistemul nervos.',
        },
        {
          id: 'lut-mov-3',
          title: 'Pilates sau yoga',
          body: 'O sesiune de 20–30 de minute de pilates sau yoga lucrează mușchii fără să te epuizeze.',
          why: 'În faza luteală multe persoane se refac mai greu după efortul intens, iar mișcarea controlată menține forța fără stres în plus.',
        },
        {
          id: 'lut-mov-4',
          title: 'Apă la îndemână la antrenament',
          body: 'Ia o sticlă de apă cu tine și bea câte puțin la fiecare pauză.',
          why: 'Progesteronul ridică temperatura corpului, iar transpirația începe mai devreme în timpul efortului.',
        },
        {
          id: 'lut-mov-5',
          title: 'O plimbare după masă',
          body: 'Zece-cincisprezece minute de mers după masa principală.',
          why: 'Progesteronul încetinește digestia; mersul ușor după masă poate reduce balonarea și senzația de greutate.',
        },
        {
          id: 'lut-mov-6',
          title: 'Ajustează intensitatea',
          body: 'Dacă un antrenament obișnuit pare mai greu, scade puțin ritmul sau greutatea, fără să renunți.',
          why: 'Temperatura și pulsul mai ridicate în această fază fac efortul să pară mai solicitant, chiar dacă forța rămâne aceeași.',
        },
        {
          id: 'lut-mov-7',
          title: 'Mișcare în aer liber',
          body: 'O drumeție ușoară sau o plimbare în parc îmbină mișcarea cu lumina naturală.',
          why: 'Lumina și mișcarea susțin serotonina, care tinde să scadă în ultimele zile dinaintea menstruației.',
        },
      ],
      sleep: [
        {
          id: 'lut-sle-1',
          title: 'Mai mult timp pentru somn',
          body: 'Somnul poate fi mai agitat înainte de menstruație. Culcă-te ceva mai devreme și evită cafeaua după-amiaza.',
          why: 'Scăderea progesteronului în ultimele zile ale ciclului poate face somnul mai superficial și mai întrerupt.',
        },
        {
          id: 'lut-sle-2',
          title: 'Pune gândurile pe hârtie',
          body: 'Dacă mintea nu se oprește seara, notează ce te preocupă înainte de culcare.',
          why: 'Variațiile de estrogen și progesteron dinaintea menstruației pot accentua îngrijorările; scrise pe hârtie, ocupă mai puțin loc seara.',
        },
        {
          id: 'lut-sle-3',
          title: 'Răcorește dormitorul',
          body: 'Aerisește camera și alege o plapumă mai subțire.',
          why: 'Progesteronul ține temperatura corpului cu câteva zecimi de grad mai sus în toată faza luteală, iar căldura întrerupe somnul.',
        },
        {
          id: 'lut-sle-4',
          title: 'Cină ușoară',
          body: 'O cină cu legume și proteine, fără mâncăruri foarte grase sau picante, cu câteva ore înainte de culcare.',
          why: 'Progesteronul încetinește digestia, iar o cină grea poate aduce balonare și un somn agitat.',
        },
        {
          id: 'lut-sle-5',
          title: 'Un ceai cald, fără cafeină',
          body: 'Un ceai de mușețel, tei sau roiniță poate face parte din ritualul de seară.',
          why: 'Un ritual cald și liniștitor ajută corpul să se relaxeze în zilele în care scăderea hormonilor face adormitul mai greu.',
        },
        {
          id: 'lut-sle-6',
          title: 'Confort pentru sânii sensibili',
          body: 'Un bustier moale sau o pernă ținută în brațe pot face somnul pe o parte mai confortabil.',
          why: 'Progesteronul și estrogenul pot face țesutul sânilor să rețină apă în a doua parte a ciclului, de unde sensibilitatea.',
        },
        {
          id: 'lut-sle-7',
          title: 'Ora de culcare, aceeași',
          body: 'Chiar și în weekend, păstrează ora de culcare în limita unei ore față de restul săptămânii.',
          why: 'Somnul mai fragil din zilele dinaintea menstruației, legat de scăderea progesteronului, se ține mai bine într-un program constant.',
        },
      ],
      skin: [
        {
          id: 'lut-ski-1',
          title: 'Atenție la erupții',
          body: 'Înainte de menstruație pot apărea coșuri. Produsele cu acid salicilic sau cu peroxid de benzoil pot ajuta; folosește-le conform prospectului.',
          why: 'Când estrogenul scade la finalul ciclului, efectul testosteronului devine relativ mai mare, iar glandele sebacee produc mai mult.',
        },
        {
          id: 'lut-ski-2',
          title: 'Nu stoarce coșurile',
          body: 'Atinsul și storsul pot lăsa urme. Dacă acneea te deranjează constant, un dermatolog poate recomanda un tratament.',
          why: 'Pielea inflamată din această fază se reface mai greu dacă este atinsă, iar urmele rămân mai mult timp.',
        },
        {
          id: 'lut-ski-3',
          title: 'Curăță pielea după sport',
          body: 'Spală-te pe față cât mai repede după ce transpiri.',
          why: 'Progesteronul crește temperatura și transpirația, iar transpirația amestecată cu sebum poate încărca porii.',
        },
        {
          id: 'lut-ski-4',
          title: 'Compresă rece dimineața',
          body: 'O compresă rece, câteva minute dimineața, poate reduce aspectul umflat al feței.',
          why: 'Retenția de apă dinaintea menstruației, legată de variațiile hormonale, se vede adesea pe față, mai ales dimineața.',
        },
        {
          id: 'lut-ski-5',
          title: 'Tratează doar coșul, nu toată fața',
          body: 'Aplică produsele pentru coșuri doar acolo unde au apărut, ca să nu usuci restul pielii.',
          why: 'Erupțiile hormonale apar de obicei pe bărbie și pe linia maxilarului, iar restul pielii are nevoie în continuare de hidratare.',
        },
        {
          id: 'lut-ski-6',
          title: 'Un prosop doar pentru față',
          body: 'Un prosop curat, folosit doar pentru față și schimbat des, reduce impuritățile care ajung pe piele.',
          why: 'Cu glandele sebacee mai active în această fază, porii încărcați se inflamează mai ușor.',
        },
        {
          id: 'lut-ski-7',
          title: 'Un moment de răsfăț',
          body: 'O baie caldă sau o rutină de îngrijire mai lungă seara poate fi un mod de a te relaxa.',
          why: 'Scăderea hormonilor dinaintea menstruației poate aduce tensiune și iritabilitate; grija față de corp ajută și starea de spirit.',
        },
      ],
    },
  },
};
