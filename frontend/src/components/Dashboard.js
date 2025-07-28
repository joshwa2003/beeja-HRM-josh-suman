import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../utils/api';

const Dashboard = () => {
  const { user, logout, hasRole, hasAnyRole, getRoleLevel } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    departments: 0,
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      if (hasAnyRole(['Admin', 'Vice President'])) {
        const response = await userAPI.getAllUsers({ limit: 5 });
        setRecentUsers(response.data.users || []);
        setStats({
          totalUsers: response.data.total || 0,
          activeUsers: response.data.users?.filter(u => u.isActive).length || 0,
          departments: [...new Set(response.data.users?.map(u => u.department).filter(Boolean))].length || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const getRoleColor = (role) => {
    const colors = {
      'Admin': 'danger',
      'Vice President': 'primary',
      'HR BP': 'info',
      'HR Manager': 'success',
      'HR Executive': 'warning',
      'Team Manager': 'secondary',
      'Team Leader': 'dark'
    };
    return colors[role] || 'secondary';
  };

  const getRoleIcon = (role) => {
    const icons = {
      'Admin': 'bi-shield-check',
      'Vice President': 'bi-star',
      'HR BP': 'bi-briefcase',
      'HR Manager': 'bi-people',
      'HR Executive': 'bi-person-badge',
      'Team Manager': 'bi-diagram-3',
      'Team Leader': 'bi-person-check'
    };
    return icons[role] || 'bi-person';
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 17) greeting = 'Good evening';
    
    return `${greeting}, ${user?.firstName}!`;
  };

  const getAccessibleFeatures = () => {
    const features = [];
    const roleLevel = getRoleLevel();

    if (hasRole('Admin')) {
      features.push(
        { name: 'User Management', icon: 'bi-people', description: 'Manage all users and roles' },
        { name: 'System Settings', icon: 'bi-gear', description: 'Configure system settings' },
        { name: 'Reports & Analytics', icon: 'bi-graph-up', description: 'View detailed reports' },
        { name: 'Audit Logs', icon: 'bi-journal-text', description: 'View system audit logs' }
      );
    } else if (hasRole('Vice President')) {
      features.push(
        { name: 'Executive Dashboard', icon: 'bi-speedometer2', description: 'High-level overview' },
        { name: 'Department Reports', icon: 'bi-bar-chart', description: 'Department performance' },
        { name: 'Strategic Planning', icon: 'bi-diagram-3', description: 'Strategic initiatives' }
      );
    } else if (hasAnyRole(['HR BP', 'HR Manager'])) {
      features.push(
        { name: 'Employee Records', icon: 'bi-person-lines-fill', description: 'Manage employee data' },
        { name: 'Recruitment', icon: 'bi-person-plus', description: 'Hiring and onboarding' },
        { name: 'Performance Reviews', icon: 'bi-clipboard-check', description: 'Employee evaluations' }
      );
    } else if (hasRole('HR Executive')) {
      features.push(
        { name: 'Employee Support', icon: 'bi-headset', description: 'Employee assistance' },
        { name: 'Documentation', icon: 'bi-file-text', description: 'HR documentation' },
        { name: 'Training Records', icon: 'bi-book', description: 'Training management' }
      );
    } else if (hasAnyRole(['Team Manager', 'Team Leader'])) {
      features.push(
        { name: 'Team Overview', icon: 'bi-people', description: 'Manage your team' },
        { name: 'Task Management', icon: 'bi-list-check', description: 'Assign and track tasks' },
        { name: 'Team Reports', icon: 'bi-graph-up', description: 'Team performance metrics' }
      );
    }

    return features;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light" style={{ minHeight: 'calc(100vh - 60px)' }}>
      {/* Navigation Header */}
      {/* Main Content */}
      <div className="container-fluid pt-1 pb-2">
        {/* Welcome Section */}
        <div className="row mb-3">
          <div className="col-12">
            <div className="card bg-gradient bg-primary text-white">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h2 className="card-title mb-1">{getWelcomeMessage()}</h2>
                    <p className="card-text mb-0">
                      Welcome to your HRM dashboard. You're logged in as{' '}
                      <span className={`badge bg-${getRoleColor(user?.role)} ms-1`}>
                        {user?.role}
                      </span>
                    </p>
                    {user?.department && (
                      <small className="opacity-75">Department: {user.department}</small>
                    )}
                  </div>
                  <div className="col-md-4 text-end">
                    <i className={`bi ${getRoleIcon(user?.role)}`} style={{ fontSize: '3rem', opacity: 0.7 }}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards (Admin and VP only) */}
        {hasAnyRole(['Admin', 'Vice President']) && (
          <div className="row mb-4">
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-people text-primary" style={{ fontSize: '2rem' }}></i>
                  <h3 className="card-title mt-2">{stats.totalUsers}</h3>
                  <p className="card-text text-muted">Total Users</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-person-check text-success" style={{ fontSize: '2rem' }}></i>
                  <h3 className="card-title mt-2">{stats.activeUsers}</h3>
                  <p className="card-text text-muted">Active Users</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <i className="bi bi-building text-info" style={{ fontSize: '2rem' }}></i>
                  <h3 className="card-title mt-2">{stats.departments}</h3>
                  <p className="card-text text-muted">Departments</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="row">
          {/* Available Features */}
          <div className="col-md-8">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="bi bi-grid me-2"></i>
                  Available Features
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  {getAccessibleFeatures().map((feature, index) => (
                    <div key={index} className="col-md-6 mb-3">
                      <div className="d-flex align-items-start">
                        <div className="flex-shrink-0">
                          <i className={`bi ${feature.icon} text-primary`} style={{ fontSize: '1.5rem' }}></i>
                        </div>
                        <div className="flex-grow-1 ms-3">
                          <h6 className="mb-1">{feature.name}</h6>
                          <small className="text-muted">{feature.description}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Users (Admin and VP only) */}
          {hasAnyRole(['Admin', 'Vice President']) && (
            <div className="col-md-4">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-clock me-2"></i>
                    Recent Users
                  </h5>
                </div>
                <div className="card-body">
                  {recentUsers.length > 0 ? (
                    <div className="list-group list-group-flush">
                      {recentUsers.map((recentUser) => (
                        <div key={recentUser._id} className="list-group-item px-0">
                          <div className="d-flex align-items-center">
                            <div className="flex-shrink-0">
                              <i className={`bi ${getRoleIcon(recentUser.role)} text-${getRoleColor(recentUser.role)}`}></i>
                            </div>
                            <div className="flex-grow-1 ms-3">
                              <h6 className="mb-0">{recentUser.firstName} {recentUser.lastName}</h6>
                              <small className="text-muted">{recentUser.role}</small>
                            </div>
                            <div className="flex-shrink-0">
                              <span className={`badge bg-${recentUser.isActive ? 'success' : 'secondary'}`}>
                                {recentUser.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted text-center">No users found</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* User Profile Card (for non-admin users) */}
          {!hasAnyRole(['Admin', 'Vice President']) && (
            <div className="col-md-4">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-person me-2"></i>
                    Your Profile
                  </h5>
                </div>
                <div className="card-body">
                  <div className="text-center">
                    <i className={`bi ${getRoleIcon(user?.role)} text-${getRoleColor(user?.role)}`} style={{ fontSize: '3rem' }}></i>
                    <h5 className="mt-3">{user?.firstName} {user?.lastName}</h5>
                    <p className="text-muted">{user?.email}</p>
                    <span className={`badge bg-${getRoleColor(user?.role)}`}>
                      {user?.role}
                    </span>
                    {user?.department && (
                      <p className="mt-2 mb-0">
                        <small className="text-muted">Department: {user.department}</small>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
