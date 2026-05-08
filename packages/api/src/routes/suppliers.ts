import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError, NotFoundError } from '../utils/errors';
import { parsePagination } from '../utils/pagination';

export const supplierRouter = Router();
supplierRouter.use(authMiddleware);
supplierRouter.use(requireRole('owner', 'manager'));

supplierRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const search = req.query['search'] as string | undefined;

    let query = supabase
      .from('suppliers')
      .select('*', { count: 'exact' })
      .eq('business_id', req.user.businessId)
      .order('name');

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(
      (page - 1) * limit,
      page * limit - 1
    );
    if (error) throw new AppError('Could not fetch suppliers', 500);
    res.json({ data, total: count ?? 0, page, limit });
  })
);

supplierRouter.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId)
      .single();
    if (error || !data) throw new NotFoundError('Supplier not found');
    res.json(data);
  })
);

const supplierSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  ntn: z.string().max(20).optional(),
  notes: z.string().optional(),
});

supplierRouter.post(
  '/',
  requireRole('owner'),
  asyncHandler(async (req: Request, res: Response) => {
    const body = supplierSchema.parse(req.body);
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ ...body, business_id: req.user.businessId })
      .select()
      .single();
    if (error) throw new AppError('Could not create supplier', 500);
    res.status(201).json(data);
  })
);

supplierRouter.patch(
  '/:id',
  requireRole('owner'),
  asyncHandler(async (req: Request, res: Response) => {
    const body = supplierSchema.partial().parse(req.body);
    const { data, error } = await supabase
      .from('suppliers')
      .update(body)
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId)
      .select()
      .single();
    if (error || !data) throw new NotFoundError('Supplier not found');
    res.json(data);
  })
);

supplierRouter.delete(
  '/:id',
  requireRole('owner'),
  asyncHandler(async (req: Request, res: Response) => {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId);
    if (error) throw new NotFoundError('Supplier not found');
    res.status(204).send();
  })
);
