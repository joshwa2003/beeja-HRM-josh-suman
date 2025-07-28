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
  Pagination,
  Menu,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon,
  Visibility as VisibilityIcon,
  GetApp as GetAppIcon,
  Schedule as ScheduleIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import ApplicationDetailsModal from './ApplicationDetailsModal';

const Applications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApplicationDetails, setShowApplicationDetails] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [filters, setFilters] = useState({
    status: '',
    job: '',
    search: ''
  });
  
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  const [scheduleData, setScheduleData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    duration: 60,
    type: 'Technical',
    mode: 'Online',
    location: '',
    meetingLink: '',
    primaryInterviewer: '',
    additionalInterviewers: [],
    instructions: '',
    round: 1
  });

  const [alert, setAlert] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    fetchApplications();
    fetchJobs();
    fetchUsers();
  }, [filters, pagination.current]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.current,
        limit: 10,
        ...filters
      });
      
      const response = await api.get(`/recruitment/applications?${params}`);
      setApplications(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      showAlert('Error fetching applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await api.get('/recruitment/jobs');
      setJobs(response.data.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/recruitment/interviewers');
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  const handleStatusUpdate = async (applicationId, status) => {
    try {
      await api.patch(`/recruitment/applications/${applicationId}/status`, { status });
      showAlert('Application status updated successfully', 'success');
      fetchApplications();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Error updating status', 'error');
    }
    setAnchorEl(null);
  };

  const handleRejectClick = (application) => {
    setSelectedApplication(application);
    setRejectionReason('');
    setShowRejectModal(true);
    setAnchorEl(null);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    
    if (!rejectionReason.trim()) {
      showAlert('Please provide a reason for rejection', 'error');
      return;
    }

    try {
      await api.post(`/recruitment/applications/${selectedApplication._id}/reject`, {
        reason: rejectionReason.trim()
      });
      showAlert('Rejection email sent successfully and application status updated', 'success');
      setShowRejectModal(false);
      setRejectionReason('');
      fetchApplications();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Error sending rejection email', 'error');
    }
  };

  const handleScheduleInterview = (application) => {
    setSelectedApplication(application);
    setScheduleData({
      scheduledDate: '',
      scheduledTime: '',
      duration: 60,
      type: 'Technical',
      mode: 'Online',
      location: '',
      meetingLink: '',
      primaryInterviewer: '',
      additionalInterviewers: [],
      instructions: '',
      round: 1
    });
    setShowScheduleModal(true);
    setAnchorEl(null);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const submitData = {
        ...scheduleData,
        title: `${scheduleData.type} Interview - Round ${scheduleData.round}`,
        description: `Interview for ${selectedApplication.firstName} ${selectedApplication.lastName}`,
        scheduledDate: new Date(`${scheduleData.scheduledDate}T${scheduleData.scheduledTime}`).toISOString()
      };

      await api.post(`/recruitment/applications/${selectedApplication._id}/interviews`, submitData);
      showAlert('Interview scheduled successfully', 'success');
      setShowScheduleModal(false);
      fetchApplications();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Error scheduling interview', 'error');
    }
  };

  const handleDownloadResume = async (applicationId) => {
    try {
      // Use the api utility to ensure correct base URL and headers
      const response = await api.get(`/recruitment/applications/${applicationId}/resume`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `resume_${applicationId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showAlert('Resume downloaded successfully', 'success');
    } catch (error) {
      console.error('Error downloading resume:', error);
      showAlert('Error downloading resume. Please try again.', 'error');
    }
    setAnchorEl(null);
  };

  const getStatusColor = (status) => {
    const variants = {
      'Pending': 'warning',
      'Reviewed': 'info',
      'Shortlisted': 'primary',
      'Interview Round 1': 'success',
      'Interview Round 2': 'success',
      'Interview Round 3': 'success',
      'Selected': 'success',
      'Rejected': 'error',
      'Offer Sent': 'info',
      'Offer Accepted': 'success',
      'Offer Rejected': 'error'
    };
    return variants[status] || 'default';
  };

  const handleMenuClick = (event, application) => {
    setAnchorEl(event.currentTarget);
    setSelectedApplication(application);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedApplication(null);
  };

  const handleViewApplication = (application) => {
    setSelectedApplication(application);
    setShowApplicationDetails(true);
    setAnchorEl(null);
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
            <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Job Applications
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Review and manage candidate applications
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchApplications}
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
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Reviewed">Reviewed</MenuItem>
                  <MenuItem value="Shortlisted">Shortlisted</MenuItem>
                  <MenuItem value="Interview Round 1">Interview Round 1</MenuItem>
                  <MenuItem value="Interview Round 2">Interview Round 2</MenuItem>
                  <MenuItem value="Selected">Selected</MenuItem>
                  <MenuItem value="Rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Job</InputLabel>
                <Select
                  value={filters.job}
                  label="Job"
                  onChange={(e) => setFilters(prev => ({ ...prev, job: e.target.value }))}
                >
                  <MenuItem value="">All Jobs</MenuItem>
                  {jobs && jobs.map(job => (
                    <MenuItem key={job._id} value={job._id}>{job.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Search"
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={fetchApplications}
                fullWidth
              >
                Filter
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Applications ({pagination.total || 0})
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <Box textAlign="center">
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>
                  Loading applications...
                </Typography>
              </Box>
            </Box>
          ) : applications.length === 0 ? (
            <Box textAlign="center" py={4}>
              <PersonIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No applications found
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
                      <TableCell>Experience</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Applied Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {applications && applications.map(application => (
                      <TableRow key={application._id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Avatar sx={{ mr: 2 }}>
                              {application.firstName?.charAt(0)}{application.lastName?.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {application.firstName} {application.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {application.email}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                {application.phoneNumber}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {application.job?.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {application.job?.code}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {application.yearsOfExperience} years
                          </Typography>
                          {application.currentCompany && (
                            <Typography variant="caption" color="text.secondary">
                              at {application.currentCompany}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={application.status}
                            color={getStatusColor(application.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(application.submittedAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            onClick={(e) => handleMenuClick(e, application)}
                            size="small"
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
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

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleViewApplication(selectedApplication)}>
          <VisibilityIcon sx={{ mr: 1 }} />
          View Application
        </MenuItem>
        <MenuItem onClick={() => handleDownloadResume(selectedApplication?._id)}>
          <GetAppIcon sx={{ mr: 1 }} />
          Download Resume
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleStatusUpdate(selectedApplication?._id, 'Reviewed')}>
          <VisibilityIcon sx={{ mr: 1 }} />
          Mark as Reviewed
        </MenuItem>
        <MenuItem onClick={() => handleStatusUpdate(selectedApplication?._id, 'Shortlisted')}>
          <CheckIcon sx={{ mr: 1 }} />
          Shortlist
        </MenuItem>
        <MenuItem onClick={() => handleScheduleInterview(selectedApplication)}>
          <ScheduleIcon sx={{ mr: 1 }} />
          Schedule Interview
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleRejectClick(selectedApplication)}>
          <CloseIcon sx={{ mr: 1 }} />
          Reject with Reason
        </MenuItem>
      </Menu>

      {/* Schedule Interview Dialog */}
      <Dialog open={showScheduleModal} onClose={() => setShowScheduleModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Schedule Interview
          {selectedApplication && (
            <Typography variant="body2" color="text.secondary">
              for {selectedApplication.firstName} {selectedApplication.lastName}
            </Typography>
          )}
        </DialogTitle>
        <form onSubmit={handleScheduleSubmit}>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Interview Date"
                  value={scheduleData.scheduledDate}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="time"
                  label="Interview Time"
                  value={scheduleData.scheduledTime}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Duration (minutes)"
                  value={scheduleData.duration}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  inputProps={{ min: 15, max: 480 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Interview Type</InputLabel>
                  <Select
                    value={scheduleData.type}
                    label="Interview Type"
                    onChange={(e) => setScheduleData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <MenuItem value="Technical">Technical</MenuItem>
                    <MenuItem value="HR">HR</MenuItem>
                    <MenuItem value="Managerial">Managerial</MenuItem>
                    <MenuItem value="Cultural Fit">Cultural Fit</MenuItem>
                    <MenuItem value="Final">Final</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Interview Mode</InputLabel>
                  <Select
                    value={scheduleData.mode}
                    label="Interview Mode"
                    onChange={(e) => setScheduleData(prev => ({ ...prev, mode: e.target.value }))}
                  >
                    <MenuItem value="Online">Online</MenuItem>
                    <MenuItem value="Offline">Offline</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Primary Interviewer</InputLabel>
                  <Select
                    value={scheduleData.primaryInterviewer}
                    label="Primary Interviewer"
                    onChange={(e) => setScheduleData(prev => ({ ...prev, primaryInterviewer: e.target.value }))}
                    required
                  >
                  <MenuItem value="">Select Interviewer</MenuItem>
                  {users && users.map(user => (
                    <MenuItem key={user._id} value={user._id}>
                      {user.firstName} {user.lastName} ({user.role})
                    </MenuItem>
                  ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Interview Round"
                  value={scheduleData.round}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, round: parseInt(e.target.value) }))}
                  inputProps={{ min: 1, max: 5 }}
                />
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

              {scheduleData.mode === 'Offline' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Location"
                    value={scheduleData.location}
                    onChange={(e) => setScheduleData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Conference Room A, 2nd Floor"
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Instructions for Candidate"
                  value={scheduleData.instructions}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Any specific instructions or preparation notes for the candidate..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowScheduleModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              Schedule Interview
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Reject Application Dialog */}
      <Dialog open={showRejectModal} onClose={() => setShowRejectModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Reject Application
          {selectedApplication && (
            <Typography variant="body2" color="text.secondary">
              {selectedApplication.firstName} {selectedApplication.lastName} - {selectedApplication.job?.title}
            </Typography>
          )}
        </DialogTitle>
        <form onSubmit={handleRejectSubmit}>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Please provide a constructive reason for rejection. This will be included in the email sent to the candidate.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Reason for Rejection"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Thank you for your interest in our company. After careful consideration of your application, we have decided to move forward with other candidates whose qualifications more closely match our current requirements..."
              required
              sx={{ mt: 1 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              💡 Tip: Keep the feedback constructive and professional. This helps maintain a positive candidate experience.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="error"
              startIcon={<CloseIcon />}
            >
              Send Rejection Email
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Application Details Modal */}
      <ApplicationDetailsModal
        open={showApplicationDetails}
        onClose={() => setShowApplicationDetails(false)}
        application={selectedApplication}
        applicationId={selectedApplication?._id}
      />
    </Box>
  );
};

export default Applications;
