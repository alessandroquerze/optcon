import type * as PlotlyTypes from 'plotly.js';

let library: Promise<typeof PlotlyTypes> | undefined;
export function loadPlotly(): Promise<typeof PlotlyTypes> {
  return library ??= import('plotly.js-dist-min').then((module) => module.default);
}
export interface PlotFrame {
  data: PlotlyTypes.Data[];
  layout: Partial<PlotlyTypes.Layout>;
}
/** Serialize renders, coalesce pending frames and clean up WebGL/observers. */
export async function createPlot(container: HTMLElement): Promise<{
  render(frame: PlotFrame): Promise<void>;
  destroy(): void;
}> {
  const Plotly = await loadPlotly();
  let disposed = false, rendered = false;
  let pending: PlotFrame | undefined;
  let running: Promise<void> | undefined;
  const resize = new ResizeObserver(() => {
    if (rendered && !disposed && container.clientWidth) void Promise.resolve(Plotly.Plots.resize(container)).catch(() => {});
  });
  resize.observe(container);
  async function drain() {
    while (pending && !disposed) {
      const frame = pending;
      pending = undefined;
      await Plotly.react(container, frame.data, frame.layout, {
        responsive: true, displayModeBar: false, displaylogo: false, scrollZoom: false,
      });
      rendered = true;
    }
  }
  return {
    render(frame) {
      if (disposed) return Promise.resolve();
      pending = frame;
      if (!running) running = drain().finally(() => {
        running = undefined;
        if (disposed) Plotly.purge(container);
      });
      return running;
    },
    destroy() {
      disposed = true;
      pending = undefined;
      resize.disconnect();
      if (!running) Plotly.purge(container);
    },
  };
}
