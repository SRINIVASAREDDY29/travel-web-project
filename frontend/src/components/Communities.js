import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { communitiesAPI } from '../utils/api';
import './Communities.css';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'campus', label: 'Campus' },
  { value: 'housing', label: 'Housing' },
  { value: 'interest', label: 'Interest' },
  { value: 'department', label: 'Department' },
  { value: 'other', label: 'Other' }
];

function Communities({ user }) {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCommunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const fetchCommunities = async (q = search) => {
    try {
      setLoading(true);
      setError('');
      const data = await communitiesAPI.getAll(q, category);
      setCommunities(data.communities || []);
    } catch (err) {
      setError(err.message || 'Failed to load communities');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCommunities(search);
  };

  const isMember = (community) => {
    if (!user) return false;
    return community.members?.some(m => {
      const mid = typeof m === 'object' ? (m._id || m) : m;
      return mid === user.id || mid?.toString?.() === user.id;
    });
  };

  const handleJoin = async (communityId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await communitiesAPI.join(communityId);
      fetchCommunities();
    } catch (err) {
      alert(err.message || 'Failed to join');
    }
  };

  return (
    <div className="communities-container">
      <div className="communities-header">
        <div className="communities-header-top">
          <h1>Communities</h1>
          {user && (
            <button className="create-community-btn" onClick={() => navigate('/community/create')}>
              + Create
            </button>
          )}
        </div>
        <p>Find and join communities that matter to you</p>
      </div>

      <div className="communities-controls">
        <form className="community-search-form" onSubmit={handleSearch}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search communities..."
            className="community-search-input"
          />
          <button type="submit" className="community-search-btn">Search</button>
        </form>
        <div className="community-categories">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              className={`category-chip ${category === c.value ? 'active' : ''}`}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="communities-empty">Loading communities...</div>
      ) : error ? (
        <div className="communities-empty">
          <p>{error}</p>
          <button className="retry-btn" onClick={() => fetchCommunities()}>Retry</button>
        </div>
      ) : communities.length === 0 ? (
        <div className="communities-empty">
          <h3>No communities found</h3>
          <p>Be the first to create one!</p>
        </div>
      ) : (
        <div className="communities-grid">
          {communities.map(c => (
            <Link to={`/community/${c._id}`} key={c._id} className="community-card">
              <div className="community-card-header">
                <div className="community-avatar">
                  {c.name[0].toUpperCase()}
                </div>
                <div className="community-card-info">
                  <h3>{c.name}</h3>
                  <span className="community-card-meta">
                    {c.memberCount} {c.memberCount === 1 ? 'member' : 'members'}
                    {c.category && c.category !== 'other' && ` · ${c.category}`}
                  </span>
                </div>
              </div>
              {c.description && (
                <p className="community-card-desc">
                  {c.description.length > 120 ? c.description.slice(0, 120) + '...' : c.description}
                </p>
              )}
              <div className="community-card-footer">
                {isMember(c) ? (
                  <span className="member-badge">Joined</span>
                ) : user ? (
                  <button className="join-btn-small" onClick={e => handleJoin(c._id, e)}>Join</button>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Communities;
