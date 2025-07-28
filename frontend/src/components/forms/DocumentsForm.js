import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import api from '../../utils/api';

const DocumentsForm = forwardRef(({ data, onChange }, ref) => {
  const [documents, setDocuments] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState({});

  useImperativeHandle(ref, () => ({
    getFormData: () => ({ documents })
  }));

  useEffect(() => {
    // Initialize with user's existing documents from data
    if (data?.documents) {
      setDocuments(data.documents);
    }
  }, [data]);

  const documentTypes = [
    {
      key: 'idProof',
      name: 'ID Proof (Aadhar Card)',
      type: 'identity',
      required: true,
      icon: 'bi-person-badge'
    },
    {
      key: 'offerLetter',
      name: 'Offer Letter',
      type: 'employment',
      required: true,
      icon: 'bi-briefcase'
    },
    {
      key: 'educationalCertificates',
      name: 'Educational Certificates',
      type: 'education',
      required: true,
      icon: 'bi-mortarboard'
    },
    {
      key: 'experienceLetters',
      name: 'Experience Letters',
      type: 'employment',
      required: false,
      icon: 'bi-briefcase'
    },
    {
      key: 'passport',
      name: 'Passport',
      type: 'identity',
      required: false,
      icon: 'bi-person-badge'
    }
  ];

  const handleFileUpload = async (documentType, file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload only PDF, JPG, or PNG files');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploadingFiles(prev => ({ ...prev, [documentType]: true }));

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', documentType);

      const response = await api.post('/auth/upload-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.document) {
        // Update documents state with the new document info
        setDocuments(prev => ({
          ...prev,
          [documentType]: response.data.document
        }));

        // Notify parent component of changes
        onChange && onChange();
        
        alert('Document uploaded successfully!');
      }
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert(error.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [documentType]: false }));
    }
  };

  const handleDownload = (document) => {
    if (!document.fileUrl && !document.fileName) {
      alert('Document not available for download');
      return;
    }

    try {
      // Construct the download URL
      let downloadUrl = document.fileUrl;
      if (!downloadUrl && document.fileName) {
        downloadUrl = `https://etvdufporvnfpgdzpcrr.supabase.co/storage/v1/object/public/documents/${document.fileName}`;
      }

      // Create a temporary anchor element for direct download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = document.originalName || document.fileName || 'document';
      link.target = '_self'; // Ensure it doesn't open in new tab
      link.rel = 'noopener noreferrer';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Download initiated for:', document.originalName || document.fileName);
      
    } catch (error) {
      console.error('Download failed:', error);
      alert('Unable to download file. Please contact support.');
    }
  };

  const handleDelete = async (documentType) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await api.delete(`/auth/delete-document/${documentType}`);
        
        // Remove document from state
        setDocuments(prev => {
          const updated = { ...prev };
          delete updated[documentType];
          return updated;
        });
        
        // Notify parent component of changes
        onChange && onChange();
        
        alert('Document deleted successfully!');
      } catch (error) {
        console.error('Delete failed:', error);
        alert(error.response?.data?.message || 'Delete failed. Please try again.');
      }
    }
  };

  const getStatusBadge = (documentType) => {
    const document = documents[documentType];
    if (document && document.fileName) {
      return <span className="badge bg-success">Uploaded</span>;
    }
    return <span className="badge bg-warning">Pending</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div>
      <div className="alert alert-info mb-4">
        <i className="bi bi-info-circle me-2"></i>
        <strong>Document Guidelines:</strong> Upload clear, readable copies of your documents. Accepted formats: PDF, JPG, PNG. Maximum file size: 10MB per document.
      </div>

      <div>
        <div className="row">
          <div className="col-12 mb-4">
            <h6>Required Documents</h6>
            <div className="list-group">
              {documentTypes.filter(docType => docType.required).map(docType => {
                const document = documents[docType.key];
                return (
                  <div key={docType.key} className="list-group-item">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center mb-2">
                          <i className={`${docType.icon} text-primary me-2`}></i>
                          <h6 className="mb-0">{docType.name}</h6>
                          <span className="badge bg-danger ms-2">Required</span>
                          {getStatusBadge(docType.key)}
                        </div>
                        
                        {document && document.fileName && (
                          <div className="mb-2">
                            <small className="text-muted">
                              <strong>File:</strong> {document.originalName || document.fileName}<br/>
                              <strong>Uploaded:</strong> {formatDate(document.uploadedAt)}<br/>
                              <strong>Size:</strong> {formatFileSize(document.fileSize)}
                            </small>
                          </div>
                        )}

                        <div className="d-flex gap-2">
                          <input
                            type="file"
                            className="form-control form-control-sm"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(docType.key, e.target.files[0])}
                            disabled={uploadingFiles[docType.key]}
                            style={{ maxWidth: '300px' }}
                          />
                          
                          {document && document.fileName && (
                            <>
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => handleDownload(document)}
                                title="Download"
                              >
                                <i className="bi bi-download"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleDelete(docType.key)}
                                title="Delete"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </>
                          )}
                        </div>

                        {uploadingFiles[docType.key] && (
                          <div className="mt-2">
                            <div className="progress" style={{ height: '4px' }}>
                              <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: '100%' }}></div>
                            </div>
                            <small className="text-muted">Uploading...</small>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="col-12 mb-4">
            <h6>Optional Documents</h6>
            <div className="list-group">
              {documentTypes.filter(docType => !docType.required).map(docType => {
                const document = documents[docType.key];
                return (
                  <div key={docType.key} className="list-group-item">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center mb-2">
                          <i className={`${docType.icon} text-secondary me-2`}></i>
                          <h6 className="mb-0">{docType.name}</h6>
                          <span className="badge bg-secondary ms-2">Optional</span>
                          {getStatusBadge(docType.key)}
                        </div>
                        
                        {document && document.fileName && (
                          <div className="mb-2">
                            <small className="text-muted">
                              <strong>File:</strong> {document.originalName || document.fileName}<br/>
                              <strong>Uploaded:</strong> {formatDate(document.uploadedAt)}<br/>
                              <strong>Size:</strong> {formatFileSize(document.fileSize)}
                            </small>
                          </div>
                        )}

                        <div className="d-flex gap-2">
                          <input
                            type="file"
                            className="form-control form-control-sm"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(docType.key, e.target.files[0])}
                            disabled={uploadingFiles[docType.key]}
                            style={{ maxWidth: '300px' }}
                          />
                          
                          {document && document.fileName && (
                            <>
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => handleDownload(document)}
                                title="Download"
                              >
                                <i className="bi bi-download"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleDelete(docType.key)}
                                title="Delete"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </>
                          )}
                        </div>

                        {uploadingFiles[docType.key] && (
                          <div className="mt-2">
                            <div className="progress" style={{ height: '4px' }}>
                              <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: '100%' }}></div>
                            </div>
                            <small className="text-muted">Uploading...</small>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="col-12 mb-4">
            <div className="card bg-light">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="bi bi-info-circle text-primary me-2"></i>
                  Document Requirements
                </h6>
                <div className="row">
                  <div className="col-md-6">
                    <ul className="mb-0 small">
                      <li>All documents must be clear and readable</li>
                      <li>Scanned copies or high-quality photos are acceptable</li>
                      <li>File formats: PDF, JPG, PNG only</li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <ul className="mb-0 small">
                      <li>Maximum file size: 10MB per document</li>
                      <li>Required documents must be uploaded for account activation</li>
                      <li>Documents are securely stored and encrypted</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
});

export default DocumentsForm;
