import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';

const WorkInfoForm = forwardRef(({ data, onChange }, ref) => {
  const [formData, setFormData] = useState({
    designation: '',
    workLocation: '',
    employmentType: '',
    joiningDate: '',
    probationEndDate: '',
    confirmationDate: ''
  });

  const [errors, setErrors] = useState({});

  useImperativeHandle(ref, () => ({
    getFormData: () => formData
  }));

  useEffect(() => {
    if (data) {
      setFormData({
        designation: data.designation || '',
        workLocation: data.workLocation || '',
        employmentType: data.employmentType || '',
        joiningDate: data.joiningDate ? data.joiningDate.split('T')[0] : '',
        probationEndDate: data.probationEndDate ? data.probationEndDate.split('T')[0] : '',
        confirmationDate: data.confirmationDate ? data.confirmationDate.split('T')[0] : ''
      });
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Notify parent component of changes
    onChange && onChange();
  };

  const validateForm = () => {
    const newErrors = {};

    if (formData.joiningDate && formData.probationEndDate) {
      if (new Date(formData.probationEndDate) <= new Date(formData.joiningDate)) {
        newErrors.probationEndDate = 'Probation end date must be after joining date';
      }
    }

    if (formData.joiningDate && formData.confirmationDate) {
      if (new Date(formData.confirmationDate) <= new Date(formData.joiningDate)) {
        newErrors.confirmationDate = 'Confirmation date must be after joining date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div>
      <div className="alert alert-info mb-4">
        <i className="bi bi-info-circle me-2"></i>
        <strong>Note:</strong> Some work information fields like Employee ID, Department, and Role can only be updated by HR or Admin users.
      </div>

      <div>
        <div className="row">
          {/* Read-only fields */}
          <div className="col-md-6 mb-3">
            <label className="form-label">Employee ID</label>
            <input
              type="text"
              className="form-control"
              value={data?.employeeId || 'Not assigned'}
              disabled
            />
            <small className="text-muted">This field can only be updated by HR/Admin</small>
          </div>

          <div className="col-md-6 mb-3">
            <label className="form-label">Department</label>
            <input
              type="text"
              className="form-control"
              value={data?.department?.name || 'Not assigned'}
              disabled
            />
            <small className="text-muted">This field can only be updated by HR/Admin</small>
          </div>

          <div className="col-md-6 mb-3">
            <label className="form-label">Role</label>
            <input
              type="text"
              className="form-control"
              value={data?.role || 'Not assigned'}
              disabled
            />
            <small className="text-muted">This field can only be updated by HR/Admin</small>
          </div>

          <div className="col-md-6 mb-3">
            <label className="form-label">Reporting Manager</label>
            <input
              type="text"
              className="form-control"
              value={data?.reportingManager ? `${data.reportingManager.firstName} ${data.reportingManager.lastName}` : 'Not assigned'}
              disabled
            />
            <small className="text-muted">This field can only be updated by HR/Admin</small>
          </div>

          {/* Editable fields */}
          <div className="col-md-6 mb-3">
            <label htmlFor="designation" className="form-label">Designation/Job Title</label>
            <input
              type="text"
              className="form-control"
              id="designation"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              placeholder="e.g., Senior Software Engineer"
            />
          </div>

          <div className="col-md-6 mb-3">
            <label htmlFor="workLocation" className="form-label">Work Location</label>
            <select
              className="form-select"
              id="workLocation"
              name="workLocation"
              value={formData.workLocation}
              onChange={handleChange}
            >
              <option value="">Select Work Location</option>
              <option value="Office">Office</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>

          <div className="col-md-6 mb-3">
            <label htmlFor="employmentType" className="form-label">Employment Type</label>
            <select
              className="form-select"
              id="employmentType"
              name="employmentType"
              value={formData.employmentType}
              onChange={handleChange}
            >
              <option value="">Select Employment Type</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>

          <div className="col-md-6 mb-3">
            <label htmlFor="joiningDate" className="form-label">Joining Date</label>
            <input
              type="date"
              className="form-control"
              id="joiningDate"
              name="joiningDate"
              value={formData.joiningDate}
              onChange={handleChange}
            />
          </div>

          <div className="col-md-6 mb-3">
            <label htmlFor="probationEndDate" className="form-label">Probation End Date</label>
            <input
              type="date"
              className={`form-control ${errors.probationEndDate ? 'is-invalid' : ''}`}
              id="probationEndDate"
              name="probationEndDate"
              value={formData.probationEndDate}
              onChange={handleChange}
            />
            {errors.probationEndDate && <div className="invalid-feedback">{errors.probationEndDate}</div>}
          </div>

          <div className="col-md-6 mb-3">
            <label htmlFor="confirmationDate" className="form-label">Confirmation Date</label>
            <input
              type="date"
              className={`form-control ${errors.confirmationDate ? 'is-invalid' : ''}`}
              id="confirmationDate"
              name="confirmationDate"
              value={formData.confirmationDate}
              onChange={handleChange}
            />
            {errors.confirmationDate && <div className="invalid-feedback">{errors.confirmationDate}</div>}
          </div>

        </div>
      </div>
    </div>
  );
});

export default WorkInfoForm;
