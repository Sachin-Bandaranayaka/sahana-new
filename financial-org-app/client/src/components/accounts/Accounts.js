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
  Chip
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
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const formatCurrency = (amount) => {
    return `Rs. ${amount.toLocaleString()}`;
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
                      onClick={() => alert('Add Account feature would open here')}
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
                            <TableCell>{new Date(account.lastUpdated).toLocaleDateString()}</TableCell>
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
                                onClick={() => alert(`Add transaction to account ${account.id}`)}
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
                      onClick={() => alert('Add Transaction feature would open here')}
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
    </Box>
  );
};

export default Accounts; 