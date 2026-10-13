import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const inventory = JSON.parse(readFileSync(resolve(root, 'sources/inventory.json'), 'utf8'));
const destination = resolve(root, 'web/public/pdfs');
mkdirSync(destination, { recursive: true });
for (const source of inventory.sources) {
  copyFileSync(resolve(root, source.filename), resolve(destination, source.filename));
}
console.log(`Fonti pronte: ${inventory.sources.length} PDF locali.`);
