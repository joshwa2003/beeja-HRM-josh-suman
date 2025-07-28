import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  GetApp as GetAppIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationOnIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Description as DescriptionIcon,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon
} from '@mui/icons-material';
import api from '../../utils/api';

const ApplicationDetailsModal = ({ open, onClose, applicationId, application: propApplication }) => {
  const [application, setApplication] = useState(propApplication || null);
  const [loading, setLoading] = useState(false);
  const [interviews, setInterviews] = useState([]);
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    if (open && applicationId && !propApplication) {
      fetchApplicationDetails();
    } else if (propApplication) {
      setApplication(propApplication);
      fetchInterviews();
    }
  }, [open, applicationId, propApplication]);

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/recruitment/applications/${applicationId}`);
      setApplication(response.data.data);
      fetchInterviews();
    } catch (error) {
      showAlert('Error fetching application details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchInterviews = async () => {
    try {
      const response = await api.get(`/recruitment/interviews?application=${applicationId || propApplication?._id}`);
      setInterviews(response.data.data || []);
    } catch (error) {
      console.error('Error fetching interviews:', error);
    }
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  const handleDownloadResume = async () => {
    try {
      // Use the api utility to ensure correct base URL and headers
      const response = await api.get(`/recruitment/applications/${application._id}/resume`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename - use original name if available, otherwise create one
      const filename = application.resume?.originalName || 
                     `resume_${application.firstName}_${application.lastName}.pdf`;
      link.setAttribute('download', filename);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showAlert('Resume downloaded successfully', 'success');
    } catch (error) {
      console.error('Error downloading resume:', error);
      showAlert('Error downloading resume. Please try again.', 'error');
    }
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

  const getStatusIcon = (status) => {
    const icons = {
      'Pending': <PendingIcon />,
      'Reviewed': <CheckCircleIcon />,
      'Shortlisted': <StarIcon />,
      'Selected': <CheckCircleIcon />,
      'Rejected': <CancelIcon />,
      'Offer Sent': <DescriptionIcon />,
      'Offer Accepted': <CheckCircleIcon />,
      'Offer Rejected': <CancelIcon />
    };
    return icons[status] || <PendingIcon />;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!application && !loading) {
    return null;
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center">
            <PersonIcon sx={{ mr: 1 }} />
            <Typography variant="h6">
              Application Details
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {alert.show && (
          <Alert 
            severity={alert.type} 
            onClose={() => setAlert({ show: false, message: '', type: '' })}
            sx={{ mb: 2 }}
          >
            {alert.message}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : application ? (
          <Grid container spacing={3}>
            {/* Personal Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <PersonIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Personal Information</Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" mb={3}>
                    <Avatar sx={{ width: 60, height: 60, mr: 2, bgcolor: 'primary.main' }}>
                      {application.firstName?.charAt(0)}{application.lastName?.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        {application.firstName} {application.lastName}
                      </Typography>
                      <Chip
                        icon={getStatusIcon(application.status)}
                        label={application.status}
                        color={getStatusColor(application.status)}
                        size="small"
                      />
                    </Box>
                  </Box>

                  <List dense>
                    <ListItem>
                      <ListItemIcon><EmailIcon /></ListItemIcon>
                      <ListItemText primary="Email" secondary={application.email} />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><PhoneIcon /></ListItemIcon>
                      <ListItemText primary="Phone" secondary={application.phoneNumber} />
                    </ListItem>
                    {application.currentLocation && (
                      <ListItem>
                        <ListItemIcon><LocationOnIcon /></ListItemIcon>
                        <ListItemText primary="Location" secondary={application.currentLocation} />
                      </ListItem>
                    )}
                    <ListItem>
                      <ListItemIcon><ScheduleIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Applied On" 
                        secondary={formatDate(application.submittedAt)} 
                      />
                    </ListItem>
                    {application.applicationNumber && (
                      <ListItem>
                        <ListItemIcon><DescriptionIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Application Number" 
                          secondary={application.applicationNumber} 
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Job Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <WorkIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Job Information</Typography>
                  </Box>
                  
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Position" 
                        secondary={application.job?.title || 'N/A'} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Job Code" 
                        secondary={application.job?.code || 'N/A'} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Department" 
                        secondary={application.job?.department?.name || 'N/A'} 
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Professional Experience */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <BusinessIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Professional Experience</Typography>
                  </Box>
                  
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Years of Experience" 
                        secondary={`${application.yearsOfExperience} years`} 
                      />
                    </ListItem>
                    {application.currentDesignation && (
                      <ListItem>
                        <ListItemText 
                          primary="Current Designation" 
                          secondary={application.currentDesignation} 
                        />
                      </ListItem>
                    )}
                    {application.currentCompany && (
                      <ListItem>
                        <ListItemText 
                          primary="Current Company" 
                          secondary={application.currentCompany} 
                        />
                      </ListItem>
                    )}
                    {application.currentSalary && (
                      <ListItem>
                        <ListItemText 
                          primary="Current Salary" 
                          secondary={`₹${application.currentSalary.toLocaleString()}`} 
                        />
                      </ListItem>
                    )}
                    {application.expectedSalary && (
                      <ListItem>
                        <ListItemText 
                          primary="Expected Salary" 
                          secondary={`₹${application.expectedSalary.toLocaleString()}`} 
                        />
                      </ListItem>
                    )}
                    {application.noticePeriod && (
                      <ListItem>
                        <ListItemText 
                          primary="Notice Period" 
                          secondary={application.noticePeriod} 
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Education & Skills */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <SchoolIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Education & Skills</Typography>
                  </Box>
                  
                  {application.education && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>Education</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {application.education.degree} {application.education.specialization && `in ${application.education.specialization}`}
                      </Typography>
                      {application.education.university && (
                        <Typography variant="body2" color="text.secondary">
                          {application.education.university}
                        </Typography>
                      )}
                      {application.education.graduationYear && (
                        <Typography variant="body2" color="text.secondary">
                          Graduated: {application.education.graduationYear}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {application.technicalSkills && application.technicalSkills.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>Technical Skills</Typography>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {application.technicalSkills.map((skill, index) => (
                          <Chip key={index} label={skill} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {application.certifications && application.certifications.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>Certifications</Typography>
                      {application.certifications.map((cert, index) => (
                        <Typography key={index} variant="body2" color="text.secondary">
                          • {cert.name} {cert.issuingOrganization && `- ${cert.issuingOrganization}`}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Resume */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box display="flex" alignItems="center">
                      <DescriptionIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">Resume</Typography>
                    </Box>
                    {application.resume && (
                      <Button
                        variant="outlined"
                        startIcon={<GetAppIcon />}
                        onClick={handleDownloadResume}
                        size="small"
                      >
                        Download Resume
                      </Button>
                    )}
                  </Box>
                  
                  {application.resume ? (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="body2">
                        <strong>File:</strong> {application.resume.originalName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Size:</strong> {(application.resume.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Uploaded:</strong> {formatDateTime(application.resume.uploadedAt)}
                      </Typography>
                    </Paper>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No resume uploaded
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Cover Letter */}
            {application.coverLetter && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <DescriptionIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">Cover Letter</Typography>
                    </Box>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                        {application.coverLetter}
                      </Typography>
                    </Paper>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Interview History */}
            {interviews.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <TimelineIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">Interview History</Typography>
                    </Box>
                    
                    {interviews.map((interview, index) => (
                      <Paper key={interview._id} variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2">
                              {interview.type} Interview - Round {interview.round}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatDateTime(interview.scheduledDate)}
                            </Typography>
                            <Chip 
                              label={interview.status} 
                              size="small" 
                              color={interview.status === 'Completed' ? 'success' : 'default'}
                              sx={{ mt: 1 }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2">
                              <strong>Interviewer:</strong> {interview.primaryInterviewer?.firstName} {interview.primaryInterviewer?.lastName}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Mode:</strong> {interview.mode}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Duration:</strong> {interview.duration} minutes
                            </Typography>
                          </Grid>
                          {interview.feedback && (
                            <Grid item xs={12}>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="subtitle2" gutterBottom>
                                <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Feedback
                              </Typography>
                              <Box display="flex" alignItems="center" gap={2} mb={1}>
                                <Typography variant="body2">
                                  <strong>Overall Rating:</strong> {interview.feedback.overallRating}/10
                                </Typography>
                                <Chip 
                                  label={interview.feedback.recommendation} 
                                  size="small"
                                  color={interview.feedback.recommendation === 'Strong Hire' || interview.feedback.recommendation === 'Hire' ? 'success' : 'default'}
                                />
                              </Box>
                              {interview.feedback.overallComments && (
                                <Typography variant="body2" color="text.secondary">
                                  {interview.feedback.overallComments}
                                </Typography>
                              )}
                            </Grid>
                          )}
                        </Grid>
                      </Paper>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Additional Information */}
            {(application.portfolioUrl || application.linkedinUrl || application.relocatable !== undefined) && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Additional Information</Typography>
                    <List dense>
                      {application.portfolioUrl && (
                        <ListItem>
                          <ListItemText 
                            primary="Portfolio" 
                            secondary={
                              <a href={application.portfolioUrl} target="_blank" rel="noopener noreferrer">
                                {application.portfolioUrl}
                              </a>
                            } 
                          />
                        </ListItem>
                      )}
                      {application.linkedinUrl && (
                        <ListItem>
                          <ListItemText 
                            primary="LinkedIn" 
                            secondary={
                              <a href={application.linkedinUrl} target="_blank" rel="noopener noreferrer">
                                {application.linkedinUrl}
                              </a>
                            } 
                          />
                        </ListItem>
                      )}
                      {application.relocatable !== undefined && (
                        <ListItem>
                          <ListItemText 
                            primary="Willing to Relocate" 
                            secondary={application.relocatable ? 'Yes' : 'No'} 
                          />
                        </ListItem>
                      )}
                      {application.preferredInterviewTime && (
                        <ListItem>
                          <ListItemText 
                            primary="Preferred Interview Time" 
                            secondary={application.preferredInterviewTime} 
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        ) : (
          <Typography>No application data available</Typography>
        )}
      </DialogContent>

      <DialogActions>
        {application?.resume && (
          <Button
            startIcon={<GetAppIcon />}
            onClick={handleDownloadResume}
            variant="outlined"
          >
            Download Resume
          </Button>
        )}
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApplicationDetailsModal;
