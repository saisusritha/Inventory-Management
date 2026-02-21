import { useQuery } from '@tanstack/react-query';
import { productsApi, ordersApi, inventoryApi } from '../services/api';
import { Package, ShoppingCart, AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function DashboardPage() {
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => productsApi.list() });
  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: () => ordersApi.list() });
  const { data: lowStock = [] } = useQuery({ queryKey: ['low-stock'], queryFn: inventoryApi.lowStock });

  const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const activeProducts = products.filter((p) => p.is_active).length;

  // Order status distribution
  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Category distribution
  const catCounts = products.reduce<Record<string, number>>((acc, p) => {
    const cat = p.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  const categoryData = Object.entries(catCounts).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Products', value: activeProducts, icon: Package, color: 'blue' },
          { label: 'Total Orders', value: orders.length, icon: ShoppingCart, color: 'green' },
          { label: 'Low Stock Alerts', value: lowStock.length, icon: AlertTriangle, color: 'yellow' },
          { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: TrendingUp, color: 'purple' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`p-3 bg-${color}-100 rounded-xl`}>
                <Icon className={`text-${color}-600`} size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Products by Category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Orders by Status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-yellow-500" size={20} />
            Low Stock Alerts ({lowStock.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 text-gray-500 font-medium">Product</th>
                  <th className="text-left py-3 text-gray-500 font-medium">SKU</th>
                  <th className="text-right py-3 text-gray-500 font-medium">Stock</th>
                  <th className="text-right py-3 text-gray-500 font-medium">Reorder Point</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((item) => (
                  <tr key={item.product_id} className="border-b border-gray-100">
                    <td className="py-3 font-medium">{item.product_name}</td>
                    <td className="py-3 text-gray-500">{item.sku}</td>
                    <td className="py-3 text-right">
                      <span className="badge bg-red-100 text-red-700">{item.current_stock}</span>
                    </td>
                    <td className="py-3 text-right text-gray-500">{item.reorder_point}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
