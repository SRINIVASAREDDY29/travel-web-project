import React, { Component, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Home from './components/Home';
import Upload from './components/Upload';
import Profile from './components/Profile';
import Chat from './components/Chat';
import { profileAPI, authAPI } from './utils/api';
import './App.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Something went wrong</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>An unexpected error occurred.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white', border: 'none', padding: '0.75rem 1.5rem',
              borderRadius: '6px', fontSize: '1rem', cursor: 'pointer'
            }}
          >
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });

  const fetchUserProfile = async () => {
    try {
      const response = await profileAPI.getMe();
      if (response.user) {
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Don't show error to user, just use cached data
    }
  };

  useEffect(() => {
    // Apply theme to document on mount and when theme changes
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Apply theme immediately on mount
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Check if user is authenticated on app load
    const token = localStorage.getItem('token');
    const authStatus = localStorage.getItem('isAuthenticated');
    const userData = localStorage.getItem('user');
    
    if (token && authStatus === 'true' && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setIsAuthenticated(true);
        setUser(parsedUser);
        fetchUserProfile();
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('user');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(prevUser => {
      const merged = { ...prevUser, ...updatedUser };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });
  };

  const handleLogout = () => {
    authAPI.logout();
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
  };

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <Navbar 
            isAuthenticated={isAuthenticated} 
            user={user} 
            onLogout={handleLogout}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
          <main className="main-content">
            <Routes>
              <Route 
                path="/login" 
                element={
                  isAuthenticated ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
                } 
              />
              <Route 
                path="/upload" 
                element={
                  isAuthenticated ? <Upload user={user} /> : <Navigate to="/login" replace />
                } 
              />
              <Route 
                path="/profile" 
                element={
                  isAuthenticated ? <Profile user={user} onUserUpdate={handleUserUpdate} /> : <Navigate to="/login" replace />
                } 
              />
              <Route 
                path="/chat" 
                element={
                  isAuthenticated ? <Chat user={user} /> : <Navigate to="/login" replace />
                } 
              />
              <Route path="/" element={<Home user={user} isAuthenticated={isAuthenticated} />} />
              <Route path="*" element={
                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Page Not Found</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>The page you're looking for doesn't exist.</p>
                  <a href="/" style={{ color: '#667eea', textDecoration: 'none', fontWeight: 600 }}>Go Home</a>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
