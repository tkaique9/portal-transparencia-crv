// Indicadores de impacto social: o que o dinheiro produziu.

import { basePublica, gravarFiltros } from '../app.js';
import * as calc from '../calculo.js';
import { esc, fmtMoeda, fmtNum, fmtNumCurto, fmtPct } from '../util.js';
import { kpi, montarTabela } from '../ui/componentes.js';
import { montarGrafico, linhaDica } from '../ui/graficos.js';
import { COR, rotuloMes, seletorAno, textoPeriodo } from './inicio.js';

export async function render(main, rota) {
  const b = basePublica();
  const anoQ = rota.q.get('ano');
  const ano = anoQ === 'todos' || !anoQ ? null : Number(anoQ);
  const ind = calc.indicadores(b, ano);
  const serie = calc.serieMensal(b, ano);
  const cats = serie.chaves.map(k => rotuloMes(k, !ano));
  const benef = calc.metaResultadoBeneficiarios(b, ano);
  const areas = calc.porArea(b, ano);
  const metas = b.metas.filter(m => m.meta > 0).map(m => ({ ...m, projeto: calc.nomeProjeto(b, m.projetoId, ''), pct: (m.realizado || 0) / m.meta }));
  const cumpridas = metas.filter(m => m.pct >= 1).length;
  const realizados = b.projetos.filter(p => ['Concluído', 'Em execução'].includes(p.status) && calc.ativoNoAno(p, ano)).length;

  main.innerHTML = `
    <div class="cab-pagina"><div><div class="trilha-nav"><a href="#/">Início</a> › Impacto social</div>
      <h1>Indicadores de impacto social</h1>
      <p>Os resultados efetivos do Instituto: quantas pessoas, famílias, comunidades e municípios foram alcançados, e quanto de cada meta já foi entregue.</p></div>
      <label class="filtros" style="margin:0">Período ${seletorAno(b, ano ?? '')}</label></div>
    <div class="kpis">
      ${kpi('Pessoas beneficiadas', fmtNum(ind.beneficiados), textoPeriodo(ano), { destaque: true })}
      ${kpi('Famílias atendidas', fmtNum(ind.familias), 'Novas famílias acompanhadas', { destaque: true })}
      ${kpi('Projetos realizados', fmtNum(realizados), `${fmtNum(ind.projetosEmExecucao)} em execução hoje`)}
      ${kpi('Comunidades alcançadas', fmtNum(ind.comunidades), 'Maior alcance mensal de cada projeto')}
      ${kpi('Municípios atendidos', fmtNum(ind.municipios), ind.listaMunicipios.join(', '))}
      ${kpi('Horas de atividade', fmtNum(ind.horas), 'Aulas, oficinas, atendimentos')}
      ${kpi('Metas cumpridas', `${cumpridas} de ${metas.length}`, 'Integralmente, em todos os projetos', { medidor: metas.length ? cumpridas / metas.length : 0 })}
      ${kpi('Custo por pessoa atendida', ind.beneficiados ? fmtMoeda(ind.aplicado / ind.beneficiados) : '—', 'Aplicado no período ÷ pessoas')}
    </div>
    <div class="grade">
      <section class="cartao m6"><div class="cartao-cab"><div><h3>Beneficiários: meta × atendidos</h3><p>Por projeto. A linha vertical marca 100% da meta</p></div></div><div id="g-meta"></div></section>
      <section class="cartao m6"><div class="cartao-cab"><div><h3>Evolução dos beneficiários</h3><p>Pessoas atendidas, acumulado</p></div></div><div id="g-evol"></div></section>
      <section class="cartao"><div class="cartao-cab"><div><h3>Metas físicas de todos os projetos</h3><p>Realizado em relação ao previsto de cada meta</p></div></div><div id="g-metas"></div></section>
    </div>
    <div class="secao-titulo"><h2>Resultados por área de atuação</h2></div>
    <div id="t-area"></div>`;

  main.querySelector('#sel-ano').onchange = e => { location.hash = `#/impacto?ano=${e.target.value || 'todos'}`; };
  if (anoQ) gravarFiltros({ ano: anoQ });

  const legendaMeta = [{ nome: 'Atendido', cor: COR.pessoas }, { nome: 'Meta (100%)', forma: 'trilha' }];
  montarGrafico(main.querySelector('#g-meta'), {
    tipo: 'metas', vazio: benef.length ? null : 'Sem projetos com meta de beneficiários no período.', itens: benef, cor: COR.pessoas, legenda: legendaMeta,
    dica: i => `<b>${esc(benef[i].rotulo)}</b>${linhaDica(COR.pessoas, 'Atendidos', fmtNum(benef[i].realizado))}${linhaDica(null, 'Meta', fmtNum(benef[i].meta))}${linhaDica(null, 'Alcance', fmtPct(benef[i].realizado / benef[i].meta))}`,
    tabela: { colunas: ['Projeto', 'Meta', 'Atendidos', 'Alcance'], linhas: benef.map(x => [x.rotulo, fmtNum(x.meta), fmtNum(x.realizado), fmtPct(x.realizado / x.meta)]) },
  });
  montarGrafico(main.querySelector('#g-evol'), {
    tipo: 'linha', vazio: ind.beneficiados ? null : 'Sem atendimentos no período.', categorias: cats, area: true, rotularFim: true,
    series: [{ nome: 'Pessoas', valores: serie.pessoasAcumuladas, cor: COR.pessoas }], fmtEixo: fmtNumCurto,
    dica: i => `<b>${esc(cats[i])}</b>${linhaDica(COR.pessoas, 'Acumulado', fmtNum(serie.pessoasAcumuladas[i]))}${linhaDica(null, 'Novos no mês', fmtNum(serie.pessoas[i]))}`,
    tabela: { colunas: ['Mês', 'Novos', 'Acumulado'], linhas: serie.chaves.map((_, i) => [cats[i], fmtNum(serie.pessoas[i]), fmtNum(serie.pessoasAcumuladas[i])]) },
  });
  const itensMetas = metas.map(m => ({ rotulo: `${m.descricao} — ${m.projeto}`, meta: m.meta, realizado: m.realizado || 0, unidade: m.unidade }));
  montarGrafico(main.querySelector('#g-metas'), {
    tipo: 'metas', vazio: itensMetas.length ? null : 'Sem metas cadastradas.', itens: itensMetas, cor: COR.pessoas, legenda: [{ nome: 'Realizado', cor: COR.pessoas }, { nome: 'Meta (100%)', forma: 'trilha' }],
    dica: i => `<b>${esc(itensMetas[i].rotulo)}</b>${linhaDica(COR.pessoas, 'Realizado', `${fmtNum(itensMetas[i].realizado)} ${itensMetas[i].unidade}`)}${linhaDica(null, 'Meta', `${fmtNum(itensMetas[i].meta)} ${itensMetas[i].unidade}`)}`,
    tabela: { colunas: ['Meta', 'Previsto', 'Realizado', '%'], linhas: itensMetas.map(m => [m.rotulo, fmtNum(m.meta), fmtNum(m.realizado), fmtPct(m.realizado / m.meta)]) },
  });
  montarTabela(main.querySelector('#t-area'), {
    linhas: areas, ordem: { k: 'investido', dir: 'desc' },
    colunas: [
      { k: 'area', titulo: 'Área de atuação' },
      { k: 'projetos', titulo: 'Projetos', tipo: 'int' },
      { k: 'pessoas', titulo: 'Pessoas atendidas', tipo: 'int' },
      { k: 'horas', titulo: 'Horas de atividade', tipo: 'int' },
      { k: 'investido', titulo: 'Investido', tipo: 'moeda' },
      { k: 'custo', titulo: 'Custo por pessoa', tipo: 'moeda', valor: a => a.pessoas ? a.investido / a.pessoas : null },
    ],
    total: ls => ({ projetos: ls.reduce((a, x) => a + x.projetos, 0), pessoas: ls.reduce((a, x) => a + x.pessoas, 0), horas: ls.reduce((a, x) => a + x.horas, 0), investido: ls.reduce((a, x) => a + x.investido, 0) }),
    exportar: { titulo: 'Resultados por área de atuação', subtitulo: textoPeriodo(ano) },
  });
}
