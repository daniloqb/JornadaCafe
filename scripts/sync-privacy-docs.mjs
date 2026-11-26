import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('Use somente --check ou nenhum argumento.');
const source = 'public/politica-de-privacidade.html';
const html = readFileSync(resolve(root, source), 'utf8');
const config = JSON.parse(readFileSync(resolve(root, 'config/privacy.json'), 'utf8'));
for (const value of [config.developer, config.email, config.effectiveDate, config.updatedAt]) {
  if (!value || !html.includes(value)) throw new Error('Identificação/datas da política divergem de config/privacy.json.');
}
if (config.publicUrl && (!config.publicUrl.startsWith('https://') || !config.publicUrlVerifiedAt)) {
  throw new Error('Configure somente uma URL HTTPS realmente verificada e a data da verificação.');
}

// The complete policy stays in public/ for offline use. Only font paths differ in docs/.
const publicPolicy = html.replaceAll("url('fonts/", "url('assets/fontes/");
const copies = [
  ['public/fonts/dm-sans-latin-wght-normal.woff2', 'docs/assets/fontes/dm-sans-latin-wght-normal.woff2'],
  ['public/fonts/fraunces-latin-wght-normal.woff2', 'docs/assets/fontes/fraunces-latin-wght-normal.woff2'],
  ['public/licenses/DM-Sans-OFL.txt', 'docs/assets/licencas/DM-Sans-OFL.txt'],
  ['public/licenses/Fraunces-OFL.txt', 'docs/assets/licencas/Fraunces-OFL.txt'],
];
const allowed = new Set(copies.map(([, destination]) => destination));
const assets = resolve(root, 'docs/assets');
function auditAssets(directory) {
  if (!existsSync(directory)) return;
  if (!lstatSync(directory).isDirectory() || lstatSync(directory).isSymbolicLink()) throw new Error('Assets deve ser um diretório real.');
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) auditAssets(path);
    else if (!entry.isFile() || !allowed.has(path.slice(root.length + 1))) throw new Error(`Arquivo não aprovado nos assets públicos: ${path.slice(root.length + 1)}`);
  }
}
auditAssets(assets);
for (const [origin, destination] of copies) {
  if (!lstatSync(resolve(root, origin)).isFile()) throw new Error(`Fonte inválida: ${origin}`);
  const target = resolve(root, destination);
  if (existsSync(target) && !lstatSync(target).isFile()) throw new Error(`Destino inválido: ${destination}`);
  if (check) {
    if (!existsSync(target) || !readFileSync(target).equals(readFileSync(resolve(root, origin)))) throw new Error(`Cópia divergente: ${destination}. Execute npm run privacy:site.`);
  } else {
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(resolve(root, origin), target);
  }
}
const target = resolve(root, 'docs/politica-de-privacidade.html');
if (existsSync(target) && !lstatSync(target).isFile()) throw new Error('A política pública deve ser um arquivo real.');
if (check) {
  if (!existsSync(target) || readFileSync(target, 'utf8') !== publicPolicy) throw new Error('Política pública desatualizada. Execute npm run privacy:site.');
} else {
  writeFileSync(target, publicPolicy);
}
if (existsSync(resolve(root, 'docs/.nojekyll'))) throw new Error('Não use .nojekyll: ele desativaria as exclusões dos relatórios internos.');
const pagesConfig = readFileSync(resolve(root, 'docs/_config.yml'), 'utf8');
const expectedConfig = '# Publicação padrão do GitHub Pages por main /docs.\n# Apenas estes HTMLs e assets públicos entram no site; relatórios e previews ficam no Git.\nexclude: ["*"]\ninclude: ["index.html", "politica-de-privacidade.html", "assets"]\n';
if (pagesConfig !== expectedConfig) throw new Error('Revise docs/_config.yml: a publicação deve manter a lista restrita de HTMLs e assets.');
if (!existsSync(resolve(root, 'docs/index.html'))) throw new Error('Página inicial ausente.');
console.log(check ? 'Política local/pública e fontes sincronizadas; lista pública verificada.' : 'Política sincronizada em docs/; nenhuma publicação executada.');
