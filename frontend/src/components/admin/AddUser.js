import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../../utils/api';

const AddUser = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    employeeId: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    joiningDate: '',
    department: '',
    designation: '',
    employmentType: '',
    manager: '',
    workLocation: '',
    status: 'Active',
    role: 'Employee',
    password: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      const userData = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim(),
        lastName: formData.lastName.trim(),
        employeeId: formData.employeeId.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        joiningDate: formData.joiningDate || undefined,
        department: formData.department.trim() || undefined,
        designation: formData.designation.trim() || undefined,
        employmentType: formData.employmentType || undefined,
        reportingManager: formData.manager.trim() || undefined,
        workLocation: formData.workLocation || undefined,
        isActive: formData.status === 'Active',
        role: formData.role,
        password: formData.password
      };

      // Remove empty fields
      Object.keys(userData).forEach(key => {
        if (userData[key] === '' || userData[key] === undefined) {
          delete userData[key];
        }
      });

      await userAPI.createUser(userData);
      navigate('/admin/users');
    } catch (err) {
      console.error('Create user error:', err);
      if (err.response?.data?.errors) {
        // Handle validation errors
        const errorMessages = err.response.data.errors.map(error => error.msg || error.message).join(', ');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.message || 'Failed to add user');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container-fluid py-4">
      <h2>Add New User</h2>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">First Name *</label>
            <input
              type="text"
              className="form-control"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Middle Name</label>
            <input
              type="text"
              className="form-control"
              name="middleName"
              value={formData.middleName}
              onChange={handleInputChange}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Last Name *</label>
            <input
              type="text"
              className="form-control"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Employee ID *</label>
            <input
              type="text"
              className="form-control"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-control"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              className="form-control"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Date of Birth</label>
            <input
              type="date"
              className="form-control"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Gender</label>
            <select
              className="form-select"
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Joining Date</label>
            <input
              type="date"
              className="form-control"
              name="joiningDate"
              value={formData.joiningDate}
              onChange={handleInputChange}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Department</label>
            <input
              type="text"
              className="form-control"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Designation / Job Title</label>
            <input
              type="text"
              className="form-control"
              name="designation"
              value={formData.designation}
              onChange={handleInputChange}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Employment Type</label>
            <select
              className="form-select"
              name="employmentType"
              value={formData.employmentType}
              onChange={handleInputChange}
            >
              <option value="">Select Employment Type</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Manager / Supervisor</label>
            <input
              type="text"
              className="form-control"
              name="manager"
              value={formData.manager}
              onChange={handleInputChange}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Work Location</label>
            <input
              type="text"
              className="form-control"
              name="workLocation"
              value={formData.workLocation}
              onChange={handleInputChange}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Role *</label>
            <select
              className="form-select"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              required
            >
              <option value="Employee">Employee</option>
              <option value="Team Leader">Team Leader</option>
              <option value="Team Manager">Team Manager</option>
              <option value="HR Executive">HR Executive</option>
              <option value="HR Manager">HR Manager</option>
              <option value="HR BP">HR BP</option>
              <option value="Vice President">Vice President</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="col-md-12">
            <label className="form-label">Password *</label>
            <input
              type="password"
              className="form-control"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              minLength="6"
              placeholder="Minimum 6 characters"
            />
          </div>
        </div>
        <div className="mt-4">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status">
                  <span className="visually-hidden">Loading...</span>
                </span>
                Adding User...
              </>
            ) : (
              'Add User'
            )}
          </button>
          <button 
            type="button" 
            className="btn btn-secondary ms-2" 
            onClick={() => navigate('/admin/users')}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddUser;
