-- Portal da CPA - migração 003: e-mail institucional da CPA na página de contato
-- Rode depois da 002 e antes do seed.sql. Pode ser executada mais de uma vez.
--
-- Fonte do endereço: Relatório de Autoavaliação Institucional 2025 da Faculdade Impacta
-- ("E-MAIL da CPA: cpa@impacta.edu.br"). A administração pode trocar pela tela Contato.

alter table public.configuracoes add column if not exists email_cpa text;

alter table public.configuracoes drop constraint if exists configuracoes_email_cpa_formato;
alter table public.configuracoes add constraint configuracoes_email_cpa_formato
  check (email_cpa is null or email_cpa ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$');

update public.configuracoes set email_cpa = 'cpa@impacta.edu.br'
 where id = 1 and email_cpa is null;
