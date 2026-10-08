import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Plus, Trash } from '@phosphor-icons/react';
import { api, send } from '../lib/api';
import { Category, Product, Variant } from '../lib/types';
import { useAction } from '../lib/query';
import { Button, Field, Modal } from './ui';

const variantSchema = z.object({
  color: z.string().trim().min(1, 'Informe a cor.'),
  size: z.string().min(1, 'Informe o tamanho.'),
  sku: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9-]{2,80}$/, 'Use letras, números e hífens.'),
  price: z
    .number()
    .min(0.01, 'Informe um preço maior que zero.')
    .max(9999999.99)
    .refine(
      (v) => Number.isInteger(Math.round(v * 10000) / 100),
      'Use no máximo duas casas decimais.',
    ),
  initialStock: z.number().int().min(0).max(1000000),
  minimumStock: z.number().int().min(0).max(1000000),
});
const productSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe o nome do produto.').max(150),
    description: z.string().trim().max(2000),
    categoryId: z.string().min(1, 'Selecione uma categoria.'),
    variants: z.array(variantSchema).min(1).max(64),
  })
  .refine(
    (values) =>
      new Set(values.variants.map((v) => v.sku.toUpperCase())).size === values.variants.length,
    { message: 'Cada variante deve ter um SKU diferente.', path: ['variants'] },
  );
const emptyVariant = {
  color: 'Preto',
  size: 'M',
  sku: '',
  price: 89.9,
  initialStock: 0,
  minimumStock: 5,
};
const productFieldsSchema = z.object({
  name: z.string().trim().min(2, 'Informe um nome.').max(150),
  description: z.string().trim().max(2000),
  categoryId: z.string().min(1, 'Selecione a categoria.'),
});

export function ProductForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (product: Product) => void;
}) {
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });
  const [addingCategory, setAddingCategory] = useState(false);
  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', description: '', categoryId: '', variants: [emptyVariant] },
  });
  const variants = useFieldArray({ control: form.control, name: 'variants' });
  const create = useAction(
    (values: z.infer<typeof productSchema>) => api<Product>('/products', send('POST', values)),
    'Produto cadastrado com sucesso.',
    onCreated,
  );
  const errors = form.formState.errors;
  return (
    <>
      <form onSubmit={form.handleSubmit((values) => create.mutate(values))}>
        <div className="form-grid">
          <Field label="Nome do produto" error={errors.name?.message}>
            <input placeholder="Ex.: Sutiã Comfort" {...form.register('name')} />
          </Field>
          <Field label="Categoria" error={errors.categoryId?.message}>
            <select {...form.register('categoryId')}>
              <option value="">Selecione uma categoria</option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <button
          type="button"
          className="text-link category-create"
          onClick={() => setAddingCategory(true)}
        >
          <Plus size={13} />
          Nova categoria
        </button>
        <Field label="Descrição" error={errors.description?.message}>
          <textarea
            placeholder="Características, material e detalhes do produto"
            {...form.register('description')}
          />
        </Field>
        <div className="form-section-heading">
          <h3>Variantes do produto</h3>
          <span className="muted">{variants.fields.length}/64 variantes</span>
        </div>
        {variants.fields.map((field, index) => (
          <div className="variant-form" key={field.id}>
            <div className="variant-form-header">
              <span>VARIANTE {String(index + 1).padStart(2, '0')}</span>
              <Button
                type="button"
                variant="ghost"
                className="icon-button"
                aria-label={`Remover variante ${index + 1}`}
                disabled={variants.fields.length === 1}
                onClick={() => variants.remove(index)}
              >
                <Trash size={15} />
              </Button>
            </div>
            <div className="variant-form-grid">
              <Field label="Cor" error={errors.variants?.[index]?.color?.message}>
                <input list="product-colors" {...form.register(`variants.${index}.color`)} />
              </Field>
              <Field label="Tamanho" error={errors.variants?.[index]?.size?.message}>
                <select {...form.register(`variants.${index}.size`)}>
                  {['P', 'M', 'G', 'GG'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="SKU" error={errors.variants?.[index]?.sku?.message}>
                <input
                  placeholder="SUT-COM-PRE-M"
                  className="mono"
                  {...form.register(`variants.${index}.sku`)}
                />
              </Field>
              <Field label="Preço (R$)" error={errors.variants?.[index]?.price?.message}>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  {...form.register(`variants.${index}.price`, { valueAsNumber: true })}
                />
              </Field>
              <Field
                label="Estoque inicial"
                error={errors.variants?.[index]?.initialStock?.message}
              >
                <input
                  type="number"
                  min="0"
                  {...form.register(`variants.${index}.initialStock`, { valueAsNumber: true })}
                />
              </Field>
              <Field label="Estoque mínimo" error={errors.variants?.[index]?.minimumStock?.message}>
                <input
                  type="number"
                  min="0"
                  {...form.register(`variants.${index}.minimumStock`, { valueAsNumber: true })}
                />
              </Field>
            </div>
          </div>
        ))}
        <datalist id="product-colors">
          {['Preto', 'Branco', 'Nude', 'Rosa', 'Vermelho'].map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {errors.variants?.message && (
          <p className="field-error" role="alert">
            {errors.variants.message}
          </p>
        )}
        <Button
          type="button"
          variant="secondary"
          disabled={variants.fields.length >= 64}
          onClick={() => variants.append({ ...emptyVariant })}
        >
          <Plus size={16} />
          Adicionar variante
        </Button>
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Voltar
          </Button>
          <Button disabled={create.isPending}>
            {create.isPending ? 'Salvando…' : 'Salvar produto'}
          </Button>
        </div>
      </form>
      {addingCategory && (
        <CategoryDialog
          onClose={() => setAddingCategory(false)}
          onCreated={(category) => {
            form.setValue('categoryId', category.id);
            setAddingCategory(false);
          }}
        />
      )}
    </>
  );
}
export function EditProductForm({ product, onClose }: { product: Product; onClose: () => void }) {
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });
  const form = useForm<z.infer<typeof productFieldsSchema>>({
    resolver: zodResolver(productFieldsSchema),
    defaultValues: {
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
    },
  });
  const update = useAction(
    (values: z.infer<typeof productFieldsSchema>) =>
      api<Product>(`/products/${product.id}`, send('PATCH', values)),
    'Produto atualizado com sucesso.',
    onClose,
  );
  return (
    <form onSubmit={form.handleSubmit((values) => update.mutate(values))}>
      <Field label="Nome" error={form.formState.errors.name?.message}>
        <input {...form.register('name')} />
      </Field>
      <Field label="Categoria" error={form.formState.errors.categoryId?.message}>
        <select {...form.register('categoryId')}>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Descrição" error={form.formState.errors.description?.message}>
        <textarea {...form.register('description')} />
      </Field>
      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={onClose}>
          Voltar
        </Button>
        <Button disabled={update.isPending}>
          {update.isPending ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  );
}
export function VariantForm({
  productId,
  variant,
  onClose,
}: {
  productId: string;
  variant?: Variant;
  onClose: () => void;
}) {
  const form = useForm<z.infer<typeof variantSchema>>({
    resolver: zodResolver(variantSchema),
    defaultValues: variant
      ? { ...variant, price: Number(variant.price), initialStock: 0 }
      : emptyVariant,
  });
  const save = useAction(
    (values: z.infer<typeof variantSchema>) => {
      const { initialStock, ...rest } = values;
      return api<Variant>(
        variant ? `/variants/${variant.id}` : `/products/${productId}/variants`,
        send(variant ? 'PATCH' : 'POST', variant ? rest : { ...rest, initialStock }),
      );
    },
    variant ? 'Variante atualizada.' : 'Variante cadastrada.',
    onClose,
  );
  const errors = form.formState.errors;
  return (
    <form onSubmit={form.handleSubmit((values) => save.mutate(values))}>
      <div className="form-grid">
        <Field label="Cor" error={errors.color?.message}>
          <input {...form.register('color')} />
        </Field>
        <Field label="Tamanho" error={errors.size?.message}>
          <select {...form.register('size')}>
            {['P', 'M', 'G', 'GG'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="SKU" error={errors.sku?.message}>
          <input {...form.register('sku')} />
        </Field>
        <Field label="Preço (R$)" error={errors.price?.message}>
          <input
            type="number"
            min="0.01"
            step="0.01"
            {...form.register('price', { valueAsNumber: true })}
          />
        </Field>
        {!variant && (
          <Field label="Estoque inicial" error={errors.initialStock?.message}>
            <input
              type="number"
              min="0"
              {...form.register('initialStock', { valueAsNumber: true })}
            />
          </Field>
        )}
        <Field label="Estoque mínimo" error={errors.minimumStock?.message}>
          <input
            type="number"
            min="0"
            {...form.register('minimumStock', { valueAsNumber: true })}
          />
        </Field>
      </div>
      {variant && (
        <p className="inline-info">
          Para alterar o saldo, registre uma entrada ou ajuste na tela de estoque.
        </p>
      )}
      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={onClose}>
          Voltar
        </Button>
        <Button disabled={save.isPending}>
          {save.isPending ? 'Salvando…' : 'Salvar variante'}
        </Button>
      </div>
    </form>
  );
}
function CategoryDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (category: Category) => void;
}) {
  const schema = z.object({
    name: z.string().trim().min(2, 'Informe o nome da categoria.').max(80),
  });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const create = useAction(
    (values: z.infer<typeof schema>) => api<Category>('/categories', send('POST', values)),
    'Categoria cadastrada.',
    onCreated,
  );
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Nova categoria"
      description="Organize o catálogo por tipo de produto."
    >
      <form onSubmit={form.handleSubmit((values) => create.mutate(values))}>
        <Field label="Nome da categoria" error={form.formState.errors.name?.message}>
          <input {...form.register('name')} />
        </Field>
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Voltar
          </Button>
          <Button disabled={create.isPending}>Salvar categoria</Button>
        </div>
      </form>
    </Modal>
  );
}
