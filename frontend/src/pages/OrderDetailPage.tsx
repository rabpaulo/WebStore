import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, X } from '@phosphor-icons/react';
import { useAuth } from '../auth/AuthProvider';
import { api, send } from '../lib/api';
import { Order, OrderStatus } from '../lib/types';
import { useAction } from '../lib/query';
import { dateTime, money, ORDER_LABEL } from '../lib/format';
import {
  Button,
  ConfirmDialog,
  ErrorState,
  LoadingState,
  OrderBadge,
  PageHeading,
} from '../components/ui';

const steps: OrderStatus[] = ['PENDING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED'];
const next: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'PAID',
  PAID: 'PREPARING',
  PREPARING: 'SHIPPED',
  SHIPPED: 'DELIVERED',
};
const actionLabel: Partial<Record<OrderStatus, string>> = {
  PENDING: 'Confirmar pagamento',
  PAID: 'Iniciar preparação',
  PREPARING: 'Marcar como enviado',
  SHIPPED: 'Confirmar entrega',
};
export function OrderDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [confirm, setConfirm] = useState<'cancel' | 'advance' | undefined>();
  const query = useQuery({ queryKey: ['order', id], queryFn: () => api<Order>(`/orders/${id}`) });
  const change = useAction(
    (status: OrderStatus) => api<Order>(`/orders/${id}/status`, send('PATCH', { status })),
    'Status do pedido atualizado.',
    () => setConfirm(undefined),
  );
  const cancel = useAction(
    () => api<Order>(`/orders/${id}/cancel`, send('POST')),
    'Pedido cancelado. O estoque consumido foi devolvido.',
    () => setConfirm(undefined),
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
  const order = query.data;
  const currentStep = steps.indexOf(order.status);
  const nextStatus = next[order.status];
  return (
    <>
      <Link to="/orders" className="back-link">
        <ArrowLeft size={15} />
        Voltar aos pedidos
      </Link>
      <PageHeading
        title={`Pedido #${String(order.number).padStart(4, '0')}`}
        description={`Criado em ${dateTime(order.createdAt)} por ${order.createdBy.name}.`}
        actions={
          <>
            {user?.role === 'ADMIN' && ['PENDING', 'PAID', 'PREPARING'].includes(order.status) && (
              <Button variant="secondary" onClick={() => setConfirm('cancel')}>
                <X size={15} />
                Cancelar pedido
              </Button>
            )}
            {nextStatus && (
              <Button onClick={() => setConfirm('advance')}>
                {actionLabel[order.status]}
                <ArrowRight size={16} />
              </Button>
            )}
          </>
        }
      />
      {order.status === 'CANCELLED' ? (
        <p className="inline-info order-cancelled">
          Pedido cancelado. Os itens pagos foram devolvidos ao estoque e registrados no histórico.
        </p>
      ) : (
        <div className="status-track">
          {steps.map((step, index) => (
            <div
              className={`status-step ${index === currentStep ? 'current' : index < currentStep ? 'done' : ''}`}
              key={step}
            >
              <span>{index < currentStep ? <Check size={11} /> : index + 1}</span>
              {ORDER_LABEL[step]}
            </div>
          ))}
        </div>
      )}
      <div className="detail-grid">
        <div className="panel">
          <div className="panel-heading">
            <h2>Itens do pedido</h2>
            <OrderBadge status={order.status} />
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>PRODUTO</th>
                  <th>QUANTIDADE</th>
                  <th>PREÇO UNIT.</th>
                  <th>SUBTOTAL</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`/products/${item.productVariant.productId}`}>
                        <strong>{item.productVariant.product.name}</strong>
                        <span className="subtext">
                          {item.productVariant.color} / {item.productVariant.size} ·{' '}
                          <span className="mono">{item.productVariant.sku}</span>
                        </span>
                      </Link>
                    </td>
                    <td>{item.quantity} un.</td>
                    <td>{money(item.unitPrice)}</td>
                    <td>{money(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="order-total">
            <span>Total do pedido</span>
            <strong>{money(order.total)}</strong>
          </div>
        </div>
        <div>
          <div className="panel">
            <div className="panel-heading">
              <h2>Informações do pedido</h2>
            </div>
            <dl className="info-list">
              <div>
                <dt>Cliente</dt>
                <dd>{order.customer?.name ?? 'Consumidor final'}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{order.customer?.email ?? 'Não informado'}</dd>
              </div>
              <div>
                <dt>Telefone</dt>
                <dd>{order.customer?.phone ?? 'Não informado'}</dd>
              </div>
              <div>
                <dt>Responsável</dt>
                <dd>{order.createdBy.name}</dd>
              </div>
              <div>
                <dt>Pagamento</dt>
                <dd>{order.paidAt ? dateTime(order.paidAt) : 'Não confirmado'}</dd>
              </div>
            </dl>
          </div>
          <div className="order-audit-link">
            <Link to={`/movements?orderId=${order.id}`} className="text-link">
              Consultar movimentações deste pedido
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirm === 'cancel'}
        onOpenChange={(open) => {
          if (!open) setConfirm(undefined);
        }}
        title="Cancelar este pedido?"
        description={
          order.status === 'PENDING'
            ? 'O pedido será cancelado. Como não houve pagamento, nenhum saldo será devolvido.'
            : 'As quantidades consumidas serão devolvidas ao estoque com uma movimentação de cancelamento.'
        }
        onConfirm={() => cancel.mutate()}
        pending={cancel.isPending}
        label="Cancelar pedido"
        danger
      />
      <ConfirmDialog
        open={confirm === 'advance'}
        onOpenChange={(open) => {
          if (!open) setConfirm(undefined);
        }}
        title={actionLabel[order.status] ?? 'Avançar pedido'}
        description={
          order.status === 'PENDING'
            ? 'Ao confirmar o pagamento, o estoque de cada item será reduzido. Todos os saldos serão verificados novamente.'
            : `O pedido passará para ${nextStatus ? ORDER_LABEL[nextStatus].toLowerCase() : ''}.`
        }
        onConfirm={() => {
          if (nextStatus) change.mutate(nextStatus);
        }}
        pending={change.isPending}
        label="Confirmar"
      />
    </>
  );
}
