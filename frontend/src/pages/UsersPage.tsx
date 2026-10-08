import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from '@phosphor-icons/react';
import { api, queryString, send } from '../lib/api';
import { Page, User } from '../lib/types';
import { useFilters } from '../lib/useFilters';
import { useAction } from '../lib/query';
import { date, initials, roleLabel } from '../lib/format';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Modal,
  PageHeading,
  Pagination,
  SearchInput,
} from '../components/ui';

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome.').max(100),
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(8, 'Use no mínimo 8 caracteres.').max(72),
  role: z.enum(['ADMIN', 'SELLER']),
});
function UserForm({ onClose }: { onClose: () => void }) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', role: 'SELLER' },
  });
  const save = useAction(
    (values: z.infer<typeof schema>) => api<User>('/users', send('POST', values)),
    'Usuário cadastrado com sucesso.',
    onClose,
  );
  return (
    <form onSubmit={form.handleSubmit((values) => save.mutate(values))}>
      <Field label="Nome" error={form.formState.errors.name?.message}>
        <input {...form.register('name')} />
      </Field>
      <Field label="E-mail" error={form.formState.errors.email?.message}>
        <input type="email" {...form.register('email')} />
      </Field>
      <Field
        label="Senha inicial"
        error={form.formState.errors.password?.message}
        hint="No mínimo 8 e no máximo 72 caracteres."
      >
        <input type="password" autoComplete="new-password" {...form.register('password')} />
      </Field>
      <Field label="Perfil de acesso" error={form.formState.errors.role?.message}>
        <select {...form.register('role')}>
          <option value="SELLER">Vendedor</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </Field>
      <p className="inline-info">
        Vendedores consultam o catálogo e criam pedidos. Administradores também gerenciam produtos,
        estoque e usuários.
      </p>
      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={onClose}>
          Voltar
        </Button>
        <Button disabled={save.isPending}>
          {save.isPending ? 'Salvando…' : 'Cadastrar usuário'}
        </Button>
      </div>
    </form>
  );
}
export function UsersPage() {
  const list = useFilters();
  const [creating, setCreating] = useState(false);
  const query = useQuery({
    queryKey: ['users', list.params],
    queryFn: () => api<Page<User>>(`/users?${queryString(list.params)}`),
  });
  return (
    <>
      <PageHeading
        title="Equipe e acessos"
        description="Cada pessoa com as permissões certas para trabalhar."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} />
            Novo usuário
          </Button>
        }
      />
      <div className="panel">
        <div className="filters">
          <SearchInput
            value={list.filters.search}
            onChange={(value) => list.setFilter('search', value)}
            placeholder="Buscar por nome ou e-mail…"
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
          <EmptyState />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>USUÁRIO</th>
                  <th>E-MAIL</th>
                  <th>PERFIL</th>
                  <th>CADASTRADO EM</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="product-cell">
                        <div className="avatar">{initials(user.name)}</div>
                        <strong>{user.name}</strong>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span
                        className={`badge ${user.role === 'ADMIN' ? 'badge-adjustment' : 'badge-ok'}`}
                      >
                        {roleLabel(user.role)}
                      </span>
                    </td>
                    <td>{date(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {query.data && <Pagination meta={query.data.meta} onPage={list.setPage} />}
      </div>
      {creating && (
        <Modal
          open
          onOpenChange={setCreating}
          title="Novo usuário"
          description="Defina as credenciais e o perfil de acesso."
        >
          <UserForm onClose={() => setCreating(false)} />
        </Modal>
      )}
    </>
  );
}
