import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const Sidebar = ({ isOpen, onToggle }) => {
  const { user, hasRole, hasAnyRole, getRoleLevel } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState({});
  const [profileData, setProfileData] = useState(null);

  // Fetch profile data to get profile photo
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const response = await api.get('/auth/profile');
        setProfileData(response.data.user);
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    };

    fetchProfileData();
  }, []);

  const toggleSubmenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const isActiveRoute = (path) => {
    return location.pathname.startsWith(path);
  };

  const getMenuItems = () => {
    const menuItems = [];

    // Dashboard - Available to all
    menuItems.push({
      key: 'dashboard',
      title: 'Dashboard',
      icon: 'bi-speedometer2',
      path: '/dashboard',
      roles: ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader', 'Employee']
    });

    // User Management - Admin, VP, HR roles, Team Leaders, Team Managers
    if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])) {
      menuItems.push({
        key: 'user-management',
        title: 'User Management',
        icon: 'bi-people',
        submenu: [
          { title: 'All Users', path: '/admin/users', icon: 'bi-person-lines-fill' },
          { title: 'Add User', path: '/admin/users/add', icon: 'bi-person-plus' },
          { title: 'User Roles', path: '/admin/users/roles', icon: 'bi-person-badge' }
        ]
      });
    }

    // Department & Team Management - Admin, VP, HR roles
    if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'])) {
      menuItems.push({
        key: 'dept-team',
        title: 'Departments & Teams',
        icon: 'bi-diagram-3',
        submenu: [
          { title: 'Departments', path: '/admin/departments', icon: 'bi-building' },
          { title: 'Teams', path: '/admin/teams', icon: 'bi-people' },
          { title: 'Organization Chart', path: '/admin/org-chart', icon: 'bi-diagram-2' }
        ]
      });
    }

    // Leave & Attendance Management - Available to all roles
    if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader', 'Employee'])) {
      const submenuItems = [
        { title: 'My Attendance', path: '/admin/leave/my-attendance', icon: 'bi-clock-history' }
      ];

      // Add management features for higher roles
      if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])) {
        submenuItems.push(
          { title: 'Live Employee Status', path: '/admin/leave/live-status', icon: 'bi-broadcast' },
          { title: 'Leave Requests', path: '#', icon: 'bi-calendar-check' },
          { title: 'Attendance Reports', path: '/admin/reports/attendance', icon: 'bi-graph-up' },
          { title: 'Leave Policies', path: '#', icon: 'bi-file-text' },
          { title: 'Holiday Calendar', path: '#', icon: 'bi-calendar-event' },
          { title: 'Regularization Dashboard', path: '/admin/regularization', icon: 'bi-clipboard-check' }
        );
        
        // Add Work Hours Settings for HR roles only
        if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'])) {
          submenuItems.push(
            { title: 'Work Hours Settings', path: '/admin/leave/work-hours', icon: 'bi-clock' }
          );
        }

        // Add Permissions section for management roles
        if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])) {
          submenuItems.push(
            { title: 'Permissions', path: '/admin/leave/permissions', icon: 'bi-shield-check' }
          );
        }
      }

      // Add employee-specific regularization features
      if (hasRole('Employee')) {
        submenuItems.push(
          { title: 'Request Regularization', path: '/employee/regularization/request', icon: 'bi-clock-history' },
          { title: 'My Requests', path: '/employee/regularization', icon: 'bi-list-check' }
        );
      }

      menuItems.push({
        key: 'leave-attendance',
        title: 'Leave & Attendance',
        icon: 'bi-calendar3',
        submenu: submenuItems
      });
    }

    // Permissions - Separate section for employees
    if (hasRole('Employee')) {
      menuItems.push({
        key: 'permissions',
        title: 'Permissions',
        icon: 'bi-shield-check',
        path: '/employee/permissions'
      });
    }

    // Payroll Management - Admin, VP, HR roles, Team Manager, Team Leader
    if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])) {
      const payrollSubmenu = [];
      
      // Full access for Admin, VP, HR roles
      if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'])) {
        payrollSubmenu.push(
          { title: 'Salary Structure', path: '/admin/payroll/structure', icon: 'bi-calculator' },
          { title: 'Process Payroll', path: '/admin/payroll/process', icon: 'bi-gear' },
          { title: 'Payslips', path: '/admin/payroll/payslips', icon: 'bi-file-earmark-text' },
          { title: 'Reimbursements', path: '/admin/payroll/reimbursements', icon: 'bi-receipt' }
        );
      } else if (hasAnyRole(['Team Manager', 'Team Leader'])) {
        // Limited access for Team Manager and Team Leader - only Reimbursements
        payrollSubmenu.push(
          { title: 'Reimbursements', path: '/admin/payroll/reimbursements', icon: 'bi-receipt' }
        );
      }

      menuItems.push({
        key: 'payroll',
        title: 'Payroll Management',
        icon: 'bi-currency-dollar',
        submenu: payrollSubmenu
      });
    } else if (hasRole('Employee')) {
      // Employee Payroll Management - Limited access
      menuItems.push({
        key: 'employee-payroll',
        title: 'Payroll Management',
        icon: 'bi-currency-dollar',
        submenu: [
          { title: 'Payslip', path: '/employee/payroll/payslip', icon: 'bi-file-earmark-text' },
          { title: 'Reimbursements', path: '/employee/payroll/reimbursements', icon: 'bi-receipt' }
        ]
      });
    }

    // Recruitment Management - Admin, VP, HR roles
    if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'])) {
      menuItems.push({
        key: 'recruitment',
        title: 'Recruitment',
        icon: 'bi-person-plus',
        submenu: [
          { title: 'Job Postings', path: '/admin/recruitment/jobs', icon: 'bi-briefcase' },
          { title: 'Applications', path: '/admin/recruitment/applications', icon: 'bi-file-person' },
          { title: 'Interviews', path: '/admin/recruitment/interviews', icon: 'bi-chat-dots' },
          { title: 'Offer Letters', path: '/admin/recruitment/offers', icon: 'bi-envelope-check' }
        ]
      });
    }

    // Performance Management
    if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])) {
      menuItems.push({
        key: 'performance',
        title: 'Performance',
        icon: 'bi-graph-up-arrow',
        submenu: [
          { title: 'Performance Reviews', path: '/admin/performance/reviews', icon: 'bi-clipboard-check' },
          { title: 'Goals & KPIs', path: '/admin/performance/goals', icon: 'bi-target' },
          { title: 'Appraisals', path: '/admin/performance/appraisals', icon: 'bi-star' },
          { title: 'Feedback', path: '/admin/performance/feedback', icon: 'bi-chat-square-text' }
        ]
      });
    } else if (hasRole('Employee')) {
      menuItems.push({
        key: 'my-performance',
        title: 'My Performance',
        icon: 'bi-graph-up-arrow',
        submenu: [
          { title: 'My Goals', path: '/employee/performance/goals', icon: 'bi-target' },
          { title: 'My Reviews', path: '/employee/performance/reviews', icon: 'bi-clipboard-check' },
          { title: 'Self Assessment', path: '/employee/performance/self-assessment', icon: 'bi-pencil-square' }
        ]
      });
    }

    // Training Management
    if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])) {
      menuItems.push({
        key: 'training',
        title: 'Training',
        icon: 'bi-book',
        submenu: [
          { title: 'Training Programs', path: '/admin/training/programs', icon: 'bi-collection' },
          { title: 'Training Calendar', path: '/admin/training/calendar', icon: 'bi-calendar-week' },
          { title: 'Certifications', path: '/admin/training/certifications', icon: 'bi-award' },
          { title: 'Training Reports', path: '/admin/training/reports', icon: 'bi-graph-up' }
        ]
      });
    } else if (hasRole('Employee')) {
      menuItems.push({
        key: 'my-training',
        title: 'My Training',
        icon: 'bi-book',
        submenu: [
          { title: 'Available Trainings', path: '/employee/training/available', icon: 'bi-collection' },
          { title: 'My Trainings', path: '/employee/training/enrolled', icon: 'bi-bookmark-check' },
          { title: 'Certificates', path: '/employee/training/certificates', icon: 'bi-award' }
        ]
      });
    }


    // Reports & Analytics
    if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])) {
      const reportSubmenu = [
        { title: 'Employee Reports', path: '/admin/reports/employees', icon: 'bi-people' },
        { title: 'Attendance Reports', path: '/admin/reports/attendance', icon: 'bi-clock' },
        { title: 'Leave Reports', path: '/admin/reports/leave', icon: 'bi-calendar' },
        { title: 'Performance Reports', path: '/admin/reports/performance', icon: 'bi-graph-up' }
      ];

      if (hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'])) {
        reportSubmenu.push(
          { title: 'Payroll Reports', path: '/admin/reports/payroll', icon: 'bi-currency-dollar' },
          { title: 'Training Reports', path: '/admin/reports/training', icon: 'bi-book' },
          { title: 'Custom Reports', path: '/admin/reports/custom', icon: 'bi-sliders' }
        );
      }

      menuItems.push({
        key: 'reports',
        title: 'Reports & Analytics',
        icon: 'bi-bar-chart',
        submenu: reportSubmenu
      });
    }

    // System Settings - Admin only
    if (hasRole('Admin')) {
      menuItems.push({
        key: 'settings',
        title: 'System Settings',
        icon: 'bi-gear',
        submenu: [
          { title: 'General Settings', path: '/admin/settings/general', icon: 'bi-sliders' },
          { title: 'User Roles & Permissions', path: '/admin/settings/roles', icon: 'bi-shield-check' },
          { title: 'Approval Workflows', path: '/admin/settings/workflows', icon: 'bi-diagram-2' },
          { title: 'Email Templates', path: '/admin/settings/email-templates', icon: 'bi-envelope' },
          { title: 'Audit Logs', path: '/admin/settings/audit-logs', icon: 'bi-journal-text' },
          { title: 'Backup & Restore', path: '/admin/settings/backup', icon: 'bi-cloud-download' }
        ]
      });
    }

    // My Profile - Available to all
    menuItems.push({
      key: 'profile',
      title: 'My Profile',
      icon: 'bi-person-circle',
      path: '/profile'
    });

    return menuItems;
  };

  const renderMenuItem = (item) => {
    if (item.submenu) {
      const isExpanded = expandedMenus[item.key];
      const hasActiveSubmenu = item.submenu.some(subItem => isActiveRoute(subItem.path));

      return (
        <li key={item.key} className="nav-item">
          <button
            className={`nav-link d-flex align-items-center w-100 border-0 bg-transparent ${
              hasActiveSubmenu ? 'active' : ''
            }`}
            onClick={() => toggleSubmenu(item.key)}
            style={{ textAlign: 'left' }}
          >
            <i className={`${item.icon} me-2`}></i>
            <span className="flex-grow-1">{item.title}</span>
            <i className={`bi bi-chevron-${isExpanded ? 'down' : 'right'} ms-auto`}></i>
          </button>
          <div className={`collapse ${isExpanded ? 'show' : ''}`}>
            <ul className="nav flex-column ms-3">
              {item.submenu.map((subItem) => (
                <li key={subItem.path} className="nav-item">
                  <button
                    className={`nav-link d-flex align-items-center w-100 border-0 bg-transparent ${
                      isActiveRoute(subItem.path) ? 'active' : ''
                    }`}
                    onClick={() => {
                      if (subItem.path === '#') {
                        alert('This feature is under development');
                      } else {
                        navigate(subItem.path);
                      }
                    }}
                    style={{ textAlign: 'left' }}
                  >
                    <i className={`${subItem.icon} me-2`}></i>
                    {subItem.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </li>
      );
    } else {
      return (
        <li key={item.key} className="nav-item">
          <button
            className={`nav-link d-flex align-items-center w-100 border-0 bg-transparent ${
              isActiveRoute(item.path) ? 'active' : ''
            }`}
            onClick={() => navigate(item.path)}
            style={{ textAlign: 'left' }}
          >
            <i className={`${item.icon} me-2`}></i>
            {item.title}
          </button>
        </li>
      );
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-lg-none"
          style={{ zIndex: 1040 }}
          onClick={onToggle}
        ></div>
      )}

      {/* Sidebar */}
      <div 
        className={`bg-dark text-white position-fixed start-0 overflow-auto`}
        style={{ 
          width: '280px', 
          top: '68px', // Precisely match navbar end to eliminate white line
          height: 'calc(100vh - 68px)', // Full height minus navbar
          zIndex: 1040, // Lower z-index to stay below navbar
          transition: 'transform 0.3s ease-in-out',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        {/* User Info */}
        <div className="p-3 border-bottom border-secondary">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center flex-grow-1">
              <div className="me-3" style={{ width: '40px', height: '40px' }}>
                {profileData?.profilePhoto ? (
                  <img
                    src={profileData.profilePhoto}
                    alt="Profile"
                    className="rounded-circle"
                    style={{ 
                      width: '40px', 
                      height: '40px', 
                      objectFit: 'cover',
                      border: '2px solid #0d6efd'
                    }}
                  />
                ) : (
                  <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center"
                       style={{ width: '40px', height: '40px' }}>
                    <i className="bi bi-person text-white"></i>
                  </div>
                )}
              </div>
              <div className="flex-grow-1">
                <div className="fw-semibold">{user?.firstName} {user?.lastName}</div>
                <small className="text-muted">{user?.role}</small>
              </div>
            </div>
            <button 
              className="btn btn-sm btn-outline-light d-lg-none"
              onClick={onToggle}
            >
              <i className="bi bi-x"></i>
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3">
          <ul className="nav flex-column">
            {getMenuItems().map(renderMenuItem)}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
