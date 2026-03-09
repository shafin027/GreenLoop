import express from 'express';
import Post from '../models/Post.js';
import { protect, modOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/posts
// @desc    Get all approved posts
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = { 
      isApproved: true,
      status: 'published'
    };
    
    if (category) query.category = category;
    if (search) {
      query.$text = { $search: search };
    }

    const posts = await Post.find(query)
      .populate('authorId', 'name')
      .select('-likedBy')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(query);

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/posts/featured
// @desc    Get featured posts
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const posts = await Post.find({ 
      isApproved: true,
      isFeatured: true,
      status: 'published'
    })
      .populate('authorId', 'name')
      .select('-likedBy')
      .limit(5)
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/posts/:id
// @desc    Get post by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('authorId', 'name email')
      .populate('comments.userId', 'name');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Increment views
    post.views += 1;
    await post.save();

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/posts/user/:userId
// @desc    Get user's posts
// @access  Private
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Check authorization
    if (req.params.userId !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const posts = await Post.find({ authorId: req.params.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments({ authorId: req.params.userId });

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts
// @desc    Create new post
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { title, content, category, images } = req.body;

    const user = req.user;

    const post = await Post.create({
      authorId: user.id,
      authorName: user.name || 'Anonymous',
      authorRole: user.role,
      title,
      content,
      category: category || 'other',
      images,
      isApproved: user.role === 'admin' || user.role === 'moderator', // Auto-approve admins
      status: 'published',
    });

    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/posts/:id
// @desc    Update post
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { title, content, category, images } = req.body;

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check ownership
    if (post.authorId.toString() !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (title) post.title = title;
    if (content) post.content = content;
    if (category) post.category = category;
    if (images) post.images = images;

    await post.save();

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/posts/:id
// @desc    Delete post
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check ownership
    if (post.authorId.toString() !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await post.deleteOne();

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:id/like
// @desc    Like/unlike post
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const index = post.likedBy.indexOf(req.user.id);
    if (index === -1) {
      post.likedBy.push(req.user.id);
      post.likes += 1;
    } else {
      post.likedBy.splice(index, 1);
      post.likes -= 1;
    }

    await post.save();

    res.json({ likes: post.likes, liked: index === -1 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/:id/comment
// @desc    Add comment to post
// @access  Private
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const { comment } = req.body;

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.comments.push({
      userId: req.user.id,
      comment,
    });

    await post.save();

    const updatedPost = await Post.findById(req.params.id)
      .populate('comments.userId', 'name');

    res.json(updatedPost.comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN ROUTES

// @route   GET /api/posts/admin/pending
// @desc    Get pending posts
// @access  Private (Admin/Moderator)
router.get('/admin/pending', protect, modOrAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.find({ isApproved: false })
      .populate('authorId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments({ isApproved: false });

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/posts/admin/all
// @desc    Get all posts (admin)
// @access  Private (Admin/Moderator)
router.get('/admin/all', protect, modOrAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const posts = await Post.find(query)
      .populate('authorId', 'name email')
      .select('-likedBy')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(query);

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/admin/approve/:id
// @desc    Approve post
// @access  Private (Admin/Moderator)
router.post('/admin/approve/:id', protect, modOrAdmin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.isApproved = true;
    post.approvedBy = req.user.id;
    post.approvedAt = new Date();
    await post.save();

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/posts/admin/reject/:id
// @desc    Reject post
// @access  Private (Admin/Moderator)
router.post('/admin/reject/:id', protect, modOrAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.isApproved = false;
    post.status = 'rejected';
    post.rejectionReason = reason;
    post.approvedBy = req.user.id;
    post.approvedAt = new Date();
    await post.save();

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/posts/admin/feature/:id
// @desc    Toggle featured status
// @access  Private (Admin)
router.put('/admin/feature/:id', protect, modOrAdmin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.isFeatured = !post.isFeatured;
    await post.save();

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

