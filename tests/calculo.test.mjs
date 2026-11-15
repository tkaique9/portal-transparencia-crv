// Motor de indicadores: as regras que a página "Sobre os dados" promete.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as calc from '../public/js/calculo.js';
import { mascararDocumento } from '../public/js/util.js';

const P1 = { id: 'p1', nome: 'Projeto A', area: 'Educação', status: 'Em execução', inicio: '2025-02-01', fim: '2026-12-31', orcamento: 1000, metaBeneficiarios: 100, municipios: 'X; Y' };
const P2 = { id: 'p2', nome: 'Projeto B', area: 'Saúde e bem-estar', status: 'Concluído', inicio: '2025-01-01', fim: '2025-12-31', orcamento: 500, municipios: 'Y; Z' };
const P3 = { id: 'p3', nome: 'Projeto C', area: 'Educação', status: 'Planejado', inicio: '2027-01-01', fim: '2027-12-31', orcamento: 300, municipios: 'W' };
const base = () => ({
  projetos: [P1, P2, P3],
  receitas: [{ data: '2025-03-01', valor: 600, origem: 'A', projetoId: 'p1' }, { data: '2026-01-10', valor: 400, origem: 'B', projetoId: null }],
  despesas: [
    { data: '2025-03-10', valor: 200, categoria: 'Pessoal', projetoId: 'p1' },
    { data: '2025-06-10', valor: 300, categoria: 'Pessoal', projetoId: 'p2' },
    { data: '2026-02-10', valor: 100, categoria: 'Material', projetoId: null },
  ],
  orcamentos: [{ exercicio: 2025, categoria: 'Pessoal', valor: 1000, projetoId: 'p1' }],
  metas: [{ projetoId: 'p1', meta: 10, realizado: 15 }, { projetoId: 'p1', meta: 10, realizado: 5 }],
  atendimentos: [
    { projetoId: 'p1', mes: '2025-03', pessoas: 40, familias: 10, horas: 5, comunidades: 3 },
    { projetoId: 'p1', mes: '2025-04', pessoas: 20, familias: 5, horas: 5, comunidades: 4 },
    { projetoId: 'p2', mes: '2025-04', pessoas: 7, familias: 2, horas: 1, comunidades: 2 },
  ],
});

test('indicadores fecham com os lançamentos', () => {
  const b = base();
  const i = calc.indicadores(b, 2025);
  assert.equal(i.recebido, 600);
  assert.equal(i.aplicado, 500);
  assert.equal(i.saldo, 100);
  assert.equal(i.execucao, 0.5); // 500 ÷ 1000 aprovado
  assert.equal(i.beneficiados, 67);
  assert.equal(i.municipios, 3, 'X, Y, Z — sem repetir Y, sem o projeto planejado');
  assert.equal(i.porArea.reduce((a, x) => a + x.valor, 0), i.aplicado);
  const todos = calc.indicadores(b, null);
  assert.equal(todos.aplicado, 600);
  assert.equal(todos.porArea.find(x => x.rotulo === calc.SEM_PROJETO_DESPESA).valor, 100);
});

test('comunidades: maior mês de cada projeto, não soma dos meses', () => {
  assert.equal(calc.comunidadesAlcancadas(base().atendimentos), 4 + 2);
});

test('execução física limita cada meta a 100%', () => {
  const r = calc.resumoProjeto(base(), P1);
  assert.equal(r.execFisica, (1 + 0.5) / 2);
  assert.equal(r.execFinanceira, 0.2);
  assert.equal(r.beneficiarios, 60);
});

test('série mensal sem ano cobre do primeiro ao último mês, sem buracos', () => {
  const s = calc.serieMensal(base(), null);
  assert.equal(s.chaves[0], '2025-03');
  assert.equal(s.chaves.at(-1), '2026-02');
  assert.equal(s.chaves.length, 12);
  assert.equal(s.acumulado.at(-1), 600);
  assert.equal(s.receitas.reduce((a, x) => a + x, 0), 1000);
});

test('previsto × realizado inclui categoria gasta sem orçamento', () => {
  const pr = calc.previstoRealizado(base(), 2025);
  assert.deepEqual(pr.map(x => [x.categoria, x.previsto, x.realizado]), [['Pessoal', 1000, 500]]);
  const pr26 = calc.previstoRealizado(base(), 2026);
  assert.equal(pr26[0].execucao, null, 'sem orçamento, execução fica indefinida — não 0% nem infinito');
});

test('comparativo usa o mesmo intervalo de meses do ano anterior', () => {
  const b = base();
  b.receitas.push({ data: '2025-01-20', valor: 100, origem: 'A' }, { data: '2026-02-05', valor: 50, origem: 'A' });
  const c = calc.comparativo(b, 2026); // 2026 tem lançamento até fevereiro
  assert.equal(c.rotulo, 'vs jan–fev/25');
  assert.equal(c.anterior.recebido, 100, 'março/2025 (600) fica fora: só jan–fev contam');
  assert.equal(calc.variacao(450, 100), 3.5);
  assert.equal(calc.variacao(10, 0), null, 'sem base não existe %');
  assert.equal(calc.comparativo(b, 2025), null, 'sem 2024, sem comparação');
});

test('série do ano em andamento termina no último mês com lançamento', () => {
  const s = calc.serieMensal(base(), 2026);
  assert.deepEqual(s.chaves, ['2026-01', '2026-02']);
});

test('LGPD: CPF mascarado, CNPJ inteiro', () => {
  assert.equal(mascararDocumento('123.456.789-09'), '***.456.789-**');
  assert.equal(mascararDocumento('12345678000190'), '12.345.678/0001-90');
  assert.equal(mascararDocumento(''), '');
});
