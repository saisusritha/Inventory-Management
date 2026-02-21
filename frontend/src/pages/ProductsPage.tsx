import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../services/api';
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Product, ProductCreate } from '../types';
import { useForm } from 'react-hook-form';

function ProductModal({ product, onClose }: { product?: Product; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<ProductCreate>({
    defaultValues: product ? {
      name: product.name, sku: product.sku, description: product.description,
      price: product.price, category: product.category || '', is_active: product.is_active,
      initial_stock: 0, reorder_point: 10,
    } : { is_active: true, initial_stock: 0, reorder_point: 10 },
  });

  const createMutation = useMutation({
    mutationFn: (data: ProductCreate) => productsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product created!'); onClose(); },
    onError: () => toast.error('Failed to create product'),
  });
  const updateMutation = useMutation({
    mutationFn: (data: Partial<ProductCreate>) => productsApi.update(product!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product updated!'); onClose(); },
    onError: () => toast.error('Failed to update product'),
  });

  const onSubmit = (data: ProductCreate) => product ? updateMutation.mutate(data) : createMutation.mutate(data);
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-5">{product ? 'Edit Product' : 'Add Product'}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input {...register('name', { required: true })} className="input" placeholder="Product name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
              <input {...register('sku', { required: true })} className="input" placeholder="SKU-001" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
              <input type="number" step="0.01" {...register('price', { required: true, valueAsNumber: true })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input {...register('category')} className="input" placeholder="Electronics" />
            </div>
          </div>
          {!product && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock</label>
                <input type="number" {...register('initial_stock', { valueAsNumber: true })} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
                <input type="number" {...register('reorder_point', { valueAsNumber: true })} className="input" />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...register('description')} className="input" rows={2} placeholder="Product description" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" {...register('is_active')} className="rounded" />
            <label htmlFor="active" className="text-sm text-gray-700">Active</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1">
              {isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | undefined>();
  const qc = useQueryClient();

  const { data: products = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: () => productsApi.list() });
  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <button onClick={() => { setEditProduct(undefined); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="input pl-9"
          />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Product', 'SKU', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Package className="mx-auto text-gray-300 mb-3" size={40} />
                  <p className="text-gray-400">No products found</p>
                </td>
              </tr>
            ) : filtered.map(product => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{product.sku}</td>
                <td className="px-6 py-4">
                  {product.category && <span className="badge bg-blue-100 text-blue-700">{product.category}</span>}
                </td>
                <td className="px-6 py-4 font-medium">${product.price.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={`badge ${(product.is_low_stock || product.stock_quantity === 0) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {product.available_quantity ?? product.stock_quantity ?? 0}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`badge ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditProduct(product); setShowModal(true); }} className="text-blue-500 hover:text-blue-700 p-1">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => { if (confirm('Delete this product?')) deleteMutation.mutate(product.id); }} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <ProductModal product={editProduct} onClose={() => setShowModal(false)} />}
    </div>
  );
}
