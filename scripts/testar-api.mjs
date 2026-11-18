// Testes de permissões, segurança e casos de erro direto na API (Supabase + funções /api).
// Uso: node scripts/testar-api.mjs [endereço do portal] [--com-email]
// Lê SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY e POSTGRES_URL_NON_POOLING do
// ambiente ou de .env.local. Cria só dados de teste e apaga tudo no final.
// Só com --com-email envia 1 mensagem de contato real (gera 1 e-mail para a caixa da CPA).

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
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
const BASE = (process.argv.slice(2).find((x) => !x.startsWith('--')) || 'https://cpa.marcosfc.site').replace(/\/+$/, '');
const URL_SB = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SENHA = process.env.DEMO_SENHA || 'CPA-Impacta-2026';
const DONO = 'marcos.pires@aluno.impacta.edu.br';
const admin = createClient(URL_SB, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const db = new pg.Client({ connectionString: process.env.POSTGRES_URL_NON_POOLING.replace(/[?&]sslmode=[^&]*/, ''), ssl: { rejectUnauthorized: false } });
await db.connect();

const res = [];
let grupo = '';
const ok = (nome, cond, extra = '') => res.push({ grupo, nome, ok: !!cond, extra: String(extra ?? '').slice(0, 140) });
const anon = () => createClient(URL_SB, ANON, { auth: { persistSession: false } });
async function entrar(conta) {
  const sb = anon();
  const r = await sb.auth.signInWithPassword({ email: `${conta}@cpa.marcosfc.site`, password: SENHA });
  if (r.error) throw new Error(`${conta}: ${r.error.message}`);
  return sb;
}
async function post(caminho, corpo, token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = 'Bearer ' + token;
  const r = await fetch(BASE + caminho, { method: 'POST', headers: h, body: JSON.stringify(corpo) });
  return { status: r.status, dados: await r.json().catch(() => ({})) };
}
const ids = (r) => (r.data || []).map((x) => x.id).join(',');
const pdf = Buffer.from('%PDF-1.4\n%teste\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');

try {
  // ---------------------------------------------------------------- visitante
  grupo = 'Visitante (sem login)';
  const v = anon();
  ok('lê o mural', (await v.from('mural').select('id')).data?.length >= 1);
  ok('lê os relatórios', (await v.from('relatorios').select('id')).data?.length >= 3);
  ok('não vê painéis', (await v.from('dashboards').select('id')).data?.length === 0);
  ok('não lê usuarios_cpa', ((await v.from('usuarios_cpa').select('email')).data || []).length === 0);
  ok('não lê histórico de acessos', ((await v.from('logs_acesso').select('id')).data || []).length === 0);
  ok('não lê mensagens', ((await v.from('mensagens_contato').select('id')).data || []).length === 0);
  ok('não publica no mural', !!(await v.from('mural').insert({ area: 'x', demanda: 'x', resposta: 'x' })).error);
  ok('não cria painel', !!(await v.from('dashboards').insert({ id: 'x', titulo: 'x', url: 'https://lookerstudio.google.com/x' })).error);
  ok('não envia PDF', !!(await v.storage.from('relatorios').upload(`teste-${Date.now()}.pdf`, pdf, { contentType: 'application/pdf' })).error);
  const su = await v.auth.signUp({ email: `cadastro.${Date.now()}@example.com`, password: 'Senha-de-teste-123' });
  ok('cadastro público bloqueado', /signup.*disabled|not allowed/i.test(`${su.error?.code} ${su.error?.message}`), su.error?.code);

  // ---------------------------------------------------------------- perfis demo
  const esperado = { 'aluno.demo': ['aluno', 'pres,ead'], 'coord.demo': ['coord', 'pres,ead,prof,adm'], 'avaliador.demo': ['aval', 'pres,ead,prof,adm'] };
  for (const [conta, [perfil, paineis]] of Object.entries(esperado)) {
    grupo = `Perfil ${perfil} (${conta})`;
    const sb = await entrar(conta);
    ok('login por senha', true);
    const p = await sb.rpc('meu_perfil');
    ok(`perfil = ${perfil}`, p.data === perfil, p.data);
    const d = await sb.from('dashboards').select('id').order('ordem');
    ok(`painéis = ${paineis}`, ids(d) === paineis, ids(d));
    ok('não publica no mural', !!(await sb.from('mural').insert({ area: 'x', demanda: 'x', resposta: 'x' })).error);
    ok('não cadastra relatório', !!(await sb.from('relatorios').insert({ titulo: 'x', arquivo_url: 'https://x' })).error);
    ok('não cria painel', !!(await sb.from('dashboards').insert({ id: 'x', titulo: 'x', url: 'https://lookerstudio.google.com/x' })).error);
    const up = await sb.from('dashboards').update({ titulo: 'x' }).eq('id', 'pres').select('id');
    ok('não altera painel', !up.data?.length);
    ok('não lê usuarios_cpa', ((await sb.from('usuarios_cpa').select('email')).data || []).length === 0);
    ok('não lê histórico', ((await sb.from('logs_acesso').select('id')).data || []).length === 0);
    ok('não envia PDF', !!(await sb.storage.from('relatorios').upload(`teste-${Date.now()}.pdf`, pdf, { contentType: 'application/pdf' })).error);
    const log = await sb.from('logs_acesso').insert({ email: `${conta}@cpa.marcosfc.site`, nome: 'Teste API', role: perfil, metodo: 'Teste automatizado' });
    ok('registra o próprio acesso', !log.error, log.error?.message);
    const falso = await sb.from('logs_acesso').insert({ email: DONO, nome: 'Teste API', role: 'cpa', metodo: 'Teste automatizado' });
    ok('não registra acesso em nome de outro', !!falso.error);
    const tk = (await sb.auth.getSession()).data.session.access_token;
    const cv = await post('/api/convite', { email: 'x@impacta.edu.br', role: 'coord', enviar: false }, tk);
    ok('api/convite recusa quem não é CPA', cv.status === 403, cv.status);
  }

  // ---------------------------------------------------------------- admin demo
  grupo = 'Administração (admin.demo)';
  const a = await entrar('admin.demo');
  const tokenA = (await a.auth.getSession()).data.session.access_token;
  ok('perfil = cpa', (await a.rpc('meu_perfil')).data === 'cpa');
  ok('vê os 4 painéis', ids(await a.from('dashboards').select('id').order('ordem')) === 'pres,ead,prof,adm');
  const m = await a.from('mural').insert({ area: 'TESTE API', demanda: 'demanda de teste', resposta: 'resposta de teste', status: 'Em andamento' }).select().single();
  ok('publica devolutiva', !m.error, m.error?.message);
  ok('autoria gravada pelo banco', m.data?.criado_por === 'admin.demo@cpa.marcosfc.site', m.data?.criado_por);
  const mu = await a.from('mural').update({ status: 'Resolvido' }).eq('id', m.data.id).select();
  ok('alterna situação', mu.data?.[0]?.status === 'Resolvido');
  ok('remove devolutiva', (await a.from('mural').delete().eq('id', m.data.id).select()).data?.length === 1);
  const caminho = `envios/teste-api-${Date.now()}.pdf`;
  ok('envia PDF', !(await a.storage.from('relatorios').upload(caminho, pdf, { contentType: 'application/pdf' })).error);
  const pub = a.storage.from('relatorios').getPublicUrl(caminho).data.publicUrl;
  const rel = await a.from('relatorios').insert({ titulo: 'TESTE API', tipo: 'Boletim', arquivo_url: pub }).select().single();
  ok('cadastra documento', !rel.error, rel.error?.message);
  ok('PDF público abre', (await fetch(pub, { method: 'HEAD' })).status === 200);
  ok('remove documento', (await a.from('relatorios').delete().eq('id', rel.data.id).select()).data?.length === 1);
  ok('apaga PDF', !(await a.storage.from('relatorios').remove([caminho])).error);
  const txt = await a.storage.from('relatorios').upload(`envios/teste-${Date.now()}.txt`, Buffer.from('texto'), { contentType: 'text/plain' });
  ok('Storage recusa arquivo que não é PDF', !!txt.error, txt.error?.message);
  const grande = await a.storage.from('relatorios').upload(`envios/grande-${Date.now()}.pdf`, Buffer.alloc(51 * 1024 * 1024, 32), { contentType: 'application/pdf' });
  ok('Storage recusa PDF acima de 50 MB', !!grande.error, grande.error?.message);
  if (!grande.error) await admin.storage.from('relatorios').remove([grande.data.path]);

  const dn = await a.from('dashboards').insert({ id: 'teste-api', titulo: 'Painel de teste', roles: ['cpa', 'coord'], url: 'https://lookerstudio.google.com/embed/reporting/teste', ordem: 99 }).select().single();
  ok('adiciona painel', !dn.error, dn.error?.message);
  const coord = await entrar('coord.demo');
  ok('coordenação vê o painel novo', ids(await coord.from('dashboards').select('id').eq('id', 'teste-api')) === 'teste-api');
  const al = await entrar('aluno.demo');
  ok('aluno não vê o painel novo', ids(await al.from('dashboards').select('id').eq('id', 'teste-api')) === '');
  ok('edita link e perfis do painel', (await a.from('dashboards').update({ url: 'https://lookerstudio.google.com/embed/reporting/teste2', roles: ['cpa', 'aval'] }).eq('id', 'teste-api').select()).data?.length === 1);
  ok('recusa link sem https', !!(await a.from('dashboards').update({ url: 'http://lookerstudio.google.com/x' }).eq('id', 'teste-api')).error);
  ok('recusa link fora do Looker', !!(await a.from('dashboards').update({ url: 'https://exemplo.com/painel' }).eq('id', 'teste-api')).error);
  ok('remove painel', (await a.from('dashboards').delete().eq('id', 'teste-api').select()).data?.length === 1);

  const cfg0 = (await a.from('configuracoes').select('chat_url, meet_url, horario').eq('id', 1).single()).data;
  ok('edita links de atendimento', (await a.from('configuracoes').update({ horario: 'teste' }).eq('id', 1).select()).data?.length === 1);
  await admin.from('configuracoes').update({ ...cfg0, atualizado_por: null }).eq('id', 1);

  const antes = (await admin.from('usuarios_cpa').select('*').eq('email', DONO).single()).data;
  const del = await a.from('usuarios_cpa').delete().eq('email', DONO).select();
  ok('não revoga o dono (protegido)', !del.error && del.data?.length === 0);
  const upd = await a.from('usuarios_cpa').update({ role: 'aval' }).eq('email', DONO).select();
  ok('não altera o dono (protegido)', !upd.data?.length);
  const ups = await a.from('usuarios_cpa').upsert({ email: DONO, role: 'coord', tipo: 'sso' }, { onConflict: 'email' });
  ok('não sobrescreve o dono por upsert', !!ups.error);
  const cvd = await post('/api/convite', { email: DONO, role: 'aval', nome: 'x', expira_em: '2030-01-01', enviar: false }, tokenA);
  ok('api/convite não altera protegido', cvd.status === 403, cvd.status + ' ' + cvd.dados.erro);
  const depois = (await admin.from('usuarios_cpa').select('*').eq('email', DONO).single()).data;
  ok('linha do dono continua igual', JSON.stringify(antes) === JSON.stringify(depois));
  ok('não se rebaixa', !(await a.from('usuarios_cpa').update({ role: 'coord' }).eq('email', 'admin.demo@cpa.marcosfc.site').select()).data?.length);
  ok('não revoga outra conta demo', !(await a.from('usuarios_cpa').delete().eq('email', 'aluno.demo@cpa.marcosfc.site').select()).data?.length);
  ok('não cria linha protegida', !!(await a.from('usuarios_cpa').insert({ email: 'protegido.teste@impacta.edu.br', role: 'coord', protegido: true })).error);
  ok('não cria outro administrador', !!(await a.from('usuarios_cpa').insert({ email: 'admin.teste@impacta.edu.br', role: 'cpa' })).error);
  const cva = await post('/api/convite', { email: 'admin.teste@impacta.edu.br', role: 'cpa', enviar: false }, tokenA);
  ok('api/convite não cria administrador pela demo', cva.status === 403, cva.status);
  ok('autoriza coordenação', !(await a.from('usuarios_cpa').insert({ email: 'coord.teste@impacta.edu.br', nome: 'Coord Teste', role: 'coord' })).error);
  ok('revoga coordenação', (await a.from('usuarios_cpa').delete().eq('email', 'coord.teste@impacta.edu.br').select()).data?.length === 1);
  const cvv = await post('/api/convite', { email: 'avaliador.teste@example.com', nome: 'Avaliador Teste', role: 'aval', expira_em: '2027-01-31' }, tokenA);
  ok('convida avaliador (sem e-mail na demo)', cvv.status === 200 && cvv.dados.enviado === false, JSON.stringify(cvv.dados));
  const cvx = await post('/api/convite', { email: 'avaliador.teste@example.com', nome: 'x', role: 'aval', expira_em: '2020-01-01' }, tokenA);
  ok('convite recusa validade no passado', cvx.status === 400, cvx.dados.erro);
  ok('api/convite sem login', (await post('/api/convite', { email: 'x@impacta.edu.br', role: 'coord' })).status === 401);
  const logs = (await a.from('logs_acesso').select('email')).data || [];
  ok('histórico da demo só mostra contas demo', logs.length > 0 && logs.every((l) => l.email.endsWith('@cpa.marcosfc.site')), logs.length + ' linhas');

  // ---------------------------------------------------------------- login por código
  grupo = 'Login por código (/api/send-code)';
  const sc = (email) => post('/api/send-code', { email });
  let r = await sc('');
  ok('e-mail vazio → 400', r.status === 400, r.dados.erro);
  r = await sc('sem-arroba');
  ok('e-mail inválido → 400', r.status === 400, r.dados.erro);
  r = await sc('joão.silva@aluno.impacta.edu.br');
  ok('aluno com formato errado → 403', r.status === 403 && r.dados.motivo === 'formato', r.dados.erro);
  r = await sc('alguem@gmail.com');
  ok('e-mail externo não autorizado → 403', r.status === 403 && r.dados.motivo === 'nao_autorizado', r.dados.erro);
  r = await sc('ninguem.teste@impacta.edu.br');
  ok('@impacta não autorizado → 403', r.status === 403, r.dados.erro);
  r = await sc('admin.demo@cpa.marcosfc.site');
  ok('conta demo não recebe código → 403', r.status === 403 && r.dados.motivo === 'demo', r.dados.erro);
  await admin.from('usuarios_cpa').upsert({ email: 'vencido.teste@example.com', nome: 'Vencido', role: 'aval', tipo: 'token', expira_em: '2026-01-31' });
  r = await sc('vencido.teste@example.com');
  ok('avaliador com validade vencida → 403', r.status === 403 && r.dados.motivo === 'expirado', r.dados.erro);
  await admin.from('usuarios_cpa').upsert({ email: 'limite.teste@impacta.edu.br', nome: 'Limite', role: 'coord', tipo: 'sso' });
  await db.query(`insert into envios_codigo (email, ip) select 'limite.teste@impacta.edu.br', 'teste' from generate_series(1,3)`);
  r = await sc('limite.teste@impacta.edu.br');
  ok('4º pedido em 10 min → 429', r.status === 429, r.dados.erro);
  const vo = await anon().auth.verifyOtp({ email: 'aluno.demo@cpa.marcosfc.site', token: '000000', type: 'email' });
  ok('código errado é recusado', !!vo.error, vo.error?.code);
  const sp = await anon().auth.signInWithPassword({ email: 'aluno.demo@cpa.marcosfc.site', password: 'senha-errada' });
  ok('senha errada é recusada', !!sp.error, sp.error?.code);
  ok('GET em /api/send-code → 405', (await fetch(BASE + '/api/send-code')).status === 405);

  // ---------------------------------------------------------------- contato
  grupo = 'Contato (/api/contato)';
  r = await post('/api/contato', { nome: '', email: 'a@b.com', mensagem: 'olá, tudo bem?' });
  ok('sem nome → 400', r.status === 400, r.dados.erro);
  r = await post('/api/contato', { nome: 'Teste', email: 'invalido', mensagem: 'olá, tudo bem?' });
  ok('e-mail inválido → 400', r.status === 400, r.dados.erro);
  r = await post('/api/contato', { nome: 'Teste', email: 'a@b.com', mensagem: 'oi' });
  ok('mensagem curta → 400', r.status === 400, r.dados.erro);
  r = await post('/api/contato', { nome: 'Robô', email: 'robo.teste@cpa.marcosfc.site', mensagem: 'mensagem de robô', site: 'http://spam' });
  const robo = await admin.from('mensagens_contato').select('id').eq('email', 'robo.teste@cpa.marcosfc.site');
  ok('honeypot: responde ok e descarta', r.status === 200 && robo.data.length === 0);
  await db.query(`insert into mensagens_contato (nome, email, mensagem) select 'Limite', 'limite.teste@cpa.marcosfc.site', 'teste de limite' from generate_series(1,5)`);
  r = await post('/api/contato', { nome: 'Limite', email: 'limite.teste@cpa.marcosfc.site', mensagem: 'sexta mensagem na hora' });
  ok('6ª mensagem na hora → 429', r.status === 429, r.dados.erro);
  if (process.argv.includes('--com-email')) {
    r = await post('/api/contato', { nome: 'Administração Demonstração', email: 'admin.demo@cpa.marcosfc.site', mensagem: 'Mensagem de teste do formulário de contato (teste automatizado).' });
    ok('mensagem válida → 200 (1 e-mail para a CPA)', r.status === 200, JSON.stringify(r.dados));
  } else {
    await db.query(`insert into mensagens_contato (nome, email, mensagem) values ('Administração Demonstração', 'admin.demo@cpa.marcosfc.site', 'Mensagem de teste.')`);
  }
  const vistas = (await a.from('mensagens_contato').select('email')).data || [];
  ok('admin demo vê só mensagens de contas demo', vistas.length > 0 && vistas.every((x) => x.email.endsWith('@cpa.marcosfc.site')), vistas.length);
} catch (e) {
  ok('erro inesperado', false, e.message);
} finally {
  // limpeza
  await db.query(`delete from usuarios_cpa where email in ('vencido.teste@example.com','limite.teste@impacta.edu.br','avaliador.teste@example.com','coord.teste@impacta.edu.br')`);
  await db.query(`delete from envios_codigo where email = 'limite.teste@impacta.edu.br'`);
  await db.query(`delete from mensagens_contato where email like '%@cpa.marcosfc.site'`);
  await db.query(`delete from logs_acesso where nome = 'Teste API'`);
  await db.query(`delete from dashboards where id = 'teste-api'`);
  await db.query(`delete from mural where area = 'TESTE API'`);
  await db.query(`delete from relatorios where titulo = 'TESTE API'`);
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data.users) if (/^(avaliador\.teste@example\.com|vencido\.teste@example\.com|limite\.teste@impacta\.edu\.br)$/.test(u.email || '')) await admin.auth.admin.deleteUser(u.id);
  await db.end();
}

let g = '';
for (const x of res) {
  if (x.grupo !== g) { g = x.grupo; console.log(`\n## ${g}`); }
  console.log(`${x.ok ? 'OK   ' : 'FALHA'} ${x.nome}${x.extra ? '  (' + x.extra + ')' : ''}`);
}
const falhas = res.filter((x) => !x.ok).length;
console.log(`\n${res.length - falhas} de ${res.length} verificações passaram.`);
process.exit(falhas ? 1 : 0);
