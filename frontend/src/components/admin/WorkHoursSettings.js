import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const WorkHoursSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    checkInTime: '09:00',
    checkOutTime: '18:00',
    workingHours: 8,
    minimumWorkHours: 6,
    lateThreshold: 30,
    breakTime: 60
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Time picker state
  const [checkInHour, setCheckInHour] = useState(9);
  const [checkInMinute, setCheckInMinute] = useState(0);
  const [checkOutHour, setCheckOutHour] = useState(18);
  const [checkOutMinute, setCheckOutMinute] = useState(0);

  // Calculate working hours based on check-in and check-out times
  const calculateWorkingHours = (checkInTime, checkOutTime) => {
    const [checkInHour, checkInMinute] = checkInTime.split(':').map(Number);
    const [checkOutHour, checkOutMinute] = checkOutTime.split(':').map(Number);
    
    const checkInMinutes = checkInHour * 60 + checkInMinute;
    const checkOutMinutes = checkOutHour * 60 + checkOutMinute;
    
    let diffMinutes = checkOutMinutes - checkInMinutes;
    
    // Handle case where check-out is next day (e.g., night shift)
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60; // Add 24 hours in minutes
    }
    
    const hours = diffMinutes / 60;
    return Math.round(hours * 100) / 100; // Round to 2 decimal places for more precision
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Recalculate working hours when check-in or check-out time changes
  useEffect(() => {
    if (settings.checkInTime && settings.checkOutTime) {
      const calculatedHours = calculateWorkingHours(settings.checkInTime, settings.checkOutTime);
      if (calculatedHours !== settings.workingHours) {
        setSettings(prev => ({ ...prev, workingHours: calculatedHours }));
      }
    }
  }, [settings.checkInTime, settings.checkOutTime]);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/system/work-hours');
      if (response.data.success && response.data.workHours) {
        const workHours = response.data.workHours;
        const newSettings = {
          checkInTime: workHours.checkInTime || '09:00',
          checkOutTime: workHours.checkOutTime || '18:00',
          workingHours: workHours.workingHours || 8,
          minimumWorkHours: workHours.minimumWorkHours || 6,
          lateThreshold: 30, // Default value
          breakTime: 60 // Default value
        };
        setSettings(newSettings);
        
        // Parse time for custom selectors
        const [checkInH, checkInM] = newSettings.checkInTime.split(':').map(Number);
        const [checkOutH, checkOutM] = newSettings.checkOutTime.split(':').map(Number);
        setCheckInHour(checkInH);
        setCheckInMinute(checkInM);
        setCheckOutHour(checkOutH);
        setCheckOutMinute(checkOutM);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage('Error loading settings. Using default values.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    console.log('Starting to save work hours settings...');
    
    try {
      const settingsToUpdate = [
        {
          key: 'checkInTime',
          value: settings.checkInTime,
          description: 'Standard check-in time for all employees'
        },
        {
          key: 'checkOutTime',
          value: settings.checkOutTime,
          description: 'Standard check-out time for all employees'
        },
        {
          key: 'workingHours',
          value: settings.workingHours.toString(),
          description: 'Required working hours per day'
        },
        {
          key: 'minimumWorkHours',
          value: settings.minimumWorkHours.toString(),
          description: 'Minimum required working hours per day'
        },
        {
          key: 'lateThreshold',
          value: settings.lateThreshold.toString(),
          description: 'Minutes after which employee is marked as late'
        },
        {
          key: 'breakTime',
          value: settings.breakTime.toString(),
          description: 'Default break time in minutes'
        }
      ];

      // Update settings one by one with detailed logging
      for (let i = 0; i < settingsToUpdate.length; i++) {
        const setting = settingsToUpdate[i];
        console.log(`Updating ${setting.key} with value: ${setting.value}`);
        
        try {
          const response = await api.put(`/system/settings/${setting.key}`, {
            settingValue: setting.value,
            description: setting.description
          });
          
          console.log(`✅ ${setting.key} updated successfully:`, response.data);
          
          // Check if response indicates success
          if (!response.data || !response.data.success) {
            throw new Error(`API returned unsuccessful response for ${setting.key}: ${JSON.stringify(response.data)}`);
          }
          
        } catch (settingError) {
          console.error(`❌ Failed to update ${setting.key}:`, settingError);
          console.error('Error details:', {
            message: settingError.message,
            status: settingError.response?.status,
            statusText: settingError.response?.statusText,
            data: settingError.response?.data,
            config: {
              url: settingError.config?.url,
              method: settingError.config?.method,
              headers: settingError.config?.headers
            }
          });
          
          // Re-throw with more specific error message
          throw new Error(`Failed to update ${setting.key}: ${settingError.message}`);
        }
      }

      console.log('🎉 All settings updated successfully!');
      setMessage('Work hours settings updated successfully!');
      setTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      console.error('❌ Error updating settings:', error);
      console.error('Full error object:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
        request: error.request
      });
      
      // More specific error message
      const errorMessage = error.message.includes('Failed to update') 
        ? error.message 
        : `Error updating settings: ${error.message || 'Unknown error'}. Please try again.`;
        
      setMessage(errorMessage);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Update time when selectors change
  const updateCheckInTime = (hour, minute) => {
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    setSettings(prev => ({ 
      ...prev, 
      checkInTime: timeString
    }));
  };

  const updateCheckOutTime = (hour, minute) => {
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    setSettings(prev => ({ 
      ...prev, 
      checkOutTime: timeString
    }));
  };

  // Helper functions for 12-hour format
  const convertTo12Hour = (hour24) => {
    if (hour24 === 0) return 12;
    if (hour24 > 12) return hour24 - 12;
    return hour24;
  };

  const getAMPM = (hour24) => {
    return hour24 >= 12 ? 'PM' : 'AM';
  };

  const convertTo24Hour = (hour12, ampm) => {
    if (ampm === 'AM') {
      return hour12 === 12 ? 0 : hour12;
    } else {
      return hour12 === 12 ? 12 : hour12 + 12;
    }
  };

  const format12Hour = (hour24, minute) => {
    const hour12 = convertTo12Hour(hour24);
    const ampm = getAMPM(hour24);
    return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  // Custom Time Picker Component with 12-hour format
  const CustomTimePicker = ({ hour, minute, onHourChange, onMinuteChange, label, icon, color }) => {
    const hours12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
    const minutes = Array.from({ length: 60 }, (_, i) => i);
    const currentHour12 = convertTo12Hour(hour);
    const currentAMPM = getAMPM(hour);

    const handleHourChange = (newHour12) => {
      const newHour24 = convertTo24Hour(parseInt(newHour12), currentAMPM);
      onHourChange(newHour24);
    };

    const handleAMPMChange = (newAMPM) => {
      const newHour24 = convertTo24Hour(currentHour12, newAMPM);
      onHourChange(newHour24);
    };

    return (
      <div className="p-4 border rounded-3 bg-light h-100">
        <div className="text-center mb-3">
          <div className={`text-${color} mb-2`}>
            <i className={icon} style={{fontSize: '2.5rem'}}></i>
          </div>
          <h6 className="fw-bold text-dark mb-0">{label}</h6>
        </div>
        
        <div className="row g-2">
          <div className="col-4">
            <label className="form-label small fw-semibold">Hour</label>
            <select 
              className="form-select form-select-lg text-center fw-bold"
              value={currentHour12}
              onChange={(e) => handleHourChange(e.target.value)}
              style={{fontSize: '1.1rem'}}
            >
              {hours12.map(h => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <div className="col-4">
            <label className="form-label small fw-semibold">Minute</label>
            <select 
              className="form-select form-select-lg text-center fw-bold"
              value={minute}
              onChange={(e) => onMinuteChange(parseInt(e.target.value))}
              style={{fontSize: '1.1rem'}}
            >
              {minutes.filter(m => m % 5 === 0).map(m => (
                <option key={m} value={m}>
                  {m.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
          <div className="col-4">
            <label className="form-label small fw-semibold">Period</label>
            <select 
              className="form-select form-select-lg text-center fw-bold"
              value={currentAMPM}
              onChange={(e) => handleAMPMChange(e.target.value)}
              style={{fontSize: '1.1rem'}}
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
        
        <div className="text-center mt-3">
          <div className="badge bg-primary px-3 py-2" style={{fontSize: '1.1rem'}}>
            {format12Hour(hour, minute)}
          </div>
        </div>
      </div>
    );
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
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
                <i className="bi bi-clock-history text-primary me-3"></i>
                Work Hours Configuration
              </h1>
              <p className="text-muted mb-0">Set standard check-in and check-out timings for all employees</p>
            </div>
            <div className="badge bg-light text-dark px-3 py-2">
              <i className="bi bi-people me-1"></i>
              Company-wide Settings
            </div>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div className="row mb-4">
          <div className="col-12">
            <div className={`alert ${message.includes('Error') ? 'alert-danger' : 'alert-success'} alert-dismissible fade show border-0 shadow-sm`}>
              <i className={`bi ${message.includes('Error') ? 'bi-exclamation-triangle' : 'bi-check-circle'} me-2`}></i>
              {message}
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setMessage('')}
              ></button>
            </div>
          </div>
        </div>
      )}

      <div className="row g-4">
        {/* Main Configuration Panel */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-gradient" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
              <h5 className="mb-0 text-white fw-semibold">
                <i className="bi bi-gear-fill me-2"></i>
                Time Settings Configuration
              </h5>
            </div>
            <div className="card-body p-4">
              
              {/* Interactive Time Settings Row */}
              <div className="row g-4 mb-4">
                <div className="col-md-6">
                  <CustomTimePicker
                    hour={checkInHour}
                    minute={checkInMinute}
                    onHourChange={(h) => {
                      setCheckInHour(h);
                      updateCheckInTime(h, checkInMinute);
                    }}
                    onMinuteChange={(m) => {
                      setCheckInMinute(m);
                      updateCheckInTime(checkInHour, m);
                    }}
                    label="Check-in Time"
                    icon="bi bi-sunrise-fill"
                    color="success"
                  />
                </div>

                <div className="col-md-6">
                  <CustomTimePicker
                    hour={checkOutHour}
                    minute={checkOutMinute}
                    onHourChange={(h) => {
                      setCheckOutHour(h);
                      updateCheckOutTime(h, checkOutMinute);
                    }}
                    onMinuteChange={(m) => {
                      setCheckOutMinute(m);
                      updateCheckOutTime(checkOutHour, m);
                    }}
                    label="Check-out Time"
                    icon="bi bi-sunset-fill"
                    color="warning"
                  />
                </div>
              </div>

              {/* Work Hours Settings Row */}
              <div className="row g-3 mb-4">
                <div className="col-md-3">
                  <div className="text-center p-3 border rounded-3 h-100">
                    <div className="text-primary mb-2">
                      <i className="bi bi-hourglass-split" style={{fontSize: '2rem'}}></i>
                    </div>
                    <label className="form-label fw-semibold text-dark mb-2">
                      Standard Hours
                      <i className="bi bi-calculator ms-1 text-primary" title="Auto-calculated"></i>
                    </label>
                    <div className="mb-2">
                      <div className="h4 fw-bold text-primary mb-1">
                        {Math.floor(settings.workingHours)}h {Math.round((settings.workingHours % 1) * 60)}m
                      </div>
                    </div>
                    <input
                      type="number"
                      className="form-control form-control-lg text-center border-2"
                      min="0.1"
                      max="12"
                      step="0.1"
                      value={settings.workingHours}
                      readOnly
                      style={{fontSize: '1rem', fontWeight: 'bold', backgroundColor: '#f8f9fa'}}
                      title="Automatically calculated based on check-in and check-out times"
                    />
                    <small className="text-muted mt-1 d-block">
                      Auto-calculated from times
                    </small>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="text-center p-3 border rounded-3 h-100">
                    <div className="text-success mb-2">
                      <i className="bi bi-clock-fill" style={{fontSize: '2rem'}}></i>
                    </div>
                    <label className="form-label fw-semibold text-dark mb-2">
                      Minimum Hours
                    </label>
                    <div className="mb-2">
                      <div className="h4 fw-bold text-success mb-1">
                        {Math.floor(settings.minimumWorkHours)}h {Math.round((settings.minimumWorkHours % 1) * 60)}m
                      </div>
                    </div>
                    <input
                      type="number"
                      className="form-control form-control-lg text-center border-2"
                      min="0.1"
                      max={settings.workingHours}
                      step="0.1"
                      value={settings.minimumWorkHours}
                      onChange={(e) => handleChange('minimumWorkHours', parseFloat(e.target.value))}
                      style={{fontSize: '1.2rem', fontWeight: 'bold'}}
                    />
                    <small className="text-muted mt-1 d-block">
                      Required minimum hours
                    </small>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="text-center p-3 border rounded-3 h-100">
                    <div className="text-danger mb-2">
                      <i className="bi bi-exclamation-triangle-fill" style={{fontSize: '2rem'}}></i>
                    </div>
                    <label className="form-label fw-semibold text-dark mb-2">
                      Late Threshold
                    </label>
                    <div className="mb-2">
                      <div className="h4 fw-bold text-danger mb-1">
                        {settings.lateThreshold}
                        <small className="fs-6 text-muted ms-1">min</small>
                      </div>
                    </div>
                    <input
                      type="number"
                      className="form-control form-control-lg text-center border-2"
                      min="1"
                      max="120"
                      value={settings.lateThreshold}
                      onChange={(e) => handleChange('lateThreshold', parseInt(e.target.value))}
                      style={{fontSize: '1.1rem', fontWeight: 'bold'}}
                    />
                    <small className="text-muted mt-1 d-block">
                      Grace period before "Late"
                    </small>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="text-center p-3 border rounded-3 h-100">
                    <div className="text-info mb-2">
                      <i className="bi bi-cup-hot-fill" style={{fontSize: '2rem'}}></i>
                    </div>
                    <label className="form-label fw-semibold text-dark mb-2">
                      Break Duration
                    </label>
                    <div className="mb-2">
                      <div className="h4 fw-bold text-info mb-1">
                        {settings.breakTime}
                        <small className="fs-6 text-muted ms-1">min</small>
                      </div>
                    </div>
                    <input
                      type="number"
                      className="form-control form-control-lg text-center border-2"
                      min="0"
                      max="120"
                      value={settings.breakTime}
                      onChange={(e) => handleChange('breakTime', parseInt(e.target.value))}
                      style={{fontSize: '1.1rem', fontWeight: 'bold'}}
                    />
                    <small className="text-muted mt-1 d-block">
                      Default break time
                    </small>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="d-flex justify-content-end mt-4 pt-3 border-top">
                <button
                  className="btn btn-primary btn-lg px-4 py-2 shadow-sm"
                  onClick={handleSave}
                  disabled={saving}
                  style={{borderRadius: '10px'}}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle-fill me-2"></i>
                      Save Configuration
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Panel */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-gradient text-white" style={{background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'}}>
              <h6 className="mb-0 fw-semibold">
                <i className="bi bi-eye-fill me-2"></i>
                Current Configuration
              </h6>
            </div>
            <div className="card-body p-4">
              
              {/* Work Schedule Display */}
              <div className="text-center mb-4 p-3 bg-light rounded-3">
                <div className="h4 text-primary mb-2">
                  <i className="bi bi-calendar-week"></i>
                </div>
                <h6 className="fw-bold text-dark mb-1">Work Schedule</h6>
                <div className="h5 text-primary fw-bold">
                  {settings.checkInTime} - {settings.checkOutTime}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="row g-3 mb-4">
                <div className="col-6">
                  <div className="text-center p-2 border rounded">
                    <div className="text-success fw-bold h6 mb-1">{settings.workingHours}h</div>
                    <small className="text-muted">Standard Hours</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="text-center p-2 border rounded">
                    <div className="text-primary fw-bold h6 mb-1">{settings.minimumWorkHours}h</div>
                    <small className="text-muted">Minimum Hours</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="text-center p-2 border rounded">
                    <div className="text-warning fw-bold h6 mb-1">{settings.lateThreshold}min</div>
                    <small className="text-muted">Late Grace</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="text-center p-2 border rounded">
                    <div className="text-info fw-bold h6 mb-1">{settings.breakTime}min</div>
                    <small className="text-muted">Break Time</small>
                  </div>
                </div>
              </div>

              {/* Important Note */}
              <div className="alert alert-light border border-primary">
                <div className="d-flex align-items-start">
                  <i className="bi bi-lightbulb-fill text-warning me-2 mt-1"></i>
                  <div>
                    <strong className="text-dark">Important Note:</strong>
                    <p className="mb-0 small text-muted mt-1">
                      Changes will apply to new attendance records only. 
                      Existing attendance data will remain unchanged.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkHoursSettings;
