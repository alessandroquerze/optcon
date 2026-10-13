# OPTCON — Quaderno interattivo

Base locale degli appunti associati ai tre PDF originali. Il passaggio 1 comprende la mappa completa delle fonti, tre pagine distinte e il laboratorio del costo quadratico. Gli approfondimenti successivi sono esplicitamente indicati come in preparazione.

Il passaggio 2, **O1**, aggiunge nove sezioni complete sulle pp. 2–25 di Ottimizzazione (p. 1: frontespizio), coprendo i 12 concetti assegnati. Sono disponibili laboratori per minimi/argmin, derivate, punti stazionari, insiemi e funzioni convesse, vincoli, limiti quadratici e QP anche singolari o indefiniti. Aprire `ottimizzazione.html#o1-minimi` oppure scegliere “Appunti disponibili”. Gli altri blocchi restano in preparazione.

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
npm.cmd run session -- prompt O1 --save
```

Il prompt viene salvato in UTF-8 in `checkpoints/prompts/O1.md`, con le sole pagine assegnate e gli errata pertinenti. Aprire una nuova sessione con quel prompt; non eseguire automaticamente altri blocchi dopo quello richiesto.

```powershell
npm.cmd run session -- start O1
npm.cmd run session -- watch O1
```

Il monitor avvisa al minuto 75 e segnala il tetto di 90 minuti; non interrompe il modello o altri processi. Una sessione aggiuntiva va conteggiata esplicitamente. Il runner prepara e monitora il lavoro locale; non invoca API o nuove conversazioni autonomamente.

Al termine, scrivere il checkpoint della sessione e usare `npm.cmd run session -- finish O1`: il runner esegue inventario, controllo dei tipi, test numerici, browser e build. Avanza lo stato solo se artefatti e verifiche passano, salvando un rapporto JSON. Per le sessioni successive aggiungere anche i test specifici del nuovo laboratorio.

I contratti Base e i loro hash sono registrati nel manifest. Estendere i moduli registrando nuovi contenuti; per correggere un contratto già concluso documentare la motivazione e verificare le regressioni.
