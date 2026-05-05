import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middleware';
import {
  banEntity,
  calculateUserSustainabilityScore,
  deleteEntity,
  getDashboardStats,
  getFraudDetection,
  getHeatmapData,
  getSustainabilityScores,
  listBusinesses,
  listUsers,
  listRecyclingCenters,
  reopenFraudLog,
  resolveFraudLog,
  awardBadgeToCenter,
  awardBadgeToBusiness,
  verifyRecyclingCenter,
  verifyCollector,
  verifyBusiness,
  verifyUser,
  unverifyBusiness,
  unverifyCollector,
  unverifyUser
} from '../controllers/AdminController';

const router = Router();
router.use(authenticateToken);
router.use(authorizeRole(['admin', 'super-admin']));

router.get('/sustainability-scores', getSustainabilityScores);
router.post('/calculate-sustainability-score/:userId', calculateUserSustainabilityScore);
router.get('/fraud-detection', getFraudDetection);
router.post('/resolve-fraud/:logId', resolveFraudLog);
router.post('/reopen-fraud/:logId', reopenFraudLog);
router.get('/users', listUsers);
router.get('/businesses', listBusinesses);
router.get('/recycling-centers', listRecyclingCenters);
router.post('/ban/:role/:id', banEntity);
router.delete('/delete/:role/:id', deleteEntity);
router.post('/recycling-centers/:id/verify', verifyRecyclingCenter);
router.post('/verify-user/:id', verifyUser);
router.post('/unverify-user/:id', unverifyUser);
router.post('/verify-business/:id', verifyBusiness);
router.post('/unverify-business/:id', unverifyBusiness);
router.get('/heatmaps', getHeatmapData);
router.get('/dashboard', getDashboardStats);
router.post('/award-badge-to-center', awardBadgeToCenter);
router.post('/award-badge-to-business', awardBadgeToBusiness);

router.post('/verify-collector/:id', verifyCollector);
router.post('/unverify-collector/:id', unverifyCollector);

export default router;
