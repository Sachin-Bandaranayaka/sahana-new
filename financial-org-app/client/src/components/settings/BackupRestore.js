import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  LinearProgress,
  Paper,
  Switch,
  TextField,
  Typography,
  Alert,
  Snackbar
} from '@mui/material';
import BackupIcon from '@mui/icons-material/Backup';
import RestoreIcon from '@mui/icons-material/Restore';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SaveIcon from '@mui/icons-material/Save';
import api from '../../services/api';

const BackupRestore = () => {
  const [loading, setLoading] = useState(false);
  const [backupPath, setBackupPath] = useState('');
  const [restorePath, setRestorePath] = useState('');
  const [backupResult, setBackupResult] = useState(null);
  const [restoreResult, setRestoreResult] = useState(null);
  const [backupProgress, setBackupProgress] = useState(0);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState('weekly');
  const [backupTime, setBackupTime] = useState('00:00');
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [settings, setSettings] = useState({
    auto_backup_enabled: false,
    auto_backup_frequency: 'weekly',
    auto_backup_time: '00:00',
    auto_backup_path: ''
  });
  const [nextBackup, setNextBackup] = useState(null);
  const [loadingNextBackup, setLoadingNextBackup] = useState(false);

  React.useEffect(() => {
    // Load backup settings
    const loadSettings = async () => {
      try {
        const allSettings = await api.getSettings();
        
        // Extract backup settings
        const backupSettings = {
          auto_backup_enabled: allSettings.find(s => s.name === 'auto_backup_enabled')?.value === 'true',
          auto_backup_frequency: allSettings.find(s => s.name === 'auto_backup_frequency')?.value || 'weekly',
          auto_backup_time: allSettings.find(s => s.name === 'auto_backup_time')?.value || '00:00',
          auto_backup_path: allSettings.find(s => s.name === 'auto_backup_path')?.value || ''
        };
        
        setSettings(backupSettings);
        setAutoBackupEnabled(backupSettings.auto_backup_enabled);
        setBackupFrequency(backupSettings.auto_backup_frequency);
        setBackupTime(backupSettings.auto_backup_time);
        setBackupPath(backupSettings.auto_backup_path);
        
        // Load next scheduled backup info
        await loadNextScheduledBackup();
      } catch (error) {
        console.error('Failed to load backup settings:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load backup settings',
          severity: 'error'
        });
      }
    };
    
    loadSettings();
    
    // Set up a timer to refresh the next scheduled backup info every minute
    const timer = setInterval(() => {
      loadNextScheduledBackup();
    }, 60000); // 60,000 ms = 1 minute
    
    // Clean up the timer on component unmount
    return () => clearInterval(timer);
  }, []);

  // Function to load the next scheduled backup information
  const loadNextScheduledBackup = async () => {
    try {
      setLoadingNextBackup(true);
      const result = await api.getNextScheduledBackup();
      setNextBackup(result);
    } catch (error) {
      console.error('Failed to get next scheduled backup:', error);
    } finally {
      setLoadingNextBackup(false);
    }
  };

  const handleBackup = async () => {
    try {
      setLoading(true);
      setBackupProgress(0);
      
      // Simulate progress
      const interval = setInterval(() => {
        setBackupProgress(prev => {
          const newProgress = prev + 10;
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 300);
      
      const result = await api.backupData(backupPath);
      
      clearInterval(interval);
      setBackupProgress(100);
      setBackupResult(result);
      
      // Enhanced success message with details
      let message = result.message || 'Backup completed successfully';
      if (result.success && result.tablesBackedUp) {
        message = `Backup completed successfully! ${result.tablesBackedUp} tables backed up.`;
      }
      
      setSnackbar({
        open: true,
        message: result.success ? message : result.message || 'Backup failed',
        severity: result.success ? 'success' : 'error'
      });
      
    } catch (error) {
      console.error('Backup failed:', error);
      setBackupResult({ success: false, error: error.message });
      setSnackbar({
        open: true,
        message: `Backup failed: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    // Show warning dialog
    setRestoreDialog(true);
  };

  const confirmRestore = async () => {
    setRestoreDialog(false);
    
    try {
      setLoading(true);
      setRestoreProgress(0);
      
      // Simulate progress
      const interval = setInterval(() => {
        setRestoreProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 200);
      
      const result = await api.restoreData(restorePath);
      
      clearInterval(interval);
      setRestoreProgress(100);
      setRestoreResult(result);
      
      // Enhanced success/warning messages
      let message = result.message || 'Restore completed successfully';
      let severity = result.success ? 'success' : 'error';
      
      if (result.success) {
        // Check for warnings or skipped tables
        if (result.warnings && result.warnings.length > 0) {
          severity = 'warning';
          message += ' Note: Some schema differences were detected.';
        }
        if (result.skippedTables && result.skippedTables.length > 0) {
          severity = 'warning';
          message += ` ${result.skippedTables.length} tables were skipped.`;
        }
        if (result.isLegacyFormat) {
          message += ' (Legacy backup format detected and converted)';
        }
        
        // Add restart notification
        message += ' Application will restart in 3 seconds.';
      }
      
      setSnackbar({
        open: true,
        message,
        severity
      });
      
      // If successful, application will restart automatically after 3 seconds
      if (result.success) {
        setTimeout(() => {
          window.api.restartApp();
        }, 3000);
      }
      
    } catch (error) {
      console.error('Restore failed:', error);
      setRestoreResult({ success: false, error: error.message });
      setSnackbar({
        open: true,
        message: `Restore failed: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAutoBackupSettings = async () => {
    try {
      setLoading(true);
      
      // Save settings
      await api.updateSetting({ name: 'auto_backup_enabled', value: autoBackupEnabled.toString() });
      await api.updateSetting({ name: 'auto_backup_frequency', value: backupFrequency });
      await api.updateSetting({ name: 'auto_backup_time', value: backupTime });
      await api.updateSetting({ name: 'auto_backup_path', value: backupPath });
      
      setSnackbar({
        open: true,
        message: 'Auto backup settings saved successfully',
        severity: 'success'
      });
      
      // After saving settings, refresh the next scheduled backup time
      await loadNextScheduledBackup();
      
    } catch (error) {
      console.error('Failed to save auto backup settings:', error);
      setSnackbar({
        open: true,
        message: `Failed to save settings: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBrowseBackupPath = async () => {
    try {
      const path = await window.api.showSaveDialog({
        title: 'Select Backup Location',
        defaultPath: 'organization_backup.db',
        filters: [{ name: 'Database Files', extensions: ['db'] }]
      });
      
      if (path) {
        setBackupPath(path);
      }
    } catch (error) {
      console.error('Failed to show save dialog:', error);
    }
  };

  const handleBrowseRestorePath = async () => {
    try {
      const path = await window.api.showOpenDialog({
        title: 'Select Backup File to Restore',
        filters: [{ name: 'Database Files', extensions: ['db'] }],
        properties: ['openFile']
      });
      
      if (path && path.length > 0) {
        setRestorePath(path[0]);
      }
    } catch (error) {
      console.error('Failed to show open dialog:', error);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Data Backup & Restore
      </Typography>
      
      <Typography variant="body1" paragraph>
        Backup and restore your organization's data to keep it safe.
      </Typography>
      
      <Grid container spacing={3}>
        {/* Manual Backup */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              <BackupIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Create Backup
            </Typography>
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Backup location:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  value={backupPath}
                  onChange={(e) => setBackupPath(e.target.value)}
                  placeholder="C:\BackupLocation\organization_backup.db"
                  disabled={loading}
                />
                <Button 
                  variant="outlined" 
                  onClick={handleBrowseBackupPath}
                  disabled={loading}
                >
                  Browse
                </Button>
              </Box>
            </Box>
            
            {backupProgress > 0 && backupProgress < 100 && (
              <Box sx={{ width: '100%', mb: 2 }}>
                <LinearProgress variant="determinate" value={backupProgress} />
                <Typography variant="body2" align="center">
                  Backup in progress... {backupProgress}%
                </Typography>
              </Box>
            )}
            
            {backupResult && (
              <Box sx={{ mb: 2 }}>
                <Alert 
                  severity={backupResult.success ? 'success' : 'error'} 
                  sx={{ mb: 1 }}
                >
                  {backupResult.message || (backupResult.success 
                    ? 'Backup completed successfully' 
                    : `Backup failed: ${backupResult.error}`)}
                </Alert>
                {backupResult.success && backupResult.tablesBackedUp && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    📊 {backupResult.tablesBackedUp} tables backed up
                  </Typography>
                )}
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleBackup}
                disabled={!backupPath || loading}
                startIcon={<BackupIcon />}
              >
                {loading ? <CircularProgress size={24} /> : 'Backup Now'}
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Data Restore */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'error.main' }}>
              <RestoreIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Restore from Backup
            </Typography>
            <Divider sx={{ my: 2 }} />
            
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Warning: Restoring from a backup will replace ALL current data with the backed-up data.
                This action cannot be undone. Make sure you have a backup of your current data before proceeding.
              </Typography>
            </Alert>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Backup file to restore:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  value={restorePath}
                  onChange={(e) => setRestorePath(e.target.value)}
                  placeholder="C:\BackupLocation\organization_backup.db"
                  disabled={loading}
                />
                <Button 
                  variant="outlined" 
                  onClick={handleBrowseRestorePath}
                  disabled={loading}
                >
                  Browse
                </Button>
              </Box>
            </Box>
            
            {restoreProgress > 0 && restoreProgress < 100 && (
              <Box sx={{ width: '100%', mb: 2 }}>
                <LinearProgress variant="determinate" value={restoreProgress} />
                <Typography variant="body2" align="center">
                  Restore in progress... {restoreProgress}%
                </Typography>
              </Box>
            )}
            
            {restoreResult && (
              <Box sx={{ mb: 2 }}>
                <Alert 
                  severity={restoreResult.success 
                    ? (restoreResult.warnings?.length > 0 || restoreResult.skippedTables?.length > 0 ? 'warning' : 'success')
                    : 'error'
                  } 
                  sx={{ mb: 1 }}
                >
                  {restoreResult.message || (restoreResult.success 
                    ? 'Restore completed successfully! Application will restart.' 
                    : `Restore failed: ${restoreResult.error}`)}
                </Alert>
                
                {restoreResult.success && (
                  <Box sx={{ mt: 1 }}>
                    {restoreResult.restoredTables && (
                      <Typography variant="body2" color="text.secondary">
                        ✅ {restoreResult.restoredTables} tables restored successfully
                      </Typography>
                    )}
                    
                    {restoreResult.isLegacyFormat && (
                      <Typography variant="body2" color="info.main">
                        ℹ️ Legacy backup format detected and converted
                      </Typography>
                    )}
                    
                    {restoreResult.skippedTables?.length > 0 && (
                      <Typography variant="body2" color="warning.main">
                        ⚠️ {restoreResult.skippedTables.length} tables skipped: {restoreResult.skippedTables.join(', ')}
                      </Typography>
                    )}
                    
                    {restoreResult.warnings?.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'bold' }}>
                          ⚠️ Schema Warnings:
                        </Typography>
                        {restoreResult.warnings.slice(0, 3).map((warning, index) => (
                          <Typography key={index} variant="body2" color="text.secondary" sx={{ ml: 2, fontSize: '0.75rem' }}>
                            • {warning}
                          </Typography>
                        ))}
                        {restoreResult.warnings.length > 3 && (
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 2, fontSize: '0.75rem' }}>
                            ... and {restoreResult.warnings.length - 3} more warnings
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="error"
                onClick={handleRestore}
                disabled={!restorePath || loading}
                startIcon={<RestoreIcon />}
              >
                {loading ? <CircularProgress size={24} /> : 'Restore Data'}
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Automatic Backup Settings */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <ScheduleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Automatic Backup Settings
            </Typography>
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoBackupEnabled}
                      onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                      disabled={loading}
                    />
                  }
                  label="Enable automatic backups"
                />
              </Grid>
              
              {autoBackupEnabled && (
                <>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="body2" gutterBottom>
                      Backup frequency:
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={backupFrequency}
                      onChange={(e) => setBackupFrequency(e.target.value)}
                      disabled={loading}
                      SelectProps={{
                        native: true,
                      }}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </TextField>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="body2" gutterBottom>
                      Backup time:
                    </Typography>
                    <TextField
                      type="time"
                      fullWidth
                      size="small"
                      value={backupTime}
                      onChange={(e) => setBackupTime(e.target.value)}
                      disabled={loading}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="body2" gutterBottom>
                      Backup location:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        size="small"
                        value={backupPath}
                        onChange={(e) => setBackupPath(e.target.value)}
                        disabled={loading}
                      />
                      <Button 
                        variant="outlined" 
                        onClick={handleBrowseBackupPath}
                        disabled={loading}
                      >
                        Browse
                      </Button>
                    </Box>
                  </Grid>
                  
                  {/* Next Scheduled Backup Display */}
                  <Grid item xs={12}>
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Next Scheduled Backup:
                      </Typography>
                      
                      {loadingNextBackup ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CircularProgress size={16} sx={{ mr: 1 }} />
                          <Typography variant="body2">Loading schedule information...</Typography>
                        </Box>
                      ) : (
                        nextBackup && nextBackup.scheduled ? (
                          <Typography variant="body2">
                            {nextBackup.formattedDate}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No backup currently scheduled. Save settings to schedule your next automatic backup.
                          </Typography>
                        )
                      )}
                    </Box>
                  </Grid>
                </>
              )}
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={saveAutoBackupSettings}
                    disabled={loading}
                    startIcon={<SaveIcon />}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Save Settings'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Restore confirmation dialog */}
      <Dialog
        open={restoreDialog}
        onClose={() => setRestoreDialog(false)}
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          <RestoreIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Confirm Data Restore
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Typography variant="body1" paragraph>
              <strong>Warning: This action cannot be undone!</strong>
            </Typography>
            <Typography variant="body2" paragraph>
              You are about to restore data from a backup file. This will:
            </Typography>
            <ul>
              <li>Replace ALL current data with data from the backup</li>
              <li>Overwrite any changes made since the backup was created</li>
              <li>Restart the application when complete</li>
            </ul>
            <Typography variant="body2" paragraph>
              Are you sure you want to proceed?
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog(false)}>Cancel</Button>
          <Button onClick={confirmRestore} color="error" variant="contained">
            Yes, Restore Data
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BackupRestore;