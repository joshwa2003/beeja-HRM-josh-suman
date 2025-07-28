const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });
  }

  // Generic email sending method
  async sendEmail(to, subject, html, attachments = []) {
    try {
      const mailOptions = {
        from: `"Beeja HRM" <${process.env.MAIL_USER}>`,
        to,
        subject,
        html,
        attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send application confirmation email to candidate
  async sendApplicationConfirmation(application, job) {
    const subject = `Application Received - ${job.title}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .highlight { background-color: #e7f3ff; padding: 10px; border-left: 4px solid #007bff; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Received</h1>
          </div>
          <div class="content">
            <p>Dear ${application.firstName} ${application.lastName},</p>
            
            <p>Thank you for your interest in the <strong>${job.title}</strong> position at our company.</p>
            
            <div class="highlight">
              <h3>Application Details:</h3>
              <ul>
                <li><strong>Position:</strong> ${job.title}</li>
                <li><strong>Job Code:</strong> ${job.code}</li>
                <li><strong>Applied On:</strong> ${new Date(application.appliedAt).toLocaleDateString()}</li>
                <li><strong>Application Status:</strong> ${application.status}</li>
              </ul>
            </div>
            
            <p>We have received your application and our HR team will review it shortly. We will contact you if your profile matches our requirements.</p>
            
            <p>If you have any questions, please feel free to contact our HR team.</p>
            
            <p>Best regards,<br>
            HR Team<br>
            Beeja HRM</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(application.email, subject, html);
  }

  // Send interview invitation email to candidate
  async sendInterviewInvitation(interview, application, job) {
    const subject = `Interview Invitation - ${job.title}`;
    const interviewDate = new Date(interview.scheduledDate);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .highlight { background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 15px 0; }
          .important { background-color: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Interview Invitation</h1>
          </div>
          <div class="content">
            <p>Dear ${application.firstName} ${application.lastName},</p>
            
            <p>Congratulations! We are pleased to invite you for an interview for the <strong>${job.title}</strong> position.</p>
            
            <div class="highlight">
              <h3>Interview Details:</h3>
              <ul>
                <li><strong>Position:</strong> ${job.title}</li>
                <li><strong>Interview Round:</strong> ${interview.round}</li>
                <li><strong>Date:</strong> ${interviewDate.toLocaleDateString()}</li>
                <li><strong>Time:</strong> ${interviewDate.toLocaleTimeString()}</li>
                <li><strong>Duration:</strong> ${interview.duration} minutes</li>
                <li><strong>Type:</strong> ${interview.type}</li>
                ${interview.location ? `<li><strong>Location:</strong> ${interview.location}</li>` : ''}
                ${interview.meetingLink ? `<li><strong>Meeting Link:</strong> <a href="${interview.meetingLink}">${interview.meetingLink}</a></li>` : ''}
              </ul>
            </div>
            
            <div class="important">
              <h3>Important Instructions:</h3>
              <ul>
                <li>Please confirm your attendance by replying to this email</li>
                <li>Bring a copy of your resume and any relevant documents</li>
                <li>Be prepared to discuss your experience and skills</li>
                <li>Arrive 10 minutes early for the interview</li>
                ${interview.type === 'Online' ? '<li>Test your internet connection and audio/video before the interview</li>' : ''}
              </ul>
            </div>
            
            <p>If you need to reschedule or have any questions, please contact us immediately.</p>
            
            <p>We look forward to meeting you!</p>
            
            <p>Best regards,<br>
            HR Team<br>
            Beeja HRM</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please reply to confirm your attendance.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(application.email, subject, html);
  }

  // Send interview notification to interviewer
  async sendInterviewerNotification(interview, application, job, interviewer) {
    const subject = `Interview Assigned - ${job.title} - ${application.firstName} ${application.lastName}`;
    const interviewDate = new Date(interview.scheduledDate);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #17a2b8; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .highlight { background-color: #d1ecf1; padding: 15px; border-left: 4px solid #17a2b8; margin: 15px 0; }
          .candidate-info { background-color: #e2e3e5; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Interview Assignment</h1>
          </div>
          <div class="content">
            <p>Dear ${interviewer.firstName} ${interviewer.lastName},</p>
            
            <p>You have been assigned to conduct an interview for the <strong>${job.title}</strong> position.</p>
            
            <div class="highlight">
              <h3>Interview Details:</h3>
              <ul>
                <li><strong>Position:</strong> ${job.title}</li>
                <li><strong>Interview Round:</strong> ${interview.round}</li>
                <li><strong>Date:</strong> ${interviewDate.toLocaleDateString()}</li>
                <li><strong>Time:</strong> ${interviewDate.toLocaleTimeString()}</li>
                <li><strong>Duration:</strong> ${interview.duration} minutes</li>
                <li><strong>Type:</strong> ${interview.type}</li>
                ${interview.location ? `<li><strong>Location:</strong> ${interview.location}</li>` : ''}
                ${interview.meetingLink ? `<li><strong>Meeting Link:</strong> <a href="${interview.meetingLink}">${interview.meetingLink}</a></li>` : ''}
              </ul>
            </div>
            
            <div class="candidate-info">
              <h3>Candidate Information:</h3>
              <ul>
                <li><strong>Name:</strong> ${application.firstName} ${application.lastName}</li>
                <li><strong>Email:</strong> ${application.email}</li>
                <li><strong>Phone:</strong> ${application.phoneNumber}</li>
                <li><strong>Experience:</strong> ${application.yearsOfExperience} years</li>
                <li><strong>Skills:</strong> ${application.technicalSkills.join(', ')}</li>
                <li><strong>Applied On:</strong> ${new Date(application.appliedAt).toLocaleDateString()}</li>
              </ul>
            </div>
            
            <p>Please log in to the system to view the candidate's complete profile and resume.</p>
            
            <p>After the interview, please submit your feedback through the system.</p>
            
            <p>If you have any questions or need to reschedule, please contact the HR team immediately.</p>
            
            <p>Best regards,<br>
            HR Team<br>
            Beeja HRM</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please contact HR for any changes.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(interviewer.email, subject, html);
  }

  // Send interview notifications to multiple interviewers
  async sendMultipleInterviewerNotifications(interview, application, job, interviewers) {
    const results = [];
    
    for (const interviewer of interviewers) {
      try {
        const result = await this.sendInterviewerNotification(interview, application, job, interviewer);
        results.push({
          interviewer: interviewer.email,
          success: result.success,
          messageId: result.messageId,
          error: result.error
        });
      } catch (error) {
        results.push({
          interviewer: interviewer.email,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      success: results.every(r => r.success),
      results: results,
      totalSent: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length
    };
  }

  // Send offer letter email to candidate with accept/reject buttons
  async sendOfferLetter(offer, application, job) {
    const subject = `🎉 Job Offer - ${offer.designation}`;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const acceptUrl = `${baseUrl}/offer-response/${offer._id}?action=accept`;
    const rejectUrl = `${baseUrl}/offer-response/${offer._id}?action=reject`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background-color: #f8f9fa; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; background-color: #e9ecef; border-radius: 0 0 10px 10px; }
          .highlight { background-color: #d4edda; padding: 20px; border-left: 4px solid #28a745; margin: 20px 0; border-radius: 5px; }
          .button-container { text-align: center; margin: 30px 0; }
          .accept-button { 
            background-color: #28a745; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 8px; 
            display: inline-block; 
            margin: 10px 15px; 
            font-weight: bold;
            font-size: 16px;
          }
          .reject-button { 
            background-color: #dc3545; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 8px; 
            display: inline-block; 
            margin: 10px 15px; 
            font-weight: bold;
            font-size: 16px;
          }
          .important { background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0; border-radius: 5px; }
          .salary-highlight { background-color: #e7f3ff; padding: 15px; border: 2px solid #007bff; border-radius: 8px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Congratulations!</h1>
            <h2>Job Offer Letter</h2>
          </div>
          <div class="content">
            <p>Dear ${application.firstName} ${application.lastName},</p>
            
            <p>We are delighted to extend an offer of employment for the position of <strong>${offer.designation}</strong> at Beeja HRM.</p>
            
            <div class="highlight">
              <h3>📋 Offer Details:</h3>
              <ul>
                <li><strong>Position:</strong> ${offer.designation}</li>
                <li><strong>Department:</strong> ${offer.department?.name || offer.department}</li>
                <li><strong>Work Location:</strong> ${offer.workLocation}</li>
                <li><strong>Employment Type:</strong> ${offer.employmentType}</li>
                <li><strong>Work Mode:</strong> ${offer.workMode}</li>
                <li><strong>Joining Date:</strong> ${new Date(offer.proposedJoiningDate).toLocaleDateString()}</li>
              </ul>
            </div>
            
            <div class="salary-highlight">
              <h3>💰 Compensation Package</h3>
              <h2 style="color: #007bff; margin: 10px 0;">$${parseInt(offer.salary.totalCTC).toLocaleString()} per annum</h2>
            </div>
            
            ${offer.benefits?.otherBenefits?.length > 0 ? `
            <div class="highlight">
              <h3>🎁 Benefits & Perks:</h3>
              <ul>
                <li>Health Insurance Coverage</li>
                <li>Provident Fund (12% contribution)</li>
                <li>Gratuity Benefits</li>
                <li>Leave Policy: ${offer.benefits.leavePolicy.casual} Casual, ${offer.benefits.leavePolicy.sick} Sick, ${offer.benefits.leavePolicy.earned} Earned leaves</li>
                ${offer.benefits.otherBenefits.map(benefit => `<li>${benefit}</li>`).join('')}
              </ul>
            </div>
            ` : ''}
            
            ${offer.specialTerms?.length > 0 ? `
            <div class="important">
              <h3>📝 Additional Terms:</h3>
              <ul>
                ${offer.specialTerms.map(term => `<li>${term}</li>`).join('')}
              </ul>
            </div>
            ` : ''}
            
            <div class="button-container">
              <h3>Please respond to this offer:</h3>
              <a href="${acceptUrl}" class="accept-button">✅ Accept Offer</a>
              <a href="${rejectUrl}" class="reject-button">❌ Decline Offer</a>
            </div>
            
            <div class="important">
              <h3>⚠️ Important Information:</h3>
              <ul>
                <li>This offer is valid until <strong>${new Date(offer.validUntil).toLocaleDateString()}</strong></li>
                <li>Please respond by clicking one of the buttons above</li>
                <li>Contact our HR team if you have any questions</li>
                <li>This offer is contingent upon successful background verification</li>
                <li>Probation Period: ${offer.probationPeriod?.duration || 6} months</li>
                <li>Notice Period: ${offer.noticePeriod || '1 month'}</li>
              </ul>
            </div>
            
            <p>We are excited about the possibility of you joining our team and look forward to your response.</p>
            
            <p>Best regards,<br>
            <strong>HR Team</strong><br>
            Beeja HRM</p>
          </div>
          <div class="footer">
            <p>This offer letter is confidential and intended only for ${application.firstName} ${application.lastName}.</p>
            <p>If you have any questions, please contact us at hr@beejahrm.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(application.email, subject, html);
  }

  // Send application rejection email
  async sendRejectionEmail(application, job, reason = '') {
    const subject = `Thank you for your application - ${job.title}`;
    const currentYear = new Date().getFullYear();
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #20C997; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background-color: #f8f9fa; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; background-color: #e9ecef; border-radius: 0 0 10px 10px; }
          .feedback-section { 
            background-color: #e7f3ff; 
            padding: 20px; 
            border-left: 4px solid #007bff; 
            margin: 20px 0; 
            border-radius: 5px; 
          }
          .encouragement-section { 
            background-color: #d4edda; 
            padding: 20px; 
            border-left: 4px solid #28a745; 
            margin: 20px 0; 
            border-radius: 5px; 
          }
          .highlight { 
            background-color: #fff3cd; 
            padding: 15px; 
            border-left: 4px solid #ffc107; 
            margin: 15px 0; 
            border-radius: 5px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You for Your Interest</h1>
            <h2>Application Update - ${job.title}</h2>
          </div>
          <div class="content">
            <p>Dear ${application.firstName} ${application.lastName},</p>
            
            <p>Thank you for your interest in the <strong>${job.title}</strong> position at Beeja HRM and for taking the time to submit your application. We truly appreciate the effort you put into your application.</p>
            
            <p>After careful consideration and review of all applications, we have decided to move forward with candidates whose experience and qualifications more closely align with our current specific requirements for this role.</p>
            
            ${reason ? `
            <div class="feedback-section">
              <h3>💡 Feedback from Our Team:</h3>
              <p>${reason}</p>
            </div>
            ` : ''}
            
            <div class="encouragement-section">
              <h3>🌟 We Encourage You to Stay Connected</h3>
              <ul>
                <li><strong>Future Opportunities:</strong> We will keep your resume in our talent database for future openings that may be a better match</li>
                <li><strong>Skills Development:</strong> Continue building your expertise in areas relevant to your career goals</li>
                <li><strong>Stay Updated:</strong> Follow our company updates for new job postings that align with your profile</li>
                <li><strong>Network:</strong> Connect with our team on professional platforms to stay informed about opportunities</li>
              </ul>
            </div>
            
            <div class="highlight">
              <p><strong>Remember:</strong> This decision is specific to this particular role and timing. Your skills and experience are valuable, and we encourage you to continue pursuing opportunities that align with your career aspirations.</p>
            </div>
            
            <p>We wish you all the best in your job search and future career endeavors. Thank you once again for considering Beeja HRM as a potential employer.</p>
            
            <p>Warm regards,<br>
            <strong>Talent Acquisition Team</strong><br>
            Beeja HRM</p>
          </div>
          <div class="footer">
            <p>This email was sent with care by our HR team. We value every candidate who shows interest in joining our organization.</p>
            <p>© ${currentYear} Beeja HRM. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(application.email, subject, html);
  }

  // Send interview rejection email (after interview feedback)
  async sendInterviewRejectionEmail(application, job, interview, reason = '') {
    const subject = `Interview Update - ${job.title}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #6c757d; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .feedback-section { background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0; }
          .interview-info { background-color: #e2e3e5; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Interview Update</h1>
          </div>
          <div class="content">
            <p>Dear ${application.firstName} ${application.lastName},</p>
            
            <p>Thank you for taking the time to interview for the <strong>${job.title}</strong> position with us.</p>
            
            <div class="interview-info">
              <h3>Interview Details:</h3>
              <ul>
                <li><strong>Position:</strong> ${job.title}</li>
                <li><strong>Interview Round:</strong> ${interview.round}</li>
                <li><strong>Date:</strong> ${new Date(interview.scheduledDate).toLocaleDateString()}</li>
              </ul>
            </div>
            
            <p>After careful consideration of your interview performance and qualifications, we have decided to move forward with other candidates for this position.</p>
            
            ${reason ? `
            <div class="feedback-section">
              <h3>Feedback:</h3>
              <p>${reason}</p>
            </div>
            ` : ''}
            
            <p>We appreciate the time and effort you invested in the interview process. We encourage you to apply for future opportunities that match your skills and experience.</p>
            
            <p>We wish you all the best in your career endeavors.</p>
            
            <p>Best regards,<br>
            HR Team<br>
            Beeja HRM</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(application.email, subject, html);
  }

  // Send interview reminder email
  async sendInterviewReminder(interview, application, job) {
    const subject = `Interview Reminder - ${job.title} - Tomorrow`;
    const interviewDate = new Date(interview.scheduledDate);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ffc107; color: #212529; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .highlight { background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Interview Reminder</h1>
          </div>
          <div class="content">
            <p>Dear ${application.firstName} ${application.lastName},</p>
            
            <p>This is a friendly reminder about your upcoming interview for the <strong>${job.title}</strong> position.</p>
            
            <div class="highlight">
              <h3>Interview Details:</h3>
              <ul>
                <li><strong>Date:</strong> ${interviewDate.toLocaleDateString()}</li>
                <li><strong>Time:</strong> ${interviewDate.toLocaleTimeString()}</li>
                <li><strong>Type:</strong> ${interview.type}</li>
                ${interview.location ? `<li><strong>Location:</strong> ${interview.location}</li>` : ''}
                ${interview.meetingLink ? `<li><strong>Meeting Link:</strong> <a href="${interview.meetingLink}">${interview.meetingLink}</a></li>` : ''}
              </ul>
            </div>
            
            <p>Please ensure you are prepared and arrive on time. If you have any last-minute questions or need to reschedule, please contact us immediately.</p>
            
            <p>Good luck with your interview!</p>
            
            <p>Best regards,<br>
            HR Team<br>
            Beeja HRM</p>
          </div>
          <div class="footer">
            <p>This is an automated reminder email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(application.email, subject, html);
  }

  // Send welcome email with login credentials to new user
  async sendWelcomeEmailWithCredentials(user, tempPassword, offer = null) {
    const subject = `🎉 Welcome to Beeja HRM - Your Account Details`;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const loginUrl = `${baseUrl}/login`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #20C997; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background-color: #f8f9fa; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; background-color: #e9ecef; border-radius: 0 0 10px 10px; }
          .credentials-box { 
            background-color: #e7f3ff; 
            padding: 25px; 
            border: 2px solid #007bff; 
            border-radius: 10px; 
            margin: 25px 0; 
            text-align: center;
          }
          .password-highlight { 
            background-color: #fff3cd; 
            padding: 15px; 
            border: 2px solid #ffc107; 
            border-radius: 8px; 
            margin: 15px 0; 
            font-family: monospace;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            color: #856404;
          }
          .login-button { 
            background-color: #20C997; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 8px; 
            display: inline-block; 
            margin: 20px 0; 
            font-weight: bold;
            font-size: 16px;
          }
          .important { background-color: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 15px 0; border-radius: 5px; }
          .welcome-info { background-color: #d4edda; padding: 20px; border-left: 4px solid #28a745; margin: 20px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Beeja HRM!</h1>
            <h2>Your Account Has Been Created</h2>
          </div>
          <div class="content">
            <p>Dear ${user.firstName} ${user.lastName},</p>
            
            <p>Welcome to Beeja HRM! We are excited to have you join our team${offer ? ` as a ${offer.designation}` : ''}.</p>
            
            ${offer ? `
            <div class="welcome-info">
              <h3>🎯 Your Position Details:</h3>
              <ul>
                <li><strong>Position:</strong> ${offer.designation}</li>
                <li><strong>Department:</strong> ${offer.department?.name || 'Not specified'}</li>
                <li><strong>Employee ID:</strong> ${user.employeeId}</li>
                <li><strong>Joining Date:</strong> ${new Date(user.joiningDate || offer.proposedJoiningDate).toLocaleDateString()}</li>
              </ul>
            </div>
            ` : `
            <div class="welcome-info">
              <h3>👤 Your Account Details:</h3>
              <ul>
                <li><strong>Name:</strong> ${user.firstName} ${user.lastName}</li>
                <li><strong>Role:</strong> ${user.role}</li>
                <li><strong>Employee ID:</strong> ${user.employeeId}</li>
                <li><strong>Department:</strong> ${user.department?.name || 'Not specified'}</li>
              </ul>
            </div>
            `}
            
            <div class="credentials-box">
              <h3>🔐 Your Login Credentials</h3>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Temporary Password:</strong></p>
              <div class="password-highlight">
                ${tempPassword}
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${loginUrl}" class="login-button">🚀 Login to Your Account</a>
            </div>
            
            <div class="important">
              <h3>🔒 Important Security Information:</h3>
              <ul>
                <li><strong>Change Your Password:</strong> Please log in and change your password immediately for security</li>
                <li><strong>Keep Credentials Safe:</strong> Do not share your login credentials with anyone</li>
                <li><strong>First Login:</strong> You will be prompted to change your password on first login</li>
                <li><strong>Account Access:</strong> Your account is now active and ready to use</li>
              </ul>
            </div>
            
            <div class="welcome-info">
              <h3>📚 Getting Started:</h3>
              <ul>
                <li>Log in to your account using the credentials above</li>
                <li>Complete your profile information</li>
                <li>Explore the dashboard and available features</li>
                <li>Contact IT support if you need any assistance</li>
              </ul>
            </div>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our HR team or IT support.</p>
            
            <p>We look forward to working with you!</p>
            
            <p>Best regards,<br>
            <strong>HR Team</strong><br>
            Beeja HRM</p>
          </div>
          <div class="footer">
            <p>This email contains sensitive information. Please keep your credentials secure.</p>
            <p>If you did not expect this email, please contact HR immediately.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(user.email, subject, html);
  }
}

module.exports = new EmailService();
