import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api, { authAPI } from '../utils/api';
import { supabase } from '../utils/supabase';

const MyProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordChangeStep, setPasswordChangeStep] = useState(1); // 1: Verify current password, 2: Enter new passwords, 3: Enter OTP
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: ''
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [currentPasswordVerified, setCurrentPasswordVerified] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  // Listen for profile updates from EditProfile
  useEffect(() => {
    const handleProfileUpdate = () => {
      fetchProfileData();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  const fetchProfileData = async () => {
    try {
      const response = await api.get('/auth/profile');
      setProfileData(response.data.user);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: 'bi-person' },
    { id: 'work', label: 'Work Info', icon: 'bi-briefcase' },
    { id: 'documents', label: 'Documents', icon: 'bi-file-text' },
    { id: 'emergency', label: 'Emergency Contact', icon: 'bi-person-exclamation' },
    { id: 'bank', label: 'Bank & Salary', icon: 'bi-bank' },
    { id: 'leave', label: 'Leave Summary', icon: 'bi-calendar-check' },
    { id: 'attendance', label: 'Attendance', icon: 'bi-clock' },
    { id: 'payslips', label: 'Payslips', icon: 'bi-receipt' },
    { id: 'performance', label: 'Performance', icon: 'bi-graph-up' },
    { id: 'settings', label: 'Settings', icon: 'bi-gear' },
    { id: 'trainings', label: 'Trainings', icon: 'bi-book' },
    { id: 'notifications', label: 'Notifications', icon: 'bi-bell' },
    { id: 'security', label: 'Security', icon: 'bi-shield-lock' }
  ];

  const maskAccountNumber = (accountNumber) => {
    if (!accountNumber) return 'Not provided';
    return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
  };

  const formatDate = (date) => {
    if (!date) return 'Not provided';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      );
    }

    if (!profileData) {
      return <div className="alert alert-warning">Unable to load profile data</div>;
    }

    switch (activeTab) {
      case 'personal':
        return (
          <div className="row">
            <div className="col-md-4 d-flex justify-content-center align-items-start mb-4" style={{ paddingTop: '10px' }}>
              <div className="profile-photo-container">
                <div 
                  className="rounded-circle mb-3 d-flex align-items-center justify-content-center bg-light border"
                  style={{ width: '150px', height: '150px' }}
                >
                  {profileData.profilePhoto ? (
                    <img
                      src={profileData.profilePhoto}
                      alt="Profile"
                      className="rounded-circle"
                      style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                    />
                  ) : (
                    <i className="bi bi-person-circle text-muted" style={{ fontSize: '80px' }}></i>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-8">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Full Name</label>
                  <p className="form-control-plaintext">{profileData.firstName} {profileData.lastName}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Date of Birth</label>
                  <p className="form-control-plaintext">{formatDate(profileData.dateOfBirth)}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Gender</label>
                  <p className="form-control-plaintext">{profileData.gender || 'Not specified'}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Phone Number</label>
                  <p className="form-control-plaintext">{profileData.phoneNumber || 'Not provided'}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Email</label>
                  <p className="form-control-plaintext">{profileData.email}</p>
                </div>
                <div className="col-12 mb-3">
                  <label className="form-label fw-bold">Address</label>
                  <p className="form-control-plaintext">
                    {profileData.address ? 
                      `${profileData.address.street || ''}, ${profileData.address.city || ''}, ${profileData.address.state || ''} ${profileData.address.zipCode || ''}, ${profileData.address.country || ''}`.replace(/^,\s*|,\s*$/g, '') 
                      : 'Not provided'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'work':
        return (
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Employee ID</label>
              <p className="form-control-plaintext">{profileData.employeeId}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Department</label>
              <p className="form-control-plaintext">{profileData.department}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Team Name</label>
              <p className="form-control-plaintext">{profileData.teamName || 'Not assigned'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Role/Designation</label>
              <p className="form-control-plaintext">{profileData.role}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Reporting Manager</label>
              <p className="form-control-plaintext">{profileData.reportingManager?.firstName || 'Not assigned'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Joining Date</label>
              <p className="form-control-plaintext">{formatDate(profileData.joiningDate)}</p>
            </div>
          </div>
        );

      case 'documents':
        const documentTypes = [
          { key: 'idProof', name: 'ID Proof (Aadhar Card)', icon: 'bi-person-badge', required: true },
          { key: 'offerLetter', name: 'Offer Letter', icon: 'bi-briefcase', required: true },
          { key: 'educationalCertificates', name: 'Educational Certificates', icon: 'bi-mortarboard', required: true },
          { key: 'experienceLetters', name: 'Experience Letters', icon: 'bi-briefcase', required: false },
          { key: 'passport', name: 'Passport', icon: 'bi-person-badge', required: false }
        ];

        const formatFileSize = (bytes) => {
          if (!bytes) return 'N/A';
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          if (bytes === 0) return '0 Byte';
          const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
          return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        };

        const handleDownload = async (fileDocument) => {
          if (!fileDocument.fileUrl && !fileDocument.fileName) {
            alert('Document not available for download');
            return;
          }

          try {
            // Construct the download URL
            let downloadUrl = fileDocument.fileUrl;
            if (!downloadUrl && fileDocument.fileName) {
              downloadUrl = `https://etvdufporvnfpgdzpcrr.supabase.co/storage/v1/object/public/documents/${fileDocument.fileName}`;
            }

            // Fetch the file as blob to force download
            const response = await fetch(downloadUrl);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            
            // Create blob URL and download
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileDocument.originalName || fileDocument.fileName || 'document';
            link.style.display = 'none';
            
            // Append to body, click, and remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the blob URL
            window.URL.revokeObjectURL(blobUrl);
            
            console.log('Download initiated for:', fileDocument.originalName || fileDocument.fileName);
            
          } catch (error) {
            console.error('Download failed:', error);
            alert('Unable to download file. Please contact support.');
          }
        };

        return (
          <div className="row">
            <div className="col-12">
              <div className="alert alert-info">
                <h6><i className="bi bi-file-text me-2"></i>Personal Documents</h6>
                <p>View and download your personal documents</p>
              </div>
              
              {/* Required Documents */}
              <div className="mb-4">
                <h6 className="mb-3">Required Documents</h6>
                <div className="list-group">
                  {documentTypes.filter(docType => docType.required).map(docType => {
                    const document = profileData.documents?.[docType.key];
                    return (
                      <div key={docType.key} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center mb-2">
                              <i className={`${docType.icon} text-primary me-2`}></i>
                              <h6 className="mb-0">{docType.name}</h6>
                              <span className="badge bg-danger ms-2">Required</span>
                              {document && document.fileName ? (
                                <span className="badge bg-success ms-2">Uploaded</span>
                              ) : (
                                <span className="badge bg-warning ms-2">Pending</span>
                              )}
                            </div>
                            
                            {document && document.fileName ? (
                              <div className="mb-2">
                                <small className="text-muted">
                                  <strong>File:</strong> {document.originalName || document.fileName}<br/>
                                  <strong>Uploaded:</strong> {formatDate(document.uploadedAt)}<br/>
                                  <strong>Size:</strong> {formatFileSize(document.fileSize)}
                                </small>
                              </div>
                            ) : (
                              <div className="mb-2">
                                <small className="text-muted">No document uploaded yet</small>
                              </div>
                            )}
                          </div>
                          
                          <div className="ms-3">
                            {document && document.fileName ? (
                              <button 
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => handleDownload(document)}
                                title="Download"
                              >
                                <i className="bi bi-download me-1"></i>
                                Download
                              </button>
                            ) : (
                              <button 
                                className="btn btn-outline-secondary btn-sm"
                                disabled
                                title="No document available"
                              >
                                <i className="bi bi-file-earmark-x me-1"></i>
                                Not Available
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Optional Documents */}
              <div className="mb-4">
                <h6 className="mb-3">Optional Documents</h6>
                <div className="list-group">
                  {documentTypes.filter(docType => !docType.required).map(docType => {
                    const document = profileData.documents?.[docType.key];
                    return (
                      <div key={docType.key} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center mb-2">
                              <i className={`${docType.icon} text-secondary me-2`}></i>
                              <h6 className="mb-0">{docType.name}</h6>
                              <span className="badge bg-secondary ms-2">Optional</span>
                              {document && document.fileName ? (
                                <span className="badge bg-success ms-2">Uploaded</span>
                              ) : (
                                <span className="badge bg-light text-dark ms-2">Not Uploaded</span>
                              )}
                            </div>
                            
                            {document && document.fileName ? (
                              <div className="mb-2">
                                <small className="text-muted">
                                  <strong>File:</strong> {document.originalName || document.fileName}<br/>
                                  <strong>Uploaded:</strong> {formatDate(document.uploadedAt)}<br/>
                                  <strong>Size:</strong> {formatFileSize(document.fileSize)}
                                </small>
                              </div>
                            ) : (
                              <div className="mb-2">
                                <small className="text-muted">No document uploaded</small>
                              </div>
                            )}
                          </div>
                          
                          <div className="ms-3">
                            {document && document.fileName ? (
                              <button 
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => handleDownload(document)}
                                title="Download"
                              >
                                <i className="bi bi-download me-1"></i>
                                Download
                              </button>
                            ) : (
                              <button 
                                className="btn btn-outline-secondary btn-sm"
                                disabled
                                title="No document available"
                              >
                                <i className="bi bi-file-earmark-x me-1"></i>
                                Not Available
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Document Summary */}
              <div className="card bg-light">
                <div className="card-body">
                  <h6 className="card-title">
                    <i className="bi bi-info-circle text-primary me-2"></i>
                    Document Summary
                  </h6>
                  <div className="row">
                    <div className="col-md-6">
                      <p className="mb-1">
                        <strong>Required Documents:</strong> {documentTypes.filter(dt => dt.required && profileData.documents?.[dt.key]?.fileName).length} / {documentTypes.filter(dt => dt.required).length} uploaded
                      </p>
                      <p className="mb-0">
                        <strong>Optional Documents:</strong> {documentTypes.filter(dt => !dt.required && profileData.documents?.[dt.key]?.fileName).length} / {documentTypes.filter(dt => !dt.required).length} uploaded
                      </p>
                    </div>
                    <div className="col-md-6">
                      <p className="mb-1">
                        <strong>Total Documents:</strong> {documentTypes.filter(dt => profileData.documents?.[dt.key]?.fileName).length} / {documentTypes.length}
                      </p>
                      <p className="mb-0">
                        <strong>Profile Completion:</strong> {Math.round((documentTypes.filter(dt => profileData.documents?.[dt.key]?.fileName).length / documentTypes.length) * 100)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'emergency':
        return (
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Contact Name</label>
              <p className="form-control-plaintext">{profileData.emergencyContact?.name || 'Not provided'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Relationship</label>
              <p className="form-control-plaintext">{profileData.emergencyContact?.relationship || 'Not provided'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Phone Number</label>
              <p className="form-control-plaintext">{profileData.emergencyContact?.phone || 'Not provided'}</p>
            </div>
            <div className="col-12 mb-3">
              <label className="form-label fw-bold">Address</label>
              <p className="form-control-plaintext">{profileData.emergencyContact?.address || 'Not provided'}</p>
            </div>
          </div>
        );

      case 'bank':
        return (
          <div className="row">
            <div className="col-12 mb-3">
              <div className="alert alert-warning">
                <small><i className="bi bi-shield-lock me-2"></i>Sensitive information is masked for security</small>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Account Number</label>
              <p className="form-control-plaintext">{maskAccountNumber(profileData.bankDetails?.accountNumber)}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">Bank Name</label>
              <p className="form-control-plaintext">{profileData.bankDetails?.bankName || 'Not provided'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">IFSC Code</label>
              <p className="form-control-plaintext">{profileData.bankDetails?.ifscCode || 'Not provided'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">PF Number</label>
              <p className="form-control-plaintext">{profileData.bankDetails?.pfNumber || 'Not provided'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">ESI Number</label>
              <p className="form-control-plaintext">{profileData.bankDetails?.esiNumber || 'Not provided'}</p>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label fw-bold">PAN Number</label>
              <p className="form-control-plaintext">{profileData.bankDetails?.panNumber || 'Not provided'}</p>
            </div>
          </div>
        );

      case 'leave':
        return (
          <div className="row">
            <div className="col-12 mb-4">
              <h6><i className="bi bi-graph-up me-2"></i>Current Leave Balance</h6>
              <div className="row">
                <div className="col-md-2 col-6 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h5 className="card-title text-primary">{profileData.leaveBalance?.casual || 0}</h5>
                      <p className="card-text small">Casual Leave</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-2 col-6 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h5 className="card-title text-success">{profileData.leaveBalance?.sick || 0}</h5>
                      <p className="card-text small">Sick Leave</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-2 col-6 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h5 className="card-title text-info">{profileData.leaveBalance?.earned || 0}</h5>
                      <p className="card-text small">Earned Leave</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-2 col-6 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h5 className="card-title text-warning">{profileData.leaveBalance?.maternity || 0}</h5>
                      <p className="card-text small">Maternity</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-2 col-6 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h5 className="card-title text-secondary">{profileData.leaveBalance?.paternity || 0}</h5>
                      <p className="card-text small">Paternity</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12">
              <h6><i className="bi bi-calendar-event me-2"></i>Upcoming Leave Dates</h6>
              <div className="alert alert-light">
                <p className="mb-0">No upcoming leaves scheduled</p>
              </div>
            </div>
          </div>
        );

      case 'attendance':
        return (
          <div className="row">
            <div className="col-12 mb-4">
              <h6><i className="bi bi-graph-up me-2"></i>Monthly Attendance Overview</h6>
              <div className="row">
                <div className="col-md-3 col-6 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h5 className="card-title text-success">22</h5>
                      <p className="card-text small">Present Days</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h5 className="card-title text-danger">2</h5>
                      <p className="card-text small">Absent Days</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h5 className="card-title text-warning">1</h5>
                      <p className="card-text small">Late Arrivals</p>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6 mb-3">
                  <div className="card text-center">
                    <div className="card-body">
                      <h5 className="card-title text-info">176</h5>
                      <p className="card-text small">Total Hours</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12">
              <h6><i className="bi bi-clock-history me-2"></i>Recent Punch Records</h6>
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Punch In</th>
                      <th>Punch Out</th>
                      <th>Total Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Today</td>
                      <td>09:15 AM</td>
                      <td>-</td>
                      <td>-</td>
                    </tr>
                    <tr>
                      <td>Yesterday</td>
                      <td>09:00 AM</td>
                      <td>06:30 PM</td>
                      <td>9h 30m</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'payslips':
        return (
          <div className="row">
            <div className="col-12">
              <h6><i className="bi bi-receipt me-2"></i>Monthly Payslips</h6>
              <div className="list-group">
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">December 2024</h6>
                    <small className="text-muted">Generated on: Jan 1, 2025</small>
                  </div>
                  <button className="btn btn-outline-primary btn-sm">Download PDF</button>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">November 2024</h6>
                    <small className="text-muted">Generated on: Dec 1, 2024</small>
                  </div>
                  <button className="btn btn-outline-primary btn-sm">Download PDF</button>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">October 2024</h6>
                    <small className="text-muted">Generated on: Nov 1, 2024</small>
                  </div>
                  <button className="btn btn-outline-primary btn-sm">Download PDF</button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="row">
            <div className="col-12 mb-4">
              <h6><i className="bi bi-target me-2"></i>Current Goals & KPIs</h6>
              {profileData.currentGoals && profileData.currentGoals.length > 0 ? (
                <div className="list-group">
                  {profileData.currentGoals.map((goal, index) => (
                    <div key={index} className="list-group-item">
                      <div className="d-flex w-100 justify-content-between">
                        <h6 className="mb-1">{goal.title}</h6>
                        <span className={`badge ${goal.status === 'Completed' ? 'bg-success' : goal.status === 'In Progress' ? 'bg-warning' : 'bg-secondary'}`}>
                          {goal.status}
                        </span>
                      </div>
                      <p className="mb-1">{goal.description}</p>
                      <small>Target Date: {formatDate(goal.targetDate)}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="alert alert-light">No current goals assigned</div>
              )}
            </div>
            <div className="col-12">
              <h6><i className="bi bi-graph-up-arrow me-2"></i>Last Appraisal</h6>
              {profileData.lastAppraisal ? (
                <div className="card">
                  <div className="card-body">
                    <h6 className="card-title">Rating: {profileData.lastAppraisal.rating}</h6>
                    <p className="card-text">{profileData.lastAppraisal.feedback}</p>
                    <small className="text-muted">Date: {formatDate(profileData.lastAppraisal.date)}</small>
                  </div>
                </div>
              ) : (
                <div className="alert alert-light">No appraisal data available</div>
              )}
            </div>
          </div>
        );

      case 'trainings':
        return (
          <div className="row">
            <div className="col-12">
              <h6><i className="bi bi-book me-2"></i>Training Programs</h6>
              <div className="list-group">
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">React Advanced Concepts</h6>
                    <small className="text-muted">Assigned on: Dec 15, 2024</small>
                  </div>
                  <span className="badge bg-warning">In Progress</span>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">Leadership Skills</h6>
                    <small className="text-muted">Completed on: Nov 20, 2024</small>
                  </div>
                  <span className="badge bg-success">Completed</span>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">Data Security Awareness</h6>
                    <small className="text-muted">Assigned on: Jan 5, 2025</small>
                  </div>
                  <span className="badge bg-secondary">Not Started</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="row">
            <div className="col-12">
              <h6><i className="bi bi-bell me-2"></i>Recent Notifications</h6>
              <div className="list-group">
                <div className="list-group-item">
                  <div className="d-flex w-100 justify-content-between">
                    <h6 className="mb-1">Leave Request Approved</h6>
                    <small>2 hours ago</small>
                  </div>
                  <p className="mb-1">Your leave request for Jan 15-16 has been approved by your manager.</p>
                </div>
                <div className="list-group-item">
                  <div className="d-flex w-100 justify-content-between">
                    <h6 className="mb-1">New Training Assigned</h6>
                    <small>1 day ago</small>
                  </div>
                  <p className="mb-1">You have been assigned a new training: "Data Security Awareness"</p>
                </div>
                <div className="list-group-item">
                  <div className="d-flex w-100 justify-content-between">
                    <h6 className="mb-1">Payslip Generated</h6>
                    <small>3 days ago</small>
                  </div>
                  <p className="mb-1">Your payslip for December 2024 is now available for download.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'settings':
        const handlePasswordInputChange = (e) => {
          const { name, value } = e.target;
          setPasswordData(prev => ({
            ...prev,
            [name]: value
          }));
        };

        const handleVerifyCurrentPassword = async (e) => {
          e.preventDefault();
          
          if (!passwordData.currentPassword) {
            alert('Please enter your current password');
            return;
          }
          
          setOtpLoading(true);
          
          try {
            const response = await authAPI.verifyCurrentPassword({
              currentPassword: passwordData.currentPassword
            });
            
            if (response.data.success) {
              setCurrentPasswordVerified(true);
              setPasswordChangeStep(2);
              alert('Current password verified. Please enter your new password.');
            }
          } catch (error) {
            alert(error.response?.data?.message || 'Current password is incorrect');
          } finally {
            setOtpLoading(false);
          }
        };

        const handleSendOTP = async (e) => {
          e.preventDefault();
          
          // Validate passwords
          if (!passwordData.newPassword || !passwordData.confirmPassword) {
            alert('Please fill in all password fields');
            return;
          }
          
          if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert('New passwords do not match');
            return;
          }
          
          if (passwordData.newPassword.length < 8) {
            alert('New password must be at least 8 characters long');
            return;
          }
          
          setOtpLoading(true);
          
          try {
            const response = await authAPI.sendPasswordChangeOTP({
              currentPassword: passwordData.currentPassword,
              newPassword: passwordData.newPassword
            });
            
            if (response.data.success) {
              setOtpSent(true);
              setPasswordChangeStep(3);
              alert('OTP sent to your email address');
            }
          } catch (error) {
            alert(error.response?.data?.message || 'Failed to send OTP');
          } finally {
            setOtpLoading(false);
          }
        };

        const handleVerifyOTPAndChangePassword = async (e) => {
          e.preventDefault();
          
          if (!passwordData.otp) {
            alert('Please enter the OTP');
            return;
          }
          
          setOtpLoading(true);
          
          try {
            const response = await authAPI.verifyOTPAndChangePassword({
              currentPassword: passwordData.currentPassword,
              newPassword: passwordData.newPassword,
              otp: passwordData.otp
            });
            
            if (response.data.success) {
              alert('Password changed successfully');
              // Reset form
              setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
                otp: ''
              });
              setPasswordChangeStep(1);
              setOtpSent(false);
              setCurrentPasswordVerified(false);
            }
          } catch (error) {
            alert(error.response?.data?.message || 'Failed to change password');
          } finally {
            setOtpLoading(false);
          }
        };

        const resetPasswordChange = () => {
          setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            otp: ''
          });
          setPasswordChangeStep(1);
          setOtpSent(false);
          setCurrentPasswordVerified(false);
        };

        return (
          <div className="row">
            <div className="col-12">
              <h6><i className="bi bi-gear me-2"></i>Account Settings</h6>
              <div className="card">
                <div className="card-body">
                  <div className="row">
                    <div className="col-12">
                      <h6 className="mb-3">Change Password</h6>
                      
                      {passwordChangeStep === 1 ? (
                        // Step 1: Verify Current Password
                        <form onSubmit={handleVerifyCurrentPassword}>
                          <div className="alert alert-info">
                            <i className="bi bi-info-circle me-2"></i>
                            First, please verify your current password to proceed with password change.
                          </div>
                          <div className="row">
                            <div className="col-md-6 mb-3">
                              <label htmlFor="currentPassword" className="form-label">Current Password</label>
                              <input
                                type="password"
                                className="form-control"
                                id="currentPassword"
                                name="currentPassword"
                                value={passwordData.currentPassword}
                                onChange={handlePasswordInputChange}
                                placeholder="Enter your current password"
                                required
                              />
                            </div>
                          </div>
                          <div className="d-flex justify-content-start">
                            <button type="submit" className="btn btn-primary me-2" disabled={otpLoading}>
                              {otpLoading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                  Verifying...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-shield-check me-2"></i>
                                  Verify Current Password
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      ) : passwordChangeStep === 2 ? (
                        // Step 2: Enter New Passwords
                        <form onSubmit={handleSendOTP}>
                          <div className="alert alert-success">
                            <i className="bi bi-check-circle me-2"></i>
                            Current password verified! Now enter your new password.
                          </div>
                          <div className="row">
                            <div className="col-md-6 mb-3">
                              <label htmlFor="newPassword" className="form-label">New Password</label>
                              <input
                                type="password"
                                className="form-control"
                                id="newPassword"
                                name="newPassword"
                                value={passwordData.newPassword}
                                onChange={handlePasswordInputChange}
                                placeholder="Enter new password"
                                required
                              />
                            </div>
                            <div className="col-md-6 mb-3">
                              <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
                              <input
                                type="password"
                                className="form-control"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={passwordData.confirmPassword}
                                onChange={handlePasswordInputChange}
                                placeholder="Confirm new password"
                                required
                              />
                            </div>
                          </div>
                          <div className="d-flex justify-content-start">
                            <button type="submit" className="btn btn-primary me-2" disabled={otpLoading}>
                              {otpLoading ? (
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
                            <button type="button" className="btn btn-outline-secondary" onClick={resetPasswordChange}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        // Step 3: Enter OTP and Complete
                        <form onSubmit={handleVerifyOTPAndChangePassword}>
                          <div className="alert alert-info">
                            <i className="bi bi-info-circle me-2"></i>
                            An OTP has been sent to your email address: {profileData?.email}
                          </div>
                          <div className="row">
                            <div className="col-md-6 mb-3">
                              <label htmlFor="otp" className="form-label">Enter OTP</label>
                              <input
                                type="text"
                                className="form-control"
                                id="otp"
                                name="otp"
                                value={passwordData.otp}
                                onChange={handlePasswordInputChange}
                                placeholder="Enter 6-digit OTP"
                                maxLength="6"
                                required
                              />
                            </div>
                          </div>
                          <div className="d-flex justify-content-start">
                            <button type="submit" className="btn btn-success me-2" disabled={otpLoading}>
                              {otpLoading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                  Verifying...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-shield-check me-2"></i>
                                  Verify & Change Password
                                </>
                              )}
                            </button>
                            <button type="button" className="btn btn-outline-secondary" onClick={resetPasswordChange}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                      
                      <div className="mt-3">
                        <small className="text-muted">
                          <i className="bi bi-info-circle me-1"></i>
                          Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="row">
            <div className="col-12">
              <h6><i className="bi bi-shield-lock me-2"></i>Security & Settings</h6>
              <div className="list-group">
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">Change Password</h6>
                    <small className="text-muted">Last changed: 30 days ago</small>
                  </div>
                  <button className="btn btn-outline-primary btn-sm">Change</button>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">Two-Factor Authentication</h6>
                    <small className="text-muted">Status: Disabled</small>
                  </div>
                  <button className="btn btn-outline-success btn-sm">Enable</button>
                </div>
                <div className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1">Active Sessions</h6>
                    <small className="text-muted">2 active sessions</small>
                  </div>
                  <button className="btn btn-outline-danger btn-sm">Manage</button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Select a tab to view content</div>;
    }
  };

  // Listen for section changes from ProfileSidebar
  useEffect(() => {
    const handleSectionChange = (section) => {
      setActiveTab(section);
    };

    window.profileSectionChange = handleSectionChange;

    // Check URL hash for initial section
    const hash = window.location.hash.replace('#', '');
    if (hash && tabs.find(tab => tab.id === hash)) {
      setActiveTab(hash);
    }

    return () => {
      delete window.profileSectionChange;
    };
  }, []);

  // Notify ProfileSidebar when activeTab changes
  useEffect(() => {
    if (window.profileActiveTabChange) {
      window.profileActiveTabChange(activeTab);
    }
  }, [activeTab]);

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1">My Profile</h2>
              <p className="text-muted mb-0">Welcome back, {user?.firstName}! Manage your profile information.</p>
            </div>
            <div>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/profile/edit')}
              >
                <i className="bi bi-pencil-square me-2"></i>
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className={`${tabs.find(tab => tab.id === activeTab)?.icon} me-2`}></i>
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h5>
            </div>
            <div className="card-body">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
