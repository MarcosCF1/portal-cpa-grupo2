// Modelos de e-mail do Portal da CPA.
// Feitos com tabelas e estilos inline para abrir bem no Gmail, Outlook e celular.

const COR = {
  grafite: '#14161A',
  vermelho: '#E30613',
  texto: '#14161A',
  apoio: '#5E6673',
  linha: '#E3E6EB',
  fundo: '#F5F6F8',
  cartao: '#FFFFFF'
};

const FONTE = "'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', Consolas, 'Courier New', monospace";

export function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function layout({ preheader, titulo, corpo, rodape, nota = 'Mensagem automática do Portal da CPA. Não é preciso responder.' }) {
  return `<!doctype html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(titulo)}</title>
<!--[if mso]><style>table,td,div,p,a{font-family:Arial,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${COR.fundo};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${COR.fundo};font-size:1px;line-height:1px;">${esc(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COR.fundo};">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:580px;">
        <tr>
          <td style="background:${COR.grafite};border-radius:12px 12px 0 0;padding:22px 32px;border-bottom:4px solid ${COR.vermelho};">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="12" style="width:12px;background:${COR.vermelho};border-radius:3px;font-size:0;line-height:0;">&nbsp;</td>
                <td style="padding-left:12px;font-family:${FONTE};font-size:16px;line-height:20px;color:#FFFFFF;font-weight:700;">
                  Portal da CPA <span style="color:#9AA1AC;font-weight:400;">&middot; Faculdade Impacta</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:${COR.cartao};padding:36px 32px 28px;border-left:1px solid ${COR.linha};border-right:1px solid ${COR.linha};font-family:${FONTE};color:${COR.texto};">
            ${corpo}
          </td>
        </tr>
        <tr>
          <td style="background:${COR.cartao};border:1px solid ${COR.linha};border-top:0;border-radius:0 0 12px 12px;padding:0 32px 26px;font-family:${FONTE};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="border-top:1px solid ${COR.linha};padding-top:18px;font-size:13px;line-height:20px;color:${COR.apoio};">${rodape}</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:18px 12px 0;font-family:${FONTE};font-size:12px;line-height:18px;color:#8A919C;">
            Comissão Própria de Avaliação &middot; Faculdade Impacta<br>
            ${nota}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function botao(link, rotulo) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 6px;">
  <tr>
    <td style="background:${COR.vermelho};border-radius:8px;">
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${esc(link)}" style="height:46px;v-text-anchor:middle;width:240px;" arcsize="18%" stroke="f" fillcolor="${COR.vermelho}"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${esc(rotulo)}</center></v:roundrect><![endif]-->
      <!--[if !mso]><!-- --><a href="${esc(link)}" style="display:inline-block;padding:13px 26px;font-family:${FONTE};font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;">${esc(rotulo)}</a><!--<![endif]-->
    </td>
  </tr>
</table>`;
}

// ------------------------------------------------------------------
// 1. Código de acesso
// ------------------------------------------------------------------
export function emailCodigo({ codigo, nome, portalUrl }) {
  const digitos = String(codigo).split('').join('&nbsp;');
  const saudacao = nome ? `Olá, ${esc(nome)}.` : 'Olá.';
  const corpo = `
    <p style="margin:0 0 6px;font-size:13px;line-height:18px;color:${COR.vermelho};font-weight:700;letter-spacing:.06em;text-transform:uppercase;">Código de acesso</p>
    <h1 style="margin:0 0 16px;font-size:24px;line-height:30px;font-weight:700;color:${COR.texto};">Use este código para entrar no portal</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:23px;color:${COR.texto};">${saudacao} Digite os números abaixo na tela de acesso do Portal da CPA.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="background:${COR.fundo};border:1px solid ${COR.linha};border-radius:10px;padding:22px 12px;">
          <div style="font-family:${MONO};font-size:34px;line-height:40px;font-weight:700;letter-spacing:10px;color:${COR.texto};">${digitos}</div>
          <div style="font-family:${FONTE};font-size:13px;line-height:18px;color:${COR.apoio};padding-top:8px;">Vale por <strong style="color:${COR.texto};">10 minutos</strong> e só pode ser usado uma vez.</div>
        </td>
      </tr>
    </table>
    <p style="margin:22px 0 0;font-size:14px;line-height:22px;color:${COR.apoio};">O código só funciona na tela de acesso de <a href="${esc(portalUrl)}" style="color:${COR.vermelho};">${esc(portalUrl.replace(/^https?:\/\//, ''))}</a>. Não compartilhe este número com ninguém, nem com a equipe da CPA.</p>`;
  const rodape = '<strong style="color:#14161A;">Não pediu este código?</strong> Pode ignorar este e-mail. Sem o código, ninguém entra com o seu endereço.';
  return {
    subject: `${codigo} é o seu código de acesso ao Portal da CPA`,
    html: layout({ preheader: `Seu código: ${codigo}. Vale por 10 minutos.`, titulo: 'Código de acesso', corpo, rodape }),
    text: [
      nome ? `Olá, ${nome}.` : 'Olá.',
      '',
      `Seu código de acesso ao Portal da CPA: ${codigo}`,
      '',
      'Vale por 10 minutos e só pode ser usado uma vez.',
      `Portal: ${portalUrl}`,
      '',
      'Não pediu este código? Pode ignorar este e-mail.',
      '',
      'Comissão Própria de Avaliação - Faculdade Impacta'
    ].join('\n')
  };
}

// ------------------------------------------------------------------
// 2. Convite (avaliador externo, coordenação ou CPA)
// ------------------------------------------------------------------
const PAPEL = {
  aval: { nome: 'avaliador(a) externo(a)', acesso: 'os quatro painéis das pesquisas da CPA, o mural de devolutivas e os relatórios' },
  coord: { nome: 'coordenação de curso', acesso: 'os quatro painéis das pesquisas da CPA, o mural de devolutivas e os relatórios' },
  cpa: { nome: 'administração da CPA', acesso: 'todos os painéis e a gestão do portal (mural, relatórios, contatos e acessos)' }
};

function dataBR(iso) {
  if (!iso) return '';
  const [a, m, d] = String(iso).split('-');
  return d && m && a ? `${d}/${m}/${a}` : String(iso);
}

export function emailConvite({ nome, email, role, expiraEm, portalUrl, convidadoPor }) {
  const papel = PAPEL[role] || PAPEL.aval;
  const link = `${portalUrl}/#login`;
  const validade = expiraEm ? `O acesso vale até <strong style="color:${COR.texto};">${esc(dataBR(expiraEm))}</strong>.` : 'O acesso não tem data para expirar.';
  const corpo = `
    <p style="margin:0 0 6px;font-size:13px;line-height:18px;color:${COR.vermelho};font-weight:700;letter-spacing:.06em;text-transform:uppercase;">Convite</p>
    <h1 style="margin:0 0 16px;font-size:24px;line-height:30px;font-weight:700;color:${COR.texto};">Seu acesso ao Portal da CPA está liberado</h1>
    <p style="margin:0 0 14px;font-size:15px;line-height:23px;color:${COR.texto};">Olá${nome ? `, ${esc(nome)}` : ''}. A Comissão Própria de Avaliação da Faculdade Impacta liberou o seu acesso como <strong>${esc(papel.nome)}</strong>. Você poderá consultar ${esc(papel.acesso)}.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 4px;">
      <tr>
        <td style="border-left:3px solid ${COR.vermelho};padding:4px 0 4px 14px;font-size:14px;line-height:22px;color:${COR.texto};">
          <strong>Como entrar</strong><br>
          1. Abra o portal e clique em Entrar.<br>
          2. Informe o e-mail <strong>${esc(email)}</strong>.<br>
          3. Digite o código de 6 dígitos que chegará neste endereço.
        </td>
      </tr>
    </table>
    ${botao(link, 'Abrir o Portal da CPA')}
    <p style="margin:16px 0 0;font-size:14px;line-height:22px;color:${COR.apoio};">${validade}${role === 'aval' ? ' Os painéis do Looker Studio podem pedir login Google; se aparecer "acesso negado", responda à CPA para receber o compartilhamento.' : ''}</p>`;
  const rodape = `${convidadoPor ? `Convite enviado por ${esc(convidadoPor)}. ` : ''}Não esperava este e-mail? Pode ignorar: nada muda sem você entrar com o código.`;
  return {
    subject: 'Convite para o Portal da CPA - Faculdade Impacta',
    html: layout({ preheader: 'Seu acesso ao Portal da CPA está liberado.', titulo: 'Convite', corpo, rodape }),
    text: [
      `Olá${nome ? `, ${nome}` : ''}.`,
      '',
      `A CPA da Faculdade Impacta liberou o seu acesso ao portal como ${papel.nome}.`,
      '',
      'Como entrar:',
      `1. Abra ${link}`,
      `2. Informe o e-mail ${email}`,
      '3. Digite o código de 6 dígitos que chegará neste endereço.',
      '',
      expiraEm ? `O acesso vale até ${dataBR(expiraEm)}.` : 'O acesso não tem data para expirar.',
      '',
      'Comissão Própria de Avaliação - Faculdade Impacta'
    ].join('\n')
  };
}

// ------------------------------------------------------------------
// 3. Mensagem recebida pelo formulário de contato
// ------------------------------------------------------------------
export function emailContato({ nome, email, mensagem, enviadaEm, portalUrl }) {
  const quando = new Date(enviadaEm || Date.now()).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const mensagemHtml = esc(mensagem).replace(/\r?\n/g, '<br>');
  const corpo = `
    <p style="margin:0 0 6px;font-size:13px;line-height:18px;color:${COR.vermelho};font-weight:700;letter-spacing:.06em;text-transform:uppercase;">Fale com a CPA</p>
    <h1 style="margin:0 0 18px;font-size:22px;line-height:28px;font-weight:700;color:${COR.texto};">Nova mensagem de ${esc(nome)}</h1>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;line-height:21px;">
      <tr>
        <td width="90" style="width:90px;padding:6px 0;color:${COR.apoio};vertical-align:top;">Nome</td>
        <td style="padding:6px 0;color:${COR.texto};font-weight:600;">${esc(nome)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:${COR.apoio};vertical-align:top;">E-mail</td>
        <td style="padding:6px 0;"><a href="mailto:${esc(email)}" style="color:${COR.vermelho};">${esc(email)}</a></td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:${COR.apoio};vertical-align:top;">Recebida</td>
        <td style="padding:6px 0;color:${COR.texto};">${esc(quando)}</td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
      <tr>
        <td style="background:${COR.fundo};border:1px solid ${COR.linha};border-radius:10px;padding:18px 20px;font-size:15px;line-height:24px;color:${COR.texto};">${mensagemHtml}</td>
      </tr>
    </table>
    <p style="margin:18px 0 0;font-size:14px;line-height:22px;color:${COR.apoio};">Para responder, use "Responder" no seu e-mail: a resposta vai direto para ${esc(email)}.</p>`;
  const rodape = `A mensagem também fica salva na área Acessos e Perfis do <a href="${esc(portalUrl)}/#acessos" style="color:${COR.vermelho};">Portal da CPA</a>.`;
  return {
    subject: `Contato pelo portal: ${String(nome).slice(0, 80)}`,
    html: layout({ preheader: String(mensagem).slice(0, 90), titulo: 'Nova mensagem', corpo, rodape, nota: 'Enviado pelo formulário de contato do Portal da CPA.' }),
    text: [
      `Nova mensagem pelo Portal da CPA`,
      '',
      `Nome: ${nome}`,
      `E-mail: ${email}`,
      `Recebida: ${quando}`,
      '',
      mensagem,
      '',
      'Responda este e-mail para falar direto com a pessoa.'
    ].join('\n')
  };
}
