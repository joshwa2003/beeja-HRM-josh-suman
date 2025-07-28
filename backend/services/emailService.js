const nodemailer = require('nodemailer');

// Email service configuration
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Check if email credentials are provided
    const emailUser = process.env.MAIL_USER || process.env.EMAIL_USER;
    const emailPass = process.env.MAIL_PASS || process.env.EMAIL_PASS;
    const mailHost = process.env.MAIL_HOST;

    if (!emailUser || !emailPass) {
      console.log('📧 No email credentials configured. Using test email service...');
      this.createTestAccount();
      return;
    }

    // Configure email transporter
    let emailConfig;
    
    if (mailHost) {
      // Use custom SMTP host configuration
      emailConfig = {
        host: mailHost,
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPass
        }
      };
      console.log(`📧 Configuring SMTP: ${mailHost} with user: ${emailUser}`);
    } else if (emailUser.includes('gmail')) {
      // Gmail configuration
      emailConfig = {
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass
        }
      };
      console.log(`📧 Configuring Gmail service for: ${emailUser}`);
    } else {
      // Default configuration
      emailConfig = {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: emailUser,
          pass: emailPass
        }
      };
      console.log(`📧 Using default Gmail SMTP for: ${emailUser}`);
    }

    this.transporter = nodemailer.createTransport(emailConfig);
    
    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Email service connection failed:', error.message);
        console.log('📧 Falling back to test email service...');
        this.createTestAccount();
      } else {
        console.log('✅ Email service connected successfully');
        console.log(`📧 Ready to send emails from: ${emailUser}`);
      }
    });
  }

  async createTestAccount() {
    try {
      // Create a test account using Ethereal Email
      const testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      console.log('Test email account created:');
      console.log('User:', testAccount.user);
      console.log('Pass:', testAccount.pass);
      console.log('Preview emails at: https://ethereal.email');
    } catch (error) {
      console.error('Failed to create test account:', error);
      this.transporter = null;
    }
  }

  async sendOTPEmail(userEmail, userName, otp) {
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    const fromEmail = process.env.MAIL_USER || process.env.EMAIL_USER || 'hrmsystem.demo@gmail.com';
    
    const mailOptions = {
      from: fromEmail,
      to: userEmail,
      subject: 'Password Change OTP - HRM System',
      html: this.generateOTPEmailTemplate(userName, otp),
      text: `Hello ${userName}, Your OTP for password change is: ${otp}. This OTP will expire in 10 minutes.`
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      // If using test account, log the preview URL
      if (info.messageId && nodemailer.getTestMessageUrl) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('='.repeat(60));
        console.log('EMAIL SENT SUCCESSFULLY');
        console.log('='.repeat(60));
        console.log(`To: ${userEmail}`);
        console.log(`Subject: Password Change OTP`);
        console.log(`OTP: ${otp}`);
        if (previewUrl) {
          console.log(`Preview URL: ${previewUrl}`);
        }
        console.log('='.repeat(60));
      } else {
        console.log('✅ OTP Email sent successfully to:', userEmail);
        console.log('📧 OTP Code:', otp);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendPasswordChangeConfirmation(userEmail, userName) {
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    const fromEmail = process.env.MAIL_USER || process.env.EMAIL_USER || 'hrmsystem.demo@gmail.com';

    const mailOptions = {
      from: fromEmail,
      to: userEmail,
      subject: 'Password Changed Successfully - HRM System',
      html: this.generatePasswordChangeConfirmationTemplate(userName),
      text: `Hello ${userName}, Your password has been successfully changed. If you did not make this change, please contact your administrator immediately.`
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      if (info.messageId && nodemailer.getTestMessageUrl) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('Password change confirmation email sent');
        if (previewUrl) {
          console.log(`Preview URL: ${previewUrl}`);
        }
      } else {
        console.log('✅ Password change confirmation sent to:', userEmail);
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null
      };
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
      // Don't throw error for confirmation email failure
      return { success: false, error: error.message };
    }
  }

  async sendReimbursementNotification(approverEmails, reimbursementData, notificationType = 'new') {
    if (!this.transporter) {
      console.log('Email service not initialized, skipping notification');
      return { success: false, error: 'Email service not initialized' };
    }

    const fromEmail = process.env.MAIL_USER || process.env.EMAIL_USER || 'hrmsystem.demo@gmail.com';
    
    const subjects = {
      'new': 'New Reimbursement Request - Action Required',
      'approved': 'Reimbursement Request Approved',
      'rejected': 'Reimbursement Request Rejected'
    };

    const mailOptions = {
      from: fromEmail,
      to: approverEmails.join(', '),
      subject: subjects[notificationType] || 'Reimbursement Update',
      html: this.generateReimbursementNotificationTemplate(reimbursementData, notificationType),
      text: this.generateReimbursementNotificationText(reimbursementData, notificationType)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      if (info.messageId && nodemailer.getTestMessageUrl) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('='.repeat(60));
        console.log('REIMBURSEMENT NOTIFICATION SENT');
        console.log('='.repeat(60));
        console.log(`To: ${approverEmails.join(', ')}`);
        console.log(`Subject: ${subjects[notificationType]}`);
        console.log(`Employee: ${reimbursementData.employeeName}`);
        console.log(`Amount: ₹${reimbursementData.amount}`);
        console.log(`Category: ${reimbursementData.category}`);
        if (previewUrl) {
          console.log(`Preview URL: ${previewUrl}`);
        }
        console.log('='.repeat(60));
      } else {
        console.log('✅ Reimbursement notification sent to:', approverEmails.join(', '));
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null
      };
    } catch (error) {
      console.error('Failed to send reimbursement notification:', error);
      return { success: false, error: error.message };
    }
  }

  async sendRegularizationNotification(approverEmails, regularizationData, notificationType = 'new') {
    if (!this.transporter) {
      console.log('Email service not initialized, skipping notification');
      return { success: false, error: 'Email service not initialized' };
    }

    const fromEmail = process.env.MAIL_USER || process.env.EMAIL_USER || 'hrmsystem.demo@gmail.com';
    
    const subjects = {
      'new': 'New Regularization Request - Action Required',
      'submitted': 'Regularization Request Submitted for Approval',
      'pending': 'Regularization Request Pending Your Approval',
      'approved': 'Regularization Request Approved',
      'rejected': 'Regularization Request Rejected'
    };

    const mailOptions = {
      from: fromEmail,
      to: approverEmails.join(', '),
      subject: subjects[notificationType] || 'Regularization Update',
      html: this.generateRegularizationNotificationTemplate(regularizationData, notificationType),
      text: this.generateRegularizationNotificationText(regularizationData, notificationType)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      if (info.messageId && nodemailer.getTestMessageUrl) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('='.repeat(60));
        console.log('REGULARIZATION NOTIFICATION SENT');
        console.log('='.repeat(60));
        console.log(`To: ${approverEmails.join(', ')}`);
        console.log(`Subject: ${subjects[notificationType]}`);
        console.log(`Employee: ${regularizationData.employeeName}`);
        console.log(`Request ID: ${regularizationData.regularizationId}`);
        console.log(`Type: ${regularizationData.requestType}`);
        console.log(`Date: ${new Date(regularizationData.attendanceDate).toLocaleDateString()}`);
        if (previewUrl) {
          console.log(`Preview URL: ${previewUrl}`);
        }
        console.log('='.repeat(60));
      } else {
        console.log('✅ Regularization notification sent to:', approverEmails.join(', '));
      }

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null
      };
    } catch (error) {
      console.error('Failed to send regularization notification:', error);
      return { success: false, error: error.message };
    }
  }

  generateOTPEmailTemplate(userName, otp) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Change OTP</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-box { background-color: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px solid #007bff; }
          .otp-code { font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; margin: 10px 0; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Change Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>You have requested to change your password for your HRM System account. Please use the following One-Time Password (OTP) to complete the process:</p>
            
            <div class="otp-box">
              <p style="margin: 0; font-size: 16px;">Your OTP Code:</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 0; color: #6c757d;">Enter this code in the application</p>
            </div>

            <div class="warning">
              <strong>⚠️ Important Security Information:</strong>
              <ul style="margin: 10px 0;">
                <li>This OTP will expire in <strong>10 minutes</strong></li>
                <li>Do not share this code with anyone</li>
                <li>If you did not request this password change, please ignore this email and contact your administrator immediately</li>
              </ul>
            </div>

            <p>For your security, this is an automated email. Please do not reply to this message.</p>
          </div>
          <div class="footer">
            <p>© 2024 HRM Management System. All rights reserved.</p>
            <p>This email was sent to your registered email address</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generatePasswordChangeConfirmationTemplate(userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Changed Successfully</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .success-box { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Password Changed Successfully</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            
            <div class="success-box">
              <h3 style="color: #155724; margin-top: 0;">Your password has been successfully updated!</h3>
              <p style="margin-bottom: 0;">Changed on: ${new Date().toLocaleString()}</p>
            </div>

            <p>Your HRM System account password has been successfully changed. You can now use your new password to log in to the system.</p>

            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <p style="margin: 10px 0;">If you did not make this change, please contact your system administrator immediately at <strong>admin@company.com</strong> or through your organization's IT support.</p>
            </div>

            <p><strong>Security Tips:</strong></p>
            <ul>
              <li>Keep your password confidential</li>
              <li>Use a strong, unique password</li>
              <li>Log out from shared computers</li>
              <li>Report any suspicious activity</li>
            </ul>

            <p>Thank you for keeping your account secure!</p>
          </div>
          <div class="footer">
            <p>© 2024 HRM Management System. All rights reserved.</p>
            <p>This is an automated security notification.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateReimbursementNotificationTemplate(reimbursementData, notificationType) {
    const headerColors = {
      'new': '#007bff',
      'approved': '#28a745',
      'rejected': '#dc3545'
    };

    const headerTitles = {
      'new': '💰 New Reimbursement Request',
      'approved': '✅ Reimbursement Approved',
      'rejected': '❌ Reimbursement Rejected'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reimbursement Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${headerColors[notificationType]}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${headerColors[notificationType]}; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #dee2e6; }
          .detail-label { font-weight: bold; color: #495057; }
          .detail-value { color: #212529; }
          .action-box { background-color: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .btn { display: inline-block; padding: 12px 24px; margin: 5px; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .btn-primary { background-color: #007bff; color: white; }
          .btn-success { background-color: #28a745; color: white; }
          .btn-danger { background-color: #dc3545; color: white; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${headerTitles[notificationType]}</h1>
          </div>
          <div class="content">
            <div class="info-box">
              <h3 style="margin-top: 0; color: ${headerColors[notificationType]};">Reimbursement Details</h3>
              
              <div class="detail-row">
                <span class="detail-label">Employee:</span>
                <span class="detail-value">${reimbursementData.employeeName}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Request ID:</span>
                <span class="detail-value">${reimbursementData.reimbursementId || 'N/A'}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Category:</span>
                <span class="detail-value">${reimbursementData.category}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Amount:</span>
                <span class="detail-value">₹${reimbursementData.amount.toLocaleString()}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Expense Date:</span>
                <span class="detail-value">${new Date(reimbursementData.expenseDate).toLocaleDateString()}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Business Purpose:</span>
                <span class="detail-value">${reimbursementData.businessPurpose}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Description:</span>
                <span class="detail-value">${reimbursementData.description}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Priority:</span>
                <span class="detail-value">${reimbursementData.priority}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Submitted On:</span>
                <span class="detail-value">${new Date(reimbursementData.submittedAt || reimbursementData.createdAt).toLocaleString()}</span>
              </div>
            </div>

            ${notificationType === 'new' ? `
              <div class="action-box">
                <h4>Action Required</h4>
                <p>This reimbursement request requires your approval. Please log in to the HRM system to review and take action.</p>
                <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/payroll/reimbursements" class="btn btn-primary">
                  Review Request
                </a>
              </div>
            ` : ''}

            <p>Please log in to the HRM system for more details and to take any necessary actions.</p>
          </div>
          <div class="footer">
            <p>© 2024 HRM Management System. All rights reserved.</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateReimbursementNotificationText(reimbursementData, notificationType) {
    const titles = {
      'new': 'New Reimbursement Request - Action Required',
      'approved': 'Reimbursement Request Approved',
      'rejected': 'Reimbursement Request Rejected'
    };

    return `
${titles[notificationType]}

Employee: ${reimbursementData.employeeName}
Request ID: ${reimbursementData.reimbursementId || 'N/A'}
Category: ${reimbursementData.category}
Amount: ₹${reimbursementData.amount.toLocaleString()}
Expense Date: ${new Date(reimbursementData.expenseDate).toLocaleDateString()}
Business Purpose: ${reimbursementData.businessPurpose}
Description: ${reimbursementData.description}
Priority: ${reimbursementData.priority}
Submitted On: ${new Date(reimbursementData.submittedAt || reimbursementData.createdAt).toLocaleString()}

${notificationType === 'new' ? 'Please log in to the HRM system to review and approve this request.' : ''}

HRM System: ${process.env.CLIENT_URL || 'http://localhost:3000'}
    `;
  }

  generateRegularizationNotificationTemplate(regularizationData, notificationType) {
    const headerColors = {
      'new': '#007bff',
      'submitted': '#17a2b8',
      'pending': '#ffc107',
      'approved': '#28a745',
      'rejected': '#dc3545'
    };

    const headerTitles = {
      'new': '🕐 New Regularization Request',
      'submitted': '📝 Regularization Request Submitted',
      'pending': '⏳ Regularization Pending Approval',
      'approved': '✅ Regularization Request Approved',
      'rejected': '❌ Regularization Request Rejected'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Regularization Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${headerColors[notificationType]}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${headerColors[notificationType]}; }
          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #dee2e6; }
          .detail-label { font-weight: bold; color: #495057; }
          .detail-value { color: #212529; }
          .action-box { background-color: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .btn { display: inline-block; padding: 12px 24px; margin: 5px; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .btn-primary { background-color: #007bff; color: white; }
          .reason-box { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 3px solid #007bff; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${headerTitles[notificationType]}</h1>
          </div>
          <div class="content">
            <div class="info-box">
              <h3 style="margin-top: 0; color: ${headerColors[notificationType]};">Regularization Details</h3>
              
              <div class="detail-row">
                <span class="detail-label">Employee:</span>
                <span class="detail-value">${regularizationData.employeeName}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Request ID:</span>
                <span class="detail-value">${regularizationData.regularizationId}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Attendance Date:</span>
                <span class="detail-value">${new Date(regularizationData.attendanceDate).toLocaleDateString()}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Request Type:</span>
                <span class="detail-value">${regularizationData.requestType}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Priority:</span>
                <span class="detail-value">${regularizationData.priority}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">Submitted On:</span>
                <span class="detail-value">${new Date(regularizationData.submittedDate).toLocaleString()}</span>
              </div>
            </div>

            <div class="reason-box">
              <h4 style="margin-top: 0; color: #495057;">Reason for Regularization:</h4>
              <p style="margin-bottom: 0;">${regularizationData.reason}</p>
            </div>

            ${regularizationData.approverComments ? `
              <div class="reason-box" style="border-left-color: #28a745;">
                <h4 style="margin-top: 0; color: #495057;">Approver Comments:</h4>
                <p style="margin-bottom: 0;">${regularizationData.approverComments}</p>
              </div>
            ` : ''}

            ${regularizationData.rejectionReason ? `
              <div class="reason-box" style="border-left-color: #dc3545;">
                <h4 style="margin-top: 0; color: #495057;">Rejection Reason:</h4>
                <p style="margin-bottom: 0;">${regularizationData.rejectionReason}</p>
              </div>
            ` : ''}

            ${['new', 'submitted', 'pending'].includes(notificationType) ? `
              <div class="action-box">
                <h4>Action Required</h4>
                <p>This regularization request requires your approval. Please log in to the HRM system to review and take action.</p>
                <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/regularization" class="btn btn-primary">
                  Review Request
                </a>
              </div>
            ` : ''}

            <p>Please log in to the HRM system for more details and to take any necessary actions.</p>
          </div>
          <div class="footer">
            <p>© 2024 HRM Management System. All rights reserved.</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateRegularizationNotificationText(regularizationData, notificationType) {
    const titles = {
      'new': 'New Regularization Request - Action Required',
      'submitted': 'Regularization Request Submitted for Approval',
      'pending': 'Regularization Request Pending Your Approval',
      'approved': 'Regularization Request Approved',
      'rejected': 'Regularization Request Rejected'
    };

    return `
${titles[notificationType]}

Employee: ${regularizationData.employeeName}
Request ID: ${regularizationData.regularizationId}
Attendance Date: ${new Date(regularizationData.attendanceDate).toLocaleDateString()}
Request Type: ${regularizationData.requestType}
Priority: ${regularizationData.priority}
Submitted On: ${new Date(regularizationData.submittedDate).toLocaleString()}

Reason: ${regularizationData.reason}

${regularizationData.approverComments ? `Approver Comments: ${regularizationData.approverComments}` : ''}
${regularizationData.rejectionReason ? `Rejection Reason: ${regularizationData.rejectionReason}` : ''}

${['new', 'submitted', 'pending'].includes(notificationType) ? 'Please log in to the HRM system to review and approve this request.' : ''}

HRM System: ${process.env.CLIENT_URL || 'http://localhost:3000'}
    `;
  }
}

// Export a singleton instance
module.exports = new EmailService();
