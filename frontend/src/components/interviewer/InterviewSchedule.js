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
  IconButton,
  Tooltip,
  Rating,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Feedback as FeedbackIcon,
  VideoCall as VideoCallIcon,
  LocationOn as LocationOnIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  FilterList as FilterListIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import ApplicationDetailsModal from '../recruitment/ApplicationDetailsModal';

const InterviewSchedule = () => {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [feedbackData, setFeedbackData] = useState({
    technicalRating: 0,
    communicationRating: 0,
    problemSolvingRating: 0,
    culturalFitRating: 0,
    overallRating: 0,
    recommendation: '',
    strengths: [],
    weaknesses: [],
    overallComments: '',
    additionalNotes: ''
  });
  const [submittedFeedbacks, setSubmittedFeedbacks] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState('all');
  const [showApplicationDetails, setShowApplicationDetails] = useState(false);
  const [selectedApplicationForView, setSelectedApplicationForView] = useState(null);

  useEffect(() => {
    fetchInterviews();
    fetchSubmittedFeedbacks();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/recruitment/interviews/my-interviews', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Interviewer interviews API response:', data);
        
        // Remove duplicates based on interview ID
        const uniqueInterviews = data.data ? data.data.filter((interview, index, self) => 
          index === self.findIndex(i => i._id === interview._id)
        ) : [];
        
        setInterviews(uniqueInterviews);
      } else {
        console.error('Failed to fetch interviewer interviews:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmittedFeedbacks = async () => {
    try {
      setFeedbackLoading(true);
      const response = await fetch('/api/recruitment/feedback/my-feedback', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Submitted feedbacks API response:', data);
        setSubmittedFeedbacks(data.data || []);
      } else {
        console.error('Failed to fetch submitted feedbacks:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching submitted feedbacks:', error);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  const resetFeedbackForm = () => {
    setFeedbackData({
      technicalRating: 0,
      communicationRating: 0,
      problemSolvingRating: 0,
      culturalFitRating: 0,
      overallRating: 0,
      recommendation: '',
      strengths: [],
      weaknesses: [],
      overallComments: '',
      additionalNotes: ''
    });
  };

  const openFeedbackModal = (interview) => {
    setSelectedInterview(interview);
    if (interview.feedback && interview.feedback.submittedAt) {
      // Pre-populate form with existing feedback
      setFeedbackData({
        technicalRating: interview.feedback.technicalRating || 0,
        communicationRating: interview.feedback.communicationRating || 0,
        problemSolvingRating: interview.feedback.problemSolvingRating || 0,
        culturalFitRating: interview.feedback.culturalFitRating || 0,
        overallRating: interview.feedback.overallRating || 0,
        recommendation: interview.feedback.recommendation || '',
        strengths: interview.feedback.strengths || [],
        weaknesses: interview.feedback.weaknesses || [],
        overallComments: interview.feedback.overallComments || '',
        additionalNotes: interview.feedback.additionalNotes || ''
      });
    } else {
      resetFeedbackForm();
    }
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    
    try {
      console.log('=== FRONTEND FEEDBACK SUBMIT DEBUG ===');
      console.log('Selected Interview:', selectedInterview);
      console.log('Feedback Data:', feedbackData);
      
      // Validate required fields on frontend
      if (!feedbackData.overallRating || feedbackData.overallRating === 0) {
        showAlert('Overall rating is required', 'error');
        return;
      }
      
      if (!feedbackData.recommendation || feedbackData.recommendation.trim() === '') {
        showAlert('Recommendation is required', 'error');
        return;
      }
      
      if (!feedbackData.overallComments || feedbackData.overallComments.trim() === '') {
        showAlert('Overall comments are required', 'error');
        return;
      }

      const hasFeedback = selectedInterview.feedback && selectedInterview.feedback.submittedAt;
      
      // For updates, we still use POST to the same endpoint as the backend handles both cases
      const url = `/api/recruitment/interviews/${selectedInterview._id}/feedback`;
      
      // Prepare the data to send - ensure all fields are properly formatted
      const submitData = {
        technicalRating: feedbackData.technicalRating || 0,
        communicationRating: feedbackData.communicationRating || 0,
        problemSolvingRating: feedbackData.problemSolvingRating || 0,
        culturalFitRating: feedbackData.culturalFitRating || 0,
        overallRating: feedbackData.overallRating,
        recommendation: feedbackData.recommendation.trim(),
        overallComments: feedbackData.overallComments.trim(),
        additionalNotes: feedbackData.additionalNotes ? feedbackData.additionalNotes.trim() : '',
        strengths: Array.isArray(feedbackData.strengths) ? feedbackData.strengths.filter(s => s && s.trim()) : [],
        weaknesses: Array.isArray(feedbackData.weaknesses) ? feedbackData.weaknesses.filter(w => w && w.trim()) : []
      };
      
      console.log('Submit Data:', submitData);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(submitData)
      });

      const responseData = await response.json();
      console.log('Response:', responseData);

      if (response.ok) {
        showAlert(responseData.message || (hasFeedback ? 'Feedback updated successfully' : 'Feedback submitted successfully'), 'success');
        setShowFeedbackModal(false);
        fetchInterviews();
        fetchSubmittedFeedbacks(); // Refresh feedback list
        resetFeedbackForm();
      } else {
        // Show specific error message from backend
        const errorMessage = responseData.message || 'Error submitting feedback';
        console.error('Backend error:', responseData);
        showAlert(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showAlert('Network error: Unable to submit feedback', 'error');
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

  const isUpcoming = (dateString) => {
    return new Date(dateString) > new Date();
  };

  const todaysInterviews = interviews.filter(interview => 
    new Date(interview.scheduledDate).toDateString() === new Date().toDateString()
  );

  // Filter submitted feedbacks based on selected filter
  const filteredFeedbacks = submittedFeedbacks.filter(feedback => {
    if (feedbackFilter === 'all') return true;
    if (feedbackFilter === 'recent') {
      const feedbackDate = new Date(feedback.submittedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return feedbackDate >= weekAgo;
    }
    if (feedbackFilter === 'high-rating') return feedback.overallRating >= 8;
    if (feedbackFilter === 'low-rating') return feedback.overallRating <= 5;
    return true;
  });

  // Calculate feedback statistics
  const feedbackStats = {
    total: submittedFeedbacks.length,
    averageRating: submittedFeedbacks.length > 0 
      ? (submittedFeedbacks.reduce((sum, f) => sum + f.overallRating, 0) / submittedFeedbacks.length).toFixed(1)
      : 0,
    strongRecommend: submittedFeedbacks.filter(f => f.recommendation === 'Strong Hire').length,
    recommend: submittedFeedbacks.filter(f => f.recommendation === 'Hire').length,
    thisWeek: submittedFeedbacks.filter(f => {
      const feedbackDate = new Date(f.submittedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return feedbackDate >= weekAgo;
    }).length
  };

  const getRecommendationColor = (recommendation) => {
    const colors = {
      'Strong Hire': 'success',
      'Hire': 'info',
      'Maybe': 'warning',
      'No Hire': 'error',
      'Strong No Hire': 'error'
    };
    return colors[recommendation] || 'default';
  };

  const handleViewApplication = (interview) => {
    setSelectedApplicationForView(interview.application);
    setShowApplicationDetails(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      {alert.show && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert({ show: false, message: '', type: '' })}
          sx={{ mb: 3 }}
        >
          {alert.message}
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            My Interview Schedule
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your assigned interviews and provide feedback
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            fetchInterviews();
            fetchSubmittedFeedbacks();
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Today's Interviews */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <AccessTimeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Today's Interviews
          </Typography>
          
          {todaysInterviews.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No interviews scheduled for today.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {todaysInterviews.map(interview => {
                const dateTime = formatDateTime(interview.scheduledDate);
                const hasFeedback = interview.feedback && interview.feedback.submittedAt;
                
                return (
                  <Grid item xs={12} md={6} key={interview._id}>
                    <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                          <Typography variant="h6" color="primary">
                            {interview.type} Interview - Round {interview.round}
                          </Typography>
                          <Chip 
                            label={interview.status} 
                            color={getStatusColor(interview.status)} 
                            size="small" 
                          />
                        </Box>
                        
                        <Typography variant="body2" gutterBottom>
                          <strong>Candidate:</strong> {interview.application?.firstName} {interview.application?.lastName}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Time:</strong> {dateTime.time} ({interview.duration} min)
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Type:</strong> 
                          <Chip 
                            label={interview.mode} 
                            size="small" 
                            sx={{ ml: 1 }}
                            color={interview.mode === 'Online' ? 'info' : 'default'}
                          />
                        </Typography>

                        <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            onClick={() => handleViewApplication(interview)}
                          >
                            View Application
                          </Button>
                          
                          {interview.mode === 'Online' && interview.meetingLink && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<VideoCallIcon />}
                              href={interview.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Join
                            </Button>
                          )}
                          
                          <Button
                            size="small"
                            variant={hasFeedback ? "outlined" : "contained"}
                            color={hasFeedback ? "success" : "primary"}
                            startIcon={hasFeedback ? <CheckCircleIcon /> : <FeedbackIcon />}
                            onClick={() => openFeedbackModal(interview)}
                          >
                            {hasFeedback ? "View/Edit Feedback" : "Submit Feedback"}
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Feedback Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" gutterBottom>
              <FeedbackIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              My Feedback Submissions
            </Typography>
            <Box display="flex" gap={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Filter</InputLabel>
                <Select
                  value={feedbackFilter}
                  label="Filter"
                  onChange={(e) => setFeedbackFilter(e.target.value)}
                  startAdornment={<FilterListIcon sx={{ mr: 1 }} />}
                >
                  <MenuItem value="all">All Feedback</MenuItem>
                  <MenuItem value="recent">Recent (7 days)</MenuItem>
                  <MenuItem value="high-rating">High Rating (8+)</MenuItem>
                  <MenuItem value="low-rating">Low Rating (≤5)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Feedback Statistics */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <AssessmentIcon sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold">
                    {feedbackStats.total}
                  </Typography>
                  <Typography variant="body2">
                    Total Feedbacks
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <StarIcon sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold">
                    {feedbackStats.averageRating}
                  </Typography>
                  <Typography variant="body2">
                    Average Rating
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <TrendingUpIcon sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold">
                    {feedbackStats.strongRecommend + feedbackStats.recommend}
                  </Typography>
                  <Typography variant="body2">
                    Positive Recommendations
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <AccessTimeIcon sx={{ fontSize: 32, mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold">
                    {feedbackStats.thisWeek}
                  </Typography>
                  <Typography variant="body2">
                    This Week
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Feedback List */}
          {feedbackLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : filteredFeedbacks.length === 0 ? (
            <Box textAlign="center" py={4}>
              <FeedbackIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {feedbackFilter === 'all' 
                  ? 'No feedback submissions yet.' 
                  : 'No feedback matches the selected filter.'}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {filteredFeedbacks.map(feedback => {
                const submittedDate = new Date(feedback.submittedAt);
                const interview = interviews.find(i => i._id === feedback.interview);
                
                return (
                  <Grid item xs={12} md={6} lg={4} key={feedback._id}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                          <Typography variant="h6" color="primary" noWrap>
                            {feedback.application?.firstName} {feedback.application?.lastName}
                          </Typography>
                          <Chip 
                            label={feedback.recommendation} 
                            color={getRecommendationColor(feedback.recommendation)} 
                            size="small" 
                          />
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Job:</strong> {feedback.job?.title}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Round:</strong> {interview?.round || 'N/A'} | <strong>Type:</strong> {interview?.type || 'N/A'}
                        </Typography>
                        
                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Rating:</strong>
                          </Typography>
                          <Rating value={feedback.overallRating} max={10} readOnly size="small" />
                          <Typography variant="body2" color="text.secondary">
                            ({feedback.overallRating}/10)
                          </Typography>
                        </Box>
                        
                        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                          Submitted: {submittedDate.toLocaleDateString()} at {submittedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                        
                        <Box display="flex" gap={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<FeedbackIcon />}
                            onClick={() => {
                              const interviewData = interviews.find(i => i._id === feedback.interview);
                              if (interviewData) {
                                // Add feedback data to interview object for modal
                                interviewData.feedback = feedback;
                                openFeedbackModal(interviewData);
                              }
                            }}
                            fullWidth
                          >
                            View/Edit
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* All Interviews */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            All Interviews
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : interviews.length === 0 ? (
            <Box textAlign="center" py={4}>
              <ScheduleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No interviews assigned to you.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date & Time</TableCell>
                    <TableCell>Candidate</TableCell>
                    <TableCell>Job</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Round</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {interviews.map(interview => {
                    const dateTime = formatDateTime(interview.scheduledDate);
                    const upcoming = isUpcoming(interview.scheduledDate);
                    const hasFeedback = interview.feedback && interview.feedback.submittedAt;
                    
                    return (
                      <TableRow key={interview._id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {dateTime.date}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {dateTime.time} ({interview.duration} min)
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
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
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip 
                              label={interview.type} 
                              size="small" 
                              color="primary"
                            />
                            <Chip 
                              label={interview.mode} 
                              size="small" 
                              color={interview.mode === 'Online' ? 'info' : 'default'}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={`Round ${interview.round}`} color="secondary" size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={interview.status}
                            color={getStatusColor(interview.status)}
                            size="small"
                          />
                          {upcoming && (
                            <Typography variant="caption" color="success.main" display="block">
                              Upcoming
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1} alignItems="center" justifyContent="center">
                            {/* View Application Button */}
                            <Tooltip title="View Application">
                              <IconButton
                                color="secondary"
                                size="medium"
                                onClick={() => handleViewApplication(interview)}
                                sx={{ 
                                  bgcolor: 'secondary.main',
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: 'secondary.dark',
                                  },
                                  minWidth: '40px',
                                  minHeight: '40px'
                                }}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            
                            {/* Feedback Button */}
                            <Tooltip title={hasFeedback ? "View/Edit Feedback" : "Submit Feedback"}>
                              <IconButton
                                color={hasFeedback ? "success" : "primary"}
                                size="medium"
                                onClick={() => openFeedbackModal(interview)}
                                sx={{ 
                                  bgcolor: hasFeedback ? 'success.main' : 'primary.main',
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: hasFeedback ? 'success.dark' : 'primary.dark',
                                  },
                                  minWidth: '40px',
                                  minHeight: '40px'
                                }}
                              >
                                <FeedbackIcon />
                              </IconButton>
                            </Tooltip>
                            
                            {/* Join Meeting Button - Only for Online interviews with meeting link */}
                            {interview.mode === 'Online' && interview.meetingLink && (
                              <Tooltip title="Join Meeting">
                                <IconButton
                                  color="info"
                                  href={interview.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  size="medium"
                                  sx={{
                                    bgcolor: 'info.main',
                                    color: 'white',
                                    '&:hover': {
                                      bgcolor: 'info.dark',
                                    },
                                    minWidth: '40px',
                                    minHeight: '40px'
                                  }}
                                >
                                  <VideoCallIcon />
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
          )}
        </CardContent>
      </Card>

      {/* Feedback Modal */}
      <Dialog open={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <FeedbackIcon sx={{ mr: 1 }} />
            {selectedInterview?.feedback?.submittedAt ? 'Edit Interview Feedback' : 'Submit Interview Feedback'}
          </Box>
          {selectedInterview && (
            <Typography variant="body2" color="text.secondary">
              {selectedInterview.application?.firstName} {selectedInterview.application?.lastName} - {selectedInterview.job?.title}
            </Typography>
          )}
        </DialogTitle>
        <form onSubmit={handleFeedbackSubmit}>
          <DialogContent>
            <Grid container spacing={3}>
              {/* Ratings */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Ratings (1-10)</Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography component="legend">Technical Skills</Typography>
                <Rating
                  name="technicalRating"
                  value={feedbackData.technicalRating}
                  max={10}
                  onChange={(event, newValue) => {
                    setFeedbackData(prev => ({ ...prev, technicalRating: newValue }));
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography component="legend">Communication</Typography>
                <Rating
                  name="communicationRating"
                  value={feedbackData.communicationRating}
                  max={10}
                  onChange={(event, newValue) => {
                    setFeedbackData(prev => ({ ...prev, communicationRating: newValue }));
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography component="legend">Problem Solving</Typography>
                <Rating
                  name="problemSolvingRating"
                  value={feedbackData.problemSolvingRating}
                  max={10}
                  onChange={(event, newValue) => {
                    setFeedbackData(prev => ({ ...prev, problemSolvingRating: newValue }));
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography component="legend">Cultural Fit</Typography>
                <Rating
                  name="culturalFitRating"
                  value={feedbackData.culturalFitRating}
                  max={10}
                  onChange={(event, newValue) => {
                    setFeedbackData(prev => ({ ...prev, culturalFitRating: newValue }));
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography component="legend">Overall Rating</Typography>
                <Rating
                  name="overallRating"
                  value={feedbackData.overallRating}
                  max={10}
                  size="large"
                  onChange={(event, newValue) => {
                    setFeedbackData(prev => ({ ...prev, overallRating: newValue }));
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* Recommendation */}
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Recommendation</InputLabel>
                  <Select
                    value={feedbackData.recommendation}
                    label="Recommendation"
                    onChange={(e) => setFeedbackData(prev => ({ ...prev, recommendation: e.target.value }))}
                  >
                    <MenuItem value="Strong Hire">Strong Hire</MenuItem>
                    <MenuItem value="Hire">Hire</MenuItem>
                    <MenuItem value="Maybe">Maybe</MenuItem>
                    <MenuItem value="No Hire">No Hire</MenuItem>
                    <MenuItem value="Strong No Hire">Strong No Hire</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Comments */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Overall Comments"
                  value={feedbackData.overallComments}
                  onChange={(e) => setFeedbackData(prev => ({ ...prev, overallComments: e.target.value }))}
                  placeholder="Please provide detailed feedback about the candidate's performance..."
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Additional Notes"
                  value={feedbackData.additionalNotes}
                  onChange={(e) => setFeedbackData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                  placeholder="Any additional observations or notes..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowFeedbackModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" startIcon={<FeedbackIcon />}>
              {selectedInterview?.feedback?.submittedAt ? 'Update & Send to HR' : 'Submit & Send to HR'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Application Details Modal */}
      <ApplicationDetailsModal
        open={showApplicationDetails}
        onClose={() => setShowApplicationDetails(false)}
        application={selectedApplicationForView}
        applicationId={selectedApplicationForView?._id}
      />
    </Box>
  );
};

export default InterviewSchedule;
