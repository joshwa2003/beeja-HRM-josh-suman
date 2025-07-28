import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../utils/api';

const EmployeePayslip = () => {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchPayslips();
  }, []);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payroll/employee/payslips');
      setPayslips(response.data);
    } catch (error) {
      console.error('Error fetching payslips:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewPayslip = (payslip) => {
    setSelectedPayslip(payslip);
    setShowModal(true);
  };

  const downloadPayslip = async (payslipId) => {
    try {
      const response = await api.get(`/payroll/payslips/${payslipId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip_${payslipId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading payslip:', error);
      alert('Download functionality will be available soon');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getMonthYear = (month, year) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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
            <h2>My Payslips</h2>
          </div>

          {payslips.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-file-earmark-text display-1 text-muted"></i>
              <h4 className="mt-3">No Payslips Found</h4>
              <p className="text-muted">Your payslips will appear here once they are generated.</p>
            </div>
          ) : (
            <div className="card">
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Pay Period</th>
                        <th>Basic Salary</th>
                        <th>Gross Salary</th>
                        <th>Deductions</th>
                        <th>Net Salary</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payslips.map((payslip) => (
                        <tr key={payslip._id}>
                          <td>
                            <div>
                              <strong>{getMonthYear(payslip.payPeriod.month, payslip.payPeriod.year)}</strong>
                            </div>
                          </td>
                          <td>{formatCurrency(payslip.basicSalary)}</td>
                          <td>{formatCurrency(payslip.grossSalary)}</td>
                          <td>{formatCurrency(payslip.totalDeductions)}</td>
                          <td>
                            <strong className="text-success">{formatCurrency(payslip.netSalary)}</strong>
                          </td>
                          <td>
                            <span className={`badge ${
                              payslip.status === 'Paid' ? 'bg-success' : 
                              payslip.status === 'Processed' ? 'bg-warning' : 
                              payslip.status === 'Hold' ? 'bg-danger' : 'bg-secondary'
                            }`}>
                              {payslip.status}
                            </span>
                          </td>
                          <td>
                            <div className="btn-group" role="group">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => viewPayslip(payslip)}
                              >
                                <i className="bi bi-eye"></i> View
                              </button>
                              <button
                                className="btn btn-sm btn-outline-success"
                                onClick={() => downloadPayslip(payslip._id)}
                              >
                                <i className="bi bi-download"></i> Download
                              </button>
                            </div>
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

      {/* Payslip Detail Modal */}
      {showModal && selectedPayslip && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Payslip Details - {getMonthYear(selectedPayslip.payPeriod.month, selectedPayslip.payPeriod.year)}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <h6>Employee Information</h6>
                    <p><strong>Name:</strong> {selectedPayslip.employee?.firstName} {selectedPayslip.employee?.lastName}</p>
                    <p><strong>Employee ID:</strong> {selectedPayslip.employee?.employeeId}</p>
                    <p><strong>Department:</strong> {selectedPayslip.employee?.department?.name || 'N/A'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6>Pay Period</h6>
                    <p><strong>Month:</strong> {getMonthYear(selectedPayslip.payPeriod.month, selectedPayslip.payPeriod.year)}</p>
                    <p><strong>Status:</strong> 
                      <span className={`badge ms-2 ${
                        selectedPayslip.status === 'Paid' ? 'bg-success' : 
                        selectedPayslip.status === 'Processed' ? 'bg-warning' : 
                        selectedPayslip.status === 'Hold' ? 'bg-danger' : 'bg-secondary'
                      }`}>
                        {selectedPayslip.status}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <h6>Earnings</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td>Basic Salary</td>
                          <td className="text-end">{formatCurrency(selectedPayslip.basicSalary)}</td>
                        </tr>
                        {selectedPayslip.allowances && Object.entries(selectedPayslip.allowances).map(([key, value]) => 
                          value > 0 ? (
                            <tr key={key}>
                              <td>{key.toUpperCase()}</td>
                              <td className="text-end">{formatCurrency(value)}</td>
                            </tr>
                          ) : null
                        )}
                        {selectedPayslip.bonus > 0 && (
                          <tr>
                            <td>Bonus</td>
                            <td className="text-end">{formatCurrency(selectedPayslip.bonus)}</td>
                          </tr>
                        )}
                        {selectedPayslip.incentives > 0 && (
                          <tr>
                            <td>Incentives</td>
                            <td className="text-end">{formatCurrency(selectedPayslip.incentives)}</td>
                          </tr>
                        )}
                        {selectedPayslip.overtime?.amount > 0 && (
                          <tr>
                            <td>Overtime ({selectedPayslip.overtime.hours} hrs)</td>
                            <td className="text-end">{formatCurrency(selectedPayslip.overtime.amount)}</td>
                          </tr>
                        )}
                        <tr className="table-success">
                          <td><strong>Gross Salary</strong></td>
                          <td className="text-end"><strong>{formatCurrency(selectedPayslip.grossSalary)}</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6>Deductions</h6>
                    <table className="table table-sm">
                      <tbody>
                        {selectedPayslip.deductions && Object.entries(selectedPayslip.deductions).map(([key, value]) => 
                          value > 0 ? (
                            <tr key={key}>
                              <td>{key.toUpperCase()}</td>
                              <td className="text-end">{formatCurrency(value)}</td>
                            </tr>
                          ) : null
                        )}
                        <tr className="table-danger">
                          <td><strong>Total Deductions</strong></td>
                          <td className="text-end"><strong>{formatCurrency(selectedPayslip.totalDeductions)}</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="row mt-3">
                  <div className="col-12">
                    <div className="alert alert-success">
                      <h5 className="mb-0">Net Salary: {formatCurrency(selectedPayslip.netSalary)}</h5>
                    </div>
                  </div>
                </div>

                {selectedPayslip.attendance && (
                  <div className="row mt-3">
                    <div className="col-12">
                      <h6>Attendance Summary</h6>
                      <div className="row">
                        <div className="col-md-3">
                          <small className="text-muted">Working Days</small>
                          <div className="fw-bold">{selectedPayslip.attendance.workingDays}</div>
                        </div>
                        <div className="col-md-3">
                          <small className="text-muted">Present Days</small>
                          <div className="fw-bold text-success">{selectedPayslip.attendance.presentDays}</div>
                        </div>
                        <div className="col-md-3">
                          <small className="text-muted">Absent Days</small>
                          <div className="fw-bold text-danger">{selectedPayslip.attendance.absentDays}</div>
                        </div>
                        <div className="col-md-3">
                          <small className="text-muted">Leave Days</small>
                          <div className="fw-bold text-warning">{selectedPayslip.attendance.leaveDays}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => downloadPayslip(selectedPayslip._id)}
                >
                  <i className="bi bi-download"></i> Download PDF
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default EmployeePayslip;
