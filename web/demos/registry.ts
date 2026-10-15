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
  'active-constraints': () => import('./O3').then(module=>module.activeDemo),
  'lagrangian': () => import('./O3').then(module=>module.lagrangianDemo),
  'kkt-geometry': () => import('./O3').then(module=>module.kktDemo),
  'constrained-curvature': () => import('./O3').then(module=>module.curvatureDemo),
  'constrained-qp': () => import('./O3').then(module=>module.qpDemo),
  'constrained-newton': () => import('./O3').then(module=>module.newtonDemo),
  'sqp': () => import('./O3').then(module=>module.sqpDemo),
  'merit-line-search': () => import('./O3').then(module=>module.meritDemo),
  'barrier-equalities': () => import('./O3').then(module=>module.barrierDemo),
  'time-iteration': () => import('./O3').then(module=>module.timeDemo),
  'motivation-map': () => import('./I1').then(module=>module.motivationDemo),
  'continuous-system': () => import('./I1').then(module=>module.continuousDemo),
  'discrete-system': () => import('./I1').then(module=>module.discreteDemo),
  'trajectory-equilibrium': () => import('./I1').then(module=>module.equilibriumDemo),
  'linearization': () => import('./I1').then(module=>module.linearizationDemo),
  'control-objectives': () => import('./I1').then(module=>module.objectivesDemo),
  'optimization-geometry': () => import('./I1').then(module=>module.optimizationDemo),
  'scalar-cost': () => import('./I1').then(module=>module.scalarDemo),
  'semidefinite-cost': () => import('./I1').then(module=>module.weightsDemo),
  'constraint-sets': () => import('./I1').then(module=>module.constraintsDemo),
  'dynamics-residual': () => import('./I2').then(module=>module.residualDemo),
  'trajectory-cost': () => import('./I2').then(module=>module.costDemo),
  'path-boundary': () => import('./I2').then(module=>module.pathDemo),
  'discrete-control': () => import('./I2').then(module=>module.controlDemo),
  'reference-versus-trajectory': () => import('./I2').then(module=>module.referenceDemo),
  'planar-drone': () => import('./I2').then(module=>module.flightDemo),
  'drone-optimal-control': () => import('./I2').then(module=>module.droneDemo),
  'drone-constraints': () => import('./I2').then(module=>module.constraintsDemo),
  'continuous-versus-discrete': () => import('./I3').then(module=>module.integralDemo),
  'pendulum': () => import('./I3').then(module=>module.pendulumDemo),
  'pendulum-equilibrium': () => import('./I3').then(module=>module.equilibriumDemo),
  'pendulum-reference': () => import('./I3').then(module=>module.referenceDemo),
  'pendulum-optimal-control': () => import('./I3').then(module=>module.transferDemo),
  'k1-state-input-stack': () => import('./K1').then(module=>module.stackDemo),
  'k1-dynamics-residual': () => import('./K1').then(module=>module.residualDemo),
  'trajectory-manifold': () => import('./K1').then(module=>module.manifoldDemo),
  'trajectory-tangent': () => import('./K1').then(module=>module.tangentDemo),
  'k1-unconstrained-control': () => import('./K1').then(module=>module.controlDemo),
  'optimal-control-structure': () => import('./K1').then(module=>module.structureDemo),
  'k1-kkt-geometry': () => import('./K1').then(module=>module.recallDemo),
  'costate-structure': () => import('./K2').then(module=>module.structureDemo),
  'costates': () => import('./K2').then(module=>module.costateDemo),
  'constrained-optimal-control': () => import('./K2').then(module=>module.constrainedDemo),
  'optimal-control-kkt': () => import('./K2').then(module=>module.kktDemo),
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
