import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const Applications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [interviewers, setInterviewers] = useState([]);
  const [filters, setFilters] = useState({
    job: '',
    status: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  const [interviewForm, setInterviewForm] = useState({
    scheduledDate: '',
    scheduledTime: '',
    interviewer: '',
    type: 'Online',
    location: '',
    meetingLink: '',
    duration: 60,
    title: '',
    description: ''
  });

  useEffect(() => {
    fetchApplications();
    fetchJobs();
    fetchInterviewers();
  }, [filters, pagination.current]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.current,
        limit: 10,
        ...filters
      });

      const response = await fetch(`/api/recruitment/applications?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/recruitment/jobs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchInterviewers = async () => {
    try {
      const response = await fetch('/api/recruitment/interviewers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInterviewers(data.interviewers || []);
      }
    } catch (error) {
      console.error('Error fetching interviewers:', error);
    }
  };

  const fetchApplicationDetails = async (applicationId) => {
    try {
      const response = await fetch(`/api/recruitment/applications/${applicationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedApplication(data.application);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error fetching application details:', error);
    }
  };

  const handleReviewApplication = async (applicationId, action, reason = '') => {
    try {
      const response = await fetch(`/api/recruitment/applications/${applicationId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action, reason })
      });

      if (response.ok) {
        fetchApplications();
        setShowModal(false);
        alert(`Application ${action}ed successfully!`);
      } else {
        const error = await response.json();
        alert(error.message || `Error ${action}ing application`);
      }
    } catch (error) {
      console.error(`Error ${action}ing application:`, error);
      alert(`Error ${action}ing application`);
    }
  };

  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    try {
      const scheduledDateTime = new Date(`${interviewForm.scheduledDate}T${interviewForm.scheduledTime}`);
      
      const response = await fetch('/api/recruitment/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          applicationId: selectedApplication._id,
          scheduledDate: scheduledDateTime.toISOString(),
          interviewer: interviewForm.interviewer,
          type: interviewForm.type,
          location: interviewForm.location,
          meetingLink: interviewForm.meetingLink,
          duration: parseInt(interviewForm.duration),
          title: interviewForm.title,
          description: interviewForm.description
        })
      });

      if (response.ok) {
        setShowScheduleModal(false);
        setShowModal(false);
        fetchApplications();
        resetInterviewForm();
        alert('Interview scheduled successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Error scheduling interview');
      }
    } catch (error) {
      console.error('Error scheduling interview:', error);
      alert('Error scheduling interview');
    }
  };

  const resetInterviewForm = () => {
    setInterviewForm({
      scheduledDate: '',
      scheduledTime: '',
      interviewer: '',
      type: 'Online',
      location: '',
      meetingLink: '',
      duration: 60,
      title: '',
      description: ''
    });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'Pending': 'bg-warning',
      'Reviewed': 'bg-info',
      'Accepted': 'bg-success',
      'Rejected': 'bg-danger',
      'Interview Round 1': 'bg-primary',
      'Interview Round 2': 'bg-primary',
      'Interview Round 3': 'bg-primary',
      'Selected': 'bg-success',
      'Offer Sent': 'bg-info',
      'Offer Accepted': 'bg-success',
      'Offer Rejected': 'bg-danger',
      'Onboarded': 'bg-dark'
    };
    return `badge ${statusClasses[status] || 'bg-secondary'}`;
  };

  const downloadResume = (application) => {
    if (application.resume && application.resume.filePath) {
      const link = document.createElement('a');
      link.href = `/api/uploads/resumes/${application.resume.fileName}`;
      link.download = application.resume.originalName;
      link.click();
    }
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2><i className="bi bi-file-person me-2"></i>Applications</h2>
          </div>

          {/* Filters */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Job</label>
                  <select 
                    className="form-select"
                    value={filters.job}
                    onChange={(e) => setFilters({...filters, job: e.target.value})}
                  >
                    <option value="">All Jobs</option>
                    {jobs.map(job => (
                      <option key={job._id} value={job._id}>{job.title} ({job.code})</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-select"
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                  >
                    <option value="">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Reviewed">Reviewed</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Interview Round 1">Interview Round 1</option>
                    <option value="Interview Round 2">Interview Round 2</option>
                    <option value="Selected">Selected</option>
                    <option value="Offer Sent">Offer Sent</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Search</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="Search by name or email..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Applications Table */}
          <div className="card">
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Candidate</th>
                          <th>Job</th>
                          <th>Experience</th>
                          <th>Status</th>
                          <th>Applied Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map(application => (
                          <tr key={application._id}>
                            <td>
                              <div>
                                <strong>{application.firstName} {application.lastName}</strong>
                                <br />
                                <small className="text-muted">{application.email}</small>
                                <br />
                                <small className="text-muted">{application.phoneNumber}</small>
                              </div>
                            </td>
                            <td>
                              <div>
                                <strong>{application.job?.title}</strong>
                                <br />
                                <small className="text-muted">{application.job?.code}</small>
                              </div>
                            </td>
                            <td>{application.yearsOfExperience} years</td>
                            <td>
                              <span className={getStatusBadge(application.status)}>
                                {application.status}
                              </span>
                            </td>
                            <td>
                              {new Date(application.appliedAt).toLocaleDateString()}
                            </td>
                            <td>
                              <div className="btn-group" role="group">
                                <button 
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => fetchApplicationDetails(application._id)}
                                  title="View Details"
                                >
                                  <i className="bi bi-eye"></i>
                                </button>
                                
                                {application.resume && (
                                  <button 
                                    className="btn btn-sm btn-outline-info"
                                    onClick={() => downloadResume(application)}
                                    title="Download Resume"
                                  >
                                    <i className="bi bi-download"></i>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <nav className="mt-4">
                      <ul className="pagination justify-content-center">
                        <li className={`page-item ${pagination.current === 1 ? 'disabled' : ''}`}>
                          <button 
                            className="page-link"
                            onClick={() => setPagination({...pagination, current: pagination.current - 1})}
                          >
                            Previous
                          </button>
                        </li>
                        {[...Array(pagination.pages)].map((_, i) => (
                          <li key={i + 1} className={`page-item ${pagination.current === i + 1 ? 'active' : ''}`}>
                            <button 
                              className="page-link"
                              onClick={() => setPagination({...pagination, current: i + 1})}
                            >
                              {i + 1}
                            </button>
                          </li>
                        ))}
                        <li className={`page-item ${pagination.current === pagination.pages ? 'disabled' : ''}`}>
                          <button 
                            className="page-link"
                            onClick={() => setPagination({...pagination, current: pagination.current + 1})}
                          >
                            Next
                          </button>
                        </li>
                      </ul>
                    </nav>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Application Details Modal */}
      {showModal && selectedApplication && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Application Details - {selectedApplication.firstName} {selectedApplication.lastName}
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <h6>Personal Information</h6>
                    <p><strong>Name:</strong> {selectedApplication.firstName} {selectedApplication.lastName}</p>
                    <p><strong>Email:</strong> {selectedApplication.email}</p>
                    <p><strong>Phone:</strong> {selectedApplication.phoneNumber}</p>
                    <p><strong>Experience:</strong> {selectedApplication.yearsOfExperience} years</p>
                  </div>
                  <div className="col-md-6">
                    <h6>Job Information</h6>
                    <p><strong>Position:</strong> {selectedApplication.job?.title}</p>
                    <p><strong>Job Code:</strong> {selectedApplication.job?.code}</p>
                    <p><strong>Department:</strong> {selectedApplication.job?.department?.name}</p>
                    <p><strong>Applied Date:</strong> {new Date(selectedApplication.appliedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="col-12">
                    <h6>Technical Skills</h6>
                    <div className="d-flex flex-wrap gap-1">
                      {selectedApplication.technicalSkills?.map((skill, index) => (
                        <span key={index} className="badge bg-secondary">{skill}</span>
                      ))}
                    </div>
                  </div>
                  {selectedApplication.coverLetter && (
                    <div className="col-12">
                      <h6>Cover Letter</h6>
                      <p className="text-muted">{selectedApplication.coverLetter}</p>
                    </div>
                  )}
                  <div className="col-12">
                    <h6>Current Status</h6>
                    <span className={getStatusBadge(selectedApplication.status)}>
                      {selectedApplication.status}
                    </span>
                  </div>
                  {selectedApplication.interviews && selectedApplication.interviews.length > 0 && (
                    <div className="col-12">
                      <h6>Interview History</h6>
                      <div className="table-responsive">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Round</th>
                              <th>Date</th>
                              <th>Interviewer</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedApplication.interviews.map(interview => (
                              <tr key={interview._id}>
                                <td>{interview.round}</td>
                                <td>{new Date(interview.scheduledDate).toLocaleDateString()}</td>
                                <td>{interview.interviewer?.firstName} {interview.interviewer?.lastName}</td>
                                <td>
                                  <span className={`badge ${interview.status === 'Completed' ? 'bg-success' : 'bg-warning'}`}>
                                    {interview.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                {selectedApplication.status === 'Pending' && (
                  <>
                    <button 
                      className="btn btn-success"
                      onClick={() => handleReviewApplication(selectedApplication._id, 'accept')}
                    >
                      Accept
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => {
                        const reason = prompt('Please provide a reason for rejection:');
                        if (reason) {
                          handleReviewApplication(selectedApplication._id, 'reject', reason);
                        }
                      }}
                    >
                      Reject
                    </button>
                  </>
                )}
                
                {(selectedApplication.status === 'Accepted' || selectedApplication.status.includes('Interview Round')) && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      setShowScheduleModal(true);
                      resetInterviewForm();
                    }}
                  >
                    Schedule Interview
                  </button>
                )}
                
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showScheduleModal && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Schedule Interview</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowScheduleModal(false)}
                ></button>
              </div>
              <form onSubmit={handleScheduleInterview}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Date *</label>
                      <input 
                        type="date"
                        className="form-control"
                        value={interviewForm.scheduledDate}
                        onChange={(e) => setInterviewForm({...interviewForm, scheduledDate: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Time *</label>
                      <input 
                        type="time"
                        className="form-control"
                        value={interviewForm.scheduledTime}
                        onChange={(e) => setInterviewForm({...interviewForm, scheduledTime: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Interviewer *</label>
                      <select 
                        className="form-select"
                        value={interviewForm.interviewer}
                        onChange={(e) => setInterviewForm({...interviewForm, interviewer: e.target.value})}
                        required
                      >
                        <option value="">Select Interviewer</option>
                        {interviewers.map(interviewer => (
                          <option key={interviewer._id} value={interviewer._id}>
                            {interviewer.firstName} {interviewer.lastName} ({interviewer.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Type *</label>
                      <select 
                        className="form-select"
                        value={interviewForm.type}
                        onChange={(e) => setInterviewForm({...interviewForm, type: e.target.value})}
                        required
                      >
                        <option value="Online">Online</option>
                        <option value="Offline">Offline</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Duration (minutes)</label>
                      <input 
                        type="number"
                        className="form-control"
                        value={interviewForm.duration}
                        onChange={(e) => setInterviewForm({...interviewForm, duration: e.target.value})}
                        min="15"
                        max="180"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Title</label>
                      <input 
                        type="text"
                        className="form-control"
                        value={interviewForm.title}
                        onChange={(e) => setInterviewForm({...interviewForm, title: e.target.value})}
                        placeholder="Interview Round 1"
                      />
                    </div>
                    {interviewForm.type === 'Online' && (
                      <div className="col-12">
                        <label className="form-label">Meeting Link</label>
                        <input 
                          type="url"
                          className="form-control"
                          value={interviewForm.meetingLink}
                          onChange={(e) => setInterviewForm({...interviewForm, meetingLink: e.target.value})}
                          placeholder="https://meet.google.com/..."
                        />
                      </div>
                    )}
                    {interviewForm.type === 'Offline' && (
                      <div className="col-12">
                        <label className="form-label">Location</label>
                        <input 
                          type="text"
                          className="form-control"
                          value={interviewForm.location}
                          onChange={(e) => setInterviewForm({...interviewForm, location: e.target.value})}
                          placeholder="Conference Room A, 2nd Floor"
                        />
                      </div>
                    )}
                    <div className="col-12">
                      <label className="form-label">Description</label>
                      <textarea 
                        className="form-control"
                        rows="3"
                        value={interviewForm.description}
                        onChange={(e) => setInterviewForm({...interviewForm, description: e.target.value})}
                        placeholder="Interview details and instructions..."
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowScheduleModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Schedule Interview
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applications;
