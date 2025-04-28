/**
 * Error handling service for centralized error management
 * This service provides utilities for handling, logging, and displaying errors
 */

// List of common error codes and their user-friendly messages
const errorMessages = {
  // Authentication errors
  'auth/invalid-credentials': 'Invalid username or password. Please try again.',
  'auth/user-not-found': 'User not found. Please check your credentials.',
  'auth/password-mismatch': 'Incorrect password. Please try again.',
  
  // Database errors
  'db/connection-error': 'Failed to connect to the database. Please restart the application.',
  'db/query-failed': 'Database operation failed. Please try again.',
  'db/data-validation': 'Invalid data provided. Please check your input and try again.',
  
  // Network errors
  'network/offline': 'You are offline. Please check your connection and try again.',
  'network/timeout': 'Connection timed out. Please try again later.',
  
  // Input validation errors
  'validation/required-field': 'Please fill in all required fields.',
  'validation/invalid-format': 'Invalid format. Please check your input.',
  'validation/duplicate-entry': 'This entry already exists. Please use a unique value.',
  
  // SMS service errors
  'sms/send-failed': 'Failed to send SMS notification. Please check API settings.',
  'sms/invalid-phone': 'Invalid phone number format. SMS notification cannot be sent.',
  
  // Backup/restore errors
  'backup/failed': 'Failed to create backup. Please check permissions and try again.',
  'restore/failed': 'Failed to restore from backup. The backup file may be corrupted.',
  
  // Default error message
  'default': 'An unexpected error occurred. Please try again or contact support.'
};

// Log the error to the console with additional context
const logError = (error, context = {}) => {
  console.error('Error:', error);
  console.error('Context:', context);
  
  // Additional logging can be added here (e.g., to a file or external service)
};

// Get a user-friendly error message from an error code or object
const getErrorMessage = (error) => {
  if (typeof error === 'string') {
    return errorMessages[error] || errorMessages.default;
  }
  
  if (error && error.code) {
    return errorMessages[error.code] || error.message || errorMessages.default;
  }
  
  if (error && error.message) {
    return error.message;
  }
  
  return errorMessages.default;
};

// Parse an error from an API response
const parseApiError = (error) => {
  if (error && error.response && error.response.data) {
    return {
      code: error.response.data.code || 'unknown',
      message: error.response.data.message || getErrorMessage('default'),
      status: error.response.status
    };
  }
  
  return {
    code: 'unknown',
    message: getErrorMessage('default'),
    status: 500
  };
};

// Validate form data and return any errors
const validateForm = (data, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const value = data[field];
    const fieldRules = rules[field];
    
    // Check required fields
    if (fieldRules.required && (value === undefined || value === null || value === '')) {
      errors[field] = 'This field is required';
      return;
    }
    
    // Check minimum length
    if (fieldRules.minLength && value && value.length < fieldRules.minLength) {
      errors[field] = `Must be at least ${fieldRules.minLength} characters`;
      return;
    }
    
    // Check maximum length
    if (fieldRules.maxLength && value && value.length > fieldRules.maxLength) {
      errors[field] = `Must be less than ${fieldRules.maxLength} characters`;
      return;
    }
    
    // Check pattern (regex)
    if (fieldRules.pattern && value && !fieldRules.pattern.test(value)) {
      errors[field] = fieldRules.patternMessage || 'Invalid format';
      return;
    }
    
    // Check numeric constraints
    if (fieldRules.min !== undefined && value !== '' && Number(value) < fieldRules.min) {
      errors[field] = `Must be at least ${fieldRules.min}`;
      return;
    }
    
    if (fieldRules.max !== undefined && value !== '' && Number(value) > fieldRules.max) {
      errors[field] = `Must be less than ${fieldRules.max}`;
      return;
    }
    
    // Check custom validation
    if (fieldRules.validate && !fieldRules.validate(value, data)) {
      errors[field] = fieldRules.validateMessage || 'Invalid value';
      return;
    }
  });
  
  return errors;
};

// Check if a form has any validation errors
const hasErrors = (errors) => {
  return Object.keys(errors).length > 0;
};

// Wrap an async function with error handling
const withErrorHandling = (asyncFn, errorHandler) => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      logError(error, { args });
      
      if (errorHandler) {
        errorHandler(error);
      }
      
      throw error;
    }
  };
};

// Export the error service
const errorService = {
  logError,
  getErrorMessage,
  parseApiError,
  validateForm,
  hasErrors,
  withErrorHandling,
  errorMessages
};

export default errorService; 