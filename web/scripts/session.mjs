/** Local, sequential session preparation and evidence-based completion. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../../', import.meta.url));
const project = resolve(root, 'web');
const manifestPath = resolve(root, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const [command = 'next', id, option] = process.argv.slice(2);
const now = () => new Date().toISOString();
const ready = (session) => session.dependencies.every(dependency => manifest.sessions.find(s=>s.id===dependency)?.status==='completed');
const session = id ? manifest.sessions.find(s=>s.id===id) : undefined;
function atomicJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameSync(temporary, path);
}
function saveManifest() { manifest.updatedAt = now(); atomicJson(manifestPath, manifest); }
function requireSession() { if (!session) throw new Error('Indica un ID valido: BASE, O1, O2, O3, I1, I2, I3, K1, K2, VERIFICA.'); }
function elapsed(item) { return item.startedAt ? (Date.now() - Date.parse(item.startedAt)) / 60000 : 0; }
function prompt(item) {
  const inventory = JSON.parse(readFileSync(resolve(root,'sources/inventory.json'),'utf8'));
  const source = inventory.sources.find(s=>s.id===item.sourceId);
  const pageText = source ? JSON.parse(readFileSync(resolve(root,source.extractedPath),'utf8')).pages
    .filter(p=>item.pages.includes(p.pdfPage)).map(p=>`### PDF p. ${p.pdfPage}\n${p.text}`).join('\n\n') : '';
  const errata = inventory.errata.filter(e=>e.sourceId===item.sourceId && e.pages.some(page=>item.pages.includes(page)));
  return `# Sessione ${item.id} — ${item.title}\n\n` +
    `Esegui soltanto questa sessione. Un blocco equivale a una sessione di ragionamento; il tetto è ${manifest.timeboxMinutes} minuti, con checkpoint entro il minuto ${manifest.checkpointMinutes}.\n\n` +
    `Leggi PIANO_APPUNTI_INTERATTIVI.md, README.md, manifest.json e checkpoints/BASE.md.\n` +
    `Obiettivo: ${item.objective}\n\n` +
    `Dipendenze concluse: ${item.dependencies.join(', ') || 'nessuna'}.\n` +
    `File consentiti: ${item.allowedPaths.join(', ')}.\n\n` +
    `Mantieni stabili i contratti Base in web/content/schema.ts, web/math/quadratic.ts e web/ui/. Aggiungi moduli e registra soltanto gli import necessari. Una correzione a un modulo concluso richiede motivazione nel checkpoint e verifica di regressione.\n\n` +
    `Consegna sezioni LessonSection complete (intuizione, formule/ipotesi, esempio, laboratorio, cosa osservare, riferimenti), laboratori con compute puro e mount/destroy, controlli accessibili e calcoli verificati. Aggiorna i soli stati realmente completati nell'inventario. Non dichiarare ottimo globale un candidato nonlineare senza giustificazione.\n\n` +
    `Criteri: ${item.acceptance.join('; ')}.\n\n` +
    `Salva checkpoints/${item.id}.md con decisioni, file, verifiche e residui. Esegui il runner finish solo quando il lavoro è completo. Non avviare automaticamente la sessione successiva.\n\n` +
    `Errata pertinenti:\n${errata.map(e=>`- PDF pp. ${e.pages.join(', ')}: ${e.note}`).join('\n') || '- Nessuno censito; controllare comunque le formule originali.'}\n\n` +
    (source ? `Fonte: ${source.filename}; pagine PDF ${item.pages[0]}–${item.pages.at(-1)}, copertina inclusa. Il testo estratto non certifica la resa delle equazioni: confrontale con il PDF.\n\n${pageText}\n` : '');
}

try {
  if (command==='next') {
    const active = manifest.sessions.find(s=>s.status==='in_progress');
    const next = active ?? manifest.sessions.find(s=>s.status==='pending' && ready(s));
    console.log(next ? `${next.id} — ${next.title}${active ? ' (in corso)' : ' (pronta)'}` : 'Tutte le sessioni sono concluse.');
  } else if (command==='status') {
    for (const item of manifest.sessions) console.log(`${item.id.padEnd(9)} ${item.status.padEnd(12)} ${item.title}${item.status==='in_progress' ? ` · ${elapsed(item).toFixed(1)} min` : ''}`);
  } else if (command==='prompt') {
    requireSession();
    if (!ready(session)) throw new Error('Dipendenze non ancora concluse.');
    if (option==='--save') {
      const path = resolve(root, 'checkpoints/prompts', `${session.id}.md`);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, prompt(session), 'utf8');
      console.log(`Prompt UTF-8 salvato: ${path}`);
    } else console.log(prompt(session));
  } else if (command==='start') {
    requireSession();
    if (!ready(session)) throw new Error('Dipendenze non ancora concluse.');
    if (session.status!=='pending') throw new Error('La sessione è già avviata o conclusa; non sovrascrivere il conteggio.');
    if (manifest.sessions.some(s=>s.status==='in_progress')) throw new Error('Un’altra sessione è in corso.');
    session.status='in_progress'; session.startedAt=now(); saveManifest();
    console.log(`Avviata ${session.id}; checkpoint entro ${manifest.checkpointMinutes} min, tetto ${manifest.timeboxMinutes} min.`);
  } else if (command==='watch') {
    requireSession();
    if (session.status!=='in_progress') throw new Error('Il monitor richiede una sessione in corso.');
    const timer = setInterval(() => {
      const fresh = JSON.parse(readFileSync(manifestPath,'utf8')).sessions.find(s=>s.id===id);
      if (fresh.status!=='in_progress') { clearInterval(timer); return; }
      const minutes = elapsed(fresh);
      console.log(`${now()} · ${id} · ${minutes.toFixed(1)} min${minutes>=manifest.checkpointMinutes ? ' · SALVARE IL CHECKPOINT E CHIUDERE IL PERIMETRO' : ''}`);
      if (minutes>=manifest.timeboxMinutes) { clearInterval(timer); process.exitCode=124; console.error('Tetto raggiunto. Il monitor segnala il limite; non interrompe altri processi.'); }
    }, 30000);
    console.log(`Monitor ${id} attivo; avvisi ogni 30 secondi. Ctrl+C termina soltanto il monitor.`);
  } else if (command==='finish') {
    requireSession();
    if (session.status!=='in_progress') throw new Error('Puoi concludere soltanto una sessione in corso.');
    for (const artifact of session.requiredArtifacts) if (!existsSync(resolve(root,artifact))) throw new Error(`Artefatto mancante: ${artifact}`);
    const npm = resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
    if (!existsSync(npm)) throw new Error('npm non trovato accanto a Node; esegui le verifiche usando una distribuzione Node con npm.');
    const preparation=spawnSync(process.execPath, [resolve(project,'scripts/prepare-sources.mjs')], { cwd: project, stdio:'inherit' });
    if (preparation.status!==0) throw new Error('Preparazione PDF fallita.');
    const checks=[];
    const report={ schemaVersion:1, sessionId:id, startedAt:now(), passed:false, checks };
    const reportPath=resolve(root, 'checkpoints', `${id}-validation.json`);
    for (const script of ['check:inventory','typecheck','test','test:browser','build']) {
      const startedAt=now();
      const result=spawnSync(process.execPath,[npm,'run',script],{ cwd:project, stdio:'inherit' });
      checks.push({ script, startedAt, finishedAt:now(), exitCode:result.status });
      atomicJson(reportPath,report);
      if (result.status!==0) throw new Error(`Verifica fallita: ${script}. Stato non avanzato.`);
    }
    report.passed=true; report.finishedAt=now();
    report.contractHashes=Object.fromEntries(manifest.frozenContracts.map(path=>[path,createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex')]));
    atomicJson(reportPath,report);
    session.status='completed'; session.completedAt=now(); session.validationReport=`checkpoints/${id}-validation.json`;
    if (id==='BASE') manifest.baseContractHashes=report.contractHashes;
    saveManifest();
    const next = manifest.sessions.find(s=>s.status==='pending' && ready(s));
    console.log(`Sessione ${id} conclusa: tutte le verifiche superate.${next ? ` Prepara il prossimo prompt con "session prompt ${next.id} --save".` : ''}`);
  } else throw new Error('Comandi: next | status | prompt ID [--save] | start ID | watch ID | finish ID');
} catch (error) { console.error(error.message); process.exitCode=1; }
