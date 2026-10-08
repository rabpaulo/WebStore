import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Plus } from '@phosphor-icons/react';
import { api, queryString } from '../lib/api';
import { Order, OrderStatus, Page } from '../lib/types';
import { useFilters } from '../lib/useFilters';
import { dateTime, money, ORDER_LABEL, periodParams } from '../lib/format';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  OrderBadge,
  PageHeading,
  Pagination,
  SearchInput,
} from '../components/ui';

export function OrdersPage() {
  const navigate = useNavigate();
  const list = useFilters({ status: '', from: '', to: '' });
  const params = { ...list.params, ...periodParams(list.filters.from, list.filters.to) };
  const query = useQuery({
    queryKey: ['orders', params],
    queryFn: () => api<Page<Order>>(`/orders?${queryString(params)}`),
  });
  return (
    <>
      <PageHeading
        title="Pedidos da operação"
        description="Do primeiro item à entrega, acompanhe cada venda."
        actions={
          <Button onClick={() => navigate('/orders/new')}>
            <Plus size={16} />
            Novo pedido
          </Button>
        }
      />
      <div className="panel">
        <div className="filters">
          <SearchInput
            value={list.filters.search}
            onChange={(value) => list.setFilter('search', value)}
            placeholder="Buscar número do pedido ou cliente…"
          />
          <select
            aria-label="Filtrar status do pedido"
            value={list.filters.status}
            onChange={(e) => list.setFilter('status', e.target.value)}
          >
            <option value="">Todos os status</option>
            {(Object.keys(ORDER_LABEL) as OrderStatus[]).map((status) => (
              <option key={status} value={status}>
                {ORDER_LABEL[status]}
              </option>
            ))}
          </select>
          <label className="filter-date">
            De
            <input
              type="date"
              value={list.filters.from}
              onChange={(e) => list.setFilter('from', e.target.value)}
            />
          </label>
          <label className="filter-date">
            Até
            <input
              type="date"
              value={list.filters.to}
              min={list.filters.from}
              onChange={(e) => list.setFilter('to', e.target.value)}
            />
          </label>
        </div>
        {query.isPending ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState
            error={query.error}
            retry={() => {
              void query.refetch();
            }}
          />
        ) : !query.data.data.length ? (
          <EmptyState
            title="Nenhum pedido encontrado"
            description="Crie uma venda ou ajuste os filtros."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>PEDIDO</th>
                  <th>CLIENTE</th>
                  <th>DATA</th>
                  <th>ITENS</th>
                  <th>STATUS</th>
                  <th>TOTAL</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link to={`/orders/${order.id}`}>
                        <strong className="mono">#{String(order.number).padStart(4, '0')}</strong>
                      </Link>
                    </td>
                    <td>{order.customer?.name ?? 'Consumidor final'}</td>
                    <td>{dateTime(order.createdAt)}</td>
                    <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)} un.</td>
                    <td>
                      <OrderBadge status={order.status} />
                    </td>
                    <td className="number">
                      <strong>{money(order.total)}</strong>
                    </td>
                    <td>
                      <Link className="text-link" to={`/orders/${order.id}`}>
                        Detalhes
                        <ArrowUpRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {query.data && <Pagination meta={query.data.meta} onPage={list.setPage} />}
      </div>
    </>
  );
}
