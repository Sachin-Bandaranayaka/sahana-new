import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  InputAdornment,
  Snackbar,
  Alert
} from '@mui/material';
import { SavingsOutlined, CalculateOutlined } from '@mui/icons-material';
import api from '../../services/api';

const Dividends = () => {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [totalMemberShares, setTotalMemberShares] = useState(0);
  const [addDividendOpen, setAddDividendOpen] = useState(false);
  const [calculateProfitsOpen, setCalculateProfitsOpen] = useState(false);
  const [dividendData, setDividendData] = useState({
    totalShares: 0,
    totalDividends: 0,
    quarterlyProfit: 0,
    dividendRate: 0,
    dividendEntries: []
  });
  const [formData, setFormData] = useState({
    quarterEndDate: new Date().toISOString().split('T')[0],
    totalShares: 0,
    profitAmount: '',
    dividendRate: '',
    calculationDate: new Date().toISOString().split('T')[0]
  });
  const [profitFormData, setProfilFormData] = useState({
    quarterEndDate: new Date().toISOString().split('T')[0],
    quarter: getCurrentQuarter(),
    year: new Date().getFullYear(),
    incomeAmount: '',
    expenseAmount: '',
    profitAmount: 0,
    dividendRate: 8.5
  });
  const [formErrors, setFormErrors] = useState({});
  const [profitFormErrors, setProfitFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  function getCurrentQuarter() {
    const month = new Date().getMonth() + 1; // JavaScript months start at 0
    if (month <= 3) return 1;
    if (month <= 6) return 2;
    if (month <= 9) return 3;
    return 4;
  }

  // Get quarter end date based on quarter and year
  function getQuarterEndDate(quarter, year) {
    const month = quarter * 3;
    // Last day of the month
    let date = new Date(year, month, 0);
    return date.toISOString().split('T')[0];
  }

  useEffect(() => {
    fetchDividendData();
    fetchMembers();
  }, []);

  const fetchDividendData = async () => {
    setLoading(true);
    try {
      // Fetch real data from API
      const dividends = await api.getDividends();
      
      if (dividends && dividends.length > 0) {
        // Calculate total values from the fetched dividends
        const totalDividends = dividends.reduce((sum, div) => sum + (div.profitAmount || 0), 0);
        const latestDividend = dividends[0]; // Assuming they're ordered by date DESC
        
        setDividendData({
          totalShares: latestDividend.totalShares || 0,
          totalDividends: totalDividends,
          quarterlyProfit: latestDividend.profitAmount || 0,
          dividendRate: latestDividend.dividendRate || 0,
          dividendEntries: dividends.map(div => ({
            id: div.id,
            date: div.quarterEndDate,
            description: `Q${Math.ceil(new Date(div.quarterEndDate).getMonth() / 3)} ${new Date(div.quarterEndDate).getFullYear()} Dividend`,
            totalAmount: div.profitAmount,
            shareAmount: div.totalShares,
            perShareAmount: div.totalShares > 0 ? div.profitAmount / div.totalShares : 0
          }))
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching dividend data:", error);
      setLoading(false);
      setSnackbar({
        open: true,
        message: 'Error fetching dividend data: ' + error.message,
        severity: 'error'
      });
    }
  };

  const fetchMembers = async () => {
    try {
      const data = await api.getMembers();
      setMembers(data);
      
      // Calculate total shares
      const totalShares = data.reduce((sum, member) => sum + (member.shares || 0), 0);
      setTotalMemberShares(totalShares);
      
      // Update form data with total shares
      setFormData(prev => ({
        ...prev,
        totalShares: totalShares
      }));
      
      setProfilFormData(prev => ({
        ...prev,
        totalShares: totalShares
      }));
      
    } catch (error) {
      console.error("Error fetching members:", error);
      setSnackbar({
        open: true,
        message: 'Error fetching members: ' + error.message,
        severity: 'error'
      });
    }
  };

  const formatCurrency = (amount) => {
    return `Rs. ${Number(amount).toLocaleString()}`;
  };
  
  // Add Dividend Entry Dialog Functions
  const handleAddDividendOpen = () => {
    setFormErrors({});
    setFormData({
      quarterEndDate: new Date().toISOString().split('T')[0],
      totalShares: totalMemberShares,
      profitAmount: '',
      dividendRate: '',
      calculationDate: new Date().toISOString().split('T')[0]
    });
    setAddDividendOpen(true);
  };
  
  const handleAddDividendClose = () => {
    setAddDividendOpen(false);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear validation error when field is edited
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: undefined
      });
    }
  };
  
  const validateDividendForm = () => {
    const errors = {};
    
    if (!formData.quarterEndDate) {
      errors.quarterEndDate = 'Quarter end date is required';
    }
    
    if (!formData.totalShares || formData.totalShares <= 0) {
      errors.totalShares = 'Total shares must be greater than 0';
    }
    
    if (!formData.profitAmount || parseFloat(formData.profitAmount) <= 0) {
      errors.profitAmount = 'Profit amount must be greater than 0';
    }
    
    if (!formData.dividendRate || parseFloat(formData.dividendRate) <= 0) {
      errors.dividendRate = 'Dividend rate must be greater than 0';
    }
    
    if (!formData.calculationDate) {
      errors.calculationDate = 'Calculation date is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleAddDividendSubmit = async () => {
    if (!validateDividendForm()) return;
    
    try {
      const newDividend = {
        quarterEndDate: formData.quarterEndDate,
        totalShares: parseInt(formData.totalShares),
        profitAmount: parseFloat(formData.profitAmount),
        dividendRate: parseFloat(formData.dividendRate),
        calculationDate: formData.calculationDate
      };
      
      await api.addDividend(newDividend);
      
      setSnackbar({
        open: true,
        message: 'Dividend entry added successfully',
        severity: 'success'
      });
      
      // Refresh dividend data
      fetchDividendData();
      handleAddDividendClose();
    } catch (error) {
      console.error("Error saving dividend entry:", error);
      setSnackbar({
        open: true,
        message: 'Failed to save dividend entry: ' + error.message,
        severity: 'error'
      });
    }
  };
  
  // Calculate Quarterly Profits Dialog Functions
  const handleCalculateProfitsOpen = () => {
    setProfitFormErrors({});
    
    // Get the current quarter and year
    const currentQuarter = getCurrentQuarter();
    const currentYear = new Date().getFullYear();
    
    // Calculate quarter end date
    const quarterEndDate = getQuarterEndDate(currentQuarter, currentYear);
    
    setProfilFormData({
      quarterEndDate: quarterEndDate,
      quarter: currentQuarter,
      year: currentYear,
      incomeAmount: '',
      expenseAmount: '',
      profitAmount: 0,
      dividendRate: 8.5
    });
    
    setCalculateProfitsOpen(true);
  };
  
  const handleCalculateProfitsClose = () => {
    setCalculateProfitsOpen(false);
  };
  
  const handleProfitInputChange = (e) => {
    const { name, value } = e.target;
    const updatedFormData = {
      ...profitFormData,
      [name]: value
    };
    
    // Recalculate profit amount if income or expense changes
    if (name === 'incomeAmount' || name === 'expenseAmount') {
      const income = name === 'incomeAmount' ? 
        (value ? parseFloat(value) : 0) : 
        (profitFormData.incomeAmount ? parseFloat(profitFormData.incomeAmount) : 0);
      
      const expense = name === 'expenseAmount' ? 
        (value ? parseFloat(value) : 0) : 
        (profitFormData.expenseAmount ? parseFloat(profitFormData.expenseAmount) : 0);
      
      updatedFormData.profitAmount = income - expense;
    }
    
    // Recalculate quarter end date if quarter or year changes
    if (name === 'quarter' || name === 'year') {
      updatedFormData.quarterEndDate = getQuarterEndDate(
        name === 'quarter' ? parseInt(value) : profitFormData.quarter,
        name === 'year' ? parseInt(value) : profitFormData.year
      );
    }
    
    setProfilFormData(updatedFormData);
    
    // Clear validation error when field is edited
    if (profitFormErrors[name]) {
      setProfitFormErrors({
        ...profitFormErrors,
        [name]: undefined
      });
    }
  };
  
  const validateProfitForm = () => {
    const errors = {};
    
    if (!profitFormData.quarter) {
      errors.quarter = 'Quarter is required';
    }
    
    if (!profitFormData.year) {
      errors.year = 'Year is required';
    }
    
    if (!profitFormData.incomeAmount || parseFloat(profitFormData.incomeAmount) < 0) {
      errors.incomeAmount = 'Income amount must be 0 or greater';
    }
    
    if (!profitFormData.expenseAmount || parseFloat(profitFormData.expenseAmount) < 0) {
      errors.expenseAmount = 'Expense amount must be 0 or greater';
    }
    
    if (profitFormData.profitAmount <= 0) {
      errors.profitAmount = 'Profit amount must be greater than 0';
    }
    
    if (!profitFormData.dividendRate || parseFloat(profitFormData.dividendRate) <= 0) {
      errors.dividendRate = 'Dividend rate must be greater than 0';
    }
    
    setProfitFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleCalculateProfitsSubmit = async () => {
    if (!validateProfitForm()) return;
    
    try {
      const newDividend = {
        quarterEndDate: profitFormData.quarterEndDate,
        totalShares: totalMemberShares,
        profitAmount: profitFormData.profitAmount,
        dividendRate: parseFloat(profitFormData.dividendRate),
        calculationDate: new Date().toISOString().split('T')[0]
      };
      
      await api.addDividend(newDividend);
      
      setSnackbar({
        open: true,
        message: 'Quarterly profits calculated and saved successfully',
        severity: 'success'
      });
      
      // Refresh dividend data
      fetchDividendData();
      handleCalculateProfitsClose();
    } catch (error) {
      console.error("Error calculating quarterly profits:", error);
      setSnackbar({
        open: true,
        message: 'Failed to calculate quarterly profits: ' + error.message,
        severity: 'error'
      });
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Dividends</Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Total Shares</Typography>
                  <Typography variant="h4">{dividendData.totalShares}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Total Dividends</Typography>
                  <Typography variant="h4">{formatCurrency(dividendData.totalDividends)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Latest Quarterly Profit</Typography>
                  <Typography variant="h4">{formatCurrency(dividendData.quarterlyProfit)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Dividend Rate</Typography>
                  <Typography variant="h4">{dividendData.dividendRate}%</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SavingsOutlined />}
              onClick={handleAddDividendOpen}
            >
              Add Dividend Entry
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<CalculateOutlined />}
              onClick={handleCalculateProfitsOpen}
            >
              Calculate Quarterly Profits
            </Button>
          </Box>

          {/* Dividend History Table */}
          <Typography variant="h5" gutterBottom>Dividend History</Typography>
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Total Amount</TableCell>
                    <TableCell>Share Amount</TableCell>
                    <TableCell>Per Share</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dividendData.dividendEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">No dividend records found</TableCell>
                    </TableRow>
                  ) : (
                    dividendData.dividendEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell>{formatCurrency(entry.totalAmount)}</TableCell>
                        <TableCell>{entry.shareAmount}</TableCell>
                        <TableCell>{formatCurrency(entry.perShareAmount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Information Box */}
          <Paper sx={{ mt: 4, p: 3 }}>
            <Typography variant="h6" gutterBottom>
              About Dividends
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body1" paragraph>
              Dividends are distributed quarterly based on the organization's profitability. 
              The dividend per share is calculated based on the quarterly profit and the total number of shares.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Next dividend calculation is scheduled for the end of the current quarter.
            </Typography>
          </Paper>
          
          {/* Add Dividend Entry Dialog */}
          <Dialog open={addDividendOpen} onClose={handleAddDividendClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add Dividend Entry</DialogTitle>
            <DialogContent>
              <Box component="form" sx={{ mt: 1 }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="quarterEndDate"
                  label="Quarter End Date"
                  name="quarterEndDate"
                  type="date"
                  value={formData.quarterEndDate}
                  onChange={handleInputChange}
                  error={!!formErrors.quarterEndDate}
                  helperText={formErrors.quarterEndDate}
                  InputLabelProps={{ shrink: true }}
                />
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="totalShares"
                  label="Total Shares"
                  name="totalShares"
                  type="number"
                  value={formData.totalShares}
                  onChange={handleInputChange}
                  error={!!formErrors.totalShares}
                  helperText={formErrors.totalShares}
                />
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="profitAmount"
                  label="Profit Amount"
                  name="profitAmount"
                  type="number"
                  value={formData.profitAmount}
                  onChange={handleInputChange}
                  error={!!formErrors.profitAmount}
                  helperText={formErrors.profitAmount}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                  }}
                />
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="dividendRate"
                  label="Dividend Rate"
                  name="dividendRate"
                  type="number"
                  value={formData.dividendRate}
                  onChange={handleInputChange}
                  error={!!formErrors.dividendRate}
                  helperText={formErrors.dividendRate}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                />
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="calculationDate"
                  label="Calculation Date"
                  name="calculationDate"
                  type="date"
                  value={formData.calculationDate}
                  onChange={handleInputChange}
                  error={!!formErrors.calculationDate}
                  helperText={formErrors.calculationDate}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleAddDividendClose}>Cancel</Button>
              <Button 
                onClick={handleAddDividendSubmit} 
                variant="contained"
              >
                Add Dividend
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Calculate Quarterly Profits Dialog */}
          <Dialog open={calculateProfitsOpen} onClose={handleCalculateProfitsClose} maxWidth="sm" fullWidth>
            <DialogTitle>Calculate Quarterly Profits</DialogTitle>
            <DialogContent>
              <Box component="form" sx={{ mt: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel id="quarter-label">Quarter</InputLabel>
                      <Select
                        labelId="quarter-label"
                        id="quarter"
                        name="quarter"
                        value={profitFormData.quarter}
                        label="Quarter"
                        onChange={handleProfitInputChange}
                        error={!!profitFormErrors.quarter}
                      >
                        <MenuItem value={1}>Q1 (Jan-Mar)</MenuItem>
                        <MenuItem value={2}>Q2 (Apr-Jun)</MenuItem>
                        <MenuItem value={3}>Q3 (Jul-Sep)</MenuItem>
                        <MenuItem value={4}>Q4 (Oct-Dec)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      margin="normal"
                      required
                      fullWidth
                      id="year"
                      label="Year"
                      name="year"
                      type="number"
                      value={profitFormData.year}
                      onChange={handleProfitInputChange}
                      error={!!profitFormErrors.year}
                      helperText={profitFormErrors.year}
                    />
                  </Grid>
                </Grid>
                
                <TextField
                  margin="normal"
                  disabled
                  fullWidth
                  id="quarterEndDate"
                  label="Quarter End Date"
                  name="quarterEndDate"
                  type="date"
                  value={profitFormData.quarterEndDate}
                  InputLabelProps={{ shrink: true }}
                />
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="incomeAmount"
                  label="Total Income"
                  name="incomeAmount"
                  type="number"
                  value={profitFormData.incomeAmount}
                  onChange={handleProfitInputChange}
                  error={!!profitFormErrors.incomeAmount}
                  helperText={profitFormErrors.incomeAmount}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                  }}
                />
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="expenseAmount"
                  label="Total Expenses"
                  name="expenseAmount"
                  type="number"
                  value={profitFormData.expenseAmount}
                  onChange={handleProfitInputChange}
                  error={!!profitFormErrors.expenseAmount}
                  helperText={profitFormErrors.expenseAmount}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                  }}
                />
                
                <TextField
                  margin="normal"
                  disabled
                  fullWidth
                  id="profitAmount"
                  label="Net Profit"
                  name="profitAmount"
                  type="number"
                  value={profitFormData.profitAmount}
                  error={!!profitFormErrors.profitAmount}
                  helperText={profitFormErrors.profitAmount}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                  }}
                />
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="dividendRate"
                  label="Dividend Rate"
                  name="dividendRate"
                  type="number"
                  value={profitFormData.dividendRate}
                  onChange={handleProfitInputChange}
                  error={!!profitFormErrors.dividendRate}
                  helperText={profitFormErrors.dividendRate}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                />
                
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                  Total Shares: {totalMemberShares}
                </Typography>
                
                <Typography variant="subtitle2" color="text.secondary">
                  Dividend per Share: {profitFormData.profitAmount > 0 && totalMemberShares > 0 
                    ? formatCurrency((profitFormData.profitAmount * (profitFormData.dividendRate / 100)) / totalMemberShares) 
                    : 'Rs. 0'}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCalculateProfitsClose}>Cancel</Button>
              <Button 
                onClick={handleCalculateProfitsSubmit} 
                variant="contained"
                disabled={profitFormData.profitAmount <= 0}
              >
                Calculate & Save
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Snackbar for notifications */}
          <Snackbar 
            open={snackbar.open} 
            autoHideDuration={6000} 
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        </>
      )}
    </Box>
  );
};

export default Dividends; 