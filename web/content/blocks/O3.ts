import type { LessonSection } from '../schema';
import '../../demos/O3/styles.css';
const F=(latex:string,explanation:string)=>({latex,explanation});
const S=(a:number,b=a)=>[{sourceId:'ottimizzazione' as const,pages:Array.from({length:b-a+1},(_,i)=>a+i)}];

export const O3Lessons:LessonSection[]=[
  {
    id:'o3-regolarita',conceptIds:['vincoli-regolarita'],title:'21. Vincoli attivi e regolarità',
    intuition:'Una disuguaglianza può limitare il movimento solo quando il punto è sul suo bordo. Un’uguaglianza, invece, deve essere rispettata sempre. La regolarità usata nelle slide richiede che le normali delle uguaglianze e delle disuguaglianze attive siano indipendenti: nessuna deve ripetere un’informazione già contenuta nelle altre.',
    formulas:[
      F(String.raw`\min_z f(z)\quad\text{s.t.}\quad g_j(z)\le0,\ j=1,\ldots,r;\quad h_i(z)=0,\ i=1,\ldots,m`, 'L’insieme ammissibile contiene i punti che soddisfano simultaneamente tutti i vincoli. Cambiare il segno convenzionale di una disuguaglianza richiede cambiare anche la convenzione dei moltiplicatori.'),
      F(String.raw`\mathcal A(z)=\{j:g_j(z)=0\}`, 'Un vincolo con g<0 è inattivo; con g=0 è attivo; con g>0 è violato. “Attivo” non significa automaticamente “con moltiplicatore positivo”.'),
      F(String.raw`\{\nabla h_i(z)\}_{i=1}^m\cup\{\nabla g_j(z)\}_{j\in\mathcal A(z)}\text{ linearmente indipendenti}\quad(\mathrm{LICQ})`, 'Questa è la condizione di regolarità delle slide. In ℝᵈ non possono essere indipendenti più di d gradienti. I vincoli inattivi non entrano nel test.'),
    ],
    assumptions:['Si valuta la regolarità in un punto ammissibile e si assumono vincoli differenziabili. LICQ è una condizione sufficiente per il teorema KKT presentato, non l’unica qualificazione possibile.', 'Un vincolo ridondante o un gradiente nullo può far fallire LICQ senza cambiare l’insieme ammissibile. Questo non dimostra che il punto non sia ottimo.'],
    example:'Minimizzare f(x,y)=x soggetto a x²=0 dà valore 0 su tutta la retta x=0. Ogni punto ammissibile è minimo, ma ∇h=(0,0) e nessun λ può annullare ∇f=(1,0). La qualificazione mancante spiega perché KKT non sia necessaria in questo esempio.',
    observe:['Ruota la seconda normale: quando i due vincoli attivi diventano paralleli il rango scende.', 'Sposta la soglia del secondo vincolo: se diventa inattivo, il suo gradiente esce dal test.', 'Aggiungi y=0 nel punto con due vincoli attivi: tre gradienti in ℝ² non possono essere indipendenti.', 'Il verde rappresenta le disuguaglianze ammissibili; l’uguaglianza opzionale restringe ulteriormente alla linea blu.'],
    demoIds:['active-constraints'],sources:S(55,57),
  },
  {
    id:'o3-lagrangiana',conceptIds:['lagrangiana'],title:'22. La Lagrangiana combina costo e vincoli',
    intuition:'I moltiplicatori pesano le normali dei vincoli per bilanciare il gradiente del costo. Per una disuguaglianza g≤0 il peso KKT è non negativo; per un’uguaglianza il segno è libero. A moltiplicatori fissati, L è una nuova funzione di z; non equivale in generale al problema vincolato originale.',
    formulas:[
      F(String.raw`L(z,\mu,\lambda)=f(z)+\sum_{j=1}^r\mu_jg_j(z)+\sum_{i=1}^m\lambda_ih_i(z)`, 'z è la decisione, μ i moltiplicatori delle disuguaglianze, λ quelli delle uguaglianze. Sul dominio ammissibile h=0, ma i suoi gradienti restano rilevanti.'),
      F(String.raw`\nabla_z L=\nabla f+\sum_j\mu_j\nabla g_j+\sum_i\lambda_i\nabla h_i`, 'La stazionarietà è rispetto alle decisioni z. Non si impone ∂L/∂μ=0 per tutte le disuguaglianze: imporrebbe erroneamente che ogni vincolo fosse attivo.'),
      F(String.raw`\frac{\partial f^*}{\partial b}=-\mu^*,\quad\frac{\partial f^*}{\partial c}=-\lambda^*\qquad[g=x-b,\ h=y-c]`, 'Questa interpretazione di sensibilità vale quando il valore ottimo è differenziabile e valgono le appropriate condizioni di regolarità. I segni dipendono da come il termine noto entra nel vincolo.'),
    ],
    assumptions:['La lettura dei moltiplicatori come prezzi è locale e dipende dalla convenzione. Non ogni moltiplicatore arbitrario ha questa interpretazione.', 'La frase delle slide “non possiamo minimizzare la Lagrangiana” va precisata: l’infimo rispetto a z a moltiplicatori fissati definisce la funzione duale; non risolve automaticamente il problema primale e può essere −∞.'],
    example:'Il laboratorio usa f=½[(x−a₁)²+2(y−a₂)²], x≤b e y=c. L’ottimo esatto è (min(a₁,b),c), con μ*=max(0,a₁−b) e λ*=−2(c−a₂). La somma dei tre gradienti si annulla quando decisione e moltiplicatori sono coerenti.',
    observe:['Varia λ e μ: cambiano inclinazione di L e bilanciamento dei gradienti, mentre il costo f rimane lo stesso.', 'Cambia il bordo b e confronta l’ottimo esatto e il valore di μ*: un bordo non limitante ha prezzo zero.', 'La vista 3D mostra L; le frecce 2D conservano un fattore di scala comune per rendere verificabile la somma.'],
    demoIds:['lagrangian'],sources:S(58),
  },
  {
    id:'o3-kkt',conceptIds:['kkt-primo-ordine'],title:'23. KKT: quattro condizioni da verificare insieme',
    intuition:'L’equilibrio dei gradienti è solo una parte dell’ottimalità vincolata. Un candidato deve anche rispettare i vincoli, avere moltiplicatori delle disuguaglianze non negativi e attribuire prezzo zero ai vincoli inattivi. Guardare un solo residuo può nascondere un errore evidente negli altri.',
    formulas:[
      F(String.raw`\nabla_zL(z^*,\mu^*,\lambda^*)=0`, 'Stazionarietà: il gradiente del costo si bilancia con le normali pesate dei vincoli.'),
      F(String.raw`g(z^*)\le0,\quad h(z^*)=0\qquad\text{(ammissibilità primale)}`, 'Il punto deve appartenere all’insieme ammissibile. Queste condizioni sono implicite nell’ipotesi di minimo delle slide, ma vanno incluse nella lista operativa KKT.'),
      F(String.raw`\mu^*\ge0,\qquad\mu_j^*g_j(z^*)=0\quad\forall j`, 'Ammissibilità duale e complementarità. Se gⱼ<0, μⱼ deve essere zero; se gⱼ=0, μⱼ può essere positivo o nullo. λ non ha una restrizione di segno.'),
    ],
    assumptions:['Con f,g,h di classe C¹ e LICQ, un minimo locale ammette moltiplicatori KKT unici. L’unicità riguarda i moltiplicatori associati a quel punto, non il minimo del problema.', 'KKT è in generale necessaria sotto qualificazione, non sufficiente. Nel caso convesso, con f e g convesse e h affine, un punto KKT è un minimo globale. La stretta convessità di f rende unica la decisione minima.'],
    example:'Al bordo del laboratorio con a₁=2, b=1, a₂=1, c=0, il punto (1,0) ha μ=1 e λ=2. Tutti i residui sono zero. Un punto con x=0 e μ=1 può invece violare complementarità, anche se μ è positivo e l’uguaglianza è rispettata.',
    observe:['Confronta i preset che violano uguaglianza, dualità o complementarità: i quattro residui isolano problemi diversi.', 'Nel preset interno μ=0, mentre λ può restare non nullo.', 'I valori vicini a zero sono approssimazioni numeriche; qui la soluzione analitica offre un confronto indipendente.'],
    demoIds:['kkt-geometry'],sources:S(59,63),
  },
  {
    id:'o3-curvatura',conceptIds:['kkt-secondo-ordine'],title:'24. La curvatura si misura sulla geometria dei vincoli',
    intuition:'La Hessiana del solo costo non basta quando il vincolo è curvo. La Hessiana della Lagrangiana include la curvatura dei vincoli pesata dai moltiplicatori. Il controllo va fatto nelle direzioni che possono essere seguite senza migliorare già al primo ordine: il cono critico.',
    formulas:[
      F(String.raw`H_L=\nabla^2f+\sum_j\mu_j^*\nabla^2g_j+\sum_i\lambda_i^*\nabla^2h_i`, 'È la Hessiana rispetto a z, valutata nel punto KKT e nei suoi moltiplicatori. La matrice completa del sistema primal-dual è un oggetto diverso.'),
      F(String.raw`\mathcal C=\{d:J_hd=0,\ \nabla g_j^Td\le0\ (j\in\mathcal A),\ \nabla f^Td=0\}`, 'Al punto KKT, i vincoli attivi con μⱼ>0 impongono ∇gⱼᵀd=0 sul cono critico; quelli con μⱼ=0 possono consentire direzioni verso l’interno.'),
      F(String.raw`d^TH_Ld\ge0\quad\forall d\in\mathcal C\quad\text{(necessaria)};\qquad d^TH_Ld>0\quad\forall d\in\mathcal C\setminus\{0\}\quad\text{(sufficiente)}`, 'Sotto le usuali ipotesi C² e qualificazione, il primo test è necessario; KKT e positività stretta sul cono critico danno un minimo locale stretto. Le slide testano il sottospazio che annulla tutte le normali attive: è un test necessario più ristretto, non un criterio sufficiente generale.'),
    ],
    assumptions:['Per sole uguaglianze regolari il cono critico al punto stazionario coincide con ker Jh. Con disuguaglianze debolmente attive non va sostituito automaticamente con un sottospazio.', 'Una curvatura nulla è inconcludente: possono essere necessari termini di ordine superiore. La classificazione del laboratorio sul cerchio richiede anche la stazionarietà.'],
    example:'Minimizzare y sul cerchio unitario: nel punto inferiore λ=½ e HL=I, nel superiore λ=−½ e HL=−I. Il costo lineare ha Hessiana nulla, ma il vincolo rende distinguibili minimo e massimo. Per f=−x²+y², x≥0, il punto (0,0), μ=0 passa il test ristretto sull’asse y ma fallisce su d=(1,0), che appartiene al cono critico.',
    observe:['Cambia punto e λ sul cerchio; il residuo dice quando il test di curvatura può essere interpretato come test KKT.', 'Aggiungi una componente normale a d: la direzione non è più tangente e non deve essere usata per classificare il minimo vincolato.', 'Confronta retta tangente e arco ammissibile; la retta non conserva esattamente un vincolo curvo.', 'Il caso di attività debole mostra perché servono direzioni verso l’interno.'],
    demoIds:['constrained-curvature'],sources:S(64,65),
  },
  {
    id:'o3-qp',conceptIds:['qp-vincolati'],title:'25. Il QP si riduce allo spazio nullo di A',
    intuition:'Un vincolo affine elimina alcune direzioni. Una curvatura negativa lungo una direzione vietata può essere irrilevante: conta la curvatura delle variazioni che conservano Az=b. Il sistema KKT combina la posizione ammissibile con il bilanciamento dei gradienti.',
    formulas:[
      F(String.raw`\min_z\tfrac12z^TQz+q^Tz\quad\text{s.t. }Az=b,\qquad Q=Q^T`, 'Q non è necessariamente positiva definita sull’intero spazio. Il problema ridotto sui vincoli decide se esiste un minimo.'),
      F(String.raw`\begin{bmatrix}Q&A^T\\A&0\end{bmatrix}\begin{bmatrix}z^*\\\lambda^*\end{bmatrix}=\begin{bmatrix}-q\\b\end{bmatrix}`, 'La prima riga è Qz+q+Aᵀλ=0; la seconda è Az=b. Si risolve un sistema lineare, senza formare inverse.'),
      F(String.raw`z=z_0+Ns,\quad Az_0=b,\quad AN=0,\qquad Q_{\mathrm{rid}}=N^TQN`, 'Le colonne di N sono una base di ker A. Positività definita di Qrid e rango pieno di A danno minimo unico e sistema KKT non singolare. P. 68 corretta: la tangente soddisfa Ad=0, non Aᵀd=0.'),
    ],
    assumptions:['I vincoli devono essere compatibili. Per unicità dei moltiplicatori si richiede rango pieno delle righe di A; vincoli ridondanti possono lasciare unica la decisione e rendere non unici i moltiplicatori.', 'Se Qrid è semidefinita, occorre anche compatibilità del termine lineare ridotto. Curvatura ridotta negativa o una pendenza non nulla su una direzione piatta rendono il QP illimitato inferiormente.'],
    example:'Q=diag(−1,2) è indefinita, ma imponendo x=1 resta solo la direzione y, con curvatura 2: il minimo vincolato è unico. Ruotando il vincolo a y=1 si libera la direzione x con curvatura −1 e il costo diventa illimitato inferiormente.',
    observe:['Confronta la superficie globale con la curva del costo ridotto: è quest’ultima a decidere il minimo vincolato.', 'Prova i casi piatto compatibile e piatto con pendenza: Q semidefinita sul tangente non basta da sola.', 'Il residuo KKT è riportato solo per i punti classificati come minimi; un sistema risolvibile può comunque descrivere un massimo del problema ridotto.'],
    demoIds:['constrained-qp'],sources:S(66,68),
  },
  {
    id:'o3-newton',conceptIds:['newton-vincolato'],title:'26. Newton sul sistema congiunto di decisioni e moltiplicatori',
    intuition:'Con sole uguaglianze, un punto KKT annulla sia il gradiente della Lagrangiana rispetto a z sia il vincolo h. Newton linearizza insieme queste due equazioni: aggiornare soltanto la decisione o confondere il nuovo moltiplicatore con il suo incremento altera il metodo.',
    formulas:[
      F(String.raw`R(z,\lambda)=\begin{bmatrix}\nabla f(z)+J_h(z)^T\lambda\\h(z)\end{bmatrix}=0`, 'Si usa il Jacobiano Jh con una riga per vincolo. Nelle slide ∇h è il suo trasposto; entrambe le convenzioni sono corrette se coerenti.'),
      F(String.raw`\begin{bmatrix}H_L&J_h^T\\J_h&0\end{bmatrix}\begin{bmatrix}\Delta z\\\Delta\lambda\end{bmatrix}=-R(z,\lambda)`, 'HL è la Hessiana rispetto a z della Lagrangiana. La matrice a blocchi è il Jacobiano del residuo KKT; può essere indefinita anche quando il problema ha un minimo.'),
      F(String.raw`z^+=z+\gamma\Delta z,\qquad\lambda^+=\lambda+\gamma\Delta\lambda`, 'Newton puro usa γ=1. Un backtracking sul residuo KKT può smorzare il passo: la diminuzione del residuo non impone la diminuzione del costo.'),
    ],
    assumptions:['Serve un sistema KKT non singolare; LICQ da sola non lo garantisce. La positività della Hessiana ridotta è una condizione utile presso un minimo regolare.', 'Newton cerca radici e può trovare anche massimi o selle. Il laboratorio controlla separatamente ammissibilità, stazionarietà e curvatura tangente.', 'Con modello approssimato o regolarizzazione il passo è modificato rispetto a Newton esatto; queste scelte sono dichiarate nei controlli.'],
    example:'Su costo quadratico e uguaglianza affine il residuo è affine: Newton puro risolve il sistema KKT in un aggiornamento, anche da una partenza non ammissibile. Sul cerchio, il punto opposto al target può invece essere un massimo vincolato con residuo KKT nullo.',
    observe:['Nel preset della retta, confronta λQP e Δλ: il primo è il nuovo moltiplicatore proposto, il secondo la differenza rispetto a λ corrente.', 'Confronta passo fissato e backtracking sul residuo; un costo inizialmente più basso può corrispondere a un punto non ammissibile.', 'Il preset “KKT massimo sul cerchio” rende visibile il limite di un arresto basato soltanto su R=0.', 'Il vincolo degenere x²=0 al punto x=0 produce un Jacobiano senza rango pieno e un arresto esplicito.'],
    demoIds:['constrained-newton'],sources:S(69,73),
  },
  {
    id:'o3-sqp',conceptIds:['sqp'],title:'27. SQP risolve un modello con vincoli linearizzati',
    intuition:'A ogni iterazione SQP sostituisce il costo con un modello quadratico e le uguaglianze con la loro linearizzazione. Il nuovo punto può uscire dalla varietà originale, perché la linearizzazione è solo locale. Le iterazioni successive correggono insieme costo e ammissibilità.',
    formulas:[
      F(String.raw`d_k\in\arg\min_d\;\nabla f(z_k)^Td+\tfrac12d^TB_kd\quad\text{s.t.}\quad h(z_k)+J_h(z_k)d=0`, 'Bk approssima la Hessiana della Lagrangiana, non necessariamente quella del solo costo. Per interpretare la soluzione come minimo unico occorre curvatura positiva sullo spazio nullo di Jh.'),
      F(String.raw`B_kd_k+J_h^T\lambda_k^{QP}=-\nabla f(z_k),\qquad J_hd_k=-h(z_k)`, 'Le equazioni sono KKT del sottoproblema. La p. 73 le chiama necessarie e sufficienti senza esplicitare la curvatura: quella condizione va aggiunta.'),
      F(String.raw`\Delta\lambda_k=\lambda_k^{QP}-\lambda_k,\qquad z_{k+1}=z_k+\gamma_kd_k,\quad\lambda_{k+1}=(1-\gamma_k)\lambda_k+\gamma_k\lambda_k^{QP}`, 'Il simbolo ΔλQP delle slide indica il moltiplicatore del QP, non un incremento da sommare direttamente. Con γ=1 si sostituisce λ con λQP; con smorzamento si interpola.'),
    ],
    assumptions:['Il sottoproblema deve essere compatibile e il Jacobiano avere il rango richiesto. La positività ridotta garantisce il minimo unico del QP, non l’ottimalità globale del problema nonlineare.', 'Il laboratorio può usare Hessiana esatta, Hessiana del costo o identità. Una salvaguardia opzionale aggiunge uno shift conservativo per rendere B positiva; senza salvaguardia si segnala la curvatura ridotta non positiva.', 'La convergenza locale rapida richiede ipotesi ulteriori, tra cui regolarità, condizioni del secondo ordine e qualità del modello. Il budget finito non prova queste proprietà.'],
    example:'Per y=x², il sottoproblema usa yₖ−xₖ²−2xₖdx+dy=0. Un passo che soddisfa questa retta non soddisfa in generale la parabola: la differenza è di ordine dx². L’esperimento mostra la retta tratteggiata e il vincolo curvo originale.',
    observe:['Avanza di un passo e confronta modello lineare del vincolo e punto effettivo sulla superficie.', 'Disattiva la salvaguardia con un moltiplicatore che renda negativa la curvatura tangente: il metodo rifiuta di chiamare minimo la soluzione del sistema.', 'Confronta costo, ‖h‖ e ‖∇zL‖. Un miglioramento del solo costo può allontanare dall’insieme ammissibile.'],
    demoIds:['sqp'],sources:S(74),
  },
  {
    id:'o3-merito',conceptIds:['merito'],title:'28. Il merito misura un compromesso verificabile',
    intuition:'Ripristinare un vincolo può richiedere un aumento del costo. La funzione di merito valuta il progresso combinando costo e violazione, senza pretendere che diminuiscano entrambi separatamente. La penalità deve dare abbastanza peso all’ammissibilità.',
    formulas:[
      F(String.raw`M_1(z;s)=f(z)+s\|h(z)\|_1,\qquad s\ge0`, 'Correzione p. 75: per i vincoli h=0 si penalizza h, non g. La norma L1 somma i valori assoluti dei residui delle uguaglianze.'),
      F(String.raw`J_hd=-h\quad\Longrightarrow\quad M'_1(z;d)=\nabla f(z)^Td-s\|h(z)\|_1`, 'È una derivata direzionale, perché il valore assoluto non è differenziabile in zero. La formula usa esplicitamente la relazione del sottoproblema linearizzato; non vale per una direzione arbitraria.'),
      F(String.raw`M_1(z+\gamma d;s)\le M_1(z;s)+c\gamma M'_1(z;d),\qquad\gamma_i=\beta^i\gamma_0`, 'Armijo si applica al merito con s fissato durante il backtracking. Se la pendenza non è negativa, accorciare il passo non è la soluzione: occorre rivedere direzione o penalità.'),
      F(String.raw`s>\|\lambda^*\|_\infty`, 'Sotto regolarità e condizioni sufficienti del secondo ordine, una penalità sopra questa soglia dà esattezza locale: il minimo vincolato è anche un minimo locale del merito. Il solo fatto di essere un punto KKT non basta. L’adattamento s>‖λQP‖∞ è una strategia operativa, non una prova di ottimo globale.'),
    ],
    assumptions:['La penalità è non negativa. Nell’algoritmo può crescere tra iterazioni, ma resta fissata mentre si confrontano i tentativi di una stessa ricerca del passo.', 'La L1 è esatta localmente sotto opportune ipotesi; una penalità enorme può peggiorare il comportamento numerico. La teoria non giustifica aumenti arbitrari senza controllo.', 'Il laboratorio distingue il problema parabolico usato per Armijo dall’esempio scalare usato per illustrare esattezza e soglia.'],
    example:'Da (1,0), minimizzare ½‖z−(1,0)‖² soggetto a y=x² richiede lasciare il minimo libero per ridurre la violazione. Con s=0 il merito non riconosce questo progresso. Nell’esempio separato min x soggetto a x=0, λ*=−1 e M=x+s|x|: per s>1 il minimo è unico in zero.',
    observe:['Con s=0 il metodo segnala assenza di discesa; con s adeguato può accettare un passo con costo maggiore e violazione minore.', 'Segui i tentativi nella tabella: la quantità confrontata è il merito, non il costo da solo.', 'Nel grafico scalare prova s<1, s=1 e s>1; la soglia stretta evita il tratto piatto.'],
    demoIds:['merit-line-search'],sources:S(75,77),
  },
  {
    id:'o3-barriere',conceptIds:['barriere-uguaglianze'],title:'29. Con la barriera le uguaglianze restano vincoli',
    intuition:'La barriera incorpora le disuguaglianze nel costo, ma non elimina le uguaglianze. Ogni stadio risolve quindi un problema ancora vincolato, sul dominio strettamente interno. Il suo sistema KKT contiene il moltiplicatore dell’uguaglianza e il gradiente del costo modificato.',
    formulas:[
      F(String.raw`\min_{g(z)<0}\Phi_\varepsilon(z)=f(z)-\varepsilon\sum_j\log(-g_j(z))\quad\text{s.t. }h(z)=0`, 'P. 78: l’espressione “problema non vincolato” è impropria quando rimane h=0. Si tratta di un problema con uguaglianze e dominio interno.'),
      F(String.raw`\nabla\Phi_\varepsilon(z)+J_h(z)^T\lambda=0,\qquad h(z)=0`, 'Ogni stadio ha il proprio residuo KKT. Si riduce ε solo dopo aver risolto lo stadio corrente alla tolleranza dichiarata.'),
      F(String.raw`\mu_j=\frac{\varepsilon}{-g_j(z)}>0,\qquad\mu_jg_j(z)=-\varepsilon`, 'La complementarità è perturbata: diventa esatta solo nel limite ε→0. Si conserva l’ammissibilità stretta delle disuguaglianze durante la ricerca del passo.'),
    ],
    assumptions:['Deve esistere un punto con g<0 compatibile con h=0. Un problema ammissibile soltanto sul bordo può non consentire questa formulazione interna.', 'Il laboratorio usa costo quadratico strettamente convesso, quadrato |x|,|y|<b e uguaglianza affine x+y=c. Serve |c|<2b per avere un interno compatibile.', 'La partenza deve essere interna alle disuguaglianze; può inizialmente violare l’uguaglianza. Il solutore conserva il dominio e misura il ripristino di h.'],
    example:'Con x+y=0 e target (3,0), il minimo vincolato al quadrato è sul bordo. I minimi di barriera restano interni e si avvicinano al bordo riducendo ε. I centri di riferimento vengono ottenuti indipendentemente sostituendo y=c−x e risolvendo un’equazione scalare per bisezione.',
    observe:['La superficie cambia con ε, mentre la linea blu dell’uguaglianza resta la stessa.', 'Segui i residui primale e duale dello stadio. Al cambio di ε il residuo duale può aumentare anche senza cambiare la decisione.', 'Prova c=2b: l’uguaglianza incontra il quadrato chiuso sul bordo, ma nessun punto è strettamente interno; l’esperimento lo dichiara.'],
    demoIds:['barrier-equalities'],sources:S(78),
  },
  {
    id:'o3-tempo-iterazione',conceptIds:['tempo-iterazione'],title:'30. Il tempo t non è l’iterazione k',
    intuition:'Nel controllo ottimo una decisione contiene un’intera sequenza di stati e ingressi. t seleziona una componente lungo la dinamica; k seleziona quale stima di tutta la sequenza stiamo osservando. Un’iterazione dell’ottimizzatore aggiorna insieme molti istanti del sistema.',
    formulas:[
      F(String.raw`x_{t+1}=f_t(x_t,u_t),\quad t=0,\ldots,N-1`, 'Il pedice t è il tempo discreto del sistema. xₜ e uₜ appartengono a una singola traiettoria.'),
      F(String.raw`z^k=(x_0^k,\ldots,x_N^k,u_0^k,\ldots,u_{N-1}^k)`, 'Il sovrascritto k indica la stima all’iterazione k dell’algoritmo, non una potenza. (xₜᵏ,uₜᵏ) è il valore al tempo t nella traiettoria stimata k.'),
      F(String.raw`\min\;\tfrac12\sum_{t=0}^{N-1}(q x_t^2+r u_t^2)+\tfrac12q_T(x_N-x_{\rm ref})^2\quad\text{s.t. }x_{t+1}=a x_t+b u_t,\ x_0=\bar x_0`, 'L’esempio scalare del laboratorio rende la distinzione osservabile. Il riferimento terminale è un costo morbido; non viene imposto xN=xref come vincolo.'),
    ],
    assumptions:['Esempio didattico scalare, discreto e adimensionale. I pesi sono positivi: il QP ha una decisione minima unica e viene risolto dal nucleo generale O3.', 'Le uguaglianze dinamiche sono affini. Interpolare due traiettorie ammissibili le conserva; questa proprietà non si trasferisce automaticamente a sistemi nonlineari.', 'Gli ingressi esistono fino a N−1, gli stati fino a N. Se t supera l’orizzonte selezionato viene limitato a N, e il valore usato viene mostrato.'],
    example:'Nella mappa, ciascuna riga è un’intera traiettoria zᵏ e ogni colonna è un tempo t. Con passo intero il QP è risolto in un aggiornamento; con passo frazionario si vedono più stime che si avvicinano allo stesso risultato. Con b=0 l’ingresso non modifica la dinamica, ma il problema con costo terminale morbido resta ammissibile.',
    observe:['Varia t: si sposta la componente osservata nella traiettoria corrente, conservando l’iterazione k.', 'Avanza k: cambiano simultaneamente stati e ingressi lungo tutto l’orizzonte.', 'Cambia N o i pesi e osserva come cambia l’intera soluzione, controllando sempre il residuo della dinamica.'],
    demoIds:['time-iteration'],sources:S(79,81),
  },
];
