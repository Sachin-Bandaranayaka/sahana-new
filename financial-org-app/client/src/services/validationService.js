/**
 * Validation service for validating form inputs and data
 * This service provides utilities for data validation throughout the application
 */

// Regular expression patterns for common validations
const patterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^(?:\+94|0)[1-9][0-9]{8}$/, // Sri Lankan phone number format
  nic: /^(?:\d{9}[vVxX]|\d{12})$/, // Sri Lankan NIC format
  memberCode: /^M-\d{4}$/, // Format for member IDs (e.g., M-0001)
  money: /^\d+(\.\d{1,2})?$/, // Money format (e.g., 1000.00)
  date: /^\d{4}-\d{2}-\d{2}$/, // ISO date format (YYYY-MM-DD)
  name: /^[A-Za-z .'()-]+$/, // Name format (letters, spaces, and some special chars)
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, // Strong password
  username: /^[a-zA-Z0-9_]{3,20}$/, // Username format (alphanumeric, 3-20 chars)
  postalCode: /^\d{5}$/, // Postal code format (5 digits)
};

// Validation rules for specific entities
const validationRules = {
  member: {
    name: { 
      required: true, 
      minLength: 3, 
      maxLength: 100,
      pattern: patterns.name,
      patternMessage: 'Name should contain only letters, spaces, and basic punctuation'
    },
    address: { 
      required: true, 
      maxLength: 200,
    },
    contact: { 
      required: true, 
      pattern: patterns.phone,
      patternMessage: 'Invalid phone number format (e.g., 0771234567 or +94771234567)'
    },
    nic: { 
      required: true, 
      pattern: patterns.nic,
      patternMessage: 'Invalid NIC format (9 digits + V/X or 12 digits)'
    },
    joined_date: { 
      required: true,
      pattern: patterns.date,
      patternMessage: 'Invalid date format (YYYY-MM-DD)'
    }
  },
  user: {
    username: { 
      required: true, 
      minLength: 3, 
      maxLength: 20,
      pattern: patterns.username,
      patternMessage: 'Username should be 3-20 characters (letters, numbers, underscore only)'
    },
    password: { 
      required: true, 
      minLength: 8,
      pattern: patterns.password,
      patternMessage: 'Password must have at least 8 characters with uppercase, lowercase, and numbers'
    },
    role: { 
      required: true,
      validate: (value) => ['admin', 'manager', 'user'].includes(value),
      validateMessage: 'Invalid role selection'
    }
  },
  loan: {
    member_id: { 
      required: true
    },
    loan_type: { 
      required: true
    },
    amount_taken: { 
      required: true, 
      min: 1000,
      pattern: patterns.money,
      patternMessage: 'Invalid amount format (e.g., 10000.00)'
    },
    date: { 
      required: true,
      pattern: patterns.date,
      patternMessage: 'Invalid date format (YYYY-MM-DD)'
    }
  },
  cashEntry: {
    member_id: { 
      required: true
    },
    date: { 
      required: true,
      pattern: patterns.date,
      patternMessage: 'Invalid date format (YYYY-MM-DD)'
    },
    amount: { 
      required: true, 
      min: 100,
      pattern: patterns.money,
      patternMessage: 'Invalid amount format (e.g., 500.00)'
    },
    description: { 
      required: true, 
      maxLength: 200
    }
  },
  bankAccount: {
    account_name: { 
      required: true, 
      minLength: 3, 
      maxLength: 100
    },
    bank_name: { 
      required: true, 
      minLength: 2, 
      maxLength: 100
    },
    account_type: { 
      required: true
    },
    balance: { 
      required: true,
      min: 0,
      pattern: patterns.money,
      patternMessage: 'Invalid amount format (e.g., 10000.00)'
    }
  },
  fixedDeposit: {
    account_id: { 
      required: true
    },
    amount: { 
      required: true, 
      min: 1000,
      pattern: patterns.money,
      patternMessage: 'Invalid amount format (e.g., 10000.00)'
    },
    interest_rate: { 
      required: true, 
      min: 0.1, 
      max: 30,
      patternMessage: 'Interest rate must be between 0.1 and 30'
    },
    start_date: { 
      required: true,
      pattern: patterns.date,
      patternMessage: 'Invalid date format (YYYY-MM-DD)'
    },
    maturity_date: { 
      required: true,
      pattern: patterns.date,
      patternMessage: 'Invalid date format (YYYY-MM-DD)',
      validate: (value, data) => {
        if (!value || !data.start_date) return true;
        return new Date(value) > new Date(data.start_date);
      },
      validateMessage: 'Maturity date must be after start date'
    }
  },
  dividend: {
    member_id: { 
      required: true
    },
    date: { 
      required: true,
      pattern: patterns.date,
      patternMessage: 'Invalid date format (YYYY-MM-DD)'
    },
    share_amount: { 
      required: true, 
      min: 0,
      pattern: patterns.money,
      patternMessage: 'Invalid amount format (e.g., 500.00)'
    },
    quarter: { 
      required: true, 
      min: 1, 
      max: 4,
      patternMessage: 'Quarter must be between 1 and 4'
    },
    year: { 
      required: true, 
      min: 2000, 
      max: new Date().getFullYear() + 1,
      patternMessage: `Year must be between 2000 and ${new Date().getFullYear() + 1}`
    }
  }
};

/**
 * Validate data against specified rules
 * 
 * @param {Object} data - The data to validate
 * @param {Object} rules - The validation rules to apply
 * @returns {Object} - Object containing any validation errors
 */
const validateData = (data, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const value = data[field];
    const fieldRules = rules[field];
    
    // Check required fields
    if (fieldRules.required && (value === undefined || value === null || value === '')) {
      errors[field] = 'This field is required';
      return;
    }
    
    // Skip further validation if field is empty and not required
    if (value === undefined || value === null || value === '') {
      return;
    }
    
    // Check minimum length
    if (fieldRules.minLength && String(value).length < fieldRules.minLength) {
      errors[field] = `Must be at least ${fieldRules.minLength} characters`;
      return;
    }
    
    // Check maximum length
    if (fieldRules.maxLength && String(value).length > fieldRules.maxLength) {
      errors[field] = `Must be less than ${fieldRules.maxLength} characters`;
      return;
    }
    
    // Check pattern (regex)
    if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
      errors[field] = fieldRules.patternMessage || 'Invalid format';
      return;
    }
    
    // Check numeric constraints
    if (fieldRules.min !== undefined && Number(value) < fieldRules.min) {
      errors[field] = `Must be at least ${fieldRules.min}`;
      return;
    }
    
    if (fieldRules.max !== undefined && Number(value) > fieldRules.max) {
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

/**
 * Check if an object has any validation errors
 * 
 * @param {Object} errors - The errors object from validateData
 * @returns {boolean} - True if there are errors, false otherwise
 */
const hasErrors = (errors) => {
  return Object.keys(errors).length > 0;
};

/**
 * Validate a member
 * 
 * @param {Object} member - The member data to validate
 * @returns {Object} - Object containing any validation errors
 */
const validateMember = (member) => {
  return validateData(member, validationRules.member);
};

/**
 * Validate a user
 * 
 * @param {Object} user - The user data to validate
 * @returns {Object} - Object containing any validation errors
 */
const validateUser = (user) => {
  return validateData(user, validationRules.user);
};

/**
 * Validate a loan
 * 
 * @param {Object} loan - The loan data to validate
 * @returns {Object} - Object containing any validation errors
 */
const validateLoan = (loan) => {
  return validateData(loan, validationRules.loan);
};

/**
 * Validate a cash entry
 * 
 * @param {Object} cashEntry - The cash entry data to validate
 * @returns {Object} - Object containing any validation errors
 */
const validateCashEntry = (cashEntry) => {
  return validateData(cashEntry, validationRules.cashEntry);
};

/**
 * Validate a bank account
 * 
 * @param {Object} bankAccount - The bank account data to validate
 * @returns {Object} - Object containing any validation errors
 */
const validateBankAccount = (bankAccount) => {
  return validateData(bankAccount, validationRules.bankAccount);
};

/**
 * Validate a fixed deposit
 * 
 * @param {Object} fixedDeposit - The fixed deposit data to validate
 * @returns {Object} - Object containing any validation errors
 */
const validateFixedDeposit = (fixedDeposit) => {
  return validateData(fixedDeposit, validationRules.fixedDeposit);
};

/**
 * Validate a dividend entry
 * 
 * @param {Object} dividend - The dividend data to validate
 * @returns {Object} - Object containing any validation errors
 */
const validateDividend = (dividend) => {
  return validateData(dividend, validationRules.dividend);
};

/**
 * Format a phone number to the standard format
 * 
 * @param {string} phone - The phone number to format
 * @returns {string} - The formatted phone number
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Check if Sri Lankan number
  if (cleaned.startsWith('94')) {
    // Format: +94 77 123 4567
    return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
  } else if (cleaned.startsWith('0')) {
    // Format: 077 123 4567
    return `0${cleaned.substring(1, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  }
  
  return phone; // Return as is if doesn't match expected patterns
};

/**
 * Format a date to the standard display format
 * 
 * @param {string} date - The date to format (YYYY-MM-DD)
 * @returns {string} - The formatted date (DD/MM/YYYY)
 */
const formatDate = (date) => {
  if (!date) return '';
  
  // Check if valid date format
  if (!patterns.date.test(date)) return date;
  
  // Split into year, month, day
  const [year, month, day] = date.split('-');
  
  // Return formatted date
  return `${day}/${month}/${year}`;
};

/**
 * Generate a new member ID based on the last ID
 * 
 * @param {string} lastId - The last member ID
 * @returns {string} - A new member ID
 */
const generateMemberId = (lastId) => {
  if (!lastId || !lastId.startsWith('M-')) {
    return 'M-0001';
  }
  
  // Extract the number part
  const numberPart = lastId.substring(2);
  
  // Increment and pad with zeros
  const nextNumber = parseInt(numberPart, 10) + 1;
  return `M-${String(nextNumber).padStart(4, '0')}`;
};

// Export the validation service
const validationService = {
  patterns,
  validateData,
  hasErrors,
  validateMember,
  validateUser,
  validateLoan,
  validateCashEntry,
  validateBankAccount,
  validateFixedDeposit,
  validateDividend,
  formatPhoneNumber,
  formatDate,
  generateMemberId
};

export default validationService; 