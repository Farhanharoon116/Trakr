import { useState } from 'react';
import { ShoppingCart, User } from 'lucide-react';
import { usePOSStore } from '../../store/pos.store';
import { CartItem } from './CartItem';
import type { PaymentMethod } from '../../store/pos.store';

interface CartProps {
  onCompleteSale: (paymentMethod: PaymentMethod) => void;
  isProcessing: boolean;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; emoji: string }[] = [
  { id: 'cash', label: 'Cash', emoji: '💵' },
  { id: 'card', label: 'Card', emoji: '💳' },
  { id: 'easypaisa', label: 'Easypaisa', emoji: '📱' },
  { id: 'jazzcash', label: 'JazzCash', emoji: '🎵' },
];

function formatPrice(n: number) {
  return `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function Cart({ onCompleteSale, isProcessing }: CartProps) {
  const {
    cart,
    discountType,
    discountValue,
    amountTendered,
    removeFromCart,
    updateQty,
    setDiscountType,
    setDiscountValue,
    setAmountTendered,
    getSubtotal,
    getDiscountAmount,
    getTaxAmount,
    getTotal,
    getChange,
  } = usePOSStore();

  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash');

  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const taxAmount = getTaxAmount();
  const total = getTotal();
  const change = getChange();

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold text-slate-900">New Sale</h2>
        <ShoppingCart className="h-4 w-4 text-slate-400" />
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingCart className="mb-3 h-10 w-10 text-slate-200" />
            <p className="text-sm text-slate-400">Cart is empty</p>
            <p className="text-xs text-slate-300">Click a product to add</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {cart.map((item) => (
              <CartItem
                key={item.product.id}
                item={item}
                onUpdateQty={updateQty}
                onRemove={removeFromCart}
              />
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {/* Discount */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">Discount</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'flat' | 'percent')}
              className="rounded border border-border px-1 py-0.5 text-xs"
            >
              <option value="flat">Rs</option>
              <option value="percent">%</option>
            </select>
            <input
              type="number"
              min="0"
              value={discountValue || ''}
              onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
              placeholder="0"
              className="w-20 rounded border border-border px-2 py-0.5 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          {/* Customer */}
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Customer phone (optional)"
              dir="auto"
              className="flex-1 rounded border border-border px-2 py-1 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-success">
                <span>Discount</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>GST (17%)</span>
              <span>{formatPrice(taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 font-bold text-slate-900">
              <span>Total</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="grid grid-cols-2 gap-1.5">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.id}
                onClick={() => setSelectedPayment(pm.id)}
                className={`rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                  selectedPayment === pm.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-slate-600 hover:border-primary/30'
                }`}
              >
                {pm.emoji} {pm.label}
              </button>
            ))}
          </div>

          {/* Cash tendered */}
          {selectedPayment === 'cash' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600">Tendered</label>
                <input
                  type="number"
                  min={total}
                  value={amountTendered || ''}
                  onChange={(e) => setAmountTendered(Number(e.target.value) || 0)}
                  placeholder={String(total)}
                  className="flex-1 rounded border border-border px-2 py-1 text-xs focus:border-primary focus:outline-none"
                />
              </div>
              {amountTendered > 0 && (
                <div className="flex justify-between text-sm font-semibold text-success">
                  <span>Change</span>
                  <span>{formatPrice(change)}</span>
                </div>
              )}
            </div>
          )}

          {/* Complete sale */}
          <button
            onClick={() => onCompleteSale(selectedPayment)}
            disabled={cart.length === 0 || isProcessing}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : `Complete Sale • ${formatPrice(total)}`}
          </button>
        </div>
      )}
    </div>
  );
}
