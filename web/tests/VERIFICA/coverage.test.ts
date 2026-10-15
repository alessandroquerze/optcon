import { afterAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { lessons, sources } from '../../content/catalog';
import { hasDemo } from '../../demos/registry';
import { formula } from '../../ui/formula';

const root = new URL('../../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root));
const inventory = JSON.parse(read('sources/inventory.json').toString('utf8'));
const manifest = JSON.parse(read('manifest.json').toString('utf8'));
const registry = read('web/demos/registry.ts').toString('utf8');
// Compare loader targets as well as IDs: some inventory IDs intentionally share a lab.
const targets = new Map(registry.split('\n').flatMap(line => {
  const id = line.match(/^\s*'([^']+)':/);
  const module = line.match(/import\('([^']+)'\)/);
  const exported = line.match(/module\.(\w+)/);
  return id && module && exported ? [[id[1], `${module[1]}/${exported[1]}`] as const] : [];
}));
const summary = sources.map(source => ({
  sourceId: source.id,
  pages: source.pageCount,
  theoreticalConcepts: source.concepts.filter(c => c.kind === 'theory').length,
  sections: lessons[source.id]!.length,
  formulas: lessons[source.id]!.reduce((n, s) => n + s.formulas.length, 0),
  concepts: source.concepts.map(c => ({
    id: c.id, pages: c.pages, kind: c.kind,
    sectionIds: lessons[source.id]!.filter(s => s.conceptIds.includes(c.id)).map(s => s.id),
    demoIds: c.visualizations.map(v => v.id),
    representatives: c.visualizations.map(v => ({
      id: v.id, loader: targets.get(v.id),
      mountedId: [...(lessons[source.id]!.find(s => s.conceptIds.includes(c.id))?.demoIds ?? []), ...(source.id === 'ottimizzazione' ? ['weighted-cost'] : [])].find(id => targets.get(id) === targets.get(v.id)),
    })),
    noVisualizationReason: c.noVisualizationReason,
  })),
}));

describe('VERIFICA: complete cross-chapter coverage and continuity', () => {
  it('maps every theoretical concept exactly once and every physical page to notes or cover metadata', () => {
    for (const source of sources) {
      const sections = lessons[source.id]!;
      const covered = new Set<number>();
      for (const concept of source.concepts) {
        const mapped = sections.filter(s => s.conceptIds.includes(concept.id));
        if (concept.kind === 'metadata') {
          expect(concept.pages).toEqual([1]);
          expect(concept.noVisualizationReason).toBeTruthy();
          expect(concept.visualizations).toEqual([]);
        } else {
          expect(mapped, `${source.id}/${concept.id}`).toHaveLength(1);
          const references = mapped[0].sources.filter(s => s.sourceId === source.id).flatMap(s => s.pages);
          for (const page of concept.pages) expect(references, `${concept.id} p.${page}`).toContain(page);
        }
        concept.pages.forEach(p => covered.add(p));
      }
      expect([...covered].sort((a, b) => a - b)).toEqual(Array.from({ length: source.pageCount }, (_, i) => i + 1));
      expect(sections.flatMap(s => s.conceptIds).sort()).toEqual(source.concepts.filter(c => c.kind === 'theory').map(c => c.id).sort());
    }
    expect(summary.map(s => [s.pages, s.theoreticalConcepts, s.sections])).toEqual([[36,25,23],[81,33,30],[20,12,11]]);
  });

  it('provides a mounted representative for all 68 registered visualization IDs, including shared aliases', () => {
    const ids = new Set<string>();
    for (const source of sources) for (const concept of source.concepts) {
      const section = lessons[source.id]!.find(s => s.conceptIds.includes(concept.id));
      for (const visual of concept.visualizations) {
        ids.add(visual.id);
        expect(visual.status).toBe('ready');
        expect(hasDemo(visual.id), visual.id).toBe(true);
        expect(visual.parameters.length).toBeGreaterThan(0);
        expect(visual.dimensions.length).toBeGreaterThan(0);
        expect(targets.has(visual.id), visual.id).toBe(true);
        // Optimization also exposes the Base weighted-cost lab at #laboratorio, above the lessons.
        const available = [...section!.demoIds, ...(source.id === 'ottimizzazione' ? ['weighted-cost'] : [])];
        expect(available.map(id => targets.get(id)), `${source.id}/${concept.id}/${visual.id}`).toContain(targets.get(visual.id));
      }
    }
    expect(ids.size).toBe(68);
    for (const source of sources) for (const section of lessons[source.id]!) for (const id of section.demoIds) expect(hasDemo(id), id).toBe(true);
  });

  it('renders every lesson formula and preserves the complete learning sequence', () => {
    for (const source of sources) for (const section of lessons[source.id]!) {
      for (const text of [section.title, section.intuition, section.example, ...section.assumptions, ...section.observe]) {
        expect(text.trim().length).toBeGreaterThan(5);
        expect(text).not.toContain('\ufffd');
      }
      for (const array of [section.formulas, section.assumptions, section.observe, section.demoIds, section.sources]) expect(array.length).toBeGreaterThan(0);
      for (const item of section.formulas) {
        expect(item.explanation.length).toBeGreaterThan(10);
        expect(formula(item.latex, true)).toContain('<math');
      }
      for (const ref of section.sources) {
        const target = sources.find(s => s.id === ref.sourceId)!;
        expect(target).toBeTruthy();
        for (const page of ref.pages) expect(page >= 1 && page <= target.pageCount).toBe(true);
      }
    }
  });

  it('keeps lesson and concept anchors unique inside each chapter', () => {
    for (const source of sources) {
      const ids = lessons[source.id]!.flatMap(s => [s.id, ...s.conceptIds]);
      expect(new Set(ids).size).toBe(ids.length);
      for (const reserved of ['inizio','percorso','fonti','contenuto','laboratorio']) expect(ids).not.toContain(reserved);
    }
  });

  it('retains original PDF bytes and extraction page numbering', () => {
    for (const source of inventory.sources) {
      expect(createHash('sha256').update(read(source.filename)).digest('hex')).toBe(source.sha256);
      const extraction = JSON.parse(read(source.extractedPath).toString('utf8'));
      expect(extraction.sha256).toBe(source.sha256);
      expect(extraction.pages.map((p: {pdfPage:number}) => p.pdfPage)).toEqual(Array.from({ length: source.pageCount }, (_, i) => i + 1));
    }
  });

  it('has no unresolved errata and links every corrected page to its lesson', () => {
    expect(inventory.errata.length).toBeGreaterThan(0);
    for (const erratum of inventory.errata) {
      expect(erratum.status).toMatch(/^(corrected|clarified)-in-/);
      expect(erratum.verification.length).toBeGreaterThan(10);
      for (const page of erratum.pages) expect(lessons[erratum.sourceId as keyof typeof lessons]!.some(s => s.sources.some(r => r.sourceId === erratum.sourceId && r.pages.includes(page)))).toBe(true);
    }
  });

  it('preserves all 77 frozen artifacts against the completed K2 Git tag', () => {
    const paths = new Set<string>(Object.keys(manifest.baseContractHashes));
    for (const session of manifest.sessions) if (session.id !== 'VERIFICA') for (const path of Object.keys(session.artifactHashes ?? {})) paths.add(path);
    expect(paths.size).toBe(77);
    for (const path of paths) {
      const safeRoot = fileURLToPath(root).replace(/\\/g, '/').replace(/\/$/, '');
      const committed = execFileSync('git', ['-c',`safe.directory=${safeRoot}`,'show',`k2-v1:${path}`], { cwd: fileURLToPath(root), maxBuffer: 2**24 });
      expect(createHash('sha256').update(read(path)).digest('hex'), path).toBe(createHash('sha256').update(committed).digest('hex'));
    }
    for (const [path, hash] of Object.entries(manifest.baseContractHashes)) expect(createHash('sha256').update(read(path)).digest('hex'), path).toBe(hash);
  });
});

afterAll(() => {
  mkdirSync(new URL('artifacts/', root), { recursive: true });
  writeFileSync(new URL('artifacts/VERIFICA-coverage.json', root), JSON.stringify({ generatedAt: new Date().toISOString(), sources: summary }, null, 2) + '\n');
});
