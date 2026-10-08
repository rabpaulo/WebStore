import {
  ButtonHTMLAttributes,
  ReactNode,
  Children,
  cloneElement,
  isValidElement,
  useId,
} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowLeft,
  ArrowRight,
  ArrowClockwise,
  MagnifyingGlass,
  Package,
  X,
} from '@phosphor-icons/react';
import { Page, OrderStatus, StockStatus } from '../lib/types';
import { ORDER_LABEL, STOCK_LABEL } from '../lib/format';

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
function fieldControl(
  children: ReactNode,
  id: string,
  describedBy: string | undefined,
  error: boolean,
): ReactNode {
  return Children.map(children, (child) => {
    if (
      !isValidElement<{
        children?: ReactNode;
        id?: string;
        'aria-invalid'?: boolean;
        'aria-describedby'?: string;
      }>(child)
    )
      return child;
    if (typeof child.type === 'string' && ['input', 'select', 'textarea'].includes(child.type))
      return cloneElement(child, { id, 'aria-invalid': error, 'aria-describedby': describedBy });
    if (typeof child.type === 'string' && child.props.children)
      return cloneElement(child, {
        children: fieldControl(child.props.children, id, describedBy, error),
      });
    return child;
  });
}
export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const descriptionId = `${id}-description`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {fieldControl(children, id, error || hint ? descriptionId : undefined, !!error)}
      {error ? (
        <small id={descriptionId} className="field-error" role="alert">
          {error}
        </small>
      ) : hint ? (
        <small id={descriptionId} className="muted">
          {hint}
        </small>
      ) : null}
    </div>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className={`modal ${wide ? 'modal-wide' : ''}`}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <div className="modal-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              {description && <Dialog.Description>{description}</Dialog.Description>}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" className="icon-button" aria-label="Fechar">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  pending,
  label = 'Confirmar',
  danger = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  pending: boolean;
  label?: string;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="modal-actions">
        <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
          Voltar
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={pending}>
          {pending ? 'Salvando…' : label}
        </Button>
      </div>
    </Modal>
  );
}
export function StockBadge({ status }: { status: StockStatus }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      <span className="status-dot" />
      {STOCK_LABEL[status]}
    </span>
  );
}
export function OrderBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      <span className="status-dot" />
      {ORDER_LABEL[status]}
    </span>
  );
}
export function EmptyState({
  title = 'Nenhum resultado encontrado',
  description = 'Tente alterar os filtros da busca.',
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Package size={36} weight="duotone" />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function LoadingState() {
  return (
    <div className="loading-state" role="status" aria-label="Carregando">
      <div className="skeleton skeleton-heading" />
      {Array.from({ length: 5 }, (_, i) => (
        <div className="skeleton skeleton-row" key={i} />
      ))}
    </div>
  );
}
export function ErrorState({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="error-state" role="alert">
      <h3>Não foi possível carregar os dados</h3>
      <p>{error.message}</p>
      <Button variant="secondary" onClick={retry}>
        <ArrowClockwise size={16} />
        Tentar novamente
      </Button>
    </div>
  );
}
export function Pagination({
  meta,
  onPage,
}: {
  meta: Page<unknown>['meta'];
  onPage: (page: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        {meta.total === 0
          ? 'Nenhum registro'
          : `${(meta.page - 1) * meta.limit + 1}–${Math.min(meta.page * meta.limit, meta.total)} de ${meta.total} registros`}
      </span>
      <div>
        <Button
          variant="secondary"
          className="icon-button"
          aria-label="Página anterior"
          disabled={meta.page <= 1}
          onClick={() => onPage(meta.page - 1)}
        >
          <ArrowLeft size={16} />
        </Button>
        <span>
          Página {meta.page} de {Math.max(1, meta.totalPages)}
        </span>
        <Button
          variant="secondary"
          className="icon-button"
          aria-label="Próxima página"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPage(meta.page + 1)}
        >
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar…',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-input">
      <MagnifyingGlass size={18} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button type="button" aria-label="Limpar busca" onClick={() => onChange('')}>
          <X size={16} />
        </button>
      )}
    </div>
  );
}
export function PageHeading({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
export function ColorDot({ color }: { color: string }) {
  const colors: Record<string, string> = {
    Preto: '#373432',
    Branco: '#f5f4f0',
    Nude: '#c7a994',
    Rosa: '#d7a5ae',
    Vermelho: '#a95757',
  };
  return (
    <span className="color-label">
      <span className="color-dot" style={{ background: colors[color] ?? '#a8a6a1' }} />
      {color}
    </span>
  );
}
