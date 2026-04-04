const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const getToken = () => localStorage.getItem('token');

export const getMediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  return `${SERVER_BASE_URL}${path}`;
};

const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// --- Response handler ---

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

// --- Token refresh machinery ---

let refreshPromise = null;

export const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) throw new Error('Token refresh failed');

  const data = await response.json();
  localStorage.setItem('token', data.token);
  return data.token;
};

const forceLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

const fetchWithAuth = async (url, options = {}) => {
  let response = await fetch(url, options);

  if (response.status !== 401 || url.includes('/auth/')) {
    return handleResponse(response);
  }

  // Access token expired — try silent refresh
  try {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;

    // Retry the original request with the fresh token
    const retryHeaders = { ...(options.headers || {}) };
    retryHeaders['Authorization'] = `Bearer ${newToken}`;
    response = await fetch(url, { ...options, headers: retryHeaders });
    return handleResponse(response);
  } catch {
    forceLogout();
    throw new Error('Session expired. Please log in again.');
  }
};

// --- API modules ---

export const authAPI = {
  register: async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return handleResponse(response);
  },

  login: async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return handleResponse(response);
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return;
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
    } catch {
      // Ignore — local cleanup still happens
    }
  }
};

export const postsAPI = {
  getAll: async (page = 1, limit = 12) => {
    return fetchWithAuth(`${API_BASE_URL}/posts?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
  },

  getById: async (id) => {
    return fetchWithAuth(`${API_BASE_URL}/posts/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
  },

  getByUserId: async (userId) => {
    return fetchWithAuth(`${API_BASE_URL}/posts/user/${userId}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
  },

  getMyPosts: async () => {
    return fetchWithAuth(`${API_BASE_URL}/posts/my-posts`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
  },

  create: async (file, mediaType, description) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mediaType', mediaType);
    if (description) {
      formData.append('description', description);
    }

    const token = getToken();
    return fetchWithAuth(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: formData
    });
  },

  update: async (id, description) => {
    return fetchWithAuth(`${API_BASE_URL}/posts/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ description })
    });
  },

  delete: async (id) => {
    return fetchWithAuth(`${API_BASE_URL}/posts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  }
};

export const usersAPI = {
  search: async (query) => {
    return fetchWithAuth(`${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
  },

  getById: async (id) => {
    return fetchWithAuth(`${API_BASE_URL}/users/${id}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
  }
};

export const chatAPI = {
  getConversations: async () => {
    return fetchWithAuth(`${API_BASE_URL}/chat/conversations`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
  },

  getMessages: async (userId, before = null) => {
    let url = `${API_BASE_URL}/chat/messages/${userId}`;
    if (before) url += `?before=${encodeURIComponent(before)}`;
    return fetchWithAuth(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
  },

  markAsRead: async (senderId) => {
    return fetchWithAuth(`${API_BASE_URL}/chat/read/${senderId}`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
  }
};

export const profileAPI = {
  getMe: async () => {
    return fetchWithAuth(`${API_BASE_URL}/profile/me`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
  },

  updatePhoto: async (file) => {
    const formData = new FormData();
    formData.append('profilePhoto', file);

    const token = getToken();
    return fetchWithAuth(`${API_BASE_URL}/profile/photo`, {
      method: 'PUT',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: formData
    });
  }
};
