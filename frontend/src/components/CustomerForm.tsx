import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, send } from '../lib/api';
import { Customer } from '../lib/types';
import { useAction } from '../lib/query';
import { Button, Field } from './ui';

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do cliente.').max(100),
  email: z.union([z.email('Informe um e-mail válido.'), z.literal('')]),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^[+()\d\s-]{8,30}$/.test(value),
      'Informe um telefone válido.',
    ),
});
export function CustomerForm({
  customer,
  onClose,
  onSaved,
}: {
  customer?: Customer;
  onClose: () => void;
  onSaved?: (customer: Customer) => void;
}) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: customer?.name ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
    },
  });
  const save = useAction(
    (values: z.infer<typeof schema>) =>
      api<Customer>(
        customer ? `/customers/${customer.id}` : '/customers',
        send(customer ? 'PATCH' : 'POST', {
          ...values,
          email: values.email || null,
          phone: values.phone || null,
        }),
      ),
    customer ? 'Cliente atualizado.' : 'Cliente cadastrado com sucesso.',
    (data) => {
      onSaved?.(data);
      onClose();
    },
  );
  return (
    <form onSubmit={form.handleSubmit((values) => save.mutate(values))}>
      <Field label="Nome do cliente" error={form.formState.errors.name?.message}>
        <input autoComplete="name" placeholder="Nome completo" {...form.register('name')} />
      </Field>
      <Field label="E-mail (opcional)" error={form.formState.errors.email?.message}>
        <input
          type="email"
          autoComplete="email"
          placeholder="cliente@email.com"
          {...form.register('email')}
        />
      </Field>
      <Field label="Telefone (opcional)" error={form.formState.errors.phone?.message}>
        <input
          type="tel"
          autoComplete="tel"
          placeholder="(11) 99876-5432"
          {...form.register('phone')}
        />
      </Field>
      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={onClose} disabled={save.isPending}>
          Voltar
        </Button>
        <Button disabled={save.isPending}>{save.isPending ? 'Salvando…' : 'Salvar cliente'}</Button>
      </div>
    </form>
  );
}
