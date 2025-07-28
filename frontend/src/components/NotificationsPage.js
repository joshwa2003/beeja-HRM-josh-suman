import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../utils/api';
import '../styles/notifications.css';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterRead, setFilterRead] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState([]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 20,
        search: searchTerm || undefined,
        type: filterType || undefined,
        isRead: filterRead || undefined
      };

      const response = await notificationAPI.getMyNotifications(params);
      if (response.data.success) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount);
        setTotalPages(response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterType, filterRead]);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true, readAt: new Date() }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true, readAt: new Date() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Mark selected as read
  const markSelectedAsRead = async () => {
    if (selectedNotifications.length === 0) return;

    try {
      await notificationAPI.markMultipleAsRead(selectedNotifications);
      setNotifications(prev => 
        prev.map(notif => 
          selectedNotifications.includes(notif._id)
            ? { ...notif, isRead: true, readAt: new Date() }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - selectedNotifications.length));
      setSelectedNotifications([]);
    } catch (error) {
      console.error('Error marking selected as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;

    try {
      await notificationAPI.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      
      // Update unread count if deleted notification was unread
      const deletedNotification = notifications.find(n => n._id === notificationId);
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchNotifications();
  };

  // Handle filter change
  const handleFilterChange = (filterName, value) => {
    if (filterName === 'type') setFilterType(value);
    if (filterName === 'read') setFilterRead(value);
    setCurrentPage(1);
  };

  // Handle checkbox selection
  const handleCheckboxChange = (notificationId) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  // Select all notifications
  const handleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map(n => n._id));
    }
  };

  // Format time
  const formatTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'checkout_reminder':
        return 'bi-clock';
      case 'auto_checkout':
        return 'bi-robot';
      case 'overtime_alert':
        return 'bi-currency-dollar';
      case 'system':
        return 'bi-gear';
      default:
        return 'bi-bell';
    }
  };

  // Get notification color
  const getNotificationColor = (type, priority) => {
    if (priority === 'urgent') return 'text-danger';
    if (priority === 'high') return 'text-warning';
    
    switch (type) {
      case 'checkout_reminder':
        return 'text-primary';
      case 'auto_checkout':
        return 'text-info';
      case 'overtime_alert':
        return 'text-success';
      case 'system':
        return 'text-secondary';
      default:
        return 'text-muted';
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority) => {
    const colors = {
      urgent: 'bg-danger',
      high: 'bg-warning',
      medium: 'bg-info',
      low: 'bg-secondary'
    };
    
    return (
      <span className={`badge ${colors[priority] || 'bg-secondary'} ms-2`}>
        {priority}
      </span>
    );
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div className="notifications-page">
      <div className="container-fluid">
        {/* Header */}
        <div className="row">
          <div className="col-12">
            <div className="notifications-page-header">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <h2 className="notifications-page-title">
                  <i className="bi bi-bell"></i>
                  Notifications
                  {unreadCount > 0 && (
                    <span className="notifications-unread-badge">{unreadCount}</span>
                  )}
                </h2>
                <div className="notifications-actions">
                  {selectedNotifications.length > 0 && (
                    <button
                      className="notifications-btn notifications-btn-outline"
                      onClick={markSelectedAsRead}
                    >
                      <i className="bi bi-check2-all me-1"></i>
                      Mark Selected ({selectedNotifications.length})
                    </button>
                  )}
                  {unreadCount > 0 && (
                    <button
                      className="notifications-btn notifications-btn-primary"
                      onClick={markAllAsRead}
                    >
                      <i className="bi bi-check-all me-1"></i>
                      Mark All as Read
                    </button>
                  )}
                  <button
                    className="notifications-btn notifications-btn-outline"
                    onClick={() => navigate(-1)}
                    title="Go back"
                  >
                    <i className="bi bi-arrow-left me-1"></i>
                    Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="row">
          <div className="col-12">
            <div className="notifications-filters-card">
              <form onSubmit={handleSearch}>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-search me-1"></i>
                      Search
                    </label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search notifications..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ borderRadius: '10px 0 0 10px' }}
                      />
                      <button 
                        className="btn notifications-btn-primary" 
                        type="submit"
                        style={{ borderRadius: '0 10px 10px 0' }}
                      >
                        <i className="bi bi-search"></i>
                      </button>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-funnel me-1"></i>
                      Type
                    </label>
                    <select
                      className="form-select"
                      value={filterType}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                      style={{ borderRadius: '10px' }}
                    >
                      <option value="">All Types</option>
                      <option value="checkout_reminder">Checkout Reminder</option>
                      <option value="auto_checkout">Auto Checkout</option>
                      <option value="overtime_alert">Overtime Alert</option>
                      <option value="system">System</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-eye me-1"></i>
                      Status
                    </label>
                    <select
                      className="form-select"
                      value={filterRead}
                      onChange={(e) => handleFilterChange('read', e.target.value)}
                      style={{ borderRadius: '10px' }}
                    >
                      <option value="">All</option>
                      <option value="false">Unread</option>
                      <option value="true">Read</option>
                    </select>
                  </div>
                  <div className="col-md-2 d-flex align-items-end">
                    <button
                      type="button"
                      className="notifications-btn notifications-btn-outline w-100"
                      onClick={() => {
                        setSearchTerm('');
                        setFilterType('');
                        setFilterRead('');
                        setCurrentPage(1);
                      }}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Clear
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="row">
          <div className="col-12">
            <div className="notifications-main-card">
              <div className="card-body p-0">
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <h5 className="text-muted">Loading notifications...</h5>
                  </div>
                ) : notifications.length > 0 ? (
                  <>
                    {/* Select All Checkbox */}
                    <div className="p-4 border-bottom bg-light">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={selectedNotifications.length === notifications.length}
                          onChange={handleSelectAll}
                          style={{ transform: 'scale(1.2)' }}
                        />
                        <label className="form-check-label fw-semibold ms-2">
                          Select All ({notifications.length} notifications)
                        </label>
                      </div>
                    </div>

                    {/* Notifications */}
                    <div className="list-group list-group-flush">
                      {notifications.map((notification) => (
                        <div
                          key={notification._id}
                          className={`notifications-page-item ${!notification.isRead ? 'unread' : ''}`}
                        >
                          <div className="d-flex align-items-start p-4">
                            <div className="form-check me-3">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={selectedNotifications.includes(notification._id)}
                                onChange={() => handleCheckboxChange(notification._id)}
                                style={{ transform: 'scale(1.2)' }}
                              />
                            </div>
                            
                            <div className={`notification-icon ${notification.type.replace('_', '-')} me-3`}>
                              <i className={getNotificationIcon(notification.type)}></i>
                            </div>
                            
                            <div className="flex-grow-1">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                                  {notification.title}
                                  {!notification.isRead && (
                                    <span className="notification-new-badge">New</span>
                                  )}
                                  {getPriorityBadge(notification.priority)}
                                </h6>
                                <div className="d-flex gap-2">
                                  {!notification.isRead && (
                                    <button
                                      className="btn btn-sm notifications-btn-outline"
                                      onClick={() => markAsRead(notification._id)}
                                      title="Mark as read"
                                    >
                                      <i className="bi bi-check"></i>
                                    </button>
                                  )}
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => deleteNotification(notification._id)}
                                    title="Delete notification"
                                    style={{ borderRadius: '8px' }}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </div>
                              </div>
                              
                              <p className="mb-3 text-muted" style={{ lineHeight: '1.5' }}>
                                {notification.message}
                              </p>
                              
                              <div className="d-flex justify-content-between align-items-center">
                                <div className="text-muted small">
                                  <i className="bi bi-clock me-1"></i>
                                  <span className="fw-medium">Created:</span> {formatTime(notification.createdAt)}
                                  {notification.readAt && (
                                    <span className="ms-3">
                                      <i className="bi bi-check-circle me-1 text-success"></i>
                                      <span className="fw-medium">Read:</span> {formatTime(notification.readAt)}
                                    </span>
                                  )}
                                </div>
                                <span className="badge bg-light text-dark px-3 py-2" style={{ borderRadius: '20px' }}>
                                  {notification.type.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="p-4 border-top bg-light">
                        <nav className="notifications-pagination">
                          <ul className="pagination justify-content-center mb-0">
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                              <button
                                className="page-link"
                                onClick={() => setCurrentPage(currentPage - 1)}
                                disabled={currentPage === 1}
                              >
                                <i className="bi bi-chevron-left me-1"></i>
                                Previous
                              </button>
                            </li>
                            
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                              <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                                <button
                                  className="page-link"
                                  onClick={() => setCurrentPage(page)}
                                >
                                  {page}
                                </button>
                              </li>
                            ))}
                            
                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                              <button
                                className="page-link"
                                onClick={() => setCurrentPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                              >
                                Next
                                <i className="bi bi-chevron-right ms-1"></i>
                              </button>
                            </li>
                          </ul>
                        </nav>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="notifications-page-empty">
                    <div className="notifications-page-empty-icon">
                      <i className="bi bi-bell-slash"></i>
                    </div>
                    <h4 className="text-muted mt-3 mb-2">No notifications found</h4>
                    <p className="text-muted mb-4">
                      {searchTerm || filterType || filterRead 
                        ? 'Try adjusting your search criteria or filters to find what you\'re looking for.'
                        : 'You\'re all caught up! New notifications will appear here when they arrive.'
                      }
                    </p>
                    {(searchTerm || filterType || filterRead) && (
                      <button
                        className="notifications-btn notifications-btn-primary"
                        onClick={() => {
                          setSearchTerm('');
                          setFilterType('');
                          setFilterRead('');
                          setCurrentPage(1);
                        }}
                      >
                        <i className="bi bi-arrow-clockwise me-2"></i>
                        Clear Filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
