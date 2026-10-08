import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Plus, ShoppingBag, Trash } from '@phosphor-icons/react';
import { api, queryString, send } from '../lib/api';
import { Customer, Order, Page, Variant } from '../lib/types';
import { useFilters } from '../lib/useFilters';
import { priceInCents, useOrderDraft } from '../lib/useOrderDraft';
import { useAction } from '../lib/query';
import { money, stockStatus } from '../lib/format';
import { CustomerForm } from '../components/CustomerForm';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  PageHeading,
  Pagination,
  SearchInput,
  StockBadge,
} from '../components/ui';

export function NewOrderPage() {
  const navigate = useNavigate();
  const list = useFilters({ active: 'true' });
  const cart = useOrderDraft();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const inventory = useQuery({
    queryKey: ['order-products', list.params],
    queryFn: () => api<Page<Variant>>(`/inventory?${queryString(list.params)}`),
  });
  const customers = useQuery({
    queryKey: ['customer-lookup', customerSearch, customerPage],
    queryFn: () =>
      api<Page<Customer>>(
        `/customers?${queryString({ search: customerSearch, page: customerPage, limit: 12 })}`,
      ),
  });
  const create = useAction(
    (payImmediately: boolean) =>
      api<Order>(
        '/orders',
        send('POST', {
          customerId: customer?.id,
          items: cart.items.map((item) => ({
            productVariantId: item.variant.id,
            quantity: item.quantity,
          })),
          payImmediately,
        }),
      ),
    'Pedido criado com sucesso.',
    (order) => navigate(`/orders/${order.id}`),
  );
  return (
    <>
      <Link to="/orders" className="back-link">
        <ArrowLeft size={15} />
        Voltar aos pedidos
      </Link>
      <PageHeading
        title="Novo pedido"
        description="Escolha as variantes, confira os itens e registre a venda."
      />
      <div className="order-builder">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Escolha os produtos</h2>
              <p>Adicione ao pedido a combinação certa de cor e tamanho.</p>
            </div>
          </div>
          <div className="filters">
            <SearchInput
              value={list.filters.search}
              onChange={(value) => list.setFilter('search', value)}
              placeholder="Pesquisar produto ou SKU…"
            />
          </div>
          {inventory.isPending ? (
            <LoadingState />
          ) : inventory.error ? (
            <ErrorState
              error={inventory.error}
              retry={() => {
                void inventory.refetch();
              }}
            />
          ) : !inventory.data.data.length ? (
            <EmptyState
              title="Nenhum produto ativo encontrado"
              description="Altere a busca para encontrar outras variantes."
            />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>PRODUTO / VARIANTE</th>
                    <th>PREÇO</th>
                    <th>DISPONÍVEL</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {inventory.data.data.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <strong>{v.product?.name}</strong>
                        <span className="subtext">
                          {v.color} / {v.size} · <span className="mono">{v.sku}</span>
                        </span>
                      </td>
                      <td>{money(v.price)}</td>
                      <td>
                        <StockBadge status={stockStatus(v.currentStock, v.minimumStock)} />
                        <span className="subtext">{v.currentStock} un.</span>
                      </td>
                      <td>
                        <Button
                          variant="secondary"
                          className="icon-button"
                          disabled={
                            v.currentStock === 0 ||
                            (cart.items.find((item) => item.variant.id === v.id)?.quantity ?? 0) >=
                              v.currentStock
                          }
                          aria-label={`Adicionar ${v.sku}`}
                          onClick={() => cart.add(v)}
                        >
                          <Plus size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {inventory.data && <Pagination meta={inventory.data.meta} onPage={list.setPage} />}
        </div>
        <div className="panel order-builder-cart">
          <div className="panel-heading">
            <h2>Resumo do pedido</h2>
            <ShoppingBag size={20} weight="duotone" />
          </div>
          <div className="cart-body">
            {!cart.items.length ? (
              <EmptyState
                title="Seu pedido começa aqui"
                description="Adicione os produtos ao lado."
              />
            ) : (
              cart.items.map((item) => (
                <div className="cart-item" key={item.variant.id}>
                  <div className="cart-item-title">
                    <strong>{item.variant.product?.name}</strong>
                    <Button
                      variant="ghost"
                      className="icon-button"
                      aria-label={`Remover ${item.variant.sku}`}
                      onClick={() => cart.remove(item.variant.id)}
                    >
                      <Trash size={15} />
                    </Button>
                  </div>
                  <small>
                    {item.variant.color} / {item.variant.size} · {money(item.variant.price)} cada
                  </small>
                  <div className="cart-item-bottom">
                    <label className="quantity-input">
                      <span className="muted">Qtd.</span>
                      <input
                        aria-label={`Quantidade de ${item.variant.sku}`}
                        type="number"
                        min="1"
                        max={item.variant.currentStock}
                        value={item.quantity}
                        onChange={(e) => cart.quantity(item.variant.id, Number(e.target.value))}
                      />
                    </label>
                    <strong>
                      {money((priceInCents(item.variant.price) * item.quantity) / 100)}
                    </strong>
                  </div>
                </div>
              ))
            )}
            <div className="cart-customer">
              <div className="customer-select-heading">
                <span>Cliente (opcional)</span>
                <Button variant="ghost" onClick={() => setCreatingCustomer(true)}>
                  <Plus size={12} />
                  Cadastrar
                </Button>
              </div>
              <div className="customer-search">
                <SearchInput
                  value={customerSearch}
                  onChange={(value) => {
                    setCustomerSearch(value);
                    setCustomerPage(1);
                  }}
                  placeholder="Buscar cliente…"
                />
              </div>
              <select
                aria-label="Cliente do pedido"
                value={customer?.id ?? ''}
                onChange={(e) =>
                  setCustomer(customers.data?.data.find((c) => c.id === e.target.value) ?? null)
                }
              >
                <option value="">Consumidor final</option>
                {customer && !customers.data?.data.some((c) => c.id === customer.id) && (
                  <option value={customer.id}>{customer.name}</option>
                )}
                {customers.data?.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {customers.data && customers.data.meta.totalPages > 1 && (
                <div className="lookup-pagination">
                  <Button
                    variant="ghost"
                    disabled={customerPage <= 1}
                    onClick={() => setCustomerPage(customerPage - 1)}
                  >
                    Anterior
                  </Button>
                  <span>
                    {customerPage}/{customers.data.meta.totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    disabled={customerPage >= customers.data.meta.totalPages}
                    onClick={() => setCustomerPage(customerPage + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              )}
              {customers.error && (
                <p className="field-error" role="alert">
                  {customers.error.message}
                </p>
              )}
            </div>
            <div className="cart-total">
              <span>Total</span>
              <strong>{money(cart.totalCents / 100)}</strong>
            </div>
            <div className="cart-actions">
              <Button
                disabled={!cart.items.length || create.isPending}
                onClick={() => setConfirm(true)}
              >
                {create.isPending ? 'Registrando…' : 'Confirmar pedido pago'}
                <ArrowRight size={16} />
              </Button>
              <Button
                variant="secondary"
                disabled={!cart.items.length || create.isPending}
                onClick={() => create.mutate(false)}
              >
                Salvar como pendente
              </Button>
            </div>
            <p className="cart-note">Pedidos pendentes não reservam estoque.</p>
          </div>
        </div>
      </div>
      {creatingCustomer && (
        <Modal
          open
          onOpenChange={setCreatingCustomer}
          title="Novo cliente"
          description="O cliente será selecionado no pedido após o cadastro."
        >
          <CustomerForm onClose={() => setCreatingCustomer(false)} onSaved={setCustomer} />
        </Modal>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Confirmar pedido e pagamento?"
        description={`Total de ${money(cart.totalCents / 100)}. A disponibilidade será verificada e o estoque será reduzido ao confirmar.`}
        onConfirm={() => create.mutate(true)}
        pending={create.isPending}
        label="Confirmar pedido"
      />
    </>
  );
}
