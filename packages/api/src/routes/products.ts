import { Router, Request, Response } from 'express';
import { CreateProductSchema } from '@bizos/shared';
import { supabase } from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { parsePagination } from '../utils/pagination';
import { NotFoundError } from '../utils/errors';

export const productRouter = Router();
productRouter.use(authMiddleware);

productRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query['search'] ?? '');
    const categoryId = req.query['category_id'] as string | undefined;
    const isActive = req.query['is_active'];

    let query = supabase
      .from('products')
      .select('*, categories(name_en)', { count: 'exact' })
      .eq('business_id', req.user.businessId)
      .order('name_en')
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.or(`name_en.ilike.%${search}%,name_ur.ilike.%${search}%,sku.ilike.%${search}%`);
    }
    if (categoryId) query = query.eq('category_id', categoryId);
    if (isActive !== undefined) query = query.eq('is_active', isActive === 'true');

    const { data, error, count } = await query;
    if (error) throw new NotFoundError('Could not fetch products');
    res.json({ data, total: count ?? 0, page, limit });
  })
);

productRouter.post(
  '/',
  requireRole('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const body = CreateProductSchema.parse(req.body);
    const { data, error } = await supabase
      .from('products')
      .insert({ ...body, business_id: req.user.businessId })
      .select()
      .single();
    if (error) throw new NotFoundError('Could not create product');
    res.status(201).json(data);
  })
);

productRouter.patch(
  '/:id',
  requireRole('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const body = CreateProductSchema.partial().parse(req.body);
    const { data, error } = await supabase
      .from('products')
      .update(body)
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId)
      .select()
      .single();
    if (error || !data) throw new NotFoundError('Product not found');
    res.json(data);
  })
);

productRouter.delete(
  '/:id',
  requireRole('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId);
    if (error) throw new NotFoundError('Product not found');
    res.status(204).send();
  })
);
