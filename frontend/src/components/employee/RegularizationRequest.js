import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { regularizationAPI } from '../../utils/api';

const RegularizationRequest = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    attendanceDate: '',
    requestType: '',
    reason: '',
    requestedCheckIn: '',
    requestedCheckOut: '',
    requestedStatus: 'Present',
    priority: 'Normal'
  });
  const [documents, setDocuments] = useState([]);
  const [config, setConfig] = useState({
    requestTypes: [],
    priorities: [],
    requestedStatuses: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [attendanceData, setAttendanceData] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (formData.attendanceDate) {
      fetchAttendanceData(formData.attendanceDate);
    }
  }, [formData.attendanceDate]);

  const fetchConfig = async () => {
    try {
      const response = await regularizationAPI.getRegularizationConfig();
      setConfig(response.data.data);
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const fetchAttendanceData = async (date) => {
    try {
      const response = await regularizationAPI.getEmployeeAttendance({ date });
      const attendance = response.data.data.find(record => 
        new Date(record.date).toDateString() === new Date(date).toDateString()
      );
      setAttendanceData(attendance);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setDocuments(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const submitData = new FormData();
      
      // Add form data
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          submitData.append(key, formData[key]);
        }
      });

      // Add documents
      documents.forEach(file => {
        submitData.append('documents', file);
      });

      await regularizationAPI.createRegularization(submitData);
      
      setSuccess('Regularization request submitted successfully!');
      setTimeout(() => {
        navigate('/admin/leave/my-attendance');
      }, 2000);
    } catch (error) {
      console.error('Error submitting regularization:', error);
      setError(error.response?.data?.message || error.message || 'Failed to submit regularization request');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'Not recorded';
    return new Date(dateTime).toLocaleString();
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Present': return 'bg-success';
      case 'Absent': return 'bg-danger';
      case 'Late': return 'bg-warning';
      case 'Half Day': return 'bg-info';
      case 'Work From Home': return 'bg-primary';
      default: return 'bg-secondary';
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">
                <i className="bi bi-clock-history me-2"></i>
                Attendance Regularization Request
              </h2>
              <p className="text-muted mb-0">Submit a request to regularize your attendance record</p>
            </div>
            <button 
              className="btn btn-outline-secondary"
              onClick={() => navigate('/admin/leave/my-attendance')}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Back to Attendance
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

      <div className="row">
        <div className="col-lg-8">
          {/* Regularization Form */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-primary bg-opacity-10 border-0">
              <h5 className="mb-0 text-primary">
                <i className="bi bi-form me-2"></i>
                Regularization Details
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  {/* Attendance Date */}
                  <div className="col-md-6">
                    <label className="form-label">
                      Attendance Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      name="attendanceDate"
                      value={formData.attendanceDate}
                      onChange={handleInputChange}
                      max={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  {/* Request Type */}
                  <div className="col-md-6">
                    <label className="form-label">
                      Request Type <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      name="requestType"
                      value={formData.requestType}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select request type</option>
                      {config.requestTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Requested Check-in Time */}
                  {['Missed Check-In', 'Missed Both', 'Late Arrival'].includes(formData.requestType) && (
                    <div className="col-md-6">
                      <label className="form-label">Requested Check-in Time</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        name="requestedCheckIn"
                        value={formData.requestedCheckIn}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}

                  {/* Requested Check-out Time */}
                  {['Missed Check-Out', 'Missed Both', 'Early Departure'].includes(formData.requestType) && (
                    <div className="col-md-6">
                      <label className="form-label">Requested Check-out Time</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        name="requestedCheckOut"
                        value={formData.requestedCheckOut}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}

                  {/* Requested Status */}
                  <div className="col-md-6">
                    <label className="form-label">Requested Status</label>
                    <select
                      className="form-select"
                      name="requestedStatus"
                      value={formData.requestedStatus}
                      onChange={handleInputChange}
                    >
                      <option value="Present">Present</option>
                      <option value="Half Day">Half Day</option>
                      <option value="Work From Home">Work From Home</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="col-md-6">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-select"
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                    >
                      {config.priorities.map(priority => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </div>

                  {/* Reason */}
                  <div className="col-12">
                    <label className="form-label">
                      Reason <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      rows="4"
                      placeholder="Please provide a detailed explanation for your regularization request..."
                      maxLength="500"
                      required
                    ></textarea>
                    <div className="form-text">
                      {formData.reason.length}/500 characters
                    </div>
                  </div>

                  {/* Supporting Documents */}
                  <div className="col-12">
                    <label className="form-label">Supporting Documents (Optional)</label>
                    <input
                      type="file"
                      className="form-control"
                      multiple
                      accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                      onChange={handleFileChange}
                    />
                    <div className="form-text">
                      Upload supporting documents (medical certificates, transport receipts, etc.). 
                      Max 5 files, 5MB each. Supported formats: JPG, PNG, PDF, DOC, DOCX
                    </div>
                    {documents.length > 0 && (
                      <div className="mt-2">
                        <small className="text-muted">Selected files:</small>
                        <ul className="list-unstyled mt-1">
                          {documents.map((file, index) => (
                            <li key={index} className="small">
                              <i className="bi bi-file-earmark me-1"></i>
                              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="col-12">
                    <div className="d-flex gap-2">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-send me-2"></i>
                            Submit Request
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => navigate('/admin/leave/my-attendance')}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          {/* Current Attendance Record */}
          {attendanceData && (
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-info bg-opacity-10 border-0">
                <h6 className="mb-0 text-info">
                  <i className="bi bi-info-circle me-2"></i>
                  Current Attendance Record
                </h6>
              </div>
              <div className="card-body">
                <div className="row g-2">
                  <div className="col-12">
                    <strong>Date:</strong> {new Date(attendanceData.date).toLocaleDateString()}
                  </div>
                  <div className="col-12">
                    <strong>Status:</strong> 
                    <span className={`badge ${getStatusBadgeClass(attendanceData.status)} ms-2`}>
                      {attendanceData.status}
                    </span>
                  </div>
                  <div className="col-12">
                    <strong>Check-in:</strong> {formatDateTime(attendanceData.checkIn)}
                  </div>
                  <div className="col-12">
                    <strong>Check-out:</strong> {formatDateTime(attendanceData.checkOut)}
                  </div>
                  {attendanceData.workingHours && (
                    <div className="col-12">
                      <strong>Working Hours:</strong> {attendanceData.workingHours.toFixed(2)} hours
                    </div>
                  )}
                  {attendanceData.isLate && (
                    <div className="col-12">
                      <strong>Late by:</strong> {attendanceData.lateBy} minutes
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Help Information */}
          <div className="card border-0 shadow-sm mt-3">
            <div className="card-header bg-warning bg-opacity-10 border-0">
              <h6 className="mb-0 text-warning">
                <i className="bi bi-lightbulb me-2"></i>
                When to Use Regularization
              </h6>
            </div>
            <div className="card-body">
              <ul className="list-unstyled small mb-0">
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Forgot to check-in or check-out
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  System or biometric issues
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Work from home or field work
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Medical or transport emergencies
                </li>
                <li className="mb-0">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  Late arrival due to valid reasons
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegularizationRequest;
