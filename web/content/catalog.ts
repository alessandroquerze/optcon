import inventoryData from '../../sources/inventory.json';
import type { CourseId, CourseSource, LessonSection } from './schema';
import { O1Lessons } from './blocks/O1';

export const sources = inventoryData.sources as CourseSource[];
export const getSource = (id: CourseId): CourseSource => {
  const source = sources.find((item) => item.id === id);
  if (!source) throw new Error(`Fonte sconosciuta: ${id}`);
  return source;
};

// Future sessions add complete LessonSection arrays in content/blocks/<ID>.ts
// and register them here; the renderer and existing modules remain reusable.
export const lessons: Partial<Record<CourseId, LessonSection[]>> = { ottimizzazione: O1Lessons };

export const courseCopy: Record<CourseId, {
  number: string; title: string; lead: string; eyebrow: string; idea: string;
  formula: string; formulaCaption: string; outcomes: string[];
}> = {
  introduzione: {
    number: '01', title: 'Introduzione al\ncontrollo ottimo',
    lead: 'Dare una direzione a un sistema significa scegliere come farlo evolvere. Il controllo ottimo aggiunge una domanda: a quale costo?',
    eyebrow: 'MODELLI, OBIETTIVI, TRAIETTORIE',
    idea: 'Un riferimento descrive dove vorremmo andare. Una traiettoria descrive dove la dinamica ci permette di andare.',
    formula: String.raw`x_{t+1}=f_t(x_t,u_t)`,
    formulaCaption: 'Lo stato di domani dipende dallo stato e dall’ingresso di oggi.',
    outcomes: ['Distinguere stato, ingresso e uscita', 'Leggere costi e vincoli di una traiettoria', 'Esplorare drone e pendolo'],
  },
  ottimizzazione: {
    number: '02', title: 'Geometria\ndell’ottimizzazione',
    lead: 'Funzioni di costo, direzioni di discesa e vincoli: gli strumenti per trasformare “meglio” in una scelta che possiamo calcolare.',
    eyebrow: 'COSTI, CONVESSITÀ, ALGORITMI',
    idea: 'La forma del costo conta: cambiare i pesi cambia la geometria del problema e il comportamento degli algoritmi.',
    formula: String.raw`\min_{z\in\mathcal Z}\;\ell(z)`,
    formulaCaption: 'Scegliere il costo più piccolo tra le decisioni ammissibili.',
    outcomes: ['Interpretare gradiente e curvatura', 'Confrontare algoritmi di discesa', 'Comprendere vincoli, KKT e SQP'],
  },
  kkt: {
    number: '03', title: 'Condizioni\ndi ottimalità',
    lead: 'Dalla geometria delle traiettorie alle equazioni che caratterizzano un candidato ottimo: stati, ingressi e moltiplicatori letti insieme.',
    eyebrow: 'VARIETÀ, COSTATI, VINCOLI',
    idea: 'In un ottimo vincolato, il costo non può diminuire lungo una direzione ammissibile. I moltiplicatori rendono esplicito questo equilibrio.',
    formula: String.raw`\nabla\ell(z^*)+\nabla h(z^*)\lambda^*=0`,
    formulaCaption: 'Stazionarietà per vincoli di uguaglianza, sotto opportune ipotesi di regolarità.',
    outcomes: ['Visualizzare varietà e spazio tangente', 'Collegare KKT e dinamica del sistema', 'Leggere costati e complementarità'],
  },
};
