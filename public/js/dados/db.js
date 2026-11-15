// Banco local do portal (IndexedDB).
//
// Nesta fase não há servidor: o banco é o navegador de quem administra.
// Todo acesso a dado passa por este módulo, que é a autoridade sobre
// validação, permissão, publicação e trilha de auditoria. As telas nunca
// mexem em `dados` direto. Quando houver back-end, este é o único arquivo
// que troca: a mesma interface passa a chamar a API.
//
// Três depósitos:
//   doc      → um documento só, com todas as coleções, usuários e auditoria
//   arquivos → os PDFs e imagens (Blob), pelo id
//   backups  → cópias automáticas do doc (as 10 mais recentes)

import { COLECOES, PERFIS, PUBLICACAO, TIPOS_ARQUIVO, LIMITE_ARQUIVO, VERSAO_ESQUEMA, podeEditar, pode } from './esquema.js';
import { novoId, blobParaBase64, base64ParaBlob, sha256, hojeISO } from '../util.js';

const NOME_BANCO = 'portal-transparencia-crv';
const MAX_BACKUPS = 10;

let banco = null;
/** Documento em memória. Leia pelas funções abaixo, nunca grave direto. */
export let dados = null;
const ouvintes = new Set();
let fila = Promise.resolve();

export class ErroPermissao extends Error {}
export class ErroValidacao extends Error {
  constructor(erros) { super(erros.join(' · ')); this.erros = erros; }
}

// ------------------------------------------------------------ IndexedDB

function req(r) {
  return new Promise((ok, falha) => { r.onsuccess = () => ok(r.result); r.onerror = () => falha(r.error); });
}
function tx(depositos, modo = 'readonly') {
  return banco.transaction(depositos, modo);
}
function fim(t) {
  return new Promise((ok, falha) => { t.oncomplete = ok; t.onerror = () => falha(t.error); t.onabort = () => falha(t.error); });
}

export async function abrir() {
  if (!('indexedDB' in window)) throw new Error('Este navegador não oferece armazenamento local (IndexedDB).');
  const r = indexedDB.open(NOME_BANCO, 1);
  r.onupgradeneeded = () => {
    const b = r.result;
    if (!b.objectStoreNames.contains('doc')) b.createObjectStore('doc');
    if (!b.objectStoreNames.contains('arquivos')) b.createObjectStore('arquivos', { keyPath: 'id' });
    if (!b.objectStoreNames.contains('backups')) b.createObjectStore('backups', { keyPath: 'id' });
  };
  banco = await req(r);
  dados = await req(tx('doc').objectStore('doc').get('principal')) || null;
  if (dados) normalizar(dados);
  return !!dados;
}

/** Garante que todo documento (inclusive backup antigo) tem todas as listas. */
function normalizar(d) {
  d.colecoes ||= {};
  for (const c of Object.keys(COLECOES)) d.colecoes[c] ||= [];
  d.usuarios ||= [];
  d.auditoria ||= [];
  d.config ||= {};
  d.versao = VERSAO_ESQUEMA;
}

export function documentoVazio() {
  const d = { versao: VERSAO_ESQUEMA, colecoes: {}, usuarios: [], auditoria: [], config: { demonstracao: false } };
  normalizar(d);
  return d;
}

/** Grava o documento. Gravações entram em fila para nunca se sobreporem. */
function gravar() {
  fila = fila.then(async () => {
    const t = tx('doc', 'readwrite');
    t.objectStore('doc').put(dados, 'principal');
    await fim(t);
  });
  for (const f of ouvintes) f();
  return fila;
}

export const aoMudar = f => { ouvintes.add(f); return () => ouvintes.delete(f); };

/** Substitui o documento inteiro (carga inicial dos exemplos ou restauração). */
export async function substituir(novo) {
  normalizar(novo);
  dados = novo;
  await gravar();
}

// ------------------------------------------------------------ leitura

export const colecao = nome => dados?.colecoes[nome] || [];
export const obter = (nome, id) => colecao(nome).find(r => r.id === id) || null;

/** O que o cidadão vê: só publicado e, em documentos, nunca o que é interno. */
export function publicos(nome) {
  return colecao(nome).filter(r => r.publicacao === 'publicado' && !(nome === 'documentos' && r.restrito));
}

/** Registros que apontam para (nome, id) — impedem a exclusão. */
export function referencias(nome, id) {
  const achados = [];
  for (const [c, def] of Object.entries(COLECOES)) {
    for (const campo of def.campos.filter(f => f.tipo === 'ref' && f.ref === nome)) {
      for (const r of colecao(c)) if (r[campo.k] === id) achados.push({ colecao: c, registro: r });
    }
  }
  return achados;
}

// ------------------------------------------------------------ validação

const DATA_OK = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export function validar(nome, r) {
  const def = COLECOES[nome];
  const erros = [];
  for (const f of def.campos) {
    const v = r[f.k];
    const vazio = v === undefined || v === null || v === '';
    if (f.obrig && vazio) { erros.push(`${f.rotulo}: obrigatório`); continue; }
    if (vazio) continue;
    if ((f.tipo === 'numero' || f.tipo === 'moeda') && (!Number.isFinite(Number(v)) || Number(v) < 0)) erros.push(`${f.rotulo}: informe um número maior ou igual a zero`);
    if (f.positivo && Number(v) <= 0 && !(Number(v) < 0)) erros.push(`${f.rotulo}: deve ser maior que zero`);
    if (f.tipo === 'ano' && !(Number.isInteger(Number(v)) && v >= 2000 && v <= 2100)) erros.push(`${f.rotulo}: ano inválido`);
    if (f.tipo === 'data' && !DATA_OK(v)) erros.push(`${f.rotulo}: data inválida`);
    if (f.tipo === 'mes' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) erros.push(`${f.rotulo}: mês inválido`);
    if (f.tipo === 'opcao' && !f.opcoes.includes(v)) erros.push(`${f.rotulo}: valor fora da lista`);
    if (f.tipo === 'ref' && !obter(f.ref, v)) erros.push(`${f.rotulo}: registro não encontrado`);
  }
  if (r.inicio && r.fim && r.fim < r.inicio) erros.push('O fim não pode ser antes do início');
  if (nome === 'contratos' && r.tipo === 'Aditivo contratual' && !r.contratoPaiId) erros.push('Aditivo precisa indicar o instrumento original');
  if (nome === 'contratos' && r.contratoPaiId && r.contratoPaiId === r.id) erros.push('Um instrumento não pode ser aditivo de si mesmo');
  if (nome === 'documentos' && r.restrito && r.publicacao === 'publicado') erros.push('Documento interno não pode ser publicado — desmarque "documento interno" se ele puder ser público');
  return erros;
}

/** Converte os valores do formulário para os tipos do esquema. */
function tipar(nome, campos) {
  const saida = {};
  for (const f of COLECOES[nome].campos) {
    if (!(f.k in campos)) continue;
    let v = campos[f.k];
    if (typeof v === 'string') v = v.trim();
    if (f.tipo === 'numero' || f.tipo === 'moeda' || f.tipo === 'ano') v = v === '' || v == null ? null : Number(v);
    else if (f.tipo === 'marca') v = !!v;
    else if (v === '') v = null;
    saida[f.k] = v;
  }
  return saida;
}

// ------------------------------------------------------------ auditoria

/** Registra uma entrada no histórico. Toda alteração passa por aqui. */
export function registrar(usuario, acao, detalhe = {}) {
  dados.auditoria.push({
    id: novoId('log-'),
    quando: new Date().toISOString(),
    usuario: usuario?.login || 'anônimo',
    perfil: usuario?.perfil || null,
    acao,
    ...detalhe,
  });
  if (dados.auditoria.length > 20000) dados.auditoria.splice(0, dados.auditoria.length - 20000);
}

function diferencas(antes, depois) {
  const d = {};
  for (const k of new Set([...Object.keys(antes || {}), ...Object.keys(depois || {})])) {
    if (['atualizadoEm', 'atualizadoPor'].includes(k)) continue;
    if (JSON.stringify(antes?.[k]) !== JSON.stringify(depois?.[k])) d[k] = [antes?.[k] ?? null, depois?.[k] ?? null];
  }
  return d;
}

// ------------------------------------------------------------ escrita

function exigir(usuario, nome) {
  if (!usuario) throw new ErroPermissao('Entre no sistema para alterar dados.');
  if (!podeEditar(usuario, nome)) throw new ErroPermissao(`O perfil ${PERFIS[usuario.perfil]?.nome || usuario.perfil} não altera ${COLECOES[nome].nome.toLowerCase()}.`);
}

/**
 * Cria um registro. `publicar` só vale para o administrador; os demais
 * perfis podem pedir `enviar` (fica aguardando aprovação).
 */
export async function inserir(nome, campos, usuario, { publicar = false, enviar = false } = {}) {
  exigir(usuario, nome);
  await copiaDoDia(usuario);
  const agora = new Date().toISOString();
  const r = { id: novoId(nome.slice(0, 3) + '-'), ...tipar(nome, campos) };
  r.publicacao = publicar && pode(usuario, 'publica') ? 'publicado' : enviar ? 'pendente' : 'rascunho';
  const erros = validar(nome, r);
  if (erros.length) throw new ErroValidacao(erros);
  Object.assign(r, { criadoEm: agora, criadoPor: usuario.login, atualizadoEm: agora, atualizadoPor: usuario.login });
  if (r.publicacao === 'publicado') Object.assign(r, { publicadoEm: agora, publicadoPor: usuario.login });
  colecao(nome).push(r);
  registrar(usuario, 'criar', { colecao: nome, registroId: r.id, titulo: COLECOES[nome].titulo(r), publicacao: r.publicacao });
  await gravar();
  return r;
}

/**
 * Altera um registro. Quem não publica, ao mexer em algo já publicado,
 * devolve o registro para aprovação. Como não guardamos duas versões do mesmo
 * registro, ele sai do portal até o administrador aprovar de novo — de
 * propósito: nada que não foi conferido aparece como informação oficial.
 */
export async function atualizar(nome, id, campos, usuario, { publicar = false, enviar = false } = {}) {
  exigir(usuario, nome);
  const atual = obter(nome, id);
  if (!atual) throw new ErroValidacao(['Registro não encontrado']);
  await copiaDoDia(usuario);
  const novo = { ...atual, ...tipar(nome, campos) };
  const agora = new Date().toISOString();
  const admin = pode(usuario, 'publica');
  if (publicar && admin) Object.assign(novo, { publicacao: 'publicado', publicadoEm: agora, publicadoPor: usuario.login });
  else if (enviar || (!admin && atual.publicacao !== 'rascunho')) novo.publicacao = 'pendente';
  const erros = validar(nome, novo);
  if (erros.length) throw new ErroValidacao(erros);
  Object.assign(novo, { atualizadoEm: agora, atualizadoPor: usuario.login });
  const dif = diferencas(atual, novo);
  if (!Object.keys(dif).length) return atual;
  Object.assign(atual, novo);
  registrar(usuario, 'alterar', { colecao: nome, registroId: id, titulo: COLECOES[nome].titulo(atual), alteracoes: dif });
  await gravar();
  return atual;
}

export async function excluir(nome, id, usuario) {
  exigir(usuario, nome);
  const atual = obter(nome, id);
  if (!atual) return;
  const refs = referencias(nome, id);
  if (refs.length) {
    const exemplos = refs.slice(0, 3).map(x => `${COLECOES[x.colecao].singular} "${COLECOES[x.colecao].titulo(x.registro)}"`);
    throw new ErroValidacao([`Não é possível excluir: ${refs.length} registro(s) dependem deste (${exemplos.join(', ')}${refs.length > 3 ? '…' : ''}).`]);
  }
  await copiaDoDia(usuario);
  const lista = colecao(nome);
  lista.splice(lista.indexOf(atual), 1);
  registrar(usuario, 'excluir', { colecao: nome, registroId: id, titulo: COLECOES[nome].titulo(atual), antes: atual });
  await gravar();
  await limparOrfaos();
}

/** Muda o estado de publicação. Aprovar e publicar é só do administrador. */
export async function definirPublicacao(nome, id, estado, usuario) {
  if (!PUBLICACAO[estado]) throw new ErroValidacao(['Estado de publicação inválido']);
  const r = obter(nome, id);
  if (!r) throw new ErroValidacao(['Registro não encontrado']);
  const admin = pode(usuario, 'publica');
  const proprioEnvio = estado === 'pendente' && podeEditar(usuario, nome) && r.publicacao === 'rascunho';
  if (!admin && !proprioEnvio) throw new ErroPermissao('Só o administrador aprova, publica ou retira publicações.');
  if (r.publicacao === estado) return r;
  if (estado === 'publicado') {
    const erros = validar(nome, { ...r, publicacao: 'publicado' });
    if (erros.length) throw new ErroValidacao(erros);
  }
  const antes = r.publicacao;
  const agora = new Date().toISOString();
  r.publicacao = estado;
  if (estado === 'publicado') Object.assign(r, { publicadoEm: agora, publicadoPor: usuario.login });
  registrar(usuario, estado === 'publicado' ? 'publicar' : estado === 'pendente' ? 'enviar para aprovação' : 'retirar publicação',
    { colecao: nome, registroId: id, titulo: COLECOES[nome].titulo(r), alteracoes: { publicacao: [antes, estado] } });
  await gravar();
  return r;
}

export async function definirConfig(chave, valor, usuario) {
  if (!pode(usuario, 'usuarios')) throw new ErroPermissao('Só o administrador altera as configurações.');
  const antes = dados.config[chave];
  dados.config[chave] = valor;
  registrar(usuario, 'configurar', { colecao: 'config', titulo: chave, alteracoes: { [chave]: [antes ?? null, valor] } });
  await gravar();
}

/** Usado pelo módulo de autenticação, que tem as próprias regras. */
export async function gravarUsuarios(usuario, acao, detalhe) {
  registrar(usuario, acao, detalhe);
  await gravar();
}

/** Registra um evento sem alteração de dado (login, exportação). */
export async function evento(usuario, acao, detalhe) {
  registrar(usuario, acao, detalhe);
  await gravar();
}

// ------------------------------------------------------------ arquivos

/** Guarda um arquivo enviado e devolve os metadados que vão no registro. */
export async function salvarArquivo(file, usuario) {
  if (!usuario) throw new ErroPermissao('Entre no sistema para enviar arquivos.');
  if (!TIPOS_ARQUIVO.includes(file.type)) throw new ErroValidacao([`Tipo de arquivo não aceito (${file.type || 'desconhecido'}). Envie PDF, PNG, JPG ou WEBP.`]);
  if (file.size > LIMITE_ARQUIVO) throw new ErroValidacao(['Arquivo maior que 15 MB.']);
  const buffer = await file.arrayBuffer();
  const meta = { id: novoId('arq-'), nome: file.name, tipo: file.type, tamanho: file.size, sha256: await sha256(buffer) };
  const t = tx('arquivos', 'readwrite');
  t.objectStore('arquivos').put({ ...meta, blob: new Blob([buffer], { type: file.type }) });
  await fim(t);
  return meta;
}

/** Variante para os arquivos gerados pelos dados de exemplo. */
export async function salvarBlob(blob, nome) {
  const buffer = await blob.arrayBuffer();
  const meta = { id: novoId('arq-'), nome, tipo: blob.type, tamanho: blob.size, sha256: await sha256(buffer) };
  const t = tx('arquivos', 'readwrite');
  t.objectStore('arquivos').put({ ...meta, blob });
  await fim(t);
  return meta;
}

export async function lerArquivo(id) {
  return await req(tx('arquivos').objectStore('arquivos').get(id)) || null;
}

/**
 * Arquivo nunca é apagado junto com o registro: uma cópia de segurança pode
 * apontar para ele, e restaurá-la traria o registro de volta sem o PDF.
 * Só sai do armazenamento quando nem o documento atual nem nenhuma cópia
 * guardada o referencia mais.
 */
export async function limparOrfaos() {
  const usados = new Set(colecao('documentos').map(d => d.arquivo?.id).filter(Boolean));
  const copias = await req(tx('backups').objectStore('backups').getAll());
  for (const c of copias) for (const d of c.doc?.colecoes?.documentos || []) if (d.arquivo?.id) usados.add(d.arquivo.id);
  const ids = await req(tx('arquivos').objectStore('arquivos').getAllKeys());
  const orfaos = ids.filter(id => !usados.has(id));
  if (orfaos.length) {
    const t = tx('arquivos', 'readwrite');
    for (const id of orfaos) t.objectStore('arquivos').delete(id);
    await fim(t);
  }
  return orfaos.length;
}

// ------------------------------------------------------------ backup

/**
 * Cópia automática: antes da primeira alteração de cada dia, o documento
 * inteiro vai para o depósito de backups (mantém as 10 últimas). Os
 * arquivos não são copiados: um arquivo nunca muda depois de enviado, e
 * limparOrfaos() mantém todo arquivo que alguma cópia ainda referencia.
 */
async function copiaDoDia(usuario) {
  if (!dados || dados.config.ultimaCopia === hojeISO()) return;
  await criarCopia('automática do dia', usuario, false);
  dados.config.ultimaCopia = hojeISO();
}

export async function criarCopia(motivo, usuario, registrarNoLog = true) {
  const copia = { id: novoId('bkp-'), quando: new Date().toISOString(), motivo, usuario: usuario?.login || null, doc: structuredClone(dados) };
  const t = tx('backups', 'readwrite');
  const dep = t.objectStore('backups');
  dep.put(copia);
  const todas = await req(dep.getAllKeys());
  await fim(t);
  const sobra = todas.sort().slice(0, Math.max(0, todas.length - MAX_BACKUPS));
  if (sobra.length) { const t2 = tx('backups', 'readwrite'); for (const k of sobra) t2.objectStore('backups').delete(k); await fim(t2); await limparOrfaos(); }
  if (registrarNoLog) { registrar(usuario, 'criar cópia de segurança', { titulo: motivo }); await gravar(); }
  return copia;
}

export async function listarCopias() {
  const todas = await req(tx('backups').objectStore('backups').getAll());
  return todas.map(({ id, quando, motivo, usuario, doc }) => ({ id, quando, motivo, usuario, registros: Object.values(doc.colecoes).reduce((a, l) => a + l.length, 0) }))
    .sort((a, b) => b.quando.localeCompare(a.quando));
}

export async function restaurarCopia(id, usuario) {
  if (!pode(usuario, 'backup')) throw new ErroPermissao('Só o administrador restaura cópias.');
  const copia = await req(tx('backups').objectStore('backups').get(id));
  if (!copia) throw new ErroValidacao(['Cópia não encontrada']);
  await criarCopia('antes de restaurar cópia', usuario, false);
  const auditoria = dados.auditoria; // o histórico nunca volta no tempo
  dados = copia.doc;
  normalizar(dados);
  dados.auditoria = auditoria;
  registrar(usuario, 'restaurar cópia', { titulo: `${copia.motivo} de ${copia.quando}` });
  await gravar();
}

/** Backup completo em arquivo (documento + arquivos em base64). */
export async function exportarBackup(usuario) {
  if (!pode(usuario, 'backup')) throw new ErroPermissao('Só o administrador exporta o backup.');
  const arquivos = await req(tx('arquivos').objectStore('arquivos').getAll());
  const lista = [];
  for (const a of arquivos) lista.push({ id: a.id, nome: a.nome, tipo: a.tipo, tamanho: a.tamanho, sha256: a.sha256, base64: await blobParaBase64(a.blob) });
  registrar(usuario, 'exportar backup', { titulo: `${lista.length} arquivo(s)` });
  await gravar();
  const pacote = { formato: 'portal-transparencia-crv/backup', versao: VERSAO_ESQUEMA, geradoEm: new Date().toISOString(), doc: dados, arquivos: lista };
  return new Blob([JSON.stringify(pacote)], { type: 'application/json' });
}

export async function importarBackup(texto, usuario) {
  if (!pode(usuario, 'backup')) throw new ErroPermissao('Só o administrador restaura o backup.');
  let pacote;
  try { pacote = JSON.parse(texto); } catch { throw new ErroValidacao(['O arquivo não é um backup válido (JSON ilegível).']); }
  if (pacote?.formato !== 'portal-transparencia-crv/backup' || !pacote.doc?.colecoes) throw new ErroValidacao(['O arquivo não é um backup deste portal.']);
  if (!pacote.doc.usuarios?.some(u => u.perfil === 'admin' && u.ativo)) throw new ErroValidacao(['O backup não tem administrador ativo — restaurar trancaria o sistema.']);
  await criarCopia('antes de importar backup', usuario, false);
  // os arquivos do backup entram ao lado dos atuais; os que ficarem sem
  // referência (nem no documento nem em cópia) saem no limparOrfaos()
  const t = tx('arquivos', 'readwrite');
  for (const a of pacote.arquivos || []) t.objectStore('arquivos').put({ id: a.id, nome: a.nome, tipo: a.tipo, tamanho: a.tamanho, sha256: a.sha256, blob: base64ParaBlob(a.base64, a.tipo) });
  await fim(t);
  const auditoria = [...(pacote.doc.auditoria || []), ...dados.auditoria.filter(x => !(pacote.doc.auditoria || []).some(y => y.id === x.id))];
  dados = pacote.doc;
  normalizar(dados);
  dados.auditoria = auditoria.sort((a, b) => a.quando.localeCompare(b.quando));
  registrar(usuario, 'importar backup', { titulo: `gerado em ${pacote.geradoEm}` });
  await gravar();
  await limparOrfaos();
}

/**
 * Remove só os registros marcados como exemplo (e seus arquivos). O que foi
 * cadastrado de verdade por cima da demonstração fica. Registro real que
 * aponte para um exemplo perde a referência, e isso vai para o histórico.
 */
export async function removerExemplos(usuario) {
  if (!pode(usuario, 'backup')) throw new ErroPermissao('Só o administrador remove os dados de exemplo.');
  await criarCopia('antes de remover dados de exemplo', usuario, false);
  const removidos = {};
  const ids = new Set();
  for (const c of Object.keys(COLECOES)) {
    const lista = colecao(c);
    for (const r of lista.filter(r => r.exemplo)) ids.add(r.id);
    const antes = lista.length;
    dados.colecoes[c] = lista.filter(r => !r.exemplo);
    removidos[c] = antes - dados.colecoes[c].length;
  }
  let referenciasLimpas = 0;
  for (const [c, def] of Object.entries(COLECOES)) {
    for (const r of colecao(c)) for (const f of def.campos.filter(f => f.tipo === 'ref')) {
      if (ids.has(r[f.k])) { r[f.k] = null; referenciasLimpas++; }
    }
  }
  dados.config.demonstracao = false;
  registrar(usuario, 'remover dados de exemplo', { titulo: Object.entries(removidos).filter(([, n]) => n).map(([c, n]) => `${n} ${c}`).join(', '), referenciasLimpas });
  await gravar();
  await limparOrfaos(); // os arquivos dos exemplos ficam enquanto a cópia "antes de remover" existir
  return removidos;
}
