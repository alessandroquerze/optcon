import type { DemoHandle } from '../content/schema';

const loaders: Record<string, () => Promise<{ mount(container: HTMLElement): Promise<DemoHandle> }>> = {
  'weighted-cost': () => import('./weighted-cost').then((module) => module.weightedCostDemo),
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
