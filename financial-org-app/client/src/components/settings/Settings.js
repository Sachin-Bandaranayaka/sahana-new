import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Grid,
  Divider,
  Card,
  CardContent,
  CardActions,
  Alert,
  InputAdornment,
  CircularProgress,
  Snackbar
} from '@mui/material';
import {
  Save as SaveIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Edit as EditIcon,
  Business as BusinessIcon,
  FolderOpen as FolderOpenIcon
} from '@mui/icons-material';
import api from '../../services/api';

const Settings = () => {
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orgSettings, setOrgSettings] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    regNumber: '',
    foundedYear: '',
    taxId: '',
    quarterEndMonths: '',
    defaultInterestRate: '',
    membershipFee: '',
    shareValue: ''
  });
  
  const [backupPath, setBackupPath] = useState('');
  const [restorePath, setRestorePath] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Load settings when component mounts
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const settings = await api.getSettings();
      
      // Convert array of settings objects to a single settings object
      const settingsObj = settings.reduce((acc, setting) => {
        acc[setting.name] = setting.value;
        return acc;
      }, {});
      
      setOrgSettings({
        name: settingsObj.orgName || '',
        address: settingsObj.orgAddress || '',
        phone: settingsObj.orgPhone || '',
        email: settingsObj.orgEmail || '',
        regNumber: settingsObj.registrationNumber || '',
        foundedYear: settingsObj.foundedYear || '',
        taxId: settingsObj.taxId || '',
        quarterEndMonths: settingsObj.quarterEndMonths || '',
        defaultInterestRate: settingsObj.defaultLoanInterest || '10',
        membershipFee: settingsObj.membershipFee || '1000',
        shareValue: settingsObj.shareValue || '1000'
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching settings:", error);
      setSnackbar({
        open: true,
        message: 'Failed to load settings: ' + error.message,
        severity: 'error'
      });
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleOrgInputChange = (e) => {
    const { name, value } = e.target;
    setOrgSettings({
      ...orgSettings,
      [name]: value
    });
  };

  const handleSaveSettings = async () => {
    try {
      setIsProcessing(true);
      
      // Convert settings object to array of settings objects for database
      const settingsToUpdate = [
        { name: 'orgName', value: orgSettings.name },
        { name: 'orgAddress', value: orgSettings.address },
        { name: 'orgPhone', value: orgSettings.phone },
        { name: 'orgEmail', value: orgSettings.email },
        { name: 'registrationNumber', value: orgSettings.regNumber },
        { name: 'foundedYear', value: orgSettings.foundedYear },
        { name: 'taxId', value: orgSettings.taxId },
        { name: 'quarterEndMonths', value: orgSettings.quarterEndMonths },
        { name: 'defaultLoanInterest', value: orgSettings.defaultInterestRate },
        { name: 'membershipFee', value: orgSettings.membershipFee },
        { name: 'shareValue', value: orgSettings.shareValue }
      ];
      
      // Update each setting
      for (const setting of settingsToUpdate) {
        await api.updateSetting(setting);
      }
      
      setEditMode(false);
      setSnackbar({
        open: true,
        message: 'Settings saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      setSnackbar({
        open: true,
        message: 'Failed to save settings: ' + error.message,
        severity: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackup = async () => {
    if (!backupPath) {
      setSnackbar({
        open: true,
        message: 'Please enter a backup file path',
        severity: 'warning'
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Check if the path ends with a file extension
      // If not, assume it's a directory and append a filename
      let finalPath = backupPath;
      if (!finalPath.endsWith('.json')) {
        // Check if there's a trailing slash
        if (!finalPath.endsWith('/') && !finalPath.endsWith('\\')) {
          finalPath += '/';
        }
        // Add a default filename with date
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        finalPath += `sahana_backup_${date}.json`;
      }
      
      const result = await api.backupData(finalPath);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: `Backup created successfully at: ${finalPath}`,
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: result.message || 'Backup failed',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error("Error during backup:", error);
      setSnackbar({
        open: true,
        message: 'Failed to create backup: ' + error.message,
        severity: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    if (!restorePath) {
      setSnackbar({
        open: true,
        message: 'Please enter a backup file path to restore from',
        severity: 'warning'
      });
      return;
    }
    
    // Confirm restore operation
    if (!window.confirm('Are you sure you want to restore from this backup? This will overwrite all current data.')) {
      return;
    }
    
    try {
      setIsProcessing(true);
      const result = await api.restoreData(restorePath);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: result.message || 'Data restored successfully',
          severity: 'success'
        });
        
        // Refresh settings to show updated values after restore
        fetchSettings();
      } else {
        setSnackbar({
          open: true,
          message: result.message || 'Restore failed',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error("Error during restore:", error);
      setSnackbar({
        open: true,
        message: 'Failed to restore data: ' + error.message,
        severity: 'error'
      });
    } finally {
      setIsProcessing(false);
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Settings</Typography>
      
      <Paper sx={{ mb: 4 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
          <Tab label="Organization Settings" />
          <Tab label="Backup & Restore" />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {/* Organization Settings Tab */}
          {tabValue === 0 && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">
                  <BusinessIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Organization Information
                </Typography>
                <Button
                  variant={editMode ? "contained" : "outlined"}
                  color={editMode ? "success" : "primary"}
                  startIcon={editMode ? <SaveIcon /> : <EditIcon />}
                  onClick={editMode ? handleSaveSettings : () => setEditMode(true)}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : editMode ? "Save Changes" : "Edit Settings"}
                </Button>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Organization Name"
                    name="name"
                    value={orgSettings.name}
                    onChange={handleOrgInputChange}
                    disabled={!editMode || isProcessing}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Registration Number"
                    name="regNumber"
                    value={orgSettings.regNumber}
                    onChange={handleOrgInputChange}
                    disabled={!editMode || isProcessing}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    name="phone"
                    value={orgSettings.phone}
                    onChange={handleOrgInputChange}
                    disabled={!editMode || isProcessing}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    value={orgSettings.email}
                    onChange={handleOrgInputChange}
                    disabled={!editMode || isProcessing}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address"
                    name="address"
                    value={orgSettings.address}
                    onChange={handleOrgInputChange}
                    disabled={!editMode || isProcessing}
                    multiline
                    rows={2}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Year Founded"
                    name="foundedYear"
                    value={orgSettings.foundedYear}
                    onChange={handleOrgInputChange}
                    disabled={!editMode || isProcessing}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Tax ID"
                    name="taxId"
                    value={orgSettings.taxId}
                    onChange={handleOrgInputChange}
                    disabled={!editMode || isProcessing}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Quarter End Months"
                    name="quarterEndMonths"
                    value={orgSettings.quarterEndMonths}
                    onChange={handleOrgInputChange}
                    disabled={!editMode || isProcessing}
                    margin="normal"
                    helperText="Comma separated list of months"
                  />
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 4 }} />
              
              <Typography variant="h6" gutterBottom>Financial Settings</Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                These settings affect how calculations are performed throughout the application.
              </Alert>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Default Loan Interest Rate"
                    name="defaultInterestRate"
                    value={orgSettings.defaultInterestRate}
                    onChange={handleOrgInputChange}
                    disabled={!editMode || isProcessing}
                    margin="normal"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Default Membership Fee"
                    name="membershipFee"
                    value={orgSettings.membershipFee}
                    onChange={handleOrgInputChange}
                    disabled={!editMode || isProcessing}
                    margin="normal"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Default Share Value"
                    name="shareValue"
                    value={orgSettings.shareValue}
                    onChange={handleOrgInputChange}
                    disabled={!editMode || isProcessing}
                    margin="normal"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
                    }}
                  />
                </Grid>
              </Grid>
            </>
          )}
          
          {/* Backup & Restore Tab */}
          {tabValue === 1 && (
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <BackupIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Backup Data
                    </Typography>
                    <Typography variant="body2" paragraph color="text.secondary">
                      Create a backup of all your organization data. 
                      This includes members, transactions, loans, and settings.
                    </Typography>
                    
                    <TextField
                      fullWidth
                      label="Backup File Path"
                      value={backupPath}
                      onChange={(e) => setBackupPath(e.target.value)}
                      margin="normal"
                      helperText="Enter a folder path to create a date-stamped backup file, or a complete path ending with .json"
                      disabled={isProcessing}
                      placeholder="C:/Users/YourName/Documents/Backups"
                    />
                  </CardContent>
                  <CardActions>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      startIcon={isProcessing ? <CircularProgress size={24} /> : <BackupIcon />}
                      onClick={handleBackup}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Processing...' : 'Create Backup'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <RestoreIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Restore Data
                    </Typography>
                    <Typography variant="body2" paragraph color="text.secondary">
                      Restore your organization data from a previous backup.
                      This will replace all current data with the backup data.
                    </Typography>
                    
                    <TextField
                      fullWidth
                      label="Backup File Path"
                      value={restorePath}
                      onChange={(e) => setRestorePath(e.target.value)}
                      margin="normal"
                      helperText="Enter the full path to the backup file"
                      disabled={isProcessing}
                    />
                  </CardContent>
                  <CardActions>
                    <Button
                      fullWidth
                      variant="contained"
                      color="secondary"
                      startIcon={isProcessing ? <CircularProgress size={24} /> : <RestoreIcon />}
                      onClick={handleRestore}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Processing...' : 'Restore From Backup'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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

export default Settings; 