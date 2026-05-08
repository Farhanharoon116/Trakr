import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Users, Plus, Pencil, X, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { EmptyState } from '../../components/shared/EmptyState';
import { calculateMonthlySalary } from '../../services/payroll.service';
import type { Employee, Attendance } from '@bizos/shared';

interface EmployeesResponse {
  data: Employee[];
  total: number;
  page: number;
  limit: number;
}

interface BranchItem {
  id: string;
  name: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatRs(n: number) {
  return `Rs ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

const DESIGNATIONS = [
  'Cashier', 'Manager', 'Store Manager', 'Sales Associate',
  'Accountant', 'Supervisor', 'Security Guard', 'Driver', 'Other',
];

const employeeSchema = z.object({
  name: z.string().min(1, 'Required').max(255),
  cnic: z
    .string()
    .regex(/^[0-9]{5}-[0-9]{7}-[0-9]$/, 'Format: XXXXX-XXXXXXX-X')
    .nullable()
    .optional(),
  designation: z.string().max(255).nullable().optional(),
  hire_date: z.string().nullable().optional(),
  salary: z.number({ invalid_type_error: 'Must be a number' }).nonnegative().nullable().optional(),
  bank_account: z.string().nullable().optional(),
  branch_id: z.string().uuid().nullable().optional(),
  emergency_contact_name: z.string().nullable().optional(),
  emergency_contact_phone: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

type EmployeeForm = z.infer<typeof employeeSchema>;

interface EmployeeModalProps {
  employee?: Employee | null;
  branches: BranchItem[];
  onClose: () => void;
}

function EmployeeModal({ employee, branches, onClose }: EmployeeModalProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: employee
      ? {
          name: employee.name,
          designation: employee.designation ?? '',
          hire_date: employee.hire_date ?? '',
          salary: employee.salary ?? undefined,
          branch_id: employee.branch_id ?? null,
          is_active: employee.is_active,
          emergency_contact_name:
            (employee.emergency_contact as { name?: string } | null)?.name ?? '',
          emergency_contact_phone:
            (employee.emergency_contact as { phone?: string } | null)?.phone ?? '',
        }
      : { is_active: true },
  });

  const onSubmit = async (values: EmployeeForm) => {
    const { emergency_contact_name, emergency_contact_phone, ...rest } = values;
    const payload = {
      ...rest,
      emergency_contact:
        emergency_contact_name || emergency_contact_phone
          ? { name: emergency_contact_name ?? '', phone: emergency_contact_phone ?? '' }
          : null,
    };

    if (employee) {
      await api.patch(`/employees/${employee.id}`, payload);
      toast.success('Employee updated');
    } else {
      await api.post('/employees', payload);
      toast.success('Employee added');
    }
    await queryClient.invalidateQueries({ queryKey: ['employees'] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{employee ? 'Edit Employee' : 'Add Employee'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full Name *</label>
            <input {...register('name')} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">CNIC</label>
            <input {...register('cnic')} placeholder="XXXXX-XXXXXXX-X" className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            {errors.cnic && <p className="mt-1 text-xs text-danger">{errors.cnic.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Designation</label>
              <input {...register('designation')} list="designations" className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              <datalist id="designations">
                {DESIGNATIONS.map((d) => <option key={d} value={d} />)}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Hire Date</label>
              <input type="date" {...register('hire_date')} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Monthly Salary (Rs)</label>
              <input type="number" step="1" {...register('salary', { valueAsNumber: true })} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Bank Account</label>
              <input {...register('bank_account')} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Assigned Branch</label>
            <select {...register('branch_id')} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <option value="">-- No branch --</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Emergency Contact Name</label>
              <input {...register('emergency_contact_name')} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Emergency Contact Phone</label>
              <input {...register('emergency_contact_phone')} className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('is_active')} className="h-4 w-4 accent-primary" />
            Active employee
          </label>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {isSubmitting ? 'Saving...' : employee ? 'Update' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface SalarySlipData {
  employee: Record<string, unknown>;
  message: string;
}

export function EmployeesPage() {
  const { business } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const queryClient = useQueryClient();

  const params = new URLSearchParams({ limit: '100', page: '1' });
  if (activeFilter !== 'all') params.set('is_active', activeFilter === 'active' ? 'true' : 'false');

  const { data, isLoading } = useQuery({
    queryKey: ['employees', activeFilter],
    queryFn: () => api.get<EmployeesResponse>(`/employees?${params}`),
    staleTime: 30 * 1000,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<BranchItem[]>('/branches'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/employees/${id}`, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] }).catch(() => void 0);
    },
  });

  const handleSalarySlip = async (emp: Employee) => {
    const month = new Date();
    const start = format(startOfMonth(month), 'yyyy-MM-dd');
    const end = format(endOfMonth(month), 'yyyy-MM-dd');

    const [slipData, attendanceData] = await Promise.all([
      api.get<SalarySlipData>(`/employees/${emp.id}/salary-slip`),
      api.get<Attendance[]>(`/attendance/report?start_date=${start}&end_date=${end}&employee_id=${emp.id}`),
    ]);

    const payroll = calculateMonthlySalary(emp, attendanceData as Attendance[], month);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const w = 210;
    let y = 15;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(business?.name ?? 'BizOS', w / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(12);
    doc.text(`Salary Slip — ${format(month, 'MMMM yyyy')}`, w / 2, y, { align: 'center' });
    y += 10;

    doc.setDrawColor('#E2E8F0');
    doc.line(15, y, w - 15, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const employee = slipData.employee as Record<string, string | null>;
    doc.text(`Employee: ${emp.name}`, 15, y);
    doc.text(`Designation: ${emp.designation ?? '—'}`, 110, y);
    y += 6;
    doc.text(`CNIC: ${employee['cnic'] ?? '—'}`, 15, y);
    doc.text(`Bank Account: ${employee['bank_account'] ?? '—'}`, 110, y);
    y += 10;

    doc.line(15, y, w - 15, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.text('ATTENDANCE SUMMARY', 15, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Working Days: ${payroll.working_days}`, 15, y);
    doc.text(`Present: ${payroll.days_present}`, 60, y);
    doc.text(`Absent: ${payroll.days_absent}`, 95, y);
    doc.text(`Leave: ${payroll.leave_days}`, 130, y);
    doc.text(`Half Day: ${payroll.half_day_count}`, 165, y);
    y += 10;

    doc.line(15, y, w - 15, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.text('EARNINGS', 15, y);
    doc.text('AMOUNT', w - 15, y, { align: 'right' });
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Basic Salary (earned)', 20, y);
    doc.text(formatRs(payroll.basic_earned), w - 15, y, { align: 'right' });
    y += 6;
    doc.text(`Overtime Pay (${payroll.total_overtime_hours} hrs × 1.5x)`, 20, y);
    doc.text(formatRs(payroll.overtime_pay), w - 15, y, { align: 'right' });
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Total Earnings', 20, y);
    doc.text(formatRs(payroll.basic_earned + payroll.overtime_pay), w - 15, y, { align: 'right' });
    y += 10;

    doc.line(15, y, w - 15, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('DEDUCTIONS', 15, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Leave Deductions', 20, y);
    doc.text(formatRs(payroll.leave_deductions), w - 15, y, { align: 'right' });
    y += 10;

    doc.line(15, y, w - 15, y);
    y += 6;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('NET SALARY', 15, y);
    doc.text(formatRs(payroll.net_salary), w - 15, y, { align: 'right' });
    y += 15;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.line(15, y + 10, 65, y + 10);
    doc.line(145, y + 10, w - 15, y + 10);
    doc.text('Employee Signature', 15, y + 14);
    doc.text('Authorized Signatory', 145, y + 14);

    doc.output('dataurlnewwindow');
  };

  const employees = data?.data ?? [];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-slate-900">Employees</h1>
          {data && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{data.total}</span>
          )}
        </div>
        <button
          onClick={() => { setEditEmployee(null); setShowModal(true); }}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-0 overflow-hidden rounded-xl border border-border w-fit">
        {(['all', 'active', 'inactive'] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => setActiveFilter(opt)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${activeFilter === opt ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {opt}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <LoadingSkeleton className="h-36" count={8} />
        </div>
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No employees found"
          description="Add your first employee to get started"
          action={
            <button onClick={() => { setEditEmployee(null); setShowModal(true); }} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
              <Plus className="h-4 w-4" /> Add Employee
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {employees.map((emp) => (
            <div key={emp.id} className="rounded-xl bg-surface p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {getInitials(emp.name)}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${emp.is_active ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'}`}>
                  {emp.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h3 className="mt-3 font-semibold text-slate-900">{emp.name}</h3>
              <p className="text-sm text-slate-500">{emp.designation ?? 'No designation'}</p>
              {emp.salary && (
                <p className="mt-1 text-xs text-slate-400">{formatRs(emp.salary)}/mo</p>
              )}
              <div className="mt-3 flex gap-1">
                <button
                  onClick={() => { setEditEmployee(emp); setShowModal(true); }}
                  className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Pencil className="mx-auto h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleSalarySlip(emp).catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Failed'))}
                  className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  title="Generate salary slip"
                >
                  <FileText className="mx-auto h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => toggleMutation.mutate({ id: emp.id, is_active: !emp.is_active })}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${emp.is_active ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}
                >
                  {emp.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <EmployeeModal
          employee={editEmployee}
          branches={branches}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
