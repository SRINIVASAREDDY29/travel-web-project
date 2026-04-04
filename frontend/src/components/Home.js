import React, { useState, useEffect, useCallback } from 'react';
import BlogPost from './BlogPost';
import PostExpandedOverlay from './PostExpandedOverlay';
import { postsAPI } from '../utils/api';
import './Home.css';

function Home({ user, isAuthenticated }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [expandedPost, setExpandedPost] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchBlogs = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError('');
      }

      const response = await postsAPI.getAll(pageNum);

      if (append) {
        setBlogs(prev => [...prev, ...(response.posts || [])]);
      } else {
        setBlogs(response.posts || []);
      }

      setPage(response.page || pageNum);
      setHasMore(response.hasMore || false);
    } catch (err) {
      if (!append) {
        setError(err.message || 'Failed to load blog posts. Please try again later.');
      }
      console.error('Error fetching blogs:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchBlogs(1);
  }, [fetchBlogs]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchBlogs(page + 1, true);
    }
  };

  return (
    <div className="home-container">
      <div className="home-header">
        <h1>Travel Adventures</h1>
        <p>Discover amazing travel stories from around the world</p>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <h3>Loading...</h3>
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3>Error loading blogs</h3>
          <p>{error}</p>
          <button onClick={() => fetchBlogs(1)} className="retry-button">Retry</button>
        </div>
      ) : blogs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✈️</div>
          <h3>No travel blogs yet</h3>
          <p>Be the first to share your travel adventure!</p>
        </div>
      ) : (
        <>
          <div className="blogs-grid">
            {blogs.map((blog) => (
              <BlogPost
                key={blog._id || blog.id}
                blog={blog}
                onClick={setExpandedPost}
              />
            ))}
          </div>

          {hasMore && (
            <div className="load-more-container">
              <button
                className="load-more-button"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}

      {expandedPost && (
        <PostExpandedOverlay
          post={expandedPost}
          onClose={() => setExpandedPost(null)}
        />
      )}
    </div>
  );
}

export default Home;

