# Plano de implementação: LingerieFlow

## Estado inicial

Diretório vazio em 07/10/2026; nenhum código, dependência ou histórico Git a preservar.

## Decisões

- Monorepositório npm com `frontend/` (React, TypeScript, Vite) e `backend/` (NestJS, Prisma, PostgreSQL).
- Valores monetários Decimal(12,2); preços e totais calculados pelo servidor.
- Estoque por variante; transações, bloqueios de linha e atualização condicional impedem saldo negativo e dupla devolução.
- Pedidos pendentes não reservam estoque. Pagamento consome estoque; cancelamento é permitido antes do envio, somente por ADMIN.
- Interface em português, responsiva, minimalista, com componentes acessíveis Radix, React Hook Form e Zod.
- Sem serviços externos ou funcionalidades simuladas na interface.

## Fases e validação

Cada fase termina com lint, typecheck e os testes relevantes. Falhas devem ser corrigidas antes da fase seguinte. Testes de integração usam um banco exclusivo.

1. [x] **Setup:** workspaces, ferramentas de qualidade, Docker, modelo Prisma, migration e conexão PostgreSQL. Validar schema, migration e build inicial.
2. [x] **Auth e RBAC:** JWT, bcrypt, guards, login, perfil e usuários. Testar autenticação e restrições de SELLER.
3. [x] **Catálogo:** categorias, produtos, variantes, SKU único, filtros e paginação. Testar criação e duplicidade.
4. [x] **Estoque:** entradas, ajustes e histórico com filtros. Testar auditoria e proteção contra saldo negativo.
5. [x] **Pedidos:** valores Decimal, pagamento transacional, estados e cancelamento. Testar insuficiência, concorrência, baixa e devolução.
6. [x] **Frontend base:** router, queries, login, sessão, sidebar, erros e acessibilidade. Validar build e autenticação pela interface.
7. [x] **Produtos e estoque:** listagens, filtros, detalhes, formulários e movimentações reais.
8. [x] **Pedidos e clientes:** carrinho, confirmação, detalhes, pagamento, transições, cancelamento e cadastro de clientes.
9. [x] **Dashboard e seed:** indicadores reais, pedidos recentes, reposição, catálogo e vendas de demonstração.
10. [x] **Acabamento:** testes e2e, validação visual desktop/mobile, documentação técnica, README, Docker e screenshots.

## Critério de conclusão

Todos os fluxos principais conectados ao banco; build, lint, typecheck e testes aprovados; migration, seed, Swagger e instruções de execução disponíveis. Registrar limitações do ambiente sem confundir código escrito com comportamento verificado.

### Phase 1 validada

Schema válido; migration aplicada em PostgreSQL 17. Lint e typecheck aprovados; ainda não havia regras de negócio para testes unitários. Banco local em 5434 e API em 3005 para evitar conflito com outro projeto.

### Phase 2 validada

Lint e typecheck aprovados. Cinco testes de autenticação e RBAC passaram. Perfil nunca retorna passwordHash; JWT exige segredo de 32 caracteres e algoritmo HS256.

### Phase 3 validada

Lint e typecheck aprovados; nove testes passaram, incluindo produto válido, SKU duplicado e classificação de estoque. Constraints garantem SKU e matriz de variantes únicos.

### Phase 4 validada

Lint e typecheck aprovados; 14 testes passaram. Entradas e ajustes auditados usam bloqueios de linha e transações. Filtros de estoque e histórico implementados.

### Phase 5 validada

29 testes unitários e 12 e2e HTTP/PostgreSQL passaram. Verificadas vendas, pagamentos e cancelamentos concorrentes, rollback de múltiplos itens, RBAC, estados e CHECK contra saldo negativo. E2e exige um banco terminado em _test.

### Phases 6 e 7 validadas

Lint, typecheck e build React aprovados; 29 testes unitários aprovados. Login, sessão, catálogo, variantes, estoque, reposição e histórico conectados à API. Validação interativa do navegador será feita no acabamento, após o seed.

### Phase 8 validada

Lint, typecheck, testes unitários e build passaram. Pedidos, itens, clientes, pagamento, estados e cancelamento conectados ao backend; administração de usuários implementada.

### Phase 9 validada

Lint, typecheck, build e 32 testes unitários aprovados. Seed executado: 10 produtos, 80 variantes, 8 clientes e 36 pedidos. Login e indicadores reais conferidos no navegador. Faturamento agregado por mês em São Paulo; saldo e alertas atuais, com dados consistentes por snapshot.

### Phase 10 validada

32 testes unitários e 18 e2e aprovados. Lint, typecheck, formatação, builds locais e builds Docker passaram; auditoria de dependências sem vulnerabilidades reportadas. Compose subiu PostgreSQL, API e frontend; Swagger, proxy e rotas privadas conferidos. Fluxo real de cadastro, entrada, venda e cancelamento validado pela interface, com movimentações e persistência verificadas após iniciar os containers. Desktop/mobile, perfil SELLER e capturas revisados. README e documentação técnica concluídos; evidências detalhadas em docs/validation.md.
