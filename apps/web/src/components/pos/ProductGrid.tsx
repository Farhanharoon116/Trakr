import { Search, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useProducts } from '../../hooks/useProducts';
import { ProductCard } from './ProductCard';
import { LoadingSkeleton } from '../shared/LoadingSkeleton';
import { EmptyState } from '../shared/EmptyState';
import { Package } from 'lucide-react';
import type { Product } from '@bizos/shared';

interface ProductGridProps {
  onSelectProduct: (product: Product) => void;
  branchId?: string;
}

export function ProductGrid({ onSelectProduct }: ProductGridProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { products, isLoading } = useProducts(search, selectedCategory ?? undefined);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    products.forEach((p) => {
      if (p.category_id) seen.set(p.category_id, p.category_id);
    });
    return Array.from(seen.entries());
  }, [products]);

  return (
    <div className="flex h-full flex-col">
      {/* Search bar */}
      <div className="relative p-3">
        <Search className="absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search products, SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          dir="auto"
          className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-3 pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {categories.map(([id]) => (
            <button
              key={id}
              onClick={() => setSelectedCategory(id)}
              className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCategory === id
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {id.slice(0, 8)}
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <LoadingSkeleton className="h-40" count={8} />
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description={search ? `No results for "${search}"` : 'Add products to get started'}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
