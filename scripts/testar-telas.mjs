// Teste das telas no navegador (produção) e geração dos prints de docs/img.
// Uso: node scripts/testar-telas.mjs [endereço do portal]
// Precisa do Edge ou Chrome instalado (variável NAVEGADOR com o caminho do executável, se
// não for o Edge padrão do Windows) e das variáveis do .env.local (para preparar e limpar
// dados de teste). Entra pelas contas de demonstração preenchendo e-mail e senha na tela.
// Não envia e-mails: os envios de código e de contato nas telas são simulados no navegador.

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
const DIR = { desktop: join(raiz, 'docs', 'img'), mobile: join(raiz, 'docs', 'img', 'mobile') };
for (const d of Object.values(DIR)) mkdirSync(d, { recursive: true });

const db = new pg.Client({ connectionString: process.env.POSTGRES_URL_NON_POOLING.replace(/[?&]sslmode=[^&]*/, ''), ssl: { rejectUnauthorized: false } });
await db.connect();

const res = [];
let grupo = '';
const ok = (nome, cond, extra = '') => res.push({ grupo, nome, ok: !!cond, extra: String(extra ?? '').slice(0, 160) });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const pdfTeste = join(tmpdir(), 'portal-cpa-teste.pdf');
writeFileSync(pdfTeste, '%PDF-1.4\n%teste\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
const txtTeste = join(tmpdir(), 'portal-cpa-teste.txt');
writeFileSync(txtTeste, 'arquivo de texto');
const pdfGrande = join(tmpdir(), 'portal-cpa-grande.pdf');
writeFileSync(pdfGrande, Buffer.alloc(51 * 1024 * 1024, 32));

const browser = await puppeteer.launch({ executablePath: NAVEGADOR, headless: 'new', args: ['--no-first-run'] });

// Troca dados pessoais reais que aparecem na administração por textos fictícios
async function mascarar(p) {
  await p.evaluate(() => {
    const trocas = [[/marcos\.pires@aluno\.impacta\.edu\.br/g, 'dono.portal@aluno.impacta.edu.br'], [/Marcos Felipe Choppick Pires/g, 'Dono do Portal']];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { let t = w.currentNode.nodeValue; for (const [a, b] of trocas) t = t.replace(a, b); w.currentNode.nodeValue = t; }
    document.querySelectorAll('[title]').forEach((el) => { el.title = el.title.replace(trocas[0][0], trocas[0][1]); });
  });
}

async function nova(modo) {
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport(modo === 'mobile' ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1366, height: 900 });
  p.erros = [];
  p.on('pageerror', (e) => p.erros.push(e.message));
  p.on('console', (m) => {
    const url = m.location()?.url || '';
    if (m.type() === 'error' && !/google|gstatic|looker|datastudio/i.test(url) && !/Failed to load resource/i.test(m.text())) p.erros.push(m.text());
  });
  p.modo = modo;
  p.ctx = ctx;
  return p;
}

async function print(p, nome, inteira = true) {
  await mascarar(p);
  if (inteira) await p.evaluate(() => window.scrollTo(0, 0));
  await espera(250);
  await p.screenshot({ path: join(DIR[p.modo], nome + '.png'), fullPage: inteira });
  if (p.modo === 'mobile') {
    const larg = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(`${nome}: sem rolagem horizontal em 390px`, larg <= 390, larg + 'px');
  }
}

async function ir(p, hash, seletor = 'main h1, main h2') {
  await p.evaluate((h) => { location.hash = h; }, hash);
  await p.waitForSelector(seletor, { timeout: 15000 });
  await espera(600);
}

async function abrir(p, hash = 'mural') {
  await p.goto(`${BASE}/#${hash}`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.querySelector('main')?.getAttribute('aria-busy') === 'false', { timeout: 20000 });
  if (hash === 'mural') await p.waitForSelector('.devolutiva, .vazio', { timeout: 20000 });
  await espera(900);
}

async function entrar(p, conta) {
  await abrir(p, 'login');
  await p.click('[data-act="login-demo"]');
  await p.waitForSelector('#demo-email');
  await p.type('#demo-email', `${conta}@cpa.marcosfc.site`);
  await p.type('#demo-senha', SENHA);
  await p.click('#btn-senha');
  await p.waitForFunction(() => location.hash === '#dashboards' && /Dashboards/.test(document.querySelector('main h1')?.textContent || ''), { timeout: 20000 });
  await espera(2500);
}

async function sair(p) {
  await p.evaluate(() => document.querySelector('[data-act="sair"]').click());
  await p.waitForFunction(() => location.hash === '#mural' && document.querySelector('a[href="#login"]'), { timeout: 10000 });
}

const abas = (p) => p.$$eval('#app [role="tab"]', (b) => b.map((x) => x.textContent.trim()));
const texto = (p, s = 'main') => p.$eval(s, (e) => e.innerText);

async function publico(modo) {
  grupo = `Público (${modo})`;
  const p = await nova(modo);
  await abrir(p, 'mural');
  ok('mural carrega devolutivas', (await p.$$('.devolutiva')).length >= 3);
  ok('sem botões de administração', (await p.$$('[data-act="mural-status"]')).length === 0);
  ok('menu sem "Dashboards" e sem "Acessos e Perfis"', !(await p.$('a[href="#dashboards"]')) && !(await p.$('a[href="#acessos"]')));
  await print(p, '01-mural');
  await p.click('[data-act="filtro"][data-id="Resolvido"]');
  await espera(300);
  ok('filtro "Resolvidas"', (await p.$$eval('.devolutiva', (d) => d.every((x) => x.classList.contains('feito')))));
  await print(p, '02-mural-filtro');
  await p.click('[data-act="filtro"][data-id="Todos"]');
  await p.type('#busca-mural', 'xyzxyz');
  await espera(300);
  ok('busca sem resultado mostra aviso', /Nada encontrado/.test(await texto(p)));
  await print(p, '03-mural-busca-vazia');
  await p.click('#busca-mural', { clickCount: 3 });
  await p.keyboard.press('Backspace');
  await ir(p, 'relatorios', '.doc');
  ok('relatórios: 3 PDFs com botões de baixar', (await p.$$('.doc a[download]')).length >= 3);
  await print(p, '04-relatorios');
  await ir(p, 'contato', '#f-nome');
  ok('contato mostra horário e links', /Google Chat/.test(await texto(p)));
  await print(p, '05-contato');
  await p.click('form[data-form="contato"] [type=submit]');
  await espera(300);
  ok('contato vazio: erro de validação', /Informe o seu nome/.test(await texto(p, '#f-erro')));
  await print(p, '06-contato-erro');
  await p.setRequestInterception(true);
  p.on('request', (r) => (r.url().endsWith('/api/contato') ? r.respond({ status: 200, contentType: 'application/json', body: '{"ok":true}' }) : r.continue()));
  await p.type('#f-nome', 'Visitante de Teste');
  await p.type('#f-email', 'visitante@exemplo.com');
  await p.type('#f-msg', 'Gostaria de saber quando sai o próximo relatório da CPA.');
  await p.click('form[data-form="contato"] [type=submit]');
  await p.waitForSelector('.obrigado');
  ok('contato enviado: confirmação (envio simulado)', true);
  await print(p, '07-contato-enviado');
  if (modo === 'mobile') {
    await p.click('[data-act="menu-abrir"]');
    await espera(500);
    ok('menu do celular abre', await p.$eval('#gaveta', (g) => g.classList.contains('aberta')));
    await print(p, '08-menu-aberto', false);
    await p.keyboard.press('Escape');
    await espera(400);
  }
  await ir(p, 'mural', '.devolutiva');
  for (let i = 0; i < 2; i++) await p.evaluate(() => document.querySelector('[data-act="fonte-mais"]').click());
  const esc = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--escala').trim());
  ok('A+ aumenta a letra', esc === '1.2', esc);
  await print(p, '09-letra-maior', false);
  for (let i = 0; i < 2; i++) await p.evaluate(() => document.querySelector('[data-act="fonte-menos"]').click());
  ok('sem erros de JavaScript', p.erros.length === 0, p.erros.join(' | '));
  await p.ctx.close();
}

async function login(modo) {
  grupo = `Login (${modo})`;
  const p = await nova(modo);
  await abrir(p, 'login');
  await print(p, '10-login');
  await p.click('#btn-codigo');
  await espera(300);
  ok('e-mail vazio: pede e-mail válido', /e-mail válido/.test(await texto(p, '#login-erro')));
  await p.type('#login-email', 'alguem@gmail.com');
  await p.click('#btn-codigo');
  await p.waitForFunction(() => /não tem acesso/.test(document.querySelector('#login-erro')?.textContent || ''), { timeout: 15000 });
  ok('e-mail não autorizado: recusado pelo servidor', true);
  await print(p, '11-login-nao-autorizado');
  await p.$eval('#login-email', (e) => { e.value = ''; });
  await p.type('#login-email', 'joão.silva@aluno.impacta.edu.br');
  await p.click('#btn-codigo');
  await espera(300);
  ok('aluno com formato errado: aviso', /formato esperado/.test(await texto(p, '#login-erro')));
  await print(p, '12-login-formato-aluno');
  // Envio do código simulado (sem e-mail real); a conferência do código é real no Supabase
  await p.setRequestInterception(true);
  p.on('request', (r) => (r.url().endsWith('/api/send-code') ? r.respond({ status: 200, contentType: 'application/json', body: '{"ok":true}' }) : r.continue()));
  await p.$eval('#login-email', (e) => { e.value = ''; });
  await p.type('#login-email', 'nome.sobrenome@aluno.impacta.edu.br');
  await p.click('#btn-codigo');
  await p.waitForSelector('#codigo input');
  ok('tela do código com 6 caixas', (await p.$$('#codigo input')).length === 6);
  ok('reenviar bloqueado por 60 s', await p.$eval('#btn-reenviar', (b) => b.disabled) && /Novo código em/.test(await texto(p, '#reenvio-info')));
  await print(p, '13-login-codigo');
  await p.type('#codigo input[data-i="0"]', '000000');
  await p.waitForFunction(() => /incorreto ou vencido/.test(document.querySelector('#login-erro')?.textContent || ''), { timeout: 15000 });
  ok('código errado: mensagem e caixas limpas', true);
  await print(p, '14-login-codigo-errado');
  await p.click('[data-act="trocar-email"]');
  await p.click('[data-act="login-demo"]');
  await p.waitForSelector('#demo-email');
  await p.type('#demo-email', 'aluno.demo@cpa.marcosfc.site');
  await p.type('#demo-senha', 'senha-errada');
  await p.click('#btn-senha');
  await p.waitForFunction(() => /incorretos/.test(document.querySelector('#login-erro')?.textContent || ''), { timeout: 15000 });
  ok('senha errada: recusada', true);
  await p.$eval('#demo-email', (e) => { e.value = ''; });
  await p.type('#demo-email', 'admin.demo@cpa.marcosfc.site');
  await print(p, '15-login-demonstracao');
  ok('sem erros de JavaScript', p.erros.length === 0, p.erros.join(' | '));
  await p.ctx.close();
}

async function perfil(modo, conta, perfilEsperado, abasEsperadas, prefixo) {
  grupo = `Perfil ${perfilEsperado} (${modo})`;
  const p = await nova(modo);
  await entrar(p, conta);
  ok('login pela tela com e-mail e senha', true);
  const a = await abas(p);
  ok(`abas = ${abasEsperadas.join(', ')}`, a.join('|') === abasEsperadas.join('|'), a.join(', '));
  ok('aviso do Looker aparece', /Looker Studio|conta Google/.test(await texto(p, '.aviso')));
  ok('sem formulário de administração', (await p.$$('form[data-form="dash-novo"]')).length === 0);
  ok('menu sem "Acessos e Perfis"', !(await p.$('a[href="#acessos"]')));
  await print(p, `${prefixo}-dashboards`, false);
  await ir(p, 'mural', '.devolutiva');
  ok('mural sem botões de administração', (await p.$$('[data-act="mural-status"]')).length === 0);
  if (perfilEsperado === 'aluno') await print(p, `${prefixo}-mural`);
  await ir(p, 'acessos');
  ok('#acessos redireciona (sem permissão)', (await p.evaluate(() => document.querySelector('main h1').textContent)) === 'Dashboards');
  await sair(p);
  ok('sair encerra a sessão', !(await p.evaluate(() => Object.keys(localStorage).some((k) => k.endsWith('-auth-token')))));
  ok('sem erros de JavaScript', p.erros.length === 0, p.erros.join(' | '));
  await p.ctx.close();
}

async function administracao(modo) {
  grupo = `Administração (${modo})`;
  await db.query(`insert into mensagens_contato (nome, email, mensagem) values ('Aluno Demonstração', 'aluno.demo@cpa.marcosfc.site', 'Os painéis vão ter a pesquisa de egressos? Fiquei com essa dúvida depois da apresentação da CPA.')`);
  const p = await nova(modo);
  await entrar(p, 'admin.demo');
  ok('vê os 4 painéis', (await abas(p)).length === 4);
  await print(p, '50-admin-dashboards', false);
  await p.evaluate(() => { document.querySelectorAll('details.admin').forEach((d) => { d.open = true; }); });
  await p.$eval('#dash-url', (e) => { e.value = 'http://exemplo.com/painel'; });
  await p.click('form[data-form="dash-url"] [type=submit]');
  await espera(300);
  ok('link sem https é recusado', /https/.test(await texto(p, '#dash-erro')));
  await p.$eval('#dash-url', (e) => { e.value = 'https://exemplo.com/painel'; });
  await p.click('form[data-form="dash-url"] [type=submit]');
  await espera(300);
  ok('link fora do Looker é recusado', /Looker/.test(await texto(p, '#dash-erro')));
  await p.$eval('#dn-titulo', (e) => e.scrollIntoView());
  await p.type('#dn-titulo', 'Painel de teste');
  await p.type('#dn-desc', 'Painel criado no teste automatizado.');
  await p.type('#dn-url', 'https://lookerstudio.google.com/embed/reporting/00000000-teste/page/p_teste');
  await print(p, '51-admin-editar-e-adicionar-painel');
  await p.click('form[data-form="dash-novo"] [type=submit]');
  await p.waitForFunction(() => [...document.querySelectorAll('#app [role="tab"]')].some((b) => b.textContent === 'Painel de teste'), { timeout: 15000 });
  ok('adiciona painel', true);
  const linha = await db.query(`select id, roles from dashboards where titulo = 'Painel de teste'`);
  ok('painel gravado com perfis coord e aval', linha.rows[0] && linha.rows[0].roles.join(',') === 'cpa,coord,aval', JSON.stringify(linha.rows[0]));
  await print(p, '52-admin-painel-adicionado', false);
  await p.evaluate(() => { document.querySelector('details.admin').open = true; });
  await p.click('details.admin [data-act="pedir-confirmacao"]');
  await p.waitForSelector('[data-act="confirmar"]');
  await print(p, '53-admin-remover-painel', false);
  await p.click('[data-act="confirmar"]');
  await p.waitForFunction(() => ![...document.querySelectorAll('#app [role="tab"]')].some((b) => b.textContent === 'Painel de teste'), { timeout: 15000 });
  ok('remove painel', (await db.query(`select 1 from dashboards where titulo = 'Painel de teste'`)).rowCount === 0);

  // Mural
  await ir(p, 'mural', '.devolutiva');
  ok('mural com botões de administração', (await p.$$('[data-act="mural-status"]')).length >= 3);
  await p.evaluate(() => { document.querySelector('details.admin').open = true; });
  await p.type('#m-area', 'Teste automatizado');
  await p.type('#m-dem', 'Demanda criada pelo teste das telas.');
  await p.type('#m-res', 'Resposta criada pelo teste das telas.');
  await print(p, '54-admin-publicar-devolutiva');
  await p.click('form[data-form="mural-novo"] [type=submit]');
  await p.waitForFunction(() => /Teste automatizado/.test(document.querySelector('#mural-grade')?.textContent || ''), { timeout: 15000 });
  ok('publica devolutiva', true);
  const card = async () => p.evaluateHandle(() => [...document.querySelectorAll('.devolutiva')].find((c) => /Teste automatizado/.test(c.textContent)));
  await (await card()).$eval('[data-act="mural-status"]', (b) => b.click());
  await p.waitForFunction(() => [...document.querySelectorAll('.devolutiva')].some((c) => /Teste automatizado/.test(c.textContent) && c.classList.contains('feito')), { timeout: 15000 });
  ok('alterna para resolvida', true);
  await print(p, '55-admin-mural');
  await (await card()).$eval('[data-act="pedir-confirmacao"]', (b) => b.click());
  await p.click('[data-act="confirmar"]');
  await p.waitForFunction(() => !/Teste automatizado/.test(document.querySelector('#mural-grade')?.textContent || ''), { timeout: 15000 });
  ok('remove devolutiva', (await db.query(`select 1 from mural where area = 'Teste automatizado'`)).rowCount === 0);

  // Relatórios
  await ir(p, 'relatorios', '.doc');
  await p.evaluate(() => { document.querySelector('details.admin').open = true; });
  await p.type('#r-titulo', 'Boletim de teste');
  await (await p.$('#r-arquivo')).uploadFile(txtTeste);
  await p.click('form[data-form="rel-novo"] [type=submit]');
  await espera(300);
  ok('arquivo que não é PDF é recusado na tela', /precisa ser um PDF/.test(await texto(p, '#r-erro')));
  await (await p.$('#r-arquivo')).uploadFile(pdfGrande);
  await p.click('form[data-form="rel-novo"] [type=submit]');
  await espera(300);
  ok('PDF acima de 50 MB é recusado na tela', /50 MB/.test(await texto(p, '#r-erro')));
  await (await p.$('#r-arquivo')).uploadFile(pdfTeste);
  await print(p, '56-admin-enviar-pdf');
  await p.click('form[data-form="rel-novo"] [type=submit]');
  await p.waitForFunction(() => /Boletim de teste/.test(document.querySelector('main')?.textContent || ''), { timeout: 20000 });
  const rel = await db.query(`select arquivo_url from relatorios where titulo = 'Boletim de teste'`);
  ok('envia PDF e publica', rel.rowCount === 1);
  ok('PDF abre pelo link público', rel.rowCount === 1 && (await fetch(rel.rows[0].arquivo_url, { method: 'HEAD' })).status === 200);
  await print(p, '57-admin-relatorios');
  await p.evaluate(() => [...document.querySelectorAll('.doc')].find((d) => /Boletim de teste/.test(d.textContent)).querySelector('[data-act="pedir-confirmacao"]').click());
  await p.click('[data-act="confirmar"]');
  await p.waitForFunction(() => !/Boletim de teste/.test(document.querySelector('main')?.textContent || ''), { timeout: 15000 });
  ok('remove documento', (await db.query(`select 1 from relatorios where titulo = 'Boletim de teste'`)).rowCount === 0);
  ok('arquivo apagado do Storage', rel.rowCount === 1 && (await fetch(rel.rows[0].arquivo_url + '?x=' + Date.now(), { method: 'HEAD' })).status !== 200);

  await ir(p, 'contato', '#c-chat');
  await print(p, '58-admin-contato');

  // Acessos e Perfis
  await ir(p, 'acessos', 'table');
  await espera(800);
  ok('dono aparece como Protegido (sem botão Revogar)', await p.evaluate(() => [...document.querySelectorAll('tr')].some((tr) => /marcos\.pires/.test(tr.textContent) && /Protegido/.test(tr.textContent) && !tr.querySelector('[data-act="pedir-confirmacao"]'))));
  await p.type('#a-emails', 'coordenacao.teste@impacta.edu.br');
  await print(p, '60-acessos-pessoas');
  await p.click('form[data-form="autorizar"] [type=submit]');
  await p.waitForFunction(() => /coordenacao\.teste@impacta\.edu\.br/.test(document.querySelector('table')?.textContent || ''), { timeout: 15000 });
  ok('autoriza e-mail da coordenação', true);
  await p.evaluate(() => [...document.querySelectorAll('tr')].find((tr) => /coordenacao\.teste/.test(tr.textContent)).querySelector('[data-act="pedir-confirmacao"]').click());
  await p.click('[data-act="confirmar"]');
  await p.waitForFunction(() => !/coordenacao\.teste/.test(document.querySelector('table')?.textContent || ''), { timeout: 15000 });
  ok('revoga e-mail da coordenação', (await db.query(`select 1 from usuarios_cpa where email = 'coordenacao.teste@impacta.edu.br'`)).rowCount === 0);
  // tentativa direta pela API com a sessão do admin de demonstração
  const tentativa = await p.evaluate(async (dono) => {
    const k = Object.keys(localStorage).find((x) => x.endsWith('-auth-token'));
    const s = JSON.parse(localStorage.getItem(k));
    const c = window.supabase.createClient(window.CPA_CONFIG.supabaseUrl, window.CPA_CONFIG.supabaseAnonKey, { auth: { persistSession: false }, global: { headers: { Authorization: 'Bearer ' + s.access_token } } });
    const del = await c.from('usuarios_cpa').delete().eq('email', dono).select();
    const up = await c.from('usuarios_cpa').update({ role: 'coord' }).eq('email', dono).select();
    const r = await fetch('/api/convite', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.access_token }, body: JSON.stringify({ email: dono, role: 'aval', nome: 'x', expira_em: '2030-01-01', enviar: false }) });
    return { del: (del.data || []).length, up: (up.data || []).length, convite: r.status };
  }, 'marcos.pires@aluno.impacta.edu.br');
  const dono = await db.query(`select role, protegido from usuarios_cpa where email = 'marcos.pires@aluno.impacta.edu.br'`);
  ok('tentar revogar/alterar o dono falha', tentativa.del === 0 && tentativa.up === 0 && tentativa.convite === 403 && dono.rows[0]?.role === 'cpa', JSON.stringify(tentativa));
  await p.$eval('#a-emails', (e) => { e.value = 'admin.novo@impacta.edu.br'; });
  await p.select('#a-role', 'cpa');
  await p.click('form[data-form="autorizar"] [type=submit]');
  await p.waitForFunction(() => (document.querySelector('#a-erro')?.textContent || '').length > 0, { timeout: 15000 });
  ok('demo não cria outro administrador', (await db.query(`select 1 from usuarios_cpa where email = 'admin.novo@impacta.edu.br'`)).rowCount === 0, await texto(p, '#a-erro'));
  await p.evaluate(() => document.querySelector('[data-act="aba"][data-id="avaliadores"]').click());
  await p.waitForSelector('#v-nome');
  await p.type('#v-nome', 'Profa. Avaliadora Teste (INEP)');
  await p.type('#v-email', 'avaliadora.teste@exemplo.gov.br');
  await print(p, '61-acessos-avaliadores');
  await p.click('form[data-form="convidar"] [type=submit]');
  await p.waitForFunction(() => /avaliadora\.teste/.test(document.querySelector('table')?.textContent || ''), { timeout: 15000 });
  ok('convida avaliador (demo não envia e-mail)', (await db.query(`select expira_em from usuarios_cpa where email = 'avaliadora.teste@exemplo.gov.br'`)).rowCount === 1);
  ok('tela avisa que o convite não foi enviado por e-mail', /não é enviado/.test(await texto(p, '#toast')), await texto(p, '#toast'));
  await db.query(`delete from usuarios_cpa where email = 'avaliadora.teste@exemplo.gov.br'`);
  await p.evaluate(() => document.querySelector('[data-act="aba"][data-id="visibilidade"]').click());
  await espera(400);
  await print(p, '62-acessos-quem-ve-o-que');
  await p.evaluate(() => document.querySelector('[data-act="aba"][data-id="historico"]').click());
  await espera(400);
  const hist = await p.$$eval('tbody tr', (t) => t.map((x) => x.textContent));
  ok('histórico mostra só contas de demonstração', hist.length > 0 && hist.every((t) => /@cpa\.marcosfc\.site/.test(t)), hist.length + ' linhas');
  ok('histórico registra "Senha (demonstração)"', hist.some((t) => /Senha \(demonstração\)/.test(t)));
  await print(p, '63-acessos-historico');
  await p.evaluate(() => document.querySelector('[data-act="aba"][data-id="mensagens"]').click());
  await espera(400);
  ok('mensagens recebidas aparecem', (await p.$$('.mensagem')).length >= 1);
  await print(p, '64-acessos-mensagens');
  await sair(p);
  ok('sem erros de JavaScript', p.erros.length === 0, p.erros.join(' | '));
  await p.ctx.close();
  await db.query(`delete from mensagens_contato where email like '%@cpa.marcosfc.site'`);
}

async function falhas(modo) {
  grupo = `Falhas e sessão (${modo})`;
  // Supabase fora do ar / sem internet
  const p = await nova(modo);
  await p.setRequestInterception(true);
  p.on('request', (r) => (/supabase\.co/.test(r.url()) ? r.abort('internetdisconnected') : r.continue()));
  await p.goto(`${BASE}/#mural`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.vazio.falha', { timeout: 20000 });
  ok('sem conexão: aviso amigável com "Tentar de novo"', /Não foi possível carregar o mural/.test(await texto(p)) && !!(await p.$('[data-act="recarregar-mural"]')));
  await print(p, '80-sem-conexao', false);
  await p.ctx.close();
  // Sessão vencida (token e renovação inválidos)
  const q = await nova(modo);
  await q.goto(`${BASE}/#mural`, { waitUntil: 'domcontentloaded' });
  await q.evaluate((ref) => {
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({ access_token: 'invalido', refresh_token: 'invalido', token_type: 'bearer', expires_in: 3600, expires_at: 1, user: { id: '00000000-0000-0000-0000-000000000000', email: 'aluno.demo@cpa.marcosfc.site' } }));
  }, new URL(process.env.SUPABASE_URL).hostname.split('.')[0]);
  await q.goto(`${BASE}/#dashboards`, { waitUntil: 'domcontentloaded' });
  await q.waitForFunction(() => document.querySelector('main')?.getAttribute('aria-busy') === 'false', { timeout: 20000 });
  await espera(1500);
  const h1 = await q.evaluate(() => document.querySelector('main h1, main h2')?.textContent || '');
  ok('sessão vencida volta para o login', /Entrar no portal/.test(h1), h1);
  await q.ctx.close();
}

// Modelos de e-mail renderizados como imagem
async function emails() {
  grupo = 'Modelos de e-mail';
  const m = await import(pathToFileURL(join(raiz, 'api', '_lib', 'emails.js')).href);
  const modelos = {
    'email-codigo': m.emailCodigo({ codigo: '482913', nome: 'Aluno Demonstração', portalUrl: BASE }),
    'email-convite': m.emailConvite({ nome: 'Profa. Avaliadora Teste', email: 'avaliadora.teste@exemplo.gov.br', role: 'aval', expiraEm: '2027-12-31', portalUrl: BASE, convidadoPor: 'Administração Demonstração' }),
    'email-contato': m.emailContato({ nome: 'Visitante de Teste', email: 'visitante@exemplo.com', mensagem: 'Gostaria de saber quando sai o próximo relatório da CPA.', enviadaEm: new Date().toISOString(), portalUrl: BASE })
  };
  const p = await nova('desktop');
  await p.setViewport({ width: 700, height: 900 });
  for (const [nome, e] of Object.entries(modelos)) {
    await p.setContent(e.html, { waitUntil: 'load' });
    await p.screenshot({ path: join(DIR.desktop, nome + '.png'), fullPage: true });
    ok(`${nome}: assunto "${e.subject}"`, !!e.subject && !!e.text);
  }
  await p.ctx.close();
}

try {
  for (const modo of ['desktop', 'mobile']) {
    await publico(modo);
    await login(modo);
    await perfil(modo, 'aluno.demo', 'aluno', ['Aluno(a) Presencial', 'Aluno(a) EAD'], '20-aluno');
    await perfil(modo, 'coord.demo', 'coord', ['Aluno(a) Presencial', 'Aluno(a) EAD', 'Professores', 'Corpo técnico-administrativo'], '30-coord');
    await perfil(modo, 'avaliador.demo', 'aval', ['Aluno(a) Presencial', 'Aluno(a) EAD', 'Professores', 'Corpo técnico-administrativo'], '40-avaliador');
    await administracao(modo);
    await falhas(modo);
  }
  await emails();
} catch (e) {
  ok('erro inesperado', false, e.stack || e.message);
} finally {
  await db.query(`delete from dashboards where titulo = 'Painel de teste'`);
  await db.query(`delete from mural where area = 'Teste automatizado'`);
  await db.query(`delete from relatorios where titulo = 'Boletim de teste'`);
  await db.query(`delete from usuarios_cpa where email in ('coordenacao.teste@impacta.edu.br','avaliadora.teste@exemplo.gov.br','admin.novo@impacta.edu.br')`);
  await db.query(`delete from mensagens_contato where email like '%@cpa.marcosfc.site'`);
  await db.end();
  await browser.close();
}

let g = '';
for (const x of res) {
  if (x.grupo !== g) { g = x.grupo; console.log(`\n## ${g}`); }
  console.log(`${x.ok ? 'OK   ' : 'FALHA'} ${x.nome}${x.extra ? '  (' + x.extra + ')' : ''}`);
}
const n = res.filter((x) => !x.ok).length;
console.log(`\n${res.length - n} de ${res.length} verificações passaram.`);
process.exit(n ? 1 : 0);
