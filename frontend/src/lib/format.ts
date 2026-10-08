import { OrderStatus, StockStatus } from './types';
export const money = (value: string | number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
export const number = (value: number) => new Intl.NumberFormat('pt-BR').format(value);
export const date = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
export const ORDER_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  PREPARING: 'Em preparação',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};
export const STOCK_LABEL: Record<StockStatus, string> = {
  OK: 'Em dia',
  LOW: 'Estoque baixo',
  OUT: 'Sem estoque',
};
export const stockStatus = (stock: number, minimum: number): StockStatus =>
  stock === 0 ? 'OUT' : stock <= minimum ? 'LOW' : 'OK';
export const roleLabel = (role: string) => (role === 'ADMIN' ? 'Administrador' : 'Vendedor');
export const periodParams = (from: string, to: string) => ({
  from: from ? `${from}T00:00:00-03:00` : undefined,
  to: to ? `${to}T23:59:59.999-03:00` : undefined,
});
