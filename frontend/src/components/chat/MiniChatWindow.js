import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Paper,
  Box,
  Typography,
  Avatar,
  IconButton,
  TextField,
  CircularProgress,
  Badge,
  useTheme,
  useMediaQuery,
  Slide,
} from '@mui/material';
import { Close as CloseIcon, ChatBubbleOutline } from '@mui/icons-material';
import { useChatShortcut } from '../../context/ChatShortcutContext';
import { useAuth } from '../../context/AuthContext';
import { chatAPI } from '../../utils/api';
import socketService from '../../utils/socket';

const MiniChatWindow = () => {
  const { user } = useAuth();
  const { activeMiniChat, closeMiniChat, updateChatAfterMessage, onlineUsers } = useChatShortcut();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const otherUser = activeMiniChat?.otherParticipant;

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load messages for the active chat
  const loadMessages = useCallback(async () => {
    if (!activeMiniChat?._id) return;

    try {
      setLoading(true);
      const response = await chatAPI.getChatMessages(activeMiniChat._id, {
        page: 1,
        limit: 50
      });

      if (response.data.success) {
        setMessages(response.data.messages.reverse());
        
        // Mark messages as read
        const unreadMessages = response.data.messages.filter(
          msg => !msg.readBy.some(read => read.user === user._id)
        );
        
        if (unreadMessages.length > 0) {
          const unreadMessageIds = unreadMessages.map(msg => msg._id);
          socketService.markMessagesRead(activeMiniChat._id, unreadMessageIds);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [activeMiniChat?._id, user._id]);

  // Initialize chat when activeMiniChat changes
  useEffect(() => {
    if (activeMiniChat) {
      setMessages([]);
      loadMessages();
      
      // Focus input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [activeMiniChat, loadMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket event listeners
  useEffect(() => {
    if (!activeMiniChat) return;

    const handleNewMessage = (messageData) => {
      if (messageData.chatId === activeMiniChat._id) {
        const newMsg = {
          _id: messageData.messageId,
          content: messageData.content,
          sender: messageData.sender,
          createdAt: messageData.createdAt,
          attachments: messageData.attachments || [],
          readBy: [{ user: user._id, readAt: new Date() }]
        };
        
        setMessages(prev => [...prev, newMsg]);
        
        // Mark as read immediately
        socketService.markMessagesRead(activeMiniChat._id, [messageData.messageId]);
      }
    };

    socketService.on('new_message', handleNewMessage);

    return () => {
      socketService.off('new_message', handleNewMessage);
    };
  }, [activeMiniChat, user._id]);

  // Handle sending message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending || !activeMiniChat) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const formData = new FormData();
      formData.append('content', messageContent);

      const response = await chatAPI.sendMessage(activeMiniChat._id, formData);
      
      if (response.data.success) {
        const sentMessage = response.data.message;
        
        // Add message to local state
        setMessages(prev => [...prev, sentMessage]);
        
        // Emit via socket for real-time delivery
        socketService.sendMessage(
          activeMiniChat._id, 
          sentMessage.content, 
          sentMessage._id, 
          sentMessage.attachments
        );
        
        // Update chat in context
        updateChatAfterMessage(activeMiniChat._id, sentMessage);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Re-add message to input on error
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  // Handle input key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Format message time
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get user initials
  const getInitials = (user) => {
    if (!user) return '?';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Check if user is online
  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  if (!activeMiniChat) return null;

  return (
    <Slide direction="up" in={true} mountOnEnter unmountOnExit>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: isMobile ? 16 : 24,
          right: isMobile ? 80 : 100,
          width: isMobile ? 'calc(100vw - 100px)' : 350,
          height: isMobile ? 'calc(100vh - 100px)' : 450,
          borderRadius: 2,
          overflow: 'hidden',
          zIndex: theme.zIndex.modal - 2,
          display: 'flex',
          flexDirection: 'column',
          background: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            color: theme.palette.primary.contrastText,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              variant="dot"
              invisible={!isUserOnline(otherUser?._id)}
              sx={{
                '& .MuiBadge-badge': {
                  backgroundColor: theme.palette.success.main,
                  color: theme.palette.success.main,
                  '&::after': {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: `2px solid ${theme.palette.primary.contrastText}`,
                    content: '""',
                  },
                },
              }}
            >
              <Avatar
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  width: 32,
                  height: 32,
                  fontSize: '0.875rem',
                  color: theme.palette.primary.contrastText,
                }}
              >
                {getInitials(otherUser)}
              </Avatar>
            </Badge>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
              {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Unknown User'}
            </Typography>
          </Box>
          <IconButton
            onClick={closeMiniChat}
            size="small"
            sx={{
              color: theme.palette.primary.contrastText,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Messages */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
            backgroundColor: theme.palette.grey[50],
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 4,
              }}
            >
              <CircularProgress size={24} sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Loading messages...
              </Typography>
            </Box>
          ) : messages.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 4,
                textAlign: 'center',
              }}
            >
              <ChatBubbleOutline sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                No messages yet
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Start the conversation!
              </Typography>
            </Box>
          ) : (
            messages.map((message) => {
              const senderId = message.sender?._id || message.sender?.id;
              const currentUserId = user?._id || user?.id;
              const isOwnMessage = senderId === currentUserId;
              
              return (
                <Box
                  key={message._id}
                  sx={{
                    display: 'flex',
                    justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                    mb: 1.5,
                  }}
                >
                  <Paper
                    elevation={1}
                    sx={{
                      maxWidth: '75%',
                      p: 1.5,
                      borderRadius: 2,
                      backgroundColor: isOwnMessage 
                        ? theme.palette.primary.main 
                        : theme.palette.background.paper,
                      color: isOwnMessage 
                        ? theme.palette.primary.contrastText 
                        : theme.palette.text.primary,
                      borderBottomRightRadius: isOwnMessage ? 4 : 16,
                      borderBottomLeftRadius: isOwnMessage ? 16 : 4,
                    }}
                  >
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {message.content}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 0.5,
                        opacity: 0.8,
                        textAlign: isOwnMessage ? 'right' : 'left',
                      }}
                    >
                      {formatMessageTime(message.createdAt)}
                    </Typography>
                  </Paper>
                </Box>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Input */}
        <Box
          sx={{
            p: 2,
            backgroundColor: theme.palette.background.paper,
            borderTop: `1px solid ${theme.palette.divider}`,
            flexShrink: 0,
          }}
        >
          <form onSubmit={handleSendMessage}>
            <TextField
              ref={inputRef}
              fullWidth
              size="small"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  backgroundColor: theme.palette.background.default,
                },
              }}
            />
          </form>
        </Box>
      </Paper>
    </Slide>
  );
};

export default MiniChatWindow;
