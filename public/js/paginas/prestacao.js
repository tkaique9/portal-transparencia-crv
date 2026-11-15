// Prestação de contas: anual e por projeto, com relatório em PDF e Excel.

import { basePublica, gravarFiltros } from '../app.js';
import * as calc from '../calculo.js';
import { esc, fmtMoeda, fmtNum, fmtPct, fmtData, soma } from '../util.js';
import { kpi, opcoes, montarTabela, ligarDocumentos } from '../ui/componentes.js';
import { CATEGORIAS_PRESTACAO } from '../dados/esquema.js';
import { iniciarPDF, rodapePDF, tabelaPDF, exportarPlanilha, AVISO_EXEMPLO } from '../export/exportar.js';
import { baixar, slug, hojeISO } from '../util.js';

/** Monta todos os números da prestação de um recorte (exercício × projeto). */
export function montarPrestacao(b, ano, projetoId) {
  // projetoId: undefined = instituto inteiro; id = um projeto
  const doProjeto = r => projetoId === undefined || r.projetoId === projetoId;
  const rec = calc.noPeriodo(b.receitas, { ano }).filter(doProjeto);
  const des = calc.noPeriodo(b.despesas, { ano }).filter(doProjeto);
  const recebido = soma(rec, r => r.valor);
  const aplicado = soma(des, d => d.valor);
  const pr = calc.previstoRealizado(b, ano, projetoId);
  const orcado = soma(pr, x => x.previsto);
  const anteriores = projetoId === undefined
    ? soma(b.receitas.filter(r => r.data < `${ano}-01-01`), r => r.valor) - soma(b.despesas.filter(d => d.data < `${ano}-01-01`), d => d.valor)
    : soma(b.receitas.filter(r => r.projetoId === projetoId && r.data < `${ano}-01-01`), r => r.valor) - soma(b.despesas.filter(d => d.projetoId === projetoId && d.data < `${ano}-01-01`), d => d.valor);
  const nomeProj = id => id ? calc.nomeProjeto(b, id, 'Projeto em aprovação') : calc.SEM_PROJETO_DESPESA;
  return {
    rec, des, recebido, aplicado, orcado, pr,
    saldoAnterior: anteriores, saldoPeriodo: recebido - aplicado, saldoFinal: anteriores + recebido - aplicado,
    execucao: orcado ? soma(pr, x => x.realizado) / orcado : null,
    porOrigem: calc.porChave(rec, 'origem'),
    porProjeto: calc.porChave(des, d => nomeProj(d.projetoId)),
    porCategoria: calc.porChave(des, 'categoria'),
    documentos: b.documentos.filter(d => CATEGORIAS_PRESTACAO.includes(d.categoria) && Number(d.exercicio) === ano && (projetoId === undefined ? true : d.projetoId === projetoId)),
  };
}

export async function render(main, rota) {
  const b = basePublica();
  const f = { ano: rota.q.get('ano') || String(b.anos[0] || new Date().getFullYear()), projeto: rota.q.get('projeto') || '' };

  main.innerHTML = `
    <div class="cab-pagina"><div><div class="trilha-nav"><a href="#/">Início</a> › Prestação de contas</div>
      <h1>Prestação de contas</h1>
      <p>Receitas, despesas, saldo e execução do orçamento aprovado, por exercício — do Instituto inteiro ou de um projeto — com os relatórios, pareceres e documentos de auditoria.</p></div></div>
    <form class="filtros" id="filtros">
      <label>Exercício<select name="ano">${opcoes(b.anos.map(a => [a, a]), f.ano)}</select></label>
      <label>Abrangência<select name="projeto">${opcoes([['', 'Instituto (todos os projetos)'], ...b.projetos.filter(p => p.status !== 'Planejado').map(p => [p.id, p.nome])], f.projeto)}</select></label>
      <div class="grupo-botoes limpar"><button class="botao primario" type="button" id="gerar-pdf">Gerar relatório PDF</button><button class="botao" type="button" id="gerar-xlsx">Gerar Excel</button></div>
    </form>
    <div id="resultado"></div>`;
  const form = main.querySelector('#filtros');
  const res = main.querySelector('#resultado');
  ligarDocumentos(res, b.documentos);

  const recorte = () => {
    const ano = Number(f.ano);
    const projetoId = f.projeto || undefined;
    const projeto = projetoId && b.projetos.find(p => p.id === projetoId);
    const parcial = ano === new Date().getFullYear();
    const titulo = `Prestação de contas ${ano}${projeto ? ` — ${projeto.nome}` : ''}`;
    return { ano, projetoId, projeto, parcial, titulo, P: montarPrestacao(b, ano, projetoId) };
  };

  const desenhar = () => {
    gravarFiltros(f);
    const { ano, projeto, parcial, P } = recorte();
    res.innerHTML = `
      ${parcial ? `<div class="alerta-caixa info">O exercício ${ano} está em andamento: os valores são parciais, até o último lançamento publicado.</div>` : ''}
      <div class="kpis">
        ${kpi('Saldo inicial', fmtMoeda(P.saldoAnterior), `Acumulado até 31/12/${ano - 1}`)}
        ${kpi('Receitas recebidas', fmtMoeda(P.recebido), `${fmtNum(P.rec.length)} lançamentos`, { destaque: true })}
        ${kpi('Despesas realizadas', fmtMoeda(P.aplicado), `${fmtNum(P.des.length)} pagamentos`, { destaque: true })}
        ${kpi('Saldo financeiro', fmtMoeda(P.saldoFinal), `Resultado do exercício: ${fmtMoeda(P.saldoPeriodo)}`, { destaque: true })}
        ${kpi('Orçamento aprovado', P.orcado ? fmtMoeda(P.orcado) : '—', projeto ? projeto.nome : 'Instituto')}
        ${kpi('Execução orçamentária', P.execucao !== null ? fmtPct(P.execucao) : '—', 'Realizado ÷ aprovado', { medidor: P.execucao ?? 0 })}
      </div>
      <div class="secao-titulo"><h2>Execução orçamentária por categoria</h2></div>
      <div id="t-orc"></div>
      <div class="grade" style="margin-top:16px">
        <section class="cartao m6"><h3>Receitas por origem</h3><div id="t-orig"></div></section>
        <section class="cartao m6"><h3>${projeto ? 'Despesas por categoria' : 'Despesas por projeto'}</h3><div id="t-proj"></div></section>
      </div>
      <div class="secao-titulo"><h2>Relatórios, pareceres e auditoria — ${ano}</h2></div>
      ${P.documentos.length ? `<div class="docs">${P.documentos.map(d => `<div class="doc"><div class="icone-doc">PDF</div><div><h3>${esc(d.titulo)}</h3><div class="meta">${esc(d.categoria)} · ${fmtData(d.data)}</div><div class="grupo-botoes"><button class="botao pequeno" type="button" data-ver-doc="${esc(d.id)}">Visualizar</button><button class="botao pequeno" type="button" data-baixar-doc="${esc(d.id)}">Baixar</button></div></div></div>`).join('')}</div>` : `<p class="mudo">Nenhum relatório ou parecer publicado para ${ano}${projeto ? ' neste projeto' : ''}. Pareceres de auditoria são publicados após o encerramento do exercício.</p>`}`;

    montarTabela(res.querySelector('#t-orc'), {
      linhas: P.pr, ordem: { k: 'previsto', dir: 'desc' },
      colunas: [
        { k: 'categoria', titulo: 'Categoria' },
        { k: 'previsto', titulo: 'Aprovado', tipo: 'moeda' },
        { k: 'realizado', titulo: 'Realizado', tipo: 'moeda' },
        { k: 'diferenca', titulo: 'Saldo a executar', tipo: 'moeda' },
        { k: 'execucao', titulo: 'Execução', tipo: 'pct', valor: x => x.execucao },
      ],
      total: ls => ({ previsto: soma(ls, x => x.previsto), realizado: soma(ls, x => x.realizado), diferenca: soma(ls, x => x.diferenca), execucao: soma(ls, x => x.previsto) ? soma(ls, x => x.realizado) / soma(ls, x => x.previsto) : null }),
      vazio: 'Sem orçamento ou despesa neste recorte.',
    });
    const simples = (sel, itens, titulo) => montarTabela(res.querySelector(sel), {
      linhas: itens, ordem: { k: 'valor', dir: 'desc' }, porPagina: 12,
      colunas: [{ k: 'rotulo', titulo }, { k: 'n', titulo: 'Lançamentos', tipo: 'int' }, { k: 'valor', titulo: 'Valor', tipo: 'moeda' }, { k: 'pct', titulo: '%', tipo: 'pct', valor: x => x.valor / (soma(itens, i => i.valor) || 1) }],
      total: ls => ({ n: soma(ls, x => x.n), valor: soma(ls, x => x.valor), pct: 1 }),
    });
    simples('#t-orig', P.porOrigem, 'Origem');
    simples('#t-proj', projeto ? P.porCategoria : P.porProjeto, projeto ? 'Categoria' : 'Projeto');
  };

  main.querySelector('#gerar-pdf').onclick = () => {
    const { ano, projeto, parcial, titulo, P } = recorte();
    const doc = iniciarPDF({ titulo, subtitulo: parcial ? `Exercício em andamento — parcial` : `Exercício encerrado em 31/12/${ano}`, demonstracao: b.demonstracao });
    doc.titulo(titulo);
    if (projeto) doc.paragrafo(`Projeto: ${projeto.nome} · ${projeto.area} · ${projeto.status}. Objetivo: ${projeto.objetivo}`, { tam: 9.5 });
    if (parcial) doc.paragrafo('Exercício em andamento: valores parciais, até o último lançamento publicado.', { tam: 9, cor: '#8a5a00' });
    doc.y += 4;
    doc.paragrafo('1. Demonstrativo financeiro', { negrito: true, tam: 11.5 });
    tabelaPDF(doc, [{ titulo: 'Item', larg: 3 }, { titulo: 'Valor', tipo: 'moeda' }], [
      [`Saldo inicial (até 31/12/${ano - 1})`, P.saldoAnterior], ['(+) Receitas recebidas no exercício', P.recebido], ['(−) Despesas realizadas no exercício', P.aplicado], ['Resultado do exercício', P.saldoPeriodo],
    ], ['Saldo financeiro final', P.saldoFinal]);
    doc.paragrafo('2. Execução orçamentária', { negrito: true, tam: 11.5 });
    tabelaPDF(doc, [{ titulo: 'Categoria', larg: 2.4 }, { titulo: 'Aprovado', tipo: 'moeda' }, { titulo: 'Realizado', tipo: 'moeda' }, { titulo: 'A executar', tipo: 'moeda' }, { titulo: 'Execução', tipo: 'pct', larg: 0.8 }],
      P.pr.map(x => [x.categoria, x.previsto, x.realizado, x.diferenca, x.execucao]), ['Total', P.orcado, soma(P.pr, x => x.realizado), soma(P.pr, x => x.diferenca), P.execucao]);
    doc.paragrafo('3. Receitas por origem', { negrito: true, tam: 11.5 });
    tabelaPDF(doc, [{ titulo: 'Origem', larg: 3 }, { titulo: 'Lançamentos', tipo: 'int' }, { titulo: 'Valor', tipo: 'moeda' }], P.porOrigem.map(x => [x.rotulo, x.n, x.valor]), ['Total', P.rec.length, P.recebido]);
    doc.paragrafo(projeto ? '4. Despesas por categoria' : '4. Despesas por projeto', { negrito: true, tam: 11.5 });
    tabelaPDF(doc, [{ titulo: projeto ? 'Categoria' : 'Projeto', larg: 3 }, { titulo: 'Pagamentos', tipo: 'int' }, { titulo: 'Valor', tipo: 'moeda' }], (projeto ? P.porCategoria : P.porProjeto).map(x => [x.rotulo, x.n, x.valor]), ['Total', P.des.length, P.aplicado]);
    if (projeto) {
      const r = calc.resumoProjeto(b, projeto);
      doc.paragrafo('5. Execução física — metas', { negrito: true, tam: 11.5 });
      tabelaPDF(doc, [{ titulo: 'Meta', larg: 3 }, { titulo: 'Previsto', tipo: 'int' }, { titulo: 'Realizado', tipo: 'int' }, { titulo: '%', tipo: 'pct' }], r.metas.map(m => [`${m.descricao} (${m.unidade})`, m.meta, m.realizado || 0, m.meta ? (m.realizado || 0) / m.meta : null]));
      doc.paragrafo(`Pessoas beneficiadas: ${fmtNum(r.beneficiarios)} · Famílias: ${fmtNum(r.familias)} · Horas de atividade: ${fmtNum(r.horas)}`);
    }
    doc.paragrafo(`${projeto ? '6' : '5'}. Documentos de referência`, { negrito: true, tam: 11.5 });
    if (P.documentos.length) tabelaPDF(doc, [{ titulo: 'Documento', larg: 3 }, { titulo: 'Categoria', larg: 1.6 }, { titulo: 'Data', tipo: 'data' }], P.documentos.map(d => [d.titulo, d.categoria, d.data]));
    else doc.paragrafo('Nenhum relatório ou parecer publicado para este recorte.', { cor: '#5a6578' });
    doc.y += 6;
    doc.paragrafo('Documento gerado automaticamente a partir dos lançamentos publicados no Portal de Transparência. Os detalhes de cada lançamento estão disponíveis para consulta nas páginas de Receitas e Despesas do portal.', { tam: 8.5, cor: '#5a6578' });
    baixar(doc.blob(rodapePDF()), `${slug(titulo)}-${hojeISO()}.pdf`);
  };

  main.querySelector('#gerar-xlsx').onclick = () => {
    const { ano, projeto, titulo, P } = recorte();
    const notas = [b.demonstracao ? AVISO_EXEMPLO : null, projeto ? `Projeto: ${projeto.nome}` : 'Instituto — todos os projetos', `Gerado em ${new Date().toLocaleString('pt-BR')}`].filter(Boolean);
    const nomeProj = id => id ? calc.nomeProjeto(b, id, '') : calc.SEM_PROJETO_DESPESA;
    const parc = id => b.parceiros.find(p => p.id === id)?.nome || '';
    exportarPlanilha([
      { nome: 'Resumo', titulo, notas, colunas: [{ titulo: 'Item', larg: 44 }, { titulo: 'Valor', tipo: 'moeda', larg: 18 }], linhas: [[`Saldo inicial (até 31/12/${ano - 1})`, P.saldoAnterior], ['Receitas recebidas', P.recebido], ['Despesas realizadas', P.aplicado], ['Resultado do exercício', P.saldoPeriodo], ['Saldo financeiro final', P.saldoFinal], ['Orçamento aprovado', P.orcado]] },
      { nome: 'Execução orçamentária', titulo: 'Execução orçamentária por categoria', colunas: [{ titulo: 'Categoria', larg: 30 }, { titulo: 'Aprovado', tipo: 'moeda' }, { titulo: 'Realizado', tipo: 'moeda' }, { titulo: 'A executar', tipo: 'moeda' }, { titulo: 'Execução', tipo: 'pct', larg: 11 }], linhas: P.pr.map(x => [x.categoria, x.previsto, x.realizado, x.diferenca, x.execucao]), total: ['Total', P.orcado, soma(P.pr, x => x.realizado), soma(P.pr, x => x.diferenca), P.execucao] },
      { nome: 'Receitas', titulo: `Receitas ${ano}`, colunas: [{ titulo: 'Data', tipo: 'data' }, { titulo: 'Origem', larg: 28 }, { titulo: 'Parceiro', larg: 40 }, { titulo: 'Tipo', larg: 20 }, { titulo: 'Projeto', larg: 34 }, { titulo: 'Valor', tipo: 'moeda' }, { titulo: 'Observações', larg: 40 }],
        linhas: [...P.rec].sort((a, c) => a.data.localeCompare(c.data)).map(r => [r.data, r.origem, parc(r.parceiroId), r.tipo, r.projetoId ? nomeProj(r.projetoId) : calc.SEM_PROJETO_RECEITA, r.valor, r.observacoes || '']), total: ['Total', '', '', '', '', P.recebido, ''] },
      { nome: 'Despesas', titulo: `Despesas ${ano}`, colunas: [{ titulo: 'Data', tipo: 'data' }, { titulo: 'Fornecedor', larg: 40 }, { titulo: 'CNPJ/CPF', larg: 20 }, { titulo: 'Descrição', larg: 50 }, { titulo: 'Categoria', larg: 26 }, { titulo: 'Projeto', larg: 34 }, { titulo: 'Pagamento', larg: 20 }, { titulo: 'Valor', tipo: 'moeda' }, { titulo: 'Aprovado por', larg: 28 }],
        linhas: [...P.des].sort((a, c) => a.data.localeCompare(c.data)).map(d => [d.data, d.fornecedor, d.documento, d.descricao, d.categoria, nomeProj(d.projetoId), d.formaPagamento, d.valor, d.aprovador]), total: ['Total', '', '', '', '', '', '', P.aplicado, ''] },
    ], titulo);
  };

  form.addEventListener('change', e => { if (e.target.name) { f[e.target.name] = e.target.value; desenhar(); } });
  form.addEventListener('submit', e => e.preventDefault());
  desenhar();
}
