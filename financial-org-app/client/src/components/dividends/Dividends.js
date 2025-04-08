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
  Divider
} from '@mui/material';
import { SavingsOutlined, CalculateOutlined } from '@mui/icons-material';
import api from '../../services/api';

const Dividends = () => {
  const [loading, setLoading] = useState(true);
  const [dividendData, setDividendData] = useState({
    totalShares: 0,
    totalDividends: 0,
    quarterlyProfit: 0,
    dividendRate: 0,
    dividendEntries: []
  });

  useEffect(() => {
    fetchDividendData();
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
    }
  };

  const formatCurrency = (amount) => {
    return `Rs. ${amount.toLocaleString()}`;
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
              onClick={() => alert('Add Dividend Entry feature would open here')}
            >
              Add Dividend Entry
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<CalculateOutlined />}
              onClick={() => alert('Calculate Quarterly Profits feature would open here')}
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
                  {dividendData.dividendEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell>{formatCurrency(entry.totalAmount)}</TableCell>
                      <TableCell>{entry.shareAmount}</TableCell>
                      <TableCell>{formatCurrency(entry.perShareAmount)}</TableCell>
                    </TableRow>
                  ))}
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
        </>
      )}
    </Box>
  );
};

export default Dividends; 