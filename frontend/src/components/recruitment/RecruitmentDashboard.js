import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Grid,
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
  CircularProgress
} from '@mui/material';
import {
  Person as PersonIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const StatCard = ({ title, value, subtitle, icon, color = 'primary' }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="h6">
            {title}
          </Typography>
          <Typography variant="h4" component="h2">
            {value}
          </Typography>
          {subtitle && (
            <Typography color="textSecondary" variant="body2">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box color={`${color}.main`}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const RecruitmentDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    summary: {},
    recentApplications: [],
    upcomingInterviews: [],
    applicationStats: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/recruitment/dashboard');
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const { summary, recentApplications, upcomingInterviews, applicationStats } = dashboardData;

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          <WorkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Recruitment Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage hiring process and track recruitment metrics
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Jobs"
            value={summary.activeJobs || 0}
            subtitle={`${summary.totalJobs || 0} Total Jobs`}
            icon={<WorkIcon sx={{ fontSize: 40 }} />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Applications"
            value={summary.totalApplications || 0}
            subtitle={`${summary.pendingApplications || 0} Pending`}
            icon={<PersonIcon sx={{ fontSize: 40 }} />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Scheduled Interviews"
            value={summary.scheduledInterviews || 0}
            subtitle="This week"
            icon={<ScheduleIcon sx={{ fontSize: 40 }} />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Offers"
            value={summary.pendingOffers || 0}
            subtitle="Awaiting response"
            icon={<EmailIcon sx={{ fontSize: 40 }} />}
            color="warning"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Applications */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Recent Applications</Typography>
                <Button
                  component={Link}
                  to="/admin/recruitment/applications"
                  variant="outlined"
                  size="small"
                >
                  View All
                </Button>
              </Box>

              {recentApplications.length === 0 ? (
                <Typography variant="body1" color="text.secondary" textAlign="center" py={3}>
                  No recent applications
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Candidate</TableCell>
                        <TableCell>Job</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Applied</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentApplications.map(application => (
                        <TableRow key={application._id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {application.firstName} {application.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {application.email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {application.job?.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {application.job?.code}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={application.status}
                              size="small"
                              color={application.status === 'Pending' ? 'warning' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(application.submittedAt).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Interviews */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Upcoming Interviews</Typography>
                <Button
                  component={Link}
                  to="/admin/recruitment/interviews"
                  variant="outlined"
                  size="small"
                >
                  View All
                </Button>
              </Box>

              {upcomingInterviews.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                  No upcoming interviews
                </Typography>
              ) : (
                <Box>
                  {upcomingInterviews.map(interview => (
                    <Box key={interview._id} mb={2} p={2} bgcolor="grey.50" borderRadius={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {interview.application?.firstName} {interview.application?.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {interview.job?.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {new Date(interview.scheduledDate).toLocaleDateString()} at{' '}
                        {new Date(interview.scheduledDate).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Interviewer: {interview.primaryInterviewer?.firstName} {interview.primaryInterviewer?.lastName}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Grid container spacing={3} mt={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item>
                  <Button
                    component={Link}
                    to="/admin/recruitment/jobs"
                    variant="contained"
                    startIcon={<WorkIcon />}
                  >
                    Manage Jobs
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    component={Link}
                    to="/admin/recruitment/applications"
                    variant="contained"
                    startIcon={<PersonIcon />}
                  >
                    Review Applications
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    component={Link}
                    to="/admin/recruitment/interviews"
                    variant="contained"
                    startIcon={<ScheduleIcon />}
                  >
                    Schedule Interviews
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    component={Link}
                    to="/admin/recruitment/offers"
                    variant="contained"
                    startIcon={<EmailIcon />}
                  >
                    Manage Offers
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RecruitmentDashboard;
