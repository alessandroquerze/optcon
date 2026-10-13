import type { DemoHandle } from '../content/schema';

const loaders: Record<string, () => Promise<{ mount(container: HTMLElement): Promise<DemoHandle> }>> = {
  'weighted-cost': () => import('./weighted-cost').then((module) => module.weightedCostDemo),
  'local-global-minima': () => import('./O1').then(module=>module.landscapeDemo),
  'minimum-point-value': () => import('./O1').then(module=>module.landscapeDemo),
  'derivatives': () => import('./O1').then(module=>module.derivativeDemo),
  'stationary-classification': () => import('./O1').then(module=>module.stationaryDemo),
  'convex-set': () => import('./O1').then(module=>module.setDemo),
  'convex-function': () => import('./O1').then(module=>module.functionDemo),
  'constraint-convexity': () => import('./O1').then(module=>module.constraintDemo),
  'gradient-monotonicity': () => import('./O1').then(module=>module.boundsDemo),
  'gradient-bounds': () => import('./O1').then(module=>module.boundsDemo),
  'quadratic-bounds': () => import('./O1').then(module=>module.boundsDemo),
  'convex-optimality': () => import('./O1').then(module=>module.functionDemo),
  'quadratic-program': () => import('./O1').then(module=>module.qpDemo),
  'descent-methods': () => import('./O2').then(module=>module.descentDemo),
  'gradient-versus-newton': () => import('./O2').then(module=>module.comparisonDemo),
  'newton-root': () => import('./O2').then(module=>module.rootDemo),
  'newton-model': () => import('./O2').then(module=>module.modelDemo),
  'armijo': () => import('./O2').then(module=>module.armijoDemo),
  'convergence': () => import('./O2').then(module=>module.convergenceDemo),
  'feasible-directions': () => import('./O2').then(module=>module.feasibleDemo),
  'projection': () => import('./O2').then(module=>module.projectionDemo),
  'projected-gradient': () => import('./O2').then(module=>module.projectedDemo),
  'function-gallery': () => import('./O2').then(module=>module.galleryDemo),
  'barrier': () => import('./O2').then(module=>module.barrierDemo),
};
export function hasDemo(id: string): boolean { return id in loaders; }

export function observeDemo(id: string, container: HTMLElement): DemoHandle {
  let disposed = false;
  let mounted: DemoHandle | undefined;
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    const loader = loaders[id];
    if (!loader) { container.textContent = 'Questo laboratorio è in preparazione.'; return; }
    void loader().then((demo) => {
      if (disposed) return;
      return demo.mount(container).then((handle) => { if (disposed) handle.destroy(); else mounted = handle; });
    }).catch(() => {
      if (!disposed) container.innerHTML = '<p role="alert">Impossibile caricare il laboratorio. Ricarica la pagina per riprovare.</p>';
    });
  }, { rootMargin: '350px' });
  observer.observe(container);
  return { destroy() { disposed = true; observer.disconnect(); mounted?.destroy(); } };
}
