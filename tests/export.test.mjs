// Geradores de PDF e Excel: estrutura válida e conteúdo legível.
// Rodar: npm test   (para conferir num leitor externo: GRAVAR=1 npm test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { criarPDF, larguraTexto } from '../public/js/export/pdf.js';
import { criarXLSX, crc32 } from '../public/js/export/xlsx.js';

const latin1 = b => Buffer.from(b).toString('latin1');

test('PDF: estrutura, xref e acentuação em WinAnsi', () => {
  const doc = criarPDF({ titulo: 'Prestação de contas' }).novaPagina();
  doc.titulo('Prestação de contas — exercício 2026');
  doc.paragrafo('Recursos aplicados em educação, saúde e geração de renda (ação nº 1).');
  const linhas = Array.from({ length: 120 }, (_, i) => [`Item ${i + 1}`, 'Descrição com acentuação: ção', 'R$ 1.234,56']);
  doc.tabela([{ titulo: 'Item' }, { titulo: 'Descrição', larg: 3 }, { titulo: 'Valor', alinhar: 'dir' }], linhas, { total: ['Total', '', 'R$ 148.147,20'] });
  const b = doc.bytes();
  const s = latin1(b);
  assert.ok(s.startsWith('%PDF-1.4'));
  assert.ok(s.trimEnd().endsWith('%%EOF'));
  assert.ok(doc.pagina >= 3, 'a tabela de 120 linhas quebra em várias páginas');
  // xref aponta exatamente para o início de cada objeto
  const xref = Number(s.match(/startxref\n(\d+)/)[1]);
  assert.equal(s.slice(xref, xref + 4), 'xref');
  const offs = s.slice(xref).split('\n').slice(3).filter(l => / 00000 n $/.test(l)).map(l => Number(l.slice(0, 10)));
  offs.forEach((o, i) => assert.equal(s.slice(o, o + String(i + 1).length + 6), `${i + 1} 0 obj`));
  // "ção" em WinAnsi: ç = E7, ã = E3
  assert.ok(s.includes('Presta\xE7\xE3o'));
  // parênteses escapados
  assert.ok(s.includes('\\(a\xE7\xE3o n\xBA 1\\)'));
  if (process.env.GRAVAR) fs.writeFileSync('tests/saida-teste.pdf', b);
});

test('PDF: largura de texto segue a métrica da Helvetica', () => {
  assert.equal(larguraTexto('0', 10), 5.56);
  assert.ok(larguraTexto('W', 10, true) > larguraTexto('i', 10, true));
});

test('XLSX: ZIP válido, números numéricos e texto escapado', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xCBF43926);
  const b = criarXLSX([{
    nome: 'Receitas', titulo: 'Receitas 2026', notas: ['Dados de exemplo'],
    colunas: [{ titulo: 'Data', tipo: 'data' }, { titulo: 'Origem' }, { titulo: 'Valor', tipo: 'moeda' }],
    linhas: [['2026-01-15', 'Doação <PJ> & "parceiro"', 1500.5], ['2026-02-01', 'Convênio', 20000]],
    total: ['Total', '', 21500.5],
  }, { nome: 'Aba/com:caracteres*proibidos?', colunas: [{ titulo: 'A' }], linhas: [] }]);
  const s = latin1(b);
  assert.equal(b[0], 0x50); assert.equal(b[1], 0x4B); // PK
  assert.ok(s.includes('xl/worksheets/sheet2.xml'));
  assert.ok(s.includes('<v>1500.5</v>'), 'valor fica numérico');
  assert.ok(s.includes('&lt;PJ&gt; &amp; &quot;parceiro&quot;'));
  assert.ok(s.includes('<v>46037</v>'), '15/01/2026 vira série 46037');
  assert.ok(!s.includes('Aba/com'), 'nome de aba saneado');
  if (process.env.GRAVAR) fs.writeFileSync('tests/saida-teste.xlsx', b);
});
