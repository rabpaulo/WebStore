# Regras de negócio

| ID     | Regra                                                                                  | Evidência principal                                                            |
| ------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| BR-001 | Saldo de variante e estoque mínimo nunca são negativos.                                | DTOs, migration CHECK, InventoryService e teste SQL direto                     |
| BR-002 | Pedido não pode vender além do saldo disponível.                                       | Checagem agregada e `updateMany` condicional em transação; e2e concorrente     |
| BR-003 | Cancelamento devolve somente estoque previamente consumido.                            | PENDING não devolve; PAID/PREPARING devolvem; testes unitários e HTTP          |
| BR-004 | SKU identifica uma única variante no sistema.                                          | Constraint UNIQUE, validação de duplicidade e erro 409                         |
| BR-005 | SELLER não realiza operações administrativas.                                          | RolesGuard global, decorators e teste HTTP 403                                 |
| BR-006 | Cor/tamanho não se repetem dentro de um produto.                                       | UNIQUE composto `(productId,color,size)`                                       |
| BR-007 | Todo saldo alterado pelo sistema tem movimentação auditável.                           | Entrada, ajuste, saldo inicial, venda e cancelamento gravam na mesma transação |
| BR-008 | Preços são positivos, com até duas casas; quantidades são inteiros positivos.          | DTOs, CHECKs e testes de pedido com zero                                       |
| BR-009 | O backend calcula preços, subtotais e total.                                           | Prisma Decimal; frontend não envia total; propriedades extras são rejeitadas   |
| BR-010 | Pedido pendente não reserva estoque.                                                   | Criação sem OUT; confirmação verifica saldo novamente                          |
| BR-011 | Estados seguem PENDING → PAID → PREPARING → SHIPPED → DELIVERED.                       | Mapa central em order-state.ts; teste de transição inválida                    |
| BR-012 | CANCELLED só é permitido antes de SHIPPED e pelo endpoint de ADMIN.                    | Guard + regra de transição; PATCH com CANCELLED falha                          |
| BR-013 | Repetir pagamento ou cancelamento não produz nova alteração de saldo.                  | Bloqueio da linha do pedido; testes concorrentes                               |
| BR-014 | Produto inativo não pode gerar venda ou pagamento novo.                                | Verificação após bloqueio de produto/variantes                                 |
| BR-015 | Valores do pedido são snapshots; editar preço do catálogo não altera pedido existente. | OrderItem.unitPrice e subtotal persistidos                                     |
| BR-016 | Reposição lista variantes ativas com saldo ≤ mínimo.                                   | Dashboard/Inventory; `max(0,mínimo×2−saldo)`                                   |
| BR-017 | Cadastro inicial de saldo positivo gera IN com motivo “Estoque inicial”.               | ProductsService e teste unitário                                               |
| BR-018 | Ajuste informa saldo físico contado e registra a diferença assinada.                   | InventoryMovement ADJUSTMENT e saldos anterior/posterior                       |
| BR-019 | Recurso relacionado inexistente não gera gravação parcial.                             | DTO UUID, services e FKs; rollback da transação                                |
| BR-020 | Faturamento agregado do dashboard é restrito a ADMIN.                                  | Service retorna null para SELLER; interface apresenta unidades no lugar        |

## Classificação de saldo

1. Saldo zero: `OUT` / “Sem estoque”.
2. Saldo positivo menor ou igual ao mínimo: `LOW` / “Estoque baixo”.
3. Saldo acima do mínimo: `OK` / “Em dia”.

No catálogo, a situação resume a variante mais crítica. O saldo total é a soma das variantes; uma variante zerada não significa que todas as variantes do produto estão indisponíveis. Estoque e reposição são avaliados por SKU.

## Cancelamento e rastreabilidade

Pedido pendente cancela sem movimentação de devolução. Pedido pago/em preparação devolve cada quantidade original e cria IN com responsável, pedido e motivo `Cancelamento do pedido #n`. Pedido enviado/entregue requer um fluxo de devolução fora do escopo. Pedido cancelado é terminal. Movimentos históricos não podem ser editados ou excluídos pela API.

## Datas e indicadores

Timestamps são armazenados com timezone. O mês do dashboard usa São Paulo, com início inclusivo e fim exclusivo. Pedidos do mês contam criação, incluindo cancelados. Faturamento e gráfico usam data de pagamento e excluem os atualmente cancelados. Saldo, mínimos e reposição são atuais, não snapshots históricos do mês selecionado.

## Limites explícitos

API aceita até 100 itens por pedido, 64 variantes no cadastro inicial de produto e 100 registros por página. Cada quantidade de item tem limite de 10.000; entradas/contagens têm limite de um milhão. O total do pedido deve caber em Decimal(12,2). Limites protegem entradas e mantêm as operações simples; não representam previsões de negócio.
