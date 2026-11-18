// Regras de e-mail usadas pelas funções do servidor.

export const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const RE_ALUNO = /^[a-z0-9_.-]+@aluno\.impacta\.edu\.br$/;
export const RE_IMPACTA = /^[a-z0-9_.+-]+@impacta\.edu\.br$/;

export function normalizarEmail(valor) {
  return String(valor ?? '').trim().toLowerCase();
}

export function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export function nomeDoEmail(email) {
  return email.split('@')[0].split(/[._-]+/).filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

// Busca o cadastro na tabela usuarios_cpa (ou null).
export async function buscarCadastro(sb, email) {
  const { data, error } = await sb
    .from('usuarios_cpa')
    .select('email, nome, role, expira_em')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export function cadastroValido(cadastro) {
  return !!cadastro && (!cadastro.expira_em || cadastro.expira_em >= hojeISO());
}

export function dataBR(iso) {
  const [a, m, d] = String(iso || '').split('-');
  return d && m && a ? `${d}/${m}/${a}` : String(iso || '');
}
