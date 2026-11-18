// Roda "node --check" em todos os arquivos .js e .mjs do projeto.
import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ignorar = new Set(['node_modules', '.git', '.vercel']);
const arquivos = [];

(function varrer(pasta) {
  for (const nome of readdirSync(pasta)) {
    if (ignorar.has(nome)) continue;
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) varrer(caminho);
    else if (/\.(m?js)$/.test(nome)) arquivos.push(caminho);
  }
})(raiz);

let falhas = 0;
for (const arquivo of arquivos) {
  try {
    execFileSync(process.execPath, ['--check', arquivo], { stdio: 'pipe' });
    console.log('ok   ', arquivo.slice(raiz.length + 1));
  } catch (e) {
    falhas++;
    console.error('ERRO ', arquivo.slice(raiz.length + 1), '\n', e.stderr?.toString());
  }
}
process.exit(falhas ? 1 : 0);
