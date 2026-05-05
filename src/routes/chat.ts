import { Router } from 'express';
import { authenticateToken } from '../middleware';
import { chatHandler } from '../controllers/ChatController';

const router = Router();

router.post('/', authenticateToken, chatHandler);

export default router;

