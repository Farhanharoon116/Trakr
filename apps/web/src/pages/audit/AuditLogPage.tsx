import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';

const ACTION_STYLE: Record<string, string> = {
  INSERT: 'bg-success/10 text-success',
  UPDATE: 'bg-primary/10 text-primary',
  DELETE: 'bg-danger/10 text-danger',
};

const TABLE_OPTIONS = [
  'inventory', 'products', 'sales', 'customers',
  'employees', 'attendance', 'purchase_orders', 'users',
];

function DiffViewer({
  oldData,
  newData,
}: {
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}) {
  const keys = Array.from(
    new Set([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})])
  );
  if (keys.length === 0) return <p className="text-xs text-slate-400">No diff available</p>;

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-slate-500">
          <th className="pb-1 pr-4">Field</th>
          <th className="pb-1 pr-4 text-danger">Old Value</th>
          <th className="pb-1 text-success">New Value</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((key) => {
          const oldVal = oldData?.[key];
          const newVal = newData?.[key];
          const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
          return (
            <tr key={key} className={changed ? 'font-medium' : 'text-slate-400'}>
              <td className="py-0.5 pr-4 font-mono">{key}</td>
              <td className="py-0.5 pr-4 text-danger">
                {oldVal !== undefined ? String(JSON.stringify(oldVal)) : '—'}
              </td>
              <td className="py-0.5 text-success">
                {newVal !== undefined ? String(JSON.stringify(newVal)) : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function AuditLogPage() {
  const [tableName, setTableName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useAuditLogs({ table_name: tableName || undefined, from: from || undefined, to: to || undefined, page });

  const totalPages = data ? Math.ceil(data.total / 50) : 1;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-sm text-slate-500">All system changes — owner view only</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={tableName}
          onChange={(e) => { setTableName(e.target.value); setPage(1); }}
          className="rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">All tables</option>
          {TABLE_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <span className="text-sm text-slate-500">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        {(tableName || from || to) && (
          <button
            onClick={() => { setTableName(''); setFrom(''); setTo(''); setPage(1); }}
            className="rounded-xl border border-border px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
          >
            Clear
          </button>
        )}
        {data && (
          <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {data.total} entries
          </span>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton className="h-12" count={8} />
      ) : !data?.data?.length ? (
        <div className="flex items-center justify-center rounded-xl border border-border py-16 text-sm text-slate-400">
          No audit log entries found
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Timestamp</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">User</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Action</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Table</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.data.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {format(parseISO(log.created_at), 'dd MMM yyyy HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.users?.name ?? <span className="text-slate-400">System</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACTION_STYLE[log.action]}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{log.table_name}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {expandedId === log.id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr>
                      <td colSpan={5} className="bg-slate-50 px-6 py-4">
                        <p className="mb-2 font-mono text-xs text-slate-500">
                          Record ID: {log.record_id}
                        </p>
                        <DiffViewer
                          oldData={log.old_data}
                          newData={log.new_data}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
