import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const postSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  authorName: {
    type: String,
  },
  authorRole: {
    type: String,
    enum: ['user', 'collector', 'admin', 'moderator'],
    default: 'user',
  },
  title: {
    type: String,
    required: [true, 'Post title is required'],
    trim: true,
    maxlength: 200,
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
  },
  // Category/tags
  category: {
    type: String,
    enum: ['awareness', 'tips', 'success-story', 'event', 'news', 'other'],
    default: 'other',
  },
  // Images
  images: [{
    type: String,
  }],
  // Approval status
  isApproved: {
    type: Boolean,
    default: false, // Requires admin approval
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
  },
  // Engagement
  likes: {
    type: Number,
    default: 0,
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  views: {
    type: Number,
    default: 0,
  },
  comments: [commentSchema],
  commentCount: {
    type: Number,
    default: 0,
  },
  // Share count
  shares: {
    type: Number,
    default: 0,
  },
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'rejected'],
    default: 'published',
  },
  rejectionReason: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for efficient querying
postSchema.index({ isApproved: 1, status: 1 });
postSchema.index({ authorId: 1 });
postSchema.index({ category: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ title: 'text', content: 'text' }); // Full-text search

// Update timestamp on save
postSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  this.commentCount = this.comments.length;
  next();
});

// Method to like/unlike post
postSchema.methods.toggleLike = function(userId) {
  const index = this.likedBy.indexOf(userId);
  if (index === -1) {
    this.likedBy.push(userId);
    this.likes += 1;
  } else {
    this.likedBy.splice(index, 1);
    this.likes -= 1;
  }
  return this.likes;
};

const Post = mongoose.model('Post', postSchema);

export default Post;

