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
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Email as EmailIcon,
  Person as PersonIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Send as SendIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  Work as WorkIcon,
  PersonAdd as PersonAddIcon,
  Groups as GroupsIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const OfferLetters = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [offerLetters, setOfferLetters] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  const [offerData, setOfferData] = useState({
    position: '',
    department: '',
    salary: '',
    joiningDate: '',
    validUntil: '',
    benefits: '',
    workLocation: '',
    workingHours: '',
    reportingManager: '',
    additionalTerms: ''
  });

  // Add User Modal States
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [managers, setManagers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [addUserData, setAddUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'Employee',
    department: '',
    employeeId: '',
    phoneNumber: '',
    designation: '',
    joiningDate: '',
    isActive: true
  });
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [showTeamAssignment, setShowTeamAssignment] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [addUserValidationErrors, setAddUserValidationErrors] = useState({});

  useEffect(() => {
    fetchOfferLetters();
    fetchSelectedApplications();
    fetchDepartments();
    fetchManagers();
    fetchRoles();
    fetchAllTeams();
  }, [filters, pagination.current]);

  // Handle candidate selection from interviews page
  useEffect(() => {
    if (location.state && location.state.selectedCandidate) {
      const candidate = location.state.selectedCandidate;
      console.log('Selected candidate from interviews:', candidate);
      
      // Set the selected application
      setSelectedApplication(candidate.application);
      
      // Pre-fill offer data
      setOfferData(prev => ({
        ...prev,
        position: candidate.application?.job?.title || '',
        department: candidate.application?.job?.department || '',
        // Set default joining date to 2 weeks from now
        joiningDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        // Set default valid until to 1 week from now
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        workLocation: 'Office',
        workingHours: '9:00 AM - 6:00 PM'
      }));
      
      // Open the generate dialog
      setShowGenerateDialog(true);
      
      // Clear the location state to prevent reopening on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);

  const fetchOfferLetters = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.current,
        limit: 10,
        ...filters
      });

      const response = await fetch(`/api/recruitment/offers?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOfferLetters(data.data || []);
        setPagination(data.pagination || { current: 1, pages: 1, total: 0 });
      }
    } catch (error) {
      console.error('Error fetching offer letters:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectedApplications = async () => {
    try {
      const response = await fetch('/api/recruitment/applications?status=Selected', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching selected applications:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/recruitment/departments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDepartments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchAllTeams = async () => {
    try {
      const response = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTeams(data.teams || []);
        }
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await fetch('/api/recruitment/hiring-managers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setManagers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/users/roles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRoles(data.roles || []);
        }
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const generateEmployeeId = async (role) => {
    try {
      const response = await fetch(`/api/users/next-employee-id?role=${role}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return data.employeeId;
        }
      }
    } catch (error) {
      console.error('Error generating employee ID:', error);
    }
    return '';
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'Draft': 'default',
      'Generated': 'primary',
      'Sent': 'info',
      'Viewed': 'warning',
      'Accepted': 'success',
      'Rejected': 'error',
      'Expired': 'error'
    };
    return statusColors[status] || 'default';
  };

  const handleGenerateOffer = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/recruitment/applications/${selectedApplication._id}/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(offerData)
      });

      if (response.ok) {
        setShowGenerateDialog(false);
        setSelectedApplication(null); // Clear selected application
        setOfferData({
          position: '',
          department: '',
          salary: '',
          joiningDate: '',
          validUntil: '',
          benefits: '',
          workLocation: '',
          workingHours: '',
          reportingManager: '',
          additionalTerms: ''
        });
        fetchOfferLetters();
        fetchSelectedApplications();
        alert('Offer letter generated successfully!');
      } else {
        const errorData = await response.json();
        alert(`Error generating offer letter: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating offer:', error);
      alert('Error generating offer letter');
    }
  };

  const handleSendOffer = async (offerId) => {
    try {
      const response = await fetch(`/api/recruitment/offers/${offerId}/send`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchOfferLetters();
        alert('Offer letter sent successfully!');
      } else {
        alert('Error sending offer letter');
      }
    } catch (error) {
      console.error('Error sending offer:', error);
      alert('Error sending offer letter');
    }
  };

  const handleAddUserClick = async (offer) => {
    setSelectedOffer(offer);
    
    // Pre-fill form data from offer
    const employeeId = await generateEmployeeId('Employee');
    
    setAddUserData({
      firstName: offer.candidate?.firstName || '',
      lastName: offer.candidate?.lastName || '',
      email: offer.candidate?.email || '',
      role: 'Employee',
      department: offer.department?._id || '',
      employeeId: employeeId,
      phoneNumber: offer.candidate?.phoneNumber || '',
      designation: offer.designation || '',
      joiningDate: offer.proposedJoiningDate ? new Date(offer.proposedJoiningDate).toISOString().split('T')[0] : '',
      isActive: true
    });
    
    // Reset other states
    setShowTeamAssignment(false);
    setSelectedTeam('');
    setAddUserValidationErrors({});
    
    // Teams are already fetched in useEffect, no need to fetch again
    
    setShowAddUserDialog(true);
  };

  const handleAddUserDataChange = async (field, value) => {
    setAddUserData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-generate employee ID when role changes
    if (field === 'role' && value) {
      const employeeId = await generateEmployeeId(value);
      setAddUserData(prev => ({
        ...prev,
        employeeId: employeeId
      }));
    }

    // If department changes, just reset team selection
    if (field === 'department' && value) {
      setSelectedTeam(''); // Reset team selection when department changes
    }

    // Clear validation error for this field
    if (addUserValidationErrors[field]) {
      setAddUserValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateAddUserForm = () => {
    const errors = {};
    
    if (!addUserData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (addUserData.firstName.length > 50) {
      errors.firstName = 'First name must be less than 50 characters';
    }
    
    if (!addUserData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (addUserData.lastName.length > 50) {
      errors.lastName = 'Last name must be less than 50 characters';
    }
    
    if (!addUserData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addUserData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!addUserData.role) {
      errors.role = 'Role is required';
    }
    
    if (addUserData.phoneNumber && !/^\+?[\d\s-()]+$/.test(addUserData.phoneNumber)) {
      errors.phoneNumber = 'Please enter a valid phone number';
    }
    
    if (addUserData.designation && addUserData.designation.length > 100) {
      errors.designation = 'Designation must be less than 100 characters';
    }
    
    setAddUserValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedOffer || !validateAddUserForm()) return;

    try {
      setAddUserLoading(true);

      const userData = {
        firstName: addUserData.firstName.trim(),
        lastName: addUserData.lastName.trim(),
        email: addUserData.email.trim().toLowerCase(),
        role: addUserData.role,
        joiningDate: addUserData.joiningDate || new Date().toISOString().split('T')[0],
        isActive: addUserData.isActive
      };

      // Only include department if it's selected (not empty)
      if (addUserData.department && addUserData.department.trim()) {
        userData.department = addUserData.department.trim();
      }

      // Only include phoneNumber if it's provided (not empty)
      if (addUserData.phoneNumber && addUserData.phoneNumber.trim()) {
        userData.phoneNumber = addUserData.phoneNumber.trim();
      }

      // Only include designation if it's provided (not empty)
      if (addUserData.designation && addUserData.designation.trim()) {
        userData.designation = addUserData.designation.trim();
      }

      // Only include employeeId if provided
      if (addUserData.employeeId && addUserData.employeeId.trim()) {
        userData.employeeId = addUserData.employeeId.trim();
      }

      // Include team assignment if enabled
      if (showTeamAssignment && selectedTeam) {
        userData.teamId = selectedTeam;
      }

      const response = await fetch(`/api/recruitment/offers/${selectedOffer._id}/add-to-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Close dialog and reset state
        setShowAddUserDialog(false);
        setSelectedOffer(null);
        setAddUserData({
          firstName: '',
          lastName: '',
          email: '',
          role: 'Employee',
          department: '',
          employeeId: '',
          phoneNumber: '',
          designation: '',
          joiningDate: '',
          isActive: true
        });
        setShowTeamAssignment(false);
        setSelectedTeam('');
        setAddUserValidationErrors({});
        
        // Refresh offer letters to update the UI
        fetchOfferLetters();
        
        alert(`🎉 User account created successfully!\n\n👤 Employee ID: ${result.data.employeeId}\n🔑 Temporary Password: ${result.data.tempPassword}\n📧 Welcome email sent to: ${userData.email}\n\n✅ The new employee will receive their login credentials via email automatically.\n\nNote: Please keep these credentials as backup.`);
      } else {
        const errorData = await response.json();
        alert(`Error creating user account: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Error creating user account');
    } finally {
      setAddUserLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            <EmailIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Offer Letters
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Generate and manage offer letters for selected candidates
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchOfferLetters}
          >
            Refresh
          </Button>
          {applications.length > 0 && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowGenerateDialog(true)}
            >
              Generate Offer
            </Button>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="Draft">Draft</MenuItem>
                  <MenuItem value="Generated">Generated</MenuItem>
                  <MenuItem value="Sent">Sent</MenuItem>
                  <MenuItem value="Viewed">Viewed</MenuItem>
                  <MenuItem value="Accepted">Accepted</MenuItem>
                  <MenuItem value="Rejected">Rejected</MenuItem>
                  <MenuItem value="Expired">Expired</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Search"
                placeholder="Search by candidate name..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button 
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={() => setFilters({ status: '', search: '' })}
                fullWidth
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Offer Letters Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Offer Letters ({pagination.total || 0})
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : offerLetters.length === 0 ? (
            <Box textAlign="center" py={4}>
              <EmailIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No offer letters found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Generate offer letters for selected candidates
              </Typography>
              {applications.length > 0 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setShowGenerateDialog(true)}
                  sx={{ mt: 2 }}
                >
                  Generate First Offer
                </Button>
              )}
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Candidate</TableCell>
                      <TableCell>Position</TableCell>
                      <TableCell>Salary</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Generated Date</TableCell>
                      <TableCell>Valid Until</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {offerLetters.map(offer => (
                      <TableRow key={offer._id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Avatar sx={{ mr: 2 }}>
                              {offer.candidate?.firstName?.charAt(0)}{offer.candidate?.lastName?.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {offer.candidate?.firstName} {offer.candidate?.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {offer.candidate?.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {offer.position}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {offer.department?.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            ${offer.salary?.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            per annum
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={offer.status}
                            color={getStatusColor(offer.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(offer.generatedAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(offer.validUntil).toLocaleDateString()}
                          </Typography>
                          {new Date(offer.validUntil) < new Date() && (
                            <Typography variant="caption" color="error.main" display="block">
                              Expired
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Tooltip title="View Offer">
                              <IconButton
                                color="primary"
                                onClick={() => {
                                  alert(`Offer Details:\nPosition: ${offer.position}\nSalary: $${offer.salary?.toLocaleString()}\nJoining Date: ${new Date(offer.joiningDate).toLocaleDateString()}\nWork Location: ${offer.workLocation}`);
                                }}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            
                            {(offer.status === 'Draft' || offer.status === 'Generated') && (
                              <Tooltip title="Send Offer">
                                <IconButton
                                  color="success"
                                  onClick={() => {
                                    if (window.confirm('Send this offer letter to the candidate?')) {
                                      handleSendOffer(offer._id);
                                    }
                                  }}
                                >
                                  <SendIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            
                            <Tooltip title="Download PDF">
                              <IconButton
                                color="info"
                                onClick={() => {
                                  alert('PDF download functionality will be implemented');
                                }}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                            
                            {offer.status === 'Accepted' && !offer.userAccountCreated && (
                              <Tooltip title="Add to User Management">
                                <IconButton
                                  sx={{ 
                                    color: '#1976d2',
                                    '&:hover': {
                                      backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                    }
                                  }}
                                  onClick={() => handleAddUserClick(offer)}
                                >
                                  <PersonAddIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
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

      {/* Quick Stats */}
      <Grid container spacing={3} mt={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'primary.main', color: '#ffffff' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6" sx={{ color: '#ffffff' }}>Total Offers</Typography>
                  <Typography variant="h4" sx={{ color: '#ffffff' }}>{offerLetters.length}</Typography>
                </Box>
                <EmailIcon sx={{ fontSize: 40, color: '#ffffff' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.main', color: 'success.contrastText' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">Accepted</Typography>
                  <Typography variant="h4">
                    {offerLetters.filter(o => o.status === 'Accepted').length}
                  </Typography>
                </Box>
                <PersonIcon sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.main', color: 'warning.contrastText' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">Pending</Typography>
                  <Typography variant="h4">
                    {offerLetters.filter(o => ['Sent', 'Viewed'].includes(o.status)).length}
                  </Typography>
                </Box>
                <SendIcon sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'info.main', color: 'info.contrastText' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">Available Candidates</Typography>
                  <Typography variant="h4">{applications.length}</Typography>
                </Box>
                <WorkIcon sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onClose={() => setShowAddUserDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Candidate to User Management</DialogTitle>
        <form onSubmit={handleAddUserSubmit}>
          <DialogContent>
            {selectedOffer && (
              <>
                <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    Candidate Information
                  </Typography>
                  <Typography variant="body2">
                    <strong>Name:</strong> {selectedOffer.candidate?.firstName} {selectedOffer.candidate?.lastName}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Email:</strong> {selectedOffer.candidate?.email}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Position:</strong> {selectedOffer.designation}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Department:</strong> {selectedOffer.department?.name}
                  </Typography>
                </Box>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={addUserData.firstName}
                      onChange={(e) => handleAddUserDataChange('firstName', e.target.value)}
                      error={!!addUserValidationErrors.firstName}
                      helperText={addUserValidationErrors.firstName}
                      required
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={addUserData.lastName}
                      onChange={(e) => handleAddUserDataChange('lastName', e.target.value)}
                      error={!!addUserValidationErrors.lastName}
                      helperText={addUserValidationErrors.lastName}
                      required
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      value={addUserData.email}
                      onChange={(e) => handleAddUserDataChange('email', e.target.value)}
                      error={!!addUserValidationErrors.email}
                      helperText={addUserValidationErrors.email}
                      required
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={!!addUserValidationErrors.role}>
                      <InputLabel>Role *</InputLabel>
                      <Select
                        value={addUserData.role}
                        label="Role *"
                        onChange={(e) => handleAddUserDataChange('role', e.target.value)}
                        sx={{ borderRadius: 2 }}
                      >
                        {roles.map(role => (
                          <MenuItem key={role} value={role}>{role}</MenuItem>
                        ))}
                      </Select>
                      {addUserValidationErrors.role && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                          {addUserValidationErrors.role}
                        </Typography>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Department</InputLabel>
                      <Select
                        value={addUserData.department}
                        label="Department"
                        onChange={(e) => handleAddUserDataChange('department', e.target.value)}
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value="">Select Department</MenuItem>
                        {departments.map(dept => (
                          <MenuItem key={dept._id} value={dept._id}>{dept.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Employee ID (Auto-generated)"
                      value={addUserData.employeeId}
                      InputProps={{
                        readOnly: true,
                      }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: 2,
                          backgroundColor: 'grey.50'
                        } 
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={addUserData.phoneNumber}
                      onChange={(e) => handleAddUserDataChange('phoneNumber', e.target.value)}
                      error={!!addUserValidationErrors.phoneNumber}
                      helperText={addUserValidationErrors.phoneNumber}
                      placeholder="e.g., +1234567890"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Designation"
                      value={addUserData.designation}
                      onChange={(e) => handleAddUserDataChange('designation', e.target.value)}
                      error={!!addUserValidationErrors.designation}
                      helperText={addUserValidationErrors.designation}
                      placeholder="e.g., Software Engineer"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Joining Date"
                      type="date"
                      value={addUserData.joiningDate}
                      onChange={(e) => handleAddUserDataChange('joiningDate', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={addUserData.isActive}
                          onChange={(e) => handleAddUserDataChange('isActive', e.target.checked)}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#20C997',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#20C997',
                            },
                          }}
                        />
                      }
                      label="Active User (can login to the system)"
                    />
                  </Grid>

                  {/* Team Assignment Section - Only for Employee role */}
                  {addUserData.role === 'Employee' && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                          <GroupsIcon sx={{ mr: 1 }} />
                          Team Assignment
                        </Typography>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={showTeamAssignment}
                              onChange={(e) => {
                                setShowTeamAssignment(e.target.checked);
                              }}
                              sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                  color: '#20C997',
                                },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                  backgroundColor: '#20C997',
                                },
                              }}
                            />
                          }
                          label="Assign to Team"
                        />
                      </Box>
                      
                      {showTeamAssignment && (
                        <Paper sx={{ p: 3, backgroundColor: 'grey.50', borderRadius: 2 }}>
                          <FormControl fullWidth>
                            <InputLabel>Select Team *</InputLabel>
                            <Select
                              value={selectedTeam}
                              onChange={(e) => setSelectedTeam(e.target.value)}
                              label="Select Team *"
                              sx={{ borderRadius: 2 }}
                            >
                              <MenuItem value="">Choose a team...</MenuItem>
                              {teams && teams.length > 0 ? (
                                teams.map(team => (
                                  <MenuItem key={team._id} value={team._id}>
                                    {team.name} {team.code ? `(${team.code})` : ''} - {team.department?.name || 'No Department'}
                                  </MenuItem>
                                ))
                              ) : (
                                <MenuItem disabled>
                                  No teams available. Create teams in Team Management.
                                </MenuItem>
                              )}
                            </Select>
                          </FormControl>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Select an existing team to assign this user to. Teams are created in Team Management.
                            <br />
                            <strong>Note:</strong> Team assignment is only available for Employee role. Team Managers and Team Leaders are assigned through Team Management.
                            {teams && teams.length === 0 && (
                              <>
                                <br />
                                <strong>No teams found:</strong> There are no teams available in the system. You can create teams in Team Management.
                              </>
                            )}
                          </Typography>
                        </Paper>
                      )}
                    </Grid>
                  )}
                  
                  {/* Info message for non-Employee roles */}
                  {addUserData.role !== 'Employee' && ['Team Manager', 'Team Leader'].includes(addUserData.role) && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                      <Alert severity="info" sx={{ borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <InfoIcon sx={{ mr: 1 }} />
                          <Typography variant="body2">
                            <strong>Team Assignment:</strong> {addUserData.role} roles are assigned to teams through the Team Management interface, not during user creation.
                          </Typography>
                        </Box>
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddUserDialog(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={addUserLoading}
              startIcon={addUserLoading ? <CircularProgress size={20} /> : <PersonAddIcon />}
              sx={{
                backgroundColor: '#20C997',
                '&:hover': {
                  backgroundColor: '#17A085',
                },
              }}
            >
              {addUserLoading ? 'Creating User...' : 'Create User Account'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Generate Offer Dialog */}
      <Dialog open={showGenerateDialog} onClose={() => setShowGenerateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Generate Offer Letter</DialogTitle>
        <form onSubmit={handleGenerateOffer}>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Select Candidate</InputLabel>
                  <Select
                    value={selectedApplication?._id || ''}
                    label="Select Candidate"
                    onChange={(e) => {
                      const app = applications.find(a => a._id === e.target.value);
                      setSelectedApplication(app);
                      if (app) {
                        setOfferData(prev => ({
                          ...prev,
                          position: app.job?.title || '',
                          department: app.job?.department || ''
                        }));
                      }
                    }}
                  >
                    {applications.map(app => (
                      <MenuItem key={app._id} value={app._id}>
                        {app.firstName} {app.lastName} - {app.job?.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Position"
                  value={offerData.position}
                  onChange={(e) => setOfferData(prev => ({ ...prev, position: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={offerData.department}
                  onChange={(e) => setOfferData(prev => ({ ...prev, department: e.target.value }))}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Annual Salary"
                  type="number"
                  value={offerData.salary}
                  onChange={(e) => setOfferData(prev => ({ ...prev, salary: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Work Location"
                  value={offerData.workLocation}
                  onChange={(e) => setOfferData(prev => ({ ...prev, workLocation: e.target.value }))}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Joining Date"
                  value={offerData.joiningDate}
                  onChange={(e) => setOfferData(prev => ({ ...prev, joiningDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Valid Until"
                  value={offerData.validUntil}
                  onChange={(e) => setOfferData(prev => ({ ...prev, validUntil: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Working Hours"
                  value={offerData.workingHours}
                  onChange={(e) => setOfferData(prev => ({ ...prev, workingHours: e.target.value }))}
                  placeholder="e.g., 9:00 AM - 6:00 PM"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Reporting Manager"
                  value={offerData.reportingManager}
                  onChange={(e) => setOfferData(prev => ({ ...prev, reportingManager: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Benefits & Perks"
                  value={offerData.benefits}
                  onChange={(e) => setOfferData(prev => ({ ...prev, benefits: e.target.value }))}
                  placeholder="Health insurance, PTO, retirement plans, etc."
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Additional Terms"
                  value={offerData.additionalTerms}
                  onChange={(e) => setOfferData(prev => ({ ...prev, additionalTerms: e.target.value }))}
                  placeholder="Any additional terms and conditions"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Generate Offer</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default OfferLetters;
