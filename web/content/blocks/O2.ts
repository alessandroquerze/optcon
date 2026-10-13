import type { LessonSection } from '../schema';
import '../../demos/O2/styles.css';

const F=(latex:string,explanation:string)=>({latex,explanation});
const S=(a:number,b=a)=>[{sourceId:'ottimizzazione' as const,pages:Array.from({length:b-a+1},(_,i)=>a+i)}];

export const O2Lessons:LessonSection[]=[
  {
    id:'o2-discesa',conceptIds:['direzioni-discesa'],title:'10. Scegliere dove andare e quanto avanzare',
    intuition:'Un algoritmo parte da una stima z₀ e costruisce altre decisioni. Due scelte hanno ruoli diversi: la direzione indica dove cercare; il passo decide quanto fidarsi di quella direzione. Una direzione corretta può produrre un costo peggiore quando il passo è troppo lungo. L’idea di discesa si applica finché il gradiente non è nullo.',
    formulas:[
      F(String.raw`z_{k+1}=z_k+\gamma_kd_k,\qquad\gamma_k>0`, 'k conta le iterazioni, non il tempo del sistema controllato. Si somma sempre una direzione firmata: il segno meno può essere già contenuto in dₖ.'),
      F(String.raw`\nabla f(z_k)^Td_k<0\ \Longrightarrow\ f(z_k+\gamma d_k)<f(z_k)\quad\text{per }\gamma>0\text{ sufficientemente piccolo}`, 'L’espansione di primo ordine è f(z+γd)=f(z)+γ∇f(z)ᵀd+o(γ), per d fissata. La disuguaglianza stretta sulla pendenza domina il resto vicino a γ=0.'),
      F(String.raw`d_k=-D_k\nabla f(z_k),\quad D_k=D_k^T\succ0\quad\Longrightarrow\quad\nabla f(z_k)^Td_k=-\nabla f(z_k)^TD_k\nabla f(z_k)<0`, 'Vale per gradiente non nullo. Una matrice positiva cambia la geometria della direzione senza perdere la pendenza negativa.'),
    ],
    assumptions:['f è continuamente differenziabile in un intorno del segmento esplorato. Il punto iniziale deve appartenere al dominio.', 'La sola formula di aggiornamento non garantisce discesa: servono una direzione appropriata e una scelta del passo. Al gradiente nullo il metodo può arrestarsi anche su una sella.'],
    example:'Nel QP del laboratorio Q ha autovalori 1 e κ ed è ruotata di 30°. Aumentare κ allunga i livelli; un passo fisso adatto a κ=2 può essere instabile con κ=8. Armijo riduce automaticamente la lunghezza prima di accettare.',
    observe:['Avanza con Passo +1 e confronta geometria, costo e norma del gradiente. Esegui tutto mostra l’intero budget; Indietro permette di rileggere ogni aggiornamento.', 'Prova il caso “Passo instabile”, poi passa ad Armijo. Il vincolo di discesa riguarda il costo effettivamente calcolato.', 'La vista 3D mostra gli stessi iterati sulla superficie, senza cambiare il problema in due variabili.'],
    demoIds:['descent-methods'],sources:S(26,31),
  },
  {
    id:'o2-gradiente-newton',conceptIds:['metodi-gradiente'],title:'11. Gradiente, scala e curvatura',
    intuition:'Il gradiente negativo scende più rapidamente tra le direzioni di lunghezza unitaria nella norma euclidea. Newton adatta la direzione alla curvatura: accorcia il movimento dove il costo è rigido e lo allunga dove è piatto. “Più rapido” in una geometria non significa che ogni passo intero sia sicuro.',
    formulas:[
      F(String.raw`\underset{\|d\|_2=1}{\arg\min}\ \nabla f(z)^Td=-\frac{\nabla f(z)}{\|\nabla f(z)\|_2}`, 'Con gradiente non nullo, Cauchy–Schwarz dà la pendenza minima −‖∇f‖. Il gradiente usuale usa la direzione non normalizzata −∇f; il fattore di scala può essere assorbito nel passo.'),
      F(String.raw`D_k=I\quad\text{(gradiente)},\qquad H_kd_k=-\nabla f(z_k)\quad\text{(Newton)}`, 'Newton si implementa risolvendo un sistema lineare, evitando di formare esplicitamente H⁻¹. Con H≻0 il passo è di discesa; con H indefinita questa proprietà può fallire.'),
      F(String.raw`(H_h)_{ij}\approx\frac{[\nabla f(z+he_j)]_i-[\nabla f(z-he_j)]_i}{2h},\qquad B_k=\tfrac12(H_h+H_h^T)+\lambda I`, 'Newton discreto approssima l’Hessiana con differenze centrate del gradiente, poi la simmetrizza. Un λ positivo può rendere B positiva; deve essere abbastanza grande da compensare la curvatura negativa.'),
    ],
    assumptions:['Il gradiente più ripido dipende dalla norma scelta. Il laboratorio usa la norma euclidea e D=diag(D₁₁,1) per il caso scalato.', 'Newton richiede derivate seconde e un sistema risolvibile. Per usarlo come metodo di discesa si richiede B≻0; il laboratorio ferma il metodo se questa condizione manca.', 'La convergenza quadratica di Newton è locale, presso un minimo non degenere, con Hessiana regolare e partenza vicina. La differenziazione numerica introduce un errore dipendente da h.'],
    example:'Per un QP strettamente convesso, Newton puro con γ=1 raggiunge il minimo in un aggiornamento: Qd=−Qz implica d=−z. Sulla funzione (x²−1)²+y², vicino a x=0 l’Hessiana ha una direzione negativa: λ=0 può bloccare Newton.',
    observe:['Confronta i preset di gradiente e Newton sullo stesso QP. Costo e residuo devono concordare con la soluzione analitica z*=0.', 'Nel caso non convesso aumenta λ finché il modello diventa positivo; l’algoritmo dichiara l’arresto quando non può costruire una direzione valida.', 'Con Newton discreto varia h: nel QP la differenza centrata è esatta salvo arrotondamenti; nella quartica l’approssimazione dipende da h.'],
    demoIds:['gradient-versus-newton'],sources:S(32,33),
  },
  {
    id:'o2-newton-zeri',conceptIds:['newton-zeri'],title:'12. Newton cerca lo zero di una linearizzazione',
    intuition:'Per risolvere r(z)=0, sostituiamo la curva con la tangente nel punto corrente e prendiamo lo zero della tangente come nuova stima. La costruzione è locale: una tangente quasi orizzontale può mandare la stima lontano e alcune partenze producono cicli.',
    formulas:[
      F(String.raw`r(z_k+\Delta z)\approx r(z_k)+J_r(z_k)\Delta z,\quad J_r(z_k)\Delta z_k=-r(z_k)`, 'Per un residuo vettoriale r:ℝᵈ→ℝᵈ si usa il Jacobiano Jᵣ. Nella convenzione delle slide ∇r=Jᵣᵀ; qui si mantiene il Jacobiano standard per evitare trasposte ambigue.'),
      F(String.raw`z_{k+1}=z_k+\Delta z_k,\qquad\Delta z_k=-\frac{r(z_k)}{r'(z_k)}\quad(d=1)`, 'Il rapporto è definito solo quando r′(zₖ)≠0. Trovare uno zero non coincide con minimizzare una funzione arbitraria.'),
    ],
    assumptions:['Per il metodo vettoriale Jᵣ deve essere invertibile. Una radice semplice e un Jacobiano localmente Lipschitz permettono convergenza quadratica da una partenza sufficientemente vicina.', 'Il laboratorio scalare rappresenta la stessa costruzione geometrica in dimensione 1. Non impone diminuzione monotona di |r| e ferma derivata nulla, cicli individuati e overflow.'],
    example:'Per r(z)=z²−2, una partenza positiva vicina porta a √2. Partire da 0 rende il passo indefinito. Per r(z)=z³−2z+2, z₀=0 genera esattamente 0→1→0: il residuo non tende a zero.',
    observe:['Segui lo zero della tangente e poi premi Passo +1: il nuovo punto viene riportato sulla curva originale.', 'Confronta il residuo nei casi √2, derivata nulla e ciclo. Un limite di iterazioni non è una prova di convergenza.', 'Il parametro a modifica soltanto r(z)=z²−a.'],
    demoIds:['newton-root'],sources:S(34),
  },
  {
    id:'o2-modelli',conceptIds:['modelli-quadratici'],title:'13. Un problema quadratico a ogni iterazione',
    intuition:'Newton per minimizzare f applica Newton per zeri al residuo ∇f. La stessa equazione si ottiene minimizzando il modello quadratico locale, quando la sua curvatura è positiva. Il modello è affidabile vicino al punto base; il suo minimo può essere troppo lontano per essere un buon passo intero sul costo reale.',
    formulas:[
      F(String.raw`m_k(\Delta z)=f(z_k)+g_k^T\Delta z+\tfrac12\Delta z^TB_k\Delta z`, 'gₖ=∇f(zₖ). Per Newton si sceglie Bₖ=∇²f(zₖ); la regolarizzazione usa Bₖ=Hₖ+λI.'),
      F(String.raw`B_k\succ0\ \Longrightarrow\ \Delta z_k=\arg\min_{\Delta z}m_k(\Delta z),\qquad B_k\Delta z_k=-g_k`, 'La positività definita rende il modello strettamente convesso e il minimo unico. Un’Hessiana indefinita può dare un sistema risolvibile senza che esista un minimo del modello.'),
      F(String.raw`B_k=D_k^{-1}\succ0\quad\Longrightarrow\quad\Delta z_k=-D_kg_k,\qquad z_{k+1}=z_k+\gamma_k\Delta z_k`, 'Il gradiente scalato minimizza un modello con curvatura D⁻¹. Correzione p. 36: il passo definito come argmin va sommato. P. 37 presenta un segno incoerente nella frase iniziale: il passo minimizzante è −Dg.'),
    ],
    assumptions:['f è due volte differenziabile per il modello di Taylor. La regolarizzazione è una modifica deliberata del modello, esplicitata dal parametro λ.', 'Se B non è positiva definita, non si dichiara un minimo unico. Il sistema BΔz=−g e l’esistenza di un argmin sono affermazioni diverse.'],
    example:'Con il QP e λ=0, il modello coincide esattamente con f in ogni punto. Nella quartica, il modello all’origine ha curvatura −4 lungo x; con λ>4 diventa positivo, ma resta un’approssimazione locale.',
    observe:['Confronta i livelli verdi del costo e quelli arancioni del modello; in 3D confronta le due superfici.', 'Il residuo ‖g+BΔz‖ controlla la soluzione del sistema. Non misura l’ottimalità sul costo originale.', 'Usa il preset indefinito e poi quello regolarizzato per vedere quando compare un minimo unico del modello.'],
    demoIds:['newton-model'],sources:S(35,37),
  },
  {
    id:'o2-armijo',conceptIds:['armijo'],title:'14. Armijo richiede una diminuzione sufficiente',
    intuition:'Un costo più basso può ancora indicare un progresso troppo piccolo rispetto alla pendenza promessa. Armijo confronta il costo con una frazione della discesa prevista dal modello lineare. Il backtracking prova il passo iniziale e lo riduce geometricamente finché il confronto passa.',
    formulas:[
      F(String.raw`\gamma_i=\beta^i\gamma_0,\quad\gamma_0>0,\quad0<\beta<1,\quad0<c<1`, 'β controlla quanto si restringe il passo; c la frazione di diminuzione lineare richiesta. Le slide suggeriscono β=0,7 e c=0,5; non sono valori universali.'),
      F(String.raw`f(z+\gamma_i d)\le f(z)+c\gamma_i\nabla f(z)^Td`, 'Si accetta il primo tentativo che soddisfa la disuguaglianza standard. Le slide scrivono la variante stretta; nei calcoli si usa ≤ e si gestisce prima il gradiente nullo.'),
      F(String.raw`\nabla f(z)^Td<0,\quad f\in C^1\quad\Longrightarrow\quad\text{un passo sufficientemente piccolo soddisfa Armijo}`, 'L’esistenza di un passo segue dal termine o(γ). È necessario restare nel dominio; i tentativi non validi vengono rifiutati.'),
    ],
    assumptions:['La direzione deve essere di discesa. Accorciare indefinitamente una direzione di salita non risolve il problema.', 'Il laboratorio limita il numero di tentativi e segnala il fallimento. La terminazione teorica esatta non elimina limiti e arrotondamenti numerici.'],
    example:'Sul QP, la curva lungo la direzione è una parabola in γ. Il passo iniziale può risalire oltre il minimo della parabola; moltiplicazioni successive per β portano il punto sotto la retta del limite Armijo.',
    observe:['Ogni click aggiunge un tentativo alla tabella e al grafico. I punti rossi sono rifiutati, quello verde è accettato.', 'Aumenta c per richiedere più diminuzione, poi varia β per vedere quanto finemente vengono cercati i passi.', 'Il preset di salita viene fermato prima di generare tentativi; il punto stazionario non viene presentato come un minimo certificato.'],
    demoIds:['armijo'],sources:S(38,40),
  },
  {
    id:'o2-convergenza',conceptIds:['passi-convergenza'],title:'15. Cosa garantisce davvero la convergenza?',
    intuition:'Tre fenomeni diversi possono apparire simili in un grafico breve: il costo si stabilizza, il gradiente diventa piccolo, la decisione converge. Un teorema sui punti di accumulazione dice soltanto cosa accade alle sottosequenze che convergono; non ne garantisce automaticamente l’esistenza e non assicura un unico limite.',
    formulas:[
      F(String.raw`\gamma_k=\gamma>0\quad\text{oppure}\quad\gamma_k=\frac{\gamma_0}{(k+1)^\alpha}`, 'Si usa k+1 per avere un passo definito anche a k=0. Per il passo decrescente, γₖ→0 e Σγₖ=∞ se 0<α≤1; Σγₖ²<∞ se α>1/2. La scelta comune 1/2<α≤1 soddisfa entrambe le condizioni sulle serie.'),
      F(String.raw`0<d_1I\preceq D_k\preceq d_2I,\quad f\in C^1,\quad\text{Armijo}\ \Longrightarrow\ \nabla f(\bar z)=0\text{ per ogni punto di accumulazione }\bar z`, 'La metrica deve restare uniformemente positiva e limitata. Si usano parametri di backtracking fissi, incluso un passo iniziale positivo. Newton senza controllo dello spettro non soddisfa automaticamente queste ipotesi.'),
      F(String.raw`\|\nabla f(z)-\nabla f(w)\|\le L\|z-w\|,\quad0<\gamma<\frac{2d_1}{Ld_2^2}`, 'È un limite sufficiente conservativo per ottenere discesa con passo costante e metrica uniformemente limitata. Con passo decrescente, γₖ→0 e Σγₖ=∞ danno il risultato sui punti di accumulazione sotto le ipotesi delle slide. Le costanti globali non vanno dedotte da una piccola finestra disegnata.'),
      F(String.raw`f(z)=\tfrac12z^TQz+q^Tz,\quad z_{k+1}=z_k-\gamma(Qz_k+q),\quad Q\succ0:\;0<\gamma<2/\lambda_{\max}(Q)`, 'Nel QP strettamente convesso, l’errore soddisfa eₖ₊₁=(I−γQ)eₖ. Tutti i modi si contraggono se |1−γλᵢ|<1; γ=2/λmax può produrre oscillazioni, oltre il limite può divergere.'),
      F(String.raw`\lim_{\|z\|\to\infty}f(z)=+\infty\quad\text{(coercività)}`, 'Con continuità, i sottolivelli sono compatti. Se l’algoritmo mantiene discesa, gli iterati restano in un sottolivello e hanno punti di accumulazione. Nel caso non convesso possono essere selle; nel caso convesso la stazionarietà implica minimo globale.'),
    ],
    assumptions:['Una sequenza finita non dimostra convergenza asintotica. Il laboratorio espone un budget, una tolleranza e un arresto numerico, mantenendoli distinti.', 'Le affermazioni delle pp. 44–45 vanno lette sotto le ipotesi del metodo: non è vero che ogni sottosequenza di una sequenza limitata converge. Ogni punto di accumulazione è stazionario quando vale il teorema pertinente.', 'Il costo lineare cᵀz soddisfa la regolarità Lipschitz del gradiente, ma se c≠0 non ha minimo e gli iterati possono andare all’infinito. La coercività è un’ipotesi sufficiente, non necessaria, per l’esistenza.'],
    example:'Per Q=I e γ=2, zₖ=(−1)ᵏz₀: il costo resta costante e la sequenza non converge. Con γ=1 il minimo è raggiunto in un passo. Per f=x+y, il gradiente resta (1,1) e il costo scende senza limite: un costo in discesa non basta.',
    observe:['Confronta passo costante, Armijo e passo decrescente su un QP; osserva insieme costo e norma del gradiente.', 'Imposta α>1: i passi hanno somma finita e possono arrestare il progresso lontano dal minimo.', 'Il terzo grafico illustra (−1)ᵏ e la sottosequenza pari; usa i passi per aumentare l’indice osservato. È un esempio separato dagli iterati dell’ottimizzatore.', 'Il preset della sella si ferma con gradiente nullo pur non essendo un minimo.'],
    demoIds:['convergence'],sources:S(41,46),
  },
  {
    id:'o2-ottimalita-vincolata',conceptIds:['ottimalita-convessi'],title:'16. Al bordo contano solo le direzioni ammissibili',
    intuition:'Su un insieme vincolato, non tutte le direzioni sono disponibili. Al minimo il costo non può scendere muovendosi verso nessun altro punto ammissibile. Il gradiente può essere non nullo: il suo negativo può puntare fuori dall’insieme.',
    formulas:[
      F(String.raw`z^*\in\mathcal Z,\qquad\nabla f(z^*)^T(v-z^*)\ge0\quad\forall v\in\mathcal Z`, 'Condizione necessaria per un minimo locale se Z è convesso e f differenziabile. Si deriva lungo il segmento ammissibile z*+t(v−z*), t≥0. Se f è convessa, è anche sufficiente per il minimo globale su Z.'),
      F(String.raw`z^*=P_\mathcal Z(z^*-\gamma\nabla f(z^*))\quad\text{per ogni }\gamma>0`, 'Per Z chiuso, convesso e non vuoto, la condizione variazionale equivale al punto fisso della proiezione. Questo fornisce un residuo utile anche al bordo.'),
    ],
    assumptions:['L’insieme Z è non vuoto e convesso; la chiusura serve per la proiezione. f può essere non convessa nella condizione necessaria.', 'Il laboratorio usa il costo convesso ‖z−a‖²/2 e calcola il minimo della pendenza su tutto il disco o quadrato tramite la funzione di supporto. Non si limita a controllare pochi punti campionati.'],
    example:'Minimizzare (x−3)²/2 su [−1,1] dà x*=1 e f′(1)=−2. Per ogni v≤1 il prodotto −2(v−1) è non negativo. Nel laboratorio il disco o quadrato generalizza questa geometria a due dimensioni.',
    observe:['Nel preset “Ottimo sul bordo”, il residuo di punto fisso è zero mentre il gradiente non lo è.', 'Cambia il centro a del costo lasciando invariato il punto proiettato. Una proiezione geometrica corretta non è necessariamente il minimo di un altro costo.', 'Il punto rosso minimizza la pendenza: se il valore è negativo, mostra una direzione ammissibile di discesa.'],
    demoIds:['feasible-directions'],sources:S(47,48),
  },
  {
    id:'o2-proiezione',conceptIds:['proiezione'],title:'17. La proiezione esiste ed è unica',
    intuition:'La proiezione cerca il punto ammissibile più vicino a un punto dato, anche quando questo è esterno. La chiusura evita che il punto più vicino resti escluso; la convessità rende unica la soluzione. La distanza può essere sostituita dalla distanza al quadrato senza cambiare il punto minimizzante.',
    formulas:[
      F(String.raw`P_\mathcal Z(v)=\arg\min_{w\in\mathcal Z}\tfrac12\|w-v\|_2^2`, 'In dimensione finita, con Z non vuoto e chiuso, la distanza quadratica coerciva raggiunge il minimo. Se Z è anche convesso, la stretta convessità del costo rende il minimizzatore unico.'),
      F(String.raw`(v-P_\mathcal Z(v))^T(w-P_\mathcal Z(v))\le0\quad\forall w\in\mathcal Z`, 'La direzione che va dalla proiezione verso il punto esterno è una normale esterna all’insieme. È una caratterizzazione della proiezione su un insieme chiuso convesso.'),
      F(String.raw`P_{[-b,b]^2}(v)_i=\max(-b,\min(b,v_i)),\quad P_{\|w\|\le b}(v)=\begin{cases}v&\|v\|\le b\\ bv/\|v\|&\|v\|>b\end{cases}`, 'Sul quadrato si limita ogni coordinata; sul disco si accorcia radialmente solo quando il punto è esterno. La formula del disco evita divisioni per zero all’origine.'),
    ],
    assumptions:['Z deve essere chiuso, convesso e non vuoto per esistenza e unicità. Per un insieme aperto il minimo può non essere raggiunto; per un insieme non convesso possono esserci più proiezioni.', 'Le forme del laboratorio sono riduzioni didattiche in ℝ² con b>0 e proiezioni analitiche.'],
    example:'La proiezione di (3,4) sul disco unitario è (0,6;0,8), mentre sul quadrato unitario è (1,1). Sul disco aperto il punto (1,0) è escluso: la distanza da (2,0) ha infimo 1, ma nessun minimizzatore.',
    observe:['Sposta il punto esterno e cambia forma: nel quadrato la proiezione può cadere su un lato o un vertice.', 'Porta il punto dentro: la proiezione coincide con il punto stesso e la distanza diventa zero.', 'θ sposta un punto di prova ammissibile sul bordo; il prodotto della caratterizzazione resta non positivo.'],
    demoIds:['projection'],sources:S(49),
  },
  {
    id:'o2-gradiente-proiettato',conceptIds:['gradiente-proiettato'],title:'18. Scendere, proiettare oppure combinare punti ammissibili',
    intuition:'Il gradiente proiettato propone prima un passo libero, poi lo riporta nell’insieme. Il metodo delle direzioni ammissibili proietta un modello locale e percorre solo una frazione del segmento verso la sua soluzione. I due aggiornamenti possono essere diversi, pur condividendo la stessa geometria.',
    formulas:[
      F(String.raw`z_{k+1}=P_\mathcal Z(z_k-\gamma_k\nabla f(z_k))`, 'Il nuovo punto è ammissibile per definizione di proiezione. Un passo troppo grande può però far oscillare il costo: ammissibilità e discesa sono proprietà distinte.'),
      F(String.raw`\widetilde z_k=\arg\min_{z\in\mathcal Z}\left[f(z_k)+\nabla f(z_k)^T(z-z_k)+\tfrac12\|z-z_k\|^2\right]=P_\mathcal Z(z_k-\nabla f(z_k))`, 'Completando il quadrato si ottiene la proiezione. È il modello con curvatura identità della p. 51, senza un passo inserito al suo interno.'),
      F(String.raw`z_{k+1}=z_k+\gamma_k(\widetilde z_k-z_k)=(1-\gamma_k)z_k+\gamma_k\widetilde z_k,\quad0\le\gamma_k\le1`, 'Se i due estremi appartengono a Z convesso, tutta la combinazione resta in Z. L’intervallo [0,1] rende esplicito il “sufficientemente piccolo” delle slide; per progredire si usa γ>0.'),
      F(String.raw`f(z)=\tfrac12z^TQz+q^Tz,\quad\nabla f(z)=Qz+q,\qquad R(z)=\|z-P_\mathcal Z(z-\nabla f(z))\|`, 'Per il QP del laboratorio f=½(z−a)ᵀdiag(1,Q₂₂)(z−a). R=0 equivale alla stazionarietà vincolata; con questo costo convesso equivale al minimo globale.'),
    ],
    assumptions:['Z è non vuoto, chiuso e convesso. L’inizializzazione viene proiettata se il punto inserito è esterno, e la correzione è dichiarata.', 'Per f con gradiente L-Lipschitz, il gradiente proiettato ha diminuzione per 0<γ<2/L, salvo punti fissi. Per il metodo delle direzioni ammissibili si deve scegliere anche un passo che dia discesa.', 'La combinazione ammissibile rifiuta γ>1: extrapolare oltre il segmento non conserva in generale i vincoli.'],
    example:'Con un obiettivo a esterno al quadrato, l’ottimo è sul bordo. Il gradiente libero continua a puntare fuori, ma la proiezione lo annulla nella direzione bloccata. Il residuo R tende a zero mentre ‖∇f‖ può restare positivo.',
    observe:['Avanza di un passo: il tratto tratteggiato mostra il punto libero e la sua proiezione; gli iterati rimangono dentro il bordo.', 'Confronta i due metodi con gli stessi dati e osserva la differenza tra γ fuori e dentro la proiezione.', 'Il preset di passo grande conserva l’ammissibilità ma può mostrare oscillazioni del costo. Verifica il residuo vincolato, non soltanto il gradiente libero.'],
    demoIds:['projected-gradient'],sources:S(50,52),
  },
  {
    id:'o2-galleria',conceptIds:['esempi-costo'],title:'19. Quattro costi, quattro geometrie da riconoscere',
    intuition:'Prima di scegliere un algoritmo conviene guardare che tipo di funzione deve affrontare. Una parabola ha curvatura costante; una quartica può avere più valli; una somma di esponenziali è convessa con curvatura variabile; un QP traduce la curvatura in una matrice.',
    formulas:[
      F(String.raw`f_1(z)=z^2,\qquad f_2(z)=z^4+2z^3-12z^2-2z+6`, 'I primi due esempi delle slide sono scalari. f₁ ha minimo unico in 0; f₂ è coerciva ma non convessa, perché f₂″(0)=−24.'),
      F(String.raw`f_3(x,y)=e^{x+3y-0.1}+e^{x-3y-0.1}+e^{-x-0.1}`, 'Ogni esponenziale di una funzione affine è convessa. La somma ha Hessiana positiva definita in ogni punto; il minimo soddisfa y*=0 e x*=−(log 2)/2.'),
      F(String.raw`f_4(z)=\tfrac12z^TQz+r^Tz,\quad Q=Q^T\succeq0`, 'La galleria usa r=0 e Q positiva definita con spettro {1,κ}. Il laboratorio O1 permette anche termini lineari, singolarità e curvatura negativa.'),
    ],
    assumptions:['Il fattore modificabile moltiplica tutto il costo ed è positivo: conserva gli argmin e la convessità. Una finestra limitata non rappresenta tutto il dominio.', 'Per i costi scalari la vista 3D mostra la stessa curva nel piano ausiliario y=0; non si aggiunge una seconda variabile al problema. Le superfici sono usate per gli esempi realmente bivariati.'],
    example:'Nel costo esponenziale, la simmetria in y rende naturale y*=0. La derivata in x diventa 2eˣ−e⁻ˣ=0, quindi x*=−log(2)/2. Non serve dedurre il minimo dal solo campionamento del grafico.',
    observe:['Cambia funzione e dominio: la quartica mostra le valli e la curvatura negativa fra esse.', 'Ruota la superficie esponenziale e confrontala con i livelli; il minimo analitico consente di controllare i calcoli.', 'Aumentare κ nel QP allunga i livelli e peggiora il condizionamento senza perdere convessità.'],
    demoIds:['function-gallery'],sources:S(53),
  },
  {
    id:'o2-barriere',conceptIds:['barriere'],title:'20. La barriera tiene il metodo nell’interno',
    intuition:'Invece di proiettare un punto esterno, una barriera rende proibitivo avvicinarsi al bordo dall’interno. Per ogni ε>0 si risolve un problema diverso, con un minimo interno. Riducendo ε dopo aver risolto lo stadio corrente, il minimo della barriera si avvicina al problema vincolato.',
    formulas:[
      F(String.raw`\min_z f(z)\quad\text{soggetto a }g_j(z)\le0\quad\leadsto\quad\min_{g_j(z)<0}\Phi_\varepsilon(z)=f(z)-\varepsilon\sum_j\log(-g_j(z))`, 'Il dominio è strettamente ammissibile. La funzione estesa vale +∞ fuori da quel dominio: non si calcola il logaritmo di un numero non positivo.'),
      F(String.raw`-\varepsilon\log(s)\to+\infty\quad(s\downarrow0),\qquad\varepsilon_{m+1}=\rho\varepsilon_m,\quad0<\rho<1`, 's=−g è lo slack. A ε fissato la barriera diverge al bordo; a slack fissato il suo contributo tende a zero con ε. I due limiti non vanno confusi.'),
      F(String.raw`\Phi_\varepsilon(x,y)=\tfrac12\|(x,y)-a\|^2-\varepsilon[\log(b-x)+\log(b+x)+\log(b-y)+\log(b+y)]`, 'Il laboratorio usa quattro vincoli affini per il quadrato. Si applica Newton smorzato con Armijo, rifiutando i tentativi esterni. La partenza deve soddisfare |x|,|y|<b.'),
      F(String.raw`z_\varepsilon\in\arg\min\Phi_\varepsilon\quad\Longrightarrow\quad0\le f(z_\varepsilon)-f^*\le4\varepsilon`, 'Nel problema convesso del laboratorio, al minimo esatto della barriera i moltiplicatori μⱼ=ε/(−gⱼ) danno gap duale 4ε. Il limite non certifica automaticamente un iterato intermedio che non ha ancora risolto lo stadio.'),
    ],
    assumptions:['Serve un punto strettamente ammissibile e un dominio interno non vuoto. La sola formulazione g≤0 non assicura che una barriera sia applicabile.', 'Per collegare il cammino al minimo globale si usano convessità, esistenza e regolarità appropriate. Qui costo strettamente convesso e vincoli affini rendono il minimo di ogni stadio unico.', 'ε viene ridotta solo dopo una tolleranza sul gradiente di barriera; se Newton raggiunge il budget o fallisce, il laboratorio si ferma e lo dichiara.'],
    example:'Con a=(3;0,5) e b=1,5 il minimo vincolato ha x=1,5. Ogni minimo di barriera resta con x<1,5; diminuendo ε si riduce lo slack sulla faccia attiva. Il minimo di riferimento di ogni stadio è calcolato separatamente con bisezione delle due equazioni scalari.',
    observe:['Avanza fra le iterazioni e gli stadi: la superficie cambia quando cambia ε, mentre tutti i punti calcolati restano interni.', 'Confronta iterati arancioni e minimi di riferimento blu. Il grafico inferiore mostra il costo originale e il residuo della barriera, che può saltare quando ε cambia.', 'Prova una partenza sul bordo o esterna: l’esperimento la rifiuta esplicitamente. Con ε piccolo il minimo si avvicina al bordo e la curvatura può aumentare molto.'],
    demoIds:['barrier'],sources:S(54),
  },
];
