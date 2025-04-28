import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import {
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Description as ReportIcon
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// Window API access
const api = window.api;

const Reports = () => {
  // State for form controls
  const [reportType, setReportType] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [memberId, setMemberId] = useState('');
  
  // State for data and UI
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  
  // Report types definition
  const reportTypes = [
    { id: 'member-statement', name: 'Member Statement', description: 'Detailed statement of a member\'s contributions, loans, and dividends', icon: <FileIcon /> },
    { id: 'cash-flow', name: 'Cash Flow Report', description: 'Summary of all cash inflows and outflows', icon: <FileIcon /> },
    { id: 'loan-summary', name: 'Loan Summary', description: 'List of all active loans, payments, and outstanding balances', icon: <FileIcon /> },
    { id: 'quarterly-profit', name: 'Quarterly Profit', description: 'Calculation of quarterly profit for dividend distribution', icon: <FileIcon /> },
    { id: 'balance-sheet', name: 'Balance Sheet', description: 'Statement of assets, liabilities, and equity', icon: <FileIcon /> }
  ];

  // Fetch members when component mounts
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const result = await api.getMembers();
        if (result && Array.isArray(result)) {
          setMembers(result.map(member => ({
            id: member.id,
            name: member.name
          })));
        }
      } catch (error) {
        console.error('Error fetching members:', error);
        setNotification({
          open: true,
          message: 'Failed to load members data',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchMembers();
  }, []);

  // Handle export report
  const handleExportReport = async (format) => {
    if (!reportType || !startDate || !endDate || (reportType === 'member-statement' && !memberId)) {
      return;
    }
    
    try {
      setGenerating(true);
      
      // Prepare parameters for report generation
      const params = {
        startDate: startDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        endDate: endDate.toISOString().split('T')[0],
        format: format,
        memberId: reportType === 'member-statement' ? memberId : undefined
      };
      
      console.log(`Generating ${reportType} report with params:`, params);
      
      // Call the API to generate the report
      const result = await api.generateReport(reportType, params);
      
      if (result && result.success) {
        setNotification({
          open: true,
          message: `Report generated successfully. ${result.message || ''}`,
          severity: 'success'
        });
      } else {
        throw new Error(result.message || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setNotification({
        open: true,
        message: `Failed to generate report: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setGenerating(false);
    }
  };

  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h4" gutterBottom>Reports</Typography>
        
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            <ReportIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Generate Reports
          </Typography>
          <Typography variant="body2" paragraph color="text.secondary">
            Select the type of report and specify the date range. For member-specific reports, 
            select the member from the dropdown.
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="report-type-label">Report Type</InputLabel>
                <Select
                  labelId="report-type-label"
                  value={reportType}
                  label="Report Type"
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <MenuItem value="">Select a report</MenuItem>
                  {reportTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {reportType === 'member-statement' && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="member-label">Select Member</InputLabel>
                  <Select
                    labelId="member-label"
                    value={memberId}
                    label="Select Member"
                    onChange={(e) => setMemberId(e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="">Select a member</MenuItem>
                    {loading ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} />
                        Loading members...
                      </MenuItem>
                    ) : (
                      members.map((member) => (
                        <MenuItem key={member.id} value={member.id}>
                          {member.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <PdfIcon />}
              onClick={() => handleExportReport('pdf')}
              disabled={generating || !reportType || !startDate || !endDate || (reportType === 'member-statement' && !memberId)}
            >
              {generating ? 'Generating...' : 'Export as PDF'}
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <ExcelIcon />}
              onClick={() => handleExportReport('excel')}
              disabled={generating || !reportType || !startDate || !endDate || (reportType === 'member-statement' && !memberId)}
            >
              {generating ? 'Generating...' : 'Export as Excel'}
            </Button>
          </Box>
        </Paper>
        
        <Typography variant="h5" gutterBottom>Available Reports</Typography>
        <Grid container spacing={3}>
          {reportTypes.map((report) => (
            <Grid item xs={12} sm={6} md={4} key={report.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {report.icon}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      {report.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {report.description}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    onClick={() => setReportType(report.id)}
                    sx={{ ml: 1 }}
                  >
                    Generate
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
      
      {/* Notification snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </LocalizationProvider>
  );
};

export default Reports; 