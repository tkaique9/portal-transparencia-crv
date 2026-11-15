// Contratos, convênios, termos de parceria, acordos e aditivos.

import { basePublica, gravarFiltros } from '../app.js';
import * as calc from '../calculo.js';
import { esc, fmtMoeda, fmtNum, fmtData, hojeISO } from '../util.js';
import { kpi, opcoes, montarTabela, ligarDocumentos, seloStatus } from '../ui/componentes.js';
import { TIPOS_CONTRATO, SITUACOES_CONTRATO } from '../dados/esquema.js';

export async function render(main, rota) {
  const b = basePublica();
  const f = { tipo: rota.q.get('tipo') || '', situacao: rota.q.get('situacao') || '', projeto: rota.q.get('projeto') || '' };
  const parte = id => b.parceiros.find(p => p.id === id);
  const pai = c => c.contratoPaiId && b.contratos.find(x => x.id === c.contratoPaiId);
  const aditivos = c => b.contratos.filter(x => x.contratoPaiId === c.id);
  const valorAtualizado = c => c.valor + aditivos(c).reduce((a, x) => a + x.valor, 0);
  const prestacoes = b.documentos.filter(d => d.categoria === 'Prestação de contas');

  main.innerHTML = `
    <div class="cab-pagina"><div><div class="trilha-nav"><a href="#/">Início</a> › Contratos e parcerias</div>
      <h1>Contratos, convênios e parcerias</h1>
      <p>Os instrumentos firmados pelo Instituto com empresas, poder público e organizações — com objeto, valor, vigência, aditivos e o documento assinado para consulta e download.</p></div></div>
    <form class="filtros" id="filtros">
      <label>Tipo<select name="tipo">${opcoes(TIPOS_CONTRATO, f.tipo, 'Todos')}</select></label>
      <label>Situação<select name="situacao">${opcoes(SITUACOES_CONTRATO, f.situacao, 'Todas')}</select></label>
      <label>Projeto<select name="projeto">${opcoes(b.projetos.map(p => [p.id, p.nome]), f.projeto, 'Todos')}</select></label>
      <label>Pesquisar<input type="search" id="busca-con" placeholder="Número, objeto, parceiro…"></label>
    </form>
    <div id="resultado"></div>`;
  const form = main.querySelector('#filtros');
  const res = main.querySelector('#resultado');
  ligarDocumentos(res, b.documentos);

  const desenhar = () => {
    gravarFiltros(f);
    const lista = b.contratos.filter(c => (!f.tipo || c.tipo === f.tipo) && (!f.situacao || c.situacao === f.situacao) && (!f.projeto || c.projetoId === f.projeto));
    const vigentes = b.contratos.filter(c => c.situacao === 'Vigente' && c.tipo !== 'Aditivo contratual');
    const vencendo = vigentes.filter(c => c.fim >= hojeISO() && c.fim <= new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10));
    res.innerHTML = `
      <div class="kpis">
        ${kpi('Instrumentos vigentes', fmtNum(vigentes.length), `${fmtNum(vencendo.length)} vencem nos próximos 90 dias`, { destaque: true })}
        ${kpi('Valor dos vigentes', fmtMoeda(vigentes.reduce((a, c) => a + valorAtualizado(c), 0)), 'Incluindo aditivos')}
        ${kpi('Parceiros com instrumento', fmtNum(new Set(b.contratos.map(c => c.parceiroId)).size), '')}
        ${kpi('Em prestação de contas', fmtNum(b.contratos.filter(c => c.situacao === 'Em prestação de contas').length), `${fmtNum(prestacoes.length)} prestações publicadas`)}
      </div>
      <div id="tabela"></div>
      <div class="secao-titulo"><h2>Prestações de contas de parcerias</h2></div>
      ${prestacoes.length ? `<div class="docs">${prestacoes.map(d => `<div class="doc"><div class="icone-doc">PDF</div><div><h3>${esc(d.titulo)}</h3><div class="meta">${fmtData(d.data)} · ${esc(calc.nomeProjeto(b, d.projetoId, 'Institucional'))}</div><div class="grupo-botoes"><button class="botao pequeno" type="button" data-ver-doc="${esc(d.id)}">Visualizar</button><button class="botao pequeno" type="button" data-baixar-doc="${esc(d.id)}">Baixar</button></div></div></div>`).join('')}</div>` : '<p class="mudo">Nenhuma prestação de contas publicada.</p>'}`;

    montarTabela(res.querySelector('#tabela'), {
      linhas: lista, ordem: { k: 'inicio', dir: 'desc' }, busca: main.querySelector('#busca-con'),
      colunas: [
        { k: 'numero', titulo: 'Número / tipo', html: c => `<b>${esc(c.numero)}</b><span class="sub">${esc(c.tipo)}</span>`, valor: c => `${c.numero} ${c.tipo}`, exportarValor: c => `${c.numero} (${c.tipo})` },
        { k: 'objeto', titulo: 'Objeto', larg: 3, html: c => `${esc(c.objeto)}${pai(c) ? `<span class="sub">Aditivo de ${esc(pai(c).numero)}</span>` : ''}${aditivos(c).length ? `<span class="sub">${aditivos(c).length} aditivo(s)</span>` : ''}` },
        { k: 'parte', titulo: 'Parte / parceiro', larg: 2, valor: c => parte(c.parceiroId)?.nome || '', html: c => `${esc(parte(c.parceiroId)?.nome || '')}<span class="sub">${esc(parte(c.parceiroId)?.documento || '')}</span>` },
        { k: 'projeto', titulo: 'Projeto', larg: 1.6, valor: c => c.projetoId ? calc.nomeProjeto(b, c.projetoId, '') : 'Institucional' },
        { k: 'valor', titulo: 'Valor', tipo: 'moeda', html: c => c.valor ? esc(fmtMoeda(c.valor)) + (aditivos(c).length ? `<span class="sub">atualizado ${esc(fmtMoeda(valorAtualizado(c)))}</span>` : '') : '<span class="mudo">sem repasse</span>' },
        { k: 'inicio', titulo: 'Vigência', valor: c => c.inicio, html: c => `${fmtData(c.inicio)}<span class="sub">até ${fmtData(c.fim)}</span>`, exportarValor: c => `${fmtData(c.inicio)} a ${fmtData(c.fim)}` },
        { k: 'situacao', titulo: 'Situação', html: c => seloStatus(c.situacao) },
        { k: 'doc', titulo: 'Documento', semOrdem: true, valor: c => b.documentos.find(d => d.id === c.documentoId)?.titulo || '', html: c => c.documentoId && b.documentos.some(d => d.id === c.documentoId) ? `<div class="grupo-botoes"><button class="botao pequeno" type="button" data-ver-doc="${esc(c.documentoId)}">Ver</button><button class="botao pequeno" type="button" data-baixar-doc="${esc(c.documentoId)}" aria-label="Baixar PDF de ${esc(c.numero)}">PDF</button></div>` : '<span class="mudo">—</span>', exportar: false },
      ],
      total: ls => ({ valor: ls.reduce((a, c) => a + c.valor, 0) }),
      exportar: { titulo: 'Contratos e parcerias', filtros: () => [f.tipo, f.situacao, f.projeto && calc.nomeProjeto(b, f.projeto, '')].filter(Boolean).join(' · ') },
    });
  };
  form.addEventListener('change', e => { if (e.target.name) { f[e.target.name] = e.target.value; desenhar(); } });
  form.addEventListener('submit', e => e.preventDefault());
  desenhar();
}
