// SMS Service using notify.lk API
// This service handles sending SMS notifications for various events

const SMS_TEMPLATES = {
  MEMBER_REGISTRATION: "Welcome to our financial organization! Your member ID is: {{memberId}}.",
  LOAN_ISSUED: "Dear member, a loan of Rs. {{amount}} has been issued to you. Reference ID: {{loanId}}",
  LOAN_PAYMENT: "Thank you for your payment of Rs. {{amount}} towards loan ID {{loanId}}. Remaining balance: Rs. {{balance}}",
  MEMBER_FEE: "Thank you for your member fee payment of Rs. {{amount}}. Your payment has been recorded successfully.",
};

// SMS sending function that will be exposed through preload.js
const smsService = {
  // Format the message by replacing placeholders with actual values
  formatMessage: (template, data) => {
    let message = template;
    Object.keys(data).forEach(key => {
      message = message.replace(`{{${key}}}`, data[key]);
    });
    return message;
  },

  // Send SMS for member registration
  sendMemberRegistrationSMS: async (memberPhone, memberId) => {
    if (!memberPhone) return { success: false, error: 'No phone number provided' };
    
    const message = smsService.formatMessage(SMS_TEMPLATES.MEMBER_REGISTRATION, { memberId });
    return await window.api.sendSMS(memberPhone, message);
  },

  // Send SMS for loan issuance
  sendLoanIssuedSMS: async (memberPhone, loanId, amount) => {
    if (!memberPhone) return { success: false, error: 'No phone number provided' };
    
    const message = smsService.formatMessage(SMS_TEMPLATES.LOAN_ISSUED, { 
      loanId, 
      amount: amount.toLocaleString() 
    });
    return await window.api.sendSMS(memberPhone, message);
  },

  // Send SMS for loan payment
  sendLoanPaymentSMS: async (memberPhone, loanId, amount, balance) => {
    if (!memberPhone) return { success: false, error: 'No phone number provided' };
    
    const message = smsService.formatMessage(SMS_TEMPLATES.LOAN_PAYMENT, { 
      loanId, 
      amount: amount.toLocaleString(),
      balance: balance.toLocaleString()
    });
    return await window.api.sendSMS(memberPhone, message);
  },
  
  // Send SMS for member fee payment
  sendMemberFeeSMS: async (memberPhone, amount) => {
    if (!memberPhone) return { success: false, error: 'No phone number provided' };
    
    const message = smsService.formatMessage(SMS_TEMPLATES.MEMBER_FEE, { 
      amount: amount.toLocaleString() 
    });
    return await window.api.sendSMS(memberPhone, message);
  }
};

export default smsService; 