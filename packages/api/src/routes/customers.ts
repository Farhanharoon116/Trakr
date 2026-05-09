import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/errors';
import { parsePagination } from '../utils/pagination';

export const customerRouter = Router();
customerRouter.use(authMiddleware);

customerRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const search = req.query['search'] as string | undefined;
    let query = supabase
      .from('customers')
      .select('*')
      .eq('business_id', req.user.businessId)
      .order('name');
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) throw new AppError('Could not fetch customers', 500);
    res.json(data);
  })
);

customerRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      name: z.string().max(255).optional(),
      phone: z.string().max(20).optional(),
      email: z.string().email().optional(),
    });
    const body = schema.parse(req.body);
    const { data, error } = await supabase
      .from('customers')
      .insert({ ...body, business_id: req.user.businessId })
      .select()
      .single();
    if (error) throw new AppError('Could not create customer', 500);
    res.status(201).json(data);
  })
);

customerRouter.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      name: z.string().max(255).optional(),
      phone: z.string().max(20).optional(),
      email: z.string().email().optional(),
      notes: z.string().optional(),
      loyalty_points: z.number().int().optional(),
    });
    const body = schema.parse(req.body);
    const { data, error } = await supabase
      .from('customers')
      .update(body)
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId)
      .select()
      .single();
    if (error || !data) throw new AppError('Customer not found', 404);
    res.json(data);
  })
);

// GET /customers/:id/purchases — last 20 sales for this customer
customerRouter.get(
  '/:id/purchases',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);

    // Verify the customer belongs to this business
    const { data: customer, error: cErr } = await supabase
      .from('customers')
      .select('id')
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId)
      .single();

    if (cErr || !customer) throw new AppError('Customer not found', 404);

    const { data, error, count } = await supabase
      .from('sales')
      .select('id, receipt_number, total, payment_method, created_at, sale_items(id)', { count: 'exact' })
      .eq('business_id', req.user.businessId)
      .eq('customer_id', req.params['id'])
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw new AppError('Could not fetch purchase history', 500);
    res.json({ data, total: count ?? 0, page, limit });
  })
);
