import { Dress, MoonStars, TShirt } from '@phosphor-icons/react';
export function ProductIcon({ category }: { category: string }) {
  const isBody = category === 'Bodies';
  const isSleep = category === 'Camisolas';
  const Icon = isBody ? Dress : isSleep ? MoonStars : TShirt;
  return (
    <div className={`product-icon ${isBody ? 'body' : isSleep ? 'sleep' : ''}`}>
      <Icon size={22} weight="duotone" />
    </div>
  );
}
