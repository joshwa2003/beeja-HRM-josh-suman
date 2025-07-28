import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../utils/api';

const EmployeeReimbursements = () => {
  const { user } = useAuth();
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [reimbursementConfig, setReimbursementConfig] = useState(null);
  const [formData, setFormData] = useState({
    category: '',
    subcategory: '',
    amount: '',
    currency: 'INR',
    description: '',
    expenseDate: '',
    businessPurpose: '',
    priority: 'Normal',
    receipts: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    fetchReimbursements();
    fetchReimbursementConfig();
  }, []);

  const fetchReimbursements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reimbursements/employee');
      // Handle different response structures
      const data = response.data?.data || response.data || [];
      setReimbursements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching reimbursements:', error);
      setReimbursements([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchReimbursementConfig = async () => {
    try {
      const response = await api.get('/reimbursements/config');
      setReimbursementConfig(response.data);
    } catch (error) {
      console.error('Error fetching reimbursement config:', error);
      // Set default config if API fails
      setReimbursementConfig({
        data: {
          categories: [
            { value: 'Travel', label: 'Travel', monthlyLimit: 15000 },
            { value: 'Food', label: 'Food & Meals', monthlyLimit: 5000 },
            { value: 'Internet', label: 'Internet', monthlyLimit: 2000 },
            { value: 'Medical', label: 'Medical', monthlyLimit: 10000 },
            { value: 'Other', label: 'Other', monthlyLimit: 5000 }
          ],
          currencies: ['INR', 'USD'],
          priorities: ['Low', 'Normal', 'High', 'Urgent']
        }
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const resetForm = () => {
    setFormData({
      category: '',
      subcategory: '',
      amount: '',
      currency: 'INR',
      description: '',
      expenseDate: '',
      businessPurpose: '',
      priority: 'Normal',
      receipts: []
    });
    setSelectedFiles([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('category', formData.category);
      submitData.append('subcategory', formData.subcategory);
      submitData.append('amount', parseFloat(formData.amount));
      submitData.append('currency', formData.currency);
      submitData.append('description', formData.description);
      submitData.append('expenseDate', formData.expenseDate);
      submitData.append('businessPurpose', formData.businessPurpose);
      submitData.append('priority', formData.priority);

      // Add files if selected
      selectedFiles.forEach((file, index) => {
        submitData.append('receipts', file);
      });

      // Create reimbursement with automatic submission
      const response = await api.post('/reimbursements', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // The backend will automatically set up approval chain and send notifications
      setShowModal(false);
      resetForm();
      fetchReimbursements();
      
      alert('Reimbursement request submitted successfully and sent to Admin and Vice President for approval!');
    } catch (error) {
      console.error('Error submitting reimbursement:', error);
      const errorMessage = error.response?.data?.message || 'Error submitting reimbursement request. Please try again.';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Draft': { class: 'bg-secondary', text: 'Draft' },
      'Submitted': { class: 'bg-info', text: 'Submitted' },
      'Under Review': { class: 'bg-warning', text: 'Under Review' },
      'Manager Approved': { class: 'bg-primary', text: 'Manager Approved' },
      'HR Review': { class: 'bg-warning', text: 'HR Review' },
      'Finance Review': { class: 'bg-warning', text: 'Finance Review' },
      'Approved': { class: 'bg-success', text: 'Approved' },
      'Rejected': { class: 'bg-danger', text: 'Rejected' },
      'Paid': { class: 'bg-success', text: 'Paid' },
      'Cancelled': { class: 'bg-secondary', text: 'Cancelled' }
    };
    
    const config = statusConfig[status] || { class: 'bg-secondary', text: status };
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  const getCategoryLimit = (category) => {
    if (!reimbursementConfig) return null;
    const categoryConfig = reimbursementConfig.data.categories.find(cat => cat.value === category);
    return categoryConfig ? categoryConfig.monthlyLimit : null;
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
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>My Reimbursements</h2>
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
            >
              <i className="bi bi-plus-circle"></i> New Request
            </button>
          </div>

          {reimbursements.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-receipt display-1 text-muted"></i>
              <h4 className="mt-3">No Reimbursement Requests</h4>
              <p className="text-muted">Submit your first reimbursement request to get started.</p>
              <button
                className="btn btn-primary"
                onClick={() => setShowModal(true)}
              >
                <i className="bi bi-plus-circle"></i> New Request
              </button>
            </div>
          ) : (
            <div className="card">
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Request ID</th>
                        <th>Expense Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Submitted On</th>
                        <th>Current Approver</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reimbursements.map((reimbursement) => (
                        <tr key={reimbursement._id}>
                          <td>
                            <small className="text-muted">
                              {reimbursement.reimbursementId || reimbursement._id.slice(-6).toUpperCase()}
                            </small>
                          </td>
                          <td>{new Date(reimbursement.expenseDate).toLocaleDateString()}</td>
                          <td>
                            <span className="badge bg-light text-dark">{reimbursement.category}</span>
                          </td>
                          <td>
                            <div>
                              <div className="fw-semibold">{reimbursement.businessPurpose}</div>
                              <small className="text-muted">{reimbursement.description}</small>
                            </div>
                          </td>
                          <td>{formatCurrency(reimbursement.amount)}</td>
                          <td>{getStatusBadge(reimbursement.status)}</td>
                          <td>
                            {reimbursement.submittedAt ? 
                              new Date(reimbursement.submittedAt).toLocaleDateString() : 
                              new Date(reimbursement.createdAt).toLocaleDateString()
                            }
                          </td>
                          <td>
                            {reimbursement.currentApprover ? (
                              <small className="text-muted">
                                {reimbursement.currentApprover.firstName} {reimbursement.currentApprover.lastName}
                                <br />
                                <span className="badge bg-info">{reimbursement.currentApprover.role}</span>
                              </small>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Reimbursement Modal */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">New Reimbursement Request</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="category" className="form-label">Category *</label>
                        <select
                          className="form-select"
                          id="category"
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Select Category</option>
                          {reimbursementConfig?.data.categories.map(category => (
                            <option key={category.value} value={category.value}>
                              {category.label} (Limit: ₹{category.monthlyLimit.toLocaleString()})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="subcategory" className="form-label">Subcategory</label>
                        <input
                          type="text"
                          className="form-control"
                          id="subcategory"
                          name="subcategory"
                          value={formData.subcategory}
                          onChange={handleInputChange}
                          placeholder="e.g., Taxi, Hotel, etc."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-8">
                      <div className="mb-3">
                        <label htmlFor="amount" className="form-label">Amount *</label>
                        <input
                          type="number"
                          className="form-control"
                          id="amount"
                          name="amount"
                          value={formData.amount}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          required
                        />
                        {formData.category && getCategoryLimit(formData.category) && (
                          <div className="form-text">
                            Monthly limit for {formData.category}: ₹{getCategoryLimit(formData.category).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label htmlFor="currency" className="form-label">Currency</label>
                        <select
                          className="form-select"
                          id="currency"
                          name="currency"
                          value={formData.currency}
                          onChange={handleInputChange}
                        >
                          {reimbursementConfig?.data.currencies.map(currency => (
                            <option key={currency} value={currency}>{currency}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="expenseDate" className="form-label">Expense Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      id="expenseDate"
                      name="expenseDate"
                      value={formData.expenseDate}
                      onChange={handleInputChange}
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="businessPurpose" className="form-label">Business Purpose *</label>
                    <input
                      type="text"
                      className="form-control"
                      id="businessPurpose"
                      name="businessPurpose"
                      value={formData.businessPurpose}
                      onChange={handleInputChange}
                      placeholder="e.g., Client meeting, Training session, etc."
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="description" className="form-label">Description *</label>
                    <textarea
                      className="form-control"
                      id="description"
                      name="description"
                      rows="3"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Provide detailed description of the expense..."
                      required
                    ></textarea>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="priority" className="form-label">Priority</label>
                        <select
                          className="form-select"
                          id="priority"
                          name="priority"
                          value={formData.priority}
                          onChange={handleInputChange}
                        >
                          {reimbursementConfig?.data.priorities.map(priority => (
                            <option key={priority} value={priority}>{priority}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="receipts" className="form-label">Receipts</label>
                        <input
                          type="file"
                          className="form-control"
                          id="receipts"
                          name="receipts"
                          onChange={handleFileChange}
                          accept="image/*,.pdf"
                          multiple
                        />
                        <div className="form-text">Upload receipt images or PDFs (Max 5MB each)</div>
                      </div>
                    </div>
                  </div>

                  <div className="alert alert-info">
                    <h6><i className="bi bi-info-circle"></i> Approval Process</h6>
                    <p className="mb-0">Your request will be automatically sent to:</p>
                    <ul className="mb-0">
                      <li>Your reporting manager (if applicable)</li>
                      <li>HR team for amounts above ₹10,000 or Medical/Training expenses</li>
                      <li>Finance team (Admin/VP) for amounts above ₹25,000</li>
                    </ul>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle"></i> Submit Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {showModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default EmployeeReimbursements;
