import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/errors';

export const attendanceRouter = Router();
attendanceRouter.use(authMiddleware);

attendanceRouter.post(
  '/clock-in',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      employee_id: z.string().uuid(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    });
    const { employee_id, lat, lng } = schema.parse(req.body);
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('attendance')
      .upsert(
        {
          business_id: req.user.businessId,
          employee_id,
          date: today,
          clock_in: new Date().toISOString(),
          lat_in: lat,
          lng_in: lng,
          status: 'present',
        },
        { onConflict: 'employee_id,date' }
      )
      .select()
      .single();

    if (error) throw new AppError('Could not record clock-in', 500);
    res.json(data);
  })
);

attendanceRouter.post(
  '/clock-out',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({ employee_id: z.string().uuid() });
    const { employee_id } = schema.parse(req.body);
    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = await supabase
      .from('attendance')
      .select('clock_in')
      .eq('employee_id', employee_id)
      .eq('date', today)
      .single();

    const clockOut = new Date();
    const clockIn = existing?.clock_in ? new Date(existing.clock_in as string) : clockOut;
    const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
    const overtimeHours = Math.max(0, hoursWorked - 8);

    const { data, error } = await supabase
      .from('attendance')
      .update({
        clock_out: clockOut.toISOString(),
        hours_worked: Math.round(hoursWorked * 100) / 100,
        overtime_hours: Math.round(overtimeHours * 100) / 100,
      })
      .eq('employee_id', employee_id)
      .eq('date', today)
      .select()
      .single();

    if (error) throw new AppError('Could not record clock-out', 500);
    res.json(data);
  })
);

attendanceRouter.get(
  '/report',
  requireRole('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      start_date: z.string().date(),
      end_date: z.string().date(),
      employee_id: z.string().uuid().optional(),
    });
    const { start_date, end_date, employee_id } = schema.parse(req.query);

    let query = supabase
      .from('attendance')
      .select('*, employees(name, designation)')
      .eq('business_id', req.user.businessId)
      .gte('date', start_date)
      .lte('date', end_date)
      .order('date', { ascending: false });

    if (employee_id) query = query.eq('employee_id', employee_id);

    const { data, error } = await query;
    if (error) throw new AppError('Could not fetch attendance report', 500);
    res.json(data);
  })
);
