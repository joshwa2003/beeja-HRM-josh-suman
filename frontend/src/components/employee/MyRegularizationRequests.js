import React, { useState, useEffect } from 'react';
import { regularizationAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const MyRegularizationRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    requestType: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 10
  });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Use the regularization API to get employee's own requests
      const queryParams = {
        employee: user.id,
        ...filters
      };
      
      const response = await regularizationAPI.getAllRegularizations(queryParams);
      
      if (response.data.success) {
        const data = response.data.data;
        let requestsData = data.docs || data || [];
        
        // Filter to only show current user's requests
        requestsData = requestsData.filter(req => req.employee._id === user.id || req.employee === user.id);
        
        setRequests(requestsData);
      } else {
        setRequests([]);
        setError(response.data.message || 'Failed to load requests');
      }
    } catch (error) {
      console.error('Error fetching my requests:', error);
      setError('Failed to load your requests: ' + (error.response?.data?.message || error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1
    }));
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending': return 'bg-warning';
      case 'Under Review': return 'bg-info';
      case 'Approved': return 'bg-success';
      case 'Rejected': return 'bg-danger';
      case 'Cancelled': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'Urgent': return 'bg-danger';
      case 'High': return 'bg-warning';
      case 'Normal': return 'bg-info';
      case 'Low': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  };

  const getCurrentLevelBadge = (request) => {
    if (request.status === 'Approved') return 'Completed';
    if (request.status === 'Rejected') return 'Rejected';
    return request.currentLevel || 'Team Leader';
  };

  const getApprovalChainStatus = (request) => {
    const chain = [];
    
    // Add Team Manager approval info
    if (request.teamManagerApproval) {
      chain.push({
        role: 'Team Manager',
        status: request.teamManagerApproval.status,
        comments: request.teamManagerApproval.comments,
        actionDate: request.teamManagerApproval.actionDate,
        approver: request.teamManagerApproval.approver
      });
    }
    
    // Add HR approval info (only for Team Manager requests)
    if (request.hrApproval && request.hrApproval.status !== 'Pending') {
      chain.push({
        role: 'HR',
        status: request.hrApproval.status,
        comments: request.hrApproval.comments,
        actionDate: request.hrApproval.actionDate,
        approver: request.hrApproval.approver
      });
    }
    
    return chain;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString();
  };

  // Helper function to get file icon based on mime type
  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return 'bi-file-earmark-image';
    if (mimeType?.includes('pdf')) return 'bi-file-earmark-pdf';
    if (mimeType?.includes('word')) return 'bi-file-earmark-word';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'bi-file-earmark-excel';
    return 'bi-file-earmark';
  };

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function to check if file is previewable
  const isPreviewable = (mimeType) => {
    return mimeType?.startsWith('image/') || mimeType?.includes('pdf');
  };

  // Handle file download
  const handleFileDownload = (document) => {
    const downloadUrl = `http://localhost:5001${document.fileUrl}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = document.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle file preview
  const handleFilePreview = (document) => {
    const previewUrl = `http://localhost:5001${document.fileUrl}`;
    window.open(previewUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">
                <i className="bi bi-list-check me-2"></i>
                My Regularization Requests
              </h2>
              <p className="text-muted mb-0">Track the status of your attendance regularization requests</p>
            </div>
            <a href="/employee/regularization/request" className="btn btn-primary">
              <i className="bi bi-plus-lg me-2"></i>
              New Request
            </a>
          </div>
        </div>
      </div>

      {error && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-danger alert-dismissible">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setError('')}
              ></button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Request Type</label>
                  <select
                    className="form-select"
                    name="requestType"
                    value={filters.requestType}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Types</option>
                    <option value="Missed Check-In">Missed Check-In</option>
                    <option value="Missed Check-Out">Missed Check-Out</option>
                    <option value="Late Arrival">Late Arrival</option>
                    <option value="System Error">System Error</option>
                    <option value="Work From Home">Work From Home</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-control"
                    name="startDate"
                    value={filters.startDate}
                    onChange={handleFilterChange}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-control"
                    name="endDate"
                    value={filters.endDate}
                    onChange={handleFilterChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light border-0">
              <h5 className="mb-0">
                <i className="bi bi-list-ul me-2"></i>
                Your Regularization Requests
              </h5>
            </div>
            <div className="card-body p-0">
              {requests.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-inbox display-1 text-muted"></i>
                  <h5 className="mt-3 text-muted">No regularization requests found</h5>
                  <p className="text-muted">You haven't submitted any regularization requests yet.</p>
                  <a href="/employee/regularization/request" className="btn btn-primary">
                    <i className="bi bi-plus-lg me-2"></i>
                    Submit Your First Request
                  </a>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Request ID</th>
                        <th>Date</th>
                        <th>Request Type</th>
                        <th>Status</th>
                        <th>Current Level</th>
                        <th>Priority</th>
                        <th>Submitted</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map(request => (
                        <tr key={request._id}>
                          <td>
                            <strong className="text-primary">{request.regularizationId}</strong>
                          </td>
                          <td>{formatDate(request.attendanceDate)}</td>
                          <td>
                            <span className="badge bg-info bg-opacity-75">
                              {request.requestType}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(request.status)}`}>
                              {request.status}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-secondary bg-opacity-75">
                              {getCurrentLevelBadge(request)}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getPriorityBadgeClass(request.priority)}`}>
                              {request.priority}
                            </span>
                          </td>
                          <td>
                            <small>{formatDateTime(request.submittedDate)}</small>
                          </td>
                          <td>
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowDetailsModal(true);
                              }}
                              title="View Details"
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
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-file-text me-2"></i>
                  My Regularization Request Details
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowDetailsModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  {/* Left Column - Basic Details */}
                  <div className="col-md-6">
                    <div className="card border-0 shadow-sm mb-3">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">
                          <i className="bi bi-calendar me-2"></i>
                          Request Information
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-sm-6">
                            <strong>Request ID:</strong>
                            <p className="mb-2">{selectedRequest.regularizationId}</p>
                          </div>
                          <div className="col-sm-6">
                            <strong>Date:</strong>
                            <p className="mb-2">{formatDate(selectedRequest.attendanceDate)}</p>
                          </div>
                          <div className="col-sm-6">
                            <strong>Type:</strong>
                            <p className="mb-2">
                              <span className="badge bg-info">{selectedRequest.requestType}</span>
                            </p>
                          </div>
                          <div className="col-sm-6">
                            <strong>Priority:</strong>
                            <p className="mb-2">
                              <span className={`badge ${getPriorityBadgeClass(selectedRequest.priority)}`}>
                                {selectedRequest.priority}
                              </span>
                            </p>
                          </div>
                          <div className="col-12">
                            <strong>Reason:</strong>
                            <p className="mb-2">{selectedRequest.reason}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Time Details */}
                    {(selectedRequest.requestedCheckIn || selectedRequest.requestedCheckOut) && (
                      <div className="card border-0 shadow-sm mb-3">
                        <div className="card-header bg-light">
                          <h6 className="mb-0">
                            <i className="bi bi-clock me-2"></i>
                            Requested Times
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row">
                            {selectedRequest.requestedCheckIn && (
                              <div className="col-sm-6">
                                <strong>Check-In:</strong>
                                <p className="mb-2">{formatDateTime(selectedRequest.requestedCheckIn)}</p>
                              </div>
                            )}
                            {selectedRequest.requestedCheckOut && (
                              <div className="col-sm-6">
                                <strong>Check-Out:</strong>
                                <p className="mb-2">{formatDateTime(selectedRequest.requestedCheckOut)}</p>
                              </div>
                            )}
                            {selectedRequest.requestedStatus && (
                              <div className="col-12">
                                <strong>Requested Status:</strong>
                                <p className="mb-2">
                                  <span className="badge bg-secondary">{selectedRequest.requestedStatus}</span>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Status & Attachments */}
                  <div className="col-md-6">
                    <div className="card border-0 shadow-sm mb-3">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">
                          <i className="bi bi-info-circle me-2"></i>
                          Status Information
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-sm-6">
                            <strong>Current Status:</strong>
                            <p className="mb-2">
                              <span className={`badge ${getStatusBadgeClass(selectedRequest.status)}`}>
                                {selectedRequest.status}
                              </span>
                            </p>
                          </div>
                          <div className="col-sm-6">
                            <strong>Current Level:</strong>
                            <p className="mb-2">
                              <span className="badge bg-secondary">{getCurrentLevelBadge(selectedRequest)}</span>
                            </p>
                          </div>
                          <div className="col-sm-6">
                            <strong>Submitted:</strong>
                            <p className="mb-2">{formatDateTime(selectedRequest.submittedDate)}</p>
                          </div>
                          {selectedRequest.approvedDate && (
                            <div className="col-sm-6">
                              <strong>Approved:</strong>
                              <p className="mb-2">{formatDateTime(selectedRequest.approvedDate)}</p>
                            </div>
                          )}
                          {selectedRequest.rejectedDate && (
                            <div className="col-sm-6">
                              <strong>Rejected:</strong>
                              <p className="mb-2">{formatDateTime(selectedRequest.rejectedDate)}</p>
                            </div>
                          )}
                          {selectedRequest.rejectionReason && (
                            <div className="col-12">
                              <strong>Rejection Reason:</strong>
                              <p className="mb-2 text-danger">{selectedRequest.rejectionReason}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Supporting Documents */}
                    {selectedRequest.supportingDocuments && selectedRequest.supportingDocuments.length > 0 && (
                      <div className="card border-0 shadow-sm mb-3">
                        <div className="card-header bg-light">
                          <h6 className="mb-0">
                            <i className="bi bi-paperclip me-2"></i>
                            Supporting Documents ({selectedRequest.supportingDocuments.length})
                          </h6>
                        </div>
                        <div className="card-body">
                          {selectedRequest.supportingDocuments.map((document, index) => (
                            <div key={index} className="border rounded p-3 mb-3">
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center">
                                  <i className={`${getFileIcon(document.mimeType)} text-primary me-2`} style={{ fontSize: '1.5rem' }}></i>
                                  <div>
                                    <div className="fw-bold">{document.originalName}</div>
                                    <small className="text-muted">
                                      {formatFileSize(document.fileSize)} • Uploaded {formatDateTime(document.uploadedAt)}
                                    </small>
                                  </div>
                                </div>
                                <div className="btn-group btn-group-sm">
                                  {isPreviewable(document.mimeType) && (
                                    <button
                                      className="btn btn-outline-primary"
                                      onClick={() => handleFilePreview(document)}
                                      title="Preview"
                                    >
                                      <i className="bi bi-eye"></i>
                                    </button>
                                  )}
                                  <button
                                    className="btn btn-outline-success"
                                    onClick={() => handleFileDownload(document)}
                                    title="Download"
                                  >
                                    <i className="bi bi-download"></i>
                                  </button>
                                </div>
                              </div>
                              
                              {/* Image Preview */}
                              {document.mimeType?.startsWith('image/') && (
                                <div className="mt-3">
                                  <img
                                    src={`http://localhost:5001${document.fileUrl}`}
                                    alt={document.originalName}
                                    className="img-fluid rounded"
                                    style={{ maxHeight: '200px', cursor: 'pointer' }}
                                    onClick={() => handleFilePreview(document)}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Approval History */}
                    <div className="card border-0 shadow-sm">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">
                          <i className="bi bi-clock-history me-2"></i>
                          Approval History
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="timeline">
                          {getApprovalChainStatus(selectedRequest).map((approval, index) => (
                            <div key={index} className="timeline-item mb-3">
                              <div className="d-flex align-items-center">
                                <div className={`badge ${
                                  approval.status === 'Approved' ? 'bg-success' :
                                  approval.status === 'Rejected' ? 'bg-danger' :
                                  'bg-secondary'
                                } me-2`}>
                                  {approval.status === 'Approved' ? (
                                    <i className="bi bi-check-lg"></i>
                                  ) : approval.status === 'Rejected' ? (
                                    <i className="bi bi-x-lg"></i>
                                  ) : (
                                    <i className="bi bi-clock"></i>
                                  )}
                                </div>
                                <div>
                                  <strong>{approval.role}</strong>
                                  {approval.approver && (
                                    <div className="text-muted small">
                                      {approval.approver.firstName} {approval.approver.lastName}
                                    </div>
                                  )}
                                  {approval.actionDate && (
                                    <div className="text-muted small">
                                      {formatDateTime(approval.actionDate)}
                                    </div>
                                  )}
                                  {approval.comments && (
                                    <div className="text-muted small mt-1">
                                      <em>"{approval.comments}"</em>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Show current pending level */}
                          {selectedRequest.status === 'Pending' && (
                            <div className="timeline-item mb-3">
                              <div className="d-flex align-items-center">
                                <div className="badge bg-warning me-2">
                                  <i className="bi bi-clock"></i>
                                </div>
                                <div>
                                  <strong>{selectedRequest.currentLevel}</strong>
                                  <br />
                                  <small className="text-muted">Pending approval</small>
                                </div>
                              </div>
                            </div>
                          )}
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
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRegularizationRequests;
