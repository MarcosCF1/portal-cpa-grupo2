# Evidências

Prints do portal publicado (https://cpa.marcosfc.site), gerados em 18/11/2026 pelo script [`scripts/testar-telas.mjs`](../scripts/testar-telas.mjs) com as contas de demonstração (dados fictícios). Computador: 1366 px de largura, em [`img/`](img). Celular: 390 px, em [`img/mobile/`](img/mobile), com o mesmo nome de arquivo. Onde a tela mostraria o e-mail do dono do portal, o print troca por `dono.portal@aluno.impacta.edu.br`.

Os resultados dos testes estão em [testes.md](testes.md); os requisitos (RF/RNF) em [requisitos.md](requisitos.md).

## Por fase do plano

### Fase 1 — Levantamento de requisitos
- [requisitos.md](requisitos.md): requisitos funcionais e não funcionais numerados, perfis e matriz de permissões, tirados do edital e das orientações da CPA.
- [dashboards.md](dashboards.md) e [kpis-cpa.md](kpis-cpa.md): painéis e indicadores enviados pela CPA.

### Fase 2 — Modelagem e design
- [modelo-de-dados.md](modelo-de-dados.md): tabelas, relações (diagrama) e regras de acesso.
- [identidade-visual.md](identidade-visual.md): cores e fontes da Impacta aplicadas nas telas abaixo.

| Print | O que comprova |
|---|---|
| [10-login](img/10-login.png) · [celular](img/mobile/10-login.png) | layout com a identidade visual e o dado de adesão do Relatório 2025 |
| [62-acessos-quem-ve-o-que](img/62-acessos-quem-ve-o-que.png) | a matriz de permissões modelada aparece para a CPA, lida do banco |

### Fase 3 — Desenvolvimento do portal (login, perfis e dashboards)

| Print | O que comprova | Requisito |
|---|---|---|
| [10-login](img/10-login.png) | login por e-mail com código | RF01, RF02 |
| [13-login-codigo](img/13-login-codigo.png) · [celular](img/mobile/13-login-codigo.png) | tela das 6 caixas e "Reenviar código" bloqueado por 60 s | RF02, RNF04 |
| [14-login-codigo-errado](img/14-login-codigo-errado.png) | código errado recusado pelo Supabase, com mensagem clara | RF02, RNF07 |
| [11-login-nao-autorizado](img/11-login-nao-autorizado.png) | e-mail externo não autorizado é recusado pelo servidor | RF03 |
| [12-login-formato-aluno](img/12-login-formato-aluno.png) | e-mail de aluno com acento é recusado antes do envio | RF03, RNF07 |
| [15-login-demonstracao](img/15-login-demonstracao.png) · [celular](img/mobile/15-login-demonstracao.png) | acesso de demonstração com e-mail e senha (o print mostra a senha errada recusada) | RF13 |
| [20-aluno-dashboards](img/20-aluno-dashboards.png) · [celular](img/mobile/20-aluno-dashboards.png) | aluno vê só os 2 painéis da pesquisa com alunos | RF05 |
| [30-coord-dashboards](img/30-coord-dashboards.png) · [celular](img/mobile/30-coord-dashboards.png) | coordenação vê os 4 painéis (inclui avaliação docente) | RF05 |
| [40-avaliador-dashboards](img/40-avaliador-dashboards.png) · [celular](img/mobile/40-avaliador-dashboards.png) | avaliador externo vê todos os painéis, com aviso sobre o Looker | RF04, RF05 |
| [50-admin-dashboards](img/50-admin-dashboards.png) | CPA vê todos os painéis | RF05 |
| [51-admin-editar-e-adicionar-painel](img/51-admin-editar-e-adicionar-painel.png) · [celular](img/mobile/51-admin-editar-e-adicionar-painel.png) | editar link e perfis, link fora do Looker recusado, formulário para adicionar painel | RF06 |
| [52-admin-painel-adicionado](img/52-admin-painel-adicionado.png) | painel novo aparece como aba | RF06 |
| [53-admin-remover-painel](img/53-admin-remover-painel.png) | remoção de painel com confirmação | RF06 |

### Fase 4 — Funcionalidades complementares (mural, relatórios, contato, responsividade)

| Print | O que comprova | Requisito |
|---|---|---|
| [01-mural](img/01-mural.png) · [celular](img/mobile/01-mural.png) | mural público, sem login, com resumo | RF07 |
| [02-mural-filtro](img/02-mural-filtro.png) | filtro "Resolvidas" | RF07 |
| [03-mural-busca-vazia](img/03-mural-busca-vazia.png) | busca sem resultado com aviso | RF07 |
| [20-aluno-mural](img/20-aluno-mural.png) | aluno logado não vê botões de administração | RF08 |
| [54-admin-publicar-devolutiva](img/54-admin-publicar-devolutiva.png) | formulário de publicação da CPA | RF08 |
| [55-admin-mural](img/55-admin-mural.png) · [celular](img/mobile/55-admin-mural.png) | devolutiva publicada e marcada como resolvida; botões da CPA | RF08 |
| [04-relatorios](img/04-relatorios.png) · [celular](img/mobile/04-relatorios.png) | 3 relatórios oficiais para baixar e abrir | RF09 |
| [56-admin-enviar-pdf](img/56-admin-enviar-pdf.png) | envio de PDF pela CPA | RF10 |
| [57-admin-relatorios](img/57-admin-relatorios.png) | documento enviado publicado, com "Remover" | RF10 |
| [05-contato](img/05-contato.png) · [celular](img/mobile/05-contato.png) | horário, botões do Chat e do Meet e formulário | RF11 |
| [06-contato-erro](img/06-contato-erro.png) | validação do formulário vazio | RF11, RNF07 |
| [07-contato-enviado](img/07-contato-enviado.png) | confirmação de envio (no print o envio foi simulado para não disparar e-mail) | RF11, RF16 |
| [58-admin-contato](img/58-admin-contato.png) | CPA edita links e horário | RF11 |
| [60-acessos-pessoas](img/60-acessos-pessoas.png) · [celular](img/mobile/60-acessos-pessoas.png) | autorizar e-mails; acessos protegidos sem botão "Revogar" | RF12, RF14 |
| [61-acessos-avaliadores](img/61-acessos-avaliadores.png) | convite de avaliador externo com validade | RF04, RF12 |
| [63-acessos-historico](img/63-acessos-historico.png) | histórico com "Senha (demonstração)"; a demo só vê contas demo | RF13, RF15, RNF10 |
| [64-acessos-mensagens](img/64-acessos-mensagens.png) | mensagens recebidas pelo formulário | RF12, RF16 |
| [mobile/08-menu-aberto](img/mobile/08-menu-aberto.png) | menu do celular | RNF01 |
| [09-letra-maior](img/09-letra-maior.png) · [celular](img/mobile/09-letra-maior.png) | A+ aumenta a letra | RNF05 |
| [email-codigo](img/email-codigo.png) · [email-convite](img/email-convite.png) · [email-contato](img/email-contato.png) | os 3 modelos de e-mail | RF02, RF12, RF16 |

### Fase 5 — Testes e validação
- [testes.md](testes.md): resultado de cada verificação automática (API e telas), casos de erro e de borda, e o roteiro de usabilidade que a equipe ainda precisa aplicar.

| Print | O que comprova | Requisito |
|---|---|---|
| [80-sem-conexao](img/80-sem-conexao.png) · [celular](img/mobile/80-sem-conexao.png) | sem conexão com o Supabase o portal mostra aviso e "Tentar de novo" | RNF07 |
| todas as pastas `img/mobile/` | cada tela foi conferida em 390 px sem rolagem horizontal | RNF01 |

### Fase 6 — Implantação e treinamento
- Portal publicado em https://cpa.marcosfc.site (Vercel + Supabase).
- [documentacao-tecnica.md](documentacao-tecnica.md): arquitetura, deploy, variáveis e como restaurar a demonstração.
- [manual-do-usuario.md](manual-do-usuario.md): passo a passo por perfil, com prints.
- Treinamento da CPA e acompanhamento de uso: **a realizar pela equipe** (roteiro em [testes.md](testes.md#5-a-realizar-pela-equipe)).

## Por requisito

| Requisito | Prints |
|---|---|
| RF01 Login com perfis | 10, 15, 20, 30, 40, 50 |
| RF02 Código por e-mail | 10, 13, 14, email-codigo |
| RF03 Quem pode entrar | 11, 12 |
| RF04 Avaliador com validade | 40, 61, email-convite |
| RF05 Painéis por perfil | 20, 30, 40, 50 |
| RF06 Gestão de painéis | 51, 52, 53 |
| RF07 Mural público | 01, 02, 03 |
| RF08 Administração do mural | 20-aluno-mural, 54, 55 |
| RF09 Relatórios | 04 |
| RF10 Envio de PDF | 56, 57 |
| RF11 Contato | 05, 06, 07, 58 |
| RF12 Acessos e Perfis | 60, 61, 62, 63, 64 |
| RF13 Demonstração | 15, 63 |
| RF14 Acessos protegidos | 60 |
| RF15 Histórico | 63 |
| RF16 Mensagens | 07, 64, email-contato |
| RNF01 Responsivo | `img/mobile/*`, 08 |
| RNF05 Acessibilidade | 09 |
| RNF07 Mensagens claras | 06, 11, 12, 14, 80 |
| RNF10 Privacidade | 63 |

## Todas as imagens

Computador ([`img/`](img)): 01-mural, 02-mural-filtro, 03-mural-busca-vazia, 04-relatorios, 05-contato, 06-contato-erro, 07-contato-enviado, 09-letra-maior, 10-login, 11-login-nao-autorizado, 12-login-formato-aluno, 13-login-codigo, 14-login-codigo-errado, 15-login-demonstracao, 20-aluno-dashboards, 20-aluno-mural, 30-coord-dashboards, 40-avaliador-dashboards, 50-admin-dashboards, 51-admin-editar-e-adicionar-painel, 52-admin-painel-adicionado, 53-admin-remover-painel, 54-admin-publicar-devolutiva, 55-admin-mural, 56-admin-enviar-pdf, 57-admin-relatorios, 58-admin-contato, 60-acessos-pessoas, 61-acessos-avaliadores, 62-acessos-quem-ve-o-que, 63-acessos-historico, 64-acessos-mensagens, 80-sem-conexao, email-codigo, email-convite, email-contato.

Celular ([`img/mobile/`](img/mobile)): as mesmas telas (menos os e-mails), mais 08-menu-aberto.
