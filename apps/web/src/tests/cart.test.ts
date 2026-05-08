import { describe, it, expect, beforeEach } from 'vitest';
import { usePOSStore } from '../store/pos.store';
import type { Product } from '@bizos/shared';

const mockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-1',
  business_id: 'biz-1',
  category_id: null,
  name_en: 'Test Product',
  name_ur: null,
  sku: 'SKU001',
  price: 100,
  cost: 60,
  tax_rate: 17,
  image_url: null,
  is_active: true,
  track_inventory: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('POS Cart calculations', () => {
  beforeEach(() => {
    usePOSStore.getState().clearCart();
    usePOSStore.getState().setDiscountType('flat');
    usePOSStore.getState().setDiscountValue(0);
  });

  it('adds product to cart', () => {
    const store = usePOSStore.getState();
    store.addToCart(mockProduct());
    expect(usePOSStore.getState().cart).toHaveLength(1);
    expect(usePOSStore.getState().cart[0]?.qty).toBe(1);
  });

  it('increments qty for duplicate product', () => {
    const store = usePOSStore.getState();
    const p = mockProduct();
    store.addToCart(p);
    store.addToCart(p);
    expect(usePOSStore.getState().cart).toHaveLength(1);
    expect(usePOSStore.getState().cart[0]?.qty).toBe(2);
  });

  it('calculates subtotal correctly', () => {
    const store = usePOSStore.getState();
    store.addToCart(mockProduct({ price: 200 }));
    store.updateQty('prod-1', 3);
    expect(usePOSStore.getState().getSubtotal()).toBe(600);
  });

  it('calculates flat discount correctly', () => {
    const store = usePOSStore.getState();
    store.addToCart(mockProduct({ price: 500 }));
    store.setDiscountType('flat');
    store.setDiscountValue(50);
    expect(usePOSStore.getState().getDiscountAmount()).toBe(50);
  });

  it('calculates percent discount correctly', () => {
    const store = usePOSStore.getState();
    store.addToCart(mockProduct({ price: 1000 }));
    store.setDiscountType('percent');
    store.setDiscountValue(10);
    expect(usePOSStore.getState().getDiscountAmount()).toBe(100);
  });

  it('calculates GST at 17%', () => {
    const store = usePOSStore.getState();
    store.addToCart(mockProduct({ price: 100, tax_rate: 17 }));
    // subtotal=100, discount=0, taxable=100, GST=17
    expect(usePOSStore.getState().getTaxAmount()).toBe(17);
  });

  it('calculates total = subtotal - discount + tax', () => {
    const store = usePOSStore.getState();
    store.addToCart(mockProduct({ price: 100, tax_rate: 17 }));
    store.setDiscountType('flat');
    store.setDiscountValue(10);
    // subtotal=100, discount=10, taxable=90, tax=15.30, total=95.30
    const total = usePOSStore.getState().getTotal();
    expect(total).toBeCloseTo(95.3, 1);
  });

  it('removes item from cart', () => {
    const store = usePOSStore.getState();
    store.addToCart(mockProduct());
    store.removeFromCart('prod-1');
    expect(usePOSStore.getState().cart).toHaveLength(0);
  });

  it('removes item when qty set to 0', () => {
    const store = usePOSStore.getState();
    store.addToCart(mockProduct());
    store.updateQty('prod-1', 0);
    expect(usePOSStore.getState().cart).toHaveLength(0);
  });

  it('discount cannot exceed subtotal', () => {
    const store = usePOSStore.getState();
    store.addToCart(mockProduct({ price: 100 }));
    store.setDiscountType('flat');
    store.setDiscountValue(200); // More than subtotal
    expect(usePOSStore.getState().getDiscountAmount()).toBe(100);
  });

  it('cash change calculation', () => {
    const store = usePOSStore.getState();
    store.addToCart(mockProduct({ price: 100, tax_rate: 17 }));
    store.setAmountTendered(200);
    // total = 117, change = 83
    expect(usePOSStore.getState().getChange()).toBeCloseTo(83, 0);
  });
});
