import { Package } from 'lucide-react';

export function ProductsPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-slate-900">Products</h1>
        </div>
        <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
          Add Product
        </button>
      </div>
      <p className="text-sm text-slate-500">Full product management UI in Phase 3.</p>
    </div>
  );
}
