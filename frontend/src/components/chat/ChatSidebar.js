import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  Chip,
  Button,
  Paper,
  InputAdornment,
  IconButton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search,
  Chat,
  People,
  PersonAdd,
  Check,
  Close,
  AccessTime,
  Circle,
  ChatBubbleOutline,
  PersonOutline,
  ConnectWithoutContact,
} from '@mui/icons-material';

const ChatSidebar = ({
  chats,
  availableUsers,
  connectionRequests,
  selectedChat,
  searchQuery,
  onSearchChange,
  onChatSelect,
  onStartNewChat,
  onConnectionRequestResponse,
  onlineUsers,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState('chats');
  const theme = useTheme();

  const formatLastSeen = (date) => {
    if (!date) return '';
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return messageDate.toLocaleDateString();
  };

  const getUserInitials = (user) => {
    if (!user) return '?';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const renderChatItem = (chat) => {
    const otherUser = chat.otherParticipant;
    const isSelected = selectedChat?._id === chat._id;
    const isOnline = isUserOnline(otherUser?._id);

    return (
      <ListItem
        key={chat._id}
        button
        selected={isSelected}
        onClick={() => onChatSelect(chat)}
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          '&.Mui-selected': {
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            borderLeft: `3px solid ${theme.palette.primary.main}`,
          },
          '&:hover': {
            bgcolor: alpha(theme.palette.action.hover, 0.5),
          },
        }}
      >
        <ListItemAvatar>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              isOnline ? (
                <Circle
                  sx={{
                    color: 'success.main',
                    fontSize: '0.75rem',
                  }}
                />
              ) : null
            }
          >
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'grey.500',
                fontSize: '1rem',
                fontWeight: 'bold',
              }}
            >
              {getUserInitials(otherUser)}
            </Avatar>
          </Badge>
        </ListItemAvatar>

        <ListItemText
          primary={
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Unknown User'}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 1, flexShrink: 0 }}
              >
                {chat.lastMessage ? formatLastSeen(chat.lastMessage.createdAt) : ''}
              </Typography>
            </Box>
          }
          secondary={
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {chat.lastMessage ? (
                    <>
                      {chat.lastMessage.sender?._id === currentUser._id && (
                        <Check sx={{ fontSize: '0.875rem', mr: 0.5 }} />
                      )}
                      {chat.lastMessage.content}
                    </>
                  ) : (
                    <em>No messages yet</em>
                  )}
                </Typography>
                
                {chat.unreadCount > 0 && (
                  <Chip
                    label={chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                    size="small"
                    color="primary"
                    sx={{
                      height: '20px',
                      fontSize: '0.75rem',
                      ml: 1,
                      flexShrink: 0,
                    }}
                  />
                )}
              </Box>
              
              <Typography variant="caption" color="text.secondary">
                {otherUser?.role}
              </Typography>
            </Box>
          }
        />
      </ListItem>
    );
  };

  const renderUserItem = (user) => {
    const isOnline = isUserOnline(user._id);

    return (
      <ListItem
        key={user._id}
        button
        onClick={() => onStartNewChat(user)}
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          '&:hover': {
            bgcolor: alpha(theme.palette.action.hover, 0.5),
          },
        }}
      >
        <ListItemAvatar>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              isOnline ? (
                <Circle
                  sx={{
                    color: 'success.main',
                    fontSize: '0.625rem',
                  }}
                />
              ) : null
            }
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'grey.500',
                fontSize: '0.875rem',
                fontWeight: 'bold',
              }}
            >
              {getUserInitials(user)}
            </Avatar>
          </Badge>
        </ListItemAvatar>

        <ListItemText
          primary={
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.firstName} {user.lastName}
            </Typography>
          }
          secondary={
            <Box>
              <Typography variant="caption" color="text.secondary">
                {user.role}
              </Typography>
              
              {/* Connection Status */}
              <Box sx={{ mt: 0.5 }}>
                {!user.canChat && user.needsApproval && (
                  <Chip
                    label={user.hasPendingRequest ? 'Request Sent' : 'Requires Connection'}
                    size="small"
                    color="warning"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: '20px' }}
                  />
                )}
                {user.canChat && (
                  <Chip
                    label="Can Chat"
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: '20px' }}
                  />
                )}
              </Box>
            </Box>
          }
        />

        {/* Action Icon */}
        <Box sx={{ ml: 1 }}>
          {user.canChat ? (
            <ChatBubbleOutline color="primary" />
          ) : user.hasPendingRequest ? (
            <AccessTime color="warning" />
          ) : (
            <PersonAdd color="action" />
          )}
        </Box>
      </ListItem>
    );
  };

  const renderConnectionRequest = (request) => {
    return (
      <Paper
        key={request._id}
        elevation={1}
        sx={{
          p: 2,
          mb: 2,
          bgcolor: 'grey.50',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
          {/* Avatar */}
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'primary.main',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              mr: 2,
            }}
          >
            {getUserInitials(request.requester)}
          </Avatar>

          {/* Request Info */}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {request.requester.firstName} {request.requester.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {request.requester.role} • {formatLastSeen(request.createdAt)}
            </Typography>
            
            {request.message && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 2,
                  fontStyle: 'italic',
                  p: 1,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                "{request.message}"
              </Typography>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<Check />}
                onClick={() => onConnectionRequestResponse(request._id, 'approve')}
              >
                Approve
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                startIcon={<Close />}
                onClick={() => onConnectionRequestResponse(request._id, 'reject')}
              >
                Decline
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: 'grey.50',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <ChatBubbleOutline />
          Messages
        </Typography>

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search conversations or users..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              minHeight: '40px',
              fontSize: '0.875rem',
            },
          }}
        >
          <Tab
            icon={<Chat />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                Chats
                {chats.length > 0 && (
                  <Chip
                    label={chats.length}
                    size="small"
                    color="default"
                    sx={{ height: '16px', fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            }
            iconPosition="start"
          />
          <Tab
            icon={<People />}
            label="Users"
            iconPosition="start"
          />
          {['Admin', 'Vice President'].includes(currentUser?.role) && (
            <Tab
              icon={<ConnectWithoutContact />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  Requests
                  {connectionRequests.length > 0 && (
                    <Chip
                      label={connectionRequests.length}
                      size="small"
                      color="error"
                      sx={{ height: '16px', fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              }
              iconPosition="start"
            />
          )}
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {activeTab === 0 && (
          <Box>
            {chats.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  p: 4,
                  color: 'text.secondary',
                }}
              >
                <Box sx={{ fontSize: '4rem', mb: 2 }}>💬</Box>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  No conversations yet
                </Typography>
                <Typography variant="body2">
                  Start a new chat from the Users tab
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {chats.map(renderChatItem)}
              </List>
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            {availableUsers.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  p: 4,
                  color: 'text.secondary',
                }}
              >
                <Box sx={{ fontSize: '4rem', mb: 2 }}>👥</Box>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  No users found
                </Typography>
                {searchQuery && (
                  <Typography variant="body2">
                    Try a different search term
                  </Typography>
                )}
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {availableUsers.map(renderUserItem)}
              </List>
            )}
          </Box>
        )}

        {activeTab === 2 && (
          <Box sx={{ p: 2 }}>
            {connectionRequests.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  color: 'text.secondary',
                }}
              >
                <Box sx={{ fontSize: '4rem', mb: 2 }}>✅</Box>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  No pending requests
                </Typography>
                <Typography variant="body2">
                  Connection requests will appear here
                </Typography>
              </Box>
            ) : (
              connectionRequests.map(renderConnectionRequest)
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ChatSidebar;
