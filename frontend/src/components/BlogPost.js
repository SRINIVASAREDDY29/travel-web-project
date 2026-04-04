import React from 'react';
import { getMediaUrl } from '../utils/api';
import './BlogPost.css';

function BlogPost({ blog, onDelete, showDelete, onClick, className = '' }) {
  const renderMedia = () => {
    const mediaUrl = getMediaUrl(blog.mediaUrl);

    if (blog.mediaType === 'image' && mediaUrl) {
      return <img src={mediaUrl} alt={blog.description || 'Travel photo'} className="blog-media" />;
    } else if (blog.mediaType === 'video' && mediaUrl) {
      return (
        <video controls className="blog-media">
          <source src={mediaUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      );
    }
    return null;
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!onDelete) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this post? This action cannot be undone.');
    if (confirmed) {
      onDelete(blog._id || blog.id);
    }
  };

  const handleCardClick = (e) => {
    if (onClick && !e.target.closest('.blog-delete-button')) {
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
      aria-label={isClickable ? 'View full post' : undefined}
    >
      {showDelete && onDelete && (
        <button 
          className="blog-delete-button" 
          onClick={handleDelete}
          aria-label="Delete post"
          title="Delete this post"
        >
          ×
        </button>
      )}
      {renderMedia()}
      <div className="blog-content">
        {blog.description && (
          <p className="blog-description">{blog.description}</p>
        )}
        <div className="blog-meta">
          <span className="blog-author">By {blog.author}</span>
          <span className="blog-date">
            {new Date(blog.createdAt || blog.timestamp).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default BlogPost;

