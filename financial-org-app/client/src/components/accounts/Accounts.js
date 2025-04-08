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
  Tabs,
  Tab,
  IconButton,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
  InputAdornment
} from '@mui/material';
import {
  AccountBalance as AccountIcon,
  Add as AddIcon,
  Edit as EditIcon,
  ReceiptLong as ReceiptIcon
} from '@mui/icons-material';
import api from '../../services/api';

const Accounts = () => {
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false);
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountType: 'Savings',
    branch: '',
    balance: '',
    openDate: new Date().toISOString().split('T')[0]
  });
  const [transactionData, setTransactionData] = useState({
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'credit',
    reference: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [transactionErrors, setTransactionErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const accountTypes = ['Savings', 'Current', 'Fixed Deposit', 'Loan', 'Other'];
  const transactionTypes = [
    { value: 'credit', label: 'Credit (Deposit)' },
    { value: 'debit', label: 'Debit (Withdrawal)' }
  ];

  useEffect(() => {
    fetchBankData();
  }, []);

  const fetchBankData = async () => {
    setLoading(true);
    try {
      // Fetch real data from the API
      const accounts = await api.getBankAccounts();
      setBankAccounts(accounts);
      
      // Fetch all transactions for all accounts
      const allTransactions = await api.getBankTransactions();
      setTransactions(allTransactions);
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching bank data:", error);
      setLoading(false);
      setSnackbar({
        open: true,
        message: 'Failed to load bank account data',
        severity: 'error'
      });
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const formatCurrency = (amount) => {
    return `Rs. ${Number(amount).toLocaleString()}`;
  };

  const handleOpenDialog = () => {
    setFormErrors({});
    setFormData({
      bankName: '',
      accountNumber: '',
      accountType: 'Savings',
      branch: '',
      balance: '',
      openDate: new Date().toISOString().split('T')[0]
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
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

  const validateForm = () => {
    const errors = {};
    
    if (!formData.bankName) errors.bankName = 'Bank name is required';
    if (!formData.accountNumber) errors.accountNumber = 'Account number is required';
    if (!formData.accountType) errors.accountType = 'Account type is required';
    if (!formData.balance || isNaN(formData.balance) || Number(formData.balance) < 0) {
      errors.balance = 'Please enter a valid amount';
    }
    if (!formData.openDate) errors.openDate = 'Opening date is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      const newAccount = {
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        accountType: formData.accountType,
        branch: formData.branch || '',
        balance: parseFloat(formData.balance),
        openDate: formData.openDate
      };
      
      await api.addBankAccount(newAccount);
      
      setSnackbar({
        open: true,
        message: 'Bank account added successfully',
        severity: 'success'
      });
      
      // Refresh bank accounts after adding
      fetchBankData();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving bank account:", error);
      setSnackbar({
        open: true,
        message: 'Failed to save bank account',
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

  // Calculate total balance across all accounts
  const totalBalance = bankAccounts.reduce((sum, account) => sum + account.balance, 0);
  
  // Group accounts by type for summary
  const accountsByType = bankAccounts.reduce((groups, account) => {
    const type = account.accountType;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(account);
    return groups;
  }, {});

  const handleOpenTransactionDialog = (accountId = '') => {
    setTransactionErrors({});
    setTransactionData({
      accountId: accountId,
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      type: 'credit',
      reference: '',
    });
    setOpenTransactionDialog(true);
  };

  const handleCloseTransactionDialog = () => {
    setOpenTransactionDialog(false);
  };

  const handleTransactionInputChange = (e) => {
    const { name, value } = e.target;
    setTransactionData({
      ...transactionData,
      [name]: value
    });
    
    // Clear validation error when field is edited
    if (transactionErrors[name]) {
      setTransactionErrors({
        ...transactionErrors,
        [name]: undefined
      });
    }
  };

  const validateTransactionForm = () => {
    const errors = {};
    
    if (!transactionData.accountId) errors.accountId = 'Please select an account';
    if (!transactionData.date) errors.date = 'Date is required';
    if (!transactionData.description) errors.description = 'Description is required';
    if (!transactionData.amount || isNaN(transactionData.amount) || Number(transactionData.amount) <= 0) {
      errors.amount = 'Please enter a valid amount';
    }
    
    setTransactionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitTransaction = async () => {
    if (!validateTransactionForm()) return;
    
    try {
      const newTransaction = {
        accountId: transactionData.accountId,
        date: transactionData.date,
        description: transactionData.description,
        amount: parseFloat(transactionData.amount),
        type: transactionData.type,
        reference: transactionData.reference || ''
      };
      
      await api.addBankTransaction(newTransaction);
      
      setSnackbar({
        open: true,
        message: 'Transaction added successfully',
        severity: 'success'
      });
      
      // Refresh data after adding
      fetchBankData();
      handleCloseTransactionDialog();
    } catch (error) {
      console.error("Error saving transaction:", error);
      setSnackbar({
        open: true,
        message: 'Failed to save transaction',
        severity: 'error'
      });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Bank Accounts</Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Total Bank Balance */}
          <Card sx={{ mb: 4, bgcolor: 'primary.light', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>Total Bank Balance</Typography>
              <Typography variant="h3">{formatCurrency(totalBalance)}</Typography>
            </CardContent>
          </Card>
          
          {/* Tabs */}
          <Paper sx={{ mb: 4 }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="bank accounts tabs">
              <Tab label="Account Summary" />
              <Tab label="Account Details" />
              <Tab label="Recent Transactions" />
            </Tabs>
            
            {/* Tab Panels */}
            <Box sx={{ p: 3 }}>
              {/* Account Summary Tab */}
              {tabValue === 0 && (
                <Grid container spacing={3}>
                  {Object.entries(accountsByType).map(([type, accounts]) => (
                    <Grid item xs={12} md={6} key={type}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>{type} Accounts</Typography>
                          <Divider sx={{ mb: 2 }} />
                          
                          {accounts.map(account => (
                            <Box key={account.id} sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                              <Box>
                                <Typography variant="body1">{account.bankName}</Typography>
                                <Typography variant="body2" color="text.secondary">{account.accountNumber}</Typography>
                              </Box>
                              <Typography variant="body1" fontWeight="bold">{formatCurrency(account.balance)}</Typography>
                            </Box>
                          ))}
                          
                          <Divider sx={{ mb: 2 }} />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle1">Total {type}:</Typography>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {formatCurrency(accounts.reduce((sum, account) => sum + account.balance, 0))}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
              
              {/* Account Details Tab */}
              {tabValue === 1 && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button 
                      variant="contained" 
                      startIcon={<AddIcon />}
                      onClick={handleOpenDialog}
                    >
                      Add Account
                    </Button>
                  </Box>
                  
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Bank</TableCell>
                          <TableCell>Account Number</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Branch</TableCell>
                          <TableCell>Balance</TableCell>
                          <TableCell>Last Updated</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {bankAccounts.map((account) => (
                          <TableRow key={account.id}>
                            <TableCell>{account.bankName}</TableCell>
                            <TableCell>{account.accountNumber}</TableCell>
                            <TableCell>
                              <Chip 
                                icon={<AccountIcon />} 
                                label={account.accountType} 
                                size="small" 
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{account.branch}</TableCell>
                            <TableCell>{formatCurrency(account.balance)}</TableCell>
                            <TableCell>{account.openDate ? new Date(account.openDate).toLocaleDateString() : 'N/A'}</TableCell>
                            <TableCell>
                              <IconButton 
                                color="primary" 
                                size="small"
                                onClick={() => alert(`Edit account ${account.id}`)}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton 
                                color="secondary" 
                                size="small"
                                onClick={() => handleOpenTransactionDialog(account.id)}
                              >
                                <ReceiptIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
              
              {/* Recent Transactions Tab */}
              {tabValue === 2 && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button 
                      variant="contained" 
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenTransactionDialog()}
                    >
                      Add Transaction
                    </Button>
                  </Box>
                  
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Account</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell>Reference</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {transactions.map((transaction) => {
                          const account = bankAccounts.find(a => a.id === transaction.accountId);
                          return (
                            <TableRow key={transaction.id}>
                              <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                {account ? `${account.bankName} - ${account.accountNumber}` : ''}
                              </TableCell>
                              <TableCell>{transaction.description}</TableCell>
                              <TableCell>{transaction.reference}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={transaction.type === 'credit' ? 'Credit' : 'Debit'} 
                                  color={transaction.type === 'credit' ? 'success' : 'error'}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
          </Paper>
        </>
      )}
      
      {/* Add Bank Account Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Bank Account</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="bankName"
              label="Bank Name"
              name="bankName"
              value={formData.bankName}
              onChange={handleInputChange}
              error={!!formErrors.bankName}
              helperText={formErrors.bankName}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="accountNumber"
              label="Account Number"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleInputChange}
              error={!!formErrors.accountNumber}
              helperText={formErrors.accountNumber}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              select
              id="accountType"
              label="Account Type"
              name="accountType"
              value={formData.accountType}
              onChange={handleInputChange}
              error={!!formErrors.accountType}
              helperText={formErrors.accountType}
            >
              {accountTypes.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            
            <TextField
              margin="normal"
              fullWidth
              id="branch"
              label="Branch"
              name="branch"
              value={formData.branch}
              onChange={handleInputChange}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="balance"
              label="Opening Balance"
              name="balance"
              type="number"
              value={formData.balance}
              onChange={handleInputChange}
              error={!!formErrors.balance}
              helperText={formErrors.balance}
              InputProps={{
                startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
              }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="openDate"
              label="Opening Date"
              name="openDate"
              type="date"
              value={formData.openDate}
              onChange={handleInputChange}
              error={!!formErrors.openDate}
              helperText={formErrors.openDate}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
          >
            Add Account
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

      {/* Add Transaction Dialog */}
      <Dialog open={openTransactionDialog} onClose={handleCloseTransactionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add Transaction (ගනුදෙනුවක් එකතු කරන්න)</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              select
              id="accountId"
              label="Bank Account (බැංකු ගිණුම)"
              name="accountId"
              value={transactionData.accountId}
              onChange={handleTransactionInputChange}
              error={!!transactionErrors.accountId}
              helperText={transactionErrors.accountId}
            >
              {bankAccounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {`${account.bankName} - ${account.accountNumber}`}
                </MenuItem>
              ))}
            </TextField>
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="date"
              label="Transaction Date (ගනුදෙනු දිනය)"
              name="date"
              type="date"
              value={transactionData.date}
              onChange={handleTransactionInputChange}
              error={!!transactionErrors.date}
              helperText={transactionErrors.date}
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              select
              id="type"
              label="Transaction Type (ගනුදෙනු වර්ගය)"
              name="type"
              value={transactionData.type}
              onChange={handleTransactionInputChange}
            >
              {transactionTypes.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="amount"
              label="Amount (මුදල)"
              name="amount"
              type="number"
              value={transactionData.amount}
              onChange={handleTransactionInputChange}
              error={!!transactionErrors.amount}
              helperText={transactionErrors.amount}
              InputProps={{
                startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
              }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="description"
              label="Description (විස්තරය)"
              name="description"
              value={transactionData.description}
              onChange={handleTransactionInputChange}
              error={!!transactionErrors.description}
              helperText={transactionErrors.description}
            />
            
            <TextField
              margin="normal"
              fullWidth
              id="reference"
              label="Reference (යොමුව)"
              name="reference"
              value={transactionData.reference}
              onChange={handleTransactionInputChange}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTransactionDialog} color="primary">
            Cancel (අවලංගු කරන්න)
          </Button>
          <Button 
            onClick={handleSubmitTransaction} 
            variant="contained"
            color="primary"
          >
            Add Transaction (ගනුදෙනුව එකතු කරන්න)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Accounts; 