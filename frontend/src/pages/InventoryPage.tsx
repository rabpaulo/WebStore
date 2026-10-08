import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, Plus } from '@phosphor-icons/react';
import { useAuth } from '../auth/AuthProvider';
import { api, queryString } from '../lib/api';
import { Category, Page, Variant } from '../lib/types';
import { useFilters } from '../lib/useFilters';
import { stockStatus } from '../lib/format';
import {
  Button,
  ColorDot,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeading,
  Pagination,
  SearchInput,
  StockBadge,
} from '../components/ui';
import { StockDialog } from '../components/StockDialog';

export function InventoryPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const admin = user?.role === 'ADMIN';
  const list = useFilters({
    categoryId: '',
    stockStatus: '',
    replenishment: searchParams.get('replenishment') === 'true' ? 'true' : '',
  });
  const [dialog, setDialog] = useState<Variant | null | undefined>(undefined);
  const inventory = useQuery({
    queryKey: ['inventory', list.params],
    queryFn: () => api<Page<Variant>>(`/inventory?${queryString(list.params)}`),
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });
  const replenishment = list.filters.replenishment === 'true';
  return (
    <>
      <PageHeading
        title="Estoque em detalhe"
        description="Acompanhe a disponibilidade de cada cor, tamanho e SKU."
        actions={
          admin && (
            <Button onClick={() => setDialog(null)}>
              <Plus size={16} />
              Entrada de estoque
            </Button>
          )
        }
      />
      <div className="inventory-tabs">
        <button
          className={`inventory-tab ${!replenishment ? 'selected' : ''}`}
          onClick={() => list.setFilter('replenishment', '')}
        >
          Todos os itens
        </button>
        <button
          className={`inventory-tab ${replenishment ? 'selected' : ''}`}
          onClick={() => {
            list.setFilter('stockStatus', '');
            list.setFilter('replenishment', 'true');
          }}
        >
          Sugestões de reposição
          <ArrowDown size={13} />
        </button>
      </div>
      {replenishment && (
        <p className="inline-info replenishment-intro">
          Sugestão baseada em regra: repor até o dobro do estoque mínimo. Quantidade sugerida =
          máximo entre 0 e (mínimo × 2 − atual).
        </p>
      )}
      <div className="panel">
        <div className="filters">
          <SearchInput
            value={list.filters.search}
            onChange={(value) => list.setFilter('search', value)}
            placeholder="Buscar produto ou SKU…"
          />
          <select
            aria-label="Filtrar categoria"
            value={list.filters.categoryId}
            onChange={(e) => list.setFilter('categoryId', e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {!replenishment && (
            <select
              aria-label="Filtrar situação do estoque"
              value={list.filters.stockStatus}
              onChange={(e) => list.setFilter('stockStatus', e.target.value)}
            >
              <option value="">Todas as situações</option>
              <option value="OK">Em dia</option>
              <option value="LOW">Estoque baixo</option>
              <option value="OUT">Sem estoque</option>
            </select>
          )}
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
            title={replenishment ? 'Tudo em dia por aqui' : 'Nenhuma variante encontrada'}
            description={
              replenishment
                ? 'Nenhum SKU deste filtro precisa de reposição.'
                : 'Altere os filtros para encontrar outros itens.'
            }
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>PRODUTO / SKU</th>
                  <th>COR</th>
                  <th>TAMANHO</th>
                  <th>ESTOQUE ATUAL</th>
                  <th>MÍNIMO</th>
                  <th>SITUAÇÃO</th>
                  {replenishment && <th>SUGESTÃO</th>}
                  {admin && <th />}
                </tr>
              </thead>
              <tbody>
                {inventory.data.data.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link to={`/products/${v.productId}`}>
                        <strong>{v.product?.name}</strong>
                        <span className="subtext mono">
                          {v.sku}
                          {!v.product?.active ? ' · Inativo' : ''}
                        </span>
                      </Link>
                    </td>
                    <td>
                      <ColorDot color={v.color} />
                    </td>
                    <td>{v.size}</td>
                    <td>
                      <strong
                        className={`stock-number ${stockStatus(v.currentStock, v.minimumStock).toLowerCase()}`}
                      >
                        {v.currentStock} un.
                      </strong>
                    </td>
                    <td>{v.minimumStock} un.</td>
                    <td>
                      <StockBadge status={stockStatus(v.currentStock, v.minimumStock)} />
                    </td>
                    {replenishment && <td>+{v.suggestedQuantity} un.</td>}
                    {admin && (
                      <td className="table-actions">
                        <Button variant="secondary" onClick={() => setDialog(v)}>
                          Repor
                          <ArrowUpRight size={12} />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {inventory.data && <Pagination meta={inventory.data.meta} onPage={list.setPage} />}
      </div>
      {dialog !== undefined && (
        <StockDialog variant={dialog ?? undefined} onClose={() => setDialog(undefined)} />
      )}
    </>
  );
}
