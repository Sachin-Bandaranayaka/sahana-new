import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Grid,
  CircularProgress,
  IconButton,
  Chip,
  Snackbar,
  Alert,
  MenuItem,
  InputAdornment,
  Tabs,
  Tab
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  ArrowUpward as IncomeIcon,
  ArrowDownward as ExpenseIcon
} from '@mui/icons-material';
import api from '../../services/api';
import smsService from '../../services/smsService';

const CashBook = () => {
  const [transactions, setTransactions] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState({
    date: '',
    type: 'income',
    category: '',
    amount: '',
    description: '',
    memberId: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Categories by transaction type
  const categories = {
    income: [
      'Membership Fee (සාමාජික ගාස්තු)',
      'Loan Interest (ණය පොලී)',
      'Contribution (දායකත්වය)',
      'Investment Return (ආයෝජන ප්‍රතිලාභ)',
      'Late Payment Fee (ප්‍රමාද ගෙවීම් ගාස්තු)',
      'Other Income (වෙනත් ආදායම්)'
    ],
    expense: [
      'Administrative (පරිපාලන)',
      'Office Supplies (කාර්යාල සැපයුම්)',
      'Rent (කුලිය)',
      'Utilities (උපයෝගිතා)',
      'Travel (ගමන් වියදම්)',
      'Events (උත්සව)',
      'Dividends Paid (ගෙවන ලද ලාභාංශ)',
      'Bank Charges (බැංකු ගාස්තු)',
      'Other Expense (වෙනත් වියදම්)'
    ]
  };

  useEffect(() => {
    fetchTransactions();
    fetchMembers();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await api.getCashEntries();
      setTransactions(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setLoading(false);
      setSnackbar({
        open: true,
        message: 'Failed to load transaction data',
        severity: 'error'
      });
    }
  };

  const fetchMembers = async () => {
    try {
      const data = await api.getMembers();
      setMembers(data);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleOpenDialog = (mode, transaction = null) => {
    setEditMode(mode === 'edit');
    setFormErrors({});
    
    if (mode === 'edit' && transaction) {
      setCurrentTransaction(transaction);
      setFormData({
        date: transaction.date,
        type: transaction.type,
        category: transaction.category,
        amount: transaction.amount,
        description: transaction.description,
        memberId: transaction.memberId || ''
      });
    } else {
      setCurrentTransaction(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'income',
        category: '',
        amount: '',
        description: '',
        memberId: ''
      });
    }
    
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Reset category if type changes
    if (name === 'type' && value !== formData.type) {
      setFormData({
        ...formData,
        [name]: value,
        category: ''
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
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
    
    if (!formData.date) errors.date = 'Date is required';
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.amount || formData.amount <= 0) errors.amount = 'Please enter a valid amount';
    
    // Validate member selection for relevant income categories
    if (formData.type === 'income' && 
        (formData.category === 'Membership Fee (සාමාජික ගාස්තු)' || 
         formData.category === 'Loan Interest (ණය පොලී)' || 
         formData.category === 'Contribution (දායකත්වය)' || 
         formData.category === 'Late Payment Fee (ප්‍රමාද ගෙවීම් ගාස්තු)') && 
        !formData.memberId) {
      errors.memberId = 'Member is required for this category';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      if (editMode && currentTransaction) {
        // Update existing transaction
        const updatedTransaction = {
          date: formData.date,
          type: formData.type,
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description,
          memberId: formData.memberId ? parseInt(formData.memberId) : null
        };
        
        await api.updateCashEntry(currentTransaction.id, updatedTransaction);
        
        setSnackbar({
          open: true,
          message: 'Transaction updated successfully',
          severity: 'success'
        });
      } else {
        // Add new transaction
        const newTransaction = {
          date: formData.date,
          type: formData.type,
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description,
          memberId: formData.memberId ? parseInt(formData.memberId) : null
        };
        
        await api.addCashEntry(newTransaction);
        
        // Send SMS notification for member fee payment
        if (formData.type === 'income' && 
            formData.category === 'Membership Fee (සාමාජික ගාස්තු)' && 
            formData.memberId) {
          try {
            // Get member details to get the phone number
            const member = await api.getMember(formData.memberId);
            if (member && member.phone) {
              // Send the SMS
              const smsResult = await smsService.sendMemberFeeSMS(
                member.phone,
                parseFloat(formData.amount)
              );
              
              console.log('Member fee payment SMS result:', smsResult);
            }
          } catch (smsError) {
            console.error('Error sending member fee payment SMS:', smsError);
          }
        }
        
        setSnackbar({
          open: true,
          message: 'Transaction added successfully',
          severity: 'success'
        });
      }
      
      // Refresh transactions after adding or updating
      fetchTransactions();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving transaction:", error);
      setSnackbar({
        open: true,
        message: 'Failed to save transaction data',
        severity: 'error'
      });
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await api.deleteCashEntry(transactionId);
        
        setSnackbar({
          open: true,
          message: 'Transaction deleted successfully',
          severity: 'success'
        });
        
        // Refresh transactions after deletion
        fetchTransactions();
      } catch (error) {
        console.error("Error deleting transaction:", error);
        setSnackbar({
          open: true,
          message: 'Failed to delete transaction',
          severity: 'error'
        });
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  // Filter transactions based on selected tab
  const filteredTransactions = transactions.filter(transaction => {
    if (tabValue === 0) return true; // All transactions
    if (tabValue === 1) return transaction.type === 'income'; // Income only
    if (tabValue === 2) return transaction.type === 'expense'; // Expense only
    return true;
  });

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const balance = totalIncome - totalExpense;

  const formatCurrency = (amount) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  return (
    <Box sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Cash Book (මුදල් පොත)
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('add')}
        >
          Add Transaction (ගනුදෙනුවක් එකතු කරන්න)
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'success.light', color: 'white' }}>
            <Typography variant="h6">Total Income</Typography>
            <Typography variant="h4">{formatCurrency(totalIncome)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'error.light', color: 'white' }}>
            <Typography variant="h6">Total Expense</Typography>
            <Typography variant="h4">{formatCurrency(totalExpense)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'primary.light', color: 'white' }}>
            <Typography variant="h6">Balance</Typography>
            <Typography variant="h4">{formatCurrency(balance)}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="All Transactions (සියලු ගනුදෙනු)" />
          <Tab label="Income (ආදායම්)" />
          <Tab label="Expenses (වියදම්)" />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date (දිනය)</TableCell>
                  <TableCell>Type (වර්ගය)</TableCell>
                  <TableCell>Category (ප්‍රවර්ගය)</TableCell>
                  <TableCell>Description (විස්තරය)</TableCell>
                  <TableCell align="right">Amount (මුදල)</TableCell>
                  <TableCell align="right">Actions (ක්‍රියා)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((transaction) => (
                    <TableRow key={transaction.id} hover>
                      <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {transaction.type === 'income' ? (
                          <Chip 
                            icon={<IncomeIcon />} 
                            label="Income" 
                            color="success" 
                            size="small" 
                          />
                        ) : (
                          <Chip 
                            icon={<ExpenseIcon />} 
                            label="Expense" 
                            color="error" 
                            size="small" 
                          />
                        )}
                      </TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell align="right">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleOpenDialog('edit', transaction)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          color="error" 
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredTransactions.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}

      {/* Add/Edit Transaction Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit Transaction (ගනුදෙනුව සංස්කරණය කරන්න)' : 'Add New Transaction (නව ගනුදෙනුවක් එකතු කරන්න)'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="date"
                label="Date (දිනය)"
                type="date"
                value={formData.date}
                onChange={handleInputChange}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                error={!!formErrors.date}
                helperText={formErrors.date}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                name="type"
                label="Transaction Type (ගනුදෙනු වර්ගය)"
                value={formData.type}
                onChange={handleInputChange}
                fullWidth
                required
              >
                <MenuItem value="income">Income (ආදායම)</MenuItem>
                <MenuItem value="expense">Expense (වියදම)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                name="category"
                label="Category (ප්‍රවර්ගය)"
                value={formData.category}
                onChange={handleInputChange}
                fullWidth
                required
                error={!!formErrors.category}
                helperText={formErrors.category}
              >
                {categories[formData.type].map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="amount"
                label="Amount (මුදල)"
                type="number"
                value={formData.amount}
                onChange={handleInputChange}
                fullWidth
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                  inputProps: { min: 0 }
                }}
                error={!!formErrors.amount}
                helperText={formErrors.amount}
              />
            </Grid>
            {formData.type === 'income' && (
              ['Membership Fee (සාමාජික ගාස්තු)', 'Loan Interest (ණය පොලී)', 'Contribution (දායකත්වය)'].includes(formData.category) && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    name="memberId"
                    label="Related Member (අදාළ සාමාජික)"
                    value={formData.memberId}
                    onChange={handleInputChange}
                    fullWidth
                    error={!!formErrors.memberId}
                    helperText={formErrors.memberId}
                  >
                    <MenuItem value="">None (නැත)</MenuItem>
                    {members.map((member) => (
                      <MenuItem key={member.id} value={member.id}>
                        {member.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )
            )}
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description (විස්තරය)"
                value={formData.description}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel (අවලංගු කරන්න)
          </Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            {editMode ? 'Update (යාවත්කාලීන කරන්න)' : 'Add (එකතු කරන්න)'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
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

export default CashBook; 