// Exportação das tabelas do portal para PDF e Excel.
// As telas descrevem a tabela uma vez (colunas com tipo, linhas com valor
// cru) e este módulo formata para cada saída: no PDF, texto formatado; no
// Excel, número continua número para a planilha somar.

import { criarPDF } from './pdf.js';
import { criarXLSX, TIPO_XLSX } from './xlsx.js';
import { fmtMoeda, fmtData, fmtNum, fmtPct, baixar, slug, hojeISO } from '../util.js';

export const AVISO_EXEMPLO = 'DADOS DE EXEMPLO — informações fictícias, criadas só para demonstrar o portal.';

const formatar = (v, tipo) => v === null || v === undefined || v === '' ? '' :
  tipo === 'moeda' ? fmtMoeda(v) : tipo === 'data' ? fmtData(v) : tipo === 'int' ? fmtNum(v) : tipo === 'pct' ? fmtPct(v) : String(v);

/** Cabeçalho institucional de cada página do PDF. */
export function iniciarPDF({ titulo, subtitulo = '', demonstracao = false, paisagem = false }) {
  const doc = criarPDF({ titulo, paisagem });
  doc.cabecalho(d => {
    const M = d.margem;
    d.retangulo(0, 0, d.largura, 54, { preencher: '#14325c' });
    d.texto(M, 14, 'INSTITUTO CRV', { tam: 12, negrito: true, cor: '#ffffff' });
    d.texto(M, 31, 'Portal de Transparência', { tam: 9, cor: '#c9d8ef' });
    d.texto(M, 20, titulo, { tam: 9, cor: '#ffffff', alinhar: 'dir', larg: d.larguraUtil, negrito: true });
    if (subtitulo) d.texto(M, 33, subtitulo, { tam: 8, cor: '#c9d8ef', alinhar: 'dir', larg: d.larguraUtil });
    d.y = 66;
    if (demonstracao) {
      d.retangulo(M, d.y, d.larguraUtil, 18, { preencher: '#fff4d6', contorno: '#d9a400' });
      d.texto(M, d.y + 4.5, AVISO_EXEMPLO, { tam: 8, negrito: true, cor: '#6b4e00', alinhar: 'centro', larg: d.larguraUtil });
      d.y += 28;
    }
  });
  doc.novaPagina();
  return doc;
}

export function rodapePDF() {
  const gerado = new Date().toLocaleString('pt-BR');
  return (i, t) => [`Gerado em ${gerado} pelo Portal de Transparência do Instituto CRV`, `Página ${i} de ${t}`];
}

/** Escreve uma tabela descrita por colunas tipadas no PDF. */
export function tabelaPDF(doc, colunas, linhas, total = null, opcoes = {}) {
  doc.tabela(
    colunas.map(c => ({ titulo: c.titulo, larg: c.largPdf || c.larg || 1, alinhar: c.alinhar || (['moeda', 'int', 'pct'].includes(c.tipo) ? 'dir' : 'esq') })),
    linhas.map(l => l.map((v, i) => formatar(v, colunas[i].tipo))),
    { total: total ? total.map((v, i) => formatar(v, colunas[i].tipo)) : null, ...opcoes },
  );
}

/**
 * Exporta uma tabela simples.
 * tabela: { titulo, subtitulo?, filtros?: texto, colunas: [{titulo, tipo}], linhas: [[valor]], total? }
 */
export function exportarTabela(tabela, formato, { demonstracao = false } = {}) {
  const nome = `${slug(tabela.titulo)}-${hojeISO()}`;
  if (formato === 'pdf') {
    const doc = iniciarPDF({ titulo: tabela.titulo, subtitulo: tabela.subtitulo, demonstracao, paisagem: tabela.colunas.length > 6 });
    if (tabela.filtros) doc.paragrafo(`Filtros aplicados: ${tabela.filtros}`, { tam: 8.5, cor: '#5a6578' });
    doc.paragrafo(`${fmtNum(tabela.linhas.length)} registro(s).`, { tam: 8.5, cor: '#5a6578' });
    doc.y += 4;
    tabelaPDF(doc, tabela.colunas, tabela.linhas, tabela.total);
    baixar(doc.blob(rodapePDF()), nome + '.pdf');
  } else {
    const notas = [demonstracao ? AVISO_EXEMPLO : null, tabela.subtitulo, tabela.filtros ? `Filtros: ${tabela.filtros}` : null, `Gerado em ${new Date().toLocaleString('pt-BR')}`].filter(Boolean);
    const b = criarXLSX([{ nome: tabela.titulo, titulo: `Instituto CRV — ${tabela.titulo}`, notas, colunas: tabela.colunas, linhas: tabela.linhas, total: tabela.total }]);
    baixar(new Blob([b], { type: TIPO_XLSX }), nome + '.xlsx');
  }
}

export function exportarPlanilha(abas, nomeArquivo) {
  baixar(new Blob([criarXLSX(abas)], { type: TIPO_XLSX }), `${slug(nomeArquivo)}-${hojeISO()}.xlsx`);
}
