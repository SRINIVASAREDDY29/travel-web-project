import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BlogPost from './BlogPost';
import PostExpandedOverlay from './PostExpandedOverlay';
import { communitiesAPI, getMediaUrl } from '../utils/api';
import './Communities.css';

const POST_CATEGORIES = [
  { value: '', label: 'All Posts' },
  { value: 'general', label: 'General' },
  { value: 'event', label: 'Events' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'alert', label: 'Alerts' }
];

function CommunityDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedPost, setExpandedPost] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [postCategory, setPostCategory] = useState('');

  const fetchCommunity = useCallback(async () => {
    try {
      setLoading(true);
      const data = await communitiesAPI.getById(id);
      setCommunity(data.community);
    } catch (err) {
      setError(err.message || 'Community not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchPosts = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setPostsLoading(true);
      }
      const data = await communitiesAPI.getPosts(id, pageNum, postCategory);
      if (append) {
        setPosts(prev => [...prev, ...(data.posts || [])]);
      } else {
        setPosts(data.posts || []);
      }
      setPage(data.page || pageNum);
      setHasMore(data.hasMore || false);
    } catch (err) {
      console.error('Error fetching community posts:', err);
    } finally {
      setPostsLoading(false);
      setLoadingMore(false);
    }
  }, [id, postCategory]);

  useEffect(() => {
    fetchCommunity();
  }, [fetchCommunity]);

  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

  const isMember = () => {
    if (!user || !community) return false;
    return community.members?.some(m => {
      const mid = typeof m === 'object' ? (m._id || m) : m;
      return mid === user.id || mid?.toString?.() === user.id;
    });
  };

  const isCreator = () => {
    if (!user || !community) return false;
    const cid = typeof community.creator === 'object' ? community.creator._id : community.creator;
    return cid === user.id || cid?.toString?.() === user.id;
  };

  const handleJoin = async () => {
    try {
      await communitiesAPI.join(id);
      fetchCommunity();
    } catch (err) {
      alert(err.message || 'Failed to join');
    }
  };

  const handleLeave = async () => {
    try {
      await communitiesAPI.leave(id);
      fetchCommunity();
    } catch (err) {
      alert(err.message || 'Failed to leave');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this community? This cannot be undone.')) return;
    try {
      await communitiesAPI.delete(id);
      navigate('/communities');
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  if (loading) {
    return <div className="communities-container"><div className="communities-empty">Loading...</div></div>;
  }

  if (error || !community) {
    return (
      <div className="communities-container">
        <div className="communities-empty">
          <h3>{error || 'Community not found'}</h3>
          <button className="retry-btn" onClick={() => navigate('/communities')}>Back to Communities</button>
        </div>
      </div>
    );
  }

  return (
    <div className="communities-container">
      {/* Community Header */}
      <div className="community-detail-header">
        <div className="community-detail-avatar">
          {community.name[0].toUpperCase()}
        </div>
        <div className="community-detail-info">
          <h1>{community.name}</h1>
          {community.description && <p className="community-detail-desc">{community.description}</p>}
          <div className="community-detail-meta">
            <span>{community.members?.length || 0} members</span>
            {community.category && community.category !== 'other' && (
              <span className="community-detail-category">{community.category}</span>
            )}
            <span>Created by {typeof community.creator === 'object' ? community.creator.username : 'Unknown'}</span>
          </div>
        </div>
        <div className="community-detail-actions">
          {user && !isMember() && (
            <button className="join-btn" onClick={handleJoin}>Join Community</button>
          )}
          {user && isMember() && !isCreator() && (
            <button className="leave-btn" onClick={handleLeave}>Leave</button>
          )}
          {user && isCreator() && (
            <button className="delete-community-btn" onClick={handleDelete}>Delete</button>
          )}
        </div>
      </div>

      {/* Members preview */}
      {community.members && community.members.length > 0 && (
        <div className="community-members-preview">
          {community.members.slice(0, 10).map(m => (
            <div key={m._id || m} className="member-chip" title={m.username || ''}>
              {m.profilePhoto ? (
                <img src={getMediaUrl(m.profilePhoto)} alt="" className="member-chip-avatar" />
              ) : (
                <span className="member-chip-letter">
                  {(m.username || '?')[0].toUpperCase()}
                </span>
              )}
            </div>
          ))}
          {community.members.length > 10 && (
            <span className="member-chip-more">+{community.members.length - 10}</span>
          )}
        </div>
      )}

      {/* Post category filter */}
      <div className="community-post-filters">
        {POST_CATEGORIES.map(c => (
          <button
            key={c.value}
            className={`category-chip ${postCategory === c.value ? 'active' : ''}`}
            onClick={() => setPostCategory(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      {postsLoading ? (
        <div className="communities-empty">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="communities-empty">
          <h3>No posts yet</h3>
          <p>Be the first to post in this community!</p>
        </div>
      ) : (
        <>
          <div className="communities-posts-grid">
            {posts.map(post => (
              <BlogPost
                key={post._id}
                blog={post}
                onClick={setExpandedPost}
                currentUserId={user?.id}
              />
            ))}
          </div>
          {hasMore && (
            <div className="load-more-container">
              <button
                className="load-more-button"
                onClick={() => fetchPosts(page + 1, true)}
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

export default CommunityDetail;
