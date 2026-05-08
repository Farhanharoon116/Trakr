import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/errors';

export const leaveRequestRouter = Router();
leaveRequestRouter.use(authMiddleware);

leaveRequestRouter.get(
  '/',
  requireRole('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const status = req.query['status'] as string | undefined;

    let query = supabase
      .from('leave_requests')
      .select('*, employees(name, designation)')
      .eq('business_id', req.user.businessId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new AppError('Could not fetch leave requests', 500);
    res.json(data ?? []);
  })
);

leaveRequestRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      employee_id: z.string().uuid(),
      leave_type: z.enum(['annual', 'sick', 'unpaid', 'other']),
      from_date: z.string().date(),
      to_date: z.string().date(),
      reason: z.string().nullable().optional(),
    });
    const body = schema.parse(req.body);
    const { data, error } = await supabase
      .from('leave_requests')
      .insert({ ...body, business_id: req.user.businessId, status: 'pending' })
      .select()
      .single();
    if (error) throw new AppError('Could not create leave request', 500);
    res.status(201).json(data);
  })
);

leaveRequestRouter.patch(
  '/:id',
  requireRole('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      status: z.enum(['approved', 'rejected']),
    });
    const { status } = schema.parse(req.body);
    const { data, error } = await supabase
      .from('leave_requests')
      .update({ status, reviewed_by: req.user.userId, reviewed_at: new Date().toISOString() })
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId)
      .select()
      .single();
    if (error || !data) throw new AppError('Leave request not found', 404);
    res.json(data);
  })
);
