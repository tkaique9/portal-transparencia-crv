// Login, sessão e gestão de usuários.
//
// LIMITE DESTA FASE: sem servidor, a senha é conferida no próprio navegador.
// Isso protege a área administrativa de quem usa o mesmo computador, mas não
// é segurança de verdade contra quem tem acesso ao perfil do navegador — os
// dados estão nele. A segurança real (senha conferida no servidor, sessão
// por cookie httpOnly) entra junto com o back-end. Ver README.
//
// O que já vale: senha nunca é guardada, só o hash PBKDF2-SHA256 com sal
// próprio; bloqueio temporário após 5 tentativas erradas; a sessão expira
// após 30 minutos sem uso; nunca fica sem administrador ativo.

import { dados, gravarUsuarios, ErroPermissao, ErroValidacao } from './db.js';
import { PERFIS, pode } from './esquema.js';
import { novoId } from '../util.js';

const ITERACOES = 210000;
const SESSAO = 'crv-sessao';
const TENTATIVAS = 'crv-tentativas';
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 5 * 60 * 1000;
const OCIOSO_MS = 30 * 60 * 1000;

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

async function derivar(senha, salHex) {
  const sal = new Uint8Array(salHex.match(/../g).map(h => parseInt(h, 16)));
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: ITERACOES }, chave, 256));
}

/** Comparação em tempo constante. */
function iguais(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export function conferirSenhaForte(senha) {
  const erros = [];
  if (String(senha).length < 10) erros.push('A senha precisa de pelo menos 10 caracteres');
  if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) erros.push('A senha precisa ter letras e números');
  return erros;
}

async function hashNovo(senha) {
  const sal = hex(crypto.getRandomValues(new Uint8Array(16)));
  return { sal, hash: await derivar(senha, sal), iteracoes: ITERACOES };
}

const LOGIN_OK = /^[a-z0-9._-]{3,40}$/;
const limpar = u => ({ id: u.id, nome: u.nome, login: u.login, perfil: u.perfil, ativo: u.ativo, criadoEm: u.criadoEm, ultimoAcesso: u.ultimoAcesso || null });

// ------------------------------------------------------------ sessão

function lerJSON(armazem, chave) {
  try { return JSON.parse(armazem.getItem(chave) || 'null'); } catch { return null; }
}
function gravarJSON(armazem, chave, valor) {
  try { valor == null ? armazem.removeItem(chave) : armazem.setItem(chave, JSON.stringify(valor)); } catch { /* modo privado */ }
}

/** Usuário logado, conferido contra o cadastro a cada chamada (perfil atual, ativo). */
export function usuarioAtual() {
  const s = lerJSON(sessionStorage, SESSAO);
  if (!s || !dados) return null;
  if (Date.now() - s.ultimoUso > OCIOSO_MS) { gravarJSON(sessionStorage, SESSAO, null); return null; }
  const u = dados.usuarios.find(x => x.id === s.id);
  if (!u || !u.ativo) { gravarJSON(sessionStorage, SESSAO, null); return null; }
  s.ultimoUso = Date.now();
  gravarJSON(sessionStorage, SESSAO, s);
  return limpar(u);
}

export const precisaPrimeiroAdmin = () => !dados?.usuarios.length;

function bloqueado(login) {
  const t = lerJSON(localStorage, TENTATIVAS) || {};
  const r = t[login];
  if (r && r.ate && r.ate > Date.now()) return Math.ceil((r.ate - Date.now()) / 60000);
  return 0;
}
function anotarFalha(login) {
  const t = lerJSON(localStorage, TENTATIVAS) || {};
  const r = t[login] && (!t[login].ate || t[login].ate > Date.now()) ? t[login] : { n: 0 };
  r.n = (r.n || 0) + 1;
  if (r.n >= MAX_TENTATIVAS) { r.ate = Date.now() + BLOQUEIO_MS; r.n = 0; }
  t[login] = r;
  gravarJSON(localStorage, TENTATIVAS, t);
}

export async function entrar(login, senha) {
  login = String(login || '').trim().toLowerCase();
  const min = bloqueado(login);
  if (min) throw new ErroPermissao(`Muitas tentativas. Tente de novo em ${min} minuto(s).`);
  const u = dados.usuarios.find(x => x.login === login);
  // Mesmo custo e mesma mensagem para usuário inexistente e senha errada.
  const hash = await derivar(String(senha || ''), u?.sal || '00'.repeat(16));
  if (!u || !u.ativo || !iguais(hash, u.hash)) {
    anotarFalha(login);
    await gravarUsuarios(null, 'falha de login', { titulo: login });
    throw new ErroPermissao('Usuário ou senha incorretos.');
  }
  const t = lerJSON(localStorage, TENTATIVAS) || {};
  delete t[login];
  gravarJSON(localStorage, TENTATIVAS, t);
  u.ultimoAcesso = new Date().toISOString();
  gravarJSON(sessionStorage, SESSAO, { id: u.id, ultimoUso: Date.now() });
  await gravarUsuarios(limpar(u), 'login', { titulo: u.login });
  return limpar(u);
}

export async function sair() {
  const u = usuarioAtual();
  gravarJSON(sessionStorage, SESSAO, null);
  if (u) await gravarUsuarios(u, 'logout', { titulo: u.login });
}

// ------------------------------------------------------------ usuários

function conferirCampos({ nome, login, perfil }) {
  const erros = [];
  if (!String(nome || '').trim()) erros.push('Informe o nome');
  if (!LOGIN_OK.test(String(login || ''))) erros.push('Login: 3 a 40 caracteres, só letras minúsculas, números, ponto, hífen e sublinhado');
  if (!PERFIS[perfil]) erros.push('Perfil inválido');
  return erros;
}

/** Cria o primeiro administrador. Só funciona com o cadastro de usuários vazio. */
export async function criarPrimeiroAdmin({ nome, login, senha }) {
  if (!precisaPrimeiroAdmin()) throw new ErroPermissao('O administrador inicial já foi criado.');
  login = String(login || '').trim().toLowerCase();
  const erros = [...conferirCampos({ nome, login, perfil: 'admin' }), ...conferirSenhaForte(senha)];
  if (erros.length) throw new ErroValidacao(erros);
  const u = { id: novoId('usr-'), nome: nome.trim(), login, perfil: 'admin', ativo: true, criadoEm: new Date().toISOString(), ...(await hashNovo(senha)) };
  dados.usuarios.push(u);
  await gravarUsuarios(limpar(u), 'criar administrador inicial', { colecao: 'usuarios', registroId: u.id, titulo: u.login });
  return entrar(login, senha);
}

export function listarUsuarios(usuario) {
  if (!pode(usuario, 'usuarios') && !pode(usuario, 'auditoria')) throw new ErroPermissao('Sem acesso à lista de usuários.');
  return dados.usuarios.map(limpar);
}

export async function criarUsuario(campos, usuario) {
  if (!pode(usuario, 'usuarios')) throw new ErroPermissao('Só o administrador cria usuários.');
  const login = String(campos.login || '').trim().toLowerCase();
  const erros = [...conferirCampos({ ...campos, login }), ...conferirSenhaForte(campos.senha)];
  if (dados.usuarios.some(u => u.login === login)) erros.push('Já existe um usuário com esse login');
  if (erros.length) throw new ErroValidacao(erros);
  const u = { id: novoId('usr-'), nome: campos.nome.trim(), login, perfil: campos.perfil, ativo: true, criadoEm: new Date().toISOString(), ...(await hashNovo(campos.senha)) };
  dados.usuarios.push(u);
  await gravarUsuarios(usuario, 'criar usuário', { colecao: 'usuarios', registroId: u.id, titulo: `${u.login} (${PERFIS[u.perfil].nome})` });
  return limpar(u);
}

const adminsAtivos = () => dados.usuarios.filter(u => u.perfil === 'admin' && u.ativo);

export async function alterarUsuario(id, { nome, perfil, ativo }, usuario) {
  if (!pode(usuario, 'usuarios')) throw new ErroPermissao('Só o administrador altera usuários.');
  const u = dados.usuarios.find(x => x.id === id);
  if (!u) throw new ErroValidacao(['Usuário não encontrado']);
  const novoPerfil = perfil ?? u.perfil;
  const novoAtivo = ativo ?? u.ativo;
  if (!PERFIS[novoPerfil]) throw new ErroValidacao(['Perfil inválido']);
  const perdeAdmin = u.perfil === 'admin' && u.ativo && (novoPerfil !== 'admin' || !novoAtivo);
  if (perdeAdmin && u.id === usuario.id) throw new ErroValidacao(['Você não pode rebaixar nem desativar a si mesmo.']);
  if (perdeAdmin && adminsAtivos().length <= 1) throw new ErroValidacao(['O sistema precisa de pelo menos um administrador ativo.']);
  const antes = limpar(u);
  if (nome != null && String(nome).trim()) u.nome = String(nome).trim();
  u.perfil = novoPerfil;
  u.ativo = !!novoAtivo;
  const alteracoes = {};
  for (const k of ['nome', 'perfil', 'ativo']) if (antes[k] !== u[k]) alteracoes[k] = [antes[k], u[k]];
  await gravarUsuarios(usuario, 'alterar usuário', { colecao: 'usuarios', registroId: id, titulo: u.login, alteracoes });
  return limpar(u);
}

export async function redefinirSenha(id, senha, usuario) {
  const proprio = usuario?.id === id;
  if (!proprio && !pode(usuario, 'usuarios')) throw new ErroPermissao('Só o administrador redefine a senha de outra pessoa.');
  const erros = conferirSenhaForte(senha);
  if (erros.length) throw new ErroValidacao(erros);
  const u = dados.usuarios.find(x => x.id === id);
  if (!u) throw new ErroValidacao(['Usuário não encontrado']);
  Object.assign(u, await hashNovo(senha));
  await gravarUsuarios(usuario, proprio ? 'trocar a própria senha' : 'redefinir senha', { colecao: 'usuarios', registroId: id, titulo: u.login });
}
