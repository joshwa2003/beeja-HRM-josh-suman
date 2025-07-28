import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './components/Login';
import MyProfile from './components/MyProfile';
import EditProfile from './components/EditProfile';
import Dashboard from './components/Dashboard';
import DepartmentManagement from './components/admin/DepartmentManagement';
import UserManagement from './components/admin/UserManagement';
import AddUser from './components/admin/AddUser';
import MyAttendance from './components/MyAttendance';
import ChangePassword from './components/ChangePassword';
import LeaveAttendanceManagement from './components/admin/LeaveAttendanceManagement';
import AttendanceReports from './components/admin/AttendanceReports';
import WorkHoursSettings from './components/admin/WorkHoursSettings';
import LiveEmployeeStatus from './components/admin/LiveEmployeeStatus';
import Permissions from './components/admin/Permissions';

// Payroll Components
import PayrollDashboard from './components/admin/payroll/PayrollDashboard';
import SalaryStructureList from './components/admin/payroll/SalaryStructureList';
import SalaryStructureForm from './components/admin/payroll/SalaryStructureForm';
import EmployeePayslip from './components/employee/payroll/EmployeePayslip';
import EmployeeReimbursements from './components/employee/payroll/EmployeeReimbursements';
import ProcessPayroll from './components/admin/payroll/ProcessPayroll';
import ReimbursementDashboard from './components/admin/payroll/ReimbursementDashboard';

// Regularization Components
import RegularizationRequest from './components/employee/RegularizationRequest';
import RegularizationDashboard from './components/admin/RegularizationDashboard';
import MyRegularizationRequests from './components/employee/MyRegularizationRequests';

// Employee Permission Components
import EmployeePermissions from './components/employee/EmployeePermissions';

// Notification Components
import NotificationsPage from './components/NotificationsPage';

// Role-based redirect component
const RoleBasedRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // All users go to dashboard
  const getDefaultRoute = (user) => {
    return '/dashboard';
  };
  
  return <Navigate to={getDefaultRoute(user)} replace />;
};
  
function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <MyProfile />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile/edit" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <EditProfile />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            {/* Admin Routes */}
            <Route 
              path="/admin/departments" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']}>
                  <Layout>
                    <DepartmentManagement />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            {/* User Management Routes */}
            <Route 
              path="/admin/users" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader', 'Employee']}>
                  <Layout>
                    <UserManagement />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route
              path="/admin/users/add"
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader', 'Employee']}>
                  <Layout>
                    <AddUser />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Leave & Attendance Routes */}
            <Route 
              path="/admin/leave/live-status" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']}>
                  <Layout>
                    <LiveEmployeeStatus />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/leave/work-hours" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']}>
                  <Layout>
                    <WorkHoursSettings />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/leave/permissions" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader', 'Employee']}>
                  <Layout>
                    <Permissions />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/leave/*" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader', 'Employee']}>
                  <Layout>
                    <LeaveAttendanceManagement />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            {/* Payroll Routes */}
            <Route 
              path="/admin/payroll" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']}>
                  <Layout>
                    <PayrollDashboard />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/payroll/structure" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']}>
                  <Layout>
                    <SalaryStructureList />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/payroll/structure/new" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager']}>
                  <Layout>
                    <SalaryStructureForm />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/payroll/structure/:id/edit" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager']}>
                  <Layout>
                    <SalaryStructureForm />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/payroll/process" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']}>
                  <Layout>
                    <ProcessPayroll />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/payroll/reimbursements" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']}>
                  <Layout>
                    <ReimbursementDashboard />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/payroll/payslips" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']}>
                  <Layout>
                    <div className="container-fluid">
                      <div className="alert alert-info">
                        <h4><i className="bi bi-file-earmark-text me-2"></i>Payslip Management</h4>
                        <p>This section will include:</p>
                        <ul>
                          <li>Generate individual and bulk payslips</li>
                          <li>PDF download and email distribution</li>
                          <li>Payslip templates and customization</li>
                          <li>Employee self-service access</li>
                        </ul>
                        <p className="mb-0"><strong>Status:</strong> <span className="badge bg-warning">Coming Soon</span></p>
                      </div>
                    </div>
                  </Layout>
                </ProtectedRoute>
              } 
            />

            {/* Performance Routes */}
            <Route 
              path="/admin/performance/*" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']}>
                  <Layout>
                    <div className="container-fluid">
                      <div className="alert alert-warning">
                        <h4><i className="bi bi-graph-up-arrow me-2"></i>Performance Management</h4>
                        <p>This module will include:</p>
                        <ul>
                          <li>Goal setting and tracking</li>
                          <li>Performance review cycles</li>
                          <li>360-degree feedback</li>
                          <li>Appraisal management</li>
                          <li>Performance analytics</li>
                        </ul>
                        <p className="mb-0"><strong>Status:</strong> <span className="badge bg-warning">In Development</span></p>
                      </div>
                    </div>
                  </Layout>
                </ProtectedRoute>
              } 
            />

            {/* Training Routes */}
            <Route 
              path="/admin/training/*" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']}>
                  <Layout>
                    <div className="container-fluid">
                      <div className="alert alert-info">
                        <h4><i className="bi bi-book me-2"></i>Training Management</h4>
                        <p>This module will include:</p>
                        <ul>
                          <li>Training program creation</li>
                          <li>Employee enrollment</li>
                          <li>Training calendar and scheduling</li>
                          <li>Certification tracking</li>
                          <li>Training effectiveness reports</li>
                        </ul>
                        <p className="mb-0"><strong>Status:</strong> <span className="badge bg-warning">In Development</span></p>
                      </div>
                    </div>
                  </Layout>
                </ProtectedRoute>
              } 
            />

            {/* Recruitment Routes */}
            <Route 
              path="/admin/recruitment/*" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']}>
                  <Layout>
                    <div className="container-fluid">
                      <div className="alert alert-secondary">
                        <h4><i className="bi bi-person-plus me-2"></i>Recruitment Management</h4>
                        <p>This module will include:</p>
                        <ul>
                          <li>Job posting and management</li>
                          <li>Application tracking system</li>
                          <li>Interview scheduling</li>
                          <li>Candidate evaluation</li>
                          <li>Offer letter generation</li>
                        </ul>
                        <p className="mb-0"><strong>Status:</strong> <span className="badge bg-warning">In Development</span></p>
                      </div>
                    </div>
                  </Layout>
                </ProtectedRoute>
              } 
            />

            {/* Reports Routes */}
            <Route 
              path="/admin/reports/attendance" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']}>
                  <Layout>
                    <AttendanceReports />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/reports/*" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']}>
                  <Layout>
                    <div className="container-fluid">
                      <div className="alert alert-dark">
                        <h4><i className="bi bi-bar-chart me-2"></i>Reports & Analytics</h4>
                        <p>This module will include:</p>
                        <ul>
                          <li>Employee reports and analytics</li>
                          <li>Attendance and leave reports</li>
                          <li>Performance dashboards</li>
                          <li>Payroll reports</li>
                          <li>Custom report builder</li>
                        </ul>
                        <p className="mb-0"><strong>Status:</strong> <span className="badge bg-warning">In Development</span></p>
                      </div>
                    </div>
                  </Layout>
                </ProtectedRoute>
              } 
            />

            {/* System Settings Routes - Admin Only */}
            <Route 
              path="/admin/settings/*" 
              element={
                <ProtectedRoute requiredRoles={['Admin']}>
                  <Layout>
                    <div className="container-fluid">
                      <div className="alert alert-danger">
                        <h4><i className="bi bi-gear me-2"></i>System Settings</h4>
                        <p>This module will include:</p>
                        <ul>
                          <li>General system configuration</li>
                          <li>User roles and permissions</li>
                          <li>Email templates and notifications</li>
                          <li>Approval workflows</li>
                          <li>Audit logs and security</li>
                          <li>Backup and restore</li>
                        </ul>
                        <p className="mb-0"><strong>Status:</strong> <span className="badge bg-warning">In Development</span></p>
                      </div>
                    </div>
                  </Layout>
                </ProtectedRoute>
              } 
            />

            {/* My Attendance Route */}
            <Route 
              path="/employee/attendance" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <MyAttendance />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            {/* Change Password Route */}
            <Route 
              path="/change-password" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <ChangePassword />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            {/* Notifications Route */}
            <Route 
              path="/notifications" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <NotificationsPage />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            {/* Employee Payroll Routes */}
            <Route 
              path="/employee/payroll/payslip" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <EmployeePayslip />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/employee/payroll/reimbursements" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <EmployeeReimbursements />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            {/* Employee Permission Routes */}
            <Route 
              path="/employee/permissions" 
              element={
                <ProtectedRoute requiredRoles={['Employee']}>
                  <Layout>
                    <EmployeePermissions />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            {/* Regularization Routes */}
            <Route 
              path="/employee/regularization/request" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <RegularizationRequest />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/regularization" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']}>
                  <Layout>
                    <RegularizationDashboard />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/regularization/:id" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']}>
                  <Layout>
                    <div className="container-fluid">
                      <div className="alert alert-info">
                        <h4><i className="bi bi-eye me-2"></i>Regularization Details</h4>
                        <p>This page will show detailed view of a regularization request including:</p>
                        <ul>
                          <li>Request details and supporting documents</li>
                          <li>Approval workflow and history</li>
                          <li>Comments and feedback</li>
                          <li>Approve/Reject actions</li>
                        </ul>
                        <p className="mb-0"><strong>Status:</strong> <span className="badge bg-warning">Coming Soon</span></p>
                      </div>
                    </div>
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/employee/regularization/:id" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <div className="container-fluid">
                      <div className="alert alert-info">
                        <h4><i className="bi bi-eye me-2"></i>My Regularization Request</h4>
                        <p>This page will show your regularization request details including:</p>
                        <ul>
                          <li>Request status and progress</li>
                          <li>Approval workflow</li>
                          <li>Comments from approvers</li>
                          <li>Supporting documents</li>
                        </ul>
                        <p className="mb-0"><strong>Status:</strong> <span className="badge bg-warning">Coming Soon</span></p>
                      </div>
                    </div>
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/employee/regularization" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <MyRegularizationRequests />
                  </Layout>
                </ProtectedRoute>
              } 
            />

            {/* Employee Self-Service Routes */}
            <Route 
              path="/employee/*" 
              element={
                <ProtectedRoute requiredRoles={['Employee']}>
                  <Layout>
                    <div className="container-fluid">
                      <div className="alert alert-light border">
                        <h4><i className="bi bi-person-circle me-2"></i>Employee Self-Service</h4>
                        <p>This section will include:</p>
                        <ul>
                          <li>Personal profile management</li>
                          <li>Leave application and history</li>
                          <li>Attendance tracking</li>
                          <li>Training enrollment</li>
                          <li>Performance goals</li>
                        </ul>
                        <p className="mb-0"><strong>Status:</strong> <span className="badge bg-warning">In Development</span></p>
                      </div>
                    </div>
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            {/* Default redirect based on user role */}
            <Route path="/" element={<RoleBasedRedirect />} />
            
            {/* 404 Page */}
            <Route 
              path="*" 
              element={
                <Layout>
                  <div className="container-fluid">
                    <div className="row justify-content-center">
                      <div className="col-md-6">
                        <div className="card">
                          <div className="card-body text-center">
                            <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '4rem' }}></i>
                            <h2 className="card-title mt-3">Page Not Found</h2>
                            <p className="card-text text-muted">
                              The page you're looking for doesn't exist.
                            </p>
                            <button 
                              className="btn btn-primary"
                              onClick={() => window.location.href = '/dashboard'}
                            >
                              <i className="bi bi-house me-2"></i>
                              Go to Dashboard
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Layout>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
