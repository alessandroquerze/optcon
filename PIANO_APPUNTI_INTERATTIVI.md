# Piano di automazione degli appunti interattivi

**Risultato:** appunti in italiano, con formule spiegate, esempi guidati e rappresentazioni 2D/3D modificabili. Tre pagine web distinte: `introduzione.html`, `ottimizzazione.html`, `kkt.html`, ciascuna associata al proprio PDF e dotata di indice interno.

**Analisi delle fonti — 137 pagine effettive.** I riferimenti seguenti contano le pagine del PDF, copertina inclusa; la numerazione stampata sulle slide è diversa.

| PDF | Pagine | Contenuto |
| --- | ---: | --- |
| [Introduction to Optimal Control](OPTCON-RL_introduction_optimal_control_2026_09_14.pdf) | 36 | Sistemi, traiettorie, linearizzazione, costi e vincoli; drone planare; controllo continuo e pendolo. |
| [Optimization](OPTCON-RL_optimization_2026_09_14.pdf) | 81 | Convessità, condizioni di ottimalità, gradienti/Newton, proiezioni, KKT, QP, SQP e barriere. È il documento più denso; contiene slide progressive da accorpare. |
| [Optimality Conditions KKT](OPTCON-RL_optimality_conditions_KKT_2026_10_08.pdf) | 20 | Varietà delle traiettorie, spazio tangente, Lagrangiana e condizioni KKT del controllo con/senza vincoli aggiuntivi. |

**Architettura da fissare nella prima sessione.** Sito statico con TypeScript e [Vite a più pagine](https://vite.dev/guide/build.html#multi-page-app); [KaTeX](https://katex.org/docs/browser.html) per le formule; [Plotly.js](https://plotly.com/javascript/) per curve, livelli e superfici 3D; SVG per schemi e animazioni fisiche. Calcoli nel browser, con caricamento dei laboratori quando servono e Web Worker per le ottimizzazioni più impegnative. Dipendenze fissate nel lockfile.

Separare `content/` (appunti), `demos/` (laboratori), `math/` (calcolo condiviso), `ui/` (controlli e grafici), `checkpoints/` (ripresa). Ogni laboratorio espone `compute(parametri) → dati`, separando calcolo e visualizzazione.

**Suddivisione consigliata: 10 sessioni, massimo 90 minuti ciascuna. Un blocco equivale a una sessione.** Tre per introduzione, tre per ottimizzazione, due per KKT, più due comuni. Sviluppare prima l'ottimizzazione per riusarne i metodi; l'ordine di lettura resta introduzione → ottimizzazione → KKT.

| Ordine / blocco | Fonte | Consegna completa e parametri principali |
| --- | --- | --- |
| 1 · Base | Comune | Estrazione per pagina, inventario dei concetti e delle visualizzazioni, tre pagine navigabili, schema dei contenuti, controlli/grafici comuni e un laboratorio funzionante come riferimento. |
| 2 · O1 | Ottimizzazione pp. 1–25 | Minimi/massimi/selle, gradiente e Hessiana; convessità di insiemi e funzioni; tangenti, limiti quadratici e QP. Curve 2D e superfici 3D con coefficienti, punti, autovalori, μ e L modificabili. |
| 3 · O2 | Ottimizzazione pp. 26–54 | Discesa, Newton anche per ricerca di zeri, modelli quadratici, Armijo, convergenza, proiezione e barriere. Percorsi sulle curve di livello e grafici di costo/norma del gradiente; modificare partenza, passo, metodo, β, c, insieme ammissibile ed ε. |
| 4 · O3 | Ottimizzazione pp. 55–81 | Vincoli attivi, regolarità, moltiplicatori, KKT anche del secondo ordine, QP vincolati, SQP, funzione di merito e barriere con uguaglianze. Geometria dei gradienti, spazio tangente e iterazioni; modificare vincoli, moltiplicatori e penalità. Consolidare il solutore condiviso. |
| 5 · I1 | Introduzione pp. 1–18 | Motivazioni con schemi interattivi, sistemi continui/discreti, traiettorie/equilibri, linearizzazione, costi e regioni ammissibili. Modificare stato, ingressi, perturbazioni, pesi e coefficienti dei vincoli; confrontare modello originale e linearizzato. |
| 6 · I2 | Introduzione pp. 19–30 | Formulazione del controllo discreto e laboratorio del drone planare: animazione, riferimento/traiettoria calcolata, ingressi, costo e violazioni. Modificare orizzonte, discretizzazione, masse/inerzia, Q/R/QT e limiti fisici; riusare il solutore O3. |
| 7 · I3 | Introduzione pp. 31–36 | Controllo continuo, costo integrale e pendolo tra equilibri: animazione, piano di fase, riferimento e traiettoria calcolata. Modificare massa, lunghezza, coppia, angoli obiettivo, durata e pesi; confrontare discretizzazioni. |
| 8 · K1 | KKT pp. 1–12 | Curve arbitrarie contro traiettorie ammissibili, residuo della dinamica, varietà e spazio tangente. Esempio nonlineare a orizzonte breve rappresentabile in 2D/3D; modificare punto base, ingresso e perturbazione e misurare l'errore di linearizzazione. |
| 9 · K2 | KKT pp. 13–20 | Derivazione guidata, dinamica in avanti, costati all'indietro, stazionarietà, vincoli terminali e complementarità. Grafici di stati/ingressi/moltiplicatori e struttura sparsa; modificare pesi, stato iniziale e limiti e confrontare i residui KKT. |
| 10 · Verifica | Comune | Controllo integrale della copertura, formule, collegamenti, parametri, accessibilità e prestazioni; verifica delle tre pagine e build finale. |

**Automazione e continuità.** Nel blocco Base preparare un `manifest.json` con sessioni, dipendenze, file consentiti, criteri di completamento e stato. Un runner sequenziale avvia il prossimo blocco pronto, fornendo piano, manifest, checkpoint e pagine assegnate. Avanza soltanto dopo aver verificato artefatti e controlli.

- Pianificare 60 minuti di sviluppo, 15 di verifica e 15 di margine/salvataggio; il runner monitora il tempo e richiede un checkpoint entro il minuto 75. Redistribuire eventuali incompleti nelle sessioni residue. Una sessione aggiuntiva conta come nuovo blocco: non nasconderla come semplice ripresa. Il piano stima il lavoro, non garantisce il numero di sessioni.
- Ogni blocco consegna appunti, formule, laboratori, verifiche numeriche e checkpoint con file modificati, decisioni, esiti e prossimo passo. Salvare una versione Git ripristinabile.
- Congelare interfacce e struttura dei blocchi conclusi. Aggiungere moduli nelle sessioni successive; consentire correzioni puntuali documentate, evitando rifacimenti globali.
- Ogni concetto dell'inventario deve rimandare a una sezione e a un laboratorio, anche condiviso. Motivare i soli casi senza rappresentazione utile. Accorpare slide progressive preservandone tutti i contenuti.

**Criteri didattici e di verifica.** Seguire intuizione → formula e ipotesi → esempio → esperimento → cosa osservare. Ogni laboratorio include slider, valori numerici, unità/legenda, reset, casi preimpostati e ricalcolo effettivo; gli algoritmi anche esecuzione per singolo passo. Dichiarare le riduzioni dimensionali. Il drone delle slide resta planare anche nelle viste 3D.

Verificare risultati contro casi analitici: QP, proiezioni, equilibrio del drone/pendolo e residui KKT. Per problemi nonlineari mostrare convergenza e ammissibilità senza presentare ogni risultato come ottimo globale. Limitare orizzonti e iterazioni; indicare fallimenti e infeasibilità. Controllare navigazione diretta, estremi dei parametri e uso da tastiera.

**Attenzione alle formule originali.** Controllare visivamente frazioni, indici e trasposte estratte. Registrare le correzioni con riferimento alla fonte: in Ottimizzazione p. 36 il passo Newton definito dal QP va sommato; p. 68 la direzione tangente soddisfa `Ay = 0`; p. 75 la penalità dei vincoli di uguaglianza usa `h`. Nel pendolo, Introduzione p. 34, l'equilibrio impone velocità `x₂,e = 0`. Uniformare inoltre la convenzione del gradiente vettoriale, che nelle slide è il Jacobiano trasposto, e distinguere tempo `t` da iterazione `k`.

**Prompt riutilizzabile:** «Esegui la sessione {ID} del manifest. Leggi checkpoint e pagine assegnate; riusa i moduli conclusi. Consegna appunti e laboratori, verifica copertura e calcoli, aggiorna stato/checkpoint e salva la versione. Entro 75 minuti passa alla chiusura, entro 90 termina. Registra esplicitamente eventuale lavoro residuo.»
