// routes/yclientsRoutes.ts

import { Router } from 'express';
import * as yclientsController from '../controllers/yclientsController';

const router: Router = Router();

// GET /api/yclients/goods
router.get('/goods', yclientsController.getGoods);

// GET /api/yclients/companies
router.get('/companies', yclientsController.getCompanies);

export default router;
