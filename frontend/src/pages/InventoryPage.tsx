import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../services/api';
import { Warehouse, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Inventory } from '../types';
import { format } from 'date-fns';

function AdjustModal({ inventory, onClose }: { inventory: Inventory; onClose: () => void }) {
  const qc = useQueryClient();
  const [qty, setQty] = useState(0);
  const [type, setType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => inventoryApi.adjust(inventory.product_id, { quantity: type === 'out' ? -qty : qty, movement_type: type, notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); toast.success('Stock adjusted!'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Adjustment failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-5">Adjust Stock — Product #{inventory.product_id}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Movement Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="input">
              <option value="in">Stock In</option>
              <option value="out">Stock Out</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(+e.target.value)} className="input" />
            <p className="text-xs text-gray-500 mt-1">Current stock: {inventory.quantity}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="input" placeholder="Optional notes" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || qty === 0} className="btn-primary flex-1">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [adjusting, setAdjusting] = useState<Inventory | undefined>();
  const { data: inventory = [], isLoading } = useQuery({ queryKey: ['inventory'], queryFn: inventoryApi.list });
  const { data: lowStock = [] } = useQuery({ queryKey: ['low-stock'], queryFn: inventoryApi.lowStock });

  const totalItems = inventory.reduce((sum, i) => sum + i.quantity, 0);
  const totalReserved = inventory.reduce((sum, i) => sum + i.reserved_quantity, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {[
          { label: 'Total Stock', value: totalItems, icon: Warehouse, color: 'blue' },
          { label: 'Reserved', value: totalReserved, icon: TrendingDown, color: 'yellow' },
          { label: 'Low Stock Items', value: lowStock.length, icon: TrendingUp, color: 'red' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold mt-1">{value}</p>
              </div>
              <div className={`p-3 bg-${color}-100 rounded-xl`}>
                <Icon className={`text-${color}-600`} size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Product ID', 'Total Stock', 'Reserved', 'Available', 'Reorder Point', 'Status', 'Last Updated', 'Actions'].map(h => (
                <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : inventory.map((inv) => {
              const isLow = inv.quantity <= inv.reorder_point;
              return (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">#{inv.product_id}</td>
                  <td className="px-6 py-4">{inv.quantity}</td>
                  <td className="px-6 py-4 text-yellow-600">{inv.reserved_quantity}</td>
                  <td className="px-6 py-4">
                    <span className={`badge ${inv.available_quantity > inv.reorder_point ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {inv.available_quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{inv.reorder_point}</td>
                  <td className="px-6 py-4">
                    <span className={`badge ${isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {isLow ? 'Low Stock' : 'OK'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{format(new Date(inv.updated_at), 'MMM d, HH:mm')}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => setAdjusting(inv)} className="text-blue-500 hover:text-blue-700 p-1">
                      <RefreshCw size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {adjusting && <AdjustModal inventory={adjusting} onClose={() => setAdjusting(undefined)} />}
    </div>
  );
}
