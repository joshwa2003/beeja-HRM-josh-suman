import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Button,
  Box,
  Avatar,
  Alert,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  PersonAdd,
  Send,
  Info,
} from '@mui/icons-material';

const ConnectionRequestModal = ({ user, onSend, onClose }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const theme = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    
    try {
      await onSend(user._id, message.trim());
    } catch (error) {
      console.error('Error sending connection request:', error);
    } finally {
      setSending(false);
    }
  };

  const getUserInitials = (user) => {
    if (!user) return '?';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          pb: 1,
        }}
      >
        <PersonAdd color="primary" />
        <Typography variant="h6" component="span">
          Send Connection Request
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* User Info */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 3,
            p: 2,
            bgcolor: 'grey.50',
            borderRadius: 2,
          }}
        >
          <Avatar
            sx={{
              width: 50,
              height: 50,
              bgcolor: 'primary.main',
              fontSize: '1.125rem',
              fontWeight: 'bold',
              mr: 2,
            }}
          >
            {getUserInitials(user)}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              {user.firstName} {user.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user.role}
            </Typography>
          </Box>
        </Box>

        {/* Info Message */}
        <Alert
          severity="info"
          icon={<Info />}
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Connection Required
          </Typography>
          <Typography variant="body2">
            As an Employee, you need approval from {user.role}s to start a conversation. 
            Send a connection request with an optional message explaining why you'd like to connect.
          </Typography>
        </Alert>

        {/* Request Form */}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Message (Optional)"
            placeholder="Hi, I would like to connect with you regarding..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            inputProps={{ maxLength: 500 }}
            disabled={sending}
            helperText={`${message.length}/500 characters`}
            sx={{ mb: 3 }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={sending}
          sx={{ mr: 1 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={sending}
          startIcon={
            sending ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Send />
            )
          }
        >
          {sending ? 'Sending...' : 'Send Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConnectionRequestModal;
