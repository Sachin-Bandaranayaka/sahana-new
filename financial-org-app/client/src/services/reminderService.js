// Reminder Service for Loan Payments
// This service handles scheduling and sending reminders for upcoming and overdue loan payments

import api from './api';
import smsService from './smsService';

/**
 * Calculate due dates for loans based on their payment schedule
 * @param {Object} loan - Loan object
 * @returns {Date} - Next due date for the loan payment
 */
const calculateNextDueDate = (loan) => {
  // This is a simplified implementation - in a real system, you might have 
  // more complex payment schedules or use existing payment history
  
  // If loan has a last payment date, calculate from that
  if (loan.last_interest_paid_date) {
    const lastPaymentDate = new Date(loan.last_interest_paid_date);
    // Assuming monthly payments, calculate next payment date as 30 days after the last payment
    lastPaymentDate.setDate(lastPaymentDate.getDate() + 30);
    return lastPaymentDate;
  }
  
  // If no payment has been made yet, calculate from loan issue date
  const loanStartDate = new Date(loan.date);
  // First payment is due 30 days after loan issue
  loanStartDate.setDate(loanStartDate.getDate() + 30);
  return loanStartDate;
};

/**
 * Calculate amount due for a loan payment
 * @param {Object} loan - Loan object
 * @returns {number} - Amount due for the next payment
 */
const calculateAmountDue = (loan) => {
  // This is a simplified implementation - in a real system, you would have 
  // a more sophisticated calculation based on loan terms
  
  // Interest rate is annual, convert to daily
  const dailyInterestRate = loan.interest_rate / 36500;
  
  // Calculate days since last payment
  const lastPaymentDate = loan.last_interest_paid_date 
    ? new Date(loan.last_interest_paid_date) 
    : new Date(loan.date);
    
  const today = new Date();
  const daysDiff = Math.floor((today - lastPaymentDate) / (1000 * 60 * 60 * 24));
  
  // Calculate interest accrued
  const interestAmount = loan.total * dailyInterestRate * daysDiff;
  
  // Minimum payment is the interest accrued plus 5% of the principal
  const minimumPayment = interestAmount + (loan.total * 0.05);
  
  return minimumPayment;
};

const reminderService = {
  /**
   * Check for upcoming payments and send reminders
   * @returns {Promise<Object>} - Results of the reminder operation
   */
  sendPaymentReminders: async () => {
    try {
      // Get all active loans
      const loans = await api.getLoans();
      const activeLoans = loans.filter(loan => loan.is_active === 1);
      
      if (!activeLoans.length) {
        return { success: true, message: 'No active loans to check for reminders', reminders: 0 };
      }
      
      let remindersSent = 0;
      const reminderResults = [];
      
      // Get all members for looking up contact information
      const members = await api.getMembers();
      
      // Check each loan for upcoming or overdue payments
      for (const loan of activeLoans) {
        // Find the member associated with this loan
        const member = members.find(m => m.id === loan.member_id);
        
        if (!member || !member.contact_number) {
          reminderResults.push({
            loanId: loan.id,
            status: 'skipped',
            reason: 'No contact information available'
          });
          continue;
        }
        
        const nextDueDate = calculateNextDueDate(loan);
        const today = new Date();
        const daysUntilDue = Math.floor((nextDueDate - today) / (1000 * 60 * 60 * 24));
        
        // Send reminder if payment is due within 3 days or is overdue
        if (daysUntilDue <= 3) {
          const amountDue = calculateAmountDue(loan);
          
          let smsResult;
          
          if (daysUntilDue < 0) {
            // Payment is overdue
            smsResult = await smsService.sendPaymentOverdueSMS(
              member.contact_number,
              loan.id,
              amountDue
            );
          } else {
            // Payment is upcoming
            smsResult = await smsService.sendPaymentDueReminderSMS(
              member.contact_number,
              loan.id,
              amountDue,
              nextDueDate.toISOString().split('T')[0]
            );
          }
          
          if (smsResult.success) {
            remindersSent++;
            reminderResults.push({
              loanId: loan.id,
              memberId: member.id,
              status: 'sent',
              daysUntilDue,
              amountDue
            });
          } else {
            reminderResults.push({
              loanId: loan.id,
              memberId: member.id,
              status: 'failed',
              daysUntilDue,
              error: smsResult.error
            });
          }
        }
      }
      
      return {
        success: true,
        message: `Sent ${remindersSent} payment reminders`,
        reminders: remindersSent,
        results: reminderResults
      };
    } catch (error) {
      console.error('Error sending payment reminders:', error);
      return {
        success: false,
        error: error.message || 'Failed to send payment reminders',
        reminders: 0
      };
    }
  },
  
  /**
   * Schedule automatic reminders
   * @param {boolean} enableReminders - Whether reminders should be enabled
   * @param {number} checkIntervalHours - How often to check for reminders (in hours)
   * @returns {Object} - Timer object that can be used to cancel scheduled reminders
   */
  scheduleReminders: (enableReminders = true, checkIntervalHours = 24) => {
    // Convert hours to milliseconds
    const checkInterval = checkIntervalHours * 60 * 60 * 1000;
    
    if (!enableReminders) {
      return null;
    }
    
    // Schedule periodic reminder checks
    const timer = setInterval(async () => {
      console.log('Running scheduled payment reminders check');
      const result = await reminderService.sendPaymentReminders();
      console.log('Reminder check result:', result);
    }, checkInterval);
    
    // Run an initial check immediately
    reminderService.sendPaymentReminders()
      .then(result => console.log('Initial reminder check result:', result))
      .catch(err => console.error('Error in initial reminder check:', err));
    
    return timer;
  }
};

export default reminderService; 