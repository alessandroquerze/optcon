"""Reproducible extraction and curated concept/visualization coverage.

Run from any cwd: python scripts/extract_pdfs.py
JSON retains raw text: equations must be checked against the original PDF.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import re
import sys

try:
    import pymupdf
except ImportError:
    # Reuse the temporary analysis environment from the planning session.
    sys.path.insert(0, str(Path(os.environ.get("TEMP", "/tmp")) / "optcon-pdf-analysis"))
    import pymupdf

ROOT = Path(__file__).resolve().parent.parent


def concept(block, key, title, start, end, summary, demo, parameters, dimensions=("2d", "3d")):
    return {"id": key, "title": title, "pages": list(range(start, end + 1)),
            "block": block, "summary": summary, "kind": "theory",
            "visualizations": [{"id": demo, "label": title, "dimensions": list(dimensions),
                                "parameters": parameters.split("|"),
                                "status": "ready" if demo == "weighted-cost" else "planned"}]}


def cover(block):
    return {"id": "frontespizio", "title": "Frontespizio e attribuzione", "pages": [1],
            "block": block, "summary": "Materiale del corso di Giuseppe Notarstefano, Università di Bologna.",
            "kind": "metadata", "visualizations": [],
            "noVisualizationReason": "Attribuzione e titolo: nessun contenuto matematico da rappresentare."}


C = concept
SOURCES = [
    {"id": "introduzione", "filename": "OPTCON-RL_introduction_optimal_control_2026_09_14.pdf",
     "pageCount": 36, "title": "Introduzione al controllo ottimo", "shortTitle": "Introduzione",
     "concepts": [
         cover("I1"),
         C("I1", "motivazioni", "Perché ottimizzare un sistema?", 2, 7, "Prestazioni e vincoli collegano controllo, robotica, guida, droni e sistemi spaziali.", "motivation-map", "scenario|peso del costo|limiti", ("2d",)),
         C("I1", "sistemi-continui", "Stato, ingresso e uscita", 8, 8, "Il modello continuo descrive come cambia lo stato e come si genera l'uscita.", "continuous-system", "stato iniziale|ingresso|parametri della dinamica", ("2d",)),
         C("I1", "sistemi-discreti", "Dinamica discreta e notazione", 9, 10, "Un orizzonte finito raccoglie stati e ingressi in vettori distinti.", "discrete-system", "orizzonte|stato iniziale|sequenza degli ingressi", ("2d",)),
         C("I1", "traiettorie-equilibri", "Traiettorie ed equilibri", 11, 11, "Una traiettoria soddisfa la dinamica; un equilibrio mantiene costanti stato e ingresso.", "trajectory-equilibrium", "stato|ingresso|tempo", ("2d",)),
         C("I1", "linearizzazione", "Una dinamica vista da vicino", 12, 12, "La linearizzazione approssima la risposta a piccole perturbazioni attorno a una traiettoria.", "linearization", "traiettoria base|perturbazione|ingresso"),
         C("I1", "strumenti-controllo", "Stabilizzare, inseguire, ottimizzare", 13, 13, "Stabilizzazione e inseguimento acquistano un indice di prestazione e vincoli espliciti.", "control-objectives", "riferimento|limiti|peso dello sforzo", ("2d",)),
         C("I1", "ingredienti-ottimizzazione", "Decisioni, costo e vincoli", 14, 14, "Ottimizzare significa scegliere una decisione ammissibile minimizzando il costo.", "optimization-geometry", "decisione|costo|vincoli"),
         C("I1", "costo-scalare", "Distanza da un obiettivo", 15, 15, "Un costo quadratico scalare penalizza la distanza dal punto desiderato.", "scalar-cost", "peso|obiettivo|punto", ("2d",)),
         C("I1", "costo-pesato", "La geometria dei pesi", 16, 16, "Una matrice positiva pesa diversamente gli scostamenti nelle diverse direzioni.", "weighted-cost", "weight1|weight2|angle|centerX|centerY|pointX|pointY"),
         C("I1", "insiemi-ammissibili", "Uguaglianze e disuguaglianze", 17, 17, "Un'uguaglianza descrive un bordo o una superficie; una disuguaglianza anche una regione.", "constraint-sets", "coefficienti|termine noto|tipo di vincolo"),
         C("I1", "problema-minimizzazione", "Scrivere il problema", 18, 18, "La forma compatta separa funzione di costo e insieme ammissibile.", "optimization-geometry", "decisione|costo|vincoli"),
         C("I2", "vincoli-dinamici", "La dinamica come vincolo", 19, 19, "Ogni passo temporale impone un'uguaglianza tra stato corrente, ingresso e stato successivo.", "dynamics-residual", "stati|ingressi|orizzonte", ("2d",)),
         C("I2", "costi-temporali", "Costo di stadio e costo terminale", 20, 20, "Il costo totale somma i contributi intermedi e un termine sullo stato finale.", "trajectory-cost", "orizzonte|pesi intermedi|peso terminale", ("2d",)),
         C("I2", "vincoli-percorso", "Vincoli lungo il percorso e ai bordi", 21, 21, "I limiti possono valere a ogni istante oppure soltanto all'inizio e alla fine.", "path-boundary", "limiti|stato iniziale|obiettivo finale", ("2d",)),
         C("I2", "inseguimento-pesato", "Quanto costa inseguire?", 22, 22, "Q, R e QT bilanciano errore di inseguimento, uso degli ingressi e accuratezza finale.", "trajectory-cost", "Q|R|QT|riferimento", ("2d",)),
         C("I2", "controllo-discreto", "Il problema di controllo discreto", 23, 23, "Costi, dinamica e vincoli formano un unico problema su stati e ingressi.", "discrete-control", "orizzonte|riferimento|pesi|limiti", ("2d",)),
         C("I2", "riferimento-traiettoria", "Desiderare una curva, trovare una traiettoria", 24, 25, "Il riferimento può violare la dinamica: la traiettoria calcolata deve rispettarla.", "reference-versus-trajectory", "riferimento|dinamica|pesi", ("2d",)),
         C("I2", "modello-drone", "Un drone nel piano", 26, 27, "Il modello ha sei stati e due spinte; la discretizzazione di Eulero produce la dinamica discreta.", "planar-drone", "M|J|L|passo di discretizzazione|spinte", ("2d",)),
         C("I2", "obiettivo-drone", "Progettare il volo", 28, 29, "L'obiettivo penalizza scostamenti di posizione, velocità, assetto e ingressi.", "drone-optimal-control", "Q|R|QT|orizzonte|riferimento", ("2d",)),
         C("I2", "limiti-drone", "Dove può volare?", 30, 30, "Saturazioni degli ingressi e limiti sull'altezza restringono le traiettorie ammissibili.", "drone-constraints", "spinta minima|spinta massima|quota minima|quota massima", ("2d",)),
         C("I3", "controllo-continuo", "Dal costo sommato al costo integrale", 31, 32, "Nel tempo continuo la decisione è una funzione e il costo diventa un funzionale.", "continuous-versus-discrete", "durata|discretizzazione|ingresso", ("2d",)),
         C("I3", "modello-pendolo", "Il pendolo nonlineare", 33, 33, "Angolo e velocità descrivono la dinamica sotto gravità e coppia applicata.", "pendulum", "massa|lunghezza|coppia|angolo iniziale", ("2d",)),
         C("I3", "equilibri-pendolo", "Restare in equilibrio", 34, 34, "In equilibrio la velocità è nulla e la coppia bilancia il momento della gravità.", "pendulum-equilibrium", "angolo|massa|lunghezza", ("2d",)),
         C("I3", "riferimento-pendolo", "Un salto desiderato non è una traiettoria", 35, 35, "Un riferimento discontinuo tra due equilibri non soddisfa la dinamica del pendolo.", "pendulum-reference", "angolo iniziale|angolo finale|durata", ("2d",)),
         C("I3", "controllo-pendolo", "Trasferire il pendolo tra equilibri", 36, 36, "Il costo bilancia inseguimento, velocità, coppia e comportamento finale.", "pendulum-optimal-control", "Q|R|QT|durata|limite di coppia", ("2d",)),
     ]},
    {"id": "ottimizzazione", "filename": "OPTCON-RL_optimization_2026_09_14.pdf",
     "pageCount": 81, "title": "Ottimizzazione nonlineare", "shortTitle": "Ottimizzazione",
     "concepts": [
         cover("O1"),
         C("O1", "minimi", "Minimi locali, globali e stretti", 2, 4, "La definizione di minimo dipende dalla regione in cui confrontiamo i valori della funzione.", "local-global-minima", "coefficienti|punto|raggio dell'intorno"),
         C("O1", "min-argmin", "Valore minimo e punto di minimo", 5, 5, "min indica il costo raggiunto; argmin indica la decisione che lo raggiunge.", "minimum-point-value", "funzione|decisione", ("2d",)),
         C("O1", "gradiente-hessiana", "Pendenza, curvatura e Jacobiano", 6, 7, "Il gradiente descrive la variazione locale; l'Hessiana la curvatura. Nelle slide il gradiente vettoriale è il Jacobiano trasposto.", "derivatives", "punto|funzione|direzione"),
         C("O1", "ottimalita-libera", "Un punto stazionario non basta", 8, 9, "Le condizioni necessarie comprendono anche punti che non sono minimi; la positività definita dà una condizione sufficiente locale.", "stationary-classification", "autovalori|punto|funzione"),
         C("O1", "insiemi-convessi", "Il segmento resta nell'insieme?", 10, 10, "Un insieme è convesso se contiene il segmento tra ogni coppia dei suoi punti.", "convex-set", "estremi del segmento|theta|forma dell'insieme", ("2d",)),
         C("O1", "funzioni-convesse", "Corde e convessità", 11, 11, "Per una funzione convessa il grafico sta sotto ogni corda tra due punti.", "convex-function", "estremi|theta|curvatura", ("2d",)),
         C("O1", "geometria-vincoli", "Convessità e vincoli", 12, 13, "Sottolivelli convessi e uguaglianze affini forniscono classi utili di insiemi ammissibili; controllare le equivalenze troppo generali nelle slide.", "constraint-convexity", "tipo di vincolo|coefficienti|livello"),
         C("O1", "monotonia", "Convessità e monotonia del gradiente", 14, 16, "Convessità, convessità stretta e forte si riflettono in disuguaglianze sui gradienti.", "gradient-monotonicity", "punti di confronto|mu|curvatura", ("2d",)),
         C("O1", "lipschitz", "Quanto può cambiare il gradiente?", 17, 18, "L e mu legano regolarità del gradiente, curvatura e disuguaglianze di confronto.", "gradient-bounds", "L|mu|punti di confronto", ("2d",)),
         C("O1", "limiti-quadratici", "Tangenti e limiti quadratici", 19, 20, "La convessità fornisce un limite inferiore; un gradiente Lipschitz fornisce un limite superiore quadratico.", "quadratic-bounds", "punto base|mu|L|curvatura", ("2d",)),
         C("O1", "minimizzazione-convessa", "Quando locale significa globale", 21, 22, "In un problema convesso un minimo locale è globale; nel caso differenziabile libero il gradiente nullo lo caratterizza.", "convex-optimality", "funzione|punto|corda", ("2d",)),
         C("O1", "qp-liberi", "Programmi quadratici", 23, 25, "La matrice del costo governa curvatura ed esistenza del minimo; se è definita positiva il minimo è unico.", "weighted-cost", "weight1|weight2|angle|centerX|centerY|pointX|pointY"),
         C("O2", "direzioni-discesa", "Scegliere direzione e passo", 26, 31, "Un metodo iterativo combina una direzione di discesa con una lunghezza del passo.", "descent-methods", "punto iniziale|passo|matrice D|funzione"),
         C("O2", "metodi-gradiente", "Gradiente e curvatura", 32, 33, "Il gradiente negativo è la direzione di massima discesa nella norma euclidea; Newton usa anche la curvatura.", "gradient-versus-newton", "punto iniziale|passo|condizionamento"),
         C("O2", "newton-zeri", "Newton per trovare uno zero", 34, 34, "La radice della linearizzazione aggiorna la stima della radice della funzione.", "newton-root", "funzione|punto iniziale|iterazione", ("2d",)),
         C("O2", "modelli-quadratici", "Newton come problema quadratico", 35, 37, "Il passo di Newton minimizza il modello quadratico quando la curvatura lo consente.", "newton-model", "punto base|funzione|regolarizzazione"),
         C("O2", "armijo", "Quanto lungo può essere il passo?", 38, 40, "Il backtracking riduce il passo finché il costo soddisfa la diminuzione richiesta da Armijo.", "armijo", "passo iniziale|beta|c|direzione", ("2d",)),
         C("O2", "passi-convergenza", "Passi e convergenza", 41, 46, "Passi costanti o decrescenti richiedono ipotesi precise. Distinguere convergenza della sequenza, sottosequenze e stazionarietà.", "convergence", "regola del passo|iterazioni|funzione|punto iniziale", ("2d",)),
         C("O2", "ottimalita-convessi", "Ottimizzare su un insieme convesso", 47, 48, "Al bordo, le direzioni ammissibili modificano la condizione di primo ordine.", "feasible-directions", "punto|insieme|gradiente", ("2d",)),
         C("O2", "proiezione", "Il punto ammissibile più vicino", 49, 49, "La proiezione su un insieme chiuso, convesso e non vuoto esiste ed è unica.", "projection", "punto|insieme|dimensioni", ("2d",)),
         C("O2", "gradiente-proiettato", "Scendere e tornare nell'insieme", 50, 52, "Il gradiente proiettato e le direzioni ammissibili mantengono gli iterati nei vincoli.", "projected-gradient", "punto iniziale|passo|insieme|costo", ("2d",)),
         C("O2", "esempi-costo", "Una galleria di funzioni", 53, 53, "Funzioni polinomiali, esponenziali e quadratiche mostrano geometrie differenti.", "function-gallery", "funzione|coefficienti|dominio"),
         C("O2", "barriere", "Avvicinarsi al bordo dall'interno", 54, 54, "La barriera logaritmica è definita soltanto nell'interno strettamente ammissibile.", "barrier", "epsilon|vincoli|punto interno"),
         C("O3", "vincoli-regolarita", "Vincoli attivi e punti regolari", 55, 57, "La regolarità richiede indipendenza dei gradienti delle uguaglianze e delle disuguaglianze attive.", "active-constraints", "punto|vincoli|angolo dei gradienti", ("2d",)),
         C("O3", "lagrangiana", "Moltiplicatori e Lagrangiana", 58, 58, "I moltiplicatori combinano gradienti del costo e dei vincoli.", "lagrangian", "punto|lambda|mu|vincoli"),
         C("O3", "kkt-primo-ordine", "Le condizioni KKT", 59, 63, "Stazionarietà, ammissibilità primale/duale e complementarità caratterizzano candidati sotto regolarità.", "kkt-geometry", "punto|lambda|mu|vincoli", ("2d",)),
         C("O3", "kkt-secondo-ordine", "Curvatura nelle direzioni ammissibili", 64, 65, "La curvatura della Lagrangiana va valutata lungo direzioni coerenti con i vincoli.", "constrained-curvature", "punto|direzione tangente|Hessiana"),
         C("O3", "qp-vincolati", "Un costo quadratico, vincoli lineari", 66, 68, "Un sistema KKT lega decisione e moltiplicatori; la curvatura rilevante è quella nello spazio nullo dei vincoli.", "constrained-qp", "Q|q|A|b"),
         C("O3", "newton-vincolato", "Newton sul sistema KKT", 69, 73, "La linearizzazione congiunta aggiorna decisione e moltiplicatori.", "constrained-newton", "punto iniziale|moltiplicatori|regolarizzazione"),
         C("O3", "sqp", "Una sequenza di problemi quadratici", 74, 74, "SQP costruisce un sottoproblema quadratico con vincoli linearizzati.", "sqp", "punto iniziale|Hessiana|vincoli|iterazione"),
         C("O3", "merito", "Costo e violazione nello stesso criterio", 75, 77, "La funzione di merito bilancia diminuzione del costo e riduzione della violazione dei vincoli.", "merit-line-search", "penalita|beta|c|passo", ("2d",)),
         C("O3", "barriere-uguaglianze", "Barriere con vincoli di uguaglianza", 78, 78, "La barriera incorpora le disuguaglianze, mentre le uguaglianze restano vincoli espliciti.", "barrier-equalities", "epsilon|uguaglianze|punto interno"),
         C("O3", "tempo-iterazione", "Tempo del sistema, iterazione del metodo", 79, 81, "t indica il passo della dinamica; k indica l'iterazione dell'algoritmo che aggiorna l'intera traiettoria.", "time-iteration", "tempo t|iterazione k|orizzonte", ("2d",)),
     ]},
    {"id": "kkt", "filename": "OPTCON-RL_optimality_conditions_KKT_2026_10_08.pdf",
     "pageCount": 20, "title": "Condizioni di ottimalità per il controllo", "shortTitle": "Condizioni KKT",
     "concepts": [
         cover("K1"),
         C("K1", "stati-ingressi", "Raccogliere stati e ingressi", 2, 2, "I vettori compatti raccolgono tutti gli istanti dell'orizzonte.", "discrete-system", "orizzonte|stato iniziale|sequenza degli ingressi", ("2d",)),
         C("K1", "curve-traiettorie", "Una curva è una traiettoria?", 3, 3, "Una coppia stato-ingresso arbitraria diventa traiettoria solo se soddisfa la dinamica.", "dynamics-residual", "stati|ingressi|orizzonte", ("2d",)),
         C("K1", "dinamica-implicita", "Tutta la dinamica in h(x,u)=0", 4, 4, "Il residuo impilato traduce la dinamica in vincoli di uguaglianza.", "dynamics-residual", "stati|ingressi|orizzonte", ("2d",)),
         C("K1", "varieta-traiettorie", "La varietà delle traiettorie", 5, 5, "Le traiettorie ammissibili formano una superficie nello spazio delle curve stato-ingresso.", "trajectory-manifold", "ingresso|punto base|dinamica"),
         C("K1", "spazio-tangente", "Linearizzazione e spazio tangente", 6, 7, "Lo spazio tangente contiene le perturbazioni che soddisfano la dinamica linearizzata.", "trajectory-tangent", "punto base|perturbazione|dinamica"),
         C("K1", "controllo-senza-extra", "Unconstrained non significa senza dinamica", 8, 9, "Nel controllo, unconstrained indica assenza di vincoli aggiuntivi a quelli dinamici; le funzioni sono assunte C2.", "discrete-control", "orizzonte|riferimento|pesi|limiti", ("2d",)),
         C("K1", "forma-compatta", "Il controllo come ottimizzazione vincolata", 10, 11, "Costo e vincoli dinamici permettono di applicare la teoria dell'ottimizzazione.", "optimal-control-structure", "orizzonte|dimensione dello stato|dimensione dell'ingresso", ("2d",)),
         C("K1", "richiamo-kkt", "La condizione di stazionarietà", 12, 12, "Il gradiente del costo è bilanciato dai gradienti dei vincoli pesati dai moltiplicatori.", "kkt-geometry", "punto|lambda|mu|vincoli", ("2d",)),
         C("K2", "lagrangiana-temporale", "Scomporre la Lagrangiana nel tempo", 13, 14, "La somma per istanti rivela quali stati, ingressi e costati interagiscono.", "costate-structure", "orizzonte|stato selezionato|pesi", ("2d",)),
         C("K2", "costati", "Stati in avanti, costati all'indietro", 15, 17, "Stazionarietà, condizione terminale e dinamica formano un sistema accoppiato.", "costates", "stato iniziale|Q|R|QT|orizzonte", ("2d",)),
         C("K2", "controllo-vincolato", "Aggiungere limiti e condizioni al bordo", 18, 19, "Vincoli terminali e di percorso introducono moltiplicatori distinti.", "constrained-optimal-control", "limiti|obiettivo terminale|pesi", ("2d",)),
         C("K2", "kkt-controllo", "KKT e complementarità nel controllo", 20, 20, "Stazionarietà rispetto alle decisioni, ammissibilità e complementarità devono essere controllate separatamente.", "optimal-control-kkt", "Q|R|QT|limiti|moltiplicatori", ("2d",)),
     ]},
]

ERRATA = [
    {"sourceId": "ottimizzazione", "pages": [12, 13], "status": "to-review", "note": "Verificare le equivalenze generali tra convessità dell'insieme e forma del vincolo; un singolo sottolivello convesso non implica quasi-convessità globale."},
    {"sourceId": "ottimizzazione", "pages": [16, 19], "status": "to-review", "note": "Uniformare fattore 1/2 e disuguaglianze nella definizione di forte convessità."},
    {"sourceId": "ottimizzazione", "pages": [36], "status": "identified", "note": "Il passo definito come argmin del modello quadratico si somma: z_next = z + delta_z."},
    {"sourceId": "ottimizzazione", "pages": [68], "status": "identified", "note": "Per A di dimensione m x d e y in R^d, il vincolo tangente è Ay=0, non A^T y=0."},
    {"sourceId": "ottimizzazione", "pages": [75], "status": "identified", "note": "La penalità per h(z)=0 usa ||h(z)||_1."},
    {"sourceId": "introduzione", "pages": [26], "status": "identified", "note": "Il modello presentato è planare, sebbene il testo descriva un obiettivo nello spazio 3D."},
    {"sourceId": "introduzione", "pages": [34], "status": "identified", "note": "La prima condizione di equilibrio è x_2,e=0 (velocità nulla), non x_1,e=0."},
    {"sourceId": "kkt", "pages": [20], "status": "to-review", "note": "Non imporre gradiente nullo rispetto a tutti i moltiplicatori delle disuguaglianze: distinguere stazionarietà nelle decisioni, g<=0, mu>=0 e complementarità."},
]


def main():
    extracted = ROOT / "sources" / "extracted"
    extracted.mkdir(parents=True, exist_ok=True)
    inventory_path = ROOT / "sources" / "inventory.json"
    previous = json.loads(inventory_path.read_text(encoding="utf-8")) if inventory_path.exists() else {}
    previous_sources = {s["id"]: s for s in previous.get("sources", [])}
    stamp = datetime.now(timezone.utc).isoformat()
    for source in SOURCES:
        # Re-extraction must not reset curated concepts or completed labs.
        if source["id"] in previous_sources:
            source["concepts"] = previous_sources[source["id"]]["concepts"]
        original = ROOT / source["filename"]
        doc = pymupdf.open(original)
        if len(doc) != source["pageCount"]:
            raise ValueError(f"Page count changed: {source['id']}")
        covered = {p for c in source["concepts"] for p in c["pages"]}
        if covered != set(range(1, len(doc) + 1)):
            raise ValueError(f"Incomplete concept coverage: {source['id']}")
        source["sha256"] = hashlib.sha256(original.read_bytes()).hexdigest()
        source["extractedPath"] = f"sources/extracted/{source['id']}.json"
        page_data = []
        for i, page in enumerate(doc):
            raw = page.get_text(sort=True)
            lines = [re.sub(r"[ \t]+", " ", line).strip() for line in raw.splitlines()
                     if "Prof. Giuseppe Notarstefano" not in line]
            cleaned = "\n".join(line for line in lines if line)
            page_data.append({"pdfPage": i + 1, "title": cleaned.splitlines()[0] if cleaned else "",
                              "rawText": raw, "text": cleaned, "imageCount": len(page.get_images()),
                              "conceptIds": [c["id"] for c in source["concepts"] if i + 1 in c["pages"]],
                              "equationReview": "check-original-pdf"})
        payload = {"schemaVersion": 1, "sourceId": source["id"], "filename": source["filename"],
                   "sha256": source["sha256"], "pageCount": len(doc), "extractedAt": stamp,
                   "extractor": f"PyMuPDF {pymupdf.VersionBind}", "pages": page_data}
        (extracted / f"{source['id']}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (extracted / f"{source['id']}.txt").write_text(
            "\n\n".join(f"===== PDF PAGE {p['pdfPage']} =====\n{p['text']}" for p in page_data) + "\n", encoding="utf-8")
        print(f"{source['id']}: {len(doc)} pagine, {len(source['concepts'])} voci, copertura completa")
    inventory = {"schemaVersion": 1, "numbering": "physical-pdf-pages-1-based-including-cover",
                 "extractionWarning": "L'estrazione testuale non certifica le formule: confrontare frazioni, indici e trasposte con il PDF.",
                 "sources": SOURCES, "errata": previous.get("errata", ERRATA)}
    (ROOT / "sources" / "inventory.json").write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
