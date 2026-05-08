import { create } from 'zustand';
import type { Product, Customer, Shift } from '@bizos/shared';

export interface CartItemState {
  product: Product;
  qty: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
}

export type DiscountType = 'flat' | 'percent';

export type PaymentMethod = 'cash' | 'card' | 'easypaisa' | 'jazzcash' | 'credit';

interface POSState {
  cart: CartItemState[];
  discountType: DiscountType;
  discountValue: number;
  selectedCustomer: Customer | null;
  activeShift: Shift | null;
  amountTendered: number;

  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  setDiscountType: (type: DiscountType) => void;
  setDiscountValue: (value: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setActiveShift: (shift: Shift | null) => void;
  setAmountTendered: (amount: number) => void;

  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTaxAmount: () => number;
  getTotal: () => number;
  getChange: () => number;
}

export const usePOSStore = create<POSState>()((set, get) => ({
  cart: [],
  discountType: 'flat',
  discountValue: 0,
  selectedCustomer: null,
  activeShift: null,
  amountTendered: 0,

  addToCart: (product) => {
    const { cart } = get();
    const existing = cart.find((i) => i.product.id === product.id);
    if (existing) {
      set({
        cart: cart.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
        ),
      });
    } else {
      set({
        cart: [
          ...cart,
          {
            product,
            qty: 1,
            unitPrice: product.price,
            discount: 0,
            taxRate: product.tax_rate,
          },
        ],
      });
    }
  },

  removeFromCart: (productId) => {
    set({ cart: get().cart.filter((i) => i.product.id !== productId) });
  },

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set({
      cart: get().cart.map((i) =>
        i.product.id === productId ? { ...i, qty } : i
      ),
    });
  },

  clearCart: () => {
    set({
      cart: [],
      discountValue: 0,
      selectedCustomer: null,
      amountTendered: 0,
    });
  },

  setDiscountType: (type) => set({ discountType: type }),
  setDiscountValue: (value) => set({ discountValue: value }),
  setCustomer: (customer) => set({ selectedCustomer: customer }),
  setActiveShift: (shift) => set({ activeShift: shift }),
  setAmountTendered: (amount) => set({ amountTendered: amount }),

  getSubtotal: () => {
    return Math.round(
      get().cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0) * 100
    ) / 100;
  },

  getDiscountAmount: () => {
    const { discountType, discountValue } = get();
    const subtotal = get().getSubtotal();
    if (discountType === 'percent') {
      return Math.round((subtotal * discountValue) / 100 * 100) / 100;
    }
    return Math.min(discountValue, subtotal);
  },

  getTaxAmount: () => {
    const subtotal = get().getSubtotal();
    const discount = get().getDiscountAmount();
    const taxable = subtotal - discount;
    const avgTaxRate = get().cart.length > 0
      ? get().cart.reduce((sum, i) => sum + i.taxRate, 0) / get().cart.length
      : 17;
    return Math.round((taxable * avgTaxRate) / 100 * 100) / 100;
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = get().getDiscountAmount();
    const tax = get().getTaxAmount();
    return Math.round((subtotal - discount + tax) * 100) / 100;
  },

  getChange: () => {
    const { amountTendered } = get();
    const total = get().getTotal();
    return Math.max(0, Math.round((amountTendered - total) * 100) / 100);
  },
}));
