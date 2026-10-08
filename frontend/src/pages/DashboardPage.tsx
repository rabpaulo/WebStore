import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarBlank,
  CheckCircle,
  CirclesFour,
  ClipboardText,
  Cube,
  CurrencyCircleDollar,
  Plus,
  Warning,
  WarningCircle,
} from '@phosphor-icons/react';
import { useAuth } from '../auth/AuthProvider';
import { api, queryString } from '../lib/api';
import { DashboardSummary, Variant } from '../lib/types';
import { dateTime, money, number } from '../lib/format';
import { SalesChart } from '../components/SalesChart';
import { ProductIcon } from '../components/ProductIcon';
import { StockDialog } from '../components/StockDialog';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  OrderBadge,
  PageHeading,
} from '../components/ui';

function monthNow() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}`;
}
export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [month, setMonth] = useState(monthNow);
  const [restock, setRestock] = useState<Variant | undefined>();
  const query = useQuery({
    queryKey: ['dashboard', month],
    queryFn: () => api<DashboardSummary>(`/dashboard/summary?${queryString({ month })}`),
  });
  const monthName = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(`${month}-01T12:00:00-03:00`));
  if (query.isPending)
    return (
      <>
        <PageHeading title="Visão geral" description="Sua operação, vista de perto." />
        <LoadingState />
      </>
    );
  if (query.error)
    return (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const summary = query.data;
  const healthy = Math.max(0, summary.totalVariants - summary.lowStock - summary.outOfStock);
  const healthyPercent = summary.totalVariants
    ? Math.round((healthy / summary.totalVariants) * 100)
    : 0;
  const paidOrders = summary.salesByDay.reduce((sum, day) => sum + day.orders, 0);
  const stats = [
    {
      label: 'Produtos cadastrados',
      value: number(summary.products),
      note: 'Organizados por categoria',
      icon: CirclesFour,
      tone: '',
    },
    {
      label: 'Pedidos do mês',
      value: number(summary.ordersThisMonth),
      note: 'Todos os status do período',
      icon: ClipboardText,
      tone: '',
    },
    {
      label: user?.role === 'ADMIN' ? 'Faturamento do mês' : 'Unidades em estoque',
      value:
        user?.role === 'ADMIN'
          ? money(summary.revenueThisMonth ?? '0')
          : number(summary.stockUnits),
      note: user?.role === 'ADMIN' ? 'Pagos, sem os cancelados' : 'Saldo de produtos ativos',
      icon: user?.role === 'ADMIN' ? CurrencyCircleDollar : Cube,
      tone: '',
      currency: user?.role === 'ADMIN',
    },
    {
      label: 'Estoque baixo',
      value: number(summary.lowStock),
      note: 'Variantes no mínimo ou abaixo',
      icon: Warning,
      tone: 'warning',
    },
    {
      label: 'Sem estoque',
      value: number(summary.outOfStock),
      note: 'Variantes indisponíveis',
      icon: WarningCircle,
      tone: 'danger',
    },
  ];
  return (
    <>
      <PageHeading
        title={`Olá, ${user?.name.split(' ')[0]}.`}
        description="Um novo olhar sobre sua operação. Veja o que precisa de atenção."
        eyebrow="VISÃO GERAL"
        actions={
          <>
            <label className="month-picker">
              <CalendarBlank size={16} />
              <input
                aria-label="Mês do dashboard"
                type="month"
                min="2000-01"
                max="2100-12"
                value={month}
                onChange={(e) => setMonth(e.target.value || monthNow())}
              />
            </label>
            <Button onClick={() => navigate('/orders/new')}>
              <Plus size={16} />
              Novo pedido
            </Button>
          </>
        }
      />
      <div className="stat-grid">
        {stats.map((stat) => (
          <div className={`stat-card ${stat.tone}`} key={stat.label}>
            <div className="stat-header">
              <span>{stat.label}</span>
              <stat.icon size={18} weight="duotone" />
            </div>
            <strong className={`stat-value ${stat.currency ? 'currency' : ''}`}>
              {stat.value}
            </strong>
            <small>{stat.note}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-top">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Movimento de vendas</h2>
              <p>Pedidos pagos em {monthName}.</p>
            </div>
            <span className="chart-legend">
              <span />
              Pedidos pagos
            </span>
          </div>
          <div className="chart-subheader">
            <div>
              <strong>
                {paidOrders}
                <span className="chart-unit"> pedidos</span>
              </strong>
              <small>Pagamentos confirmados, excluindo cancelamentos.</small>
            </div>
            <span className="chart-period">{monthName}</span>
          </div>
          <SalesChart days={summary.salesByDay} />
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Saúde do estoque</h2>
            <Cube size={19} weight="duotone" className="muted" />
          </div>
          <div className="stock-health">
            <strong>{healthyPercent}%</strong>
            <p>das variantes com estoque em dia</p>
            <div
              className="health-bar"
              aria-label={`${healthy} em dia, ${summary.lowStock} baixas, ${summary.outOfStock} sem estoque`}
            >
              <span className="health-ok" style={{ flex: healthy }} />
              <span className="health-low" style={{ flex: summary.lowStock }} />
              <span className="health-out" style={{ flex: summary.outOfStock }} />
            </div>
            <div className="health-legend">
              <div>
                <span className="health-ok" />
                Em dia<strong>{healthy} variantes</strong>
              </div>
              <div>
                <span className="health-low" />
                Estoque baixo<strong>{summary.lowStock} variantes</strong>
              </div>
              <div>
                <span className="health-out" />
                Sem estoque<strong>{summary.outOfStock} variantes</strong>
              </div>
            </div>
            <p className="health-note">
              <CheckCircle size={12} /> {number(summary.stockUnits)} unidades em produtos ativos.
              <Link to="/inventory">
                Ver estoque
                <ArrowRight size={11} />
              </Link>
            </p>
          </div>
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Pedidos recentes</h2>
              <p>As últimas vendas da sua operação no período.</p>
            </div>
            <Link to="/orders" className="text-link">
              Ver todos
              <ArrowRight size={13} />
            </Link>
          </div>
          {summary.recentOrders.length ? (
            <div className="table-scroll">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>PEDIDO</th>
                    <th>CLIENTE</th>
                    <th>STATUS</th>
                    <th className="right">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link to={`/orders/${order.id}`}>
                          <strong className="mono">#{String(order.number).padStart(4, '0')}</strong>
                          <span className="subtext">{dateTime(order.createdAt)}</span>
                        </Link>
                      </td>
                      <td>{order.customer?.name ?? 'Consumidor final'}</td>
                      <td>
                        <OrderBadge status={order.status} />
                      </td>
                      <td className="right number">
                        <strong>{money(order.total)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Nenhum pedido neste mês"
              description="As vendas do período aparecerão aqui."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                Precisam de reposição
                <span className="count">{summary.lowStock + summary.outOfStock}</span>
              </h2>
              <p>Pequenos sinais para manter tudo em dia.</p>
            </div>
          </div>
          {summary.replenishment.length ? (
            summary.replenishment.map((variant) => (
              <div className="replenishment-item" key={variant.id}>
                <ProductIcon category={variant.product.category.name} />
                <div>
                  <Link to={`/products/${variant.productId}`}>
                    <strong>{variant.product.name}</strong>
                  </Link>
                  <small>
                    {variant.color} / {variant.size} · {variant.currentStock}/{variant.minimumStock}{' '}
                    un.
                  </small>
                </div>
                {user?.role === 'ADMIN' ? (
                  <Button variant="secondary" onClick={() => setRestock(variant)}>
                    +{variant.suggestedQuantity} un.
                    <Plus size={10} />
                  </Button>
                ) : (
                  <span className="badge badge-low">+{variant.suggestedQuantity} un.</span>
                )}
              </div>
            ))
          ) : (
            <EmptyState
              title="Estoque em dia"
              description="Nenhuma variante precisa de reposição."
            />
          )}
          <div className="replenishment-rule">
            <span>Meta de reposição: 2× o estoque mínimo.</span>
            <Link className="text-link" to="/inventory?replenishment=true">
              Ver sugestões
              <ArrowRight size={11} />
            </Link>
          </div>
        </section>
      </div>
      {restock && <StockDialog variant={restock} onClose={() => setRestock(undefined)} />}
    </>
  );
}
