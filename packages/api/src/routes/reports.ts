import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/errors';

export const reportRouter = Router();
reportRouter.use(authMiddleware);
reportRouter.use(requireRole('owner', 'manager'));

reportRouter.get(
  '/dashboard',
  asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();

    const [todaySales, yesterdaySales, lowStock] = await Promise.all([
      supabase
        .from('sales')
        .select('total, id')
        .eq('business_id', req.user.businessId)
        .gte('created_at', todayStart),
      supabase
        .from('sales')
        .select('total')
        .eq('business_id', req.user.businessId)
        .gte('created_at', yesterdayStart)
        .lt('created_at', todayStart),
      supabase
        .from('inventory')
        .select('id')
        .eq('business_id', req.user.businessId),
    ]);

    const todayRevenue = (todaySales.data ?? []).reduce(
      (sum, s) => sum + (s.total as number),
      0
    );
    const yesterdayRevenue = (yesterdaySales.data ?? []).reduce(
      (sum, s) => sum + (s.total as number),
      0
    );

    const allInventory = lowStock.data ?? [];
    const lowStockCount = 0; // Would need comparison query

    res.json({
      today_revenue: Math.round(todayRevenue * 100) / 100,
      yesterday_revenue: Math.round(yesterdayRevenue * 100) / 100,
      transaction_count: (todaySales.data ?? []).length,
      low_stock_count: lowStockCount,
      total_inventory_items: allInventory.length,
    });
  })
);

reportRouter.get(
  '/fbr-gst',
  asyncHandler(async (req: Request, res: Response) => {
    const from = req.query['from'] as string;
    const to = req.query['to'] as string;

    if (!from || !to) throw new AppError('from and to date query params required', 400);

    const { data, error } = await supabase
      .from('sales')
      .select('receipt_number, created_at, total, tax_amount, customers(name)')
      .eq('business_id', req.user.businessId)
      .gte('created_at', from)
      .lte('created_at', to);

    if (error) throw new AppError('Could not generate GST report', 500);

    res.json({
      sales: data,
      total_sales: (data ?? []).reduce((s, r) => s + (r.total as number), 0),
      total_tax: (data ?? []).reduce((s, r) => s + (r.tax_amount as number), 0),
    });
  })
);
