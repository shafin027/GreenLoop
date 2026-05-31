import { Request, Response } from 'express';
import { db } from '../db';
import { communityEvents, eventParticipants, posts, postReactions, users } from '../schema';
import { eq, desc, and, count } from 'drizzle-orm';

export const listEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const events = await db.select().from(communityEvents).orderBy(desc(communityEvents.createdAt));
    
    // Fetch all participant counts grouped by eventId in a single query
    const participantCounts = await db.select({
      eventId: eventParticipants.eventId,
      value: count()
    })
    .from(eventParticipants)
    .groupBy(eventParticipants.eventId);

    const countMap = new Map<string, number>();
    for (const row of participantCounts) {
      if (row.eventId) {
        countMap.set(row.eventId, row.value || 0);
      }
    }

    const eventsWithParticipants = events.map((event) => {
      const participantCount = countMap.get(event.id) || 0;
      return { ...event, _id: event.id, participantCount };
    });

    res.json(eventsWithParticipants);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, date, startDate, endDate, location, offerings, imageURL } = req.body;
    const parsedDate = date ? new Date(date) : (startDate ? new Date(startDate) : null);
    const parsedStart = startDate ? new Date(startDate) : null;
    const parsedEnd = endDate ? new Date(endDate) : null;

    const event = await db.insert(communityEvents).values({
      title,
      description,
      date: parsedDate,
      startDate: parsedStart,
      endDate: parsedEnd,
      location,
      offerings,
      imageURL
    }).returning();
    res.status(201).json({ ...event[0], _id: event[0].id });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const joinEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await db.select().from(eventParticipants).where(and(
      eq(eventParticipants.eventId, id),
      eq(eventParticipants.userId, (req as any).user?.id)
    )).limit(1);
    
    if (existing.length > 0) {
      res.status(400).json({ message: 'Already joined this event' });
      return;
    }

    const participant = await db.insert(eventParticipants).values({
      eventId: id,
      userId: (req as any).user?.id,
      role: (req as any).user?.role
    }).returning();
    res.status(201).json(participant[0]);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getMyJoinedEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const records = await db.select({
      eventId: eventParticipants.eventId
    }).from(eventParticipants).where(eq(eventParticipants.userId, (req as any).user?.id));
    res.json(records.map((r) => r.eventId));
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getEventParticipants = async (req: Request, res: Response): Promise<void> => {
  try {
    const participants = await db.select().from(eventParticipants).where(eq(eventParticipants.eventId, req.params.id));
    res.json(participants);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, date, location, offerings, imageURL } = req.body;
    const updated = await db.update(communityEvents).set({
      title,
      description,
      date: date ? new Date(date) : undefined,
      location,
      offerings,
      imageURL
    }).where(eq(communityEvents.id, req.params.id)).returning();
    
    if (updated.length === 0) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }
    res.json(updated[0]);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await db.delete(communityEvents).where(eq(communityEvents.id, req.params.id)).returning();
    if (deleted.length === 0) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }
    await db.delete(eventParticipants).where(eq(eventParticipants.eventId, req.params.id));
    res.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const listAdminPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.select({
      post: posts,
      author: {
        name: users.name,
        email: users.email,
        role: users.role
      }
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .orderBy(desc(posts.createdAt));

    res.json(result.map(row => ({
      ...row.post,
      id: row.post.id,
      _id: row.post.id,
      author: row.author ? { id: row.post.authorId, _id: row.post.authorId, ...row.author } : null
    })));
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updatePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, isApproved } = req.body;
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (isApproved !== undefined) updates.isApproved = isApproved;

    const updated = await db.update(posts).set(updates).where(eq(posts.id, req.params.id)).returning();
    if (updated.length === 0) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    res.json(updated[0]);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deletePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await db.delete(posts).where(eq(posts.id, req.params.id)).returning();
    if (deleted.length === 0) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    res.json({ message: 'Post deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Helper: aggregate reactions for a list of post IDs
const aggregateReactions = async (postIds: string[], userId?: string) => {
  if (postIds.length === 0) return new Map<string, { counts: Record<string, number>; userReaction: string | null }>(); 
  const allReactions = await db.select().from(postReactions);
  const map = new Map<string, { counts: Record<string, number>; userReaction: string | null }>();
  for (const pid of postIds) {
    map.set(pid, { counts: {}, userReaction: null });
  }
  for (const r of allReactions) {
    const entry = map.get(r.postId);
    if (!entry) continue;
    entry.counts[r.reactionType] = (entry.counts[r.reactionType] || 0) + 1;
    if (userId && r.userId === userId) {
      entry.userReaction = r.reactionType;
    }
  }
  return map;
};

export const listPublicPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.select({
      post: posts,
      author: {
        name: users.name
      }
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.isApproved, true))
    .orderBy(desc(posts.createdAt));

    const userId = (req as any).user?.id;
    const postIds = result.map(r => r.post.id);
    const reactionsMap = await aggregateReactions(postIds, userId);

    res.json(result.map(row => {
      const rd = reactionsMap.get(row.post.id);
      return {
        ...row.post,
        id: row.post.id,
        _id: row.post.id,
        author: row.author ? { id: row.post.authorId, _id: row.post.authorId, ...row.author } : null,
        reactions: rd?.counts || {},
        userReaction: rd?.userReaction || null,
      };
    }));
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const createPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, images } = req.body;
    if (!title || title.trim() === '') {
      res.status(400).json({ message: 'Title is required' });
      return;
    }
    const inserted = await db.insert(posts).values({
      authorId: (req as any).user?.id,
      title,
      content,
      images: images || [],
      isApproved: true
    }).returning();
    res.status(201).json({ ...inserted[0], _id: inserted[0].id });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

const VALID_REACTIONS = ['like', 'love', 'celebrate', 'eco', 'wow'] as const;

export const reactToPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { reactionType } = req.body;
    if (!reactionType || !VALID_REACTIONS.includes(reactionType)) {
      res.status(400).json({ message: `Invalid reaction. Must be one of: ${VALID_REACTIONS.join(', ')}` });
      return;
    }

    const postId = req.params.id;
    const postRes = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (postRes.length === 0) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    // Check if user already has a reaction on this post
    const existing = await db.select().from(postReactions).where(
      and(eq(postReactions.postId, postId), eq(postReactions.userId, userId))
    ).limit(1);

    if (existing.length > 0) {
      if (existing[0].reactionType === reactionType) {
        // Same reaction → remove it (toggle off)
        await db.delete(postReactions).where(eq(postReactions.id, existing[0].id));
        res.json({ message: 'Reaction removed', userReaction: null });
        return;
      }
      // Different reaction → update it
      await db.update(postReactions).set({ reactionType }).where(eq(postReactions.id, existing[0].id));
      res.json({ message: 'Reaction updated', userReaction: reactionType });
      return;
    }

    // No existing reaction → create new
    await db.insert(postReactions).values({ postId, userId, reactionType });
    res.json({ message: 'Reaction added', userReaction: reactionType });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const removeReaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const postId = req.params.id;
    await db.delete(postReactions).where(
      and(eq(postReactions.postId, postId), eq(postReactions.userId, userId))
    );
    res.json({ message: 'Reaction removed' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
