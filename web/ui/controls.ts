import { html } from './dom';

export interface NumberControlSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}
export interface NumberControl {
  element: HTMLElement;
  setValue(value: number): void;
  destroy(): void;
}
let nextControlId = 0;

export function numberControl(spec: NumberControlSpec, initial: number, onChange: (value: number) => void): NumberControl {
  const id = `parameter-${++nextControlId}-${spec.key}`;
  const element = document.createElement('div');
  element.className = 'number-control';
  element.innerHTML = `<div class="control-label"><label for="${id}">${html(spec.label)}</label>
    <span class="number-wrap"><input id="${id}-number" type="number" min="${spec.min}" max="${spec.max}" step="${spec.step}" value="${initial}" aria-label="${html(spec.label)}, valore numerico">${spec.unit ? `<span>${html(spec.unit)}</span>` : ''}</span></div>
    <input id="${id}" type="range" min="${spec.min}" max="${spec.max}" step="${spec.step}" value="${initial}">
    <div class="range-limits" aria-hidden="true"><span>${spec.min}</span><span>${spec.max}</span></div>`;
  const range = element.querySelector<HTMLInputElement>('input[type=range]')!;
  const number = element.querySelector<HTMLInputElement>('input[type=number]')!;
  let current = initial;
  function setValue(value: number) {
    current = Math.min(spec.max, Math.max(spec.min, value));
    range.value = String(current);
    number.value = String(current);
    range.style.setProperty('--fill', `${100 * (current - spec.min) / (spec.max - spec.min)}%`);
  }
  const rangeInput = () => { setValue(range.valueAsNumber); onChange(current); };
  const numberInput = () => {
    if (!Number.isFinite(number.valueAsNumber)) return;
    setValue(Math.round(number.valueAsNumber / spec.step) * spec.step);
    onChange(current);
  };
  const numberBlur = () => setValue(current);
  range.addEventListener('input', rangeInput);
  number.addEventListener('input', numberInput);
  number.addEventListener('blur', numberBlur);
  setValue(initial);
  return { element, setValue, destroy() {
    range.removeEventListener('input', rangeInput);
    number.removeEventListener('input', numberInput);
    number.removeEventListener('blur', numberBlur);
  } };
}
