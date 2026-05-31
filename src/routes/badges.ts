import { Router } from 'express';
import { db } from '../db';
import { badges } from '../schema';

const router = Router();

router.get('/', async (req, res): Promise<void> => {
  try {
    const allBadges = await db.select().from(badges);
    res.json(allBadges);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
