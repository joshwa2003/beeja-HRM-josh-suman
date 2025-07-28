import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  IconButton,
  Chip,
  ButtonGroup,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Download,
  Visibility,
  Image,
  PictureAsPdf,
  Description,
  TableChart,
  TextSnippet,
  Archive,
  InsertDriveFile,
  Check,
  DoneAll,
  Edit,
  Warning,
} from '@mui/icons-material';
import { chatAPI } from '../../utils/api';
import FilePreviewModal from './FilePreviewModal';

const MessageBubble = ({ message, currentUser, isLastMessage, showAvatar }) => {
  const [downloading, setDownloading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  
  // Enhanced debugging and comparison logic
  const senderId = message.sender?._id || message.sender?.id;
  const currentUserId = currentUser?._id || currentUser?.id;
  const isOwnMessage = senderId === currentUserId;
  const theme = useTheme();

  // Comprehensive debug logging
  console.log('🔍 MessageBubble - Alignment Debug:', {
    messageId: message._id,
    content: message.content?.substring(0, 50) + '...',
    senderId: senderId,
    currentUserId: currentUserId,
    senderName: message.sender ? `${message.sender.firstName} ${message.sender.lastName}` : 'Unknown',
    currentUserName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Unknown',
    isOwnMessage: isOwnMessage,
    shouldBeOnRight: isOwnMessage ? '✅ YES - RIGHT SIDE' : '❌ NO - LEFT SIDE',
    messageObject: {
      sender: message.sender,
      currentUser: currentUser
    }
  });

  // Additional debug for attachments
  if (message.attachments && message.attachments.length > 0) {
    console.log('MessageBubble - Attachment details:', message.attachments.map(att => ({
      fileName: att.fileName,
      originalName: att.originalName,
      mimeType: att.mimeType,
      fileSize: att.fileSize
    })));
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getUserInitials = (user) => {
    if (!user) return '?';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.includes('pdf')) return PictureAsPdf;
    if (mimeType.includes('word') || mimeType.includes('document')) return Description;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return TableChart;
    if (mimeType.includes('text')) return TextSnippet;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('compressed')) return Archive;
    return InsertDriveFile;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadAttachment = async (attachment) => {
    setDownloading(true);
    try {
      const response = await chatAPI.downloadAttachment(message._id, attachment.fileName);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: attachment.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
    } finally {
      setDownloading(false);
    }
  };

  const isMessageRead = () => {
    if (isOwnMessage && message.readBy) {
      return message.readBy.some(read => read.user !== currentUser._id);
    }
    return false;
  };

  const handleViewAttachment = (attachment) => {
    setSelectedAttachment(attachment);
    setShowPreviewModal(true);
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setSelectedAttachment(null);
  };

  const renderAttachment = (attachment, index) => {
    console.log('Rendering attachment:', {
      index,
      fileName: attachment.fileName,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize
    });
    
    // Validate attachment data
    if (!attachment || !attachment.fileName || !attachment.originalName) {
      console.error('Invalid attachment data:', attachment);
      return (
        <Box key={index} sx={{ mt: 1 }}>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              bgcolor: 'error.light',
              color: 'error.contrastText',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Warning />
            <Typography variant="body2">Invalid attachment data</Typography>
          </Paper>
        </Box>
      );
    }
    
    const isImage = attachment.mimeType && attachment.mimeType.startsWith('image/');
    const isPdf = attachment.mimeType && attachment.mimeType.includes('pdf');
    const isViewable = isImage || isPdf || (attachment.mimeType && attachment.mimeType.includes('text'));
    const FileIconComponent = getFileIcon(attachment.mimeType);
    
    return (
      <Box key={index} sx={{ mt: 1 }}>
        {isImage ? (
          <Box sx={{ position: 'relative', display: 'inline-block' }}>
            <Box
              component="img"
              src={`/api/chat/view-attachment/${message._id}/${attachment.fileName}`}
              alt={attachment.originalName}
              sx={{
                maxWidth: '300px',
                maxHeight: '200px',
                borderRadius: 2,
                cursor: 'pointer',
                display: 'block',
              }}
              onClick={() => handleViewAttachment(attachment)}
              onError={(e) => {
                console.error('Image load error for:', attachment.fileName, e);
                e.target.style.display = 'none';
                const fallback = e.target.parentNode.querySelector('.attachment-fallback');
                if (fallback) {
                  fallback.style.display = 'block';
                }
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                bgcolor: alpha('#000', 0.75),
                color: 'white',
                px: 1,
                py: 0.5,
                borderRadius: '0 8px 0 0',
              }}
            >
              <Typography variant="caption">{attachment.originalName}</Typography>
            </Box>
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
              }}
            >
              <ButtonGroup size="small" variant="contained" sx={{ bgcolor: alpha('#fff', 0.9) }}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewAttachment(attachment);
                  }}
                  title="View"
                  sx={{ color: 'primary.main' }}
                >
                  <Visibility fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadAttachment(attachment);
                  }}
                  title="Download"
                  disabled={downloading}
                  sx={{ color: 'primary.main' }}
                >
                  <Download fontSize="small" />
                </IconButton>
              </ButtonGroup>
            </Box>
            {/* Fallback for broken images */}
            <Paper
              className="attachment-fallback"
              elevation={1}
              sx={{
                display: 'none',
                p: 2,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 2,
                maxWidth: '300px',
              }}
            >
              <FileIconComponent sx={{ fontSize: '2rem', color: 'primary.main' }} />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {attachment.originalName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(attachment.fileSize || 0)}
                </Typography>
              </Box>
              <ButtonGroup size="small">
                <IconButton
                  size="small"
                  onClick={() => handleViewAttachment(attachment)}
                  title="View"
                >
                  <Visibility fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDownloadAttachment(attachment)}
                  title="Download"
                  disabled={downloading}
                >
                  <Download fontSize="small" />
                </IconButton>
              </ButtonGroup>
            </Paper>
          </Box>
        ) : (
          <Paper
            elevation={1}
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              maxWidth: '300px',
              bgcolor: 'background.paper',
            }}
          >
            <FileIconComponent sx={{ fontSize: '2rem', color: 'primary.main' }} />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                {attachment.originalName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatFileSize(attachment.fileSize || 0)}
              </Typography>
            </Box>
            <ButtonGroup size="small">
              {isViewable && (
                <IconButton
                  size="small"
                  onClick={() => handleViewAttachment(attachment)}
                  title="View"
                >
                  <Visibility fontSize="small" />
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={() => handleDownloadAttachment(attachment)}
                title="Download"
                disabled={downloading}
              >
                <Download fontSize="small" />
              </IconButton>
            </ButtonGroup>
          </Paper>
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        mb: 2,
        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
      }}
    >
      {/* Avatar for other users */}
      {!isOwnMessage && (
        <Box sx={{ mr: 1, width: '32px' }}>
          {showAvatar ? (
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: 'grey.500',
                fontSize: '0.75rem',
                fontWeight: 'bold',
              }}
            >
              {getUserInitials(message.sender)}
            </Avatar>
          ) : (
            <Box sx={{ width: '32px', height: '32px' }} />
          )}
        </Box>
      )}

      {/* Message Content */}
      <Paper
        elevation={1}
        sx={{
          px: 2,
          py: 1.5,
          position: 'relative',
          maxWidth: '70%',
          wordWrap: 'break-word',
          bgcolor: isOwnMessage ? 'primary.main' : 'grey.100',
          color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
          borderRadius: 3,
          '&::before': {
            content: '""',
            position: 'absolute',
            bottom: '10px',
            width: 0,
            height: 0,
            borderStyle: 'solid',
            ...(isOwnMessage ? {
              right: '-8px',
              borderWidth: '8px 0 8px 8px',
              borderColor: `transparent transparent transparent ${theme.palette.primary.main}`,
            } : {
              left: '-8px',
              borderWidth: '8px 8px 8px 0',
              borderColor: `transparent ${theme.palette.grey[100]} transparent transparent`,
            }),
          },
        }}
      >
        {/* Sender name for group chats or when showing avatar */}
        {!isOwnMessage && showAvatar && (
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              mb: 0.5,
              display: 'block',
            }}
          >
            {message.sender.firstName} {message.sender.lastName}
          </Typography>
        )}

        {/* Message text */}
        {message.content && message.content.trim() && message.content !== 'File attachment' && (
          <Typography
            variant="body2"
            sx={{
              mb: message.attachments && message.attachments.length > 0 ? 1 : 0.5,
              whiteSpace: 'pre-wrap',
            }}
          >
            {message.content}
          </Typography>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <Box sx={{ mt: message.content && message.content.trim() && message.content !== 'File attachment' ? 1 : 0 }}>
            {message.attachments.map(renderAttachment)}
          </Box>
        )}

        {/* Show fallback only if truly no content and no attachments */}
        {(!message.content || !message.content.trim() || message.content === 'File attachment') && 
         (!message.attachments || message.attachments.length === 0) && (
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', fontStyle: 'italic' }}>
            <Warning sx={{ mr: 0.5, fontSize: '1rem' }} />
            <Typography variant="body2">Message content unavailable</Typography>
          </Box>
        )}

        {/* Message metadata */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            mt: 0.5,
            gap: 0.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: isOwnMessage ? alpha(theme.palette.primary.contrastText, 0.7) : 'text.secondary',
            }}
          >
            {formatTime(message.createdAt)}
          </Typography>
          
          {/* Read status for own messages */}
          {isOwnMessage && (
            <>
              {isMessageRead() ? (
                <DoneAll
                  sx={{
                    fontSize: '0.875rem',
                    color: 'info.main',
                  }}
                  titleAccess="Read"
                />
              ) : (
                <Check
                  sx={{
                    fontSize: '0.875rem',
                    color: alpha(theme.palette.primary.contrastText, 0.7),
                  }}
                  titleAccess="Delivered"
                />
              )}
            </>
          )}
          
          {/* Edited indicator */}
          {message.isEdited && (
            <Edit
              sx={{
                fontSize: '0.875rem',
                color: isOwnMessage ? alpha(theme.palette.primary.contrastText, 0.7) : 'text.secondary',
              }}
              titleAccess="Edited"
            />
          )}
        </Box>
      </Paper>

      {/* Avatar placeholder for own messages */}
      {isOwnMessage && (
        <Box sx={{ ml: 1, width: '32px' }}>
          {showAvatar ? (
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: 'primary.main',
                fontSize: '0.75rem',
                fontWeight: 'bold',
              }}
            >
              {getUserInitials(currentUser)}
            </Avatar>
          ) : (
            <Box sx={{ width: '32px', height: '32px' }} />
          )}
        </Box>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        show={showPreviewModal}
        onHide={handleClosePreview}
        attachment={selectedAttachment}
        messageId={message._id}
      />
    </Box>
  );
};

export default MessageBubble;
