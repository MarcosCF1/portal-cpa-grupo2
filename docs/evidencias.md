# Evidências

Galeria de prints do portal publicado (https://cpa.marcosfc.site), gerados em 18/11/2026 pelo script [`scripts/testar-telas.mjs`](../scripts/testar-telas.mjs) com as contas de demonstração (dados fictícios). Computador: 1366 px de largura, em [`img/`](img). Celular: 390 px, em [`img/mobile/`](img/mobile), com o mesmo nome de arquivo. Clique na miniatura para ver o print inteiro. Onde a tela mostraria o e-mail do dono do portal, o print troca por `dono.portal@aluno.impacta.edu.br`.

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
| <a href="img/10-login.png"><img src="img/10-login.png" width="260" alt="10-login"></a><br>`10-login` · [celular](img/mobile/10-login.png) | layout com a identidade visual e o dado de adesão do Relatório 2025 |
| <a href="img/62-acessos-quem-ve-o-que.png"><img src="img/62-acessos-quem-ve-o-que.png" width="260" alt="62-acessos-quem-ve-o-que"></a><br>`62-acessos-quem-ve-o-que` | a matriz de permissões modelada aparece para a CPA, lida do banco |

### Fase 3 — Desenvolvimento do portal (login, perfis e dashboards)

| Print | O que comprova | Requisito |
|---|---|---|
| <a href="img/10-login.png"><img src="img/10-login.png" width="260" alt="10-login"></a><br>`10-login` | login por e-mail com código | RF01, RF02 |
| <a href="img/13-login-codigo.png"><img src="img/13-login-codigo.png" width="260" alt="13-login-codigo"></a><br>`13-login-codigo` · [celular](img/mobile/13-login-codigo.png) | tela das 6 caixas e "Reenviar código" bloqueado por 60 s | RF02, RNF04 |
| <a href="img/14-login-codigo-errado.png"><img src="img/14-login-codigo-errado.png" width="260" alt="14-login-codigo-errado"></a><br>`14-login-codigo-errado` | código errado recusado pelo Supabase, com mensagem clara | RF02, RNF07 |
| <a href="img/11-login-nao-autorizado.png"><img src="img/11-login-nao-autorizado.png" width="260" alt="11-login-nao-autorizado"></a><br>`11-login-nao-autorizado` | e-mail externo não autorizado é recusado pelo servidor | RF03 |
| <a href="img/12-login-formato-aluno.png"><img src="img/12-login-formato-aluno.png" width="260" alt="12-login-formato-aluno"></a><br>`12-login-formato-aluno` | e-mail de aluno com acento é recusado antes do envio | RF03, RNF07 |
| <a href="img/15-login-demonstracao.png"><img src="img/15-login-demonstracao.png" width="260" alt="15-login-demonstracao"></a><br>`15-login-demonstracao` · [celular](img/mobile/15-login-demonstracao.png) | acesso de demonstração com e-mail e senha (o print mostra a senha errada recusada) | RF13 |
| <a href="img/20-aluno-dashboards.png"><img src="img/20-aluno-dashboards.png" width="260" alt="20-aluno-dashboards"></a><br>`20-aluno-dashboards` · [celular](img/mobile/20-aluno-dashboards.png) | aluno vê só os 2 painéis da pesquisa com alunos | RF05 |
| <a href="img/30-coord-dashboards.png"><img src="img/30-coord-dashboards.png" width="260" alt="30-coord-dashboards"></a><br>`30-coord-dashboards` · [celular](img/mobile/30-coord-dashboards.png) | coordenação vê os 4 painéis (inclui avaliação docente) | RF05 |
| <a href="img/40-avaliador-dashboards.png"><img src="img/40-avaliador-dashboards.png" width="260" alt="40-avaliador-dashboards"></a><br>`40-avaliador-dashboards` · [celular](img/mobile/40-avaliador-dashboards.png) | avaliador externo vê todos os painéis, com aviso sobre o Looker | RF04, RF05 |
| <a href="img/50-admin-dashboards.png"><img src="img/50-admin-dashboards.png" width="260" alt="50-admin-dashboards"></a><br>`50-admin-dashboards` | CPA vê todos os painéis | RF05 |
| <a href="img/51-admin-editar-e-adicionar-painel.png"><img src="img/51-admin-editar-e-adicionar-painel.png" width="260" alt="51-admin-editar-e-adicionar-painel"></a><br>`51-admin-editar-e-adicionar-painel` · [celular](img/mobile/51-admin-editar-e-adicionar-painel.png) | editar link e perfis, link fora do Looker recusado, formulário para adicionar painel | RF06 |
| <a href="img/52-admin-painel-adicionado.png"><img src="img/52-admin-painel-adicionado.png" width="260" alt="52-admin-painel-adicionado"></a><br>`52-admin-painel-adicionado` | painel novo aparece como aba | RF06 |
| <a href="img/53-admin-remover-painel.png"><img src="img/53-admin-remover-painel.png" width="260" alt="53-admin-remover-painel"></a><br>`53-admin-remover-painel` | remoção de painel com confirmação | RF06 |

### Fase 4 — Funcionalidades complementares (mural, relatórios, contato, responsividade)

| Print | O que comprova | Requisito |
|---|---|---|
| <a href="img/01-mural.png"><img src="img/01-mural.png" width="260" alt="01-mural"></a><br>`01-mural` · [celular](img/mobile/01-mural.png) | mural público, sem login, com resumo | RF07 |
| <a href="img/02-mural-filtro.png"><img src="img/02-mural-filtro.png" width="260" alt="02-mural-filtro"></a><br>`02-mural-filtro` | filtro "Resolvidas" | RF07 |
| <a href="img/03-mural-busca-vazia.png"><img src="img/03-mural-busca-vazia.png" width="260" alt="03-mural-busca-vazia"></a><br>`03-mural-busca-vazia` | busca sem resultado com aviso | RF07 |
| <a href="img/20-aluno-mural.png"><img src="img/20-aluno-mural.png" width="260" alt="20-aluno-mural"></a><br>`20-aluno-mural` | aluno logado não vê botões de administração | RF08 |
| <a href="img/54-admin-publicar-devolutiva.png"><img src="img/54-admin-publicar-devolutiva.png" width="260" alt="54-admin-publicar-devolutiva"></a><br>`54-admin-publicar-devolutiva` | formulário de publicação da CPA | RF08 |
| <a href="img/55-admin-mural.png"><img src="img/55-admin-mural.png" width="260" alt="55-admin-mural"></a><br>`55-admin-mural` · [celular](img/mobile/55-admin-mural.png) | devolutiva publicada e marcada como resolvida; botões da CPA | RF08 |
| <a href="img/04-relatorios.png"><img src="img/04-relatorios.png" width="260" alt="04-relatorios"></a><br>`04-relatorios` · [celular](img/mobile/04-relatorios.png) | 3 relatórios oficiais para baixar e abrir | RF09 |
| <a href="img/56-admin-enviar-pdf.png"><img src="img/56-admin-enviar-pdf.png" width="260" alt="56-admin-enviar-pdf"></a><br>`56-admin-enviar-pdf` | envio de PDF pela CPA | RF10 |
| <a href="img/57-admin-relatorios.png"><img src="img/57-admin-relatorios.png" width="260" alt="57-admin-relatorios"></a><br>`57-admin-relatorios` | documento enviado publicado, com "Remover" | RF10 |
| <a href="img/05-contato.png"><img src="img/05-contato.png" width="260" alt="05-contato"></a><br>`05-contato` · [celular](img/mobile/05-contato.png) | horário, botões do Chat e do Meet e formulário | RF11 |
| <a href="img/06-contato-erro.png"><img src="img/06-contato-erro.png" width="260" alt="06-contato-erro"></a><br>`06-contato-erro` | validação do formulário vazio | RF11, RNF07 |
| <a href="img/07-contato-enviado.png"><img src="img/07-contato-enviado.png" width="260" alt="07-contato-enviado"></a><br>`07-contato-enviado` | confirmação de envio (no print o envio foi simulado para não disparar e-mail) | RF11, RF16 |
| <a href="img/58-admin-contato.png"><img src="img/58-admin-contato.png" width="260" alt="58-admin-contato"></a><br>`58-admin-contato` | CPA edita links e horário | RF11 |
| <a href="img/60-acessos-pessoas.png"><img src="img/60-acessos-pessoas.png" width="260" alt="60-acessos-pessoas"></a><br>`60-acessos-pessoas` · [celular](img/mobile/60-acessos-pessoas.png) | autorizar e-mails; acessos protegidos sem botão "Revogar" | RF12, RF14 |
| <a href="img/61-acessos-avaliadores.png"><img src="img/61-acessos-avaliadores.png" width="260" alt="61-acessos-avaliadores"></a><br>`61-acessos-avaliadores` | convite de avaliador externo com validade | RF04, RF12 |
| <a href="img/63-acessos-historico.png"><img src="img/63-acessos-historico.png" width="260" alt="63-acessos-historico"></a><br>`63-acessos-historico` | histórico com "Senha (demonstração)"; a demo só vê contas demo | RF13, RF15, RNF10 |
| <a href="img/64-acessos-mensagens.png"><img src="img/64-acessos-mensagens.png" width="260" alt="64-acessos-mensagens"></a><br>`64-acessos-mensagens` | mensagens recebidas pelo formulário | RF12, RF16 |
| <a href="img/mobile/08-menu-aberto.png"><img src="img/mobile/08-menu-aberto.png" width="260" alt="mobile/08-menu-aberto"></a><br>`mobile/08-menu-aberto` | menu do celular | RNF01 |
| <a href="img/09-letra-maior.png"><img src="img/09-letra-maior.png" width="260" alt="09-letra-maior"></a><br>`09-letra-maior` · [celular](img/mobile/09-letra-maior.png) | A+ aumenta a letra | RNF05 |
| <a href="img/email-codigo.png"><img src="img/email-codigo.png" width="260" alt="email-codigo"></a><br>`email-codigo` · [email-convite](img/email-convite.png) · [email-contato](img/email-contato.png) | os 3 modelos de e-mail | RF02, RF12, RF16 |

### Fase 5 — Testes e validação
- [testes.md](testes.md): resultado de cada verificação automática (API, telas, tarefas por perfil, acessibilidade), casos de erro e de borda, e o roteiro e o formulário para a validação com pessoas, que a equipe ainda precisa aplicar.
- [avaliacao-usabilidade.md](avaliacao-usabilidade.md): inspeção pelas 10 heurísticas de Nielsen, com severidade e correção de cada problema (feita pela equipe, sem usuários reais).
- [acessibilidade.md](acessibilidade.md): axe-core em 37 telas (0 violações depois das correções), navegação só por teclado e Lighthouse.

| Print | O que comprova | Requisito |
|---|---|---|
| <a href="img/80-sem-conexao.png"><img src="img/80-sem-conexao.png" width="260" alt="80-sem-conexao"></a><br>`80-sem-conexao` · [celular](img/mobile/80-sem-conexao.png) | sem conexão com o Supabase o portal mostra aviso e "Tentar de novo" | RNF07 |
| todas as pastas `img/mobile/` | cada tela foi conferida em 390 px sem rolagem horizontal | RNF01 |

### Fase 6 — Implantação e treinamento
- Portal publicado em https://cpa.marcosfc.site (Vercel + Supabase).
- [documentacao-tecnica.md](documentacao-tecnica.md): arquitetura, deploy, variáveis e como restaurar a demonstração.
- [manual-do-usuario.md](manual-do-usuario.md): passo a passo por perfil, com prints.
- [treinamento/](treinamento/): guias rápidos por perfil ([aluno](treinamento/guia-rapido-aluno.md), [coordenação](treinamento/guia-rapido-coordenacao.md), [avaliador](treinamento/guia-rapido-avaliador.md), [administração](treinamento/guia-rapido-administracao.md)), [roteiro de treinamento de 30 minutos](treinamento/roteiro-treinamento-administracao.md) e [FAQ](treinamento/faq.md), para a CPA usar sozinha.
- Treinamento ao vivo da CPA e acompanhamento de uso: **a realizar pela equipe** (roteiro e formulário em [testes.md](testes.md#5-validação-com-pessoas)).

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
| RF09 Relatórios (14 documentos oficiais, busca) | 04 |
| RF10 Envio de PDF | 56, 57 |
| RF11 Contato (Chat, Meet, e-mail da CPA, formulário) | 05, 06, 07, 58 |
| RF12 Acessos e Perfis | 60, 61, 62, 63, 64 |
| RF13 Demonstração | 15, 63 |
| RF14 Acessos protegidos | 60 |
| RF15 Histórico | 63 |
| RF16 Mensagens | 07, 64, email-contato |
| RNF01 Responsivo | `img/mobile/*`, 08 |
| RNF05 Acessibilidade | 09, [acessibilidade.md](acessibilidade.md) |
| RNF11 Usabilidade | [avaliacao-usabilidade.md](avaliacao-usabilidade.md), [testes de tarefa](testes.md#6-testes-de-tarefa) |
| RNF07 Mensagens claras | 06, 11, 12, 14, 80 |
| RNF10 Privacidade | 63 |

## Todas as imagens

Computador ([`img/`](img)): 01-mural, 02-mural-filtro, 03-mural-busca-vazia, 04-relatorios, 05-contato, 06-contato-erro, 07-contato-enviado, 09-letra-maior, 10-login, 11-login-nao-autorizado, 12-login-formato-aluno, 13-login-codigo, 14-login-codigo-errado, 15-login-demonstracao, 20-aluno-dashboards, 20-aluno-mural, 30-coord-dashboards, 40-avaliador-dashboards, 50-admin-dashboards, 51-admin-editar-e-adicionar-painel, 52-admin-painel-adicionado, 53-admin-remover-painel, 54-admin-publicar-devolutiva, 55-admin-mural, 56-admin-enviar-pdf, 57-admin-relatorios, 58-admin-contato, 60-acessos-pessoas, 61-acessos-avaliadores, 62-acessos-quem-ve-o-que, 63-acessos-historico, 64-acessos-mensagens, 80-sem-conexao, email-codigo, email-convite, email-contato.

Celular ([`img/mobile/`](img/mobile)): as mesmas telas (menos os e-mails), mais 08-menu-aberto.
