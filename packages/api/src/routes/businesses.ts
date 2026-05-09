import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError } from '../utils/errors';

export const businessRouter = Router();
businessRouter.use(authMiddleware);

businessRouter.get(
  '/me',
  asyncHandler(async (req: Request, res: Response) => {
    const { data: business, error } = await supabase
      .from('businesses')
      .select('*, branches(*)')
      .eq('id', req.user.businessId)
      .single();

    if (error || !business) throw new NotFoundError('Business not found');
    res.json(business);
  })
);

businessRouter.patch(
  '/me',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      name: z.string().min(1).max(255).optional(),
      phone: z.string().max(20).optional(),
      address: z.string().optional(),
      logo_url: z.string().url().optional(),
      tax_id: z.string().max(20).optional(),
      settings: z.record(z.unknown()).optional(),
    });

    const updates = schema.parse(req.body);

    const { data, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', req.user.businessId)
      .select()
      .single();

    if (error) throw new NotFoundError('Business not found');
    res.json(data);
  })
);
