// nodejs-server/routes/authRoutes.ts

import { Router } from 'express';
import * as authController from '../controllers/authController';

const router: Router = Router();

// POST /api/auth/authenticate
router.post('/authenticate', authController.authenticateUser);

export default router;
