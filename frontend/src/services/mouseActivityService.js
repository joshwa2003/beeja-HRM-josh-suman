import { attendanceAPI } from '../utils/api';

class MouseActivityService {
  constructor() {
    this.isTracking = false;
    this.lastActivityTime = Date.now();
    this.activityUpdateInterval = null;
    this.inactivityCheckInterval = null;
    this.autoCheckoutWarningShown = false;
    this.autoCheckoutTimeout = 10 * 60 * 1000; // 10 minutes in milliseconds
    this.activityUpdateFrequency = 2 * 60 * 1000; // Update activity every 2 minutes
    this.inactivityCheckFrequency = 30 * 1000; // Check for inactivity every 30 seconds
    
    // Bind methods to maintain context
    this.handleActivity = this.handleActivity.bind(this);
    this.updateActivity = this.updateActivity.bind(this);
    this.checkInactivity = this.checkInactivity.bind(this);
  }

  // Start tracking mouse activity
  startTracking() {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.lastActivityTime = Date.now();
    this.autoCheckoutWarningShown = false;
    
    // Add event listeners for mouse activity
    document.addEventListener('mousemove', this.handleActivity);
    document.addEventListener('mousedown', this.handleActivity);
    document.addEventListener('mouseup', this.handleActivity);
    document.addEventListener('click', this.handleActivity);
    document.addEventListener('keydown', this.handleActivity);
    document.addEventListener('keyup', this.handleActivity);
    document.addEventListener('scroll', this.handleActivity);
    
    // Start periodic activity updates to backend
    this.activityUpdateInterval = setInterval(this.updateActivity, this.activityUpdateFrequency);
    
    // Start checking for inactivity
    this.inactivityCheckInterval = setInterval(this.checkInactivity, this.inactivityCheckFrequency);
    
    console.log('Mouse activity tracking started');
  }

  // Stop tracking mouse activity
  stopTracking() {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    
    // Remove event listeners
    document.removeEventListener('mousemove', this.handleActivity);
    document.removeEventListener('mousedown', this.handleActivity);
    document.removeEventListener('mouseup', this.handleActivity);
    document.removeEventListener('click', this.handleActivity);
    document.removeEventListener('keydown', this.handleActivity);
    document.removeEventListener('keyup', this.handleActivity);
    document.removeEventListener('scroll', this.handleActivity);
    
    // Clear intervals
    if (this.activityUpdateInterval) {
      clearInterval(this.activityUpdateInterval);
      this.activityUpdateInterval = null;
    }
    
    if (this.inactivityCheckInterval) {
      clearInterval(this.inactivityCheckInterval);
      this.inactivityCheckInterval = null;
    }
    
    console.log('Mouse activity tracking stopped');
  }

  // Handle user activity
  handleActivity() {
    this.lastActivityTime = Date.now();
    this.autoCheckoutWarningShown = false; // Reset warning flag on activity
  }

  // Update activity timestamp on backend
  async updateActivity() {
    if (!this.isTracking) return;
    
    try {
      await attendanceAPI.updateActivity();
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  }

  // Check for inactivity and show warnings
  checkInactivity() {
    if (!this.isTracking) return;
    
    const now = Date.now();
    const inactiveTime = now - this.lastActivityTime;
    
    // Get current time to check if it's past checkout time
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    
    // Assume standard checkout time is 18:00 (6 PM) - this should be configurable
    const checkoutHour = 18;
    const checkoutMinute = 0;
    
    const isAfterCheckoutTime = (currentHour > checkoutHour) || 
                               (currentHour === checkoutHour && currentMinute >= checkoutMinute);
    
    // Only check for auto-checkout if it's after checkout time
    if (!isAfterCheckoutTime) return;
    
    const warningTime = this.autoCheckoutTimeout - (2 * 60 * 1000); // Warn 2 minutes before auto-checkout
    
    // Show warning if user has been inactive for 8 minutes (2 minutes before auto-checkout)
    if (inactiveTime >= warningTime && !this.autoCheckoutWarningShown) {
      this.showAutoCheckoutWarning();
      this.autoCheckoutWarningShown = true;
    }
    
    // Auto-checkout if user has been inactive for the full timeout period
    if (inactiveTime >= this.autoCheckoutTimeout) {
      this.handleAutoCheckout();
    }
  }

  // Show auto-checkout warning
  showAutoCheckoutWarning() {
    const remainingTime = Math.ceil((this.autoCheckoutTimeout - (Date.now() - this.lastActivityTime)) / 1000 / 60);
    
    // Create a modal or notification
    const warningModal = document.createElement('div');
    warningModal.className = 'modal fade show';
    warningModal.style.display = 'block';
    warningModal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    warningModal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-warning text-dark">
            <h5 class="modal-title">
              <i class="bi bi-exclamation-triangle me-2"></i>
              Auto-Checkout Warning
            </h5>
          </div>
          <div class="modal-body text-center">
            <div class="mb-3">
              <i class="bi bi-clock text-warning" style="font-size: 3rem;"></i>
            </div>
            <h6>You will be automatically checked out in ${remainingTime} minute(s) due to inactivity.</h6>
            <p class="text-muted">Move your mouse or click anywhere to stay active.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-warning" onclick="this.closest('.modal').remove()">
              <i class="bi bi-check-circle me-1"></i>
              I'm Still Here
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(warningModal);
    
    // Auto-remove warning after 30 seconds
    setTimeout(() => {
      if (warningModal.parentNode) {
        warningModal.remove();
      }
    }, 30000);
  }

  // Handle auto-checkout
  async handleAutoCheckout() {
    try {
      // Stop tracking to prevent further checks
      this.stopTracking();
      
      // Show auto-checkout notification
      this.showAutoCheckoutNotification();
      
      // Trigger auto-checkout check on backend
      await attendanceAPI.checkAutoCheckout();
      
      // Refresh the page or redirect to show updated attendance
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } catch (error) {
      console.error('Auto-checkout failed:', error);
    }
  }

  // Show auto-checkout notification
  showAutoCheckoutNotification() {
    const notification = document.createElement('div');
    notification.className = 'modal fade show';
    notification.style.display = 'block';
    notification.style.backgroundColor = 'rgba(0,0,0,0.5)';
    notification.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-info text-white">
            <h5 class="modal-title">
              <i class="bi bi-info-circle me-2"></i>
              Auto-Checkout Completed
            </h5>
          </div>
          <div class="modal-body text-center">
            <div class="mb-3">
              <i class="bi bi-check-circle text-success" style="font-size: 3rem;"></i>
            </div>
            <h6>You have been automatically checked out due to inactivity.</h6>
            <p class="text-muted">Your attendance has been updated automatically.</p>
            <div class="spinner-border text-primary mt-2" role="status">
              <span class="visually-hidden">Refreshing...</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
  }

  // Get current activity status
  getActivityStatus() {
    const now = Date.now();
    const inactiveTime = now - this.lastActivityTime;
    
    return {
      isTracking: this.isTracking,
      lastActivityTime: this.lastActivityTime,
      inactiveTime: inactiveTime,
      inactiveMinutes: Math.floor(inactiveTime / 1000 / 60)
    };
  }

  // Set auto-checkout timeout (in minutes)
  setAutoCheckoutTimeout(minutes) {
    this.autoCheckoutTimeout = minutes * 60 * 1000;
  }
}

// Create singleton instance
const mouseActivityService = new MouseActivityService();

export default mouseActivityService;
