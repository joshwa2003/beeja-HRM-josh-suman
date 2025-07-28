import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip
} from '@mui/material';
import {
  CheckCircle as AcceptIcon,
  CheckCircle,
  Cancel as RejectIcon,
  Email as EmailIcon,
  Work as WorkIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  AttachMoney as SalaryIcon
} from '@mui/icons-material';

const OfferResponse = () => {
  const { offerId } = useParams();
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action');
  
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [comments, setComments] = useState('');
  const [responseSubmitted, setResponseSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOffer();
  }, [offerId]);

  useEffect(() => {
    if (offer && action) {
      setShowConfirmDialog(true);
    }
  }, [offer, action]);

  const fetchOffer = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/recruitment/public/offers/${offerId}`);
      
      if (response.ok) {
        const data = await response.json();
        setOffer(data.data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Offer not found');
      }
    } catch (error) {
      console.error('Error fetching offer:', error);
      setError('Failed to load offer details');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async () => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/recruitment/public/offers/${offerId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          response: action,
          comments: comments
        })
      });

      if (response.ok) {
        setResponseSubmitted(true);
        setShowConfirmDialog(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to submit response');
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      setError('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={3}>
        <Card sx={{ maxWidth: 500, width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <EmailIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom color="error">
              Offer Not Available
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {error}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (responseSubmitted) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={3}>
        <Card sx={{ maxWidth: 600, width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            {action === 'accept' ? (
              <>
                <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                <Typography variant="h4" gutterBottom color="success.main">
                  🎉 Offer Accepted!
                </Typography>
                <Typography variant="body1" paragraph>
                  Congratulations! You have successfully accepted the job offer for <strong>{offer.designation}</strong>.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Our HR team will contact you soon with the next steps for your onboarding process.
                </Typography>
              </>
            ) : (
              <>
                <RejectIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
                <Typography variant="h4" gutterBottom color="error.main">
                  Offer Declined
                </Typography>
                <Typography variant="body1" paragraph>
                  You have declined the job offer for <strong>{offer.designation}</strong>.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Thank you for considering our offer. We wish you all the best in your career journey.
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 4 }}>
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        {/* Header */}
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h3" gutterBottom>
              🎉 Job Offer
            </Typography>
            <Typography variant="h5">
              {offer.candidate?.firstName} {offer.candidate?.lastName}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              We're excited to offer you a position at Beeja HRM!
            </Typography>
          </CardContent>
        </Card>

        {/* Offer Details */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <WorkIcon sx={{ mr: 1 }} />
              Offer Details
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Position</Typography>
                  <Typography variant="h6">{offer.designation}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Department</Typography>
                  <Typography variant="h6">{offer.department?.name || offer.department}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Work Location</Typography>
                  <Typography variant="h6">
                    <LocationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {offer.workLocation}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Work Mode</Typography>
                  <Typography variant="h6">
                    <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {offer.workMode}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ p: 3, bgcolor: 'primary.50', borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">Annual Compensation</Typography>
                  <Typography variant="h3" color="primary.main" sx={{ fontWeight: 'bold' }}>
                    <SalaryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    ${parseInt(offer.salary.totalCTC).toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Joining Date</Typography>
                  <Typography variant="h6">
                    {new Date(offer.proposedJoiningDate).toLocaleDateString()}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Employment Type</Typography>
                  <Typography variant="h6">{offer.employmentType}</Typography>
                </Box>
              </Grid>
            </Grid>

            {offer.benefits?.otherBenefits?.length > 0 && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" gutterBottom>🎁 Benefits & Perks</Typography>
                <Box sx={{ pl: 2 }}>
                  <Typography variant="body2" gutterBottom>• Health Insurance Coverage</Typography>
                  <Typography variant="body2" gutterBottom>• Provident Fund (12% contribution)</Typography>
                  <Typography variant="body2" gutterBottom>• Gratuity Benefits</Typography>
                  <Typography variant="body2" gutterBottom>
                    • Leave Policy: {offer.benefits.leavePolicy.casual} Casual, {offer.benefits.leavePolicy.sick} Sick, {offer.benefits.leavePolicy.earned} Earned leaves
                  </Typography>
                  {offer.benefits.otherBenefits.map((benefit, index) => (
                    <Typography key={index} variant="body2" gutterBottom>• {benefit}</Typography>
                  ))}
                </Box>
              </>
            )}

            {offer.specialTerms?.length > 0 && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" gutterBottom>📝 Additional Terms</Typography>
                <Box sx={{ pl: 2 }}>
                  {offer.specialTerms.map((term, index) => (
                    <Typography key={index} variant="body2" gutterBottom>• {term}</Typography>
                  ))}
                </Box>
              </>
            )}
          </CardContent>
        </Card>

        {/* Important Information */}
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Important:</strong> This offer is valid until{' '}
            <strong>{new Date(offer.validUntil).toLocaleDateString()}</strong>.
            Please respond before the expiration date.
          </Typography>
        </Alert>

        {/* Action Buttons */}
        {!action && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h5" gutterBottom>
                Please respond to this offer
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  startIcon={<CheckCircle />}
                  onClick={() => {
                    window.location.href = `${window.location.pathname}?action=accept`;
                  }}
                  sx={{ mx: 2, px: 4, py: 2 }}
                >
                  Accept Offer
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  startIcon={<RejectIcon />}
                  onClick={() => {
                    window.location.href = `${window.location.pathname}?action=reject`;
                  }}
                  sx={{ mx: 2, px: 4, py: 2 }}
                >
                  Decline Offer
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {action === 'accept' ? (
              <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
                <CheckCircle sx={{ mr: 1 }} />
                Accept Job Offer
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
                <RejectIcon sx={{ mr: 1 }} />
                Decline Job Offer
              </Box>
            )}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" paragraph>
              {action === 'accept' 
                ? `Are you sure you want to accept the job offer for ${offer?.designation}?`
                : `Are you sure you want to decline the job offer for ${offer?.designation}?`
              }
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Comments (Optional)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={action === 'accept' 
                ? "Any comments or questions about the offer..."
                : "Reason for declining (optional)..."
              }
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowConfirmDialog(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleResponse}
              variant="contained"
              color={action === 'accept' ? 'success' : 'error'}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : null}
            >
              {submitting ? 'Submitting...' : `Confirm ${action === 'accept' ? 'Accept' : 'Decline'}`}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default OfferResponse;
