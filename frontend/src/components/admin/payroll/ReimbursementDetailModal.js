import React, { useState } from 'react';

const ReimbursementDetailModal = ({ reimbursement, isOpen, onClose, onApprove, onReject }) => {
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  if (!isOpen || !reimbursement) return null;

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
      default: return 'bg-secondary';
    }
  };

  const handleApprove = async () => {
    try {
      await onApprove(reimbursement._id, comments);
      setShowApprovalModal(false);
      setComments('');
      onClose();
    } catch (error) {
      console.error('Error approving reimbursement:', error);
    }
  };

  const handleReject = async () => {
    try {
      await onReject(reimbursement._id, rejectionReason);
      setShowRejectionModal(false);
      setRejectionReason('');
      onClose();
    } catch (error) {
      console.error('Error rejecting reimbursement:', error);
    }
  };

  const handleFileView = (fileIndex) => {
    const fileUrl = `/api/reimbursements/${reimbursement._id}/files/${fileIndex}`;
    window.open(fileUrl, '_blank');
  };

  const canApprove = reimbursement.status.includes('Review');

  return (
    <>
      {/* Main Detail Modal */}
      <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-receipt me-2"></i>
                Reimbursement Details
              </h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              {/* Header Info */}
              <div className="row mb-4">
                <div className="col-md-6">
                  <h6 className="text-muted">Employee</h6>
                  <p className="mb-0">
                    <strong>{reimbursement.employee?.firstName} {reimbursement.employee?.lastName}</strong>
                  </p>
                  <small className="text-muted">{reimbursement.employee?.employeeId}</small>
                </div>
                <div className="col-md-6">
                  <h6 className="text-muted">Status</h6>
                  <span className={`badge ${getStatusBadgeClass(reimbursement.status)}`}>
                    {reimbursement.status}
                  </span>
                </div>
              </div>

              {/* Expense Details */}
              <div className="card mb-4">
                <div className="card-header">
                  <h6 className="mb-0">Expense Information</h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <p><strong>Category:</strong> {reimbursement.category}</p>
                      {reimbursement.subcategory && (
                        <p><strong>Subcategory:</strong> {reimbursement.subcategory}</p>
                      )}
                      <p><strong>Amount:</strong> {formatCurrency(reimbursement.amount)}</p>
                      <p><strong>Expense Date:</strong> {formatDate(reimbursement.expenseDate)}</p>
                    </div>
                    <div className="col-md-6">
                      <p><strong>Priority:</strong> 
                        <span className={`badge ms-2 ${
                          reimbursement.priority === 'High' ? 'bg-warning' :
                          reimbursement.priority === 'Urgent' ? 'bg-danger' : 'bg-info'
                        }`}>
                          {reimbursement.priority}
                        </span>
                      </p>
                      <p><strong>Currency:</strong> {reimbursement.currency}</p>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-12">
                      <p><strong>Business Purpose:</strong></p>
                      <p className="text-muted">{reimbursement.businessPurpose}</p>
                      <p><strong>Description:</strong></p>
                      <p className="text-muted">{reimbursement.description}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {reimbursement.receipts && reimbursement.receipts.length > 0 && (
                <div className="card mb-4">
                  <div className="card-header">
                    <h6 className="mb-0">Attachments ({reimbursement.receipts.length})</h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      {reimbursement.receipts.map((receipt, index) => (
                        <div key={index} className="col-md-6 mb-3">
                          <div className="border rounded p-3">
                            <div className="d-flex align-items-center">
                              <i className="bi bi-file-earmark text-primary fs-4 me-3"></i>
                              <div className="flex-grow-1">
                                <p className="mb-1 fw-medium">{receipt.originalName}</p>
                                <small className="text-muted">
                                  {(receipt.fileSize / 1024).toFixed(1)} KB • {receipt.mimeType}
                                </small>
                              </div>
                              <button 
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => handleFileView(index)}
                                title="View File"
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Approval History */}
              {reimbursement.approvalChain && reimbursement.approvalChain.length > 0 && (
                <div className="card mb-4">
                  <div className="card-header">
                    <h6 className="mb-0">Approval History</h6>
                  </div>
                  <div className="card-body">
                    {reimbursement.approvalChain.map((approval, index) => (
                      <div key={index} className="d-flex align-items-start mb-3">
                        <div className={`badge me-3 ${
                          approval.action === 'Approved' ? 'bg-success' :
                          approval.action === 'Rejected' ? 'bg-danger' : 'bg-warning'
                        }`}>
                          {approval.level}
                        </div>
                        <div className="flex-grow-1">
                          <p className="mb-1">
                            <strong>{approval.approver?.firstName} {approval.approver?.lastName}</strong>
                            <span className={`badge ms-2 ${
                              approval.action === 'Approved' ? 'bg-success' :
                              approval.action === 'Rejected' ? 'bg-danger' : 'bg-secondary'
                            }`}>
                              {approval.action}
                            </span>
                          </p>
                          {approval.comments && (
                            <p className="text-muted small mb-1">"{approval.comments}"</p>
                          )}
                          {approval.actionDate && (
                            <small className="text-muted">
                              {formatDate(approval.actionDate)}
                            </small>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
              {canApprove && (
                <>
                  <button 
                    type="button" 
                    className="btn btn-success"
                    onClick={() => setShowApprovalModal(true)}
                  >
                    <i className="bi bi-check me-2"></i>
                    Approve
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger"
                    onClick={() => setShowRejectionModal(true)}
                  >
                    <i className="bi bi-x me-2"></i>
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Approve Reimbursement
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowApprovalModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to approve this reimbursement request?</p>
                <div className="mb-3">
                  <label className="form-label">Comments (Optional)</label>
                  <textarea 
                    className="form-control"
                    rows="3"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Add any comments or notes..."
                  />
                </div>
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
                >
                  <i className="bi bi-check me-2"></i>
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-x-circle text-danger me-2"></i>
                  Reject Reimbursement
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowRejectionModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Please provide a reason for rejecting this reimbursement request:</p>
                <div className="mb-3">
                  <label className="form-label">Rejection Reason <span className="text-danger">*</span></label>
                  <textarea 
                    className="form-control"
                    rows="3"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please explain why this request is being rejected..."
                    required
                  />
                </div>
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
                  disabled={!rejectionReason.trim()}
                >
                  <i className="bi bi-x me-2"></i>
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReimbursementDetailModal;
