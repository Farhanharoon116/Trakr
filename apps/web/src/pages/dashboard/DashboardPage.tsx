import { LayoutDashboard } from 'lucide-react';

export function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <LayoutDashboard className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["Today's Revenue", 'Transactions', 'Low Stock', 'Active Staff'].map((label) => (
          <div key={label} className="rounded-xl bg-surface p-4 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">—</p>
            <p className="text-xs text-slate-400">Full dashboard in Phase 3</p>
          </div>
        ))}
      </div>
    </div>
  );
}
