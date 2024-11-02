// acceptance.ts
import { Router } from 'express';
import * as acceptanceController from '../controllers/acceptanceController';

const router: Router = Router();

/**
 * @route   GET /api/acceptance/fetchTimeslots
 * @desc    Fetch available timeslots
 * @query   userId: string
 *          preorderId: string
 */
router.get('/fetchTimeslots', acceptanceController.fetchTimeslots);

/**
 * @route   POST /api/acceptance/bookTimeslot
 * @desc    Book a specific timeslot
 * @body    userId: string
 *          preorderId: string
 *          timeslotId: string
 */
router.post('/bookTimeslot', acceptanceController.bookTimeslot);

export default router;