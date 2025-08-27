import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import { Construction } from '@mui/icons-material';

const Messages = () => {
  const [loading, setLoading] = useState(false);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Messages (පණිවුඩ)</Typography>
      </Box>

      <Paper sx={{ p: 3, textAlign: 'center' }}>
        {loading ? (
          <CircularProgress />
        ) : (
          <>
            <Construction sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Messages Feature Coming Soon
            </Typography>
            <Alert severity="info" sx={{ mb: 2, justifyContent: 'center' }}>
              We're currently working on implementing the messaging functionality.
            </Alert>
            <Typography variant="body1" color="text.secondary">
              This feature will allow you to send SMS messages to customers with 
              payment reminders, account updates, and other important notifications.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Check back later for updates!
            </Typography>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default Messages;