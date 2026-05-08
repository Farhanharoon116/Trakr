import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CreateSaleSchema } from '@bizos/shared';
import { supabase } from '../db';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { parsePagination } from '../utils/pagination';

export const saleRouter = Router();
saleRouter.use(authMiddleware);

saleRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const branchId = req.query['branch_id'] as string | undefined;
    const from = req.query['from'] as string | undefined;
    const to = req.query['to'] as string | undefined;

    let query = supabase
      .from('sales')
      .select('*, sale_items(*), customers(name, phone)', { count: 'exact' })
      .eq('business_id', req.user.businessId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (branchId) query = query.eq('branch_id', branchId);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error, count } = await query;
    if (error) throw new AppError('Could not fetch sales', 500);
    res.json({ data, total: count ?? 0, page, limit });
  })
);

saleRouter.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const body = CreateSaleSchema.parse(req.body);

    // Check duplicate offline_id
    if (body.offline_id) {
      const { data: existing } = await supabase
        .from('sales')
        .select('id')
        .eq('offline_id', body.offline_id)
        .eq('business_id', req.user.businessId)
        .single();
      if (existing) {
        res.status(200).json({ id: (existing as { id: string }).id, duplicate: true });
        return;
      }
    }

    // Generate receipt number
    const { data: receiptData } = await supabase
      .rpc('next_receipt_number', { p_business_id: req.user.businessId });
    const receiptNumber = (receiptData as string) ?? `INV-${Date.now()}`;

    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .insert({
        business_id: req.user.businessId,
        branch_id: body.branch_id,
        cashier_id: req.user.userId,
        shift_id: body.shift_id,
        customer_id: body.customer_id,
        subtotal: body.subtotal,
        discount: body.discount,
        tax_amount: body.tax_amount,
        total: body.total,
        payment_method: body.payment_method,
        receipt_number: receiptNumber,
        notes: body.notes,
        offline_id: body.offline_id,
        synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saleErr || !sale) throw new AppError('Could not create sale', 500);

    const saleItems = body.items.map((item) => ({
      sale_id: (sale as { id: string }).id,
      product_id: item.product_id,
      qty: item.qty,
      unit_price: item.unit_price,
      discount: item.discount,
      tax_rate: item.tax_rate,
      total: Math.round((item.qty * item.unit_price - item.discount) * 100) / 100,
    }));

    await supabase.from('sale_items').insert(saleItems);

    // Deduct inventory
    for (const item of body.items) {
      await supabase.rpc('adjust_inventory', {
        p_product_id: item.product_id,
        p_branch_id: body.branch_id,
        p_qty_change: -item.qty,
      }).then(() => void 0).catch((err) => logger.warn({ err, product_id: item.product_id }, 'Inventory adjustment failed'));
    }

    res.status(201).json(sale);
  })
);

saleRouter.post(
  '/bulk-sync',
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({ sales: z.array(CreateSaleSchema) });
    const { sales } = schema.parse(req.body);

    const results = await Promise.allSettled(
      sales.map(async (saleBody) => {
        if (saleBody.offline_id) {
          const { data: existing } = await supabase
            .from('sales')
            .select('id')
            .eq('offline_id', saleBody.offline_id)
            .eq('business_id', req.user.businessId)
            .single();
          if (existing) return { skipped: true, offline_id: saleBody.offline_id };
        }

        const { data: receiptData } = await supabase
          .rpc('next_receipt_number', { p_business_id: req.user.businessId });
        const receiptNumber = (receiptData as string) ?? `INV-${Date.now()}`;

        const { data: sale } = await supabase
          .from('sales')
          .insert({
            business_id: req.user.businessId,
            branch_id: saleBody.branch_id,
            cashier_id: req.user.userId,
            shift_id: saleBody.shift_id,
            customer_id: saleBody.customer_id,
            subtotal: saleBody.subtotal,
            discount: saleBody.discount,
            tax_amount: saleBody.tax_amount,
            total: saleBody.total,
            payment_method: saleBody.payment_method,
            receipt_number: receiptNumber,
            notes: saleBody.notes,
            offline_id: saleBody.offline_id,
            synced_at: new Date().toISOString(),
          })
          .select()
          .single();

        return sale;
      })
    );

    const synced = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    res.json({ synced, failed });
  })
);

saleRouter.get(
  '/:id/receipt',
  asyncHandler(async (req: Request, res: Response) => {
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*, products(name_en)), customers(name, phone)')
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId)
      .single();

    if (error || !data) throw new AppError('Sale not found', 404);
    res.json(data);
  })
);
