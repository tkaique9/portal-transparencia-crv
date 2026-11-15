// Utilitários sem dependência de DOM (exceto baixar()), usados por todo o app.

/** Escapa texto para HTML. Todo texto vindo de cadastro passa por aqui. */
export const esc = v => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const moedaCurta = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtMoeda = v => moeda.format(Number(v) || 0);
export const fmtNum = v => inteiro.format(Number(v) || 0);
export const fmtDec = v => decimal.format(Number(v) || 0);
export const fmtPct = (v, casas = 1) => (Number.isFinite(v) ? v * 100 : 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) + '%';

/** R$ 1,2 mi · R$ 350 mil — para eixos e rótulos curtos. */
export function fmtMoedaCurta(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return 'R$ ' + moedaCurta.format(v / 1e6) + ' mi';
  if (a >= 1e3) return 'R$ ' + moedaCurta.format(v / 1e3) + ' mil';
  return 'R$ ' + inteiro.format(v);
}
export function fmtNumCurto(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return moedaCurta.format(v / 1e6) + ' mi';
  if (a >= 1e4) return moedaCurta.format(v / 1e3) + ' mil';
  return inteiro.format(v);
}

export const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** '2026-03-15' → '15/03/2026'. Datas são sempre texto ISO (AAAA-MM-DD) no banco. */
export function fmtData(iso) {
  if (!iso) return '';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return d ? `${d}/${m}/${a}` : iso;
}
export function fmtDataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
}
export const anoDe = iso => Number(String(iso).slice(0, 4));
export const mesDe = iso => Number(String(iso).slice(5, 7)); // 1–12
export const hojeISO = () => new Date().toISOString().slice(0, 10);

/** Normaliza para busca: minúsculas e sem acento. */
export const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const soma = (lista, f = x => x) => lista.reduce((a, x) => a + (Number(f(x)) || 0), 0);

export function agrupar(lista, chave) {
  const m = new Map();
  for (const x of lista) {
    const k = typeof chave === 'function' ? chave(x) : x[chave];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
}

/** Identificador único curto. */
export const novoId = (prefixo = '') => prefixo + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ---------------------------------------------------------------- LGPD

const digitos = s => String(s ?? '').replace(/\D/g, '');
export const ehCPF = s => digitos(s).length === 11;

/**
 * Documento de quem recebeu o pagamento, para exibição pública.
 * CNPJ é dado de pessoa jurídica e aparece inteiro. CPF é dado pessoal:
 * aparece só o miolo, como o Portal da Transparência federal faz
 * (***.456.789-**) — o suficiente para conferir, não para identificar.
 */
export function mascararDocumento(doc) {
  const d = digitos(doc);
  if (d.length === 11) return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return d ? '***' : '';
}

/** Nome de pessoa física em pagamento público: primeiro nome + iniciais. */
export function mascararNomePF(nome) {
  const partes = String(nome ?? '').trim().split(/\s+/);
  if (partes.length <= 1) return partes[0] || '';
  return partes[0] + ' ' + partes.slice(1).map(p => p[0].toUpperCase() + '.').join(' ');
}

// ---------------------------------------------------------------- navegador

/** Baixa um Blob com o nome dado. */
export function baixar(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function blobParaBase64(blob) {
  return new Promise((ok, falha) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1] || '');
    r.onerror = () => falha(r.error);
    r.readAsDataURL(blob);
  });
}
export function base64ParaBlob(b64, tipo) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

export async function sha256(buffer) {
  const h = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export const tamanhoArquivo = b => b >= 1048576 ? fmtDec(b / 1048576) + ' MB' : fmtNum(Math.ceil(b / 1024)) + ' KB';

/** Gerador pseudoaleatório determinístico (mulberry32) — dados de exemplo reproduzíveis. */
export function aleatorio(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
