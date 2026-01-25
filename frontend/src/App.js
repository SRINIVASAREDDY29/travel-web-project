import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Home from './components/Home';
import Upload from './components/Upload';
import Profile from './components/Profile';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is authenticated on app load
    const token = localStorage.getItem('token');
    const authStatus = localStorage.getItem('isAuthenticated');
    const userData = localStorage.getItem('user');
    
    if (token && authStatus === 'true' && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <div className="App">
        <Navbar 
          isAuthenticated={isAuthenticated} 
          user={user} 
          onLogout={handleLogout} 
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
                isAuthenticated ? <Profile user={user} /> : <Navigate to="/login" replace />
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
