import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  Close,
  Download,
  OpenInNew,
  Image,
  PictureAsPdf,
  Description,
  TableChart,
  TextSnippet,
  Archive,
  InsertDriveFile,
  Info,
  Warning,
} from '@mui/icons-material';
import { chatAPI } from '../../utils/api';

const FilePreviewModal = ({ show, onHide, attachment, messageId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const theme = useTheme();

  useEffect(() => {
    if (show && attachment && messageId) {
      loadFile();
    }
  }, [show, attachment, messageId]);

  useEffect(() => {
    return () => {
      // Clean up blob URL when component unmounts or modal closes
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  const loadFile = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await chatAPI.downloadAttachment(messageId, attachment.fileName);
      const blob = new Blob([response.data], { type: attachment.mimeType });
      const url = URL.createObjectURL(blob);
      setFileUrl(url);
      setLoading(false);
    } catch (error) {
      console.error('Error loading file:', error);
      setError('Failed to load file');
      setLoading(false);
    }
  };

  if (!show || !attachment) return null;

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

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `/api/chat/attachment/${messageId}/${attachment.fileName}`;
    link.download = attachment.originalName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImage = attachment.mimeType && attachment.mimeType.startsWith('image/');
  const isPdf = attachment.mimeType && attachment.mimeType.includes('pdf');
  const isViewable = isImage || isPdf;

  const FileIconComponent = getFileIcon(attachment?.mimeType);

  return (
    <Dialog
      open={show}
      onClose={onHide}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
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
        <FileIconComponent color="primary" />
        <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
          File Preview - {attachment?.originalName}
        </Typography>
        <IconButton
          onClick={onHide}
          sx={{
            color: 'grey.500',
            '&:hover': {
              bgcolor: 'grey.100',
            },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, minHeight: '400px' }}>
        {loading && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              p: 5,
            }}
          >
            <CircularProgress size={40} />
          </Box>
        )}

        {error && (
          <Box sx={{ p: 3 }}>
            <Alert severity="error" icon={<Warning />}>
              {error}
            </Alert>
          </Box>
        )}

        {!loading && !error && (
          <>
            {isImage && fileUrl ? (
              <Box
                sx={{
                  textAlign: 'center',
                  p: 3,
                }}
              >
                <Box
                  component="img"
                  src={fileUrl}
                  alt={attachment.originalName}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    borderRadius: 1,
                  }}
                />
              </Box>
            ) : isPdf && fileUrl ? (
              <Box sx={{ height: '70vh' }}>
                <Box
                  component="iframe"
                  src={`${fileUrl}#toolbar=0`}
                  width="100%"
                  height="100%"
                  sx={{ border: 'none' }}
                  title={attachment.originalName}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  p: 5,
                  textAlign: 'center',
                }}
              >
                <FileIconComponent
                  sx={{
                    fontSize: '4rem',
                    color: 'text.disabled',
                    mb: 2,
                  }}
                />
                <Typography variant="h5" color="text.secondary" sx={{ mb: 1 }}>
                  Preview not available
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  This file type cannot be previewed in the browser.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={handleDownload}
                >
                  Download File
                </Button>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Info sx={{ fontSize: '1rem', color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            Size: {formatFileSize(attachment?.fileSize || 0)} • 
            Type: {attachment?.mimeType}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isViewable && fileUrl && (
            <Button
              variant="outlined"
              startIcon={<OpenInNew />}
              onClick={() => window.open(fileUrl, '_blank')}
            >
              Open in New Tab
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleDownload}
          >
            Download
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            onClick={onHide}
          >
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default FilePreviewModal;
