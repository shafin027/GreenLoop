import { Router } from 'express';
import { authenticateToken } from '../middleware';
import PickupController from '../controllers/PickupController';

const router = Router();
router.use(authenticateToken);

router.post('/schedule', PickupController.schedulePickup);
router.post('/estimate-charge', PickupController.estimateCharge);
router.post('/:id/rate', PickupController.ratePickup);
router.post('/:pickupId/upload-proof', PickupController.uploadProof);

export default router;
