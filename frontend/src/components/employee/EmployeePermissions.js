import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { permissionAPI, userAPI } from '../../utils/api';

const EmployeePermissions = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('request');
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
      console.log('🔄 Starting to fetch team leads and employees...');
      setLoading(true);
      
      // Fetch team leads/managers for "Who Assigned the Work?" dropdown
      console.log('📞 Calling team leads API...');
      const teamLeadsResponse = await userAPI.getTeamLeads();
      console.log('✅ Team leads API response:', teamLeadsResponse);
      console.log('📊 Team leads response status:', teamLeadsResponse.status);
      console.log('📋 Team leads response data:', teamLeadsResponse.data);
      
      // Handle different response structures with more robust checking
      let teamLeadsData = [];
      if (teamLeadsResponse?.data?.success && teamLeadsResponse.data.data) {
        teamLeadsData = teamLeadsResponse.data.data;
        console.log('✅ Using teamLeadsResponse.data.data structure');
      } else if (teamLeadsResponse?.data && Array.isArray(teamLeadsResponse.data)) {
        teamLeadsData = teamLeadsResponse.data;
        console.log('✅ Using direct array structure');
      } else if (teamLeadsResponse?.data?.data && Array.isArray(teamLeadsResponse.data.data)) {
        teamLeadsData = teamLeadsResponse.data.data;
        console.log('✅ Using nested data structure');
      } else {
        console.warn('⚠️ Unexpected team leads response structure:', teamLeadsResponse.data);
      }
      
      console.log('📊 Processed team leads array:', teamLeadsData);
      console.log('🔢 Team leads count:', teamLeadsData.length);
      
      // Fetch all employees for "Who is Responsible During Absence?" dropdown
      console.log('📞 Calling employees API...');
      const employeesResponse = await userAPI.getEmployees({ excludeUserId: user?._id });
      console.log('✅ Employees API response:', employeesResponse);
      console.log('📊 Employees response status:', employeesResponse.status);
      console.log('📋 Employees response data:', employeesResponse.data);
      
      // Handle different response structures with more robust checking
      let employeesData = [];
      if (employeesResponse?.data?.success && employeesResponse.data.data) {
        employeesData = employeesResponse.data.data;
        console.log('✅ Using employeesResponse.data.data structure');
      } else if (employeesResponse?.data && Array.isArray(employeesResponse.data)) {
        employeesData = employeesResponse.data;
        console.log('✅ Using direct array structure');
      } else if (employeesResponse?.data?.data && Array.isArray(employeesResponse.data.data)) {
        employeesData = employeesResponse.data.data;
        console.log('✅ Using nested data structure');
      } else {
        console.warn('⚠️ Unexpected employees response structure:', employeesResponse.data);
      }
      
      console.log('📊 Processed employees array:', employeesData);
      console.log('🔢 Employees count:', employeesData.length);
      
      // Set the state with validation
      if (Array.isArray(teamLeadsData)) {
        setTeamLeads(teamLeadsData);
        console.log('✅ Team leads state updated with', teamLeadsData.length, 'items');
      } else {
        console.error('❌ Team leads data is not an array:', teamLeadsData);
        setTeamLeads([]);
      }
      
      if (Array.isArray(employeesData)) {
        setTeamMembers(employeesData);
        console.log('✅ Employees state updated with', employeesData.length, 'items');
      } else {
        console.error('❌ Employees data is not an array:', employeesData);
        setTeamMembers([]);
      }
      
      console.log('🎉 User fetching completed successfully!');
      
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      console.error('📋 Error details:', error.response?.data);
      console.error('📊 Error status:', error.response?.status);
      console.error('🔗 Error config:', error.config);
      
      // Set empty arrays on error
      setTeamLeads([]);
      setTeamMembers([]);
      
      // Show user-friendly error message
      alert('Failed to load dropdown options. Please refresh the page and try again.');
    } finally {
      setLoading(false);
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

      console.log('Submitting permission request:', permissionRequest);

      // Prepare the data for submission
      const requestData = {
        startDate: permissionRequest.startDate,
        startTime: permissionRequest.startTime,
        endDate: permissionRequest.endDate,
        endTime: permissionRequest.endTime,
        duration: permissionRequest.duration,
        reason: permissionRequest.reason,
        assignedBy: permissionRequest.assignedBy,
        responsiblePerson: permissionRequest.responsiblePerson,
        workDescription: permissionRequest.workDescription
      };

      console.log('Request data being sent:', requestData);

      const response = await permissionAPI.createPermissionRequest(requestData);
      console.log('Permission API response:', response);
      
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
      console.error('Error details:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 'Failed to submit permission request. Please try again.';
      alert(errorMessage);
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
                      onChange={(e) => {
                        console.log('🔄 Team lead selected:', e.target.value);
                        handleInputChange('assignedBy', e.target.value);
                      }}
                      required
                    >
                      <option value="">Select Team Lead/Manager</option>
                      {Array.isArray(teamLeads) && teamLeads.length > 0 ? (
                        teamLeads.map((lead, index) => {
                          console.log(`🔍 Rendering team lead ${index + 1}:`, lead);
                          return (
                            <option key={lead._id || index} value={lead._id}>
                              {lead.firstName} {lead.lastName} - {lead.role}
                            </option>
                          );
                        })
                      ) : (
                        <option disabled>
                          {loading ? 'Loading team leads...' : 'No team leads available'}
                        </option>
                      )}
                    </select>
                    <small className="text-muted">
                      {loading ? (
                        <span>🔄 Loading team leads...</span>
                      ) : teamLeads.length === 0 ? (
                        <span>⚠️ No team leads available</span>
                      ) : (
                        <span>✅ {teamLeads.length} team leads loaded</span>
                      )}
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Who is Responsible During Absence? *</label>
                    <select
                      className="form-select"
                      value={permissionRequest.responsiblePerson}
                      onChange={(e) => {
                        console.log('🔄 Responsible person selected:', e.target.value);
                        handleInputChange('responsiblePerson', e.target.value);
                      }}
                      required
                    >
                      <option value="">Select Responsible Person</option>
                      {Array.isArray(teamMembers) && teamMembers.length > 0 ? (
                        teamMembers.map((member, index) => {
                          console.log(`🔍 Rendering employee ${index + 1}:`, member);
                          return (
                            <option key={member._id || index} value={member._id}>
                              {member.firstName} {member.lastName} - {member.role}
                            </option>
                          );
                        })
                      ) : (
                        <option disabled>
                          {loading ? 'Loading employees...' : 'No employees available'}
                        </option>
                      )}
                    </select>
                    <small className="text-muted">
                      {loading ? (
                        <span>🔄 Loading employees...</span>
                      ) : teamMembers.length === 0 ? (
                        <span>⚠️ No employees available</span>
                      ) : (
                        <span>✅ {teamMembers.length} employees loaded</span>
                      )}
                    </small>
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
                      <h6 className="mb-0">Request Information</h6>
                    </div>
                    <div className="card-body">
                      <p><strong>Status:</strong> {getStatusBadge(selectedPermission.status)}</p>
                      <p><strong>Current Level:</strong> <span className="badge bg-info">{selectedPermission.currentApprovalLevel}</span></p>
                      <p><strong>Submitted:</strong> {formatDate(selectedPermission.submittedAt)}</p>
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

              {selectedPermission.approvalHistory && selectedPermission.approvalHistory.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">Approval History</h6>
                  </div>
                  <div className="card-body">
                    <div className="timeline">
                      {selectedPermission.approvalHistory.map((history, index) => (
                        <div key={index} className="timeline-item mb-3">
                          <div className={`badge ${history.action === 'Approved' ? 'bg-success' : 'bg-danger'} me-2`}>
                            {history.action}
                          </div>
                          <strong>{history.level}</strong> by {history.approver?.name}
                          <br />
                          <small className="text-muted">{formatDate(history.timestamp)}</small>
                          {history.comments && (
                            <div className="mt-1">
                              <small><strong>Comments:</strong> {history.comments}</small>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
          </ul>
        </div>
      </div>

      {/* Tab Content */}
      <div className="row">
        <div className="col-12">
          {activeTab === 'request' && renderPermissionRequestForm()}
          {activeTab === 'my-requests' && renderMyRequests()}
        </div>
      </div>

      {/* Modals */}
      {renderViewModal()}
    </div>
  );
};

export default EmployeePermissions;
