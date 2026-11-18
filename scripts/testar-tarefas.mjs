// Testes de tarefa por perfil (cenários realistas), executados no navegador como um usuário
// faria: só cliques e digitação na tela, contando cliques, campos preenchidos e tempo.
// Uso: node scripts/testar-tarefas.mjs [endereço do portal]
// É uma simulação automatizada (não substitui teste com pessoas). O tempo inclui pausas fixas
// do script (250 ms depois de cada clique, 300 a 600 ms depois de abrir o menu ou de uma busca). Não envia e-mails: o envio
// do formulário de contato é simulado no navegador. Apaga o que criar.

import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import puppeteer from 'puppeteer-core';
import pg from 'pg';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const nome of ['.env.local', '.env']) {
  const f = join(raiz, nome);
  if (!existsSync(f)) continue;
  for (const l of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
}
const BASE = (process.argv[2] || 'https://cpa.marcosfc.site').replace(/\/+$/, '');
const NAVEGADOR = process.env.NAVEGADOR || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const SENHA = process.env.DEMO_SENHA || 'CPA-Impacta-2026';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const db = new pg.Client({ connectionString: process.env.POSTGRES_URL_NON_POOLING.replace(/[?&]sslmode=[^&]*/, ''), ssl: { rejectUnauthorized: false } });
await db.connect();
const pdf = join(tmpdir(), 'portal-cpa-tarefa.pdf');
writeFileSync(pdf, '%PDF-1.4\n%tarefa\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
const browser = await puppeteer.launch({ executablePath: NAVEGADOR, headless: 'new' });
const resultados = [];
const criados = [];

async function nova(modo) {
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport(modo === 'mobile' ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1366, height: 900 });
  p.ctx = ctx; p.modo = modo; p.cliques = 0; p.campos = 0;
  return p;
}
async function clicar(p, seletor) { await p.waitForSelector(seletor, { visible: true, timeout: 15000 }); await p.click(seletor); p.cliques++; await espera(250); }
async function digitar(p, seletor, texto) { await p.waitForSelector(seletor, { visible: true, timeout: 15000 }); await p.type(seletor, texto); p.campos++; }
// Navega pelo menu como a pessoa faria (no celular, abre o menu antes)
async function menu(p, rota) {
  if (p.modo === 'mobile') { await clicar(p, '[data-act="menu-abrir"]'); await espera(300); await clicar(p, `#gaveta a[href="#${rota}"]`); }
  else await clicar(p, `nav.menu a[href="#${rota}"]`);
  await espera(600);
}
async function abrir(p) {
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.querySelector('main')?.getAttribute('aria-busy') === 'false' && !document.querySelector('main .sk-cartao, main .sk-fila'), { timeout: 20000 });
  await espera(500);
}
async function entrar(p, conta) {
  if (p.modo === 'mobile') { await clicar(p, '[data-act="menu-abrir"]'); await clicar(p, '#gaveta a[href="#login"]'); }
  else await clicar(p, '.quem a[href="#login"]');
  await clicar(p, '[data-act="login-demo"]');
  await digitar(p, '#demo-email', `${conta}@cpa.marcosfc.site`);
  await digitar(p, '#demo-senha', SENHA);
  await clicar(p, '#btn-senha');
  await p.waitForFunction(() => location.hash === '#dashboards' && /Dashboards/.test(document.querySelector('main h1')?.textContent || ''), { timeout: 20000 });
  await espera(800);
}
async function tarefa(nome, perfil, modo, passos) {
  const p = await nova(modo);
  let sucesso = false, obs = '';
  await abrir(p);
  p.inicio = Date.now();
  try { const r = await passos(p); sucesso = r === true || (r && r.ok); obs = (r && r.obs) || ''; }
  catch (e) { obs = e.message.split('\n')[0]; }
  const seg = ((Date.now() - p.inicio) / 1000).toFixed(1);
  resultados.push({ nome, perfil, modo, sucesso, cliques: p.cliques, campos: p.campos, seg, obs });
  await p.ctx.close();
}

for (const modo of ['desktop', 'mobile']) {
  await tarefa('Entrar com a conta de demonstração', 'aluno', modo, async (p) => {
    await entrar(p, 'aluno.demo');
    return { ok: (await p.$$('#app [role="tab"]')).length === 2 };
  });
  await tarefa('Encontrar a devolutiva da biblioteca', 'aluno', modo, async (p) => {
    await entrar(p, 'aluno.demo');
    p.cliques = 0; p.campos = 0; p.inicio = Date.now();
    await menu(p, 'mural');
    await digitar(p, '#busca-mural', 'biblioteca');
    await espera(300);
    const cards = await p.$$eval('.devolutiva', (c) => c.map((x) => x.textContent));
    return { ok: cards.length === 1 && /Biblioteca/.test(cards[0]) && /22h/.test(cards[0]), obs: 'tempo e cliques contados depois do login' };
  });
  await tarefa('Abrir o painel de professores', 'coordenação', modo, async (p) => {
    await entrar(p, 'coord.demo');
    p.cliques = 0; p.campos = 0; p.inicio = Date.now();
    await p.evaluate(() => [...document.querySelectorAll('#app [role="tab"]')].find((b) => b.textContent === 'Professores').setAttribute('data-alvo', '1'));
    await clicar(p, '[data-alvo="1"]');
    const src = await p.$eval('#painel-dash iframe', (f) => f.src);
    return { ok: src.includes('ee6a7999'), obs: 'tempo e cliques contados depois do login; o conteúdo do Looker depende da conta Google' };
  });
  await tarefa('Baixar o relatório trienal', 'avaliador externo', modo, async (p) => {
    await entrar(p, 'avaliador.demo');
    p.cliques = 0; p.campos = 0; p.inicio = Date.now();
    const pasta = join(tmpdir(), `portal-cpa-download-${modo}-${Date.now()}`);
    mkdirSync(pasta, { recursive: true });
    const cdp = await p.createCDPSession();
    await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: pasta });
    await menu(p, 'relatorios');
    await p.evaluate(() => [...document.querySelectorAll('.doc')].find((d) => /Trienal/.test(d.textContent)).querySelector('a[download]').setAttribute('data-alvo', '1'));
    await clicar(p, '[data-alvo="1"]');
    let arquivo = '';
    for (let i = 0; i < 60 && !arquivo; i++) { await espera(500); arquivo = readdirSync(pasta).find((f) => f.endsWith('.pdf')) || ''; }
    const ini = arquivo ? readFileSync(join(pasta, arquivo)).subarray(0, 5).toString() : '';
    return { ok: ini === '%PDF-', obs: arquivo ? `arquivo salvo: ${arquivo}` : 'download não concluído' };
  });
  await tarefa('Publicar devolutiva e enviar PDF', 'administração', modo, async (p) => {
    await entrar(p, 'admin.demo');
    p.cliques = 0; p.campos = 0; p.inicio = Date.now();
    await menu(p, 'mural');
    await clicar(p, 'details.admin > summary');
    await digitar(p, '#m-area', 'Tarefa automatizada');
    await digitar(p, '#m-dem', 'Demanda usada no teste de tarefa.');
    await digitar(p, '#m-res', 'Resposta usada no teste de tarefa.');
    await clicar(p, 'form[data-form="mural-novo"] [type=submit]');
    await p.waitForFunction(() => /Tarefa automatizada/.test(document.querySelector('#mural-grade')?.textContent || ''), { timeout: 15000 });
    await menu(p, 'relatorios');
    await clicar(p, 'details.admin > summary');
    await digitar(p, '#r-titulo', 'Boletim da tarefa automatizada');
    await (await p.$('#r-arquivo')).uploadFile(pdf); p.campos++;
    await clicar(p, 'form[data-form="rel-novo"] [type=submit]');
    await p.waitForFunction(() => /Boletim da tarefa automatizada/.test(document.querySelector('main')?.textContent || ''), { timeout: 20000 });
    const m = await db.query(`delete from mural where area = 'Tarefa automatizada'`);
    const r = await db.query(`delete from relatorios where titulo = 'Boletim da tarefa automatizada' returning arquivo_url`);
    criados.push(...r.rows.map((x) => x.arquivo_url));
    return { ok: m.rowCount === 1 && r.rowCount === 1, obs: 'tempo e cliques contados depois do login' };
  });
  await tarefa('Mandar mensagem para a CPA', 'visitante', modo, async (p) => {
    await p.setRequestInterception(true);
    p.on('request', (r) => (r.url().endsWith('/api/contato') ? r.respond({ status: 200, contentType: 'application/json', body: '{"ok":true}' }) : r.continue()));
    await menu(p, 'contato');
    await digitar(p, '#f-nome', 'Visitante de Teste');
    await digitar(p, '#f-email', 'visitante@exemplo.com');
    await digitar(p, '#f-msg', 'Quando sai o próximo relatório da CPA?');
    await clicar(p, 'form[data-form="contato"] [type=submit]');
    await p.waitForSelector('.obrigado', { timeout: 10000 });
    return { ok: true, obs: 'envio simulado no navegador (sem e-mail real)' };
  });
}

// limpeza
const rel = await db.query(`delete from relatorios where titulo = 'Boletim da tarefa automatizada' returning arquivo_url`);
await db.query(`delete from mural where area = 'Tarefa automatizada'`);
rel.rows.push(...criados.map((arquivo_url) => ({ arquivo_url })));
if (rel.rows.length) {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const nomes = rel.rows.map((r) => decodeURIComponent(r.arquivo_url.split('/object/public/relatorios/')[1] || '')).filter(Boolean);
  await sb.storage.from('relatorios').remove(nomes);
}
await db.end();
await browser.close();

console.log('| Tarefa | Perfil | Tela | Sucesso | Cliques | Campos preenchidos | Tempo (s) | Observação |');
console.log('|---|---|---|:-:|:-:|:-:|:-:|---|');
for (const r of resultados) console.log(`| ${r.nome} | ${r.perfil} | ${r.modo === 'mobile' ? '390 px' : '1366 px'} | ${r.sucesso ? 'sim' : 'NÃO'} | ${r.cliques} | ${r.campos} | ${r.seg} | ${r.obs} |`);
const n = resultados.filter((r) => !r.sucesso).length;
console.log(`\n${resultados.length - n} de ${resultados.length} tarefas concluídas.`);
process.exit(n ? 1 : 0);
