import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const LiveEmployeeStatus = () => {
  const { user } = useAuth();
  const [workingEmployees, setWorkingEmployees] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchCurrentlyWorkingEmployees();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchCurrentlyWorkingEmployees, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchCurrentlyWorkingEmployees = async () => {
    try {
      const response = await api.get('/attendance/currently-working');
      if (response.data.success) {
        setWorkingEmployees(response.data.currentlyWorking);
        setSummary(response.data.summary);
        setLastUpdated(new Date());
        setError('');
      }
    } catch (error) {
      console.error('Error fetching currently working employees:', error);
      setError('Failed to fetch employee status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatWorkTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (isLate, currentWorkMinutes) => {
    if (isLate) return 'danger';
    if (currentWorkMinutes > 480) return 'success'; // More than 8 hours
    if (currentWorkMinutes > 240) return 'warning'; // More than 4 hours
    return 'info';
  };

  const getStatusText = (isLate, currentWorkMinutes) => {
    if (isLate) return 'Late Arrival';
    if (currentWorkMinutes > 480) return 'Full Day';
    if (currentWorkMinutes > 240) return 'Half Day';
    return 'Just Started';
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4">
      {/* Header Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h1 className="h3 mb-1 text-dark fw-bold">
                <i className="bi bi-people-fill text-success me-3"></i>
                Live Employee Status
              </h1>
              <p className="text-muted mb-0">Real-time view of employees currently working</p>
            </div>
            <div className="d-flex align-items-center">
              <div className="badge bg-light text-dark px-3 py-2 me-3">
                <i className="bi bi-clock me-1"></i>
                Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
              </div>
              <button 
                className="btn btn-outline-primary"
                onClick={fetchCurrentlyWorkingEmployees}
                disabled={loading}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-danger">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-primary mb-2">
                <i className="bi bi-people" style={{fontSize: '2.5rem'}}></i>
              </div>
              <h3 className="fw-bold text-primary mb-1">{summary.totalEmployees || 0}</h3>
              <p className="text-muted mb-0">Total Employees</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-success mb-2">
                <i className="bi bi-person-check" style={{fontSize: '2.5rem'}}></i>
              </div>
              <h3 className="fw-bold text-success mb-1">{summary.currentlyWorking || 0}</h3>
              <p className="text-muted mb-0">Currently Working</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-info mb-2">
                <i className="bi bi-box-arrow-in-right" style={{fontSize: '2.5rem'}}></i>
              </div>
              <h3 className="fw-bold text-info mb-1">{summary.checkedInToday || 0}</h3>
              <p className="text-muted mb-0">Checked In Today</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-warning mb-2">
                <i className="bi bi-box-arrow-right" style={{fontSize: '2.5rem'}}></i>
              </div>
              <h3 className="fw-bold text-warning mb-1">{summary.checkedOutToday || 0}</h3>
              <p className="text-muted mb-0">Checked Out Today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Currently Working Employees */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-gradient text-white" style={{background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'}}>
              <h5 className="mb-0 fw-semibold">
                <i className="bi bi-broadcast me-2"></i>
                Currently Working Employees ({workingEmployees.length})
              </h5>
            </div>
            <div className="card-body p-0">
              {workingEmployees.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-person-x text-muted" style={{fontSize: '3rem'}}></i>
                  <h5 className="text-muted mt-3">No employees currently working</h5>
                  <p className="text-muted">All employees have either not checked in or have already checked out for today.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Check-in Time</th>
                        <th>Work Duration</th>
                        <th>Status</th>
                        <th>Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workingEmployees.map((record) => (
                        <tr key={record._id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="me-3">
                                {record.employee.profilePhoto ? (
                                  <img
                                    src={record.employee.profilePhoto}
                                    alt="Profile"
                                    className="rounded-circle"
                                    style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center"
                                       style={{ width: '40px', height: '40px' }}>
                                    <i className="bi bi-person text-white"></i>
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="fw-semibold">
                                  {record.employee.firstName} {record.employee.lastName}
                                </div>
                                <small className="text-muted">{record.employee.role}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark">
                              {record.employee.department || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <div className="fw-semibold">{formatTime(record.checkIn)}</div>
                            {record.isLate && (
                              <small className="text-danger">
                                <i className="bi bi-exclamation-triangle me-1"></i>
                                {record.lateMinutes}min late
                              </small>
                            )}
                          </td>
                          <td>
                            <div className="fw-bold text-primary">
                              {formatWorkTime(record.currentWorkMinutes || 0)}
                            </div>
                            <small className="text-muted">
                              {(record.currentWorkHours || 0).toFixed(1)} hours
                            </small>
                          </td>
                          <td>
                            <span className={`badge bg-${getStatusColor(record.isLate, record.currentWorkMinutes || 0)}`}>
                              {getStatusText(record.isLate, record.currentWorkMinutes || 0)}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <i className={`bi ${record.location === 'Office' ? 'bi-building' : record.location === 'Remote' ? 'bi-house' : 'bi-geo-alt'} me-1`}></i>
                              {record.location || 'Office'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="row mt-3">
        <div className="col-12">
          <div className="text-center">
            <small className="text-muted">
              <i className="bi bi-arrow-clockwise me-1"></i>
              Auto-refreshes every 30 seconds
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveEmployeeStatus;
