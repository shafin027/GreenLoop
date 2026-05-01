import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middleware';
import { CollectorController } from '../controllers/CollectorController';

const router = Router();
router.use(authenticateToken);

router.get('/profile', authorizeRole(['collector']), CollectorController.getProfile);
router.post('/update-location', authorizeRole(['collector']), CollectorController.updateLocation);
router.get('/available-pickups', authorizeRole(['collector']), CollectorController.getAvailablePickups);
router.get('/assigned-pickups', authorizeRole(['collector']), CollectorController.getAssignedPickups);
router.get('/history', authorizeRole(['collector']), CollectorController.getHistory);
router.post('/pickup/assign/:id', authorizeRole(['collector']), CollectorController.assignPickup);
router.post('/pickup/update-status/:id', authorizeRole(['collector']), CollectorController.updatePickupStatus);
router.get('/earnings-chart', authorizeRole(['collector']), CollectorController.getEarningsChart);
router.get('/rankings', CollectorController.getRankings);
router.get('/all', authorizeRole(['admin', 'super-admin']), CollectorController.getAllCollectors);

export default router;
