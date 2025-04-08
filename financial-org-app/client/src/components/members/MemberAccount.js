import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  TablePagination,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip
} from '@mui/material';
import api from '../../services/api';

const MemberAccount = () => {
  const { memberId } = useParams();
  const [member, setMember] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchMemberData();
  }, [memberId]);

  const fetchMemberData = async () => {
    try {
      console.log('Fetching member data for ID:', memberId);
      
      const memberData = await api.getMember(memberId);
      console.log('Member data fetched:', memberData);
      
      const transactionsData = await api.getMemberTransactions(memberId);
      console.log('Transactions data fetched:', transactionsData);
      
      if (!memberData) {
        console.error('Member data not found for ID:', memberId);
        setLoading(false);
        return;
      }
      
      setMember(memberData);
      setTransactions(transactionsData || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching member data:', error);
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const calculateTotalDividends = () => {
    return transactions
      .filter(t => t.type === 'dividend')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const calculateTotalFees = () => {
    return transactions
      .filter(t => t.type === 'member_fee')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const calculateTotalLoans = () => {
    return transactions
      .filter(t => t.type === 'loan')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const calculateTotalLoanDeductions = () => {
    return transactions
      .filter(t => t.type === 'loan_deduction')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!member) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Member not found
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Member Account
      </Typography>

      {/* Member Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="h6">{member.name}</Typography>
              <Typography color="textSecondary" gutterBottom>Member ID: {member.member_id}</Typography>
              <Typography color="textSecondary">
                <Box component="span" sx={{ display: 'inline-block', minWidth: 120 }}>Phone:</Box>
                {member.phone}
              </Typography>
              {member.email && (
                <Typography color="textSecondary">
                  <Box component="span" sx={{ display: 'inline-block', minWidth: 120 }}>Email:</Box>
                  {member.email}
                </Typography>
              )}
              <Typography color="textSecondary">
                <Box component="span" sx={{ display: 'inline-block', minWidth: 120 }}>Join Date:</Box>
                {new Date(member.joinDate).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography color="textSecondary">
                <Box component="span" sx={{ display: 'inline-block', minWidth: 120 }}>Address:</Box>
                {member.address}
              </Typography>
              <Typography color="textSecondary">
                <Box component="span" sx={{ display: 'inline-block', minWidth: 120 }}>Shares:</Box>
                {member.shares}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={member.status}
                  color={member.status === 'active' ? 'success' : 'error'}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Account Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Dividends
              </Typography>
              <Typography variant="h5">
                Rs. {calculateTotalDividends().toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Member Fees
              </Typography>
              <Typography variant="h5">
                Rs. {calculateTotalFees().toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Loans
              </Typography>
              <Typography variant="h5">
                Rs. {calculateTotalLoans().toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Loan Deductions
              </Typography>
              <Typography variant="h5">
                Rs. {calculateTotalLoanDeductions().toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Transactions Table */}
      <Typography variant="h6" gutterBottom>
        Transaction History
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {new Date(transaction.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={transaction.type.replace('_', ' ').toUpperCase()}
                      color={
                        transaction.type === 'dividend'
                          ? 'success'
                          : transaction.type === 'loan'
                          ? 'warning'
                          : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell align="right">
                    Rs. {transaction.amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={transactions.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Box>
  );
};

export default MemberAccount; 