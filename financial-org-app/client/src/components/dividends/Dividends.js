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
    
    setProfilFormData({
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
    let newValue = value;
    
    if (name === 'incomeAmount' || name === 'expenseAmount') {
      newValue = value.replace(/[^0-9.]/g, '');
      if (newValue && !isNaN(newValue)) {
        const profit = name === 'incomeAmount' 
          ? Number(newValue) - Number(profitFormData.expenseAmount || 0)
          : Number(profitFormData.incomeAmount || 0) - Number(newValue);
        
        setProfilFormData(prev => ({
          ...prev,
          [name]: newValue,
          profitAmount: profit
        }));
      } else {
        setProfilFormData(prev => ({
          ...prev,
          [name]: newValue
        }));
      }
    } else {
      setProfilFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    if (profitFormErrors[name]) {
      setProfitFormErrors({
        ...profitFormErrors,
        [name]: undefined
      });
    }
  };

  const validateProfitForm = () => {
    const errors = {};
    
    if (!profitFormData.quarterEndDate) {
      errors.quarterEndDate = 'Quarter end date is required';
    }
    
    if (!profitFormData.incomeAmount) {
      errors.incomeAmount = 'Income amount is required';
    } else if (isNaN(profitFormData.incomeAmount) || Number(profitFormData.incomeAmount) < 0) {
      errors.incomeAmount = 'Enter a valid income amount';
    }
    
    if (!profitFormData.expenseAmount) {
      errors.expenseAmount = 'Expense amount is required';
    } else if (isNaN(profitFormData.expenseAmount) || Number(profitFormData.expenseAmount) < 0) {
      errors.expenseAmount = 'Enter a valid expense amount';
    }
    
    if (profitFormData.profitAmount < 0) {
      errors.profitAmount = 'Total expenses cannot exceed income';
    }
    
    setProfitFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCalculateProfitsSubmit = async () => {
    if (!validateProfitForm()) return;
    
    try {
      const profitData = {
        quarterEndDate: profitFormData.quarterEndDate,
        incomeAmount: Number(profitFormData.incomeAmount),
        expenseAmount: Number(profitFormData.expenseAmount),
        profitAmount: profitFormData.profitAmount,
        dividendRate: profitFormData.dividendRate,
        activeMembers: members.length
      };
      
      await api.addDividend(profitData);
      
      setSnackbar({
        open: true,
        message: 'Profit calculated and dividend entry added successfully',
        severity: 'success'
      });
      
      handleCalculateProfitsClose();
      fetchDividendData();
    } catch (error) {
      console.error("Error calculating profits:", error);
      setSnackbar({
        open: true,
        message: 'Error calculating profits: ' + error.message,
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Dividends</Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<CalculateOutlined />}
            onClick={handleCalculateProfitsOpen}
            sx={{ mr: 2 }}
          >
            Calculate Profits
          </Button>
          <Button
            variant="contained"
            startIcon={<SavingsOutlined />}
            onClick={handleAddDividendOpen}
          >
            Add Dividend
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
      <Dialog open={calculateProfitsOpen} onClose={handleCalculateProfitsClose} maxWidth="sm" fullWidth>
        <DialogTitle>Calculate Quarterly Profits</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Quarter End Date"
                name="quarterEndDate"
                type="date"
                value={profitFormData.quarterEndDate}
                onChange={handleProfitInputChange}
                error={!!profitFormErrors.quarterEndDate}
                helperText={profitFormErrors.quarterEndDate}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Income Amount"
                name="incomeAmount"
                value={profitFormData.incomeAmount}
                onChange={handleProfitInputChange}
                error={!!profitFormErrors.incomeAmount}
                helperText={profitFormErrors.incomeAmount}
                InputProps={{
                  startAdornment: <InputAdornment position="start">Rs.</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Expense Amount"
                name="expenseAmount"
                value={profitFormData.expenseAmount}
                onChange={handleProfitInputChange}
                error={!!profitFormErrors.expenseAmount}
                helperText={profitFormErrors.expenseAmount}
                InputProps={{
                  startAdornment: <InputAdornment position="start">Rs.</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Profit Amount"
                name="profitAmount"
                value={profitFormData.profitAmount}
                disabled
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
                value={profitFormData.dividendRate}
                onChange={handleProfitInputChange}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCalculateProfitsClose}>Cancel</Button>
          <Button onClick={handleCalculateProfitsSubmit} variant="contained">
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