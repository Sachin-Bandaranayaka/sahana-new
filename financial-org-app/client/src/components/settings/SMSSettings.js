import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Switch,
  FormControlLabel,
  Grid,
  Snackbar,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import api from '../../services/api';

const SMSSettings = () => {
  const [settings, setSettings] = useState({
    apiKey: '',
    userId: '',
    enabled: false,
    senderId: 'FINANCIALORG'
  });
  
  const [loading, setLoading] = useState(true);
  const [testPhone, setTestPhone] = useState('');
  const [testingSMS, setTestingSMS] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSMSSettings();
      if (data) {
        setSettings(data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching SMS settings:", error);
      setLoading(false);
      setSnackbar({
        open: true,
        message: 'Failed to load SMS settings',
        severity: 'error'
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings({
      ...settings,
      [name]: value
    });
  };

  const handleSwitchChange = (e) => {
    setSettings({
      ...settings,
      enabled: e.target.checked
    });
  };

  const handleTestPhoneChange = (e) => {
    setTestPhone(e.target.value);
  };

  const handleSaveSettings = async () => {
    try {
      const result = await api.updateSMSSettings(settings);
      if (result.success) {
        setSnackbar({
          open: true,
          message: 'SMS settings saved successfully',
          severity: 'success'
        });
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error("Error saving SMS settings:", error);
      setSnackbar({
        open: true,
        message: 'Failed to save SMS settings: ' + error.message,
        severity: 'error'
      });
    }
  };

  const handleTestSMS = async () => {
    if (!testPhone) {
      setSnackbar({
        open: true,
        message: 'Please enter a phone number for testing',
        severity: 'warning'
      });
      return;
    }

    setTestingSMS(true);
    try {
      const result = await api.sendSMS(testPhone, "This is a test message from the Financial Organization System");
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: 'Test SMS sent successfully',
          severity: 'success'
        });
      } else {
        throw new Error(result.error || 'Failed to send test SMS');
      }
    } catch (error) {
      console.error("Error sending test SMS:", error);
      setSnackbar({
        open: true,
        message: 'Failed to send test SMS: ' + error.message,
        severity: 'error'
      });
    } finally {
      setTestingSMS(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        SMS Notification Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure notify.lk API settings for SMS notifications. 
        When enabled, SMS notifications will be sent for loan issuance, loan payments, and member registration.
      </Typography>
      
      <Paper sx={{ p: 3, mt: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch 
                  checked={settings.enabled} 
                  onChange={handleSwitchChange}
                  color="primary"
                />
              }
              label="Enable SMS Notifications"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Notify.lk User ID"
              name="userId"
              value={settings.userId}
              onChange={handleInputChange}
              disabled={!settings.enabled}
              helperText="Your notify.lk account User ID"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Notify.lk API Key"
              name="apiKey"
              value={settings.apiKey}
              onChange={handleInputChange}
              disabled={!settings.enabled}
              helperText="API Key from your notify.lk account"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Sender ID"
              name="senderId"
              value={settings.senderId}
              onChange={handleInputChange}
              disabled={!settings.enabled}
              helperText="Sender ID registered with notify.lk (default: FINANCIALORG)"
            />
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            onClick={handleSaveSettings}
            disabled={!settings.enabled && !settings.apiKey && !settings.userId}
          >
            Save Settings
          </Button>
        </Box>
      </Paper>
      
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Test SMS Notification
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Test Phone Number"
              value={testPhone}
              onChange={handleTestPhoneChange}
              placeholder="e.g., 077XXXXXXX"
              helperText="Enter a valid phone number to test SMS delivery"
              disabled={!settings.enabled || !settings.apiKey || !settings.userId}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Button
              variant="outlined"
              onClick={handleTestSMS}
              disabled={!settings.enabled || !settings.apiKey || !settings.userId || testingSMS}
              sx={{ mt: 1 }}
            >
              {testingSMS ? <CircularProgress size={24} /> : 'Send Test SMS'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          variant="filled" 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SMSSettings; 