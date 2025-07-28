import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReimbursementDetailModal from './ReimbursementDetailModal';

const ReimbursementDashboard = () => {
  const navigate = useNavigate();
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0
  });
  const [config, setConfig] = useState({
    categories: [],
    priorities: []
  });
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [selectedReimbursement, setSelectedReimbursement] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchReimbursements();
    fetchConfig();
    fetchPendingApprovals();
  }, [filters]);

  const fetchReimbursements = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams(filters);
      
      const response = await fetch(`/api/reimbursements?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReimbursements(data.data.docs || []);
        setPagination({
          total: data.data.totalDocs || 0,
          totalPages: data.data.totalPages || 0
        });
      } else {
        throw new Error('Failed to fetch reimbursements');
      }
    } catch (error) {
      console.error('Error fetching reimbursements:', error);
      setError('Failed to load reimbursements');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/reimbursements/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.data);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const response = await fetch('/api/reimbursements/pending-approvals', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingApprovals(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    }
  };

  const handleApprove = async (reimbursementId, comments = '') => {
    try {
      const response = await fetch(`/api/reimbursements/${reimbursementId}/approve-with-comments`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ comments })
      });

      if (response.ok) {
        fetchReimbursements();
        fetchPendingApprovals();
        setShowDetailModal(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve reimbursement');
      }
    } catch (error) {
      console.error('Error approving reimbursement:', error);
      setError(error.message);
    }
  };

  const handleReject = async (reimbursementId, reason) => {
    try {
      const response = await fetch(`/api/reimbursements/${reimbursementId}/reject-with-comments`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        fetchReimbursements();
        fetchPendingApprovals();
        setShowDetailModal(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reject reimbursement');
      }
    } catch (error) {
      console.error('Error rejecting reimbursement:', error);
      setError(error.message);
    }
  };

  const handleMarkAsPaid = async (reimbursementId) => {
    const transactionId = prompt('Enter transaction ID (optional):');
    
    try {
      const response = await fetch(`/api/reimbursements/${reimbursementId}/mark-paid`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          method: 'Bank Transfer',
          transactionId 
        })
      });

      if (response.ok) {
        fetchReimbursements();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark as paid');
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      setError(error.message);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Draft': return 'bg-secondary';
      case 'Submitted': return 'bg-info';
      case 'Team Lead Review': return 'bg-warning';
      case 'Team Manager Review': return 'bg-warning';
      case 'HR Review': return 'bg-warning';
      case 'Approved': return 'bg-success';
      case 'Rejected': return 'bg-danger';
      case 'Paid': return 'bg-success';
      case 'Cancelled': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'Low': return 'bg-light text-dark';
      case 'Normal': return 'bg-info';
      case 'High': return 'bg-warning';
      case 'Urgent': return 'bg-danger';
      default: return 'bg-info';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const handleViewDetails = async (reimbursementId) => {
    try {
      const response = await fetch(`/api/reimbursements/${reimbursementId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedReimbursement(data.data);
        setShowDetailModal(true);
      } else {
        throw new Error('Failed to fetch reimbursement details');
      }
    } catch (error) {
      console.error('Error fetching reimbursement details:', error);
      setError(error.message);
    }
  };

  if (loading && reimbursements.length === 0) {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
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
                <i className="bi bi-receipt me-2"></i>
                Reimbursement Management
              </h2>
              <p className="text-muted mb-0">Manage employee reimbursement requests and approvals</p>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/admin/payroll/reimbursements/new')}
            >
              <i className="bi bi-plus me-2"></i>
              New Request
            </button>
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

      <div className="row">
        {/* Pending Approvals */}
        {pendingApprovals.length > 0 && (
          <div className="col-12 mb-4">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-warning bg-opacity-10 border-0">
                <h5 className="mb-0 text-warning">
                  <i className="bi bi-clock me-2"></i>
                  Pending Your Approval ({pendingApprovals.length})
                </h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  {pendingApprovals.slice(0, 3).map((reimbursement) => (
                    <div key={reimbursement._id} className="col-md-4">
                      <div className="card border">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h6 className="mb-0">
                              {reimbursement.employee?.firstName} {reimbursement.employee?.lastName}
                            </h6>
                            <span className={`badge ${getPriorityBadgeClass(reimbursement.priority)}`}>
                              {reimbursement.priority}
                            </span>
                          </div>
                          <p className="text-muted small mb-2">
                            {reimbursement.category} • {formatCurrency(reimbursement.amount)}
                          </p>
                          <p className="small mb-3">{reimbursement.description}</p>
                          <div className="btn-group btn-group-sm w-100">
                            <button 
                              className="btn btn-outline-primary"
                              onClick={() => handleViewDetails(reimbursement._id)}
                              title="View Details"
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                            <button 
                              className="btn btn-success"
                              onClick={() => handleViewDetails(reimbursement._id)}
                              title="Approve"
                            >
                              <i className="bi bi-check"></i>
                            </button>
                            <button 
                              className="btn btn-danger"
                              onClick={() => handleViewDetails(reimbursement._id)}
                              title="Reject"
                            >
                              <i className="bi bi-x"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {pendingApprovals.length > 3 && (
                  <div className="text-center mt-3">
                    <button 
                      className="btn btn-outline-warning"
                      onClick={() => setFilters(prev => ({ ...prev, status: 'Under Review' }))}
                    >
                      View All Pending ({pendingApprovals.length})
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="col-12 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-2">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-select"
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                  >
                    <option value="">All Status</option>
                    <option value="Draft">Draft</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Team Lead Review">Team Lead Review</option>
                    <option value="Team Manager Review">Team Manager Review</option>
                    <option value="HR Review">HR Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Category</label>
                  <select 
                    className="form-select"
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value, page: 1 }))}
                  >
                    <option value="">All Categories</option>
                    {config.categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Start Date</label>
                  <input 
                    type="date"
                    className="form-control"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">End Date</label>
                  <input 
                    type="date"
                    className="form-control"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">&nbsp;</label>
                  <button 
                    className="btn btn-outline-secondary w-100"
                    onClick={() => setFilters({ status: '', category: '', startDate: '', endDate: '', page: 1, limit: 10 })}
                  >
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reimbursements List */}
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              {reimbursements.length > 0 ? (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Employee</th>
                          <th>Category</th>
                          <th>Amount</th>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Priority</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reimbursements.map((reimbursement) => (
                          <tr key={reimbursement._id}>
                            <td>
                              <div>
                                <h6 className="mb-0">
                                  {reimbursement.employee?.firstName} {reimbursement.employee?.lastName}
                                </h6>
                                <small className="text-muted">{reimbursement.employee?.employeeId}</small>
                              </div>
                            </td>
                            <td>
                              <div>
                                <span className="fw-medium">{reimbursement.category}</span>
                                {reimbursement.subcategory && (
                                  <div><small className="text-muted">{reimbursement.subcategory}</small></div>
                                )}
                              </div>
                            </td>
                            <td>
                              <strong>{formatCurrency(reimbursement.amount)}</strong>
                            </td>
                            <td>
                              <small>{formatDate(reimbursement.expenseDate)}</small>
                            </td>
                            <td>
                              <span className={`badge ${getStatusBadgeClass(reimbursement.status)}`}>
                                {reimbursement.status}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${getPriorityBadgeClass(reimbursement.priority)}`}>
                                {reimbursement.priority}
                              </span>
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <button 
                                  className="btn btn-outline-primary"
                                  onClick={() => handleViewDetails(reimbursement._id)}
                                  title="View Details"
                                >
                                  <i className="bi bi-eye"></i>
                                </button>
                                
                                {(reimbursement.status === 'Team Lead Review' || 
                                  reimbursement.status === 'Team Manager Review' || 
                                  reimbursement.status === 'HR Review') && (
                                  <>
                                    <button 
                                      className="btn btn-outline-success"
                                      onClick={() => handleViewDetails(reimbursement._id)}
                                      title="Approve"
                                    >
                                      <i className="bi bi-check"></i>
                                    </button>
                                    <button 
                                      className="btn btn-outline-danger"
                                      onClick={() => handleViewDetails(reimbursement._id)}
                                      title="Reject"
                                    >
                                      <i className="bi bi-x"></i>
                                    </button>
                                  </>
                                )}
                                
                                {reimbursement.status === 'Approved' && (
                                  <button 
                                    className="btn btn-outline-info"
                                    onClick={() => handleMarkAsPaid(reimbursement._id)}
                                    title="Mark as Paid"
                                  >
                                    <i className="bi bi-credit-card"></i>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div>
                        <small className="text-muted">
                          Showing {((filters.page - 1) * filters.limit) + 1} to{' '}
                          {Math.min(filters.page * filters.limit, pagination.total)} of{' '}
                          {pagination.total} entries
                        </small>
                      </div>
                      <nav>
                        <ul className="pagination pagination-sm mb-0">
                          <li className={`page-item ${filters.page === 1 ? 'disabled' : ''}`}>
                            <button 
                              className="page-link"
                              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                              disabled={filters.page === 1}
                            >
                              Previous
                            </button>
                          </li>
                          {[...Array(pagination.totalPages)].map((_, index) => (
                            <li 
                              key={index + 1} 
                              className={`page-item ${filters.page === index + 1 ? 'active' : ''}`}
                            >
                              <button 
                                className="page-link"
                                onClick={() => setFilters(prev => ({ ...prev, page: index + 1 }))}
                              >
                                {index + 1}
                              </button>
                            </li>
                          ))}
                          <li className={`page-item ${filters.page === pagination.totalPages ? 'disabled' : ''}`}>
                            <button 
                              className="page-link"
                              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                              disabled={filters.page === pagination.totalPages}
                            >
                              Next
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-5">
                  <i className="bi bi-receipt text-muted fs-1"></i>
                  <h5 className="mt-3 text-muted">No Reimbursements Found</h5>
                  <p className="text-muted">No reimbursement requests match your current filters.</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/admin/payroll/reimbursements/new')}
                  >
                    <i className="bi bi-plus me-2"></i>
                    Create New Request
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <ReimbursementDetailModal
        reimbursement={selectedReimbursement}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedReimbursement(null);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
};

export default ReimbursementDashboard;
