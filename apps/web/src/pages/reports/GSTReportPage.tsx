import { useState } from 'react';
import { BarChart3, Download, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { EmptyState } from '../../components/shared/EmptyState';
import { useGSTReport } from '../../hooks/useReports';

function formatRs(n: number) {
  return `Rs ${n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function GSTReportPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [submittedFrom, setSubmittedFrom] = useState<string | null>(null);
  const [submittedTo, setSubmittedTo] = useState<string | null>(null);

  const { data, isLoading, error } = useGSTReport(submittedFrom, submittedTo);

  const handleGenerate = () => {
    if (!from || !to) {
      toast.error('Please select both from and to dates');
      return;
    }
    setSubmittedFrom(from);
    setSubmittedTo(to);
  };

  const handleDownloadCSV = () => {
    if (!data?.csv) return;
    const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gst-report-${submittedFrom}-${submittedTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sales = data?.sales ?? [];
  const hasData = !!data && submittedFrom && submittedTo;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-slate-900">GST Report (FBR)</h1>
      </div>

      {/* Form */}
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">From Date</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">To Date</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <button
          onClick={handleGenerate}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Generate Report
        </button>
      </div>

      {isLoading && <LoadingSkeleton className="h-24" count={4} />}

      {error && (
        <div className="rounded-xl bg-danger/10 p-4 text-sm text-danger">
          Failed to generate report. Please try again.
        </div>
      )}

      {hasData && !isLoading && (
        <>
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-surface border border-border p-4">
              <p className="text-sm text-slate-500">Total Sales</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{formatRs(data.total_sales)}</p>
            </div>
            <div className="rounded-xl bg-surface border border-border p-4">
              <p className="text-sm text-slate-500">Total Taxable Amount</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatRs(data.total_sales - data.total_tax)}
              </p>
            </div>
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
              <p className="text-sm text-slate-500">Total GST Collected</p>
              <p className="mt-1 text-2xl font-bold text-primary">{formatRs(data.total_tax)}</p>
            </div>
          </div>

          {/* Table / Empty State */}
          {sales.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No sales in this period"
              description="No transactions found for the selected date range"
            />
          ) : (
            <>
              <div className="mb-4 flex justify-end">
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-surface">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Invoice #</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">Buyer</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">Taxable Value</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">GST Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sales.map((s, idx) => {
                      const taxable = (s.total as number) - (s.tax_amount as number);
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">
                            #{s.receipt_number as string}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {format(parseISO(s.created_at as string), 'dd MMM yyyy')}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {(s.customers as { name: string } | null)?.name ?? 'Walk-in Customer'}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">
                            {formatRs(taxable)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-primary">
                            {formatRs(s.tax_amount as number)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
