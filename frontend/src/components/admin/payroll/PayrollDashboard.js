import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PayrollDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    currentMonth: {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      totalEmployees: 0,
      processedPayrolls: 0,
      pendingPayrolls: 0,
      totalGrossSalary: 0,
      totalNetSalary: 0
    },
    recentActivity: [],
    pendingApprovals: [],
    upcomingDeadlines: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch current month payroll summary
      const currentDate = new Date();
      const summaryResponse = await fetch(
        `/api/payroll/summary?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setDashboardData(prev => ({
          ...prev,
          currentMonth: {
            ...prev.currentMonth,
            ...summaryData.data
          }
        }));
      }

      // Fetch recent payrolls for activity
      const recentResponse = await fetch(
        `/api/payroll?page=1&limit=5&sortBy=updatedAt&sortOrder=desc`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (recentResponse.ok) {
        const recentData = await recentResponse.json();
        setDashboardData(prev => ({
          ...prev,
          recentActivity: recentData.data.docs || []
        }));
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Draft': return 'bg-secondary';
      case 'Processed': return 'bg-warning';
      case 'Paid': return 'bg-success';
      case 'Hold': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="mb-1">
                <i className="bi bi-currency-dollar me-2"></i>
                Payroll Dashboard
              </h2>
              <p className="text-muted mb-0">
                {getMonthName(dashboardData.currentMonth.month)} {dashboardData.currentMonth.year} Overview
              </p>
            </div>
            <div className="btn-group">
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/admin/payroll/process')}
              >
                <i className="bi bi-gear me-2"></i>
                Process Payroll
              </button>
              <button 
                className="btn btn-outline-primary"
                onClick={() => navigate('/admin/payroll/structure')}
              >
                <i className="bi bi-calculator me-2"></i>
                Salary Structures
              </button>
            </div>
          </div>
        </div>
      </div>

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
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-primary bg-opacity-10 p-3 rounded">
                    <i className="bi bi-people text-primary fs-4"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h6 className="text-muted mb-1">Total Employees</h6>
                  <h3 className="mb-0">{dashboardData.currentMonth.totalEmployees}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-success bg-opacity-10 p-3 rounded">
                    <i className="bi bi-check-circle text-success fs-4"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h6 className="text-muted mb-1">Processed</h6>
                  <h3 className="mb-0">{dashboardData.currentMonth.paidCount || 0}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-warning bg-opacity-10 p-3 rounded">
                    <i className="bi bi-clock text-warning fs-4"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h6 className="text-muted mb-1">Pending</h6>
                  <h3 className="mb-0">{dashboardData.currentMonth.pendingCount || 0}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-info bg-opacity-10 p-3 rounded">
                    <i className="bi bi-currency-rupee text-info fs-4"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h6 className="text-muted mb-1">Total Payout</h6>
                  <h3 className="mb-0 small">{formatCurrency(dashboardData.currentMonth.totalNetSalary)}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Recent Activity */}
        <div className="col-lg-8 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-activity me-2"></i>
                  Recent Payroll Activity
                </h5>
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => navigate('/admin/payroll')}
                >
                  View All
                </button>
              </div>
            </div>
            <div className="card-body">
              {dashboardData.recentActivity.length > 0 ? (
                <div className="list-group list-group-flush">
                  {dashboardData.recentActivity.map((payroll) => (
                    <div key={payroll._id} className="list-group-item border-0 px-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <h6 className="mb-1">
                            {payroll.employee?.firstName} {payroll.employee?.lastName}
                          </h6>
                          <p className="mb-1 text-muted small">
                            {getMonthName(payroll.payPeriod.month)} {payroll.payPeriod.year} • 
                            Net: {formatCurrency(payroll.netSalary)}
                          </p>
                          <small className="text-muted">
                            {new Date(payroll.updatedAt).toLocaleDateString()}
                          </small>
                        </div>
                        <span className={`badge ${getStatusBadgeClass(payroll.status)}`}>
                          {payroll.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-inbox text-muted fs-1"></i>
                  <p className="text-muted mt-2">No recent payroll activity</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-lg-4 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 pb-0">
              <h5 className="mb-0">
                <i className="bi bi-lightning me-2"></i>
                Quick Actions
              </h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <button 
                  className="btn btn-outline-primary text-start"
                  onClick={() => navigate('/admin/payroll/process')}
                >
                  <i className="bi bi-gear me-2"></i>
                  Process Monthly Payroll
                </button>
                <button 
                  className="btn btn-outline-success text-start"
                  onClick={() => navigate('/admin/payroll/payslips')}
                >
                  <i className="bi bi-file-earmark-text me-2"></i>
                  Generate Payslips
                </button>
                <button 
                  className="btn btn-outline-info text-start"
                  onClick={() => navigate('/admin/payroll/structure')}
                >
                  <i className="bi bi-calculator me-2"></i>
                  Manage Salary Structures
                </button>
                <button 
                  className="btn btn-outline-warning text-start"
                  onClick={() => navigate('/admin/payroll/reimbursements')}
                >
                  <i className="bi bi-receipt me-2"></i>
                  Review Reimbursements
                </button>
                <hr />
                <button 
                  className="btn btn-outline-secondary text-start"
                  onClick={() => navigate('/admin/reports/payroll')}
                >
                  <i className="bi bi-bar-chart me-2"></i>
                  Payroll Reports
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollDashboard;
