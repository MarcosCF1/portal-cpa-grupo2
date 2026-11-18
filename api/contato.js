import { supabaseAdmin } from './_lib/supabase.js';
import { json, erro, somentePost, lerCorpo, texto, urlPortal } from './_lib/http.js';
import { sendEmail } from './_lib/email.js';
import { emailContato } from './_lib/emails.js';
import { RE_EMAIL, normalizarEmail } from './_lib/regras.js';

const MAX_NOME = 120;
const MAX_MENSAGEM = 4000;
const MAX_POR_HORA = 5;

export default async function handler(req, res) {
  if (!somentePost(req, res)) return;

  let corpo;
  try {
    corpo = await lerCorpo(req);
  } catch {
    return erro(res, 413, 'Mensagem grande demais.');
  }

  // Campo escondido: robôs costumam preencher
  if (texto(corpo.site, 200)) return json(res, 200, { ok: true });

  const nome = texto(String(corpo.nome ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' '), MAX_NOME + 1);
  const email = normalizarEmail(corpo.email);
  const mensagem = String(corpo.mensagem ?? '').trim();

  if (!nome) return erro(res, 400, 'Informe o seu nome.');
  if (nome.length > MAX_NOME) return erro(res, 400, `O nome pode ter até ${MAX_NOME} caracteres.`);
  if (!email || email.length > 254 || !RE_EMAIL.test(email)) return erro(res, 400, 'Informe um e-mail válido para a resposta.');
  if (mensagem.length < 5) return erro(res, 400, 'Escreva a sua mensagem.');
  if (mensagem.length > MAX_MENSAGEM) return erro(res, 400, `A mensagem pode ter até ${MAX_MENSAGEM} caracteres.`);

  const destino = process.env.CPA_EMAIL;
  if (!destino) {
    console.error('[contato] CPA_EMAIL não configurado');
    return erro(res, 500, 'O contato está indisponível no momento. Use o Google Chat ou o Meet.');
  }

  try {
    const sb = supabaseAdmin();

    const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentes = await sb.from('mensagens_contato')
      .select('id', { count: 'exact', head: true })
      .eq('email', email).gte('enviada_em', desde);
    if (recentes.error) throw recentes.error;
    if ((recentes.count || 0) >= MAX_POR_HORA) {
      return erro(res, 429, 'Recebemos várias mensagens deste e-mail na última hora. Tente mais tarde.');
    }

    const { data, error } = await sb.from('mensagens_contato')
      .insert({ nome, email, mensagem })
      .select('enviada_em')
      .single();
    if (error) throw error;

    try {
      const msg = emailContato({ nome, email, mensagem, enviadaEm: data?.enviada_em, portalUrl: urlPortal(req) });
      await sendEmail({ to: destino, replyTo: email, ...msg });
    } catch (e) {
      // A mensagem já está salva e aparece para a CPA no portal.
      console.error('[contato] e-mail', e?.message || e);
    }

    return json(res, 200, { ok: true });
  } catch (e) {
    console.error('[contato]', e?.message || e);
    return erro(res, 500, 'Não foi possível enviar a mensagem agora. Tente de novo em alguns minutos.');
  }
}
