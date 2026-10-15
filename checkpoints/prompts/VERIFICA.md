# Sessione VERIFICA — Verifica finale

Handoff dopo K2: tutti i contenuti dei tre PDF sono sviluppati (Introduzione 23 sezioni/25 concetti teorici, Ottimizzazione 30/33, KKT 11/12; totale 64 sezioni, 70 concetti teorici, tre frontespizi e 137 pagine). Tutti i 68 ID di laboratorio censiti sono pronti. Leggi `checkpoints/K2.md` e i rapporti dei blocchi, preservando i moduli consolidati fino al tag `k2-v1`. Esegui soltanto la verifica trasversale richiesta dal piano, con eventuali correzioni puntuali motivate e regressioni; non riscrivere i blocchi.

K2 usa h=f−x successivo, distingue λd, λb e μ, verifica la complementarità direttamente con active set su un QP scalare lineare; i vincoli di stato sono solo t<T. I costati di una traiettoria arbitraria non certificano ottimalità; x₀ fissato non richiede stazionarietà rispetto al dato. Le garanzie globali del QP non valgono automaticamente per le demo nonlineari. Verifica formule, segni, indici, domini, riduzioni 2D/3D, parametri, accessibilità, sorgenti, prestazioni, build e Worker compilati.

Esito precedente: 176 test numerici, 93 browser e prove compilate K1/K2/I2/I3 passati. Eccezione al congelamento in K2: solo il primo test K1 è stato reso compatibile con l’aggiunta delle sezioni K2; hash aggiornato nel manifest. Confronta gli artefatti con i tag e gli hash correnti, tenendo conto delle correzioni storiche documentate nei checkpoint. Il tentativo I3 interrotto e la sessione aggiuntiva sono già conteggiati e non vanno cancellati. Questo prompt prepara VERIFICA e non la avvia.

Esegui soltanto questa sessione. Un blocco equivale a una sessione di ragionamento; il tetto è 90 minuti, con checkpoint entro il minuto 75.

Leggi PIANO_APPUNTI_INTERATTIVI.md, README.md, manifest.json e checkpoints/BASE.md, checkpoints/O1.md, checkpoints/O2.md, checkpoints/O3.md, checkpoints/I1.md, checkpoints/I2.md, checkpoints/I3.md, checkpoints/K1.md, checkpoints/K2.md.
Obiettivo: Verificare copertura integrale, formule, controlli, accessibilit?, prestazioni e build finale.

Dipendenze concluse: O1, O2, O3, I1, I2, I3, K1, K2.
File consentiti: web/** (targeted fixes), sources/inventory.json, manifest.json, checkpoints/VERIFICA*.

Mantieni stabili i contratti Base in web/content/schema.ts, web/math/quadratic.ts e web/ui/. Aggiungi moduli e registra soltanto gli import necessari. Una correzione a un modulo concluso richiede motivazione nel checkpoint e verifica di regressione.

Consegna sezioni LessonSection complete (intuizione, formule/ipotesi, esempio, laboratorio, cosa osservare, riferimenti), laboratori con compute puro e mount/destroy, controlli accessibili e calcoli verificati. Aggiorna i soli stati realmente completati nell'inventario. Non dichiarare ottimo globale un candidato nonlineare senza giustificazione.

Criteri: All assigned concepts covered, or explicit metadata-only rationale; Figures recompute from parameters and agree with formulas; No type errors; relevant analytic and browser checks pass; Checkpoint records outcomes and remaining work.

Salva checkpoints/VERIFICA.md con decisioni, file, verifiche e residui. Esegui il runner finish solo quando il lavoro è completo. Non avviare automaticamente la sessione successiva.

Errata pertinenti:
- Nessuno censito; controllare comunque le formule originali.
