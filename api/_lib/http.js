// Utilidades de resposta e leitura do corpo das requisições.

export function json(res, status, dados) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(dados));
}

export function erro(res, status, mensagem, extra = {}) {
  return json(res, status, { ok: false, erro: mensagem, ...extra });
}

export function somentePost(req, res) {
  if (req.method === 'POST') return true;
  res.setHeader('Allow', 'POST');
  erro(res, 405, 'Método não permitido.');
  return false;
}

const LIMITE_CORPO = 32 * 1024;

export async function lerCorpo(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
    return interpretar(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body));
  }
  let texto = '';
  for await (const parte of req) {
    texto += parte;
    if (texto.length > LIMITE_CORPO) throw new Error('corpo grande demais');
  }
  return interpretar(texto);
}

function interpretar(texto) {
  if (!texto) return {};
  try {
    const dados = JSON.parse(texto);
    return dados && typeof dados === 'object' ? dados : {};
  } catch {
    return {};
  }
}

export function ipDe(req) {
  const encaminhado = req.headers['x-forwarded-for'];
  if (encaminhado) return String(encaminhado).split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
}

export function texto(valor, max) {
  return String(valor ?? '').trim().slice(0, max);
}

export function urlPortal(req) {
  if (process.env.PORTAL_URL) return process.env.PORTAL_URL.replace(/\/+$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return host ? `${proto}://${host}` : 'https://cpa.impacta.edu.br';
}
