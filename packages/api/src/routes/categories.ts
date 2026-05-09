import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/errors';

export const categoryRouter = Router();
categoryRouter.use(authMiddleware);

categoryRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('business_id', req.user.businessId)
      .order('sort_order');
    if (error) throw new AppError('Could not fetch categories', 500);
    res.json(data ?? []);
  })
);

categoryRouter.post(
  '/',
  requireRole('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      name_en: z.string().min(1).max(255),
      name_ur: z.string().max(255).nullable().optional(),
      color: z.string().nullable().optional(),
      icon: z.string().nullable().optional(),
      sort_order: z.number().int().default(0),
    });
    const body = schema.parse(req.body);
    const { data, error } = await supabase
      .from('categories')
      .insert({ ...body, business_id: req.user.businessId })
      .select()
      .single();
    if (error) throw new AppError('Could not create category', 500);
    res.status(201).json(data);
  })
);
