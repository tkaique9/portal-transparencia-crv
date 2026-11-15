// Páginas de texto: privacidade/LGPD e metodologia ("sobre os dados").

import { dados } from '../dados/db.js';

const PRIVACIDADE = `
  <div class="trilha-nav"><a href="#/">Início</a> › Privacidade e LGPD</div>
  <article class="texto-longo">
    <h1>Privacidade e proteção de dados</h1>
    <p>Este portal existe para dar publicidade ao uso dos recursos do Instituto CRV, e faz isso sem expor dados pessoais além do necessário, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018).</p>
    <h2>O que o portal publica</h2>
    <ul>
      <li>Receitas, com a origem e o nome do parceiro ou instituição. Doações de pessoas físicas aparecem agregadas, sem identificar o doador.</li>
      <li>Despesas, com o fornecedor ou beneficiário do pagamento. CNPJ aparece completo; <b>CPF aparece parcialmente mascarado</b> (***.456.789-**), o suficiente para conferência e não para identificação.</li>
      <li>Projetos, metas e resultados, com número de beneficiários sempre <b>agregado</b> — nunca a lista de pessoas atendidas.</li>
      <li>Contratos, convênios, parcerias e documentos institucionais aprovados para publicação.</li>
    </ul>
    <h2>O que o portal nunca publica</h2>
    <ul>
      <li>Dados bancários (agência, conta, chave PIX) de qualquer pessoa ou empresa.</li>
      <li>Documentos pessoais, endereços, telefones, dados de saúde ou qualquer dado sensível de beneficiários e colaboradores.</li>
      <li>Documentos marcados como internos (por exemplo, folha de pagamento nominal): eles ficam só na área restrita, mesmo para quem tem acesso a ela, e não há como publicá-los sem antes retirar a marcação.</li>
      <li>Qualquer informação que ainda não foi conferida e aprovada pelo administrador.</li>
    </ul>
    <h2>Quem acessa o portal</h2>
    <p>A consulta é livre e não pede cadastro. O portal não usa cookies de rastreamento nem ferramentas de análise de terceiros. Guardamos no seu navegador apenas a preferência de tema claro/escuro.</p>
    <h2>Área restrita</h2>
    <p>Lançamentos são feitos por usuários autorizados, com login e senha, em perfis com permissões limitadas (financeiro, gestor de projetos, auditor, administrador). Toda alteração é registrada com data, hora e usuário responsável.</p>
    <h2>Seus direitos</h2>
    <p>Se você identificar um dado pessoal seu publicado indevidamente, ou quiser exercer os direitos previstos no art. 18 da LGPD, entre em contato com o encarregado de dados do Instituto pelos canais oficiais de atendimento.</p>
  </article>`;

const SOBRE = () => `
  <div class="trilha-nav"><a href="#/">Início</a> › Sobre os dados</div>
  <article class="texto-longo">
    <h1>Sobre os dados</h1>
    ${dados.config.demonstracao ? `<div class="alerta-caixa alerta"><b>Este portal está com dados de exemplo.</b> Projetos, parceiros, fornecedores, municípios, valores, CNPJs, CPFs, fotos e documentos foram inventados para demonstrar o funcionamento do sistema e não correspondem a informações reais do Instituto CRV. Todos os registros de exemplo estão marcados e podem ser removidos de uma vez pela área administrativa.</div>` : ''}
    <h2>De onde vêm os números</h2>
    <p>Todos os indicadores são calculados na hora a partir dos lançamentos publicados — não há número digitado à parte. Publicou um lançamento, os totais, gráficos e relatórios mudam juntos.</p>
    <h2>Definições</h2>
    <ul>
      <li><b>Recursos recebidos:</b> soma das receitas com data de recebimento no período.</li>
      <li><b>Recursos aplicados:</b> soma das despesas com data no período, de projetos e da gestão institucional.</li>
      <li><b>Saldo do período:</b> recebido menos aplicado no período. Na prestação de contas, o saldo financeiro final soma também o saldo acumulado dos exercícios anteriores.</li>
      <li><b>Execução financeira:</b> aplicado ÷ orçamento aprovado do mesmo período. Num projeto, realizado ÷ investimento previsto total.</li>
      <li><b>Execução física:</b> média do percentual cumprido de cada meta do projeto, com cada meta limitada a 100% — superar uma meta não compensa outra atrasada.</li>
      <li><b>Pessoas beneficiadas:</b> soma das pessoas atendidas <i>pela primeira vez</i> em cada mês. Quem continua sendo atendido não é contado de novo.</li>
      <li><b>Famílias atendidas:</b> mesma regra, por família.</li>
      <li><b>Comunidades alcançadas:</b> para cada projeto, o maior número de comunidades atendidas num mês, somado entre projetos. É uma aproximação: se dois projetos atendem a mesma comunidade, ela conta duas vezes.</li>
      <li><b>Municípios atendidos:</b> municípios distintos dos projetos em execução no período.</li>
      <li><b>Projetos em execução:</b> situação atual do projeto, independente do período escolhido.</li>
    </ul>
    <h2>Publicação</h2>
    <p>Um lançamento só aparece aqui depois de aprovado pelo administrador. Quando um lançamento já publicado é corrigido por outro perfil, ele sai do ar até ser aprovado de novo — o portal nunca mostra informação não conferida.</p>
    <h2>Exportação</h2>
    <p>Toda tabela pode ser baixada em Excel (os valores ficam numéricos, prontos para somar) e em PDF. A prestação de contas gera um relatório completo por exercício, do Instituto ou de um projeto.</p>
  </article>`;

/**
 * Cada <h2> do texto vira um cartão numa grade (tela larga = várias colunas,
 * celular = uma). O texto em si não muda: só a disposição.
 */
function emCartoes(html) {
  const [antes, ...secoes] = html.split('<h2>');
  if (!secoes.length) return html;
  const ultima = secoes.length - 1;
  secoes[ultima] = secoes[ultima].replace('</article>', '');
  return `${antes}<div class="texto-grade">${secoes.map(s => `<section class="cartao"><h2>${s}</section>`).join('')}</div></article>`;
}

export async function render(main, rota) {
  main.innerHTML = emCartoes(rota.pagina === 'privacidade' ? PRIVACIDADE : SOBRE());
}
