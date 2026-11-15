// Despesas e aplicação dos recursos.

import { basePublica, gravarFiltros } from '../app.js';
import * as calc from '../calculo.js';
import { esc, fmtMoeda, fmtMoedaCurta, fmtNum, fmtPct, MESES_LONGOS } from '../util.js';
import { kpi, opcoes, montarTabela, linkDocumento, ligarDocumentos } from '../ui/componentes.js';
import { montarGrafico, topN, linhaDica } from '../ui/graficos.js';
import { COR } from './inicio.js';
import { CATEGORIAS_DESPESA, FORMAS_PAGAMENTO } from '../dados/esquema.js';

const COR_PREVISTO = 'var(--s7)';

export async function render(main, rota) {
  const b = basePublica();
  const f = {
    ano: rota.q.has('ano') ? rota.q.get('ano') : String(b.anos[0] || ''),
    mes: rota.q.get('mes') || '', categoria: rota.q.get('categoria') || '', projeto: rota.q.get('projeto') || '', forma: rota.q.get('forma') || '',
  };
  const projeto = id => id ? calc.nomeProjeto(b, id, 'Projeto em aprovação') : calc.SEM_PROJETO_DESPESA;

  main.innerHTML = `
    <div class="cab-pagina"><div><div class="trilha-nav"><a href="#/">Início</a> › Despesas</div>
      <h1>Despesas e aplicação dos recursos</h1>
      <p>Cada pagamento feito: a quem, para quê, em qual projeto, como foi pago e quem aprovou. CPF de pessoas físicas aparece parcialmente mascarado (LGPD).</p></div></div>
    <form class="filtros" id="filtros" aria-label="Filtros das despesas">
      <label>Ano<select name="ano">${opcoes([['', 'Todos'], ...b.anos.map(a => [a, a])], f.ano)}</select></label>
      <label>Mês<select name="mes">${opcoes([['', 'Todos'], ...MESES_LONGOS.map((m, i) => [i + 1, m])], f.mes)}</select></label>
      <label>Categoria<select name="categoria">${opcoes(CATEGORIAS_DESPESA, f.categoria, 'Todas')}</select></label>
      <label>Projeto<select name="projeto">${opcoes([['institucional', calc.SEM_PROJETO_DESPESA], ...b.projetos.map(p => [p.id, p.nome])], f.projeto, 'Todos')}</select></label>
      <label>Pagamento<select name="forma">${opcoes(FORMAS_PAGAMENTO, f.forma, 'Todos')}</select></label>
      <label>Pesquisar<input type="search" id="busca-des" placeholder="Fornecedor, descrição, CNPJ…"></label>
      <button class="botao limpar" type="button" id="limpar">Limpar filtros</button>
    </form>
    <div id="resultado"></div>`;

  const form = main.querySelector('#filtros');
  const res = main.querySelector('#resultado');
  ligarDocumentos(res, b.documentos);

  const desenhar = () => {
    gravarFiltros(f);
    const ano = f.ano ? Number(f.ano) : null;
    const filtroProj = r => !f.projeto || (f.projeto === 'institucional' ? !r.projetoId : r.projetoId === f.projeto);
    const lista = calc.noPeriodo(b.despesas, { ano, mes: f.mes ? Number(f.mes) : null })
      .filter(d => (!f.categoria || d.categoria === f.categoria) && (!f.forma || d.formaPagamento === f.forma) && filtroProj(d));
    const total = lista.reduce((a, d) => a + d.valor, 0);
    const porCat = calc.porChave(lista, 'categoria');
    const porProj = topN(calc.porChave(lista, d => projeto(d.projetoId)), 8);
    const porForn = topN(calc.porChave(lista, 'fornecedor'), 10);
    // previsto × realizado respeita ano e projeto (o orçamento não é mensal)
    const projetoOrc = !f.projeto ? undefined : f.projeto === 'institucional' ? null : f.projeto;
    const pr = calc.previstoRealizado(b, ano, projetoOrc).filter(x => !f.categoria || x.categoria === f.categoria);
    const previsto = pr.reduce((a, x) => a + x.previsto, 0);
    const realizadoOrc = pr.reduce((a, x) => a + x.realizado, 0);
    const textoFiltros = [f.ano ? `ano ${f.ano}` : 'todos os anos', f.mes && MESES_LONGOS[f.mes - 1], f.categoria, f.projeto && projeto(f.projeto === 'institucional' ? null : f.projeto), f.forma].filter(Boolean).join(' · ');

    res.innerHTML = `
      <div class="kpis">
        ${kpi('Total gasto', fmtMoeda(total), textoFiltros, { destaque: true, cor: 'var(--s2)' })}
        ${kpi('Pagamentos', fmtNum(lista.length), lista.length ? `média de ${fmtMoeda(total / lista.length)}` : '', { cor: 'var(--s2)' })}
        ${kpi('Orçamento aprovado', previsto ? fmtMoeda(previsto) : '—', f.mes ? 'Orçamento anual — o mês não se aplica' : 'Para o mesmo ano e projeto', { cor: 'var(--s7)' })}
        ${kpi('Execução do orçamento', previsto ? fmtPct(realizadoOrc / previsto) : '—', previsto ? `${fmtMoeda(previsto - realizadoOrc)} a executar` : '', { cor: 'var(--s7)', medidor: previsto ? realizadoOrc / previsto : 0 })}
      </div>
      <div class="grade">
        <section class="cartao m6"><div class="cartao-cab"><div><h3>Despesas por categoria</h3><p>Clique numa barra para filtrar</p></div></div><div id="g-cat"></div></section>
        <section class="cartao m6"><div class="cartao-cab"><div><h3>Despesas por projeto</h3></div></div><div id="g-proj"></div></section>
        <section class="cartao m6"><div class="cartao-cab"><div><h3>Maiores fornecedores</h3><p>Quem mais recebeu no período</p></div></div><div id="g-forn"></div></section>
        <section class="cartao m6"><div class="cartao-cab"><div><h3>Orçamento previsto × realizado</h3><p>Por categoria${ano ? `, exercício ${ano}` : ', todos os exercícios'} · % = execução</p></div></div><div id="g-pr"></div></section>
      </div>
      <div class="secao-titulo"><h2>Pagamentos</h2></div>
      <div id="tabela"></div>`;

    const barra = (sel, itens, titulo, aoClicar) => montarGrafico(res.querySelector(sel), {
      tipo: 'barras', vazio: itens.length ? null : 'Nenhuma despesa com esses filtros.', itens, cor: COR.despesa, fmt: fmtMoeda, fmtCurto: fmtMoedaCurta,
      dica: i => `<b>${esc(itens[i].rotulo)}</b>${linhaDica(null, 'Pago', fmtMoeda(itens[i].valor))}${linhaDica(null, 'Participação', fmtPct(itens[i].valor / total))}${itens[i].n ? linhaDica(null, 'Pagamentos', fmtNum(itens[i].n)) : ''}`,
      aoClicar, tabela: { colunas: [titulo, 'Pago', '%'], linhas: itens.map(o => [o.rotulo, fmtMoeda(o.valor), fmtPct(o.valor / total)]) },
    });
    barra('#g-cat', porCat, 'Categoria', i => { f.categoria = porCat[i].rotulo; form.categoria.value = f.categoria; desenhar(); });
    barra('#g-proj', porProj, 'Projeto', i => {
      const p = b.projetos.find(x => x.nome === porProj[i].rotulo);
      f.projeto = p ? p.id : porProj[i].rotulo === calc.SEM_PROJETO_DESPESA ? 'institucional' : f.projeto;
      form.projeto.value = f.projeto; desenhar();
    });
    barra('#g-forn', porForn, 'Fornecedor');
    montarGrafico(res.querySelector('#g-pr'), {
      tipo: 'colunas', vazio: pr.length ? null : 'Sem orçamento cadastrado para esse recorte.', categorias: pr.map(x => x.categoria.split(' ')[0]),
      series: [{ nome: 'Previsto', valores: pr.map(x => x.previsto), cor: COR_PREVISTO }, { nome: 'Realizado', valores: pr.map(x => x.realizado), cor: COR.despesa }],
      legenda: [{ nome: 'Previsto (orçamento aprovado)', cor: COR_PREVISTO }, { nome: 'Realizado', cor: COR.despesa }],
      fmtEixo: fmtMoedaCurta, rotuloGrupo: i => pr[i].execucao === null ? '' : fmtPct(pr[i].execucao, 0),
      dica: i => `<b>${esc(pr[i].categoria)}</b>${linhaDica(COR_PREVISTO, 'Previsto', fmtMoeda(pr[i].previsto))}${linhaDica(COR.despesa, 'Realizado', fmtMoeda(pr[i].realizado))}${linhaDica(null, 'Execução', pr[i].execucao === null ? '—' : fmtPct(pr[i].execucao))}`,
      tabela: { colunas: ['Categoria', 'Previsto', 'Realizado', 'Execução'], linhas: pr.map(x => [x.categoria, fmtMoeda(x.previsto), fmtMoeda(x.realizado), x.execucao === null ? '—' : fmtPct(x.execucao)]) },
    });
    montarTabela(res.querySelector('#tabela'), {
      linhas: lista, ordem: { k: 'data', dir: 'desc' }, busca: main.querySelector('#busca-des'),
      colunas: [
        { k: 'data', titulo: 'Data', tipo: 'data' },
        { k: 'fornecedor', titulo: 'Fornecedor / beneficiário', larg: 2, valor: r => `${r.fornecedor} ${r.documento}`, html: r => `${esc(r.fornecedor)}<span class="sub">${esc(r.documento || 'lançamento agregado')}</span>`, exportarValor: r => r.documento ? `${r.fornecedor} — ${r.documento}` : r.fornecedor },
        { k: 'descricao', titulo: 'Descrição', larg: 2.4 },
        { k: 'categoria', titulo: 'Categoria' },
        { k: 'projeto', titulo: 'Projeto', valor: r => projeto(r.projetoId), larg: 1.6 },
        { k: 'formaPagamento', titulo: 'Pagamento' },
        { k: 'valor', titulo: 'Valor', tipo: 'moeda' },
        { k: 'aprovador', titulo: 'Aprovado por' },
        { k: 'nf', titulo: 'NF / comprovante', semOrdem: true, valor: r => b.documentos.find(d => d.id === r.comprovanteId)?.titulo || '', html: r => linkDocumento(r.comprovanteId, b.documentos) },
      ],
      total: ls => ({ valor: ls.reduce((a, d) => a + d.valor, 0) }),
      exportar: { titulo: 'Despesas', subtitulo: 'Despesas e aplicação dos recursos', filtros: () => textoFiltros },
    });
  };

  form.addEventListener('change', e => { if (e.target.name) { f[e.target.name] = e.target.value; desenhar(); } });
  form.addEventListener('submit', e => e.preventDefault());
  main.querySelector('#limpar').onclick = () => { for (const k of Object.keys(f)) { f[k] = ''; form[k].value = ''; } desenhar(); };
  desenhar();
}
