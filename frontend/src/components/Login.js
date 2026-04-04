import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, profileAPI } from '../utils/api';
import './Login.css';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = isRegistering
        ? await authAPI.register(formData.username, formData.password)
        : await authAPI.login(formData.username, formData.password);

      localStorage.setItem('token', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('isAuthenticated', 'true');
      
      // Fetch complete profile data including profile photo
      try {
        const profileResponse = await profileAPI.getMe();
        if (profileResponse.user) {
          const completeUser = {
            ...response.user,
            ...profileResponse.user
          };
          localStorage.setItem('user', JSON.stringify(completeUser));
          onLogin(completeUser);
        } else {
          onLogin(response.user);
        }
      } catch (profileError) {
        // If profile fetch fails, use auth response
        console.error('Error fetching profile:', profileError);
        onLogin(response.user);
      }
      
      navigate('/');
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>{isRegistering ? 'Register' : 'Login'} to TravelBlog</h2>
        <p className="login-subtitle">Share your travel adventures with the world</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              required
              minLength={3}
              maxLength={30}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              minLength={6}
            />
          </div>
          
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Please wait...' : (isRegistering ? 'Register' : 'Login')}
          </button>
        </form>
        
        <p className="login-note">
          {isRegistering ? (
            <>
              Already have an account?{' '}
              <button 
                type="button" 
                onClick={() => setIsRegistering(false)}
                className="link-button"
              >
                Login here
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button 
                type="button" 
                onClick={() => setIsRegistering(true)}
                className="link-button"
              >
                Register here
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default Login;

