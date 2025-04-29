// OTP Service for verifying sensitive operations
// This service handles generating and verifying OTPs for sensitive admin operations

import { v4 as uuidv4 } from 'uuid';
import smsService from './smsService';

// OTP templates for SMS
const OTP_TEMPLATES = {
  ENGLISH: "Your verification code for {{operation}} is: {{otpCode}}. Valid for {{validityMinutes}} minutes.",
  SINHALA: "ඔබගේ {{operation}} සඳහා තහවුරු කිරීමේ කේතය: {{otpCode}}. මිනිත්තු {{validityMinutes}} සඳහා වලංගු වේ."
};

// OTP operation types
export const OTP_OPERATIONS = {
  USER_EDIT: "user account update",
  LOAN_EDIT: "loan modification",
  LOAN_PAYMENT: "loan payment",
  MEMBER_FEE_EDIT: "member fee edit",
  LOAN_INTEREST_EDIT: "loan interest edit",
  CONTRIBUTION_EDIT: "contribution edit",
  TRANSACTION_EDIT: "transaction edit"
};

// In-memory OTP storage (will be lost on app restart - consider moving to database for production)
const otpStore = {};

const otpService = {
  // Generate an OTP code and send it via SMS
  generateAndSendOTP: async (phoneNumber, operation, language = 'ENGLISH') => {
    if (!phoneNumber) {
      return { success: false, error: 'Phone number is required' };
    }
    
    // Generate a 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Generate a unique token for this OTP
    const otpToken = uuidv4();
    
    // Store OTP details with 10-minute expiry
    const validityMinutes = 10;
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + validityMinutes);
    
    otpStore[otpToken] = {
      otpCode,
      phoneNumber,
      operation,
      expiryTime,
      isVerified: false
    };
    
    // Format the SMS message
    const template = OTP_TEMPLATES[language];
    const message = template.replace('{{otpCode}}', otpCode)
                           .replace('{{operation}}', operation)
                           .replace('{{validityMinutes}}', validityMinutes);
    
    // Send the OTP via SMS
    const result = await window.api.sendSMS(phoneNumber, message);
    
    if (result.success) {
      return { 
        success: true, 
        otpToken,
        message: `OTP sent to ${phoneNumber}`
      };
    } else {
      // If SMS failed, remove the OTP from store and return error
      delete otpStore[otpToken];
      return { 
        success: false, 
        error: `Failed to send OTP: ${result.error || 'Unknown error'}`
      };
    }
  },
  
  // Verify an OTP
  verifyOTP: (otpToken, otpCode) => {
    const otpData = otpStore[otpToken];
    
    // Check if OTP exists
    if (!otpData) {
      return { success: false, error: 'Invalid OTP token' };
    }
    
    // Check if OTP is expired
    if (new Date() > otpData.expiryTime) {
      delete otpStore[otpToken]; // Clean up expired OTP
      return { success: false, error: 'OTP has expired' };
    }
    
    // Check if OTP code matches
    if (otpData.otpCode !== otpCode) {
      return { success: false, error: 'Invalid OTP code' };
    }
    
    // Mark OTP as verified
    otpData.isVerified = true;
    
    return { 
      success: true, 
      message: 'OTP verified successfully',
      operation: otpData.operation
    };
  },
  
  // Check if an operation has been verified
  isOperationVerified: (otpToken) => {
    const otpData = otpStore[otpToken];
    
    if (!otpData) {
      return false;
    }
    
    if (new Date() > otpData.expiryTime) {
      delete otpStore[otpToken]; // Clean up expired OTP
      return false;
    }
    
    return otpData.isVerified;
  },
  
  // Clean up verified/expired OTPs (call this periodically)
  cleanupOTPs: () => {
    const now = new Date();
    
    for (const token in otpStore) {
      if (otpStore[token].isVerified || now > otpStore[token].expiryTime) {
        delete otpStore[token];
      }
    }
  }
};

export default otpService; 