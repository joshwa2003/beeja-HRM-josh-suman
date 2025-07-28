import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const JobPostings = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    department: '',
    priority: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  const [formData, setFormData] = useState({
    title: '',
    code: '',
    department: '',
    description: '',
    requirements: {
      education: '',
      experience: { min: 0, max: 10 },
      skills: [],
      certifications: []
    },
    salary: {
      min: '',
      max: '',
      currency: 'INR'
    },
    employmentType: 'Full-time',
    workMode: 'On-site',
    location: '',
    openings: 1,
    priority: 'Medium',
    closingDate: '',
    hiringManager: '',
    benefits: [],
    tags: []
  });

  useEffect(() => {
    fetchJobs();
    fetchDepartments();
    fetchUsers();
  }, [filters, pagination.current]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.current,
        limit: 10,
        ...filters
      });

      const response = await fetch(`/api/recruitment/jobs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?role=HR Manager,HR BP,Team Manager', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingJob 
        ? `/api/recruitment/jobs/${editingJob._id}`
        : '/api/recruitment/jobs';
      
      const method = editingJob ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowModal(false);
        setEditingJob(null);
        resetForm();
        fetchJobs();
        alert(editingJob ? 'Job updated successfully!' : 'Job created successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Error saving job');
      }
    } catch (error) {
      console.error('Error saving job:', error);
      alert('Error saving job');
    }
  };

  const handlePublish = async (jobId) => {
    if (window.confirm('Are you sure you want to publish this job?')) {
      try {
        const response = await fetch(`/api/recruitment/jobs/${jobId}/publish`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          fetchJobs();
          alert('Job published successfully!');
        } else {
          const error = await response.json();
          alert(error.message || 'Error publishing job');
        }
      } catch (error) {
        console.error('Error publishing job:', error);
        alert('Error publishing job');
      }
    }
  };

  const handleClose = async (jobId) => {
    const reason = prompt('Please provide a reason for closing this job:');
    if (reason) {
      try {
        const response = await fetch(`/api/recruitment/jobs/${jobId}/close`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ reason })
        });

        if (response.ok) {
          fetchJobs();
          alert('Job closed successfully!');
        } else {
          const error = await response.json();
          alert(error.message || 'Error closing job');
        }
      } catch (error) {
        console.error('Error closing job:', error);
        alert('Error closing job');
      }
    }
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      code: job.code,
      department: job.department._id,
      description: job.description,
      requirements: job.requirements,
      salary: job.salary,
      employmentType: job.employmentType,
      workMode: job.workMode,
      location: job.location,
      openings: job.openings,
      priority: job.priority,
      closingDate: job.closingDate ? new Date(job.closingDate).toISOString().split('T')[0] : '',
      hiringManager: job.hiringManager._id,
      benefits: job.benefits || [],
      tags: job.tags || []
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      code: '',
      department: '',
      description: '',
      requirements: {
        education: '',
        experience: { min: 0, max: 10 },
        skills: [],
        certifications: []
      },
      salary: {
        min: '',
        max: '',
        currency: 'INR'
      },
      employmentType: 'Full-time',
      workMode: 'On-site',
      location: '',
      openings: 1,
      priority: 'Medium',
      closingDate: '',
      hiringManager: '',
      benefits: [],
      tags: []
    });
  };

  const copyPublicLink = (job) => {
    const publicLink = `${window.location.origin}/apply/${job._id}`;
    navigator.clipboard.writeText(publicLink);
    alert('Public link copied to clipboard!');
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'Draft': 'bg-secondary',
      'Active': 'bg-success',
      'Paused': 'bg-warning',
      'Closed': 'bg-danger',
      'Cancelled': 'bg-dark'
    };
    return `badge ${statusClasses[status] || 'bg-secondary'}`;
  };

  const getPriorityBadge = (priority) => {
    const priorityClasses = {
      'Low': 'bg-info',
      'Medium': 'bg-primary',
      'High': 'bg-warning',
      'Urgent': 'bg-danger'
    };
    return `badge ${priorityClasses[priority] || 'bg-primary'}`;
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2><i className="bi bi-briefcase me-2"></i>Job Postings</h2>
            <button 
              className="btn btn-primary"
              onClick={() => {
                resetForm();
                setEditingJob(null);
                setShowModal(true);
              }}
            >
              <i className="bi bi-plus-circle me-2"></i>Create Job
            </button>
          </div>

          {/* Filters */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-select"
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                  >
                    <option value="">All Status</option>
                    <option value="Draft">Draft</option>
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Department</label>
                  <select 
                    className="form-select"
                    value={filters.department}
                    onChange={(e) => setFilters({...filters, department: e.target.value})}
                  >
                    <option value="">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Priority</label>
                  <select 
                    className="form-select"
                    value={filters.priority}
                    onChange={(e) => setFilters({...filters, priority: e.target.value})}
                  >
                    <option value="">All Priorities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Search</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="Search jobs..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Jobs Table */}
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
                          <th>Job Title</th>
                          <th>Code</th>
                          <th>Department</th>
                          <th>Status</th>
                          <th>Priority</th>
                          <th>Applications</th>
                          <th>Posted Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map(job => (
                          <tr key={job._id}>
                            <td>
                              <div>
                                <strong>{job.title}</strong>
                                <br />
                                <small className="text-muted">{job.location}</small>
                              </div>
                            </td>
                            <td><code>{job.code}</code></td>
                            <td>{job.department?.name}</td>
                            <td>
                              <span className={getStatusBadge(job.status)}>
                                {job.status}
                              </span>
                            </td>
                            <td>
                              <span className={getPriorityBadge(job.priority)}>
                                {job.priority}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-info">
                                {job.applicationCount || 0}
                              </span>
                            </td>
                            <td>
                              {job.postedDate ? 
                                new Date(job.postedDate).toLocaleDateString() : 
                                '-'
                              }
                            </td>
                            <td>
                              <div className="btn-group" role="group">
                                <button 
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleEdit(job)}
                                  title="Edit"
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                
                                {job.status === 'Draft' && (
                                  <button 
                                    className="btn btn-sm btn-outline-success"
                                    onClick={() => handlePublish(job._id)}
                                    title="Publish"
                                  >
                                    <i className="bi bi-play-circle"></i>
                                  </button>
                                )}
                                
                                {job.status === 'Active' && (
                                  <>
                                    <button 
                                      className="btn btn-sm btn-outline-info"
                                      onClick={() => copyPublicLink(job)}
                                      title="Copy Public Link"
                                    >
                                      <i className="bi bi-link-45deg"></i>
                                    </button>
                                    <button 
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => handleClose(job._id)}
                                      title="Close Job"
                                    >
                                      <i className="bi bi-x-circle"></i>
                                    </button>
                                  </>
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

      {/* Job Form Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingJob ? 'Edit Job' : 'Create New Job'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Job Title *</label>
                      <input 
                        type="text"
                        className="form-control"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Job Code *</label>
                      <input 
                        type="text"
                        className="form-control"
                        value={formData.code}
                        onChange={(e) => setFormData({...formData, code: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Department *</label>
                      <select 
                        className="form-select"
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                        required
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept._id} value={dept._id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Hiring Manager</label>
                      <select 
                        className="form-select"
                        value={formData.hiringManager}
                        onChange={(e) => setFormData({...formData, hiringManager: e.target.value})}
                      >
                        <option value="">Select Hiring Manager</option>
                        {users.map(user => (
                          <option key={user._id} value={user._id}>
                            {user.firstName} {user.lastName} ({user.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Job Description *</label>
                      <textarea 
                        className="form-control"
                        rows="4"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Employment Type</label>
                      <select 
                        className="form-select"
                        value={formData.employmentType}
                        onChange={(e) => setFormData({...formData, employmentType: e.target.value})}
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Internship">Internship</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Work Mode</label>
                      <select 
                        className="form-select"
                        value={formData.workMode}
                        onChange={(e) => setFormData({...formData, workMode: e.target.value})}
                      >
                        <option value="On-site">On-site</option>
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Priority</label>
                      <select 
                        className="form-select"
                        value={formData.priority}
                        onChange={(e) => setFormData({...formData, priority: e.target.value})}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Location</label>
                      <input 
                        type="text"
                        className="form-control"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Openings *</label>
                      <input 
                        type="number"
                        className="form-control"
                        min="1"
                        value={formData.openings}
                        onChange={(e) => setFormData({...formData, openings: parseInt(e.target.value)})}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Closing Date</label>
                      <input 
                        type="date"
                        className="form-control"
                        value={formData.closingDate}
                        onChange={(e) => setFormData({...formData, closingDate: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingJob ? 'Update Job' : 'Create Job'}
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

export default JobPostings;
