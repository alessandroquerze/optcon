export function html(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}
export function required<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Elemento mancante: ${selector}`);
  return element;
}
export const formatNumber = (value: number, digits = 2): string =>
  new Intl.NumberFormat('it-IT', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
