-- Portal da CPA - Faculdade Impacta
-- Esquema do banco (Supabase / Postgres). Pode ser executado mais de uma vez.

-- ------------------------------------------------------------------
-- Tabelas
-- ------------------------------------------------------------------

create table if not exists public.dashboards (
  id          text primary key,
  titulo      text not null,
  descricao   text,
  roles       text[] not null default '{}',
  url         text not null,
  ordem       int  not null default 0
);

create table if not exists public.mural (
  id         bigint generated always as identity primary key,
  area       text not null,
  demanda    text not null,
  resposta   text not null,
  status     text not null default 'Em andamento' check (status in ('Resolvido','Em andamento')),
  data       date not null default current_date,
  criado_por text
);

create table if not exists public.relatorios (
  id          bigint generated always as identity primary key,
  titulo      text not null,
  tipo        text not null default 'Relatório' check (tipo in ('Relatório','Boletim','Ata')),
  data        date not null default current_date,
  arquivo_url text not null
);

-- Pessoas com acesso além dos alunos (coordenação, CPA e avaliadores externos).
-- Alunos @aluno.impacta.edu.br entram sem cadastro prévio, com perfil "aluno".
-- O perfil "aluno" nesta tabela só é usado pela conta de demonstração.
-- Linhas "protegidas" (dono do portal e contas de demonstração) não mudam pela API.
create table if not exists public.usuarios_cpa (
  email      text primary key check (email = lower(email)),
  nome       text,
  role       text not null check (role in ('aluno','coord','cpa','aval')),
  tipo       text not null default 'sso' check (tipo in ('sso','token')),
  token      text,               -- legado (versão anterior usava token); não é mais usado no login
  expira_em  date,
  protegido  boolean not null default false,
  criado_em  timestamptz not null default now()
);

create table if not exists public.configuracoes (
  id        int primary key default 1 check (id = 1),
  chat_url  text,
  meet_url  text,
  horario   text,
  email_cpa text   -- e-mail institucional da CPA (fonte: Relatório de Autoavaliação 2025)
);

create table if not exists public.logs_acesso (
  id          bigint generated always as identity primary key,
  email       text not null,
  nome        text,
  role        text,
  metodo      text,
  acessado_em timestamptz not null default now()
);

create table if not exists public.mensagens_contato (
  id        bigint generated always as identity primary key,
  nome      text not null,
  email     text not null,
  mensagem  text not null,
  enviada_em timestamptz not null default now()
);

-- Controle de envio de códigos (limita tentativas por e-mail)
create table if not exists public.envios_codigo (
  id        bigint generated always as identity primary key,
  email     text not null,
  enviado_em timestamptz not null default now()
);
alter table public.envios_codigo add column if not exists ip text;
create index if not exists envios_codigo_email_idx on public.envios_codigo (email, enviado_em desc);
create index if not exists envios_codigo_ip_idx on public.envios_codigo (ip, enviado_em desc);

-- Um registro por arquivo (permite o script de envio rodar mais de uma vez)
create unique index if not exists relatorios_arquivo_url_key on public.relatorios (arquivo_url);

-- Atualizações para bancos criados antes destas colunas (ver supabase/migracoes/002_demo.sql)
alter table public.usuarios_cpa drop constraint if exists usuarios_cpa_role_check;
alter table public.usuarios_cpa add constraint usuarios_cpa_role_check
  check (role in ('aluno','coord','cpa','aval'));
alter table public.usuarios_cpa add column if not exists protegido boolean not null default false;

alter table public.configuracoes add column if not exists email_cpa text;
alter table public.configuracoes drop constraint if exists configuracoes_email_cpa_formato;
alter table public.configuracoes add constraint configuracoes_email_cpa_formato
  check (email_cpa is null or email_cpa ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$');

-- Painéis só com endereço do Looker Studio (o link vira um iframe para todos os perfis)
alter table public.dashboards drop constraint if exists dashboards_url_looker;
alter table public.dashboards add constraint dashboards_url_looker
  check (url ~ '^https://(lookerstudio|datastudio)\.google\.com/');

-- Quem criou e quem alterou por último cada linha (usado para restaurar a demonstração)
do $$
declare t text;
begin
  foreach t in array array['dashboards','mural','relatorios','configuracoes','usuarios_cpa'] loop
    execute format('alter table public.%I add column if not exists criado_por text', t);
    execute format('alter table public.%I add column if not exists atualizado_por text', t);
  end loop;
end $$;

-- ------------------------------------------------------------------
-- Perfil do usuário logado (calculado no banco, nunca no navegador)
-- ------------------------------------------------------------------

create or replace function public.meu_perfil()
returns text
language sql
stable
security definer
set search_path = public
as $$
  with e as (select lower(coalesce(auth.jwt() ->> 'email', '')) as email)
  select coalesce(
    (select u.role from public.usuarios_cpa u, e
      where u.email = e.email
        and (u.expira_em is null or u.expira_em >= current_date)),
    (select 'aluno' from e
      where e.email ~ '^[a-z0-9_.-]+@aluno\.impacta\.edu\.br$'),
    'vis'
  );
$$;

grant execute on function public.meu_perfil() to anon, authenticated;

create or replace function public.eh_cpa()
returns boolean language sql stable security definer set search_path = public
as $$ select public.meu_perfil() = 'cpa' $$;

grant execute on function public.eh_cpa() to anon, authenticated;

-- Perfil e nome do usuário logado (coordenação e avaliadores não podem ler usuarios_cpa)
create or replace function public.meus_dados()
returns json language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'perfil', public.meu_perfil(),
    'nome', (select u.nome from public.usuarios_cpa u
              where u.email = lower(coalesce(auth.jwt() ->> 'email', '')))
  )
$$;

grant execute on function public.meus_dados() to authenticated;

-- Contas de demonstração para a avaliação do projeto (senha pública, dados fictícios)
create or replace function public.eh_demo()
returns boolean language sql stable security definer set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) ~ '^[a-z0-9._-]+@cpa\.marcosfc\.site$'
$$;

grant execute on function public.eh_demo() to anon, authenticated;

-- Preenche criado_por (na criação) e atualizado_por (sempre) com o e-mail de quem está
-- logado. Quando a escrita vem do servidor (chave de serviço, sem e-mail no token),
-- mantém o valor enviado.
create or replace function public.registrar_autor()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  quem text := nullif(lower(coalesce(auth.jwt() ->> 'email', '')), '');
begin
  if tg_op = 'INSERT' then
    new.criado_por := coalesce(quem, new.criado_por);
  end if;
  new.atualizado_por := coalesce(quem, new.atualizado_por);
  return new;
end
$$;

do $$
declare t text;
begin
  foreach t in array array['dashboards','mural','relatorios','configuracoes','usuarios_cpa'] loop
    execute format('drop trigger if exists autor on public.%I', t);
    execute format('create trigger autor before insert or update on public.%I '
                   'for each row execute function public.registrar_autor()', t);
  end loop;
end $$;

-- ------------------------------------------------------------------
-- Permissões de acesso às tabelas (o RLS abaixo decide as linhas)
-- ------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;
grant select on public.dashboards, public.mural, public.relatorios, public.configuracoes to anon, authenticated;
grant update on public.configuracoes to authenticated;
grant insert, update, delete on public.dashboards, public.mural, public.relatorios to authenticated;
grant select, insert, update, delete on public.usuarios_cpa to authenticated;
grant select, insert on public.logs_acesso to authenticated;
grant select, delete on public.mensagens_contato to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- ------------------------------------------------------------------
-- Segurança por linha (RLS)
-- ------------------------------------------------------------------

alter table public.dashboards        enable row level security;
alter table public.mural             enable row level security;
alter table public.relatorios        enable row level security;
alter table public.usuarios_cpa      enable row level security;
alter table public.configuracoes     enable row level security;
alter table public.logs_acesso       enable row level security;
alter table public.mensagens_contato enable row level security;
alter table public.envios_codigo     enable row level security;

-- Dashboards: cada perfil vê apenas os painéis liberados para ele
drop policy if exists dashboards_ler on public.dashboards;
create policy dashboards_ler on public.dashboards for select
  using (public.meu_perfil() = any (roles) or public.eh_cpa());
drop policy if exists dashboards_editar on public.dashboards;
create policy dashboards_editar on public.dashboards for update
  using (public.eh_cpa()) with check (public.eh_cpa());
drop policy if exists dashboards_inserir on public.dashboards;
create policy dashboards_inserir on public.dashboards for insert
  with check (public.eh_cpa());
drop policy if exists dashboards_apagar on public.dashboards;
create policy dashboards_apagar on public.dashboards for delete
  using (public.eh_cpa());

-- Mural e relatórios: leitura pública, escrita só da CPA
drop policy if exists mural_ler on public.mural;
create policy mural_ler on public.mural for select using (true);
drop policy if exists mural_escrever on public.mural;
create policy mural_escrever on public.mural for all
  using (public.eh_cpa()) with check (public.eh_cpa());

drop policy if exists relatorios_ler on public.relatorios;
create policy relatorios_ler on public.relatorios for select using (true);
drop policy if exists relatorios_escrever on public.relatorios;
create policy relatorios_escrever on public.relatorios for all
  using (public.eh_cpa()) with check (public.eh_cpa());

-- Configurações (links de contato): leitura pública, edição da CPA
drop policy if exists config_ler on public.configuracoes;
create policy config_ler on public.configuracoes for select using (true);
drop policy if exists config_editar on public.configuracoes;
create policy config_editar on public.configuracoes for update
  using (public.eh_cpa()) with check (public.eh_cpa());

-- Usuários autorizados: só a CPA vê e altera. Linhas protegidas não mudam pela API,
-- ninguém cria linha protegida e a conta de demonstração não cria administrador.
drop policy if exists usuarios_cpa_admin on public.usuarios_cpa;
drop policy if exists usuarios_cpa_ler on public.usuarios_cpa;
create policy usuarios_cpa_ler on public.usuarios_cpa for select
  using (public.eh_cpa());
drop policy if exists usuarios_cpa_inserir on public.usuarios_cpa;
create policy usuarios_cpa_inserir on public.usuarios_cpa for insert
  with check (public.eh_cpa() and not protegido
              and (not public.eh_demo() or role <> 'cpa'));
drop policy if exists usuarios_cpa_alterar on public.usuarios_cpa;
create policy usuarios_cpa_alterar on public.usuarios_cpa for update
  using (public.eh_cpa() and not protegido)
  with check (public.eh_cpa() and not protegido
              and (not public.eh_demo() or role <> 'cpa'));
drop policy if exists usuarios_cpa_apagar on public.usuarios_cpa;
create policy usuarios_cpa_apagar on public.usuarios_cpa for delete
  using (public.eh_cpa() and not protegido);

-- Logs: cada pessoa registra o próprio acesso; só a CPA consulta
drop policy if exists logs_inserir on public.logs_acesso;
create policy logs_inserir on public.logs_acesso for insert to authenticated
  with check (lower(email) = lower(auth.jwt() ->> 'email') and role = public.meu_perfil());
-- (a conta de demonstração só vê acessos e mensagens das próprias contas de demonstração)
drop policy if exists logs_ler on public.logs_acesso;
create policy logs_ler on public.logs_acesso for select
  using (public.eh_cpa() and (not public.eh_demo() or email like '%@cpa.marcosfc.site'));

-- Mensagens de contato: gravadas pelo servidor; só a CPA lê e apaga
drop policy if exists mensagens_ler on public.mensagens_contato;
create policy mensagens_ler on public.mensagens_contato for select
  using (public.eh_cpa() and (not public.eh_demo() or email like '%@cpa.marcosfc.site'));
drop policy if exists mensagens_apagar on public.mensagens_contato;
create policy mensagens_apagar on public.mensagens_contato for delete
  using (public.eh_cpa() and (not public.eh_demo() or email like '%@cpa.marcosfc.site'));

-- envios_codigo: sem políticas = acesso apenas pelo servidor (service role)

-- ------------------------------------------------------------------
-- Armazenamento dos PDFs de relatórios
-- ------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('relatorios', 'relatorios', true, 52428800, array['application/pdf'])
on conflict (id) do update
  set public = true, file_size_limit = 52428800, allowed_mime_types = array['application/pdf'];

drop policy if exists relatorios_arquivos_ler on storage.objects;
create policy relatorios_arquivos_ler on storage.objects for select
  using (bucket_id = 'relatorios');
drop policy if exists relatorios_arquivos_enviar on storage.objects;
create policy relatorios_arquivos_enviar on storage.objects for insert
  with check (bucket_id = 'relatorios' and public.eh_cpa());
drop policy if exists relatorios_arquivos_apagar on storage.objects;
create policy relatorios_arquivos_apagar on storage.objects for delete
  using (bucket_id = 'relatorios' and public.eh_cpa());
