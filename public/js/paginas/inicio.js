// Visão geral: leitura de diretoria em uma tela — resumo executivo, as
// perguntas do cidadão respondidas, indicadores com tendência e variação, e
// os gráficos com o número escrito em cada marca.

import { basePublica, gravarFiltros } from '../app.js';
import * as calc from '../calculo.js';
import { esc, fmtMoeda, fmtMoedaCurta, fmtNum, fmtNumCurto, fmtPct, MESES } from '../util.js';
import { kpi, opcoes, delta } from '../ui/componentes.js';
import { montarGrafico, topN, linhaDica, minigrafico } from '../ui/graficos.js';

export const COR = { receita: 'var(--s1)', despesa: 'var(--s2)', pessoas: 'var(--s3)' };

export const rotuloMes = (chave, comAno) => { const [a, m] = chave.split('-'); return comAno ? `${MESES[m - 1]}/${a.slice(2)}` : MESES[m - 1]; };
export const textoPeriodo = ano => ano ? `exercício ${ano}` : 'todos os exercícios';

export function seletorAno(b, ano, id = 'sel-ano') {
  return `<select id="${id}" aria-label="Exercício">${opcoes([['', 'Todos os exercícios'], ...b.anos.map(a => [a, `Exercício ${a}`])], ano ?? '')}</select>`;
}

/** Valor em reais sem o "R$" — para rótulos de gráfico, onde a moeda já está no título. */
export const fmtRotuloMoeda = v => fmtMoedaCurta(v).replace('R$ ', '');

const ICONES = {
  recebeu: '<path d="M12 3v12m0 0l-4-4m4 4l4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  origem: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M7.5 8l3.5 7.5M16.5 8L13 15.5"/>',
  gasto: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
  onde: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  projetos: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  pessoas: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2c3 .3 5.5 2.6 5.5 5.8"/>',
  resultados: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  docs: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
};
const icone = k => `<span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[k]}</svg></span>`;

export async function render(main, rota) {
  const b = basePublica();
  const anoQ = rota.q.get('ano');
  const ano = anoQ === 'todos' ? null : Number(anoQ) || b.anos[0] || null;
  const ind = calc.indicadores(b, ano);
  const cmp = calc.comparativo(b, ano);
  const ant = cmp?.anterior;
  const var_ = (atual, chave) => ant ? { v: calc.variacao(atual, ant[chave]), rotulo: cmp.rotulo } : null;
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
  const custoPessoa = ind.beneficiados ? ind.aplicado / ind.beneficiados : null;

  const pergunta = (ic, p, resposta, detalhe, href) => `<a class="pergunta" href="${href}">${icone(ic)}<span class="q">${esc(p)}</span><span class="a">${esc(resposta)}</span><span class="d">${detalhe}</span></a>`;
  const dHero = d => d ? delta(d.v, d.rotulo, d.sentido || 'sobe') : '';

  main.innerHTML = `
    <section class="heroi">
      <div>
        <h1>Transparência na gestão dos recursos do Instituto CRV</h1>
        <p>Quanto recebemos, de onde vieram os recursos, onde foram aplicados, quem foi beneficiado e quais resultados entregamos.</p>
        <label class="exercicio">Exibindo ${seletorAno(b, anoQ === 'todos' ? '' : ano)}</label>
        ${ultimoMes ? `<p class="quando">Lançamentos publicados até ${esc(rotuloMes(ultimoMes.slice(0, 7), true))}${cmp ? ` · variações ${esc(cmp.rotulo)} (mesmo período)` : ''}.</p>` : ''}
      </div>
      <div class="resumo">
        <div><div class="r-rot">Recebido</div><div class="r-val">${fmtMoedaCurta(ind.recebido)}</div><div class="r-sub">${dHero(var_(ind.recebido, 'recebido'))}</div></div>
        <div><div class="r-rot">Aplicado</div><div class="r-val">${fmtMoedaCurta(ind.aplicado)}</div><div class="r-sub">${dHero(ant ? { ...var_(ind.aplicado, 'aplicado'), sentido: 'neutro' } : null)}</div></div>
        <div><div class="r-rot">Saldo do período</div><div class="r-val">${fmtMoedaCurta(ind.saldo)}</div><div class="r-sub">${ind.recebido ? `${fmtPct(ind.saldo / ind.recebido)} do recebido` : ''}</div></div>
        <div class="exec"><span class="r-rot">Execução do orçamento</span><div class="barra" role="img" aria-label="${ind.execucao !== null ? fmtPct(ind.execucao) : 'sem orçamento'}"><i style="width:${Math.min(100, (ind.execucao || 0) * 100)}%"></i></div><b>${ind.execucao !== null ? fmtPct(ind.execucao) : '—'}</b><span class="r-sub">de ${fmtMoedaCurta(ind.orcado)}</span></div>
      </div>
    </section>

    <h2 class="sr">Perguntas frequentes</h2>
    <div class="perguntas">
      ${pergunta('recebeu', 'Quanto o Instituto recebeu?', fmtMoeda(ind.recebido), `<b>${fmtNum(ind.nReceitas)}</b> recebimentos no ${textoPeriodo(ano)}`, '#/receitas' + qs)}
      ${pergunta('origem', 'De onde vieram os recursos?', origens[0]?.rotulo || '—', origens[0] ? `<b>${fmtPct(origens[0].valor / ind.recebido)}</b> do total · ${origens.length} origens` : 'Sem receitas no período', '#/receitas' + qs)}
      ${pergunta('gasto', 'Quanto foi gasto?', fmtMoeda(ind.aplicado), ind.execucao !== null ? `<b>${fmtPct(ind.execucao)}</b> do orçamento aprovado` : `${fmtNum(ind.nDespesas)} pagamentos`, '#/despesas' + qs)}
      ${pergunta('onde', 'Onde o dinheiro foi aplicado?', areas[0]?.rotulo || '—', areas[0] ? `<b>${fmtPct(areas[0].valor / ind.aplicado)}</b> do total aplicado` : 'Sem despesas no período', '#/despesas' + qs)}
      ${pergunta('projetos', 'Quais projetos foram realizados?', `${fmtNum(ind.projetosNoPeriodo)} projetos`, `<b>${fmtNum(ind.projetosEmExecucao)}</b> em execução hoje`, '#/projetos')}
      ${pergunta('pessoas', 'Quantas pessoas foram beneficiadas?', fmtNum(ind.beneficiados), `<b>${fmtNum(ind.familias)}</b> famílias · <b>${fmtNum(ind.municipios)}</b> municípios`, '#/impacto' + qs)}
      ${pergunta('resultados', 'Quais resultados foram alcançados?', `${metasCumpridas} de ${metas.length} metas`, `<b>${fmtPct(metas.length ? metasCumpridas / metas.length : 0, 0)}</b> cumpridas integralmente`, '#/impacto' + qs)}
      ${pergunta('docs', 'Onde consultar documentos?', `${fmtNum(docs.length)} documentos`, 'Estatuto, balanços, auditorias e relatórios', '#/prestacao' + qs)}
    </div>

    <div class="secao-titulo"><h2>Indicadores — ${esc(textoPeriodo(ano))}</h2>${cmp ? `<span class="mudo pequeno">Variação ${esc(cmp.rotulo)}, no mesmo intervalo de meses</span>` : ''}</div>
    <div class="kpis">
      ${kpi('Recursos recebidos', fmtMoedaCurta(ind.recebido), `${fmtNum(ind.nReceitas)} lançamentos · ${fmtMoeda(ind.recebido)}`, { cor: COR.receita, delta: var_(ind.recebido, 'recebido'), mini: minigrafico(serie.receitas, COR.receita) })}
      ${kpi('Recursos aplicados', fmtMoedaCurta(ind.aplicado), `${fmtNum(ind.nDespesas)} pagamentos · ${fmtMoeda(ind.aplicado)}`, { cor: COR.despesa, delta: ant ? { ...var_(ind.aplicado, 'aplicado'), sentido: 'neutro' } : null, mini: minigrafico(serie.despesas, COR.despesa) })}
      ${kpi('Saldo do período', fmtMoedaCurta(ind.saldo), ind.recebido ? `${fmtPct(ind.saldo / ind.recebido)} do recebido ficou em caixa` : '', { cor: 'var(--leaf)' })}
      ${kpi('Execução do orçamento', ind.execucao !== null ? fmtPct(ind.execucao) : '—', ind.orcado ? `${fmtMoedaCurta(ind.aplicado)} de ${fmtMoedaCurta(ind.orcado)} aprovados` : 'Sem orçamento cadastrado', { cor: 'var(--leaf)', medidor: ind.execucao ?? 0 })}
      ${kpi('Pessoas beneficiadas', fmtNum(ind.beneficiados), 'Novos atendidos no período', { cor: COR.pessoas, delta: var_(ind.beneficiados, 'beneficiados'), mini: minigrafico(serie.pessoas, COR.pessoas) })}
      ${kpi('Famílias atendidas', fmtNum(ind.familias), 'Novas famílias no período', { cor: COR.pessoas, delta: var_(ind.familias, 'familias') })}
      ${kpi('Custo por pessoa atendida', custoPessoa ? fmtMoeda(custoPessoa) : '—', 'Aplicado ÷ pessoas atendidas', { cor: 'var(--s7)', delta: ant && custoPessoa && ant.beneficiados ? { v: calc.variacao(custoPessoa, ant.aplicado / ant.beneficiados), rotulo: cmp.rotulo, sentido: 'desce' } : null })}
      ${kpi('Municípios atendidos', fmtNum(ind.municipios), ind.listaMunicipios.join(', '), { cor: 'var(--s7)' })}
    </div>

    <div class="grade">
      <section class="cartao m8"><div class="cartao-cab"><div><h3>Receitas × despesas por mês</h3><p>Quanto entrou e quanto foi aplicado em cada mês (R$)</p></div><div class="total"><b>${fmtMoedaCurta(ind.saldo)}</b><span>saldo do período</span></div></div><div id="g-recdes"></div></section>
      <section class="cartao m4"><div class="cartao-cab"><div><h3>Investimento por área</h3><p>Valor aplicado e % do total</p></div></div><div id="g-area"></div></section>
      <section class="cartao m6"><div class="cartao-cab"><div><h3>Evolução dos investimentos</h3><p>Total aplicado, acumulado mês a mês (R$)</p></div><div class="total"><b>${fmtMoedaCurta(ind.aplicado)}</b><span>no período</span></div></div><div id="g-acum"></div></section>
      <section class="cartao m6"><div class="cartao-cab"><div><h3>Evolução dos beneficiários</h3><p>Pessoas atendidas, acumulado mês a mês</p></div><div class="total"><b>${fmtNum(ind.beneficiados)}</b><span>pessoas</span></div></div><div id="g-benef"></div></section>
      <section class="cartao m6"><div class="cartao-cab"><div><h3>Distribuição por projeto</h3><p>Valor aplicado e % do total · clique para abrir o projeto</p></div></div><div id="g-proj"></div></section>
      <section class="cartao m6"><div class="cartao-cab"><div><h3>Distribuição por categoria</h3><p>Natureza do gasto: valor e % do total</p></div></div><div id="g-cat"></div></section>
    </div>`;

  main.querySelector('#sel-ano').onchange = e => { location.hash = `#/?ano=${e.target.value || 'todos'}`; };
  if (anoQ) gravarFiltros({ ano: anoQ });

  const vazio = !serie.chaves.length || (!ind.recebido && !ind.aplicado) ? 'Sem lançamentos publicados no período.' : null;
  montarGrafico(main.querySelector('#g-recdes'), {
    tipo: 'colunas', titulo: 'Receitas e despesas por mês', vazio, categorias: cats, altura: 300,
    series: [{ nome: 'Receitas', valores: serie.receitas, cor: COR.receita }, { nome: 'Despesas', valores: serie.despesas, cor: COR.despesa }],
    legenda: [{ nome: 'Receitas', cor: COR.receita, valor: fmtMoedaCurta(ind.recebido) }, { nome: 'Despesas', cor: COR.despesa, valor: fmtMoedaCurta(ind.aplicado) }],
    fmtEixo: fmtMoedaCurta, fmtRotulo: fmtRotuloMoeda,
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
    tipo: 'linha', titulo: 'Investimento acumulado', vazio, categorias: cats, area: true,
    series: [{ nome: 'Aplicado acumulado', valores: serie.acumulado, cor: COR.despesa }], fmtEixo: fmtMoedaCurta, fmtRotulo: fmtRotuloMoeda,
    dica: i => `<b>${esc(cats[i])}</b>${linhaDica(COR.despesa, 'Acumulado', fmtMoeda(serie.acumulado[i]))}${linhaDica(null, 'No mês', fmtMoeda(serie.despesas[i]))}`,
    tabela: { colunas: ['Mês', 'No mês', 'Acumulado'], linhas: serie.chaves.map((_, i) => [cats[i], fmtMoeda(serie.despesas[i]), fmtMoeda(serie.acumulado[i])]) },
  });
  montarGrafico(main.querySelector('#g-benef'), {
    tipo: 'linha', titulo: 'Beneficiários acumulados', vazio: ind.beneficiados ? null : 'Sem atendimentos no período.', categorias: cats, area: true,
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
