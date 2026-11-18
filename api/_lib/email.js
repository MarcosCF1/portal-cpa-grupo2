// Envio de e-mail pela API do Resend.

export async function sendEmail({ to, subject, html, text, replyTo }) {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) throw new Error('RESEND_API_KEY não configurada.');
  const corpo = {
    from: process.env.EMAIL_FROM || 'Portal da CPA <onboarding@resend.dev>',
    to: Array.isArray(to) ? to : [to],
    subject: String(subject).replace(/[\r\n]+/g, ' ').slice(0, 200),
    html,
    text
  };
  if (replyTo) corpo.reply_to = replyTo;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${chave}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(corpo)
  });
  if (!resp.ok) {
    const detalhe = await resp.text().catch(() => '');
    throw new Error(`Resend respondeu ${resp.status}: ${detalhe.slice(0, 300)}`);
  }
  return resp.json().catch(() => ({}));
}
