import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  Chip,
  CircularProgress,
  useTheme,
} from '@mui/material';
import { Chat as ChatIcon, ChatBubbleOutline } from '@mui/icons-material';
import { useChatShortcut } from '../../context/ChatShortcutContext';

const ChatPopup = () => {
  const { recentChats, onlineUsers, openMiniChat, loading } = useChatShortcut();
  const theme = useTheme();

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const getInitials = (user) => {
    if (!user) return '?';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const handleChatClick = (chat) => {
    openMiniChat(chat);
  };

  if (loading) {
    return (
      <Box>
        <Box
          sx={{
            p: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.grey[50],
          }}
        >
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', fontSize: '1rem' }}>
            <ChatIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
            Recent Chats
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
          }}
        >
          <CircularProgress size={24} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Loading chats...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.grey[50],
        }}
      >
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', fontSize: '1rem' }}>
          <ChatIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
          Recent Chats
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
        {recentChats.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: 4,
              textAlign: 'center',
            }}
          >
            <ChatBubbleOutline sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="body2" color="text.primary" sx={{ mb: 1 }}>
              No recent chats
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Start a conversation from the Messages page
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {recentChats.map((chat) => {
              const otherUser = chat.otherParticipant;
              const isOnline = isUserOnline(otherUser?._id);
              
              return (
                <ListItem
                  key={chat._id}
                  button
                  onClick={() => handleChatClick(chat)}
                  sx={{
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                    },
                    '&:last-child': {
                      borderBottom: 'none',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      variant="dot"
                      invisible={!isOnline}
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
                            border: `2px solid ${theme.palette.background.paper}`,
                            content: '""',
                          },
                        },
                      }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: theme.palette.primary.main,
                          width: 40,
                          height: 40,
                          fontSize: '0.875rem',
                        }}
                      >
                        {getInitials(otherUser)}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" noWrap>
                        {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Unknown User'}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {chat.lastMessage ? (
                          <>
                            {chat.lastMessage.sender?._id === chat.otherParticipant?._id ? '' : 'You: '}
                            {chat.lastMessage.content || 'Attachment'}
                          </>
                        ) : (
                          'No messages yet'
                        )}
                      </Typography>
                    }
                  />
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                    {chat.lastMessage && (
                      <Typography variant="caption" color="text.secondary">
                        {formatLastSeen(chat.lastMessage.createdAt)}
                      </Typography>
                    )}
                    {chat.unreadCount > 0 && (
                      <Chip
                        label={chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                        size="small"
                        color="error"
                        sx={{
                          height: 20,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          minWidth: 20,
                        }}
                      />
                    )}
                  </Box>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default ChatPopup;
