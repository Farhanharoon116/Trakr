import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Package, Plus, Pencil, Trash2, X, Search, Upload } from 'lucide-react';
import { api } from '../../lib/api';
import { useCategories, useCreateCategory } from '../../hooks/useCategories';
import { useAuthStore } from '../../store/auth.store';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { EmptyState } from '../../components/shared/EmptyState';
import type { Product, Category } from '@bizos/shared';
import { supabase } from '../../lib/supabase';

interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

function formatRs(n: number) {
  return `Rs ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

function margin(price: number, cost: number | null): string {
  if (!cost || cost === 0) return '—';
  return `${Math.round(((price - cost) / price) * 100)}%`;
}

const productFormSchema = z.object({
  name_en: z.string().min(1, 'Required').max(255),
  name_ur: z.string().max(255).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  price: z.number({ invalid_type_error: 'Required' }).positive('Must be > 0'),
  cost: z.number().nonnegative().optional().nullable(),
  tax_rate: z.number().min(0).max(100).default(17),
  image_url: z.string().url().optional().nullable(),
  track_inventory: z.boolean().default(true),
  is_active: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductModalProps {
  product?: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

function ProductModal({ product, categories, onClose, onSaved }: ProductModalProps) {
  const { business } = useAuthStore();
  const queryClient = useQueryClient();
  const createCategory = useCreateCategory();
  const [newCatName, setNewCatName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url ?? null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product
      ? {
          name_en: product.name_en,
          name_ur: product.name_ur ?? '',
          category_id: product.category_id ?? null,
          sku: product.sku ?? '',
          price: product.price,
          cost: product.cost ?? undefined,
          tax_rate: product.tax_rate,
          image_url: product.image_url ?? null,
          track_inventory: product.track_inventory,
          is_active: product.is_active,
        }
      : { tax_rate: 17, track_inventory: true, is_active: true },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Only PNG/JPG images allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `products/${business?.id ?? 'unknown'}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('bizos-assets').upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('bizos-assets').getPublicUrl(path);
      return urlData.publicUrl;
    } catch {
      toast.error('Image upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const cat = await createCategory.mutateAsync({ name_en: newCatName.trim() });
    setValue('category_id', cat.id);
    setNewCatName('');
  };

  const onSubmit = async (values: ProductFormValues) => {
    let imageUrl = values.image_url ?? null;
    if (imageFile) {
      imageUrl = await uploadImage(imageFile);
      if (!imageUrl) return;
    }

    const payload = { ...values, image_url: imageUrl };

    if (product) {
      await api.patch(`/products/${product.id}`, payload);
      toast.success('Product updated');
    } else {
      await api.post('/products', payload);
      toast.success('Product created');
    }
    await queryClient.invalidateQueries({ queryKey: ['products'] });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{product ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Image upload */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Product Image</label>
            <div className="flex items-center gap-3">
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100">
                  <Package className="h-6 w-6 text-slate-300" />
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Choose image'}
                <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleImageSelect} />
              </label>
            </div>
          </div>

          {/* Name EN */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name (English) *</label>
            <input {...register('name_en')} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            {errors.name_en && <p className="mt-1 text-xs text-danger">{errors.name_en.message}</p>}
          </div>

          {/* Name UR */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name (Urdu)</label>
            <input {...register('name_ur')} dir="rtl" className="w-full rounded-xl border border-border px-3 py-2 text-sm font-urdu focus:border-primary focus:outline-none" />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <div className="flex gap-2">
              <select
                {...register('category_id')}
                className="flex-1 rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">-- Select category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_en}</option>
                ))}
              </select>
            </div>
            <div className="mt-1 flex gap-1">
              <input
                type="text"
                placeholder="Create new category..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 rounded-lg border border-border px-2 py-1 text-xs focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddCategory().catch(() => void 0); }
                }}
              />
              <button type="button" onClick={() => handleAddCategory().catch(() => void 0)} className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                Add
              </button>
            </div>
          </div>

          {/* SKU */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">SKU / Barcode</label>
            <input {...register('sku')} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>

          {/* Price + Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Selling Price (Rs) *</label>
              <input
                type="number"
                step="0.01"
                {...register('price', { valueAsNumber: true })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              {errors.price && <p className="mt-1 text-xs text-danger">{errors.price.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Cost Price (Rs)</label>
              <input
                type="number"
                step="0.01"
                {...register('cost', { valueAsNumber: true })}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Tax rate */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">GST Rate (%)</label>
            <input
              type="number"
              step="0.01"
              {...register('tax_rate', { valueAsNumber: true })}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {/* Toggles */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('track_inventory')} className="h-4 w-4 rounded border-border accent-primary" />
              Track inventory
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('is_active')} className="h-4 w-4 rounded border-border accent-primary" />
              Active
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button type="submit" disabled={isSubmitting || uploading} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {isSubmitting ? 'Saving...' : product ? 'Update' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const queryClient = useQueryClient();

  const { data: categories = [] } = useCategories();

  const params = new URLSearchParams({ limit: '50', page: '1' });
  if (search) params.set('search', search);
  if (categoryFilter) params.set('category_id', categoryFilter);
  if (activeFilter !== 'all') params.set('is_active', activeFilter === 'active' ? 'true' : 'false');

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, categoryFilter, activeFilter],
    queryFn: () => api.get<ProductsResponse>(`/products?${params}`),
    staleTime: 30 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      toast.success('Product deactivated');
      queryClient.invalidateQueries({ queryKey: ['products'] }).catch(() => void 0);
    },
  });

  const handleDelete = useCallback((p: Product) => {
    if (!confirm(`Deactivate "${p.name_en}"?`)) return;
    deleteMutation.mutate(p.id);
  }, [deleteMutation]);

  const products = data?.data ?? [];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-slate-900">Products</h1>
          {data && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {data.total}
            </span>
          )}
        </div>
        <button
          onClick={() => { setEditProduct(null); setShowModal(true); }}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search name, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 rounded-xl border border-border pl-9 pr-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
        </select>
        <div className="flex rounded-xl border border-border overflow-hidden">
          {(['all', 'active', 'inactive'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setActiveFilter(opt)}
              className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${activeFilter === opt ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-surface shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            <LoadingSkeleton className="h-10" count={5} />
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description={search ? `No results for "${search}"` : 'Add your first product to get started'}
            action={
              <button
                onClick={() => { setEditProduct(null); setShowModal(true); }}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" /> Add Product
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Margin</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name_en} className="h-9 w-9 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                            <Package className="h-4 w-4 text-slate-300" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{p.name_en}</p>
                          {p.name_ur && <p className="urdu text-xs text-slate-500">{p.name_ur}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatRs(p.price)}</td>
                    <td className="px-4 py-3 text-slate-500">{p.cost ? formatRs(p.cost) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        {margin(p.price, p.cost)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.is_active ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditProduct(p); setShowModal(true); }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ProductModal
          product={editProduct}
          categories={categories}
          onClose={() => setShowModal(false)}
          onSaved={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
