import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, PencilSimple, Plus, Power } from '@phosphor-icons/react';
import { useAuth } from '../auth/AuthProvider';
import { api, send } from '../lib/api';
import { Product, Variant } from '../lib/types';
import { useAction } from '../lib/query';
import { money, stockStatus } from '../lib/format';
import { ProductIcon } from '../components/ProductIcon';
import { EditProductForm, VariantForm } from '../components/ProductForm';
import {
  Button,
  ColorDot,
  ConfirmDialog,
  ErrorState,
  LoadingState,
  Modal,
  PageHeading,
  StockBadge,
} from '../components/ui';

export function ProductDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const admin = user?.role === 'ADMIN';
  const [edit, setEdit] = useState(false);
  const [variantDialog, setVariantDialog] = useState<Variant | null | undefined>(undefined);
  const [confirm, setConfirm] = useState(false);
  const query = useQuery({
    queryKey: ['product', id],
    queryFn: () => api<Product>(`/products/${id}`),
  });
  const toggle = useAction(
    () => api<Product>(`/products/${id}`, send('PATCH', { active: !query.data?.active })),
    'Status do produto atualizado.',
    () => setConfirm(false),
  );
  if (query.isPending) return <LoadingState />;
  if (query.error)
    return (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const product = query.data;
  return (
    <>
      <Link to="/products" className="back-link">
        <ArrowLeft size={15} />
        Voltar ao catálogo
      </Link>
      <PageHeading
        title={product.name}
        description="Informações do produto e disponibilidade de cada variante."
        actions={
          admin && (
            <>
              <Button variant="secondary" onClick={() => setEdit(true)}>
                <PencilSimple size={16} />
                Editar produto
              </Button>
              <Button variant="secondary" onClick={() => setConfirm(true)}>
                <Power size={16} />
                {product.active ? 'Desativar' : 'Ativar'}
              </Button>
            </>
          )
        }
      />
      <div className="panel detail-summary">
        <ProductIcon category={product.category.name} />
        <div>
          <h2>{product.category.name}</h2>
          <p>{product.description || 'Nenhuma descrição adicionada.'}</p>
          <div className="detail-meta">
            <span>{product.variants.length} variantes</span>
            <span>
              {product.variants.reduce((sum, v) => sum + v.currentStock, 0)} unidades em estoque
            </span>
          </div>
        </div>
        <span className={`badge ${product.active ? 'badge-active' : 'badge-inactive'}`}>
          {product.active ? 'Produto ativo' : 'Produto inativo'}
        </span>
      </div>
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Variantes</h2>
            <p>Estoque controlado individualmente por SKU.</p>
          </div>
          {admin && (
            <Button variant="secondary" onClick={() => setVariantDialog(null)}>
              <Plus size={16} />
              Adicionar variante
            </Button>
          )}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>COR</th>
                <th>TAMANHO</th>
                <th>SKU</th>
                <th>PREÇO</th>
                <th>ESTOQUE ATUAL</th>
                <th>MÍNIMO</th>
                <th>SITUAÇÃO</th>
                {admin && <th />}
              </tr>
            </thead>
            <tbody>
              {product.variants.map((v) => (
                <tr key={v.id}>
                  <td>
                    <ColorDot color={v.color} />
                  </td>
                  <td>{v.size}</td>
                  <td className="mono">{v.sku}</td>
                  <td>{money(v.price)}</td>
                  <td>{v.currentStock} un.</td>
                  <td>{v.minimumStock} un.</td>
                  <td>
                    <StockBadge status={stockStatus(v.currentStock, v.minimumStock)} />
                  </td>
                  {admin && (
                    <td>
                      <Button
                        variant="ghost"
                        className="icon-button"
                        aria-label={`Editar ${v.sku}`}
                        onClick={() => setVariantDialog(v)}
                      >
                        <PencilSimple size={16} />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {edit && (
        <Modal
          open
          onOpenChange={setEdit}
          title="Editar produto"
          description="Atualize as informações do catálogo."
        >
          <EditProductForm product={product} onClose={() => setEdit(false)} />
        </Modal>
      )}
      {variantDialog !== undefined && (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open) setVariantDialog(undefined);
          }}
          title={variantDialog ? 'Editar variante' : 'Nova variante'}
          description="Cada combinação de cor e tamanho possui um SKU único."
        >
          <VariantForm
            productId={product.id}
            variant={variantDialog ?? undefined}
            onClose={() => setVariantDialog(undefined)}
          />
        </Modal>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={product.active ? 'Desativar produto?' : 'Ativar produto?'}
        description={
          product.active
            ? 'O produto ficará indisponível para novos pedidos. O histórico será preservado.'
            : 'O produto voltará a estar disponível para venda.'
        }
        onConfirm={() => toggle.mutate()}
        pending={toggle.isPending}
        label={product.active ? 'Desativar' : 'Ativar'}
        danger={product.active}
      />
    </>
  );
}
