# OPTCON — Quaderno interattivo

Appunti locali associati ai tre PDF originali. Il passaggio 1 comprende la mappa completa delle fonti, tre pagine distinte e il laboratorio del costo quadratico. Gli argomenti ancora da sviluppare sono esplicitamente indicati come in preparazione.

Il passaggio 2, **O1**, aggiunge nove sezioni complete sulle pp. 2–25 di Ottimizzazione (p. 1: frontespizio), coprendo i 12 concetti assegnati. Sono disponibili laboratori per minimi/argmin, derivate, punti stazionari, insiemi e funzioni convesse, vincoli, limiti quadratici e QP anche singolari o indefiniti. Aprire `ottimizzazione.html#o1-minimi` oppure scegliere “Appunti disponibili”.

Il passaggio 3, **O2**, aggiunge 11 sezioni complete sulle pp. 26–54: discesa, gradiente/Newton, ricerca di zeri, modelli quadratici, Armijo, convergenza, proiezioni, metodi ammissibili, galleria dei costi e barriere. I metodi hanno esecuzione per passi, cronologia di costo/residuo e casi di fallimento espliciti. Aprire `ottimizzazione.html#o2-discesa`; il modulo si apre anche dal collegamento diretto.

Il passaggio 4, **O3**, completa Ottimizzazione con 10 sezioni sulle pp. 55–81: regolarità, Lagrangiana, KKT del primo/secondo ordine, QP vincolati, Newton, SQP, merito, barriere con uguaglianze e distinzione t/k. Sono ora disponibili **30 sezioni complete per tutti i 33 concetti teorici** del PDF di Ottimizzazione, oltre al frontespizio. Aprire `ottimizzazione.html#o3-regolarita`. Il prossimo blocco è I1; non viene avviato automaticamente.

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
npm.cmd run session -- prompt I1 --save
```

Il prompt viene salvato in UTF-8 in `checkpoints/prompts/I1.md`, con le sole pagine assegnate, gli errata pertinenti e i checkpoint delle dipendenze. Aprire una nuova sessione con quel prompt; non eseguire automaticamente altri blocchi dopo quello richiesto.

```powershell
npm.cmd run session -- start I1
npm.cmd run session -- watch I1
```

Il monitor avvisa al minuto 75 e segnala il tetto di 90 minuti; non interrompe il modello o altri processi. Una sessione aggiuntiva va conteggiata esplicitamente. Il runner prepara e monitora il lavoro locale; non invoca API o nuove conversazioni autonomamente.

Al termine, scrivere il checkpoint della sessione e usare `npm.cmd run session -- finish I1`: il runner esegue inventario, controllo dei tipi, test numerici, browser e build. Avanza lo stato solo se artefatti e verifiche passano, salvando un rapporto JSON. Per le sessioni successive aggiungere anche i test specifici del nuovo laboratorio.

I contratti Base e i loro hash sono registrati nel manifest. Estendere i moduli registrando nuovi contenuti; per correggere un contratto già concluso documentare la motivazione e verificare le regressioni.

## Nucleo numerico riutilizzabile

`web/math/O3/solver.ts` espone `solveLinear`, `nullBasis`, `solveEqualityQP`, `formStep`, `residuals`, `searchMerit` e `solveSQP`, tutti senza DOM e con dimensione variabile. `SmoothProblem` fornisce costo/gradiente/Hessiana, uguaglianze/Jacobiano (una riga per vincolo) e Hessiane dei vincoli, oppure assemblaggio diretto `lagrangianHessian`. Un predicato `interior` permette di rifiutare passi fuori dal dominio di una barriera. `searchMerit` richiede una direzione che soddisfi `Jh d = -h`.

Il QP richiede rango pieno delle righe di A e controlla la positività ridotta prima di dichiarare un minimo unico; Newton per zeri può invece risolvere anche un sistema indefinito, senza dichiararlo un minimo. Il solutore conserva cronologia e motivi di arresto, distingue `lambdaQP` da `deltaLambda` e interpola i moltiplicatori con il passo. La fattorizzazione è densa, con un limite di 640 righe del sistema; non è un solutore sparso per grandi orizzonti. Le prove sulle traiettorie confrontano il risultato con una ricorsione di Riccati indipendente.

Per I2/I3 riusare il contratto, fornendo derivate coerenti e costruendo il problema dentro un Web Worker quando il calcolo diventa impegnativo. Le disuguaglianze possono essere trattate con una barriera interna; non è implementato un metodo generale di fase I per trovare una partenza strettamente ammissibile.
