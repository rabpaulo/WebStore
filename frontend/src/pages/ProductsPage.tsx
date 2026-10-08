import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Plus } from '@phosphor-icons/react';
import { useAuth } from '../auth/AuthProvider';
import { api, queryString } from '../lib/api';
import { Category, Page, Product } from '../lib/types';
import { useFilters } from '../lib/useFilters';
import { ProductIcon } from '../components/ProductIcon';
import { ProductForm } from '../components/ProductForm';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  PageHeading,
  Pagination,
  SearchInput,
  StockBadge,
} from '../components/ui';

export function ProductsPage() {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const list = useFilters({ categoryId: '', active: '' });
  const products = useQuery({
    queryKey: ['products', list.params],
    queryFn: () => api<Page<Product>>(`/products?${queryString(list.params)}`),
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });
  return (
    <>
      <PageHeading
        title="Catálogo de produtos"
        description="Cada produto, com suas cores, tamanhos e possibilidades."
        actions={
          user?.role === 'ADMIN' && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={17} />
              Novo produto
            </Button>
          )
        }
      />
      <div className="panel">
        <div className="filters">
          <SearchInput
            value={list.filters.search}
            onChange={(value) => list.setFilter('search', value)}
            placeholder="Buscar por nome do produto…"
          />
          <select
            aria-label="Filtrar categoria"
            value={list.filters.categoryId}
            onChange={(e) => list.setFilter('categoryId', e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categories.data?.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar status do produto"
            value={list.filters.active}
            onChange={(e) => list.setFilter('active', e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>
        {products.isPending ? (
          <LoadingState />
        ) : products.error ? (
          <ErrorState
            error={products.error}
            retry={() => {
              void products.refetch();
            }}
          />
        ) : !products.data.data.length ? (
          <EmptyState
            title="Nenhum produto encontrado"
            description="Altere os filtros ou cadastre o primeiro produto."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>PRODUTO</th>
                  <th>CATEGORIA</th>
                  <th>VARIANTES</th>
                  <th>ESTOQUE TOTAL</th>
                  <th>SITUAÇÃO DO ESTOQUE</th>
                  <th>STATUS</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.data.data.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <Link className="product-cell" to={`/products/${product.id}`}>
                        <ProductIcon category={product.category.name} />
                        <div>
                          <strong>{product.name}</strong>
                          <span className="subtext">
                            {product.description.slice(0, 45)}
                            {product.description.length > 45 ? '…' : ''}
                          </span>
                        </div>
                      </Link>
                    </td>
                    <td>
                      <span className="category-tag">{product.category.name}</span>
                    </td>
                    <td>{product.variantCount} variantes</td>
                    <td className="number">{product.totalStock} un.</td>
                    <td>
                      <StockBadge status={product.stockStatus ?? 'OK'} />
                    </td>
                    <td>
                      <span
                        className={`badge ${product.active ? 'badge-active' : 'badge-inactive'}`}
                      >
                        {product.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/products/${product.id}`} className="text-link">
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
        {products.data && <Pagination meta={products.data.meta} onPage={list.setPage} />}
      </div>
      {creating && (
        <Modal
          open
          onOpenChange={setCreating}
          title="Novo produto"
          description="Cadastre o produto e as variantes que serão vendidas."
          wide
        >
          <ProductForm
            onClose={() => setCreating(false)}
            onCreated={(product) => {
              setCreating(false);
              navigate(`/products/${product.id}`);
            }}
          />
        </Modal>
      )}
    </>
  );
}
