import { Router, Request, Response } from 'express';
import { supabase } from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/errors';
import { parsePagination } from '../utils/pagination';

export const auditLogRouter = Router();
auditLogRouter.use(authMiddleware);
auditLogRouter.use(requireRole('owner'));

auditLogRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const userId = req.query['user_id'] as string | undefined;
    const tableName = req.query['table_name'] as string | undefined;
    const from = req.query['from'] as string | undefined;
    const to = req.query['to'] as string | undefined;

    let query = supabase
      .from('audit_logs')
      .select('*, users(name, phone)', { count: 'exact' })
      .eq('business_id', req.user.businessId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (userId) query = query.eq('user_id', userId);
    if (tableName) query = query.eq('table_name', tableName);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error, count } = await query;
    if (error) throw new AppError('Could not fetch audit logs', 500);
    res.json({ data, total: count ?? 0, page, limit });
  })
);
