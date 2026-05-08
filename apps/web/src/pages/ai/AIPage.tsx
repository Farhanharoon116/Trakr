import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useSalesForecast, useReorderSuggestions } from '../../hooks/useAI';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';

function formatRs(n: number) {
  return `Rs ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

const URGENCY_STYLE: Record<string, string> = {
  urgent: 'bg-danger/10 text-danger',
  soon: 'bg-warning/10 text-warning',
  monitor: 'bg-slate-100 text-slate-600',
};

export function AIPage() {
  const [forecastEnabled, setForecastEnabled] = useState(false);
  const [reorderEnabled, setReorderEnabled] = useState(false);

  const forecast = useSalesForecast(undefined);
  const reorder = useReorderSuggestions();

  const handleGenerateForecast = () => {
    setForecastEnabled(true);
    forecast.refetch();
  };

  const handleGenerateReorder = () => {
    setReorderEnabled(true);
    reorder.refetch();
  };

  // Build chart data: actual (last 90 days placeholder — predictions only) + predicted
  const chartData = (forecast.data?.predictions ?? []).map((p) => ({
    date: p.date,
    predicted: p.predicted_revenue,
    confidence: p.confidence,
  }));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Brain className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">AI Insights</h1>
          <p className="text-sm text-slate-500">
            Powered by Google Gemini — forecasts cached for 24 hours
          </p>
        </div>
      </div>

      {/* Sales Forecast */}
      <div className="rounded-xl bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-slate-800">30-Day Revenue Forecast</h2>
          </div>
          <button
            onClick={handleGenerateForecast}
            disabled={forecast.isFetching}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${forecast.isFetching ? 'animate-spin' : ''}`} />
            {forecast.isFetching ? 'Generating…' : forecastEnabled ? 'Refresh' : 'Generate Forecast'}
          </button>
        </div>

        <div className="p-5">
          {!forecastEnabled && !forecast.data ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
              <Brain className="h-10 w-10 opacity-30" />
              <p className="text-sm">Click "Generate Forecast" to run AI analysis</p>
            </div>
          ) : forecast.isFetching ? (
            <LoadingSkeleton className="h-64" />
          ) : forecast.isError ? (
            <div className="rounded-xl bg-danger/10 p-4 text-sm text-danger">
              {forecast.error instanceof Error
                ? forecast.error.message
                : 'Failed to generate forecast. Check that GEMINI_API_KEY is configured.'}
            </div>
          ) : forecast.data ? (
            <>
              {/* Chart */}
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(d: string) => d.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatRs(v), 'Predicted']}
                    labelFormatter={(l: string) => format(parseISO(l), 'dd MMM yyyy')}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    fill="#2563EB20"
                    stroke="#2563EB"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    name="Predicted Revenue"
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#2563EB"
                    strokeWidth={0}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Insights */}
              {forecast.data.insights.length > 0 && (
                <div className="mt-4 rounded-xl bg-primary/5 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-primary">AI Insights</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {forecast.data.insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Seasonality flags */}
              {forecast.data.seasonality_flags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {forecast.data.seasonality_flags.map((flag, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning"
                    >
                      🗓 {flag}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Reorder Suggestions */}
      <div className="rounded-xl bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h2 className="font-semibold text-slate-800">AI Reorder Suggestions</h2>
          </div>
          <button
            onClick={handleGenerateReorder}
            disabled={reorder.isFetching}
            className="flex items-center gap-2 rounded-xl bg-warning/10 px-4 py-2 text-sm font-semibold text-warning hover:bg-warning/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${reorder.isFetching ? 'animate-spin' : ''}`} />
            {reorder.isFetching ? 'Analysing…' : reorderEnabled ? 'Refresh' : 'Analyse Stock'}
          </button>
        </div>

        <div className="p-5">
          {!reorderEnabled && !reorder.data ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
              <AlertTriangle className="h-10 w-10 opacity-30" />
              <p className="text-sm">Click "Analyse Stock" to get AI-powered reorder suggestions</p>
            </div>
          ) : reorder.isFetching ? (
            <LoadingSkeleton className="h-32" count={3} />
          ) : reorder.isError ? (
            <div className="rounded-xl bg-danger/10 p-4 text-sm text-danger">
              {reorder.error instanceof Error
                ? reorder.error.message
                : 'Failed to generate suggestions.'}
            </div>
          ) : reorder.data && reorder.data.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              ✅ All products are well-stocked — no reorder needed
            </div>
          ) : reorder.data ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs font-medium text-slate-500">
                  <tr>
                    <th className="pb-2 pr-4">Product</th>
                    <th className="pb-2 pr-4 text-center">Days to Stockout</th>
                    <th className="pb-2 pr-4 text-center">Recommended Qty</th>
                    <th className="pb-2">Urgency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reorder.data.map((s) => (
                    <tr key={s.product_id} className="hover:bg-slate-50">
                      <td className="py-3 pr-4 font-medium text-slate-800">{s.product_name}</td>
                      <td className="py-3 pr-4 text-center">
                        {s.days_until_stockout <= 0
                          ? 'Out of stock'
                          : `${s.days_until_stockout}d`}
                      </td>
                      <td className="py-3 pr-4 text-center font-semibold">{s.recommended_qty}</td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                            URGENCY_STYLE[s.urgency]
                          }`}
                        >
                          {s.urgency}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
