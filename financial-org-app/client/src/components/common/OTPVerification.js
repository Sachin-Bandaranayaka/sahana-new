import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio
} from '@mui/material';
import otpService from '../../services/otpService';

const OTPVerification = ({ 
  open, 
  onClose, 
  onVerify, 
  phoneNumber, 
  operation,
  title = 'Verification Required'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [otpToken, setOtpToken] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [language, setLanguage] = useState('ENGLISH');

  // Request OTP
  const handleRequestOTP = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await otpService.generateAndSendOTP(phoneNumber, operation, language);
      
      if (result.success) {
        setOtpToken(result.otpToken);
        setSuccess(result.message);
      } else {
        setError(result.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('An error occurred while sending the OTP');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (!otpCode) {
      setError('Please enter the OTP code');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await otpService.verifyOTP(otpToken, otpCode);
      
      if (result.success) {
        setSuccess(result.message);
        onVerify(otpToken); // Pass the token back to the parent component
      } else {
        setError(result.error || 'Invalid OTP');
      }
    } catch (err) {
      setError('An error occurred while verifying the OTP');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    setOtpToken(null);
    setOtpCode('');
    setError('');
    setSuccess('');
    onClose();
  };

  // Handle language change
  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {!otpToken ? (
          <>
            <Typography variant="body1" gutterBottom>
              For security reasons, an OTP will be sent to the phone number:
            </Typography>
            <Typography variant="body1" fontWeight="bold" gutterBottom>
              {phoneNumber}
            </Typography>
            <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
              Please select your preferred language:
            </Typography>
            <FormControl component="fieldset">
              <RadioGroup
                row
                name="language"
                value={language}
                onChange={handleLanguageChange}
              >
                <FormControlLabel value="ENGLISH" control={<Radio />} label="English" />
                <FormControlLabel value="SINHALA" control={<Radio />} label="සිංහල" />
              </RadioGroup>
            </FormControl>
          </>
        ) : (
          <>
            <Typography variant="body1" gutterBottom>
              Enter the verification code sent to your phone:
            </Typography>
            <TextField
              margin="dense"
              label="Verification Code"
              fullWidth
              variant="outlined"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              inputProps={{ maxLength: 6 }}
              autoFocus
            />
          </>
        )}
        
        {error && (
          <Box sx={{ mt: 2, color: 'error.main' }}>
            <Typography variant="body2">{error}</Typography>
          </Box>
        )}
        
        {success && (
          <Box sx={{ mt: 2, color: 'success.main' }}>
            <Typography variant="body2">{success}</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="secondary">
          Cancel
        </Button>
        {!otpToken ? (
          <Button 
            onClick={handleRequestOTP} 
            color="primary" 
            disabled={isLoading}
            variant="contained"
          >
            {isLoading ? <CircularProgress size={24} /> : 'Send OTP'}
          </Button>
        ) : (
          <Button 
            onClick={handleVerifyOTP} 
            color="primary" 
            disabled={isLoading || !otpCode}
            variant="contained"
          >
            {isLoading ? <CircularProgress size={24} /> : 'Verify'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default OTPVerification; 