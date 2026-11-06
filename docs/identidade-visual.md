# Identidade visual (tirada do portal do aluno da Impacta)

Fonte: página da CPA na área do aluno (`account.impacta.edu.br/aluno/comissao-propria-de-avaliacao.php`), cores medidas no navegador em 06/11/2026.

## Cores

| Uso | Cor | Hex |
|---|---|---|
| Azul-marinho principal (menu lateral, topo) | ![](https://placehold.co/16x16/002953/002953) | `#002953` |
| Azul dos títulos e links de relatório | ![](https://placehold.co/16x16/052C55/052C55) | `#052C55` |
| Azul secundário (destaques) | ![](https://placehold.co/16x16/144C81/144C81) | `#144C81` |
| Azul de link | ![](https://placehold.co/16x16/0088CC/0088CC) | `#0088CC` |
| Azul-claro de botão (ex.: "Sair") | ![](https://placehold.co/16x16/49AFCD/49AFCD) | `#49AFCD` |
| Fundo da página | ![](https://placehold.co/16x16/F3F3F3/F3F3F3) | `#F3F3F3` |
| Bordas e divisórias | ![](https://placehold.co/16x16/DDDDDD/DDDDDD) | `#DDDDDD` |
| Texto principal | ![](https://placehold.co/16x16/333333/333333) | `#333333` |
| Texto secundário | ![](https://placehold.co/16x16/7A7A7A/7A7A7A) | `#7A7A7A` |
| Selo "Novo" / alerta | ![](https://placehold.co/16x16/B94A48/B94A48) | `#B94A48` |
| Amarelo de destaque | ![](https://placehold.co/16x16/EEC457/EEC457) | `#EEC457` |

Sugestão de variáveis CSS:

```css
:root {
  --impacta-navy: #002953;
  --impacta-navy-text: #052C55;
  --impacta-blue: #144C81;
  --impacta-link: #0088CC;
  --impacta-info: #49AFCD;
  --impacta-bg: #F3F3F3;
  --impacta-border: #DDDDDD;
  --impacta-text: #333333;
  --impacta-muted: #7A7A7A;
  --impacta-danger: #B94A48;
  --impacta-accent: #EEC457;
}
```

## Tipografia
- O portal usa **Eurostile** (LT Std, Condensed e Bold), com Trebuchet MS de reserva. Eurostile é uma fonte paga.
- Alternativas gratuitas com o mesmo estilo "quadrado": **Saira** / **Saira Condensed** (Google Fonts) para títulos e **Inter** ou a própria Trebuchet MS para o texto.
- Títulos em CAIXA ALTA e negrito (ex.: "CPA (COMISSÃO PRÓPRIA DE AVALIAÇÃO)").

## Padrões de layout observados
- Menu lateral fixo azul-marinho com o logo branco "IMPACTA Centro Universitário" no topo.
- Conteúdo em cartão claro sobre fundo cinza-claro, com trilha (Home > Área do Aluno > página).
- Botões A+ / A- para aumentar e diminuir a fonte (acessibilidade) — vale repetir no portal da CPA.
