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
  Switch,
  FormControlLabel,
  Menu,
  Pagination,
  Autocomplete,
  Divider,
  OutlinedInput,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Share as ShareIcon,
  Close as CloseIcon,
  Work as WorkIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  AttachMoney as AttachMoneyIcon,
  LocationOn as LocationOnIcon,
  Business as BusinessIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const JobPostings = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showJobPreview, setShowJobPreview] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  
  const [filters, setFilters] = useState({
    status: '',
    department: '',
    search: ''
  });
  
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  const [formData, setFormData] = useState({
    title: '',
    code: '',
    department: '',
    description: '',
    requirements: {
      education: '',
      experience: { min: 0, max: 10 },
      skills: [],
      certifications: []
    },
    salary: {
      min: '',
      max: '',
      currency: 'INR'
    },
    employmentType: 'Full-time',
    workMode: 'On-site',
    location: '',
    openings: 1,
    priority: 'Medium',
    closingDate: '',
    interviewProcess: [
      {
        stage: '',
        description: '',
        duration: 30
      }
    ],
    benefits: [],
    tags: [],
    isUrgent: false,
    isRemote: false
  });

  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    fetchJobs();
    fetchDepartments();
    fetchUsers();
  }, [filters, pagination.current]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.current,
        limit: 10,
        ...filters
      });
      
      const response = await api.get(`/recruitment/jobs?${params}`);
      setJobs(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      showAlert('Error fetching jobs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/recruitment/departments');
      setDepartments(response.data.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      // Handle different possible response structures
      const userData = response.data?.data || response.data?.users || response.data || [];
      setUsers(userData.filter(u => u.role !== 'Employee'));
    } catch (error) {
      console.error('Error fetching users:', error);
      // If the main users endpoint fails, try to get users from interviewers endpoint
      try {
        const interviewerResponse = await api.get('/recruitment/interviewers');
        const interviewerData = interviewerResponse.data?.data || [];
        setUsers(interviewerData);
      } catch (interviewerError) {
        console.error('Error fetching interviewers as fallback:', interviewerError);
        showAlert('Error loading hiring managers and recruiters', 'warning');
      }
    }
  };



  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child, subChild] = name.split('.');
      
      if (subChild) {
        // Handle nested objects like requirements.experience.min
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: {
              ...prev[parent][child],
              [subChild]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
            }
          }
        }));
      } else {
        // Handle single level nested objects like salary.min
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required field validations
    if (!formData.title || !formData.title.trim()) {
      newErrors.title = 'Job title is required';
    }
    if (!formData.code || !formData.code.trim()) {
      newErrors.code = 'Job code is required';
    }
    if (!formData.department) {
      newErrors.department = 'Department is required';
    }
    if (!formData.description || !formData.description.trim()) {
      newErrors.description = 'Job description is required';
    }
    if (!formData.location || !formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (!formData.openings || formData.openings < 1) {
      newErrors.openings = 'At least 1 opening is required';
    }
    
    // Salary validation
    if (formData.salary.min && formData.salary.max) {
      if (Number(formData.salary.min) > Number(formData.salary.max)) {
        newErrors.salary = 'Minimum salary cannot be greater than maximum salary';
      }
    }
    
    // Experience validation
    if (formData.requirements.experience.min > formData.requirements.experience.max) {
      newErrors.experience = 'Minimum experience cannot be greater than maximum experience';
    }
    
    // Interview process validation
    const validStages = formData.interviewProcess.filter(stage => stage.stage && stage.stage.trim());
    if (validStages.length === 0) {
      // This is okay, we'll add a default stage in handleSubmit
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      // Clean and validate data before submission
      const submitData = {
        ...formData,
        // Ensure department is a valid ObjectId string
        department: formData.department || '',
        // Clean up requirements
        requirements: {
          ...formData.requirements,
          skills: formData.requirements.skills.filter(s => s && s.trim()),
          certifications: formData.requirements.certifications.filter(c => c && c.trim()),
          experience: {
            min: Number(formData.requirements.experience.min) || 0,
            max: Number(formData.requirements.experience.max) || 10
          }
        },
        // Clean up arrays
        benefits: formData.benefits.filter(b => b && b.trim()),
        tags: formData.tags.filter(t => t && t.trim()),
        // Clean up interview process - remove empty stages
        interviewProcess: formData.interviewProcess.filter(stage => 
          stage.stage && stage.stage.trim()
        ).map(stage => ({
          stage: stage.stage.trim(),
          description: stage.description ? stage.description.trim() : '',
          duration: stage.duration || 30
        })),
        // Ensure salary values are numbers or empty
        salary: {
          min: formData.salary.min ? Number(formData.salary.min) : undefined,
          max: formData.salary.max ? Number(formData.salary.max) : undefined,
          currency: formData.salary.currency || 'INR'
        },
        // Ensure openings is a number
        openings: Number(formData.openings) || 1,
        // Clean up location
        location: formData.location ? formData.location.trim() : ''
      };

      // Remove undefined values from salary
      if (!submitData.salary.min) delete submitData.salary.min;
      if (!submitData.salary.max) delete submitData.salary.max;

      // Ensure at least one interview stage exists
      if (submitData.interviewProcess.length === 0) {
        submitData.interviewProcess = [{
          stage: 'Initial Interview',
          description: 'Initial screening interview',
          duration: 30
        }];
      }

      console.log('Submitting job data:', JSON.stringify(submitData, null, 2));

      if (editingJob) {
        await api.put(`/recruitment/jobs/${editingJob._id}`, submitData);
        showAlert('Job updated successfully', 'success');
      } else {
        await api.post('/recruitment/jobs', submitData);
        showAlert('Job created successfully', 'success');
      }
      
      setShowModal(false);
      setEditingJob(null);
      resetForm();
      fetchJobs();
    } catch (error) {
      console.error('Error saving job:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Error saving job';
      
      if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || 'Validation failed. Please check all required fields.';
        if (error.response.data?.details) {
          console.error('Validation details:', error.response.data.details);
          // Show specific validation errors
          const validationErrors = Object.values(error.response.data.details).map(err => err.message).join(', ');
          errorMessage += ` Details: ${validationErrors}`;
        }
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. You need HR Manager role to create jobs.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else {
        errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      }
      
      showAlert(errorMessage, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      code: '',
      department: '',
      description: '',
      requirements: {
        education: '',
        experience: { min: 0, max: 10 },
        skills: [],
        certifications: []
      },
      salary: {
        min: '',
        max: '',
        currency: 'INR'
      },
      employmentType: 'Full-time',
      workMode: 'On-site',
      location: '',
      openings: 1,
      priority: 'Medium',
      closingDate: '',
      interviewProcess: [
        {
          stage: '',
          description: '',
          duration: 30
        }
      ],
      benefits: [],
      tags: [],
      isUrgent: false,
      isRemote: false
    });
    setErrors({});
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      ...job,
      department: job.department?._id || '',
      closingDate: job.closingDate ? new Date(job.closingDate).toISOString().split('T')[0] : ''
    });
    
    setShowModal(true);
    setAnchorEl(null);
  };

  const handlePublish = async (jobId) => {
    try {
      await api.patch(`/recruitment/jobs/${jobId}/publish`);
      showAlert('Job published successfully', 'success');
      fetchJobs();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Error publishing job', 'error');
    }
    setAnchorEl(null);
  };

  const handleClose = async (jobId) => {
    const reason = prompt('Please provide a reason for closing this job:');
    if (!reason) return;
    
    try {
      await api.patch(`/recruitment/jobs/${jobId}/close`, { reason });
      showAlert('Job closed successfully', 'success');
      fetchJobs();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Error closing job', 'error');
    }
    setAnchorEl(null);
  };

  const getStatusColor = (status) => {
    const variants = {
      'Draft': 'default',
      'Active': 'success',
      'Paused': 'warning',
      'Closed': 'error',
      'Cancelled': 'default'
    };
    return variants[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const variants = {
      'Low': 'info',
      'Medium': 'primary',
      'High': 'warning',
      'Urgent': 'error'
    };
    return variants[priority] || 'primary';
  };

  const handleMenuClick = (event, job) => {
    setAnchorEl(event.currentTarget);
    setSelectedJob(job);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedJob(null);
  };

  // Format job for display with emojis
  const formatJobDisplay = (job) => {
    const salaryRange = job.salary?.min && job.salary?.max 
      ? `₹${(job.salary.min / 100000).toFixed(1)}L - ₹${(job.salary.max / 100000).toFixed(1)}L`
      : 'Not specified';
    
    const experienceRange = job.requirements?.experience 
      ? `${job.requirements.experience.min} - ${job.requirements.experience.max} years`
      : 'Not specified';

    const skills = job.requirements?.skills?.length 
      ? job.requirements.skills.join(', ')
      : 'Not specified';

    const benefits = job.benefits?.length 
      ? job.benefits.map(benefit => `• ${benefit}`).join('\n')
      : '• Not specified';

    const publicLink = `${window.location.origin}/apply/${job._id}`;
    const applyLink = `${window.location.origin}/apply/${job._id}`;

    return `🚀 JOB OPPORTUNITY 🚀

📋 Position: ${job.title}
🏢 Department: ${job.department?.name || 'Not specified'}
📍 Location: ${job.location}
💼 Employment Type: ${job.employmentType}
🏠 Work Mode: ${job.workMode}
💰 Salary: ${salaryRange}
👥 Openings: ${job.openings}
📅 Posted: ${job.postedDate ? new Date(job.postedDate).toLocaleDateString() : new Date().toLocaleDateString()}

📝 Job Description:
${job.description}

✅ Requirements:
• Education: ${job.requirements?.education || 'Not specified'}
• Experience: ${experienceRange}
• Skills: ${skills}
• Certifications: ${job.requirements?.certifications?.join(', ') || 'Not specified'}

🎯 Benefits:
${benefits}

🔗 View Job Details: ${publicLink}
📝 Apply Now: ${applyLink}`;
  };

  const handleJobPreview = (job) => {
    setSelectedJob(job);
    setShowJobPreview(true);
    setAnchorEl(null);
  };

  const copyJobDetails = (job) => {
    const formattedJob = formatJobDisplay(job);
    navigator.clipboard.writeText(formattedJob);
    showAlert('Job details copied to clipboard!', 'success');
    setAnchorEl(null);
  };

  // Add new interview stage
  const addInterviewStage = () => {
    const newStage = {
      stage: '',
      description: '',
      duration: 30
    };
    setFormData(prev => ({
      ...prev,
      interviewProcess: [...prev.interviewProcess, newStage]
    }));
  };

  // Remove interview stage
  const removeInterviewStage = (index) => {
    if (formData.interviewProcess.length > 1) {
      const newProcess = formData.interviewProcess.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        interviewProcess: newProcess
      }));
    }
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
            <WorkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Job Postings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create and manage job openings
          </Typography>
        </Box>
        {user?.role === 'HR Manager' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowModal(true)}
          >
            Create Job
          </Button>
        )}
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
                  <MenuItem value="Draft">Draft</MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Paused">Paused</MenuItem>
                  <MenuItem value="Closed">Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={filters.department}
                  label="Department"
                  onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments && departments.map(dept => (
                    <MenuItem key={dept._id} value={dept._id}>{dept.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Search"
                placeholder="Search by title, code, or description..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchJobs}
                fullWidth
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Access Control Message for Non-HR Managers */}
      {user?.role !== 'HR Manager' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Access Restricted:</strong> Job creation and management is limited to HR Manager role only. 
            You can view job listings but cannot create, edit, or manage jobs.
          </Typography>
        </Alert>
      )}

      {/* Jobs Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <Box textAlign="center">
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>
                  Loading jobs...
                </Typography>
              </Box>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Job Title</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Openings</TableCell>
                      <TableCell>Posted Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {jobs && jobs.map(job => (
                      <TableRow key={job._id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {job.title}
                              {job.isUrgent && (
                                <Chip label="Urgent" color="error" size="small" sx={{ ml: 1 }} />
                              )}
                              {job.isRemote && (
                                <Chip label="Remote" color="info" size="small" sx={{ ml: 1 }} />
                              )}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {job.location}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {job.code}
                          </Typography>
                        </TableCell>
                        <TableCell>{job.department?.name}</TableCell>
                        <TableCell>
                          <Chip
                            label={job.status}
                            color={getStatusColor(job.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={job.priority}
                            color={getPriorityColor(job.priority)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{job.openings}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {job.postedDate ? new Date(job.postedDate).toLocaleDateString() : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {/* Hide 3-dot menu for closed/cancelled jobs */}
                          {job.status !== 'Closed' && job.status !== 'Cancelled' ? (
                            <IconButton
                              onClick={(e) => handleMenuClick(e, job)}
                              size="small"
                            >
                              <MoreVertIcon />
                            </IconButton>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              No actions available
                            </Typography>
                          )}
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
        {user?.role === 'HR Manager' && (
          <MenuItem onClick={() => handleEdit(selectedJob)}>
            <EditIcon sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        <MenuItem onClick={() => handleJobPreview(selectedJob)}>
          <VisibilityIcon sx={{ mr: 1 }} />
          Preview Job
        </MenuItem>
        <MenuItem onClick={() => copyJobDetails(selectedJob)}>
          <ShareIcon sx={{ mr: 1 }} />
          Copy Job Details
        </MenuItem>
        {user?.role === 'HR Manager' && selectedJob?.status === 'Draft' && (
          <MenuItem onClick={() => handlePublish(selectedJob._id)}>
            <PlayArrowIcon sx={{ mr: 1 }} />
            Publish
          </MenuItem>
        )}
        {user?.role === 'HR Manager' && selectedJob?.status === 'Active' && (
          <MenuItem onClick={() => handleClose(selectedJob._id)}>
            <StopIcon sx={{ mr: 1 }} />
            Close
          </MenuItem>
        )}
        <MenuItem onClick={() => window.location.href = `/admin/recruitment/applications?job=${selectedJob?._id}`}>
          <PersonIcon sx={{ mr: 1 }} />
          View Applications
        </MenuItem>
      </Menu>

      {/* Create/Edit Job Dialog */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingJob ? 'Edit Job' : 'Create New Job'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Job Title *"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  error={!!errors.title}
                  helperText={errors.title}
                  placeholder="e.g., Senior Software Engineer"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Job Code *"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  error={!!errors.code}
                  helperText={errors.code}
                  placeholder="e.g., SSE001"
                />
              </Grid>

              <Grid item xs={12} md={12}>
                <FormControl fullWidth error={!!errors.department}>
                  <InputLabel>Department *</InputLabel>
                  <Select
                    name="department"
                    value={formData.department}
                    label="Department *"
                    onChange={handleInputChange}
                  >
                  <MenuItem value="">Select Department</MenuItem>
                  {departments && departments.map(dept => (
                    <MenuItem key={dept._id} value={dept._id}>{dept.name}</MenuItem>
                  ))}
                  </Select>
                  {errors.department && (
                    <Typography variant="caption" color="error" sx={{ ml: 2 }}>
                      {errors.department}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Job Description *"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  error={!!errors.description}
                  helperText={errors.description}
                  placeholder="Describe the role, responsibilities, and requirements..."
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Employment Type</InputLabel>
                  <Select
                    name="employmentType"
                    value={formData.employmentType}
                    label="Employment Type"
                    onChange={handleInputChange}
                  >
                    <MenuItem value="Full-time">Full-time</MenuItem>
                    <MenuItem value="Part-time">Part-time</MenuItem>
                    <MenuItem value="Contract">Contract</MenuItem>
                    <MenuItem value="Internship">Internship</MenuItem>
                    <MenuItem value="Freelance">Freelance</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Work Mode</InputLabel>
                  <Select
                    name="workMode"
                    value={formData.workMode}
                    label="Work Mode"
                    onChange={handleInputChange}
                  >
                    <MenuItem value="On-site">On-site</MenuItem>
                    <MenuItem value="Remote">Remote</MenuItem>
                    <MenuItem value="Hybrid">Hybrid</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
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
                    <MenuItem value="Urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Location *"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  error={!!errors.location}
                  helperText={errors.location}
                  placeholder="e.g., Bangalore, India"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Openings *"
                  name="openings"
                  value={formData.openings}
                  onChange={handleInputChange}
                  error={!!errors.openings}
                  helperText={errors.openings}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="date"
                  label="Closing Date"
                  name="closingDate"
                  value={formData.closingDate}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>


              {/* Salary Range */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }}>
                  <Typography variant="h6" color="primary">
                    <AttachMoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Salary Information
                  </Typography>
                </Divider>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Salary (₹)"
                  name="salary.min"
                  value={formData.salary.min}
                  onChange={handleInputChange}
                  error={!!errors.salary}
                  helperText={errors.salary}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                  placeholder="e.g., 400000"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Maximum Salary (₹)"
                  name="salary.max"
                  value={formData.salary.max}
                  onChange={handleInputChange}
                  error={!!errors.salary}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                  placeholder="e.g., 500000"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    name="salary.currency"
                    value={formData.salary.currency}
                    label="Currency"
                    onChange={handleInputChange}
                  >
                    <MenuItem value="INR">INR (₹)</MenuItem>
                    <MenuItem value="USD">USD ($)</MenuItem>
                    <MenuItem value="EUR">EUR (€)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Requirements */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }}>
                  <Typography variant="h6" color="primary">
                    Requirements
                  </Typography>
                </Divider>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Education"
                  name="requirements.education"
                  value={formData.requirements.education}
                  onChange={handleInputChange}
                  placeholder="e.g., Bachelor's in Computer Science"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Min Experience (years)"
                  name="requirements.experience.min"
                  value={formData.requirements.experience.min}
                  onChange={handleInputChange}
                  error={!!errors.experience}
                  helperText={errors.experience}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Experience (years)"
                  name="requirements.experience.max"
                  value={formData.requirements.experience.max}
                  onChange={handleInputChange}
                  error={!!errors.experience}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  multiple
                  freeSolo
                  options={[]}
                  value={formData.requirements.skills}
                  onChange={(event, newValue) => {
                    setFormData(prev => ({
                      ...prev,
                      requirements: {
                        ...prev.requirements,
                        skills: newValue
                      }
                    }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Skills"
                      placeholder="Add skills (press Enter)"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  multiple
                  freeSolo
                  options={[]}
                  value={formData.requirements.certifications}
                  onChange={(event, newValue) => {
                    setFormData(prev => ({
                      ...prev,
                      requirements: {
                        ...prev.requirements,
                        certifications: newValue
                      }
                    }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Certifications"
                      placeholder="Add certifications (press Enter)"
                    />
                  )}
                />
              </Grid>

              {/* Interview Process */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }}>
                  <Typography variant="h6" color="primary">
                    <GroupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Interview Process
                  </Typography>
                </Divider>
              </Grid>
              {formData.interviewProcess.map((stage, index) => (
                <Grid item xs={12} key={index}>
                  <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Stage Name"
                          value={stage.stage}
                          onChange={(e) => {
                            const newProcess = [...formData.interviewProcess];
                            newProcess[index].stage = e.target.value;
                            setFormData(prev => ({ ...prev, interviewProcess: newProcess }));
                          }}
                          placeholder="e.g., Technical Round, HR Round"
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Duration (min)"
                          value={stage.duration}
                          onChange={(e) => {
                            const newProcess = [...formData.interviewProcess];
                            newProcess[index].duration = parseInt(e.target.value);
                            setFormData(prev => ({ ...prev, interviewProcess: newProcess }));
                          }}
                          inputProps={{ min: 15 }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          label="Stage Description"
                          value={stage.description}
                          onChange={(e) => {
                            const newProcess = [...formData.interviewProcess];
                            newProcess[index].description = e.target.value;
                            setFormData(prev => ({ ...prev, interviewProcess: newProcess }));
                          }}
                          placeholder="Describe what this interview stage covers..."
                        />
                      </Grid>
                      <Grid item xs={12} md={1}>
                        <Box display="flex" flexDirection="column" gap={1}>
                          {index === formData.interviewProcess.length - 1 && (
                            <IconButton
                              onClick={addInterviewStage}
                              color="primary"
                              size="small"
                              title="Add Stage"
                            >
                              <AddIcon />
                            </IconButton>
                          )}
                          {formData.interviewProcess.length > 1 && (
                            <IconButton
                              onClick={() => removeInterviewStage(index)}
                              color="error"
                              size="small"
                              title="Remove Stage"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Box>
                      </Grid>
                    </Grid>
                  </Card>
                </Grid>
              ))}

              {/* Benefits */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }}>
                  <Typography variant="h6" color="primary">
                    Benefits & Perks
                  </Typography>
                </Divider>
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  freeSolo
                  options={[]}
                  value={formData.benefits}
                  onChange={(event, newValue) => {
                    setFormData(prev => ({ ...prev, benefits: newValue }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Benefits"
                      placeholder="Add benefits (press Enter)"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      name="isUrgent"
                      checked={formData.isUrgent}
                      onChange={handleInputChange}
                    />
                  }
                  label="Mark as Urgent"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      name="isRemote"
                      checked={formData.isRemote}
                      onChange={handleInputChange}
                    />
                  }
                  label="Remote Position"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              {editingJob ? 'Update Job' : 'Create Job'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Job Preview Dialog */}
      <Dialog 
        open={showJobPreview} 
        onClose={() => setShowJobPreview(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Job Preview</Typography>
            <IconButton onClick={() => setShowJobPreview(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedJob && (
            <Box>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 3, 
                  backgroundColor: 'grey.50',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-line',
                  fontSize: '14px',
                  lineHeight: 1.6
                }}
              >
                {formatJobDisplay(selectedJob)}
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => copyJobDetails(selectedJob)}
            startIcon={<ShareIcon />}
          >
            Copy to Clipboard
          </Button>
          <Button onClick={() => setShowJobPreview(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JobPostings;
