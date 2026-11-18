// Gerador de PDF sem dependência externa.
//
// Escreve PDF 1.4 com as fontes padrão Helvetica (não embute fonte), em
// WinAnsiEncoding — cobre todo o português. Faz o que os relatórios do portal
// precisam: título, parágrafos com quebra de linha, tabelas com quebra de
// página e cabeçalho repetido, retângulos e rodapé "página X de Y".
// Funciona no navegador e no Node (usado nos testes).

// Larguras das glifos da Helvetica (AFM padrão), em milésimos de em, ASCII 32–126.
const LARG = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const LARG_N = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

export function larguraTexto(s, tam, negrito = false) {
  const t = negrito ? LARG_N : LARG;
  let w = 0;
  for (const ch of String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')) {
    const c = ch.charCodeAt(0);
    w += c >= 32 && c <= 126 ? t[c - 32] : 556;
  }
  return w * tam / 1000;
}

/** Texto → bytes WinAnsi (latin1 + aspas tipográficas), escapado para PDF. */
function codificar(s) {
  const extra = { '−': 0x2D, '—': 0x97, '–': 0x96, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '€': 0x80, '…': 0x85 };
  let out = '';
  for (const ch of String(s)) {
    let c = ch.charCodeAt(0);
    if (extra[ch]) c = extra[ch];
    else if (ch === ' ' || ch === ' ') c = 32;
    else if (c > 255) c = 63; // '?'
    const b = String.fromCharCode(c);
    out += b === '(' || b === ')' || b === '\\' ? '\\' + b : b;
  }
  return out;
}

const n = v => (Math.round(v * 100) / 100).toString();
function cor(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => n(parseInt(h.slice(i, i + 2), 16) / 255)).join(' ');
}

export const A4 = { larg: 595.28, alt: 841.89 };

export function criarPDF({ titulo = 'Documento', autor = 'Instituto CRV', paisagem = false } = {}) {
  const L = paisagem ? A4.alt : A4.larg;
  const H = paisagem ? A4.larg : A4.alt;
  const M = 42; // margem
  const paginas = [];
  let pg = null;
  let y = 0;
  let aoNovaPagina = null;

  const doc = {
    largura: L, altura: H, margem: M,
    get y() { return y; }, set y(v) { y = v; },
    get pagina() { return paginas.length; },
    larguraUtil: L - 2 * M,

    novaPagina() {
      pg = []; paginas.push(pg); y = M;
      if (aoNovaPagina) aoNovaPagina(doc);
      return doc;
    },
    /** Função chamada no topo de cada página nova (cabeçalho fixo). */
    cabecalho(f) { aoNovaPagina = f; return doc; },

    /** Garante espaço; se não couber, abre página nova. */
    espaco(h) { if (y + h > H - M - 18) doc.novaPagina(); return doc; },

    texto(x, yy, s, { tam = 10, negrito = false, cor: c = '#1a2333', alinhar = 'esq', larg = null } = {}) {
      let xx = x;
      if (alinhar !== 'esq') {
        const w = larguraTexto(s, tam, negrito);
        xx = alinhar === 'dir' ? x + (larg ?? 0) - w : x + ((larg ?? 0) - w) / 2;
      }
      pg.push(`BT /${negrito ? 'F2' : 'F1'} ${n(tam)} Tf ${cor(c)} rg ${n(xx)} ${n(H - yy - tam)} Td (${codificar(s)}) Tj ET`);
      return doc;
    },
    retangulo(x, yy, w, h, { preencher = null, contorno = null, espessura = 0.5 } = {}) {
      const partes = [];
      if (preencher) partes.push(`${cor(preencher)} rg`);
      if (contorno) partes.push(`${cor(contorno)} RG ${n(espessura)} w`);
      partes.push(`${n(x)} ${n(H - yy - h)} ${n(w)} ${n(h)} re ${preencher && contorno ? 'B' : preencher ? 'f' : 'S'}`);
      pg.push(partes.join(' '));
      return doc;
    },
    linha(x1, y1, x2, y2, { cor: c = '#c9d1dc', espessura = 0.5 } = {}) {
      pg.push(`${cor(c)} RG ${n(espessura)} w ${n(x1)} ${n(H - y1)} m ${n(x2)} ${n(H - y2)} l S`);
      return doc;
    },

    /** Quebra o texto em linhas que cabem em `larg`. */
    quebrar(s, larg, tam = 10, negrito = false) {
      const linhas = [];
      for (const par of String(s ?? '').split('\n')) {
        let atual = '';
        for (const p of par.split(/\s+/).filter(Boolean)) {
          const t = atual ? atual + ' ' + p : p;
          if (larguraTexto(t, tam, negrito) <= larg || !atual) atual = t;
          else { linhas.push(atual); atual = p; }
        }
        linhas.push(atual);
      }
      // palavra maior que a largura: corta com reticências
      return linhas.map(l => {
        if (larguraTexto(l, tam, negrito) <= larg) return l;
        let c = l; while (c.length > 1 && larguraTexto(c + '…', tam, negrito) > larg) c = c.slice(0, -1);
        return c + '…';
      });
    },

    paragrafo(s, { tam = 10, negrito = false, cor: c = '#1a2333', entre = 1.4, x = M, larg = L - 2 * M } = {}) {
      for (const l of doc.quebrar(s, larg, tam, negrito)) {
        doc.espaco(tam * entre);
        doc.texto(x, y, l, { tam, negrito, cor: c });
        y += tam * entre;
      }
      return doc;
    },

    titulo(s, tam = 15) {
      doc.espaco(tam * 2.2);
      doc.texto(M, y, s, { tam, negrito: true, cor: '#00257D' });
      y += tam * 1.5;
      doc.linha(M, y, L - M, y, { cor: '#0051BF', espessura: 1 });
      y += 8;
      return doc;
    },

    /**
     * Tabela. colunas: [{titulo, larg (fração), alinhar}]; linhas: arrays de
     * texto já formatado. `total` vira a última linha, em negrito.
     */
    tabela(colunas, linhas, { tam = 8.5, total = null, zebra = true } = {}) {
      const W = L - 2 * M;
      const somaFr = colunas.reduce((a, c) => a + (c.larg || 1), 0);
      const ws = colunas.map(c => W * (c.larg || 1) / somaFr);
      const xs = ws.map((_, i) => M + ws.slice(0, i).reduce((a, b) => a + b, 0));
      const pad = 4;
      const alturaLinha = tam * 1.25;

      const cab = () => {
        const linhasCab = colunas.map((c, i) => doc.quebrar(c.titulo, ws[i] - 2 * pad, tam, true));
        const h = Math.max(...linhasCab.map(l => l.length)) * alturaLinha + 2 * pad;
        doc.espaco(h + alturaLinha);
        doc.retangulo(M, y, W, h, { preencher: '#14325c' });
        linhasCab.forEach((ls, i) => ls.forEach((l, j) => doc.texto(xs[i] + pad, y + pad + j * alturaLinha, l, { tam, negrito: true, cor: '#ffffff', alinhar: colunas[i].alinhar || 'esq', larg: ws[i] - 2 * pad })));
        y += h;
      };
      cab();
      const todas = total ? [...linhas, total] : linhas;
      todas.forEach((lin, k) => {
        const negrito = total && k === todas.length - 1;
        const cel = lin.map((v, i) => doc.quebrar(v ?? '', ws[i] - 2 * pad, tam, negrito));
        const h = Math.max(1, ...cel.map(c => c.length)) * alturaLinha + 2 * pad - 2;
        if (y + h > H - M - 18) { doc.novaPagina(); cab(); }
        if (negrito) doc.retangulo(M, y, W, h, { preencher: '#e7edf8' });
        else if (zebra && k % 2) doc.retangulo(M, y, W, h, { preencher: '#f4f6fa' });
        cel.forEach((ls, i) => ls.forEach((l, j) => doc.texto(xs[i] + pad, y + pad - 1 + j * alturaLinha, l, { tam, negrito, alinhar: colunas[i].alinhar || 'esq', larg: ws[i] - 2 * pad })));
        y += h;
        doc.linha(M, y, M + W, y, { cor: '#dde3ec' });
      });
      y += 10;
      return doc;
    },

    /** Gera os bytes do PDF. `rodape(i, total)` devolve o texto de cada página. */
    bytes(rodape = (i, t) => `Página ${i} de ${t}`) {
      const total = paginas.length;
      paginas.forEach((p, i) => {
        p.push(`${cor('#c9d1dc')} RG 0.5 w ${n(M)} ${n(M - 4)} m ${n(L - M)} ${n(M - 4)} l S`);
        const txt = rodape(i + 1, total);
        const partes = Array.isArray(txt) ? txt : ['', txt];
        if (partes[0]) p.push(`BT /F1 7.5 Tf ${cor('#5a6578')} rg ${n(M)} ${n(M - 16)} Td (${codificar(partes[0])}) Tj ET`);
        const w = larguraTexto(partes[1], 7.5);
        p.push(`BT /F1 7.5 Tf ${cor('#5a6578')} rg ${n(L - M - w)} ${n(M - 16)} Td (${codificar(partes[1])}) Tj ET`);
      });

      const objs = [];
      const add = s => { objs.push(s); return objs.length; };
      const catalogo = add(null);
      const arvore = add(null);
      const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      const ids = [];
      for (const p of paginas) {
        const conteudo = p.join('\n');
        const c = add(`<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`);
        ids.push(add(`<< /Type /Page /Parent ${arvore} 0 R /MediaBox [0 0 ${n(L)} ${n(H)}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${c} 0 R >>`));
      }
      objs[catalogo - 1] = `<< /Type /Catalog /Pages ${arvore} 0 R >>`;
      objs[arvore - 1] = `<< /Type /Pages /Kids [${ids.map(i => `${i} 0 R`).join(' ')}] /Count ${ids.length} >>`;
      const data = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const info = add(`<< /Title (${codificar(titulo)}) /Author (${codificar(autor)}) /Producer (Portal de Transparencia CRV) /CreationDate (D:${data}) >>`);

      let s = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
      const offs = [];
      objs.forEach((o, i) => { offs.push(s.length); s += `${i + 1} 0 obj\n${o}\nendobj\n`; });
      const xref = s.length;
      s += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
      s += `trailer\n<< /Size ${objs.length + 1} /Root ${catalogo} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
      const bytes = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
      return bytes;
    },
    blob(rodape) {
      return new Blob([doc.bytes(rodape)], { type: 'application/pdf' });
    },
  };
  return doc;
}
