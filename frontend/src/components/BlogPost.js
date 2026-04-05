import React, { useState, useEffect } from 'react';
import { getMediaUrl, postsAPI } from '../utils/api';
import './BlogPost.css';

const CATEGORY_LABELS = {
  general: 'General',
  event: 'Event',
  marketplace: 'Marketplace',
  alert: 'Alert'
};

const CATEGORY_COLORS = {
  general: '#667eea',
  event: '#e67e22',
  marketplace: '#2ecc71',
  alert: '#e74c3c'
};

function BlogPost({ blog, onDelete, showDelete, onClick, className = '', currentUserId }) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentsTotal, setCommentsTotal] = useState(0);

  useEffect(() => {
    const likes = blog.likes || [];
    setLikesCount(likes.length);
    setLiked(currentUserId ? likes.some(id => id === currentUserId || id.toString?.() === currentUserId) : false);
  }, [blog.likes, currentUserId]);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (likeLoading || !currentUserId) return;
    setLikeLoading(true);
    try {
      const res = await postsAPI.toggleLike(blog._id || blog.id);
      setLiked(res.liked);
      setLikesCount(res.likesCount);
    } catch (err) {
      console.error('Like error:', err);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleToggleComments = async (e) => {
    e.stopPropagation();
    if (showComments) {
      setShowComments(false);
      return;
    }
    setShowComments(true);
    await fetchComments();
  };

  const fetchComments = async () => {
    try {
      const res = await postsAPI.getComments(blog._id || blog.id);
      setComments(res.comments || []);
      setCommentsTotal(res.total || 0);
    } catch (err) {
      console.error('Fetch comments error:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!commentText.trim() || commentLoading) return;
    setCommentLoading(true);
    try {
      const res = await postsAPI.addComment(blog._id || blog.id, commentText.trim());
      setComments(prev => [res.comment, ...prev]);
      setCommentsTotal(prev => prev + 1);
      setCommentText('');
    } catch (err) {
      console.error('Add comment error:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId, e) => {
    e.stopPropagation();
    try {
      await postsAPI.deleteComment(commentId);
      setComments(prev => prev.filter(c => c._id !== commentId));
      setCommentsTotal(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Delete comment error:', err);
    }
  };

  const renderMedia = () => {
    const mediaUrl = getMediaUrl(blog.mediaUrl);
    if (blog.mediaType === 'image' && mediaUrl) {
      return <img src={mediaUrl} alt={blog.description || 'Post'} className="blog-media" />;
    } else if (blog.mediaType === 'video' && mediaUrl) {
      return (
        <video controls className="blog-media">
          <source src={mediaUrl} type="video/mp4" />
        </video>
      );
    }
    return null;
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!onDelete) return;
    const confirmed = window.confirm('Are you sure you want to delete this post?');
    if (confirmed) onDelete(blog._id || blog.id);
  };

  const handleCardClick = (e) => {
    if (onClick && !e.target.closest('.blog-delete-button') && !e.target.closest('.blog-interactions') && !e.target.closest('.comments-section')) {
      onClick(blog);
    }
  };

  const handleKeyDown = (e) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(blog);
    }
  };

  const isClickable = Boolean(onClick);

  return (
    <div
      className={`blog-post ${isClickable ? 'clickable' : ''} ${className}`.trim()}
      onClick={isClickable ? handleCardClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {showDelete && onDelete && (
        <button className="blog-delete-button" onClick={handleDelete} title="Delete post">
          &times;
        </button>
      )}

      {blog.category && blog.category !== 'general' && (
        <span
          className="blog-category-badge"
          style={{ background: CATEGORY_COLORS[blog.category] || '#667eea' }}
        >
          {CATEGORY_LABELS[blog.category] || blog.category}
        </span>
      )}

      {renderMedia()}

      <div className="blog-content">
        {blog.title && <h3 className="blog-title">{blog.title}</h3>}
        {blog.description && <p className="blog-description">{blog.description}</p>}

        <div className="blog-meta">
          <span className="blog-author">
            {blog.authorId?.profilePhoto && (
              <img
                src={getMediaUrl(blog.authorId.profilePhoto)}
                alt=""
                className="blog-author-avatar"
              />
            )}
            {blog.author}
          </span>
          <span className="blog-date">
            {new Date(blog.createdAt || blog.timestamp).toLocaleDateString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric'
            })}
          </span>
        </div>

        {/* Like & Comment bar */}
        <div className="blog-interactions">
          <button
            className={`interaction-btn like-btn ${liked ? 'liked' : ''}`}
            onClick={handleLike}
            disabled={likeLoading || !currentUserId}
          >
            <span className="like-icon">{liked ? '\u2764' : '\u2661'}</span>
            <span>{likesCount}</span>
          </button>
          <button className="interaction-btn comment-btn" onClick={handleToggleComments}>
            <span className="comment-icon">&#128172;</span>
            <span>{commentsTotal > 0 ? commentsTotal : 'Comment'}</span>
          </button>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="comments-section" onClick={e => e.stopPropagation()}>
            {currentUserId && (
              <form className="comment-form" onSubmit={handleAddComment}>
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  maxLength={500}
                  className="comment-input"
                />
                <button type="submit" className="comment-submit" disabled={commentLoading || !commentText.trim()}>
                  {commentLoading ? '...' : 'Post'}
                </button>
              </form>
            )}
            <div className="comments-list">
              {comments.length === 0 ? (
                <p className="no-comments">No comments yet</p>
              ) : (
                comments.map(c => (
                  <div key={c._id} className="comment-item">
                    <div className="comment-header">
                      {c.userId?.profilePhoto && (
                        <img src={getMediaUrl(c.userId.profilePhoto)} alt="" className="comment-avatar" />
                      )}
                      <span className="comment-author">{c.userId?.username || 'User'}</span>
                      <span className="comment-time">
                        {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {currentUserId && c.userId && (c.userId._id === currentUserId || c.userId._id?.toString?.() === currentUserId) && (
                        <button className="comment-delete" onClick={e => handleDeleteComment(c._id, e)} title="Delete">&times;</button>
                      )}
                    </div>
                    <p className="comment-text">{c.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BlogPost;
