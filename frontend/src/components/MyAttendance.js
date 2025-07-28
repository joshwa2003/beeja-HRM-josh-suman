import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { attendanceAPI, regularizationAPI } from '../utils/api';
import mouseActivityService from '../services/mouseActivityService';

const MyAttendance = () => {
  // eslint-disable-next-line no-unused-vars
  const { user } = useAuth();
  const navigate = useNavigate();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);
  const [showLateModal, setShowLateModal] = useState(false);
  const [lateArrivalData, setLateArrivalData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [location, setLocation] = useState('Office');
  const [notes, setNotes] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [regularizations, setRegularizations] = useState([]);
  const [showRegularizations, setShowRegularizations] = useState(false);
  const [workHours, setWorkHours] = useState({ checkInTime: '13:00', checkOutTime: '21:00' });
  const [smartOvertimeInfo, setSmartOvertimeInfo] = useState(null);
  const [activityStatus, setActivityStatus] = useState({ isTracking: false });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRegularization, setSelectedRegularization] = useState(null);

  // Update current time every minute for live work hours calculation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const fetchTodayAttendance = useCallback(async () => {
    try {
      const response = await attendanceAPI.getTodayAttendance();
      setTodayAttendance(response.data.attendance);
    } catch (error) {
      console.error('Error fetching today attendance:', error);
    }
  }, []);

  const fetchAttendanceHistory = useCallback(async () => {
    try {
      const response = await attendanceAPI.getMyAttendance({
        month: selectedMonth,
        year: selectedYear,
        limit: 31
      });
      setAttendanceHistory(response.data.attendance);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    }
  }, [selectedMonth, selectedYear]);

  const fetchAttendanceSummary = useCallback(async () => {
    try {
      const response = await attendanceAPI.getAttendanceSummary({
        month: selectedMonth,
        year: selectedYear
      });
      setAttendanceSummary(response.data.summary);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  const fetchRegularizations = useCallback(async () => {
    try {
      const response = await regularizationAPI.getMyRegularizations({ limit: 100 });
      
      if (response.data.success) {
        const data = response.data.data;
        setRegularizations(data.docs || data || []);
      } else {
        setRegularizations([]);
      }
    } catch (error) {
      console.error('Error fetching regularizations:', error);
      setRegularizations([]);
    }
  }, []);

  const fetchWorkHours = useCallback(async () => {
    try {
      const response = await fetch('/api/system/work-hours', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.workHours) {
          setWorkHours({
            checkInTime: data.workHours.checkInTime || '09:00',
            checkOutTime: data.workHours.checkOutTime || '18:00'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching work hours:', error);
      // Fallback to default values
      setWorkHours({ checkInTime: '09:00', checkOutTime: '18:00' });
    }
  }, []);

  useEffect(() => {
    fetchTodayAttendance();
    fetchAttendanceHistory();
    fetchAttendanceSummary();
    fetchRegularizations();
    fetchWorkHours();
  }, [fetchTodayAttendance, fetchAttendanceHistory, fetchAttendanceSummary, fetchRegularizations, fetchWorkHours]);

  // Mouse activity tracking effect
  useEffect(() => {
    // Start tracking if user is checked in but not checked out
    if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
      mouseActivityService.startTracking();
    } else {
      mouseActivityService.stopTracking();
    }

    // Update activity status periodically
    const activityInterval = setInterval(() => {
      setActivityStatus(mouseActivityService.getActivityStatus());
    }, 30000); // Update every 30 seconds

    return () => {
      clearInterval(activityInterval);
      mouseActivityService.stopTracking();
    };
  }, [todayAttendance]);

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      const response = await attendanceAPI.checkIn({
        location,
        notes
      });
      
      setTodayAttendance(response.data.attendance);
      setNotes('');
      
      // Check if employee arrived late (more than 59 seconds after standard time)
      if (response.data.isLateArrival && response.data.lateMinutes > 0) {
        setLateArrivalData({
          lateMinutes: response.data.lateMinutes,
          checkInTime: response.data.attendance.checkIn
        });
        setShowLateModal(true);
      } else {
        // Show success message for on-time or early arrival
        alert('Check-in successful!');
      }
      
      // Refresh data
      fetchAttendanceHistory();
      fetchAttendanceSummary();
    } catch (error) {
      alert(error.response?.data?.message || 'Check-in failed');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckOutLoading(true);
    try {
      const response = await attendanceAPI.checkOut({
        notes
      });
      
      setTodayAttendance(response.data.attendance);
      setSmartOvertimeInfo(response.data.smartOvertimeInfo);
      setNotes('');
      
      // Stop mouse activity tracking
      mouseActivityService.stopTracking();
      
      // Show success message with smart overtime info
      if (response.data.smartOvertimeInfo) {
        const info = response.data.smartOvertimeInfo;
        let message = 'Check-out successful!';
        
        if (info.shortageHours > 0 && info.adjustedOvertimeHours > 0) {
          message += `\n\nSmart Overtime Applied:\n• Shortage Hours Reduced: ${formatDuration(info.shortageHours)}\n• Final Overtime: ${formatDuration(info.adjustedOvertimeHours)}`;
        } else if (info.shortageHours > 0) {
          message += `\n\nShortage Hours Reduced: ${formatDuration(info.shortageHours)}`;
        } else if (info.adjustedOvertimeHours > 0) {
          message += `\n\nOvertime Earned: ${formatDuration(info.adjustedOvertimeHours)}`;
        }
        
        alert(message);
      } else {
        alert('Check-out successful!');
      }
      
      // Refresh data
      fetchAttendanceHistory();
      fetchAttendanceSummary();
    } catch (error) {
      alert(error.response?.data?.message || 'Check-out failed');
    } finally {
      setCheckOutLoading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (hours) => {
    if (!hours) return '0h 0m';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatDelayTime = (minutes) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (mins > 0 || hours === 0) result += `${mins}m`;
    
    return result.trim();
  };

  const formatWorkTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Helper function to get file icon based on mime type
  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return 'bi-file-earmark-image';
    if (mimeType?.includes('pdf')) return 'bi-file-earmark-pdf';
    if (mimeType?.includes('word')) return 'bi-file-earmark-word';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return 'bi-file-earmark-excel';
    return 'bi-file-earmark';
  };

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper function to check if file is previewable
  const isPreviewable = (mimeType) => {
    return mimeType?.startsWith('image/') || mimeType?.includes('pdf');
  };

  // Handle file download
  const handleFileDownload = (document) => {
    const downloadUrl = `http://localhost:5001${document.fileUrl}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = document.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle file preview
  const handleFilePreview = (document) => {
    const previewUrl = `http://localhost:5001${document.fileUrl}`;
    window.open(previewUrl, '_blank');
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'Urgent': return 'bg-danger';
      case 'High': return 'bg-warning';
      case 'Normal': return 'bg-info';
      case 'Low': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  };

  const calculateCurrentWorkHours = (checkInTime) => {
    if (!checkInTime) return '0h 0m';
    
    const checkIn = new Date(checkInTime);
    const now = currentTime; // Use state-managed current time for live updates
    const timeDiff = now.getTime() - checkIn.getTime();
    const totalMinutes = Math.floor(timeDiff / (1000 * 60));
    
    if (totalMinutes <= 0) return '0h 0m';
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours}h ${minutes}m`;
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'Present': 'bg-success',
      'Absent': 'bg-danger',
      'Late': 'bg-warning',
      'Half Day': 'bg-info',
      'On Leave': 'bg-secondary',
      'Holiday': 'bg-primary'
    };
    
    return (
      <span className={`badge ${statusClasses[status] || 'bg-secondary'}`}>
        {status}
      </span>
    );
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
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>
              <i className="bi bi-clock me-2"></i>
              My Attendance
            </h2>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-primary"
                onClick={() => navigate('/employee/regularization/request')}
              >
                <i className="bi bi-clock-history me-2"></i>
                Request Regularization
              </button>
              <button
                className="btn btn-outline-info"
                onClick={() => setShowRegularizations(!showRegularizations)}
              >
                <i className="bi bi-list-check me-2"></i>
                My Requests ({regularizations.length})
              </button>
              <select 
                className="form-select" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{ width: 'auto' }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select 
                className="form-select" 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{ width: 'auto' }}
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - 5 + i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Attendance Card */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                <i className="bi bi-calendar-day me-2"></i>
                Today's Attendance - {formatDate(new Date())}
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="row">
                    <div className="col-6">
                      <div className="text-center p-3 border rounded">
                        <h6 className="text-muted mb-1">Check In</h6>
                        <h4 className="mb-0 text-success">
                          {formatTime(todayAttendance?.checkIn)}
                        </h4>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="text-center p-3 border rounded">
                        <h6 className="text-muted mb-1">Check Out</h6>
                        <h4 className="mb-0 text-danger">
                          {formatTime(todayAttendance?.checkOut)}
                        </h4>
                      </div>
                    </div>
                  </div>
                  <div className="row mt-3">
                    <div className="col-6">
                      <div className="text-center p-3 border rounded">
                        <h6 className="text-muted mb-1">
                          {todayAttendance?.checkOut ? 'Total Hours' : 'Current Hours'}
                        </h6>
                        <h4 className="mb-0 text-info">
                          {todayAttendance?.checkOut 
                            ? formatDuration(todayAttendance?.totalHours)
                            : calculateCurrentWorkHours(todayAttendance?.checkIn)
                          }
                        </h4>
                        {!todayAttendance?.checkOut && todayAttendance?.checkIn && (
                          <small className="text-muted">
                            <i className="bi bi-clock me-1"></i>
                            Live counter
                          </small>
                        )}
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="text-center p-3 border rounded">
                        <h6 className="text-muted mb-1">Status</h6>
                        <h4 className="mb-0">
                          {todayAttendance ? getStatusBadge(todayAttendance.status) : getStatusBadge('Absent')}
                        </h4>
                        {todayAttendance?.autoCheckedOut && (
                          <small className="text-info d-block mt-1">
                            <i className="bi bi-robot"></i> Auto-checked out
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card bg-light">
                    <div className="card-body">
                      <h6 className="card-title">Quick Actions</h6>
                      
                      {/* Location Selection */}
                      <div className="mb-3">
                        <label className="form-label">Location</label>
                        <select 
                          className="form-select" 
                          value={location} 
                          onChange={(e) => setLocation(e.target.value)}
                          disabled={todayAttendance?.checkIn && todayAttendance?.checkOut}
                        >
                          <option value="Office">Office</option>
                          <option value="Remote">Remote</option>
                          <option value="Client Site">Client Site</option>
                        </select>
                      </div>

                      {/* Notes */}
                      <div className="mb-3">
                        <label className="form-label">Notes (Optional)</label>
                        <textarea 
                          className="form-control" 
                          rows="2" 
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add any notes..."
                          maxLength="300"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="d-grid gap-2">
                        {!todayAttendance?.checkIn ? (
                          <button 
                            className="btn btn-success" 
                            onClick={handleCheckIn}
                            disabled={checkInLoading}
                          >
                            {checkInLoading ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Checking In...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-box-arrow-in-right me-2"></i>
                                Check In
                              </>
                            )}
                          </button>
                        ) : !todayAttendance?.checkOut ? (
                          <button 
                            className="btn btn-danger" 
                            onClick={handleCheckOut}
                            disabled={checkOutLoading}
                          >
                            {checkOutLoading ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Checking Out...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-box-arrow-right me-2"></i>
                                Check Out
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="alert alert-success mb-0">
                            <i className="bi bi-check-circle me-2"></i>
                            You have completed your attendance for today!
                            {smartOvertimeInfo && (
                              <div className="mt-2">
                                <small className="d-block">
                                  <strong>Smart Overtime Summary:</strong>
                                </small>
                                {smartOvertimeInfo.shortageHours > 0 && (
                                  <small className="d-block text-warning">
                                    <i className="bi bi-clock-history"></i> Shortage Reduced: {formatDuration(smartOvertimeInfo.shortageHours)}
                                  </small>
                                )}
                                {smartOvertimeInfo.adjustedOvertimeHours > 0 && (
                                  <small className="d-block text-success">
                                    <i className="bi bi-plus-circle"></i> Final Overtime: {formatDuration(smartOvertimeInfo.adjustedOvertimeHours)}
                                  </small>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* My Regularization Requests */}
      {showRegularizations && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header bg-info bg-opacity-10">
                <h5 className="mb-0 text-info">
                  <i className="bi bi-list-check me-2"></i>
                  My Regularization Requests
                </h5>
              </div>
              <div className="card-body">
                {regularizations.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Request ID</th>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Submitted</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regularizations.slice(0, 5).map((reg) => (
                          <tr key={reg._id}>
                            <td>
                              <small className="font-monospace">{reg.regularizationId}</small>
                            </td>
                            <td>{new Date(reg.attendanceDate).toLocaleDateString()}</td>
                            <td>
                              <span className="badge bg-info bg-opacity-75 text-dark">
                                {reg.requestType}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${
                                reg.status === 'Pending' ? 'bg-warning' :
                                reg.status === 'Approved' ? 'bg-success' :
                                reg.status === 'Rejected' ? 'bg-danger' : 'bg-secondary'
                              }`}>
                                {reg.status}
                              </span>
                            </td>
                            <td>
                              <small>{new Date(reg.submittedDate).toLocaleDateString()}</small>
                            </td>
                            <td>
                              <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => {
                                  setSelectedRegularization(reg);
                                  setShowDetailsModal(true);
                                }}
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <i className="bi bi-inbox text-muted" style={{ fontSize: '2rem' }}></i>
                    <p className="text-muted mt-2 mb-0">No regularization requests found</p>
                    <button
                      className="btn btn-primary btn-sm mt-2"
                      onClick={() => navigate('/employee/regularization/request')}
                    >
                      <i className="bi bi-plus-circle me-1"></i>
                      Create Request
                    </button>
                  </div>
                )}
                {regularizations.length > 5 && (
                  <div className="text-center mt-3">
                    <button
                      className="btn btn-outline-info btn-sm"
                      onClick={() => navigate('/employee/regularization')}
                    >
                      View All Requests ({regularizations.length})
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Summary */}
      {attendanceSummary && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="bi bi-graph-up me-2"></i>
                  Monthly Summary - {new Date(0, selectedMonth - 1).toLocaleString('en-US', { month: 'long' })} {selectedYear}
                </h5>
              </div>
              <div className="card-body">
                <div className="row text-center">
                  <div className="col-lg-2 col-md-3 col-sm-4 col-6 mb-3">
                    <div className="p-3 border rounded h-100">
                      <h4 className="text-primary mb-1">{attendanceSummary.totalDays}</h4>
                      <small className="text-muted">Total Days</small>
                    </div>
                  </div>
                  <div className="col-lg-2 col-md-3 col-sm-4 col-6 mb-3">
                    <div className="p-3 border rounded h-100">
                      <h4 className="text-success mb-1">{attendanceSummary.presentDays}</h4>
                      <small className="text-muted">Present</small>
                    </div>
                  </div>
                  <div className="col-lg-2 col-md-3 col-sm-4 col-6 mb-3">
                    <div className="p-3 border rounded h-100">
                      <h4 className="text-danger mb-1">{attendanceSummary.absentDays}</h4>
                      <small className="text-muted">Absent</small>
                    </div>
                  </div>
                  <div className="col-lg-2 col-md-3 col-sm-4 col-6 mb-3">
                    <div className="p-3 border rounded h-100">
                      <h4 className="text-warning mb-1">{attendanceSummary.lateDays}</h4>
                      <small className="text-muted">Late Days</small>
                    </div>
                  </div>
                  <div className="col-lg-2 col-md-3 col-sm-4 col-6 mb-3">
                    <div className="p-3 border rounded h-100">
                      <h4 className="text-info mb-1">{formatDuration(attendanceSummary.totalHours)}</h4>
                      <small className="text-muted">Total Hours</small>
                    </div>
                  </div>
                  <div className="col-lg-2 col-md-3 col-sm-4 col-6 mb-3">
                    <div className="p-3 border rounded h-100">
                      <h4 className="text-secondary mb-1">{formatDuration(attendanceSummary.overtimeHours)}</h4>
                      <small className="text-muted">Overtime</small>
                    </div>
                  </div>
                  <div className="col-lg-2 col-md-3 col-sm-4 col-6 mb-3">
                    <div className="p-3 border rounded h-100">
                      <h4 className="text-danger mb-1">{formatDuration(attendanceSummary.shortageHours || 0)}</h4>
                      <small className="text-muted">Shortage Hours</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance History */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Attendance History
              </h5>
            </div>
            <div className="card-body">
              {attendanceHistory.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Total Hours</th>
                        <th>Status</th>
                        <th>Location</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceHistory.map((record) => (
                        <tr key={record._id}>
                          <td>{formatDate(record.date)}</td>
                          <td>
                            {formatTime(record.checkIn)}
                            {record.isLate && (
                              <small className="text-warning ms-1">
                                <i className="bi bi-exclamation-triangle"></i>
                                Late by {formatDelayTime(record.lateMinutes)}
                              </small>
                            )}
                          </td>
                          <td>
                            {formatTime(record.checkOut)}
                            {record.isEarly && (
                              <small className="text-info ms-1">
                                <i className="bi bi-info-circle"></i>
                                Early by {formatDelayTime(record.earlyMinutes)}
                              </small>
                            )}
                          </td>
                          <td>
                            {record.checkOut 
                              ? formatDuration(record.totalHours)
                              : calculateCurrentWorkHours(record.checkIn)
                            }
                            {!record.checkOut && record.checkIn && (
                              <small className="text-info ms-1">
                                <i className="bi bi-clock me-1"></i>
                                Current
                              </small>
                            )}
                            {record.overtime > 0 && (
                              <small className="text-success ms-1">
                                <i className="bi bi-plus-circle"></i>
                                +{formatDuration(record.overtime)} OT
                              </small>
                            )}
                            {record.shortageHours > 0 && (
                              <small className="text-warning ms-1">
                                <i className="bi bi-dash-circle"></i>
                                -{formatDuration(record.shortageHours)} Shortage
                              </small>
                            )}
                            {record.adjustedOvertimeHours > 0 && record.adjustedOvertimeHours !== record.overtime && (
                              <small className="text-info ms-1">
                                <i className="bi bi-arrow-right"></i>
                                Smart: {formatDuration(record.adjustedOvertimeHours)}
                              </small>
                            )}
                          </td>
                          <td>{getStatusBadge(record.status)}</td>
                          <td>
                            <span className="badge bg-light text-dark">
                              {record.location}
                            </span>
                          </td>
                          <td>
                            {record.notes && (
                              <small className="text-muted">{record.notes}</small>
                            )}
                            {record.isRegularized && (
                              <small className="text-warning d-block">
                                <i className="bi bi-pencil-square"></i>
                                Regularized
                              </small>
                            )}
                            {record.autoCheckedOut && (
                              <small className="text-info d-block">
                                <i className="bi bi-robot"></i>
                                Auto-checked out
                              </small>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-calendar-x text-muted" style={{ fontSize: '3rem' }}></i>
                  <h5 className="text-muted mt-2">No attendance records found</h5>
                  <p className="text-muted">
                    No attendance records found for {new Date(0, selectedMonth - 1).toLocaleString('en-US', { month: 'long' })} {selectedYear}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRegularization && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-file-text me-2"></i>
                  Regularization Request Details
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowDetailsModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  {/* Left Column - Basic Details */}
                  <div className="col-md-6">
                    <div className="card border-0 shadow-sm mb-3">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">
                          <i className="bi bi-calendar me-2"></i>
                          Request Information
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-sm-6">
                            <strong>Request ID:</strong>
                            <p className="mb-2">{selectedRegularization.regularizationId}</p>
                          </div>
                          <div className="col-sm-6">
                            <strong>Date:</strong>
                            <p className="mb-2">{formatDate(selectedRegularization.attendanceDate)}</p>
                          </div>
                          <div className="col-sm-6">
                            <strong>Type:</strong>
                            <p className="mb-2">
                              <span className="badge bg-info">{selectedRegularization.requestType}</span>
                            </p>
                          </div>
                          <div className="col-sm-6">
                            <strong>Priority:</strong>
                            <p className="mb-2">
                              <span className={`badge ${getPriorityBadgeClass(selectedRegularization.priority)}`}>
                                {selectedRegularization.priority}
                              </span>
                            </p>
                          </div>
                          <div className="col-12">
                            <strong>Reason:</strong>
                            <p className="mb-2">{selectedRegularization.reason}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Time Details */}
                    {(selectedRegularization.requestedCheckIn || selectedRegularization.requestedCheckOut) && (
                      <div className="card border-0 shadow-sm mb-3">
                        <div className="card-header bg-light">
                          <h6 className="mb-0">
                            <i className="bi bi-clock me-2"></i>
                            Requested Times
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row">
                            {selectedRegularization.requestedCheckIn && (
                              <div className="col-sm-6">
                                <strong>Check-In:</strong>
                                <p className="mb-2">{formatTime(selectedRegularization.requestedCheckIn)}</p>
                              </div>
                            )}
                            {selectedRegularization.requestedCheckOut && (
                              <div className="col-sm-6">
                                <strong>Check-Out:</strong>
                                <p className="mb-2">{formatTime(selectedRegularization.requestedCheckOut)}</p>
                              </div>
                            )}
                            {selectedRegularization.requestedStatus && (
                              <div className="col-12">
                                <strong>Requested Status:</strong>
                                <p className="mb-2">
                                  <span className="badge bg-secondary">{selectedRegularization.requestedStatus}</span>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Status & Attachments */}
                  <div className="col-md-6">
                    <div className="card border-0 shadow-sm mb-3">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">
                          <i className="bi bi-info-circle me-2"></i>
                          Status Information
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-sm-6">
                            <strong>Current Status:</strong>
                            <p className="mb-2">
                              <span className={`badge ${
                                selectedRegularization.status === 'Pending' ? 'bg-warning' :
                                selectedRegularization.status === 'Approved' ? 'bg-success' :
                                selectedRegularization.status === 'Rejected' ? 'bg-danger' : 'bg-secondary'
                              }`}>
                                {selectedRegularization.status}
                              </span>
                            </p>
                          </div>
                          <div className="col-sm-6">
                            <strong>Current Level:</strong>
                            <p className="mb-2">
                              <span className="badge bg-secondary">{selectedRegularization.currentLevel || 'Team Manager'}</span>
                            </p>
                          </div>
                          <div className="col-sm-6">
                            <strong>Submitted:</strong>
                            <p className="mb-2">{formatDate(selectedRegularization.submittedDate)}</p>
                          </div>
                          {selectedRegularization.approvedDate && (
                            <div className="col-sm-6">
                              <strong>Approved:</strong>
                              <p className="mb-2">{formatDate(selectedRegularization.approvedDate)}</p>
                            </div>
                          )}
                          {selectedRegularization.rejectedDate && (
                            <div className="col-sm-6">
                              <strong>Rejected:</strong>
                              <p className="mb-2">{formatDate(selectedRegularization.rejectedDate)}</p>
                            </div>
                          )}
                          {selectedRegularization.rejectionReason && (
                            <div className="col-12">
                              <strong>Rejection Reason:</strong>
                              <p className="mb-2 text-danger">{selectedRegularization.rejectionReason}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Supporting Documents */}
                    {selectedRegularization.supportingDocuments && selectedRegularization.supportingDocuments.length > 0 && (
                      <div className="card border-0 shadow-sm mb-3">
                        <div className="card-header bg-light">
                          <h6 className="mb-0">
                            <i className="bi bi-paperclip me-2"></i>
                            Supporting Documents ({selectedRegularization.supportingDocuments.length})
                          </h6>
                        </div>
                        <div className="card-body">
                          {selectedRegularization.supportingDocuments.map((document, index) => (
                            <div key={index} className="border rounded p-3 mb-3">
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center">
                                  <i className={`${getFileIcon(document.mimeType)} text-primary me-2`} style={{ fontSize: '1.5rem' }}></i>
                                  <div>
                                    <div className="fw-bold">{document.originalName}</div>
                                    <small className="text-muted">
                                      {formatFileSize(document.fileSize)} • Uploaded {formatDate(document.uploadedAt)}
                                    </small>
                                  </div>
                                </div>
                                <div className="btn-group btn-group-sm">
                                  {isPreviewable(document.mimeType) && (
                                    <button
                                      className="btn btn-outline-primary"
                                      onClick={() => handleFilePreview(document)}
                                      title="Preview"
                                    >
                                      <i className="bi bi-eye"></i>
                                    </button>
                                  )}
                                  <button
                                    className="btn btn-outline-success"
                                    onClick={() => handleFileDownload(document)}
                                    title="Download"
                                  >
                                    <i className="bi bi-download"></i>
                                  </button>
                                </div>
                              </div>
                              
                              {/* Image Preview */}
                              {document.mimeType?.startsWith('image/') && (
                                <div className="mt-3">
                                  <img
                                    src={`http://localhost:5001${document.fileUrl}`}
                                    alt={document.originalName}
                                    className="img-fluid rounded"
                                    style={{ maxHeight: '200px', cursor: 'pointer' }}
                                    onClick={() => handleFilePreview(document)}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Approval History */}
                    <div className="card border-0 shadow-sm">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">
                          <i className="bi bi-clock-history me-2"></i>
                          Approval History
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="timeline">
                          {/* Team Manager Approval */}
                          {selectedRegularization.teamManagerApproval?.status !== 'Pending' && (
                            <div className="timeline-item mb-3">
                              <div className="d-flex align-items-center">
                                <div className={`badge ${selectedRegularization.teamManagerApproval?.status === 'Approved' ? 'bg-success' : 'bg-danger'} me-2`}>
                                  <i className={`bi ${selectedRegularization.teamManagerApproval?.status === 'Approved' ? 'bi-check' : 'bi-x'}`}></i>
                                </div>
                                <div>
                                  <strong>Team Manager</strong>
                                  {selectedRegularization.teamManagerApproval?.approver && (
                                    <div className="text-muted small">
                                      {selectedRegularization.teamManagerApproval.approver.firstName} {selectedRegularization.teamManagerApproval.approver.lastName}
                                    </div>
                                  )}
                                  {selectedRegularization.teamManagerApproval?.actionDate && (
                                    <div className="text-muted small">
                                      {formatDate(selectedRegularization.teamManagerApproval.actionDate)}
                                    </div>
                                  )}
                                  {selectedRegularization.teamManagerApproval?.comments && (
                                    <div className="text-muted small mt-1">
                                      <em>"{selectedRegularization.teamManagerApproval.comments}"</em>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* HR Approval */}
                          {selectedRegularization.hrApproval?.status !== 'Pending' && (
                            <div className="timeline-item mb-3">
                              <div className="d-flex align-items-center">
                                <div className={`badge ${selectedRegularization.hrApproval?.status === 'Approved' ? 'bg-success' : 'bg-danger'} me-2`}>
                                  <i className={`bi ${selectedRegularization.hrApproval?.status === 'Approved' ? 'bi-check' : 'bi-x'}`}></i>
                                </div>
                                <div>
                                  <strong>HR / VP</strong>
                                  {selectedRegularization.hrApproval?.approver && (
                                    <div className="text-muted small">
                                      {selectedRegularization.hrApproval.approver.firstName} {selectedRegularization.hrApproval.approver.lastName}
                                    </div>
                                  )}
                                  {selectedRegularization.hrApproval?.actionDate && (
                                    <div className="text-muted small">
                                      {formatDate(selectedRegularization.hrApproval.actionDate)}
                                    </div>
                                  )}
                                  {selectedRegularization.hrApproval?.comments && (
                                    <div className="text-muted small mt-1">
                                      <em>"{selectedRegularization.hrApproval.comments}"</em>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Show current pending level */}
                          {selectedRegularization.status === 'Pending' && (
                            <div className="timeline-item mb-3">
                              <div className="d-flex align-items-center">
                                <div className="badge bg-warning me-2">
                                  <i className="bi bi-clock"></i>
                                </div>
                                <div>
                                  <strong>{selectedRegularization.currentLevel || 'Team Manager'}</strong>
                                  <br />
                                  <small className="text-muted">Pending approval</small>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Late Arrival Modal */}
      {showLateModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Late Arrival Notice
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowLateModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="text-center mb-3">
                  <i className="bi bi-clock text-warning" style={{ fontSize: '3rem' }}></i>
                </div>
                <div className="alert alert-warning">
                  <h6 className="alert-heading">You have arrived late today!</h6>
                  <hr />
                  <div className="row">
                    <div className="col-6">
                      <small className="text-muted">Expected Check-in:</small>
                      <div className="fw-bold">{formatWorkTime(workHours.checkInTime)}</div>
                    </div>
                    <div className="col-6">
                      <small className="text-muted">Your Check-in:</small>
                      <div className="fw-bold text-warning">
                        {lateArrivalData && formatTime(lateArrivalData.checkInTime)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <span className="badge bg-warning text-dark fs-6">
                      <i className="bi bi-stopwatch me-1"></i>
                      Late by {lateArrivalData && formatDelayTime(lateArrivalData.lateMinutes)}
                    </span>
                  </div>
                </div>
                <div className="alert alert-info">
                  <small>
                    <i className="bi bi-info-circle me-1"></i>
                    <strong>Note:</strong> Your attendance has been marked as "Late and Present". 
                    Late threshold is 59 seconds after the scheduled check-in time ({formatWorkTime(workHours.checkInTime)}).
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-warning" 
                  onClick={() => setShowLateModal(false)}
                >
                  <i className="bi bi-check-circle me-1"></i>
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAttendance;
