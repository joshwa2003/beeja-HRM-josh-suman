import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Fab,
  Badge,
  Paper,
  Slide,
  useTheme,
  useMediaQuery,
  Zoom,
  keyframes,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Chat as ChatIcon } from '@mui/icons-material';
import { useChatShortcut } from '../../context/ChatShortcutContext';
import { useAuth } from '../../context/AuthContext';
import ChatPopup from './ChatPopup';
import MiniChatWindow from './MiniChatWindow';

// Define pulse animation
const pulseAnimation = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(244, 67, 54, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
  }
`;

// Styled Fab component
const StyledFab = styled(Fab)(({ theme, ismobile }) => ({
  position: 'fixed',
  bottom: ismobile === 'true' ? 16 : 24,
  right: ismobile === 'true' ? 16 : 24,
  background: `linear-gradient(135deg, ${theme.palette.accent?.main || '#20C997'}, ${theme.palette.accent?.dark || '#17A085'})`,
  '&:hover': {
    background: `linear-gradient(135deg, ${theme.palette.accent?.light || '#40D4AA'}, ${theme.palette.accent?.main || '#20C997'})`,
    transform: 'scale(1.1)',
  },
  boxShadow: theme.shadows[6],
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  zIndex: theme.zIndex.fab,
  width: ismobile === 'true' ? 48 : 56,
  height: ismobile === 'true' ? 48 : 56,
}));

// Styled Badge component with pulse animation
const StyledBadge = styled(Badge)(({ theme, shouldpulse }) => ({
  '& .MuiBadge-badge': {
    fontSize: '0.75rem',
    fontWeight: 700,
    minWidth: 20,
    height: 20,
    borderRadius: '50%',
    border: `2px solid ${theme.palette.background.paper}`,
    animation: shouldpulse === 'true' ? `${pulseAnimation} 2s infinite` : 'none',
  },
}));

const ChatShortcut = () => {
  const { user } = useAuth();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const {
    totalUnreadCount,
    isPopupOpen,
    activeMiniChat,
    togglePopup
  } = useChatShortcut();
  
  const shortcutRef = useRef(null);
  const popupRef = useRef(null);

  // Hide chat shortcut when user is on the Messages page
  const isOnMessagesPage = location.pathname === '/chat';

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isPopupOpen &&
        shortcutRef.current &&
        popupRef.current &&
        !shortcutRef.current.contains(event.target) &&
        !popupRef.current.contains(event.target)
      ) {
        togglePopup();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPopupOpen, togglePopup]);

  // Don't render if user is not logged in
  if (!user) return null;

  // Check if user has chat permissions
  const hasChatPermission = ['Employee', 'Team Leader', 'Team Manager', 'HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'].includes(user.role);
  
  if (!hasChatPermission) return null;

  // Hide the chat shortcut button when user is on the Messages page
  if (isOnMessagesPage) return null;

  return (
    <>
      {/* Material-UI Floating Action Button */}
      <Zoom in={true} timeout={300}>
        <StyledFab
          ref={shortcutRef}
          color="primary"
          aria-label="Quick Chat"
          onClick={togglePopup}
          ismobile={isMobile.toString()}
        >
          <StyledBadge
            badgeContent={totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            color="error"
            invisible={totalUnreadCount === 0}
            shouldpulse={(totalUnreadCount > 0).toString()}
          >
            <ChatIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
          </StyledBadge>
        </StyledFab>
      </Zoom>

      {/* Chat Popup with Material-UI Paper */}
      <Slide direction="up" in={isPopupOpen} mountOnEnter unmountOnExit>
        <Paper
          ref={popupRef}
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: isMobile ? 80 : 90,
            right: isMobile ? 16 : 24,
            width: isMobile ? 'calc(100vw - 32px)' : 320,
            maxHeight: isMobile ? 'calc(100vh - 120px)' : 400,
            borderRadius: 2,
            overflow: 'hidden',
            zIndex: theme.zIndex.modal - 1,
            background: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <ChatPopup />
        </Paper>
      </Slide>

      {/* Mini Chat Window */}
      {activeMiniChat && <MiniChatWindow />}
    </>
  );
};

export default ChatShortcut;
