import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PencilSimple, Plus } from '@phosphor-icons/react';
import { api, queryString } from '../lib/api';
import { Customer, Page } from '../lib/types';
import { useFilters } from '../lib/useFilters';
import { date, initials } from '../lib/format';
import { CustomerForm } from '../components/CustomerForm';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  PageHeading,
  Pagination,
  SearchInput,
} from '../components/ui';

export function CustomersPage() {
  const list = useFilters();
  const [dialog, setDialog] = useState<Customer | null | undefined>(undefined);
  const query = useQuery({
    queryKey: ['customers', list.params],
    queryFn: () => api<Page<Customer>>(`/customers?${queryString(list.params)}`),
  });
  return (
    <>
      <PageHeading
        title="Seus clientes"
        description="Os contatos e relacionamentos que fazem parte da sua operação."
        actions={
          <Button onClick={() => setDialog(null)}>
            <Plus size={16} />
            Novo cliente
          </Button>
        }
      />
      <div className="panel">
        <div className="filters">
          <SearchInput
            value={list.filters.search}
            onChange={(value) => list.setFilter('search', value)}
            placeholder="Buscar por nome, e-mail ou telefone…"
          />
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
            title="Nenhum cliente encontrado"
            description="Cadastre um cliente ou ajuste sua busca."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>CLIENTE</th>
                  <th>E-MAIL</th>
                  <th>TELEFONE</th>
                  <th>PEDIDOS</th>
                  <th>CLIENTE DESDE</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="product-cell">
                        <div className="customer-avatar">{initials(c.name)}</div>
                        <strong>{c.name}</strong>
                      </div>
                    </td>
                    <td>{c.email ?? 'Não informado'}</td>
                    <td>{c.phone ?? 'Não informado'}</td>
                    <td>{c._count?.orders ?? 0}</td>
                    <td>{date(c.createdAt)}</td>
                    <td>
                      <Button
                        variant="ghost"
                        className="icon-button"
                        aria-label={`Editar ${c.name}`}
                        onClick={() => setDialog(c)}
                      >
                        <PencilSimple size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {query.data && <Pagination meta={query.data.meta} onPage={list.setPage} />}
      </div>
      {dialog !== undefined && (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open) setDialog(undefined);
          }}
          title={dialog ? 'Editar cliente' : 'Novo cliente'}
          description="Somente o nome é obrigatório."
        >
          <CustomerForm customer={dialog ?? undefined} onClose={() => setDialog(undefined)} />
        </Modal>
      )}
    </>
  );
}
