import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';

const BankDetailsForm = forwardRef(({ data, onChange }, ref) => {
  const [formData, setFormData] = useState({
    bankDetails: {
      accountNumber: '',
      bankName: '',
      ifscCode: '',
      pfNumber: '',
      esiNumber: '',
      panNumber: ''
    }
  });

  const [errors, setErrors] = useState({});
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  useImperativeHandle(ref, () => ({
    getFormData: () => formData
  }));

  useEffect(() => {
    if (data) {
      setFormData({
        bankDetails: {
          accountNumber: data.bankDetails?.accountNumber || '',
          bankName: data.bankDetails?.bankName || '',
          ifscCode: data.bankDetails?.ifscCode || '',
          pfNumber: data.bankDetails?.pfNumber || '',
          esiNumber: data.bankDetails?.esiNumber || '',
          panNumber: data.bankDetails?.panNumber || ''
        }
      });
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      bankDetails: {
        ...prev.bankDetails,
        [name]: value.toUpperCase() // Convert to uppercase for codes
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

    // Account Number validation
    if (formData.bankDetails.accountNumber && formData.bankDetails.accountNumber.length < 9) {
      newErrors.accountNumber = 'Account number must be at least 9 digits';
    }

    // IFSC Code validation
    if (formData.bankDetails.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bankDetails.ifscCode)) {
      newErrors.ifscCode = 'IFSC code format is invalid (e.g., SBIN0001234)';
    }

    // PAN Number validation
    if (formData.bankDetails.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.bankDetails.panNumber)) {
      newErrors.panNumber = 'PAN number format is invalid (e.g., ABCDE1234F)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const maskAccountNumber = (accountNumber) => {
    if (!accountNumber) return '';
    if (accountNumber.length <= 4) return accountNumber;
    return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
  };

  return (
    <div>
      <div className="alert alert-danger mb-4">
        <i className="bi bi-shield-exclamation me-2"></i>
        <strong>Security Notice:</strong> This information is highly sensitive and encrypted. Only provide accurate details. Account numbers are masked for security.
      </div>

      <div>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label htmlFor="bankName" className="form-label">Bank Name</label>
            <input
              type="text"
              className="form-control"
              id="bankName"
              name="bankName"
              value={formData.bankDetails.bankName}
              onChange={handleChange}
              placeholder="e.g., State Bank of India"
            />
          </div>

          <div className="col-md-6 mb-3">
            <label htmlFor="ifscCode" className="form-label">IFSC Code</label>
            <input
              type="text"
              className={`form-control ${errors.ifscCode ? 'is-invalid' : ''}`}
              id="ifscCode"
              name="ifscCode"
              value={formData.bankDetails.ifscCode}
              onChange={handleChange}
              placeholder="SBIN0001234"
              maxLength="11"
            />
            {errors.ifscCode && <div className="invalid-feedback">{errors.ifscCode}</div>}
            <small className="text-muted">11-character alphanumeric code</small>
          </div>

          <div className="col-md-12 mb-3">
            <label htmlFor="accountNumber" className="form-label">
              Account Number
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary ms-2"
                onClick={() => setShowAccountNumber(!showAccountNumber)}
              >
                <i className={`bi ${showAccountNumber ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                {showAccountNumber ? 'Hide' : 'Show'}
              </button>
            </label>
            <input
              type={showAccountNumber ? 'text' : 'password'}
              className={`form-control ${errors.accountNumber ? 'is-invalid' : ''}`}
              id="accountNumber"
              name="accountNumber"
              value={formData.bankDetails.accountNumber}
              onChange={handleChange}
              placeholder={showAccountNumber ? "Enter account number" : maskAccountNumber(formData.bankDetails.accountNumber)}
            />
            {errors.accountNumber && <div className="invalid-feedback">{errors.accountNumber}</div>}
            <small className="text-muted">Your bank account number (will be encrypted)</small>
          </div>

          <div className="col-12 mb-3">
            <h6 className="mb-3">Government IDs & Numbers</h6>
          </div>

          <div className="col-md-6 mb-3">
            <label htmlFor="panNumber" className="form-label">PAN Number</label>
            <input
              type="text"
              className={`form-control ${errors.panNumber ? 'is-invalid' : ''}`}
              id="panNumber"
              name="panNumber"
              value={formData.bankDetails.panNumber}
              onChange={handleChange}
              placeholder="ABCDE1234F"
              maxLength="10"
            />
            {errors.panNumber && <div className="invalid-feedback">{errors.panNumber}</div>}
            <small className="text-muted">10-character alphanumeric code</small>
          </div>

          <div className="col-md-6 mb-3">
            <label htmlFor="pfNumber" className="form-label">PF Number</label>
            <input
              type="text"
              className="form-control"
              id="pfNumber"
              name="pfNumber"
              value={formData.bankDetails.pfNumber}
              onChange={handleChange}
              placeholder="e.g., DL/12345/67890"
            />
            <small className="text-muted">Provident Fund number</small>
          </div>

          <div className="col-md-6 mb-3">
            <label htmlFor="esiNumber" className="form-label">ESI Number</label>
            <input
              type="text"
              className="form-control"
              id="esiNumber"
              name="esiNumber"
              value={formData.bankDetails.esiNumber}
              onChange={handleChange}
              placeholder="e.g., 1234567890"
            />
            <small className="text-muted">Employee State Insurance number</small>
          </div>

          <div className="col-12 mb-4">
            <div className="card bg-light">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="bi bi-info-circle text-primary me-2"></i>
                  Important Information
                </h6>
                <ul className="mb-0 small">
                  <li><strong>Security:</strong> All sensitive data is encrypted and stored securely</li>
                  <li><strong>Accuracy:</strong> Ensure all details are correct to avoid payroll issues</li>
                  <li><strong>Updates:</strong> Notify HR immediately if any bank details change</li>
                  <li><strong>Verification:</strong> Some changes may require document verification</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
});

export default BankDetailsForm;
