import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError, NotFoundError } from '../utils/errors';
import { parsePagination } from '../utils/pagination';

export const purchaseOrderRouter = Router();
purchaseOrderRouter.use(authMiddleware);
purchaseOrderRouter.use(requireRole('owner', 'manager'));

purchaseOrderRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const status = req.query['status'] as string | undefined;

    let query = supabase
      .from('purchase_orders')
      .select(
        '*, suppliers(name, phone), branches(name), purchase_order_items(*, products(name_en))',
        { count: 'exact' }
      )
      .eq('business_id', req.user.businessId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw new AppError('Could not fetch purchase orders', 500);
    res.json({ data, total: count ?? 0, page, limit });
  })
);

purchaseOrderRouter.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(
        '*, suppliers(name, phone, email, address, ntn), branches(name), purchase_order_items(*, products(name_en, sku))'
      )
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId)
      .single();
    if (error || !data) throw new NotFoundError('Purchase order not found');
    res.json(data);
  })
);

const createPoSchema = z.object({
  branch_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  expected_date: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'sent']).default('draft'),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        qty_ordered: z.number().positive(),
        unit_cost: z.number().nonnegative(),
      })
    )
    .min(1, 'At least one item required'),
});

purchaseOrderRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const body = createPoSchema.parse(req.body);

    // Generate PO number
    const poCount = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', req.user.businessId);
    const poNumber = `PO-${String((poCount.count ?? 0) + 1).padStart(5, '0')}`;

    const total = body.items.reduce(
      (sum, item) => sum + item.qty_ordered * item.unit_cost,
      0
    );

    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .insert({
        business_id: req.user.businessId,
        branch_id: body.branch_id,
        supplier_id: body.supplier_id,
        po_number: poNumber,
        status: body.status,
        total: Math.round(total * 100) / 100,
        expected_date: body.expected_date ?? null,
        notes: body.notes ?? null,
      })
      .select()
      .single();

    if (poErr || !po) throw new AppError('Could not create purchase order', 500);

    const poId = (po as { id: string }).id;
    const items = body.items.map((item) => ({
      po_id: poId,
      product_id: item.product_id,
      qty_ordered: item.qty_ordered,
      unit_cost: item.unit_cost,
      total: Math.round(item.qty_ordered * item.unit_cost * 100) / 100,
    }));

    await supabase.from('purchase_order_items').insert(items);

    res.status(201).json(po);
  })
);

purchaseOrderRouter.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const patchSchema = z.object({
      status: z.enum(['draft', 'sent', 'cancelled']).optional(),
      expected_date: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    });
    const body = patchSchema.parse(req.body);

    const { data, error } = await supabase
      .from('purchase_orders')
      .update(body)
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId)
      .select()
      .single();

    if (error || !data) throw new NotFoundError('Purchase order not found');
    res.json(data);
  })
);

purchaseOrderRouter.post(
  '/:id/receive',
  asyncHandler(async (req: Request, res: Response) => {
    const receiveSchema = z.object({
      items: z.array(
        z.object({
          item_id: z.string().uuid(),
          qty_received: z.number().nonnegative(),
        })
      ),
    });
    const { items } = receiveSchema.parse(req.body);

    // Fetch PO
    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .select('*, purchase_order_items(*)')
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId)
      .single();

    if (poErr || !po) throw new NotFoundError('Purchase order not found');
    if ((po as { status: string }).status !== 'sent') {
      throw new AppError('Only sent purchase orders can be received', 400);
    }

    // Update each item's qty_received and adjust inventory
    for (const recv of items) {
      await supabase
        .from('purchase_order_items')
        .update({ qty_received: recv.qty_received })
        .eq('id', recv.item_id)
        .eq('po_id', req.params['id']);

      // Find the PO item to get product_id + unit_cost
      const poItems = (po as { purchase_order_items: unknown[] }).purchase_order_items as {
        id: string;
        product_id: string;
        unit_cost: number;
      }[];
      const poItem = poItems.find((i) => i.id === recv.item_id);
      if (!poItem || recv.qty_received <= 0) continue;

      // Adjust inventory
      await supabase.rpc('adjust_inventory', {
        p_product_id: poItem.product_id,
        p_branch_id: (po as { branch_id: string }).branch_id,
        p_qty_change: recv.qty_received,
      });

      // Update product cost (weighted avg approximation: set to latest unit_cost)
      await supabase
        .from('products')
        .update({ cost: poItem.unit_cost })
        .eq('id', poItem.product_id)
        .eq('business_id', req.user.businessId);
    }

    // Mark PO as received
    const { data: updated, error: updErr } = await supabase
      .from('purchase_orders')
      .update({ status: 'received', received_at: new Date().toISOString() })
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId)
      .select()
      .single();

    if (updErr || !updated) throw new AppError('Could not mark PO as received', 500);

    // Audit log
    await supabase.from('audit_logs').insert({
      business_id: req.user.businessId,
      user_id: req.user.userId,
      table_name: 'purchase_orders',
      record_id: req.params['id'],
      action: 'UPDATE',
      old_data: { status: 'sent' },
      new_data: { status: 'received', received_at: new Date().toISOString() },
    });

    res.json(updated);
  })
);
