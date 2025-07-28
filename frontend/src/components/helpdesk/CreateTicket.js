import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { getRoutingInfo } from '../../utils/hrRouting';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Stack,
  Avatar
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Shield as ShieldIcon,
  Lightbulb as LightbulbIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const CreateTicket = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: '',
    subcategory: '',
    priority: 'Medium',
    assignedTo: ''
  });
  const [attachments, setAttachments] = useState([]);
  const [suggestedFAQs, setSuggestedFAQs] = useState([]);
  const [hrPersonnel, setHrPersonnel] = useState([]);
  const [loadingHR, setLoadingHR] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const categories = [
    'Leave Issue',
    'Attendance Issue',
    'Regularization Problem',
    'Holiday Calendar Query',
    'WFH / Remote Work Requests',
    'Payroll / Salary Issue',
    'Payslip Not Available',
    'Reimbursement Issue',
    'Tax / TDS / Form-16',
    'Leave Policy Clarification',
    'Performance Review Concern',
    'KPI / Goals Setup Issue',
    'Probation / Confirmation',
    'Training / LMS Access Issue',
    'Certification Issue',
    'Offer Letter / Joining Issue',
    'Referral / Interview Feedback',
    'Resignation Process Query',
    'Final Settlement Delay',
    'Experience Letter Request',
    'HRMS Login Issue',
    'System Bug / App Crash',
    'Document Upload Failed',
    'Office Access / ID Card Lost',
    'General HR Query',
    'Harassment / Grievance',
    'Asset Request / Laptop',
    'Feedback / Suggestion to HR',
    'Others'
  ];

  const subcategories = {
    'Leave Issue': ['Leave balance mismatch', 'Cannot apply leave', 'Leave approval delay'],
    'Attendance Issue': ['Biometric failure', 'Absent marking error', 'Check-in/out issues'],
    'Payroll / Salary Issue': ['Wrong amount', 'Missing pay', 'Salary delay'],
    'Training / LMS Access Issue': ['Cannot access LMS', 'Training module not working', 'Certificate not generated'],
    'HRMS Login Issue': ['Cannot log in', '2FA problems', 'Password reset'],
    'System Bug / App Crash': ['App slow', 'Buttons not working', 'Data not saving']
  };

  useEffect(() => {
    // Search for FAQs when subject or description changes
    const searchTimeout = setTimeout(() => {
      if (formData.subject.length > 3 || formData.description.length > 10) {
        searchFAQs();
      }
    }, 1000);

    return () => clearTimeout(searchTimeout);
  }, [formData.subject, formData.description, formData.category]);

  useEffect(() => {
    // Fetch HR personnel when component mounts
    fetchHRPersonnel();
  }, []);

  useEffect(() => {
    // Reset assignedTo when category changes
    if (formData.category) {
      setFormData(prev => ({ ...prev, assignedTo: '' }));
    }
  }, [formData.category]);

  const searchFAQs = async () => {
    try {
      const searchQuery = `${formData.subject} ${formData.description}`.trim();
      if (searchQuery.length < 3) return;

      const response = await api.get('/faq/search', {
        params: {
          q: searchQuery,
          category: formData.category || undefined,
          limit: 3
        }
      });
      setSuggestedFAQs(response.data.results || []);
    } catch (error) {
      console.error('Error searching FAQs:', error);
    }
  };

  const fetchHRPersonnel = async (category = null) => {
    try {
      setLoadingHR(true);
      // Fetch HR personnel based on category if provided, otherwise fetch all
      const endpoint = category ? `/tickets/hr-personnel/${encodeURIComponent(category)}` : '/tickets/hr-personnel';
      const response = await api.get(endpoint);
      
      // The response already includes workload information
      const hrPersonnel = response.data.hrPersonnel || [];
      
      setHrPersonnel(hrPersonnel);
      
      // If a specific HR is selected but not eligible for the new category, reset selection
      if (category && formData.assignedTo) {
        const selectedHR = hrPersonnel.find(hr => hr._id === formData.assignedTo);
        if (!selectedHR) {
          setFormData(prev => ({
            ...prev,
            assignedTo: ''
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching HR personnel:', error);
      setHrPersonnel([]);
    } finally {
      setLoadingHR(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Reset subcategory and assignedTo when category changes
    if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        subcategory: '',
        assignedTo: ''
      }));
      
      // Always fetch all HR personnel to allow employee override of assignment
      fetchHRPersonnel(); // Fetch all HR personnel regardless of category
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file size (5MB max per file)
    const maxSize = 5 * 1024 * 1024;
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        setError(`File ${file.name} is too large. Maximum size is 5MB.`);
        return false;
      }
      return true;
    });

    // Limit to 5 files total
    if (attachments.length + validFiles.length > 5) {
      setError('Maximum 5 files allowed.');
      return;
    }

    setAttachments(prev => [...prev, ...validFiles]);
    setError('');
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!formData.subject.trim() || !formData.description.trim() || !formData.category) {
        setError('Please fill in all required fields.');
        return;
      }

      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('subject', formData.subject.trim());
      submitData.append('description', formData.description.trim());
      submitData.append('category', formData.category);
      submitData.append('priority', formData.priority);
      
      if (formData.subcategory) {
        submitData.append('subcategory', formData.subcategory);
      }

      if (formData.assignedTo) {
        submitData.append('assignedTo', formData.assignedTo);
      }

      // Add attachments
      attachments.forEach((file, index) => {
        submitData.append('attachments', file);
      });

      const response = await api.post('/tickets', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Ticket created successfully! You will be notified when it is assigned to an HR representative.');
      
      // Reset form
      setFormData({
        subject: '',
        description: '',
        category: '',
        subcategory: '',
        priority: 'Medium',
        assignedTo: ''
      });
      setAttachments([]);
      setSuggestedFAQs([]);
      setHrPersonnel([]);

      // Redirect to ticket details after 2 seconds
      setTimeout(() => {
        window.location.href = `/helpdesk/tickets/${response.data.ticket._id}`;
      }, 2000);

    } catch (error) {
      console.error('Error creating ticket:', error);
      setError(error.response?.data?.message || 'Error creating ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container justifyContent="center">
        <Grid item xs={12} lg={10}>
          {/* Header */}
          <Box display="flex" alignItems="center" mb={4}>
            <IconButton 
              onClick={() => window.history.back()}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                <AddIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Create Support Ticket
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Describe your issue and we'll help you resolve it
              </Typography>
            </Box>
          </Box>

          {/* Success/Error Messages */}
          {success && (
            <Alert 
              severity="success" 
              onClose={() => setSuccess('')}
              sx={{ mb: 3 }}
              icon={<CheckCircleIcon />}
            >
              {success}
            </Alert>
          )}

          {error && (
            <Alert 
              severity="error" 
              onClose={() => setError('')}
              sx={{ mb: 3 }}
            >
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Main Form */}
            <Grid item xs={12} lg={8}>
              <Card>
                <CardHeader
                  title={
                    <Typography variant="h6">
                      Ticket Details
                    </Typography>
                  }
                />
                <CardContent>
                  <Box component="form" onSubmit={handleSubmit}>
                    <Stack spacing={3}>
                      {/* Subject */}
                      <TextField
                        fullWidth
                        label="Subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        placeholder="Brief description of your issue"
                        inputProps={{ maxLength: 200 }}
                        required
                        helperText={`${formData.subject.length}/200 characters`}
                      />

                      {/* Category */}
                      <FormControl fullWidth required>
                        <InputLabel>Category</InputLabel>
                        <Select
                          name="category"
                          value={formData.category}
                          label="Category"
                          onChange={handleInputChange}
                        >
                          {categories.map(category => (
                            <MenuItem key={category} value={category}>
                              {category}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* HR Routing Information */}
                      {formData.category && (
                        <Paper sx={{ p: 2, bgcolor: 'grey.50', border: 1, borderColor: 'grey.300' }}>
                          <Box display="flex" alignItems="center" mb={1}>
                            <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography variant="body2" fontWeight="bold" color="primary">
                              {formData.assignedTo ? 'Assigned to:' : 'Default Assignment:'}
                            </Typography>
                            <Typography variant="body2" sx={{ ml: 1 }}>
                              {formData.assignedTo 
                                ? (() => {
                                    const selectedHR = hrPersonnel.find(hr => hr._id === formData.assignedTo);
                                    return selectedHR 
                                      ? `${selectedHR.firstName} ${selectedHR.lastName} (${selectedHR.role})`
                                      : 'Selected HR Personnel';
                                  })()
                                : getRoutingInfo(formData.category).assignedRole
                              }
                            </Typography>
                          </Box>
                          {getRoutingInfo(formData.category).isConfidential && (
                            <Box display="flex" alignItems="center" mb={1}>
                              <ShieldIcon sx={{ mr: 1, color: 'warning.main', fontSize: 16 }} />
                              <Typography variant="caption" color="warning.main" fontWeight="bold">
                                Confidential: This ticket will be handled with strict confidentiality
                              </Typography>
                            </Box>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {formData.assignedTo 
                              ? 'This ticket will be assigned to the selected HR personnel'
                              : getRoutingInfo(formData.category).description
                            }
                          </Typography>
                        </Paper>
                      )}

                      {/* HR Personnel Assignment */}
                      <FormControl fullWidth>
                        <InputLabel>Assign to HR Personnel</InputLabel>
                        {loadingHR ? (
                          <Box display="flex" alignItems="center" p={2} bgcolor="grey.50" borderRadius={1}>
                            <CircularProgress size={20} sx={{ mr: 1 }} />
                            <Typography variant="body2">Loading HR personnel...</Typography>
                          </Box>
                        ) : (
                          <Select
                            name="assignedTo"
                            value={formData.assignedTo}
                            label="Assign to HR Personnel"
                            onChange={handleInputChange}
                            onClick={() => hrPersonnel.length === 0 && fetchHRPersonnel()}
                          >
                            <MenuItem value="">Auto-assign based on category</MenuItem>
                            {hrPersonnel.map(hr => (
                              <MenuItem key={hr._id} value={hr._id}>
                                {hr.firstName} {hr.lastName} ({hr.role}) - {hr.workload} open tickets
                              </MenuItem>
                            ))}
                          </Select>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                          Select a specific HR person to handle your ticket, or leave blank for automatic assignment based on category.
                        </Typography>
                      </FormControl>

                      {/* Subcategory */}
                      {formData.category && subcategories[formData.category] && (
                        <FormControl fullWidth>
                          <InputLabel>Subcategory</InputLabel>
                          <Select
                            name="subcategory"
                            value={formData.subcategory}
                            label="Subcategory"
                            onChange={handleInputChange}
                          >
                            <MenuItem value="">Select a subcategory (optional)</MenuItem>
                            {subcategories[formData.category].map(subcategory => (
                              <MenuItem key={subcategory} value={subcategory}>
                                {subcategory}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}

                      {/* Priority */}
                      <FormControl fullWidth>
                        <InputLabel>Priority</InputLabel>
                        <Select
                          name="priority"
                          value={formData.priority}
                          label="Priority"
                          onChange={handleInputChange}
                        >
                          <MenuItem value="Low">Low</MenuItem>
                          <MenuItem value="Medium">Medium</MenuItem>
                          <MenuItem value="High">High</MenuItem>
                          <MenuItem value="Critical">Critical</MenuItem>
                        </Select>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                          Select "Critical" only for urgent issues that block your work
                        </Typography>
                      </FormControl>

                      {/* Description */}
                      <TextField
                        fullWidth
                        label="Description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Please provide detailed information about your issue, including steps to reproduce if applicable"
                        multiline
                        rows={6}
                        inputProps={{ maxLength: 2000 }}
                        required
                        helperText={`${formData.description.length}/2000 characters`}
                      />

                      {/* File Attachments */}
                      <Box>
                        <Typography variant="body2" gutterBottom>
                          Attachments
                        </Typography>
                        <Button
                          variant="outlined"
                          component="label"
                          startIcon={<AttachFileIcon />}
                          fullWidth
                          sx={{ mb: 1 }}
                        >
                          Choose Files
                          <input
                            type="file"
                            hidden
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={handleFileChange}
                          />
                        </Button>
                        <Typography variant="caption" color="text.secondary">
                          Upload screenshots, documents, or other files that help explain your issue. 
                          Max 5 files, 5MB each. Supported: PDF, JPG, PNG, DOC, DOCX
                        </Typography>

                        {/* Attachment List */}
                        {attachments.length > 0 && (
                          <Box mt={2}>
                            <Typography variant="body2" fontWeight="medium" gutterBottom>
                              Selected Files:
                            </Typography>
                            <Stack spacing={1}>
                              {attachments.map((file, index) => (
                                <Paper key={index} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <Box display="flex" alignItems="center">
                                    <AttachFileIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                    <Box>
                                      <Typography variant="body2" fontWeight="medium">
                                        {file.name}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {formatFileSize(file.size)}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  <IconButton
                                    color="error"
                                    onClick={() => removeAttachment(index)}
                                    size="small"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Paper>
                              ))}
                            </Stack>
                          </Box>
                        )}
                      </Box>

                      {/* Submit Buttons */}
                      <Box display="flex" justifyContent="space-between" pt={2}>
                        <Button
                          variant="outlined"
                          onClick={() => window.history.back()}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={loading}
                          startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                        >
                          {loading ? 'Creating Ticket...' : 'Create Ticket'}
                        </Button>
                      </Box>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Suggested FAQs Sidebar */}
            <Grid item xs={12} lg={4}>
              {suggestedFAQs.length > 0 && (
                <Card sx={{ mb: 3 }}>
                  <CardHeader
                    title={
                      <Typography variant="h6">
                        <LightbulbIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Suggested Solutions
                      </Typography>
                    }
                  />
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Before creating a ticket, check if these FAQs answer your question:
                    </Typography>
                    <Stack spacing={2} mt={2}>
                      {suggestedFAQs.map((faq) => (
                        <Paper key={faq._id} sx={{ p: 2, border: 1, borderColor: 'grey.300' }}>
                          <Typography variant="body2" fontWeight="medium" gutterBottom>
                            {faq.question}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {faq.answer.substring(0, 100)}...
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => window.open(`/helpdesk/faq/${faq._id}`, '_blank')}
                          >
                            Read More
                          </Button>
                        </Paper>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {/* Help Tips */}
              <Card>
                <CardHeader
                  title={
                    <Typography variant="h6">
                      <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Tips for Better Support
                    </Typography>
                  }
                />
                <CardContent>
                  <List dense>
                    <ListItem>
                      <CheckCircleIcon sx={{ mr: 1, color: 'success.main', fontSize: 16 }} />
                      <ListItemText 
                        primary="Be specific about the issue"
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                    <ListItem>
                      <CheckCircleIcon sx={{ mr: 1, color: 'success.main', fontSize: 16 }} />
                      <ListItemText 
                        primary="Include error messages if any"
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                    <ListItem>
                      <CheckCircleIcon sx={{ mr: 1, color: 'success.main', fontSize: 16 }} />
                      <ListItemText 
                        primary="Attach screenshots when helpful"
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                    <ListItem>
                      <CheckCircleIcon sx={{ mr: 1, color: 'success.main', fontSize: 16 }} />
                      <ListItemText 
                        primary="Mention steps you've already tried"
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CreateTicket;
