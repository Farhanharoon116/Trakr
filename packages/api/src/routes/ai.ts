import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/errors';
import { generateSalesForecast, generateReorderSuggestions } from '../services/ai.service';

export const aiRouter = Router();
aiRouter.use(authMiddleware);
aiRouter.use(requireRole('owner', 'manager'));

aiRouter.get(
  '/forecast',
  asyncHandler(async (req: Request, res: Response) => {
    const branchId = req.query['branch_id'] as string | undefined;
    try {
      const result = await generateSalesForecast(req.user.businessId, branchId);
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI forecast failed';
      throw new AppError(msg, 503);
    }
  })
);

aiRouter.get(
  '/reorder-suggestions',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await generateReorderSuggestions(req.user.businessId);
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI reorder suggestions failed';
      throw new AppError(msg, 503);
    }
  })
);
