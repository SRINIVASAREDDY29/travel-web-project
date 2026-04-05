import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { postsAPI, communitiesAPI } from '../utils/api';
import './Upload.css';

function Upload({ user }) {
  const [formData, setFormData] = useState({
    mediaType: 'image',
    file: null,
    description: '',
    preview: null,
    title: '',
    category: 'general',
    community: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [myCommunities, setMyCommunities] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyCommunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (formData.preview && formData.preview.startsWith('blob:')) {
        URL.revokeObjectURL(formData.preview);
      }
    };
  }, [formData.preview]);

  const fetchMyCommunities = async () => {
    try {
      const data = await communitiesAPI.getAll();
      const joined = (data.communities || []).filter(c =>
        c.members?.some(m => {
          const mid = typeof m === 'object' ? (m._id || m) : m;
          return mid === user?.id || mid?.toString?.() === user?.id;
        })
      );
      setMyCommunities(joined);
    } catch {
      // Non-critical
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (formData.preview) URL.revokeObjectURL(formData.preview);

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setError('Please upload an image or video file');
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 50MB');
      return;
    }

    setFormData(f => ({
      ...f,
      file,
      mediaType: isImage ? 'image' : 'video',
      preview: URL.createObjectURL(file)
    }));
    setError('');
  };

  const handleChange = (field) => (e) => {
    setFormData(f => ({ ...f, [field]: e.target.value }));
  };

  const handleMediaTypeChange = (e) => {
    if (formData.preview) URL.revokeObjectURL(formData.preview);
    setFormData(f => ({
      ...f,
      mediaType: e.target.value,
      file: null,
      preview: null
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.file) {
      setError('Please select a file to upload');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const description = formData.description.trim() || undefined;
      await postsAPI.create(formData.file, formData.mediaType, description, {
        title: formData.title.trim() || undefined,
        category: formData.category,
        community: formData.community || undefined
      });

      setSuccess('Post uploaded successfully!');

      setFormData({
        mediaType: 'image',
        file: null,
        description: '',
        preview: null,
        title: '',
        category: 'general',
        community: ''
      });

      e.target.reset();

      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err.message || 'Failed to upload. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <h2>Create a Post</h2>
        <p className="upload-subtitle">Share updates, events, or items with your community</p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-group">
            <label htmlFor="title">Title (Optional)</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={handleChange('title')}
              placeholder="Give your post a title..."
              maxLength={150}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={formData.category}
                onChange={handleChange('category')}
                className="form-select"
              >
                <option value="general">General</option>
                <option value="event">Event</option>
                <option value="marketplace">Marketplace</option>
                <option value="alert">Alert</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="community">Community (Optional)</label>
              <select
                id="community"
                value={formData.community}
                onChange={handleChange('community')}
                className="form-select"
              >
                <option value="">Public / No Community</option>
                {myCommunities.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="mediaType">Media Type</label>
            <select
              id="mediaType"
              value={formData.mediaType}
              onChange={handleMediaTypeChange}
              className="form-select"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="file">
              {formData.mediaType === 'image' ? 'Select Image' : 'Select Video'}
            </label>
            <input
              type="file"
              id="file"
              accept={formData.mediaType === 'image' ? 'image/*' : 'video/*'}
              onChange={handleFileChange}
              className="file-input"
              required
            />
            {formData.preview && (
              <div className="preview-container">
                {formData.mediaType === 'image' ? (
                  <img src={formData.preview} alt="Preview" className="preview-media" />
                ) : (
                  <video src={formData.preview} controls className="preview-media" />
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={handleChange('description')}
              placeholder="What's on your mind?"
              rows="4"
              className="form-textarea"
              maxLength={2000}
            />
          </div>

          <button type="submit" className="upload-button" disabled={loading}>
            {loading ? 'Uploading...' : 'Post'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Upload;
