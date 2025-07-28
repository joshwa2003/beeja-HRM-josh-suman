import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  Avatar,
  Chip,
  Paper,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Send,
  AttachFile,
  Circle,
  Close,
} from '@mui/icons-material';
import { chatAPI } from '../../utils/api';
import socketService from '../../utils/socket';
import MessageBubble from './MessageBubble';

const ChatWindow = ({ chat, currentUser, onChatUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const theme = useTheme();

  const otherUser = chat.otherParticipant;

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load messages
  const loadMessages = useCallback(async (pageNum = 1, append = false) => {
    if (!chat._id) return;

    setLoading(true);
    try {
      const response = await chatAPI.getChatMessages(chat._id, {
        page: pageNum,
        limit: 50
      });

      if (response.data.success) {
        const newMessages = response.data.messages;
        
        if (append) {
          setMessages(prev => [...newMessages, ...prev]);
        } else {
          setMessages(newMessages);
          setTimeout(scrollToBottom, 100);
        }
        
        setHasMore(response.data.pagination.hasMore);
        
        // Mark messages as read
        const unreadMessageIds = newMessages
          .filter(msg => msg.sender._id !== currentUser._id && !msg.readBy?.some(r => r.user === currentUser._id))
          .map(msg => msg._id);
          
        if (unreadMessageIds.length > 0) {
          socketService.markMessagesRead(chat._id, unreadMessageIds);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [chat._id, currentUser._id]);

  // Load more messages (pagination)
  const loadMoreMessages = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadMessages(nextPage, true);
    }
  };

  // Initialize chat
  useEffect(() => {
    if (chat._id) {
      setMessages([]);
      setPage(1);
      setHasMore(true);
      loadMessages(1, false);
      
      // Join chat room
      socketService.joinChat(chat._id);
    }

    return () => {
      if (chat._id) {
        socketService.leaveChat(chat._id);
      }
    };
  }, [chat._id, loadMessages]);

  // Socket event listeners
  useEffect(() => {
    const handleNewMessage = (messageData) => {
      if (messageData.chatId === chat._id) {
        console.log('Received new message via socket:', messageData);
        
        const newMessage = {
          _id: messageData.messageId,
          content: messageData.content,
          sender: messageData.sender,
          createdAt: messageData.createdAt,
          messageType: messageData.attachments && messageData.attachments.length > 0 ? 'file' : 'text',
          attachments: messageData.attachments || [],
          readBy: [],
          deliveredTo: []
        };
        
        setMessages(prev => [...prev, newMessage]);
        setTimeout(scrollToBottom, 100);
        
        // Mark as read immediately since user is viewing the chat
        socketService.markMessagesRead(chat._id, [messageData.messageId]);
      }
    };

    const handleUserTyping = (data) => {
      if (data.chatId === chat._id && data.userId !== currentUser._id) {
        setTypingUsers(prev => new Set([...prev, data.userId]));
      }
    };

    const handleUserStopTyping = (data) => {
      if (data.chatId === chat._id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    };

    const handleMessagesRead = (data) => {
      if (data.chatId === chat._id) {
        setMessages(prev => 
          prev.map(msg => {
            if (data.messageIds.includes(msg._id)) {
              return {
                ...msg,
                readBy: [...(msg.readBy || []), { user: data.userId, readAt: new Date() }]
              };
            }
            return msg;
          })
        );
      }
    };

    socketService.on('new_message', handleNewMessage);
    socketService.on('user_typing', handleUserTyping);
    socketService.on('user_stop_typing', handleUserStopTyping);
    socketService.on('messages_read', handleMessagesRead);

    return () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('user_typing', handleUserTyping);
      socketService.off('user_stop_typing', handleUserStopTyping);
      socketService.off('messages_read', handleMessagesRead);
    };
  }, [chat._id, currentUser._id]);

  // Handle typing indicators
  const handleTyping = () => {
    socketService.startTyping(chat._id);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(chat._id);
    }, 2000);
  };

  // Handle message input change
  const handleMessageChange = (e) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      // Limit file size to 10MB
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return false;
      }
      return true;
    });

    if (attachments.length + validFiles.length > 5) {
      setError('Maximum 5 files allowed per message');
      return;
    }

    setAttachments(prev => [...prev, ...validFiles]);
    e.target.value = ''; // Reset input
  };

  // Remove attachment
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if ((!newMessage.trim() && attachments.length === 0) || sending) {
      return;
    }

    setSending(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('content', newMessage.trim() || 'File attachment');
      
      // Add attachments
      attachments.forEach(file => {
        formData.append('files', file);
      });

      const response = await chatAPI.sendMessage(chat._id, formData);
      
      if (response.data.success) {
        const sentMessage = response.data.message;
        
        // Add message to local state
        setMessages(prev => [...prev, sentMessage]);
        
        // Emit via socket for real-time delivery
        socketService.sendMessage(chat._id, sentMessage.content, sentMessage._id, sentMessage.attachments);
        
        // Clear form
        setNewMessage('');
        setAttachments([]);
        
        // Stop typing indicator
        socketService.stopTyping(chat._id);
        
        // Scroll to bottom
        setTimeout(scrollToBottom, 100);
        
        // Update chat in parent component
        onChatUpdate({
          ...chat,
          lastMessage: sentMessage,
          lastActivity: sentMessage.createdAt
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Handle scroll for pagination
  const handleScroll = (e) => {
    const { scrollTop } = e.target;
    if (scrollTop === 0 && hasMore && !loading) {
      loadMoreMessages();
    }
  };

  const getUserInitials = (user) => {
    if (!user) return '?';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '91vh',
        m: 0,
        p: 0,
      }}
    >
      {/* Chat Header */}
      <Paper
        elevation={1}
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ mr: 2, position: 'relative' }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.main',
                fontSize: '0.875rem',
                fontWeight: 'bold',
              }}
            >
              {getUserInitials(otherUser)}
            </Avatar>
            {/* Online Status Indicator */}
            <Circle
              sx={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                color: 'success.main',
                fontSize: '0.75rem',
                bgcolor: 'background.paper',
                borderRadius: '50%',
              }}
              titleAccess="Online"
            />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Unknown User'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {otherUser?.role}
              </Typography>
              <Chip
                icon={<Circle sx={{ fontSize: '0.5rem' }} />}
                label="Online"
                size="small"
                color="success"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: '20px' }}
              />
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Messages Container */}
      <Box
        ref={messagesContainerRef}
        onScroll={handleScroll}
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          px: 2,
          py: 1,
          minHeight: 0,
          maxHeight: 'calc(100vh - 200px)',
        }}
      >
        {loading && page === 1 && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {hasMore && (
          <Box sx={{ textAlign: 'center', py: 1 }}>
            <Button
              variant="text"
              size="small"
              onClick={loadMoreMessages}
              disabled={loading}
              sx={{ color: 'text.secondary' }}
            >
              {loading ? 'Loading...' : 'Load more messages'}
            </Button>
          </Box>
        )}

        {messages.length === 0 && !loading ? (
          <Box
            sx={{
              textAlign: 'center',
              color: 'text.secondary',
              py: 5,
            }}
          >
            <Box sx={{ fontSize: '4rem', mb: 2 }}>💬</Box>
            <Typography variant="body1" sx={{ mb: 1 }}>
              No messages yet
            </Typography>
            <Typography variant="body2">
              Start the conversation by sending a message
            </Typography>
          </Box>
        ) : (
          messages.map((message, index) => (
            <MessageBubble
              key={message._id}
              message={message}
              currentUser={currentUser}
              isLastMessage={index === messages.length - 1}
              showAvatar={
                index === 0 || 
                messages[index - 1].sender._id !== message.sender._id
              }
            />
          ))
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Typing Indicator Section */}
      {typingUsers.size > 0 && (
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            borderTop: `1px solid ${theme.palette.divider}`,
            borderBottom: `1px solid ${theme.palette.divider}`,
            px: 2,
            py: 1,
            flexShrink: 0,
            zIndex: 999,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: 'grey.500',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                mr: 1,
              }}
            >
              {getUserInitials(otherUser)}
            </Avatar>
            <Paper
              elevation={1}
              sx={{
                bgcolor: 'grey.100',
                px: 2,
                py: 1,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  mr: 1,
                }}
              >
                {[0, 1, 2].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      width: '6px',
                      height: '6px',
                      bgcolor: '#999',
                      borderRadius: '50%',
                      animation: 'typing 1.4s infinite ease-in-out',
                      animationDelay: i === 0 ? '-0.32s' : i === 1 ? '-0.16s' : '0s',
                      '@keyframes typing': {
                        '0%, 80%, 100%': {
                          transform: 'scale(0.8)',
                          opacity: 0.5,
                        },
                        '40%': {
                          transform: 'scale(1)',
                          opacity: 1,
                        },
                      },
                    }}
                  />
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary">
                typing...
              </Typography>
            </Paper>
          </Box>
        </Paper>
      )}

      {/* Message Input at Bottom */}
      <Paper
        elevation={3}
        sx={{
          bgcolor: 'background.paper',
          borderTop: `1px solid ${theme.palette.divider}`,
          p: 2,
          flexShrink: 0,
          zIndex: 1000,
        }}
      >
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {attachments.map((file, index) => (
                <Paper
                  key={index}
                  elevation={1}
                  sx={{
                    p: 1,
                    bgcolor: 'grey.50',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <AttachFile sx={{ color: 'text.secondary', fontSize: '1rem' }} />
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        display: 'block',
                        maxWidth: '150px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {file.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: '0.7rem' }}
                    >
                      {formatFileSize(file.size)}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeAttachment(index)}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Paper>
              ))}
            </Box>
          </Box>
        )}

        {/* Message Form */}
        <Box
          component="form"
          onSubmit={handleSendMessage}
          sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder="Type a message..."
                value={newMessage}
                onChange={handleMessageChange}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                disabled={sending}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '20px',
                    minHeight: '42px',
                  },
                }}
              />
              <IconButton
                color="primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                  },
                }}
              >
                <AttachFile />
              </IconButton>
            </Box>
          </Box>
          
          <IconButton
            type="submit"
            color="primary"
            disabled={sending || (!newMessage.trim() && attachments.length === 0)}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              width: 42,
              height: 42,
              '&:hover': {
                bgcolor: 'primary.dark',
              },
              '&:disabled': {
                bgcolor: 'action.disabledBackground',
                color: 'action.disabled',
              },
            }}
          >
            {sending ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <Send />
            )}
          </IconButton>
        </Box>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.zip,.rar,.7z"
          style={{ display: 'none' }}
        />

        {/* Error Message */}
        {error && (
          <Alert
            severity="error"
            onClose={() => setError('')}
            sx={{ mt: 1 }}
          >
            {error}
          </Alert>
        )}
        <style jsx>{`
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        
        .typing-indicator span {
          height: 6px;
          width: 6px;
          background-color: #999;
          border-radius: 50%;
          display: inline-block;
          animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-indicator span:nth-child(1) {
          animation-delay: -0.32s;
        }
        
        .typing-indicator span:nth-child(2) {
          animation-delay: -0.16s;
        }
        
        @keyframes typing {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
      </Paper>
    </Box>
  );
};

export default ChatWindow;
