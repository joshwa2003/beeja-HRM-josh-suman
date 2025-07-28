import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Avatar,
  Pagination,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  OutlinedInput,
  Checkbox,
  ListItemText as MuiListItemText
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Visibility as VisibilityIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  Feedback as FeedbackIcon,
  MoreVert as MoreVertIcon,
  PersonAdd as PersonAddIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Interviews = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [filters, setFilters] = useState({
    interviewer: '',
    status: '',
    job: '',
    date: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  // 3-dot menu states
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showNextInterviewDialog, setShowNextInterviewDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [users, setUsers] = useState([]);
  const [scheduleData, setScheduleData] = useState({
    type: 'Technical',
    round: 1,
    scheduledDate: '',
    scheduledTime: '',
    duration: 60,
    mode: 'Online',
    location: '',
    meetingLink: '',
    primaryInterviewer: '',
    additionalInterviewers: [],
    allInterviewers: [], // New field to store all selected interviewers
    instructions: ''
  });

  useEffect(() => {
    fetchInterviews();
    fetchUsers();
  }, [filters, pagination.current]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/recruitment/interviewers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.current,
        limit: 10,
        ...filters
      });

      const response = await fetch(`/api/recruitment/interviews?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Interviews API response:', data);
        setInterviews(data.data || []);
        setPagination(data.pagination || { current: 1, pages: 1, total: 0 });
      } else {
        console.error('Failed to fetch interviews:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'Scheduled': 'warning',
      'Confirmed': 'info',
      'In Progress': 'primary',
      'Completed': 'success',
      'Cancelled': 'error',
      'Rescheduled': 'secondary',
      'No Show': 'error'
    };
    return statusColors[status] || 'default';
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const handleViewFeedback = (feedback, interview) => {
    setSelectedFeedback({ feedback, interview });
    setShowFeedbackDialog(true);
  };

  const handleStatusUpdate = async (applicationId, status) => {
    try {
      const response = await fetch(`/api/recruitment/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        fetchInterviews();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // 3-dot menu handlers
  const handleMenuClick = (event, interview) => {
    console.log('handleMenuClick called with interview:', interview);
    setAnchorEl(event.currentTarget);
    setSelectedInterview(interview);
    console.log('selectedInterview set to:', interview);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    // Don't clear selectedInterview here as it's needed for dialogs
    // setSelectedInterview(null);
  };

  const handleNextInterview = () => {
    console.log('handleNextInterview called, selectedInterview:', selectedInterview);
    if (selectedInterview) {
      setScheduleData(prev => ({
        ...prev,
        round: selectedInterview.round + 1,
        type: 'Technical',
        scheduledDate: '',
        scheduledTime: '',
        duration: 60,
        mode: 'Online',
        location: '',
        meetingLink: '',
        primaryInterviewer: '',
        additionalInterviewers: [],
        allInterviewers: [],
        instructions: ''
      }));
      setShowNextInterviewDialog(true);
      handleMenuClose(); // Close menu after setting dialog to true
    } else {
      console.error('selectedInterview is null in handleNextInterview');
      alert('No interview selected. Please try clicking the menu again.');
      handleMenuClose();
    }
  };

  const handleSelect = async () => {
    if (selectedInterview && selectedInterview.application && selectedInterview.application._id) {
      try {
        // Update application status to Selected
        const response = await fetch(`/api/recruitment/applications/${selectedInterview.application._id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ status: 'Selected' })
        });
        
        if (response.ok) {
          // Navigate to offer letters page with selected candidate data
          navigate('/admin/recruitment/offer-letters', {
            state: {
              selectedCandidate: selectedInterview
            }
          });
        } else {
          alert('Error updating application status');
        }
      } catch (error) {
        console.error('Error updating status:', error);
        alert('Error updating application status');
      }
    } else {
      alert('Interview application data is missing. Please refresh and try again.');
      console.error('selectedInterview or application data is null:', selectedInterview);
    }
    handleMenuClose();
  };

  const handleReject = () => {
    setShowRejectDialog(true);
    handleMenuClose();
  };

  const handleScheduleNextInterview = async (e) => {
    e.preventDefault();
    try {
      // Validate selectedInterview exists
      if (!selectedInterview) {
        alert('No interview selected. Please try again.');
        console.error('selectedInterview is null');
        return;
      }

      // Validate selectedInterview has application data
      if (!selectedInterview.application || !selectedInterview.application._id) {
        alert('Interview application data is missing. Please refresh and try again.');
        console.error('selectedInterview.application is null or missing _id:', selectedInterview);
        return;
      }

      // Validate required fields
      if (scheduleData.allInterviewers.length === 0) {
        alert('Please select at least one interviewer');
        return;
      }
      
      if (!scheduleData.scheduledDate || !scheduleData.scheduledTime) {
        alert('Please select both date and time for the interview');
        return;
      }

      // Create the scheduled date properly considering timezone
      const scheduledDateTime = new Date(`${scheduleData.scheduledDate}T${scheduleData.scheduledTime}`);
      
      console.log('Frontend date validation:');
      console.log('Schedule Date:', scheduleData.scheduledDate);
      console.log('Schedule Time:', scheduleData.scheduledTime);
      console.log('Combined DateTime:', scheduledDateTime);
      console.log('Current DateTime:', new Date());
      console.log('ISO String:', scheduledDateTime.toISOString());
      
      // Check if the date is in the past (client-side validation)
      const now = new Date();
      if (scheduledDateTime <= now) {
        alert('Please select a future date and time for the interview.');
        return;
      }

      const interviewPayload = {
        ...scheduleData,
        // Set the first interviewer as primary interviewer for backward compatibility
        interviewer: scheduleData.allInterviewers[0],
        primaryInterviewer: scheduleData.allInterviewers[0],
        // Set additional interviewers (excluding the first one)
        additionalInterviewers: scheduleData.allInterviewers.slice(1),
        // Send all interviewers for email notifications
        allInterviewers: scheduleData.allInterviewers,
        title: `${scheduleData.type} Interview - Round ${scheduleData.round}`,
        description: `Interview for ${selectedInterview.application?.firstName || 'Unknown'} ${selectedInterview.application?.lastName || 'Candidate'}`,
        scheduledDate: scheduledDateTime.toISOString()
      };

      console.log('Scheduling interview with payload:', interviewPayload);
      console.log('Selected interview:', selectedInterview);

      const response = await fetch(`/api/recruitment/applications/${selectedInterview.application._id}/interviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(interviewPayload)
      });

      const responseData = await response.json();

      if (response.ok) {
        alert('Next interview scheduled successfully!');
        setShowNextInterviewDialog(false);
        setSelectedInterview(null); // Clear selected interview after successful scheduling
        setScheduleData({
          type: 'Technical',
          round: 1,
          scheduledDate: '',
          scheduledTime: '',
          duration: 60,
          mode: 'Online',
          location: '',
          meetingLink: '',
          primaryInterviewer: '',
          additionalInterviewers: [],
          allInterviewers: [],
          instructions: ''
        });
        fetchInterviews();
      } else {
        console.error('Error scheduling interview:', responseData);
        const errorMessage = responseData.message || responseData.error || 'Error scheduling interview';
        alert(`Error scheduling interview: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error scheduling interview:', error);
      alert(`Error scheduling interview: ${error.message || 'Network error occurred'}`);
    }
  };

  const handleSendRejection = async (e) => {
    e.preventDefault();
    try {
      // Validate selectedInterview exists
      if (!selectedInterview) {
        alert('No interview selected. Please try again.');
        console.error('selectedInterview is null');
        return;
      }

      // Validate selectedInterview has application data
      if (!selectedInterview.application || !selectedInterview.application._id) {
        alert('Interview application data is missing. Please refresh and try again.');
        console.error('selectedInterview.application is null or missing _id:', selectedInterview);
        return;
      }

      const response = await fetch(`/api/recruitment/applications/${selectedInterview.application._id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason: rejectionReason })
      });

      if (response.ok) {
        alert('Rejection email sent successfully!');
        setShowRejectDialog(false);
        setSelectedInterview(null); // Clear selected interview after successful rejection
        setRejectionReason('');
        fetchInterviews();
      } else {
        alert('Error sending rejection email');
      }
    } catch (error) {
      console.error('Error sending rejection:', error);
      alert('Error sending rejection email');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Interviews
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and review all scheduled interviews
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchInterviews}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="Scheduled">Scheduled</MenuItem>
                  <MenuItem value="Confirmed">Confirmed</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                  <MenuItem value="No Show">No Show</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={filters.date}
                onChange={(e) => setFilters({...filters, date: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>View</InputLabel>
                <Select
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'upcoming') {
                      setFilters({...filters, date: new Date().toISOString().split('T')[0]});
                    } else if (value === 'today') {
                      setFilters({...filters, date: new Date().toISOString().split('T')[0]});
                    } else {
                      setFilters({...filters, date: ''});
                    }
                  }}
                >
                  <MenuItem value="">All Interviews</MenuItem>
                  <MenuItem value="today">Today's Interviews</MenuItem>
                  <MenuItem value="upcoming">Upcoming Interviews</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button 
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={() => setFilters({ interviewer: '', status: '', job: '', date: '' })}
                fullWidth
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Interviews Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Interviews ({pagination.total || 0})
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : interviews.length === 0 ? (
            <Box textAlign="center" py={4}>
              <ScheduleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No interviews found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your filters or check back later
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Candidate</TableCell>
                      <TableCell>Job</TableCell>
                      <TableCell>Round</TableCell>
                      <TableCell>Interviewer</TableCell>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {interviews.map(interview => {
                      const dateTime = formatDateTime(interview.scheduledDate);
                      const upcoming = new Date(interview.scheduledDate) > new Date();
                      const past = new Date(interview.scheduledDate) < new Date();
                      
                      return (
                        <TableRow key={interview._id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              <Avatar sx={{ mr: 2 }}>
                                {interview.application?.firstName?.charAt(0)}{interview.application?.lastName?.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {interview.application?.firstName} {interview.application?.lastName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {interview.application?.email}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {interview.job?.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {interview.job?.code}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={`Round ${interview.round}`} color="primary" size="small" />
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {interview.primaryInterviewer?.firstName} {interview.primaryInterviewer?.lastName}
                                {interview.additionalInterviewers && interview.additionalInterviewers.length > 0 && (
                                  <Chip 
                                    label={`+${interview.additionalInterviewers.length}`} 
                                    size="small" 
                                    color="primary" 
                                    sx={{ ml: 1 }}
                                  />
                                )}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {interview.primaryInterviewer?.email}
                              </Typography>
                              {interview.additionalInterviewers && interview.additionalInterviewers.length > 0 && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  +{interview.additionalInterviewers.length} more interviewer{interview.additionalInterviewers.length > 1 ? 's' : ''}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {dateTime.date}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {dateTime.time}
                              </Typography>
                              {upcoming && (
                                <Typography variant="caption" color="success.main" display="block">
                                  Upcoming
                                </Typography>
                              )}
                              {past && interview.status === 'Scheduled' && (
                                <Typography variant="caption" color="warning.main" display="block">
                                  Overdue
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={interview.type}
                              color={interview.type === 'Online' ? 'info' : 'default'}
                              size="small"
                            />
                            {interview.type === 'Online' && interview.meetingLink && (
                              <Box mt={1}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  href={interview.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Join
                                </Button>
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={interview.status}
                              color={getStatusColor(interview.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {interview.duration} min
                            </Typography>
                          </TableCell>
                        <TableCell>
                            <Box display="flex" gap={1} alignItems="center">
                              {interview.feedback && interview.feedback.submittedAt ? (
                                <Tooltip title="View Feedback">
                                  <IconButton
                                    color="success"
                                    onClick={() => handleViewFeedback(interview.feedback, interview)}
                                  >
                                    <FeedbackIcon />
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                <Tooltip title="Feedback Pending">
                                  <IconButton color="warning" disabled>
                                    <FeedbackIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                              
                              <Tooltip title="View Details">
                                <IconButton
                                  color="primary"
                                  onClick={() => {
                                    alert(`Candidate: ${interview.application?.firstName} ${interview.application?.lastName}\nEmail: ${interview.application?.email}\nPhone: ${interview.application?.phoneNumber}\nExperience: ${interview.application?.yearsOfExperience || 'N/A'} years`);
                                  }}
                                >
                                  <VisibilityIcon />
                                </IconButton>
                              </Tooltip>

                              {/* 3-dot menu - Only show for HR Manager with feedback submitted */}
                              {user.role === 'HR Manager' && interview.feedback && interview.feedback.submittedAt && (
                                <Tooltip title="More Actions">
                                  <IconButton
                                    onClick={(e) => handleMenuClick(e, interview)}
                                  >
                                    <MoreVertIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={pagination.pages}
                    page={pagination.current}
                    onChange={(event, page) => setPagination(prev => ({ ...prev, current: page }))}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Grid container spacing={3} mt={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">Today's Interviews</Typography>
                  <Typography variant="h4">
                    {interviews.filter(i => 
                      new Date(i.scheduledDate).toDateString() === new Date().toDateString()
                    ).length}
                  </Typography>
                </Box>
                <ScheduleIcon sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.main', color: 'success.contrastText' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">Completed</Typography>
                  <Typography variant="h4">
                    {interviews.filter(i => i.status === 'Completed').length}
                  </Typography>
                </Box>
                <CheckIcon sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.main', color: 'warning.contrastText' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">Pending Feedback</Typography>
                  <Typography variant="h4">
                    {interviews.filter(i => 
                      i.status === 'Completed' && (!i.feedback || !i.feedback.submittedAt)
                    ).length}
                  </Typography>
                </Box>
                <FeedbackIcon sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'info.main', color: 'info.contrastText' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">Upcoming</Typography>
                  <Typography variant="h4">
                    {interviews.filter(i => 
                      new Date(i.scheduledDate) > new Date() && i.status === 'Scheduled'
                    ).length}
                  </Typography>
                </Box>
                <ArrowForwardIcon sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 3-dot Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleNextInterview}>
          <ListItemIcon>
            <ArrowForwardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Next Set of Interview</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleSelect}>
          <ListItemIcon>
            <PersonAddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Select</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleReject} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <EmailIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Reject</ListItemText>
        </MenuItem>
      </Menu>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onClose={() => {
        setShowRejectDialog(false);
        setSelectedInterview(null); // Clear selected interview when dialog closes
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Candidate</DialogTitle>
        <form onSubmit={handleSendRejection}>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Send rejection email to {selectedInterview?.application?.firstName} {selectedInterview?.application?.lastName}
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Rejection Reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejection (optional)"
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setShowRejectDialog(false);
              setSelectedInterview(null); // Clear selected interview when cancelled
            }}>Cancel</Button>
            <Button type="submit" variant="contained" color="error">
              Send Rejection Email
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Next Interview Dialog */}
      <Dialog open={showNextInterviewDialog} onClose={() => {
        setShowNextInterviewDialog(false);
        setSelectedInterview(null); // Clear selected interview when dialog closes
      }} maxWidth="md" fullWidth>
        <DialogTitle>Schedule Next Interview</DialogTitle>
        <form onSubmit={handleScheduleNextInterview}>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Schedule Round {scheduleData.round} interview for {selectedInterview?.application?.firstName} {selectedInterview?.application?.lastName}
            </Typography>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Interview Type</InputLabel>
                  <Select
                    value={scheduleData.type}
                    label="Interview Type"
                    onChange={(e) => setScheduleData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <MenuItem value="Technical">Technical</MenuItem>
                    <MenuItem value="HR">HR</MenuItem>
                    <MenuItem value="Managerial">Managerial</MenuItem>
                    <MenuItem value="Final">Final</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Duration (minutes)"
                  value={scheduleData.duration}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date"
                  value={scheduleData.scheduledDate}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{
                    min: new Date().toISOString().split('T')[0] // Set minimum date to today
                  }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="time"
                  label="Time"
                  value={scheduleData.scheduledTime}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Mode</InputLabel>
                  <Select
                    value={scheduleData.mode}
                    label="Mode"
                    onChange={(e) => setScheduleData(prev => ({ ...prev, mode: e.target.value }))}
                  >
                    <MenuItem value="Online">Online</MenuItem>
                    <MenuItem value="In-Person">In-Person</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Select Interviewers</InputLabel>
                  <Select
                    multiple
                    value={scheduleData.allInterviewers}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, allInterviewers: e.target.value }))}
                    input={<OutlinedInput label="Select Interviewers" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const user = users.find(u => u._id === value);
                          return (
                            <Chip 
                              key={value} 
                              label={user ? `${user.firstName} ${user.lastName}` : value}
                              size="small"
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {users.map(user => (
                      <MenuItem key={user._id} value={user._id}>
                        <Checkbox checked={scheduleData.allInterviewers.indexOf(user._id) > -1} />
                        <MuiListItemText primary={`${user.firstName} ${user.lastName} - ${user.designation}`} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {scheduleData.mode === 'Online' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Meeting Link"
                    value={scheduleData.meetingLink}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, meetingLink: e.target.value }))}
                    placeholder="https://meet.google.com/..."
                  />
                </Grid>
              )}
              {scheduleData.mode === 'In-Person' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Location"
                    value={scheduleData.location}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Conference Room A, 2nd Floor"
                    required
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Instructions"
                  value={scheduleData.instructions}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Any special instructions for the interview..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setShowNextInterviewDialog(false);
              setSelectedInterview(null); // Clear selected interview when cancelled
            }}>Cancel</Button>
            <Button type="submit" variant="contained">
              Schedule Interview
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onClose={() => setShowFeedbackDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Interview Feedback
          {selectedFeedback && (
            <Typography variant="body2" color="text.secondary">
              {selectedFeedback.interview.application?.firstName} {selectedFeedback.interview.application?.lastName} - {selectedFeedback.interview.job?.title}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedFeedback && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Ratings</Typography>
                <Typography variant="body2">
                  Technical: {selectedFeedback.feedback.technicalRating !== null && selectedFeedback.feedback.technicalRating !== undefined ? `${selectedFeedback.feedback.technicalRating}/10` : 'Not Rated'}
                </Typography>
                <Typography variant="body2">
                  Communication: {selectedFeedback.feedback.communicationRating !== null && selectedFeedback.feedback.communicationRating !== undefined ? `${selectedFeedback.feedback.communicationRating}/10` : 'Not Rated'}
                </Typography>
                <Typography variant="body2">
                  Problem Solving: {selectedFeedback.feedback.problemSolvingRating !== null && selectedFeedback.feedback.problemSolvingRating !== undefined ? `${selectedFeedback.feedback.problemSolvingRating}/10` : 'Not Rated'}
                </Typography>
                <Typography variant="body2">
                  Cultural Fit: {selectedFeedback.feedback.culturalFitRating !== null && selectedFeedback.feedback.culturalFitRating !== undefined ? `${selectedFeedback.feedback.culturalFitRating}/10` : 'Not Rated'}
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  Overall: {selectedFeedback.feedback.overallRating !== null && selectedFeedback.feedback.overallRating !== undefined ? `${selectedFeedback.feedback.overallRating}/10` : 'Not Rated'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Recommendation</Typography>
                <Chip 
                  label={selectedFeedback.feedback.recommendation || 'Not Provided'} 
                  color={selectedFeedback.feedback.recommendation === 'Strong Hire' || selectedFeedback.feedback.recommendation === 'Hire' ? 'success' : 'default'}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Comments</Typography>
                <Typography variant="body2">{selectedFeedback.feedback.overallComments || 'No comments provided'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Additional Notes</Typography>
                <Typography variant="body2">{selectedFeedback.feedback.additionalNotes || 'None'}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFeedbackDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Interviews;
