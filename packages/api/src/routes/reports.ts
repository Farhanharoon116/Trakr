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
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29).toISOString();

    const [todaySales, yesterdaySales, inventoryResult, allSales, recentSales, attendanceResult] = await Promise.all([
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
        .select('id, qty_on_hand, reorder_point')
        .eq('business_id', req.user.businessId),
      supabase
        .from('sales')
        .select('total, created_at')
        .eq('business_id', req.user.businessId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: true }),
      supabase
        .from('sales')
        .select('id, receipt_number, created_at, total, payment_method, cashier_id, sale_items(id)')
        .eq('business_id', req.user.businessId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('attendance')
        .select('id, employee_id')
        .eq('business_id', req.user.businessId)
        .gte('date', todayStart.split('T')[0]!)
        .eq('status', 'present'),
    ]);

    const todayRevenue = (todaySales.data ?? []).reduce(
      (sum, s) => sum + (s.total as number),
      0
    );
    const yesterdayRevenue = (yesterdaySales.data ?? []).reduce(
      (sum, s) => sum + (s.total as number),
      0
    );

    const allInventory = inventoryResult.data ?? [];
    const lowStockCount = allInventory.filter(
      (item) => (item.qty_on_hand as number) < (item.reorder_point as number)
    ).length;

    // Build sales chart (last 30 days, daily aggregates)
    const salesByDay = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = d.toISOString().split('T')[0]!;
      salesByDay.set(key, 0);
    }
    for (const sale of (allSales.data ?? [])) {
      const day = (sale.created_at as string).split('T')[0]!;
      salesByDay.set(day, (salesByDay.get(day) ?? 0) + (sale.total as number));
    }
    const salesChart = Array.from(salesByDay.entries()).map(([date, revenue]) => ({
      date,
      revenue: Math.round(revenue * 100) / 100,
    }));

    // Top products today by sale_items qty * unit_price
    const { data: topItems } = await supabase
      .from('sale_items')
      .select('product_id, qty, unit_price, total, products(name_en)')
      .eq('sales.business_id', req.user.businessId)
      .gte('sales.created_at', todayStart)
      .limit(50);

    const productRevMap = new Map<string, { name: string; revenue: number }>();
    for (const item of (topItems ?? [])) {
      const pid = item.product_id as string;
      const name = (item.products as { name_en: string } | null)?.name_en ?? pid;
      const existing = productRevMap.get(pid);
      productRevMap.set(pid, {
        name,
        revenue: Math.round(((existing?.revenue ?? 0) + (item.total as number)) * 100) / 100,
      });
    }
    const topProducts = Array.from(productRevMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    res.json({
      today_revenue: Math.round(todayRevenue * 100) / 100,
      yesterday_revenue: Math.round(yesterdayRevenue * 100) / 100,
      transaction_count: (todaySales.data ?? []).length,
      low_stock_count: lowStockCount,
      total_inventory_items: allInventory.length,
      active_staff_count: (attendanceResult.data ?? []).length,
      sales_chart: salesChart,
      top_products: topProducts,
      recent_transactions: recentSales.data ?? [],
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
