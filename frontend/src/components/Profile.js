import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BlogPost from './BlogPost';
import PostExpandedOverlay from './PostExpandedOverlay';
import { postsAPI, profileAPI, getMediaUrl } from '../utils/api';
import './Profile.css';

function Profile({ user, onUserUpdate }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [expandedPost, setExpandedPost] = useState(null);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', bio: '', location: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (user && user.id) {
      fetchMyPosts();
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
        setPhotoPreview(getMediaUrl(response.user.profilePhoto));
      }
      setEditForm({
        fullName: response.user.fullName || '',
        bio: response.user.bio || '',
        location: response.user.location || ''
      });
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
      setError(err.message || 'Failed to load your posts.');
      console.error('Error fetching my posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await postsAPI.delete(postId);
      setBlogs(prevBlogs => prevBlogs.filter(blog => (blog._id || blog.id) !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
      alert(err.message || 'Failed to delete post.');
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select an image file');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setPhotoError('File size must be less than 5MB');
      return;
    }

    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }

    const newPreview = URL.createObjectURL(file);
    setPhotoPreview(newPreview);
    setPhotoError('');
    uploadPhoto(file);
  };

  const uploadPhoto = async (file) => {
    setPhotoLoading(true);
    setPhotoError('');
    try {
      const response = await profileAPI.updatePhoto(file);
      setProfileData(response.user);
      setPhotoPreview(getMediaUrl(response.user.profilePhoto));
      if (onUserUpdate) onUserUpdate(response.user);

      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      userData.profilePhoto = response.user.profilePhoto;
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (err) {
      setPhotoError(err.message || 'Failed to update profile photo.');
      if (profileData?.profilePhoto) {
        setPhotoPreview(getMediaUrl(profileData.profilePhoto));
      } else {
        setPhotoPreview(null);
      }
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleEditSave = async () => {
    setEditLoading(true);
    setEditError('');
    try {
      const response = await profileAPI.updateProfile(editForm);
      setProfileData(prev => ({ ...prev, ...response.user }));
      if (onUserUpdate) onUserUpdate(response.user);
      setEditing(false);
    } catch (err) {
      setEditError(err.message || 'Failed to update profile.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditCancel = () => {
    setEditForm({
      fullName: profileData?.fullName || '',
      bio: profileData?.bio || '',
      location: profileData?.location || ''
    });
    setEditError('');
    setEditing(false);
  };

  const getPhotoUrl = () => {
    if (photoPreview) return photoPreview;
    return getMediaUrl(profileData?.profilePhoto);
  };

  const memberSince = profileData?.createdAt
    ? new Date(profileData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : '';

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-photo-section">
          <div className="profile-photo-container">
            {getPhotoUrl() ? (
              <img src={getPhotoUrl()} alt="Profile" className="profile-photo" />
            ) : (
              <div className="profile-photo-placeholder">
                <span className="profile-photo-icon">
                  {(profileData?.username || user?.username || '?')[0].toUpperCase()}
                </span>
              </div>
            )}
            <label className="profile-photo-edit" htmlFor="profile-photo-input">
              {photoLoading ? '...' : '+'}
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
          <h1>{profileData?.fullName || user?.username || 'Profile'}</h1>
          <p className="profile-username">@{profileData?.username || user?.username}</p>
          {profileData?.bio && !editing && (
            <p className="profile-bio">{profileData.bio}</p>
          )}
          <div className="profile-meta-row">
            {profileData?.location && !editing && (
              <span className="profile-meta-item">
                <span className="meta-icon">&#128205;</span> {profileData.location}
              </span>
            )}
            {memberSince && (
              <span className="profile-meta-item">
                <span className="meta-icon">&#128197;</span> Joined {memberSince}
              </span>
            )}
            <span className="profile-meta-item">
              <span className="meta-icon">&#128221;</span> {blogs.length} {blogs.length === 1 ? 'post' : 'posts'}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Profile Section */}
      <div className="profile-edit-section">
        {!editing ? (
          <button className="edit-profile-btn" onClick={() => setEditing(true)}>
            Edit Profile
          </button>
        ) : (
          <div className="edit-profile-form">
            <h3>Edit Profile</h3>
            {editError && <div className="edit-error">{editError}</div>}
            <div className="edit-field">
              <label htmlFor="edit-fullName">Full Name</label>
              <input
                id="edit-fullName"
                type="text"
                value={editForm.fullName}
                onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
                placeholder="Your full name"
                maxLength={60}
              />
            </div>
            <div className="edit-field">
              <label htmlFor="edit-bio">Bio</label>
              <textarea
                id="edit-bio"
                value={editForm.bio}
                onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Tell people about yourself..."
                maxLength={300}
                rows={3}
              />
              <span className="char-count">{editForm.bio.length}/300</span>
            </div>
            <div className="edit-field">
              <label htmlFor="edit-location">Location</label>
              <input
                id="edit-location"
                type="text"
                value={editForm.location}
                onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                placeholder="City, State or Campus"
                maxLength={100}
              />
            </div>
            <div className="edit-actions">
              <button className="save-btn" onClick={handleEditSave} disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save'}
              </button>
              <button className="cancel-btn" onClick={handleEditCancel} disabled={editLoading}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Communities */}
      {profileData?.communities && profileData.communities.length > 0 && (
        <div className="profile-communities">
          <h3>Communities</h3>
          <div className="community-tags">
            {profileData.communities.map(c => (
              <Link key={c._id} to={`/community/${c._id}`} className="community-tag">
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Posts Grid */}
      <div className="profile-posts-section">
        <h3>Posts</h3>
        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">...</div>
            <h3>Loading your posts...</h3>
          </div>
        ) : error ? (
          <div className="empty-state">
            <h3>Error loading posts</h3>
            <p>{error}</p>
            <button onClick={fetchMyPosts} className="retry-button">Retry</button>
          </div>
        ) : blogs.length === 0 ? (
          <div className="empty-state">
            <h3>No posts yet</h3>
            <p>Start sharing with your community!</p>
          </div>
        ) : (
          <div className="blogs-grid">
            {blogs.map((blog) => (
              <BlogPost
                key={blog._id || blog.id}
                blog={blog}
                onDelete={handleDeletePost}
                showDelete={true}
                onClick={setExpandedPost}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </div>

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

export default Profile;
