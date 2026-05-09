import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/errors';
import { generateGSTReturn } from '@bizos/fbr';

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
        .gte('date', todayStart.split('T')[0])
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
      const key = d.toISOString().split('T')[0];
      salesByDay.set(key, 0);
    }
    for (const sale of (allSales.data ?? [])) {
      const day = (sale.created_at as string).split('T')[0];
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
      const name = ((item.products as unknown) as { name_en: string } | null)?.name_en ?? pid;
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
    const period = (req.query['period'] as 'monthly' | 'quarterly') ?? 'monthly';

    if (!from || !to) throw new AppError('from and to date query params required', 400);

    const { data, error } = await supabase
      .from('sales')
      .select('receipt_number, created_at, total, tax_amount, customers(name)')
      .eq('business_id', req.user.businessId)
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: true });

    if (error) throw new AppError('Could not generate GST report', 500);

    const rows = (data ?? []).map((r) => ({
      receipt_number: r.receipt_number as string,
      created_at: r.created_at as string,
      total: r.total as number,
      tax_amount: r.tax_amount as number,
      customer_name: ((r.customers as unknown) as { name: string } | null)?.name,
    }));

    const csvString = generateGSTReturn(rows, period);
    const totalSales = rows.reduce((s, r) => s + r.total, 0);
    const totalTax = rows.reduce((s, r) => s + r.tax_amount, 0);
    const totalTaxable = Math.round((totalSales - totalTax) * 100) / 100;

    res.json({
      sales: rows,
      total_sales: Math.round(totalSales * 100) / 100,
      total_taxable: totalTaxable,
      total_tax: Math.round(totalTax * 100) / 100,
      csv: csvString,
    });
  })
);

reportRouter.get(
  '/leaderboard',
  asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Top cashiers by revenue this month
    const { data: salesData } = await supabase
      .from('sales')
      .select('cashier_id, total')
      .eq('business_id', req.user.businessId)
      .gte('created_at', monthStart);

    const cashierRevMap = new Map<string, { revenue: number; transactions: number }>();
    for (const sale of salesData ?? []) {
      const cid = sale.cashier_id as string;
      const prev = cashierRevMap.get(cid) ?? { revenue: 0, transactions: 0 };
      cashierRevMap.set(cid, {
        revenue: prev.revenue + (sale.total as number),
        transactions: prev.transactions + 1,
      });
    }

    // Fetch user names
    const cashierIds = Array.from(cashierRevMap.keys());
    const { data: usersData } = cashierIds.length
      ? await supabase
          .from('users')
          .select('id, name, avatar_url')
          .eq('business_id', req.user.businessId)
          .in('id', cashierIds)
      : { data: [] };

    const nameMap = new Map<string, { name: string; avatar_url: string | null }>();
    for (const u of usersData ?? []) {
      nameMap.set(u.id as string, {
        name: u.name as string,
        avatar_url: u.avatar_url as string | null,
      });
    }

    const leaderboardByRevenue = Array.from(cashierRevMap.entries())
      .map(([id, stats]) => ({
        cashier_id: id,
        name: nameMap.get(id)?.name ?? id,
        avatar_url: nameMap.get(id)?.avatar_url ?? null,
        revenue: Math.round(stats.revenue * 100) / 100,
        transactions: stats.transactions,
        avg_sale: stats.transactions
          ? Math.round((stats.revenue / stats.transactions) * 100) / 100
          : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Perfect attendance (zero absences this month)
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('employee_id, status')
      .eq('business_id', req.user.businessId)
      .gte('date', monthStart.split('T')[0]);

    const absentSet = new Set<string>();
    for (const rec of attendanceData ?? []) {
      if (rec.status === 'absent') absentSet.add(rec.employee_id as string);
    }
    const presentSet = new Set<string>();
    for (const rec of attendanceData ?? []) {
      if (rec.status === 'present') presentSet.add(rec.employee_id as string);
    }
    const perfectAttendanceIds = Array.from(presentSet).filter((id) => !absentSet.has(id));

    const { data: empData } = perfectAttendanceIds.length
      ? await supabase
          .from('employees')
          .select('id, name')
          .eq('business_id', req.user.businessId)
          .in('id', perfectAttendanceIds)
      : { data: [] };

    res.json({
      top_by_revenue: leaderboardByRevenue,
      top_by_transactions: [...leaderboardByRevenue].sort(
        (a, b) => b.transactions - a.transactions
      ),
      top_by_avg_sale: [...leaderboardByRevenue].sort((a, b) => b.avg_sale - a.avg_sale),
      perfect_attendance: empData ?? [],
    });
  })
);

reportRouter.get(
  '/branch-comparison',
  asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 29
    ).toISOString();

    const [branchesRes, salesRes, inventoryRes] = await Promise.all([
      supabase
        .from('branches')
        .select('id, name')
        .eq('business_id', req.user.businessId)
        .eq('is_active', true),
      supabase
        .from('sales')
        .select('branch_id, total, created_at')
        .eq('business_id', req.user.businessId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: true }),
      supabase
        .from('inventory')
        .select('branch_id, qty_on_hand, reorder_point, products(name_en)')
        .eq('business_id', req.user.businessId),
    ]);

    const branches = branchesRes.data ?? [];
    const branchNameMap = new Map(
      branches.map((b) => [b.id as string, b.name as string])
    );

    // Revenue by branch per day (last 30 days)
    const daySet = new Set<string>();
    const branchDayMap = new Map<string, Map<string, number>>();
    for (const sale of salesRes.data ?? []) {
      const day = (sale.created_at as string).split('T')[0];
      daySet.add(day);
      const bid = sale.branch_id as string;
      if (!branchDayMap.has(bid)) branchDayMap.set(bid, new Map());
      const dayMap = branchDayMap.get(bid)!;
      dayMap.set(day, (dayMap.get(day) ?? 0) + (sale.total as number));
    }
    const days = Array.from(daySet).sort();
    const revenueChart = days.map((date) => {
      const point: Record<string, unknown> = { date };
      for (const [bid, bName] of branchNameMap.entries()) {
        point[bName] = Math.round((branchDayMap.get(bid)?.get(date) ?? 0) * 100) / 100;
      }
      return point;
    });

    // Inventory by branch
    const branchInventoryMap = new Map<string, { total: number; low: number }>();
    for (const inv of inventoryRes.data ?? []) {
      const bid = inv.branch_id as string;
      const prev = branchInventoryMap.get(bid) ?? { total: 0, low: 0 };
      branchInventoryMap.set(bid, {
        total: prev.total + 1,
        low:
          prev.low +
          ((inv.qty_on_hand as number) < (inv.reorder_point as number) ? 1 : 0),
      });
    }

    const inventoryComparison = branches.map((b) => ({
      branch_id: b.id,
      branch_name: b.name,
      total_skus: branchInventoryMap.get(b.id as string)?.total ?? 0,
      low_stock_count: branchInventoryMap.get(b.id as string)?.low ?? 0,
    }));

    // Revenue totals per branch (last 30 days)
    const revenueTotals = branches.map((b) => {
      const total = Array.from(branchDayMap.get(b.id as string)?.values() ?? []).reduce(
        (s, v) => s + v,
        0
      );
      return { branch_id: b.id, branch_name: b.name, total_revenue: Math.round(total * 100) / 100 };
    });

    res.json({ revenue_chart: revenueChart, revenue_totals: revenueTotals, inventory_comparison: inventoryComparison });
  })
);
