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
  const [addDividendOpen, setAddDividendOpen] = useState(false);
  const [calculateProfitsOpen, setCalculateProfitsOpen] = useState(false);
  const [dividendData, setDividendData] = useState({
    totalDividends: 0,
    quarterlyProfit: 0,
    dividendRate: 0,
    dividendEntries: []
  });
  const [formData, setFormData] = useState({
    quarterEndDate: new Date().toISOString().split('T')[0],
    profitAmount: '',
    dividendRate: '',
    calculationDate: new Date().toISOString().split('T')[0]
  });
  const [profitFormData, setProfitFormData] = useState({
    quarterEndDate: new Date().toISOString().split('T')[0],
    quarter: getCurrentQuarter(),
    year: new Date().getFullYear(),
    incomeAmount: '',
    expenseAmount: '',
    profitAmount: 0,
    dividendRate: 8.5
  });
  const [dividendDistribution, setDividendDistribution] = useState([]);
  const [orgAssets, setOrgAssets] = useState({
    totalAssets: 0,
    cashContributions: 0,
    bankBalances: 0,
    outstandingLoans: 0
  });
  const [formErrors, setFormErrors] = useState({});
  const [profitFormErrors, setProfitFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  function getCurrentQuarter() {
    const month = new Date().getMonth() + 1;
    if (month <= 3) return 1;
    if (month <= 6) return 2;
    if (month <= 9) return 3;
    return 4;
  }

  function getQuarterEndDate(quarter, year) {
    const month = quarter * 3;
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
      const dividends = await api.getDividends();
      
      if (dividends && dividends.length > 0) {
        const totalDividends = dividends.reduce((sum, div) => sum + (div.profitAmount || 0), 0);
        const latestDividend = dividends[0];
        
        setDividendData({
          totalDividends: totalDividends,
          quarterlyProfit: latestDividend.profitAmount || 0,
          dividendRate: latestDividend.dividendRate || 0,
          dividendEntries: dividends.map(div => ({
            id: div.id,
            date: div.quarterEndDate,
            description: `Q${Math.ceil(new Date(div.quarterEndDate).getMonth() / 3)} ${new Date(div.quarterEndDate).getFullYear()} Dividend`,
            totalAmount: div.profitAmount,
            dividendRate: div.dividendRate,
            perMemberAmount: div.profitAmount / members.length
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
      setMembers(data.filter(member => member.status === 'active'));
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
  
  const handleAddDividendOpen = () => {
    setFormErrors({});
    setFormData({
      quarterEndDate: new Date().toISOString().split('T')[0],
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
    
    if (!formData.profitAmount) {
      errors.profitAmount = 'Profit amount is required';
    } else if (isNaN(formData.profitAmount) || Number(formData.profitAmount) <= 0) {
      errors.profitAmount = 'Enter a valid profit amount';
    }
    
    if (!formData.dividendRate) {
      errors.dividendRate = 'Dividend rate is required';
    } else if (isNaN(formData.dividendRate) || Number(formData.dividendRate) <= 0) {
      errors.dividendRate = 'Enter a valid dividend rate';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddDividendSubmit = async () => {
    if (!validateDividendForm()) return;
    
    try {
      const dividendData = {
        quarterEndDate: formData.quarterEndDate,
        profitAmount: Number(formData.profitAmount),
        dividendRate: Number(formData.dividendRate),
        calculationDate: formData.calculationDate,
        activeMembers: members.length
      };
      
      await api.addDividend(dividendData);
      
      setSnackbar({
        open: true,
        message: 'Dividend entry added successfully',
        severity: 'success'
      });
      
      handleAddDividendClose();
      fetchDividendData();
    } catch (error) {
      console.error("Error adding dividend:", error);
      setSnackbar({
        open: true,
        message: 'Error adding dividend: ' + error.message,
        severity: 'error'
      });
    }
  };

  const handleCalculateProfitsOpen = () => {
    setProfitFormErrors({});
    const currentDate = new Date();
    const currentQuarter = getCurrentQuarter();
    const currentYear = currentDate.getFullYear();
    
    setProfitFormData({
      quarterEndDate: getQuarterEndDate(currentQuarter, currentYear),
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
    
    // Auto-calculate profit amount when income or expense is changed
    if (name === 'incomeAmount' || name === 'expenseAmount') {
      const income = name === 'incomeAmount' ? Number(value) : Number(profitFormData.incomeAmount) || 0;
      const expense = name === 'expenseAmount' ? Number(value) : Number(profitFormData.expenseAmount) || 0;
      
      if (!isNaN(income) && !isNaN(expense)) {
        updatedFormData.profitAmount = Math.max(0, income - expense);
      }
    }
    
    setProfitFormData(updatedFormData);
    
    if (profitFormErrors[name]) {
      setProfitFormErrors({
        ...profitFormErrors,
        [name]: undefined
      });
    }
  };

  const validateProfitForm = () => {
    const errors = {};
    
    if (!profitFormData.incomeAmount || profitFormData.incomeAmount <= 0) {
      errors.incomeAmount = 'Income amount must be greater than 0';
    }
    
    if (profitFormData.expenseAmount < 0) {
      errors.expenseAmount = 'Expense amount cannot be negative';
    }
    
    if (profitFormData.profitAmount <= 0) {
      errors.profitAmount = 'Profit amount must be greater than 0';
    }
    
    // Dividend rate is now automatically calculated, so no validation needed
    
    setProfitFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const calculateProportionalDividends = async () => {
    if (!validateProfitForm()) return;
    
    setLoading(true);
    try {
      // Get organization assets first
      const assets = await api.calculateOrgAssets();
      setOrgAssets(assets);
      
      // Calculate appropriate dividend rate based on organization's financial health
      // This is a simplified example - you can implement more complex logic
      let calculatedRate = 8.5; // Default rate
      
      // Example: If total assets are high, we can afford a higher dividend rate
      if (assets.totalAssets > 1000000) {
        calculatedRate = 10.0;
      } else if (assets.totalAssets > 500000) {
        calculatedRate = 9.0;
      } else if (assets.totalAssets < 100000) {
        calculatedRate = 7.0;
      }
      
      // Update the profit form data with the calculated rate
      setProfitFormData(prevData => ({
        ...prevData,
        dividendRate: calculatedRate
      }));
      
      // Now calculate the proportional dividends with the calculated rate
      const result = await api.calculateProportionalDividends({
        quarterlyProfit: profitFormData.profitAmount,
        dividendRate: calculatedRate,
        quarter: profitFormData.quarter,
        year: profitFormData.year
      });
      
      setDividendDistribution(result.dividends);
      setSnackbar({
        open: true,
        message: 'Dividend distribution calculated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error calculating proportional dividends:', error);
      setSnackbar({
        open: true,
        message: 'Error calculating dividends: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateProportionalDividends = async () => {
    await calculateProportionalDividends();
  };

  const handleCalculateProfitsSubmit = async () => {
    if (!validateProfitForm()) return;
    
    setLoading(true);
    try {
      // First, make sure we have calculated the dividends and have a valid dividend rate
      if (!dividendDistribution || !profitFormData.dividendRate) {
        await calculateProportionalDividends();
      }
      
      // Create the dividend entry
      const dividend = {
        date: profitFormData.endDate,
        quarter: profitFormData.quarter,
        year: profitFormData.year,
        amount: profitFormData.profitAmount * (profitFormData.dividendRate / 100),
        rate: profitFormData.dividendRate,
        description: `Q${profitFormData.quarter} ${profitFormData.year} Dividend`,
        profitAmount: profitFormData.profitAmount,
        distributionMethod: 'proportional'
      };
      
      const newDividend = await api.addDividend(dividend);
      
      // Process payments for each member
      const payments = dividendDistribution.map(item => ({
        dividendId: newDividend.id,
        memberId: item.memberId,
        amount: item.amount,
        shares: item.proportion * 100, // Store proportion as percentage for easier display
        status: 'pending',
        paymentDate: new Date().toISOString().split('T')[0]
      }));
      
      // Add all payments
      for (const payment of payments) {
        await api.addDividendPayment(payment);
      }
      
      setSnackbar({
        open: true, 
        message: 'Dividend calculated and saved successfully',
        severity: 'success'
      });
      
      handleCalculateProfitsClose();
      fetchDividendData();
    } catch (error) {
      console.error('Error saving dividend calculation:', error);
      setSnackbar({
        open: true,
        message: 'Error saving dividend: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Add function to auto-populate the form with current quarter data
  const autoPopulateQuarterlyData = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    let currentQuarter = Math.floor(currentMonth / 3) + 1;
    
    // For quarter end date - last day of the quarter
    const quarterEndMonth = currentQuarter * 3 - 1;
    const quarterEndDate = new Date(currentYear, quarterEndMonth + 1, 0);
    
    // Format date as YYYY-MM-DD for input field
    const formattedDate = quarterEndDate.toISOString().split('T')[0];
    
    // Remove the dividend rate as it will be calculated automatically
    setProfitFormData({
      ...profitFormData,
      quarter: currentQuarter,
      year: currentYear,
      endDate: formattedDate
    });
    
    // Try to fetch financial data for this quarter
    fetchQuarterlyFinancialData(currentQuarter, currentYear);
  };
  
  // Fetch quarterly financial data (income, expenses) if available
  const fetchQuarterlyFinancialData = async (quarter, year) => {
    try {
      setLoading(true);
      // You would implement an API call here to get the quarterly data
      // For now, we'll simulate it with some logic
      
      // Example calculation based on cashbook entries
      const startDate = new Date(year, (quarter - 1) * 3, 1);
      const endMonth = quarter * 3 - 1;
      const endDate = new Date(year, endMonth + 1, 0);
      
      // Format dates for filtering
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      // Get cashbook entries for the quarter to estimate income and expenses
      const cashEntries = await api.getCashbookEntriesByDateRange(formattedStartDate, formattedEndDate);
      
      let totalIncome = 0;
      let totalExpenses = 0;
      
      if (cashEntries && cashEntries.length > 0) {
        cashEntries.forEach(entry => {
          if (entry.type === 'income' || entry.type === 'deposit') {
            totalIncome += parseFloat(entry.amount);
          } else if (entry.type === 'expense' || entry.type === 'withdrawal') {
            totalExpenses += parseFloat(entry.amount);
          }
        });
      }
      
      // Round to 2 decimal places
      totalIncome = Math.round(totalIncome * 100) / 100;
      totalExpenses = Math.round(totalExpenses * 100) / 100;
      const profit = totalIncome - totalExpenses;
      
      setProfitFormData(prevData => ({
        ...prevData,
        incomeAmount: totalIncome,
        expenseAmount: totalExpenses,
        profitAmount: profit
      }));
      
    } catch (error) {
      console.error("Error fetching quarterly financial data:", error);
      setSnackbar({
        open: true,
        message: 'Error fetching quarterly financial data: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Update the openCalculateProfitsDialog function to auto-populate data
  const openCalculateProfitsDialog = () => {
    setCalculateProfitsOpen(true);
    autoPopulateQuarterlyData();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Dividends</Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<CalculateOutlined />}
            onClick={openCalculateProfitsDialog}
            sx={{ mr: 2 }}
          >
            Calculate Profits
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Dividends Distributed
              </Typography>
              <Typography variant="h5">
                {formatCurrency(dividendData.totalDividends)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Latest Quarterly Profit
              </Typography>
              <Typography variant="h5">
                {formatCurrency(dividendData.quarterlyProfit)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Members
              </Typography>
              <Typography variant="h5">
                {members.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dividend History Table */}
      <Typography variant="h6" gutterBottom>
        Dividend History
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Total Amount</TableCell>
              <TableCell align="right">Dividend Rate</TableCell>
              <TableCell align="right">Per Member</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : dividendData.dividendEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No dividend entries found
                </TableCell>
              </TableRow>
            ) : (
              dividendData.dividendEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell align="right">{formatCurrency(entry.totalAmount)}</TableCell>
                  <TableCell align="right">{entry.dividendRate}%</TableCell>
                  <TableCell align="right">{formatCurrency(entry.perMemberAmount)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Dividend Dialog */}
      <Dialog open={addDividendOpen} onClose={handleAddDividendClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add Dividend Entry</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Quarter End Date"
                name="quarterEndDate"
                type="date"
                value={formData.quarterEndDate}
                onChange={handleInputChange}
                error={!!formErrors.quarterEndDate}
                helperText={formErrors.quarterEndDate}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Profit Amount"
                name="profitAmount"
                value={formData.profitAmount}
                onChange={handleInputChange}
                error={!!formErrors.profitAmount}
                helperText={formErrors.profitAmount}
                InputProps={{
                  startAdornment: <InputAdornment position="start">Rs.</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dividend Rate (%)"
                name="dividendRate"
                value={formData.dividendRate}
                onChange={handleInputChange}
                error={!!formErrors.dividendRate}
                helperText={formErrors.dividendRate}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Calculation Date"
                name="calculationDate"
                type="date"
                value={formData.calculationDate}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddDividendClose}>Cancel</Button>
          <Button onClick={handleAddDividendSubmit} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Calculate Profits Dialog */}
      <Dialog open={calculateProfitsOpen} onClose={handleCalculateProfitsClose} maxWidth="md" fullWidth>
        <DialogTitle>Calculate Quarterly Profits & Dividends</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                This will automatically calculate dividends based on each member's proportional assets.
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Quarter End Date"
                type="date"
                name="endDate"
                value={profitFormData.endDate}
                onChange={handleProfitInputChange}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                label="Income Amount"
                type="number"
                name="incomeAmount"
                value={profitFormData.incomeAmount}
                onChange={handleProfitInputChange}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                label="Expense Amount"
                type="number"
                name="expenseAmount"
                value={profitFormData.expenseAmount}
                onChange={handleProfitInputChange}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                label="Profit Amount"
                type="number"
                name="profitAmount"
                value={profitFormData.profitAmount}
                onChange={handleProfitInputChange}
                fullWidth
                disabled
                InputProps={{
                  startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                }}
              />
            </Grid>

            {/* Display calculated dividend rate as read-only information */}
            {profitFormData.dividendRate && (
              <Grid item xs={12}>
                <Typography variant="subtitle1">
                  Calculated Dividend Rate: {profitFormData.dividendRate}%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Based on organization's total assets: {orgAssets?.totalAssets ? api.formatCurrency(orgAssets.totalAssets) : '...'}
                </Typography>
              </Grid>
            )}

            <Grid item xs={12}>
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={handleCalculateProportionalDividends}
                sx={{ mb: 2 }}
              >
                Preview Dividend Distribution
              </Button>
            </Grid>
          </Grid>
          
          {dividendDistribution.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Dividend Distribution Preview
              </Typography>
              <Typography variant="body2" gutterBottom>
                Total Organization Assets: {formatCurrency(orgAssets.totalAssets)}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Total Dividend Amount: {formatCurrency(dividendDistribution.reduce((total, item) => total + item.dividendAmount, 0))}
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Member</TableCell>
                      <TableCell align="right">Assets</TableCell>
                      <TableCell align="right">Proportion</TableCell>
                      <TableCell align="right">Dividend Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dividendDistribution.map((item) => (
                      <TableRow key={item.memberId}>
                        <TableCell>{item.memberName}</TableCell>
                        <TableCell align="right">{formatCurrency(item.memberAssets)}</TableCell>
                        <TableCell align="right">{(item.proportion * 100).toFixed(2)}%</TableCell>
                        <TableCell align="right">{formatCurrency(item.dividendAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCalculateProfitsClose}>Cancel</Button>
          <Button 
            onClick={handleCalculateProfitsSubmit} 
            variant="contained"
            disabled={dividendDistribution.length === 0}
          >
            Calculate & Add
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dividends; 