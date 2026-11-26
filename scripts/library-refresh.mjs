import { readFile, writeFile, mkdir, rename, rm, mkdtemp, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const usage = 'Uso: npm run library:refresh -- snapshot.zip [--rights autorizacoes.json] [--continuity continuidade.json] [--check] [--allow-removals] | --verify';
let source, rightsPath, continuityPath, check = false, verify = false, allowRemovals = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--allow-removals') allowRemovals = true;
  else if (args[i] === '--verify') verify = true;
  else if (args[i] === '--check') check = true;
  else if (args[i] === '--rights' && args[i + 1]) rightsPath = args[++i];
  else if (args[i] === '--continuity' && args[i + 1]) continuityPath = args[++i];
  else if (!args[i].startsWith('-') && !source) source = args[i];
  else throw new Error(usage);
}
if ((!source && !verify) || (source && verify)) { console.error(usage); process.exitCode = 1; }
else {
  const server = await createServer({ root, configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  let stage;
  try {
    const { verifyCatalog } = await server.ssrLoadModule('/src/reference/verify.ts');
    const { consolidateCatalog } = await server.ssrLoadModule('/src/reference/consolidate.ts');
    const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
    const dataDir = join(root, 'src/reference/generated');
    const oldBundle = await readJson(join(dataDir, 'catalog.json'));
    const oldManifest = await readJson(join(dataDir, 'manifest.json'));
    const verified = await verifyCatalog(oldBundle, oldManifest, async path => new Blob([await readFile(join(root, 'public', path))]));
    if (verify) { console.log(JSON.stringify(verified, null, 2)); }
    else {
      if ((await stat(source)).size > 96 * 1024 * 1024) throw new Error('ZIP maior que 96 MB.');
      const bytes = new Uint8Array(await readFile(source));
      const result = await consolidateCatalog(bytes, oldBundle, oldManifest, {
        rights: rightsPath ? await readJson(rightsPath) : [],
        continuity: continuityPath ? await readJson(continuityPath) : {},
      });
      console.log(JSON.stringify(result.report, null, 2));
      if (!check && !result.report.unchanged) {
        if (!allowRemovals && Object.values(result.report.changes).some(group => group.removed.length)) throw new Error('Identidades anteriores seriam removidas. Revise --continuity para conteúdos corrigidos; use --allow-removals somente para exclusões reais aprovadas.');
        // Validate everything before touching output. Assets are content addressed; write them first.
        stage = await mkdtemp(join(root, '.library-refresh-'));
        for (const asset of result.assets) {
          const target = join(root, 'public', asset.path);
          await mkdir(dirname(target), { recursive: true }); await writeFile(target, asset.bytes);
        }
        for (const [name, value] of [['catalog.json', result.bundle], ['manifest.json', result.manifest], ['report.json', result.report]]) {
          await writeFile(join(stage, name), JSON.stringify(value, null, 2) + '\n');
        }
        const originals = new Map();
        for (const name of ['catalog.json', 'manifest.json', 'report.json']) originals.set(name, await readFile(join(dataDir, name)).catch(error => { if (error.code === 'ENOENT') return null; throw error; }));
        try {
          for (const name of originals.keys()) await rename(join(stage, name), join(dataDir, name));
        } catch (error) {
          for (const [name, bytes] of originals) {
            if (bytes === null) await rm(join(dataDir, name), { force: true });
            else { await writeFile(join(stage, name), bytes); await rename(join(stage, name), join(dataDir, name)); }
          }
          throw error;
        }
        // Only remove previously catalogued assets, never arbitrary files under public/.
        for (const asset of oldBundle.images) if (!result.assets.some(a => a.path === asset.path) && /^images\/reference-library\/[a-f0-9]{64}\.(jpg|png|webp)$/.test(asset.path)) await rm(join(root, 'public', asset.path), { force: true });
      }
    }
  } catch (error) {
    // Do not echo private input paths in the distribution report or error text.
    console.error(error?.code ? `Falha de leitura/escrita (${error.code}). Confira os arquivos locais.` : error instanceof Error ? error.message : 'Falha na consolidação.');
    process.exitCode = 1;
  } finally {
    if (stage) await rm(stage, { recursive: true, force: true });
    await server.close();
  }
}
