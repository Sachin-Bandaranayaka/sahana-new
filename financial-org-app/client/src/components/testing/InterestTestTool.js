import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Switch,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';

// Import the interest calculation function
const calculateAccruedInterest = (loan) => {
  if (!loan || !loan.startDate) return 0;
  
  // Get the last payment date or loan start date
  const lastPaymentDate = loan.payments && loan.payments.length > 0 
    ? new Date(Math.max(...loan.payments.map(p => new Date(p.date).getTime())))
    : new Date(loan.startDate);
  
  const today = new Date(loan.currentDate || Date.now());
  const daysDiff = Math.floor((today - lastPaymentDate) / (1000 * 60 * 60 * 24));
  
  // Handle daily vs monthly interest
  let interestAmount = 0;
  const interestRate = loan.interestRate / 100;
  
  if (loan.dailyInterest) {
    // Daily interest calculation
    const dailyRate = interestRate / 365;
    interestAmount = loan.balance * dailyRate * daysDiff;
  } else {
    // Monthly interest calculation (30 days per month)
    const monthlyRate = interestRate / 12;
    const monthsElapsed = daysDiff / 30;
    interestAmount = loan.balance * monthlyRate * monthsElapsed;
  }
  
  return interestAmount;
};

// Predefined test scenarios
const predefinedScenarios = [
  {
    name: "Monthly interest - 1 month",
    loan: {
      balance: 100000,
      interestRate: 5,
      startDate: (() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date.toISOString().split('T')[0];
      })(),
      dailyInterest: false,
      payments: []
    }
  },
  {
    name: "Daily interest - 1 month",
    loan: {
      balance: 100000,
      interestRate: 5,
      startDate: (() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date.toISOString().split('T')[0];
      })(),
      dailyInterest: true,
      payments: []
    }
  },
  {
    name: "Monthly interest - 3 months",
    loan: {
      balance: 100000,
      interestRate: 5,
      startDate: (() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 3);
        return date.toISOString().split('T')[0];
      })(),
      dailyInterest: false,
      payments: []
    }
  },
  {
    name: "Daily interest - higher rate",
    loan: {
      balance: 100000,
      interestRate: 12,
      startDate: (() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date.toISOString().split('T')[0];
      })(),
      dailyInterest: true,
      payments: []
    }
  }
];

const InterestTestTool = () => {
  const [loanData, setLoanData] = useState({
    balance: 10000,
    interestRate: 5,
    startDate: new Date().toISOString().split('T')[0],
    dailyInterest: false,
    payments: []
  });
  
  const [paymentData, setPaymentData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 1000
  });
  
  const [calculationDate, setCalculationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  
  const [testResults, setTestResults] = useState([]);
  
  const handleLoanDataChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLoanData({
      ...loanData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handlePaymentDataChange = (e) => {
    const { name, value } = e.target;
    setPaymentData({
      ...paymentData,
      [name]: value
    });
  };
  
  const addPayment = () => {
    setLoanData({
      ...loanData,
      payments: [...loanData.payments, { ...paymentData }]
    });
    
    // Reset payment amount but keep the date
    setPaymentData({
      ...paymentData,
      amount: 1000
    });
  };
  
  const clearPayments = () => {
    setLoanData({
      ...loanData,
      payments: []
    });
  };
  
  const calculateInterest = () => {
    const loanWithDate = {
      ...loanData,
      balance: parseFloat(loanData.balance),
      interestRate: parseFloat(loanData.interestRate),
      currentDate: calculationDate
    };
    
    const interest = calculateAccruedInterest(loanWithDate);
    
    const result = {
      loan: { ...loanWithDate },
      interest,
      timestamp: new Date().toISOString()
    };
    
    setTestResults([result, ...testResults]);
  };
  
  const runPredefinedScenarios = () => {
    const results = predefinedScenarios.map(scenario => {
      const loanWithDate = {
        ...scenario.loan,
        currentDate: calculationDate
      };
      
      const interest = calculateAccruedInterest(loanWithDate);
      
      return {
        name: scenario.name,
        loan: loanWithDate,
        interest,
        timestamp: new Date().toISOString()
      };
    });
    
    setTestResults([...results, ...testResults]);
  };
  
  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };
  
  return (
    <Box sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Loan Interest Calculation Test Tool
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Loan Details
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Loan Balance"
                  type="number"
                  name="balance"
                  value={loanData.balance}
                  onChange={handleLoanDataChange}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Interest Rate (%)"
                  type="number"
                  name="interestRate"
                  value={loanData.interestRate}
                  onChange={handleLoanDataChange}
                  InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  name="startDate"
                  value={loanData.startDate}
                  onChange={handleLoanDataChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      name="dailyInterest"
                      checked={loanData.dailyInterest}
                      onChange={handleLoanDataChange}
                    />
                  }
                  label="Daily Interest"
                />
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              Add Payment
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Payment Date"
                  type="date"
                  name="date"
                  value={paymentData.date}
                  onChange={handlePaymentDataChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Payment Amount"
                  type="number"
                  name="amount"
                  value={paymentData.amount}
                  onChange={handlePaymentDataChange}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={addPayment}
                >
                  Add Payment
                </Button>
              </Grid>
              
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="secondary"
                  onClick={clearPayments}
                >
                  Clear Payments
                </Button>
              </Grid>
            </Grid>
            
            {loanData.payments.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1">
                  Payment History
                </Typography>
                <List dense>
                  {loanData.payments.map((payment, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`Amount: ${formatCurrency(payment.amount)}`}
                        secondary={`Date: ${new Date(payment.date).toLocaleDateString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              Calculation Settings
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Calculation Date (Today)"
                  type="date"
                  value={calculationDate}
                  onChange={(e) => setCalculationDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={calculateInterest}
                >
                  Calculate Interest
                </Button>
              </Grid>
              
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  onClick={runPredefinedScenarios}
                >
                  Run Predefined Tests
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, maxHeight: 600, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Test Results
            </Typography>
            
            {testResults.length === 0 ? (
              <Typography color="text.secondary">
                No test results yet. Click "Calculate Interest" to test the current loan setup.
              </Typography>
            ) : (
              testResults.map((result, index) => (
                <Box key={index} sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  {result.name && (
                    <Typography variant="subtitle1" fontWeight="bold">
                      {result.name}
                    </Typography>
                  )}
                  
                  <Typography variant="body2">
                    Balance: {formatCurrency(result.loan.balance)}
                  </Typography>
                  
                  <Typography variant="body2">
                    Interest Rate: {result.loan.interestRate}% ({result.loan.dailyInterest ? 'Daily' : 'Monthly'})
                  </Typography>
                  
                  <Typography variant="body2">
                    Start Date: {new Date(result.loan.startDate).toLocaleDateString()}
                  </Typography>
                  
                  {result.loan.payments && result.loan.payments.length > 0 && (
                    <Typography variant="body2">
                      Last Payment: {new Date(Math.max(...result.loan.payments.map(p => new Date(p.date).getTime()))).toLocaleDateString()}
                    </Typography>
                  )}
                  
                  <Typography variant="body2">
                    Calculation Date: {new Date(result.loan.currentDate).toLocaleDateString()}
                  </Typography>
                  
                  <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                    Interest: {formatCurrency(result.interest)}
                  </Typography>
                </Box>
              ))
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default InterestTestTool; 