import React, { useState, useEffect } from 'react';
import { regularizationAPI, regularizationTeamLeaderAPI, regularizationTeamManagerAPI, regularizationHRAPI, regularizationVPAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const RegularizationDashboard = () => {
  const { user } = useAuth();
  const [regularizations, setRegularizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modal states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [selectedRegularization, setSelectedRegularization] = useState(null);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Get role-specific configuration
  const getRoleConfig = () => {
    switch (user.role) {
      case 'Team Leader':
      case 'Team Lead':
        return {
          api: regularizationTeamLeaderAPI,
          title: 'Team Leader - Regularization Dashboard',
          subtitle: 'Review and approve attendance regularization requests',
          icon: 'bi-clipboard-check',
          approveText: 'Approve & Forward',
          canOverride: false
        };
      
      case 'Team Manager':
      case 'Manager':
        return {
          api: regularizationTeamManagerAPI,
          title: 'Team Manager - Regularization Dashboard',
          subtitle: 'Review and approve attendance regularization requests (Final Approval)',
          icon: 'bi-clipboard-check',
          approveText: 'Final Approve',
          canOverride: false
        };
      
      case 'HR Manager':
      case 'HR BP':
      case 'HR Executive':
        return {
          api: regularizationHRAPI,
          title: 'HR - Regularization Dashboard',
          subtitle: 'Review and approve Team Manager regularization requests',
          icon: 'bi-clipboard-check',
          approveText: 'HR Approve',
          canOverride: false,
          viewOnly: false
        };
      
      case 'VP':
      case 'Vice President':
      case 'Senior VP':
        return {
          api: regularizationVPAPI,
          title: 'VP - Regularization Dashboard',
          subtitle: 'Executive oversight of HR attendance regularization requests',
          icon: 'bi-clipboard-check',
          approveText: 'VP Approve',
          canOverride: true
        };
      
      case 'Admin':
      case 'System Administrator':
      case 'Super Admin':
        return {
          api: regularizationVPAPI,
          title: 'Admin - Regularization Dashboard',
          subtitle: 'System administration and oversight of all attendance regularization requests',
          icon: 'bi-shield-check',
          approveText: 'Admin Approve',
          canOverride: true
        };
      
      default:
        return null;
    }
  };

  const roleConfig = getRoleConfig();

  const fetchRegularizations = async () => {
    if (!roleConfig) return;

    try {
      setLoading(true);
      setError('');
      
      let response;
      if (roleConfig.api === regularizationTeamLeaderAPI) {
        // Team Leader should see all regularizations (pending, approved, rejected) for visibility
        response = await roleConfig.api.getAllRegularizations({ page: 1, limit: 100 });
      } else if (roleConfig.api === regularizationTeamManagerAPI) {
        // Team Manager should see all regularizations (pending, approved, rejected) for visibility
        response = await roleConfig.api.getAllRegularizations({ page: 1, limit: 100 });
      } else if (roleConfig.api === regularizationHRAPI) {
        response = await roleConfig.api.getAllRegularizations({ page: 1, limit: 100 });
      } else if (roleConfig.api === regularizationVPAPI) {
        // VP/Admin should see all regularizations (pending, approved, rejected) for visibility
        response = await roleConfig.api.getAllRegularizations({ page: 1, limit: 100 });
      }

      if (response.data.success) {
        const data = response.data.data;
        setRegularizations(data.docs || data || []);
      } else {
        setRegularizations([]);
      }
    } catch (error) {
      console.error('Error fetching regularizations:', error);
      setError('Failed to load regularizations: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roleConfig) {
      setError(`Access denied. Your role (${user.role}) does not have access to the regularization dashboard.`);
      return;
    }
    
    fetchRegularizations();
  }, [user.role]);

  // Handle approval
  const handleApprove = async () => {
    if (!selectedRegularization || !roleConfig) return;

    try {
      setActionLoading(true);
      await roleConfig.api.approveRegularization(selectedRegularization._id, { 
        comments: approvalComments 
      });

      let message = 'Request approved successfully!';
      if (user.role === 'Team Leader' || user.role === 'Team Lead') {
        message = 'Request approved successfully and forwarded to Team Manager!';
      } else if (user.role === 'Team Manager' || user.role === 'Manager') {
        message = 'Request approved successfully! Attendance has been updated.';
      } else {
        message = 'Request approved successfully! Attendance has been updated.';
      }

      alert(message);
      
      setShowApprovalModal(false);
      setSelectedRegularization(null);
      setApprovalComments('');
      fetchRegularizations();
    } catch (error) {
      console.error('Error approving regularization:', error);
      alert('Failed to approve regularization: ' + (error.response?.data?.message || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle rejection
  const handleReject = async () => {
    if (!selectedRegularization || !rejectionReason.trim() || !roleConfig) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setActionLoading(true);
      await roleConfig.api.rejectRegularization(selectedRegularization._id, { 
        reason: rejectionReason 
      });
      
      setShowRejectionModal(false);
      setSelectedRegularization(null);
      setRejectionReason('');
      fetchRegularizations();
      
      alert('Regularization rejected successfully.');
    } catch (error) {
      console.error('Error rejecting regularization:', error);
      alert('Failed to reject regularization: ' + (error.response?.data?.message || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeClass = (status, currentLevel) => {
    if (status === 'Approved') {
      if (currentLevel === 'Team Leader') return 'bg-primary';
      if (currentLevel === 'Team Manager') return 'bg-success';
      return 'bg-success';
    }
    switch (status) {
      case 'Pending': return 'bg-warning';
      case 'Under Review': return 'bg-primary';
      case 'Rejected': return 'bg-danger';
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
  const handleFileDownload = async (document) => {
    try {
      const downloadUrl = `http://localhost:5001${document.fileUrl}`;
      const fileName = document.originalName || document.fileName;
      
      // Fetch the file as a blob
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary link element and trigger download
      const link = window.document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
      
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  // Handle file preview
  const handleFilePreview = (document) => {
    setSelectedAttachment(document);
    setShowAttachmentModal(true);
  };

  // Calculate statistics
  const stats = regularizations.reduce((acc, reg) => {
    acc.total++;
    if (reg.status === 'Pending') acc.pending++;
    if (reg.status === 'Under Review') acc.underReview++;
    if (reg.status === 'Approved') acc.approved++;
    if (reg.status === 'Rejected') acc.rejected++;
    return acc;
  }, { total: 0, pending: 0, underReview: 0, approved: 0, rejected: 0 });

  if (!roleConfig) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">
          <i className="bi bi-exclamation-triangle me-2"></i>
          <strong>Access Denied:</strong> Your role ({user.role}) does not have access to the regularization dashboard.
          <br />
          <small>Please contact your administrator if you believe this is an error.</small>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
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
                <i className={`${roleConfig.icon} me-2`}></i>
                {roleConfig.title}
              </h2>
              <p className="text-muted mb-0">{roleConfig.subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-warning bg-opacity-10">
            <div className="card-body text-center">
              <i className="bi bi-clock-history display-4 text-warning mb-2"></i>
              <h3 className="mb-1">{stats.pending}</h3>
              <p className="text-muted mb-0">Pending</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-primary bg-opacity-10">
            <div className="card-body text-center">
              <i className="bi bi-eye display-4 text-primary mb-2"></i>
              <h3 className="mb-1">{stats.underReview}</h3>
              <p className="text-muted mb-0">Under Review</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-success bg-opacity-10">
            <div className="card-body text-center">
              <i className="bi bi-check-circle display-4 text-success mb-2"></i>
              <h3 className="mb-1">{stats.approved}</h3>
              <p className="text-muted mb-0">Approved</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-danger bg-opacity-10">
            <div className="card-body text-center">
              <i className="bi bi-x-circle display-4 text-danger mb-2"></i>
              <h3 className="mb-1">{stats.rejected}</h3>
              <p className="text-muted mb-0">Rejected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin System Overview */}
      {(user.role === 'Admin' || user.role === 'System Administrator' || user.role === 'Super Admin') && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm bg-info bg-opacity-5">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="bi bi-info-circle me-2"></i>
                  System Overview
                </h6>
                <div className="row">
                  <div className="col-md-4">
                    <small className="text-muted">Total Requests:</small>
                    <div className="fw-bold">{stats.total}</div>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted">Approval Rate:</small>
                    <div className="fw-bold">
                      {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
                    </div>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted">Pending Actions:</small>
                    <div className="fw-bold">{stats.pending + stats.underReview}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regularizations Table */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light border-0">
              <h5 className="mb-0">
                <i className="bi bi-list-ul me-2"></i>
                Regularization Requests
              </h5>
            </div>
            <div className="card-body p-0">
              {regularizations.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-inbox display-1 text-muted"></i>
                  <h5 className="mt-3 text-muted">No regularization requests found</h5>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0" style={{ fontSize: '0.9rem' }}>
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '15%' }}>Employee</th>
                        <th style={{ width: '10%' }}>Date</th>
                        <th style={{ width: '12%' }}>Type</th>
                        <th style={{ width: '10%' }}>Status</th>
                        <th style={{ width: '10%' }}>Level</th>
                        <th style={{ width: '8%' }}>Priority</th>
                        <th style={{ width: '15%' }}>Submitted</th>
                        <th style={{ width: '20%' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regularizations.map(regularization => (
                        <tr key={regularization._id}>
                          <td>
                            <div>
                              <strong style={{ fontSize: '0.85rem' }}>{regularization.employee?.firstName} {regularization.employee?.lastName}</strong>
                              <br />
                              <small className="text-muted">{regularization.employee?.employeeId}</small>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>{formatDate(regularization.attendanceDate)}</td>
                          <td>
                            <span className="badge bg-info bg-opacity-75" style={{ fontSize: '0.7rem' }}>
                              {regularization.requestType}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(regularization.status, regularization.currentLevel)}`} style={{ fontSize: '0.7rem' }}>
                              {regularization.status === 'Approved' && regularization.currentLevel === 'Team Leader' ? 'TL Approved' :
                               regularization.status === 'Approved' && regularization.currentLevel === 'Team Manager' ? 'TM Approved' :
                               regularization.status}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-secondary bg-opacity-75" style={{ fontSize: '0.7rem' }}>
                              {regularization.currentLevel || 'HR'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getPriorityBadgeClass(regularization.priority)}`} style={{ fontSize: '0.7rem' }}>
                              {regularization.priority}
                            </span>
                          </td>
                          <td>
                            <small style={{ fontSize: '0.75rem' }}>{formatDateTime(regularization.submittedDate)}</small>
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm" role="group">
                              <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => {
                                  setSelectedRegularization(regularization);
                                  setShowDetailsModal(true);
                                }}
                                title="View Details"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                              
                              {/* Show action buttons based on role and status */}
                              {((user.role === 'Team Leader' || user.role === 'Team Lead') && regularization.status === 'Pending' && regularization.currentLevel === 'Team Leader') ||
                               ((user.role === 'Team Manager' || user.role === 'Manager') && regularization.status === 'Pending' && regularization.currentLevel === 'Team Manager') ||
                               ((['HR Manager', 'HR BP', 'HR Executive'].includes(user.role)) && regularization.status === 'Pending' && regularization.currentLevel === 'HR') ||
                               ((['VP', 'Vice President', 'Senior VP'].includes(user.role)) && regularization.status === 'Pending' && (regularization.currentLevel === 'VP/Admin' || regularization.currentLevel === 'HR')) ||
                               (roleConfig.canOverride && !['VP', 'Vice President', 'Senior VP'].includes(user.role)) ? (
                                <>
                                  <button
                                    className="btn btn-success btn-sm"
                                    onClick={() => {
                                      setSelectedRegularization(regularization);
                                      setApprovalComments('');
                                      setShowApprovalModal(true);
                                    }}
                                    disabled={actionLoading}
                                    title="Approve"
                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                  >
                                    <i className="bi bi-check-lg"></i>
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => {
                                      setSelectedRegularization(regularization);
                                      setRejectionReason('');
                                      setShowRejectionModal(true);
                                    }}
                                    disabled={actionLoading}
                                    title="Reject"
                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                  >
                                    <i className="bi bi-x-lg"></i>
                                  </button>
                                </>
                              ) : null}
                            </div>
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

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  <i className="bi bi-check-circle me-2"></i>
                  Approve Regularization Request
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowApprovalModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {selectedRegularization && (
                  <div>
                    <div className="mb-3">
                      <h6>Request Details:</h6>
                      <p><strong>Employee:</strong> {selectedRegularization.employee?.firstName} {selectedRegularization.employee?.lastName}</p>
                      <p><strong>Date:</strong> {formatDate(selectedRegularization.attendanceDate)}</p>
                      <p><strong>Type:</strong> {selectedRegularization.requestType}</p>
                      <p><strong>Reason:</strong> {selectedRegularization.reason}</p>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Approval Comments (Optional)</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={approvalComments}
                        onChange={(e) => setApprovalComments(e.target.value)}
                        placeholder="Add any comments for this approval..."
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowApprovalModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-success" 
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Approving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-2"></i>
                      {roleConfig.approveText}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <i className="bi bi-x-circle me-2"></i>
                  Reject Regularization Request
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowRejectionModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {selectedRegularization && (
                  <div>
                    <div className="mb-3">
                      <h6>Request Details:</h6>
                      <p><strong>Employee:</strong> {selectedRegularization.employee?.firstName} {selectedRegularization.employee?.lastName}</p>
                      <p><strong>Date:</strong> {formatDate(selectedRegularization.attendanceDate)}</p>
                      <p><strong>Type:</strong> {selectedRegularization.requestType}</p>
                      <p><strong>Reason:</strong> {selectedRegularization.reason}</p>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Rejection Reason <span className="text-danger">*</span></label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please provide a clear reason for rejecting this request..."
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowRejectionModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleReject}
                  disabled={actionLoading || !rejectionReason.trim()}
                >
                  {actionLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-x-lg me-2"></i>
                      Reject Request
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRegularization && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-file-text me-2"></i>
                  Regularization Request Details
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowDetailsModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  {/* Left Column - Basic Details & Approval History */}
                  <div className="col-md-6">
                    <div className="card border-0 shadow-sm mb-3">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">
                          <i className="bi bi-person me-2"></i>
                          Employee Information
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-sm-6">
                            <strong>Name:</strong>
                            <p className="mb-2">{selectedRegularization.employee?.firstName} {selectedRegularization.employee?.lastName}</p>
                          </div>
                          <div className="col-sm-6">
                            <strong>Employee ID:</strong>
                            <p className="mb-2">{selectedRegularization.employee?.employeeId}</p>
                          </div>
                          <div className="col-sm-6">
                            <strong>Department:</strong>
                            <p className="mb-2">{selectedRegularization.employee?.department || 'N/A'}</p>
                          </div>
                          <div className="col-sm-6">
                            <strong>Role:</strong>
                            <p className="mb-2">{selectedRegularization.employee?.role}</p>
                          </div>
                        </div>
                      </div>
                    </div>

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
                            <p className="mb-2">{selectedRegularization.regularizationId}</p>
                          </div>
                          <div className="col-sm-6">
                            <strong>Date:</strong>
                            <p className="mb-2">{formatDate(selectedRegularization.attendanceDate)}</p>
                          </div>
                          <div className="col-sm-6">
                            <strong>Type:</strong>
                            <p className="mb-2">
                              <span className="badge bg-info">{selectedRegularization.requestType}</span>
                            </p>
                          </div>
                          <div className="col-sm-6">
                            <strong>Priority:</strong>
                            <p className="mb-2">
                              <span className={`badge ${getPriorityBadgeClass(selectedRegularization.priority)}`}>
                                {selectedRegularization.priority}
                              </span>
                            </p>
                          </div>
                          <div className="col-12">
                            <strong>Reason:</strong>
                            <p className="mb-2">{selectedRegularization.reason}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Time Details */}
                    {(selectedRegularization.requestedCheckIn || selectedRegularization.requestedCheckOut) && (
                      <div className="card border-0 shadow-sm mb-3">
                        <div className="card-header bg-light">
                          <h6 className="mb-0">
                            <i className="bi bi-clock me-2"></i>
                            Requested Times
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row">
                            {selectedRegularization.requestedCheckIn && (
                              <div className="col-sm-6">
                                <strong>Check-In:</strong>
                                <p className="mb-2">{formatDateTime(selectedRegularization.requestedCheckIn)}</p>
                              </div>
                            )}
                            {selectedRegularization.requestedCheckOut && (
                              <div className="col-sm-6">
                                <strong>Check-Out:</strong>
                                <p className="mb-2">{formatDateTime(selectedRegularization.requestedCheckOut)}</p>
                              </div>
                            )}
                            {selectedRegularization.requestedStatus && (
                              <div className="col-12">
                                <strong>Requested Status:</strong>
                                <p className="mb-2">
                                  <span className="badge bg-secondary">{selectedRegularization.requestedStatus}</span>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Approval History */}
                    <div className="card border-0 shadow-sm mb-3">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">
                          <i className="bi bi-clock-history me-2"></i>
                          Approval History
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="timeline">
                          {/* Team Leader Approval */}
                          {selectedRegularization.teamLeaderApproval?.status !== 'Pending' && (
                            <div className="timeline-item mb-3">
                              <div className="d-flex align-items-center">
                                <div className={`badge ${selectedRegularization.teamLeaderApproval?.status === 'Approved' ? 'bg-success' : 'bg-danger'} me-2`}>
                                  <i className={`bi ${selectedRegularization.teamLeaderApproval?.status === 'Approved' ? 'bi-check' : 'bi-x'}`}></i>
                                </div>
                                <div>
                                  <strong>Team Leader</strong>
                                  <div className="text-muted small">
                                    {selectedRegularization.teamLeaderApproval?.approver?.firstName} {selectedRegularization.teamLeaderApproval?.approver?.lastName}
                                  </div>
                                  {selectedRegularization.teamLeaderApproval?.actionDate && (
                                    <div className="text-muted small">
                                      {formatDateTime(selectedRegularization.teamLeaderApproval.actionDate)}
                                    </div>
                                  )}
                                  {selectedRegularization.teamLeaderApproval?.comments && (
                                    <div className="text-muted small mt-1">
                                      <em>"{selectedRegularization.teamLeaderApproval.comments}"</em>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Team Manager Approval */}
                          {selectedRegularization.teamManagerApproval?.status !== 'Pending' && (
                            <div className="timeline-item mb-3">
                              <div className="d-flex align-items-center">
                                <div className={`badge ${selectedRegularization.teamManagerApproval?.status === 'Approved' ? 'bg-success' : 'bg-danger'} me-2`}>
                                  <i className={`bi ${selectedRegularization.teamManagerApproval?.status === 'Approved' ? 'bi-check' : 'bi-x'}`}></i>
                                </div>
                                <div>
                                  <strong>Team Manager</strong>
                                  <div className="text-muted small">
                                    {selectedRegularization.teamManagerApproval?.approver?.firstName} {selectedRegularization.teamManagerApproval?.approver?.lastName}
                                  </div>
                                  {selectedRegularization.teamManagerApproval?.actionDate && (
                                    <div className="text-muted small">
                                      {formatDateTime(selectedRegularization.teamManagerApproval.actionDate)}
                                    </div>
                                  )}
                                  {selectedRegularization.teamManagerApproval?.comments && (
                                    <div className="text-muted small mt-1">
                                      <em>"{selectedRegularization.teamManagerApproval.comments}"</em>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* HR Approval */}
                          {selectedRegularization.hrApproval?.status !== 'Pending' && (
                            <div className="timeline-item mb-3">
                              <div className="d-flex align-items-center">
                                <div className={`badge ${selectedRegularization.hrApproval?.status === 'Approved' ? 'bg-success' : 'bg-danger'} me-2`}>
                                  <i className={`bi ${selectedRegularization.hrApproval?.status === 'Approved' ? 'bi-check' : 'bi-x'}`}></i>
                                </div>
                                <div>
                                  <strong>HR / VP</strong>
                                  <div className="text-muted small">
                                    {selectedRegularization.hrApproval?.approver?.firstName} {selectedRegularization.hrApproval?.approver?.lastName}
                                  </div>
                                  {selectedRegularization.hrApproval?.actionDate && (
                                    <div className="text-muted small">
                                      {formatDateTime(selectedRegularization.hrApproval.actionDate)}
                                    </div>
                                  )}
                                  {selectedRegularization.hrApproval?.comments && (
                                    <div className="text-muted small mt-1">
                                      <em>"{selectedRegularization.hrApproval.comments}"</em>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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
                              <span className={`badge ${getStatusBadgeClass(selectedRegularization.status, selectedRegularization.currentLevel)}`}>
                                {selectedRegularization.status}
                              </span>
                            </p>
                          </div>
                          <div className="col-sm-6">
                            <strong>Current Level:</strong>
                            <p className="mb-2">
                              <span className="badge bg-secondary">{selectedRegularization.currentLevel}</span>
                            </p>
                          </div>
                          <div className="col-sm-6">
                            <strong>Submitted:</strong>
                            <p className="mb-2">{formatDateTime(selectedRegularization.submittedDate)}</p>
                          </div>
                          {selectedRegularization.approvedDate && (
                            <div className="col-sm-6">
                              <strong>Approved:</strong>
                              <p className="mb-2">{formatDateTime(selectedRegularization.approvedDate)}</p>
                            </div>
                          )}
                          {selectedRegularization.rejectedDate && (
                            <div className="col-sm-6">
                              <strong>Rejected:</strong>
                              <p className="mb-2">{formatDateTime(selectedRegularization.rejectedDate)}</p>
                            </div>
                          )}
                          {selectedRegularization.rejectionReason && (
                            <div className="col-12">
                              <strong>Rejection Reason:</strong>
                              <p className="mb-2 text-danger">{selectedRegularization.rejectionReason}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Attachments Section */}
                    <div className="card border-0 shadow-sm mb-3">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">
                          <i className="bi bi-paperclip me-2"></i>
                          Attachments {selectedRegularization.supportingDocuments && selectedRegularization.supportingDocuments.length > 0 && `(${selectedRegularization.supportingDocuments.length})`}
                        </h6>
                      </div>
                      <div className="card-body">
                        {selectedRegularization.supportingDocuments && selectedRegularization.supportingDocuments.length > 0 ? (
                          selectedRegularization.supportingDocuments.map((document, index) => (
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
                                  <button
                                    className="btn btn-outline-primary"
                                    onClick={() => handleFilePreview(document)}
                                    title="View"
                                  >
                                    <i className="bi bi-eye"></i> View
                                  </button>
                                  <button
                                    className="btn btn-outline-success"
                                    onClick={() => handleFileDownload(document)}
                                    title="Download"
                                  >
                                    <i className="bi bi-download"></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4">
                            <i className="bi bi-file-earmark-x display-4 text-muted mb-3"></i>
                            <p className="text-muted mb-0">No attachments</p>
                          </div>
                        )}
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

      {/* Attachment Preview Modal */}
      {showAttachmentModal && selectedAttachment && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-file-earmark me-2"></i>
                  Attachment Preview
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => {
                    setShowAttachmentModal(false);
                    setSelectedAttachment(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <i className={`${getFileIcon(selectedAttachment.mimeType)} text-primary me-2`} style={{ fontSize: '2rem' }}></i>
                      <div>
                        <h6 className="mb-1">{selectedAttachment.originalName}</h6>
                        <small className="text-muted">
                          {formatFileSize(selectedAttachment.fileSize)} • {selectedAttachment.mimeType}
                        </small>
                        <br />
                        <small className="text-muted">
                          Uploaded: {formatDateTime(selectedAttachment.uploadedAt)}
                        </small>
                      </div>
                    </div>
                    <button
                      className="btn btn-success"
                      onClick={() => handleFileDownload(selectedAttachment)}
                      title="Download"
                    >
                      <i className="bi bi-download me-2"></i>
                      Download
                    </button>
                  </div>
                </div>

                <div className="border rounded p-3" style={{ minHeight: '400px' }}>
                  {/* Image Preview */}
                  {selectedAttachment.mimeType?.startsWith('image/') && (
                    <div className="text-center">
                      <img
                        src={`http://localhost:5001${selectedAttachment.fileUrl}`}
                        alt={selectedAttachment.originalName}
                        className="img-fluid rounded"
                        style={{ maxHeight: '500px', maxWidth: '100%' }}
                      />
                    </div>
                  )}

                  {/* PDF Preview */}
                  {selectedAttachment.mimeType?.includes('pdf') && (
                    <div className="text-center">
                      <iframe
                        src={`http://localhost:5001${selectedAttachment.fileUrl}`}
                        width="100%"
                        height="500px"
                        style={{ border: 'none' }}
                        title={selectedAttachment.originalName}
                      />
                    </div>
                  )}

                  {/* Other file types */}
                  {!selectedAttachment.mimeType?.startsWith('image/') && !selectedAttachment.mimeType?.includes('pdf') && (
                    <div className="text-center py-5">
                      <i className={`${getFileIcon(selectedAttachment.mimeType)} display-1 text-muted mb-3`}></i>
                      <h5 className="text-muted">Preview not available</h5>
                      <p className="text-muted">
                        This file type cannot be previewed in the browser.
                        <br />
                        Please download the file to view its contents.
                      </p>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleFileDownload(selectedAttachment)}
                      >
                        <i className="bi bi-download me-2"></i>
                        Download File
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-success"
                  onClick={() => handleFileDownload(selectedAttachment)}
                >
                  <i className="bi bi-download me-2"></i>
                  Download
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowAttachmentModal(false);
                    setSelectedAttachment(null);
                  }}
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

export default RegularizationDashboard;
