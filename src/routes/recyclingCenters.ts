import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middleware';
import {
  getMe,
  updateMe,
  getBadgeProgress,
  getPendingPickups,
  acceptPickup,
  getMyPickups,
  getAvailableWaste,
  logWaste,
  listCredits,
  issueCertificate,
  awardBadge,
  getAllBusinesses,
  getWasteLogs
} from '../controllers/RecyclingCenterController';

const router = Router();
router.use(authenticateToken);

router.get('/me', authorizeRole(['recycling_center']), getMe);
router.put('/me', authorizeRole(['recycling_center']), updateMe);
router.get('/badge-progress', authorizeRole(['recycling_center']), getBadgeProgress);
router.get('/pending-pickups', authorizeRole(['recycling_center']), getPendingPickups);
router.post('/accept-pickup/:id', authorizeRole(['recycling_center']), acceptPickup);
router.get('/my-pickups', authorizeRole(['recycling_center']), getMyPickups);
router.get('/available-waste', authorizeRole(['recycling_center']), getAvailableWaste);
router.post('/log-waste', authorizeRole(['recycling_center']), logWaste);
router.post('/list-credits', authorizeRole(['recycling_center']), listCredits);
router.post('/issue-certificate', authorizeRole(['recycling_center', 'admin']), issueCertificate);
router.post('/award-badge', authorizeRole(['recycling_center']), awardBadge);
router.get('/waste-logs', authorizeRole(['recycling_center']), getWasteLogs);
router.get('/all', getAllBusinesses);

export default router;
