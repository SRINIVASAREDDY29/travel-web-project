import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI, usersAPI } from '../utils/api';
import { connectSocket, getSocket, disconnectSocket } from '../utils/socket';
import './Chat.css';

function Chat({ user }) {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const socketRef = useRef(null);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.on('newMessage', (message) => {
      setActiveChat((current) => {
        const partnerId = message.sender === user.id ? message.receiver : message.sender;
        if (current && current.userId === partnerId) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === message._id)) return prev;
            return [...prev, message];
          });

          if (message.sender !== user.id) {
            chatAPI.markAsRead(message.sender).catch(() => {});
            socket.emit('markAsRead', { senderId: message.sender });
          }
        }
        return current;
      });

      refreshConversations();
    });

    socket.on('onlineUsers', (users) => {
      setOnlineUsers(users);
    });

    socket.on('userTyping', ({ userId }) => {
      setActiveChat((current) => {
        if (current && current.userId === userId) {
          setTypingUser(userId);
        }
        return current;
      });
    });

    socket.on('userStopTyping', ({ userId }) => {
      setTypingUser((current) => (current === userId ? null : current));
    });

    socket.on('messagesRead', () => {
      setMessages((prev) => prev.map((m) => ({ ...m, read: true })));
    });

    return () => {
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshConversations = () => {
    chatAPI.getConversations()
      .then((data) => setConversations(data.conversations || []))
      .catch(() => {});
  };

  const fetchConversations = async () => {
    try {
      setLoadingConvos(true);
      const data = await chatAPI.getConversations();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoadingConvos(false);
    }
  };

  const openChat = async (chatUser) => {
    const partner = {
      userId: chatUser.userId || chatUser._id || chatUser.id,
      username: chatUser.username,
      profilePhoto: chatUser.profilePhoto
    };

    setActiveChat(partner);
    setMessages([]);
    setLoadingMessages(true);
    setSearchQuery('');
    setSearchResults([]);
    setTypingUser(null);
    setShowSidebar(false);

    try {
      const data = await chatAPI.getMessages(partner.userId);
      setMessages(data.messages || []);

      await chatAPI.markAsRead(partner.userId).catch(() => {});
      const socket = getSocket();
      if (socket) socket.emit('markAsRead', { senderId: partner.userId });

      refreshConversations();
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const socket = getSocket();
    if (!socket?.connected) return;

    socket.emit('sendMessage', {
      receiverId: activeChat.userId,
      text: newMessage.trim()
    });

    socket.emit('stopTyping', { receiverId: activeChat.userId });
    setNewMessage('');
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    const socket = getSocket();
    if (!socket || !activeChat) return;

    socket.emit('typing', { receiverId: activeChat.userId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', { receiverId: activeChat.userId });
    }, 2000);
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const data = await usersAPI.search(query);
        setSearchResults(data.users || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const isOnline = (userId) => onlineUsers.includes(userId);

  const getPhotoUrl = (photo) => {
    if (!photo) return null;
    if (photo.startsWith('http')) return photo;
    return `${API_BASE}${photo}`;
  };

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className={`chat-sidebar ${showSidebar ? 'active' : ''}`}>
        <div className="chat-sidebar-header">
          <h2>Messages</h2>
        </div>

        <div className="chat-search">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={handleSearch}
            className="chat-search-input"
          />
        </div>

        {searchQuery.trim() ? (
          <div className="chat-list">
            {searching ? (
              <div className="chat-empty">Searching...</div>
            ) : searchResults.length === 0 ? (
              <div className="chat-empty">No users found</div>
            ) : (
              searchResults.map((u) => (
                <div
                  key={u._id}
                  className="chat-list-item"
                  onClick={() => openChat({ userId: u._id, username: u.username, profilePhoto: u.profilePhoto })}
                >
                  <div className="chat-avatar-wrapper">
                    {getPhotoUrl(u.profilePhoto) ? (
                      <img src={getPhotoUrl(u.profilePhoto)} alt="" className="chat-avatar" />
                    ) : (
                      <div className="chat-avatar-placeholder">{u.username[0].toUpperCase()}</div>
                    )}
                    {isOnline(u._id) && <span className="online-dot" />}
                  </div>
                  <div className="chat-list-info">
                    <span className="chat-list-name">{u.username}</span>
                    <span className="chat-list-preview">Start a conversation</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="chat-list">
            {loadingConvos ? (
              <div className="chat-empty">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="chat-empty">
                <p>No conversations yet</p>
                <p className="chat-empty-hint">Search for users to start chatting</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.userId}
                  className={`chat-list-item ${activeChat?.userId === conv.userId.toString() ? 'active' : ''}`}
                  onClick={() => openChat(conv)}
                >
                  <div className="chat-avatar-wrapper">
                    {getPhotoUrl(conv.profilePhoto) ? (
                      <img src={getPhotoUrl(conv.profilePhoto)} alt="" className="chat-avatar" />
                    ) : (
                      <div className="chat-avatar-placeholder">{conv.username[0].toUpperCase()}</div>
                    )}
                    {isOnline(conv.userId.toString()) && <span className="online-dot" />}
                  </div>
                  <div className="chat-list-info">
                    <div className="chat-list-top">
                      <span className="chat-list-name">{conv.username}</span>
                      <span className="chat-list-time">{formatTime(conv.lastMessageAt)}</span>
                    </div>
                    <div className="chat-list-bottom">
                      <span className="chat-list-preview">
                        {conv.lastSender?.toString() === user.id ? 'You: ' : ''}
                        {conv.lastMessage?.length > 35
                          ? conv.lastMessage.substring(0, 35) + '...'
                          : conv.lastMessage}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="unread-badge">{conv.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Chat Window */}
      <div className={`chat-window ${!showSidebar ? 'active' : ''}`}>
        {activeChat ? (
          <>
            <div className="chat-window-header">
              <button className="back-button" onClick={() => setShowSidebar(true)}>
                &#8592;
              </button>
              <div className="chat-avatar-wrapper small">
                {getPhotoUrl(activeChat.profilePhoto) ? (
                  <img src={getPhotoUrl(activeChat.profilePhoto)} alt="" className="chat-avatar small" />
                ) : (
                  <div className="chat-avatar-placeholder small">
                    {activeChat.username[0].toUpperCase()}
                  </div>
                )}
                {isOnline(activeChat.userId) && <span className="online-dot small" />}
              </div>
              <div className="chat-header-info">
                <span className="chat-header-name">{activeChat.username}</span>
                <span className="chat-header-status">
                  {typingUser === activeChat.userId
                    ? 'typing...'
                    : isOnline(activeChat.userId)
                    ? 'Online'
                    : 'Offline'}
                </span>
              </div>
            </div>

            <div className="chat-messages">
              {loadingMessages ? (
                <div className="chat-empty">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="chat-empty">
                  <p>No messages yet</p>
                  <p className="chat-empty-hint">Say hello!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`chat-message ${msg.sender === user.id ? 'sent' : 'received'}`}
                  >
                    <div className="message-bubble">
                      <p className="message-text">{msg.text}</p>
                      <div className="message-meta">
                        <span className="message-time">{formatTime(msg.createdAt)}</span>
                        {msg.sender === user.id && (
                          <span className="message-status">{msg.read ? '✓✓' : '✓'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={sendMessage}>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={handleTyping}
                className="chat-input"
                maxLength={2000}
              />
              <button
                type="submit"
                className="chat-send-button"
                disabled={!newMessage.trim()}
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="chat-placeholder">
            <div className="chat-placeholder-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose a user from the sidebar or search for someone to chat with</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
