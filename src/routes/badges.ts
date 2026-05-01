import { Router } from 'express';
import { Badge } from '../models/Badge';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const badges = await Badge.find();
    res.json(badges);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
