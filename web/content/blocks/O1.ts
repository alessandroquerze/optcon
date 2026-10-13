import type { LessonSection } from '../schema';
import '../../demos/O1/styles.css';

const pages=(first:number,last=first)=>Array.from({length:last-first+1},(_,i)=>first+i);
const source=(first:number,last=first)=>[{sourceId:'ottimizzazione' as const,pages:pages(first,last)}];
const F=(latex:string,explanation:string)=>({latex,explanation});

export const O1Lessons:LessonSection[]=[
  {
    id:'o1-minimi',conceptIds:['minimi','min-argmin'],title:'1. Un minimo rispetto a quali punti?',
    intuition:'Una decisione è migliore soltanto dopo aver chiarito con quali alternative la confrontiamo. Un minimo locale vince in un intorno; un minimo globale vince su tutto il dominio. “Stretto” significa che ogni punto diverso perde il confronto. Questa distinzione riguarda i valori della funzione, non la velocità di un algoritmo.',
    formulas:[
      F(String.raw`z^*\text{ globale}\iff f(z^*)\le f(z)\quad\forall z\in\mathbb R^d`, 'Il confronto vale con ogni decisione. Nel minimo globale stretto si richiede < per ogni z diverso da z*. Un massimo di f è un minimo di −f.'),
      F(String.raw`z^*\text{ locale}\iff\exists\varepsilon>0:\; f(z^*)\le f(z)\quad\forall z\in B(z^*,\varepsilon)`, 'Per un minimo locale stretto, la disuguaglianza è stretta per ogni altro punto nell’intorno. Fuori dalla sfera di raggio ε possono esistere decisioni migliori.'),
      F(String.raw`f^*=\min_z f(z),\qquad \operatorname*{argmin}_z f(z)=\{z:f(z)=f^*\}`, 'Il valore minimo è un numero; argmin è un insieme di decisioni. Scrivere z*=argmin è una scorciatoia accettabile quando il minimo è unico. Se il valore più basso non viene raggiunto si usa inf, non si inventa un punto di minimo.'),
    ],
    assumptions:['Il dominio del problema va dichiarato: restringerlo può cambiare quali punti sono minimi.', 'Le definizioni non richiedono derivate. Un grafico campionato aiuta l’intuizione, ma da solo non dimostra una proprietà universale.'],
    example:'Per f(z)=(z²−1)², i punti −1 e 1 sono minimi globali con valore 0. Ciascuno è stretto localmente; nessuno è stretto globalmente perché l’altro ha lo stesso costo. Aggiungendo αz si inclina il grafico e, per piccoli α non nulli, una valle resta locale mentre l’altra diventa l’unico minimo globale. Il laboratorio trova tutti gli zeri di f′ e confronta i loro costi; la quartica tende a +∞ per |z|→∞.',
    observe:['Scegli “Due minimi globali”: argmin contiene due punti, mentre min vale ancora un solo numero.', 'Inclina la funzione e confronta le due valli. La fascia ε limita il confronto locale, senza cambiare il costo.', 'Un punto selezionato vicino a una valle non è automaticamente un minimo: controlla anche la sua derivata.'],
    demoIds:['local-global-minima'],sources:source(2,5),
  },
  {
    id:'o1-derivate',conceptIds:['gradiente-hessiana'],title:'2. Gradiente e Hessiana: due domande diverse',
    intuition:'Il gradiente risponde a “quanto cambia il costo se mi sposto di poco?”. L’Hessiana risponde a “come cambia questa pendenza?”. La prima approssimazione è un piano tangente; la seconda aggiunge una forma quadratica che descrive la curvatura.',
    formulas:[
      F(String.raw`\nabla f(z)=\begin{bmatrix}\partial_1 f(z)\\\vdots\\\partial_d f(z)\end{bmatrix},\qquad [\nabla^2 f(z)]_{ij}=\partial_i\partial_j f(z)`, 'Il gradiente è un vettore colonna in ℝᵈ, l’Hessiana una matrice d×d. Con derivate seconde continue, le derivate miste coincidono e l’Hessiana è simmetrica.'),
      F(String.raw`f(z+hd)=f(z)+h\nabla f(z)^\top d+\tfrac{h^2}{2}d^\top\nabla^2 f(z)d+o(h^2)`, 'Per ‖d‖₂=1, ∇fᵀd è la derivata direzionale. I primi due termini danno il modello lineare; aggiungere la curvatura dà il modello quadratico. L’errore si interpreta quando h tende a zero.'),
      F(String.raw`r:\mathbb R^d\to\mathbb R^m,\quad [J_r]_{ij}=\frac{\partial r_i}{\partial z_j},\quad J_r\in\mathbb R^{m\times d},\quad \nabla r=J_r^\top`, 'Nelle slide il “gradiente” di una funzione vettoriale ha dimensione d×m: è il Jacobiano trasposto. Per una perturbazione δz, δr≈Jr δz=∇rᵀδz. Conservare la convenzione evita trasposte sbagliate nei vincoli KKT.'),
    ],
    assumptions:['Per il modello lineare serve differenziabilità; per quello quadratico e la simmetria assumiamo f∈C² in un intorno.', 'Il piano tangente è locale. Per una funzione non convessa non è necessariamente un limite inferiore globale.'],
    example:'Nel laboratorio f(x,y)=x²/2+y²+cxy+q(x⁴+y⁴)/4. Le derivate sono calcolate analiticamente e confrontate con il valore dopo uno spostamento hd. Per r(x,y)=(x²+y,xy), Jr=[[2x,1],[y,x]]: la matrice riportata chiarisce la convenzione anche per un’uscita vettoriale.',
    observe:['Cambia il punto e il termine misto c: la direzione del gradiente e la matrice Hessiana cambiano.', 'Riduci h e confronta gli errori dei modelli. Con q=0 il modello quadratico è esatto, a meno degli arrotondamenti.', 'Passa alla vista 3D per vedere il piano tangente; la freccia 2D mostra soltanto la direzione normalizzata del gradiente.'],
    demoIds:['derivatives'],sources:source(6,7),
  },
  {
    id:'o1-stazionarieta',conceptIds:['ottimalita-libera'],title:'3. Stazionario non significa minimo',
    intuition:'In un minimo interno non puoi migliorare il costo con uno spostamento infinitesimo. Perciò il gradiente deve annullarsi. Questo lascia aperte più possibilità: minimi, massimi e selle possono avere tutti gradiente nullo. La curvatura aiuta a separarli, ma nei casi degeneri occorre guardare oltre il secondo ordine.',
    formulas:[
      F(String.raw`z^*\text{ minimo locale},\ f\in C^1\;\Longrightarrow\;\nabla f(z^*)=0`, 'Condizione necessaria di primo ordine per un problema libero. L’implicazione inversa è falsa.'),
      F(String.raw`z^*\text{ minimo locale},\ f\in C^2\;\Longrightarrow\;\nabla^2 f(z^*)\succeq0`, 'Ogni curvatura direzionale deve essere non negativa. Una matrice semidefinita positiva può avere direzioni a curvatura nulla: il test resta inconcludente.'),
      F(String.raw`\nabla f(z^*)=0,\quad \nabla^2f(z^*)\succ0\;\Longrightarrow\;z^*\text{ minimo locale stretto}`, 'È una condizione sufficiente. Autovalori tutti negativi danno un massimo locale stretto; autovalori di entrambi i segni danno una sella. Non segue, in generale, un minimo globale.'),
    ],
    assumptions:['Il punto è interno al dominio e non ci sono vincoli. Al bordo o con vincoli cambiano le condizioni.', 'L’Hessiana è simmetrica e f∈C² in un intorno; gli autovalori si interpretano nel punto stazionario.'],
    example:'All’origine, x⁴+y⁴ e x⁴−y⁴ hanno entrambi gradiente e Hessiana nulli. Il primo ha un minimo stretto, il secondo una sella. Anche −x⁴ ha Hessiana nulla ma un massimo: semidefinita positiva è necessaria, non sufficiente. Nel laboratorio i primi termini non nulli lungo i due assi permettono la classificazione esatta della famiglia separabile.',
    observe:['Confronta i preset Minimo, Massimo e Sella e guarda i segni degli autovalori.', 'Passa da “Hessiana nulla: minimo” a “Hessiana nulla: sella”: gli autovalori restano uguali, ma il comportamento cambia.', 'Azzera anche i quartici: una funzione costante ha minimi e massimi non stretti ovunque.'],
    demoIds:['stationary-classification'],sources:source(8,9),
  },
  {
    id:'o1-insiemi-convessi',conceptIds:['insiemi-convessi'],title:'4. La convessità è una proprietà dei segmenti',
    intuition:'Un insieme è convesso quando tra due decisioni ammissibili è ammissibile anche ogni loro miscela. La parola “ogni” è essenziale: un singolo segmento che esce dall’insieme basta a negare la convessità; un segmento che resta dentro non basta a provarla.',
    formulas:[F(String.raw`A,B\in\mathcal Z,\ \theta\in[0,1]\;\Longrightarrow\;\theta A+(1-\theta)B\in\mathcal Z`, 'Il parametro θ muove un punto lungo il segmento. A θ=0 siamo in B; a θ=1 siamo in A. La combinazione ha coefficienti non negativi che sommano a uno.')],
    assumptions:['La definizione riguarda tutti i punti dell’insieme e tutti i coefficienti θ nell’intervallo.', 'La convessità non equivale a essere chiuso, limitato o avere un bordo liscio.'],
    example:'Un disco pieno è convesso: per disuguaglianza triangolare, la norma della combinazione di due punti non supera il raggio. Una corona non lo è: due punti opposti del bordo esterno hanno come punto medio il centro, escluso dal foro. Anche la sola circonferenza non è convessa, pur essendo il bordo di un insieme convesso.',
    observe:['Confronta disco, corona e circonferenza mantenendo fissi gli estremi opposti.', 'Sposta θ: il punto cambia colore quando non appartiene all’insieme.', 'Rendi gli estremi coincidenti: il segmento è ammissibile anche nella corona. Questo non rende convesso l’insieme.'],
    demoIds:['convex-set'],sources:source(10),
  },
  {
    id:'o1-funzioni-convesse',conceptIds:['funzioni-convesse'],title:'5. Il grafico sotto la corda',
    intuition:'La convessità di una funzione confronta il costo di una miscela con la miscela dei costi. Se il costo della decisione intermedia non supera la corda, la funzione si incurva nel verso giusto. È una proprietà diversa dalla convessità del dominio: servono entrambe nella definizione.',
    formulas:[
      F(String.raw`f(\theta A+(1-\theta)B)\leq\theta f(A)+(1-\theta)f(B)`, 'La funzione è convessa se la disuguaglianza vale per tutte le coppie nel dominio e per ogni θ∈[0,1]. È strettamente convessa se vale < per A≠B e 0<θ<1.'),
      F(String.raw`f\text{ concava}\iff -f\text{ convessa}`, 'Una funzione affine verifica sempre l’uguaglianza ed è sia convessa sia concava. Non è strettamente convessa su un dominio con almeno due punti.'),
    ],
    assumptions:['Il dominio è convesso. Agli estremi θ=0 e θ=1, oppure con A=B, c’è uguaglianza anche nel caso strettamente convesso.', 'Il grafico mostra esempi 1D; la stessa definizione vale in dimensione d.'],
    example:'f(z)=z⁴ è strettamente convessa su ℝ anche se f″(0)=0. Non è fortemente convessa con una costante positiva uniforme su tutta ℝ. Una doppia valle ottenuta con a<0 e b>0 può violare la disuguaglianza della corda attorno all’origine. L’esponenziale è strettamente convesso, ma la convessità da sola non garantisce che il minimo venga raggiunto.',
    observe:['Osserva lo scarto “corda − f(zθ)”: se è negativo hai un controesempio alla convessità.', 'Confronta quadratica, quartica, affine ed esponenziale.', 'Metti θ agli estremi: uno scarto zero non smentisce la convessità stretta.'],
    demoIds:['convex-function'],sources:source(11),
  },
  {
    id:'o1-convessita-vincoli',conceptIds:['geometria-vincoli'],title:'6. Vincoli e convessità: le implicazioni corrette',
    intuition:'La geometria dell’insieme ammissibile dipende dal livello scelto, oltre che dalla funzione che lo definisce. Le slide presentano due equivalenze troppo forti. Qui usiamo le implicazioni corrette e controesempi espliciti: preserviamo il risultato utile senza trasformarlo in un criterio sbagliato.',
    formulas:[
      F(String.raw`g\text{ convessa}\;\Longrightarrow\;\{z:g(z)\leq\alpha\}\text{ convesso per ogni }\alpha`, 'Per uno scalare g, essere quasi-convessa significa avere tutti i sottolivelli convessi su un dominio convesso. Un solo sottolivello convesso non implica quasi-convessità globale. Intersecare sottolivelli convessi conserva la convessità per più disuguaglianze.'),
      F(String.raw`h(z)=Az-b\;\Longrightarrow\;\{z:h(z)=0\}\text{ affine, dunque convesso}`, 'L’insieme delle soluzioni può essere vuoto. Se non è vuoto, è una traslazione di ker A; è uno spazio vettoriale soltanto se contiene l’origine. Non serve che h sia affine perché il suo insieme di zeri sia convesso.'),
      F(String.raw`g(z)=(\|z\|^2-1)^2-1:\quad\{g\leq0\}=\{\|z\|\leq\sqrt2\}`, 'Questo sottolivello è un disco, ma livelli tra −1 e 0 sono corone non convesse. È un controesempio alla frase “un sottolivello convesso se e solo se g quasi-convessa”.'),
      F(String.raw`h(x,y)=(x-c)^2:\quad\{h=0\}=\{x=c\}`, 'h non è affine, mentre il suo insieme di zeri è una retta convessa. È un controesempio all’altra implicazione inversa delle slide. La rappresentazione non è regolare: ∇h si annulla sulla retta; questo sarà rilevante per KKT.'),
    ],
    assumptions:['Le correzioni riguardano le pp. 12–13 del PDF. “Problema convesso in forma standard” richiede uguaglianze affini: è una scelta di rappresentazione utile, non un’equivalenza per ogni possibile funzione h.', 'Per una funzione vettoriale, considerare separatamente ogni componente e poi l’intersezione dei vincoli.'],
    example:'Seleziona g≤α e passa da α=0 a α=−0,5: la stessa funzione produce prima un disco e poi una corona. Seleziona poi le uguaglianze x−c=0 e (x−c)²=0: il loro insieme ammissibile coincide, anche se la seconda funzione è non affine. Con c≠0 la retta non passa per l’origine e non è uno spazio vettoriale.',
    observe:['Usa gli estremi opposti della corona per ottenere una miscela non ammissibile.', 'Confronta le due uguaglianze: cambia la funzione, non l’insieme.', 'Tieni distinto un insieme convesso da una rappresentazione che soddisfa le ipotesi di un teorema o di un algoritmo.'],
    demoIds:['constraint-convexity'],sources:source(12,13),
  },
  {
    id:'o1-curvatura',conceptIds:['monotonia','lipschitz','limiti-quadratici'],title:'7. Curvatura, monotonia e regolarità del gradiente',
    intuition:'La convessità impedisce al costo di scendere sotto una sua tangente. La convessità forte impone una curvatura minima μ; la regolarità Lipschitz del gradiente impone una curvatura massima in modulo, L. Queste due costanti controllano modelli quadratici e differenze tra gradienti. Hanno senso soltanto dopo aver fissato il dominio su cui devono valere.',
    formulas:[
      F(String.raw`f(\theta x+(1-\theta)y)\leq\theta f(x)+(1-\theta)f(y)-\tfrac\mu2\theta(1-\theta)\|x-y\|^2`, 'Adottiamo la convenzione standard con μ/2 e ≤, per μ>0. È coerente con i limiti quadratici delle pp. 19–20. La p. 16 omette il fattore 1/2 e mescola disuguaglianze strette: qui la convenzione è uniforme.'),
      F(String.raw`(\nabla f(x)-\nabla f(y))^\top(x-y)\geq0`, 'Per f convessa e differenziabile il gradiente è monotono. Se f è strettamente convessa, lo scarto è >0 per x≠y. Per μ-convessità forte lo scarto è almeno μ‖x−y‖².'),
      F(String.raw`\|\nabla f(x)-\nabla f(y)\|\leq L\|x-y\|`, 'Definizione di gradiente L-Lipschitz. Per f∈C², convessa, i limiti 0≼∇²f≼LI lungo il dominio permettono questa stima. Forte convessità e regolarità insieme si leggono come μI≼∇²f≼LI.'),
      F(String.raw`f(x)+\nabla f(x)^\top(y-x)+\tfrac\mu2\|y-x\|^2\leq f(y)\leq f(x)+\nabla f(x)^\top(y-x)+\tfrac L2\|y-x\|^2`, 'Il modello inferiore usa convessità forte; con μ=0 è la tangente di una funzione convessa. Il modello superiore usa gradiente L-Lipschitz e vale anche senza convessità.'),
      F(String.raw`(\nabla f(x)-\nabla f(y))^\top(x-y)\geq\tfrac1L\|\nabla f(x)-\nabla f(y)\|^2`, 'Per una funzione convessa con gradiente L-Lipschitz e L>0, il gradiente è 1/L-cocoercivo: una proprietà più forte della sola monotonia.'),
      F(String.raw`(\nabla f(x)-\nabla f(y))^\top(x-y)\geq\tfrac{\mu L}{\mu+L}\|x-y\|^2+\tfrac1{\mu+L}\|\nabla f(x)-\nabla f(y)\|^2`, 'Combinazione valida sotto μ-convessità forte e gradiente L-Lipschitz. Nel laboratorio si può anche usare μ=0, ottenendo il caso limite della cocoercività. Lo scarto riportato è membro sinistro meno membro destro.'),
    ],
    assumptions:['Le proprietà devono valere sul dominio convesso considerato, non soltanto nei due punti selezionati. Le interpretazioni tramite Hessiana assumono f∈C².', 'Nel laboratorio f(z)=az²/2+bz⁴/4, a,b≥0 e dominio [−2,2]. La curvatura varia tra a e a+12b: μ≤a e L≥a+12b sono costanti valide.', 'Per b>0 non esiste una L finita valida su tutta ℝ; z⁴ è strettamente convessa ma non μ-fortemente convessa con μ>0 su un intervallo che contiene 0.'],
    example:'Con a=1, b=0,15, la curvatura minima è 1 e quella massima su [−2,2] è 2,8: μ=1 e L=3 sono valide. Il costo resta tra le due parabole ancorate al punto x. Con a=2, b=0 e μ=L=2 i due modelli coincidono con f: le disuguaglianze diventano uguaglianze. Dichiarare μ troppo grande o L troppo piccola elimina la garanzia, anche se in una coppia particolare di punti il grafico sembra rispettarla.',
    observe:['Cambia il punto base: tangente e parabole si aggiornano insieme, non traslando soltanto una figura predefinita.', 'Prova i preset con costanti non valide e confronta lo stato delle ipotesi con gli scarti nei punti selezionati.', 'Controlla monotonia, cocoercività e disuguaglianza combinata usando gli stessi dati. Riduci b a zero per vedere il caso quadratico esatto.'],
    demoIds:['quadratic-bounds'],sources:source(14,20),
  },
  {
    id:'o1-ottimalita-convessa',conceptIds:['minimizzazione-convessa'],title:'8. Perché in un problema convesso un minimo locale è globale',
    intuition:'Supponi di avere un minimo locale x ma di conoscere un punto y con costo più basso. In un dominio convesso puoi muoverti da x verso y di una quantità arbitrariamente piccola. La convessità assicura che questi punti intermedi abbiano già costo minore: è una contraddizione con il fatto che x fosse minimo locale. Non serve assumere che esista un altro minimo globale.',
    formulas:[
      F(String.raw`f\text{ convessa su }\mathcal Z\text{ convesso}\;\Longrightarrow\;\text{ogni minimo locale è globale}`, 'La dimostrazione usa zθ=(1−θ)x+θy, con θ>0 piccolo: f(zθ)≤(1−θ)f(x)+θf(y)<f(x). Si trova così un punto migliore arbitrariamente vicino a x.'),
      F(String.raw`f:\mathbb R^d\to\mathbb R\text{ convessa e differenziabile}:\quad z^*\text{ globale}\iff\nabla f(z^*)=0`, 'La necessità vale per minimi liberi interni. La sufficienza segue dal limite affine inferiore: f(z)≥f(z*)+∇f(z*)ᵀ(z−z*)=f(z*). Su un dominio vincolato il minimo può avere gradiente non nullo.'),
    ],
    assumptions:['La convessità è del costo e del dominio; il gradiente nullo caratterizza il minimo nel caso libero su ℝᵈ.', 'Convessità non significa esistenza del minimo. Convessità stretta implica al più un minimo, non che venga raggiunto.'],
    example:'f(z)=exp(z) è convessa e positiva. Il suo infimo è 0 quando z→−∞, ma nessun punto raggiunge 0 e la derivata non si annulla mai. Invece z⁴ raggiunge il suo unico minimo in 0 pur avendo Hessiana nulla lì. Il laboratorio della corda permette di confrontare questi due casi con una funzione affine e una doppia valle non convessa.',
    observe:['Seleziona l’esponenziale: non confondere il punto più basso nella finestra del grafico con un minimo su ℝ.', 'Confronta z⁴ e una quadratica: entrambe hanno minimo unico, ma soltanto la seconda ha curvatura uniformemente positiva.', 'Per una funzione affine costante ogni punto è un minimo globale; se la pendenza è non nulla il costo è illimitato inferiormente su ℝ.'],
    demoIds:['convex-optimality'],sources:source(21,22),
  },
  {
    id:'o1-programmi-quadratici',conceptIds:['qp-liberi'],title:'9. Programmi quadratici: anche l’esistenza va controllata',
    intuition:'Un costo quadratico è interamente descritto da una matrice simmetrica Q e da un termine lineare q. Q decide la curvatura; q inclina il costo. Se Q ha una direzione negativa il costo scende senza limite. Se Q è semidefinita positiva, le direzioni piatte richiedono un controllo aggiuntivo sul termine lineare.',
    formulas:[
      F(String.raw`f(z)=\tfrac12z^\top Qz+q^\top z,\quad Q=Q^\top,\quad\nabla f(z)=Qz+q,\quad\nabla^2f(z)=Q`, 'Per un minimo libero sono necessarie Qz*+q=0 e Q≽0. Per i quadratici, se entrambe valgono, il punto è un minimo globale.'),
      F(String.raw`Q\succ0\;\Longrightarrow\;z^*=-Q^{-1}q\quad\text{unico minimo globale}`, 'La matrice invertibile e definita positiva rende la funzione strettamente convessa e coerciva. In implementazione si preferisce risolvere un sistema lineare all’inversione esplicita.'),
      F(String.raw`Q\succeq0:\quad\text{un minimo esiste}\iff q\in\operatorname{Im}Q\iff q\perp\ker Q`, 'La sola semidefinita positività non assicura esistenza. Se Q è singolare e il sistema Qz=−q è risolvibile, tutte le soluzioni z*+ker Q sono minimi. Altrimenti una componente lineare lungo il nucleo porta il costo a −∞.'),
    ],
    assumptions:['Q è simmetrica e il dominio è tutta ℝᵈ. Con vincoli, una matrice indefinita può avere un minimo sull’insieme ammissibile: sarà il tema dei blocchi successivi.', 'Il laboratorio usa due dimensioni; gli autovalori possono essere positivi, nulli o negativi. Non applicare il precedente laboratorio dei pesi positivi ai casi singolari senza questi controlli.'],
    example:'Con Q=diag(0,2), q=(0,1), il costo è y²+y: ogni punto con y=−1/2 è minimo e x è libero. Con la stessa Q e q=(1,0), il costo è x+y²: scegliere x→−∞ lo rende illimitato inferiormente, benché Q≽0. Il laboratorio separa i due casi e mostra il residuo di stazionarietà quando esiste un minimo.',
    observe:['Confronta “Infiniti minimi” e “Q≥0, ma nessun minimo”: la matrice non cambia, il termine lineare sì.', 'Introduci un autovalore negativo: l’eventuale punto stazionario non è un minimo globale.', 'Ruota gli assi e osserva come la compatibilità di q con il nucleo cambia. Il punto mostrato nel caso non unico è un rappresentante, non l’unico minimizzatore.'],
    demoIds:['quadratic-program'],sources:source(23,25),
  },
];
