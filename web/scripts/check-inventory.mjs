import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../../', import.meta.url));
const inventory = JSON.parse(readFileSync(resolve(root, 'sources/inventory.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
const sessionIds = new Set(manifest.sessions.map(s=>s.id));
const registry = readFileSync(resolve(root, 'web/demos/registry.ts'), 'utf8');
const demos = new Set();
let pages = 0, concepts = 0;
for (const source of inventory.sources) {
  const file = readFileSync(resolve(root, source.filename));
  assert.equal(createHash('sha256').update(file).digest('hex'), source.sha256, `PDF changed: ${source.id}`);
  const extraction = JSON.parse(readFileSync(resolve(root, source.extractedPath), 'utf8'));
  assert.equal(extraction.pages.length, source.pageCount);
  assert.equal(extraction.sha256, source.sha256);
  assert.deepEqual(extraction.pages.map(p=>p.pdfPage), Array.from({ length: source.pageCount },(_,i)=>i+1));
  const covered = new Set(), ids = new Set();
  for (const concept of source.concepts) {
    assert(!ids.has(concept.id), `Duplicate concept: ${source.id}/${concept.id}`);
    ids.add(concept.id);
    assert(sessionIds.has(concept.block));
    for (const page of concept.pages) { assert(page >= 1 && page <= source.pageCount); covered.add(page); }
    assert(concept.visualizations.length || concept.noVisualizationReason);
    for (const visual of concept.visualizations) {
      assert(visual.parameters.length && visual.dimensions.length);
      if (visual.status === 'ready') {
        assert(registry.includes(`'${visual.id}'`) || registry.includes(`"${visual.id}"`), `Ready demo not registered: ${visual.id}`);
      }
      demos.add(visual.id);
    }
  }
  assert.equal(covered.size, source.pageCount, `Uncovered pages: ${source.id}`);
  const assigned = manifest.sessions.filter(s=>s.sourceId===source.id).flatMap(s=>s.pages);
  assert.deepEqual(assigned, Array.from({ length: source.pageCount },(_,i)=>i+1));
  assert(manifest.sessions.filter(s=>s.sourceId===source.id).length <= 3);
  pages += source.pageCount;
  concepts += source.concepts.length;
  console.log(`${source.id}: ${source.pageCount} pagine, ${source.concepts.length} voci, hash e copertura verificati`);
}
console.log(`Totale: ${pages} pagine, ${concepts} voci, ${demos.size} laboratori censiti.`);
