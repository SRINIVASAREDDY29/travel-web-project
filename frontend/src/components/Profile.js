import React, { useState, useEffect } from 'react';
import BlogPost from './BlogPost';
import { postsAPI } from '../utils/api';
import './Profile.css';

function Profile({ user }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && user.id) {
      fetchMyPosts();
    }
  }, [user]);

  const fetchMyPosts = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await postsAPI.getMyPosts();
      setBlogs(response.posts || []);
    } catch (err) {
      setError(err.message || 'Failed to load your posts. Please try again later.');
      console.error('Error fetching my posts:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-info">
          <h1>{user?.username || 'Profile'}'s Travel Blog</h1>
          <p className="profile-stats">
            {blogs.length} {blogs.length === 1 ? 'post' : 'posts'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <h3>Loading your posts...</h3>
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3>Error loading posts</h3>
          <p>{error}</p>
          <button onClick={fetchMyPosts} className="retry-button">Retry</button>
        </div>
      ) : blogs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✈️</div>
          <h3>No posts yet</h3>
          <p>Start sharing your travel adventures!</p>
        </div>
      ) : (
        <div className="blogs-grid">
          {blogs.map((blog) => (
            <BlogPost key={blog._id || blog.id} blog={blog} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Profile;
