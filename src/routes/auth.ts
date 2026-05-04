import { Router } from 'express';
import { login, register, adminSignupAvailable } from '../controllers/AuthController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/admin-available', adminSignupAvailable);

export default router;
