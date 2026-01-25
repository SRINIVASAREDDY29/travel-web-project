const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token from localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  let data;
  const contentType = response.headers.get('content-type');
  
  try {
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (parseError) {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText || 'Server error'}`);
    }
    throw parseError;
  }
  
  if (!response.ok) {
    // Handle validation errors with array
    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      const firstError = data.errors[0];
      const errorMessage = firstError.msg || firstError.message || data.message || 'Validation failed';
      throw new Error(errorMessage);
    }
    const error = data.message || data.error || 'Something went wrong';
    throw new Error(error);
  }
  
  return data;
};

// Auth API
export const authAPI = {
  register: async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    return handleResponse(response);
  },

  login: async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    return handleResponse(response);
  }
};

// Posts API
export const postsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getByUserId: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/posts/user/${userId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getMyPosts: async () => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/posts/my-posts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    return handleResponse(response);
  },

  create: async (file, mediaType, description) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mediaType', mediaType);
    if (description) {
      formData.append('description', description);
    }

    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
        // Don't set Content-Type, let browser set it with boundary for FormData
      },
      body: formData
    });
    return handleResponse(response);
  },

  update: async (id, description) => {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ description })
    });
    return handleResponse(response);
  },

  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};
