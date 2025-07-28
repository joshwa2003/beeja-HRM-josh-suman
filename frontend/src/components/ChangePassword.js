import React, { useState } from 'react';
import { authAPI } from '../utils/api';

const ChangePassword = () => {
  const [step, setStep] = useState(1); // 1: Password form, 2: OTP verification
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: ''
  });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [otpSent, setOtpSent] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validatePasswords = () => {
    if (!formData.currentPassword) {
      setNotification({
        type: 'error',
        message: 'Current password is required'
      });
      return false;
    }

    if (!formData.newPassword) {
      setNotification({
        type: 'error',
        message: 'New password is required'
      });
      return false;
    }

    if (formData.newPassword.length < 6) {
      setNotification({
        type: 'error',
        message: 'New password must be at least 6 characters long'
      });
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setNotification({
        type: 'error',
        message: 'New password and confirm password do not match'
      });
      return false;
    }

    if (formData.currentPassword === formData.newPassword) {
      setNotification({
        type: 'error',
        message: 'New password must be different from current password'
      });
      return false;
    }

    return true;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    if (!validatePasswords()) {
      return;
    }

    setLoading(true);
    setNotification(null);

    try {
      const response = await authAPI.sendPasswordChangeOTP({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      if (response.data.success) {
        setOtpSent(true);
        setStep(2);
        setNotification({
          type: 'success',
          message: response.data.message
        });
      } else {
        setNotification({
          type: 'error',
          message: response.data.message || 'Failed to send OTP'
        });
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to send OTP. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!formData.otp) {
      setNotification({
        type: 'error',
        message: 'OTP is required'
      });
      return;
    }

    if (formData.otp.length !== 6) {
      setNotification({
        type: 'error',
        message: 'OTP must be 6 digits'
      });
      return;
    }

    setLoading(true);
    setNotification(null);

    try {
      const response = await authAPI.verifyOTPAndChangePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        otp: formData.otp
      });

      if (response.data.success) {
        setNotification({
          type: 'success',
          message: 'Password changed successfully!'
        });
        
        // Reset form after successful password change
        setTimeout(() => {
          setStep(1);
          setFormData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            otp: ''
          });
          setOtpSent(false);
          setNotification(null);
        }, 3000);
      } else {
        setNotification({
          type: 'error',
          message: response.data.message || 'Failed to verify OTP'
        });
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to verify OTP. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setNotification(null);

    try {
      const response = await authAPI.sendPasswordChangeOTP({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      if (response.data.success) {
        setNotification({
          type: 'success',
          message: 'OTP resent successfully!'
        });
      } else {
        setNotification({
          type: 'error',
          message: response.data.message || 'Failed to resend OTP'
        });
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      setNotification({
        type: 'error',
        message: error.response?.data?.message || 'Failed to resend OTP. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPasswordForm = () => {
    setStep(1);
    setOtpSent(false);
    setFormData(prev => ({
      ...prev,
      otp: ''
    }));
    setNotification(null);
  };

  return (
    <div className="container-fluid py-4">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <h4 className="card-title mb-0">
                <i className="bi bi-shield-lock me-2"></i>
                Change Password
              </h4>
            </div>
            <div className="card-body">
              {/* Notification */}
              {notification && (
                <div className={`alert alert-${notification.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`} role="alert">
                  <i className={`bi ${notification.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
                  {notification.message}
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setNotification(null)}
                  ></button>
                </div>
              )}

              {/* Step 1: Password Form */}
              {step === 1 && (
                <form onSubmit={handleSendOTP}>
                  <div className="mb-3">
                    <label htmlFor="currentPassword" className="form-label">
                      Current Password <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-lock"></i>
                      </span>
                      <input
                        type="password"
                        className="form-control"
                        id="currentPassword"
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        placeholder="Enter your current password"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="newPassword" className="form-label">
                      New Password <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-key"></i>
                      </span>
                      <input
                        type="password"
                        className="form-control"
                        id="newPassword"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        placeholder="Enter your new password"
                        required
                        minLength="6"
                        disabled={loading}
                      />
                    </div>
                    <div className="form-text">Password must be at least 6 characters long</div>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="confirmPassword" className="form-label">
                      Confirm New Password <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-key-fill"></i>
                      </span>
                      <input
                        type="password"
                        className="form-control"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Confirm your new password"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="d-grid">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Sending OTP...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-envelope me-2"></i>
                          Send OTP
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: OTP Verification */}
              {step === 2 && (
                <form onSubmit={handleVerifyOTP}>
                  <div className="text-center mb-4">
                    <i className="bi bi-envelope-check text-primary" style={{ fontSize: '3rem' }}></i>
                    <h5 className="mt-3">OTP Verification</h5>
                    <p className="text-muted">
                      We've sent a 6-digit OTP to your email address. 
                      Please enter it below to complete the password change.
                    </p>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="otp" className="form-label">
                      Enter OTP <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-shield-check"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control text-center"
                        id="otp"
                        name="otp"
                        value={formData.otp}
                        onChange={handleInputChange}
                        placeholder="000000"
                        required
                        maxLength="6"
                        pattern="[0-9]{6}"
                        disabled={loading}
                        style={{ fontSize: '1.2rem', letterSpacing: '0.5rem' }}
                      />
                    </div>
                    <div className="form-text">Enter the 6-digit code sent to your email</div>
                  </div>

                  <div className="d-grid gap-2">
                    <button
                      type="submit"
                      className="btn btn-success"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Verifying...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-lg me-2"></i>
                          Verify & Change Password
                        </>
                      )}
                    </button>

                    <div className="row">
                      <div className="col-6">
                        <button
                          type="button"
                          className="btn btn-outline-secondary w-100"
                          onClick={handleBackToPasswordForm}
                          disabled={loading}
                        >
                          <i className="bi bi-arrow-left me-2"></i>
                          Back
                        </button>
                      </div>
                      <div className="col-6">
                        <button
                          type="button"
                          className="btn btn-outline-primary w-100"
                          onClick={handleResendOTP}
                          disabled={loading}
                        >
                          <i className="bi bi-arrow-clockwise me-2"></i>
                          Resend OTP
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}

              {/* Security Notice */}
              <div className="mt-4 p-3 bg-light rounded">
                <h6 className="text-muted mb-2">
                  <i className="bi bi-info-circle me-1"></i>
                  Security Notice
                </h6>
                <small className="text-muted">
                  For your security, an OTP will be sent to your registered email address to verify this password change request.
                  The OTP will expire in 10 minutes.
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
