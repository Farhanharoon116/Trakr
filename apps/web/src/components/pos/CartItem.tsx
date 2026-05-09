import { Minus, Plus, X } from 'lucide-react';
import type { CartItemState } from '../../store/pos.store';
import { useUIStore } from '../../store/ui.store';

interface CartItemProps {
  item: CartItemState;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
}

function formatPrice(n: number) {
  return `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function CartItem({ item, onUpdateQty, onRemove }: CartItemProps) {
  const { language } = useUIStore();
  const name =
    language === 'ur' && item.product.name_ur
      ? item.product.name_ur
      : item.product.name_en;
  const lineTotal = Math.round(item.qty * item.unitPrice * 100) / 100;

  return (
    <div className="flex items-center gap-2 py-2">
      <div className="min-w-0 flex-1">
        <p className={`truncate text-xs font-medium text-slate-900 ${language === 'ur' ? 'urdu text-right' : ''}`}>
          {name}
        </p>
        <p className="text-xs text-slate-500">
          {formatPrice(item.unitPrice)} each
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onUpdateQty(item.product.id, item.qty - 1)}
          className="flex h-6 w-6 items-center justify-center rounded border border-border text-slate-600 hover:bg-slate-100"
          aria-label="Decrease quantity"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
        <button
          onClick={() => onUpdateQty(item.product.id, item.qty + 1)}
          className="flex h-6 w-6 items-center justify-center rounded border border-border text-slate-600 hover:bg-slate-100"
          aria-label="Increase quantity"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <span className="w-20 text-right text-sm font-semibold text-slate-900">
        {formatPrice(lineTotal)}
      </span>
      <button
        onClick={() => onRemove(item.product.id)}
        className="text-slate-400 hover:text-danger"
        aria-label="Remove item"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
