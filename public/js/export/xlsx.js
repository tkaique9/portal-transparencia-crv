// Gerador de planilha Excel (.xlsx) sem dependência externa.
//
// Um .xlsx é um ZIP de arquivos XML. Este módulo monta o XML mínimo
// (pastas de trabalho com várias abas, cabeçalho em negrito, moeda e
// percentual com formato numérico de verdade — a planilha soma) e empacota
// num ZIP sem compressão. Funciona no navegador e no Node.

const enc = new TextEncoder();

// ------------------------------------------------------------ ZIP (store)

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
export function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = TABELA_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

export function zip(arquivos) {
  const partes = [];
  const central = [];
  let pos = 0;
  const agora = new Date();
  const hora = (agora.getHours() << 11) | (agora.getMinutes() << 5) | (agora.getSeconds() >> 1);
  const dia = ((agora.getFullYear() - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate();
  for (const { nome, dados } of arquivos) {
    const n = enc.encode(nome);
    const crc = crc32(dados);
    const cab = new DataView(new ArrayBuffer(30));
    cab.setUint32(0, 0x04034b50, true); cab.setUint16(4, 20, true); cab.setUint16(6, 0x0800, true);
    cab.setUint16(8, 0, true); cab.setUint16(10, hora, true); cab.setUint16(12, dia, true);
    cab.setUint32(14, crc, true); cab.setUint32(18, dados.length, true); cab.setUint32(22, dados.length, true);
    cab.setUint16(26, n.length, true); cab.setUint16(28, 0, true);
    partes.push(new Uint8Array(cab.buffer), n, dados);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true); c.setUint16(12, hora, true); c.setUint16(14, dia, true);
    c.setUint32(16, crc, true); c.setUint32(20, dados.length, true); c.setUint32(24, dados.length, true);
    c.setUint16(28, n.length, true); c.setUint32(42, pos, true);
    central.push(new Uint8Array(c.buffer), n);
    pos += 30 + n.length + dados.length;
  }
  const tamCentral = central.reduce((a, b) => a + b.length, 0);
  const fimc = new DataView(new ArrayBuffer(22));
  fimc.setUint32(0, 0x06054b50, true); fimc.setUint16(8, arquivos.length, true); fimc.setUint16(10, arquivos.length, true);
  fimc.setUint32(12, tamCentral, true); fimc.setUint32(16, pos, true);
  const todas = [...partes, ...central, new Uint8Array(fimc.buffer)];
  const out = new Uint8Array(todas.reduce((a, b) => a + b.length, 0));
  let o = 0; for (const p of todas) { out.set(p, o); o += p.length; }
  return out;
}

// ------------------------------------------------------------ planilha

const x = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // caracteres de controle são proibidos em XML
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

function coluna(i) { let s = ''; i++; while (i) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; }

// Estilos: 0 normal · 1 cabeçalho · 2 moeda · 3 percentual · 4 título · 5 total moeda · 6 total texto · 7 inteiro · 8 data
const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="4"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="13"/><color rgb="FF14325C"/><name val="Calibri"/></font><font><b/><sz val="10"/><name val="Calibri"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF14325C"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7EDF8"/></patternFill></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf/></cellStyleXfs>
<cellXfs count="9">
<xf/>
<xf fontId="1" fillId="2" applyFont="1" applyFill="1"><alignment wrapText="1" vertical="center"/></xf>
<xf numFmtId="164" applyNumberFormat="1"/>
<xf numFmtId="10" applyNumberFormat="1"/>
<xf fontId="2" applyFont="1"/>
<xf numFmtId="164" fontId="3" fillId="3" applyNumberFormat="1" applyFont="1" applyFill="1"/>
<xf fontId="3" fillId="3" applyFont="1" applyFill="1"/>
<xf numFmtId="3" applyNumberFormat="1"/>
<xf numFmtId="165" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const ESTILO_TIPO = { moeda: 2, pct: 3, int: 7, data: 8 };

/** '2026-03-15' → número de série do Excel. */
function serieData(iso) {
  const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
}

function celula(ref, v, tipo, estilo) {
  if (v === null || v === undefined || v === '') return '';
  if (tipo === 'data' && /^\d{4}-\d{2}-\d{2}/.test(v)) return `<c r="${ref}" s="${estilo ?? 8}"><v>${serieData(v)}</v></c>`;
  if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${estilo ? ` s="${estilo}"` : ''}><v>${v}</v></c>`;
  return `<c r="${ref}" t="inlineStr"${estilo ? ` s="${estilo}"` : ''}><is><t xml:space="preserve">${x(v)}</t></is></c>`;
}

/**
 * abas: [{nome, titulo?, notas?: [texto], colunas: [{titulo, tipo?, larg?}], linhas: [[valor]], total?: [valor]}]
 * tipo: texto (padrão) | moeda | pct | int | data. Valores numéricos ficam numéricos.
 */
export function criarXLSX(abas) {
  const arquivos = [];
  const folhas = abas.map((aba, i) => {
    const rows = [];
    let r = 1;
    if (aba.titulo) { rows.push(`<row r="${r}">${celula('A' + r, aba.titulo, 'texto', 4)}</row>`); r++; }
    for (const nota of aba.notas || []) { rows.push(`<row r="${r}">${celula('A' + r, nota)}</row>`); r++; }
    if (aba.titulo || aba.notas?.length) r++;
    const linhaCab = r;
    rows.push(`<row r="${r}">${aba.colunas.map((c, j) => celula(coluna(j) + r, c.titulo, 'texto', 1)).join('')}</row>`); r++;
    for (const lin of aba.linhas) {
      rows.push(`<row r="${r}">${lin.map((v, j) => celula(coluna(j) + r, v, aba.colunas[j]?.tipo, ESTILO_TIPO[aba.colunas[j]?.tipo])).join('')}</row>`); r++;
    }
    if (aba.total) {
      rows.push(`<row r="${r}">${aba.total.map((v, j) => celula(coluna(j) + r, v, aba.colunas[j]?.tipo, typeof v === 'number' ? (aba.colunas[j]?.tipo === 'moeda' ? 5 : 6) : 6)).join('')}</row>`); r++;
    }
    const cols = aba.colunas.map((c, j) => `<col min="${j + 1}" max="${j + 1}" width="${c.larg || (c.tipo === 'moeda' ? 16 : c.tipo === 'data' ? 12 : 22)}" customWidth="1"/>`).join('');
    const ultima = coluna(aba.colunas.length - 1);
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="${linhaCab}" topLeftCell="A${linhaCab + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${cols}</cols><sheetData>${rows.join('')}</sheetData>
${aba.linhas.length ? `<autoFilter ref="A${linhaCab}:${ultima}${linhaCab + aba.linhas.length}"/>` : ''}
</worksheet>`;
    arquivos.push({ nome: `xl/worksheets/sheet${i + 1}.xml`, dados: enc.encode(xml) });
    // nomes de aba: até 31 caracteres, sem []:*?/\
    const nome = String(aba.nome).replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || `Aba ${i + 1}`;
    return { nome, linhaCab, ultima, n: aba.linhas.length };
  });

  const defNomes = folhas.map((f, i) => f.n ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${x(f.nome).replace(/'/g, "''")}'!$A$${f.linhaCab}:$${f.ultima}$${f.linhaCab + f.n}</definedName>` : '').join('');
  const fixos = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${folhas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`],
    ['docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Portal de Transparência — Instituto CRV</dc:title><dc:creator>Portal de Transparência CRV</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${folhas.map((f, i) => `<sheet name="${x(f.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${defNomes ? `<definedNames>${defNomes}</definedNames>` : ''}</workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${folhas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${folhas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', ESTILOS],
  ].map(([nome, s]) => ({ nome, dados: enc.encode(s) }));

  return zip([...fixos, ...arquivos]);
}

export const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
