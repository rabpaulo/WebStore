import { useState } from 'react';
import { toast } from 'sonner';
import { Variant } from './types';

export interface CartItem {
  variant: Variant;
  quantity: number;
}
export const priceInCents = (price: string) => Math.round(Number(price) * 100);
export function useOrderDraft() {
  const [items, setItems] = useState<CartItem[]>([]);
  const add = (variant: Variant) => {
    const existing = items.find((item) => item.variant.id === variant.id);
    if ((existing?.quantity ?? 0) + 1 > variant.currentStock) {
      toast.error('A quantidade excede o estoque disponível.');
      return;
    }
    setItems((prev) =>
      existing
        ? prev.map((item) =>
            item.variant.id === variant.id ? { ...item, quantity: item.quantity + 1 } : item,
          )
        : [...prev, { variant, quantity: 1 }],
    );
  };
  const quantity = (id: string, value: number) => {
    const item = items.find((item) => item.variant.id === id);
    if (!item) return;
    if (!Number.isInteger(value) || value < 1 || value > item.variant.currentStock) {
      toast.error(`Informe uma quantidade entre 1 e ${item.variant.currentStock}.`);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.variant.id === id ? { ...item, quantity: value } : item)),
    );
  };
  const remove = (id: string) => setItems((prev) => prev.filter((item) => item.variant.id !== id));
  const totalCents = items.reduce(
    (total, item) => total + priceInCents(item.variant.price) * item.quantity,
    0,
  );
  return { items, add, quantity, remove, totalCents };
}
