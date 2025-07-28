import React, { useState, useEffect } from 'react';
import { attendanceAPI } from '../../utils/api';
import { userAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const AttendanceReports = () => {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [hierarchicalUsers, setHierarchicalUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    employee: '',
    status: '',
    startDate: '',
    endDate: '',
    searchTerm: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1
  });
  const [summary, setSummary] = useState({
    totalRecords: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    totalOvertimeHours: 0,
    totalWorkHours: 0
  });

  // Download modal states
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('excel');
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadDateRange, setDownloadDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [downloadSummary, setDownloadSummary] = useState({
    totalRecords: 0
  });
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

  useEffect(() => {
    fetchEmployees();
    fetchHierarchicalUsers();
    fetchAttendance();
  }, [filters, pagination.page]);

  // Handle search functionality
  useEffect(() => {
    if (!filters.searchTerm) {
      setFilteredEmployees(employees);
    } else {
      const searchLower = filters.searchTerm.toLowerCase();
      const filtered = employees.filter(employee => {
        const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
        const employeeId = employee.employeeId?.toLowerCase() || '';
        const email = employee.email.toLowerCase();
        
        return fullName.includes(searchLower) || 
               employeeId.includes(searchLower) || 
               email.includes(searchLower);
      });
      setFilteredEmployees(filtered);
    }
  }, [filters.searchTerm, employees]);

  const fetchEmployees = async () => {
    try {
      const response = await userAPI.getAllUsers({ limit: 1000 }); // Get all employees
      const allUsers = response.data?.users || [];
      
      // Filter to show only Employee, Team Leader, and Team Manager roles
      // HR should not see Admin, Vice President, HR BP, HR Manager, HR Executive
      const filteredUsers = allUsers.filter(user => 
        user.role === 'Employee' || 
        user.role === 'Team Leader' || 
        user.role === 'Team Manager'
      );
      
      // Sort employees alphabetically by first name, then by last name
      const sortedEmployees = filteredUsers.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setEmployees(sortedEmployees);
      setFilteredEmployees(sortedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchHierarchicalUsers = async () => {
    try {
      console.log('Fetching hierarchical users for role:', user?.role);
      const response = await userAPI.getUsersByHierarchy();
      console.log('Hierarchical users response:', response.data);
      const users = response.data?.data || [];
      
      // Sort users by role hierarchy, then by name
      const sortedUsers = users.sort((a, b) => {
        const roleOrder = {
          'Employee': 1,
          'Team Leader': 2,
          'Team Manager': 3,
          'HR Executive': 4,
          'HR Manager': 5,
          'HR BP': 6
        };
        
        const roleComparison = (roleOrder[a.role] || 999) - (roleOrder[b.role] || 999);
        if (roleComparison !== 0) return roleComparison;
        
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      console.log('Sorted hierarchical users:', sortedUsers);
      setHierarchicalUsers(sortedUsers);
    } catch (error) {
      console.error('Error fetching hierarchical users:', error);
      setHierarchicalUsers([]); // Set empty array on error
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = {
        employee: filters.employee || undefined,
        status: filters.status || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        page: pagination.page,
        limit: pagination.limit
      };
      const response = await attendanceAPI.getAllAttendance(params);
      let data = response.data?.attendance || [];
      
      // Apply search filter to the fetched data
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        data = data.filter(record => {
          if (!record.employee) return false;
          
          const fullName = `${record.employee.firstName} ${record.employee.lastName}`.toLowerCase();
          const employeeId = record.employee.employeeId?.toLowerCase() || '';
          const email = record.employee.email?.toLowerCase() || '';
          
          return fullName.includes(searchLower) || 
                 employeeId.includes(searchLower) || 
                 email.includes(searchLower);
        });
      }
      
      setAttendanceData(data);
      setPagination(prev => ({
        ...prev,
        totalPages: response.data?.totalPages || 1
      }));

      // Calculate summary with proper total hours calculation
      const summaryData = {
        totalRecords: data.length,
        presentDays: data.filter(record => record.status === 'Present').length,
        absentDays: data.filter(record => record.status === 'Absent').length,
        lateDays: data.filter(record => record.isLate).length,
        totalOvertimeHours: data.reduce((sum, record) => sum + (record.overtime || 0), 0),
        totalWorkHours: data.reduce((sum, record) => {
          const hours = record.totalHours || record.currentWorkHours || 0;
          return sum + (typeof hours === 'number' ? hours : 0);
        }, 0)
      };
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching attendance reports:', error);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filtering
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({
        ...prev,
        page: newPage
      }));
    }
  };

  const clearFilters = () => {
    setFilters({
      employee: '',
      status: '',
      startDate: '',
      endDate: '',
      searchTerm: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Fetch download count based on selected date range and employees
  const fetchDownloadCount = async () => {
    try {
      const params = {
        employee: filters.employee || undefined,
        status: filters.status || undefined,
        startDate: downloadDateRange.startDate || filters.startDate || undefined,
        endDate: downloadDateRange.endDate || filters.endDate || undefined,
        searchTerm: filters.searchTerm || undefined,
        selectedEmployees: selectedEmployees.length > 0 ? selectedEmployees.join(',') : undefined
      };
      
      const response = await attendanceAPI.getAttendanceCount(params);
      setDownloadSummary({
        totalRecords: response.data?.count || 0
      });
    } catch (error) {
      console.error('Error fetching download count:', error);
      setDownloadSummary({
        totalRecords: 0
      });
    }
  };

  // Effect to fetch download count when download date range or selected employees change
  useEffect(() => {
    if (showDownloadModal) {
      fetchDownloadCount();
    }
  }, [downloadDateRange.startDate, downloadDateRange.endDate, selectedEmployees, showDownloadModal]);

  const getStatusBadge = (status, isLate) => {
    let badgeClass = 'badge ';
    switch (status) {
      case 'Present':
        badgeClass += isLate ? 'bg-warning' : 'bg-success';
        break;
      case 'Absent':
        badgeClass += 'bg-danger';
        break;
      case 'Late':
        badgeClass += 'bg-warning';
        break;
      case 'Half Day':
        badgeClass += 'bg-info';
        break;
      case 'On Leave':
        badgeClass += 'bg-secondary';
        break;
      case 'Holiday':
        badgeClass += 'bg-primary';
        break;
      default:
        badgeClass += 'bg-light text-dark';
    }
    return badgeClass;
  };

  // Handle download functionality
  const handleDownload = async () => {
    setDownloadLoading(true);
    try {
      const params = {
        employee: filters.employee || undefined,
        status: filters.status || undefined,
        startDate: downloadDateRange.startDate || filters.startDate || undefined,
        endDate: downloadDateRange.endDate || filters.endDate || undefined,
        format: downloadFormat,
        searchTerm: filters.searchTerm || undefined,
        selectedEmployees: selectedEmployees.length > 0 ? selectedEmployees.join(',') : undefined
      };

      const response = await attendanceAPI.downloadAttendanceReport(params);
      
      // Create blob from response
      const blob = new Blob([response.data], {
        type: downloadFormat === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with current date and filters
      const currentDate = new Date().toISOString().split('T')[0];
      const dateRange = filters.startDate && filters.endDate 
        ? `_${filters.startDate}_to_${filters.endDate}`
        : filters.startDate 
        ? `_from_${filters.startDate}`
        : filters.endDate
        ? `_until_${filters.endDate}`
        : `_${currentDate}`;
      
      const filename = `attendance_report${dateRange}.${downloadFormat === 'excel' ? 'xlsx' : 'pdf'}`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setShowDownloadModal(false);
      
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Helper functions for employee selection
  const handleEmployeeToggle = (employeeId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const handleSelectAllEmployees = () => {
    const filteredUsers = getFilteredHierarchicalUsers();
    if (selectedEmployees.length === filteredUsers.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredUsers.map(user => user._id));
    }
  };

  const getFilteredHierarchicalUsers = () => {
    if (!employeeSearchTerm) {
      return hierarchicalUsers;
    }
    
    const searchLower = employeeSearchTerm.toLowerCase();
    return hierarchicalUsers.filter(user => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const employeeId = user.employeeId?.toLowerCase() || '';
      const email = user.email.toLowerCase();
      const role = user.role.toLowerCase();
      
      return fullName.includes(searchLower) || 
             employeeId.includes(searchLower) || 
             email.includes(searchLower) ||
             role.includes(searchLower);
    });
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'Employee': 'Employee',
      'Team Leader': 'Team Leader',
      'Team Manager': 'Team Manager',
      'HR Executive': 'HR Executive',
      'HR Manager': 'HR Manager',
      'HR BP': 'HR Business Partner'
    };
    return roleNames[role] || role;
  };

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3><i className="bi bi-graph-up me-2"></i>Attendance Reports</h3>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-success" 
            onClick={() => {
              setDownloadDateRange({
                startDate: filters.startDate || '',
                endDate: filters.endDate || ''
              });
              setDownloadSummary({
                totalRecords: summary.totalRecords
              });
              setSelectedEmployees([]);
              setEmployeeSearchTerm('');
              setShowDownloadModal(true);
            }}
            disabled={loading || attendanceData.length === 0}
          >
            <i className="bi bi-download me-1"></i>Download Report
          </button>
          <button className="btn btn-outline-secondary" onClick={clearFilters}>
            <i className="bi bi-arrow-clockwise me-1"></i>Clear Filters
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-2">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="text-primary">{summary.totalRecords}</h5>
              <small className="text-muted">Total Records</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="text-success">{summary.presentDays}</h5>
              <small className="text-muted">Present Days</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="text-danger">{summary.absentDays}</h5>
              <small className="text-muted">Absent Days</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="text-warning">{summary.lateDays}</h5>
              <small className="text-muted">Late Days</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="text-info">{summary.totalOvertimeHours.toFixed(2)} hrs</h5>
              <small className="text-muted">Total Overtime</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card text-center">
            <div className="card-body">
              <h5 className="text-primary">{summary.totalWorkHours.toFixed(2)} hrs</h5>
              <small className="text-muted">Total Work Hours</small>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0"><i className="bi bi-funnel me-2"></i>Filters</h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-12 mb-3">
              <label className="form-label">Search Employee:</label>
              <input
                type="text"
                name="searchTerm"
                value={filters.searchTerm}
                onChange={handleFilterChange}
                className="form-control"
                placeholder="Search by name, employee ID, or email..."
              />
              <small className="text-muted">Search employees, team leaders, and managers by name, employee code, or email</small>
            </div>
          </div>
          <div className="row">
            <div className="col-md-3">
              <label className="form-label">Employee:</label>
              <select
                name="employee"
                value={filters.employee}
                onChange={handleFilterChange}
                className="form-select"
              >
                <option value="">All Employees</option>
                {filteredEmployees.map(employee => (
                  <option key={employee._id} value={employee._id}>
                    {employee.firstName} {employee.lastName} 
                    {employee.employeeId && ` (ID: ${employee.employeeId})`} - {employee.role}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Status:</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="form-select"
              >
                <option value="">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
                <option value="Half Day">Half Day</option>
                <option value="On Leave">On Leave</option>
                <option value="Holiday">Holiday</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Start Date:</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="form-control"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">End Date:</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="form-control"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card">
        <div className="card-header">
          <h6 className="mb-0"><i className="bi bi-table me-2"></i>Attendance Records</h6>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading attendance data...</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th>Date</th>
                      <th>Employee</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Total Hours</th>
                      <th>Status</th>
                      <th>Late Minutes</th>
                      <th>Overtime (hrs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          <i className="bi bi-calendar-x text-muted" style={{ fontSize: '2rem' }}></i>
                          <p className="text-muted mt-2">No attendance records found</p>
                        </td>
                      </tr>
                    ) : (
                      attendanceData.map(record => (
                        <tr key={record._id}>
                          <td>{new Date(record.date).toLocaleDateString()}</td>
                          <td>
                            <div>
                              <strong>{record.employee?.firstName} {record.employee?.lastName}</strong>
                              {record.employee?.employeeId && (
                                <span className="badge bg-secondary ms-2">ID: {record.employee.employeeId}</span>
                              )}
                              <br />
                              <small className="text-muted">{record.employee?.email}</small>
                              <br />
                              <small className="text-info">{record.employee?.role}</small>
                            </div>
                          </td>
                          <td>
                            {record.checkIn ? (
                              <span className="text-success">
                                <i className="bi bi-clock me-1"></i>
                                {new Date(record.checkIn).toLocaleTimeString()}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {record.checkOut ? (
                              <span className="text-danger">
                                <i className="bi bi-clock me-1"></i>
                                {new Date(record.checkOut).toLocaleTimeString()}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <strong>
                              {(() => {
                                const hours = record.totalHours || record.currentWorkHours || 0;
                                return (typeof hours === 'number' ? hours : 0).toFixed(2);
                              })()}
                            </strong>
                            {record.checkIn && !record.checkOut && (
                              <small className="text-muted d-block">
                                <i className="bi bi-clock me-1"></i>
                                Currently working
                              </small>
                            )}
                          </td>
                          <td>
                            <span className={getStatusBadge(record.status, record.isLate)}>
                              {record.status}
                              {record.isLate && record.status === 'Present' && ' (Late)'}
                            </span>
                          </td>
                          <td>
                            {record.lateMinutes > 0 ? (
                              <span className="text-warning">
                                <i className="bi bi-exclamation-triangle me-1"></i>
                                {record.lateMinutes} min
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {record.overtime > 0 ? (
                              <span className="text-info">
                                <i className="bi bi-plus-circle me-1"></i>
                                {record.overtime?.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted">0.00</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <nav className="mt-3">
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        <i className="bi bi-chevron-left"></i> Previous
                      </button>
                    </li>
                    {[...Array(Math.min(pagination.totalPages, 5)).keys()].map(num => {
                      const pageNum = num + 1;
                      return (
                        <li key={pageNum} className={`page-item ${pagination.page === pageNum ? 'active' : ''}`}>
                          <button 
                            className="page-link" 
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </button>
                        </li>
                      );
                    })}
                    <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                      >
                        Next <i className="bi bi-chevron-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  <i className="bi bi-download me-2"></i>
                  Download Attendance Report
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowDownloadModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-4">
                  <h6><i className="bi bi-calendar-range me-2"></i>Select Date Range for Download:</h6>
                  <div className="row">
                    <div className="col-md-6">
                      <label className="form-label">From Date:</label>
                      <input
                        type="date"
                        className="form-control"
                        value={downloadDateRange.startDate}
                        onChange={(e) => setDownloadDateRange(prev => ({
                          ...prev,
                          startDate: e.target.value
                        }))}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">To Date:</label>
                      <input
                        type="date"
                        className="form-control"
                        value={downloadDateRange.endDate}
                        onChange={(e) => setDownloadDateRange(prev => ({
                          ...prev,
                          endDate: e.target.value
                        }))}
                      />
                    </div>
                  </div>
                  <small className="text-muted">
                    Leave empty to use current filter dates or download all available data
                  </small>
                </div>

                {/* Employee Selection Section */}
                <div className="mb-4">
                  <h6><i className="bi bi-people me-2"></i>Select Employees for Download:</h6>
                  <div className="mb-3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search employees by name, ID, email, or role..."
                      value={employeeSearchTerm}
                      onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted">
                      Based on your role ({user?.role}), you can select from the following employees:
                    </small>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={handleSelectAllEmployees}
                    >
                      {selectedEmployees.length === getFilteredHierarchicalUsers().length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  
                  <div className="border rounded p-3" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {hierarchicalUsers.length === 0 ? (
                      <div className="text-center py-3">
                        <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                        <span className="text-muted">Loading employees...</span>
                      </div>
                    ) : getFilteredHierarchicalUsers().length === 0 ? (
                      <p className="text-muted text-center mb-0">
                        No employees match your search criteria
                      </p>
                    ) : (
                      getFilteredHierarchicalUsers().map(user => (
                        <div key={user._id} className="form-check mb-2">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`employee-${user._id}`}
                            checked={selectedEmployees.includes(user._id)}
                            onChange={() => handleEmployeeToggle(user._id)}
                          />
                          <label className="form-check-label" htmlFor={`employee-${user._id}`}>
                            <div>
                              <strong>{user.firstName} {user.lastName}</strong>
                              {user.employeeId && (
                                <span className="badge bg-secondary ms-2">ID: {user.employeeId}</span>
                              )}
                              <span className="badge bg-info ms-2">{getRoleDisplayName(user.role)}</span>
                              <br />
                              <small className="text-muted">{user.email}</small>
                            </div>
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {selectedEmployees.length > 0 && (
                    <div className="mt-2">
                      <small className="text-success">
                        <i className="bi bi-check-circle me-1"></i>
                        {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} selected
                      </small>
                    </div>
                  )}
                  
                  <small className="text-muted">
                    Leave empty to download attendance for all employees (based on current filters)
                  </small>
                </div>

                <div className="mb-3">
                  <h6>Report Details:</h6>
                  <ul className="list-unstyled">
                    <li><strong>Total Records:</strong> {downloadSummary.totalRecords}</li>
                    {(downloadDateRange.startDate || filters.startDate) && (
                      <li><strong>Start Date:</strong> {downloadDateRange.startDate || filters.startDate}</li>
                    )}
                    {(downloadDateRange.endDate || filters.endDate) && (
                      <li><strong>End Date:</strong> {downloadDateRange.endDate || filters.endDate}</li>
                    )}
                    {selectedEmployees.length > 0 && (
                      <li><strong>Selected Employees:</strong> {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''}</li>
                    )}
                    {filters.employee && (
                      <li><strong>Employee Filter:</strong> {
                        employees.find(emp => emp._id === filters.employee)?.firstName + ' ' + 
                        employees.find(emp => emp._id === filters.employee)?.lastName
                      }</li>
                    )}
                    {filters.status && <li><strong>Status Filter:</strong> {filters.status}</li>}
                    {filters.searchTerm && <li><strong>Search Term:</strong> {filters.searchTerm}</li>}
                  </ul>
                </div>
                
                <div className="mb-3">
                  <label className="form-label"><strong>Select Download Format:</strong></label>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="downloadFormat"
                      id="formatExcel"
                      value="excel"
                      checked={downloadFormat === 'excel'}
                      onChange={(e) => setDownloadFormat(e.target.value)}
                    />
                    <label className="form-check-label" htmlFor="formatExcel">
                      <i className="bi bi-file-earmark-excel text-success me-2"></i>
                      Excel (.xlsx) - Best for data analysis and calculations
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="downloadFormat"
                      id="formatPdf"
                      value="pdf"
                      checked={downloadFormat === 'pdf'}
                      onChange={(e) => setDownloadFormat(e.target.value)}
                    />
                    <label className="form-check-label" htmlFor="formatPdf">
                      <i className="bi bi-file-earmark-pdf text-danger me-2"></i>
                      PDF (.pdf) - Best for printing and sharing
                    </label>
                  </div>
                </div>

                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2"></i>
                  The report will include all filtered data with the selected date range and search criteria.
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDownloadModal(false)}
                  disabled={downloadLoading}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-success" 
                  onClick={handleDownload}
                  disabled={downloadLoading}
                >
                  {downloadLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Generating {downloadFormat === 'excel' ? 'Excel' : 'PDF'}...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-download me-2"></i>
                      Download {downloadFormat === 'excel' ? 'Excel' : 'PDF'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceReports;
