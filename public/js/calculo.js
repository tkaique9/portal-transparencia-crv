// Motor de indicadores. Funções puras: recebem listas, devolvem números.
// Não conhece o DOM nem o banco — as telas públicas passam só o que está
// publicado, o painel administrativo pode passar tudo. É a mesma conta para
// o painel, as páginas, a prestação de contas e as exportações.

import { anoDe, mesDe, soma, agrupar } from './util.js';

export const SEM_PROJETO_DESPESA = 'Gestão institucional';
export const SEM_PROJETO_RECEITA = 'Institucional (livre aplicação)';

/** Filtro de período. ano = número ou null (todos); mes = 1–12 ou null. */
export function noPeriodo(lista, { ano = null, mes = null } = {}, campo = 'data') {
  return lista.filter(r => {
    const v = r[campo];
    if (!v) return false;
    if (ano && anoDe(v) !== Number(ano)) return false;
    if (mes && mesDe(v) !== Number(mes)) return false;
    return true;
  });
}

/** Atendimentos guardam mês 'AAAA-MM'. */
const atendNoAno = (lista, ano) => ano ? lista.filter(a => anoDe(a.mes) === Number(ano)) : lista;
const orcNoAno = (lista, ano) => ano ? lista.filter(o => Number(o.exercicio) === Number(ano)) : lista;

export const municipiosDe = p => String(p?.municipios || '').split(';').map(s => s.trim()).filter(Boolean);

/** O projeto esteve em execução em algum momento do ano? */
export function ativoNoAno(p, ano) {
  if (p.status === 'Planejado') return false;
  if (!ano) return true;
  const ini = `${ano}-01-01`, fim = `${ano}-12-31`;
  return p.inicio <= fim && (!p.fim || p.fim >= ini || p.status === 'Em execução');
}

export const anosDisponiveis = b => [...new Set([
  ...b.receitas.map(r => anoDe(r.data)), ...b.despesas.map(d => anoDe(d.data)), ...b.orcamentos.map(o => Number(o.exercicio)),
])].filter(Boolean).sort((a, b) => b - a);

/** Soma por chave, ordenada do maior para o menor: [{rotulo, valor, n}]. */
export function porChave(lista, chave, valor = r => r.valor) {
  return [...agrupar(lista, chave)].map(([rotulo, itens]) => ({ rotulo, valor: soma(itens, valor), n: itens.length }))
    .sort((a, b) => b.valor - a.valor);
}

export const nomeProjeto = (b, id, vazio) => b.projetos.find(p => p.id === id)?.nome || vazio;

/**
 * Comunidades alcançadas: o atendimento informa quantas comunidades o
 * projeto alcançou no mês, e as mesmas voltam mês após mês. Somar os meses
 * contaria cada comunidade várias vezes; vale o maior mês de cada projeto,
 * somado entre projetos (projetos diferentes atendem comunidades diferentes
 * — aproximação declarada na página "Sobre os dados").
 */
export function comunidadesAlcancadas(atendimentos) {
  return [...agrupar(atendimentos, 'projetoId').values()].reduce((a, l) => a + Math.max(0, ...l.map(x => Number(x.comunidades) || 0)), 0);
}

/** Os números do painel principal. */
export function indicadores(b, ano = null) {
  const rec = noPeriodo(b.receitas, { ano });
  const des = noPeriodo(b.despesas, { ano });
  const orc = orcNoAno(b.orcamentos, ano);
  const at = atendNoAno(b.atendimentos, ano);
  const recebido = soma(rec, r => r.valor);
  const aplicado = soma(des, d => d.valor);
  const orcado = soma(orc, o => o.valor);
  const ativosAno = b.projetos.filter(p => ativoNoAno(p, ano));
  const municipios = new Set(ativosAno.flatMap(municipiosDe));
  const area = d => b.projetos.find(p => p.id === d.projetoId)?.area || SEM_PROJETO_DESPESA;
  return {
    recebido, aplicado, saldo: recebido - aplicado, orcado,
    execucao: orcado > 0 ? aplicado / orcado : null,
    projetosEmExecucao: b.projetos.filter(p => p.status === 'Em execução').length,
    projetosNoPeriodo: ativosAno.length,
    projetosConcluidos: b.projetos.filter(p => p.status === 'Concluído' && (!ano || anoDe(p.fim) === Number(ano))).length,
    beneficiados: soma(at, a => a.pessoas),
    familias: soma(at, a => a.familias),
    horas: soma(at, a => a.horas),
    comunidades: comunidadesAlcancadas(at),
    municipios: municipios.size,
    listaMunicipios: [...municipios].sort(),
    porArea: porChave(des, area),
    nReceitas: rec.length, nDespesas: des.length,
  };
}

/**
 * Série mensal. Com ano: os 12 meses do ano. Sem ano: cada mês desde o
 * primeiro lançamento. Devolve rótulos e as somas por mês.
 */
export function serieMensal(b, ano = null) {
  let chaves;
  if (ano) chaves = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`);
  else {
    const todas = [...b.receitas, ...b.despesas].map(r => r.data.slice(0, 7)).concat(b.atendimentos.map(a => a.mes)).sort();
    if (!todas.length) return { chaves: [], receitas: [], despesas: [], acumulado: [], pessoas: [] };
    chaves = [];
    let [a, m] = todas[0].split('-').map(Number);
    const [af, mf] = todas[todas.length - 1].split('-').map(Number);
    while (a < af || (a === af && m <= mf)) { chaves.push(`${a}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; a++; } }
  }
  const somaMes = (lista, campo, val) => { const m = new Map(); for (const r of lista) { const k = String(r[campo]).slice(0, 7); m.set(k, (m.get(k) || 0) + (Number(val(r)) || 0)); } return m; };
  const mr = somaMes(b.receitas, 'data', r => r.valor);
  const md = somaMes(b.despesas, 'data', d => d.valor);
  const mp = somaMes(b.atendimentos, 'mes', a => a.pessoas);
  const receitas = chaves.map(k => mr.get(k) || 0);
  const despesas = chaves.map(k => md.get(k) || 0);
  let ac = 0;
  const acumulado = despesas.map(v => (ac += v));
  let acp = 0;
  const pessoas = chaves.map(k => mp.get(k) || 0);
  const pessoasAcumuladas = pessoas.map(v => (acp += v));
  return { chaves, receitas, despesas, acumulado, pessoas, pessoasAcumuladas };
}

/** Orçamento aprovado × realizado por categoria de despesa. */
export function previstoRealizado(b, ano = null, projetoId = undefined) {
  const filtro = r => projetoId === undefined || (r.projetoId || null) === projetoId;
  const orc = orcNoAno(b.orcamentos, ano).filter(filtro);
  const des = noPeriodo(b.despesas, { ano }).filter(filtro);
  const cats = [...new Set([...orc.map(o => o.categoria), ...des.map(d => d.categoria)])];
  return cats.map(c => {
    const previsto = soma(orc.filter(o => o.categoria === c), o => o.valor);
    const realizado = soma(des.filter(d => d.categoria === c), d => d.valor);
    return { categoria: c, previsto, realizado, diferenca: previsto - realizado, execucao: previsto > 0 ? realizado / previsto : null };
  }).sort((a, b) => b.previsto - a.previsto || b.realizado - a.realizado);
}

/**
 * Situação de um projeto. Execução financeira = gasto ÷ investimento
 * previsto. Execução física = média das metas, cada uma limitada a 100%
 * (superar uma meta não compensa outra atrasada).
 */
export function resumoProjeto(b, p) {
  const des = b.despesas.filter(d => d.projetoId === p.id);
  const rec = b.receitas.filter(r => r.projetoId === p.id);
  const metas = b.metas.filter(m => m.projetoId === p.id);
  const at = b.atendimentos.filter(a => a.projetoId === p.id);
  const realizado = soma(des, d => d.valor);
  const fis = metas.filter(m => m.meta > 0).map(m => Math.min(1, (m.realizado || 0) / m.meta));
  return {
    realizado, previsto: p.orcamento || 0, recebido: soma(rec, r => r.valor),
    execFinanceira: p.orcamento > 0 ? realizado / p.orcamento : null,
    execFisica: fis.length ? fis.reduce((a, x) => a + x, 0) / fis.length : null,
    beneficiarios: soma(at, a => a.pessoas), familias: soma(at, a => a.familias),
    horas: soma(at, a => a.horas), comunidades: comunidadesAlcancadas(at),
    metas, despesas: des, receitas: rec, atendimentos: at,
    municipios: municipiosDe(p),
  };
}

/** Metas de beneficiários × atendidos, por projeto. */
export function metaResultadoBeneficiarios(b, ano = null) {
  return b.projetos.filter(p => p.metaBeneficiarios > 0 && ativoNoAno(p, ano)).map(p => ({
    rotulo: p.nome, meta: p.metaBeneficiarios,
    realizado: soma(b.atendimentos.filter(a => a.projetoId === p.id && (!ano || anoDe(a.mes) <= Number(ano))), a => a.pessoas),
  })).sort((a, b) => b.meta - a.meta);
}

/** Resultado por área de atuação: investimento, pessoas, projetos. */
export function porArea(b, ano = null) {
  const at = atendNoAno(b.atendimentos, ano);
  const des = noPeriodo(b.despesas, { ano });
  return [...agrupar(b.projetos.filter(p => ativoNoAno(p, ano)), 'area')].map(([area, ps]) => {
    const ids = new Set(ps.map(p => p.id));
    return {
      area, projetos: ps.length,
      investido: soma(des.filter(d => ids.has(d.projetoId)), d => d.valor),
      pessoas: soma(at.filter(a => ids.has(a.projetoId)), a => a.pessoas),
      horas: soma(at.filter(a => ids.has(a.projetoId)), a => a.horas),
    };
  }).sort((a, b) => b.investido - a.investido);
}
