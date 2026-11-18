// Envia os PDFs oficiais da CPA para o Storage do Supabase e cadastra cada um em "relatorios".
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/upload-relatorios.mjs [pasta]
// Sem [pasta], procura em ../relatorios (pasta irmã do projeto). Pode rodar mais de uma vez.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const pasta = resolve(process.argv[2] || join(raiz, '..', 'relatorios'));
const BUCKET = 'relatorios';

const RELATORIOS = [
  {
    arquivo: 'Relatorio_de_Autoavaliacao_-_Faculdade_Impacta_-_2025.pdf',
    caminho: 'oficiais/relatorio-autoavaliacao-2025.pdf',
    titulo: 'Relatório de Autoavaliação Institucional 2025',
    data: '2026-03-31'
  },
  {
    arquivo: 'Relatorio_de_Autoavaliacao_Trienal_-_Faculdade_Impacta_-_2022-2024.pdf',
    caminho: 'oficiais/relatorio-autoavaliacao-trienal-2022-2024.pdf',
    titulo: 'Relatório de Autoavaliação Trienal 2022–2024',
    data: '2025-03-31'
  },
  {
    arquivo: 'Projeto_de_Avaliacao_Institucional_-_Faculdade_Impacta_-_2025-2027.pdf',
    caminho: 'oficiais/projeto-avaliacao-institucional-2025-2027.pdf',
    titulo: 'Projeto de Avaliação Institucional 2025–2027',
    data: '2025-06-30'
  }
];

const url = process.env.SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar.');
  process.exit(1);
}
if (!existsSync(pasta)) {
  console.error(`Pasta não encontrada: ${pasta}`);
  process.exit(1);
}

const sb = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
let falhas = 0;

for (const r of RELATORIOS) {
  const origem = join(pasta, r.arquivo);
  if (!existsSync(origem)) {
    console.error(`Faltando: ${origem}`);
    falhas++;
    continue;
  }
  const tamanho = (statSync(origem).size / 1024 / 1024).toFixed(1);
  process.stdout.write(`Enviando ${r.arquivo} (${tamanho} MB)... `);

  const envio = await sb.storage.from(BUCKET).upload(r.caminho, readFileSync(origem), {
    contentType: 'application/pdf',
    cacheControl: '86400',
    upsert: true
  });
  if (envio.error) {
    console.error(`erro: ${envio.error.message}`);
    falhas++;
    continue;
  }

  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(r.caminho);
  const linha = { titulo: r.titulo, tipo: 'Relatório', data: r.data, arquivo_url: pub.publicUrl };

  const existente = await sb.from('relatorios').select('id').eq('arquivo_url', pub.publicUrl).maybeSingle();
  if (existente.error) {
    console.error(`erro ao consultar: ${existente.error.message}`);
    falhas++;
    continue;
  }
  const gravar = existente.data
    ? await sb.from('relatorios').update(linha).eq('id', existente.data.id)
    : await sb.from('relatorios').insert(linha);
  if (gravar.error) {
    console.error(`erro ao gravar: ${gravar.error.message}`);
    falhas++;
    continue;
  }
  console.log(existente.data ? 'atualizado' : 'cadastrado');
}

console.log(falhas ? `\nTerminou com ${falhas} falha(s).` : '\nPronto: os 3 relatórios estão no portal.');
process.exit(falhas ? 1 : 0);
