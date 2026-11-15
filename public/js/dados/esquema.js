// Esquema do banco local: coleções, campos, listas de valores e perfis.
//
// Este arquivo é a fonte única do formato dos registros. O painel
// administrativo monta os formulários a partir daqui, a validação confere
// por aqui e, quando houver back-end, é daqui que sai o esquema SQL.

export const VERSAO_ESQUEMA = 1;

export const AREAS = ['Educação', 'Saúde e bem-estar', 'Meio ambiente', 'Geração de renda', 'Cultura e esporte', 'Assistência social'];
export const STATUS_PROJETO = ['Planejado', 'Em execução', 'Concluído', 'Suspenso'];
export const ORIGENS = ['Empresa mantenedora', 'Doação de empresas', 'Doação de pessoas físicas', 'Convênio com poder público', 'Fundações e institutos', 'Rendimentos financeiros', 'Eventos e campanhas'];
export const TIPOS_RECEITA = ['Doação', 'Patrocínio', 'Repasse de convênio', 'Contribuição mensal', 'Rendimento', 'Outras receitas'];
export const CATEGORIAS_DESPESA = ['Pessoal e encargos', 'Material didático e insumos', 'Serviços de terceiros', 'Transporte e logística', 'Alimentação', 'Equipamentos', 'Infraestrutura', 'Comunicação', 'Administrativo'];
export const FORMAS_PAGAMENTO = ['Transferência bancária', 'PIX', 'Boleto', 'Cartão corporativo', 'Débito automático'];
export const TIPOS_PARCEIRO = ['Empresa', 'Poder público', 'Fundação / instituto', 'Organização social', 'Pessoa física'];
export const TIPOS_CONTRATO = ['Contrato', 'Convênio', 'Termo de parceria', 'Acordo de cooperação', 'Aditivo contratual'];
export const SITUACOES_CONTRATO = ['Vigente', 'Encerrado', 'Em prestação de contas', 'Rescindido'];
export const CATEGORIAS_DOCUMENTO = [
  'Estatuto social', 'Regimento interno', 'Relatório de gestão', 'Relatório anual', 'Relatório de atividades',
  'Relatório financeiro', 'Demonstrações contábeis', 'Balanço financeiro', 'Certidão', 'Política institucional',
  'Relatório de auditoria', 'Parecer', 'Prestação de contas', 'Contrato / convênio', 'Nota fiscal / comprovante',
  'Fotografia', 'Outros',
];
/** Categorias que formam a área de prestação de contas de um exercício. */
export const CATEGORIAS_PRESTACAO = ['Relatório financeiro', 'Relatório de atividades', 'Relatório de auditoria', 'Parecer', 'Prestação de contas', 'Demonstrações contábeis', 'Balanço financeiro', 'Relatório anual'];

/** Publicação: nada aparece no portal público antes de aprovado. */
export const PUBLICACAO = { rascunho: 'Rascunho', pendente: 'Aguardando aprovação', publicado: 'Publicado' };

/**
 * Campos por coleção. tipo: texto | area | numero | moeda | data | mes | ano |
 * opcao (opcoes) | ref (outra coleção) | arquivo | marca (checkbox).
 */
export const COLECOES = {
  projetos: {
    nome: 'Projetos', singular: 'projeto', titulo: r => r.nome,
    campos: [
      { k: 'nome', rotulo: 'Nome do projeto', tipo: 'texto', obrig: true },
      { k: 'area', rotulo: 'Área de atuação', tipo: 'opcao', opcoes: AREAS, obrig: true },
      { k: 'status', rotulo: 'Situação', tipo: 'opcao', opcoes: STATUS_PROJETO, obrig: true },
      { k: 'objetivo', rotulo: 'Objetivo', tipo: 'area', obrig: true },
      { k: 'descricao', rotulo: 'Descrição', tipo: 'area' },
      { k: 'local', rotulo: 'Local de execução', tipo: 'texto' },
      { k: 'municipios', rotulo: 'Municípios atendidos', tipo: 'texto', ajuda: 'Separe por ponto e vírgula' },
      { k: 'inicio', rotulo: 'Início', tipo: 'data', obrig: true },
      { k: 'fim', rotulo: 'Término previsto', tipo: 'data' },
      { k: 'responsavel', rotulo: 'Responsável', tipo: 'texto' },
      { k: 'orcamento', rotulo: 'Investimento previsto (R$)', tipo: 'moeda', obrig: true },
      { k: 'metaBeneficiarios', rotulo: 'Meta de beneficiários', tipo: 'numero' },
      { k: 'resultados', rotulo: 'Resultados alcançados', tipo: 'area' },
    ],
  },
  metas: {
    nome: 'Metas', singular: 'meta', titulo: r => r.descricao,
    campos: [
      { k: 'projetoId', rotulo: 'Projeto', tipo: 'ref', ref: 'projetos', obrig: true },
      { k: 'descricao', rotulo: 'Meta', tipo: 'texto', obrig: true },
      { k: 'unidade', rotulo: 'Unidade', tipo: 'texto', obrig: true },
      { k: 'meta', rotulo: 'Quantidade prevista', tipo: 'numero', obrig: true },
      { k: 'realizado', rotulo: 'Quantidade realizada', tipo: 'numero' },
    ],
  },
  atendimentos: {
    nome: 'Atendimentos mensais', singular: 'registro de atendimento', titulo: r => r.mes,
    ajuda: 'Pessoas e famílias atendidas pela primeira vez no mês (não somam quem já foi contado em meses anteriores).',
    campos: [
      { k: 'projetoId', rotulo: 'Projeto', tipo: 'ref', ref: 'projetos', obrig: true },
      { k: 'mes', rotulo: 'Mês', tipo: 'mes', obrig: true },
      { k: 'pessoas', rotulo: 'Novas pessoas atendidas', tipo: 'numero', obrig: true },
      { k: 'familias', rotulo: 'Novas famílias atendidas', tipo: 'numero' },
      { k: 'horas', rotulo: 'Horas de atividade', tipo: 'numero' },
      { k: 'comunidades', rotulo: 'Comunidades alcançadas no mês', tipo: 'numero' },
    ],
  },
  parceiros: {
    nome: 'Parceiros', singular: 'parceiro', titulo: r => r.nome,
    campos: [
      { k: 'nome', rotulo: 'Nome', tipo: 'texto', obrig: true },
      { k: 'tipo', rotulo: 'Tipo', tipo: 'opcao', opcoes: TIPOS_PARCEIRO, obrig: true },
      { k: 'documento', rotulo: 'CNPJ / CPF', tipo: 'texto', ajuda: 'CPF aparece mascarado no portal público' },
      { k: 'municipio', rotulo: 'Município / UF', tipo: 'texto' },
    ],
  },
  receitas: {
    nome: 'Receitas', singular: 'receita', titulo: r => r.descricao || r.tipo,
    campos: [
      { k: 'data', rotulo: 'Data do recebimento', tipo: 'data', obrig: true },
      { k: 'origem', rotulo: 'Origem do recurso', tipo: 'opcao', opcoes: ORIGENS, obrig: true },
      { k: 'parceiroId', rotulo: 'Parceiro ou instituição', tipo: 'ref', ref: 'parceiros', obrig: true },
      { k: 'tipo', rotulo: 'Tipo de receita', tipo: 'opcao', opcoes: TIPOS_RECEITA, obrig: true },
      { k: 'valor', rotulo: 'Valor recebido (R$)', tipo: 'moeda', obrig: true, positivo: true },
      { k: 'projetoId', rotulo: 'Projeto ou finalidade', tipo: 'ref', ref: 'projetos', vazio: 'Institucional (livre aplicação)' },
      { k: 'documentoId', rotulo: 'Documento comprobatório', tipo: 'ref', ref: 'documentos' },
      { k: 'observacoes', rotulo: 'Observações', tipo: 'area' },
    ],
  },
  despesas: {
    nome: 'Despesas', singular: 'despesa', titulo: r => r.descricao,
    campos: [
      { k: 'data', rotulo: 'Data da despesa', tipo: 'data', obrig: true },
      { k: 'fornecedor', rotulo: 'Fornecedor ou beneficiário', tipo: 'texto', obrig: true },
      { k: 'documento', rotulo: 'CNPJ / CPF', tipo: 'texto', ajuda: 'CPF aparece mascarado no portal público. Em branco só para lançamento agregado (folha, encargos)' },
      { k: 'descricao', rotulo: 'Descrição', tipo: 'texto', obrig: true },
      { k: 'categoria', rotulo: 'Categoria', tipo: 'opcao', opcoes: CATEGORIAS_DESPESA, obrig: true },
      { k: 'projetoId', rotulo: 'Projeto', tipo: 'ref', ref: 'projetos', vazio: 'Gestão institucional' },
      { k: 'valor', rotulo: 'Valor (R$)', tipo: 'moeda', obrig: true, positivo: true },
      { k: 'formaPagamento', rotulo: 'Forma de pagamento', tipo: 'opcao', opcoes: FORMAS_PAGAMENTO, obrig: true },
      { k: 'comprovanteId', rotulo: 'Nota fiscal / comprovante', tipo: 'ref', ref: 'documentos' },
      { k: 'aprovador', rotulo: 'Responsável pela aprovação', tipo: 'texto', obrig: true },
    ],
  },
  orcamentos: {
    nome: 'Orçamento aprovado', singular: 'linha de orçamento', titulo: r => `${r.exercicio} · ${r.categoria}`,
    campos: [
      { k: 'exercicio', rotulo: 'Exercício', tipo: 'ano', obrig: true },
      { k: 'projetoId', rotulo: 'Projeto', tipo: 'ref', ref: 'projetos', vazio: 'Gestão institucional' },
      { k: 'categoria', rotulo: 'Categoria', tipo: 'opcao', opcoes: CATEGORIAS_DESPESA, obrig: true },
      { k: 'valor', rotulo: 'Valor aprovado (R$)', tipo: 'moeda', obrig: true },
    ],
  },
  contratos: {
    nome: 'Contratos e parcerias', singular: 'instrumento', titulo: r => `${r.tipo} ${r.numero}`,
    campos: [
      { k: 'numero', rotulo: 'Número', tipo: 'texto', obrig: true },
      { k: 'tipo', rotulo: 'Tipo de instrumento', tipo: 'opcao', opcoes: TIPOS_CONTRATO, obrig: true },
      { k: 'contratoPaiId', rotulo: 'Instrumento original (para aditivos)', tipo: 'ref', ref: 'contratos' },
      { k: 'objeto', rotulo: 'Objeto', tipo: 'area', obrig: true },
      { k: 'parceiroId', rotulo: 'Parte / parceiro', tipo: 'ref', ref: 'parceiros', obrig: true },
      { k: 'projetoId', rotulo: 'Projeto', tipo: 'ref', ref: 'projetos' },
      { k: 'valor', rotulo: 'Valor (R$)', tipo: 'moeda', obrig: true },
      { k: 'inicio', rotulo: 'Início da vigência', tipo: 'data', obrig: true },
      { k: 'fim', rotulo: 'Fim da vigência', tipo: 'data', obrig: true },
      { k: 'situacao', rotulo: 'Situação', tipo: 'opcao', opcoes: SITUACOES_CONTRATO, obrig: true },
      { k: 'documentoId', rotulo: 'Documento (PDF)', tipo: 'ref', ref: 'documentos' },
    ],
  },
  documentos: {
    nome: 'Documentos', singular: 'documento', titulo: r => r.titulo,
    campos: [
      { k: 'titulo', rotulo: 'Título', tipo: 'texto', obrig: true },
      { k: 'categoria', rotulo: 'Categoria', tipo: 'opcao', opcoes: CATEGORIAS_DOCUMENTO, obrig: true },
      { k: 'exercicio', rotulo: 'Exercício', tipo: 'ano', obrig: true },
      { k: 'data', rotulo: 'Data do documento', tipo: 'data', obrig: true },
      { k: 'projetoId', rotulo: 'Projeto relacionado', tipo: 'ref', ref: 'projetos' },
      { k: 'descricao', rotulo: 'Descrição', tipo: 'area' },
      { k: 'arquivo', rotulo: 'Arquivo (PDF, PNG, JPG ou WEBP, até 15 MB)', tipo: 'arquivo', obrig: true },
      { k: 'restrito', rotulo: 'Documento interno — nunca publicar (dados pessoais, bancários ou sigilosos)', tipo: 'marca' },
    ],
  },
};

export const TIPOS_ARQUIVO = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
export const LIMITE_ARQUIVO = 15 * 1024 * 1024;

/**
 * Perfis de acesso. "edita" lista as coleções que o perfil cadastra e altera.
 * Só o administrador aprova e publica: os demais enviam para aprovação.
 * Consulta pública não é perfil de usuário — é quem acessa sem login, e só vê
 * o que está publicado.
 */
export const PERFIS = {
  admin: { nome: 'Administrador', descricao: 'Acesso completo, aprova publicações, gerencia usuários e backup', edita: Object.keys(COLECOES), publica: true, usuarios: true, auditoria: true, backup: true },
  financeiro: { nome: 'Financeiro', descricao: 'Lança e gerencia receitas, despesas, orçamento, parceiros e contratos', edita: ['receitas', 'despesas', 'orcamentos', 'parceiros', 'contratos', 'documentos'] },
  gestor: { nome: 'Gestor de projetos', descricao: 'Gerencia projetos, metas, atendimentos e documentos dos projetos', edita: ['projetos', 'metas', 'atendimentos', 'documentos'] },
  auditor: { nome: 'Auditor', descricao: 'Consulta e confere todos os registros e o histórico de alterações, sem editar', edita: [], auditoria: true },
};

export const podeEditar = (usuario, colecao) => !!usuario && (PERFIS[usuario.perfil]?.edita || []).includes(colecao);
export const pode = (usuario, acao) => !!usuario && !!PERFIS[usuario.perfil]?.[acao];
