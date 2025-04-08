const { contextBridge, ipcRenderer } = require('electron');

// Log the preload script execution for debugging
console.log('Preload script is running');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Members
    getMembers: () => {
      console.log('Calling getMembers from preload');
      return ipcRenderer.invoke('get-members');
    },
    getMember: (memberId) => ipcRenderer.invoke('get-member', memberId),
    getMemberTransactions: (memberId) => ipcRenderer.invoke('get-member-transactions', memberId),
    addMember: (member) => ipcRenderer.invoke('add-member', member),
    updateMember: (id, member) => ipcRenderer.invoke('update-member', id, member),
    deleteMember: (id) => ipcRenderer.invoke('delete-member', id),
    
    // Loans
    getLoans: () => ipcRenderer.invoke('get-loans'),
    addLoan: (loan) => ipcRenderer.invoke('add-loan', loan),
    updateLoan: (id, loan) => ipcRenderer.invoke('update-loan', id, loan),
    deleteLoan: (id) => ipcRenderer.invoke('delete-loan', id),
    addLoanPayment: (loanId, payment) => ipcRenderer.invoke('add-loan-payment', loanId, payment),
    
    // CashBook
    getCashEntries: () => ipcRenderer.invoke('get-cash-entries'),
    addCashEntry: (entry) => ipcRenderer.invoke('add-cash-entry', entry),
    updateCashEntry: (id, entry) => ipcRenderer.invoke('update-cash-entry', id, entry),
    deleteCashEntry: (id) => ipcRenderer.invoke('delete-cash-entry', id),
    
    // Bank Accounts
    getBankAccounts: () => ipcRenderer.invoke('get-bank-accounts'),
    addBankAccount: (account) => ipcRenderer.invoke('add-bank-account', account),
    updateBankAccount: (id, account) => ipcRenderer.invoke('update-bank-account', id, account),
    deleteBankAccount: (id) => ipcRenderer.invoke('delete-bank-account', id),
    
    // Bank Transactions
    getBankTransactions: (accountId = null) => ipcRenderer.invoke('get-bank-transactions', accountId),
    addBankTransaction: (transaction) => ipcRenderer.invoke('add-bank-transaction', transaction),
    
    // Dividends
    getDividends: () => ipcRenderer.invoke('get-dividends'),
    addDividend: (dividend) => ipcRenderer.invoke('add-dividend', dividend),
    getDividendPayments: (dividendId) => ipcRenderer.invoke('get-dividend-payments', dividendId),
    updateDividendPayment: (id, payment) => ipcRenderer.invoke('update-dividend-payment', id, payment),
    
    // Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),
    
    // Dashboard
    getDashboardData: () => {
      console.log('Calling getDashboardData from preload');
      return ipcRenderer.invoke('get-dashboard-data');
    },
    
    // Backup & Restore
    backupDatabase: (path) => ipcRenderer.invoke('backup-database', path),
    restoreDatabase: (path) => ipcRenderer.invoke('restore-database', path),
    
    // Reports
    generateReport: (reportType, params) => ipcRenderer.invoke('generate-report', reportType, params)
  }
);

// Also expose a simpler way to determine if running in Electron environment
contextBridge.exposeInMainWorld('isElectron', true);

// Log when preload script is completed
console.log('Preload script completed'); 