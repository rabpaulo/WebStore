# Validação e roteiro de demonstração

## Checks reproduzíveis

```bash
npm run check
npm run test:e2e
npm run format:check
npm audit
docker compose config --quiet
```

## Roteiro para apresentação

1. Entre como administrador.
2. No dashboard, observe o mês de referência, variantes em falta e regra de reposição.
3. Abra Sutiã Comfort e diferencie produto de variantes, SKUs e saldos.
4. Em Estoque, procure uma variante e registre entrada com motivo. Confira saldo anterior/posterior no histórico.
5. Crie pedido com duas variantes; escolha cliente ou cadastre um no próprio fluxo.
6. Salve pendente e mostre que o saldo não foi consumido. Confirme pagamento e consulte a saída relacionada.
7. Cancele antes do envio; confirme devolução e registro IN. O botão de cancelar desaparece no estado terminal.
8. Entre como vendedor: catálogo e pedidos estão disponíveis, ajustes e usuários não aparecem.
9. Abra Swagger e explique DTOs, JWT, transações e status HTTP.
10. Apresente os testes concorrentes e o registro de demandas/correções.

## Validação executada

Validação concluída em **07/10/2026**, com PostgreSQL 17, Node.js local 26 e imagens de aplicação Node.js 24/Nginx. Os testes e2e usaram exclusivamente `lingerieflow_test`; a demonstração utiliza `lingerieflow`.

| Verificação                                              | Resultado                                                                  |
| -------------------------------------------------------- | -------------------------------------------------------------------------- |
| ESLint e TypeScript strict nos dois workspaces           | Aprovados                                                                  |
| Jest unitário                                            | 6 suítes, **32 testes aprovados**                                          |
| HTTP + PostgreSQL                                        | 1 suíte, **18 testes e2e aprovados**                                       |
| Builds React/Vite e NestJS                               | Aprovados localmente e nas imagens Docker                                  |
| Prettier                                                 | Todos os arquivos verificados aprovados                                    |
| `npm audit`                                              | **0 vulnerabilidades reportadas** na data da validação                     |
| Docker Compose                                           | Imagens construídas; banco e backend saudáveis; frontend Nginx em execução |
| Healthcheck, proxy Nginx e abertura direta de rota React | HTTP 200                                                                   |
| Swagger                                                  | Interface carregada, JWT/DTOs documentados e 20 caminhos no OpenAPI        |

`npm test -- --coverage` também foi executado. A cobertura unitária de linhas é 61,26% nos services/guards instrumentados; em pedidos é 86,51%. Esse relatório não inclui os testes e2e, que exercitam autenticação, consultas e permissões pela API real. Não se reivindica cobertura integral da aplicação.

### Fluxo conferido no navegador

Foi utilizado o formulário da aplicação para criar produto com variante, cadastrar cliente, registrar entrada de cinco unidades, vender duas unidades e cancelar o pedido pago. A entrada alterou o saldo de 7 para 12; a venda criou OUT de 12 para 10; o cancelamento criou IN de 10 para 12. Pedido, cliente, saldo e movimentações permaneceram disponíveis após subir as imagens Docker sobre o mesmo volume.

O registro de demonstração utilizado é **Sutiã Everyday / Preto / M**, SKU `SUT-EVE-PRE-M`, pedido **#37**, cliente fictícia Clara Monteiro. O ambiente atual tem 11 produtos, 81 variantes, 9 clientes e 37 pedidos devido a essa conferência. Em um banco novo, o seed cria 10 produtos, 80 variantes, 8 clientes e 36 pedidos; repetir o seed preserva os dados existentes.

Login de ADMIN e SELLER foi conferido. Para SELLER, o menu não exibe usuários, o estoque não oferece entrada/ajuste e o dashboard mostra unidades disponíveis no lugar do faturamento. Operações administrativas também foram rejeitadas com HTTP 403 nos e2e.

Desktop e mobile foram inspecionados. Na tela menor, dashboard e estoque não provocaram rolagem horizontal da página (`clientWidth` e `scrollWidth` iguais a 341 pixels CSS no navegador de teste). Tabelas extensas mantêm rolagem dentro do próprio painel. Menu recolhido fica fora da navegação de teclado; logout permanece no topo. Nenhum aviso ou erro de console foi capturado na sessão final da aplicação de produção.

As [capturas reais](screenshots/README.md) registram dashboard, catálogo, estoque, pedido, movimentações relacionadas e versão mobile. O roteiro acima e os comandos de checks permitem reproduzir a validação; a conferência visual foi manual, sem suíte automatizada de navegador.
