import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middleware';
import {
  listEvents,
  createEvent,
  joinEvent,
  getMyJoinedEvents,
  getEventParticipants,
  updateEvent,
  deleteEvent,
  listAdminPosts,
  updatePost,
  deletePost,
  listPublicPosts,
  createPost,
  likePost
} from '../controllers/CommunityController';

const router = Router();

router.get('/events', listEvents);
router.post('/events', authenticateToken, authorizeRole(['admin', 'super-admin']), createEvent);
router.post('/events/:id/join', authenticateToken, joinEvent);
router.get('/events/my-joined', authenticateToken, getMyJoinedEvents);
router.get('/events/:id/participants', getEventParticipants);
router.put('/admin/events/:id', authenticateToken, authorizeRole(['admin', 'super-admin']), updateEvent);
router.delete('/admin/events/:id', authenticateToken, authorizeRole(['admin', 'super-admin']), deleteEvent);

router.get('/posts', listPublicPosts);
router.post('/posts', authenticateToken, createPost);
router.post('/posts/like/:id', authenticateToken, likePost);
router.get('/admin/posts', authenticateToken, authorizeRole(['admin', 'super-admin']), listAdminPosts);
router.put('/admin/posts/:id', authenticateToken, authorizeRole(['admin', 'super-admin']), updatePost);
router.delete('/admin/posts/:id', authenticateToken, authorizeRole(['admin', 'super-admin']), deletePost);

export default router;
