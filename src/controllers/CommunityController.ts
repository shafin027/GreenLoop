import { Request, Response } from 'express';
import { CommunityEvent } from '../models/CommunityEvent';
import { EventParticipant } from '../models/EventParticipant';
import { Post } from '../models/Post';

export const listEvents = async (req: Request, res: Response) => {
  try {
    const events = await CommunityEvent.find().sort({ createdAt: -1 });
    const eventsWithParticipants = await Promise.all(events.map(async (event) => {
      const participantCount = await EventParticipant.countDocuments({ eventId: event._id });
      return { ...event.toObject(), participantCount };
    }));
    res.json(eventsWithParticipants);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const { title, description, date, startDate, endDate, location, offerings, imageURL } = req.body;
    const event = await CommunityEvent.create({ title, description, date: date || startDate, startDate, endDate, location, offerings, imageURL });
    res.status(201).json(event);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const joinEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await EventParticipant.findOne({ eventId: id, userId: req.user?.id });
    if (existing) return res.status(400).json({ message: 'Already joined this event' });
    const participant = await EventParticipant.create({ eventId: id, userId: req.user?.id, role: req.user?.role });
    res.status(201).json(participant);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getMyJoinedEvents = async (req: Request, res: Response) => {
  try {
    const records = await EventParticipant.find({ userId: req.user?.id }).select('eventId');
    res.json(records.map((r) => r.eventId.toString()));
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getEventParticipants = async (req: Request, res: Response) => {
  try {
    const participants = await EventParticipant.find({ eventId: req.params.id });
    res.json(participants);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { title, description, date, location, offerings, imageURL } = req.body;
    const event = await CommunityEvent.findByIdAndUpdate(req.params.id, { title, description, date, location, offerings, imageURL }, { new: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const event = await CommunityEvent.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    await EventParticipant.deleteMany({ eventId: req.params.id });
    res.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const listAdminPosts = async (req: Request, res: Response) => {
  try {
    const posts = await Post.find().populate('authorId', 'name email role').sort({ createdAt: -1 });
    res.json(posts.map((post) => ({ ...post.toObject(), id: post._id, author: (post as any).authorId })));
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updatePost = async (req: Request, res: Response) => {
  try {
    const { title, content, isApproved } = req.body;
    const post = await Post.findByIdAndUpdate(req.params.id, { ...(title !== undefined && { title }), ...(content !== undefined && { content }), ...(isApproved !== undefined && { isApproved }) }, { new: true });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deletePost = async (req: Request, res: Response) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ message: 'Post deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const listPublicPosts = async (req: Request, res: Response) => {
  try {
    const posts = await Post.find({ isApproved: true }).populate('authorId', 'name').sort({ createdAt: -1 });
    res.json(posts.map((post) => {
      const postObj = post.toObject();
      const isLiked = req.user ? (postObj.likedBy || []).some((id: any) => id.toString() === req.user.id) : false;
      const { likedBy, ...rest } = postObj;
      return { ...rest, id: post._id, author: (post as any).authorId, isLiked };
    }));
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const createPost = async (req: Request, res: Response) => {
  try {
    const { title, content, images } = req.body;
    const post = await Post.create({ authorId: req.user?.id, title, content, images: images || [], isApproved: true });
    res.status(201).json(post);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const likePost = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Authentication required' });

    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, likedBy: { $ne: userId } },
      { $inc: { likes: 1 }, $push: { likedBy: userId } },
      { new: true }
    );

    if (!post) {
      const exists = await Post.exists({ _id: req.params.id });
      return res.status(exists ? 400 : 404).json({ message: exists ? 'You have already liked this post' : 'Post not found' });
    }

    res.json(post);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
