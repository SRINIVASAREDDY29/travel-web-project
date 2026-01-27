import React, { useState, useEffect } from 'react';
import BlogPost from './BlogPost';
import { postsAPI, profileAPI } from '../utils/api';
import './Profile.css';

function Profile({ user, onUserUpdate }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    if (user && user.id) {
      fetchMyPosts();
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const fetchProfile = async () => {
    try {
      const response = await profileAPI.getMe();
      setProfileData(response.user);
      if (response.user.profilePhoto) {
        const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        setPhotoPreview(`${apiBase}${response.user.profilePhoto}`);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

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

  const handleDeletePost = async (postId) => {
    try {
      await postsAPI.delete(postId);
      // Remove deleted post from local state
      setBlogs(prevBlogs => prevBlogs.filter(blog => (blog._id || blog.id) !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
      alert(err.message || 'Failed to delete post. Please try again.');
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setPhotoError('File size must be less than 5MB');
      return;
    }

    // Clean up previous preview if exists
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }

    // Create preview
    const newPreview = URL.createObjectURL(file);
    setPhotoPreview(newPreview);
    setPhotoError('');

    // Upload photo
    uploadPhoto(file);
  };

  const uploadPhoto = async (file) => {
    setPhotoLoading(true);
    setPhotoError('');

    try {
      const response = await profileAPI.updatePhoto(file);
      
      // Update profile data
      setProfileData(response.user);
      
      // Update preview with new URL
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      setPhotoPreview(`${apiBase}${response.user.profilePhoto}`);
      
      // Update user in parent component
      if (onUserUpdate) {
        onUserUpdate(response.user);
      }

      // Update localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      userData.profilePhoto = response.user.profilePhoto;
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (err) {
      setPhotoError(err.message || 'Failed to update profile photo. Please try again.');
      // Reset preview on error
      if (profileData?.profilePhoto) {
        const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        setPhotoPreview(`${apiBase}${profileData.profilePhoto}`);
      } else {
        setPhotoPreview(null);
      }
    } finally {
      setPhotoLoading(false);
    }
  };

  const getPhotoUrl = () => {
    if (photoPreview) {
      return photoPreview;
    }
    if (profileData?.profilePhoto) {
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      return `${apiBase}${profileData.profilePhoto}`;
    }
    return null;
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-photo-section">
          <div className="profile-photo-container">
            {getPhotoUrl() ? (
              <img 
                src={getPhotoUrl()} 
                alt="Profile" 
                className="profile-photo"
              />
            ) : (
              <div className="profile-photo-placeholder">
                <span className="profile-photo-icon">👤</span>
              </div>
            )}
            <label className="profile-photo-edit" htmlFor="profile-photo-input">
              {photoLoading ? '⏳' : '📷'}
              <input
                type="file"
                id="profile-photo-input"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={photoLoading}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          {photoError && <div className="photo-error">{photoError}</div>}
        </div>
        <div className="profile-info">
          <h1>{user?.username || 'Profile'}'s Travel Blog</h1>
          <p className="profile-id">Username: {profileData?.username || user?.username || 'N/A'}</p>
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
            <BlogPost 
              key={blog._id || blog.id} 
              blog={blog} 
              onDelete={handleDeletePost}
              showDelete={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Profile;
