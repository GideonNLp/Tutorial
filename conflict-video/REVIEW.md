# REVIEW — Conflictul în organizații

## Ce s-a construit
- Storyline 1 din `STORYLINES.md` („Două replici”): două baloane de dialog din hârtie decupată (portocaliu / albastru) care se ciocnesc, se blochează, se ascultă și ajung la „valori comune”. Celelalte două (ședința văzută de sus; doar tipografie) nu au fost construite.
- 11 scene, câte una pe propoziție; vocea este ceasul, iar cuvintele-cheie aterizează pe cuvântul rostit.
- Subtitrări pe fiecare cuvânt, stil CapCut/TikTok: grupuri de 2–4 cuvinte, cuvântul rostit pe fond negru cu un mic „pop”.
- Sunet: vocea (normalizată de la −27,5 la −16 LUFS, true peak −1,5 dBTP) + efecte incluse în HyperFrames (whoosh pe tăieturi, pop pe ștampile, click, riser → impact pe „priceperea”).

## Ce s-a măsurat / ce nu
- `hyperframes check`: lint, runtime, layout, craft și audio trec. Singurul avertisment rămas: contrast la 64,2 s pe „SECRETUL”, în mijlocul trecerii de culoare albastru → galben (0,4 s). E tranzitoriu și intenționat.
- Sincronizarea subtitrărilor NU vine din transcriere automată: modelul de transcriere nu s-a putut descărca (rețea blocată). Textul tău exact a fost aliniat la pauzele din voce (28 de segmente de vorbire, fiecare propoziție se potrivește cu durata așteptată). Granițele propozițiilor sunt exacte; în interiorul unei fraze, momentul fiecărui cuvânt e estimat după numărul de silabe (eroare tipică sub ~0,2 s).
- Sunetul a fost măsurat, nu ascultat.
- Fără muzică de fundal: nu există o sursă de muzică în sesiune (contul HeyGen nu e conectat).

## Cel mai slab moment
- Scena 6 (etape) începe 1,4 s doar cu linia care se desenează pe fond închis; scena 5 are o pauză scurtă la început, cât timp titlul așteaptă primul exemplu.
- Cu mai mult timp: muzică de fundal sub voce (~0,14 volum) și sincronizare pe cuvânt dintr-o transcriere reală.

## Fișiere
- `index.html` — scenele, subtitrările, vocea și efectele
- `compositions/s1.html … s11.html`, `compositions/captions.html`
- `assets/transcript.json` — timpii cuvintelor; `script.txt` — textul sursă
- `renders/conflictul-in-organizatii.mp4` — fișierul final
