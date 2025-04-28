import React, { Component } from 'react';
import { Box, Typography, Button, Paper, Divider } from '@mui/material';
import { ErrorOutline as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import errorService from '../services/errorService';

/**
 * Error Boundary component to catch JavaScript errors in child components,
 * log those errors, and display a fallback UI instead of crashing.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to the error service
    errorService.logError(error, { 
      component: this.props.componentName || 'Unknown',
      errorInfo
    });

    // Update state with error details
    this.setState({ errorInfo });

    // If the parent has provided an onError handler, call it
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  handleReload = () => {
    window.location.reload();
  }

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // If a custom fallback is provided, use it
      if (fallback) {
        return fallback(error, this.handleReset);
      }

      // Default fallback UI
      return (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <Paper elevation={3} sx={{ p: 4, maxWidth: 500, width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ErrorIcon color="error" sx={{ fontSize: 40, mr: 2 }} />
              <Typography variant="h5" component="h2" color="error">
                Something went wrong
              </Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body1" paragraph>
              An error occurred in this part of the application. You can try to reload the page or go back to the previous page.
            </Typography>
            
            {process.env.NODE_ENV === 'development' && error && (
              <Box sx={{ 
                p: 2, 
                bgcolor: 'grey.100', 
                borderRadius: 1, 
                mb: 2,
                maxHeight: 200,
                overflow: 'auto'
              }}>
                <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
                  {error.toString()}
                </Typography>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />} 
                onClick={this.handleReset}
              >
                Try Again
              </Button>
              
              <Button 
                variant="contained" 
                color="primary" 
                onClick={this.handleReload}
              >
                Reload Page
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    // If no error, render children normally
    return children;
  }
}

export default ErrorBoundary; 