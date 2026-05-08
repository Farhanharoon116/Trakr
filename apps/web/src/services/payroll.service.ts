import { isWeekend } from 'date-fns';
import type { Employee, Attendance } from '@bizos/shared';

export interface PayrollResult {
  working_days: number;
  days_present: number;
  days_absent: number;
  half_day_count: number;
  leave_days: number;
  total_overtime_hours: number;
  daily_rate: number;
  basic_earned: number;
  overtime_pay: number;
  leave_deductions: number;
  net_salary: number;
}

export function calculateMonthlySalary(
  employee: Pick<Employee, 'salary'>,
  attendanceRecords: Pick<Attendance, 'status' | 'overtime_hours'>[],
  month: Date
): PayrollResult {
  const salary = employee.salary ?? 0;

  // Count business days in the month
  const year = month.getFullYear();
  const mon = month.getMonth();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  let working_days = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (!isWeekend(new Date(year, mon, d))) working_days++;
  }

  const days_present = attendanceRecords.filter(
    (r) => r.status === 'present' || r.status === 'half_day'
  ).length;
  const half_day_count = attendanceRecords.filter((r) => r.status === 'half_day').length;
  const leave_days = attendanceRecords.filter((r) => r.status === 'leave').length;
  const days_absent = attendanceRecords.filter((r) => r.status === 'absent').length;

  const total_overtime_hours = attendanceRecords.reduce(
    (sum, r) => sum + (r.overtime_hours ?? 0),
    0
  );

  const daily_rate = working_days > 0 ? salary / working_days : 0;
  const basic_earned =
    daily_rate * days_present - daily_rate * 0.5 * half_day_count;

  const hourly_rate = working_days > 0 ? salary / (working_days * 8) : 0;
  const overtime_pay = hourly_rate * 1.5 * total_overtime_hours;

  const leave_deductions = 0; // approved leave is paid; unpaid handled separately
  const net_salary = Math.max(0, basic_earned + overtime_pay - leave_deductions);

  return {
    working_days,
    days_present,
    days_absent,
    half_day_count,
    leave_days,
    total_overtime_hours: Math.round(total_overtime_hours * 100) / 100,
    daily_rate: Math.round(daily_rate * 100) / 100,
    basic_earned: Math.round(basic_earned * 100) / 100,
    overtime_pay: Math.round(overtime_pay * 100) / 100,
    leave_deductions,
    net_salary: Math.round(net_salary * 100) / 100,
  };
}
