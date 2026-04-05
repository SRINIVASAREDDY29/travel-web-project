import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { communitiesAPI } from '../utils/api';
import './Communities.css';

const CATEGORIES = [
  { value: 'campus', label: 'Campus' },
  { value: 'housing', label: 'Housing' },
  { value: 'interest', label: 'Interest' },
  { value: 'department', label: 'Department' },
  { value: 'other', label: 'Other' }
];

function CreateCommunity() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Community name is required');
      return;
    }
    if (name.trim().length < 3) {
      setError('Name must be at least 3 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await communitiesAPI.create(name.trim(), description.trim(), category);
      navigate(`/community/${data.community._id}`);
    } catch (err) {
      setError(err.message || 'Failed to create community');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="communities-container">
      <div className="create-community-card">
        <h2>Create a Community</h2>
        <p className="create-subtitle">Start a space for your campus, building, or interest group</p>

        {error && <div className="create-error">{error}</div>}

        <form onSubmit={handleSubmit} className="create-form">
          <div className="create-field">
            <label htmlFor="community-name">Community Name</label>
            <input
              id="community-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., CS Department, Building 5, Photography Club"
              maxLength={50}
              required
            />
          </div>

          <div className="create-field">
            <label htmlFor="community-desc">Description</label>
            <textarea
              id="community-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's this community about?"
              maxLength={500}
              rows={3}
            />
            <span className="create-char-count">{description.length}/500</span>
          </div>

          <div className="create-field">
            <label htmlFor="community-category">Category</label>
            <select
              id="community-category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="create-select"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="create-submit-btn" disabled={loading}>
            {loading ? 'Creating...' : 'Create Community'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateCommunity;
