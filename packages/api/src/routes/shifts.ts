import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/errors';

export const shiftRouter = Router();
shiftRouter.use(authMiddleware);

shiftRouter.get(
  '/current',
  asyncHandler(async (req: Request, res: Response) => {
    const { data, error } = await supabase
      .from('shifts')
      .select('*, branches(name), users(name)')
      .eq('business_id', req.user.businessId)
      .is('closed_at', null)
      .order('opened_at', { ascending: false });
    if (error) throw new AppError('Could not fetch shifts', 500);
    res.json(data);
  })
);

shiftRouter.post(
  '/open',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      branch_id: z.string().uuid(),
      opening_cash: z.number().nonnegative().default(0),
    });
    const { branch_id, opening_cash } = schema.parse(req.body);
    const { data, error } = await supabase
      .from('shifts')
      .insert({
        business_id: req.user.businessId,
        branch_id,
        cashier_id: req.user.userId,
        opening_cash,
      })
      .select()
      .single();
    if (error) throw new AppError('Could not open shift', 500);
    res.status(201).json(data);
  })
);

shiftRouter.post(
  '/:id/close',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({ closing_cash: z.number().nonnegative(), notes: z.string().optional() });
    const { closing_cash, notes } = schema.parse(req.body);

    const { data: shift } = await supabase
      .from('shifts')
      .select('total_sales')
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId)
      .single();

    if (!shift) throw new AppError('Shift not found', 404);

    const { data, error } = await supabase
      .from('shifts')
      .update({ closed_at: new Date().toISOString(), closing_cash, notes })
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId)
      .select()
      .single();

    if (error) throw new AppError('Could not close shift', 500);
    res.json(data);
  })
);
