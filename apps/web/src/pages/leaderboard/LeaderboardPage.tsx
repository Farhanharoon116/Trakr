import { useState } from 'react';
import { Trophy, Medal, Star, UserCheck, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import { useLeaderboard, type LeaderboardEntry } from '../../hooks/useLeaderboard';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';

function formatRs(n: number) {
  return `Rs ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

const PODIUM_COLORS = [
  'bg-yellow-400 text-yellow-900',  // 1st
  'bg-slate-300 text-slate-700',    // 2nd
  'bg-amber-600 text-amber-100',    // 3rd
];

const PODIUM_HEIGHTS = ['h-28', 'h-20', 'h-14'];

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const top3 = entries.slice(0, 3);
  // Reorder: 2nd, 1st, 3rd for visual podium
  const display = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = top3[1] ? PODIUM_HEIGHTS : [PODIUM_HEIGHTS[1], PODIUM_HEIGHTS[0], PODIUM_HEIGHTS[2]];

  return (
    <div className="flex items-end justify-center gap-4 py-8">
      {display.map((entry, i) => {
        if (!entry) return null;
        const rank = entry === top3[0] ? 0 : entry === top3[1] ? 1 : 2;
        const heightClass = heights[i];
        return (
          <div key={entry.cashier_id} className="flex flex-col items-center">
            <div className="mb-2 flex flex-col items-center">
              <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                {entry.name.charAt(0).toUpperCase()}
              </div>
              <p className="max-w-[80px] truncate text-center text-xs font-semibold text-slate-800">
                {entry.name}
              </p>
              <p className="text-xs text-slate-500">{formatRs(entry.revenue)}</p>
            </div>
            <div
              className={`flex w-20 items-center justify-center rounded-t-lg text-2xl font-bold ${heightClass} ${PODIUM_COLORS[rank]}`}
            >
              {rank === 0 ? '🥇' : rank === 1 ? '🥈' : '🥉'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Tab = 'revenue' | 'transactions' | 'avg_sale';

const TAB_CONFIG: { key: Tab; label: string; icon: React.ElementType; valueKey: keyof LeaderboardEntry; format: (v: number) => string }[] = [
  { key: 'revenue', label: 'Revenue', icon: DollarSign, valueKey: 'revenue', format: formatRs },
  { key: 'transactions', label: 'Transactions', icon: ShoppingCart, valueKey: 'transactions', format: (v) => String(v) },
  { key: 'avg_sale', label: 'Avg Sale', icon: TrendingUp, valueKey: 'avg_sale', format: formatRs },
];

export function LeaderboardPage() {
  const { data, isLoading } = useLeaderboard();
  const [activeTab, setActiveTab] = useState<Tab>('revenue');

  const tabConfig = TAB_CONFIG.find((t) => t.key === activeTab)!;
  const entries =
    activeTab === 'revenue'
      ? (data?.top_by_revenue ?? [])
      : activeTab === 'transactions'
      ? (data?.top_by_transactions ?? [])
      : (data?.top_by_avg_sale ?? []);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Trophy className="h-6 w-6 text-yellow-500" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Staff Leaderboard</h1>
          <p className="text-sm text-slate-500">This month's performance rankings</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <LoadingSkeleton className="h-48" />
          <LoadingSkeleton className="h-64" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Podium */}
          {entries.length > 0 && (
            <div className="rounded-xl bg-surface shadow-sm">
              <h2 className="border-b border-border px-5 py-3 text-sm font-semibold text-slate-700">
                Top Performers
              </h2>
              <Podium entries={entries} />
            </div>
          )}

          {/* Tab selector */}
          <div className="flex gap-2">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Leaderboard table */}
          <div className="rounded-xl bg-surface shadow-sm">
            <div className="overflow-x-auto">
              {entries.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-sm text-slate-400">
                  No sales data for this month yet
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Rank</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Cashier</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">
                        {tabConfig.label}
                      </th>
                      {activeTab === 'revenue' && (
                        <>
                          <th className="px-4 py-3 text-right font-medium text-slate-600">Txns</th>
                          <th className="px-4 py-3 text-right font-medium text-slate-600">Avg Sale</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {entries.map((entry, idx) => (
                      <tr key={entry.cashier_id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          {idx === 0 ? (
                            <Trophy className="h-5 w-5 text-yellow-500" />
                          ) : idx === 1 ? (
                            <Medal className="h-5 w-5 text-slate-400" />
                          ) : idx === 2 ? (
                            <Star className="h-5 w-5 text-amber-600" />
                          ) : (
                            <span className="text-sm font-medium text-slate-500">#{idx + 1}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                              {entry.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-800">{entry.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {tabConfig.format(entry[tabConfig.valueKey] as number)}
                        </td>
                        {activeTab === 'revenue' && (
                          <>
                            <td className="px-4 py-3 text-right text-slate-600">{entry.transactions}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{formatRs(entry.avg_sale)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Perfect Attendance */}
          {(data?.perfect_attendance?.length ?? 0) > 0 && (
            <div className="rounded-xl bg-surface shadow-sm">
              <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                <UserCheck className="h-5 w-5 text-success" />
                <h2 className="text-sm font-semibold text-slate-700">Perfect Attendance 🏅</h2>
              </div>
              <div className="flex flex-wrap gap-3 p-5">
                {data!.perfect_attendance.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success"
                  >
                    <UserCheck className="h-4 w-4" />
                    {emp.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
