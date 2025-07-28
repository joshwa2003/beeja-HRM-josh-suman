import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { holidayAPI } from '../../utils/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  Container,
  Chip,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  FormControl,
  InputLabel,
  Select,
  Fade,
  Zoom,
  useTheme,
  useMediaQuery,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Event,
  Add,
  Edit,
  Delete,
  Upload,
  ChevronLeft,
  ChevronRight,
  Today,
  Close,
  CloudUpload,
  GetApp,
  Flag,
  EventAvailable,
} from '@mui/icons-material';

const HolidayCalendar = () => {
  const { hasAnyRole } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExcelUploadModal, setShowExcelUploadModal] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);

  const [formData, setFormData] = useState({
    holidayName: '',
    date: '',
    holidayType: 'Public',
    description: ''
  });

  const canManageHolidays = hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']);

  const holidayTypes = [
    { value: 'Public', label: 'Public Holiday', color: theme.palette.error.main },
    { value: 'Optional/Floating', label: 'Optional/Floating', color: theme.palette.warning.main },
    { value: 'Company-Specific', label: 'Company-Specific', color: theme.palette.primary.main }
  ];

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Government holidays for common countries (can be expanded)
  const getGovernmentHolidays = useCallback((year) => {
    const holidays = [
      // India holidays
      { name: "New Year's Day", date: `${year}-01-01`, type: 'Public' },
      { name: "Republic Day", date: `${year}-01-26`, type: 'Public' },
      { name: "Independence Day", date: `${year}-08-15`, type: 'Public' },
      { name: "Gandhi Jayanti", date: `${year}-10-02`, type: 'Public' },
      { name: "Christmas Day", date: `${year}-12-25`, type: 'Public' },
    ];
    
    return holidays.map(holiday => ({
      _id: `gov-${holiday.name.replace(/\s+/g, '-').toLowerCase()}-${year}`,
      holidayName: holiday.name,
      date: holiday.date,
      holidayType: holiday.type,
      description: 'Government Holiday',
      isGovernmentHoliday: true
    }));
  }, []);

  const fetchHolidays = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        limit: 100
      };

      const response = await holidayAPI.getHolidays(params);
      const userHolidays = response.data.holidays || [];
      
      // Get government holidays for the current year
      const governmentHolidays = getGovernmentHolidays(currentDate.getFullYear());
      
      // Combine user holidays and government holidays
      const allHolidays = [...userHolidays, ...governmentHolidays];
      
      setHolidays(allHolidays);
    } catch (err) {
      setError('Failed to fetch holidays');
      console.error('Fetch holidays error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate, getGovernmentHolidays]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (editingHoliday) {
        await holidayAPI.updateHoliday(editingHoliday._id, formData);
        setSuccess('Holiday updated successfully!');
      } else {
        await holidayAPI.createHoliday(formData);
        setSuccess('Holiday created successfully!');
      }

      setShowAddModal(false);
      setEditingHoliday(null);
      resetForm();
      fetchHolidays();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save holiday');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (holiday) => {
    setEditingHoliday(holiday);
    // Fix date formatting for editing
    const dateStr = holiday.date.includes('T') ? holiday.date.split('T')[0] : holiday.date;
    setFormData({
      holidayName: holiday.holidayName,
      date: dateStr,
      holidayType: holiday.holidayType,
      description: holiday.description || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (holidayId) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) {
      return;
    }

    try {
      setLoading(true);
      await holidayAPI.deleteHoliday(holidayId);
      setSuccess('Holiday deleted successfully!');
      fetchHolidays();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete holiday');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      holidayName: '',
      date: '',
      holidayType: 'Public',
      description: ''
    });
  };

  // Excel upload functionality
  const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid Excel file (.xlsx, .xls) or CSV file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    const formData = new FormData();
    formData.append('excelFile', file);

    try {
      setLoading(true);
      setError('');

      const response = await holidayAPI.uploadHolidaysExcel(formData);
      
      setUploadResults(response.data);
      
      // Show success message including already exists count
      let successMessage = `Successfully uploaded ${response.data.createdCount} holidays from Excel file.`;
      if (response.data.alreadyExistsCount > 0) {
        successMessage += ` ${response.data.alreadyExistsCount} holidays already existed and were skipped.`;
      }
      setSuccess(successMessage);
      
      // Refresh holidays list
      fetchHolidays();
      
      // Reset file input
      event.target.value = '';
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload Excel file');
      setUploadResults(null);
    } finally {
      setLoading(false);
    }
  };

  // Download sample Excel file
  const handleDownloadSample = async () => {
    try {
      setLoading(true);
      const response = await holidayAPI.downloadSampleExcel();
      
      // Create blob and download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'holiday_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download sample Excel file');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = (date = null) => {
    setEditingHoliday(null);
    resetForm();
    if (date) {
      // Fix date formatting to avoid timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      setFormData(prev => ({
        ...prev,
        date: dateString
      }));
    }
    setShowAddModal(true);
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const navigateToToday = () => {
    setCurrentDate(new Date());
  };

  const navigateToMonth = (month, year) => {
    const newDate = new Date(year, month, 1);
    setCurrentDate(newDate);
  };

  const getTypeConfig = (type) => {
    return holidayTypes.find(t => t.value === type) || holidayTypes[0];
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDateObj = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      // Create date in local timezone to avoid timezone issues
      const localDate = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth(), currentDateObj.getDate());
      
      const dayHolidays = holidays.filter(holiday => {
        // Parse holiday date properly
        let holidayDate;
        if (holiday.date.includes('T')) {
          holidayDate = new Date(holiday.date);
        } else {
          holidayDate = new Date(holiday.date + 'T00:00:00');
        }
        
        // Create local date objects for comparison
        const holidayLocalDate = new Date(holidayDate.getFullYear(), holidayDate.getMonth(), holidayDate.getDate());
        return holidayLocalDate.getTime() === localDate.getTime();
      });
      
      const today = new Date();
      const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isToday = localDate.toDateString() === todayLocal.toDateString();
      const isCurrentMonth = currentDateObj.getMonth() === month;
      
      days.push({
        date: localDate,
        isCurrentMonth,
        isToday,
        holidays: dayHolidays
      });
      
      currentDateObj.setDate(currentDateObj.getDate() + 1);
    }
    
    return days;
  };

  const handleDateClick = (day) => {
    // Use the exact date from the calendar day
    setSelectedDate(day.date);
    if (day.holidays.length > 0) {
      setShowModal(true);
    } else if (canManageHolidays) {
      openAddModal(day.date);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calendarDays = generateCalendarDays();

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Modern Header */}
      <Card
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 4,
          mb: 4,
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 3
          }}>
            <Box>
              <Typography 
                variant={isMobile ? "h4" : "h3"} 
                sx={{ 
                  fontWeight: 700, 
                  mb: 1, 
                  display: 'flex', 
                  alignItems: 'center',
                  color: 'white'
                }}
              >
                <Event sx={{ mr: 2, fontSize: { xs: '2rem', md: '2.5rem' } }} />
                Holiday Calendar
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9, color: 'white' }}>
                Manage and view company holidays
              </Typography>
            </Box>
            {canManageHolidays && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', md: 'auto' } }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => openAddModal()}
                  startIcon={<Add />}
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.3)',
                    },
                  }}
                >
                  Add Holiday
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => setShowExcelUploadModal(true)}
                  startIcon={<Upload />}
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.3)',
                    },
                  }}
                >
                  Upload Excel
                </Button>
              </Stack>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Alerts */}
      <Fade in={!!error}>
        <Box sx={{ mb: error ? 3 : 0 }}>
          {error && (
            <Alert
              severity="error"
              onClose={() => setError('')}
              sx={{ borderRadius: 2 }}
            >
              {error}
            </Alert>
          )}
        </Box>
      </Fade>

      <Fade in={!!success}>
        <Box sx={{ mb: success ? 3 : 0 }}>
          {success && (
            <Alert
              severity="success"
              onClose={() => setSuccess('')}
              sx={{ borderRadius: 2 }}
            >
              {success}
            </Alert>
          )}
        </Box>
      </Fade>

      {/* Calendar Navigation */}
      <Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            alignItems: 'center',
            gap: 2
          }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
              <Tooltip title="Previous Month">
                <IconButton
                  onClick={() => navigateMonth(-1)}
                  sx={{
                    bgcolor: theme.palette.grey[100],
                    '&:hover': { 
                      bgcolor: theme.palette.grey[200],
                      transform: 'scale(1.1)'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <ChevronLeft />
                </IconButton>
              </Tooltip>
              
              <Stack direction="row" spacing={1}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={currentDate.getMonth()}
                    onChange={(e) => navigateToMonth(parseInt(e.target.value), currentDate.getFullYear())}
                    sx={{ borderRadius: 2 }}
                  >
                    {months.map((month, index) => (
                      <MenuItem key={index} value={index}>
                        {month}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <Select
                    value={currentDate.getFullYear()}
                    onChange={(e) => navigateToMonth(currentDate.getMonth(), parseInt(e.target.value))}
                    sx={{ borderRadius: 2 }}
                  >
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() - 5 + i;
                      return (
                        <MenuItem key={year} value={year}>
                          {year}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Stack>
              
              <Tooltip title="Next Month">
                <IconButton
                  onClick={() => navigateMonth(1)}
                  sx={{
                    bgcolor: theme.palette.grey[100],
                    '&:hover': { 
                      bgcolor: theme.palette.grey[200],
                      transform: 'scale(1.1)'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <ChevronRight />
                </IconButton>
              </Tooltip>
            </Stack>
            
            <Button
              variant="contained"
              onClick={navigateToToday}
              startIcon={<Today />}
              sx={{
                backgroundColor: theme.palette.success.main,
                borderRadius: 2,
                px: 3,
                '&:hover': {
                  backgroundColor: theme.palette.success.dark,
                  transform: 'translateY(-2px)',
                  boxShadow: theme.shadows[8]
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              Today
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Traditional Calendar Grid */}
      <Card elevation={3} sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0, position: 'relative' }}>
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'rgba(255, 255, 255, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                backdropFilter: 'blur(4px)'
              }}
            >
              <CircularProgress size={60} thickness={4} />
            </Box>
          )}
          
          {/* Week Days Header */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)',
            bgcolor: theme.palette.grey[50],
            borderBottom: `2px solid ${theme.palette.divider}`
          }}>
            {weekDays.map(day => (
              <Box
                key={day}
                sx={{
                  textAlign: 'center',
                  fontWeight: 700,
                  color: theme.palette.text.secondary,
                  py: 2,
                  fontSize: { xs: '0.75rem', md: '0.875rem' },
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderRight: `1px solid ${theme.palette.divider}`,
                  '&:last-child': {
                    borderRight: 'none'
                  }
                }}
              >
                {isMobile ? day.slice(0, 1) : day}
              </Box>
            ))}
          </Box>
          
          {/* Calendar Days Grid */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)',
            gridTemplateRows: 'repeat(6, 1fr)',
            minHeight: { xs: '400px', md: '600px' }
          }}>
            {calendarDays.map((day, index) => (
              <Zoom in={true} key={index} style={{ transitionDelay: `${index * 10}ms` }}>
                <Paper
                  elevation={day.holidays.length > 0 ? 4 : 0}
                  sx={{
                    minHeight: { xs: '60px', md: '100px' },
                    p: 1,
                    cursor: 'pointer',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 0,
                    borderRight: `1px solid ${theme.palette.divider}`,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    bgcolor: day.isToday 
                      ? theme.palette.primary.main
                      : !day.isCurrentMonth 
                        ? theme.palette.grey[50] 
                        : day.holidays.length > 0 
                          ? theme.palette.background.paper
                          : theme.palette.background.paper,
                    color: day.isToday 
                      ? theme.palette.primary.contrastText 
                      : !day.isCurrentMonth 
                        ? theme.palette.text.disabled 
                        : theme.palette.text.primary,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      elevation: 6,
                      transform: 'translateY(-2px)',
                      bgcolor: day.isToday 
                        ? theme.palette.primary.dark
                        : theme.palette.action.hover,
                      '& .day-number': {
                        transform: 'scale(1.1)'
                      }
                    },
                    '&:nth-of-type(7n)': {
                      borderRight: 'none'
                    }
                  }}
                  onClick={() => handleDateClick(day)}
                >
                  {/* Day Number */}
                  <Typography
                    className="day-number"
                    variant="body2"
                    sx={{
                      fontWeight: day.isToday ? 900 : 600,
                      mb: 0.5,
                      fontSize: { xs: '0.75rem', md: '1rem' },
                      transition: 'transform 0.2s ease-in-out',
                      alignSelf: 'flex-start'
                    }}
                  >
                    {day.date.getDate()}
                  </Typography>
                  
                  {/* Holiday Indicators */}
                  {day.holidays.length > 0 && (
                    <Box sx={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 0.5,
                      overflow: 'hidden'
                    }}>
                      {day.holidays.slice(0, isMobile ? 1 : 2).map((holiday, idx) => {
                        const typeConfig = getTypeConfig(holiday.holidayType);
                        return (
                          <Tooltip key={idx} title={holiday.holidayName} arrow>
                            <Chip
                              label={
                                isMobile 
                                  ? holiday.holidayName.length > 8 
                                    ? holiday.holidayName.substring(0, 8) + '...' 
                                    : holiday.holidayName
                                  : holiday.holidayName.length > 12 
                                    ? holiday.holidayName.substring(0, 12) + '...' 
                                    : holiday.holidayName
                              }
                              size="small"
                              sx={{
                                height: { xs: 16, md: 20 },
                                fontSize: { xs: '0.6rem', md: '0.65rem' },
                                fontWeight: 600,
                                bgcolor: typeConfig.color,
                                color: 'white',
                                '& .MuiChip-label': {
                                  px: { xs: 0.5, md: 0.75 },
                                },
                                boxShadow: theme.shadows[2],
                                '&:hover': {
                                  transform: 'scale(1.05)',
                                  boxShadow: theme.shadows[4]
                                },
                                transition: 'all 0.2s ease-in-out'
                              }}
                            />
                          </Tooltip>
                        );
                      })}
                      {day.holidays.length > (isMobile ? 1 : 2) && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: { xs: '0.55rem', md: '0.6rem' },
                            color: day.isToday ? 'inherit' : theme.palette.text.secondary,
                            textAlign: 'center',
                            fontStyle: 'italic',
                            mt: 0.25,
                          }}
                        >
                          +{day.holidays.length - (isMobile ? 1 : 2)} more
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Holiday Count Badge */}
                  {day.holidays.length > 0 && (
                    <Badge
                      badgeContent={day.holidays.length}
                      color="secondary"
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        '& .MuiBadge-badge': {
                          fontSize: '0.6rem',
                          minWidth: 16,
                          height: 16
                        }
                      }}
                    >
                      <EventAvailable sx={{ fontSize: 16, opacity: 0.7 }} />
                    </Badge>
                  )}
                </Paper>
              </Zoom>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Holiday Details Modal */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '80vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {selectedDate && formatDate(selectedDate)}
          </Typography>
          <IconButton onClick={() => setShowModal(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 2 }}>
          {selectedDate && holidays
            .filter(holiday => {
              // Parse holiday date properly
              let holidayDate;
              if (holiday.date.includes('T')) {
                holidayDate = new Date(holiday.date);
              } else {
                holidayDate = new Date(holiday.date + 'T00:00:00');
              }
              
              // Create local date objects for comparison
              const holidayLocalDate = new Date(holidayDate.getFullYear(), holidayDate.getMonth(), holidayDate.getDate());
              const selectedLocalDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
              return holidayLocalDate.getTime() === selectedLocalDate.getTime();
            })
            .map((holiday, index) => {
              const typeConfig = getTypeConfig(holiday.holidayType);
              return (
                <Card key={index} elevation={2} sx={{ mb: 2, borderRadius: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          {holiday.holidayName}
                        </Typography>
                        <Chip
                          label={holiday.holidayType}
                          size="small"
                          sx={{
                            bgcolor: typeConfig.color,
                            color: 'white',
                            fontWeight: 600,
                            mb: 1
                          }}
                        />
                        {holiday.description && (
                          <Typography variant="body2" color="text.secondary">
                            {holiday.description}
                          </Typography>
                        )}
                      </Box>
                      
                      {canManageHolidays && !holiday.isGovernmentHoliday && (
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Edit Holiday">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setShowModal(false);
                                handleEdit(holiday);
                              }}
                              sx={{
                                bgcolor: theme.palette.info.light,
                                color: 'white',
                                '&:hover': {
                                  bgcolor: theme.palette.info.main,
                                }
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Holiday">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setShowModal(false);
                                handleDelete(holiday._id);
                              }}
                              sx={{
                                bgcolor: theme.palette.error.light,
                                color: 'white',
                                '&:hover': {
                                  bgcolor: theme.palette.error.main,
                                }
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                      {holiday.isGovernmentHoliday && (
                        <Chip
                          icon={<Flag />}
                          label="Government"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Holiday Modal */}
      <Dialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
          </Typography>
          <IconButton onClick={() => setShowAddModal(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label="Holiday Name"
                name="holidayName"
                value={formData.holidayName}
                onChange={handleInputChange}
                required
                inputProps={{ maxLength: 100 }}
                variant="outlined"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              
              <TextField
                fullWidth
                label="Date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleInputChange}
                required
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              
              <FormControl fullWidth variant="outlined">
                <InputLabel>Holiday Type</InputLabel>
                <Select
                  name="holidayType"
                  value={formData.holidayType}
                  onChange={handleInputChange}
                  label="Holiday Type"
                  required
                  sx={{ borderRadius: 2 }}
                >
                  {holidayTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: type.color
                          }}
                        />
                        {type.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                multiline
                rows={3}
                inputProps={{ maxLength: 500 }}
                variant="outlined"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                helperText={`${formData.description.length}/500 characters`}
              />
            </Stack>
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button
              onClick={() => setShowAddModal(false)}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : null}
              sx={{ 
                borderRadius: 2,
                minWidth: 120
              }}
            >
              {loading ? 'Saving...' : editingHoliday ? 'Update Holiday' : 'Add Holiday'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Excel Upload Modal */}
      <Dialog
        open={showExcelUploadModal}
        onClose={() => setShowExcelUploadModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Upload Holidays from Excel
          </Typography>
          <IconButton onClick={() => setShowExcelUploadModal(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Download Sample Section */}
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <GetApp sx={{ mr: 1, color: theme.palette.primary.main }} />
                  Step 1: Download Sample Template
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Download our Excel template to see the required format and sample data.
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleDownloadSample}
                  disabled={loading}
                  startIcon={<GetApp />}
                  sx={{ borderRadius: 2 }}
                >
                  Download Sample Excel
                </Button>
              </CardContent>
            </Card>

            {/* Upload Section */}
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <CloudUpload sx={{ mr: 1, color: theme.palette.success.main }} />
                  Step 2: Upload Your Excel File
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Select your Excel file (.xlsx, .xls) or CSV file with holiday data.
                </Typography>
                
                <Paper
                  variant="outlined"
                  sx={{
                    border: `2px dashed ${theme.palette.divider}`,
                    borderRadius: 2,
                    p: 4,
                    textAlign: 'center',
                    bgcolor: theme.palette.grey[50],
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                      bgcolor: theme.palette.primary.light + '10'
                    }
                  }}
                  component="label"
                >
                  <CloudUpload sx={{ fontSize: 48, color: theme.palette.success.main, mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Choose Excel file to upload
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Supported formats: .xlsx, .xls, .csv (Max 10MB)
                  </Typography>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelUpload}
                    style={{ display: 'none' }}
                  />
                  <Button variant="contained" sx={{ borderRadius: 2 }}>
                    Select File
                  </Button>
                </Paper>
              </CardContent>
            </Card>

            {/* Upload Results */}
            {uploadResults && (
              <Card 
                variant="outlined" 
                sx={{ 
                  borderRadius: 2,
                  borderColor: uploadResults.errorCount > 0 ? theme.palette.error.main : theme.palette.success.main
                }}
              >
                <CardContent>
                  <Typography variant="h6" sx={{ 
                    mb: 2, 
                    display: 'flex', 
                    alignItems: 'center',
                    color: uploadResults.errorCount > 0 ? theme.palette.error.main : theme.palette.success.main
                  }}>
                    Upload Results
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {uploadResults.totalRows}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total Rows
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                          {uploadResults.createdCount}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Created
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
                          {uploadResults.alreadyExistsCount || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Already Exist
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.error.main }}>
                          {uploadResults.errorCount}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Errors
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  
                  {uploadResults.errors && uploadResults.errors.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" color="error" sx={{ mb: 1 }}>
                        Errors:
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2, maxHeight: 150, overflow: 'auto' }}>
                        {uploadResults.errors.map((error, index) => (
                          <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                            <strong>Row {error.row}:</strong> {error.error}
                          </Typography>
                        ))}
                      </Paper>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: theme.palette.info.light + '10' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  💡 Tips:
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">• Use the sample template for correct format</Typography>
                  <Typography variant="body2">• Date format should be YYYY-MM-DD (e.g., 2024-12-25)</Typography>
                  <Typography variant="body2">• Required fields: Holiday Name, Date</Typography>
                  <Typography variant="body2">• Optional fields: Holiday Type, Description</Typography>
                  <Typography variant="body2">• Duplicate holidays will be skipped (not treated as errors)</Typography>
                  <Typography variant="body2">• Maximum file size: 10MB</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default HolidayCalendar;
