import { Router } from 'express';
import * as draftsController from '../controllers/draftsController';

const router: Router = Router();

// GET /api/drafts/list
router.get('/list', draftsController.listDrafts);

export default router;
