import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Container,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Paper,
  Divider,
  IconButton
} from '@mui/material';
import {
  Work as WorkIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Description as DescriptionIcon,
  CloudUpload as CloudUploadIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import api from '../../utils/api';

const PublicJobApplication = () => {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    yearsOfExperience: '',
    currentDesignation: '',
    currentCompany: '',
    currentSalary: '',
    expectedSalary: '',
    noticePeriod: '1 month',
    technicalSkills: [''],
    education: {
      degree: '',
      specialization: '',
      university: '',
      graduationYear: '',
      percentage: ''
    },
    coverLetter: '',
    portfolioUrl: '',
    linkedinUrl: '',
    currentLocation: '',
    relocatable: false,
    preferredInterviewTime: 'Flexible'
  });

  const [resume, setResume] = useState(null);
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/recruitment/public/jobs/${jobId}`);
      setJob(response.data.data);
    } catch (error) {
      if (error.response?.status === 404) {
        showAlert('Job not found or no longer available', 'error');
      } else if (error.response?.status === 410) {
        showAlert('Job application deadline has passed', 'warning');
      } else {
        showAlert('Error loading job details', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSkillChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      technicalSkills: prev.technicalSkills.map((skill, i) => i === index ? value : skill)
    }));
  };

  const addSkill = () => {
    setFormData(prev => ({
      ...prev,
      technicalSkills: [...prev.technicalSkills, '']
    }));
  };

  const removeSkill = (index) => {
    setFormData(prev => ({
      ...prev,
      technicalSkills: prev.technicalSkills.filter((_, i) => i !== index)
    }));
  };

  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        showAlert('Please upload only PDF, DOC, or DOCX files', 'error');
        e.target.value = '';
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        showAlert('File size should not exceed 5MB', 'error');
        e.target.value = '';
        return;
      }
      
      setResume(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    if (!formData.yearsOfExperience) newErrors.yearsOfExperience = 'Years of experience is required';
    if (!resume) newErrors.resume = 'Resume is required';
    
    const validSkills = formData.technicalSkills.filter(skill => skill.trim());
    if (validSkills.length === 0) newErrors.technicalSkills = 'At least one technical skill is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setSubmitting(true);
      
      const submitData = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (key === 'education') {
          submitData.append(key, JSON.stringify(formData[key]));
        } else if (key === 'technicalSkills') {
          const validSkills = formData[key].filter(skill => skill.trim());
          submitData.append(key, JSON.stringify(validSkills));
        } else {
          submitData.append(key, formData[key]);
        }
      });
      
      if (resume) {
        submitData.append('resume', resume);
      }
      
      const response = await api.post(`/recruitment/public/jobs/${jobId}/apply`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setApplicationNumber(response.data.data.applicationNumber);
      setSubmitted(true);
      
    } catch (error) {
      if (error.response?.status === 409) {
        showAlert('You have already applied for this job', 'warning');
      } else {
        showAlert(error.response?.data?.message || 'Error submitting application', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Box textAlign="center">
            <CircularProgress />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Loading job details...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  if (!job) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <WarningIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Job Not Available
            </Typography>
            <Typography variant="body1" color="text.secondary">
              This job posting is no longer available or has expired.
            </Typography>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (submitted) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom color="success.main">
              Application Submitted Successfully!
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Thank you for your interest in this position.
            </Typography>
            <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Application Number:</strong>
              </Typography>
              <Typography variant="h6" fontFamily="monospace" color="primary.main">
                {applicationNumber}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Please save this application number for future reference.
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => window.close()}
              sx={{ mt: 3 }}
            >
              Close
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {alert.show && (
        <Alert 
          severity={alert.type} 
          onClose={() => setAlert({ show: false, message: '', type: '' })}
          sx={{ mb: 3 }}
        >
          {alert.message}
        </Alert>
      )}

      {/* Job Details */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <WorkIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h4" component="h1">
              {job.title}
            </Typography>
          </Box>
          
          <Box display="flex" gap={1} mb={3}>
            <Chip label={job.code} color="primary" />
            <Chip label={job.department?.name} color="info" />
            <Chip label={job.employmentType} color="default" />
            <Chip label={job.workMode} color="success" />
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" gutterBottom>
                <strong>Location:</strong> {job.location}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Experience Required:</strong> {job.requirements?.experience?.min || 0} - {job.requirements?.experience?.max || 10} years
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Openings:</strong> {job.openings}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" gutterBottom>
                <strong>Employment Type:</strong> {job.employmentType}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Work Mode:</strong> {job.workMode}
              </Typography>
              {job.closingDate && (
                <Typography variant="body2" gutterBottom>
                  <strong>Application Deadline:</strong> {new Date(job.closingDate).toLocaleDateString()}
                </Typography>
              )}
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Job Description
          </Typography>
          <Typography variant="body1" paragraph>
            {job.description}
          </Typography>
          
              {job.requirements?.skills?.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Required Skills
                  </Typography>
                  <Box sx={{ mb: 3 }}>
                    {job.requirements.skills && job.requirements.skills.map((skill, index) => (
                      <Chip key={index} label={skill} variant="outlined" sx={{ mr: 1, mb: 1 }} />
                    ))}
                  </Box>
                </>
              )}
          
          {job.benefits?.length > 0 && (
            <>
              <Typography variant="h6" gutterBottom>
                Benefits
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                {job.benefits && job.benefits.map((benefit, index) => (
                  <Typography component="li" key={index} variant="body2">
                    {benefit}
                  </Typography>
                ))}
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Application Form */}
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Apply for this Position
          </Typography>
          
          <form onSubmit={handleSubmit}>
            {/* Personal Information */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1 }} />
                Personal Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="First Name *"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    error={!!errors.firstName}
                    helperText={errors.firstName}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Last Name *"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    error={!!errors.lastName}
                    helperText={errors.lastName}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="email"
                    label="Email Address *"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    error={!!errors.email}
                    helperText={errors.email}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="tel"
                    label="Phone Number *"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    error={!!errors.phoneNumber}
                    helperText={errors.phoneNumber}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Current Location"
                    name="currentLocation"
                    value={formData.currentLocation}
                    onChange={handleInputChange}
                    placeholder="City, State"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Preferred Interview Time</InputLabel>
                    <Select
                      name="preferredInterviewTime"
                      value={formData.preferredInterviewTime}
                      label="Preferred Interview Time"
                      onChange={handleInputChange}
                    >
                      <MenuItem value="Morning">Morning</MenuItem>
                      <MenuItem value="Afternoon">Afternoon</MenuItem>
                      <MenuItem value="Evening">Evening</MenuItem>
                      <MenuItem value="Flexible">Flexible</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="relocatable"
                        checked={formData.relocatable}
                        onChange={handleInputChange}
                      />
                    }
                    label="I am willing to relocate for this position"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Professional Information */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <WorkIcon sx={{ mr: 1 }} />
                Professional Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Years of Experience *"
                    name="yearsOfExperience"
                    value={formData.yearsOfExperience}
                    onChange={handleInputChange}
                    error={!!errors.yearsOfExperience}
                    helperText={errors.yearsOfExperience}
                    inputProps={{ min: 0, max: 50 }}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Current Company"
                    name="currentCompany"
                    value={formData.currentCompany}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Current Designation"
                    name="currentDesignation"
                    value={formData.currentDesignation}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Current Salary (₹)"
                    name="currentSalary"
                    value={formData.currentSalary}
                    onChange={handleInputChange}
                    placeholder="Annual CTC"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Expected Salary (₹)"
                    name="expectedSalary"
                    value={formData.expectedSalary}
                    onChange={handleInputChange}
                    placeholder="Annual CTC"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Notice Period</InputLabel>
                    <Select
                      name="noticePeriod"
                      value={formData.noticePeriod}
                      label="Notice Period"
                      onChange={handleInputChange}
                    >
                      <MenuItem value="Immediate">Immediate</MenuItem>
                      <MenuItem value="15 days">15 days</MenuItem>
                      <MenuItem value="1 month">1 month</MenuItem>
                      <MenuItem value="2 months">2 months</MenuItem>
                      <MenuItem value="3 months">3 months</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Technical Skills */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Technical Skills *
              </Typography>
              {formData.technicalSkills && formData.technicalSkills.map((skill, index) => (
                <Box key={index} display="flex" gap={1} mb={2}>
                  <TextField
                    fullWidth
                    value={skill}
                    onChange={(e) => handleSkillChange(index, e.target.value)}
                    placeholder="e.g., JavaScript, React, Node.js"
                  />
                  {formData.technicalSkills.length > 1 && (
                    <IconButton
                      color="error"
                      onClick={() => removeSkill(index)}
                    >
                      <RemoveIcon />
                    </IconButton>
                  )}
                </Box>
              ))}
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addSkill}
                sx={{ mb: 2 }}
              >
                Add Skill
              </Button>
              {errors.technicalSkills && (
                <Typography variant="caption" color="error" display="block">
                  {errors.technicalSkills}
                </Typography>
              )}
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Education */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <SchoolIcon sx={{ mr: 1 }} />
                Education
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Degree"
                    name="education.degree"
                    value={formData.education.degree}
                    onChange={handleInputChange}
                    placeholder="e.g., Bachelor of Technology"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Specialization"
                    name="education.specialization"
                    value={formData.education.specialization}
                    onChange={handleInputChange}
                    placeholder="e.g., Computer Science"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="University/College"
                    name="education.university"
                    value={formData.education.university}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Graduation Year"
                    name="education.graduationYear"
                    value={formData.education.graduationYear}
                    onChange={handleInputChange}
                    inputProps={{ min: 1980, max: new Date().getFullYear() + 5 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Percentage/CGPA"
                    name="education.percentage"
                    value={formData.education.percentage}
                    onChange={handleInputChange}
                    placeholder="e.g., 85% or 8.5 CGPA"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Resume Upload */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <DescriptionIcon sx={{ mr: 1 }} />
                Resume *
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  textAlign: 'center',
                  border: errors.resume ? '2px dashed red' : '2px dashed #ccc',
                  cursor: 'pointer'
                }}
                onClick={() => document.getElementById('resume-upload').click()}
              >
                <input
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeChange}
                  style={{ display: 'none' }}
                />
                <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" gutterBottom>
                  {resume ? resume.name : 'Click to upload your resume'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Upload your resume in PDF, DOC, or DOCX format (Max 5MB)
                </Typography>
                {errors.resume && (
                  <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                    {errors.resume}
                  </Typography>
                )}
              </Paper>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Additional Information */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Additional Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="url"
                    label="Portfolio URL"
                    name="portfolioUrl"
                    value={formData.portfolioUrl}
                    onChange={handleInputChange}
                    placeholder="https://yourportfolio.com"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="url"
                    label="LinkedIn Profile"
                    name="linkedinUrl"
                    value={formData.linkedinUrl}
                    onChange={handleInputChange}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Cover Letter"
                    name="coverLetter"
                    value={formData.coverLetter}
                    onChange={handleInputChange}
                    placeholder="Tell us why you're interested in this position..."
                    inputProps={{ maxLength: 2000 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formData.coverLetter.length}/2000 characters
                  </Typography>
                </Grid>
              </Grid>
            </Box>

            <Box textAlign="center">
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={20} /> : <SendIcon />}
                sx={{ px: 4, py: 1.5 }}
              >
                {submitting ? 'Submitting Application...' : 'Submit Application'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default PublicJobApplication;
