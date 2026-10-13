import type { Data, Layout } from 'plotly.js';
import type { DemoDefinition } from '../content/schema';
import { computeQuadratic, quadraticDefaults, type QuadraticData, type QuadraticParams } from '../math/quadratic';
import { numberControl, type NumberControl, type NumberControlSpec } from '../ui/controls';
import { formatNumber, required } from '../ui/dom';
import { formula } from '../ui/formula';
import { createPlot, type PlotFrame } from '../ui/plot';

const colors = [[0, '#f4f8f2'], [0.2, '#e0eddc'], [0.45, '#aecfaf'], [0.7, '#6b9e7c'], [1, '#215941']] as [number, string][];
type View = '2d' | '3d';

function frameFor(data: QuadraticData, view: View): PlotFrame {
  const common: Partial<Layout> = {
    autosize: true, height: 480, margin: { l: 54, r: 26, t: 20, b: 48 },
    paper_bgcolor: 'transparent', plot_bgcolor: '#fff',
    font: { family: 'Segoe UI, sans-serif', size: 12, color: '#52665a' },
    showlegend: false, uirevision: view,
  };
  if (view === '3d') {
    const traces: Data[] = [
      { type: 'surface', x: data.x, y: data.y, z: data.values, colorscale: colors,
        showscale: false, opacity: 0.9, hovertemplate: 'z₁: %{x:.2f}<br>z₂: %{y:.2f}<br>ℓ: %{z:.2f}<extra>Costo</extra>' },
      { type: 'scatter3d', x: [data.point[0], data.point[0]], y: [data.point[1], data.point[1]], z: [0, data.value],
        mode: 'lines', line: { color: '#d78847', width: 5 }, hoverinfo: 'skip' },
      { type: 'scatter3d', x: [data.point[0]], y: [data.point[1]], z: [data.value], mode: 'markers',
        marker: { size: 6, color: '#e69a58', line: { color: '#fff', width: 2 } },
        hovertemplate: 'ℓ(z) = %{z:.3f}<extra>Punto selezionato</extra>' },
      { type: 'scatter3d', x: [data.center[0]], y: [data.center[1]], z: [0], mode: 'markers',
        marker: { size: 5, color: '#173c2d', symbol: 'diamond' }, hovertemplate: 'ℓ = 0<extra>Minimo</extra>' },
    ];
    return { data: traces, layout: { ...common, margin: { l: 0, r: 0, t: 0, b: 0 },
      scene: {
        xaxis: { title: { text: 'z₁' }, range: [-4, 4], gridcolor: '#dfe7df' },
        yaxis: { title: { text: 'z₂' }, range: [-4, 4], gridcolor: '#dfe7df' },
        zaxis: { title: { text: 'Costo ℓ' }, rangemode: 'tozero', gridcolor: '#dfe7df' },
        camera: { eye: { x: 1.5, y: 1.5, z: 1 } }, aspectratio: { x: 1, y: 1, z: 0.7 },
      } } };
  }
  const scale = data.gradientNorm > 1e-10 ? 0.85 / data.gradientNorm : 0;
  return {
    data: [
      { type: 'contour', x: data.x, y: data.y, z: data.values, colorscale: colors, showscale: false,
        contours: { coloring: 'fill', showlabels: true, labelfont: { size: 10, color: '#386246' } },
        ncontours: 15, line: { color: '#86ad87', width: 0.8 },
        hovertemplate: 'z₁: %{x:.2f}<br>z₂: %{y:.2f}<br>ℓ: %{z:.2f}<extra>Costo</extra>' },
      { type: 'scatter', x: [data.center[0]], y: [data.center[1]], mode: 'markers',
        marker: { size: 11, color: '#214c39', symbol: 'diamond', line: { color: '#fff', width: 2 } },
        hovertemplate: 'ℓ = 0<extra>Minimo</extra>' },
      { type: 'scatter', x: [data.point[0]], y: [data.point[1]], mode: 'markers',
        marker: { size: 14, color: '#e69a58', line: { color: '#fff', width: 2.5 } },
        hovertemplate: `ℓ = ${data.value.toFixed(3)}<extra>Punto selezionato</extra>` },
    ],
    layout: { ...common,
      xaxis: { title: { text: 'z₁' }, range: [-4, 4], gridcolor: '#e5ebe4', zerolinecolor: '#aac0ab', fixedrange: true, constrain: 'domain' },
      yaxis: { title: { text: 'z₂' }, range: [-4, 4], gridcolor: '#e5ebe4', zerolinecolor: '#aac0ab', fixedrange: true, scaleanchor: 'x', scaleratio: 1 },
      annotations: data.gradientNorm < 1e-10 ? [] : [{
        x: data.point[0] + scale * data.gradient[0], y: data.point[1] + scale * data.gradient[1],
        ax: data.point[0], ay: data.point[1], xref: 'x', yref: 'y', axref: 'x', ayref: 'y',
        showarrow: true, text: '', arrowcolor: '#b46c31', arrowwidth: 2.5, arrowhead: 3,
      }],
    },
  };
}

const specifications: NumberControlSpec[] = [
  { key: 'weight1', label: 'Peso w₁', min: 0.2, max: 5, step: 0.1 },
  { key: 'weight2', label: 'Peso w₂', min: 0.2, max: 5, step: 0.1 },
  { key: 'angle', label: 'Rotazione φ', min: -90, max: 90, step: 1, unit: '°' },
  { key: 'pointX', label: 'Punto z₁', min: -3, max: 3, step: 0.1 },
  { key: 'pointY', label: 'Punto z₂', min: -3, max: 3, step: 0.1 },
  { key: 'centerX', label: 'Obiettivo z̄₁', min: -2, max: 2, step: 0.1 },
  { key: 'centerY', label: 'Obiettivo z̄₂', min: -2, max: 2, step: 0.1 },
];
const presets: Record<string, QuadraticParams> = {
  isotropic: { ...quadraticDefaults, weight1: 1, weight2: 1, angle: 0 },
  narrow: { ...quadraticDefaults, weight1: 0.3, weight2: 5, angle: 35 },
  rotated: { ...quadraticDefaults, weight1: 3, weight2: 0.6, angle: -35, centerX: -0.5, centerY: 0.5 },
};

export const weightedCostDemo: DemoDefinition<QuadraticParams, QuadraticData> = {
  id: 'weighted-cost', defaults: quadraticDefaults, compute: computeQuadratic,
  async mount(container) {
    container.innerHTML = `<div class="lab-toolbar"><div class="lab-presets" role="group" aria-label="Casi preimpostati">
      <button type="button" data-preset="isotropic">Pesi uguali</button><button type="button" data-preset="narrow">Valle stretta</button><button type="button" data-preset="rotated">Assi ruotati</button></div>
      <button type="button" class="reset-button" data-reset>↺ Ripristina</button></div>
      <div class="lab-body"><div class="plot-panel"><div class="plot-heading"><div><span class="mini-label">GEOMETRIA DEL COSTO</span><h3>Una funzione, due prospettive</h3></div>
      <div class="view-switch" role="group" aria-label="Vista del grafico"><button type="button" data-view="2d" aria-pressed="true">2D</button><button type="button" data-view="3d" aria-pressed="false">3D</button></div></div>
      <div class="plot-canvas" role="img" aria-label="Curve di livello del costo quadratico; i valori sono disponibili nei controlli e nelle misure sottostanti."></div>
      <div class="plot-legend"><span><i class="legend-dot selected"></i>Punto selezionato</span><span><i class="legend-dot minimum"></i>Minimo</span><span class="gradient-legend">↗ Direzione del gradiente</span></div>
      <p class="plot-hint">${formula(String.raw`\nabla\ell(z)=W(z-\bar z)`)} <span data-view-hint>La freccia indica la direzione; la lunghezza è normalizzata.</span></p>
      <p class="lab-error" role="alert" hidden></p></div>
      <aside class="parameter-panel" aria-label="Parametri del costo"><div class="parameter-heading"><h3>Modifica i parametri</h3><span>Il grafico si aggiorna subito</span></div>
      <div data-controls="geometry"></div><div class="control-divider">Punto da valutare</div><div data-controls="point"></div>
      <details class="target-controls"><summary>Sposta l’obiettivo</summary><div data-controls="center"></div></details></aside></div>
      <div class="lab-metrics" aria-live="polite" aria-atomic="true">
        <div><span>Costo nel punto</span><strong data-metric="cost"></strong><small>ℓ(z)</small></div>
        <div><span>Norma del gradiente</span><strong data-metric="gradient"></strong><small>‖∇ℓ(z)‖₂</small></div>
        <div><span>Condizionamento</span><strong data-metric="condition"></strong><small>L / μ</small></div>
        <div><span>Curvatura minima / massima</span><strong data-metric="eigenvalues"></strong><small>μ / L</small></div>
      </div>
      <details class="matrix-details"><summary>Leggi la matrice dei pesi W</summary><div data-matrix></div><p>W = R(φ) diag(w₁, w₂) R(φ)ᵀ. I due pesi sono gli autovalori: restano positivi in tutti i casi proposti.</p></details>`;
    let params: QuadraticParams = { ...quadraticDefaults };
    let view: View = '2d', disposed = false;
    const controls = new Map<keyof QuadraticParams, NumberControl>();
    const canvas = required(container, '.plot-canvas');
    const error = required(container, '.lab-error');
    const plot = await createPlot(canvas);
    function showError(cause: unknown) {
      error.textContent = `Il grafico non è disponibile: ${cause instanceof Error ? cause.message : 'errore di visualizzazione'}. Riprova con la vista 2D.`;
      error.hidden = false;
    }
    function update() {
      if (disposed) return;
      const data = computeQuadratic(params);
      required(container, '[data-metric=cost]').textContent = formatNumber(data.value);
      required(container, '[data-metric=gradient]').textContent = formatNumber(data.gradientNorm);
      required(container, '[data-metric=condition]').textContent = formatNumber(data.condition);
      required(container, '[data-metric=eigenvalues]').textContent = `${formatNumber(data.eigenvalues[0], 1)} / ${formatNumber(data.eigenvalues[1], 1)}`;
      const W = data.matrix;
      required(container, '[data-matrix]').innerHTML = formula(String.raw`W=\begin{bmatrix}${W[0][0].toFixed(2)}&${W[0][1].toFixed(2)}\\${W[1][0].toFixed(2)}&${W[1][1].toFixed(2)}\end{bmatrix}`);
      canvas.setAttribute('aria-label', `${view === '2d' ? 'Curve di livello' : 'Superficie 3D'} del costo quadratico. Costo ${formatNumber(data.value)}, norma del gradiente ${formatNumber(data.gradientNorm)}.`);
      error.hidden = true;
      void plot.render(frameFor(data, view)).catch(showError);
    }
    for (const spec of specifications) {
      const key = spec.key as keyof QuadraticParams;
      const control = numberControl(spec, params[key], (value) => { params = { ...params, [key]: value }; update(); });
      controls.set(key, control);
      const group = key.startsWith('center') ? 'center' : key.startsWith('point') ? 'point' : 'geometry';
      required(container, `[data-controls=${group}]`).append(control.element);
    }
    const click = (event: Event) => {
      const target = (event.target as Element).closest<HTMLButtonElement>('button');
      if (!target) return;
      if (target.dataset.preset || target.hasAttribute('data-reset')) {
        params = { ...(target.hasAttribute('data-reset') ? quadraticDefaults : presets[target.dataset.preset!]) };
        controls.forEach((control, key) => control.setValue(params[key]));
        container.querySelectorAll('[data-preset]').forEach((button) => button.classList.toggle('is-selected', button === target));
      }
      if (target.dataset.view) {
        view = target.dataset.view as View;
        container.querySelectorAll('[data-view]').forEach((button) => button.setAttribute('aria-pressed', String((button as HTMLElement).dataset.view === view)));
        required(container, '[data-view-hint]').textContent = view === '2d'
          ? 'La freccia indica la direzione; la lunghezza è normalizzata.'
          : 'Trascina per ruotare la superficie e osservare la curvatura.';
        required(container, '.gradient-legend').classList.toggle('visually-hidden', view === '3d');
      }
      update();
    };
    container.addEventListener('click', click);
    update();
    container.dataset.ready = 'true';
    return { destroy() {
      disposed = true;
      controls.forEach((control) => control.destroy());
      container.removeEventListener('click', click);
      plot.destroy();
    } };
  },
};
