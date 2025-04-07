import React, { useState } from 'react';
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
  Divider
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

const Reports = () => {
  const [reportType, setReportType] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [memberId, setMemberId] = useState('');
  
  const members = [
    { id: 1, name: 'Rajiv Perera' },
    { id: 2, name: 'Saman Fernando' },
    { id: 3, name: 'Priya Jayawardena' },
    { id: 4, name: 'Kumara Silva' },
    { id: 5, name: 'Nilmini Dissanayake' }
  ];
  
  const reportTypes = [
    { id: 'member-statement', name: 'Member Statement', description: 'Detailed statement of a member\'s contributions, loans, and dividends', icon: <FileIcon /> },
    { id: 'cash-flow', name: 'Cash Flow Report', description: 'Summary of all cash inflows and outflows', icon: <FileIcon /> },
    { id: 'loan-summary', name: 'Loan Summary', description: 'List of all active loans, payments, and outstanding balances', icon: <FileIcon /> },
    { id: 'quarterly-profit', name: 'Quarterly Profit', description: 'Calculation of quarterly profit for dividend distribution', icon: <FileIcon /> },
    { id: 'balance-sheet', name: 'Balance Sheet', description: 'Statement of assets, liabilities, and equity', icon: <FileIcon /> }
  ];

  const handleExportReport = (format) => {
    // In production, this would generate and download a report
    alert(`Generating ${reportType} report in ${format} format for the period ${startDate ? startDate.toLocaleDateString() : 'N/A'} to ${endDate ? endDate.toLocaleDateString() : 'N/A'}`);
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
                  >
                    <MenuItem value="">Select a member</MenuItem>
                    {members.map((member) => (
                      <MenuItem key={member.id} value={member.id}>
                        {member.name}
                      </MenuItem>
                    ))}
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
              startIcon={<PdfIcon />}
              onClick={() => handleExportReport('pdf')}
              disabled={!reportType || !startDate || !endDate || (reportType === 'member-statement' && !memberId)}
            >
              Export as PDF
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<ExcelIcon />}
              onClick={() => handleExportReport('excel')}
              disabled={!reportType || !startDate || !endDate || (reportType === 'member-statement' && !memberId)}
            >
              Export as Excel
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
    </LocalizationProvider>
  );
};

export default Reports; 