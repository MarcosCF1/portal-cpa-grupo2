import { supabaseAdmin } from './_lib/supabase.js';
import { json, erro, somentePost, lerCorpo, ipDe, urlPortal } from './_lib/http.js';
import { sendEmail } from './_lib/email.js';
import { emailCodigo } from './_lib/emails.js';
import {
  RE_EMAIL, RE_ALUNO, normalizarEmail, nomeDoEmail,
  buscarCadastro, cadastroValido, dataBR
} from './_lib/regras.js';

const JANELA_MIN = 10;
const MAX_POR_EMAIL = 3;
// Limite alto por IP: o Wi-Fi do campus costuma sair por um único endereço
const MAX_POR_IP = 60;

export default async function handler(req, res) {
  if (!somentePost(req, res)) return;

  let corpo;
  try {
    corpo = await lerCorpo(req);
  } catch {
    return erro(res, 413, 'Requisição grande demais.');
  }

  const email = normalizarEmail(corpo.email);
  if (!email || email.length > 254 || !RE_EMAIL.test(email)) {
    return erro(res, 400, 'Informe um e-mail válido.');
  }

  try {
    const sb = supabaseAdmin();

    // 1. Quem pode receber código
    const cadastro = await buscarCadastro(sb, email);
    const ehAluno = RE_ALUNO.test(email);
    if (!cadastroValido(cadastro) && !ehAluno) {
      if (cadastro && cadastro.expira_em) {
        return erro(res, 403, `O seu acesso terminou em ${dataBR(cadastro.expira_em)}. Peça a renovação à CPA.`, { motivo: 'expirado' });
      }
      if (email.endsWith('@aluno.impacta.edu.br')) {
        return erro(res, 403, 'Este e-mail de aluno não está no formato esperado. Use o endereço @aluno.impacta.edu.br fornecido pela faculdade, sem acentos ou espaços.', { motivo: 'formato' });
      }
      if (email.endsWith('@impacta.edu.br')) {
        return erro(res, 403, 'Este e-mail @impacta.edu.br ainda não foi autorizado. Peça a liberação à CPA.', { motivo: 'nao_autorizado' });
      }
      return erro(res, 403, 'Este e-mail não tem acesso ao portal. Alunos entram com o @aluno.impacta.edu.br; coordenação e avaliadores externos precisam ser autorizados pela CPA.', { motivo: 'nao_autorizado' });
    }

    // 2. Limite de envios
    const desde = new Date(Date.now() - JANELA_MIN * 60 * 1000).toISOString();
    const ip = String(ipDe(req)).slice(0, 64);
    const [porEmail, porIp] = await Promise.all([
      sb.from('envios_codigo').select('id', { count: 'exact', head: true }).eq('email', email).gte('enviado_em', desde),
      ip
        ? sb.from('envios_codigo').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('enviado_em', desde)
        : Promise.resolve({ count: 0 })
    ]);
    if (porEmail.error) throw porEmail.error;
    if (porIp.error) throw porIp.error;
    if ((porEmail.count || 0) >= MAX_POR_EMAIL || (porIp.count || 0) >= MAX_POR_IP) {
      res.setHeader('Retry-After', String(JANELA_MIN * 60));
      return erro(res, 429, `Você já pediu vários códigos. Espere ${JANELA_MIN} minutos e tente de novo.`);
    }
    const registro = await sb.from('envios_codigo').insert({ email, ip: ip || null });
    if (registro.error) throw registro.error;

    // 3. Conta no Supabase Auth (criada na primeira vez)
    const criado = await sb.auth.admin.createUser({ email, email_confirm: true });
    if (criado.error && !jaExiste(criado.error)) throw criado.error;

    // 4. Código de uso único gerado pelo Supabase
    const link = await sb.auth.admin.generateLink({ type: 'magiclink', email });
    if (link.error) throw link.error;
    const codigo = link.data?.properties?.email_otp;
    if (!/^\d{6}$/.test(String(codigo || ''))) {
      throw new Error('O Supabase não devolveu um código de 6 dígitos. Confira o tamanho do código em Authentication > Providers > Email.');
    }

    // 5. E-mail
    const nome = (cadastroValido(cadastro) && cadastro.nome) || (ehAluno ? nomeDoEmail(email) : '');
    const mensagem = emailCodigo({ codigo, nome, portalUrl: urlPortal(req) });
    await sendEmail({ to: email, ...mensagem });

    return json(res, 200, { ok: true });
  } catch (e) {
    console.error('[send-code]', e?.message || e);
    return erro(res, 500, 'Não foi possível enviar o código agora. Tente de novo em alguns minutos.');
  }
}

function jaExiste(error) {
  return error?.code === 'email_exists' || error?.code === 'user_already_exists' ||
    error?.status === 422 || /already (been )?registered|already exists/i.test(error?.message || '');
}
