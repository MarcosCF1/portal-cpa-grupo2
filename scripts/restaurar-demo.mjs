// Volta a demonstração do portal ao estado inicial.
//
// O que faz:
// 1. Cria (ou corrige) as contas de demonstração no Supabase Auth, com a senha de avaliação.
// 2. Apaga tudo o que as contas de demonstração criaram ou alteraram por último:
//    painéis, devolutivas, documentos (e os PDFs enviados), links de atendimento,
//    pessoas autorizadas não protegidas e mensagens de contato vindas das contas de demonstração.
// 3. Reaplica supabase/seed.sql (painéis, devolutivas, links e contas protegidas).
// 4. Reenvia os PDFs oficiais se algum estiver faltando.
//
// Não mexe no histórico de acessos nem em nada feito por contas reais.
// Atenção: se a conta de demonstração apagou ou mudou o perfil de uma pessoa real não protegida,
// essa pessoa precisa ser autorizada de novo pela tela Acessos e Perfis.
//
// Uso (na pasta do projeto):
//   node scripts/restaurar-demo.mjs            lê as variáveis do ambiente ou de .env.local / .env
//   node scripts/restaurar-demo.mjs --remover  apaga as contas de demonstração (depois da avaliação)
//
// Variáveis: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e POSTGRES_URL_NON_POOLING (ou DATABASE_URL).
// Opcional: DEMO_SENHA (padrão abaixo) e RELATORIOS_PASTA (pasta com os PDFs oficiais).

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { RELATORIOS, PASTA_PADRAO, enviarRelatorios } from './upload-relatorios.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

// Senha pública das contas de demonstração (está no README; os dados são fictícios)
const SENHA_PADRAO = 'CPA-Impacta-2026';
const DOMINIO_DEMO = '@cpa.marcosfc.site';
export const CONTAS_DEMO = [
  { email: 'aluno.demo@cpa.marcosfc.site', nome: 'Aluno Demonstração' },
  { email: 'admin.demo@cpa.marcosfc.site', nome: 'Administração Demonstração' },
  { email: 'coord.demo@cpa.marcosfc.site', nome: 'Coordenação Demonstração' },
  { email: 'avaliador.demo@cpa.marcosfc.site', nome: 'Avaliador Demonstração' }
];

// Carrega .env.local / .env sem sobrescrever o que já está no ambiente
function carregarEnv() {
  for (const nome of ['.env.local', '.env']) {
    const arquivo = join(raiz, nome);
    if (!existsSync(arquivo)) continue;
    for (const linha of readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
    }
  }
}

async function todosUsuarios(sb) {
  const lista = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    lista.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return lista;
}

async function prepararContas(sb, senha) {
  const usuarios = await todosUsuarios(sb);
  const ids = [];
  for (const c of CONTAS_DEMO) {
    const existente = usuarios.find((u) => (u.email || '').toLowerCase() === c.email);
    if (existente) {
      const { error } = await sb.auth.admin.updateUserById(existente.id, { password: senha, email_confirm: true });
      if (error) throw error;
      ids.push(existente.id);
      console.log(`conta ok: ${c.email}`);
    } else {
      const { data, error } = await sb.auth.admin.createUser({ email: c.email, password: senha, email_confirm: true });
      if (error) throw error;
      ids.push(data.user.id);
      console.log(`conta criada: ${c.email}`);
    }
  }
  return ids;
}

async function removerContas(sb, db) {
  const usuarios = await todosUsuarios(sb);
  for (const c of CONTAS_DEMO) {
    const u = usuarios.find((x) => (x.email || '').toLowerCase() === c.email);
    if (u) {
      const { error } = await sb.auth.admin.deleteUser(u.id);
      if (error) throw error;
    }
  }
  await db.query(`delete from public.usuarios_cpa where email like '%' || $1`, [DOMINIO_DEMO]);
  console.log('Contas de demonstração removidas. Para voltar a usá-las, rode o script sem --remover.');
}

// Caminho do arquivo dentro do bucket a partir da URL pública
function caminhoNoBucket(url, base) {
  const prefixo = `${base}/storage/v1/object/public/relatorios/`;
  if (!url || !url.startsWith(prefixo)) return null;
  return decodeURIComponent(url.slice(prefixo.length).split('?')[0]);
}

async function limparAlteracoes(db, sb, base, idsDemo) {
  const demo = `%${DOMINIO_DEMO}`;
  const arquivos = new Set();
  await db.query('begin');
  try {
    const rels = await db.query(
      `delete from public.relatorios where criado_por like $1 or atualizado_por like $1 returning arquivo_url`, [demo]);
    for (const r of rels.rows) {
      const c = caminhoNoBucket(r.arquivo_url, base);
      if (c && !c.startsWith('oficiais/')) arquivos.add(c);
    }
    const mural = await db.query(`delete from public.mural where criado_por like $1 or atualizado_por like $1`, [demo]);
    const dash = await db.query(`delete from public.dashboards where criado_por like $1 or atualizado_por like $1`, [demo]);
    const cfg = await db.query(`delete from public.configuracoes where atualizado_por like $1`, [demo]);
    const pessoas = await db.query(
      `delete from public.usuarios_cpa where not protegido and (criado_por like $1 or atualizado_por like $1)`, [demo]);
    const msgs = await db.query(`delete from public.mensagens_contato where email like $1`, [demo]);
    // PDFs enviados pelas contas de demonstração, mesmo os que ficaram sem cadastro
    const objs = await db.query(
      `select name from storage.objects where bucket_id = 'relatorios' and owner_id = any($1::text[])`, [idsDemo]);
    for (const o of objs.rows) if (!o.name.startsWith('oficiais/')) arquivos.add(o.name);

    await db.query(readFileSync(join(raiz, 'supabase', 'seed.sql'), 'utf8'));
    await db.query('commit');
    console.log(`limpeza: ${dash.rowCount} painel(is), ${mural.rowCount} devolutiva(s), ${rels.rowCount} documento(s), ` +
      `${cfg.rowCount} configuração, ${pessoas.rowCount} pessoa(s), ${msgs.rowCount} mensagem(ns); seed reaplicado`);
  } catch (e) {
    await db.query('rollback');
    throw e;
  }
  if (arquivos.size) {
    const { error } = await sb.storage.from('relatorios').remove([...arquivos]);
    if (error) console.error(`aviso: arquivos não removidos do Storage: ${error.message}`);
    else console.log(`${arquivos.size} PDF(s) enviados pela demonstração removidos do Storage`);
  }
}

// Confere se os 3 PDFs oficiais estão cadastrados e abrindo; se não, envia de novo
async function conferirRelatorios(sb, base) {
  let faltando = false;
  for (const r of RELATORIOS) {
    const url = `${base}/storage/v1/object/public/relatorios/${r.caminho}`;
    const { data } = await sb.from('relatorios').select('id').eq('arquivo_url', url).maybeSingle();
    const resp = await fetch(url, { method: 'HEAD' }).catch(() => null);
    if (!data || !resp || resp.status !== 200) { faltando = true; break; }
  }
  if (!faltando) { console.log('relatórios oficiais: ok'); return 0; }
  console.log('relatórios oficiais: faltando, enviando de novo');
  return enviarRelatorios(sb, process.env.RELATORIOS_PASTA || PASTA_PADRAO);
}

async function principal() {
  carregarEnv();
  const base = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const conexao = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
  if (!base || !chave || !conexao) {
    console.error('Defina SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e POSTGRES_URL_NON_POOLING (ou DATABASE_URL).');
    process.exit(1);
  }
  const sb = createClient(base, chave, { auth: { persistSession: false, autoRefreshToken: false } });
  const db = new pg.Client({
    connectionString: conexao.replace(/[?&]sslmode=[^&]*/, ''),
    ssl: { rejectUnauthorized: false }
  });
  await db.connect();
  try {
    if (process.argv.includes('--remover')) {
      await removerContas(sb, db);
      return 0;
    }
    const ids = await prepararContas(sb, process.env.DEMO_SENHA || SENHA_PADRAO);
    await limparAlteracoes(db, sb, base, ids);
    const falhas = await conferirRelatorios(sb, base);
    console.log(falhas ? `Terminou com ${falhas} falha(s) nos relatórios.` : 'Pronto: demonstração restaurada.');
    return falhas ? 1 : 0;
  } finally {
    await db.end();
  }
}

principal().then((codigo) => process.exit(codigo)).catch((e) => {
  console.error('Erro:', e?.message || e);
  process.exit(1);
});
