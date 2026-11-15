// Receitas e origem dos recursos.

import { basePublica, gravarFiltros } from '../app.js';
import * as calc from '../calculo.js';
import { esc, fmtMoeda, fmtMoedaCurta, fmtNum, fmtPct, MESES_LONGOS } from '../util.js';
import { kpi, opcoes, montarTabela, linkDocumento, ligarDocumentos } from '../ui/componentes.js';
import { montarGrafico, linhaDica } from '../ui/graficos.js';
import { COR, rotuloMes } from './inicio.js';
import { ORIGENS, TIPOS_RECEITA } from '../dados/esquema.js';

export async function render(main, rota) {
  const b = basePublica();
  const f = {
    ano: rota.q.has('ano') ? rota.q.get('ano') : String(b.anos[0] || ''),
    mes: rota.q.get('mes') || '', origem: rota.q.get('origem') || '', projeto: rota.q.get('projeto') || '', tipo: rota.q.get('tipo') || '',
  };
  const parceiro = id => b.parceiros.find(p => p.id === id)?.nome || '—';
  const projeto = id => id ? calc.nomeProjeto(b, id, 'Projeto em aprovação') : calc.SEM_PROJETO_RECEITA;

  main.innerHTML = `
    <div class="cab-pagina"><div><div class="trilha-nav"><a href="#/">Início</a> › Receitas</div>
      <h1>Receitas e origem dos recursos</h1>
      <p>Todo recurso recebido pelo Instituto: quem repassou, a que título e para qual projeto ou finalidade.</p></div></div>
    <form class="filtros" id="filtros" aria-label="Filtros das receitas">
      <label>Ano<select name="ano">${opcoes([['', 'Todos'], ...b.anos.map(a => [a, a])], f.ano)}</select></label>
      <label>Mês<select name="mes">${opcoes([['', 'Todos'], ...MESES_LONGOS.map((m, i) => [i + 1, m])], f.mes)}</select></label>
      <label>Origem<select name="origem">${opcoes(ORIGENS, f.origem, 'Todas')}</select></label>
      <label>Tipo<select name="tipo">${opcoes(TIPOS_RECEITA, f.tipo, 'Todos')}</select></label>
      <label>Projeto<select name="projeto">${opcoes([['institucional', calc.SEM_PROJETO_RECEITA], ...b.projetos.map(p => [p.id, p.nome])], f.projeto, 'Todos')}</select></label>
      <label>Pesquisar<input type="search" id="busca-rec" placeholder="Parceiro, observação…"></label>
      <button class="botao limpar" type="button" id="limpar">Limpar filtros</button>
    </form>
    <div id="resultado"></div>`;

  const form = main.querySelector('#filtros');
  const res = main.querySelector('#resultado');
  ligarDocumentos(res, b.documentos);

  const desenhar = () => {
    gravarFiltros(f);
    const ano = f.ano ? Number(f.ano) : null;
    const lista = calc.noPeriodo(b.receitas, { ano, mes: f.mes ? Number(f.mes) : null })
      .filter(r => (!f.origem || r.origem === f.origem) && (!f.tipo || r.tipo === f.tipo) &&
        (!f.projeto || (f.projeto === 'institucional' ? !r.projetoId : r.projetoId === f.projeto)));
    const total = lista.reduce((a, r) => a + r.valor, 0);
    const origens = calc.porChave(lista, 'origem');
    const parceiros = calc.porChave(lista, r => parceiro(r.parceiroId));
    const serie = calc.serieMensal({ ...b, receitas: lista, despesas: [], atendimentos: [] }, ano);
    const cats = serie.chaves.map(k => rotuloMes(k, !ano));
    const textoFiltros = [f.ano ? `ano ${f.ano}` : 'todos os anos', f.mes && MESES_LONGOS[f.mes - 1], f.origem, f.tipo, f.projeto && projeto(f.projeto === 'institucional' ? null : f.projeto)].filter(Boolean).join(' · ');

    res.innerHTML = `
      <div class="kpis">
        ${kpi('Total recebido', fmtMoeda(total), textoFiltros, { destaque: true })}
        ${kpi('Recebimentos', fmtNum(lista.length), lista.length ? `média de ${fmtMoeda(total / lista.length)}` : '')}
        ${kpi('Principal origem', origens[0]?.rotulo || '—', origens[0] ? fmtPct(origens[0].valor / total) + ' do total' : '')}
        ${kpi('Parceiros e doadores', fmtNum(parceiros.length), parceiros[0] ? `maior: ${parceiros[0].rotulo}` : '')}
      </div>
      <div class="grade">
        <section class="cartao m6"><div class="cartao-cab"><div><h3>Por origem do recurso</h3><p>Clique numa barra para filtrar</p></div></div><div id="g-origem"></div></section>
        <section class="cartao m6"><div class="cartao-cab"><div><h3>Recebimentos por mês</h3></div></div><div id="g-mes"></div></section>
      </div>
      <div class="secao-titulo"><h2>Lançamentos</h2></div>
      <div id="tabela"></div>`;

    montarGrafico(res.querySelector('#g-origem'), {
      tipo: 'barras', vazio: origens.length ? null : 'Nenhuma receita com esses filtros.', itens: origens, cor: COR.receita, fmt: fmtMoeda, fmtCurto: fmtMoedaCurta,
      dica: i => `<b>${esc(origens[i].rotulo)}</b>${linhaDica(null, 'Recebido', fmtMoeda(origens[i].valor))}${linhaDica(null, 'Participação', fmtPct(origens[i].valor / total))}${linhaDica(null, 'Lançamentos', fmtNum(origens[i].n))}`,
      aoClicar: i => { f.origem = origens[i].rotulo; form.origem.value = f.origem; desenhar(); },
      tabela: { colunas: ['Origem', 'Recebido', '%'], linhas: origens.map(o => [o.rotulo, fmtMoeda(o.valor), fmtPct(o.valor / total)]) },
    });
    montarGrafico(res.querySelector('#g-mes'), {
      tipo: 'colunas', vazio: lista.length ? null : 'Nenhuma receita com esses filtros.', categorias: cats,
      series: [{ nome: 'Receitas', valores: serie.receitas, cor: COR.receita }], fmtEixo: fmtMoedaCurta,
      dica: i => `<b>${esc(cats[i])}</b>${linhaDica(COR.receita, 'Recebido', fmtMoeda(serie.receitas[i]))}`,
      tabela: { colunas: ['Mês', 'Recebido'], linhas: serie.chaves.map((_, i) => [cats[i], fmtMoeda(serie.receitas[i])]) },
    });
    montarTabela(res.querySelector('#tabela'), {
      linhas: lista, ordem: { k: 'data', dir: 'desc' }, busca: main.querySelector('#busca-rec'),
      colunas: [
        { k: 'data', titulo: 'Data', tipo: 'data' },
        { k: 'origem', titulo: 'Origem' },
        { k: 'parceiro', titulo: 'Parceiro / instituição', valor: r => parceiro(r.parceiroId), larg: 2 },
        { k: 'tipo', titulo: 'Tipo' },
        { k: 'projeto', titulo: 'Projeto / finalidade', valor: r => projeto(r.projetoId), larg: 2 },
        { k: 'valor', titulo: 'Valor', tipo: 'moeda' },
        { k: 'doc', titulo: 'Comprovante', semOrdem: true, valor: r => b.documentos.find(d => d.id === r.documentoId)?.titulo || '', html: r => linkDocumento(r.documentoId, b.documentos) },
        { k: 'observacoes', titulo: 'Observações', html: r => `<span class="pequeno">${esc(r.observacoes || '')}</span>`, larg: 2 },
      ],
      total: ls => ({ valor: ls.reduce((a, r) => a + r.valor, 0) }),
      exportar: { titulo: 'Receitas', subtitulo: 'Receitas e origem dos recursos', filtros: () => textoFiltros },
    });
  };

  form.addEventListener('change', e => { if (e.target.name) { f[e.target.name] = e.target.value; desenhar(); } });
  form.addEventListener('submit', e => e.preventDefault());
  main.querySelector('#limpar').onclick = () => { Object.assign(f, { ano: '', mes: '', origem: '', projeto: '', tipo: '' }); for (const k of ['ano', 'mes', 'origem', 'projeto', 'tipo']) form[k].value = ''; desenhar(); };
  desenhar();
}
