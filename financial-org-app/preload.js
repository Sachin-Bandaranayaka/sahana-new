const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Member operations
    getMembers: () => ipcRenderer.invoke('get-members'),
    getMember: (id) => ipcRenderer.invoke('get-member', id),
    addMember: (member) => ipcRenderer.invoke('add-member', member),
    updateMember: (id, member) => ipcRenderer.invoke('update-member', id, member),
    deleteMember: (id) => ipcRenderer.invoke('delete-member', id),
    
    // Cash book operations
    getCashBook: (memberId) => ipcRenderer.invoke('get-cash-book', memberId),
    addCashEntry: (entry) => ipcRenderer.invoke('add-cash-entry', entry),
    getCashEntries: (dateRange) => ipcRenderer.invoke('get-cash-entries', dateRange),
    
    // Loan operations
    getLoans: (params) => ipcRenderer.invoke('get-loans', params),
    getActiveLoans: (memberId) => ipcRenderer.invoke('get-active-loans', memberId),
    addLoan: (loan) => ipcRenderer.invoke('add-loan', loan),
    updateLoanPayment: (payment) => ipcRenderer.invoke('update-loan-payment', payment),
    
    // Loan Types operations
    getLoanTypes: () => ipcRenderer.invoke('get-loan-types'),
    addLoanType: (loanType) => ipcRenderer.invoke('add-loan-type', loanType),
    deleteLoanType: (id) => ipcRenderer.invoke('delete-loan-type', id),
    
    // Dividend operations
    getDividendBook: (memberId) => ipcRenderer.invoke('get-dividend-book', memberId),
    addDividendEntry: (entry) => ipcRenderer.invoke('add-dividend-entry', entry),
    getDividendEntries: (dateRange) => ipcRenderer.invoke('get-dividend-entries', dateRange),
    
    // Organization account operations
    getOrganizationAccounts: () => ipcRenderer.invoke('get-organization-accounts'),
    addOrganizationAccount: (account) => ipcRenderer.invoke('add-organization-account', account),
    getBankTransactions: (dateRange) => ipcRenderer.invoke('get-bank-transactions', dateRange),
    addBankTransaction: (transaction) => ipcRenderer.invoke('add-bank-transaction', transaction),
    
    // Dashboard data
    getDashboardData: () => ipcRenderer.invoke('get-dashboard-data'),
    
    // Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    updateSetting: (setting) => ipcRenderer.invoke('update-setting', setting),
    
    // Calculations
    calculateMemberAsset: (memberId) => ipcRenderer.invoke('calculate-member-asset', memberId),
    calculateQuarterlyProfit: (quarter, year) => ipcRenderer.invoke('calculate-quarterly-profit', quarter, year),
    calculateQuarterlyDividendsByYear: (params) => ipcRenderer.invoke('calculate-quarterly-dividends-by-year', params),
    
    // Report operations
    getMemberTransactions: (params) => ipcRenderer.invoke('get-member-transactions', params),
    getQuarterlyProfit: (params) => ipcRenderer.invoke('get-quarterly-profit', params),
    
    // User management
    getUsers: () => ipcRenderer.invoke('get-users'),
    addUser: (user) => ipcRenderer.invoke('add-user', user),
    updateUser: (user) => ipcRenderer.invoke('update-user', user),
    deleteUser: (userId) => ipcRenderer.invoke('delete-user', userId),
    verifyUser: (credentials) => ipcRenderer.invoke('verify-user', credentials),
    changePassword: (userId, oldPassword, newPassword) => ipcRenderer.invoke('changePassword', userId, oldPassword, newPassword),
    
    // Data backup and restore
    backupData: (path) => ipcRenderer.invoke('backup-data', path),
    restoreData: (path) => ipcRenderer.invoke('restore-data', path),
    
    // SMS Services
    sendSMS: (phoneNumber, message) => ipcRenderer.invoke('send-sms', phoneNumber, message),
    getSMSSettings: () => ipcRenderer.invoke('get-sms-settings'),
    updateSMSSettings: (settings) => ipcRenderer.invoke('update-sms-settings', settings)
  }
); 