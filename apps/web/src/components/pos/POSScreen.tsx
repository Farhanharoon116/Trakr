import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { usePOSStore } from '../../store/pos.store';
import { useSales } from '../../hooks/useSales';
import { useAuthStore } from '../../store/auth.store';
import { ProductGrid } from './ProductGrid';
import { Cart } from './Cart';
import { ReceiptModal } from './ReceiptModal';
import type { Product } from '@bizos/shared';
import type { PaymentMethod, CartItemState } from '../../store/pos.store';

interface CompletedSale {
  receiptNumber: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  cartSnapshot: CartItemState[];
  paymentMethod: string;
}

export function POSScreen() {
  const { user } = useAuthStore();
  const {
    cart,
    addToCart,
    clearCart,
    getSubtotal,
    getDiscountAmount,
    getTaxAmount,
    getTotal,
    activeShift,
    discountType,
    discountValue,
    selectedCustomer,
  } = usePOSStore();
  const { createSale, isCreating, isOnline } = useSales();

  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);

  const handleSelectProduct = useCallback(
    (product: Product) => {
      addToCart(product);
    },
    [addToCart]
  );

  const handleCompleteSale = useCallback(
    async (paymentMethod: PaymentMethod) => {
      if (cart.length === 0) return;
      if (!user) return;

      const branchId = user.branch_id ?? activeShift?.branch_id;
      if (!branchId) {
        toast.error('No branch assigned. Please open a shift first.');
        return;
      }

      try {
        const subtotal = getSubtotal();
        const discountAmount = getDiscountAmount();
        const taxAmount = getTaxAmount();
        const total = getTotal();
        const cartSnapshot = [...cart];

        const saleData = {
          branch_id: branchId,
          shift_id: activeShift?.id ?? null,
          customer_id: selectedCustomer?.id ?? null,
          items: cart.map((item) => ({
            product_id: item.product.id,
            qty: item.qty,
            unit_price: item.unitPrice,
            discount: item.discount,
            tax_rate: item.taxRate,
          })),
          subtotal,
          discount: discountAmount,
          tax_amount: taxAmount,
          total,
          payment_method: paymentMethod,
          offline_id: undefined,
          notes:
            discountType === 'percent'
              ? `Discount: ${discountValue}%`
              : discountValue > 0
              ? `Discount: Rs ${discountValue}`
              : undefined,
        };

        const result = await createSale(saleData);

        const receiptNumber =
          (result as { receipt_number?: string }).receipt_number ??
          (result as { offline_id?: string }).offline_id ??
          'OFFLINE';

        setCompletedSale({
          receiptNumber,
          total,
          subtotal,
          discountAmount,
          taxAmount,
          cartSnapshot,
          paymentMethod,
        });
        clearCart();

        if (!isOnline) {
          toast('Sale saved offline — will sync when connected', { icon: '📡' });
        } else {
          toast.success(`Sale completed! Receipt: ${receiptNumber}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to complete sale';
        toast.error(msg);
      }
    },
    [
      cart,
      user,
      activeShift,
      getSubtotal,
      getDiscountAmount,
      getTaxAmount,
      getTotal,
      discountType,
      discountValue,
      selectedCustomer,
      createSale,
      clearCart,
      isOnline,
    ]
  );

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* LEFT: Product grid — 60% */}
      <div className="flex-1 overflow-hidden border-b border-border lg:border-b-0 lg:border-r">
        <ProductGrid onSelectProduct={handleSelectProduct} />
      </div>

      {/* RIGHT: Cart — 40% */}
      <div className="h-96 lg:h-auto lg:w-96 xl:w-[420px]">
        <Cart onCompleteSale={handleCompleteSale} isProcessing={isCreating} />
      </div>

      {/* Receipt modal */}
      {completedSale && (
        <ReceiptModal
          receiptNumber={completedSale.receiptNumber}
          total={completedSale.total}
          subtotal={completedSale.subtotal}
          discountAmount={completedSale.discountAmount}
          taxAmount={completedSale.taxAmount}
          cartItems={completedSale.cartSnapshot}
          paymentMethod={completedSale.paymentMethod}
          isOnline={isOnline}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </div>
  );
}
