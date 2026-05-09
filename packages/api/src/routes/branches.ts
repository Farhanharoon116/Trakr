import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError, NotFoundError } from '../utils/errors';

export const branchRouter = Router();
branchRouter.use(authMiddleware);

branchRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('business_id', req.user.businessId)
      .eq('is_active', true)
      .order('name');
    if (error) throw new AppError('Could not fetch branches', 500);
    res.json(data);
  })
);

branchRouter.post(
  '/',
  requireRole('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      name: z.string().min(1).max(255),
      address: z.string().optional(),
      phone: z.string().max(20).optional(),
      manager_id: z.string().uuid().optional(),
    });
    const body = schema.parse(req.body);
    const { data, error } = await supabase
      .from('branches')
      .insert({ ...body, business_id: req.user.businessId })
      .select()
      .single();
    if (error) throw new AppError('Could not create branch', 500);
    res.status(201).json(data);
  })
);

branchRouter.patch(
  '/:id',
  requireRole('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      name: z.string().min(1).max(255).optional(),
      address: z.string().optional(),
      phone: z.string().max(20).optional(),
      manager_id: z.string().uuid().nullable().optional(),
      is_active: z.boolean().optional(),
    });
    const body = schema.parse(req.body);
    const { data, error } = await supabase
      .from('branches')
      .update(body)
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId)
      .select()
      .single();
    if (error || !data) throw new NotFoundError('Branch not found');
    res.json(data);
  })
);

branchRouter.delete(
  '/:id',
  requireRole('owner'),
  asyncHandler(async (req: Request, res: Response) => {
    const { error } = await supabase
      .from('branches')
      .update({ is_active: false })
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId);
    if (error) throw new NotFoundError('Branch not found');
    res.status(204).send();
  })
);
