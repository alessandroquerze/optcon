import katex from 'katex';
import 'katex/dist/katex.min.css';

export function formula(latex: string, displayMode = false): string {
  return katex.renderToString(latex, { displayMode, throwOnError: true, trust: false, output: 'htmlAndMathml' });
}
