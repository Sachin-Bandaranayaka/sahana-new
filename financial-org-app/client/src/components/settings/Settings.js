import React, { useState } from 'react';
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
  InputAdornment
} from '@mui/material';
import {
  Save as SaveIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Edit as EditIcon,
  Business as BusinessIcon
} from '@mui/icons-material';

const Settings = () => {
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [orgSettings, setOrgSettings] = useState({
    name: 'Sahana Welfare Organization',
    address: '123 Main Street, Colombo 03, Sri Lanka',
    phone: '011-2345678',
    email: 'info@sahanawelfare.org',
    regNumber: 'REG/2022/WEL/001',
    foundedYear: '2015',
    taxId: 'TAX123456789',
    quarterEndMonths: 'March, June, September, December'
  });
  
  const [backupPath, setBackupPath] = useState('C:/Backups/SahanaWelfare');
  const [restorePath, setRestorePath] = useState('');
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

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

  const handleSaveSettings = () => {
    // In production, this would save to the database
    setEditMode(false);
    alert('Settings saved successfully!');
  };

  const handleBackup = () => {
    // In production, this would trigger a database backup
    setTimeout(() => {
      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 3000);
    }, 1000);
  };

  const handleRestore = () => {
    // In production, this would restore from a backup file
    if (!restorePath) {
      alert('Please select a backup file to restore from');
      return;
    }
    
    setTimeout(() => {
      setRestoreSuccess(true);
      setTimeout(() => setRestoreSuccess(false), 3000);
    }, 1000);
  };

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
                >
                  {editMode ? "Save Changes" : "Edit Settings"}
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
                    disabled={!editMode}
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
                    disabled={!editMode}
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
                    disabled={!editMode}
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
                    disabled={!editMode}
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
                    disabled={!editMode}
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
                    disabled={!editMode}
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
                    disabled={!editMode}
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
                    disabled={!editMode}
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
                    value="10"
                    disabled={!editMode}
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
                    value="5000"
                    disabled={!editMode}
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
                    value="1000"
                    disabled={!editMode}
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
                      label="Backup Location"
                      value={backupPath}
                      onChange={(e) => setBackupPath(e.target.value)}
                      margin="normal"
                      helperText="Specify the folder where backup files will be saved"
                    />
                    
                    {backupSuccess && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        Backup created successfully at {new Date().toLocaleString()}
                      </Alert>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      startIcon={<BackupIcon />}
                      onClick={handleBackup}
                    >
                      Create Backup
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
                    />
                    
                    {restoreSuccess && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        Data restored successfully at {new Date().toLocaleString()}
                      </Alert>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button
                      fullWidth
                      variant="contained"
                      color="secondary"
                      startIcon={<RestoreIcon />}
                      onClick={handleRestore}
                    >
                      Restore From Backup
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default Settings; 