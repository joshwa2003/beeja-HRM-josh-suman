import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import PersonalInfoForm from './forms/PersonalInfoForm';
import WorkInfoForm from './forms/WorkInfoForm';
import DocumentsForm from './forms/DocumentsForm';
import EmergencyContactForm from './forms/EmergencyContactForm';
import BankDetailsForm from './forms/BankDetailsForm';

const EditProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // State to maintain form data across tab switches
  const [formDataState, setFormDataState] = useState({
    personal: {},
    work: {},
    emergency: {},
    bank: {},
    documents: {}
  });
  
  // Refs to access form data from child components
  const personalFormRef = useRef();
  const workFormRef = useRef();
  const documentsFormRef = useRef();
  const emergencyFormRef = useRef();
  const bankFormRef = useRef();

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const response = await authAPI.getProfile();
      setProfileData(response.data.user);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load profile data'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = () => {
    setHasChanges(true);
  };

  // Save current form data when switching tabs
  const handleTabSwitch = (newTab) => {
    // Save current tab's data before switching
    const currentFormData = getCurrentFormData();
    if (currentFormData) {
      setFormDataState(prev => ({
        ...prev,
        [activeTab]: currentFormData
      }));
    }
    setActiveTab(newTab);
  };

  // Get current form data based on active tab
  const getCurrentFormData = () => {
    switch (activeTab) {
      case 'personal':
        return personalFormRef.current?.getFormData();
      case 'work':
        return workFormRef.current?.getFormData();
      case 'emergency':
        return emergencyFormRef.current?.getFormData();
      case 'bank':
        return bankFormRef.current?.getFormData();
      case 'documents':
        return documentsFormRef.current?.getFormData();
      default:
        return null;
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Save current form data before collecting all data
      const currentFormData = getCurrentFormData();
      if (currentFormData) {
        setFormDataState(prev => ({
          ...prev,
          [activeTab]: currentFormData
        }));
      }

      // Collect data from all forms (including saved state)
      const personalData = activeTab === 'personal' ? currentFormData : formDataState.personal;
      const workData = activeTab === 'work' ? currentFormData : formDataState.work;
      const emergencyData = activeTab === 'emergency' ? currentFormData : formDataState.emergency;
      const bankData = activeTab === 'bank' ? currentFormData : formDataState.bank;

      // Prepare the update payload with proper structure for backend validation
      const updatePayload = {};
      
      // Personal Info - only add if data exists
      if (personalData?.firstName) updatePayload.firstName = personalData.firstName;
      if (personalData?.lastName) updatePayload.lastName = personalData.lastName;
      if (personalData?.email) updatePayload.email = personalData.email;
      if (personalData?.phoneNumber) updatePayload.phoneNumber = personalData.phoneNumber;
      if (personalData?.dateOfBirth) {
        // Convert date to ISO8601 format for backend validation
        const date = new Date(personalData.dateOfBirth);
        updatePayload.dateOfBirth = date.toISOString();
      }
      if (personalData?.gender) updatePayload.gender = personalData.gender;
      if (personalData?.profilePhoto !== undefined) updatePayload.profilePhoto = personalData.profilePhoto;
      if (personalData?.profilePhotoPath !== undefined) updatePayload.profilePhotoPath = personalData.profilePhotoPath;
      if (personalData?.address) updatePayload.address = personalData.address;
      
      // Work Info (only fields that regular users can update)
      if (workData?.designation) updatePayload.designation = workData.designation;
      if (workData?.workLocation) updatePayload.workLocation = workData.workLocation;
      
      // Emergency Contact - handle nested structure from form
      if (emergencyData && Object.keys(emergencyData).length > 0) {
        const emergencyContact = {};
        // Check if data is nested under emergencyContact key
        const contactData = emergencyData.emergencyContact || emergencyData;
        
        if (contactData.name) emergencyContact.name = contactData.name;
        if (contactData.relationship) emergencyContact.relationship = contactData.relationship;
        if (contactData.phone) emergencyContact.phone = contactData.phone;
        if (contactData.address) emergencyContact.address = contactData.address;
        
        if (Object.keys(emergencyContact).length > 0) {
          updatePayload.emergencyContact = emergencyContact;
        }
      }
      
      // Bank Details - handle nested structure from form
      if (bankData && Object.keys(bankData).length > 0) {
        const bankDetails = {};
        // Check if data is nested under bankDetails key
        const detailsData = bankData.bankDetails || bankData;
        
        if (detailsData.accountNumber) bankDetails.accountNumber = detailsData.accountNumber;
        if (detailsData.bankName) bankDetails.bankName = detailsData.bankName;
        if (detailsData.ifscCode) bankDetails.ifscCode = detailsData.ifscCode;
        if (detailsData.pfNumber) bankDetails.pfNumber = detailsData.pfNumber;
        if (detailsData.esiNumber) bankDetails.esiNumber = detailsData.esiNumber;
        if (detailsData.panNumber) bankDetails.panNumber = detailsData.panNumber;
        
        if (Object.keys(bankDetails).length > 0) {
          updatePayload.bankDetails = bankDetails;
        }
      }

      console.log('Saving profile data:', updatePayload);

      const response = await authAPI.updateProfile(updatePayload);
      
      // Check if response is successful
      if (response.data && response.data.user) {
        // Update local profile data with the response
        setProfileData(response.data.user);
        setHasChanges(false);
        
        // Clear saved form state after successful save
        setFormDataState({
          personal: {},
          work: {},
          emergency: {},
          bank: {},
          documents: {}
        });
        
        setNotification({
          type: 'success',
          message: response.data.message || 'Profile updated successfully!'
        });
        
        // Dispatch event to notify MyProfile component to refresh
        window.dispatchEvent(new CustomEvent('profileUpdated'));
        
        // Clear notification after 3 seconds
        setTimeout(() => setNotification(null), 3000);
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (error) {
      console.error('Error updating profile:', error);
      
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        if (Array.isArray(errors)) {
          errorMessage = errors.map(err => err.message || err.msg || err).join(', ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setNotification({
        type: 'error',
        message: errorMessage
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    // Reset all forms to original data
    setHasChanges(false);
    fetchProfileData();
    setNotification({
      type: 'info',
      message: 'Changes discarded'
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: 'bi-person' },
    { id: 'work', label: 'Work Info', icon: 'bi-briefcase' },
    { id: 'documents', label: 'Documents', icon: 'bi-file-text' },
    { id: 'emergency', label: 'Emergency Contact', icon: 'bi-person-exclamation' },
    { id: 'bank', label: 'Bank Details', icon: 'bi-bank' }
  ];

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

    // Merge profile data with saved form data for current tab
    const getFormData = (tabName) => {
      const savedData = formDataState[tabName];
      if (savedData && Object.keys(savedData).length > 0) {
        return { ...profileData, ...savedData };
      }
      return profileData;
    };

    switch (activeTab) {
      case 'personal':
        return (
          <PersonalInfoForm 
            ref={personalFormRef}
            data={getFormData('personal')} 
            onChange={handleFormChange}
          />
        );
      case 'work':
        return (
          <WorkInfoForm 
            ref={workFormRef}
            data={getFormData('work')} 
            onChange={handleFormChange}
          />
        );
      case 'documents':
        return (
          <DocumentsForm 
            ref={documentsFormRef}
            data={getFormData('documents')} 
            onChange={handleFormChange}
          />
        );
      case 'emergency':
        return (
          <EmergencyContactForm 
            ref={emergencyFormRef}
            data={getFormData('emergency')} 
            onChange={handleFormChange}
          />
        );
      case 'bank':
        return (
          <BankDetailsForm 
            ref={bankFormRef}
            data={getFormData('bank')} 
            onChange={handleFormChange}
          />
        );
      default:
        return <div>Select a tab to edit content</div>;
    }
  };

  return (
    <div className="container-fluid py-4">
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

      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1">Edit Profile</h2>
              <p className="text-muted mb-0">Update your profile information</p>
            </div>
            <div>
              <button 
                className="btn btn-outline-secondary"
                onClick={() => navigate('/profile')}
              >
                <i className="bi bi-arrow-left me-2"></i>
                Back to Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          {/* Navigation Tabs */}
          <div className="card">
            <div className="card-header">
              <ul className="nav nav-tabs card-header-tabs" role="tablist">
                {tabs.map((tab) => (
                  <li key={tab.id} className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                      onClick={() => handleTabSwitch(tab.id)}
                      type="button"
                      role="tab"
                    >
                      <i className={`${tab.icon} me-2`}></i>
                      {tab.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card-body">
              {renderTabContent()}
            </div>
            
            {/* Common Save/Discard Footer */}
            <div className="card-footer bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  {hasChanges && (
                    <small className="text-warning">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      You have unsaved changes
                    </small>
                  )}
                </div>
                <div className="d-flex gap-2">
                  <button 
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleDiscard}
                    disabled={!hasChanges || saving}
                  >
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Discard Changes
                  </button>
                  <button 
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveAll}
                    disabled={!hasChanges || saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-2"></i>
                        Save All Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
