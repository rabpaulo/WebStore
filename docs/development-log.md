# Registro de desenvolvimento e manutenção

Data de implementação: 07/10/2026. Demandas abaixo simulam manutenção de uma operação de varejo e têm evidências reais no código/testes. Cenários de regressão foram prevenidos, sem inserir defeitos artificialmente.

## REQ-001 · Alerta de estoque mínimo

**Problema:** saldo agregado de produto esconde cores/tamanhos em falta.

**Solução:** classificação por variante, filtros de saldo, alertas no dashboard e lista de reposição até 2× o mínimo. Zero tem precedência sobre mínimo.

**Áreas:** ProductsService, InventoryService, DashboardService, InventoryPage e DashboardPage.

**Validação:** teste unitário de limite exatamente no mínimo e zero; filtros HTTP e consulta visual de sugestões.

## REQ-002 · Impedir venda sem saldo

**Problema:** dois atendimentos podem tentar vender a última unidade ao mesmo tempo.

**Solução:** bloqueios de linha ordenados, verificação após bloqueio e UPDATE condicional; transação engloba pedido, saldo e movimentos.

**Áreas:** OrdersService, OrderStockService, locks.ts e migration CHECK.

**Validação:** teste unitário de insuficiência e itens repetidos; e2e de duas vendas concorrentes (uma 201, outra 400, saldo zero); rollback de pedido com múltiplos itens.

## BUG-001 · Regressão de devolução em cancelamento

**Cenário simulado:** cancelar sem restaurar saldo, restaurar um pendente ou restaurar duas vezes causaria divergência. Não foi um bug introduzido nesta implementação.

**Solução preventiva:** verificar estado sob bloqueio do pedido; devolver somente PAID/PREPARING, gravar IN e mudar estado na mesma transação.

**Áreas:** order-state.ts, OrdersService e OrderStockService.

**Validação:** testes de devolução, movimentação IN, pendente sem devolução e cancelamento repetido; e2e de dois cancelamentos concorrentes.

## REQ-003 · Filtro de movimentações por período

**Problema:** investigar divergência exige consultar somente a janela e os itens relevantes.

**Solução:** filtros por início/fim, produto, SKU, tipo e pedido relacionado; paginação e timestamps em São Paulo na interface.

**Áreas:** PeriodDto, dateRange, MovementQueryDto, InventoryService e MovementsPage.

**Validação:** e2e de período futuro vazio e consulta no navegador do OUT/IN do mesmo pedido.

## BUG-002 · Rótulo de campos de seleção

**Problema observado:** na validação do navegador, um label envolvendo select incorporava os textos de todas as options ao nome acessível. O campo “Categoria” não era encontrado por seu nome exato.

**Correção:** gerar IDs e ligar label/control via `htmlFor`; associar descrições de erro com `aria-describedby` e estado com `aria-invalid`.

**Áreas:** frontend/src/components/ui.tsx, componente Field.

**Validação:** cadastro real de produto pelo navegador com seletores de rótulo, SKU e saldo inicial; criação de cliente no pedido também passou.

## REQ-004 · Visibilidade consistente do mês

**Problema:** virada do mês UTC pode classificar vendas na competência errada no Brasil.

**Solução:** limites do mês e agrupamento em America/Sao_Paulo; snapshot consistente dos indicadores; estado financeiro separado do saldo atual.

**Áreas:** DashboardService, DashboardQueryDto e DashboardPage.

**Validação:** testes de virada UTC, limites de outubro e fevereiro bissexto.

## REQ-005 · Ambiente repetível e dependências

**Problema:** demo vazia e configuração manual dificultam avaliar os fluxos. Auditoria inicial apontou dependências transitivas vulneráveis.

**Solução:** Docker com healthchecks, migration e seed preservando dados, script setup sem dependências, lockfile, Jest atualizado e overrides compatíveis de segurança. Watch do Node substitui ts-node-dev.

**Áreas:** docker-compose.yml, Dockerfiles, scripts/setup.mjs, manifests e lockfile.

**Validação:** migration e seed reais, build, testes unitários/e2e e npm audit. Resultados finais em validation.md.

## BUG-003 — Campos obrigatórios nulos em edições

**Problema:** DTOs parciais podem ignorar `null` por padrão. Em campos obrigatórios, isso transfere a rejeição para o banco, gerando um erro inadequado em vez de validar a requisição.

**Solução:** edições de produto, variante e cliente ignoram apenas campos ausentes. Contatos opcionais do cliente continuam aceitando `null` para remoção; nome, SKU, descrição e ativo possuem validação explícita.

**Áreas:** products.dto.ts, customers.dto.ts e flows.e2e-spec.ts.

**Validação:** e2e envia nome, ativo, descrição e SKU nulos, exige HTTP 400 e confirma que o produto foi preservado. O teste de remoção de contatos opcionais também passa.
