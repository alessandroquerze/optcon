# BASE — Fondazione del quaderno

Sessione iniziata il 13 ottobre 2026 alle 18:13 (Europe/Rome). Il tempo del lavoro attivo è registrato in `manifest.json`.

**Conclusa alle 18:46, in circa 33 minuti.** Il manifest indica BASE completata e tutti gli altri blocchi ancora da avviare. La versione locale ripristinabile è identificata dal tag Git `base-v1.1`.

## Perimetro e consegna

È stato eseguito soltanto il passaggio 1 del piano. Il progetto è locale in `web/`; i tre capitoli successivi sono organizzati e navigabili, con brevi tracce, ma non dichiarati come appunti completi.

- Estrazione riproducibile di 36 + 81 + 20 pagine, testo grezzo/normalizzato e hash degli originali in `sources/extracted/`.
- Inventario di 73 voci (70 concetti e 3 frontespizi). Ogni pagina è coperta; ogni concetto ha visualizzazioni e parametri previsti, salvo i frontespizi con motivazione esplicita.
- Quattro ingressi HTML: home, introduzione, ottimizzazione e KKT. Indici, mappa dei concetti e PDF locali con rimandi alle pagine fisiche.
- Laboratorio completo `weighted-cost`: 7 parametri, 3 casi preimpostati, ripristino, curve di livello 2D e superficie 3D, costo, gradiente, spettro, condizionamento e matrice W. I dati sono ricalcolati, non animazioni preconfezionate.
- Contratti TypeScript, componenti comuni e caricamento differito; renderer predisposto per aggiungere sezioni LessonSection senza riscrivere le pagine.
- Manifest delle 10 sessioni e runner di preparazione, monitoraggio e verifica. Il runner non invoca nuove conversazioni; una sessione aggiuntiva va contata come tale.

## Decisioni da preservare

Vite 7 + TypeScript, KaTeX e Plotly.js, dipendenze fissate nel lockfile. Il bundle Plotly completo è caricato soltanto al laboratorio perché occorrono curve di livello e superfici 3D. Il laboratorio Base è un QP strettamente convesso con minimo analitico noto; non anticipa il solutore SQP o gli algoritmi dei blocchi successivi.

I parametri sono separati dal rendering: `computeQuadratic` non usa il DOM; `createPlot` serializza gli aggiornamenti ed elimina le risorse; i controlli sincronizzano slider e input numerici. Coordinate e costi dell'esempio sono adimensionali. La rotazione è un'estensione didattica della distanza pesata delle slide.

I PDF restano originali; la generazione del sito prepara copie locali non versionate. Lo schema si trova in `web/content/schema.ts`; gli hash dei contratti congelati sono registrati nel manifest e nel rapporto di verifica.

Gli attributi Git fissano LF per i file testuali, così un ripristino su Windows conserva gli hash dei contratti. Dopo le verifiche sono stati normalizzati soltanto i terminatori del CSS, senza modificare regole o comportamento; il rapporto registra l'adeguamento degli hash.

## Verifiche

Il rapporto definitivo è `checkpoints/BASE-validation.json`, prodotto dal comando `finish BASE` solo dopo inventario, TypeScript, test numerici, browser e build. Le verifiche browser coprono navigazione diretta, PDF, parametri, preset, ripristino, vista 3D, tastiera e layout a 390 px; gli screenshot sono in `artifacts/` (non versionati).

Esito: copertura e hash di tutti i PDF verificati; controllo TypeScript superato; **7 test numerici e 4 test browser superati**; build statica riuscita con quattro pagine HTML e tre PDF. Le viste 2D e 3D sono state anche controllate visivamente. È stata verificata la corrispondenza degli hash dei contratti dopo la build. Il bundle Plotly pesa circa 4,84 MB (1,47 MB gzip), caricato su richiesta; non ci sono asset caricati da CDN.

## Ambiente e ripresa

L'helper d'installazione Sites non ha risolto il launcher npm Windows; l'installazione è stata completata tramite il percorso assoluto di `npm-cli.js`. Le verifiche nel sandbox Windows hanno richiesto esecuzione autorizzata per Node/browser. Per l'uso normale da PowerShell sono documentati comandi `npm.cmd`, che evitano `npm.ps1` bloccato dalla execution policy.

Il prossimo blocco è **O1**, Ottimizzazione pp. 1–25. Il prompt è già pronto in `checkpoints/prompts/O1.md`; il comando `npm.cmd run session -- prompt O1 --save` permette di rigenerarlo. Iniziare una nuova sessione, senza considerarla una continuazione della Base. Riutilizzare `weighted-cost` per geometria del QP; aggiungere grafici per minimi/selle, convessità, derivate e limiti quadratici. Controllare gli errata delle pp. 12–13 e 16–19 prima di codificarne le affermazioni. Le registrazioni dei nuovi moduli possono estendere catalogo e registry; le correzioni ai contratti Base richiedono motivazione e regressione.
