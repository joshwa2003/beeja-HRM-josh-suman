import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useAuth } from '../../context/AuthContext';

const PersonalInfoForm = forwardRef(({ data, onChange }, ref) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    profilePhoto: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    }
  });

  const [errors, setErrors] = useState({});

  useImperativeHandle(ref, () => ({
    getFormData: () => formData
  }));

  useEffect(() => {
    if (data) {
      setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phoneNumber: data.phoneNumber || '',
        dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
        gender: data.gender || '',
        profilePhoto: data.profilePhoto || '',
        address: {
          street: data.address?.street || '',
          city: data.address?.city || '',
          state: data.address?.state || '',
          zipCode: data.address?.zipCode || '',
          country: data.address?.country || ''
        }
      });
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }

      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          profilePhoto: event.target.result
        }));
        
        // Notify parent component of changes
        onChange && onChange();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({
      ...prev,
      profilePhoto: ''
    }));
    
    // Clear the file input
    const fileInput = document.getElementById('profilePhotoInput');
    if (fileInput) {
      fileInput.value = '';
    }
    
    // Notify parent component of changes
    onChange && onChange();
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (formData.phoneNumber && !/^\+?[\d\s-()]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Phone number is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div>
      <div className="row">
        <div className="col-12 mb-4">
          <div className="text-center">
            <div className="profile-photo-container d-inline-block">
              <div 
                className="rounded-circle mb-3 d-flex align-items-center justify-content-center bg-light border"
                style={{ width: '120px', height: '120px' }}
              >
                {formData.profilePhoto ? (
                  <img
                    src={formData.profilePhoto}
                    alt="Profile"
                    className="rounded-circle"
                    style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                  />
                ) : (
                  <i className="bi bi-person-circle text-muted" style={{ fontSize: '60px' }}></i>
                )}
              </div>
              <div className="d-flex flex-column gap-2 align-items-center justify-content-center">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary btn-sm d-flex align-items-center"
                  onClick={() => document.getElementById('profilePhotoInput').click()}
                  style={{ minWidth: '120px', height: '32px' }}
                >
                  <i className="bi bi-camera me-1"></i>
                  Choose Photo
                </button>
                {formData.profilePhoto && (
                  <button 
                    type="button" 
                    className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center"
                    onClick={handleRemovePhoto}
                    title="Remove photo"
                    style={{ minWidth: '120px', height: '32px' }}
                  >
                    <i className="bi bi-trash me-1"></i>
                    Remove
                  </button>
                )}
                <input
                  type="file"
                  id="profilePhotoInput"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoChange}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 mb-3">
          <label htmlFor="firstName" className="form-label fw-medium">
            First Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
          {errors.firstName && <div className="invalid-feedback">{errors.firstName}</div>}
        </div>

        <div className="col-md-6 mb-3">
          <label htmlFor="lastName" className="form-label fw-medium">
            Last Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
          {errors.lastName && <div className="invalid-feedback">{errors.lastName}</div>}
        </div>

        <div className="col-md-6 mb-3">
          <label htmlFor="email" className="form-label fw-medium">
            Email <span className="text-danger">*</span>
          </label>
          <input
            type="email"
            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          {errors.email && <div className="invalid-feedback">{errors.email}</div>}
        </div>

        <div className="col-md-6 mb-3">
          <label htmlFor="phoneNumber" className="form-label fw-medium">Phone Number</label>
          <input
            type="tel"
            className={`form-control ${errors.phoneNumber ? 'is-invalid' : ''}`}
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            placeholder="+1-555-5397"
          />
          {errors.phoneNumber && <div className="invalid-feedback">{errors.phoneNumber}</div>}
        </div>

        <div className="col-md-6 mb-3">
          <label htmlFor="dateOfBirth" className="form-label fw-medium">Date of Birth</label>
          <input
            type="date"
            className="form-control"
            id="dateOfBirth"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-6 mb-3">
          <label htmlFor="gender" className="form-label fw-medium">Gender</label>
          <select
            className="form-select"
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>

        <div className="col-12 mb-3">
          <h6 className="mb-3 fw-medium">Address Information</h6>
        </div>

        <div className="col-12 mb-3">
          <label htmlFor="address.street" className="form-label fw-medium">Street Address</label>
          <input
            type="text"
            className="form-control"
            id="address.street"
            name="address.street"
            value={formData.address.street}
            onChange={handleChange}
            placeholder="123 Main Street"
          />
        </div>

        <div className="col-md-6 mb-3">
          <label htmlFor="address.city" className="form-label fw-medium">City</label>
          <input
            type="text"
            className="form-control"
            id="address.city"
            name="address.city"
            value={formData.address.city}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-6 mb-3">
          <label htmlFor="address.state" className="form-label fw-medium">State/Province</label>
          <input
            type="text"
            className="form-control"
            id="address.state"
            name="address.state"
            value={formData.address.state}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-6 mb-3">
          <label htmlFor="address.zipCode" className="form-label fw-medium">ZIP/Postal Code</label>
          <input
            type="text"
            className="form-control"
            id="address.zipCode"
            name="address.zipCode"
            value={formData.address.zipCode}
            onChange={handleChange}
          />
        </div>

        <div className="col-md-6 mb-3">
          <label htmlFor="address.country" className="form-label fw-medium">Country</label>
          <input
            type="text"
            className="form-control"
            id="address.country"
            name="address.country"
            value={formData.address.country}
            onChange={handleChange}
          />
        </div>

      </div>
    </div>
  );
});

export default PersonalInfoForm;
