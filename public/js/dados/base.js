// O que o portal (portal.html) e o site institucional (index.html) leem em
// comum: abrir a base local (com a carga de exemplo no primeiro acesso) e a
// base pública. Morava no app.js; saiu daqui para o site não precisar
// carregar o sistema inteiro para mostrar os mesmos números.

import * as db from './db.js';
import { gerarExemplo, VERSAO_EXEMPLO, atualizarFotosExemplo } from './exemplo.js';
import { COLECOES } from './esquema.js';
import { mascararDocumento } from '../util.js';
import { anosDisponiveis } from '../calculo.js';

/**
 * O que o cidadão enxerga: só registros publicados, documentos não internos,
 * e o CPF de quem recebeu pagamento já mascarado. Toda página pública lê
 * daqui — nunca de db.colecao() — para nenhum dado não publicado vazar.
 */
export function basePublica() {
  const b = Object.fromEntries(Object.keys(COLECOES).map(c => [c, db.publicos(c)]));
  const projetosPub = new Set(b.projetos.map(p => p.id));
  // metas e atendimentos de projeto não publicado também não aparecem
  b.metas = b.metas.filter(m => projetosPub.has(m.projetoId));
  b.atendimentos = b.atendimentos.filter(a => projetosPub.has(a.projetoId));
  b.despesas = b.despesas.map(d => ({ ...d, documento: mascararDocumento(d.documento) }));
  b.parceiros = b.parceiros.map(p => ({ ...p, documento: mascararDocumento(p.documento) }));
  b.anos = anosDisponiveis(b);
  b.demonstracao = !!db.dados.config.demonstracao;
  return b;
}

/**
 * Base só com exemplos de uma versão anterior da carga (ilustrações novas,
 * por exemplo) e ninguém cadastrado: pode regerar sem perder nada. Havendo
 * usuário ou registro real, não mexe — quem administra decide.
 */
function exemploDesatualizado() {
  const d = db.dados;
  if (!d?.config.demonstracao || (d.config.versaoExemplo || 1) >= VERSAO_EXEMPLO || d.usuarios.length) return false;
  return Object.keys(COLECOES).every(c => db.colecao(c).every(r => r.exemplo));
}

/** Abre a base; no primeiro acesso (ou carga de exemplo antiga) gera os dados de exemplo. */
export async function prepararBase(aoProgresso = () => {}) {
  const existe = await db.abrir();
  if (!existe || exemploDesatualizado()) {
    aoProgresso('Primeiro acesso: preparando os dados de exemplo…');
    const doc = await gerarExemplo(aoProgresso);
    await db.substituir(doc);
    await db.limparOrfaos(); // arquivos da carga anterior, quando houve regeração
  } else if (db.dados.config.demonstracao && (db.dados.config.versaoFotos || 0) < 3) {
    // base de exemplo que já tem usuário (não dá para regerar): troca só as fotos de exemplo
    aoProgresso('Atualizando as fotos de exemplo…');
    await db.atualizarExemplos('atualizar fotos de exemplo', async d => {
      const n = await atualizarFotosExemplo(d.colecoes.documentos);
      d.config.versaoFotos = 3;
      return `${n} foto(s) de banco de imagens no lugar das ilustrações`;
    });
  }
}
