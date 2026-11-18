# Roteiro de treinamento — Administração da CPA (30 minutos)

Para a CPA aprender a usar o portal sozinha, com a conta de demonstração (nada do que for feito afeta pessoas reais; a equipe técnica restaura tudo depois com `node scripts/restaurar-demo.mjs`).

**Material:** um computador com internet, o [guia rápido da administração](guia-rapido-administracao.md) aberto ao lado, um PDF qualquer para o exercício 3.
**Conta:** `admin.demo@cpa.marcosfc.site`, senha `CPA-Impacta-2026` (Entrar → Acesso de demonstração).
**Quem conduz:** pode ser feito sozinho, seguindo este roteiro, ou com alguém da equipe lendo os passos.

| Tempo | Bloco | O que fazer | Como saber que deu certo |
|---|---|---|---|
| 0–3 min | Abertura | Abrir o portal sem login: Mural, Relatórios, Contato. Entrar com a conta de demonstração. | O topo mostra "Administração Demonstração · Admin CPA". |
| 3–8 min | Exercício 1: devolutiva | Publicar uma devolutiva da "Secretaria" com situação "Em andamento". Depois marcar como resolvida. | O cartão aparece no topo do mural, com a etiqueta "Resolvido". |
| 8–11 min | Exercício 2: remover | Remover a devolutiva criada (e cancelar uma vez antes de confirmar). | O cartão some só depois de confirmar. |
| 11–16 min | Exercício 3: documento | Enviar um PDF como "Boletim". Abrir o PDF pelo portal. Remover o documento. | O documento aparece na lista, abre e depois some. |
| 16–21 min | Exercício 4: painel | Adicionar um painel de teste com o link `https://lookerstudio.google.com/embed/reporting/teste` visível só para Coordenação. Tentar salvar um link `https://exemplo.com` e ler a mensagem. Remover o painel. | A aba nova aparece e depois some; o link fora do Looker é recusado. |
| 21–26 min | Exercício 5: acessos | Autorizar `coordenacao.treino@impacta.edu.br` como Coordenador (sem convite). Convidar um avaliador com validade daqui a 30 dias. Revogar os dois. Tentar revogar uma linha "Protegido". | As pessoas aparecem e somem; a linha protegida não tem botão Revogar. Na demonstração o convite não sai por e-mail (aviso na tela). |
| 26–28 min | Exercício 6: atendimento | Em Contato → Editar atendimento, mudar o horário e salvar. Voltar ao texto original. | O novo horário aparece na página. |
| 28–30 min | Fechamento | Ver o Histórico de acessos (seu login aparece como "Senha (demonstração)"). Sair. Ler o [FAQ](faq.md). | O portal volta ao mural com o botão Entrar. |

## Depois do treinamento
- Anotar dúvidas e dificuldades no [formulário de registro](../testes.md#formulário-de-registro).
- Para o uso real, cada membro da CPA entra com o próprio e-mail (código por e-mail); peça à equipe técnica ou a um administrador para autorizar.
- Pedir à equipe técnica para rodar `node scripts/restaurar-demo.mjs`.
