import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const SalaryStructureForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basicSalary: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
    applicableFor: {
      roles: [],
      departments: [],
      designations: [],
      experienceRange: { min: 0, max: 50 }
    },
    allowances: {
      hra: { type: 'percentage', value: 40, maxLimit: null },
      da: { type: 'percentage', value: 0, maxLimit: null },
      ta: { type: 'fixed', value: 1600, maxLimit: null },
      medical: { type: 'fixed', value: 1250, maxLimit: null },
      special: { type: 'percentage', value: 10, maxLimit: null },
      other: { type: 'fixed', value: 0, maxLimit: null }
    },
    customAllowances: [],
    deductions: {
      epf: { type: 'percentage', value: 12, maxLimit: 1800 },
      esi: { type: 'percentage', value: 0.75, applicableUpTo: 21000, maxLimit: null },
      professionalTax: { type: 'fixed', value: 200, maxLimit: null },
      incomeTax: { type: 'percentage', value: 0, maxLimit: null }
    },
    customDeductions: [],
    bonusRules: {
      annual: { type: 'percentage', value: 8.33, maxLimit: 7000 },
      performance: { type: 'percentage', value: 0, maxLimit: null }
    },
    overtimeRules: {
      enabled: true,
      rate: 2,
      calculation: 'hourly'
    },
    isActive: true,
    isDefault: false,
    status: 'Draft'
  });

  const roles = [
    'Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive',
    'Team Manager', 'Team Leader', 'Employee'
  ];

  useEffect(() => {
    fetchDepartments();
    if (isEdit) {
      fetchSalaryStructure();
    }
  }, [id, isEdit]);

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

  const fetchSalaryStructure = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/salary-structures/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFormData({
          ...data.data,
          effectiveFrom: data.data.effectiveFrom ? 
            new Date(data.data.effectiveFrom).toISOString().split('T')[0] : '',
          effectiveTo: data.data.effectiveTo ? 
            new Date(data.data.effectiveTo).toISOString().split('T')[0] : ''
        });
      } else {
        throw new Error('Failed to fetch salary structure');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleAllowanceChange = (key, field, value) => {
    setFormData(prev => ({
      ...prev,
      allowances: {
        ...prev.allowances,
        [key]: {
          ...prev.allowances[key],
          [field]: value
        }
      }
    }));
  };

  const handleDeductionChange = (key, field, value) => {
    setFormData(prev => ({
      ...prev,
      deductions: {
        ...prev.deductions,
        [key]: {
          ...prev.deductions[key],
          [field]: value
        }
      }
    }));
  };

  const addCustomAllowance = () => {
    const newAllowance = {
      name: '',
      type: 'fixed',
      value: 0,
      maxLimit: null,
      description: '',
      isActive: true
    };
    setFormData(prev => ({
      ...prev,
      customAllowances: [...prev.customAllowances, newAllowance]
    }));
  };

  const removeCustomAllowance = (index) => {
    setFormData(prev => ({
      ...prev,
      customAllowances: prev.customAllowances.filter((_, i) => i !== index)
    }));
  };

  const updateCustomAllowance = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      customAllowances: prev.customAllowances.map((allowance, i) => 
        i === index ? { ...allowance, [field]: value } : allowance
      )
    }));
  };

  const addCustomDeduction = () => {
    const newDeduction = {
      name: '',
      type: 'fixed',
      value: 0,
      maxLimit: null,
      description: '',
      isActive: true
    };
    setFormData(prev => ({
      ...prev,
      customDeductions: [...prev.customDeductions, newDeduction]
    }));
  };

  const removeCustomDeduction = (index) => {
    setFormData(prev => ({
      ...prev,
      customDeductions: prev.customDeductions.filter((_, i) => i !== index)
    }));
  };

  const updateCustomDeduction = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      customDeductions: prev.customDeductions.map((deduction, i) => 
        i === index ? { ...deduction, [field]: value } : deduction
      )
    }));
  };

  const handlePreview = async () => {
    if (!formData.basicSalary) {
      setError('Basic salary is required for preview');
      return;
    }

    try {
      const response = await fetch('/api/salary-structures/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          structureData: formData,
          basicSalary: parseFloat(formData.basicSalary)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewData(data.data);
        setShowPreview(true);
      } else {
        throw new Error('Failed to generate preview');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.basicSalary) {
      setError('Name and basic salary are required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const url = isEdit ? `/api/salary-structures/${id}` : '/api/salary-structures';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        navigate('/admin/payroll/structure');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save salary structure');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
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

  if (loading) {
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
                <i className="bi bi-calculator me-2"></i>
                {isEdit ? 'Edit Salary Structure' : 'Create Salary Structure'}
              </h2>
              <p className="text-muted mb-0">
                {isEdit ? 'Update salary structure details' : 'Create a new salary structure template'}
              </p>
            </div>
            <div>
              <button 
                type="button"
                className="btn btn-outline-secondary me-2"
                onClick={() => navigate('/admin/payroll/structure')}
              >
                <i className="bi bi-arrow-left me-2"></i>
                Back
              </button>
              <button 
                type="button"
                className="btn btn-info me-2"
                onClick={handlePreview}
                disabled={!formData.basicSalary}
              >
                <i className="bi bi-eye me-2"></i>
                Preview
              </button>
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

      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* Main Form */}
          <div className="col-lg-8">
            {/* Basic Information */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-light">
                <h5 className="mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  Basic Information
                </h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Structure Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Basic Salary *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.basicSalary}
                      onChange={(e) => handleInputChange('basicSalary', parseFloat(e.target.value) || '')}
                      required
                      min="0"
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Effective From</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.effectiveFrom}
                      onChange={(e) => handleInputChange('effectiveFrom', e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Effective To</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.effectiveTo}
                      onChange={(e) => handleInputChange('effectiveTo', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Applicable For */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-light">
                <h5 className="mb-0">
                  <i className="bi bi-people me-2"></i>
                  Applicable For
                </h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Roles</label>
                    <select
                      multiple
                      className="form-select"
                      value={formData.applicableFor.roles}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        handleNestedInputChange('applicableFor', 'roles', values);
                      }}
                    >
                      {roles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    <small className="text-muted">Hold Ctrl/Cmd to select multiple</small>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Departments</label>
                    <select
                      multiple
                      className="form-select"
                      value={formData.applicableFor.departments}
                      onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        handleNestedInputChange('applicableFor', 'departments', values);
                      }}
                    >
                      {departments.map(dept => (
                        <option key={dept._id} value={dept._id}>{dept.name}</option>
                      ))}
                    </select>
                    <small className="text-muted">Hold Ctrl/Cmd to select multiple</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Standard Allowances */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-light">
                <h5 className="mb-0">
                  <i className="bi bi-plus-circle me-2"></i>
                  Standard Allowances
                </h5>
              </div>
              <div className="card-body">
                {Object.entries(formData.allowances).map(([key, allowance]) => (
                  <div key={key} className="row g-3 mb-3">
                    <div className="col-md-3">
                      <label className="form-label text-capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                    </div>
                    <div className="col-md-3">
                      <select
                        className="form-select"
                        value={allowance.type}
                        onChange={(e) => handleAllowanceChange(key, 'type', e.target.value)}
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed Amount</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <input
                        type="number"
                        className="form-control"
                        placeholder={allowance.type === 'percentage' ? 'Percentage' : 'Amount'}
                        value={allowance.value}
                        onChange={(e) => handleAllowanceChange(key, 'value', parseFloat(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                    <div className="col-md-3">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Max Limit (Optional)"
                        value={allowance.maxLimit || ''}
                        onChange={(e) => handleAllowanceChange(key, 'maxLimit', parseFloat(e.target.value) || null)}
                        min="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Allowances */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-light d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-plus-square me-2"></i>
                  Custom Allowances
                </h5>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={addCustomAllowance}
                >
                  <i className="bi bi-plus me-1"></i>
                  Add Custom
                </button>
              </div>
              <div className="card-body">
                {formData.customAllowances.length === 0 ? (
                  <p className="text-muted text-center py-3">
                    No custom allowances added. Click "Add Custom" to create one.
                  </p>
                ) : (
                  formData.customAllowances.map((allowance, index) => (
                    <div key={index} className="border rounded p-3 mb-3">
                      <div className="row g-3">
                        <div className="col-md-3">
                          <label className="form-label">Name</label>
                          <input
                            type="text"
                            className="form-control"
                            value={allowance.name}
                            onChange={(e) => updateCustomAllowance(index, 'name', e.target.value)}
                            placeholder="e.g., Performance Bonus"
                          />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label">Type</label>
                          <select
                            className="form-select"
                            value={allowance.type}
                            onChange={(e) => updateCustomAllowance(index, 'type', e.target.value)}
                          >
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed Amount</option>
                          </select>
                        </div>
                        <div className="col-md-2">
                          <label className="form-label">Value</label>
                          <input
                            type="number"
                            className="form-control"
                            value={allowance.value}
                            onChange={(e) => updateCustomAllowance(index, 'value', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label">Max Limit</label>
                          <input
                            type="number"
                            className="form-control"
                            value={allowance.maxLimit || ''}
                            onChange={(e) => updateCustomAllowance(index, 'maxLimit', parseFloat(e.target.value) || null)}
                            min="0"
                          />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label">Active</label>
                          <div className="form-check form-switch mt-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={allowance.isActive}
                              onChange={(e) => updateCustomAllowance(index, 'isActive', e.target.checked)}
                            />
                          </div>
                        </div>
                        <div className="col-md-1">
                          <label className="form-label">&nbsp;</label>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm w-100"
                            onClick={() => removeCustomAllowance(index)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                        <div className="col-12">
                          <label className="form-label">Description</label>
                          <input
                            type="text"
                            className="form-control"
                            value={allowance.description}
                            onChange={(e) => updateCustomAllowance(index, 'description', e.target.value)}
                            placeholder="Optional description"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Standard Deductions */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-light">
                <h5 className="mb-0">
                  <i className="bi bi-dash-circle me-2"></i>
                  Standard Deductions
                </h5>
              </div>
              <div className="card-body">
                {Object.entries(formData.deductions).map(([key, deduction]) => (
                  <div key={key} className="row g-3 mb-3">
                    <div className="col-md-3">
                      <label className="form-label text-capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
                      </label>
                    </div>
                    <div className="col-md-3">
                      <select
                        className="form-select"
                        value={deduction.type}
                        onChange={(e) => handleDeductionChange(key, 'type', e.target.value)}
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed Amount</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <input
                        type="number"
                        className="form-control"
                        placeholder={deduction.type === 'percentage' ? 'Percentage' : 'Amount'}
                        value={deduction.value}
                        onChange={(e) => handleDeductionChange(key, 'value', parseFloat(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                    <div className="col-md-3">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Max Limit (Optional)"
                        value={deduction.maxLimit || ''}
                        onChange={(e) => handleDeductionChange(key, 'maxLimit', parseFloat(e.target.value) || null)}
                        min="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Deductions */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-light d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-dash-square me-2"></i>
                  Custom Deductions
                </h5>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={addCustomDeduction}
                >
                  <i className="bi bi-plus me-1"></i>
                  Add Custom
                </button>
              </div>
              <div className="card-body">
                {formData.customDeductions.length === 0 ? (
                  <p className="text-muted text-center py-3">
                    No custom deductions added. Click "Add Custom" to create one.
                  </p>
                ) : (
                  formData.customDeductions.map((deduction, index) => (
                    <div key={index} className="border rounded p-3 mb-3">
                      <div className="row g-3">
                        <div className="col-md-3">
                          <label className="form-label">Name</label>
                          <input
                            type="text"
                            className="form-control"
                            value={deduction.name}
                            onChange={(e) => updateCustomDeduction(index, 'name', e.target.value)}
                            placeholder="e.g., Loan Deduction"
                          />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label">Type</label>
                          <select
                            className="form-select"
                            value={deduction.type}
                            onChange={(e) => updateCustomDeduction(index, 'type', e.target.value)}
                          >
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed Amount</option>
                          </select>
                        </div>
                        <div className="col-md-2">
                          <label className="form-label">Value</label>
                          <input
                            type="number"
                            className="form-control"
                            value={deduction.value}
                            onChange={(e) => updateCustomDeduction(index, 'value', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label">Max Limit</label>
                          <input
                            type="number"
                            className="form-control"
                            value={deduction.maxLimit || ''}
                            onChange={(e) => updateCustomDeduction(index, 'maxLimit', parseFloat(e.target.value) || null)}
                            min="0"
                          />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label">Active</label>
                          <div className="form-check form-switch mt-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={deduction.isActive}
                              onChange={(e) => updateCustomDeduction(index, 'isActive', e.target.checked)}
                            />
                          </div>
                        </div>
                        <div className="col-md-1">
                          <label className="form-label">&nbsp;</label>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm w-100"
                            onClick={() => removeCustomDeduction(index)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                        <div className="col-12">
                          <label className="form-label">Description</label>
                          <input
                            type="text"
                            className="form-control"
                            value={deduction.description}
                            onChange={(e) => updateCustomDeduction(index, 'description', e.target.value)}
                            placeholder="Optional description"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Settings */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-light">
                <h5 className="mb-0">
                  <i className="bi bi-gear me-2"></i>
                  Settings
                </h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => handleInputChange('isActive', e.target.checked)}
                      />
                      <label className="form-check-label">
                        Active Structure
                      </label>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={formData.isDefault}
                        onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                      />
                      <label className="form-check-label">
                        Default Structure
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Sidebar */}
          <div className="col-lg-4">
            {showPreview && previewData && (
              <div className="card border-0 shadow-sm sticky-top">
                <div className="card-header bg-primary text-white">
                  <h5 className="mb-0">
                    <i className="bi bi-eye me-2"></i>
                    Salary Preview
                  </h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <h6 className="text-muted">Basic Salary</h6>
                    <h4 className="text-primary">{formatCurrency(previewData.basic)}</h4>
                  </div>

                  <div className="mb-3">
                    <h6 className="text-success">Allowances</h6>
                    {Object.entries(previewData.allowances).map(([key, value]) => (
                      <div key={key} className="d-flex justify-content-between">
                        <span className="text-capitalize">{key}:</span>
                        <span>{formatCurrency(value)}</span>
                      </div>
                    ))}
                    {Object.entries(previewData.customAllowances || {}).map(([key, value]) => (
                      <div key={key} className="d-flex justify-content-between">
                        <span>{key}:</span>
                        <span>{formatCurrency(value)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mb-3">
                    <h6 className="text-warning">Deductions</h6>
                    {Object.entries(previewData.deductions).map(([key, value]) => (
                      <div key={key} className="d-flex justify-content-between">
                        <span className="text-capitalize">{key.toUpperCase()}:</span>
                        <span>{formatCurrency(value)}</span>
                      </div>
                    ))}
                    {Object.entries(previewData.customDeductions || {}).map(([key, value]) => (
                      <div key={key} className="d-flex justify-content-between">
                        <span>{key}:</span>
                        <span>{formatCurrency(value)}</span>
                      </div>
                    ))}
                  </div>

                  <hr />

                  <div className="mb-3">
                    <div className="d-flex justify-content-between">
                      <h6 className="text-info">Gross Salary:</h6>
                      <h6 className="text-info">{formatCurrency(previewData.gross)}</h6>
                    </div>
                    <div className="d-flex justify-content-between">
                      <h6 className="text-danger">Total Deductions:</h6>
                      <h6 className="text-danger">{formatCurrency(previewData.totalDeductions)}</h6>
                    </div>
                  </div>

                  <hr />

                  <div className="text-center">
                    <h5 className="text-success">Net Salary</h5>
                    <h3 className="text-success">{formatCurrency(previewData.net)}</h3>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm w-100 mt-3"
                    onClick={() => setShowPreview(false)}
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-grid gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-2"></i>
                        {isEdit ? 'Update Structure' : 'Create Structure'}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/admin/payroll/structure')}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SalaryStructureForm;
