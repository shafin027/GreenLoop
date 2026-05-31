import { Router } from 'express';
import { authenticateToken, authorizeRole, optionalAuthenticateToken } from '../middleware';
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
  reactToPost,
  removeReaction
} from '../controllers/CommunityController';

const router = Router();

router.get('/events', listEvents);
router.post('/events', authenticateToken, authorizeRole(['admin', 'super-admin']), createEvent);
router.post('/events/:id/join', authenticateToken, joinEvent);
router.get('/events/my-joined', authenticateToken, getMyJoinedEvents);
router.get('/events/:id/participants', getEventParticipants);
router.put('/admin/events/:id', authenticateToken, authorizeRole(['admin', 'super-admin']), updateEvent);
router.delete('/admin/events/:id', authenticateToken, authorizeRole(['admin', 'super-admin']), deleteEvent);

router.get('/posts', optionalAuthenticateToken, listPublicPosts);
router.post('/posts', authenticateToken, createPost);
router.post('/posts/:id/react', authenticateToken, reactToPost);
router.delete('/posts/:id/react', authenticateToken, removeReaction);
router.get('/admin/posts', authenticateToken, authorizeRole(['admin', 'super-admin']), listAdminPosts);
router.put('/admin/posts/:id', authenticateToken, authorizeRole(['admin', 'super-admin']), updatePost);
router.delete('/admin/posts/:id', authenticateToken, authorizeRole(['admin', 'super-admin']), deletePost);

export default router;
