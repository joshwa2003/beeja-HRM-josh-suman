import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
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
  IconButton,
  Tooltip,
  Avatar,
  Slider,
  Divider
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  PlayArrow as PlayArrowIcon,
  Check as CheckIcon,
  Feedback as FeedbackIcon,
  VideoCall as VideoCallIcon,
  Refresh as RefreshIcon,
  Today as TodayIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const InterviewSchedule = () => {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  
  const [feedbackData, setFeedbackData] = useState({
    overallRating: 5,
    recommendation: 'Maybe',
    technicalSkills: { rating: 5, comments: '' },
    problemSolving: { rating: 5, comments: '' },
    communication: { rating: 5, comments: '' },
    culturalFit: { rating: 5, comments: '' },
    strengths: [''],
    weaknesses: [''],
    detailedFeedback: '',
    nextRoundRecommendation: 'Proceed to Next Round',
    interviewDuration: 60
  });

  const [alert, setAlert] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const response = await api.get('/recruitment/interviews/my-interviews');
      setInterviews(response.data.data);
    } catch (error) {
      showAlert('Error fetching interviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  const handleStatusUpdate = async (interviewId, status) => {
    try {
      await api.patch(`/recruitment/interviews/${interviewId}/status`, { status });
      showAlert('Interview status updated successfully', 'success');
      fetchInterviews();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Error updating status', 'error');
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmittingFeedback(true);
      
      const submitData = {
        ...feedbackData,
        strengths: feedbackData.strengths.filter(s => s.trim()),
        weaknesses: feedbackData.weaknesses.filter(w => w.trim())
      };
      
      await api.post(`/recruitment/interviews/${selectedInterview._id}/feedback`, submitData);
      showAlert('Feedback submitted successfully', 'success');
      setShowFeedbackModal(false);
      fetchInterviews();
      resetFeedbackForm();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Error submitting feedback', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const resetFeedbackForm = () => {
    setFeedbackData({
      overallRating: 5,
      recommendation: 'Maybe',
      technicalSkills: { rating: 5, comments: '' },
      problemSolving: { rating: 5, comments: '' },
      communication: { rating: 5, comments: '' },
      culturalFit: { rating: 5, comments: '' },
      strengths: [''],
      weaknesses: [''],
      detailedFeedback: '',
      nextRoundRecommendation: 'Proceed to Next Round',
      interviewDuration: 60
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFeedbackData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFeedbackData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleArrayChange = (field, index, value) => {
    setFeedbackData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field) => {
    setFeedbackData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field, index) => {
    setFeedbackData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const getStatusColor = (status) => {
    const variants = {
      'Scheduled': 'warning',
      'Confirmed': 'info',
      'In Progress': 'primary',
      'Completed': 'success',
      'Cancelled': 'error',
      'Rescheduled': 'default',
      'No Show - Candidate': 'error',
      'No Show - Interviewer': 'error'
    };
    return variants[status] || 'default';
  };

  const getInterviewTypeColor = (type) => {
    const variants = {
      'Technical': 'primary',
      'HR': 'info',
      'Managerial': 'success',
      'Cultural Fit': 'warning',
      'Final': 'error',
      'Panel': 'default'
    };
    return variants[type] || 'default';
  };

  const isInterviewToday = (date) => {
    const today = new Date().toDateString();
    return new Date(date).toDateString() === today;
  };

  const canStartInterview = (interview) => {
    const interviewDateTime = new Date(`${interview.scheduledDate}T${interview.scheduledTime}`);
    const now = new Date();
    const timeDiff = interviewDateTime - now;
    return timeDiff <= 15 * 60 * 1000 && timeDiff >= -30 * 60 * 1000; // 15 min before to 30 min after
  };

  const canSubmitFeedback = (interview) => {
    return interview.status === 'Completed' && !interview.feedbackSubmitted;
  };

  const todaysInterviews = interviews.filter(interview => isInterviewToday(interview.scheduledDate));

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
          onClick={fetchInterviews}
        >
          Refresh
        </Button>
      </Box>

      {/* Today's Interviews */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <TodayIcon sx={{ mr: 1 }} />
            Today's Interviews
          </Typography>
          
          {todaysInterviews.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              No interviews scheduled for today.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {todaysInterviews && todaysInterviews.map(interview => (
                <Grid item xs={12} md={6} key={interview._id}>
                  <Card variant="outlined" sx={{ borderColor: 'primary.main' }}>
                    <CardContent>
                      <Box display="flex" justifyContent="between" alignItems="start" mb={2}>
                        <Typography variant="h6" component="div">
                          {interview.title}
                        </Typography>
                        <Chip
                          label={interview.status}
                          color={getStatusColor(interview.status)}
                          size="small"
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Candidate:</strong> {interview.application?.firstName} {interview.application?.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Time:</strong> {interview.scheduledTime} ({interview.duration} min)
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Type:</strong> 
                        <Chip
                          label={interview.type}
                          color={getInterviewTypeColor(interview.type)}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                      
                      <Box display="flex" gap={1} mt={2}>
                        {canStartInterview(interview) && interview.status === 'Scheduled' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<PlayArrowIcon />}
                            onClick={() => handleStatusUpdate(interview._id, 'In Progress')}
                          >
                            Start
                          </Button>
                        )}
                        {interview.status === 'In Progress' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<CheckIcon />}
                            onClick={() => handleStatusUpdate(interview._id, 'Completed')}
                          >
                            Complete
                          </Button>
                        )}
                        {canSubmitFeedback(interview) && (
                          <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            startIcon={<FeedbackIcon />}
                            onClick={() => {
                              setSelectedInterview(interview);
                              setShowFeedbackModal(true);
                            }}
                          >
                            Feedback
                          </Button>
                        )}
                        {interview.mode === 'Online' && interview.meetingLink && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VideoCallIcon />}
                            href={interview.meetingLink}
                            target="_blank"
                          >
                            Join
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
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
              <Box textAlign="center">
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>
                  Loading interviews...
                </Typography>
              </Box>
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
                  {interviews && interviews.map(interview => (
                    <TableRow 
                      key={interview._id} 
                      hover
                      sx={{ backgroundColor: isInterviewToday(interview.scheduledDate) ? 'warning.light' : 'inherit' }}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {new Date(interview.scheduledDate).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {interview.scheduledTime} ({interview.duration} min)
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
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
                        <Chip
                          label={interview.type}
                          color={getInterviewTypeColor(interview.type)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={`Round ${interview.round}`} color="info" size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={interview.status}
                          color={getStatusColor(interview.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1} alignItems="center">
                          {/* Feedback Button - Always visible */}
                          <Tooltip title="Submit Feedback">
                            <IconButton
                              color="primary"
                              size="medium"
                              onClick={() => {
                                setSelectedInterview(interview);
                                setShowFeedbackModal(true);
                              }}
                              sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                '&:hover': {
                                  bgcolor: 'primary.dark',
                                },
                                minWidth: '40px',
                                minHeight: '40px'
                              }}
                            >
                              <FeedbackIcon />
                            </IconButton>
                          </Tooltip>
                          
                          {interview.mode === 'Online' && interview.meetingLink && (
                            <Tooltip title="Join Meeting">
                              <IconButton
                                size="medium"
                                color="info"
                                href={interview.meetingLink}
                                target="_blank"
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
                          
                          {canStartInterview(interview) && interview.status === 'Scheduled' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleStatusUpdate(interview._id, 'In Progress')}
                            >
                              Start
                            </Button>
                          )}
                          {interview.status === 'In Progress' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => handleStatusUpdate(interview._id, 'Completed')}
                            >
                              Complete
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Submit Interview Feedback
          {selectedInterview && (
            <Typography variant="body2" color="text.secondary">
              for {selectedInterview.application?.firstName} {selectedInterview.application?.lastName} - {selectedInterview.title} (Round {selectedInterview.round})
            </Typography>
          )}
        </DialogTitle>
        <form onSubmit={handleFeedbackSubmit}>
          <DialogContent>
            {selectedInterview && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Date:</strong> {new Date(selectedInterview.scheduledDate).toLocaleDateString()} at {selectedInterview.scheduledTime}
                </Typography>
              </Alert>
            )}

            {/* Overall Assessment */}
            <Typography variant="h6" gutterBottom>
              Overall Assessment
            </Typography>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Typography gutterBottom>Overall Rating: {feedbackData.overallRating}/10</Typography>
                <Slider
                  value={feedbackData.overallRating}
                  onChange={(e, value) => setFeedbackData(prev => ({ ...prev, overallRating: value }))}
                  min={1}
                  max={10}
                  marks
                  valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Recommendation</InputLabel>
                  <Select
                    name="recommendation"
                    value={feedbackData.recommendation}
                    label="Recommendation"
                    onChange={handleInputChange}
                  >
                    <MenuItem value="Strong Hire">Strong Hire</MenuItem>
                    <MenuItem value="Hire">Hire</MenuItem>
                    <MenuItem value="Maybe">Maybe</MenuItem>
                    <MenuItem value="No Hire">No Hire</MenuItem>
                    <MenuItem value="Strong No Hire">Strong No Hire</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Detailed Assessment */}
            <Typography variant="h6" gutterBottom>
              Detailed Assessment
            </Typography>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Typography gutterBottom>Technical Skills: {feedbackData.technicalSkills.rating}/10</Typography>
                <Slider
                  value={feedbackData.technicalSkills.rating}
                  onChange={(e, value) => setFeedbackData(prev => ({
                    ...prev,
                    technicalSkills: { ...prev.technicalSkills, rating: value }
                  }))}
                  min={1}
                  max={10}
                  marks
                  valueLabelDisplay="auto"
                />
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Comments on technical skills..."
                  value={feedbackData.technicalSkills.comments}
                  onChange={(e) => setFeedbackData(prev => ({
                    ...prev,
                    technicalSkills: { ...prev.technicalSkills, comments: e.target.value }
                  }))}
                  sx={{ mt: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography gutterBottom>Problem Solving: {feedbackData.problemSolving.rating}/10</Typography>
                <Slider
                  value={feedbackData.problemSolving.rating}
                  onChange={(e, value) => setFeedbackData(prev => ({
                    ...prev,
                    problemSolving: { ...prev.problemSolving, rating: value }
                  }))}
                  min={1}
                  max={10}
                  marks
                  valueLabelDisplay="auto"
                />
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Comments on problem solving..."
                  value={feedbackData.problemSolving.comments}
                  onChange={(e) => setFeedbackData(prev => ({
                    ...prev,
                    problemSolving: { ...prev.problemSolving, comments: e.target.value }
                  }))}
                  sx={{ mt: 1 }}
                />
              </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Typography gutterBottom>Communication: {feedbackData.communication.rating}/10</Typography>
                <Slider
                  value={feedbackData.communication.rating}
                  onChange={(e, value) => setFeedbackData(prev => ({
                    ...prev,
                    communication: { ...prev.communication, rating: value }
                  }))}
                  min={1}
                  max={10}
                  marks
                  valueLabelDisplay="auto"
                />
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Comments on communication skills..."
                  value={feedbackData.communication.comments}
                  onChange={(e) => setFeedbackData(prev => ({
                    ...prev,
                    communication: { ...prev.communication, comments: e.target.value }
                  }))}
                  sx={{ mt: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography gutterBottom>Cultural Fit: {feedbackData.culturalFit.rating}/10</Typography>
                <Slider
                  value={feedbackData.culturalFit.rating}
                  onChange={(e, value) => setFeedbackData(prev => ({
                    ...prev,
                    culturalFit: { ...prev.culturalFit, rating: value }
                  }))}
                  min={1}
                  max={10}
                  marks
                  valueLabelDisplay="auto"
                />
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Comments on cultural fit..."
                  value={feedbackData.culturalFit.comments}
                  onChange={(e) => setFeedbackData(prev => ({
                    ...prev,
                    culturalFit: { ...prev.culturalFit, comments: e.target.value }
                  }))}
                  sx={{ mt: 1 }}
                />
              </Grid>
            </Grid>

            {/* Strengths and Weaknesses */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Strengths</Typography>
                {feedbackData.strengths && feedbackData.strengths.map((strength, index) => (
                  <Box key={index} display="flex" gap={1} mb={1}>
                    <TextField
                      fullWidth
                      size="small"
                      value={strength}
                      onChange={(e) => handleArrayChange('strengths', index, e.target.value)}
                      placeholder="Enter a strength..."
                    />
                    {feedbackData.strengths.length > 1 && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => removeArrayItem('strengths', index)}
                      >
                        Remove
                      </Button>
                    )}
                  </Box>
                ))}
                <Button
                  variant="outlined"
                  color="success"
                  size="small"
                  onClick={() => addArrayItem('strengths')}
                >
                  Add Strength
                </Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Areas for Improvement</Typography>
                {feedbackData.weaknesses && feedbackData.weaknesses.map((weakness, index) => (
                  <Box key={index} display="flex" gap={1} mb={1}>
                    <TextField
                      fullWidth
                      size="small"
                      value={weakness}
                      onChange={(e) => handleArrayChange('weaknesses', index, e.target.value)}
                      placeholder="Enter an area for improvement..."
                    />
                    {feedbackData.weaknesses.length > 1 && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => removeArrayItem('weaknesses', index)}
                      >
                        Remove
                      </Button>
                    )}
                  </Box>
                ))}
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  onClick={() => addArrayItem('weaknesses')}
                >
                  Add Area
                </Button>
              </Grid>
            </Grid>

            {/* Detailed Feedback */}
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Detailed Feedback *"
              name="detailedFeedback"
              value={feedbackData.detailedFeedback}
              onChange={handleInputChange}
              placeholder="Provide detailed feedback about the candidate's performance, specific examples, and overall assessment..."
              required
              sx={{ mb: 3 }}
            />

            {/* Next Steps */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Next Step Recommendation</InputLabel>
                  <Select
                    name="nextRoundRecommendation"
                    value={feedbackData.nextRoundRecommendation}
                    label="Next Step Recommendation"
                    onChange={handleInputChange}
                  >
                    <MenuItem value="Proceed to Next Round">Proceed to Next Round</MenuItem>
                    <MenuItem value="Final Round">Final Round</MenuItem>
                    <MenuItem value="Make Offer">Make Offer</MenuItem>
                    <MenuItem value="Reject">Reject</MenuItem>
                    <MenuItem value="On Hold">On Hold</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Interview Duration (minutes)"
                  name="interviewDuration"
                  value={feedbackData.interviewDuration}
                  onChange={handleInputChange}
                  inputProps={{ min: 1, max: 480 }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowFeedbackModal(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={submittingFeedback}
              startIcon={submittingFeedback ? <CircularProgress size={20} /> : null}
            >
              {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default InterviewSchedule;
