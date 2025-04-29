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
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Save as SaveIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Edit as EditIcon,
  Business as BusinessIcon,
  FolderOpen as FolderOpenIcon,
  Lock as LockIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Sms as SmsIcon
} from '@mui/icons-material';
import api from '../../services/api';
import ChangePassword from './ChangePassword';
import SMSSettings from './SMSSettings';
import BackupRestore from './BackupRestore';

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
    membershipFee: ''
  });
  
  const [loanTypes, setLoanTypes] = useState([]);
  const [openLoanTypeDialog, setOpenLoanTypeDialog] = useState(false);
  const [newLoanType, setNewLoanType] = useState({
    name: '',
    interestRate: ''
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
    fetchLoanTypes();
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
        membershipFee: settingsObj.membershipFee || '1000'
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

  const fetchLoanTypes = async () => {
    try {
      // Implementation will depend on your API
      // For now, we'll just use some dummy data
      const response = await api.getLoanTypes();
      setLoanTypes(response || []);
    } catch (error) {
      console.error("Error fetching loan types:", error);
      setSnackbar({
        open: true,
        message: 'Failed to load loan types: ' + error.message,
        severity: 'error'
      });
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

  const handleNewLoanTypeChange = (e) => {
    const { name, value } = e.target;
    setNewLoanType({
      ...newLoanType,
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
        { name: 'membershipFee', value: orgSettings.membershipFee }
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

  const handleOpenLoanTypeDialog = () => {
    setNewLoanType({ name: '', interestRate: '' });
    setOpenLoanTypeDialog(true);
  };

  const handleCloseLoanTypeDialog = () => {
    setOpenLoanTypeDialog(false);
  };

  const handleAddLoanType = async () => {
    if (!newLoanType.name || !newLoanType.interestRate) {
      setSnackbar({
        open: true,
        message: 'Please fill in all fields',
        severity: 'warning'
      });
      return;
    }

    try {
      // Implementation will depend on your API
      const addedLoanType = await api.addLoanType(newLoanType);
      setLoanTypes([...loanTypes, addedLoanType]);
      handleCloseLoanTypeDialog();
      setSnackbar({
        open: true,
        message: 'Loan type added successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error("Error adding loan type:", error);
      setSnackbar({
        open: true,
        message: 'Failed to add loan type: ' + error.message,
        severity: 'error'
      });
    }
  };

  const handleDeleteLoanType = async (id) => {
    try {
      // Implementation will depend on your API
      await api.deleteLoanType(id);
      setLoanTypes(loanTypes.filter(loanType => loanType.id !== id));
      setSnackbar({
        open: true,
        message: 'Loan type deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error("Error deleting loan type:", error);
      setSnackbar({
        open: true,
        message: 'Failed to delete loan type: ' + error.message,
        severity: 'error'
      });
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

  const renderFinancialSettings = () => {
    return (
      <Box>
        <Alert severity="info" sx={{ mb: 3 }}>
          These settings affect how calculations are performed throughout the application.
        </Alert>
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Default Loan Interest Rate"
              name="defaultInterestRate"
              value={orgSettings.defaultInterestRate}
              onChange={handleOrgInputChange}
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              disabled={!editMode}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              label="Default Membership Fee"
              name="membershipFee"
              value={orgSettings.membershipFee}
              onChange={handleOrgInputChange}
              fullWidth
              InputProps={{
                startAdornment: <InputAdornment position="start">Rs.</InputAdornment>,
              }}
              disabled={!editMode}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ mt: 4, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Loan Types</Typography>
              {editMode && (
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<AddIcon />}
                  onClick={handleOpenLoanTypeDialog}
                >
                  Add Loan Type
                </Button>
              )}
            </Box>
            
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Interest Rate (%)</TableCell>
                    {editMode && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loanTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={editMode ? 3 : 2} align="center">
                        No loan types defined
                      </TableCell>
                    </TableRow>
                  ) : (
                    loanTypes.map((loanType) => (
                      <TableRow key={loanType.id}>
                        <TableCell>{loanType.name}</TableCell>
                        <TableCell>{loanType.interestRate}%</TableCell>
                        {editMode && (
                          <TableCell align="right">
                            <IconButton 
                              color="error" 
                              size="small"
                              onClick={() => handleDeleteLoanType(loanType.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
        
        {/* Dialog for adding new loan type */}
        <Dialog open={openLoanTypeDialog} onClose={handleCloseLoanTypeDialog}>
          <DialogTitle>Add New Loan Type</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  label="Loan Type Name"
                  name="name"
                  value={newLoanType.name}
                  onChange={handleNewLoanTypeChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Interest Rate"
                  name="interestRate"
                  value={newLoanType.interestRate}
                  onChange={handleNewLoanTypeChange}
                  fullWidth
                  required
                  type="number"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseLoanTypeDialog}>Cancel</Button>
            <Button onClick={handleAddLoanType} variant="contained" color="primary">
              Add
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          aria-label="settings tabs"
        >
          <Tab icon={<BusinessIcon />} label="Organization" />
          <Tab icon={<SaveIcon />} label="Financial" />
          <Tab icon={<BackupIcon />} label="Backup & Restore" />
          <Tab icon={<LockIcon />} label="Security" />
          <Tab icon={<SmsIcon />} label="SMS Notifications" />
        </Tabs>
      </Paper>
      
      {/* Organization Tab Panel */}
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
          {renderFinancialSettings()}
        </>
      )}
      
      {/* Financial Settings Tab Panel */}
      {tabValue === 1 && (
        <>
          <Typography variant="h6" gutterBottom>Financial Settings</Typography>
          {renderFinancialSettings()}
        </>
      )}
      
      {/* Backup & Restore Tab Panel */}
      {tabValue === 2 && <BackupRestore />}
      
      {/* Security Tab Panel */}
      {tabValue === 3 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Account Security Settings
          </Typography>
          
          <ChangePassword />
        </Box>
      )}
      
      {/* SMS Notifications Tab Panel */}
      {tabValue === 4 && <SMSSettings />}
      
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

export default Settings; 