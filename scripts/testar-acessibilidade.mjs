// Acessibilidade: axe-core em todas as telas (visitante e cada perfil, 1366 px e 390 px)
// e navegação só por teclado (Tab, Enter, Esc) no login, mural, contato e menu do celular.
// Uso: node scripts/testar-acessibilidade.mjs [endereço do portal]
// O painel do Looker (iframe de outro site) fica fora da análise. Não envia e-mails.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = (process.argv[2] || 'https://cpa.marcosfc.site').replace(/\/+$/, '');
const NAVEGADOR = process.env.NAVEGADOR || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const SENHA = process.env.DEMO_SENHA || 'CPA-Impacta-2026';
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const res = [];
const violacoes = [];
let grupo = '';
const ok = (nome, cond, extra = '') => res.push({ grupo, nome, ok: !!cond, extra: String(extra ?? '').slice(0, 200) });
const browser = await puppeteer.launch({ executablePath: NAVEGADOR, headless: 'new' });

async function nova(modo) {
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport(modo === 'mobile' ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1366, height: 900 });
  p.ctx = ctx; p.modo = modo;
  return p;
}
async function abrir(p, hash) {
  await p.goto('about:blank');
  await p.goto(`${BASE}/#${hash}`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.querySelector('main')?.getAttribute('aria-busy') === 'false' && !document.querySelector('main .sk-cartao, main .sk-fila'), { timeout: 20000 });
  await espera(700);
}
async function ir(p, hash) {
  await p.evaluate((h) => { location.hash = h; }, hash);
  await p.waitForFunction(() => !document.querySelector('main .sk-cartao, main .sk-fila, .anima'), { timeout: 15000 }).catch(() => {});
  await espera(900);
}
// Roda o axe na tela atual; abre os quadros de administração para analisar os formulários
async function analisar(p, tela) {
  await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
  await p.evaluate(AXE);
  const r = await p.evaluate(async () => {
    const out = await window.axe.run(document, { exclude: [['iframe']], resultTypes: ['violations'] });
    return out.violations.map((v) => ({ id: v.id, impacto: v.impact, nos: v.nodes.length, exemplo: v.nodes[0]?.target?.join(' ') + ' | ' + (v.nodes[0]?.failureSummary || '').split('\n').slice(0, 2).join(' ') }));
  });
  for (const v of r) violacoes.push({ tela: `${tela} (${p.modo})`, ...v });
  const graves = r.filter((v) => v.impacto === 'serious' || v.impacto === 'critical');
  ok(`${tela}: sem violações sérias ou críticas`, graves.length === 0, graves.map((v) => `${v.id}×${v.nos}`).join(', '));
}
async function entrar(p, conta) {
  await abrir(p, 'login');
  await p.click('[data-act="login-demo"]');
  await p.waitForSelector('#demo-email');
  await p.type('#demo-email', `${conta}@cpa.marcosfc.site`);
  await p.type('#demo-senha', SENHA);
  await p.click('#btn-senha');
  await p.waitForFunction(() => location.hash === '#dashboards' && /Dashboards/.test(document.querySelector('main h1')?.textContent || ''), { timeout: 20000 });
  await espera(1500);
}
async function sair(p) { await p.evaluate(() => document.querySelector('[data-act="sair"]').click()); await espera(800); }

async function axeTodas(modo) {
  grupo = `axe-core (${modo})`;
  const p = await nova(modo);
  await p.setRequestInterception(true);
  p.on('request', (r) => (/\/api\/(send-code|contato)$/.test(r.url()) ? r.respond({ status: 200, contentType: 'application/json', body: '{"ok":true}' }) : r.continue()));
  for (const h of ['mural', 'relatorios', 'contato', 'login']) { await abrir(p, h); await analisar(p, `visitante/${h}`); }
  await p.click('[data-act="login-demo"]'); await espera(400);
  await analisar(p, 'visitante/login-demonstracao');
  await p.click('[data-act="login-codigo"]'); await espera(300);
  await p.type('#login-email', 'nome.sobrenome@aluno.impacta.edu.br'); await p.click('#btn-codigo');
  await p.waitForSelector('#codigo input'); await espera(400);
  await analisar(p, 'visitante/login-codigo');
  if (modo === 'mobile') {
    await abrir(p, 'mural');
    await p.click('[data-act="menu-abrir"]'); await espera(500);
    await analisar(p, 'visitante/menu-aberto');
  }
  await p.ctx.close();
  for (const conta of ['aluno.demo', 'coord.demo', 'avaliador.demo']) {
    const q = await nova(modo);
    await entrar(q, conta);
    await analisar(q, `${conta}/dashboards`);
    await sair(q); await q.ctx.close();
  }
  const a = await nova(modo);
  await entrar(a, 'admin.demo');
  await analisar(a, 'admin.demo/dashboards');
  for (const h of ['mural', 'relatorios', 'contato']) { await ir(a, h); await analisar(a, `admin.demo/${h}`); }
  await ir(a, 'acessos'); await a.waitForSelector('table', { timeout: 15000 }); await espera(500);
  for (const aba of ['pessoas', 'avaliadores', 'visibilidade', 'historico', 'mensagens']) {
    await a.evaluate((x) => document.querySelector(`[data-act="aba"][data-id="${x}"]`).click(), aba); await espera(500);
    await analisar(a, `admin.demo/acessos-${aba}`);
  }
  await sair(a); await a.ctx.close();
}

// Pressiona Tab até o foco chegar no seletor (ou desistir); devolve quantas teclas foram usadas
async function tabAte(p, seletor, max = 40) {
  for (let i = 1; i <= max; i++) {
    await p.keyboard.press('Tab');
    if (await p.evaluate((s) => document.activeElement?.matches(s), seletor)) return i;
  }
  return -1;
}
const focoVisivel = (p) => p.evaluate(() => {
  const e = document.activeElement; const c = getComputedStyle(e);
  return (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0) || (c.boxShadow && c.boxShadow !== 'none');
});

async function teclado() {
  grupo = 'Teclado (1366 px)';
  const p = await nova('desktop');
  await p.setRequestInterception(true);
  p.on('request', (r) => (/\/api\/(send-code|contato)$/.test(r.url()) ? r.respond({ status: 200, contentType: 'application/json', body: '{"ok":true}' }) : r.continue()));
  await abrir(p, 'mural');
  await p.keyboard.press('Tab');
  await espera(400);
  ok('1º Tab vai para "Pular para o conteúdo" e ele aparece', await p.evaluate(() => document.activeElement.classList.contains('pular') && document.activeElement.getBoundingClientRect().top >= 0));
  await p.keyboard.press('Enter'); await espera(200);
  ok('Enter no "Pular" leva o foco ao conteúdo', await p.evaluate(() => document.activeElement.id === 'app' || document.activeElement.closest('#app')));
  // Mural: busca e filtro
  const nb = await tabAte(p, '#busca-mural');
  ok('mural: chega na busca com Tab', nb > 0, nb + ' Tab');
  ok('mural: foco visível na busca', await focoVisivel(p));
  await p.keyboard.type('biblioteca'); await espera(300);
  ok('mural: busca filtra pelo teclado', (await p.$$('.devolutiva')).length === 1);
  await p.keyboard.press('Tab');
  ok('mural: próximo Tab vai para os filtros', await p.evaluate(() => document.activeElement.getAttribute('data-act') === 'filtro'));
  await p.keyboard.press('Tab'); await p.keyboard.press('Enter'); await espera(200);
  ok('mural: Enter aplica o filtro "Resolvidas"', await p.evaluate(() => document.querySelector('[data-act="filtro"][data-id="Resolvido"]').getAttribute('aria-pressed') === 'true'));
  // Login por código só com teclado
  await abrir(p, 'login');
  const nl = await tabAte(p, '#login-email');
  ok('login: chega no e-mail com Tab', nl > 0, nl + ' Tab');
  await p.keyboard.type('nome.sobrenome@aluno.impacta.edu.br');
  await p.keyboard.press('Enter');
  await p.waitForSelector('#codigo input');
  ok('login: Enter envia e o foco vai para a 1ª caixa do código', await p.evaluate(() => document.activeElement.matches('#codigo input[data-i="0"]')));
  await p.keyboard.type('12');
  ok('login: digitar avança de caixa sozinho', await p.evaluate(() => document.activeElement.matches('#codigo input[data-i="2"]')));
  await p.keyboard.press('Backspace'); await p.keyboard.press('Backspace');
  ok('login: Backspace volta de caixa', await p.evaluate(() => document.activeElement.matches('#codigo input[data-i="0"]') || document.activeElement.matches('#codigo input[data-i="1"]')));
  // Acesso de demonstração só com teclado
  await abrir(p, 'login');
  const nd = await tabAte(p, '[data-act="login-demo"]');
  ok('demonstração: chega no link com Tab', nd > 0, nd + ' Tab');
  await p.keyboard.press('Enter'); await espera(300);
  ok('demonstração: Enter abre o formulário e foca o e-mail', await p.evaluate(() => document.activeElement.id === 'demo-email'));
  await p.keyboard.type('aluno.demo@cpa.marcosfc.site'); await p.keyboard.press('Tab'); await p.keyboard.type(SENHA); await p.keyboard.press('Enter');
  await p.waitForFunction(() => location.hash === '#dashboards' && /Dashboards/.test(document.querySelector('main h1')?.textContent || ''), { timeout: 20000 });
  ok('demonstração: entra só com teclado', true);
  await espera(1200);
  const tab = await tabAte(p, '[role="tab"][aria-selected="true"]');
  ok('dashboards: chega nas abas com Tab', tab > 0, tab + ' Tab');
  await p.keyboard.press('ArrowRight'); await espera(400);
  ok('dashboards: seta → troca de aba', await p.evaluate(() => document.activeElement.getAttribute('role') === 'tab' && document.activeElement.getAttribute('aria-selected') === 'true' && document.activeElement.textContent === 'Aluno(a) EAD'));
  await sair(p);
  // Contato só com teclado
  await abrir(p, 'contato');
  const nc = await tabAte(p, '#f-nome');
  ok('contato: chega no nome com Tab', nc > 0, nc + ' Tab');
  await p.keyboard.type('Teste Teclado'); await p.keyboard.press('Tab'); await p.keyboard.type('teclado@exemplo.com');
  await p.keyboard.press('Tab'); await p.keyboard.type('Mensagem escrita só com o teclado.');
  ok('contato: campo-armadilha fora da ordem do Tab', await p.$eval('#f-site', (e) => e.tabIndex === -1));
  const ns = await tabAte(p, 'form[data-form="contato"] [type=submit]', 3);
  ok('contato: Tab chega no botão Enviar', ns > 0, ns + ' Tab');
  await p.keyboard.press('Enter');
  await p.waitForSelector('.obrigado', { timeout: 10000 });
  ok('contato: Enter envia (envio simulado)', true);
  await p.ctx.close();

  grupo = 'Teclado (390 px)';
  const m = await nova('mobile');
  await abrir(m, 'mural');
  const nm = await tabAte(m, '[data-act="menu-abrir"]');
  ok('menu: chega no botão com Tab', nm > 0, nm + ' Tab');
  await m.keyboard.press('Enter'); await espera(500);
  ok('menu: Enter abre e o foco vai ao 1º link', await m.evaluate(() => document.querySelector('#gaveta').classList.contains('aberta') && document.activeElement.closest('#gaveta nav')));
  ok('menu: botão informa aria-expanded=true', await m.$eval('[data-act="menu-abrir"]', (b) => b.getAttribute('aria-expanded') === 'true'));
  await m.keyboard.press('Escape'); await espera(400);
  ok('menu: Esc fecha e devolve o foco ao botão', await m.evaluate(() => !document.querySelector('#gaveta').classList.contains('aberta') && document.activeElement.matches('[data-act="menu-abrir"]')));
  await m.ctx.close();
}

try {
  await axeTodas('desktop');
  await axeTodas('mobile');
  await teclado();
} catch (e) {
  ok('erro inesperado', false, e.stack || e.message);
} finally {
  await browser.close();
}

const resumo = {};
for (const v of violacoes) {
  const k = `${v.id} [${v.impacto}]`;
  resumo[k] = resumo[k] || { telas: 0, nos: 0, exemplo: v.exemplo };
  resumo[k].telas++; resumo[k].nos += v.nos;
}
console.log('## Violações do axe (todas as gravidades)');
for (const [k, v] of Object.entries(resumo)) console.log(`${k}: ${v.telas} tela(s), ${v.nos} elemento(s) — ex.: ${v.exemplo}`);
if (!violacoes.length) console.log('nenhuma');
let g = '';
for (const x of res) {
  if (x.grupo !== g) { g = x.grupo; console.log(`\n## ${g}`); }
  console.log(`${x.ok ? 'OK   ' : 'FALHA'} ${x.nome}${x.extra ? '  (' + x.extra + ')' : ''}`);
}
const n = res.filter((x) => !x.ok).length;
console.log(`\n${res.length - n} de ${res.length} verificações passaram.`);
process.exit(n ? 1 : 0);
