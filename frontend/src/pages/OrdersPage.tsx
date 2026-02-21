import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, productsApi } from '../services/api';
import { Plus, Eye, Trash2, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Order } from '../types';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const qc = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: (status: string) => ordersApi.updateStatus(order.id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Status updated'); onClose(); },
  });
  const currentIndex = STATUS_FLOW.indexOf(order.status);
  const nextStatus = STATUS_FLOW[currentIndex + 1];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="text-xl font-bold">{order.order_number}</h2>
            <span className={`badge mt-1 ${STATUS_COLORS[order.status]}`}>{order.status}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Order Items</p>
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm py-2 border-b border-gray-100">
                <span>Product #{item.product_id} &times; {item.quantity}</span>
                <span className="font-medium">${item.subtotal.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold mt-2">
              <span>Total</span>
              <span>${order.total_amount.toFixed(2)}</span>
            </div>
          </div>
          {order.shipping_address && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Shipping Address</p>
              <p className="text-sm">{order.shipping_address}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          {nextStatus && (
            <button onClick={() => updateMutation.mutate(nextStatus)} disabled={updateMutation.isPending} className="btn-primary flex-1">
              Mark as {nextStatus}
            </button>
          )}
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <button onClick={() => updateMutation.mutate('cancelled')} className="btn-danger">Cancel</button>
          )}
        </div>
      </div>
    </div>
  );
}

function NewOrderModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => productsApi.list() });
  const [items, setItems] = useState([{ product_id: 0, quantity: 1 }]);
  const [shipping, setShipping] = useState('');

  const createMutation = useMutation({
    mutationFn: () => ordersApi.create({ items: items.filter(i => i.product_id > 0), shipping_address: shipping }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Order created!'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create order'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-5">New Order</h2>
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-3">
              <select
                value={item.product_id}
                onChange={(e) => {
                  const updated = [...items];
                  updated[idx].product_id = +e.target.value;
                  setItems(updated);
                }}
                className="input flex-1"
              >
                <option value={0}>Select product</option>
                {products.filter(p => p.is_active).map(p => (
                  <option key={p.id} value={p.id}>{p.name} (${p.price}) — Stock: {p.available_quantity}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => {
                  const updated = [...items];
                  updated[idx].quantity = +e.target.value;
                  setItems(updated);
                }}
                className="input w-20"
              />
              {items.length > 1 && (
                <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-500 px-2">&times;</button>
              )}
            </div>
          ))}
          <button onClick={() => setItems([...items, { product_id: 0, quantity: 1 }])} className="text-blue-600 text-sm hover:underline">
            + Add item
          </button>
          <input value={shipping} onChange={(e) => setShipping(e.target.value)} className="input" placeholder="Shipping address (optional)" />
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="btn-primary flex-1">
            Create Order
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<Order | undefined>();
  const [showNew, setShowNew] = useState(false);
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({ queryKey: ['orders'], queryFn: () => ordersApi.list() });
  const deleteMutation = useMutation({
    mutationFn: ordersApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Order deleted'); },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Order
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Order #', 'Date', 'Items', 'Total', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <ShoppingCart className="mx-auto text-gray-300 mb-3" size={40} />
                  <p className="text-gray-400">No orders yet</p>
                </td>
              </tr>
            ) : orders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono font-medium">{order.order_number}</td>
                <td className="px-6 py-4 text-gray-500">{format(new Date(order.created_at), 'MMM d, yyyy')}</td>
                <td className="px-6 py-4 text-gray-500">{order.items.length} item(s)</td>
                <td className="px-6 py-4 font-medium">${order.total_amount.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={`badge ${STATUS_COLORS[order.status]}`}>{order.status}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedOrder(order)} className="text-blue-500 hover:text-blue-700 p-1">
                      <Eye size={14} />
                    </button>
                    {['pending', 'cancelled'].includes(order.status) && (
                      <button onClick={() => { if (confirm('Delete this order?')) deleteMutation.mutate(order.id); }} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(undefined)} />}
      {showNew && <NewOrderModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
