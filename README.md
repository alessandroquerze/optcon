# OPTCON — Quaderno interattivo

Appunti locali associati ai tre PDF originali, in tre pagine distinte. I passaggi 1–9 sviluppano tutti i contenuti; il passaggio 10 resta la verifica finale trasversale.

Il passaggio 2, **O1**, aggiunge nove sezioni complete sulle pp. 2–25 di Ottimizzazione (p. 1: frontespizio), coprendo i 12 concetti assegnati. Sono disponibili laboratori per minimi/argmin, derivate, punti stazionari, insiemi e funzioni convesse, vincoli, limiti quadratici e QP anche singolari o indefiniti. Aprire `ottimizzazione.html#o1-minimi` oppure scegliere “Appunti disponibili”.

Il passaggio 3, **O2**, aggiunge 11 sezioni complete sulle pp. 26–54: discesa, gradiente/Newton, ricerca di zeri, modelli quadratici, Armijo, convergenza, proiezioni, metodi ammissibili, galleria dei costi e barriere. I metodi hanno esecuzione per passi, cronologia di costo/residuo e casi di fallimento espliciti. Aprire `ottimizzazione.html#o2-discesa`; il modulo si apre anche dal collegamento diretto.

Il passaggio 4, **O3**, completa Ottimizzazione con 10 sezioni sulle pp. 55–81: regolarità, Lagrangiana, KKT del primo/secondo ordine, QP vincolati, Newton, SQP, merito, barriere con uguaglianze e distinzione t/k. Sono disponibili **30 sezioni complete per tutti i 33 concetti teorici** del PDF di Ottimizzazione, oltre al frontespizio. Aprire `ottimizzazione.html#o3-regolarita`.

Il passaggio 5, **I1**, copre Introduzione pp. 1–18: **10 sezioni per 11 concetti teorici**, più il frontespizio. Dieci nuovi laboratori e il costo pesato Base collegano cinque applicazioni, sistemi continui/discreti, stack di traiettorie, equilibri, linearizzazione, retroazione, costi anche semidefiniti e regioni ammissibili. Le riduzioni dimensionali, le ipotesi e la correzione del peso w₂ a p. 16 sono esplicite. Aprire `introduzione.html#i1-motivazioni`. Il blocco riusa presentazione e calcoli O3 senza modificarli.

Il passaggio 6, **I2**, aggiunge **8 sezioni per 9 concetti** sulle pp. 19–30: dinamica come uguaglianza, costi di stadio/terminali, vincoli ai bordi e sul percorso, formulazione discreta, riferimento rispetto a traiettoria e drone planare. Otto nuovi laboratori includono QP scalare verificato con Riccati e drone a sei stati/due spinte, animazione, viste px/py e px/py/tempo, Q/R/QT, massa/inerzia, discretizzazione e limiti fisici. Il calcolo nonlineare è eseguito in un **Web Worker**, con cancellazione, residui e messaggi di arresto. Aprire `introduzione.html#i2-dinamica` oppure `#i2-drone-costo`. Introduzione dispone ora di **18 sezioni per 20 concetti teorici**, fino a p. 30.

Il passaggio 7, **I3**, completa Introduzione con cinque sezioni sulle pp. 31–36 e cinque laboratori: costo integrale, modello del pendolo, equilibri, riferimento e trasferimento ottimizzato. Sono disponibili animazione, piano di fase 2D, viste 3D, parametri fisici e pesi, confronto Eulero/RK4 e griglia raffinata. Il trasferimento usa un Worker cancellabile e distingue tempo t, candidato k, riferimento e traiettoria. Aprire `introduzione.html#i3-continuo` oppure `#i3-pendolo-controllo`. Introduzione dispone di **23 sezioni per tutti i 25 concetti teorici**, oltre al frontespizio, su tutte le 36 pagine. La chiusura ha richiesto una sessione aggiuntiva rispetto alle tre stimate per questo PDF, registrata nel checkpoint.

Il passaggio 8, **K1**, sviluppa KKT pp. 1–12 con **sette sezioni per otto concetti teorici**, oltre al frontespizio. Sette nuovi laboratori mostrano stack, curve/residui, varietà, tangente, controllo senza vincoli aggiuntivi, struttura temporale e richiamo KKT. Sono disponibili superfici 3D, errori di primo/secondo ordine, dimensioni n/m/T modificabili, QP verificato con Riccati e controesempi su regolarità/minimi. Aprire `kkt.html#k1-varieta` oppure `#k1-tangente`. I soli vincoli dinamici usano h=f−x successivo; i moduli precedenti restano stabili.

Il passaggio 9, **K2**, completa KKT con quattro sezioni sulle pp. 13–20 e quattro laboratori: Lagrangiana temporale, costati, controllo vincolato e KKT. Sono disponibili forward/backward per passi, viste stato/costato/tempo, raggiungibilità, QP con active set, limiti, bordi e perturbazioni dei moltiplicatori. KKT dispone di **11 sezioni per tutti i 12 concetti teorici**, su tutte le 20 pagine. I tre PDF hanno complessivamente **64 sezioni per 70 concetti teorici**, oltre ai tre frontespizi. Aprire `kkt.html#k2-costati` oppure `#k2-kkt`. Il prossimo blocco è **VERIFICA**, separato e non avviato automaticamente.

Per avviare il sito da PowerShell:

```powershell
cd C:\Users\querz\Desktop\optcon\web
npm.cmd ci
npm.cmd run dev
```

Aprire l'indirizzo `http://127.0.0.1:5173` stampato da Vite. Le pagine sono `introduzione.html`, `ottimizzazione.html` e `kkt.html`; la home è `index.html`. Il laboratorio si trova in `ottimizzazione.html#laboratorio`. Dopo la prima installazione gli asset e i PDF sono locali: l'applicazione non richiede servizi esterni.

`npm.cmd` evita il blocco di `npm.ps1` presente in alcune configurazioni PowerShell. È richiesto Node >=22.12 oppure una versione >=20.19 compatibile con Vite 7.

## Verifiche e build

```powershell
npm.cmd run check:inventory
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:browser
npm.cmd run build
npm.cmd run preview
```

La build statica viene generata in `web/dist/`. Il test browser usa Chrome/Edge già installato, senza finestra, e un server temporaneo; in alternativa impostare `OPTCON_BROWSER_PATH`. Non è necessario scaricare un browser aggiuntivo. `preview` serve la build su `http://127.0.0.1:4173`.

Per controllare il modulo K1 compilato: `node tests/K1/production.mjs`, da `web/`, dopo la build. La prova avvia e termina un server temporaneo.

La prova K2 compilata è `node tests/K2/production.mjs`. L’active set riusa i QP O3; la raggiungibilità esatta e la certificazione convessa sono specifiche del modello scalare lineare con a,b>0. I vincoli di stato del percorso non includono automaticamente il terminale. ∂L/∂μ=g non deve annullarsi: si verificano g≤0, μ≥0 e μg=0.

## Fonti e struttura

- `sources/inventory.json`: 73 voci, compresi 3 frontespizi, con pagine fisiche, riepiloghi, parametri, visualizzazioni e registro degli errata.
- `sources/extracted/`: testo grezzo e testo normalizzato per ognuna delle 137 pagine, metadati e SHA-256 degli originali. Il testo estratto non certifica le formule.
- `web/content/`: schema delle sezioni e catalogo; `web/demos/`: laboratori caricati quando servono; `web/math/`: calcolo puro; `web/ui/`: controlli, formule, grafici e stile.
- `manifest.json` e `checkpoints/`: perimetro, dipendenze, stato, verifiche e istruzioni di ripresa.

Per ripetere l'estrazione dalla radice:

```powershell
python -m pip install -r scripts/requirements-pdf.txt
python scripts/extract_pdfs.py
```

La riestrazione conserva le voci curate e gli stati dei laboratori. Le copie dei PDF in `web/public/pdfs/` sono preparate automaticamente prima di dev/build e non sono versionate; gli originali restano nella radice.

## Una sessione alla volta

Da `web/`:

```powershell
npm.cmd run session -- next
npm.cmd run session -- prompt VERIFICA --save
```

Il prompt viene salvato in UTF-8 in `checkpoints/prompts/VERIFICA.md`, con le sole pagine assegnate, gli errata pertinenti e i checkpoint delle dipendenze. Aprire una nuova sessione con quel prompt; non eseguire automaticamente altri blocchi dopo quello richiesto.

```powershell
npm.cmd run session -- start VERIFICA
npm.cmd run session -- watch VERIFICA
```

Il monitor avvisa al minuto 75 e segnala il tetto di 90 minuti; non interrompe il modello o altri processi. Una sessione aggiuntiva va conteggiata esplicitamente. Il runner prepara e monitora il lavoro locale; non invoca API o nuove conversazioni autonomamente.

Al termine, scrivere il checkpoint della sessione e usare `npm.cmd run session -- finish VERIFICA`: il runner esegue inventario, controllo dei tipi, test numerici, browser e build. Avanza lo stato solo se artefatti e verifiche passano, salvando un rapporto JSON. Per le sessioni successive aggiungere anche i test specifici del nuovo laboratorio.

I contratti Base e i loro hash sono registrati nel manifest. Estendere i moduli registrando nuovi contenuti; per correggere un contratto già concluso documentare la motivazione e verificare le regressioni.

## Nucleo numerico riutilizzabile

`web/math/O3/solver.ts` espone `solveLinear`, `nullBasis`, `solveEqualityQP`, `formStep`, `residuals`, `searchMerit` e `solveSQP`, tutti senza DOM e con dimensione variabile. `SmoothProblem` fornisce costo/gradiente/Hessiana, uguaglianze/Jacobiano (una riga per vincolo) e Hessiane dei vincoli, oppure assemblaggio diretto `lagrangianHessian`. Un predicato `interior` permette di rifiutare passi fuori dal dominio di una barriera. `searchMerit` richiede una direzione che soddisfi `Jh d = -h`.

Il QP richiede rango pieno delle righe di A e controlla la positività ridotta prima di dichiarare un minimo unico; Newton per zeri può invece risolvere anche un sistema indefinito, senza dichiararlo un minimo. Il solutore conserva cronologia e motivi di arresto, distingue `lambdaQP` da `deltaLambda` e interpola i moltiplicatori con il passo. La fattorizzazione è densa, con un limite di 640 righe del sistema; non è un solutore sparso per grandi orizzonti. Le prove sulle traiettorie confrontano il risultato con una ricorsione di Riccati indipendente.

Per I2/I3 riusare il contratto, fornendo derivate coerenti e costruendo il problema dentro un Web Worker quando il calcolo diventa impegnativo. Le disuguaglianze possono essere trattate con una barriera interna; non è implementato un metodo generale di fase I per trovare una partenza strettamente ammissibile.

I3 riusa RK4 di I1 e i QP/merito di O3 per il pendolo continuo, con sensibilità analitiche e costo integrato sugli stessi stadi della dinamica. Il costo di p. 36 è senza ½ e include il fattore temporale; terminale esatto e limiti di coppia sono opzioni dichiarate. La simulazione con quattro sottopassi RK4 mantiene il comando finale e misura lo scarto della discretizzazione, senza riottimizzare. Il residuo indica stazionarietà, senza garanzia globale. Le prove della build con i due Worker sono `node tests/I2/production.mjs` e `node tests/I3/production.mjs`, da `web/`.

Il modulo I2 `web/math/I2/drone.ts` riusa `solveEqualityQP`, `searchMerit` e `residuals` di O3 in un metodo SQP/Gauss–Newton con eliminazione degli stati tramite rollout. `droneStep`, `droneJacobians`, `droneSensitivities`, `assembleDrone` e `solveDrone` sono puri. `assembleDrone.model` è una matrice di curvatura Gauss–Newton, non la Hessiana esatta. Il seed è hovering, i limiti sono imposti tramite barriera e il terminale opzionale fissa solo la posizione. Sono mostrati candidati, costo senza barriera, violazioni e residuo KKT relativo al singolo ε. Nessuna garanzia globale per il problema nonlineare. Il Web Worker viene sostituito quando cambiano i parametri e terminato all’uscita; tempo osservato, animazione, vista e selezione di k riusano il risultato già calcolato.
