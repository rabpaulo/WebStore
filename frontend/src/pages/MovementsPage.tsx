import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api, queryString } from '../lib/api';
import { Movement, Page } from '../lib/types';
import { useFilters } from '../lib/useFilters';
import { dateTime, periodParams } from '../lib/format';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeading,
  Pagination,
  SearchInput,
} from '../components/ui';

const LABEL = { IN: 'Entrada', OUT: 'Saída', ADJUSTMENT: 'Ajuste' };
export function MovementsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') ?? '';
  const list = useFilters({
    type: '',
    from: '',
    to: '',
    orderId: searchParams.get('orderId') ?? '',
  });
  const { setFilter } = list;
  useEffect(() => setFilter('orderId', orderId), [orderId, setFilter]);
  const params = { ...list.params, ...periodParams(list.filters.from, list.filters.to) };
  const query = useQuery({
    queryKey: ['movements', params],
    queryFn: () => api<Page<Movement>>(`/inventory/movements?${queryString(params)}`),
  });
  return (
    <>
      <PageHeading
        title="Movimentações de estoque"
        description="Um histórico completo de como e por que o estoque mudou."
      />
      <div className="panel">
        <div className="filters">
          <SearchInput
            value={list.filters.search}
            onChange={(value) => list.setFilter('search', value)}
            placeholder="Buscar produto, SKU ou motivo…"
          />
          <select
            aria-label="Filtrar tipo de movimentação"
            value={list.filters.type}
            onChange={(e) => list.setFilter('type', e.target.value)}
          >
            <option value="">Todos os tipos</option>
            <option value="IN">Entradas</option>
            <option value="OUT">Saídas</option>
            <option value="ADJUSTMENT">Ajustes</option>
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
        {list.filters.orderId && (
          <div className="filter-summary">
            <span>Movimentações do pedido selecionado.</span>
            <button className="button button-ghost" onClick={() => setSearchParams({})}>
              Mostrar todas
            </button>
          </div>
        )}
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
            title="Nenhuma movimentação neste período"
            description="As entradas, vendas, ajustes e cancelamentos aparecerão aqui."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>DATA / HORA</th>
                  <th>PRODUTO / SKU</th>
                  <th>TIPO</th>
                  <th>QUANTIDADE</th>
                  <th>SALDO</th>
                  <th>MOTIVO</th>
                  <th>PEDIDO</th>
                  <th>RESPONSÁVEL</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((m) => (
                  <tr key={m.id}>
                    <td>{dateTime(m.createdAt)}</td>
                    <td>
                      <strong>{m.productVariant.product.name}</strong>
                      <span className="subtext mono">
                        {m.productVariant.sku} · {m.productVariant.color}/{m.productVariant.size}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge badge-${m.type === 'IN' ? 'in' : m.type === 'OUT' ? 'outbound' : 'adjustment'}`}
                      >
                        {LABEL[m.type]}
                      </span>
                    </td>
                    <td>
                      {m.type === 'OUT' ? '−' : m.quantity > 0 ? '+' : ''}
                      {m.quantity} un.
                    </td>
                    <td>
                      {m.previousStock} → {m.resultingStock}
                    </td>
                    <td title={m.reason}>
                      {m.reason.length > 35 ? `${m.reason.slice(0, 35)}…` : m.reason}
                    </td>
                    <td>
                      {m.order ? (
                        <Link className="text-link" to={`/orders/${m.order.id}`}>
                          #{m.order.number}
                        </Link>
                      ) : (
                        <span className="muted">Sem pedido</span>
                      )}
                    </td>
                    <td>{m.createdBy.name}</td>
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
