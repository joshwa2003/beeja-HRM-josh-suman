import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:5001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  verifyToken: () => api.get('/auth/verify'),
  verifyCurrentPassword: (data) => api.post('/auth/verify-current-password', data),
  sendPasswordChangeOTP: (data) => api.post('/auth/send-password-change-otp', data),
  verifyOTPAndChangePassword: (data) => api.post('/auth/verify-otp-and-change-password', data),
  logout: () => api.post('/auth/logout'),
  checkIn: (data) => api.post('/attendance/checkin', data),
  checkOut: (data) => api.post('/attendance/checkout', data),
};

// Attendance API calls
export const attendanceAPI = {
  checkIn: (data) => api.post('/attendance/checkin', data),
  checkOut: (data) => api.post('/attendance/checkout', data),
  getMyAttendance: (params) => api.get('/attendance/my', { params }),
  getTodayAttendance: () => api.get('/attendance/today'),
  getAttendanceSummary: (params) => api.get('/attendance/summary', { params }),
  getAllAttendance: (params) => api.get('/attendance', { params }),
  getAttendanceById: (id) => api.get(`/attendance/${id}`),
  updateAttendance: (id, data) => api.put(`/attendance/${id}`, data),
  regularizeAttendance: (id, data) => api.post(`/attendance/${id}/regularize`, data),
  updateActivity: () => api.post('/attendance/activity'),
  checkAutoCheckout: () => api.get('/attendance/auto-checkout-check'),
  getSmartOvertimeDetails: (id) => api.get(`/attendance/smart-overtime/${id}`),
  getCurrentlyWorkingEmployees: () => api.get('/attendance/currently-working'),
  downloadAttendanceReport: (params) => api.get('/attendance/download-report', { 
    params, 
    responseType: 'blob' 
  }),
  getAttendanceCount: (params) => api.get('/attendance/count', { params }),
};

// User API calls
export const userAPI = {
  getAllUsers: (params) => api.get('/users', { params }),
  getTeamLeads: () => api.get('/users/team-leads'),
  getEmployees: (params) => api.get('/users/employees', { params }),
  getUsersByHierarchy: () => api.get('/users/hierarchy'),
  getUserById: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  getRoles: () => api.get('/users/roles'),
};

// Department API calls
export const departmentAPI = {
  getAllDepartments: (params) => api.get('/departments', { params }),
  getDepartmentById: (id) => api.get(`/departments/${id}`),
  createDepartment: (departmentData) => api.post('/departments', departmentData),
  updateDepartment: (id, departmentData) => api.put(`/departments/${id}`, departmentData),
  deleteDepartment: (id) => api.delete(`/departments/${id}`),
  getDepartmentStats: () => api.get('/departments/stats'),
};

// Payroll API calls
export const payrollAPI = {
  getAllPayrolls: (params) => api.get('/payroll', { params }),
  getPayrollById: (id) => api.get(`/payroll/${id}`),
  createOrUpdatePayroll: (data) => api.post('/payroll', data),
  updatePayroll: (id, data) => api.put(`/payroll/${id}`, data),
  bulkProcessPayroll: (data) => api.post('/payroll/bulk-process', data),
  processPayroll: (id) => api.patch(`/payroll/${id}/process`),
  markPayrollAsPaid: (id, data) => api.patch(`/payroll/${id}/mark-paid`, data),
  putPayrollOnHold: (id, data) => api.patch(`/payroll/${id}/hold`, data),
  getPayrollSummary: (params) => api.get('/payroll/summary', { params }),
  getPayrollReports: (params) => api.get('/payroll/reports', { params }),
  deletePayroll: (id) => api.delete(`/payroll/${id}`),
};

// Salary Structure API calls
export const salaryStructureAPI = {
  getAllStructures: (params) => api.get('/salary-structures', { params }),
  getStructureById: (id) => api.get(`/salary-structures/${id}`),
  createStructure: (data) => api.post('/salary-structures', data),
  updateStructure: (id, data) => api.put(`/salary-structures/${id}`, data),
  deleteStructure: (id) => api.delete(`/salary-structures/${id}`),
  cloneStructure: (id, data) => api.post(`/salary-structures/${id}/clone`, data),
  calculateSalaryPreview: (id, data) => api.post(`/salary-structures/${id}/calculate`, data),
  getApplicableStructure: (employeeId) => api.get(`/salary-structures/employee/${employeeId}/applicable`),
  assignStructureToEmployees: (id, data) => api.post(`/salary-structures/${id}/assign`, data),
  getSalaryTemplates: () => api.get('/salary-structures/templates'),
  setDefaultStructure: (id) => api.patch(`/salary-structures/${id}/set-default`),
};

// Reimbursement API calls
export const reimbursementAPI = {
  getAllReimbursements: (params) => api.get('/reimbursements', { params }),
  getReimbursementById: (id) => api.get(`/reimbursements/${id}`),
  createReimbursement: (data) => api.post('/reimbursements', data),
  updateReimbursement: (id, data) => api.put(`/reimbursements/${id}`, data),
  submitReimbursement: (id) => api.patch(`/reimbursements/${id}/submit`),
  approveReimbursement: (id, data) => api.patch(`/reimbursements/${id}/approve`, data),
  rejectReimbursement: (id, data) => api.patch(`/reimbursements/${id}/reject`, data),
  markReimbursementAsPaid: (id, data) => api.patch(`/reimbursements/${id}/mark-paid`, data),
  getPendingApprovals: () => api.get('/reimbursements/pending-approvals'),
  getReimbursementSummary: (params) => api.get('/reimbursements/summary', { params }),
  getReimbursementConfig: () => api.get('/reimbursements/config'),
  deleteReimbursement: (id) => api.delete(`/reimbursements/${id}`),
};

// Regularization API calls
export const regularizationAPI = {
  getAllRegularizations: (params) => api.get('/regularization', { params }),
  getRegularizationById: (id) => api.get(`/regularization/${id}`),
  createRegularization: (data) => api.post('/regularization', data),
  updateRegularization: (id, data) => api.put(`/regularization/${id}`, data),
  approveRegularization: (id, data) => api.patch(`/regularization/${id}/approve`, data),
  rejectRegularization: (id, data) => api.patch(`/regularization/${id}/reject`, data),
  getMyRegularizations: (params) => api.get('/regularization/employee', { params }),
  getPendingRegularizations: (params) => api.get('/regularization/pending-approvals', { params }),
  getRegularizationConfig: () => api.get('/regularization/config'),
  deleteRegularization: (id) => api.delete(`/regularization/${id}`),
  getEmployeeAttendance: (params) => api.get('/attendance/employee', { params }),
  getRegularizationStatistics: (params) => api.get('/regularization/statistics', { params }),
};

// Team Leader Regularization API calls
export const regularizationTeamLeaderAPI = {
  getAllRegularizations: (params) => api.get('/regularization-team-leader', { params }),
  getPendingRegularizations: (params) => api.get('/regularization-team-leader/pending', { params }),
  getRegularizationDetails: (id) => api.get(`/regularization-team-leader/${id}`),
  approveRegularization: (id, data) => api.patch(`/regularization-team-leader/${id}/approve`, data),
  rejectRegularization: (id, data) => api.patch(`/regularization-team-leader/${id}/reject`, data),
  getDashboardStats: () => api.get('/regularization-team-leader/stats'),
};

// Team Manager Regularization API calls
export const regularizationTeamManagerAPI = {
  getAllRegularizations: (params) => api.get('/regularization-team-manager', { params }),
  getPendingRegularizations: (params) => api.get('/regularization-team-manager/pending', { params }),
  getRegularizationDetails: (id) => api.get(`/regularization-team-manager/${id}`),
  approveRegularization: (id, data) => api.patch(`/regularization-team-manager/${id}/approve`, data),
  rejectRegularization: (id, data) => api.patch(`/regularization-team-manager/${id}/reject`, data),
  getDashboardStats: () => api.get('/regularization-team-manager/stats'),
};

// HR Regularization API calls
export const regularizationHRAPI = {
  getAllRegularizations: (params) => api.get('/regularization-hr', { params }),
  getRegularizationDetails: (id) => api.get(`/regularization-hr/${id}`),
  approveRegularization: (id, data) => api.patch(`/regularization-hr/${id}/approve`, data),
  rejectRegularization: (id, data) => api.patch(`/regularization-hr/${id}/reject`, data),
  getDashboardStats: () => api.get('/regularization-hr/stats'),
};

// VP/Admin Regularization API calls
export const regularizationVPAPI = {
  getAllRegularizations: (params) => api.get('/regularization-vp', { params }),
  getPendingRegularizations: (params) => api.get('/regularization-vp/pending', { params }),
  getRegularizationDetails: (id) => api.get(`/regularization-vp/${id}`),
  approveRegularization: (id, data) => api.patch(`/regularization-vp/${id}/approve`, data),
  rejectRegularization: (id, data) => api.patch(`/regularization-vp/${id}/reject`, data),
  getDashboardStats: () => api.get('/regularization-vp/stats'),
};

// Health check

// Notification API calls
export const notificationAPI = {
  getMyNotifications: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  getRecentNotifications: (params) => api.get('/notifications/recent', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markMultipleAsRead: (notificationIds) => api.put('/notifications/mark-multiple-read', { notificationIds }),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  createNotification: (data) => api.post('/notifications', data),
  getNotificationStats: (params) => api.get('/notifications/stats', { params }),
};

// Permission API calls
export const permissionAPI = {
  createPermissionRequest: (data) => api.post('/permissions', data),
  getMyPermissionRequests: () => api.get('/permissions/my-requests'),
  getPendingApprovals: () => api.get('/permissions/pending-approvals'),
  getPermissionById: (id) => api.get(`/permissions/${id}`),
  approvePermission: (id) => api.patch(`/permissions/${id}/approve`),
  rejectPermission: (id, data) => api.patch(`/permissions/${id}/reject`, data),
};

// Health check
export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
