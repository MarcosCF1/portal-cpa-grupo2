# Avaliação de usabilidade (inspeção heurística)

**Método:** inspeção heurística feita pela equipe de desenvolvimento em 18/11/2026, tela por tela e perfil por perfil, no portal publicado (https://cpa.marcosfc.site), usando as contas de demonstração, em 1366 px e 390 px. Cada problema foi classificado pelas **10 heurísticas de Nielsen** e pela escala de severidade de Nielsen.

**Não houve participação de usuários reais** (alunos, coordenadores, avaliadores ou membros da CPA). Esta inspeção complementa, mas não substitui, o teste com pessoas descrito em [testes.md](testes.md#5-validação-com-pessoas).

Escala de severidade:

| Nota | Significado |
|:-:|---|
| 0 | não é problema de usabilidade |
| 1 | só cosmético; corrigir se sobrar tempo |
| 2 | problema menor; corrigir com prioridade baixa |
| 3 | problema maior; corrigir com prioridade alta |
| 4 | catástrofe; corrigir antes de liberar |

Regra adotada: **tudo com severidade 2 ou mais foi corrigido** ou, quando a causa está fora do portal, mitigado e documentado.

## Heurísticas usadas

| Nº | Heurística |
|:-:|---|
| H1 | Visibilidade do estado do sistema |
| H2 | Correspondência entre o sistema e o mundo real |
| H3 | Controle e liberdade do usuário |
| H4 | Consistência e padrões |
| H5 | Prevenção de erros |
| H6 | Reconhecer em vez de lembrar |
| H7 | Flexibilidade e eficiência de uso |
| H8 | Estética e design minimalista |
| H9 | Ajudar a reconhecer, diagnosticar e corrigir erros |
| H10 | Ajuda e documentação |

## Problemas encontrados

| # | Tela / perfil | Problema | Heurística | Sev. | Situação | Evidência |
|:-:|---|---|:-:|:-:|---|---|
| U1 | Relatórios / todos | Com os 14 documentos oficiais, a lista ficou longa e sem busca: para achar um ano específico era preciso rolar e ler título por título. | H6, H7 | 2 | **Corrigido:** campo "Buscar por título ou ano" que filtra a lista na hora (com contagem para leitor de tela). | [04-relatorios](img/04-relatorios.png) |
| U2 | Contato / todos | A página só tinha Chat, Meet (ainda genéricos) e formulário; não havia um canal institucional conhecido. O e-mail da CPA aparece nos relatórios oficiais. | H2, H10 | 2 | **Corrigido:** linha "E-mail da CPA: cpa@impacta.edu.br" (link para escrever), editável pela administração. Fonte: Relatório de Autoavaliação 2025. | [05-contato](img/05-contato.png) |
| U3 | Dashboards / administração | As ferramentas "Editar este painel" e "Adicionar painel" ficam abaixo do painel incorporado (cerca de 700 px de altura). Quem administra não percebia que elas existiam. | H7, H6 | 2 | **Corrigido:** atalho "Adicionar, editar ou remover painéis" logo acima do painel; abre o quadro de edição e leva o foco até ele. | [50-admin-dashboards](img/50-admin-dashboards.png) |
| U4 | Todas / todos | Não havia ajuda dentro do portal; o manual só existia no repositório. | H10 | 2 | **Corrigido:** link "Como usar o portal" no rodapé, para o manual do usuário. | [01-mural](img/01-mural.png) (rodapé) |
| U5 | Topo e Acessos / avaliador e administração | O perfil aparecia como "Avaliador MEC" no selo do topo e nas tabelas, enquanto o edital, a tela de convite e o manual usam "avaliador externo". | H4 | 2 | **Corrigido:** rótulo único "Avaliador externo". | [40-avaliador-dashboards](img/40-avaliador-dashboards.png) |
| U6 | Dashboards / todos com painel | Sem a conta Google da Impacta no navegador, o Looker mostra "Não é possível acessar o relatório" dentro do quadro (mensagem do próprio Google). A causa está no Looker, não no portal. | H9 | 3 | **Mitigado:** aviso acima do painel explica a causa e o que fazer; botão "Abrir em nova aba"; texto específico para o avaliador externo; FAQ no [treinamento](treinamento/faq.md). A solução definitiva depende da CPA (compartilhar os relatórios ou publicar versão com dados agregados). | [30-coord-dashboards](img/30-coord-dashboards.png) |
| U7 | Painéis / administração | Era possível salvar qualquer link https como painel (inclusive páginas que não são do Looker). | H5 | 2 | **Corrigido** (rodada anterior): a tela e o banco só aceitam links do Looker Studio, com mensagem explicando o formato. | [51-admin-editar-e-adicionar-painel](img/51-admin-editar-e-adicionar-painel.png) |
| U8 | Acessos e Perfis / administração (celular) | Em 390 px, a tela tinha rolagem horizontal por causa do texto longo de uma opção do campo Perfil. | H8 | 2 | **Corrigido** (rodada anterior). | [mobile/60-acessos-pessoas](img/mobile/60-acessos-pessoas.png) |
| U9 | Todas / todos | O aviso de confirmação (canto de baixo) pode cobrir por 4 segundos parte do conteúdo. | H8 | 1 | Mantido (some sozinho e não bloqueia cliques). | [57-admin-relatorios](img/57-admin-relatorios.png) |
| U10 | Menu / todos | "Dashboards" é um termo em inglês; o restante do portal é em português. Mantido porque é o nome usado pela CPA e no edital. | H2 | 1 | Mantido. | — |
| U11 | Login (celular) / visitante | No celular, o quadro "Quem respondeu em 2025" fica abaixo do formulário e aumenta a página. | H8 | 1 | Mantido (o formulário vem primeiro). | [mobile/10-login](img/mobile/10-login.png) |
| U12 | Login / visitante | O link "Acesso de demonstração" fica junto do login real e pode confundir alunos. | H2 | 1 | Mantido para a avaliação do projeto; some quando as contas forem removidas (`restaurar-demo.mjs --remover` e retirada do link). | [10-login](img/10-login.png) |
| U13 | Relatórios / administração | Depois de escolher um arquivo inválido (não PDF ou acima de 50 MB), a mensagem de erro continuava na tela mesmo depois de escolher um PDF correto. | H9 | 1 | **Corrigido:** a mensagem some ao escolher outro arquivo. | [56-admin-enviar-pdf](img/56-admin-enviar-pdf.png) |

## O que já estava atendido (sem problema encontrado)

| Heurística | Como o portal atende | Evidência |
|---|---|---|
| H1 Estado do sistema | esqueletos de carregamento, botões "ocupados" durante o envio, contagem "Novo código em Ns", avisos de confirmação, resumo do mural | [13-login-codigo](img/13-login-codigo.png), [01-mural](img/01-mural.png) |
| H3 Controle e liberdade | "Usar outro e-mail", "Voltar para o código por e-mail", "Cancelar" em toda remoção, "Escrever outra" no contato, "Sair" sempre visível | [53-admin-remover-painel](img/53-admin-remover-painel.png) |
| H5 Prevenção de erros | confirmação antes de remover; validação de e-mail, PDF, tamanho e links antes de enviar; código com 6 caixas e colagem do código inteiro | [06-contato-erro](img/06-contato-erro.png) |
| H6 Reconhecer em vez de lembrar | perfis com nome por extenso, painéis como abas, filtros do mural visíveis, tabela "Quem vê o quê" | [62-acessos-quem-ve-o-que](img/62-acessos-quem-ve-o-que.png) |
| H9 Mensagens de erro | todas em português, dizem o que aconteceu e o que fazer ("Espere 10 minutos", "Peça a renovação à CPA") | [11-login-nao-autorizado](img/11-login-nao-autorizado.png), [14-login-codigo-errado](img/14-login-codigo-errado.png), [80-sem-conexao](img/80-sem-conexao.png) |

## Cobertura por tela e perfil

| Tela | Visitante | Aluno | Coordenação | Avaliador | Administração |
|---|:-:|:-:|:-:|:-:|:-:|
| Login (código e demonstração) | U12 | — | — | — | — |
| Dashboards | — | U6 | U6 | U5, U6 | U3, U6, U7 |
| Mural | U4 | sem problema | sem problema | sem problema | U9 |
| Relatórios | U1 | U1 | U1 | U1 | U1, U9, U13 |
| Contato | U2 | U2 | U2 | U2 | U2 |
| Acessos e Perfis | — | — | — | — | U5, U8 |
| Menu e topo (celular) | U10 | U10 | U10 | U5 | U10 |

## Resumo

- 13 problemas registrados: 1 de severidade 3, 7 de severidade 2, 5 de severidade 1. Nenhum de severidade 4.
- Todos os de severidade 2 foram corrigidos; o de severidade 3 (Looker) foi mitigado no portal e depende da CPA para ser resolvido.
- As correções foram conferidas de novo pelos testes automáticos de telas e de tarefa ([testes.md](testes.md)).
