import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Avatar,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Backdrop,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Fade,
  Zoom
} from '@mui/material';
import {
  Work as WorkIcon,
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
  Schedule as ScheduleIcon,
  AttachMoney as AttachMoneyIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  School as SchoolIcon,
  Code as CodeIcon,
  Description as DescriptionIcon,
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  Star as StarIcon,
  Verified as VerifiedIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
  },
}));

const GradientBox = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  padding: theme.spacing(6, 0),
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
  },
}));

const UploadBox = styled(Box)(({ theme, isDragOver }) => ({
  border: `2px dashed ${isDragOver ? theme.palette.primary.main : theme.palette.grey[300]}`,
  borderRadius: theme.spacing(2),
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  backgroundColor: isDragOver ? theme.palette.primary.light + '10' : theme.palette.grey[50],
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.light + '10',
  },
}));

const PublicJobApplication = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    currentLocation: '',
    linkedinProfile: '',
    portfolioWebsite: '',
    currentCompany: '',
    currentDesignation: '',
    totalExperience: '',
    relevantExperience: '',
    currentSalary: '',
    expectedSalary: '',
    noticePeriod: '',
    education: '',
    skills: '',
    certifications: '',
    coverLetter: '',
    whyInterested: '',
    availability: '',
    resume: null
  });

  const [formErrors, setFormErrors] = useState({});

  const steps = ['Personal Info', 'Professional Details', 'Application'];

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/jobs/${jobId}`);

      if (response.ok) {
        const data = await response.json();
        setJob(data.job);
      } else {
        const error = await response.json();
        setError(error.message || 'Job not found');
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      setError('Error loading job details');
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step) => {
    const errors = {};

    if (step === 0) {
      if (!formData.firstName.trim()) errors.firstName = 'First name is required';
      if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
      if (!formData.email.trim()) {
        errors.email = 'Email is required';
      } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
        errors.email = 'Please enter a valid email address';
      }
      if (!formData.phoneNumber.trim()) {
        errors.phoneNumber = 'Phone number is required';
      } else if (!/^\+?[\d\s-()]+$/.test(formData.phoneNumber)) {
        errors.phoneNumber = 'Please enter a valid phone number';
      }
      if (!formData.currentLocation.trim()) errors.currentLocation = 'Current location is required';
    }

    if (step === 1) {
      if (!formData.totalExperience) errors.totalExperience = 'Total experience is required';
      if (!formData.education.trim()) errors.education = 'Education details are required';
      if (!formData.skills.trim()) errors.skills = 'Skills are required';
    }

    if (step === 2) {
      if (!formData.resume) errors.resume = 'Resume is required';
      if (!formData.whyInterested.trim()) errors.whyInterested = 'Please tell us why you\'re interested';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(2)) return;

    try {
      setSubmitting(true);
      setError('');

      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'resume' && formData[key]) {
          submitData.append(key, formData[key]);
        } else if (key !== 'resume') {
          submitData.append(key, formData[key]);
        }
      });

      const response = await fetch(`/api/public/jobs/${jobId}/apply`, {
        method: 'POST',
        body: submitData
      });

      if (response.ok) {
        setSubmitted(true);
        setShowSuccessDialog(true);
      } else {
        const error = await response.json();
        setError(error.message || 'Error submitting application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      setError('Error submitting application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  const handleFile = (file) => {
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setFormErrors({...formErrors, resume: 'Only PDF and Word documents are allowed'});
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setFormErrors({...formErrors, resume: 'File size must be less than 5MB'});
        return;
      }

      setFormData({...formData, resume: file});
      setFormErrors({...formErrors, resume: ''});
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const formatSalary = (salary) => {
    if (!salary.min || !salary.max) return 'Competitive';
    return `₹${(salary.min / 100000).toFixed(1)}L - ₹${(salary.max / 100000).toFixed(1)}L`;
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}
      >
        <Box textAlign="center">
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary' }}>
            Loading job details...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error && !job) {
    return (
      <Box 
        sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}
      >
        <Container maxWidth="sm">
          <StyledCard>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 3, bgcolor: 'warning.main' }}>
                <WorkIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h4" gutterBottom color="error">
                Job Not Found
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                {error}
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/')}
                size="large"
              >
                Go Back
              </Button>
            </CardContent>
          </StyledCard>
        </Container>
      </Box>
    );
  }

  const renderPersonalInfo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="First Name"
          value={formData.firstName}
          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
          error={!!formErrors.firstName}
          helperText={formErrors.firstName}
          InputProps={{
            startAdornment: <PersonIcon sx={{ color: 'action.active', mr: 1 }} />
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Last Name"
          value={formData.lastName}
          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
          error={!!formErrors.lastName}
          helperText={formErrors.lastName}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          error={!!formErrors.email}
          helperText={formErrors.email}
          InputProps={{
            startAdornment: <EmailIcon sx={{ color: 'action.active', mr: 1 }} />
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Phone Number"
          value={formData.phoneNumber}
          onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
          error={!!formErrors.phoneNumber}
          helperText={formErrors.phoneNumber}
          InputProps={{
            startAdornment: <PhoneIcon sx={{ color: 'action.active', mr: 1 }} />
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Current Location"
          value={formData.currentLocation}
          onChange={(e) => setFormData({...formData, currentLocation: e.target.value})}
          error={!!formErrors.currentLocation}
          helperText={formErrors.currentLocation}
          InputProps={{
            startAdornment: <LocationOnIcon sx={{ color: 'action.active', mr: 1 }} />
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="LinkedIn Profile (Optional)"
          value={formData.linkedinProfile}
          onChange={(e) => setFormData({...formData, linkedinProfile: e.target.value})}
          placeholder="https://linkedin.com/in/yourprofile"
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Portfolio Website (Optional)"
          value={formData.portfolioWebsite}
          onChange={(e) => setFormData({...formData, portfolioWebsite: e.target.value})}
          placeholder="https://yourportfolio.com"
        />
      </Grid>
    </Grid>
  );

  const renderProfessionalDetails = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Current Company (Optional)"
          value={formData.currentCompany}
          onChange={(e) => setFormData({...formData, currentCompany: e.target.value})}
          InputProps={{
            startAdornment: <BusinessIcon sx={{ color: 'action.active', mr: 1 }} />
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Current Designation (Optional)"
          value={formData.currentDesignation}
          onChange={(e) => setFormData({...formData, currentDesignation: e.target.value})}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth error={!!formErrors.totalExperience}>
          <InputLabel>Total Experience</InputLabel>
          <Select
            value={formData.totalExperience}
            label="Total Experience"
            onChange={(e) => setFormData({...formData, totalExperience: e.target.value})}
          >
            <MenuItem value="0">Fresher</MenuItem>
            <MenuItem value="1">1 Year</MenuItem>
            <MenuItem value="2">2 Years</MenuItem>
            <MenuItem value="3">3 Years</MenuItem>
            <MenuItem value="4">4 Years</MenuItem>
            <MenuItem value="5">5 Years</MenuItem>
            <MenuItem value="6-10">6-10 Years</MenuItem>
            <MenuItem value="10+">10+ Years</MenuItem>
          </Select>
          {formErrors.totalExperience && (
            <FormHelperText>{formErrors.totalExperience}</FormHelperText>
          )}
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Relevant Experience (Optional)"
          value={formData.relevantExperience}
          onChange={(e) => setFormData({...formData, relevantExperience: e.target.value})}
          placeholder="e.g., 2 years in React development"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Current Salary (Optional)"
          value={formData.currentSalary}
          onChange={(e) => setFormData({...formData, currentSalary: e.target.value})}
          placeholder="e.g., 5,00,000"
          InputProps={{
            startAdornment: <AttachMoneyIcon sx={{ color: 'action.active', mr: 1 }} />
          }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Expected Salary (Optional)"
          value={formData.expectedSalary}
          onChange={(e) => setFormData({...formData, expectedSalary: e.target.value})}
          placeholder="e.g., 7,00,000"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Notice Period</InputLabel>
          <Select
            value={formData.noticePeriod}
            label="Notice Period"
            onChange={(e) => setFormData({...formData, noticePeriod: e.target.value})}
          >
            <MenuItem value="immediate">Immediate</MenuItem>
            <MenuItem value="15days">15 Days</MenuItem>
            <MenuItem value="1month">1 Month</MenuItem>
            <MenuItem value="2months">2 Months</MenuItem>
            <MenuItem value="3months">3 Months</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Education"
          value={formData.education}
          onChange={(e) => setFormData({...formData, education: e.target.value})}
          error={!!formErrors.education}
          helperText={formErrors.education}
          placeholder="e.g., B.Tech in Computer Science"
          InputProps={{
            startAdornment: <SchoolIcon sx={{ color: 'action.active', mr: 1 }} />
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Technical Skills"
          value={formData.skills}
          onChange={(e) => setFormData({...formData, skills: e.target.value})}
          error={!!formErrors.skills}
          helperText={formErrors.skills}
          placeholder="e.g., JavaScript, React, Node.js, Python, AWS"
          multiline
          rows={2}
          InputProps={{
            startAdornment: <CodeIcon sx={{ color: 'action.active', mr: 1, alignSelf: 'flex-start', mt: 1 }} />
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Certifications (Optional)"
          value={formData.certifications}
          onChange={(e) => setFormData({...formData, certifications: e.target.value})}
          placeholder="e.g., AWS Certified Developer, Google Cloud Professional"
          multiline
          rows={2}
        />
      </Grid>
    </Grid>
  );

  const renderApplication = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <CloudUploadIcon sx={{ mr: 1 }} />
          Upload Resume
        </Typography>
        <UploadBox
          isDragOver={isDragOver}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('resume-upload').click()}
        >
          <input
            id="resume-upload"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {formData.resume ? formData.resume.name : 'Drop your resume here or click to browse'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supports PDF, DOC, DOCX (Max 5MB)
          </Typography>
          {formErrors.resume && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {formErrors.resume}
            </Typography>
          )}
        </UploadBox>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Why are you interested in this position?"
          value={formData.whyInterested}
          onChange={(e) => setFormData({...formData, whyInterested: e.target.value})}
          error={!!formErrors.whyInterested}
          helperText={formErrors.whyInterested}
          multiline
          rows={4}
          placeholder="Tell us what excites you about this role and how you can contribute..."
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Cover Letter (Optional)"
          value={formData.coverLetter}
          onChange={(e) => setFormData({...formData, coverLetter: e.target.value})}
          multiline
          rows={4}
          placeholder="Share your story, achievements, and what makes you the perfect fit..."
        />
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>When can you start?</InputLabel>
          <Select
            value={formData.availability}
            label="When can you start?"
            onChange={(e) => setFormData({...formData, availability: e.target.value})}
          >
            <MenuItem value="immediately">Immediately</MenuItem>
            <MenuItem value="1week">Within 1 week</MenuItem>
            <MenuItem value="2weeks">Within 2 weeks</MenuItem>
            <MenuItem value="1month">Within 1 month</MenuItem>
            <MenuItem value="2months">Within 2 months</MenuItem>
            <MenuItem value="3months">Within 3 months</MenuItem>
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return renderPersonalInfo();
      case 1:
        return renderProfessionalDetails();
      case 2:
        return renderApplication();
      default:
        return 'Unknown step';
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      {/* Header */}
      <GradientBox>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
                  {job?.title}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  <Chip 
                    icon={<BusinessIcon />} 
                    label={job?.department?.name} 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                  <Chip 
                    icon={<LocationOnIcon />} 
                    label={job?.location} 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                  <Chip 
                    icon={<WorkIcon />} 
                    label={job?.employmentType} 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                  <Chip 
                    icon={<AttachMoneyIcon />} 
                    label={formatSalary(job?.salary || {})} 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                  />
                </Box>
                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                  Join our team and make an impact! 🚀
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <Avatar sx={{ width: 120, height: 120, mx: 'auto', mb: 2, bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <WorkIcon sx={{ fontSize: 60 }} />
                </Avatar>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Job Code: {job?.code}
                </Typography>
                {job?.closingDate && (
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    Apply by: {new Date(job.closingDate).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </GradientBox>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={4}>
          {/* Job Details */}
          <Grid item xs={12} lg={4}>
            <StyledCard sx={{ position: 'sticky', top: 24 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <DescriptionIcon sx={{ mr: 1 }} />
                  Job Details
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {job?.description}
                  </Typography>
                </Box>

                {job?.requirements && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Requirements
                    </Typography>
                    {job.requirements.education && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Education:</strong> {job.requirements.education}
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Experience:</strong> {job.requirements.experience?.min || 0} - {job.requirements.experience?.max || 10} years
                    </Typography>
                    {job.requirements.skills && job.requirements.skills.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Skills:</strong>
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {job.requirements.skills.map((skill, index) => (
                            <Chip key={index} label={skill} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}

                {job?.benefits && job.benefits.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Benefits
                    </Typography>
                    {job.benefits.map((benefit, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <StarIcon sx={{ fontSize: 16, color: 'success.main', mr: 1 }} />
                        <Typography variant="body2">{benefit}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </StyledCard>
          </Grid>

          {/* Application Form */}
          <Grid item xs={12} lg={8}>
            <StyledCard>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <PersonIcon sx={{ mr: 2 }} />
                  Apply for this Position
                </Typography>
                
                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}

                {/* Stepper */}
                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                  {steps.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>

                {/* Form Content */}
                <form onSubmit={handleSubmit}>
                  <Fade in={true} timeout={500}>
                    <Box>
                      {getStepContent(activeStep)}
                    </Box>
                  </Fade>

                  {/* Navigation Buttons */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                    <Button
                      disabled={activeStep === 0}
                      onClick={handleBack}
                      startIcon={<ArrowBackIcon />}
                      size="large"
                    >
                      Back
                    </Button>
                    
                    {activeStep === steps.length - 1 ? (
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={submitting}
                        startIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
                        size="large"
                        sx={{ minWidth: 160 }}
                      >
                        {submitting ? 'Submitting...' : 'Submit Application'}
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        size="large"
                      >
                        Next
                      </Button>
                    )}
                  </Box>
                </form>
              </CardContent>
            </StyledCard>
          </Grid>
        </Grid>
      </Container>

      {/* Success Dialog */}
      <Dialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Zoom}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 2 }}>
          <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'success.main' }}>
            <CheckCircleIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h4" color="success.main">
            Application Submitted!
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Thank you for applying for {job?.title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            We have received your application and will review it shortly. 
            You will receive a confirmation email at <strong>{formData.email}</strong>.
          </Typography>
          <Box sx={{ bgcolor: 'grey.50', p: 3, borderRadius: 2, mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>What's next?</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Our HR team will review your application
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • If shortlisted, we'll contact you within 5-7 business days
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Keep an eye on your email for updates
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            size="large"
            sx={{ mr: 2 }}
          >
            Browse More Jobs
          </Button>
          <Button
            variant="outlined"
            onClick={() => window.location.reload()}
            size="large"
          >
            Apply for Another Position
          </Button>
        </DialogActions>
      </Dialog>

      {/* Loading Backdrop */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={submitting}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Submitting your application...
          </Typography>
          <LinearProgress sx={{ mt: 2, width: 200 }} />
        </Box>
      </Backdrop>
    </Box>
  );
};

export default PublicJobApplication;
