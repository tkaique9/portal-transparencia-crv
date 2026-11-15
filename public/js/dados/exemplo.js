// DADOS DE EXEMPLO — tudo aqui é fictício.
//
// Nomes de projetos, parceiros, fornecedores, municípios, valores, CNPJs e
// CPFs foram inventados para demonstrar o portal. Nenhum corresponde a
// informação real do Instituto CRV. Todo registro sai com `exemplo: true`,
// e o painel administrativo remove todos de uma vez ("Remover dados de
// exemplo"), preservando o que tiver sido cadastrado de verdade.
//
// A geração é determinística (semente fixa): a mesma carga sempre produz os
// mesmos números, o que permite conferir o painel contra os testes.

import { aleatorio, novoId, soma, fmtMoeda, fmtData, MESES_LONGOS } from '../util.js';
import { CATEGORIAS_DESPESA } from './esquema.js';
import { documentoVazio, salvarBlob } from './db.js';
import { iniciarPDF, rodapePDF, tabelaPDF } from '../export/exportar.js';
import { porChave } from '../calculo.js';

const ULTIMO_MES = '2026-10'; // lançamentos até outubro de 2026
const SEMENTE = 20261115;

const MUN = { a: 'Nova Aurora', b: 'Vale Verde', c: 'Serra Azul', d: 'Rio Claro do Sul', e: 'Boa Vista do Campo', f: 'Lagoa Dourada' };

const PROJETOS = [
  { k: 'educar', nome: 'Educar no Campo', area: 'Educação', status: 'Em execução', inicio: '2025-02-03', fim: '2026-12-18', orcamento: 1850000, metaBeneficiarios: 1200, municipios: [MUN.a, MUN.b, MUN.c], local: 'Escolas rurais municipais', responsavel: 'Coordenação de Educação (exemplo)',
    objetivo: 'Reforçar a aprendizagem de leitura, escrita e matemática de estudantes do ensino fundamental em escolas rurais.',
    descricao: 'Aulas de reforço no contraturno, formação continuada de professores, kits de material didático e transporte dos estudantes até os polos de atividade.',
    resultados: 'Aumento médio de 18 pontos na avaliação diagnóstica de leitura entre a entrada e a última medição; 96 professores formados.',
    metas: [['Estudantes atendidos no contraturno', 'estudantes', 1200, 1130], ['Professores formados', 'professores', 100, 96], ['Kits de material didático entregues', 'kits', 1300, 1300]],
    pesos: { 'Pessoal e encargos': 38, 'Material didático e insumos': 18, 'Transporte e logística': 16, 'Alimentação': 14, 'Serviços de terceiros': 10, 'Comunicação': 4 } },
  { k: 'saude', nome: 'Saúde em Movimento', area: 'Saúde e bem-estar', status: 'Em execução', inicio: '2025-03-03', fim: '2027-02-26', orcamento: 1420000, metaBeneficiarios: 2600, municipios: [MUN.b, MUN.e], local: 'Unidade móvel e centros comunitários', responsavel: 'Coordenação de Saúde (exemplo)',
    objetivo: 'Levar prevenção em saúde, triagem e orientação nutricional a comunidades distantes dos serviços de saúde.',
    descricao: 'Unidade móvel com equipe multiprofissional que circula pelas comunidades em calendário fixo, com encaminhamento à rede pública.',
    resultados: 'Triagens realizadas em todas as comunidades previstas; 312 encaminhamentos acompanhados até o atendimento na rede pública.',
    metas: [['Pessoas triadas', 'pessoas', 2600, 1980], ['Ações de prevenção nas comunidades', 'ações', 160, 118], ['Encaminhamentos acompanhados', 'encaminhamentos', 400, 312]],
    pesos: { 'Pessoal e encargos': 44, 'Serviços de terceiros': 18, 'Transporte e logística': 14, 'Material didático e insumos': 12, 'Equipamentos': 8, 'Comunicação': 4 } },
  { k: 'viveiro', nome: 'Viveiro Comunitário de Mudas Nativas', area: 'Meio ambiente', status: 'Em execução', inicio: '2025-04-01', fim: '2026-12-15', orcamento: 760000, metaBeneficiarios: 600, municipios: [MUN.c, MUN.d], local: 'Viveiro comunitário e áreas de nascentes', responsavel: 'Coordenação Ambiental (exemplo)',
    objetivo: 'Produzir mudas nativas e recuperar nascentes com participação de produtores e escolas da região.',
    descricao: 'Estruturação de viveiro comunitário, oficinas de educação ambiental e plantio assistido em áreas de preservação.',
    resultados: '41 mil mudas produzidas e 27 nascentes cercadas e em recuperação.',
    metas: [['Mudas nativas produzidas', 'mudas', 50000, 41000], ['Nascentes em recuperação', 'nascentes', 30, 27], ['Oficinas de educação ambiental', 'oficinas', 60, 60]],
    pesos: { 'Infraestrutura': 26, 'Material didático e insumos': 24, 'Pessoal e encargos': 28, 'Serviços de terceiros': 12, 'Transporte e logística': 10 } },
  { k: 'renda', nome: 'Renda na Roça — Capacitação Profissional', area: 'Geração de renda', status: 'Concluído', inicio: '2025-01-13', fim: '2025-12-19', orcamento: 980000, metaBeneficiarios: 450, municipios: [MUN.a, MUN.f], local: 'Centros de capacitação', responsavel: 'Coordenação de Trabalho e Renda (exemplo)',
    objetivo: 'Capacitar jovens e adultos em ofícios com demanda local e apoiar a formação de pequenos empreendimentos.',
    descricao: 'Cursos de operação de máquinas, panificação, costura e gestão de pequenos negócios, com acompanhamento após a formação.',
    resultados: '462 pessoas certificadas; 38 empreendimentos formalizados; 61% dos egressos com ocupação seis meses depois.',
    metas: [['Pessoas certificadas', 'pessoas', 450, 462], ['Empreendimentos formalizados', 'empreendimentos', 40, 38], ['Cursos ofertados', 'cursos', 24, 24]],
    pesos: { 'Pessoal e encargos': 36, 'Material didático e insumos': 22, 'Serviços de terceiros': 18, 'Equipamentos': 12, 'Alimentação': 8, 'Comunicação': 4 } },
  { k: 'esporte', nome: 'Esporte para Todos', area: 'Cultura e esporte', status: 'Em execução', inicio: '2025-06-02', fim: '2026-12-11', orcamento: 640000, metaBeneficiarios: 900, municipios: [MUN.e, MUN.a, MUN.d], local: 'Quadras e campos comunitários', responsavel: 'Coordenação de Esporte e Cultura (exemplo)',
    objetivo: 'Oferecer prática esportiva orientada a crianças e adolescentes no contraturno escolar.',
    descricao: 'Turmas de futsal, vôlei, atletismo e capoeira com professores de educação física, uniformes e lanche.',
    resultados: 'Frequência média de 82% nas turmas; três festivais esportivos intermunicipais realizados.',
    metas: [['Crianças e adolescentes matriculados', 'participantes', 900, 860], ['Turmas em funcionamento', 'turmas', 36, 34], ['Festivais esportivos', 'festivais', 4, 3]],
    pesos: { 'Pessoal e encargos': 42, 'Equipamentos': 16, 'Alimentação': 18, 'Transporte e logística': 12, 'Comunicação': 4, 'Material didático e insumos': 8 } },
  { k: 'familias', nome: 'Rede de Apoio às Famílias', area: 'Assistência social', status: 'Em execução', inicio: '2026-02-02', fim: '2027-01-29', orcamento: 1100000, metaBeneficiarios: 2000, municipios: [MUN.f, MUN.b, MUN.c], local: 'Centros comunitários', responsavel: 'Coordenação Social (exemplo)',
    objetivo: 'Acompanhar famílias em situação de vulnerabilidade, com orientação, encaminhamento e apoio emergencial.',
    descricao: 'Equipe de assistentes sociais, grupos de convivência, cestas emergenciais e articulação com a rede de proteção social.',
    resultados: 'Em andamento: 540 famílias com plano de acompanhamento ativo.',
    metas: [['Famílias com plano de acompanhamento', 'famílias', 650, 540], ['Encontros de grupos de convivência', 'encontros', 180, 112], ['Cestas emergenciais entregues', 'cestas', 2400, 1650]],
    pesos: { 'Pessoal e encargos': 40, 'Alimentação': 30, 'Transporte e logística': 10, 'Serviços de terceiros': 12, 'Comunicação': 4, 'Administrativo': 4 } },
  { k: 'biblioteca', nome: 'Biblioteca Itinerante', area: 'Educação', status: 'Planejado', inicio: '2027-02-01', fim: '2027-12-17', orcamento: 380000, metaBeneficiarios: 1500, municipios: [MUN.d, MUN.e], local: 'Ônibus-biblioteca', responsavel: 'Coordenação de Educação (exemplo)',
    objetivo: 'Levar acervo e mediação de leitura a comunidades rurais sem biblioteca.',
    descricao: 'Ônibus adaptado com acervo, contação de histórias e empréstimo de livros, em roteiro mensal.',
    resultados: '', metas: [['Comunidades no roteiro', 'comunidades', 24, 0], ['Empréstimos de livros', 'empréstimos', 6000, 0]], pesos: {}, publicacao: 'pendente' },
];

const PARCEIROS = [
  ['mant', 'Agroindústria Alfa S.A. (exemplo)', 'Empresa', 'Município Sede (exemplo)'],
  ['coop', 'Cooperativa Beta de Produtores (exemplo)', 'Empresa', MUN.b],
  ['gama', 'Fundação Gama de Desenvolvimento (exemplo)', 'Fundação / instituto', 'Capital do estado (exemplo)'],
  ['pref', `Prefeitura Municipal de ${MUN.a} (exemplo)`, 'Poder público', MUN.a],
  ['prefvv', `Prefeitura Municipal de ${MUN.b} (exemplo)`, 'Poder público', MUN.b],
  ['see', 'Secretaria Estadual de Educação (exemplo)', 'Poder público', 'Capital do estado (exemplo)'],
  ['banco', 'Banco Delta — aplicações financeiras (exemplo)', 'Empresa', 'Capital do estado (exemplo)'],
  ['epsilon', 'Comércio Épsilon Ltda. (exemplo)', 'Empresa', MUN.f],
  ['zeta', 'Instituto Zeta (exemplo)', 'Fundação / instituto', 'Capital do estado (exemplo)'],
  ['pf', 'Doadores pessoas físicas — campanha anual (exemplo)', 'Pessoa física', ''],
];

const FORNECEDORES = {
  'Pessoal e encargos': [['Folha de pagamento — equipe do projeto (exemplo)', ''], ['Encargos sociais — INSS/FGTS (exemplo)', '']],
  'Material didático e insumos': [['Papelaria Ômega Ltda. (exemplo)', 'cnpj'], ['Distribuidora Sigma de Insumos (exemplo)', 'cnpj']],
  'Serviços de terceiros': [['Consultoria Kappa Ltda. (exemplo)', 'cnpj'], ['Ana Exemplo Ferreira — instrutora (exemplo)', 'cpf'], ['João Exemplo Souza — oficineiro (exemplo)', 'cpf']],
  'Transporte e logística': [['Transportes Lambda Ltda. (exemplo)', 'cnpj']],
  'Alimentação': [['Alimentos Rho Ltda. (exemplo)', 'cnpj'], ['Mercado Tau (exemplo)', 'cnpj']],
  'Equipamentos': [['Equipamentos Phi Ltda. (exemplo)', 'cnpj']],
  'Infraestrutura': [['Construtora Psi Ltda. (exemplo)', 'cnpj']],
  'Comunicação': [['Gráfica Chi (exemplo)', 'cnpj']],
  'Administrativo': [['Contabilidade Iota (exemplo)', 'cnpj'], ['Serviços de TI Nu (exemplo)', 'cnpj']],
};
const DESCRICOES = {
  'Pessoal e encargos': ['Remuneração da equipe técnica', 'Encargos trabalhistas do mês'],
  'Material didático e insumos': ['Material didático e de consumo', 'Insumos para as atividades'],
  'Serviços de terceiros': ['Prestação de serviços especializados', 'Oficinas e instrutoria'],
  'Transporte e logística': ['Transporte dos participantes', 'Frete e deslocamento da equipe'],
  'Alimentação': ['Lanches e refeições das atividades', 'Gêneros alimentícios'],
  'Equipamentos': ['Aquisição de equipamentos', 'Manutenção de equipamentos'],
  'Infraestrutura': ['Adequação de espaço físico', 'Materiais de construção e reparo'],
  'Comunicação': ['Impressos e divulgação', 'Material de comunicação'],
  'Administrativo': ['Serviços contábeis', 'Despesas administrativas'],
};
const APROVADORES = ['Diretoria Executiva (exemplo)', 'Gerência Financeira (exemplo)', 'Coordenação do projeto (exemplo)'];
const FORMAS = ['Transferência bancária', 'PIX', 'Boleto'];

const r2 = v => Math.round(v * 100) / 100;

function mesesEntre(ini, fim) {
  const out = [];
  let [a, m] = ini.slice(0, 7).split('-').map(Number);
  const lim = fim.slice(0, 7) < ULTIMO_MES ? fim.slice(0, 7) : ULTIMO_MES;
  while (`${a}-${String(m).padStart(2, '0')}` <= lim) { out.push(`${a}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; a++; } }
  return out;
}
function totalMeses(ini, fim) {
  const [a1, m1] = ini.split('-').map(Number); const [a2, m2] = fim.split('-').map(Number);
  return (a2 - a1) * 12 + (m2 - m1) + 1;
}

/** Monta o documento com todas as coleções e grava os arquivos de exemplo. */
export async function gerarExemplo(aoProgresso = () => {}) {
  const rnd = aleatorio(SEMENTE);
  const entre = (a, b) => a + (b - a) * rnd();
  const um = lista => lista[Math.floor(rnd() * lista.length)];
  const dia = (mes, min = 2, max = 27) => `${mes}-${String(Math.floor(entre(min, max + 1))).padStart(2, '0')}`;
  const cnpj = () => { const d = () => Math.floor(rnd() * 10); return `00.${d()}${d()}${d()}.${d()}${d()}${d()}/0001-${d()}${d()}`; };
  const cpf = () => { const d = () => Math.floor(rnd() * 10); return `${d()}${d()}${d()}.${d()}${d()}${d()}.${d()}${d()}${d()}-${d()}${d()}`; };

  const doc = documentoVazio();
  doc.config.demonstracao = true;
  const C = doc.colecoes;
  const agora = new Date().toISOString();
  const meta = (extra = {}) => ({ exemplo: true, publicacao: 'publicado', criadoEm: agora, criadoPor: 'carga-de-exemplo', atualizadoEm: agora, atualizadoPor: 'carga-de-exemplo', publicadoEm: agora, publicadoPor: 'carga-de-exemplo', ...extra });

  // ---- parceiros
  const P = {};
  for (const [k, nome, tipo, municipio] of PARCEIROS) {
    const r = { id: novoId('par-'), nome, tipo, documento: tipo === 'Pessoa física' ? '' : cnpj(), municipio, ...meta() };
    P[k] = r; C.parceiros.push(r);
  }

  // ---- projetos, metas
  const PR = {};
  for (const p of PROJETOS) {
    const r = { id: novoId('pro-'), nome: p.nome, area: p.area, status: p.status, objetivo: p.objetivo, descricao: p.descricao, local: p.local, municipios: p.municipios.join('; '), inicio: p.inicio, fim: p.fim, responsavel: p.responsavel, orcamento: p.orcamento, metaBeneficiarios: p.metaBeneficiarios, resultados: p.resultados, ...meta(p.publicacao ? { publicacao: p.publicacao, publicadoEm: null, publicadoPor: null } : {}) };
    PR[p.k] = r; C.projetos.push(r);
    for (const [descricao, unidade, m, real] of p.metas) C.metas.push({ id: novoId('met-'), projetoId: r.id, descricao, unidade, meta: m, realizado: real, ...meta() });
  }

  // ---- despesas, receitas e atendimentos de cada projeto, mês a mês
  const fornecedorDoc = new Map();
  const docFornecedor = (nome, tipo) => {
    if (!fornecedorDoc.has(nome)) fornecedorDoc.set(nome, tipo === 'cpf' ? cpf() : cnpj());
    return fornecedorDoc.get(nome);
  };
  for (const p of PROJETOS) {
    const pr = PR[p.k];
    const meses = mesesEntre(p.inicio, p.fim);
    if (!meses.length) continue;
    const duracao = totalMeses(p.inicio.slice(0, 7), p.fim.slice(0, 7));
    const porMes = p.orcamento / duracao;
    const fatorExec = p.status === 'Concluído' ? 0.985 : entre(0.86, 0.97);
    const somaPesos = soma(Object.values(p.pesos));
    const alvo = Math.round(p.metaBeneficiarios * (p.status === 'Concluído' ? 1.03 : entre(0.9, 1.02) * Math.min(1, meses.length / duracao * 1.12)));
    const pesoTotal = meses.length * (meses.length + 1) / 2;
    let restante = alvo;
    meses.forEach((mes, i) => {
      // despesas: uma por categoria, com variação; equipamento e infraestrutura concentrados no começo
      for (const [cat, peso] of Object.entries(p.pesos)) {
        let fator = 1;
        if (cat === 'Equipamentos' || cat === 'Infraestrutura') fator = i < 4 ? 3.2 : i % 4 === 0 ? 0.6 : 0;
        const valor = r2(porMes * fatorExec * peso / somaPesos * fator * entre(0.82, 1.18));
        if (valor < 50) continue;
        const [fornecedor, tipoDoc] = um(FORNECEDORES[cat]);
        C.despesas.push({ id: novoId('des-'), data: dia(mes), fornecedor, documento: tipoDoc ? docFornecedor(fornecedor, tipoDoc) : '', descricao: `${um(DESCRICOES[cat])} — ${p.nome}`, categoria: cat, projetoId: pr.id, valor, formaPagamento: cat === 'Pessoal e encargos' ? 'Transferência bancária' : um(FORMAS), comprovanteId: null, aprovador: um(APROVADORES), ...meta() });
      }
      // receitas: mantenedora todo mês, parceiros por projeto, a cada trimestre
      C.receitas.push({ id: novoId('rec-'), data: dia(mes, 3, 8), origem: 'Empresa mantenedora', parceiroId: P.mant.id, tipo: 'Contribuição mensal', valor: r2(porMes * entre(0.6, 0.7)), projetoId: pr.id, documentoId: null, observacoes: '', ...meta() });
      if (i % 3 === 0) {
        const fonte = { educar: ['pref', 'Convênio com poder público', 'Repasse de convênio'], saude: ['prefvv', 'Convênio com poder público', 'Repasse de convênio'], viveiro: ['gama', 'Fundações e institutos', 'Doação'], renda: ['coop', 'Doação de empresas', 'Patrocínio'], esporte: ['epsilon', 'Doação de empresas', 'Patrocínio'], familias: ['zeta', 'Fundações e institutos', 'Doação'] }[p.k];
        C.receitas.push({ id: novoId('rec-'), data: dia(mes, 10, 20), origem: fonte[1], parceiroId: P[fonte[0]].id, tipo: fonte[2], valor: r2(porMes * 3 * entre(0.32, 0.42)), projetoId: pr.id, documentoId: null, observacoes: fonte[2] === 'Repasse de convênio' ? 'Parcela trimestral do convênio' : '', ...meta() });
      }
      // atendimentos: entrada maior no começo do projeto, depois em ritmo menor (peso decrescente)
      const novas = i === meses.length - 1 ? Math.max(0, Math.round(restante)) : Math.min(Math.round(restante), Math.round(alvo * (meses.length - i) / pesoTotal * entre(0.9, 1.1)));
      restante -= novas;
      C.atendimentos.push({ id: novoId('ate-'), projetoId: pr.id, mes, pessoas: novas, familias: Math.round(novas / entre(2.8, 3.6)), horas: Math.round(entre(220, 420) * (p.pesos['Pessoal e encargos'] || 30) / 30), comunidades: Math.round(entre(3, 9)), ...meta() });
    });
  }

  // ---- receitas e despesas institucionais (sem projeto)
  for (const mes of mesesEntre('2025-01-01', '2026-12-31')) {
    C.receitas.push({ id: novoId('rec-'), data: dia(mes, 3, 6), origem: 'Empresa mantenedora', parceiroId: P.mant.id, tipo: 'Contribuição mensal', valor: r2(entre(58000, 64000)), projetoId: null, documentoId: null, observacoes: 'Custeio institucional', ...meta() });
    C.receitas.push({ id: novoId('rec-'), data: `${mes}-28`, origem: 'Rendimentos financeiros', parceiroId: P.banco.id, tipo: 'Rendimento', valor: r2(entre(3800, 7200)), projetoId: null, documentoId: null, observacoes: 'Rendimento de aplicação dos recursos em caixa', ...meta() });
    C.receitas.push({ id: novoId('rec-'), data: dia(mes), origem: 'Doação de pessoas físicas', parceiroId: P.pf.id, tipo: 'Doação', valor: r2(entre(2500, 9000) * (mes.endsWith('-12') ? 4 : 1)), projetoId: null, documentoId: null, observacoes: 'Doações recebidas pelo site e por PIX (valores agregados no mês)', ...meta() });
    for (const [cat, base] of [['Administrativo', 14000], ['Pessoal e encargos', 46000], ['Comunicação', 3500]]) {
      const [fornecedor, tipoDoc] = cat === 'Pessoal e encargos' ? ['Folha de pagamento — equipe institucional (exemplo)', ''] : um(FORNECEDORES[cat]);
      C.despesas.push({ id: novoId('des-'), data: dia(mes), fornecedor, documento: tipoDoc ? docFornecedor(fornecedor, tipoDoc) : '', descricao: `${um(DESCRICOES[cat])} — gestão institucional`, categoria: cat, projetoId: null, valor: r2(base * entre(0.85, 1.15)), formaPagamento: um(FORMAS), comprovanteId: null, aprovador: APROVADORES[0], ...meta() });
    }
  }
  for (const [mes, valor, k] of [['2025-06', 85400, 'epsilon'], ['2025-11', 132800, 'coop'], ['2026-06', 96250, 'epsilon']]) {
    C.receitas.push({ id: novoId('rec-'), data: `${mes}-21`, origem: 'Eventos e campanhas', parceiroId: P[k].id, tipo: 'Outras receitas', valor, projetoId: null, documentoId: null, observacoes: 'Arrecadação de evento beneficente', ...meta() });
  }
  // um pagamento a pessoa física (CPF mascarado no portal)
  C.despesas.push({ id: novoId('des-'), data: '2026-09-15', fornecedor: 'Maria Exemplo da Silva', documento: '123.456.789-09', descricao: 'Oficina de artesanato — Rede de Apoio às Famílias', categoria: 'Serviços de terceiros', projetoId: PR.familias.id, valor: 2400, formaPagamento: 'PIX', comprovanteId: null, aprovador: APROVADORES[2], ...meta() });
  // fluxo de aprovação: últimos lançamentos ainda não publicados
  C.despesas.filter(d => d.data >= '2026-10-15').slice(0, 3).forEach(d => Object.assign(d, { publicacao: 'pendente', publicadoEm: null, publicadoPor: null }));
  C.receitas.filter(r => r.data >= '2026-10-27').slice(0, 1).forEach(r => Object.assign(r, { publicacao: 'rascunho', publicadoEm: null, publicadoPor: null }));

  // ---- orçamento aprovado por exercício, projeto e categoria
  for (const ano of [2025, 2026]) {
    for (const p of PROJETOS.filter(p => Object.keys(p.pesos).length)) {
      const mesesAno = mesesEntre(p.inicio, p.fim).filter(m => m.startsWith(String(ano))).length +
        (ano === 2026 ? Math.max(0, totalMeses('2026-11', (p.fim < '2026-12-31' ? p.fim : '2026-12-31').slice(0, 7))) : 0);
      if (!mesesAno) continue;
      const totalAno = p.orcamento / totalMeses(p.inicio.slice(0, 7), p.fim.slice(0, 7)) * mesesAno;
      const sp = soma(Object.values(p.pesos));
      for (const [cat, peso] of Object.entries(p.pesos)) {
        let v = totalAno * peso / sp;
        if (cat === 'Equipamentos' || cat === 'Infraestrutura') v *= ano === Number(p.inicio.slice(0, 4)) ? 1.6 : 0.4;
        C.orcamentos.push({ id: novoId('orc-'), exercicio: ano, projetoId: PR[p.k].id, categoria: cat, valor: Math.round(v / 100) * 100, ...meta() });
      }
    }
    for (const [cat, v] of [['Administrativo', 175000], ['Pessoal e encargos', 560000], ['Comunicação', 40000]]) {
      C.orcamentos.push({ id: novoId('orc-'), exercicio: ano, projetoId: null, categoria: cat, valor: v, ...meta() });
    }
  }

  // ---- contratos, convênios e parcerias
  const CONTRATOS = [
    ['CV-001/2025', 'Convênio', 'pref', 'educar', 640000, '2025-02-01', '2026-12-31', 'Vigente', 'Cooperação para execução do reforço escolar no contraturno nas escolas rurais municipais, com cessão de espaço e transporte complementar.'],
    ['AC-002/2025', 'Acordo de cooperação', 'see', 'educar', 0.01, '2025-03-10', '2027-03-09', 'Vigente', 'Cooperação técnica para formação continuada de professores, sem transferência de recursos.'],
    ['CT-014/2025', 'Contrato', 'lambda', 'educar', 268000, '2025-02-15', '2026-02-14', 'Encerrado', 'Prestação de serviço de transporte de estudantes entre as comunidades e os polos de atividade.'],
    ['CV-003/2025', 'Convênio', 'prefvv', 'saude', 420000, '2025-03-01', '2027-02-28', 'Vigente', 'Execução conjunta de ações de prevenção e triagem em saúde, com encaminhamento à rede municipal.'],
    ['TP-004/2025', 'Termo de parceria', 'gama', 'viveiro', 260000, '2025-04-01', '2026-12-31', 'Vigente', 'Apoio financeiro à implantação do viveiro comunitário e às oficinas de educação ambiental.'],
    ['TP-005/2025', 'Termo de parceria', 'coop', 'renda', 300000, '2025-01-10', '2025-12-31', 'Em prestação de contas', 'Patrocínio dos cursos de capacitação profissional e da feira de empreendimentos.'],
    ['CT-021/2025', 'Contrato', 'auditoria', null, 48000, '2025-09-01', '2026-08-31', 'Encerrado', 'Auditoria independente das demonstrações contábeis do exercício de 2025.'],
    ['TP-007/2026', 'Termo de parceria', 'zeta', 'familias', 340000, '2026-02-01', '2027-01-31', 'Vigente', 'Apoio às ações de acompanhamento familiar e ao fornecimento de cestas emergenciais.'],
    ['CT-009/2026', 'Contrato', 'rho', 'familias', 310000, '2026-02-10', '2027-01-31', 'Vigente', 'Fornecimento de gêneros alimentícios para cestas emergenciais e lanches das atividades.'],
  ];
  const extra = { lambda: ['Transportes Lambda Ltda. (exemplo)', 'Empresa'], auditoria: ['Auditores Independentes Mu (exemplo)', 'Empresa'], rho: ['Alimentos Rho Ltda. (exemplo)', 'Empresa'] };
  for (const [k, [nome, tipo]] of Object.entries(extra)) { P[k] = { id: novoId('par-'), nome, tipo, documento: cnpj(), municipio: MUN.a, ...meta() }; C.parceiros.push(P[k]); }
  const CT = {};
  for (const [numero, tipo, par, proj, valor, inicio, fim, situacao, objeto] of CONTRATOS) {
    CT[numero] = { id: novoId('con-'), numero, tipo, contratoPaiId: null, objeto, parceiroId: P[par].id, projetoId: proj ? PR[proj].id : null, valor: valor < 1 ? 0 : valor, inicio, fim, situacao, documentoId: null, ...meta() };
    C.contratos.push(CT[numero]);
  }
  CT['CT-014/2025-A1'] = { id: novoId('con-'), numero: 'CT-014/2025 — 1º aditivo', tipo: 'Aditivo contratual', contratoPaiId: CT['CT-014/2025'].id, objeto: 'Prorrogação do prazo por 10 meses e acréscimo de 25% no valor, pela inclusão de duas novas rotas.', parceiroId: P.lambda.id, projetoId: PR.educar.id, valor: 67000, inicio: '2026-02-15', fim: '2026-12-18', situacao: 'Vigente', documentoId: null, ...meta() };
  C.contratos.push(CT['CT-014/2025-A1']);

  aoProgresso('Gerando documentos em PDF…');
  await gerarDocumentos(doc, { PR, P, CT, rnd });
  aoProgresso('Gerando fotos ilustrativas…');
  await gerarFotos(doc, PR);
  return doc;
}

// ------------------------------------------------------------ documentos

async function pdfExemplo(titulo, subtitulo, corpo) {
  const d = iniciarPDF({ titulo, subtitulo, demonstracao: true });
  d.titulo(titulo);
  corpo(d);
  return d.blob(rodapePDF());
}

const LOREM = {
  estatuto: ['CAPÍTULO I — DA DENOMINAÇÃO, SEDE E FINALIDADE', 'Art. 1º O Instituto (exemplo) é associação civil de direito privado, sem fins lucrativos, com prazo de duração indeterminado. Este texto é ilustrativo e não reproduz o estatuto real de nenhuma instituição.', 'Art. 2º São finalidades do Instituto promover a educação, a saúde, a preservação do meio ambiente, a geração de trabalho e renda, a cultura, o esporte e a assistência social nas comunidades de sua área de atuação.', 'CAPÍTULO II — DA TRANSPARÊNCIA', 'Art. 3º O Instituto dará publicidade, por meio eletrônico, às suas demonstrações contábeis, relatórios de atividades, contratos e parcerias firmadas e à aplicação dos recursos recebidos.', 'Art. 4º É vedada a distribuição de resultados, bonificações ou vantagens a dirigentes, associados ou mantenedores, sob qualquer forma.'],
  regimento: ['Este regimento interno (exemplo) disciplina o funcionamento dos órgãos de administração do Instituto: Assembleia Geral, Conselho de Administração, Conselho Fiscal e Diretoria Executiva.', 'As compras e contratações observam cotação com no mínimo três fornecedores acima do valor de alçada, registro do processo e aprovação pela instância competente.', 'Todo pagamento exige documento fiscal hábil, conferência do recebimento e aprovação de responsável distinto de quem solicitou a despesa.'],
  privacidade: ['Esta política (exemplo) descreve como o Instituto trata dados pessoais, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD).', 'O Portal de Transparência não publica dados bancários, documentos pessoais, endereços ou dados de saúde de beneficiários. Pagamentos a pessoas físicas são exibidos com CPF parcialmente mascarado.', 'Os dados de beneficiários são usados apenas de forma agregada nos indicadores de impacto. O titular pode exercer seus direitos pelo canal do encarregado de dados.'],
  conduta: ['Este código (exemplo) orienta a conduta de dirigentes, colaboradores, voluntários e parceiros.', 'É vedado oferecer, prometer ou receber vantagem indevida. Conflitos de interesse devem ser declarados e registrados.', 'Denúncias podem ser feitas de forma anônima pelo canal de ética, com garantia de não retaliação.'],
};

async function gerarDocumentos(doc, { PR, P, CT }) {
  const C = doc.colecoes;
  const agora = new Date().toISOString();
  const meta = { exemplo: true, publicacao: 'publicado', criadoEm: agora, criadoPor: 'carga-de-exemplo', atualizadoEm: agora, atualizadoPor: 'carga-de-exemplo', publicadoEm: agora, publicadoPor: 'carga-de-exemplo' };
  const add = async (titulo, categoria, exercicio, data, blob, extra = {}) => {
    const arquivo = await salvarBlob(blob, `${titulo.replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 80)}.pdf`);
    const r = { id: novoId('doc-'), titulo, categoria, exercicio, data, projetoId: null, descricao: '', arquivo, restrito: false, ...meta, ...extra };
    C.documentos.push(r);
    return r;
  };
  const texto = linhas => d => linhas.forEach(l => {
    const cap = /^(CAPÍTULO|Art\.)/.test(l) && l === l.toUpperCase();
    d.paragrafo(l, { negrito: cap, tam: cap ? 10.5 : 10 }); d.y += 6;
  });

  await add('Estatuto Social', 'Estatuto social', 2024, '2024-03-18', await pdfExemplo('Estatuto Social', 'Consolidado em 18/03/2024', texto(LOREM.estatuto)), { descricao: 'Estatuto consolidado, com as alterações aprovadas em assembleia.' });
  await add('Regimento Interno', 'Regimento interno', 2024, '2024-05-06', await pdfExemplo('Regimento Interno', 'Aprovado pelo Conselho de Administração', texto(LOREM.regimento)));
  await add('Política de Privacidade e Proteção de Dados (LGPD)', 'Política institucional', 2025, '2025-01-20', await pdfExemplo('Política de Privacidade e Proteção de Dados', 'Lei nº 13.709/2018', texto(LOREM.privacidade)));
  await add('Código de Ética e Conduta', 'Política institucional', 2025, '2025-01-20', await pdfExemplo('Código de Ética e Conduta', '', texto(LOREM.conduta)));
  await add('Política de Compras e Contratações', 'Política institucional', 2025, '2025-02-10', await pdfExemplo('Política de Compras e Contratações', '', texto(LOREM.regimento.slice(1))));

  // relatórios financeiros com os números da própria carga
  for (const ano of [2025, 2026]) {
    const rec = C.receitas.filter(r => r.data.startsWith(String(ano)));
    const des = C.despesas.filter(r => r.data.startsWith(String(ano)));
    const parcial = ano === 2026;
    const periodo = parcial ? 'janeiro a outubro de 2026' : 'exercício de 2025';
    const tabelaFin = d => {
      d.paragrafo(`Período: ${periodo}. Valores em reais. Documento de demonstração gerado a partir dos dados de exemplo do portal.`, { tam: 9, cor: '#5a6578' });
      d.y += 6;
      d.paragrafo('Receitas por origem', { negrito: true, tam: 11 });
      tabelaPDF(d, [{ titulo: 'Origem', larg: 3 }, { titulo: 'Lançamentos', tipo: 'int' }, { titulo: 'Valor', tipo: 'moeda', larg: 1.4 }], porChave(rec, 'origem').map(x => [x.rotulo, x.n, x.valor]), ['Total', rec.length, soma(rec, r => r.valor)]);
      d.paragrafo('Despesas por categoria', { negrito: true, tam: 11 });
      tabelaPDF(d, [{ titulo: 'Categoria', larg: 3 }, { titulo: 'Lançamentos', tipo: 'int' }, { titulo: 'Valor', tipo: 'moeda', larg: 1.4 }], porChave(des, 'categoria').map(x => [x.rotulo, x.n, x.valor]), ['Total', des.length, soma(des, r => r.valor)]);
      d.paragrafo(`Resultado do período: ${fmtMoeda(soma(rec, r => r.valor) - soma(des, r => r.valor))}.`, { negrito: true });
    };
    if (!parcial) {
      await add('Demonstrações Contábeis 2025', 'Demonstrações contábeis', 2025, '2026-03-27', await pdfExemplo('Demonstrações Contábeis 2025', 'Exercício encerrado em 31/12/2025', tabelaFin));
      await add('Balanço Patrimonial 2025', 'Balanço financeiro', 2025, '2026-03-27', await pdfExemplo('Balanço Patrimonial 2025', 'Em 31/12/2025', d => {
        d.paragrafo('Balanço patrimonial ilustrativo (exemplo).', { tam: 9, cor: '#5a6578' }); d.y += 4;
        const caixa = soma(rec, r => r.valor) - soma(des, r => r.valor);
        tabelaPDF(d, [{ titulo: 'Conta', larg: 3 }, { titulo: 'Valor', tipo: 'moeda' }], [['Ativo circulante — caixa e aplicações', caixa + 412000], ['Ativo não circulante — imobilizado', 286500], ['Passivo circulante — obrigações trabalhistas e fornecedores', 198400], ['Patrimônio social', caixa + 412000 + 286500 - 198400]]);
      }));
      await add('Relatório Financeiro 2025', 'Relatório financeiro', 2025, '2026-02-20', await pdfExemplo('Relatório Financeiro 2025', 'Execução orçamentária do exercício', tabelaFin));
      await add('Relatório Anual de Atividades 2025', 'Relatório anual', 2025, '2026-03-30', await pdfExemplo('Relatório Anual 2025', 'Atividades e resultados', d => {
        for (const p of PROJETOS.filter(p => p.inicio < '2026')) { d.paragrafo(p.nome, { negrito: true, tam: 11 }); d.paragrafo(p.objetivo); d.paragrafo('Resultados: ' + p.resultados, { cor: '#3a4558' }); d.y += 8; }
      }));
      await add('Relatório de Gestão 2025', 'Relatório de gestão', 2025, '2026-03-30', await pdfExemplo('Relatório de Gestão 2025', 'Diretoria Executiva', texto(['Este relatório de gestão (exemplo) apresenta as principais decisões da diretoria no exercício, a execução do plano de trabalho e os riscos acompanhados.', 'Destaques do ano: conclusão do projeto Renda na Roça, ampliação do Educar no Campo para três municípios e início da implantação do viveiro comunitário.'])));
      await add('Parecer da Auditoria Independente 2025', 'Relatório de auditoria', 2025, '2026-03-20', await pdfExemplo('Parecer da Auditoria Independente', 'Exercício de 2025', texto(['Examinamos as demonstrações contábeis do Instituto (exemplo) referentes ao exercício findo em 31/12/2025.', 'Em nossa opinião, as demonstrações apresentam adequadamente, em todos os aspectos relevantes, a posição patrimonial e financeira da entidade. Texto ilustrativo, sem valor de auditoria.', 'Auditores Independentes Mu (exemplo).'])));
      await add('Parecer do Conselho Fiscal 2025', 'Parecer', 2025, '2026-03-25', await pdfExemplo('Parecer do Conselho Fiscal', 'Exercício de 2025', texto(['O Conselho Fiscal (exemplo), após exame das contas e do parecer da auditoria independente, recomenda a aprovação das contas do exercício de 2025 pela Assembleia Geral.'])));
      await add('Prestação de Contas — Termo de Parceria TP-005/2025', 'Prestação de contas', 2025, '2026-02-12', await pdfExemplo('Prestação de Contas — TP-005/2025', 'Renda na Roça — Capacitação Profissional', d => {
        const ds = C.despesas.filter(x => x.projetoId === PR.renda.id);
        d.paragrafo('Demonstrativo da execução financeira do termo de parceria (exemplo).', { tam: 9, cor: '#5a6578' }); d.y += 4;
        tabelaPDF(d, [{ titulo: 'Categoria', larg: 3 }, { titulo: 'Valor', tipo: 'moeda' }], porChave(ds, 'categoria').map(x => [x.rotulo, x.valor]), ['Total executado', soma(ds, x => x.valor)]);
      }), { projetoId: PR.renda.id });
    } else {
      await add('Relatório Financeiro — 1º semestre de 2026', 'Relatório financeiro', 2026, '2026-07-31', await pdfExemplo('Relatório Financeiro — parcial 2026', periodo, tabelaFin));
      await add('Relatório de Atividades — 1º semestre de 2026', 'Relatório de atividades', 2026, '2026-07-31', await pdfExemplo('Relatório de Atividades — 1º semestre 2026', '', d => {
        for (const p of PROJETOS.filter(p => p.status === 'Em execução')) { d.paragrafo(p.nome, { negrito: true, tam: 11 }); d.paragrafo(p.descricao); d.y += 8; }
      }));
    }
  }
  for (const [titulo, data] of [['Certidão Negativa de Débitos Federais', '2026-08-04'], ['Certificado de Regularidade do FGTS', '2026-10-02'], ['Certidão Negativa de Débitos Trabalhistas', '2026-09-12']]) {
    await add(titulo, 'Certidão', 2026, data, await pdfExemplo(titulo, `Emitida em ${fmtData(data)}`, texto(['Documento ilustrativo (exemplo). Certidões reais devem ser emitidas nos sítios oficiais dos órgãos emissores e conferidas pelo código de autenticidade.'])));
  }
  // documento interno: nunca aparece no portal público
  await add('Folha de pagamento detalhada — outubro/2026 (interno)', 'Outros', 2026, '2026-10-31', await pdfExemplo('Folha de pagamento — interno', 'Documento restrito', texto(['Documento interno com dados pessoais de colaboradores. Marcado como restrito: não é publicado no portal (LGPD).'])), { restrito: true, publicacao: 'rascunho', publicadoEm: null, publicadoPor: null, descricao: 'Exemplo de documento que não vai para o portal público.' });

  // instrumentos: cada contrato ganha seu PDF
  for (const c of C.contratos) {
    const parte = C.parceiros.find(p => p.id === c.parceiroId);
    const d = await add(`${c.tipo} ${c.numero}`, 'Contrato / convênio', Number(c.inicio.slice(0, 4)), c.inicio, await pdfExemplo(`${c.tipo} ${c.numero}`, parte?.nome || '', texto([
      `PARTES: Instituto (exemplo) e ${parte?.nome}.`, `OBJETO: ${c.objeto}`, `VALOR: ${c.valor ? fmtMoeda(c.valor) : 'sem transferência de recursos'}.`,
      `VIGÊNCIA: de ${fmtData(c.inicio)} a ${fmtData(c.fim)}.`, 'Instrumento ilustrativo, sem validade jurídica, criado para demonstrar o portal.',
    ])), { projetoId: c.projetoId });
    c.documentoId = d.id;
  }
  // repasses de convênio apontam para o convênio
  for (const r of C.receitas.filter(r => r.tipo === 'Repasse de convênio')) {
    const cv = C.contratos.find(c => c.parceiroId === r.parceiroId && c.tipo === 'Convênio');
    if (cv) r.documentoId = cv.documentoId;
  }
  // comprovantes: as maiores despesas de cada categoria ganham nota fiscal
  for (const cat of CATEGORIAS_DESPESA) {
    for (const x of C.despesas.filter(d => d.categoria === cat && d.documento).sort((a, b) => b.valor - a.valor).slice(0, 2)) {
      const [a, m] = x.data.split('-');
      const d = await add(`Nota fiscal — ${x.fornecedor} — ${MESES_LONGOS[Number(m) - 1]}/${a}`, 'Nota fiscal / comprovante', Number(a), x.data, await pdfExemplo('Nota fiscal (exemplo)', x.fornecedor, d => {
        d.paragrafo('Documento auxiliar ilustrativo. Não é documento fiscal.', { tam: 9, cor: '#5a6578' }); d.y += 4;
        tabelaPDF(d, [{ titulo: 'Descrição', larg: 3 }, { titulo: 'Data', tipo: 'data' }, { titulo: 'Valor', tipo: 'moeda' }], [[x.descricao, x.data, x.valor]], ['Total', '', x.valor]);
      }), { projetoId: x.projetoId });
      x.comprovanteId = d.id;
    }
  }
}

// ------------------------------------------------------------ fotos

const CORES_AREA = {
  'Educação': ['#2a78d6', '#86b6ef'], 'Saúde e bem-estar': ['#1baf7a', '#9fe0c6'], 'Meio ambiente': ['#008300', '#9bd39b'],
  'Geração de renda': ['#eda100', '#f6d68a'], 'Cultura e esporte': ['#eb6834', '#f5b79c'], 'Assistência social': ['#6250d6', '#b9b0f0'],
};

/** Ilustração em PNG desenhada no canvas — não é foto real, e diz isso nela. */
async function ilustracao(area, legenda, variante) {
  const W = 960, H = 600;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const [forte, claro] = CORES_AREA[area] || ['#2a57a0', '#a9c1e6'];
  const ceu = g.createLinearGradient(0, 0, 0, H); ceu.addColorStop(0, claro); ceu.addColorStop(1, '#ffffff');
  g.fillStyle = ceu; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(170 + variante * 420, 140, 62, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 3; i++) {
    g.fillStyle = i === 2 ? forte : `${forte}${['55', '99'][i]}`;
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 24) g.lineTo(x, H * (0.55 + i * 0.1) + Math.sin(x / (150 + i * 60) + variante * 2 + i) * (40 - i * 10));
    g.lineTo(W, H); g.closePath(); g.fill();
  }
  // pessoas estilizadas
  g.fillStyle = '#14325c';
  for (let i = 0; i < 5; i++) {
    const x = 260 + i * 105 + variante * 30, y = H * 0.74 - (i % 2) * 12, s = 1 - (i % 3) * 0.12;
    g.beginPath(); g.arc(x, y - 70 * s, 16 * s, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.roundRect(x - 18 * s, y - 50 * s, 36 * s, 62 * s, 12 * s); g.fill();
  }
  g.fillStyle = 'rgba(20,50,92,.82)'; g.fillRect(0, H - 64, W, 64);
  g.fillStyle = '#fff'; g.font = 'bold 26px system-ui, sans-serif'; g.fillText(legenda, 28, H - 26);
  g.fillStyle = '#ffd765'; g.font = 'bold 18px system-ui, sans-serif'; g.textAlign = 'right'; g.fillText('IMAGEM ILUSTRATIVA — EXEMPLO', W - 28, H - 28);
  return new Promise(ok => cv.toBlob(ok, 'image/png'));
}

async function gerarFotos(doc, PR) {
  const agora = new Date().toISOString();
  const LEGENDAS = {
    educar: ['Aula de reforço no contraturno', 'Formação de professores'], saude: ['Unidade móvel em atendimento', 'Ação de prevenção na comunidade'],
    viveiro: ['Produção de mudas no viveiro', 'Plantio em área de nascente'], renda: ['Curso de panificação', 'Feira de empreendimentos'],
    esporte: ['Turma de futsal', 'Festival esportivo'], familias: ['Grupo de convivência', 'Entrega de cestas emergenciais'],
  };
  for (const [k, legendas] of Object.entries(LEGENDAS)) {
    const p = PR[k];
    for (let i = 0; i < legendas.length; i++) {
      const blob = await ilustracao(p.area, legendas[i], i);
      const arquivo = await salvarBlob(blob, `${k}-${i + 1}.png`);
      doc.colecoes.documentos.push({ id: novoId('doc-'), titulo: `${legendas[i]} — ${p.nome}`, categoria: 'Fotografia', exercicio: Number(p.inicio.slice(0, 4)), data: p.inicio, projetoId: p.id, descricao: 'Imagem ilustrativa gerada para a demonstração.', arquivo, restrito: false, exemplo: true, publicacao: 'publicado', criadoEm: agora, criadoPor: 'carga-de-exemplo', atualizadoEm: agora, atualizadoPor: 'carga-de-exemplo', publicadoEm: agora, publicadoPor: 'carga-de-exemplo' });
    }
  }
}
