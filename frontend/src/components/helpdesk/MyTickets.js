import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Chip,
  Avatar,
  IconButton,
  Pagination,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  ConfirmationNumber as TicketIcon,
  FolderOpen as FolderOpenIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  Archive as ArchiveIcon,
  Shield as ShieldIcon,
  Inbox as InboxIcon
} from '@mui/icons-material';

const MyTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    page: 1,
    limit: 10,
    createdBy: user?._id // Filter by current user
  });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    if (user?._id) {
      setFilters(prev => ({ ...prev, createdBy: user._id }));
      fetchTickets();
      fetchStats();
    }
  }, [user, filters.status, filters.category, filters.priority, filters.page, filters.limit]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tickets', { params: filters });
      setTickets(response.data.tickets);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/tickets/stats', {
        params: { createdBy: user?._id }
      });
      setStats(response.data.overview);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'Open': 'info',
      'In Progress': 'warning',
      'Pending': 'info',
      'Resolved': 'success',
      'Closed': 'default',
      'Escalated': 'error'
    };
    return statusColors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const priorityColors = {
      'Low': 'success',
      'Medium': 'warning',
      'High': 'error',
      'Critical': 'error'
    };
    return priorityColors[priority] || 'default';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h3" component="div">
              {value || 0}
            </Typography>
          </Box>
          <Box sx={{ color: `${color}.main`, opacity: 0.7 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            <TicketIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            My Tickets
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and track your support tickets
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => window.location.href = '/helpdesk/create'}
          size="large"
        >
          Create New Ticket
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Total"
            value={stats.total}
            icon={<TicketIcon sx={{ fontSize: 40 }} />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Open"
            value={stats.open}
            icon={<FolderOpenIcon sx={{ fontSize: 40 }} />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="In Progress"
            value={stats.inProgress}
            icon={<RefreshIcon sx={{ fontSize: 40 }} />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Resolved"
            value={stats.resolved}
            icon={<CheckCircleIcon sx={{ fontSize: 40 }} />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Escalated"
            value={stats.escalated}
            icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
            color="error"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Closed"
            value={stats.closed}
            icon={<ArchiveIcon sx={{ fontSize: 40 }} />}
            color="grey"
          />
        </Grid>
      </Grid>

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
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="Open">Open</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Resolved">Resolved</MenuItem>
                  <MenuItem value="Closed">Closed</MenuItem>
                  <MenuItem value="Escalated">Escalated</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category}
                  label="Category"
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  <MenuItem value="Leave Issue">Leave Issue</MenuItem>
                  <MenuItem value="Attendance Issue">Attendance Issue</MenuItem>
                  <MenuItem value="Payroll / Salary Issue">Payroll / Salary Issue</MenuItem>
                  <MenuItem value="Performance Review Concern">Performance Review Concern</MenuItem>
                  <MenuItem value="Training / LMS Access Issue">Training / LMS Access Issue</MenuItem>
                  <MenuItem value="HRMS Login Issue">HRMS Login Issue</MenuItem>
                  <MenuItem value="General HR Query">General HR Query</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filters.priority}
                  label="Priority"
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Items per page</InputLabel>
                <Select
                  value={filters.limit}
                  label="Items per page"
                  onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            My Tickets ({pagination.total || 0})
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : tickets.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" p={4}>
              <InboxIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No tickets found
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                You haven't created any support tickets yet.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => window.location.href = '/helpdesk/create'}
              >
                Create Your First Ticket
              </Button>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Ticket #</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Assigned To</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Last Updated</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket._id} hover>
                      <TableCell>
                        <Typography variant="body2" color="primary" fontWeight="bold">
                          {ticket.ticketNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          {ticket.isConfidential && (
                            <Tooltip title="Confidential">
                              <ShieldIcon sx={{ color: 'warning.main', mr: 1, fontSize: 16 }} />
                            </Tooltip>
                          )}
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {ticket.subject}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {ticket.category}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={ticket.priority}
                          color={getPriorityColor(ticket.priority)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={ticket.status}
                          color={getStatusColor(ticket.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {ticket.assignedTo ? (
                          <Box display="flex" alignItems="center">
                            <Avatar
                              sx={{ width: 32, height: 32, mr: 1, fontSize: 12, bgcolor: 'success.main' }}
                            >
                              {ticket.assignedTo?.firstName?.charAt(0)}{ticket.assignedTo?.lastName?.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {ticket.assignedTo?.firstName} {ticket.assignedTo?.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {ticket.assignedTo?.role}
                              </Typography>
                            </Box>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Unassigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(ticket.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(ticket.updatedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          color="primary"
                          onClick={() => window.location.href = `/helpdesk/tickets/${ticket._id}`}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <Box display="flex" justifyContent="center" p={2}>
            <Pagination
              count={pagination.pages}
              page={pagination.current}
              onChange={(event, page) => handleFilterChange('page', page)}
              color="primary"
            />
          </Box>
        )}
      </Card>
    </Box>
  );
};

export default MyTickets;
