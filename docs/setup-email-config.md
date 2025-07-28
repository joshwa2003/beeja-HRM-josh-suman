# Email Configuration Setup Guide

## Option 1: Gmail Configuration (Recommended)

### Step 1: Create Gmail App Password
1. Go to your Gmail account settings
2. Enable 2-Factor Authentication if not already enabled
3. Go to Security → App passwords
4. Generate an app password for "Mail"
5. Copy the 16-character app password

### Step 2: Update Environment Variables
Add these to your `.env` file:

```env
# Email Configuration
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-character-app-password
```

## Option 2: Use Test Email Service (For Development)

The system will automatically use Ethereal Email (test service) if no real credentials are provided.
This is perfect for development and testing.

## Option 3: Other Email Providers

### For Outlook/Hotmail:
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

### For Custom SMTP:
```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-password
```

## Testing the Configuration

After setting up, restart your server and test the password change feature.
The system will log email preview URLs for development testing.
