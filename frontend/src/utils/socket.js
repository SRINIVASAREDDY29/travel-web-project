import { io } from 'socket.io-client';
import { refreshAccessToken } from './api';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: (cb) => {
      cb({ token: localStorage.getItem('token') || token });
    },
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('connect_error', async (err) => {
    console.error('Socket connection error:', err.message);
    if (err.message.includes('token') || err.message.includes('Authentication')) {
      try {
        await refreshAccessToken();
      } catch {
        // Refresh failed — API layer handles logout on next request
      }
    }
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
