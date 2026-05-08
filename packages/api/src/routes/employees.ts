import { Router, Request, Response } from 'express';
import { CreateEmployeeSchema } from '@bizos/shared';
import { supabase } from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/errors';
import { encrypt, decrypt } from '../utils/crypto';
import { parsePagination } from '../utils/pagination';

export const employeeRouter = Router();
employeeRouter.use(authMiddleware);

employeeRouter.get(
  '/',
  requireRole('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const branchId = req.query['branch_id'] as string | undefined;
    const isActive = req.query['is_active'];

    let query = supabase
      .from('employees')
      .select('*', { count: 'exact' })
      .eq('business_id', req.user.businessId)
      .order('name')
      .range((page - 1) * limit, page * limit - 1);

    if (branchId) query = query.eq('branch_id', branchId);
    if (isActive !== undefined) query = query.eq('is_active', isActive === 'true');

    const { data, error, count } = await query;
    if (error) throw new AppError('Could not fetch employees', 500);
    res.json({ data, total: count ?? 0, page, limit });
  })
);

employeeRouter.post(
  '/',
  requireRole('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const body = CreateEmployeeSchema.parse(req.body);
    const toInsert = {
      ...body,
      business_id: req.user.businessId,
      cnic: body.cnic ? encrypt(body.cnic) : null,
      bank_account: body.bank_account ? encrypt(body.bank_account) : null,
    };
    const { data, error } = await supabase.from('employees').insert(toInsert).select().single();
    if (error) throw new AppError('Could not create employee', 500);
    res.status(201).json(data);
  })
);

employeeRouter.patch(
  '/:id',
  requireRole('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const body = CreateEmployeeSchema.partial().parse(req.body);
    const toUpdate = {
      ...body,
      ...(body.cnic !== undefined ? { cnic: body.cnic ? encrypt(body.cnic) : null } : {}),
      ...(body.bank_account !== undefined ? { bank_account: body.bank_account ? encrypt(body.bank_account) : null } : {}),
    };
    const { data, error } = await supabase
      .from('employees')
      .update(toUpdate)
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId)
      .select()
      .single();
    if (error || !data) throw new AppError('Employee not found', 404);
    res.json(data);
  })
);

employeeRouter.get(
  '/:id/salary-slip',
  requireRole('owner', 'manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', req.params['id'])
      .eq('business_id', req.user.businessId)
      .single();
    if (error || !data) throw new AppError('Employee not found', 404);

    const employee = {
      ...(data as Record<string, unknown>),
      cnic: data.cnic ? `*****-*******-${(decrypt(data.cnic as string)).slice(-1)}` : null,
      bank_account: data.bank_account ? `****${(decrypt(data.bank_account as string)).slice(-4)}` : null,
    };

    res.json({ employee, message: 'PDF generation is handled client-side' });
  })
);
