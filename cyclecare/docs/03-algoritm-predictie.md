# Algoritmul de predicție a ciclului

Implementarea este în `src/domain/cycles.ts` și `src/domain/prediction.ts`; pașii de mai jos au aceleași numere ca în comentariile din cod. Testele sunt în `tests/cycles.test.ts` și `tests/prediction.test.ts`.

> Algoritmul produce **estimări**, cu un interval explicit. Nu este un dispozitiv medical și nu este un mijloc de contracepție. Pragurile și constantele sunt alegeri de proiectare documentate aici; trebuie revizuite de un medic înainte de lansare.

## 1. Ce primește și ce produce

**Intrări**

- jurnalul: pentru fiecare zi, fluxul notat (`spotting`, `light`, `medium`, `heavy`, `unspecified`);
- duratele declarate la început, dacă există: ciclul (21–45 de zile) și menstruația (2–10 zile);
- ziua de azi.

**Ieșiri**

- ciclurile înregistrate, cu durata lor;
- pentru ciclul curent: ziua ciclului, data cea mai probabilă a următoarei menstruații, **intervalul** în care este așteptată, starea (în grafic, așteptată, întârziată) și precizia estimării;
- ovulația și zilele fertile estimate;
- faza pentru orice zi: din trecut, de azi sau din următoarele trei cicluri.

Nimic nu este memorat între rulări. Algoritmul este o funcție pură a jurnalului și se reface la fiecare modificare: aceasta este „ajustarea automată”.

## 2. Constante

| Constantă | Valoare | Rol |
|---|---|---|
| `PERIOD_MERGE_GAP` | 2 zile | Zile fără sângerare tolerate în interiorul aceleiași menstruații |
| `MIN_CYCLE_LENGTH` | 15 zile | O sângerare care începe mai devreme de atât după începutul ciclului nu deschide un ciclu nou |
| `MAX_CYCLE_LENGTH` | 90 de zile | Ciclurile mai lungi sunt tratate ca goluri în înregistrări și nu intră în medie |
| `MOVING_WINDOW` | 6 cicluri | Fereastra mediei mobile |
| `PRIOR_OBSERVATIONS` | 3 | Până la atâtea cicluri înregistrate, durata declarată completează observațiile lipsă |
| `DEFAULT_CYCLE_LENGTH`, `DEFAULT_PERIOD_LENGTH` | 28 și 5 zile | Folosite când întrebările au fost sărite |
| `SIGMA_PRIOR` | 3 zile | Variabilitatea presupusă înainte ca datele să o poată arăta |
| `SIGMA_PRIOR_WEIGHT` | 2 | Ponderea acestei presupuneri, în grade de libertate |
| `Z_80` | 1,2816 | Cuantila normală pentru un interval bilateral de 80 % |
| `LUTEAL_PHASE_DAYS` | 14 zile | Zilele dintre ovulația estimată și următoarea menstruație |
| `FERTILE_DAYS_BEFORE`, `FERTILE_DAYS_AFTER` | 5 și 1 | Fereastra fertilă estimată, față de ziua ovulației |
| `FORECAST_CYCLES` | 3 | Câte cicluri viitoare se afișează |

## 3. Pașii

### Pasul 1 — Zilele de menstruație devin sângerări

Se iau toate zilele cu flux `light`, `medium`, `heavy` sau `unspecified`, în ordine. Spottingul este ignorat: nu este zi de menstruație.

Zilele se grupează în **sângerări**: două zile cu flux aparțin aceleiași sângerări dacă între ele sunt cel mult 2 zile fără flux. După 3 zile fără flux începe o sângerare nouă.

```
zile cu flux:  1  2  .  .  5  .  .  .  9     →   sângerarea A: zilele 1–5 (durată 5)
                                                  sângerarea B: ziua 9
```

Durata unei sângerări se numără de la prima la ultima zi cu flux, cu tot cu zilele goale dintre ele.

### Pasul 2 — Care sângerări deschid un ciclu

Sângerările se parcurg în ordine:

- prima deschide primul ciclu;
- fiecare dintre următoarele deschide un ciclu nou **numai dacă** începe la cel puțin 15 zile după începutul ciclului în curs;
- altfel rămâne în ciclul în curs, ca **sângerare între menstruații**.

Motivul: o sângerare notată la mijlocul ciclului nu trebuie să taie un ciclu de 28 de zile în două cicluri scurte, care ar strica media. Aceste sângerări nu se pierd: apar pe calendar și pot declanșa o observație (vezi `04-sablon-continut-sfaturi.md`).

### Pasul 3 — Durata ciclurilor

Ziua 1 a unui ciclu este prima zi a menstruației care îl deschide. Durata unui ciclu încheiat este numărul de zile de la ziua lui 1 până la ziua 1 a ciclului următor. Ultimul ciclu este **în curs** și nu are durată.

### Pasul 4 — Ce cicluri intră în calcule

Un ciclu încheiat este **valid** dacă are cel mult 90 de zile. (Limita de jos, 15 zile, este deja asigurată de pasul 2.) Un ciclu mai lung de 90 de zile înseamnă de obicei menstruații nenotate; este păstrat în istoric, marcat ca atare, dar nu intră în medie.

### Pasul 5 — Media mobilă

Fie `x₁ … xₙ` duratele ultimelor cicluri valide, cel mult 6 (`n ≤ 6`), și `P` durata declarată (sau 28, dacă întrebarea a fost sărită).

Cât timp există mai puțin de 3 cicluri înregistrate, durata declarată ține locul observațiilor lipsă:

```
k = max(0, 3 − n)                    câte observații lipsă completează durata declarată
medie = (x₁ + … + xₙ + k · P) / (n + k)
N = n + k                            numărul efectiv de observații (cel puțin 3)
```

| Cicluri înregistrate | Media folosită |
|---|---|
| 0 | durata declarată |
| 1 | (ciclul + 2 × durata declarată) / 3 |
| 2 | (cele două cicluri + durata declarată) / 3 |
| 3–6 | media ciclurilor înregistrate |
| peste 6 | media ultimelor 6 |

Așa, o singură lună neobișnuită nu răstoarnă estimarea unei persoane nou-venite, iar după trei cicluri contează doar ce s-a înregistrat.

Durata estimată a ciclului este `L = rotunjire(medie)`.

### Pasul 6 — Variabilitatea

Intervalul depinde de cât de mult variază ciclurile persoanei. Cu puține cicluri, abaterea standard măsurată este nesigură, așa că este combinată cu o valoare presupusă de 3 zile, cu o pondere mică, fixă:

```
dacă n < 2:   σ = 3
altfel:       s² = Σ (xᵢ − x̄)² / (n − 1)                 dispersia măsurată
              σ² = ((n − 1) · s² + 2 · 3²) / ((n − 1) + 2)
```

Pe măsură ce se adună cicluri, măsurătoarea domină. Presupunerea nu dispare complet nici la 6 cicluri, ceea ce ține intervalul la cel puțin ±2 zile chiar și pentru cicluri perfect regulate: nici un ciclu regulat nu vine la zi fixă.

### Pasul 7 — Următoarea menstruație, cu interval

```
data cea mai probabilă = începutul ciclului curent + L
h = max(1, rotunjire(1,2816 · σ · √(1 + 1/N)))
interval = [data cea mai probabilă − h,  data cea mai probabilă + h]
```

Termenul `√(1 + 1/N)` adaugă la variația de la un ciclu la altul și nesiguranța mediei înseși. Rezultatul este un interval de predicție de aproximativ 80 %: dacă presupunerile țin, în jur de patru menstruații din cinci ar trebui să înceapă în interval. Procentul nu a fost încă verificat pe date reale și nu este afișat ca promisiune; interfața spune „probabil între … și …”.

**Starea** rezultă din poziția zilei de azi față de interval:

| Stare | Condiție | Ce afișează aplicația |
|---|---|---|
| în grafic | azi este înaintea intervalului | intervalul și data cea mai probabilă |
| așteptată | azi este în interval | „Poate începe în orice zi”, cu capătul intervalului |
| întârziată | azi a trecut de interval | cu câte zile întârzie față de data cea mai probabilă |

**Precizia** afișată lângă estimare:

| Precizie | Condiție |
|---|---|
| bună | cel puțin 4 cicluri înregistrate și `h ≤ 3` |
| medie | cel puțin 2 cicluri înregistrate și `h ≤ 5` |
| scăzută | altfel |

### Pasul 8 — Durata menstruației

Același estimator ca la pasul 5, aplicat duratelor ultimelor 6 menstruații încheiate, cu durata declarată (sau 5) în locul observațiilor lipsă. Menstruațiile notate într-o singură zi sunt lăsate deoparte: de obicei înseamnă că s-a notat doar începutul. Rezultatul este rotunjit și ținut între 1 și 14 zile.

Pentru ciclul curent, dacă menstruația a început de curând și încă nu au trecut 3 zile fără flux, zilele de azi până la durata obișnuită sunt arătate ca **menstruație estimată**. Zilele deja trecute fără flux notat nu sunt completate.

### Pasul 9 — Ovulația, zilele fertile și fazele

Ovulația este plasată cu 14 zile înaintea următoarei menstruații: ziua ciclului `L − 14` (ziua 14 într-un ciclu de 28 de zile, ziua 18 într-unul de 32).

```
ziua ovulației      = L − 14
zile fertile        = de la (ziua ovulației − 5) până la (ziua ovulației + 1)
```

Fazele unei zile, în această ordine de prioritate:

| Fază | Zilele ciclului |
|---|---|
| Menstruație | de la ziua 1 până la sfârșitul menstruației (notate sau estimate) |
| Faza foliculară | după menstruație, până cu două zile înaintea ovulației |
| Ovulație | ziua ovulației, cea dinainte și cea de după |
| Faza luteală | de la a doua zi după ovulație până la sfârșitul ciclului |

Exemplu, ciclu de 28 de zile cu menstruație de 5 zile: menstruație 1–5, faza foliculară 6–12, ovulație 13–15, faza luteală 16–28; zile fertile 9–15.

Pentru **ciclurile încheiate**, fazele se așază înapoi de la durata lor reală, nu de la medie: privind în urmă, ovulația unui ciclu de 32 de zile este plasată în ziua 18. Pentru ciclurile mai lungi de 90 de zile se arată doar menstruația.

Dacă persoana a oprit estimările de fertilitate, pașii se calculează la fel, dar interfața arată doar menstruația și estimarea următoarei menstruații.

### Pasul 10 — Ciclurile următoare

Se proiectează 3 cicluri. Al `k`-lea ciclu viitor (`k = 1, 2, 3`) începe la:

```
început₁ = max(data cea mai probabilă, azi)       o menstruație nu poate începe în trecut
începutₖ = început₁ + (k − 1) · L
hₖ = max(1, rotunjire(1,2816 · σ · √(k + k²/N)))
```

Nesiguranța crește cu fiecare ciclu: variațiile se adună, iar eroarea mediei se înmulțește. Dincolo de al treilea ciclu calendarul nu mai arată nimic.

Când data cea mai probabilă a trecut fără ca menstruația să fie notată:

- zilele de după data estimată **nu primesc nicio fază**: estimarea s-a terminat acolo, iar aplicația nu pretinde că știe ce urmează;
- cât timp ziua de azi este încă în interval (starea „așteptată”), ciclurile următoare se desenează pornind de azi;
- după ce ziua de azi a trecut de interval (starea „întârziată”), se arată **doar** menstruația așteptată, începând de azi. Fazele, ovulația și zilele fertile ale ciclurilor următoare nu se mai estimează, iar memento-urile pentru zilele fertile se opresc, până când următoarea menstruație este notată. Un ciclu care nu a urmat estimarea nu este o bază bună pentru altele.

### Pasul 11 — Recalcularea

Toți pașii se refac la fiecare schimbare a jurnalului și la schimbarea zilei. O menstruație nou notată închide ciclul curent, intră în fereastra de 6 și o scoate pe cea mai veche.

## 4. Exemple cu cifre

### 4.1 Șase cicluri înregistrate

Durate, de la cea mai veche: 28, 29, 26, 30, 27, 28. Ciclul curent a început pe 4 noiembrie.

```
medie = 168 / 6 = 28,0                         L = 28
s² = (0 + 1 + 4 + 4 + 1 + 0) / 5 = 2,0
σ² = (5 · 2,0 + 2 · 9) / 7 = 4,0               σ = 2,0
h  = rotunjire(1,2816 · 2,0 · √(1 + 1/6)) = rotunjire(2,77) = 3
```

Următoarea menstruație: cel mai probabil 2 decembrie, **probabil între 29 noiembrie și 5 decembrie**. Precizie bună (6 cicluri, `h = 3`). Ovulație estimată în ziua 14 (17 noiembrie), zile fertile estimate 12–18 noiembrie.

### 4.2 Abia început: doar răspunsurile de la prima configurare

Ciclu declarat de 30 de zile, ultima menstruație pe 4 noiembrie, niciun ciclu înregistrat.

```
n = 0, k = 3      medie = 30      σ = 3      N = 3
h = rotunjire(1,2816 · 3 · √(1 + 1/3)) = rotunjire(4,44) = 4
```

Următoarea menstruație: cel mai probabil 4 decembrie, probabil între 30 noiembrie și 8 decembrie. Precizie scăzută, „pe baza duratei declarate de tine”.

### 4.3 Un singur ciclu înregistrat, diferit de cel declarat

Declarat 28, înregistrat 33:

```
n = 1, k = 2      medie = (33 + 2 · 28) / 3 = 29,7      L = 30      σ = 3      h = 4
```

Estimarea se mișcă spre ce s-a înregistrat, fără să sară direct la 33.

### 4.4 Cicluri neregulate

Durate: 24, 36, 29, 40, 26, 34.

```
medie = 189 / 6 = 31,5                         L = 32
s² = 191,5 / 5 = 38,3
σ² = (5 · 38,3 + 18) / 7 = 29,9                σ = 5,5
h  = rotunjire(1,2816 · 5,5 · √(1 + 1/6)) = rotunjire(7,6) = 8
```

Intervalul este de ±8 zile, iar precizia „scăzută”: aplicația nu pretinde mai mult decât arată datele. În plus apare observația despre cicluri cu durată variabilă (între 24 și 40 de zile).

## 5. Cazuri-limită

| Situație | Comportament |
|---|---|
| Nicio menstruație notată | Nu există estimare; aplicația invită la notarea primei zile |
| Întrebările de la început sărite | Se pornește de la 28 și 5 zile, cu precizie scăzută |
| Spotting înainte de menstruație | Ignorat; ziua 1 este prima zi cu flux |
| O zi goală în mijlocul menstruației | Aceeași menstruație (cel mult 2 zile goale) |
| Sângerare la mijlocul ciclului | Rămâne în ciclul curent, ca sângerare între menstruații |
| Două sângerări la mai puțin de 15 zile | A doua nu deschide un ciclu; apare observația corespunzătoare dacă se repetă |
| Luni întregi fără nicio notare | Ciclul rezultat (peste 90 de zile) nu intră în medie |
| Menstruație întârziată | Stare „întârziată”; se arată doar menstruația așteptată, de azi; fazele și zilele fertile următoare sunt suspendate; după 90 de zile apare o observație |
| Doar prima zi a menstruației notată | Durata menstruației rămâne cea declarată; ciclul se măsoară corect |
| Ciclu foarte scurt (15–20 de zile) | Fazele se pot suprapune; menstruația are prioritate la afișare |
| Corectarea unei zile din trecut | Totul se recalculează; nu există stare veche de reparat |

## 6. Limite

- **Metoda este calendaristică.** Ovulația este dedusă din durata ciclurilor, nu observată. Poate greși cu mai multe zile, mai ales la cicluri neregulate. De aceea zilele fertile nu sunt niciodată prezentate ca zile „sigure” sau „nesigure”, iar avertismentul de contracepție însoțește fiecare afișare.
- **Presupune cicluri naturale.** Estimările nu se aplică în timpul contracepției hormonale și sunt mai puțin de încredere după naștere, în perioada de alăptare, la adolescență și la perimenopauză. Comutatorul din „Ciclul meu” ascunde fazele și fertilitatea.
- **Temperatura bazală și secreția cervicală nu intră în calcul.** Sunt înregistrate, afișate și incluse în raport, dar nu schimbă estimarea. O extindere firească este confirmarea ovulației, privind înapoi, dintr-o creștere susținută a temperaturii; ar trebui validată medical și prezentată tot ca estimare.
- **Intervalul de 80 % este un model, nu o garanție.** Presupune că duratele ciclurilor variază aproximativ normal și independent. Înainte de lansare ar trebui verificat pe date reale, anonimizate, dacă intervalele acoperă într-adevăr proporția anunțată.
- **Pragurile sunt alegeri.** Fereastra de 6 cicluri este cerința produsului; limitele de 15 și 90 de zile, cele 2 zile de toleranță și cele 14 zile ale fazei luteale sunt valori uzuale, care se pot ajusta într-un singur loc din cod.

## 7. Pe scurt, în pseudocod

```
sângerări ← grupează(zile cu flux de menstruație, cel mult 2 zile goale între ele)
cicluri   ← []
pentru fiecare sângerare:
    dacă cicluri e gol sau sângerare.început − ultimul_ciclu.început ≥ 15:
        închide ultimul ciclu (durată = diferența dintre începuturi; valid dacă ≤ 90)
        deschide un ciclu nou
    altfel:
        adaug-o la ultimul ciclu, ca sângerare între menstruații

x ← duratele ultimelor cel mult 6 cicluri valide;  n ← |x|;  k ← max(0, 3 − n)
medie ← (Σx + k · durata_declarată) / (n + k);  N ← n + k
σ ← 3 dacă n < 2, altfel √(((n − 1) · s² + 18) / (n + 1))
L ← rotunjire(medie)
h ← max(1, rotunjire(1,2816 · σ · √(1 + 1/N)))

următoarea ← început_ciclu_curent + L
interval   ← [următoarea − h, următoarea + h]
ovulație   ← ziua (L − 14) a ciclului
fertile    ← ovulație − 5 … ovulație + 1
```
