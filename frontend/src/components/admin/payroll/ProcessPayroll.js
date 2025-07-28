import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ProcessPayroll = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [payrollData, setPayrollData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    employeeIds: [],
    autoCalculate: true
  });

  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [processResults, setProcessResults] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    department: '',
    role: '',
    search: ''
  });

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [filters, employees]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/users?isActive=true&limit=1000', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.data.docs || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to load employees');
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDepartments(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const filterEmployees = () => {
    let filtered = employees.filter(emp => emp.role !== 'Admin');

    if (filters.department) {
      filtered = filtered.filter(emp => emp.department?._id === filters.department);
    }

    if (filters.role) {
      filtered = filtered.filter(emp => emp.role === filters.role);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(emp => 
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchLower) ||
        emp.email.toLowerCase().includes(searchLower) ||
        emp.employeeId?.toLowerCase().includes(searchLower)
      );
    }

    setSelectedEmployees(filtered);
  };

  const handleEmployeeSelection = (employeeId, isSelected) => {
    setPayrollData(prev => ({
      ...prev,
      employeeIds: isSelected 
        ? [...prev.employeeIds, employeeId]
        : prev.employeeIds.filter(id => id !== employeeId)
    }));
  };

  const handleSelectAll = (isSelected) => {
    setPayrollData(prev => ({
      ...prev,
      employeeIds: isSelected ? selectedEmployees.map(emp => emp._id) : []
    }));
  };

  const handleProcessPayroll = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/payroll/bulk-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payrollData)
      });

      const data = await response.json();

      if (response.ok) {
        setProcessResults(data.data);
        setCurrentStep(3);
        setSuccess('Payroll processing completed successfully');
      } else {
        throw new Error(data.message || 'Failed to process payroll');
      }
    } catch (error) {
      console.error('Error processing payroll:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const renderStepIndicator = () => (
    <div className="row mb-4">
      <div className="col-12">
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center">
              <div className={`d-flex align-items-center ${currentStep >= 1 ? 'text-primary' : 'text-muted'}`}>
                <div className={`rounded-circle d-flex align-items-center justify-content-center me-2 ${currentStep >= 1 ? 'bg-primary text-white' : 'bg-light'}`} style={{ width: '32px', height: '32px' }}>
                  {currentStep > 1 ? <i className="bi bi-check"></i> : '1'}
                </div>
                <span className="fw-medium">Select Period & Employees</span>
              </div>
              <div className="flex-grow-1 mx-3">
                <hr className={`${currentStep > 1 ? 'border-primary' : 'border-light'}`} />
              </div>
              <div className={`d-flex align-items-center ${currentStep >= 2 ? 'text-primary' : 'text-muted'}`}>
                <div className={`rounded-circle d-flex align-items-center justify-content-center me-2 ${currentStep >= 2 ? 'bg-primary text-white' : 'bg-light'}`} style={{ width: '32px', height: '32px' }}>
                  {currentStep > 2 ? <i className="bi bi-check"></i> : '2'}
                </div>
                <span className="fw-medium">Review & Process</span>
              </div>
              <div className="flex-grow-1 mx-3">
                <hr className={`${currentStep > 2 ? 'border-primary' : 'border-light'}`} />
              </div>
              <div className={`d-flex align-items-center ${currentStep >= 3 ? 'text-primary' : 'text-muted'}`}>
                <div className={`rounded-circle d-flex align-items-center justify-content-center me-2 ${currentStep >= 3 ? 'bg-success text-white' : 'bg-light'}`} style={{ width: '32px', height: '32px' }}>
                  {currentStep >= 3 ? <i className="bi bi-check"></i> : '3'}
                </div>
                <span className="fw-medium">Results</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="row">
      <div className="col-lg-4 mb-4">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-0">
            <h5 className="mb-0">
              <i className="bi bi-calendar me-2"></i>
              Payroll Period
            </h5>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-6">
                <label className="form-label">Month</label>
                <select 
                  className="form-select"
                  value={payrollData.month}
                  onChange={(e) => setPayrollData(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {getMonthName(i + 1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6">
                <label className="form-label">Year</label>
                <select 
                  className="form-select"
                  value={payrollData.year}
                  onChange={(e) => setPayrollData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                >
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={year} value={year}>{year}</option>
                    );
                  })}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <div className="form-check">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="autoCalculate"
                  checked={payrollData.autoCalculate}
                  onChange={(e) => setPayrollData(prev => ({ ...prev, autoCalculate: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="autoCalculate">
                  Auto-calculate salaries using salary structures
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-8 mb-4">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-0">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-people me-2"></i>
                Select Employees
              </h5>
              <div className="form-check">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="selectAll"
                  checked={payrollData.employeeIds.length === selectedEmployees.length && selectedEmployees.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="selectAll">
                  Select All ({selectedEmployees.length})
                </label>
              </div>
            </div>
          </div>
          <div className="card-body">
            {/* Filters */}
            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <select 
                  className="form-select form-select-sm"
                  value={filters.department}
                  onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <select 
                  className="form-select form-select-sm"
                  value={filters.role}
                  onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="">All Roles</option>
                  <option value="Employee">Employee</option>
                  <option value="Team Leader">Team Leader</option>
                  <option value="Team Manager">Team Manager</option>
                  <option value="HR Executive">HR Executive</option>
                  <option value="HR Manager">HR Manager</option>
                  <option value="HR BP">HR BP</option>
                  <option value="Vice President">Vice President</option>
                </select>
              </div>
              <div className="col-md-4">
                <input 
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search employees..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>

            {/* Employee List */}
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {selectedEmployees.length > 0 ? (
                <div className="list-group list-group-flush">
                  {selectedEmployees.map(employee => (
                    <div key={employee._id} className="list-group-item border-0 px-0">
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="checkbox" 
                          id={`emp-${employee._id}`}
                          checked={payrollData.employeeIds.includes(employee._id)}
                          onChange={(e) => handleEmployeeSelection(employee._id, e.target.checked)}
                        />
                        <label className="form-check-label w-100" htmlFor={`emp-${employee._id}`}>
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className="mb-0">{employee.firstName} {employee.lastName}</h6>
                              <small className="text-muted">
                                {employee.employeeId} • {employee.role} • {employee.department?.name}
                              </small>
                            </div>
                            <small className="text-muted">{employee.email}</small>
                          </div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-people text-muted fs-1"></i>
                  <p className="text-muted mt-2">No employees found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="d-flex justify-content-between">
          <button 
            className="btn btn-outline-secondary"
            onClick={() => navigate('/admin/payroll')}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Cancel
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setCurrentStep(2)}
            disabled={payrollData.employeeIds.length === 0}
          >
            Next: Review & Process
            <i className="bi bi-arrow-right ms-2"></i>
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="row">
      <div className="col-12 mb-4">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-0">
            <h5 className="mb-0">
              <i className="bi bi-eye me-2"></i>
              Review Payroll Details
            </h5>
          </div>
          <div className="card-body">
            <div className="row g-4">
              <div className="col-md-6">
                <div className="bg-light p-3 rounded">
                  <h6 className="text-muted mb-2">Payroll Period</h6>
                  <h4 className="mb-0">{getMonthName(payrollData.month)} {payrollData.year}</h4>
                </div>
              </div>
              <div className="col-md-6">
                <div className="bg-light p-3 rounded">
                  <h6 className="text-muted mb-2">Selected Employees</h6>
                  <h4 className="mb-0">{payrollData.employeeIds.length} employees</h4>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <h6 className="mb-3">Processing Options</h6>
              <div className="form-check">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="autoCalculateReview"
                  checked={payrollData.autoCalculate}
                  onChange={(e) => setPayrollData(prev => ({ ...prev, autoCalculate: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="autoCalculateReview">
                  <strong>Auto-calculate salaries</strong>
                  <br />
                  <small className="text-muted">
                    Automatically calculate salaries using assigned salary structures, attendance data, and approved reimbursements.
                  </small>
                </label>
              </div>
            </div>

            <div className="alert alert-info mt-4">
              <i className="bi bi-info-circle me-2"></i>
              <strong>What happens during processing:</strong>
              <ul className="mb-0 mt-2">
                <li>Salary structures will be applied to calculate basic salary and allowances</li>
                <li>Attendance data will be fetched to calculate deductions for absences</li>
                <li>Approved reimbursements will be included in the payroll</li>
                <li>Statutory deductions (PF, ESI, Tax) will be calculated automatically</li>
                <li>Payroll records will be created with "Draft" status for review</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="d-flex justify-content-between">
          <button 
            className="btn btn-outline-secondary"
            onClick={() => setCurrentStep(1)}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back
          </button>
          <button 
            className="btn btn-success"
            onClick={handleProcessPayroll}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Processing...
              </>
            ) : (
              <>
                <i className="bi bi-gear me-2"></i>
                Process Payroll
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="row">
      <div className="col-12 mb-4">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-0">
            <h5 className="mb-0">
              <i className="bi bi-check-circle-fill text-success me-2"></i>
              Payroll Processing Results
            </h5>
          </div>
          <div className="card-body">
            {processResults && (
              <>
                <div className="row g-4 mb-4">
                  <div className="col-md-4">
                    <div className="bg-success bg-opacity-10 p-3 rounded text-center">
                      <i className="bi bi-check-circle text-success fs-2"></i>
                      <h4 className="mt-2 mb-0 text-success">{processResults.processed.length}</h4>
                      <small className="text-muted">Successfully Processed</small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="bg-warning bg-opacity-10 p-3 rounded text-center">
                      <i className="bi bi-exclamation-triangle text-warning fs-2"></i>
                      <h4 className="mt-2 mb-0 text-warning">{processResults.skipped.length}</h4>
                      <small className="text-muted">Skipped</small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="bg-danger bg-opacity-10 p-3 rounded text-center">
                      <i className="bi bi-x-circle text-danger fs-2"></i>
                      <h4 className="mt-2 mb-0 text-danger">{processResults.errors.length}</h4>
                      <small className="text-muted">Errors</small>
                    </div>
                  </div>
                </div>

                {/* Processed Successfully */}
                {processResults.processed.length > 0 && (
                  <div className="mb-4">
                    <h6 className="text-success mb-3">
                      <i className="bi bi-check-circle me-2"></i>
                      Successfully Processed ({processResults.processed.length})
                    </h6>
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead className="table-light">
                          <tr>
                            <th>Employee</th>
                            <th>Gross Salary</th>
                            <th>Net Salary</th>
                          </tr>
                        </thead>
                        <tbody>
                          {processResults.processed.map((result, index) => (
                            <tr key={index}>
                              <td>{result.employee}</td>
                              <td>{formatCurrency(result.grossSalary)}</td>
                              <td><strong>{formatCurrency(result.netSalary)}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Skipped */}
                {processResults.skipped.length > 0 && (
                  <div className="mb-4">
                    <h6 className="text-warning mb-3">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      Skipped ({processResults.skipped.length})
                    </h6>
                    <div className="list-group">
                      {processResults.skipped.map((result, index) => (
                        <div key={index} className="list-group-item">
                          <div className="d-flex justify-content-between align-items-center">
                            <span>{result.employee}</span>
                            <small className="text-muted">{result.reason}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {processResults.errors.length > 0 && (
                  <div className="mb-4">
                    <h6 className="text-danger mb-3">
                      <i className="bi bi-x-circle me-2"></i>
                      Errors ({processResults.errors.length})
                    </h6>
                    <div className="list-group">
                      {processResults.errors.map((result, index) => (
                        <div key={index} className="list-group-item">
                          <div className="d-flex justify-content-between align-items-start">
                            <span>{result.employee}</span>
                            <small className="text-danger">{result.error}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="d-flex justify-content-between">
          <button 
            className="btn btn-outline-secondary"
            onClick={() => navigate('/admin/payroll')}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back to Payroll
          </button>
          <div>
            <button 
              className="btn btn-outline-primary me-2"
              onClick={() => {
                setCurrentStep(1);
                setProcessResults(null);
                setPayrollData(prev => ({ ...prev, employeeIds: [] }));
              }}
            >
              <i className="bi bi-arrow-repeat me-2"></i>
              Process Another Batch
            </button>
            <button 
              className="btn btn-success"
              onClick={() => navigate('/admin/payroll/payslips')}
            >
              <i className="bi bi-file-earmark-text me-2"></i>
              Generate Payslips
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <h2 className="mb-1">
            <i className="bi bi-gear me-2"></i>
            Process Payroll
          </h2>
          <p className="text-muted mb-0">Process monthly payroll for selected employees</p>
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

      {success && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-success alert-dismissible">
              <i className="bi bi-check-circle me-2"></i>
              {success}
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setSuccess('')}
              ></button>
            </div>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Step Content */}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
    </div>
  );
};

export default ProcessPayroll;
