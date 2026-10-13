/** Stable Base contract. Add fields compatibly; do not rename existing exports. */
export type CourseId = 'introduzione' | 'ottimizzazione' | 'kkt';
export type SessionId = 'BASE' | 'O1' | 'O2' | 'O3' | 'I1' | 'I2' | 'I3' | 'K1' | 'K2' | 'VERIFICA';
export interface SourceRef {
  sourceId: CourseId;
  pages: number[]; // Physical PDF page numbers, 1-based and including the cover.
}
export interface VisualizationPlan {
  id: string;
  label: string;
  dimensions: ('2d' | '3d')[];
  parameters: string[];
  status: 'planned' | 'ready';
}
export interface Concept {
  id: string;
  title: string;
  pages: number[];
  block: SessionId;
  summary: string;
  kind: 'theory' | 'metadata';
  visualizations: VisualizationPlan[];
  noVisualizationReason?: string;
}
export interface CourseSource {
  id: CourseId;
  filename: string;
  pageCount: number;
  title: string;
  shortTitle: string;
  concepts: Concept[];
}
/** Complete learning section to be added by future sessions. */
export interface LessonSection {
  id: string;
  conceptIds: string[];
  title: string;
  intuition: string;
  formulas: { latex: string; explanation: string }[];
  assumptions: string[];
  example: string;
  observe: string[];
  demoIds: string[];
  sources: SourceRef[];
}
export interface DemoHandle {
  destroy(): void;
}
export interface DemoDefinition<P, D> {
  id: string;
  defaults: Readonly<P>;
  compute(params: Readonly<P>): D;
  mount(container: HTMLElement): Promise<DemoHandle>;
}
