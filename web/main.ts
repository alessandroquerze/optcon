import './ui/styles.css';
import { courseCopy, getSource, lessons, sources } from './content/catalog';
import type { CourseId, CourseSource, LessonSection, SessionId } from './content/schema';
import { observeDemo } from './demos/registry';
import { html, required } from './ui/dom';
import { formula } from './ui/formula';

const page = document.body.dataset.page as CourseId | 'home';
const isCourse = page !== 'home';
const source = isCourse ? getSource(page) : undefined;
const pdfUrl = (item: CourseSource, pdfPage?: number) => `./pdfs/${item.filename}${pdfPage ? `#page=${pdfPage}` : ''}`;
const arrow = '<span aria-hidden="true">↗</span>';
const icon = (name: string) => {
  const paths: Record<string, string> = {
    book: '<path d="M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4zM20 4h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-2h3z"/>',
    curve: '<path d="M3 20h18M4 20V4M5 7c5 0 4 11 8 11s3-12 8-12"/>',
    layers: '<path d="m12 3 10 6-10 6L2 9zM2 13l10 6 10-6M2 17l10 6 10-6"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.book}</svg>`;
};

function illustration(id: CourseId): string {
  if (id === 'introduzione') return `<svg viewBox="0 0 300 210" fill="none" aria-hidden="true"><path d="M26 180H280M35 192V22" stroke="#b6cabc"/><path d="M35 164C75 170 66 78 122 109S179 43 261 42" stroke="#25785a" stroke-width="2.5"/><path d="M35 158C79 153 77 56 123 73S194 20 261 31" stroke="#8eb597" stroke-dasharray="5 5" stroke-width="1.5"/>${[[35,164],[84,128],[123,109],[173,93],[215,56],[261,42]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#25785a" stroke="#f5f8f1" stroke-width="2"/>`).join('')}<text x="178" y="173" fill="#6c8975" font-size="13" font-family="Georgia">una traiettoria possibile</text><text x="270" y="198" fill="#6c8975" font-size="12">t</text></svg>`;
  if (id === 'kkt') return `<svg viewBox="0 0 300 210" fill="none" aria-hidden="true"><path d="M26 180H280M35 192V22" stroke="#b6cabc"/><ellipse cx="154" cy="110" rx="99" ry="48" transform="rotate(-30 154 110)" stroke="#70a084" stroke-width="1.5"/><path d="M75 140 245 67" stroke="#25785a" stroke-width="2"/><path d="m159 104 25 54m-25-54-7 20m7-20 20 8" stroke="#d28b4c" stroke-width="2"/><circle cx="159" cy="104" r="5" fill="#25785a" stroke="#f5f8f1" stroke-width="2"/><text x="199" y="58" fill="#5f826b" font-size="13" font-family="Georgia">spazio tangente</text><text x="191" y="160" fill="#b77c45" font-size="15" font-family="Georgia">∇ℓ</text></svg>`;
  return `<svg viewBox="0 0 300 210" fill="none" aria-hidden="true"><path d="M26 180H280M35 192V22" stroke="#c0d0c0"/><g transform="translate(155 109) rotate(-28)">${[1,2,3,4,5].map(i => `<ellipse rx="${i*23}" ry="${i*12}" stroke="${i === 1 ? '#438564' : '#99b99b'}" stroke-width="${i === 1 ? 1.8 : 1}"/>`).join('')}</g><circle cx="155" cy="109" r="4" fill="#25785a"/><circle cx="202" cy="91" r="6" fill="#e49b5c" stroke="#f5f8f1" stroke-width="2"/><text x="228" y="170" fill="#6c8975" font-size="14" font-family="Georgia">ℓ(z)</text></svg>`;
}

function sidebar(): string {
  return `<aside class="sidebar"><a href="./index.html" class="brand" aria-label="OPTCON, pagina iniziale"><span class="brand-mark">${icon('curve')}</span><span>OPTCON<small>QUADERNO INTERATTIVO</small></span></a>
    <div class="sidebar-section-label">IL PERCORSO</div><nav class="course-nav" aria-label="Capitoli">
    ${sources.map((item, index) => `<a href="./${item.id}.html" ${page === item.id ? 'aria-current="page"' : ''}><span class="nav-number">0${index+1}</span><span>${html(item.shortTitle)}<small>${item.pageCount} pagine di riferimento</small></span><span class="nav-chevron" aria-hidden="true">›</span></a>`).join('')}</nav>
    <div class="sidebar-note"><span class="note-rule"></span><p>Leggi un concetto.<br>Cambia un parametro.<br>Guarda cosa succede.</p><span>Dal modello all’intuizione.</span></div>
    <div class="sidebar-bottom"><span class="sidebar-section-label">MATERIALE DEL CORSO</span>
    ${source ? `<a class="sidebar-source" href="${pdfUrl(source)}" target="_blank" rel="noopener">${icon('book')}<span>Apri le slide originali</span>${arrow}</a>` : '<p class="sidebar-credit">Controllo ottimo e<br>Reinforcement Learning</p>'}
    <p class="attribution">Da slide di G. Notarstefano<br>Università di Bologna</p></div></aside>`;
}

function hero(item: CourseSource): string {
  const copy = courseCopy[item.id];
  return `<header class="course-hero" id="inizio"><div class="hero-copy"><div class="eyebrow"><span>${copy.number}</span>${copy.eyebrow}</div>
    <h1>${html(copy.title).replace('\n', '<br>')}</h1><p class="hero-lead">${html(copy.lead)}</p>
    <div class="hero-meta"><span>${icon('book')} ${item.pageCount} pagine originali</span><span class="meta-dot"></span><span>${item.concepts.filter(c=>c.kind==='theory').length} concetti nel percorso</span></div></div>
    <div class="hero-illustration">${illustration(item.id)}<p>${html(copy.idea)}</p></div></header>
    <div class="learning-outcomes">${copy.outcomes.map((text) => `<span><i aria-hidden="true">✓</i>${html(text)}</span>`).join('')}</div>
    <nav class="page-nav" aria-label="In questa pagina">${item.id === 'ottimizzazione' ? '<a href="#laboratorio" class="active">Laboratorio <span class="tiny-dot"></span></a>' : ''}${lessons[item.id]?.length ? `<a href="#${html(lessons[item.id]![0].id)}">Appunti disponibili</a>`:''}<a href="#percorso">Percorso del capitolo</a><a href="#fonti">Slide originali</a></nav>`;
}

function laboratory(): string {
  return `<section class="lab-section" id="laboratorio" aria-labelledby="lab-title"><div class="section-heading"><div><span class="eyebrow">ESPLORA · LABORATORIO 01</span><h2 id="lab-title">Il costo prende forma</h2></div><span class="availability"><i></i>Interattivo</span></div>
    <p class="section-lead">Una distanza non deve pesare allo stesso modo in ogni direzione. Modifica i pesi e osserva come cambiano la superficie del costo e le sue curve di livello.</p>
    <div class="formula-strip">${formula(String.raw`\ell(z)=\frac12(z-\bar z)^\top W(z-\bar z)`)}<span>W definita positiva · minimo unico in ${formula(String.raw`z=\bar z`)}</span></div>
    <div class="laboratory" data-demo="weighted-cost"><div class="loading-lab" role="status">Preparazione del grafico interattivo…</div></div>
    <div class="observe-grid"><article><span>01</span><h3>Confronta i pesi</h3><p>Pesi uguali producono circonferenze. Aumenta un peso: spostarsi in quella direzione costa di più e le curve si restringono.</p></article><article><span>02</span><h3>Ruota gli assi</h3><p>La rotazione cambia l’orientamento delle ellissi, mantenendo gli autovalori. Con pesi uguali il grafico non cambia.</p></article><article><span>03</span><h3>Trova il minimo</h3><p>Porta il punto sull’obiettivo: costo e gradiente diventano nulli. Sposta l’obiettivo per traslare tutta la superficie.</p></article></div>
    <p class="source-caption">Riferimenti: <a href="${pdfUrl(getSource('introduzione'), 16)}" target="_blank" rel="noopener">Introduzione, p. 16</a> e <a href="${pdfUrl(getSource('ottimizzazione'), 23)}" target="_blank" rel="noopener">Ottimizzazione, pp. 23–25</a>. La rotazione rende esplorabile il caso generale di matrice simmetrica positiva. Coordinate adimensionali.</p></section>`;
}

const moduleNames: Partial<Record<SessionId, string>> = {
  I1: 'Sistemi e geometria del problema', I2: 'Controllo discreto e drone', I3: 'Controllo continuo e pendolo',
  O1: 'Fondamenti e geometria', O2: 'Metodi e convergenza', O3: 'Ottimizzazione vincolata',
  K1: 'Traiettorie e spazio tangente', K2: 'Lagrangiana e condizioni KKT',
};
function lessonMarkup(lesson: LessonSection): string {
  return `<article class="lesson" id="${html(lesson.id)}">${lesson.conceptIds.map(id=>`<span id="${html(id)}" class="lesson-anchor"></span>`).join('')}<h3>${html(lesson.title)}</h3><p>${html(lesson.intuition)}</p>
    ${lesson.formulas.map(f => `<div class="lesson-formula">${formula(f.latex, true)}<p>${html(f.explanation)}</p></div>`).join('')}
    <h4 class="lesson-label">Ipotesi e limiti</h4><ul>${lesson.assumptions.map(a=>`<li>${html(a)}</li>`).join('')}</ul><h4 class="lesson-label">Un esempio concreto</h4><p>${html(lesson.example)}</p>
    ${lesson.demoIds.map(id=>`<div class="laboratory" data-demo="${html(id)}"></div>`).join('')}
    <h4 class="lesson-label">Cosa osservare</h4><ul>${lesson.observe.map(a=>`<li>${html(a)}</li>`).join('')}</ul>
    <div class="lesson-sources">${lesson.sources.map(ref=>`<a href="${pdfUrl(getSource(ref.sourceId),ref.pages[0])}" target="_blank" rel="noopener">Slide originali · pp. ${ref.pages[0]}${ref.pages.length>1?'–'+ref.pages.at(-1):''} ↗</a>`).join('')}</div></article>`;
}

function outline(item: CourseSource): string {
  const concepts = item.concepts.filter(c => c.kind === 'theory');
  const blocks = [...new Set(concepts.map(c => c.block))];
  return `<section class="outline-section" id="percorso" aria-labelledby="outline-title"><div class="section-heading"><div><span class="eyebrow">METTI IN ORDINE LE IDEE</span><h2 id="outline-title">Il percorso del capitolo</h2></div><span class="outline-count">${concepts.length} concetti</span></div>
    <p class="section-lead">La mappa completa degli argomenti, con rimandi alle slide. Gli approfondimenti e i laboratori indicati “in preparazione” verranno aggiunti qui.</p>
    <div class="key-idea"><span>IDEA CHIAVE</span><div>${formula(courseCopy[item.id].formula)}</div><p>${html(courseCopy[item.id].formulaCaption)}</p></div>
    ${blocks.map((block, index) => {
      const entries = concepts.filter(c=>c.block === block);
      const sections = [...new Map(entries.flatMap(c=>{const section=lessons[item.id]?.find(s=>s.conceptIds.includes(c.id));return section?[[section.id,section] as const]:[];})).values()];
      const renderedSections = new Set<string>();
      const min = Math.min(...entries.flatMap(c=>c.pages)), max = Math.max(...entries.flatMap(c=>c.pages));
      return `<details class="course-module" ${index === 0 ? 'open' : ''}><summary><span class="module-number">0${index+1}</span><span class="module-title">${html(moduleNames[block] ?? block)}<small>${entries.length} concetti · PDF pp. ${min}–${max}</small></span><span class="module-expand" aria-hidden="true">+</span></summary>
      <div class="module-content">${sections.length?`<nav class="lesson-toc" aria-label="Sezioni disponibili di ${html(moduleNames[block]??block)}">${sections.map(s=>`<a href="#${html(s.id)}">${html(s.title)}</a>`).join('')}</nav>`:''}${entries.map((concept) => {
        const section = lessons[item.id]?.find(lesson=>lesson.conceptIds.includes(concept.id));
        if (section) { if(renderedSections.has(section.id))return '';renderedSections.add(section.id);return lessonMarkup(section); }
        const ready = concept.visualizations.find(v=>v.status==='ready');
        return `<article class="concept" id="${html(concept.id)}"><div class="concept-heading"><h3>${html(concept.title)}</h3><a href="${pdfUrl(item, concept.pages[0])}" target="_blank" rel="noopener" class="page-reference" aria-label="Apri le slide, pagina ${concept.pages[0]}">p. ${concept.pages[0]}${concept.pages.length>1 ? '–'+concept.pages.at(-1) : ''} ${arrow}</a></div>
          <p>${html(concept.summary)}</p><div class="concept-footer"><span class="visualization-label">${concept.visualizations.flatMap(v=>v.dimensions).filter((v,i,a)=>a.indexOf(v)===i).map(v=>v.toUpperCase()).join(' / ')} · ${ready ? 'Esempio disponibile' : 'Laboratorio in preparazione'}</span>
          ${ready ? '<a href="./ottimizzazione.html#laboratorio" class="text-link">Esplora il costo <span aria-hidden="true">→</span></a>' : ''}</div></article>`;
      }).join('')}</div></details>`;
    }).join('')}</section>`;
}

function sourceSection(item: CourseSource): string {
  return `<section class="sources-section" id="fonti" aria-labelledby="source-title"><div class="section-heading"><div><span class="eyebrow">TORNA ALLA FONTE</span><h2 id="source-title">Dalle slide al quaderno</h2></div></div>
    <a href="${pdfUrl(item)}" target="_blank" rel="noopener" class="source-card"><span class="pdf-icon">PDF</span><span><strong>${html(item.title)}</strong><small>G. Notarstefano · Università di Bologna · ${item.pageCount} pagine</small></span>${arrow}</a>
    <p class="source-caption">I rimandi usano il numero effettivo della pagina PDF, includendo la copertina. Può differire dal numero stampato sulla slide. ${lessons[item.id]?.length?`Sono disponibili ${lessons[item.id]!.length} sezioni complete; gli altri argomenti sono in preparazione.`:'Gli appunti completi sono in preparazione; il laboratorio del costo quadratico è già disponibile.'}</p></section>`;
}

function home(): string {
  const count = sources.reduce((total,item)=>total+item.concepts.filter(c=>c.kind==='theory').length,0);
  return `<header class="course-hero home-hero"><div class="hero-copy"><div class="eyebrow"><span>OC</span>CONTROLLO OTTIMO · QUADERNO DI STUDIO</div><h1>La teoria,<br>vista da vicino.</h1><p class="hero-lead">Un percorso attraverso modelli, ottimizzazione e condizioni di ottimalità. Le formule prendono forma; i parametri diventano un modo per capirle.</p><a class="primary-button" href="./ottimizzazione.html#laboratorio">Prova il primo laboratorio <span aria-hidden="true">↗</span></a></div><div class="hero-illustration">${illustration('ottimizzazione')}<p>Un peso diverso.<br>Una geometria diversa.</p></div></header>
    <div class="home-stats"><span><strong>03</strong>capitoli distinti</span><span><strong>137</strong>pagine di riferimento</span><span><strong>${count}</strong>concetti nella mappa</span></div>
    <section class="home-path" aria-labelledby="home-path-title"><div class="section-heading"><div><span class="eyebrow">SCEGLI DA DOVE PARTIRE</span><h2 id="home-path-title">Tre capitoli, un percorso</h2></div></div>
    ${sources.map(item => { const copy=courseCopy[item.id]; return `<a class="course-row" href="./${item.id}.html"><span class="row-number">${copy.number}</span><span class="row-icon">${icon(item.id==='introduzione'?'book':item.id==='ottimizzazione'?'curve':'layers')}</span><span class="row-copy"><h3>${html(item.title)}</h3><p>${html(copy.outcomes.join(' · '))}</p></span><span class="row-meta">${item.pageCount} pagine<span aria-hidden="true">→</span></span></a>`; }).join('')}</section>
    <aside class="home-callout"><span class="availability"><i></i>Già esplorabile</span><h2>Quanto pesa una distanza?</h2><p>Il laboratorio del costo quadratico ti permette di cambiare pesi, rotazione e obiettivo, confrontando curve di livello e superficie 3D.</p><a class="text-link" href="./ottimizzazione.html#laboratorio">Apri il laboratorio <span aria-hidden="true">→</span></a></aside>
    <p class="source-caption">Edizione in costruzione: trovi la mappa dei tre PDF, il laboratorio del costo quadratico e ${lessons.ottimizzazione?.length??0} sezioni complete sui fondamenti e sui metodi dell’ottimizzazione. Gli altri approfondimenti sono indicati come in preparazione.</p>`;
}

const nextCourse = source ? sources[(sources.indexOf(source)+1)%sources.length] : sources[0];
required(document, '#app').innerHTML = `<a class="skip-link" href="#contenuto">Vai al contenuto</a>${sidebar()}
  <div class="main-shell"><div class="topbar"><span><a href="./index.html">Quaderno</a>${source ? ` <span aria-hidden="true">/</span> ${html(source.shortTitle)}` : ' <span aria-hidden="true">/</span> Il percorso'}</span><span class="edition"><i></i>Edizione di studio · In costruzione</span></div>
  <main id="contenuto" class="page-content">${source ? hero(source)+(source.id==='ottimizzazione'?laboratory():'')+outline(source)+sourceSection(source) : home()}
  <footer class="page-footer"><span>OPTCON <small>Un concetto alla volta.</small></span><a href="./${nextCourse.id}.html">${source ? 'Continua con' : 'Inizia da'} ${html(nextCourse.shortTitle)} <span aria-hidden="true">→</span></a></footer></main></div>`;

const handles = [...document.querySelectorAll<HTMLElement>('[data-demo]')].map(element=>observeDemo(element.dataset.demo!, element));
window.addEventListener('pagehide', () => handles.forEach(handle=>handle.destroy()), { once: true });
// Preserve normal browser back/forward behavior, including its page cache.
window.addEventListener('pageshow', (event) => { if (event.persisted) window.location.reload(); });

if (window.location.hash) requestAnimationFrame(() => {
  document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView();
});
