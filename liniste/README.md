# Liniște

Muzică ambientală compusă în timp real, direct în browser, pentru concentrare, respirație și somn. Nu există niciun fișier audio: acordurile, pianul, ploaia, valurile, focul și păsările sunt calculate în clipa în care asculți, așa că muzica nu se termină și nu se repetă.

Totul e un singur fișier, `index.html`. Îl deschizi în orice browser (dublu clic) și merge fără cont, fără server și fără abonament. Doar fonturile se încarcă de pe Google Fonts; fără internet, pagina folosește fonturile sistemului.

## Ce face

| Mod         | Ce face                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------- |
| Ascultă     | Muzică fără sfârșit, în șase locuri: Concentrare, Ploaie, Țărm, Cabană, Somn, Dimineață        |
| Concentrare | Sesiuni de 25, 50 sau 90 de minute, cu pauză, clopoțel la final și numele lucrului din sesiune |
| Respirație  | Patru tehnici (4-7-8, pătrat, coerență, suspin). Muzica se deschide la inspir și se închide la expir |
| Somn        | Muzica se stinge în a doua jumătate a timpului ales, iar ecranul se întunecă odată cu ea         |
| Exportă     | Compune piesa din nou, mai repede decât în timp real, și o salvează ca WAV (44,1 kHz, 16 biți)   |

Jurnalul (minute pe zi, zile la rând, sesiuni) și mixurile se păstrează în `localStorage`, numai în browserul respectiv.

## Piese cu număr

Fiecare piesă are un număr. Același loc și același număr dau mereu aceeași piesă, și în ascultare, și în export: fiecare flux de evenimente (acorduri, melodie, picături, valuri...) are propriul generator aleator, pornit din număr. Linkul păstrează piesa: `index.html#ploaie-4821`.

## Cum e făcută

- **Armonie**: șase moduri (ionic, doric, lidic, mixolidic, eolic), acorduri de septimă în poziție largă, legate printr-un lanț Markov care preferă mersul pe cvarte și terțe și revine din când în când la tonică.
- **Melodie**: un mers aleator pe treptele gamei, în fraze de 2–6 note cu pauze între ele; prima notă din frază cade pe o notă a acordului.
- **Sunete**: pian FM (rhodes, pâslă, clopot, sticlă), pad din unde periodice cu filtru care „respiră”, ploaie din picături de zgomot filtrat, valuri și vânt din zgomot maro și alb modulate, păsări din glissando-uri sinusoidale.
- **Spațiu**: reverb din răspuns la impuls generat, delay pe optimi cu punct, compresor pe ieșire.
- **Imagine**: un shader WebGL care amestecă culorile locului ca pe cerneala în apă; fiecare notă lasă o picătură.

Nivelul fiecărui strat a fost măsurat prin randare offline, ca mixurile implicite să fie echilibrate.

## Teste rapide

Pagina expune `window.__liniste` (motorul, scenele și funcția de randare offline), util pentru verificări din consola browserului:

```js
const L = window.__liniste;
const buf = await L.renderPiece('ploaie', 4821, L.SCENES[1].mix, 10); // 10 secunde
```
