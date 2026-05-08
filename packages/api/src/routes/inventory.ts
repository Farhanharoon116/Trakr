import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/errors';

export const inventoryRouter = Router();
inventoryRouter.use(authMiddleware);

inventoryRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const branchId = req.query['branch_id'] as string | undefined;
    let query = supabase
      .from('inventory')
      .select('*, products(name_en, sku, image_url), branches(name)')
      .eq('business_id', req.user.businessId);
    if (branchId) query = query.eq('branch_id', branchId);
    const { data, error } = await query;
    if (error) throw new AppError('Could not fetch inventory', 500);
    res.json(data);
  })
);

inventoryRouter.post(
  '/adjust',
  requireRole('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      product_id: z.string().uuid(),
      branch_id: z.string().uuid(),
      qty_change: z.number(),
      reason: z.string().min(1),
    });
    const { product_id, branch_id, qty_change, reason } = schema.parse(req.body);

    const { data: inv, error: fetchErr } = await supabase
      .from('inventory')
      .select('qty_on_hand')
      .eq('product_id', product_id)
      .eq('branch_id', branch_id)
      .single();

    if (fetchErr || !inv) throw new AppError('Inventory record not found', 404);

    const newQty = (inv.qty_on_hand as number) + qty_change;
    const { data, error } = await supabase
      .from('inventory')
      .update({ qty_on_hand: newQty })
      .eq('product_id', product_id)
      .eq('branch_id', branch_id)
      .select()
      .single();

    if (error) throw new AppError('Could not adjust inventory', 500);

    await supabase.from('audit_logs').insert({
      business_id: req.user.businessId,
      user_id: req.user.userId,
      table_name: 'inventory',
      record_id: (data as { id: string }).id,
      action: 'UPDATE',
      old_data: { qty_on_hand: inv.qty_on_hand },
      new_data: { qty_on_hand: newQty, reason },
    });

    res.json(data);
  })
);

inventoryRouter.get(
  '/low-stock',
  asyncHandler(async (req: Request, res: Response) => {
    const { data: all, error: allErr } = await supabase
      .from('inventory')
      .select('*, products(name_en, sku, is_active), branches(name)')
      .eq('business_id', req.user.businessId);

    if (allErr) throw new AppError('Could not fetch inventory', 500);

    const lowStock = (all ?? []).filter(
      (item) =>
        (item.qty_on_hand as number) < (item.reorder_point as number) &&
        (item.products as { is_active: boolean } | null)?.is_active
    );

    res.json(lowStock);
  })
);
