import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

function Navbar({ isAuthenticated, user, onLogout, theme, onToggleTheme }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <h2>CampusConnect</h2>
        </Link>
        <div className="navbar-menu">
          <button 
            className="theme-toggle-button" 
            onClick={onToggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? '\u{1F319}' : '\u{2600}\u{FE0F}'}
          </button>
          {isAuthenticated ? (
            <>
              <Link to="/" className="navbar-link">Feed</Link>
              <Link to="/communities" className="navbar-link">Communities</Link>
              <Link to="/chat" className="navbar-link">Chat</Link>
              <Link to="/profile" className="navbar-link">Profile</Link>
              <Link to="/upload" className="navbar-link">Post</Link>
              <span className="navbar-user">{user?.username || 'User'}</span>
              <button onClick={handleLogout} className="navbar-button">Logout</button>
            </>
          ) : (
            <Link to="/login" className="navbar-link">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
