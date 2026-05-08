import { format } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  AlertTriangle,
  Users,
  DollarSign,
  Package,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useDashboard } from '../../hooks/useDashboard';
import { useInventory } from '../../hooks/useInventory';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';

function formatRs(n: number) {
  return `Rs ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

function pctChange(today: number, yesterday: number) {
  if (yesterday === 0) return today > 0 ? 100 : 0;
  return Math.round(((today - yesterday) / yesterday) * 100);
}

interface KPICardProps {
  label: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  color?: string;
}

function KPICard({ label, value, change, icon: Icon, color = 'text-primary' }: KPICardProps) {
  const isUp = change !== undefined && change >= 0;
  return (
    <div className="rounded-xl bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {change !== undefined && (
            <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${isUp ? 'text-success' : 'text-danger'}`}>
              {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(change)}% vs yesterday
            </div>
          )}
        </div>
        <div className={`rounded-xl bg-slate-50 p-3 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash 💵',
  card: 'Card 💳',
  easypaisa: 'Easypaisa',
  jazzcash: 'JazzCash',
  credit: 'Credit',
};

export function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const { data: inventory } = useInventory();

  const lowStockItems = (inventory ?? []).filter(
    (i) => i.qty_on_hand < i.reorder_point
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <LoadingSkeleton className="h-28" count={4} />
        </div>
        <LoadingSkeleton className="h-72" />
      </div>
    );
  }

  const revChange = pctChange(data?.today_revenue ?? 0, data?.yesterday_revenue ?? 0);

  return (
    <div className="space-y-6 p-6">
      {/* ROW 1: KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Today's Revenue"
          value={formatRs(data?.today_revenue ?? 0)}
          change={revChange}
          icon={DollarSign}
          color="text-primary"
        />
        <KPICard
          label="Transactions"
          value={String(data?.transaction_count ?? 0)}
          icon={ShoppingCart}
          color="text-success"
        />
        <KPICard
          label="Low Stock Items"
          value={String(data?.low_stock_count ?? 0)}
          icon={AlertTriangle}
          color={data?.low_stock_count ? 'text-danger' : 'text-slate-400'}
        />
        <KPICard
          label="Active Staff"
          value={String(data?.active_staff_count ?? 0)}
          icon={Users}
          color="text-warning"
        />
      </div>

      {/* ROW 2: Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sales line chart */}
        <div className="rounded-xl bg-surface p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Daily Revenue (30 days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data?.sales_chart ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [formatRs(v), 'Revenue']} labelFormatter={(l: string) => format(new Date(l), 'dd MMM')} />
              <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top products bar chart */}
        <div className="rounded-xl bg-surface p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Top Products Today</h2>
          {(data?.top_products ?? []).length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">
              No sales data yet today
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.top_products ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: number) => [formatRs(v), 'Revenue']} />
                <Bar dataKey="revenue" fill="#16A34A" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ROW 3: Recent Transactions */}
      <div className="rounded-xl bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Recent Transactions</h2>
        </div>
        {(data?.recent_transactions ?? []).length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-400">
            No transactions today
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-2">Receipt #</th>
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Items</th>
                  <th className="px-4 py-2">Total</th>
                  <th className="px-4 py-2">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.recent_transactions ?? []).map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-xs text-slate-700">{tx.receipt_number}</td>
                    <td className="px-4 py-2 text-slate-500">{format(new Date(tx.created_at), 'HH:mm')}</td>
                    <td className="px-4 py-2 text-slate-600">{(tx.sale_items as unknown[]).length}</td>
                    <td className="px-4 py-2 font-semibold text-slate-900">{formatRs(tx.total)}</td>
                    <td className="px-4 py-2 text-slate-500">{PAYMENT_LABELS[tx.payment_method] ?? tx.payment_method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ROW 4: Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="rounded-xl bg-surface shadow-sm">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-danger" />
            <h2 className="text-sm font-semibold text-slate-700">Low Stock Alerts</h2>
            <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
              {lowStockItems.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">In Stock</th>
                  <th className="px-4 py-2">Reorder At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lowStockItems.map((item) => (
                  <tr key={item.id} className="bg-danger/5 hover:bg-danger/10">
                    <td className="flex items-center gap-2 px-4 py-2">
                      <Package className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-900">
                        {(item as unknown as { products?: { name_en?: string } }).products?.name_en ?? item.product_id}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-semibold text-danger">{item.qty_on_hand}</td>
                    <td className="px-4 py-2 text-slate-500">{item.reorder_point}</td>
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
