import React from 'react';
import './BlogPost.css';

function BlogPost({ blog, onDelete, showDelete }) {
  const getMediaUrl = () => {
    let mediaUrl = blog.mediaUrl;
    if (!mediaUrl) return null;

    // Handle blob URLs (from localStorage/preview)
    if (mediaUrl.startsWith('blob:')) {
      return mediaUrl;
    }

    // Handle relative paths from backend
    if (mediaUrl.startsWith('/uploads')) {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      return `${apiBase}${mediaUrl}`;
    }

    // Handle absolute URLs
    return mediaUrl;
  };

  const renderMedia = () => {
    const mediaUrl = getMediaUrl();

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

  return (
    <div className="blog-post">
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

