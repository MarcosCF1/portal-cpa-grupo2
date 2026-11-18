import { createClient } from '@supabase/supabase-js';

let cliente = null;

// Cliente com a chave de serviço. Só roda no servidor; nunca vai para o navegador.
export function supabaseAdmin() {
  if (cliente) return cliente;
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configuradas.');
  }
  cliente = createClient(url, chave, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return cliente;
}
