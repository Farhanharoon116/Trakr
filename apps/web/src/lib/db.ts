import Dexie, { type Table } from 'dexie';
import type { Product, Inventory } from '@bizos/shared';
import type { CreateSale } from '@bizos/shared';

export interface LocalProduct extends Product {
  cached_at: string;
}

export interface LocalInventory extends Inventory {
  cached_at: string;
}

export interface OfflineSale extends CreateSale {
  offline_id: string;
  created_at: string;
  synced: boolean;
}

class BizOSDatabase extends Dexie {
  products!: Table<LocalProduct, string>;
  inventory!: Table<LocalInventory, string>;
  offline_queue!: Table<OfflineSale, string>;

  constructor() {
    super('bizos_db');
    this.version(1).stores({
      products: 'id, sku, name_en, name_ur, category_id, updated_at, cached_at',
      inventory: '[product_id+branch_id], product_id, branch_id, cached_at',
      offline_queue: 'offline_id, created_at, synced',
    });
  }
}

export const db = new BizOSDatabase();
