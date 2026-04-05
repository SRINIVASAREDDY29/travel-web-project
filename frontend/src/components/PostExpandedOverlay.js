import React, { useEffect, useCallback } from 'react';
import BlogPost from './BlogPost';
import './PostExpandedOverlay.css';

function PostExpandedOverlay({ post, onClose, currentUserId }) {
  const handleEscape = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!post) return;
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [post, handleEscape]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!post) return null;

  return (
    <div
      className="post-expanded-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Expanded post"
    >
      <div className="post-expanded-inner" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="post-expanded-close"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <BlogPost blog={post} className="expanded" currentUserId={currentUserId} />
      </div>
    </div>
  );
}

export default PostExpandedOverlay;
