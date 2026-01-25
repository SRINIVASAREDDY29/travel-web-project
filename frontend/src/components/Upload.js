import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { postsAPI } from '../utils/api';
import './Upload.css';

function Upload({ user }) {
  const [formData, setFormData] = useState({
    mediaType: 'image',
    file: null,
    description: '',
    preview: null
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Cleanup preview URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (formData.preview && formData.preview.startsWith('blob:')) {
        URL.revokeObjectURL(formData.preview);
      }
    };
  }, [formData.preview]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Clean up previous preview URL if exists
    if (formData.preview) {
      URL.revokeObjectURL(formData.preview);
    }

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setError('Please upload an image or video file');
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError('File size must be less than 50MB');
      return;
    }

    setFormData({
      ...formData,
      file: file,
      mediaType: isImage ? 'image' : 'video',
      preview: URL.createObjectURL(file)
    });
    setError('');
  };

  const handleDescriptionChange = (e) => {
    setFormData({
      ...formData,
      description: e.target.value
    });
  };

  const handleMediaTypeChange = (e) => {
    // Clean up preview URL if exists
    if (formData.preview) {
      URL.revokeObjectURL(formData.preview);
    }
    
    setFormData({
      ...formData,
      mediaType: e.target.value,
      file: null,
      preview: null
    });
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
      await postsAPI.create(formData.file, formData.mediaType, description);

      setSuccess('Blog post uploaded successfully!');
      
      // Reset form
      setFormData({
        mediaType: 'image',
        file: null,
        description: '',
        preview: null
      });

      // Clear file input
      e.target.reset();

      // Redirect to home after 1.5 seconds
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to upload blog post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <h2>Share Your Travel Adventure</h2>
        <p className="upload-subtitle">Upload photos or videos from your travels</p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-group">
            <label htmlFor="mediaType">Media Type</label>
            <select
              id="mediaType"
              name="mediaType"
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
              name="file"
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
              name="description"
              value={formData.description}
              onChange={handleDescriptionChange}
              placeholder="Tell us about your travel experience..."
              rows="5"
              className="form-textarea"
            />
          </div>

          <button type="submit" className="upload-button" disabled={loading}>
            {loading ? 'Uploading...' : 'Upload Blog Post'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Upload;

