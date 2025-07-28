import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import MyAttendance from '../MyAttendance';

const LeaveAttendanceManagement = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  const isActive = (path) => {
    return location.pathname.includes(path);
  };

  const OverviewTab = () => (
    <div className="container-fluid">
      <div className="alert alert-success">
        <h4><i className="bi bi-calendar3 me-2"></i>Leave & Attendance Management</h4>
        <p>This module includes:</p>
        <ul>
          <li>My Attendance - Track your daily attendance</li>
          <li>Leave request approval workflow</li>
          <li>Attendance tracking and reports</li>
          <li>Holiday calendar management</li>
          <li>Leave policy configuration</li>
          <li>Attendance regularization</li>
        </ul>
        <p className="mb-0"><strong>Status:</strong> <span className="badge bg-success">My Attendance Available</span> | <span className="badge bg-warning">Other Features In Development</span></p>
      </div>
      
      <div className="row mt-4">
        <div className="col-md-6 col-lg-4 mb-3">
          <div className="card h-100">
            <div className="card-body text-center">
              <i className="bi bi-clock-history text-primary" style={{ fontSize: '3rem' }}></i>
              <h5 className="card-title mt-3">My Attendance</h5>
              <p className="card-text">Track your daily check-in/check-out, view attendance history and monthly summaries.</p>
              <Link to="/admin/leave/my-attendance" className="btn btn-primary">
                <i className="bi bi-arrow-right me-2"></i>
                View My Attendance
              </Link>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 col-lg-4 mb-3">
          <div className="card h-100">
            <div className="card-body text-center">
              <i className="bi bi-calendar-check text-success" style={{ fontSize: '3rem' }}></i>
              <h5 className="card-title mt-3">Leave Requests</h5>
              <p className="card-text">Apply for leave, track leave balance and view leave history.</p>
              <button className="btn btn-outline-secondary" disabled>
                <i className="bi bi-tools me-2"></i>
                Coming Soon
              </button>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 col-lg-4 mb-3">
          <div className="card h-100">
            <div className="card-body text-center">
              <i className="bi bi-bar-chart text-info" style={{ fontSize: '3rem' }}></i>
              <h5 className="card-title mt-3">Reports</h5>
              <p className="card-text">Generate attendance reports, leave reports and analytics.</p>
              <button className="btn btn-outline-secondary" disabled>
                <i className="bi bi-tools me-2"></i>
                Coming Soon
              </button>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 col-lg-4 mb-3">
          <div className="card h-100">
            <div className="card-body text-center">
              <i className="bi bi-calendar3 text-warning" style={{ fontSize: '3rem' }}></i>
              <h5 className="card-title mt-3">Holiday Calendar</h5>
              <p className="card-text">View company holidays and important dates.</p>
              <button className="btn btn-outline-secondary" disabled>
                <i className="bi bi-tools me-2"></i>
                Coming Soon
              </button>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 col-lg-4 mb-3">
          <div className="card h-100">
            <div className="card-body text-center">
              <i className="bi bi-gear text-secondary" style={{ fontSize: '3rem' }}></i>
              <h5 className="card-title mt-3">Policies</h5>
              <p className="card-text">Configure leave policies and attendance rules.</p>
              <button className="btn btn-outline-secondary" disabled>
                <i className="bi bi-tools me-2"></i>
                Coming Soon
              </button>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 col-lg-4 mb-3">
          <div className="card h-100">
            <div className="card-body text-center">
              <i className="bi bi-pencil-square text-danger" style={{ fontSize: '3rem' }}></i>
              <h5 className="card-title mt-3">Regularization</h5>
              <p className="card-text">Request attendance regularization for missed punches.</p>
              <button className="btn btn-outline-secondary" disabled>
                <i className="bi bi-tools me-2"></i>
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-fluid">
      {/* Navigation Tabs */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">
                <i className="bi bi-calendar3 me-2"></i>
                Leave & Attendance Management
              </h4>
            </div>
            <div className="card-body p-0">
              <nav className="nav nav-tabs" role="tablist">
                <Link 
                  to="/admin/leave" 
                  className={`nav-link ${!isActive('my-attendance') ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  <i className="bi bi-house me-2"></i>
                  Overview
                </Link>
                <Link 
                  to="/admin/leave/my-attendance" 
                  className={`nav-link ${isActive('my-attendance') ? 'active' : ''}`}
                  onClick={() => setActiveTab('attendance')}
                >
                  <i className="bi bi-clock-history me-2"></i>
                  My Attendance
                </Link>
                <span className="nav-link disabled">
                  <i className="bi bi-calendar-check me-2"></i>
                  Leave Requests
                  <small className="ms-1 text-muted">(Coming Soon)</small>
                </span>
                <span className="nav-link disabled">
                  <i className="bi bi-bar-chart me-2"></i>
                  Reports
                  <small className="ms-1 text-muted">(Coming Soon)</small>
                </span>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <Routes>
        <Route path="/" element={<OverviewTab />} />
        <Route path="/my-attendance" element={<MyAttendance />} />
        <Route path="/*" element={<OverviewTab />} />
      </Routes>
    </div>
  );
};

export default LeaveAttendanceManagement;
