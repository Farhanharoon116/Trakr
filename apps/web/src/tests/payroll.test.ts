import { describe, it, expect } from 'vitest';
import { calculateMonthlySalary } from '../services/payroll.service';
import type { Attendance } from '@bizos/shared';

type AttendanceRecord = Pick<Attendance, 'status' | 'overtime_hours'>;

const present = (overtime_hours = 0): AttendanceRecord => ({
  status: 'present',
  overtime_hours,
});
const absent = (): AttendanceRecord => ({ status: 'absent', overtime_hours: 0 });
const halfDay = (): AttendanceRecord => ({ status: 'half_day', overtime_hours: 0 });
const leave = (): AttendanceRecord => ({ status: 'leave', overtime_hours: 0 });

const employee = { salary: 30000 };

describe('calculateMonthlySalary', () => {
  // Use a fixed month: January 2024 (31 days, Sundays off → 27 working days)
  const jan2024 = new Date(2024, 0, 1);

  it('calculates working days (Mon-Sat, no Sun)', () => {
    const result = calculateMonthlySalary(employee, [], jan2024);
    expect(result.working_days).toBe(27);
  });

  it('full attendance earns full salary', () => {
    const records = Array(27).fill(present());
    const result = calculateMonthlySalary(employee, records, jan2024);
    expect(result.days_present).toBe(27);
    expect(result.days_absent).toBe(0);
    expect(result.net_salary).toBeCloseTo(30000, 0);
  });

  it('zero attendance earns zero salary', () => {
    const result = calculateMonthlySalary(employee, [], jan2024);
    expect(result.days_present).toBe(0);
    expect(result.net_salary).toBe(0);
  });

  it('half day deducts half a day\'s rate', () => {
    const result = calculateMonthlySalary(employee, [halfDay()], jan2024);
    const daily = 30000 / 27;
    // half-day counts as present but deducts 0.5 day
    expect(result.half_day_count).toBe(1);
    expect(result.basic_earned).toBeCloseTo(daily - daily * 0.5, 1);
  });

  it('leave days are counted separately and not deducted (paid leave)', () => {
    const result = calculateMonthlySalary(employee, [leave()], jan2024);
    expect(result.leave_days).toBe(1);
    expect(result.leave_deductions).toBe(0);
  });

  it('absent days do not add to basic_earned', () => {
    const result = calculateMonthlySalary(employee, [absent()], jan2024);
    expect(result.days_absent).toBe(1);
    expect(result.days_present).toBe(0);
    expect(result.basic_earned).toBe(0);
  });

  it('overtime is paid at 1.5× hourly rate', () => {
    const records = [present(2)]; // 2 hours overtime
    const result = calculateMonthlySalary(employee, records, jan2024);
    const hourly = 30000 / (27 * 8);
    expect(result.overtime_pay).toBeCloseTo(hourly * 1.5 * 2, 1);
    expect(result.total_overtime_hours).toBe(2);
  });

  it('net salary = basic_earned + overtime_pay', () => {
    const records = [present(1)];
    const result = calculateMonthlySalary(employee, records, jan2024);
    expect(result.net_salary).toBeCloseTo(result.basic_earned + result.overtime_pay, 2);
  });

  it('net salary cannot go below zero', () => {
    // Employee with negative computed salary would be clamped to 0
    const broke = { salary: 0 };
    const result = calculateMonthlySalary(broke, [absent()], jan2024);
    expect(result.net_salary).toBe(0);
  });

  it('returns rounded values (2 decimal places)', () => {
    const records = Array(10).fill(present(1));
    const result = calculateMonthlySalary({ salary: 33333 }, records, jan2024);
    expect(result.daily_rate).toBe(Math.round(result.daily_rate * 100) / 100);
    expect(result.net_salary).toBe(Math.round(result.net_salary * 100) / 100);
  });

  it('counts mixed attendance correctly', () => {
    const records = [
      present(),
      present(),
      halfDay(),
      absent(),
      leave(),
    ];
    const result = calculateMonthlySalary(employee, records, jan2024);
    expect(result.days_present).toBe(3); // 2 present + 1 half_day
    expect(result.half_day_count).toBe(1);
    expect(result.days_absent).toBe(1);
    expect(result.leave_days).toBe(1);
  });

  it('handles zero salary employee', () => {
    const records = [present()];
    const result = calculateMonthlySalary({ salary: 0 }, records, jan2024);
    expect(result.net_salary).toBe(0);
    expect(result.daily_rate).toBe(0);
  });

  describe('with different months', () => {
    it('February 2024 has 25 working days (29 days, 4 Sundays)', () => {
      const feb2024 = new Date(2024, 1, 1); // Feb 2024 (leap year, 29 days)
      // Sundays: Feb 4, 11, 18, 25 → 29 - 4 = 25 working days
      const result = calculateMonthlySalary(employee, [], feb2024);
      expect(result.working_days).toBe(25);
    });

    it('March 2024 has 26 working days', () => {
      const mar2024 = new Date(2024, 2, 1);
      const result = calculateMonthlySalary(employee, [], mar2024);
      expect(result.working_days).toBe(26);
    });
  });
});
