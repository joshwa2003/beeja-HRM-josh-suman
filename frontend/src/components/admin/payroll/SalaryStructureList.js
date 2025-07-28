import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SalaryStructureList = () => {
  const navigate = useNavigate();
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    isActive: 'true',
    role: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchSalaryStructures();
  }, [filters, pagination.page]);

  const fetchSalaryStructures = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });

      const response = await fetch(`/api/salary-structures?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStructures(data.data.docs || []);
        setPagination(prev => ({
          ...prev,
          total: data.data.totalDocs || 0,
          totalPages: data.data.totalPages || 0
        }));
      } else {
        throw new Error('Failed to fetch salary structures');
      }
    } catch (error) {
      console.error('Error fetching salary structures:', error);
      setError('Failed to load salary structures');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSetDefault = async (structureId) => {
    try {
      const response = await fetch(`/api/salary-structures/${structureId}/set-default`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchSalaryStructures();
      } else {
        throw new Error('Failed to set default structure');
      }
    } catch (error) {
      console.error('Error setting default structure:', error);
      setError('Failed to set default structure');
    }
  };

  const handleClone = async (structureId, currentName) => {
    const newName = prompt(`Enter name for cloned structure:`, `${currentName} - Copy`);
    if (!newName) return;

    try {
      const response = await fetch(`/api/salary-structures/${structureId}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ newName })
      });

      if (response.ok) {
        fetchSalaryStructures();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clone structure');
      }
    } catch (error) {
      console.error('Error cloning structure:', error);
      setError(error.message);
    }
  };

  const handleDelete = async (structureId, structureName) => {
    if (!window.confirm(`Are you sure you want to delete "${structureName}"?`)) return;

    try {
      const response = await fetch(`/api/salary-structures/${structureId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchSalaryStructures();
      } else {
        throw new Error('Failed to delete structure');
      }
    } catch (error) {
      console.error('Error deleting structure:', error);
      setError('Failed to delete structure');
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

  const calculateGrossSalary = (structure) => {
    const basic = structure.basicSalary || 0;
    const allowances = Object.values(structure.allowances || {}).reduce((sum, allowance) => {
      if (allowance.type === 'percentage') {
        return sum + (basic * allowance.value / 100);
      }
      return sum + (allowance.value || 0);
    }, 0);
    return basic + allowances;
  };

  if (loading && structures.length === 0) {
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
                <i className="bi bi-calculator me-2"></i>
                Salary Structures
              </h2>
              <p className="text-muted mb-0">Manage salary templates and structures</p>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/admin/payroll/structure/new')}
            >
              <i className="bi bi-plus me-2"></i>
              Create Structure
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-danger alert-dismissible">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setError('')}
              ></button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-select"
                    value={filters.isActive}
                    onChange={(e) => handleFilterChange('isActive', e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Role</label>
                  <select 
                    className="form-select"
                    value={filters.role}
                    onChange={(e) => handleFilterChange('role', e.target.value)}
                  >
                    <option value="">All Roles</option>
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
                <div className="col-md-4">
                  <label className="form-label">Search</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="Search by name or description..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">&nbsp;</label>
                  <button 
                    className="btn btn-outline-secondary w-100"
                    onClick={() => {
                      setFilters({ isActive: 'true', role: '', search: '' });
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                  >
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Salary Structures List */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              {structures.length > 0 ? (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Structure Name</th>
                          <th>Basic Salary</th>
                          <th>Gross Salary</th>
                          <th>Applicable For</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {structures.map((structure) => (
                          <tr key={structure._id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div>
                                  <h6 className="mb-0">
                                    {structure.name}
                                    {structure.isDefault && (
                                      <span className="badge bg-primary ms-2">Default</span>
                                    )}
                                  </h6>
                                  {structure.description && (
                                    <small className="text-muted">{structure.description}</small>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <strong>{formatCurrency(structure.basicSalary)}</strong>
                            </td>
                            <td>
                              <strong className="text-success">
                                {formatCurrency(calculateGrossSalary(structure))}
                              </strong>
                            </td>
                            <td>
                              <div>
                                {structure.applicableFor?.roles?.length > 0 && (
                                  <div>
                                    <small className="text-muted">Roles: </small>
                                    <small>{structure.applicableFor.roles.join(', ')}</small>
                                  </div>
                                )}
                                {structure.applicableFor?.departments?.length > 0 && (
                                  <div>
                                    <small className="text-muted">Departments: </small>
                                    <small>
                                      {structure.applicableFor.departments.map(dept => dept.name).join(', ')}
                                    </small>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${structure.isActive ? 'bg-success' : 'bg-secondary'}`}>
                                {structure.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <button 
                                  className="btn btn-outline-primary"
                                  onClick={() => navigate(`/admin/payroll/structure/${structure._id}`)}
                                  title="View Details"
                                >
                                  <i className="bi bi-eye"></i>
                                </button>
                                <button 
                                  className="btn btn-outline-secondary"
                                  onClick={() => navigate(`/admin/payroll/structure/${structure._id}/edit`)}
                                  title="Edit"
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button 
                                  className="btn btn-outline-info"
                                  onClick={() => handleClone(structure._id, structure.name)}
                                  title="Clone"
                                >
                                  <i className="bi bi-files"></i>
                                </button>
                                {!structure.isDefault && (
                                  <button 
                                    className="btn btn-outline-success"
                                    onClick={() => handleSetDefault(structure._id)}
                                    title="Set as Default"
                                  >
                                    <i className="bi bi-star"></i>
                                  </button>
                                )}
                                <button 
                                  className="btn btn-outline-danger"
                                  onClick={() => handleDelete(structure._id, structure.name)}
                                  title="Delete"
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div>
                        <small className="text-muted">
                          Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                          {pagination.total} entries
                        </small>
                      </div>
                      <nav>
                        <ul className="pagination pagination-sm mb-0">
                          <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                            <button 
                              className="page-link"
                              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                              disabled={pagination.page === 1}
                            >
                              Previous
                            </button>
                          </li>
                          {[...Array(pagination.totalPages)].map((_, index) => (
                            <li 
                              key={index + 1} 
                              className={`page-item ${pagination.page === index + 1 ? 'active' : ''}`}
                            >
                              <button 
                                className="page-link"
                                onClick={() => setPagination(prev => ({ ...prev, page: index + 1 }))}
                              >
                                {index + 1}
                              </button>
                            </li>
                          ))}
                          <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                            <button 
                              className="page-link"
                              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                              disabled={pagination.page === pagination.totalPages}
                            >
                              Next
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-5">
                  <i className="bi bi-calculator text-muted fs-1"></i>
                  <h5 className="mt-3 text-muted">No Salary Structures Found</h5>
                  <p className="text-muted">Create your first salary structure to get started.</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/admin/payroll/structure/new')}
                  >
                    <i className="bi bi-plus me-2"></i>
                    Create Structure
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryStructureList;
