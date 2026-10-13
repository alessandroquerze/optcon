# Contratti Base v1

Le sessioni successive aggiungono appunti in `content/blocks/<ID>.ts`, laboratori in `demos/<ID>/` e calcolo in `math/<ID>/`. Registrare le nuove sezioni in `catalog.ts` e i caricamenti asincroni in `demos/registry.ts`.

`LessonSection` richiede: identificatore stabile, conceptIds dell'inventario, titolo, intuizione, formule LaTeX con spiegazione, ipotesi, esempio, punti da osservare, demoIds e riferimenti SourceRef. Il renderer associa le sezioni ai concetti senza modificare la struttura delle pagine.

I riferimenti sono pagine PDF fisiche, numerate da 1 con copertina. Non usare la numerazione stampata. Gli identificatori dei concetti sono unici all'interno di una fonte; gli identificatori dei laboratori sono globali e possono essere condivisi tra capitoli.

`DemoDefinition<P,D>` separa `compute(params): D`, privo di effetti sul DOM, da `mount(container): Promise<DemoHandle>`. `destroy()` deve rimuovere listener, observer e risorse grafiche. Il loader della registry carica soltanto il laboratorio necessario. Il parametro `status: ready` dell'inventario richiede un laboratorio registrato e verificato.

Usare `numberControl` per sincronizzare slider e valore numerico, `formula` per KaTeX e `createPlot` per serializzare gli aggiornamenti ed eliminare le risorse Plotly. Non inserire HTML grezzo proveniente dai PDF; passare il testo attraverso `html`.

Il laboratorio Base ha modello `ell(z)=1/2 (z-zbar)^T W (z-zbar)`, con `W=R diag(w1,w2) R^T`, pesi strettamente positivi, angolo in gradi e coordinate adimensionali. La griglia ha righe y e colonne x. La freccia 2D mostra la direzione del gradiente con lunghezza normalizzata; la norma numerica è riportata separatamente.
