import { supabaseAdmin } from './_lib/supabase.js';
import { json, erro, somentePost, lerCorpo, texto, urlPortal } from './_lib/http.js';
import { sendEmail } from './_lib/email.js';
import { emailConvite } from './_lib/emails.js';
import {
  RE_EMAIL, RE_IMPACTA, RE_ALUNO, normalizarEmail, nomeDoEmail, hojeISO,
  buscarCadastro, cadastroValido
} from './_lib/regras.js';

const PAPEIS = ['aval', 'coord', 'cpa'];
const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req, res) {
  if (!somentePost(req, res)) return;

  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return erro(res, 401, 'Entre no portal para enviar convites.');

  let corpo;
  try {
    corpo = await lerCorpo(req);
  } catch {
    return erro(res, 413, 'Requisição grande demais.');
  }

  const email = normalizarEmail(corpo.email);
  const role = String(corpo.role || '');
  const nome = texto(corpo.nome, 120);
  const expiraEm = corpo.expira_em ? String(corpo.expira_em) : null;
  const enviar = corpo.enviar !== false;

  if (!email || email.length > 254 || !RE_EMAIL.test(email)) return erro(res, 400, 'Informe um e-mail válido.');
  if (!PAPEIS.includes(role)) return erro(res, 400, 'Perfil inválido.');
  // Coordenação usa @impacta.edu.br; a CPA também aceita representantes discentes (@aluno).
  if (role === 'coord' && !RE_IMPACTA.test(email)) {
    return erro(res, 400, 'Coordenação precisa de um e-mail @impacta.edu.br.');
  }
  if (role === 'cpa' && !RE_IMPACTA.test(email) && !RE_ALUNO.test(email)) {
    return erro(res, 400, 'A CPA precisa de um e-mail da Impacta.');
  }
  if (role === 'aval' && !nome) return erro(res, 400, 'Informe o nome do avaliador.');
  if (role === 'aval' && !expiraEm) return erro(res, 400, 'Informe até quando o acesso do avaliador vale.');
  if (expiraEm && (!RE_DATA.test(expiraEm) || Number.isNaN(Date.parse(expiraEm)))) return erro(res, 400, 'Data de validade inválida.');
  if (expiraEm && expiraEm < hojeISO()) return erro(res, 400, 'A validade precisa ser hoje ou uma data futura.');

  try {
    const sb = supabaseAdmin();

    // Quem está convidando precisa ser da CPA
    const { data: quem, error: erroToken } = await sb.auth.getUser(token);
    if (erroToken || !quem?.user?.email) return erro(res, 401, 'Sua sessão expirou. Entre de novo.');
    const autor = await buscarCadastro(sb, normalizarEmail(quem.user.email));
    if (!cadastroValido(autor) || autor.role !== 'cpa') {
      return erro(res, 403, 'Só a administração da CPA pode enviar convites.');
    }
    if (autor.email === email) {
      return erro(res, 400, 'Você não pode mudar o próprio perfil por aqui.');
    }

    const linha = {
      email,
      nome: nome || nomeDoEmail(email),
      role,
      tipo: role === 'aval' ? 'token' : 'sso',
      token: null,
      expira_em: expiraEm
    };
    const { error: erroGravar } = await sb.from('usuarios_cpa').upsert(linha, { onConflict: 'email' });
    if (erroGravar) throw erroGravar;

    let enviado = false;
    if (enviar) {
      const mensagem = emailConvite({
        nome: linha.nome,
        email,
        role,
        expiraEm,
        portalUrl: urlPortal(req),
        convidadoPor: autor.nome || autor.email
      });
      try {
        await sendEmail({ to: email, ...mensagem });
        enviado = true;
      } catch (e) {
        console.error('[convite] e-mail', e?.message || e);
        return json(res, 200, { ok: true, enviado: false, aviso: 'Acesso liberado, mas o e-mail de convite não foi enviado. Tente reenviar mais tarde.' });
      }
    }

    return json(res, 200, { ok: true, enviado });
  } catch (e) {
    console.error('[convite]', e?.message || e);
    return erro(res, 500, 'Não foi possível salvar o convite agora.');
  }
}
