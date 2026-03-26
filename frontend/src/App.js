import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Home from './components/Home';
import Upload from './components/Upload';
import Profile from './components/Profile';
import Chat from './components/Chat';
import { profileAPI } from './utils/api';
import './App.css';

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
      setIsAuthenticated(true);
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Fetch latest profile data including profile photo
      fetchUserProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(prevUser => ({
      ...prevUser,
      ...updatedUser
    }));
    localStorage.setItem('user', JSON.stringify({
      ...user,
      ...updatedUser
    }));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
  };

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
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
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
