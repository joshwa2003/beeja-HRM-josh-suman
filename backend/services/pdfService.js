const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFService {
  constructor() {
    this.ensureDirectoryExists();
  }

  // Ensure the offer letters directory exists
  ensureDirectoryExists() {
    const offerLettersDir = path.join(__dirname, '../uploads/offer-letters');
    if (!fs.existsSync(offerLettersDir)) {
      fs.mkdirSync(offerLettersDir, { recursive: true });
    }
  }

  // Generate offer letter PDF
  async generateOfferLetterPDF(offerLetter) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const fileName = `offer_letter_${offerLetter._id}_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, '../uploads/offer-letters', fileName);
        
        // Pipe the PDF to a file
        doc.pipe(fs.createWriteStream(filePath));

        // Add company header
        this.addHeader(doc);
        
        // Add offer letter content
        this.addOfferContent(doc, offerLetter);
        
        // Add terms and conditions
        this.addTermsAndConditions(doc, offerLetter);
        
        // Add signature section
        this.addSignatureSection(doc);
        
        // Add footer
        this.addFooter(doc);

        // Finalize the PDF
        doc.end();

        doc.on('end', () => {
          resolve({
            fileName,
            filePath,
            relativePath: `uploads/offer-letters/${fileName}`
          });
        });

        doc.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  // Add company header
  addHeader(doc) {
    // Company logo placeholder (you can add actual logo later)
    doc.fontSize(24)
       .fillColor('#007bff')
       .text('BEEJA HRM', 50, 50, { align: 'center' });
    
    doc.fontSize(12)
       .fillColor('#666')
       .text('Human Resource Management System', 50, 80, { align: 'center' });
    
    // Add a line separator
    doc.moveTo(50, 110)
       .lineTo(550, 110)
       .strokeColor('#007bff')
       .lineWidth(2)
       .stroke();
    
    doc.moveDown(2);
  }

  // Add offer letter content
  addOfferContent(doc, offerLetter) {
    const currentY = doc.y;
    
    // Date
    doc.fontSize(12)
       .fillColor('#000')
       .text(`Date: ${new Date().toLocaleDateString()}`, 400, currentY);
    
    doc.moveDown(2);
    
    // Candidate address
    doc.text(`${offerLetter.candidateInfo.firstName} ${offerLetter.candidateInfo.lastName}`)
       .text(`Email: ${offerLetter.candidateInfo.email}`)
       .text(`Phone: ${offerLetter.candidateInfo.phoneNumber}`);
    
    doc.moveDown(2);
    
    // Subject
    doc.fontSize(14)
       .fillColor('#007bff')
       .text('Subject: Offer of Employment', { underline: true });
    
    doc.moveDown(1);
    
    // Greeting
    doc.fontSize(12)
       .fillColor('#000')
       .text(`Dear ${offerLetter.candidateInfo.firstName},`);
    
    doc.moveDown(1);
    
    // Opening paragraph
    doc.text(`We are pleased to offer you the position of ${offerLetter.jobInfo.title} with our organization. We believe that your skills and experience will be valuable additions to our team.`, {
      align: 'justify'
    });
    
    doc.moveDown(1);
    
    // Position details
    doc.fontSize(14)
       .fillColor('#007bff')
       .text('Position Details:', { underline: true });
    
    doc.fontSize(12)
       .fillColor('#000')
       .moveDown(0.5);
    
    const positionDetails = [
      `Position: ${offerLetter.jobInfo.title}`,
      `Department: ${offerLetter.jobInfo.department}`,
      `Location: ${offerLetter.jobInfo.location}`,
      `Employment Type: ${offerLetter.offerDetails.employmentType}`,
      `Work Mode: ${offerLetter.offerDetails.workMode}`,
      `Joining Date: ${new Date(offerLetter.offerDetails.joiningDate).toLocaleDateString()}`,
      `Probation Period: ${offerLetter.offerDetails.probationPeriod} months`,
      `Notice Period: ${offerLetter.offerDetails.noticePeriod} days`
    ];
    
    positionDetails.forEach(detail => {
      doc.text(`• ${detail}`);
    });
    
    doc.moveDown(1);
    
    // Compensation details
    doc.fontSize(14)
       .fillColor('#007bff')
       .text('Compensation Details:', { underline: true });
    
    doc.fontSize(12)
       .fillColor('#000')
       .moveDown(0.5);
    
    const salary = offerLetter.offerDetails.salary;
    const compensationDetails = [
      `Basic Salary: ${salary.currency} ${salary.basic.toLocaleString()}`,
      `HRA: ${salary.currency} ${salary.hra.toLocaleString()}`,
      `Other Allowances: ${salary.currency} ${salary.allowances.toLocaleString()}`,
      `Total CTC: ${salary.currency} ${salary.ctc.toLocaleString()} per annum`
    ];
    
    compensationDetails.forEach(detail => {
      doc.text(`• ${detail}`);
    });
    
    doc.moveDown(1);
    
    // Benefits
    if (offerLetter.offerDetails.benefits && offerLetter.offerDetails.benefits.length > 0) {
      doc.fontSize(14)
         .fillColor('#007bff')
         .text('Benefits:', { underline: true });
      
      doc.fontSize(12)
         .fillColor('#000')
         .moveDown(0.5);
      
      offerLetter.offerDetails.benefits.forEach(benefit => {
        doc.text(`• ${benefit}`);
      });
      
      doc.moveDown(1);
    }
    
    // Working hours and days
    doc.fontSize(14)
       .fillColor('#007bff')
       .text('Working Schedule:', { underline: true });
    
    doc.fontSize(12)
       .fillColor('#000')
       .moveDown(0.5)
       .text(`• Working Hours: ${offerLetter.offerDetails.workingHours}`)
       .text(`• Working Days: ${offerLetter.offerDetails.workingDays}`);
    
    doc.moveDown(1);
    
    // Reporting manager
    if (offerLetter.offerDetails.reportingManager) {
      const manager = offerLetter.offerDetails.reportingManager;
      doc.fontSize(14)
         .fillColor('#007bff')
         .text('Reporting Structure:', { underline: true });
      
      doc.fontSize(12)
         .fillColor('#000')
         .moveDown(0.5)
         .text(`• Reporting Manager: ${manager.name}`)
         .text(`• Designation: ${manager.designation}`)
         .text(`• Email: ${manager.email}`);
      
      doc.moveDown(1);
    }
  }

  // Add terms and conditions
  addTermsAndConditions(doc, offerLetter) {
    // Check if we need a new page
    if (doc.y > 650) {
      doc.addPage();
    }
    
    doc.fontSize(14)
       .fillColor('#007bff')
       .text('Terms and Conditions:', { underline: true });
    
    doc.fontSize(12)
       .fillColor('#000')
       .moveDown(0.5);
    
    const defaultTerms = [
      'This offer is contingent upon successful completion of background verification and reference checks.',
      'You will be required to sign a confidentiality agreement and adhere to company policies.',
      'The probation period will be evaluated based on your performance and conduct.',
      'This offer is valid for 15 days from the date of this letter.',
      'Any changes to this offer must be agreed upon in writing by both parties.',
      'This position is subject to the terms and conditions outlined in the employee handbook.'
    ];
    
    const terms = offerLetter.offerDetails.termsAndConditions.length > 0 
      ? offerLetter.offerDetails.termsAndConditions 
      : defaultTerms;
    
    terms.forEach((term, index) => {
      doc.text(`${index + 1}. ${term}`, {
        align: 'justify'
      });
      doc.moveDown(0.5);
    });
    
    doc.moveDown(1);
    
    // Acceptance instructions
    doc.fontSize(12)
       .fillColor('#000')
       .text('To accept this offer, please respond through the secure link provided in the email within the validity period.', {
         align: 'justify'
       });
    
    doc.moveDown(1);
    
    doc.text('We look forward to welcoming you to our team and are excited about the contributions you will make to our organization.', {
      align: 'justify'
    });
  }

  // Add signature section
  addSignatureSection(doc) {
    // Check if we need a new page
    if (doc.y > 600) {
      doc.addPage();
    }
    
    doc.moveDown(2);
    
    doc.fontSize(12)
       .fillColor('#000')
       .text('Sincerely,');
    
    doc.moveDown(3);
    
    // HR signature line
    doc.text('_________________________')
       .moveDown(0.5)
       .text('HR Manager')
       .text('Beeja HRM');
    
    doc.moveDown(2);
    
    // Candidate acceptance section
    doc.fontSize(14)
       .fillColor('#007bff')
       .text('Candidate Acceptance:', { underline: true });
    
    doc.fontSize(12)
       .fillColor('#000')
       .moveDown(1)
       .text('I, _________________________, accept the above offer of employment and agree to the terms and conditions stated herein.');
    
    doc.moveDown(2);
    
    doc.text('Candidate Signature: _________________________    Date: _____________');
  }

  // Add footer
  addFooter(doc) {
    const pageCount = doc.bufferedPageRange().count;
    
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Add page number
      doc.fontSize(10)
         .fillColor('#666')
         .text(`Page ${i + 1} of ${pageCount}`, 50, doc.page.height - 50, {
           align: 'center'
         });
      
      // Add confidentiality notice
      doc.fontSize(8)
         .text('This document is confidential and proprietary. Unauthorized distribution is prohibited.', 
               50, doc.page.height - 30, {
                 align: 'center'
               });
    }
  }

  // Delete offer letter file
  async deleteOfferLetterPDF(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true };
      }
      return { success: false, error: 'File not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PDFService();
