import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';

const EmergencyContactForm = forwardRef(({ data, onChange }, ref) => {
  const [formData, setFormData] = useState({
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      address: ''
    }
  });

  const [errors, setErrors] = useState({});

  useImperativeHandle(ref, () => ({
    getFormData: () => formData
  }));

  useEffect(() => {
    if (data) {
      setFormData({
        emergencyContact: {
          name: data.emergencyContact?.name || '',
          relationship: data.emergencyContact?.relationship || '',
          phone: data.emergencyContact?.phone || '',
          address: data.emergencyContact?.address || ''
        }
      });
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      emergencyContact: {
        ...prev.emergencyContact,
        [name]: value
      }
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

    if (!formData.emergencyContact.name.trim()) {
      newErrors.name = 'Emergency contact name is required';
    }

    if (!formData.emergencyContact.relationship.trim()) {
      newErrors.relationship = 'Relationship is required';
    }

    if (!formData.emergencyContact.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s-()]+$/.test(formData.emergencyContact.phone)) {
      newErrors.phone = 'Phone number is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const relationshipOptions = [
    'Spouse',
    'Parent',
    'Child',
    'Sibling',
    'Friend',
    'Relative',
    'Guardian',
    'Other'
  ];

  return (
    <div>
      <div className="alert alert-warning mb-4">
        <i className="bi bi-exclamation-triangle me-2"></i>
        <strong>Important:</strong> This information will be used to contact someone on your behalf in case of an emergency. Please ensure all details are accurate and up-to-date.
      </div>

      <div>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label htmlFor="name" className="form-label">
              Contact Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className={`form-control ${errors.name ? 'is-invalid' : ''}`}
              id="name"
              name="name"
              value={formData.emergencyContact.name}
              onChange={handleChange}
              placeholder="Full name of emergency contact"
              required
            />
            {errors.name && <div className="invalid-feedback">{errors.name}</div>}
          </div>

          <div className="col-md-6 mb-3">
            <label htmlFor="relationship" className="form-label">
              Relationship <span className="text-danger">*</span>
            </label>
            <select
              className={`form-select ${errors.relationship ? 'is-invalid' : ''}`}
              id="relationship"
              name="relationship"
              value={formData.emergencyContact.relationship}
              onChange={handleChange}
              required
            >
              <option value="">Select Relationship</option>
              {relationshipOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {errors.relationship && <div className="invalid-feedback">{errors.relationship}</div>}
          </div>

          <div className="col-md-6 mb-3">
            <label htmlFor="phone" className="form-label">
              Phone Number <span className="text-danger">*</span>
            </label>
            <input
              type="tel"
              className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
              id="phone"
              name="phone"
              value={formData.emergencyContact.phone}
              onChange={handleChange}
              placeholder="+1 (555) 123-4567"
              required
            />
            {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
            <small className="text-muted">Include country code for international numbers</small>
          </div>

          <div className="col-md-6 mb-3">
            <label className="form-label">Alternative Contact</label>
            <input
              type="tel"
              className="form-control"
              placeholder="+1 (555) 987-6543"
            />
            <small className="text-muted">Optional secondary phone number</small>
          </div>

          <div className="col-12 mb-3">
            <label htmlFor="address" className="form-label">Address</label>
            <textarea
              className="form-control"
              id="address"
              name="address"
              rows="3"
              value={formData.emergencyContact.address}
              onChange={handleChange}
              placeholder="Complete address of emergency contact"
            ></textarea>
            <small className="text-muted">Include street, city, state, and postal code</small>
          </div>

          <div className="col-12 mb-4">
            <div className="card bg-light">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="bi bi-info-circle text-primary me-2"></i>
                  Emergency Contact Guidelines
                </h6>
                <ul className="mb-0 small">
                  <li>Choose someone who is easily reachable and reliable</li>
                  <li>Inform your emergency contact that you've listed them</li>
                  <li>Update this information if your contact details change</li>
                  <li>Consider choosing someone who lives nearby or is familiar with your medical history</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
});

export default EmergencyContactForm;
