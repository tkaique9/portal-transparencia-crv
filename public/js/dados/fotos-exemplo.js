// Fotos dos DADOS DE EXEMPLO: banco de imagens gratuito (Unsplash, licença
// Unsplash — uso livre, inclusive institucional; o crédito é cortesia).
//
// Não retratam o Instituto CRV Minas nem seus beneficiários: são ambientação
// para a demonstração, e o portal e o site dizem isso em cada foto. As fotos
// reais entram pela área restrita (Documentos → Fotografia, vinculada ao
// projeto) e tomam o lugar destas; "Remover dados de exemplo" tira todas.
//
// Arquivos em img/fotos/<cena>.jpg (1600 px, sem metadados). Se uma foto não
// carregar, a ilustração desenhada no canvas (ilustracoes.js) fica no lugar.

import { ilustracao } from './ilustracoes.js';

export const FOTOS_EXEMPLO = {
  'educar-1': { autor: 'CDC', id: 'GDokEYnOfnE' },
  'educar-2': { autor: 'Quilia', id: '1-aA2Fadydc' },
  'saude-1': { autor: 'Carlos Magno', id: 'wNcxVKDfwUQ' },
  'saude-2': { autor: 'CDC', id: 'XdErxxR6Xog' },
  'viveiro-1': { autor: 'Vitor Monthay', id: 'Gpf84hh6KLI' },
  'viveiro-2': { autor: 'Dmitry Dreyer', id: 'gHho4FE4Ga0' },
  'renda-1': { autor: 'Tatev Ayvazyan', id: 'nj-vKBHtFqY' },
  'renda-2': { autor: 'Nguyễn Đức', id: 'evvN3qnoxho' },
  'esporte-1': { autor: 'Quilia', id: 'AvcBDbR-LWc' },
  'esporte-2': { autor: 'Vitolda Klein', id: 'zxsdbx-af9Y' },
  'familias-1': { autor: 'Beth Macdonald', id: 'mbND4xtrlVY' },
  'familias-2': { autor: 'Ismael Paramo', id: 'Cns0h4ypRyA' },
};

/** Legenda de cada cena, por projeto de exemplo (a mesma ordem das cenas -1 e -2). */
export const LEGENDAS_EXEMPLO = {
  educar: ['Aula de reforço no contraturno', 'Formação de professores'], saude: ['Unidade móvel em atendimento', 'Ação de prevenção na comunidade'],
  viveiro: ['Produção de mudas no viveiro', 'Plantio em área de nascente'], renda: ['Curso de panificação', 'Feira de empreendimentos'],
  esporte: ['Turma de futsal', 'Festival esportivo'], familias: ['Grupo de convivência', 'Entrega de cestas emergenciais'],
};

/**
 * Imagem de uma cena: a foto do banco de imagens ou, se não carregar, a
 * ilustração. Devolve o arquivo, o nome, a descrição (que diz o que ela é) e
 * a fonte (para o crédito).
 */
export async function imagemDaCena(cena, legenda, semente) {
  const f = FOTOS_EXEMPLO[cena];
  if (f) {
    try {
      const r = await fetch(`img/fotos/${cena}.jpg`);
      if (r.ok) {
        // confere pela assinatura do arquivo (todo JPEG começa com FF D8 FF), não pelo tipo que o servidor declara
        const bytes = new Uint8Array(await r.arrayBuffer());
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        if (bytes.length > 1000 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
          return {
            blob, nome: `${cena}.jpg`,
            descricao: `Foto ilustrativa de banco de imagens (Unsplash, por ${f.autor}). Não retrata o Instituto nem seus beneficiários.`,
            fonte: { tipo: 'banco-de-imagens', autor: f.autor, url: `https://unsplash.com/photos/${f.id}` },
          };
        }
      }
    } catch { /* sem rede ou arquivo: cai na ilustração */ }
  }
  return { blob: await ilustracao(cena, legenda, semente), nome: `${cena}.jpg`, descricao: 'Imagem ilustrativa gerada para a demonstração.', fonte: null };
}
