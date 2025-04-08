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
  }
};

export default api; 