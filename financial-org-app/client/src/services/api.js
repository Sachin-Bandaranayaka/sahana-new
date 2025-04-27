// api.js - Unified API for both development and Electron modes

// Check if we're running in Electron
const isElectron = typeof window !== 'undefined' && (window.isElectron || window.api !== undefined);
console.log('Running in Electron mode:', isElectron);

// Helper to simulate API delays only while testing/debugging
const simulateDelay = (data, ms = 500) => {
  return new Promise(resolve => setTimeout(() => resolve(data), ms));
};

// Unified API functions for accessing the database
const api = {
  // Authentication
  login: async (credentials) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.verifyUser(credentials);
  },
  
  changePassword: async (userId, oldPassword, newPassword) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.changePassword(userId, oldPassword, newPassword);
  },
  
  logout: () => {
    // Remove user from local storage
    localStorage.removeItem('user');
    return { success: true };
  },
  
  getCurrentUser: () => {
    // Get user from local storage
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  },
  
  // Members
  getMembers: async () => {
    console.log("getMembers called, isElectron:", isElectron);
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.getMembers();
  },
  
  getMember: async (id) => {
    console.log("getMember called, isElectron:", isElectron);
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    // Since there's no direct getMember in preload, use getMembers and filter by id
    const members = await window.api.getMembers();
    return members.find(member => member.id == id || member.member_id == id);
  },
  
  getMemberTransactions: async (memberId) => {
    console.log("getMemberTransactions called, isElectron:", isElectron);
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.getMemberTransactions(memberId);
  },
  
  addMember: async (member) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.addMember(member);
  },
  
  updateMember: async (id, member) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.updateMember(id, member);
  },
  
  deleteMember: async (id) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.deleteMember(id);
  },
  
  // Loans
  getLoans: async () => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.getLoans();
  },
  
  // Loan Types
  getLoanTypes: async () => {
    if (!isElectron) {
      console.warn('Running in browser mode, returning mock loan types data');
      return [
        { id: 1, name: 'Personal Loan', interest_rate: 8 },
        { id: 2, name: 'Business Loan', interest_rate: 12 },
        { id: 3, name: 'Emergency Loan', interest_rate: 10 }
      ];
    }
    
    try {
      return await window.api.getLoanTypes();
    } catch (error) {
      console.error('Error fetching loan types:', error);
      throw error;
    }
  },
  
  addLoanType: async (loanType) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.addLoanType(loanType);
  },
  
  deleteLoanType: async (id) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.deleteLoanType(id);
  },
  
  addLoan: async (loan) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.addLoan(loan);
  },
  
  updateLoan: async (id, loan) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.updateLoan(id, loan);
  },
  
  deleteLoan: async (id) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.deleteLoan(id);
  },
  
  addLoanPayment: async (loanId, payment) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.addLoanPayment(loanId, payment);
  },
  
  // CashBook
  getCashEntries: async (dateRange) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.getCashEntries(dateRange);
  },
  
  addCashEntry: async (entry) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.addCashEntry(entry);
  },
  
  updateCashEntry: async (id, entry) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.updateCashEntry(id, entry);
  },
  
  deleteCashEntry: async (id) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.deleteCashEntry(id);
  },
  
  // Bank Accounts
  getBankAccounts: async () => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.getBankAccounts();
  },
  
  addBankAccount: async (account) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.addBankAccount(account);
  },
  
  updateBankAccount: async (id, account) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.updateBankAccount(id, account);
  },
  
  deleteBankAccount: async (id) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.deleteBankAccount(id);
  },
  
  // Bank Transactions
  getBankTransactions: async (accountId) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.getBankTransactions(accountId);
  },
  
  addBankTransaction: async (transaction) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.addBankTransaction(transaction);
  },
  
  // Dividends
  getDividends: async () => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.getDividends();
  },
  
  addDividend: async (dividend) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.addDividend(dividend);
  },
  
  getDividendPayments: async (dividendId) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.getDividendPayments(dividendId);
  },
  
  addDividendPayment: async (payment) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.addDividendPayment(payment);
  },
  
  updateDividendPayment: async (id, payment) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.updateDividendPayment(id, payment);
  },
  
  // Dashboard
  getDashboardData: async () => {
    console.log("getDashboardData called, isElectron:", isElectron);
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.getDashboardData();
  },
  
  // Calculations
  calculateMemberAsset: async (memberId) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.calculateMemberAsset(memberId);
  },
  
  calculateOrgAssets: async () => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.calculateOrgAssets();
  },
  
  calculateProportionalDividends: async (params) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.calculateProportionalDividends(params);
  },
  
  calculateQuarterlyDividendsByYear: async (params) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.calculateQuarterlyDividendsByYear(params);
  },
  
  // Settings
  getSettings: async () => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.getSettings();
  },
  
  updateSetting: async (setting) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.updateSetting(setting);
  },
  
  // Backup and Restore
  backupData: async (filePath) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.backupData(filePath);
  },
  
  restoreData: async (filePath) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.restoreData(filePath);
  },
  
  // Helper function to format currency in LKR
  formatCurrency: (amount) => {
    return `Rs. ${Number(amount).toLocaleString('en-LK')}`;
  },
  
  getCashbookEntries: async () => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.getCashbookEntries();
  },
  
  getCashbookEntriesByDateRange: async (startDate, endDate) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.getCashbookEntriesByDateRange(startDate, endDate);
  },
  
  addCashbookEntry: async (entry) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.addCashbookEntry(entry);
  },
  
  // SMS Services
  getSMSSettings: async () => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.getSMSSettings();
  },
  
  updateSMSSettings: async (settings) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.updateSMSSettings(settings);
  },
  
  sendSMS: async (phoneNumber, message) => {
    if (!isElectron) {
      throw new Error('This application requires Electron to access the database');
    }
    
    return await window.api.sendSMS(phoneNumber, message);
  }
};

export default api; 