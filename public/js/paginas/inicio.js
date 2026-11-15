// Visão geral: responde em uma tela as perguntas que um cidadão faz.

import { basePublica, gravarFiltros } from '../app.js';
import * as calc from '../calculo.js';
import { esc, fmtMoeda, fmtMoedaCurta, fmtNum, fmtNumCurto, fmtPct, MESES } from '../util.js';
import { kpi, opcoes } from '../ui/componentes.js';
import { montarGrafico, topN, linhaDica } from '../ui/graficos.js';

export const COR = { receita: 'var(--s1)', despesa: 'var(--s2)', pessoas: 'var(--s3)' };

export const rotuloMes = (chave, comAno) => { const [a, m] = chave.split('-'); return comAno ? `${MESES[m - 1]}/${a.slice(2)}` : MESES[m - 1]; };
export const textoPeriodo = ano => ano ? `exercício ${ano}` : 'todos os exercícios';

export function seletorAno(b, ano, id = 'sel-ano') {
  return `<select id="${id}" aria-label="Exercício">${opcoes([['', 'Todos os exercícios'], ...b.anos.map(a => [a, `Exercício ${a}`])], ano ?? '')}</select>`;
}

export async function render(main, rota) {
  const b = basePublica();
  const anoQ = rota.q.get('ano');
  const ano = anoQ === 'todos' ? null : Number(anoQ) || b.anos[0] || null;
  const ind = calc.indicadores(b, ano);
  const serie = calc.serieMensal(b, ano);
  const comAno = !ano;
  const cats = serie.chaves.map(k => rotuloMes(k, comAno));
  const qs = ano ? `?ano=${ano}` : '';

  const origens = calc.porChave(calc.noPeriodo(b.receitas, { ano }), 'origem');
  const areas = ind.porArea;
  const metas = b.metas.filter(m => m.meta > 0);
  const metasCumpridas = metas.filter(m => (m.realizado || 0) >= m.meta).length;
  const docs = b.documentos.filter(d => d.categoria !== 'Fotografia');
  const ultimoMes = [...b.receitas, ...b.despesas].map(r => r.data).sort().pop();

  const pergunta = (p, resposta, detalhe, href) => `<a class="pergunta" href="${href}"><span>${esc(p)}</span><b>${esc(resposta)}</b><span>${esc(detalhe)}</span><em>Ver detalhes →</em></a>`;

  main.innerHTML = `
    <section class="heroi">
      <h1>Transparência na gestão dos recursos do Instituto CRV</h1>
      <p>Quanto recebemos, de onde vieram os recursos, onde foram aplicados, quem foi beneficiado e quais resultados entregamos. Consulta livre, sem cadastro.</p>
      <label class="exercicio">Exibindo ${seletorAno(b, anoQ === 'todos' ? '' : ano)}</label>
      ${ultimoMes ? `<p class="pequeno" style="margin:10px 0 0">Lançamentos até ${esc(rotuloMes(ultimoMes.slice(0, 7), true))}.</p>` : ''}
    </section>

    <h2 class="sr">Perguntas frequentes</h2>
    <div class="perguntas">
      ${pergunta('Quanto o Instituto recebeu?', fmtMoeda(ind.recebido), `${fmtNum(ind.nReceitas)} recebimentos no ${textoPeriodo(ano)}`, '#/receitas' + qs)}
      ${pergunta('De onde vieram os recursos?', origens[0]?.rotulo || '—', origens[0] ? `${fmtPct(origens[0].valor / ind.recebido)} do total · ${origens.length} origens` : 'Sem receitas no período', '#/receitas' + qs)}
      ${pergunta('Quanto foi gasto?', fmtMoeda(ind.aplicado), ind.execucao !== null ? `${fmtPct(ind.execucao)} do orçamento aprovado` : `${fmtNum(ind.nDespesas)} pagamentos`, '#/despesas' + qs)}
      ${pergunta('Onde o dinheiro foi aplicado?', areas[0]?.rotulo || '—', areas[0] ? `${fmtPct(areas[0].valor / ind.aplicado)} do total aplicado` : 'Sem despesas no período', '#/despesas' + qs)}
      ${pergunta('Quais projetos foram realizados?', `${fmtNum(ind.projetosNoPeriodo)} projetos`, `${fmtNum(ind.projetosEmExecucao)} em execução hoje`, '#/projetos')}
      ${pergunta('Quantas pessoas foram beneficiadas?', fmtNum(ind.beneficiados), `${fmtNum(ind.familias)} famílias · ${fmtNum(ind.municipios)} municípios`, '#/impacto' + qs)}
      ${pergunta('Quais resultados foram alcançados?', `${metasCumpridas} de ${metas.length} metas`, 'cumpridas integralmente até agora', '#/impacto' + qs)}
      ${pergunta('Onde consultar documentos e prestações de contas?', `${fmtNum(docs.length)} documentos`, 'Estatuto, balanços, auditorias e relatórios', '#/prestacao' + qs)}
    </div>

    <div class="secao-titulo"><h2>Indicadores — ${esc(textoPeriodo(ano))}</h2></div>
    <div class="kpis">
      ${kpi('Recursos recebidos', fmtMoeda(ind.recebido), `${fmtNum(ind.nReceitas)} lançamentos`, { destaque: true })}
      ${kpi('Recursos aplicados', fmtMoeda(ind.aplicado), `${fmtNum(ind.nDespesas)} pagamentos`, { destaque: true })}
      ${kpi('Saldo do período', fmtMoeda(ind.saldo), 'Recebido menos aplicado', { destaque: true })}
      ${kpi('Execução financeira', ind.execucao !== null ? fmtPct(ind.execucao) : '—', ind.orcado ? `de ${fmtMoedaCurta(ind.orcado)} aprovados` : 'Sem orçamento cadastrado', { medidor: ind.execucao ?? 0 })}
      ${kpi('Projetos em execução', fmtNum(ind.projetosEmExecucao), `${fmtNum(ind.projetosNoPeriodo)} com atividade no período`)}
      ${kpi('Pessoas beneficiadas', fmtNum(ind.beneficiados), 'Novos atendidos no período')}
      ${kpi('Famílias atendidas', fmtNum(ind.familias), 'Novas famílias no período')}
      ${kpi('Municípios atendidos', fmtNum(ind.municipios), ind.listaMunicipios.slice(0, 3).join(', ') + (ind.listaMunicipios.length > 3 ? '…' : ''))}
    </div>

    <div class="grade">
      <section class="cartao m8"><div class="cartao-cab"><div><h3>Receitas × despesas por mês</h3><p>Quanto entrou e quanto foi aplicado em cada mês</p></div></div><div id="g-recdes"></div></section>
      <section class="cartao m4"><div class="cartao-cab"><div><h3>Investimento por área de atuação</h3><p>Despesas do período, por área</p></div></div><div id="g-area"></div></section>
      <section class="cartao m6"><div class="cartao-cab"><div><h3>Evolução dos investimentos</h3><p>Total aplicado, acumulado mês a mês</p></div></div><div id="g-acum"></div></section>
      <section class="cartao m6"><div class="cartao-cab"><div><h3>Evolução dos beneficiários</h3><p>Pessoas atendidas, acumulado mês a mês</p></div></div><div id="g-benef"></div></section>
      <section class="cartao m6"><div class="cartao-cab"><div><h3>Distribuição dos recursos por projeto</h3><p>Despesas do período por projeto</p></div></div><div id="g-proj"></div></section>
      <section class="cartao m6"><div class="cartao-cab"><div><h3>Distribuição dos recursos por categoria</h3><p>Despesas do período por natureza do gasto</p></div></div><div id="g-cat"></div></section>
    </div>`;

  main.querySelector('#sel-ano').onchange = e => { location.hash = `#/?ano=${e.target.value || 'todos'}`; };
  if (anoQ) gravarFiltros({ ano: anoQ });

  const vazio = !serie.chaves.length || (!ind.recebido && !ind.aplicado) ? 'Sem lançamentos publicados no período.' : null;
  montarGrafico(main.querySelector('#g-recdes'), {
    tipo: 'colunas', titulo: 'Receitas e despesas por mês', vazio, categorias: cats,
    series: [{ nome: 'Receitas', valores: serie.receitas, cor: COR.receita }, { nome: 'Despesas', valores: serie.despesas, cor: COR.despesa }],
    legenda: [{ nome: 'Receitas', cor: COR.receita }, { nome: 'Despesas', cor: COR.despesa }],
    fmtEixo: fmtMoedaCurta,
    dica: i => `<b>${esc(cats[i])}</b>${linhaDica(COR.receita, 'Receitas', fmtMoeda(serie.receitas[i]))}${linhaDica(COR.despesa, 'Despesas', fmtMoeda(serie.despesas[i]))}${linhaDica(null, 'Saldo do mês', fmtMoeda(serie.receitas[i] - serie.despesas[i]))}`,
    tabela: { colunas: ['Mês', 'Receitas', 'Despesas', 'Saldo'], linhas: serie.chaves.map((_, i) => [cats[i], fmtMoeda(serie.receitas[i]), fmtMoeda(serie.despesas[i]), fmtMoeda(serie.receitas[i] - serie.despesas[i])]) },
  });
  const itensArea = areas.map(a => ({ rotulo: a.rotulo, valor: a.valor }));
  montarGrafico(main.querySelector('#g-area'), {
    tipo: 'barras', titulo: 'Investimento por área', vazio: itensArea.length ? null : 'Sem despesas no período.', itens: itensArea, cor: COR.despesa, fmt: fmtMoeda, fmtCurto: fmtMoedaCurta,
    dica: i => `<b>${esc(itensArea[i].rotulo)}</b>${linhaDica(null, 'Aplicado', fmtMoeda(itensArea[i].valor))}${linhaDica(null, 'Participação', fmtPct(itensArea[i].valor / ind.aplicado))}`,
    tabela: { colunas: ['Área', 'Aplicado', '%'], linhas: itensArea.map(a => [a.rotulo, fmtMoeda(a.valor), fmtPct(a.valor / ind.aplicado)]) },
  });
  montarGrafico(main.querySelector('#g-acum'), {
    tipo: 'linha', titulo: 'Investimento acumulado', vazio, categorias: cats, area: true, rotularFim: true,
    series: [{ nome: 'Aplicado acumulado', valores: serie.acumulado, cor: COR.despesa }], fmtEixo: fmtMoedaCurta,
    dica: i => `<b>${esc(cats[i])}</b>${linhaDica(COR.despesa, 'Acumulado', fmtMoeda(serie.acumulado[i]))}${linhaDica(null, 'No mês', fmtMoeda(serie.despesas[i]))}`,
    tabela: { colunas: ['Mês', 'No mês', 'Acumulado'], linhas: serie.chaves.map((_, i) => [cats[i], fmtMoeda(serie.despesas[i]), fmtMoeda(serie.acumulado[i])]) },
  });
  montarGrafico(main.querySelector('#g-benef'), {
    tipo: 'linha', titulo: 'Beneficiários acumulados', vazio: ind.beneficiados ? null : 'Sem atendimentos no período.', categorias: cats, area: true, rotularFim: true,
    series: [{ nome: 'Pessoas atendidas', valores: serie.pessoasAcumuladas, cor: COR.pessoas }], fmtEixo: fmtNumCurto,
    dica: i => `<b>${esc(cats[i])}</b>${linhaDica(COR.pessoas, 'Acumulado', fmtNum(serie.pessoasAcumuladas[i]))}${linhaDica(null, 'Novos no mês', fmtNum(serie.pessoas[i]))}`,
    tabela: { colunas: ['Mês', 'Novos no mês', 'Acumulado'], linhas: serie.chaves.map((_, i) => [cats[i], fmtNum(serie.pessoas[i]), fmtNum(serie.pessoasAcumuladas[i])]) },
  });
  const desAno = calc.noPeriodo(b.despesas, { ano });
  const porProj = topN(calc.porChave(desAno, d => calc.nomeProjeto(b, d.projetoId, calc.SEM_PROJETO_DESPESA)), 8);
  montarGrafico(main.querySelector('#g-proj'), {
    tipo: 'barras', titulo: 'Por projeto', vazio: porProj.length ? null : 'Sem despesas no período.', itens: porProj, cor: COR.despesa, fmt: fmtMoeda, fmtCurto: fmtMoedaCurta,
    dica: i => `<b>${esc(porProj[i].rotulo)}</b>${linhaDica(null, 'Aplicado', fmtMoeda(porProj[i].valor))}${linhaDica(null, 'Participação', fmtPct(porProj[i].valor / ind.aplicado))}`,
    aoClicar: i => { const p = b.projetos.find(x => x.nome === porProj[i].rotulo); if (p) location.hash = `#/projetos/${p.id}`; },
    tabela: { colunas: ['Projeto', 'Aplicado', '%'], linhas: porProj.map(a => [a.rotulo, fmtMoeda(a.valor), fmtPct(a.valor / ind.aplicado)]) },
  });
  const porCat = topN(calc.porChave(desAno, 'categoria'), 8);
  montarGrafico(main.querySelector('#g-cat'), {
    tipo: 'barras', titulo: 'Por categoria', vazio: porCat.length ? null : 'Sem despesas no período.', itens: porCat, cor: COR.despesa, fmt: fmtMoeda, fmtCurto: fmtMoedaCurta,
    dica: i => `<b>${esc(porCat[i].rotulo)}</b>${linhaDica(null, 'Aplicado', fmtMoeda(porCat[i].valor))}${linhaDica(null, 'Participação', fmtPct(porCat[i].valor / ind.aplicado))}`,
    tabela: { colunas: ['Categoria', 'Aplicado', '%'], linhas: porCat.map(a => [a.rotulo, fmtMoeda(a.valor), fmtPct(a.valor / ind.aplicado)]) },
  });
}
