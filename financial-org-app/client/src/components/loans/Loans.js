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
  Switch,
  FormControlLabel,
  Radio
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  ReceiptLong as ReceiptIcon
} from '@mui/icons-material';
import api from '../../services/api';
import smsService from '../../services/smsService';
import otpService, { OTP_OPERATIONS } from '../../services/otpService';

const Loans = () => {
  const [loans, setLoans] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openOtpDialog, setOpenOtpDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentLoan, setCurrentLoan] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    memberId: '',
    amount: '',
    interestRate: 8,
    loanTypeId: '',
    startDate: '',
    endDate: '',
    purpose: '',
    dailyInterest: false,
    status: 'active',
    payments: []
  });
  const [paymentData, setPaymentData] = useState({
    principalAmount: '',
    interestAmount: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
    paymentType: 'both' // 'both', 'principal', or 'interest'
  });
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [loanTypes, setLoanTypes] = useState([]);
  const [otpData, setOtpData] = useState({
    otpToken: '',
    otpCode: '',
    isLoading: false,
    error: ''
  });

  useEffect(() => {
    fetchLoans();
    fetchMembers();
    fetchLoanTypes();
  }, []);

  // Calculate total interest due for a loan (unpaid + newly accrued)
  const calculateAccruedInterest = (loan) => {
    if (!loan || !loan.startDate) return 0;
    
    // Get existing unpaid interest
    const unpaidInterest = loan.unpaid_interest || 0;
    
    // Get the last interest payment date (not any payment date)
    const lastInterestPayment = loan.payments && loan.payments.length > 0 
      ? loan.payments.filter(p => p.interestAmount > 0).sort((a, b) => new Date(b.date) - new Date(a.date))[0]
      : null;
    
    const lastInterestDate = lastInterestPayment 
      ? new Date(lastInterestPayment.date)
      : new Date(loan.startDate);
    
    const today = new Date();
    const daysDiff = Math.floor((today - lastInterestDate) / (1000 * 60 * 60 * 24));
    
    // Calculate newly accrued interest since last interest payment
    let newAccruedInterest = 0;
    const interestRate = loan.interestRate / 100;
    
    if (loan.dailyInterest) {
      // Daily interest calculation
      const dailyRate = interestRate / 365;
      newAccruedInterest = loan.balance * dailyRate * daysDiff;
    } else {
      // Monthly interest calculation (30 days per month)
      const monthlyRate = interestRate / 12;
      const monthsElapsed = daysDiff / 30;
      newAccruedInterest = loan.balance * monthlyRate * monthsElapsed;
    }
    
    // Return total interest due (unpaid + newly accrued)
    return unpaidInterest + newAccruedInterest;
  };

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const data = await api.getLoans();
      
      // Set loans data (interest is calculated on-demand when needed)
      setLoans(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching loans:", error);
      setLoading(false);
      setSnackbar({
        open: true,
        message: 'Failed to load loans data',
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

  const fetchLoanTypes = async () => {
    try {
      const types = await api.getLoanTypes();
      setLoanTypes(types);
      
      if (types.length > 0 && !formData.loanTypeId) {
        setFormData(prev => ({
          ...prev,
          loanTypeId: types[0].id,
          interestRate: types[0].interest_rate
        }));
      }
    } catch (error) {
      console.error("Error fetching loan types:", error);
      setSnackbar({
        open: true,
        message: 'Failed to load loan types',
        severity: 'error'
      });
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenDialog = (mode, loan = null) => {
    setEditMode(mode === 'edit');
    setFormErrors({});
    
    if (mode === 'edit' && loan) {
      setCurrentLoan(loan);

      // For edit mode, get the member's phone number and send OTP first
      const requestOtpAndOpenDialog = async () => {
        try {
          // Get member details to find phone number
          const member = await api.getMember(loan.memberId);
          if (!member || !member.phone) {
            setSnackbar({
              open: true,
              message: 'Member has no phone number for OTP verification',
              severity: 'error'
            });
            return;
          }

          // Request OTP
          setOtpData({
            ...otpData,
            isLoading: true,
            error: ''
          });

          const result = await otpService.generateAndSendOTP(
            member.phone, 
            OTP_OPERATIONS.LOAN_EDIT
          );

          if (result.success) {
            setOtpData({
              ...otpData,
              otpToken: result.otpToken,
              isLoading: false
            });
            
            // Set up the form data but open OTP dialog instead
            setFormData({
              memberId: loan.memberId,
              amount: loan.amount,
              interestRate: loan.interestRate,
              loanTypeId: loan.loanTypeId || '',
              startDate: loan.startDate,
              endDate: loan.endDate || '',
              purpose: loan.purpose,
              dailyInterest: loan.dailyInterest,
              status: loan.status,
              payments: loan.payments
            });
            
            setOpenOtpDialog(true);
          } else {
            setOtpData({
              ...otpData,
              isLoading: false,
              error: result.error || 'Failed to send OTP'
            });
            
            setSnackbar({
              open: true,
              message: `Failed to send OTP: ${result.error || 'Unknown error'}`,
              severity: 'error'
            });
          }
        } catch (error) {
          console.error("Error requesting OTP:", error);
          setOtpData({
            ...otpData,
            isLoading: false,
            error: 'Failed to process OTP request'
          });
          
          setSnackbar({
            open: true,
            message: 'Failed to process OTP request',
            severity: 'error'
          });
        }
      };

      requestOtpAndOpenDialog();
    } else {
      setCurrentLoan(null);
      const defaultLoanType = loanTypes.length > 0 ? loanTypes[0] : null;
      setFormData({
        memberId: '',
        amount: '',
        interestRate: defaultLoanType ? defaultLoanType.interest_rate : 8,
        loanTypeId: defaultLoanType ? defaultLoanType.id : '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        purpose: '',
        dailyInterest: false,
        status: 'active',
        payments: []
      });
      
      setOpenDialog(true);
    }
  };

  const handleOpenPaymentDialog = (loan) => {
    setCurrentLoan(loan);
    
    // Calculate newly accrued interest only
    const accruedInterest = calculateAccruedInterest(loan);
    
    setPaymentData({
      principalAmount: '',
      interestAmount: accruedInterest.toFixed(2),
      date: new Date().toISOString().split('T')[0],
      note: '',
      paymentType: 'both'
    });
    setOpenPaymentDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleClosePaymentDialog = () => {
    setOpenPaymentDialog(false);
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

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData({
      ...paymentData,
      [name]: value
    });
  };

  const handleSwitchChange = (e) => {
    setFormData({
      ...formData,
      dailyInterest: e.target.checked
    });
  };

  const handleLoanTypeChange = (e) => {
    const selectedTypeId = e.target.value;
    const selectedType = loanTypes.find(type => type.id === parseInt(selectedTypeId));
    
    if (selectedType) {
      setFormData({
        ...formData,
        loanTypeId: selectedTypeId,
        interestRate: selectedType.interest_rate
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.memberId) errors.memberId = 'Please select a member';
    if (!formData.amount || formData.amount <= 0) errors.amount = 'Please enter a valid amount';
    if (!formData.loanTypeId) errors.loanTypeId = 'Please select a loan type';
    if (!formData.startDate) errors.startDate = 'Start date is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePaymentForm = () => {
    const errors = {};
    
    const principalAmount = parseFloat(paymentData.principalAmount) || 0;
    const interestAmount = parseFloat(paymentData.interestAmount) || 0;
    const totalAmount = principalAmount + interestAmount;
    
    if (paymentData.paymentType === 'both' && totalAmount <= 0) {
      errors.amount = 'Please enter a valid payment amount';
    } else if (paymentData.paymentType === 'principal' && principalAmount <= 0) {
      errors.principalAmount = 'Please enter a valid principal amount';
    } else if (paymentData.paymentType === 'interest' && interestAmount <= 0) {
      errors.interestAmount = 'Please enter a valid interest amount';
    }
    
    if (currentLoan && principalAmount > currentLoan.balance) {
      errors.principalAmount = 'Principal payment cannot exceed the remaining balance';
    }
    
    if (!paymentData.date) {
      errors.date = 'Payment date is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      if (editMode && currentLoan) {
        // Verify that the OTP has been verified before allowing edits
        if (!otpService.isOperationVerified(otpData.otpToken)) {
          setSnackbar({
            open: true,
            message: 'OTP verification required before editing a loan',
            severity: 'error'
          });
          return;
        }
        
        const updatedLoan = {
          ...formData,
          memberId: parseInt(formData.memberId),
          interestRate: parseFloat(formData.interestRate),
          loanTypeId: parseInt(formData.loanTypeId),
          amount: parseFloat(formData.amount)
        };
        
        await api.updateLoan(currentLoan.id, updatedLoan);
        setSnackbar({
          open: true,
          message: 'Loan updated successfully',
          severity: 'success'
        });
      } else {
        const newLoan = {
          memberId: parseInt(formData.memberId),
          amount: parseFloat(formData.amount),
          interestRate: parseFloat(formData.interestRate),
          loanTypeId: parseInt(formData.loanTypeId),
          startDate: formData.startDate,
          endDate: formData.endDate || null,
          purpose: formData.purpose,
          dailyInterest: formData.dailyInterest,
          status: 'active'
        };
        
        const loanResponse = await api.addLoan(newLoan);
        
        // Get member phone number and send SMS notification
        try {
          const member = await api.getMember(newLoan.memberId);
          if (member && member.phone) {
            const smsResult = await smsService.sendLoanIssuedSMS(
              member.phone, 
              loanResponse.id || 'N/A', 
              newLoan.amount
            );
            
            console.log('SMS notification result:', smsResult);
          }
        } catch (smsError) {
          console.error('Error sending loan issuance SMS:', smsError);
        }
        
        setSnackbar({
          open: true,
          message: 'Loan added successfully',
          severity: 'success'
        });
      }
      
      fetchLoans();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving loan:", error);
      setSnackbar({
        open: true,
        message: 'Failed to save loan data',
        severity: 'error'
      });
    }
  };

  const handleAddPayment = async () => {
    if (!validatePaymentForm()) return;
    
    try {
      // Calculate accrued interest up to the payment date
      const interestToDate = calculateAccruedInterest(currentLoan);
      
      // Get amounts based on payment type
      const principalAmount = parseFloat(paymentData.principalAmount) || 0;
      const interestAmount = parseFloat(paymentData.interestAmount) || 0;
      
      // Prepare the payment record
      const newPayment = {
        date: paymentData.date,
        amount: principalAmount + interestAmount,
        note: paymentData.note,
        premium_amount: principalAmount,
        interest_amount: interestAmount
      };
      
      await api.addLoanPayment(currentLoan.id, newPayment);
      
      // Send SMS notification for payment
      try {
        // Get member details to get the phone number
        const member = await api.getMember(currentLoan.memberId);
        if (member && member.phone) {
          // Calculate new balance after payment
          const updatedBalance = currentLoan.balance - principalAmount;
          
          // Send the SMS
          const smsResult = await smsService.sendLoanPaymentSMS(
            member.phone,
            currentLoan.id,
            principalAmount + interestAmount,
            updatedBalance
          );
          
          console.log('Payment SMS notification result:', smsResult);
        }
      } catch (smsError) {
        console.error('Error sending payment SMS:', smsError);
      }
      
      setSnackbar({
        open: true,
        message: 'Payment recorded successfully',
        severity: 'success'
      });
      
      fetchLoans();
      handleClosePaymentDialog();
    } catch (error) {
      console.error("Error recording payment:", error);
      setSnackbar({
        open: true,
        message: 'Failed to record payment',
        severity: 'error'
      });
    }
  };

  const handleDeleteLoan = async (loanId) => {
    if (window.confirm('Are you sure you want to delete this loan?')) {
      try {
        await api.deleteLoan(loanId);
        
        setSnackbar({
          open: true,
          message: 'Loan deleted successfully',
          severity: 'success'
        });
        
        fetchLoans();
      } catch (error) {
        console.error("Error deleting loan:", error);
        setSnackbar({
          open: true,
          message: 'Failed to delete loan',
          severity: 'error'
        });
      }
    }
  };

  const calculateBalance = (loan) => {
    const totalPayments = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
    return loan.amount - totalPayments;
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const getStatusChipColor = (status) => {
    switch (status) {
      case 'active':
        return 'primary';
      case 'completed':
        return 'success';
      case 'defaulted':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatCurrency = (amount) => {
    return amount !== undefined && amount !== null ? `Rs. ${amount.toLocaleString()}` : 'Rs. 0';
  };

  const handleCloseOtpDialog = () => {
    setOpenOtpDialog(false);
    setOtpData({
      ...otpData,
      otpCode: '',
      error: ''
    });
  };

  const handleOtpInputChange = (e) => {
    setOtpData({
      ...otpData,
      otpCode: e.target.value,
      error: ''
    });
  };

  const handleVerifyOtp = async () => {
    if (!otpData.otpCode || otpData.otpCode.trim() === '') {
      setOtpData({
        ...otpData,
        error: 'Please enter the OTP code'
      });
      return;
    }

    try {
      setOtpData({
        ...otpData,
        isLoading: true
      });

      const result = await otpService.verifyOTP(otpData.otpToken, otpData.otpCode);

      if (result.success) {
        // OTP verified successfully, proceed to open edit dialog
        setOtpData({
          ...otpData,
          isLoading: false
        });
        
        handleCloseOtpDialog();
        setOpenDialog(true);
      } else {
        setOtpData({
          ...otpData,
          isLoading: false,
          error: result.error || 'Invalid OTP code'
        });
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setOtpData({
        ...otpData,
        isLoading: false,
        error: 'Failed to verify OTP'
      });
    }
  };

  return (
    <Box sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Loans Management (ණය කළමනාකරණය)
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('add')}
        >
          Add Loan (ණය එකතු කරන්න)
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 440 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Member (සාමාජික)</TableCell>
                    <TableCell>Amount (මුදල)</TableCell>
                    <TableCell>Date (දිනය)</TableCell>
                    <TableCell>Interest (පොලිය)</TableCell>
                    <TableCell>Balance (ශේෂය)</TableCell>
                    <TableCell>Status (තත්වය)</TableCell>
                    <TableCell align="right">Actions (ක්‍රියා)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loans
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((loan) => (
                      <TableRow key={loan.id} hover>
                        <TableCell>{loan.memberName}</TableCell>
                        <TableCell>
                          <Typography variant="body1">{formatCurrency(loan.amount)}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {loan.interestRate}% {loan.dailyInterest ? '(Daily)' : '(Monthly)'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(loan.startDate).toLocaleDateString()} - {new Date(loan.endDate).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatCurrency(calculateAccruedInterest(loan))}</TableCell>
                        <TableCell>{formatCurrency(loan.balance)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={loan.status.charAt(0).toUpperCase() + loan.status.slice(1)} 
                            color={getStatusChipColor(loan.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton 
                            color="secondary" 
                            onClick={() => handleOpenPaymentDialog(loan)}
                            size="small"
                            disabled={loan.status === 'completed'}
                            title="Record Payment"
                          >
                            <ReceiptIcon />
                          </IconButton>
                          <IconButton 
                            color="primary" 
                            onClick={() => handleOpenDialog('edit', loan)}
                            size="small"
                            title="Edit Loan"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            color="error" 
                            onClick={() => handleDeleteLoan(loan.id)}
                            size="small"
                            title="Delete Loan"
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
              count={loans.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>
        </>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit Loan (ණය සංස්කරණය කරන්න)' : 'Add New Loan (නව ණය එකතු කරන්න)'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                name="memberId"
                label="Member (සාමාජික)"
                value={formData.memberId}
                onChange={handleInputChange}
                fullWidth
                required
                error={!!formErrors.memberId}
                helperText={formErrors.memberId}
              >
                {members.map((member) => (
                  <MenuItem key={member.id} value={member.id}>
                    {member.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="amount"
                label="Loan Amount (ණය මුදල)"
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
            <Grid item xs={12} sm={6}>
              <TextField
                name="startDate"
                label="Start Date (ආරම්භක දිනය)"
                type="date"
                value={formData.startDate}
                onChange={handleInputChange}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                error={!!formErrors.startDate}
                helperText={formErrors.startDate}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="endDate"
                label="Expected End Date (Optional)"
                type="date"
                value={formData.endDate}
                onChange={handleInputChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
                helperText="Repayment is flexible. Unpaid interest after 3 months will be deducted from dividends."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Loan Type"
                name="loanTypeId"
                value={formData.loanTypeId}
                onChange={handleLoanTypeChange}
                error={!!formErrors.loanTypeId}
                helperText={formErrors.loanTypeId}
                required
                disabled={editMode}
              >
                {loanTypes.length === 0 ? (
                  <MenuItem value="" disabled>
                    No loan types available
                  </MenuItem>
                ) : (
                  loanTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name} ({type.interest_rate}%)
                    </MenuItem>
                  ))
                )}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Interest Rate"
                name="interestRate"
                type="number"
                value={formData.interestRate}
                onChange={handleInputChange}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  readOnly: !!formData.loanTypeId,
                }}
                disabled={!!formData.loanTypeId}
                helperText={formData.loanTypeId ? "Set by loan type" : ""}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.dailyInterest}
                    onChange={handleSwitchChange}
                    name="dailyInterest"
                    color="primary"
                  />
                }
                label="Calculate Daily Interest (දෛනික පොලිය ගණනය කරන්න)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="purpose"
                label="Purpose (අරමුණ)"
                value={formData.purpose}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                name="status"
                label="Status (තත්වය)"
                value={formData.status}
                onChange={handleInputChange}
                fullWidth
              >
                <MenuItem value="active">Active (ක්‍රියාකාරී)</MenuItem>
                <MenuItem value="completed">Completed (සම්පූර්ණයි)</MenuItem>
                <MenuItem value="defaulted">Defaulted (පැහැර හැර ඇත)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Dividend & Loan Policy:</Typography>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>Loans don't have fixed end dates - members can repay when able</li>
                  <li>If interest/installments remain unpaid for 3 months, the amount will be deducted from quarterly dividends</li>
                  <li>Quarterly dividends calculation: Member's assets at end of quarter + Organization's assets → Dividend distribution</li>
                </ul>
              </Alert>
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

      <Dialog open={openPaymentDialog} onClose={handleClosePaymentDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add Payment (ගෙවීම් එකතු කරන්න)
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="body1">
                Loan for: (ණය ලබාගත්තේ:) {currentLoan ? members.find(m => m.id === currentLoan.memberId)?.name : ''}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Balance: (ශේෂය:) {currentLoan ? formatCurrency(currentLoan.balance) : ''}
              </Typography>
              {currentLoan && (
                <>
                  <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                    Accrued Interest: {formatCurrency(parseFloat(paymentData.interestAmount || 0))}
                  </Typography>
                </>
              )}
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Payment Type (ගෙවීම් වර්ගය):
              </Typography>
              <Grid container spacing={1}>
                <Grid item>
                  <FormControlLabel
                    control={
                      <Radio
                        checked={paymentData.paymentType === 'both'}
                        onChange={(e) => setPaymentData({...paymentData, paymentType: 'both'})}
                        value="both"
                        name="paymentType"
                      />
                    }
                    label="Both Principal & Interest"
                  />
                </Grid>
                <Grid item>
                  <FormControlLabel
                    control={
                      <Radio
                        checked={paymentData.paymentType === 'principal'}
                        onChange={(e) => setPaymentData({...paymentData, paymentType: 'principal', interestAmount: '0'})}
                        value="principal"
                        name="paymentType"
                      />
                    }
                    label="Principal Only"
                  />
                </Grid>
                <Grid item>
                  <FormControlLabel
                    control={
                      <Radio
                        checked={paymentData.paymentType === 'interest'}
                        onChange={(e) => setPaymentData({...paymentData, paymentType: 'interest', principalAmount: '0'})}
                        value="interest"
                        name="paymentType"
                      />
                    }
                    label="Interest Only"
                  />
                </Grid>
              </Grid>
            </Grid>
            
            {(paymentData.paymentType === 'both' || paymentData.paymentType === 'principal') && (
              <Grid item xs={12}>
                <TextField
                  name="principalAmount"
                  label="Principal Amount (මුල් මුදල)"
                  type="number"
                  value={paymentData.principalAmount}
                  onChange={handlePaymentInputChange}
                  fullWidth
                  required
                  error={!!formErrors.principalAmount}
                  helperText={formErrors.principalAmount}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                    inputProps: { min: 0 }
                  }}
                />
              </Grid>
            )}
            
            {(paymentData.paymentType === 'both' || paymentData.paymentType === 'interest') && (
              <Grid item xs={12}>
                <TextField
                  name="interestAmount"
                  label="Interest Amount (පොලී මුදල)"
                  type="number"
                  value={paymentData.interestAmount}
                  onChange={handlePaymentInputChange}
                  fullWidth
                  required
                  error={!!formErrors.interestAmount}
                  helperText={formErrors.interestAmount}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                    inputProps: { min: 0 }
                  }}
                />
              </Grid>
            )}
            
            {paymentData.paymentType === 'both' && (
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Total Payment: {formatCurrency(parseFloat(paymentData.principalAmount || 0) + parseFloat(paymentData.interestAmount || 0))}
                </Typography>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <TextField
                name="date"
                label="Payment Date (ගෙවීම් දිනය)"
                type="date"
                value={paymentData.date}
                onChange={handlePaymentInputChange}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                error={!!formErrors.date}
                helperText={formErrors.date}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="note"
                label="Note (සටහන)"
                value={paymentData.note}
                onChange={handlePaymentInputChange}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentDialog} color="primary">
            Cancel (අවලංගු කරන්න)
          </Button>
          <Button onClick={handleAddPayment} color="primary" variant="contained">
            Add Payment (ගෙවීම එකතු කරන්න)
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* OTP Verification Dialog */}
      <Dialog open={openOtpDialog} onClose={handleCloseOtpDialog} maxWidth="xs" fullWidth>
        <DialogTitle>
          Verify OTP (තහවුරු කිරීමේ කේතය)
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body1" gutterBottom>
              An OTP code has been sent to the member's phone for loan edit verification.
            </Typography>
            <Typography variant="body2" gutterBottom sx={{ mb: 2 }}>
              Please enter the 6-digit code below to proceed with editing the loan.
            </Typography>
            <TextField
              label="OTP Code"
              variant="outlined"
              fullWidth
              value={otpData.otpCode}
              onChange={handleOtpInputChange}
              error={!!otpData.error}
              helperText={otpData.error}
              type="number"
              autoFocus
              inputProps={{ 
                maxLength: 6,
                pattern: '[0-9]*',
                inputMode: 'numeric'
              }}
              placeholder="Enter 6-digit code"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOtpDialog} color="primary">
            Cancel (අවලංගු කරන්න)
          </Button>
          <Button 
            onClick={handleVerifyOtp} 
            color="primary" 
            variant="contained"
            disabled={otpData.isLoading}
          >
            {otpData.isLoading ? 'Verifying...' : 'Verify (තහවුරු කරන්න)'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Loans;