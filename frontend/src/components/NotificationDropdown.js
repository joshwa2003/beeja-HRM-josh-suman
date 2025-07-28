import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../utils/api';
import '../styles/notifications.css';

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch recent notifications and unread count
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationAPI.getRecentNotifications({ limit: 5 });
      if (response.data.success) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count only
  const fetchUnreadCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      if (response.data.success) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      // Update local state
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

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch unread count on component mount and set up polling
  useEffect(() => {
    fetchUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInMinutes = Math.floor((now - notificationDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  // Get notification icon based on type
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

  // Get notification color based on type and priority
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

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="notification-loading">
      <div className="d-flex flex-column gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="notification-skeleton">
            <div className="d-flex align-items-start">
              <div className="skeleton skeleton-icon"></div>
              <div className="flex-grow-1">
                <div className="skeleton skeleton-title"></div>
                <div className="skeleton skeleton-message"></div>
                <div className="skeleton skeleton-time"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <button
        className="btn notification-button position-relative"
        onClick={toggleDropdown}
        aria-label="Notifications"
        title={`${unreadCount} unread notifications`}
      >
        <i className="bi bi-bell fs-5 text-white"></i>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown-menu show">
          <div className="notification-header">
            <div className="d-flex justify-content-between align-items-center">
              <h6>Notifications</h6>
              {unreadCount > 0 && (
                <button
                  className="notification-mark-all-btn"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                >
                  <i className="bi bi-check-all me-1"></i>
                  Mark all read
                </button>
              )}
            </div>
          </div>
          
          {loading ? (
            <LoadingSkeleton />
          ) : notifications.length > 0 ? (
            <div className="notification-list">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                  onClick={() => !notification.isRead && markAsRead(notification._id)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !notification.isRead) {
                      markAsRead(notification._id);
                    }
                  }}
                >
                  <div className="d-flex align-items-start">
                    <div className={`notification-icon ${notification.type.replace('_', '-')}`}>
                      <i className={getNotificationIcon(notification.type)}></i>
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">
                        <span>{notification.title}</span>
                        {!notification.isRead && (
                          <span className="notification-new-badge">New</span>
                        )}
                      </div>
                      <div className="notification-message">
                        {notification.message.length > 80 
                          ? `${notification.message.substring(0, 80)}...` 
                          : notification.message
                        }
                      </div>
                      <div className="notification-time">
                        <i className="bi bi-clock me-1"></i>
                        {formatTimeAgo(notification.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="notification-empty">
              <div className="notification-empty-icon">
                <i className="bi bi-bell-slash"></i>
              </div>
              <div className="notification-empty-title">No notifications</div>
              <div className="notification-empty-text">
                You're all caught up! Check back later for updates.
              </div>
            </div>
          )}
          
          <div className="notification-footer">
            <button
              className="notification-view-all-btn"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
            >
              <i className="bi bi-arrow-right me-2"></i>
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
