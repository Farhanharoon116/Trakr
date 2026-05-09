import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Clock, Download, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { EmptyState } from '../../components/shared/EmptyState';
import type { Attendance, LeaveRequest } from '@bizos/shared';

type Tab = 'today' | 'report' | 'leaves';

interface AttendanceWithEmployee extends Attendance {
  employees?: { name: string; designation: string | null };
}

interface LeaveRequestWithEmployee extends LeaveRequest {
  employees?: { name: string; designation: string | null };
}

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-success/10 text-success',
  absent: 'bg-danger/10 text-danger',
  leave: 'bg-primary/10 text-primary',
  half_day: 'bg-warning/10 text-warning',
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  unpaid: 'Unpaid Leave',
  other: 'Other',
};

function downloadCSV(rows: AttendanceWithEmployee[]) {
  const header = ['Employee', 'Designation', 'Date', 'Clock In', 'Clock Out', 'Hours Worked', 'Overtime', 'Status'];
  const lines = rows.map((r) => [
    r.employees?.name ?? r.employee_id,
    r.employees?.designation ?? '',
    r.date,
    r.clock_in ? format(new Date(r.clock_in), 'HH:mm') : '',
    r.clock_out ? format(new Date(r.clock_out), 'HH:mm') : '',
    r.hours_worked ?? '',
    r.overtime_hours ?? '0',
    r.status,
  ]);
  const csv = [header, ...lines].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AttendancePage() {
  const [tab, setTab] = useState<Tab>('today');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-01'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const queryClient = useQueryClient();

  const today = format(new Date(), 'yyyy-MM-dd');

  // Today's attendance
  const { data: todayAttendance = [], isLoading: loadingToday } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () =>
      api.get<AttendanceWithEmployee[]>(
        `/attendance/report?start_date=${today}&end_date=${today}`
      ),
    refetchInterval: 2 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  // Report
  const { data: reportAttendance = [], isLoading: loadingReport } = useQuery({
    queryKey: ['attendance', 'report', startDate, endDate],
    queryFn: () =>
      api.get<AttendanceWithEmployee[]>(
        `/attendance/report?start_date=${startDate}&end_date=${endDate}`
      ),
    enabled: tab === 'report',
  });

  // Leave requests
  const { data: leaveRequests = [], isLoading: loadingLeaves } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => api.get<LeaveRequestWithEmployee[]>('/leave-requests'),
    enabled: tab === 'leaves',
  });

  const clockInMutation = useMutation({
    mutationFn: ({ employee_id }: { employee_id: string }) =>
      api.post('/attendance/clock-in', { employee_id }),
    onSuccess: () => {
      toast.success('Clocked in');
      queryClient.invalidateQueries({ queryKey: ['attendance'] }).catch(() => void 0);
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: ({ employee_id }: { employee_id: string }) =>
      api.post('/attendance/clock-out', { employee_id }),
    onSuccess: () => {
      toast.success('Clocked out');
      queryClient.invalidateQueries({ queryKey: ['attendance'] }).catch(() => void 0);
    },
  });

  const leaveActionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      api.patch(`/leave-requests/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] }).catch(() => void 0);
    },
  });

  const present = todayAttendance.filter((r) => r.status === 'present').length;
  const absent = todayAttendance.filter((r) => r.status === 'absent').length;
  const onLeave = todayAttendance.filter((r) => r.status === 'leave').length;
  const halfDay = todayAttendance.filter((r) => r.status === 'half_day').length;

  const reportPresent = reportAttendance.filter((r) => r.status === 'present').length;
  const reportAbsent = reportAttendance.filter((r) => r.status === 'absent').length;
  const reportLeave = reportAttendance.filter((r) => r.status === 'leave').length;
  const reportHalfDay = reportAttendance.filter((r) => r.status === 'half_day').length;

  const pendingLeaves = leaveRequests.filter((r) => r.status === 'pending');
  const resolvedLeaves = leaveRequests.filter((r) => r.status !== 'pending');

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'today', label: "Today's Attendance" },
    { id: 'report', label: 'Attendance Report' },
    { id: 'leaves', label: 'Leave Requests', badge: pendingLeaves.length },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Clock className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-slate-900">Attendance</h1>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-0 overflow-hidden rounded-xl border border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs ${tab === t.id ? 'bg-white/20' : 'bg-danger/10 text-danger'}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Today */}
      {tab === 'today' && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Present', value: present, color: 'text-success' },
              { label: 'Absent', value: absent, color: 'text-danger' },
              { label: 'On Leave', value: onLeave, color: 'text-primary' },
              { label: 'Half Day', value: halfDay, color: 'text-warning' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-surface p-3 shadow-sm text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-surface shadow-sm overflow-hidden">
            {loadingToday ? (
              <div className="p-4 space-y-2"><LoadingSkeleton className="h-10" count={5} /></div>
            ) : todayAttendance.length === 0 ? (
              <EmptyState icon={Clock} title="No attendance records today" description="Clock in records will appear here" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium text-slate-500">
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Clock In</th>
                      <th className="px-4 py-3">Clock Out</th>
                      <th className="px-4 py-3">Hours</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {todayAttendance.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{rec.employees?.name ?? rec.employee_id}</p>
                          <p className="text-xs text-slate-400">{rec.employees?.designation ?? ''}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {rec.clock_in ? format(new Date(rec.clock_in), 'HH:mm') : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {rec.clock_out ? format(new Date(rec.clock_out), 'HH:mm') : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {rec.hours_worked != null ? `${rec.hours_worked}h` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[rec.status] ?? ''}`}>
                            {rec.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {!rec.clock_in && (
                              <button
                                onClick={() => clockInMutation.mutate({ employee_id: rec.employee_id })}
                                className="rounded-lg bg-success/10 px-2 py-1 text-xs font-medium text-success hover:bg-success/20"
                              >
                                Clock In
                              </button>
                            )}
                            {rec.clock_in && !rec.clock_out && (
                              <button
                                onClick={() => clockOutMutation.mutate({ employee_id: rec.employee_id })}
                                className="rounded-lg bg-danger/10 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/20"
                              >
                                Clock Out
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab 2: Report */}
      {tab === 'report' && (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <button
              onClick={() => downloadCSV(reportAttendance)}
              className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Present', value: reportPresent, color: 'text-success' },
              { label: 'Absent', value: reportAbsent, color: 'text-danger' },
              { label: 'Leave', value: reportLeave, color: 'text-primary' },
              { label: 'Half Day', value: reportHalfDay, color: 'text-warning' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-surface p-3 shadow-sm text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-surface shadow-sm overflow-hidden">
            {loadingReport ? (
              <div className="p-4 space-y-2"><LoadingSkeleton className="h-10" count={5} /></div>
            ) : reportAttendance.length === 0 ? (
              <EmptyState icon={Clock} title="No records in this date range" description="Adjust the date range to find attendance records." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium text-slate-500">
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Clock In</th>
                      <th className="px-4 py-3">Clock Out</th>
                      <th className="px-4 py-3">Hours</th>
                      <th className="px-4 py-3">Overtime</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reportAttendance.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{rec.employees?.name ?? rec.employee_id}</td>
                        <td className="px-4 py-3 text-slate-600">{format(new Date(rec.date), 'dd MMM yyyy')}</td>
                        <td className="px-4 py-3 text-slate-600">{rec.clock_in ? format(new Date(rec.clock_in), 'HH:mm') : '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{rec.clock_out ? format(new Date(rec.clock_out), 'HH:mm') : '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{rec.hours_worked != null ? `${rec.hours_worked}h` : '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{rec.overtime_hours ? `${rec.overtime_hours}h` : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[rec.status] ?? ''}`}>
                            {rec.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab 3: Leave Requests */}
      {tab === 'leaves' && (
        <div className="space-y-6">
          {/* Pending */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Pending Requests</h3>
            {loadingLeaves ? (
              <LoadingSkeleton className="h-16" count={3} />
            ) : pendingLeaves.length === 0 ? (
              <EmptyState icon={CheckCircle} title="No pending leave requests" description="All leave requests have been reviewed." />
            ) : (
              <div className="rounded-xl bg-surface shadow-sm divide-y divide-border overflow-hidden">
                {pendingLeaves.map((req) => (
                  <div key={req.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{req.employees?.name ?? req.employee_id}</p>
                      <p className="text-sm text-slate-500">
                        {LEAVE_TYPE_LABELS[req.leave_type] ?? req.leave_type} &bull;{' '}
                        {format(new Date(req.from_date), 'dd MMM')} – {format(new Date(req.to_date), 'dd MMM yyyy')}
                      </p>
                      {req.reason && <p className="text-xs text-slate-400">{req.reason}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => leaveActionMutation.mutate({ id: req.id, status: 'approved' })}
                        className="flex items-center gap-1 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => leaveActionMutation.mutate({ id: req.id, status: 'rejected' })}
                        className="flex items-center gap-1 rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/20"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History */}
          {resolvedLeaves.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">History</h3>
              <div className="rounded-xl bg-surface shadow-sm divide-y divide-border overflow-hidden">
                {resolvedLeaves.map((req) => (
                  <div key={req.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{req.employees?.name ?? req.employee_id}</p>
                      <p className="text-sm text-slate-500">
                        {LEAVE_TYPE_LABELS[req.leave_type] ?? req.leave_type} &bull;{' '}
                        {format(new Date(req.from_date), 'dd MMM')} – {format(new Date(req.to_date), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${req.status === 'approved' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                      {req.status}
                    </span>
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
