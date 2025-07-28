import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { permissionAPI, userAPI } from '../../utils/api';

const Permissions = () => {
  const { user, hasAnyRole } = useAuth();
  const [activeTab, setActiveTab] = useState('request');
  const [loading, setLoading] = useState(false);
  const [teamLeads, setTeamLeads] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [filteredApprovals, setFilteredApprovals] = useState([]);
  const [selectedPermission, setSelectedPermission] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Filter states
  const [filters, setFilters] = useState({
    approvalLevel: 'All Levels',
    status: 'All Status',
    year: new Date().getFullYear().toString()
  });

  // Statistics
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  // Permission Request Form State
  const [permissionRequest, setPermissionRequest] = useState({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    duration: '',
    reason: '',
    assignedBy: '',
    responsiblePerson: '',
    workDescription: ''
  });

  // Fetch users for dropdowns
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'my-requests') {
      fetchMyRequests();
    } else if (activeTab === 'approve') {
      fetchPendingApprovals();
    }
  }, [activeTab]);

  // Calculate duration when dates/times change
  useEffect(() => {
    if (permissionRequest.startDate && permissionRequest.startTime && 
        permissionRequest.endDate && permissionRequest.endTime) {
      calculateDuration();
    }
  }, [permissionRequest.startDate, permissionRequest.startTime, 
      permissionRequest.endDate, permissionRequest.endTime]);

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getAllUsers();
      const users = response.data.users || [];
      
      // Filter leads based on current user's role
      let leads = [];
      let members = [];
      
      if (['Team Leader', 'Team Lead'].includes(user.role)) {
        // Team Leaders can only assign work from Team Managers and above
        leads = users.filter(u => 
          ['Team Manager', 'HR Manager', 'HR BP', 'Vice President', 'Admin'].includes(u.role)
        );
        // Team Leaders can assign responsibility to other Team Leaders and Employees
        members = users.filter(u => 
          ['Team Leader', 'Team Lead', 'Employee', 'Developer', 'Senior Developer'].includes(u.role) && u._id !== user._id
        );
      } else {
        // Regular employees see Team Leaders and above for assignment
        leads = users.filter(u => 
          ['Team Manager', 'Team Leader', 'Team Lead', 'HR Manager', 'Project Manager'].includes(u.role)
        );
        members = users.filter(u => 
          !['Team Manager', 'Team Leader', 'Team Lead', 'HR Manager', 'Project Manager'].includes(u.role) && u._id !== user._id
        );
      }
      
      setTeamLeads(leads);
      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const response = await permissionAPI.getMyPermissionRequests();
      setMyRequests(response.data.permissions || []);
    } catch (error) {
      console.error('Error fetching my requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await permissionAPI.getPendingApprovals();
      const permissions = response.data.permissions || [];
      setPendingApprovals(permissions);
      setFilteredApprovals(permissions);
      calculateStatistics(permissions);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics from permissions data
  const calculateStatistics = (permissions) => {
    const stats = {
      total: permissions.length,
      pending: 0,
      approved: 0,
      rejected: 0
    };

    permissions.forEach(permission => {
      if (permission.status === 'Rejected') {
        stats.rejected++;
      } else if (permission.status === 'HR Approved') {
        stats.approved++;
      } else {
        stats.pending++;
      }
    });

    setStatistics(stats);
  };

  // Filter permissions based on selected filters
  const applyFilters = () => {
    let filtered = [...pendingApprovals];

    // Filter by approval level
    if (filters.approvalLevel !== 'All Levels') {
      if (filters.approvalLevel === 'Team Leader') {
        filtered = filtered.filter(p => 
          p.currentApprovalLevel === 'Team Leader' || 
          p.approvalHistory?.some(h => h.level === 'Team Leader')
        );
      } else if (filters.approvalLevel === 'Team Manager') {
        filtered = filtered.filter(p => 
          p.currentApprovalLevel === 'Team Manager' || 
          p.approvalHistory?.some(h => h.level === 'Team Manager')
        );
      } else if (filters.approvalLevel === 'HR') {
        filtered = filtered.filter(p => 
          p.currentApprovalLevel === 'HR' || 
          p.approvalHistory?.some(h => h.level === 'HR')
        );
      }
    }

    // Filter by status
    if (filters.status !== 'All Status') {
      if (filters.status === 'Pending') {
        filtered = filtered.filter(p => 
          p.status === 'Pending' || 
          p.status === 'Team Leader Approved' || 
          p.status === 'Team Manager Approved'
        );
      } else if (filters.status === 'Approved') {
        filtered = filtered.filter(p => p.status === 'HR Approved');
      } else if (filters.status === 'Rejected') {
        filtered = filtered.filter(p => p.status === 'Rejected');
      }
    }

    // Filter by year
    if (filters.year !== 'All Years') {
      filtered = filtered.filter(p => {
        const requestYear = new Date(p.submittedAt).getFullYear().toString();
        return requestYear === filters.year;
      });
    }

    setFilteredApprovals(filtered);
    calculateStatistics(filtered);
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      approvalLevel: 'All Levels',
      status: 'All Status',
      year: new Date().getFullYear().toString()
    });
    setFilteredApprovals(pendingApprovals);
    calculateStatistics(pendingApprovals);
  };

  // Apply filters when filter values change
  useEffect(() => {
    if (pendingApprovals.length > 0) {
      applyFilters();
    }
  }, [filters, pendingApprovals]);

  const calculateDuration = () => {
    const startDateTime = new Date(`${permissionRequest.startDate}T${permissionRequest.startTime}`);
    const endDateTime = new Date(`${permissionRequest.endDate}T${permissionRequest.endTime}`);
    
    if (endDateTime > startDateTime) {
      const diffMs = endDateTime - startDateTime;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      let duration = '';
      if (diffHours > 0) {
        duration += `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
      }
      if (diffMinutes > 0) {
        if (duration) duration += ' ';
        duration += `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
      }
      
      setPermissionRequest(prev => ({
        ...prev,
        duration: duration || '0 minutes'
      }));
    }
  };

  const handleInputChange = (field, value) => {
    setPermissionRequest(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!permissionRequest.startDate || !permissionRequest.startTime || 
          !permissionRequest.endDate || !permissionRequest.endTime ||
          !permissionRequest.reason || !permissionRequest.assignedBy ||
          !permissionRequest.responsiblePerson || !permissionRequest.workDescription) {
        alert('Please fill in all required fields.');
        return;
      }

      await permissionAPI.createPermissionRequest(permissionRequest);
      alert('Permission request submitted successfully!');
      
      // Reset form
      setPermissionRequest({
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        duration: '',
        reason: '',
        assignedBy: '',
        responsiblePerson: '',
        workDescription: ''
      });

    } catch (error) {
      console.error('Error submitting permission request:', error);
      alert('Failed to submit permission request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPermission = async (permissionId) => {
    try {
      const response = await permissionAPI.getPermissionById(permissionId);
      setSelectedPermission(response.data.permission);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching permission details:', error);
      alert('Failed to fetch permission details.');
    }
  };

  const handleApprovePermission = async (permissionId) => {
    try {
      setLoading(true);
      await permissionAPI.approvePermission(permissionId);
      alert('Permission request approved successfully!');
      // Refresh the pending approvals list to show updated status
      await fetchPendingApprovals();
    } catch (error) {
      console.error('Error approving permission:', error);
      alert('Failed to approve permission request.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPermission = async () => {
    try {
      setLoading(true);
      await permissionAPI.rejectPermission(selectedPermission._id, { rejectionReason });
      alert('Permission request rejected successfully!');
      setShowRejectModal(false);
      setRejectionReason('');
      // Refresh the pending approvals list to show updated status
      await fetchPendingApprovals();
    } catch (error) {
      console.error('Error rejecting permission:', error);
      alert('Failed to reject permission request.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Pending': { class: 'bg-warning', text: 'Pending' },
      'Team Leader Approved': { class: 'bg-info', text: 'Team Leader Approved' },
      'Team Manager Approved': { class: 'bg-primary', text: 'Team Manager Approved' },
      'HR Approved': { class: 'bg-success', text: 'HR Approved' },
      'Rejected': { class: 'bg-danger', text: 'Rejected' }
    };
    
    const config = statusConfig[status] || { class: 'bg-secondary', text: status };
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString, timeString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${timeString}`;
  };

  const renderPermissionRequestForm = () => (
    <div className="card">
      <div className="card-header bg-primary text-white">
        <h5 className="mb-0">
          <i className="bi bi-clipboard-check me-2"></i>
          Permission Request Form
        </h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmitRequest}>
          <div className="row">
            {/* Date and Time Selection */}
            <div className="col-md-6">
              <div className="card mb-3">
                <div className="card-header">
                  <h6 className="mb-0">
                    <i className="bi bi-calendar-range me-2"></i>
                    Date & Time Range
                  </h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-6">
                      <label className="form-label">Start Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={permissionRequest.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Start Time *</label>
                      <input
                        type="time"
                        className="form-control"
                        value={permissionRequest.startTime}
                        onChange={(e) => handleInputChange('startTime', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="row mt-3">
                    <div className="col-6">
                      <label className="form-label">End Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={permissionRequest.endDate}
                        onChange={(e) => handleInputChange('endDate', e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label">End Time *</label>
                      <input
                        type="time"
                        className="form-control"
                        value={permissionRequest.endTime}
                        onChange={(e) => handleInputChange('endTime', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  {permissionRequest.duration && (
                    <div className="mt-3">
                      <div className="alert alert-info">
                        <i className="bi bi-clock me-2"></i>
                        <strong>Duration:</strong> {permissionRequest.duration}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="col-md-6">
              <div className="card mb-3">
                <div className="card-header">
                  <h6 className="mb-0">
                    <i className="bi bi-info-circle me-2"></i>
                    Request Details
                  </h6>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label">Reason for Permission *</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={permissionRequest.reason}
                      onChange={(e) => handleInputChange('reason', e.target.value)}
                      placeholder="Please provide a detailed reason for your permission request..."
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Who Assigned the Work? *</label>
                    <select
                      className="form-select"
                      value={permissionRequest.assignedBy}
                      onChange={(e) => handleInputChange('assignedBy', e.target.value)}
                      required
                    >
                      <option value="">Select Team Lead/Manager</option>
                      {teamLeads.map(lead => (
                        <option key={lead._id} value={lead._id}>
                          {lead.firstName} {lead.lastName} - {lead.role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Who is Responsible During Absence? *</label>
                    <select
                      className="form-select"
                      value={permissionRequest.responsiblePerson}
                      onChange={(e) => handleInputChange('responsiblePerson', e.target.value)}
                      required
                    >
                      <option value="">Select Responsible Person</option>
                      {teamMembers.map(member => (
                        <option key={member._id} value={member._id}>
                          {member.firstName} {member.lastName} - {member.role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Work Description */}
          <div className="card mb-3">
            <div className="card-header">
              <h6 className="mb-0">
                <i className="bi bi-briefcase me-2"></i>
                Work/Task Description
              </h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Describe the work/task being handled during this time *</label>
                <textarea
                  className="form-control"
                  rows="4"
                  value={permissionRequest.workDescription}
                  onChange={(e) => handleInputChange('workDescription', e.target.value)}
                  placeholder="Please provide detailed information about the work or task that needs to be handled during your absence..."
                  required
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setPermissionRequest({
                  startDate: '',
                  startTime: '',
                  endDate: '',
                  endTime: '',
                  duration: '',
                  reason: '',
                  assignedBy: '',
                  responsiblePerson: '',
                  workDescription: ''
                });
              }}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Reset Form
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Submitting...
                </>
              ) : (
                <>
                  <i className="bi bi-send me-1"></i>
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderMyRequests = () => (
    <div className="card">
      <div className="card-header">
        <h5 className="mb-0">
          <i className="bi bi-list-check me-2"></i>
          My Permission Requests
        </h5>
      </div>
      <div className="card-body">
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : myRequests.length === 0 ? (
          <div className="text-center py-4">
            <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
            <h5 className="text-muted mt-2">No permission requests found</h5>
            <p className="text-muted">You haven't submitted any permission requests yet.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Date Range</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map(request => (
                  <tr key={request._id}>
                    <td>
                      <span className="badge bg-secondary">{request.permissionId}</span>
                    </td>
                    <td>
                      <div>
                        <strong>{formatDate(request.startDate)}</strong><br />
                        <small className="text-muted">{request.startTime} - {request.endTime}</small>
                      </div>
                    </td>
                    <td>{request.duration}</td>
                    <td>
                      <span title={request.reason}>
                        {request.reason.length > 30 ? `${request.reason.substring(0, 30)}...` : request.reason}
                      </span>
                    </td>
                    <td>{getStatusBadge(request.status)}</td>
                    <td>
                      <small>{formatDate(request.submittedAt)}</small>
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleViewPermission(request._id)}
                      >
                        <i className="bi bi-eye"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderPendingApprovals = () => (
    <div>
      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body d-flex align-items-center">
              <div className="flex-grow-1">
                <h3 className="mb-0">{statistics.total}</h3>
                <p className="mb-0">Total Requests</p>
              </div>
              <div className="ms-3">
                <i className="bi bi-clipboard-data" style={{ fontSize: '2rem' }}></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-white">
            <div className="card-body d-flex align-items-center">
              <div className="flex-grow-1">
                <h3 className="mb-0">{statistics.pending}</h3>
                <p className="mb-0">Pending</p>
              </div>
              <div className="ms-3">
                <i className="bi bi-clock" style={{ fontSize: '2rem' }}></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body d-flex align-items-center">
              <div className="flex-grow-1">
                <h3 className="mb-0">{statistics.approved}</h3>
                <p className="mb-0">Approved</p>
              </div>
              <div className="ms-3">
                <i className="bi bi-check-circle" style={{ fontSize: '2rem' }}></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-danger text-white">
            <div className="card-body d-flex align-items-center">
              <div className="flex-grow-1">
                <h3 className="mb-0">{statistics.rejected}</h3>
                <p className="mb-0">Rejected</p>
              </div>
              <div className="ms-3">
                <i className="bi bi-x-circle" style={{ fontSize: '2rem' }}></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-end">
            <div className="col-md-3">
              <label className="form-label">Approval Level</label>
              <select 
                className="form-select"
                value={filters.approvalLevel}
                onChange={(e) => handleFilterChange('approvalLevel', e.target.value)}
              >
                <option value="All Levels">All Levels</option>
                <option value="Team Leader">Team Leader</option>
                <option value="Team Manager">Team Manager</option>
                <option value="HR">HR</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Status</label>
              <select 
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="All Status">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Year</label>
              <select 
                className="form-select"
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
              >
                <option value="All Years">All Years</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
            </div>
            <div className="col-md-3">
              <button 
                className="btn btn-outline-secondary"
                onClick={resetFilters}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="bi bi-check-circle me-2"></i>
            Permission Requests ({filteredApprovals.length})
          </h5>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filteredApprovals.length === 0 ? (
            <div className="text-center py-4">
              <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
              <h5 className="text-muted mt-2">No requests found</h5>
              <p className="text-muted">Try adjusting your filters to see more results.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Employee</th>
                    <th>Date Range</th>
                    <th>Duration</th>
                    <th>Reason</th>
                    <th>Current Level</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApprovals.map(request => {
                    // Determine if this request can be acted upon by current user
                    const canApprove = (
                      (request.status === 'Pending' && request.currentApprovalLevel === 'Team Leader' && hasAnyRole(['Team Leader', 'Team Lead'])) ||
                      (request.status === 'Team Leader Approved' && request.currentApprovalLevel === 'Team Manager' && hasAnyRole(['Team Manager'])) ||
                      (request.status === 'Team Manager Approved' && request.currentApprovalLevel === 'HR' && hasAnyRole(['HR Manager', 'HR BP', 'HR Executive']))
                    );
                    
                    // Add subtle styling for requests that have been processed but are still visible for tracking
                    const isProcessedByCurrentUser = !canApprove && (request.status !== 'Pending');
                    
                    return (
                      <tr key={request._id} className={isProcessedByCurrentUser ? 'table-light' : ''}>
                        <td>
                          <span className="badge bg-secondary">{request.permissionId}</span>
                        </td>
                        <td>
                          <div>
                            <strong>{request.employee?.firstName} {request.employee?.lastName}</strong><br />
                            <small className="text-muted">{request.employee?.email}</small>
                          </div>
                        </td>
                        <td>
                          <div>
                            <strong>{formatDate(request.startDate)}</strong><br />
                            <small className="text-muted">{request.startTime} - {request.endTime}</small>
                          </div>
                        </td>
                        <td>{request.duration}</td>
                        <td>
                          <span title={request.reason}>
                            {request.reason.length > 30 ? `${request.reason.substring(0, 30)}...` : request.reason}
                          </span>
                        </td>
                        <td>
                          {/* Show current status and what action is needed */}
                          {request.status === 'Pending' && request.currentApprovalLevel === 'Team Leader' ? (
                            <span className="badge bg-warning">Pending Team Leader</span>
                          ) : request.status === 'Pending' && request.currentApprovalLevel === 'Team Manager' ? (
                            <span className="badge bg-info">Pending Team Manager</span>
                          ) : request.status === 'Team Leader Approved' && request.currentApprovalLevel === 'Team Manager' ? (
                            <span className="badge bg-info">Pending Team Manager</span>
                          ) : request.status === 'Team Manager Approved' && request.currentApprovalLevel === 'HR' ? (
                            <span className="badge bg-primary">Pending HR</span>
                          ) : request.status === 'HR Approved' ? (
                            <span className="badge bg-success">Fully Approved</span>
                          ) : request.status === 'Rejected' ? (
                            <span className="badge bg-danger">Rejected</span>
                          ) : (
                            <span className="badge bg-secondary">{request.status}</span>
                          )}
                        </td>
                        <td>
                          <small>{formatDate(request.submittedAt)}</small>
                        </td>
                        <td>
                          <div className="btn-group" role="group">
                            <button 
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleViewPermission(request._id)}
                              title="View Details"
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                            {/* Show approve/reject buttons only for requests that can be acted upon */}
                            {((request.status === 'Pending' && request.currentApprovalLevel === 'Team Leader' && hasAnyRole(['Team Leader', 'Team Lead'])) ||
                              (request.status === 'Pending' && request.currentApprovalLevel === 'Team Manager' && hasAnyRole(['Team Manager'])) ||
                              (request.status === 'Team Leader Approved' && request.currentApprovalLevel === 'Team Manager' && hasAnyRole(['Team Manager'])) ||
                              (request.status === 'Team Manager Approved' && request.currentApprovalLevel === 'HR' && hasAnyRole(['HR Manager', 'HR BP', 'HR Executive']))) && (
                              <>
                                <button 
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleApprovePermission(request._id)}
                                  title="Approve"
                                >
                                  <i className="bi bi-check"></i>
                                </button>
                                <button 
                                  className="btn btn-sm btn-danger"
                                  onClick={() => {
                                    setSelectedPermission(request);
                                    setShowRejectModal(true);
                                  }}
                                  title="Reject"
                                >
                                  <i className="bi bi-x"></i>
                                </button>
                              </>
                            )}
                            {/* Show status indicator for already processed requests */}
                            {(request.status === 'HR Approved' || request.status === 'Rejected') && (
                              <span className="btn btn-sm btn-outline-secondary disabled">
                                {request.status === 'HR Approved' ? (
                                  <><i className="bi bi-check-circle"></i> Completed</>
                                ) : (
                                  <><i className="bi bi-x-circle"></i> Rejected</>
                                )}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderViewModal = () => (
    showViewModal && selectedPermission && (
      <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-eye me-2"></i>
                Permission Request Details - {selectedPermission.permissionId}
              </h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setShowViewModal(false)}
              ></button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="card mb-3">
                    <div className="card-header">
                      <h6 className="mb-0">Employee Information</h6>
                    </div>
                    <div className="card-body">
                      <p><strong>Name:</strong> {selectedPermission.employee?.firstName} {selectedPermission.employee?.lastName}</p>
                      <p><strong>Email:</strong> {selectedPermission.employee?.email}</p>
                      <p><strong>Status:</strong> {getStatusBadge(selectedPermission.status)}</p>
                      <p><strong>Current Level:</strong> <span className="badge bg-info">{selectedPermission.currentApprovalLevel}</span></p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card mb-3">
                    <div className="card-header">
                      <h6 className="mb-0">Time Details</h6>
                    </div>
                    <div className="card-body">
                      <p><strong>Start:</strong> {formatDateTime(selectedPermission.startDate, selectedPermission.startTime)}</p>
                      <p><strong>End:</strong> {formatDateTime(selectedPermission.endDate, selectedPermission.endTime)}</p>
                      <p><strong>Duration:</strong> {selectedPermission.duration}</p>
                      <p><strong>Submitted:</strong> {formatDate(selectedPermission.submittedAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="card mb-3">
                <div className="card-header">
                  <h6 className="mb-0">Request Details</h6>
                </div>
                <div className="card-body">
                  <p><strong>Reason:</strong></p>
                  <p className="text-muted">{selectedPermission.reason}</p>
                  <p><strong>Work Description:</strong></p>
                  <p className="text-muted">{selectedPermission.workDescription}</p>
                  <div className="row">
                    <div className="col-md-6">
                      <p><strong>Assigned By:</strong> {selectedPermission.assignedBy?.firstName} {selectedPermission.assignedBy?.lastName}</p>
                    </div>
                    <div className="col-md-6">
                      <p><strong>Responsible Person:</strong> {selectedPermission.responsiblePerson?.firstName} {selectedPermission.responsiblePerson?.lastName}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="card">
                    <div className="card-header">
                      <h6 className="mb-0">Request Information</h6>
                    </div>
                    <div className="card-body">
                      <p><strong>Permission ID:</strong> {selectedPermission.permissionId}</p>
                      <p><strong>Current Status:</strong> {getStatusBadge(selectedPermission.status)}</p>
                      <p><strong>Current Level:</strong> <span className="badge bg-info">{selectedPermission.currentApprovalLevel}</span></p>
                      <p><strong>Submitted Date:</strong> {formatDate(selectedPermission.submittedAt)}</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card">
                    <div className="card-header">
                      <h6 className="mb-0">Approval Timeline</h6>
                    </div>
                    <div className="card-body">
                      <div className="approval-timeline">
                        {/* Permission Submitted */}
                        <div className="timeline-item d-flex align-items-start mb-3">
                          <div className="timeline-icon me-3">
                            <div className="rounded-circle bg-success d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px'}}>
                              <i className="bi bi-check text-white"></i>
                            </div>
                          </div>
                          <div className="timeline-content">
                            <h6 className="mb-1 text-success">Permission Submitted ✓</h6>
                            <p className="mb-1 text-muted small">Permission request submitted by employee</p>
                            <div className="d-flex align-items-center text-muted small">
                              <i className="bi bi-calendar me-1"></i>
                              {formatDate(selectedPermission.submittedAt)}
                            </div>
                            <div className="d-flex align-items-center text-muted small">
                              <i className="bi bi-person me-1"></i>
                              {selectedPermission.employee?.firstName} {selectedPermission.employee?.lastName}
                            </div>
                          </div>
                        </div>

                        {/* Team Leader Review - Only show if request needs Team Leader approval (Employee requests) */}
                        {!(selectedPermission.status === 'Pending' && selectedPermission.currentApprovalLevel === 'Team Manager' && 
                           !selectedPermission.approvalHistory?.some(h => h.level === 'Team Leader')) && 
                         !(selectedPermission.status === 'Pending' && selectedPermission.currentApprovalLevel === 'HR' && 
                           !selectedPermission.approvalHistory?.some(h => h.level === 'Team Leader') &&
                           !selectedPermission.approvalHistory?.some(h => h.level === 'Team Manager')) && (
                          <div className="timeline-item d-flex align-items-start mb-3">
                            <div className="timeline-icon me-3">
                              {selectedPermission.status === 'Pending' && selectedPermission.currentApprovalLevel === 'Team Leader' ? (
                                <div className="rounded-circle bg-warning d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px'}}>
                                  <i className="bi bi-clock text-white"></i>
                                </div>
                              ) : selectedPermission.approvalHistory?.some(h => h.level === 'Team Leader' && h.action === 'Approved') ? (
                                <div className="rounded-circle bg-success d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px'}}>
                                  <i className="bi bi-check text-white"></i>
                                </div>
                              ) : selectedPermission.approvalHistory?.some(h => h.level === 'Team Leader' && h.action === 'Rejected') ? (
                                <div className="rounded-circle bg-danger d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px'}}>
                                  <i className="bi bi-x text-white"></i>
                                </div>
                              ) : (
                                <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px'}}>
                                  <i className="bi bi-circle text-white"></i>
                                </div>
                              )}
                            </div>
                            <div className="timeline-content">
                              {selectedPermission.status === 'Pending' && selectedPermission.currentApprovalLevel === 'Team Leader' ? (
                                <>
                                  <h6 className="mb-1 text-warning">Team Leader Review 🔄</h6>
                                  <p className="mb-1 text-muted small">Pending team leader approval</p>
                                </>
                              ) : selectedPermission.approvalHistory?.some(h => h.level === 'Team Leader' && h.action === 'Approved') ? (
                                <>
                                  <h6 className="mb-1 text-success">Team Leader Review ✓</h6>
                                  <p className="mb-1 text-muted small">Approved by team leader</p>
                                  {(() => {
                                    const tlApproval = selectedPermission.approvalHistory.find(h => h.level === 'Team Leader' && h.action === 'Approved');
                                    return tlApproval ? (
                                      <>
                                        <div className="d-flex align-items-center text-muted small">
                                          <i className="bi bi-calendar me-1"></i>
                                          {formatDate(tlApproval.timestamp)}
                                        </div>
                                        <div className="d-flex align-items-center text-muted small">
                                          <i className="bi bi-person me-1"></i>
                                          {tlApproval.approver?.firstName} {tlApproval.approver?.lastName}
                                        </div>
                                      </>
                                    ) : null;
                                  })()}
                                </>
                              ) : selectedPermission.approvalHistory?.some(h => h.level === 'Team Leader' && h.action === 'Rejected') ? (
                                <>
                                  <h6 className="mb-1 text-danger">Team Leader Review ✗</h6>
                                  <p className="mb-1 text-muted small">Rejected by team leader</p>
                                  {(() => {
                                    const tlRejection = selectedPermission.approvalHistory.find(h => h.level === 'Team Leader' && h.action === 'Rejected');
                                    return tlRejection ? (
                                      <>
                                        <div className="d-flex align-items-center text-muted small">
                                          <i className="bi bi-calendar me-1"></i>
                                          {formatDate(tlRejection.timestamp)}
                                        </div>
                                        <div className="d-flex align-items-center text-muted small">
                                          <i className="bi bi-person me-1"></i>
                                          {tlRejection.approver?.firstName} {tlRejection.approver?.lastName}
                                        </div>
                                        {tlRejection.comments && (
                                          <div className="text-muted small mt-1">
                                            <strong>Reason:</strong> {tlRejection.comments}
                                          </div>
                                        )}
                                      </>
                                    ) : null;
                                  })()}
                                </>
                              ) : (
                                <>
                                  <h6 className="mb-1 text-muted">Team Leader Review</h6>
                                  <p className="mb-1 text-muted small">Awaiting team leader review</p>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Team Manager Review - Only show if request needs Team Manager approval (Employee and Team Leader requests) */}
                        {!(selectedPermission.status === 'Pending' && selectedPermission.currentApprovalLevel === 'HR' && 
                           !selectedPermission.approvalHistory?.some(h => h.level === 'Team Manager') &&
                           !selectedPermission.approvalHistory?.some(h => h.level === 'Team Leader')) && (
                          <div className="timeline-item d-flex align-items-start mb-3">
                          <div className="timeline-icon me-3">
                            {selectedPermission.status === 'Team Leader Approved' && selectedPermission.currentApprovalLevel === 'Team Manager' ? (
                              <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px'}}>
                                <i className="bi bi-clock text-white"></i>
                              </div>
                            ) : selectedPermission.approvalHistory?.some(h => h.level === 'Team Manager' && h.action === 'Approved') ? (
                              <div className="rounded-circle bg-success d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px'}}>
                                <i className="bi bi-check text-white"></i>
                              </div>
                            ) : selectedPermission.approvalHistory?.some(h => h.level === 'Team Manager' && h.action === 'Rejected') ? (
                              <div className="rounded-circle bg-danger d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px'}}>
                                <i className="bi bi-x text-white"></i>
                              </div>
                            ) : (
                              <div className="rounded-circle bg-light border d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px'}}>
                                <i className="bi bi-circle text-muted"></i>
                              </div>
                            )}
                          </div>
                          <div className="timeline-content">
                            {selectedPermission.status === 'Team Leader Approved' && selectedPermission.currentApprovalLevel === 'Team Manager' ? (
                              <>
                                <h6 className="mb-1 text-primary">Team Manager Review 🔄</h6>
                                <p className="mb-1 text-muted small">Pending team manager approval</p>
                              </>
                            ) : selectedPermission.approvalHistory?.some(h => h.level === 'Team Manager' && h.action === 'Approved') ? (
                              <>
                                <h6 className="mb-1 text-success">Team Manager Review ✓</h6>
                                <p className="mb-1 text-muted small">Approved by team manager</p>
                                {(() => {
                                  const tmApproval = selectedPermission.approvalHistory.find(h => h.level === 'Team Manager' && h.action === 'Approved');
                                  return tmApproval ? (
                                    <>
                                      <div className="d-flex align-items-center text-muted small">
                                        <i className="bi bi-calendar me-1"></i>
                                        {formatDate(tmApproval.timestamp)}
                                      </div>
                                      <div className="d-flex align-items-center text-muted small">
                                        <i className="bi bi-person me-1"></i>
                                        {tmApproval.approver?.firstName} {tmApproval.approver?.lastName}
                                      </div>
                                    </>
                                  ) : null;
                                })()}
                              </>
                            ) : selectedPermission.approvalHistory?.some(h => h.level === 'Team Manager' && h.action === 'Rejected') ? (
                              <>
                                <h6 className="mb-1 text-danger">Team Manager Review ✗</h6>
                                <p className="mb-1 text-muted small">Rejected by team manager</p>
                                {(() => {
                                  const tmRejection = selectedPermission.approvalHistory.find(h => h.level === 'Team Manager' && h.action === 'Rejected');
                                  return tmRejection ? (
                                    <>
                                      <div className="d-flex align-items-center text-muted small">
                                        <i className="bi bi-calendar me-1"></i>
                                        {formatDate(tmRejection.timestamp)}
                                      </div>
                                      <div className="d-flex align-items-center text-muted small">
                                        <i className="bi bi-person me-1"></i>
                                        {tmRejection.approver?.firstName} {tmRejection.approver?.lastName}
                                      </div>
                                      {tmRejection.comments && (
                                        <div className="text-muted small mt-1">
                                          <strong>Reason:</strong> {tmRejection.comments}
                                        </div>
                                      )}
                                    </>
                                  ) : null;
                                })()}
                              </>
                            ) : (
                              <>
                                <h6 className="mb-1 text-muted">Team Manager Review</h6>
                                <p className="mb-1 text-muted small">Awaiting team manager review</p>
                              </>
                            )}
                          </div>
                        </div>

                        )}

                        {/* HR Final Approval */}
                        <div className="timeline-item d-flex align-items-start">
                          <div className="timeline-icon me-3">
                            {selectedPermission.status === 'Team Manager Approved' && selectedPermission.currentApprovalLevel === 'HR' ? (
                              <div className="rounded-circle bg-info d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px'}}>
                                <i className="bi bi-clock text-white"></i>
                              </div>
                            ) : selectedPermission.status === 'HR Approved' ? (
                              <div className="rounded-circle bg-success d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px'}}>
                                <i className="bi bi-check text-white"></i>
                              </div>
                            ) : selectedPermission.approvalHistory?.some(h => h.level === 'HR' && h.action === 'Rejected') ? (
                              <div className="rounded-circle bg-danger d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px'}}>
                                <i className="bi bi-x text-white"></i>
                              </div>
                            ) : (
                              <div className="rounded-circle bg-light border d-flex align-items-center justify-content-center" style={{width: '32px', height: '32px'}}>
                                <i className="bi bi-circle text-muted"></i>
                              </div>
                            )}
                          </div>
                          <div className="timeline-content">
                            {selectedPermission.status === 'Team Manager Approved' && selectedPermission.currentApprovalLevel === 'HR' ? (
                              <>
                                <h6 className="mb-1 text-info">HR Final Approval 🔄</h6>
                                <p className="mb-1 text-muted small">Pending HR final approval</p>
                              </>
                            ) : selectedPermission.status === 'HR Approved' ? (
                              <>
                                <h6 className="mb-1 text-success">HR Final Approval ✓</h6>
                                <p className="mb-1 text-muted small">Approved by HR - Request completed</p>
                                {(() => {
                                  const hrApproval = selectedPermission.approvalHistory?.find(h => h.level === 'HR' && h.action === 'Approved');
                                  return hrApproval ? (
                                    <>
                                      <div className="d-flex align-items-center text-muted small">
                                        <i className="bi bi-calendar me-1"></i>
                                        {formatDate(hrApproval.timestamp)}
                                      </div>
                                      <div className="d-flex align-items-center text-muted small">
                                        <i className="bi bi-person me-1"></i>
                                        {hrApproval.approver?.firstName} {hrApproval.approver?.lastName}
                                      </div>
                                    </>
                                  ) : null;
                                })()}
                              </>
                            ) : selectedPermission.approvalHistory?.some(h => h.level === 'HR' && h.action === 'Rejected') ? (
                              <>
                                <h6 className="mb-1 text-danger">HR Final Approval ✗</h6>
                                <p className="mb-1 text-muted small">Rejected by HR</p>
                                {(() => {
                                  const hrRejection = selectedPermission.approvalHistory.find(h => h.level === 'HR' && h.action === 'Rejected');
                                  return hrRejection ? (
                                    <>
                                      <div className="d-flex align-items-center text-muted small">
                                        <i className="bi bi-calendar me-1"></i>
                                        {formatDate(hrRejection.timestamp)}
                                      </div>
                                      <div className="d-flex align-items-center text-muted small">
                                        <i className="bi bi-person me-1"></i>
                                        {hrRejection.approver?.firstName} {hrRejection.approver?.lastName}
                                      </div>
                                      {hrRejection.comments && (
                                        <div className="text-muted small mt-1">
                                          <strong>Reason:</strong> {hrRejection.comments}
                                        </div>
                                      )}
                                    </>
                                  ) : null;
                                })()}
                              </>
                            ) : (
                              <>
                                <h6 className="mb-1 text-muted">HR Final Approval</h6>
                                <p className="mb-1 text-muted small">Awaiting HR final approval</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  const renderRejectModal = () => (
    showRejectModal && (
      <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-x-circle me-2"></i>
                Reject Permission Request
              </h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
              ></button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to reject this permission request?</p>
              <div className="mb-3">
                <label className="form-label">Rejection Reason *</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger"
                onClick={handleRejectPermission}
                disabled={!rejectionReason.trim()}
              >
                <i className="bi bi-x-circle me-1"></i>
                Reject Request
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>
              <i className="bi bi-shield-check me-2"></i>
              Permission Management
            </h2>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="row mb-4">
        <div className="col-12">
          <ul className="nav nav-tabs">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'request' ? 'active' : ''}`}
                onClick={() => setActiveTab('request')}
              >
                <i className="bi bi-plus-circle me-2"></i>
                New Permission Request
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'my-requests' ? 'active' : ''}`}
                onClick={() => setActiveTab('my-requests')}
              >
                <i className="bi bi-list-check me-2"></i>
                My Requests
              </button>
            </li>
            {hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']) && (
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'approve' ? 'active' : ''}`}
                  onClick={() => setActiveTab('approve')}
                >
                  <i className="bi bi-check-circle me-2"></i>
                  Approve Requests
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Tab Content */}
      <div className="row">
        <div className="col-12">
          {activeTab === 'request' && renderPermissionRequestForm()}
          {activeTab === 'my-requests' && renderMyRequests()}
          {activeTab === 'approve' && hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']) && renderPendingApprovals()}
        </div>
      </div>

      {/* Modals */}
      {renderViewModal()}
      {renderRejectModal()}
    </div>
  );
};

export default Permissions;
