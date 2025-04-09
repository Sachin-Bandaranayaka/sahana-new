import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  Stack,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import api from '../../services/api';

const ChangePassword = () => {
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPasswords({
      ...passwords,
      [name]: value
    });
    
    // Reset messages when user starts typing again
    setError('');
    setSuccess('');
  };

  const handleTogglePasswordVisibility = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field]
    });
  };

  const validatePasswords = () => {
    if (!passwords.currentPassword) {
      setError('Please enter your current password');
      return false;
    }
    
    if (!passwords.newPassword) {
      setError('Please enter a new password');
      return false;
    }
    
    if (passwords.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return false;
    }
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePasswords()) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const currentUser = api.getCurrentUser();
      if (!currentUser) {
        setError('You need to be logged in to change your password');
        return;
      }
      
      const result = await api.changePassword(
        currentUser.id,
        passwords.currentPassword,
        passwords.newPassword
      );
      
      if (result.success) {
        setSuccess('Password changed successfully');
        // Reset form
        setPasswords({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setError(result.message || 'Failed to change password');
      }
    } catch (err) {
      console.error('Change password error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Change Password
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Current Password"
            name="currentPassword"
            type={showPasswords.currentPassword ? 'text' : 'password'}
            value={passwords.currentPassword}
            onChange={handleInputChange}
            fullWidth
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => handleTogglePasswordVisibility('currentPassword')}
                    edge="end"
                  >
                    {showPasswords.currentPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          
          <TextField
            label="New Password"
            name="newPassword"
            type={showPasswords.newPassword ? 'text' : 'password'}
            value={passwords.newPassword}
            onChange={handleInputChange}
            fullWidth
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => handleTogglePasswordVisibility('newPassword')}
                    edge="end"
                  >
                    {showPasswords.newPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          
          <TextField
            label="Confirm New Password"
            name="confirmPassword"
            type={showPasswords.confirmPassword ? 'text' : 'password'}
            value={passwords.confirmPassword}
            onChange={handleInputChange}
            fullWidth
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => handleTogglePasswordVisibility('confirmPassword')}
                    edge="end"
                  >
                    {showPasswords.confirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{ mt: 1 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Change Password'}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
};

export default ChangePassword; 