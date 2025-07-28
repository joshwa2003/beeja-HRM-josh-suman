import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { permissionAPI, userAPI } from '../../utils/api';
import MyAttendance from '../MyAttendance';

const LeaveAttendanceEmployee = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance');
  const [loading, setLoading] = useState(false);
  const [teamLeads, setTeamLeads] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [selectedPermission, setSelectedPermission] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

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
      
      const leads = users.filter(u => 
        ['Team Manager', 'Team Leader', 'Team Lead', 'HR Manager', 'Project Manager'].includes(u.role)
      );
      const members = users.filter(u => 
        !['Team Manager', 'Team Leader', 'Team Lead', 'HR Manager', 'Project Manager'].includes(u.role)
      );
      
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

      // Refresh my requests if on that tab
      if (activeTab === 'my-requests') {
        fetchMyRequests();
      }

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
          New Permission Request
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
                          {lead.name} - {lead.role}
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
                          {member.name} - {member.role}
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
