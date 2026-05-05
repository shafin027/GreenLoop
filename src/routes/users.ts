import { Router } from 'express';
import { authenticateToken } from '../middleware';
import {
  getMe,
  updateMe,
  getMyPickups,
  getBadgeProgress,
  claimBadge,
  redeemReward,
  getRedeemedRewards,
  getLeaderboard
} from '../controllers/UserController';

const router = Router();
router.use(authenticateToken);

router.get('/me', getMe);
router.put('/me', updateMe);
router.get('/me/pickups', getMyPickups);
router.get('/me/badge-progress', getBadgeProgress);
router.post('/me/claim-badge', claimBadge);
router.post('/me/redeem-reward', redeemReward);
router.get('/me/redeemed-rewards', getRedeemedRewards);
router.get('/leaderboard', getLeaderboard);

export default router;
