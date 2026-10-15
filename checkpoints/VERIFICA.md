# Checkpoint VERIFICA — controllo finale trasversale

**Passaggio 10 completato. Tutti i dieci passaggi del piano sono conclusi.** Unica sessione del 15 ottobre 2026, dalle 20:05 circa alle 20:42 (Europe/Rome): 36,45 minuti fino alla chiusura del runner, entro il tetto di 90. Checkpoint iniziale salvato entro il minuto 10. Timestamp precisi in `manifest.json` e [VERIFICA-validation.json](VERIFICA-validation.json). Versione locale ripristinabile: tag Git `verifica-v1`.

## Copertura e formule

| Capitolo | Pagine PDF | Concetti teorici | Sezioni | Formule delle sezioni |
| --- | ---: | ---: | ---: | ---: |
| Introduzione | 36 | 25 | 23 | 67 |
| Ottimizzazione | 81 | 33 | 30 | 93 |
| KKT | 20 | 12 | 11 | 35 |
| Totale | 137 | 70 | 64 | 195 |

Ogni concetto teorico appartiene esattamente a una sezione completa, con intuizione, formule spiegate, ipotesi, esempio, esperimento e riferimenti. Tutte le pagine fisiche sono coperte; i tre frontespizi conservano attribuzione e motivazione dell'assenza di visualizzazioni. Le slide progressive rimangono accorpate. Tutti gli errata censiti sono corretti o chiariti e collegati agli appunti. Le 195 formule vengono renderizzate con KaTeX/MathML, senza errori. Dettagli in [VERIFICA-coverage.json](VERIFICA-coverage.json).

L'inventario mantiene **68 ID pronti**, compresi alias condivisi: il sito presenta **66 laboratori montati, con 65 ID distinti**. Ogni visualizzazione censita ha un rappresentante raggiungibile nella propria sezione; il costo Base di Ottimizzazione è anche disponibile separatamente in `#laboratorio`. Le tre pagine restano distinte, con indici, ancoraggi univoci e PDF locali originali. Rimandi alle pagine e collegamenti di navigazione validi.

Riscontro visivo ripetuto: Ottimizzazione pp. 36/68/75 (segno Newton, convenzione di A e tangente, penalità h); Introduzione pp. 26/34/36 (drone planare e segni, velocità di equilibrio nulla, costo senza ½); KKT pp. 15/20 (costati, dato iniziale, moltiplicatori e complementarità). Le altre formule conservano i controlli analitici e le derivazioni dei blocchi. Le garanzie globali dei QP non si trasferiscono alle ottimizzazioni nonlineari.

## Correzioni e stabilità

**Tutti i 77 artefatti consolidati sono identici byte per byte al tag `k2-v1`**, compresi gli otto contratti Base e tutti i test storici. Nessun modulo matematico, didattico o grafico è stato modificato. Inventario, originali, estrazioni, piano e lockfile sono invariati. La sessione aggiuntiva I3 rimane registrata: Introduzione ha richiesto almeno quattro sessioni, rispetto alle tre stimate. Il vecchio hash del test O1 precede la correzione dei selettori documentata in O2; il confronto finale usa i byte di `k2-v1`.

- `web/main.ts`: «Vai al contenuto» scorreva senza trasferire il focus. Il main ora usa `tabindex=-1`, con regressione da tastiera sulle quattro pagine. Sostituita l'etichetta obsoleta «In costruzione».
- `web/tests/VERIFICA/`: copertura e continuità trasversali, due regressioni browser e audit completo della build, senza nuove dipendenze.
- `web/package.json` e `web/scripts/session.mjs`: comando `check:final`, obbligatorio dopo la build soltanto nella chiusura VERIFICA. Flusso dei blocchi precedenti invariato.
- README, manifest e rapporti: disponibilità finale, comandi ripetibili, evidenze e hash dei sei file applicativi/di verifica modificati.

## Esiti finali

`session finish VERIFICA`: **183 test numerici/copertura e 95 test browser superati**, senza prove saltate o retry automatici; inventario, TypeScript e build superati. Quattro HTML, tre PDF con SHA-256 uguali agli originali e due Worker ESM compilati.

L'audit statico sotto `/quaderno/` prova **66 laboratori, 308 preset, 169 opzioni dei selettori, 264 estremi numerici campionati, tastiera su 66 laboratori, 38 viste 3D e layout a 390 px su tutti i 66**. Gli estremi riguardano il primo e ultimo controllo numerico visibile di ciascun laboratorio; non è un'enumerazione dello spazio continuo dei parametri. I test dei modelli coprono ulteriori combinazioni impegnative. Quattro esiti non calcolabili sono annunciati con messaggi e seguiti da ripristino riuscito. **Zero errori JavaScript, HTTP e richieste esterne. Entrambi i Worker compilati funzionano.** Rapporto in [VERIFICA-browser.json](VERIFICA-browser.json).

Accessibilità: focus e percorso Tab, nomi dei controlli/grafici, slider/numeri, valori testuali, MathML, stato dei pulsanti, pannelli espandibili, messaggi e assenza di overflow della pagina. Schemi e tabelle larghi hanno scorrimento interno. Screenshot mobili dei tre capitoli controllati visivamente. Queste prove funzionali non costituiscono certificazione WCAG.

Prestazioni locali: home al DOMContentLoaded in 72 ms senza Plotly; massimo tempo iniziale di un laboratorio circa 1,95 s, inclusi navigazione e rendering. Tempi delle interazioni nel rapporto, dipendenti dalla macchina. Plotly differito: 4,84 MB originali/1,47 MB gzip; bundle principale circa 207 kB/64 kB gzip; Worker circa 10/11 kB. I calcoli impegnativi rimangono cancellabili e hanno budget espliciti. Font, script e PDF locali; browser e server temporanei chiusi.

## Tentativi preliminari e ripetibilità

Il primo controllo da tastiera ha rilevato il difetto del focus, poi corretto. Nel primo audit compilato, quattro arresti riguardavano il nuovo verificatore: due messaggi Worker con `role=status` invece di `role=alert`, selettore Ripristina ambiguo con un preset, indice numerico cambiato dalla visibilità dinamica. Corretti soltanto i selettori del verificatore; la ripetizione completa passa.

La prima chiusura aveva 94/95 browser passati: un caricamento I2 mostrava una pagina vuota, senza modifiche applicative durante quella prova. Causa non determinata. Tre ripetizioni diagnostiche con traccia sono passate, poi l'intera chiusura ha passato 95/95 e l'audit compilato. Il rapporto conserva gli esiti; screenshot e tracce preliminari in `artifacts/VERIFICA-*`, non versionati. Nessun test escluso o modulo modificato per ottenere il risultato.

Da `web/`: `npm.cmd run build` e `npm.cmd run check:final` ripetono la verifica compilata; `npm.cmd test` e `npm.cmd run test:browser` eseguono le regressioni. Consultazione: `npm.cmd run preview`, poi `http://127.0.0.1:4173`. Non riavviare blocchi conclusi: `session status` e `session next` confermano l'assenza di sessioni pendenti.

**Nessun lavoro residuo del piano e nessuna sessione successiva da avviare.**
