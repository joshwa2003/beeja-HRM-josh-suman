# Complete Guide: Enable Email Verification for Password Change

## Current Status ✅

Your HRM system **already has a complete email verification system implemented**! Here's what's working:

### ✅ Implemented Features:
- **OTP-based password change flow**
- **Email templates** (professional HTML emails)
- **Security features** (10-minute expiry, 3-attempt limit)
- **Frontend components** with OTP input fields
- **Backend API endpoints** for sending OTP and verification
- **Fallback to test email service** for development

### ❌ What Needs Configuration:
- Email service credentials (currently using test mode)

---

## Quick Setup Options

### Option 1: Use Test Email Service (Immediate - For Development)

**No configuration needed!** The system automatically uses Ethereal Email for testing.

**How to test:**
1. Try changing password in the application
2. Check server console for email preview URLs
3. Visit the preview URL to see the email

### Option 2: Enable Real Email Sending (For Production)

#### Step 1: Choose Email Provider

**For Gmail (Recommended):**
1. Enable 2-Factor Authentication on your Gmail
2. Go to Google Account → Security → App passwords
3. Generate app password for "Mail"
4. Use the 16-character password

**For Other Providers:**
- Outlook: Use regular email/password
- Custom SMTP: Get SMTP settings from provider

#### Step 2: Configure Environment Variables

Add to your `.env` file:

```env
# For Gmail
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-character-app-password

# For Outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password

# For Custom SMTP
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASS=your-password
```

#### Step 3: Restart Server
```bash
cd backend
npm start
```

---

## Testing the System

### Method 1: Use the Application
1. Login to HRM system
2. Go to Profile → Change Password
3. Enter current and new password
4. Click "Send OTP"
5. Check email for OTP code
6. Enter OTP to complete password change

### Method 2: Run Test Script
```bash
cd backend
node test-email-system.js
```

---

## Email Flow Explanation

### Step 1: User Initiates Password Change
- User enters current password and new password
- System validates current password
- System generates 6-digit OTP

### Step 2: OTP Email Sent
- Professional HTML email sent with OTP
- OTP expires in 10 minutes
- Maximum 3 attempts allowed

### Step 3: User Verifies OTP
- User enters OTP in application
- System validates OTP and changes password
- Confirmation email sent

### Step 4: Security Features
- OTP automatically expires
- Failed attempts are tracked
- Confirmation email for security

---

## Troubleshooting

### Issue: "Email service not initialized"
**Solution:** Email credentials not configured properly
- Check .env file has EMAIL_USER and EMAIL_PASS
- Restart server after adding credentials

### Issue: "Authentication failed"
**Solution:** Wrong credentials
- For Gmail: Use app password, not regular password
- For Outlook: Enable "Less secure app access"

### Issue: Emails not received
**Solution:** Check spam folder or use test mode
- Test mode shows preview URLs in console
- Check email provider settings

---

## Security Features Built-in

✅ **OTP Expiry:** 10 minutes automatic expiration
✅ **Attempt Limiting:** Maximum 3 failed attempts
✅ **Password Validation:** Current password verified twice
✅ **Secure Storage:** OTP stored temporarily in memory
✅ **Email Confirmation:** Confirmation sent after successful change
✅ **Professional Templates:** HTML emails with security warnings

---

## Production Recommendations

1. **Use Environment Variables:** Never hardcode email credentials
2. **Use App Passwords:** For Gmail, use app-specific passwords
3. **Monitor Email Logs:** Check for delivery failures
4. **Set Up Email Monitoring:** Track email delivery rates
5. **Configure Rate Limiting:** Prevent OTP spam (already implemented)

---

## Current System Status

🟢 **READY TO USE** - Your email verification system is fully implemented and working!

Just configure email credentials to enable real email sending, or use as-is for development with test emails.
