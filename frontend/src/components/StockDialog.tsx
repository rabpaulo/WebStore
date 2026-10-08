import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight } from '@phosphor-icons/react';
import { api, queryString, send } from '../lib/api';
import { Page, Variant } from '../lib/types';
import { useAction } from '../lib/query';
import { Button, ErrorState, Field, Modal, SearchInput } from './ui';

export function StockDialog({
  variant,
  onClose,
  initialMode = 'entry',
}: {
  variant?: Variant;
  onClose: () => void;
  initialMode?: 'entry' | 'adjustment';
}) {
  const [mode, setMode] = useState(initialMode);
  const [selected, setSelected] = useState<Variant | undefined>(variant);
  const [search, setSearch] = useState('');
  const variants = useQuery({
    queryKey: ['inventory-lookup', search],
    queryFn: () => api<Page<Variant>>(`/inventory?${queryString({ search, limit: 12 })}`),
    enabled: !variant,
  });
  const schema = z.object({
    amount: z
      .number()
      .int('Use um número inteiro.')
      .min(
        mode === 'entry' ? 1 : 0,
        mode === 'entry' ? 'Informe ao menos 1 unidade.' : 'O saldo não pode ser negativo.',
      )
      .max(1000000),
    reason: z.string().trim().min(3, 'Descreva o motivo da movimentação.').max(500),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: variant
        ? mode === 'entry'
          ? Math.max(1, variant.minimumStock * 2 - variant.currentStock)
          : variant.currentStock
        : 1,
      reason: mode === 'entry' ? 'Reposição do fornecedor' : '',
    },
  });
  const save = useAction(
    (values: z.infer<typeof schema>) =>
      api(
        `/inventory/${mode}`,
        send('POST', {
          productVariantId: selected?.id,
          ...(mode === 'entry' ? { quantity: values.amount } : { targetStock: values.amount }),
          reason: values.reason,
        }),
      ),
    'Movimentação registrada com sucesso.',
    onClose,
  );
  const amount = form.watch('amount');
  const resultingStock = selected
    ? mode === 'entry'
      ? selected.currentStock + (Number.isFinite(amount) ? amount : 0)
      : amount
    : 0;
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
      title={mode === 'entry' ? 'Entrada de estoque' : 'Ajuste de estoque'}
      description="O saldo e o histórico são atualizados na mesma operação."
    >
      <div className="inventory-tabs">
        <button
          className={`inventory-tab ${mode === 'entry' ? 'selected' : ''}`}
          onClick={() => {
            setMode('entry');
            form.setValue('amount', 1);
          }}
        >
          Entrada
        </button>
        <button
          className={`inventory-tab ${mode === 'adjustment' ? 'selected' : ''}`}
          onClick={() => {
            setMode('adjustment');
            form.setValue('amount', selected?.currentStock ?? 0);
          }}
        >
          Contagem e ajuste
        </button>
      </div>
      {!variant && (
        <>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Pesquisar produto ou SKU…"
          />
          <Field label="Selecione a variante">
            <select
              value={selected?.id ?? ''}
              onChange={(e) =>
                setSelected(variants.data?.data.find((v) => v.id === e.target.value))
              }
            >
              <option value="">Escolha uma variante</option>
              {selected && !variants.data?.data.some((v) => v.id === selected.id) && (
                <option value={selected.id}>{selected.sku}</option>
              )}
              {variants.data?.data.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.product?.name} · {v.color}/{v.size} · {v.sku}
                </option>
              ))}
            </select>
          </Field>
          {variants.error && (
            <ErrorState
              error={variants.error}
              retry={() => {
                void variants.refetch();
              }}
            />
          )}
        </>
      )}
      {selected && (
        <p className="inline-info">
          <strong>{selected.product?.name}</strong>
          <br />
          {selected.color} / {selected.size} · <span className="mono">{selected.sku}</span>
        </p>
      )}
      <form onSubmit={form.handleSubmit((values) => save.mutate(values))}>
        <div className="form-grid stock-form-grid">
          <Field
            label={mode === 'entry' ? 'Quantidade a adicionar' : 'Saldo físico contado'}
            error={form.formState.errors.amount?.message}
          >
            <input
              type="number"
              min={mode === 'entry' ? 1 : 0}
              {...form.register('amount', { valueAsNumber: true })}
            />
          </Field>
        </div>
        <Field label="Motivo" error={form.formState.errors.reason?.message}>
          <textarea
            placeholder="Descreva o motivo para manter o histórico completo."
            {...form.register('reason')}
          />
        </Field>
        {selected && (
          <div className="stock-preview">
            <div>
              <small>Estoque atual</small>
              <strong>{selected.currentStock}</strong>
            </div>
            <ArrowRight size={21} />
            <div>
              <small>Estoque após a operação</small>
              <strong>{Number.isFinite(resultingStock) ? resultingStock : 0}</strong>
            </div>
          </div>
        )}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={save.isPending}>
            Voltar
          </Button>
          <Button disabled={!selected || save.isPending}>
            {save.isPending ? 'Registrando…' : 'Registrar movimentação'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
