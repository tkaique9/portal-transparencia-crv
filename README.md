# Portal de Transparência — Instituto CRV

Portal público onde qualquer pessoa consulta, sem cadastro, quanto o Instituto
recebeu, de onde vieram os recursos, onde foram aplicados, quem foi beneficiado
e quais resultados foram entregues — com área restrita para a equipe lançar,
aprovar e publicar as informações.

> **Esta é a versão local.** Não há servidor nem banco central: os dados ficam
> no navegador de quem usa (IndexedDB). Serve para validar o produto, as telas
> e as regras com a equipe. Ver [Limites desta fase](#limites-desta-fase).

> **Dados de exemplo.** Na primeira abertura o portal se carrega com dados
> **fictícios** — projetos, parceiros, fornecedores, municípios, valores,
> CNPJs, CPFs, fotos e documentos inventados. Nada corresponde a informação real
> do Instituto CRV. Uma faixa amarela avisa em todas as páginas, e todo PDF ou
> planilha exportado sai carimbado. Para tirar: *Área restrita → Backup e dados →
> Remover dados de exemplo* (só os exemplos saem; o que foi cadastrado de verdade fica).

## Como rodar

Precisa de Node 18 ou mais novo. Não há dependências para instalar.

```bash
npm start
```

Abra <http://localhost:8080>. (O servidor existe só porque o navegador não abre
módulos JavaScript por `file://`; ele não grava nada.)

No primeiro acesso à **Área restrita**, o sistema pede para criar o
administrador. Depois disso, só o administrador cria os demais usuários.

```bash
npm test
```

## O que tem

| Página | O que responde |
|---|---|
| Visão geral | As 8 perguntas do cidadão respondidas na primeira tela, 8 indicadores e 6 gráficos, por exercício |
| Receitas | Todo recebimento: data, origem, parceiro, tipo, valor, projeto, comprovante. Filtros por ano, mês, origem, tipo e projeto |
| Despesas | Todo pagamento: fornecedor, CNPJ/CPF (CPF mascarado), descrição, categoria, projeto, forma de pagamento, aprovador, nota fiscal. Por categoria, projeto, fornecedor e orçado × realizado |
| Projetos | Catálogo e página de cada projeto: objetivo, local, período, responsável, previsto × realizado, execução física e financeira, metas, beneficiários, fotos, documentos e contratos |
| Impacto social | Pessoas, famílias, projetos, comunidades, municípios, horas; meta × resultado por projeto e por meta; resultado por área |
| Contratos e parcerias | Contratos, convênios, termos de parceria, acordos de cooperação e aditivos, com PDF para ver e baixar |
| Prestação de contas | Por exercício, do Instituto ou de um projeto: saldo inicial, receitas, despesas, saldo final, orçamento aprovado × executado, relatórios e pareceres. **Gera relatório em PDF e Excel** |
| Documentos | Biblioteca com estatuto, regimento, políticas, relatórios, demonstrações contábeis, balanços, certidões, auditorias, contratos e comprovantes |
| Pesquisa | Busca única em projetos, documentos, contratos, parceiros, receitas e despesas |
| Área restrita | Cadastros, fila de aprovação, usuários e perfis, histórico de alterações, backup e restauração |

Toda tabela exporta para **Excel** (números continuam números) e **PDF**. Todo
gráfico tem a mesma informação em tabela ("Ver como tabela"), dica ao passar o
mouse e funciona no teclado. Modo claro e escuro, e layout de celular.

## Perfis e publicação

| Perfil | Pode |
|---|---|
| Administrador | Tudo; é o único que **aprova e publica**, cria usuários, vê o histórico, faz backup |
| Financeiro | Receitas, despesas, orçamento, parceiros, contratos e documentos |
| Gestor de projetos | Projetos, metas, atendimentos e documentos |
| Auditor | Consulta tudo, inclusive rascunhos e o histórico; não altera nada |
| Consulta pública | Quem acessa sem login: só o que está publicado |

Fluxo: *rascunho → aguardando aprovação → publicado*. Quando um perfil que não
publica corrige um registro já publicado, ele sai do portal até nova aprovação —
o portal nunca mostra informação não conferida.

Toda alteração vai para o **histórico** com data, hora, usuário, perfil e o
antes/depois de cada campo. Logins (inclusive os que falharam), exportações de
backup e restaurações também. Restaurar um backup não apaga o histórico.

## LGPD

- CPF de quem recebeu pagamento aparece como `***.456.789-**`; CNPJ aparece inteiro.
- Beneficiários aparecem só em números agregados, nunca nominalmente.
- Documento marcado como **interno** não pode ser publicado — a regra está no
  banco, não só na tela.
- Dados bancários não têm campo no sistema: não há como publicá-los por engano.
- Página *Privacidade e LGPD* no rodapé.

## Estrutura

```
servidor.js                 servidor estático (só desenvolvimento) + cabeçalhos de segurança (CSP)
public/
  index.html                casca: topo, menu, rodapé
  css/portal.css            tokens de cor (claro/escuro) e componentes
  js/
    app.js                  rotas e basePublica() — o único caminho do dado até as páginas públicas
    util.js                 formatação, máscara de CPF, utilitários
    calculo.js              motor de indicadores: funções puras, sem DOM
    dados/
      esquema.js            coleções, campos, listas de valores, perfis — fonte única do formato
      db.js                 banco local: validação, permissão, publicação, auditoria, backup
      auth.js               login (PBKDF2), sessão, usuários
      exemplo.js            gerador dos dados FICTÍCIOS de demonstração
    export/                 PDF e Excel gerados no navegador, sem biblioteca externa
    ui/                     componentes (tabela, modal, visor) e gráficos SVG
    paginas/                uma por rota
tests/                      motor de cálculo, PDF e Excel (node --test)
```

Três decisões que valem manter:

1. **`db.js` é a autoridade.** Quem pode editar o quê, quem publica, o que é
   válido — tudo é conferido lá. A tela só esconde botões; se esconder falhar,
   o banco recusa do mesmo jeito.
2. **Página pública só lê de `basePublica()`** (`app.js`), que já filtra o não
   publicado, os documentos internos e mascara CPF. Página nova que leia de
   `db.colecao()` direto vaza rascunho.
3. **Número nenhum é digitado à parte.** Todo indicador sai de `calculo.js` a
   partir dos lançamentos — painel, páginas, prestação de contas e exportações
   usam a mesma conta.

Sem dependências externas de propósito: nada de CDN (o portal funciona em
rede fechada e a CSP só permite scripts da própria origem), e nada a atualizar.

## Limites desta fase

O que **ainda não** é produção, e por quê:

- **Os dados moram no navegador.** Cada computador tem a sua base; o que um
  usuário lança não aparece para o outro, e o público só vê o que está no
  navegador onde o portal foi aberto. Para publicar de verdade, é preciso o
  servidor.
- **A senha é conferida no próprio navegador.** Ela é guardada só como hash
  PBKDF2-SHA256 (210 mil iterações, sal próprio), há bloqueio após 5 tentativas
  e sessão que expira em 30 minutos — mas quem tem acesso ao perfil do
  navegador tem acesso aos dados. Isso protege contra uso casual, não contra
  ataque.
- **Backup é manual** (arquivo baixado) e há cópias automáticas diárias dentro
  do próprio navegador. Limpar os dados do navegador apaga tudo que não tiver
  backup em arquivo.

### Próxima fase: servidor

O desenho já foi feito para essa troca:

- `dados/db.js` tem a interface que as telas usam (`inserir`, `atualizar`,
  `excluir`, `definirPublicacao`, `publicos`, arquivos, backup). Na fase com
  servidor, ele passa a chamar uma API com as mesmas funções; as telas não mudam.
- `dados/esquema.js` descreve cada tabela e campo — vira o esquema SQL.
- As regras de permissão e validação de `db.js` e `auth.js` vão para o servidor
  (que vira a autoridade), com sessão por cookie `httpOnly`, banco Postgres,
  arquivos em armazenamento de objetos e backup automático do banco.
- A API de leitura pública é o ponto de integração com sistemas financeiros e
  contábeis (importar lançamentos do ERP em vez de digitar).
