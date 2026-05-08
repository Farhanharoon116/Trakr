import { Package } from 'lucide-react';
import type { Product } from '@bizos/shared';
import { useUIStore } from '../../store/ui.store';

interface ProductCardProps {
  product: Product;
  stockQty?: number;
  onSelect: (product: Product) => void;
}

function formatPrice(amount: number) {
  return `Rs ${amount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function ProductCard({ product, stockQty, onSelect }: ProductCardProps) {
  const { language } = useUIStore();
  const name = language === 'ur' && product.name_ur ? product.name_ur : product.name_en;
  const outOfStock = stockQty !== undefined && stockQty <= 0;

  return (
    <button
      onClick={() => !outOfStock && onSelect(product)}
      disabled={outOfStock}
      className={`group flex flex-col rounded-xl border border-border bg-surface p-3 text-left transition-all hover:border-primary/50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 active:scale-95 ${
        outOfStock ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      }`}
    >
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={name}
          className="mb-2 h-20 w-full rounded-lg object-cover"
          loading="lazy"
        />
      ) : (
        <div className="mb-2 flex h-20 w-full items-center justify-center rounded-lg bg-slate-100">
          <Package className="h-8 w-8 text-slate-300" />
        </div>
      )}
      <p
        className={`line-clamp-2 text-xs font-medium text-slate-900 ${
          language === 'ur' ? 'urdu text-right' : ''
        }`}
      >
        {name}
      </p>
      <div className="mt-auto flex items-end justify-between pt-1">
        <span className="text-sm font-semibold text-primary">
          {formatPrice(product.price)}
        </span>
        {stockQty !== undefined && (
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
              outOfStock
                ? 'bg-danger/10 text-danger'
                : stockQty <= 5
                ? 'bg-warning/10 text-warning'
                : 'bg-success/10 text-success'
            }`}
          >
            {outOfStock ? 'Out' : stockQty}
          </span>
        )}
      </div>
    </button>
  );
}
