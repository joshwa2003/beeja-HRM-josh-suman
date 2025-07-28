import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { regularizationAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const RegularizationDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [regularizations, setRegularizations] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [statistics, setStatistics] = useState({});
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
  const [selectedRegularizations, setSelectedRegularizations] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedRegularization, setSelectedRegularization] = useState(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const [regularizationsRes, pendingRes] = await Promise.all([
        regularizationAPI.getAllRegularizations(filters),
        regularizationAPI.getPendingRegularizations()
      ]);

      // Handle regularizations response
      if (regularizationsRes.data.success) {
        const regularizationsData = regularizationsRes.data.data;
        setRegularizations(regularizationsData.docs || regularizationsData || []);
      } else {
        setRegularizations([]);
      }

      // Handle pending approvals response
      if (pendingRes.data.success) {
        setPendingApprovals(pendingRes.data.data || []);
      } else {
        setPendingApprovals([]);
      }

      // Calculate statistics from regularizations data
      const allRegularizations = regularizationsRes.data.success ? 
        (regularizationsRes.data.data.docs || regularizationsRes.data.data || []) : [];
      
      const stats = allRegularizations.reduce((acc, reg) => {
        const existing = acc.find(s => s._id === reg.status);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ _id: reg.status, count: 1 });
        }
        return acc;
      }, []);

      setStatistics({ statistics: stats });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  // Open approval modal
  const openApprovalModal = (regularization) => {
    setSelectedRegularization(regularization);
    setApprovalComments('');
    setShowApprovalModal(true);
  };

  // Open rejection modal
  const openRejectionModal = (regularization) => {
    setSelectedRegularization(regularization);
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  // Handle approval with comments
  const handleApprove = async () => {
    if (!selectedRegularization) return;

    try {
      setActionLoading(true);
      await regularizationAPI.approveRegularization(selectedRegularization._id, { comments: approvalComments });
      setShowApprovalModal(false);
      setSelectedRegularization(null);
      setApprovalComments('');
      fetchDashboardData();
      alert('Regularization approved successfully');
    } catch (error) {
      console.error('Error approving regularization:', error);
      alert('Failed to approve regularization: ' + (error.response?.data?.message || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle rejection with reason
  const handleReject = async () => {
    if (!selectedRegularization || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setActionLoading(true);
      await regularizationAPI.rejectRegularization(selectedRegularization._id, { reason: rejectionReason });
      setShowRejectionModal(false);
      setSelectedRegularization(null);
      setRejectionReason('');
      fetchDashboardData();
      alert('Regularization rejected successfully');
    } catch (error) {
      console.error('Error rejecting regularization:', error);
      alert('Failed to reject regularization: ' + (error.response?.data?.message || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedRegularizations.length === 0) {
      alert('Please select regularizations to process');
      return;
    }

    let comments = '';
    if (action === 'reject') {
      comments = prompt('Please provide a reason for rejection:');
      if (!comments) return;
    } else if (action === 'approve') {
      comments = prompt('Optional comments for approval:') || '';
    }

    try {
      setActionLoading(true);
      
      // Process each regularization individually since we don't have a bulk endpoint
      const results = { processed: [], errors: [] };
      
      for (const id of selectedRegularizations) {
        try {
          if (action === 'approve') {
            await regularizationAPI.approveRegularization(id, { comments });
          } else if (action === 'reject') {
            await regularizationAPI.rejectRegularization(id, { reason: comments });
          }
          results.processed.push(id);
        } catch (error) {
          results.errors.push({ id, error: error.message });
        }
      }

      alert(`Bulk ${action} completed. Processed: ${results.processed.length}, Errors: ${results.errors.length}`);
      setSelectedRegularizations([]);
      setShowBulkActions(false);
      fetchDashboardData();
    } catch (error) {
      console.error(`Error in bulk ${action}:`, error);
      alert(`Failed to ${action} regularizations: ` + (error.response?.data?.message || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectRegularization = (id) => {
    setSelectedRegularizations(prev => {
      const newSelection = prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id];
      setShowBulkActions(newSelection.length > 0);
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    const pendingIds = regularizations
      .filter(reg => reg.status === 'Pending')
      .map(reg => reg._id);
    
    if (selectedRegularizations.length === pendingIds.length) {
      setSelectedRegularizations([]);
      setShowBulkActions(false);
    } else {
      setSelectedRegularizations(pendingIds);
      setShowBulkActions(pendingIds.length > 0);
    }
  };

  // Check if user can approve/reject based on role and current approval level
  const canUserApprove = (regularization) => {
    if (!regularization.currentApprover) return false;
    return regularization.currentApprover._id === user.id || 
           ['Admin', 'Vice President'].includes(user.role);
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

  const getCurrentLevelBadge = (regularization) => {
    if (regularization.status === 'Approved') return 'Completed';
    if (regularization.status === 'Rejected') return 'Rejected';
    return regularization.currentLevel || 'Team Leader';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString();
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
                <i className="bi bi-clipboard-check me-2"></i>
                Regularization Dashboard
              </h2>
              <p className="text-muted mb-0">Manage attendance regularization requests</p>
            </div>
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

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-primary bg-opacity-10">
            <div className="card-body text-center">
              <i className="bi bi-clock-history display-4 text-primary mb-2"></i>
              <h3 className="mb-1">{statistics.statistics?.find(s => s._id === 'Pending')?.count || 0}</h3>
              <p className="text-muted mb-0">Pending Requests</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-success bg-opacity-10">
            <div className="card-body text-center">
              <i className="bi bi-check-circle display-4 text-success mb-2"></i>
              <h3 className="mb-1">{statistics.statistics?.find(s => s._id === 'Approved')?.count || 0}</h3>
              <p className="text-muted mb-0">Approved</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-danger bg-opacity-10">
            <div className="card-body text-center">
              <i className="bi bi-x-circle display-4 text-danger mb-2"></i>
              <h3 className="mb-1">{statistics.statistics?.find(s => s._id === 'Rejected')?.count || 0}</h3>
              <p className="text-muted mb-0">Rejected</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm bg-warning bg-opacity-10">
            <div className="card-body text-center">
              <i className="bi bi-person-check display-4 text-warning mb-2"></i>
              <h3 className="mb-1">{pendingApprovals.length}</h3>
              <p className="text-muted mb-0">My Pending Approvals</p>
            </div>
          </div>
        </div>
      </div>

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

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="row mb-3">
          <div className="col-12">
            <div className="alert alert-info d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-info-circle me-2"></i>
                {selectedRegularizations.length} regularization(s) selected
              </span>
              <div>
                <button
                  className="btn btn-success btn-sm me-2"
                  onClick={() => handleBulkAction('approve')}
                  disabled={actionLoading}
                >
                  <i className="bi bi-check-lg me-1"></i>
                  Bulk Approve
                </button>
                <button
                  className="btn btn-danger btn-sm me-2"
                  onClick={() => handleBulkAction('reject')}
                  disabled={actionLoading}
                >
                  <i className="bi bi-x-lg me-1"></i>
                  Bulk Reject
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setSelectedRegularizations([]);
                    setShowBulkActions(false);
                  }}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regularizations Table */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light border-0 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-list-ul me-2"></i>
                Regularization Requests
              </h5>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="selectAll"
                  checked={selectedRegularizations.length > 0 && 
                    selectedRegularizations.length === regularizations.filter(r => r.status === 'Pending').length}
                  onChange={handleSelectAll}
                />
                <label className="form-check-label" htmlFor="selectAll">
                  Select All Pending
                </label>
              </div>
            </div>
            <div className="card-body p-0">
              {regularizations.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-inbox display-1 text-muted"></i>
                  <h5 className="mt-3 text-muted">No regularization requests found</h5>
                  <p className="text-muted">Try adjusting your filters or check back later.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th width="50">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            onChange={handleSelectAll}
                            checked={selectedRegularizations.length > 0}
                          />
                        </th>
                        <th>Employee</th>
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
                      {regularizations.map(regularization => (
                        <tr key={regularization._id}>
                          <td>
                            {regularization.status === 'Pending' && (
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedRegularizations.includes(regularization._id)}
                                onChange={() => handleSelectRegularization(regularization._id)}
                              />
                            )}
                          </td>
                          <td>
                            <div>
                              <strong>{regularization.employee?.firstName} {regularization.employee?.lastName}</strong>
                              <br />
                              <small className="text-muted">{regularization.employee?.employeeId}</small>
                            </div>
                          </td>
                          <td>{formatDate(regularization.attendanceDate)}</td>
                          <td>
                            <span className="badge bg-info bg-opacity-75">
                              {regularization.requestType}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(regularization.status)}`}>
                              {regularization.status}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-secondary bg-opacity-75">
                              {getCurrentLevelBadge(regularization)}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getPriorityBadgeClass(regularization.priority)}`}>
                              {regularization.priority}
                            </span>
                          </td>
                          <td>
                            <small>{formatDateTime(regularization.submittedDate)}</small>
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => navigate(`/admin/regularization/${regularization._id}`)}
                                title="View Details"
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                              {(regularization.status === 'Pending' || regularization.status === 'Under Review') && 
                               canUserApprove(regularization) && (
                                <>
                                  <button
                                    className="btn btn-outline-success"
                                    onClick={() => openApprovalModal(regularization)}
                                    disabled={actionLoading}
                                    title="Approve"
                                  >
                                    <i className="bi bi-check-lg"></i>
                                  </button>
                                  <button
                                    className="btn btn-outline-danger"
                                    onClick={() => openRejectionModal(regularization)}
                                    disabled={actionLoading}
                                    title="Reject"
                                  >
                                    <i className="bi bi-x-lg"></i>
                                  </button>
                                </>
                              )}
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
                      Approve Request
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
    </div>
  );
};

export default RegularizationDashboard;
