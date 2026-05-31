import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middleware';
import { getMe, updateMe, listAvailableCredits, purchaseCarbonCredit, getCertificates, getAllBusinesses } from '../controllers/BusinessController';

const router = Router();

router.get('/me', authenticateToken, authorizeRole(['business']), getMe);
router.put('/me', authenticateToken, authorizeRole(['business']), updateMe);
router.get('/carbon-credits/available', listAvailableCredits);
router.post('/carbon-credits/purchase', authenticateToken, authorizeRole(['business']), purchaseCarbonCredit);
router.get('/certificates/me', authenticateToken, getCertificates);
router.get('/all', authenticateToken, authorizeRole(['admin', 'super-admin']), getAllBusinesses);

export default router;
