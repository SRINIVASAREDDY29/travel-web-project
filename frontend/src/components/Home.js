import React, { useState, useEffect, useCallback } from 'react';
import BlogPost from './BlogPost';
import PostExpandedOverlay from './PostExpandedOverlay';
import { postsAPI } from '../utils/api';
import './Home.css';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'general', label: 'General' },
  { value: 'event', label: 'Events' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'alert', label: 'Alerts' }
];

function Home({ user, isAuthenticated }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [expandedPost, setExpandedPost] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [category, setCategory] = useState('');

  const fetchBlogs = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError('');
      }

      const filters = {};
      if (category) filters.category = category;

      const response = await postsAPI.getAll(pageNum, 12, filters);

      if (append) {
        setBlogs(prev => [...prev, ...(response.posts || [])]);
      } else {
        setBlogs(response.posts || []);
      }

      setPage(response.page || pageNum);
      setHasMore(response.hasMore || false);
    } catch (err) {
      if (!append) {
        setError(err.message || 'Failed to load posts.');
      }
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category]);

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
        <h1>Community Feed</h1>
        <p>See what's happening across your communities</p>
      </div>

      <div className="home-filters">
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            className={`home-filter-chip ${category === c.value ? 'active' : ''}`}
            onClick={() => setCategory(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state">
          <h3>Loading...</h3>
        </div>
      ) : error ? (
        <div className="empty-state">
          <h3>Error loading posts</h3>
          <p>{error}</p>
          <button onClick={() => fetchBlogs(1)} className="retry-button">Retry</button>
        </div>
      ) : blogs.length === 0 ? (
        <div className="empty-state">
          <h3>No posts yet</h3>
          <p>{category ? 'No posts in this category. Try a different filter!' : 'Be the first to share something!'}</p>
        </div>
      ) : (
        <>
          <div className="blogs-grid">
            {blogs.map((blog) => (
              <BlogPost
                key={blog._id || blog.id}
                blog={blog}
                onClick={setExpandedPost}
                currentUserId={user?.id}
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
          currentUserId={user?.id}
        />
      )}
    </div>
  );
}

export default Home;
