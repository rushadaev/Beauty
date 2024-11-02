// nodejs-server/routes/ordersRoutes.ts

import { Router } from 'express';
import * as ordersController from '../controllers/ordersController';

const router: Router = Router();

// POST /api/orders/create
router.post('/create', ordersController.createOrder);

// GET /api/orders/warehouses
router.get('/warehouses', ordersController.listWarehouses);

export default router;
