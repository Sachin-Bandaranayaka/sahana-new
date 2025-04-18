const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let mainWindow;
let db;

// Database setup
async function setupDatabase() {
  db = await open({
    filename: path.join(app.getPath('userData'), 'organization.db'),
    driver: sqlite3.Database
  });
  
  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      contact TEXT,
      joined_date TEXT
    );
    
    CREATE TABLE IF NOT EXISTS cash_book (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      date TEXT,
      description TEXT,
      amount REAL,
      FOREIGN KEY (member_id) REFERENCES members(id)
    );
    
    CREATE TABLE IF NOT EXISTS loan_book (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      date TEXT,
      loan_type TEXT,
      amount_taken REAL,
      amount_paid REAL,
      loan_premium REAL,
      loan_interest REAL,
      total REAL,
      is_active INTEGER DEFAULT 1,
      interest_rate REAL,
      last_interest_paid_date TEXT,
      FOREIGN KEY (member_id) REFERENCES members(id)
    );
    
    CREATE TABLE IF NOT EXISTS loan_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      interest_rate REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS dividend_book (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      date TEXT,
      description TEXT,
      share_amount REAL,
      annual_interest REAL,
      attending_bonus REAL,
      deductibles REAL,
      total REAL,
      quarter INTEGER,
      year INTEGER,
      FOREIGN KEY (member_id) REFERENCES members(id)
    );
    
    CREATE TABLE IF NOT EXISTS organization_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_name TEXT,
      bank_name TEXT,
      account_type TEXT,
      balance REAL,
      interest_rate REAL,
      start_date TEXT,
      maturity_date TEXT
    );
    
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      description TEXT,
      amount REAL,
      transaction_type TEXT,
      account_id INTEGER,
      FOREIGN KEY (account_id) REFERENCES organization_accounts(id)
    );
    
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      value TEXT
    );
    
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      description TEXT,
      attendees TEXT
    );
    
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT,
      last_login TEXT
    );
  `);
  
  // Insert default settings if not present
  const settings = [
    ['member_loan_interest_rate', '9'],
    ['special_loan_interest_rate', '12'],
    ['business_loan_interest_rate', '12'],
    ['quarter_start_month_1', '1'],
    ['quarter_end_month_1', '3'],
    ['quarter_start_month_2', '4'],
    ['quarter_end_month_2', '6'],
    ['quarter_start_month_3', '7'],
    ['quarter_end_month_3', '9'],
    ['quarter_start_month_4', '10'],
    ['quarter_end_month_4', '12']
  ];
  
  for (const [name, value] of settings) {
    await db.run('INSERT OR IGNORE INTO settings (name, value) VALUES (?, ?)', name, value);
  }
  
  // Insert default admin user if not present
  const adminUser = await db.get('SELECT * FROM users WHERE username = ?', 'admin');
  if (!adminUser) {
    await db.run(
      'INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)',
      'admin', 'admin123', 'admin', new Date().toISOString()
    );
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
  });

  // Set Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data:; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https:;"
        ]
      }
    });
  });

  // Disable Autofill features that cause DevTools errors
  mainWindow.webContents.session.webRequest.onBeforeRequest(
    { urls: ['*://*/*'] },
    (details, callback) => {
      callback({ cancel: false });
    }
  );

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, 'client/build/index.html')}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => (mainWindow = null));
}

app.on('ready', async () => {
  // Disable Chrome DevTools Autofill errors
  app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication');
  
  // Log the paths for debugging
  console.log('Main JS directory:', __dirname);
  console.log('Preload path from main:', path.join(__dirname, 'preload.js'));
  console.log('Preload path from client:', path.join(__dirname, 'client/preload.js'));
  
  await setupDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers for database operations
ipcMain.handle('get-members', async () => {
  return await db.all('SELECT * FROM members ORDER BY name');
});

ipcMain.handle('get-member', async (event, memberId) => {
  // First try to find by numeric ID
  let member = await db.get('SELECT * FROM members WHERE id = ?', memberId);
  
  // If not found and memberId is a string, try finding by member_id
  if (!member && typeof memberId === 'string') {
    member = await db.get('SELECT * FROM members WHERE member_id = ?', memberId);
  }
  
  return member;
});

ipcMain.handle('add-member', async (event, member) => {
  // Check if member_id is provided
  const memberData = { ...member };

  if (memberData.member_id) {
    // Use the provided member_id
    const result = await db.run(
      'INSERT INTO members (member_id, name, address, phone, joinDate, status) VALUES (?, ?, ?, ?, ?, ?)',
      memberData.member_id, memberData.name, memberData.address, memberData.phone, 
      memberData.joinDate, memberData.status || 'active'
    );
    return { id: result.lastID, ...memberData };
  } else {
    // Let the database generate an ID first, then we'll update with formatted member_id
    const result = await db.run(
      'INSERT INTO members (name, address, phone, joinDate, status) VALUES (?, ?, ?, ?, ?)',
      memberData.name, memberData.address, memberData.phone, 
      memberData.joinDate, memberData.status || 'active'
    );
    
    const newId = result.lastID;
    const generatedMemberId = `M${String(newId).padStart(4, '0')}`;
    
    await db.run('UPDATE members SET member_id = ? WHERE id = ?', generatedMemberId, newId);
    memberData.member_id = generatedMemberId;
    
    return { id: newId, ...memberData };
  }
});

ipcMain.handle('update-member', async (event, id, member) => {
  await db.run(
    'UPDATE members SET member_id = ?, name = ?, address = ?, phone = ?, joinDate = ?, status = ? WHERE id = ?',
    member.member_id, member.name, member.address, member.phone, member.joinDate, member.status || 'active', id
  );
  return { id, ...member };
});

ipcMain.handle('delete-member', async (event, id) => {
  await db.run('DELETE FROM members WHERE id = ?', id);
  return { success: true };
});

ipcMain.handle('get-member-transactions', async (event, memberId) => {
  // Fetch all types of transactions for a member (cash, loans, dividends)
  const cashEntries = await db.all('SELECT id, date, description, amount, "cash" as type FROM cashbook WHERE memberId = ?', memberId);
  const loanEntries = await db.all('SELECT id, date, amount as amount, "loan" as type FROM loans WHERE memberId = ?', memberId);
  const dividendEntries = await db.all('SELECT id, date, amount as amount, "dividend" as type FROM dividend_payments WHERE memberId = ?', memberId);
  
  // Fetch loan payments
  const loanPayments = await db.all(`
    SELECT p.id, p.date, p.note as description, p.amount, "loan_payment" as type 
    FROM loan_payments p
    JOIN loans l ON p.loanId = l.id
    WHERE l.memberId = ?
  `, memberId);
  
  // Combine all transactions and sort by date
  const allTransactions = [...cashEntries, ...loanEntries, ...dividendEntries, ...loanPayments];
  return allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
});

ipcMain.handle('get-cash-book', async (event, memberId) => {
  return await db.all('SELECT * FROM cash_book WHERE member_id = ?', memberId);
});

ipcMain.handle('get-cash-entries', async (event, dateRange) => {
  return await db.all(
    'SELECT * FROM cash_book WHERE date >= ? AND date <= ? ORDER BY date DESC',
    dateRange.startDate, dateRange.endDate
  );
});

ipcMain.handle('get-loans', async (event, params) => {
  if (params && params.startDate && params.endDate) {
    return await db.all(
      'SELECT l.*, m.name as member_name FROM loan_book l JOIN members m ON l.member_id = m.id WHERE date >= ? AND date <= ? ORDER BY date DESC',
      params.startDate, params.endDate
    );
  } else if (params && params.memberId) {
    return await db.all('SELECT * FROM loan_book WHERE member_id = ?', params.memberId);
  } else {
    return await db.all('SELECT l.*, m.name as member_name FROM loan_book l JOIN members m ON l.member_id = m.id');
  }
});

ipcMain.handle('get-active-loans', async (event, memberId) => {
  return await db.all('SELECT * FROM loan_book WHERE member_id = ? AND is_active = 1', memberId);
});

ipcMain.handle('add-loan', async (event, loan) => {
  const result = await db.run(
    `INSERT INTO loan_book 
     (member_id, date, loan_type, amount_taken, amount_paid, loan_premium, loan_interest, total, interest_rate, last_interest_paid_date) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    loan.member_id, loan.date, loan.loan_type, loan.amount_taken, 0, 0, 0, loan.amount_taken, loan.interest_rate, loan.date
  );
  return { id: result.lastID, ...loan };
});

ipcMain.handle('update-loan-payment', async (event, payment) => {
  // Get current loan details
  const loan = await db.get('SELECT * FROM loan_book WHERE id = ?', payment.loan_id);
  
  // Calculate interest based on days since last payment
  const lastPaidDate = new Date(loan.last_interest_paid_date);
  const paymentDate = new Date(payment.date);
  const daysDiff = Math.floor((paymentDate - lastPaidDate) / (1000 * 60 * 60 * 24));
  
  const interestRate = loan.interest_rate / 100;
  const dailyInterest = interestRate / 365;
  const interestAmount = loan.total * dailyInterest * daysDiff;
  
  // Update loan record
  const newPremium = loan.loan_premium + payment.premium_amount;
  const newInterest = loan.loan_interest + payment.interest_amount;
  const newAmountPaid = loan.amount_paid + payment.premium_amount + payment.interest_amount;
  const newTotal = loan.amount_taken - newPremium;
  
  await db.run(
    `UPDATE loan_book SET 
     amount_paid = ?, loan_premium = ?, loan_interest = ?, total = ?, 
     last_interest_paid_date = ?, is_active = ?
     WHERE id = ?`,
    newAmountPaid, newPremium, newInterest, newTotal, 
    payment.date, newTotal > 0 ? 1 : 0, payment.loan_id
  );
  
  return { success: true };
});

ipcMain.handle('get-dividend-book', async (event, memberId) => {
  return await db.all('SELECT * FROM dividend_book WHERE member_id = ?', memberId);
});

ipcMain.handle('add-dividend-entry', async (event, entry) => {
  const result = await db.run(
    `INSERT INTO dividend_book 
     (member_id, date, description, share_amount, annual_interest, attending_bonus, deductibles, total, quarter, year) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.member_id, entry.date, entry.description, entry.share_amount, entry.annual_interest, 
    entry.attending_bonus, entry.deductibles, entry.total, entry.quarter, entry.year
  );
  return { id: result.lastID, ...entry };
});

ipcMain.handle('get-dividend-entries', async (event, dateRange) => {
  return await db.all(
    'SELECT d.*, m.name as member_name FROM dividend_book d JOIN members m ON d.member_id = m.id WHERE date >= ? AND date <= ? ORDER BY date DESC',
    dateRange.startDate, dateRange.endDate
  );
});

ipcMain.handle('get-organization-accounts', async () => {
  return await db.all('SELECT * FROM organization_accounts');
});

ipcMain.handle('add-organization-account', async (event, account) => {
  const result = await db.run(
    `INSERT INTO organization_accounts 
     (account_name, bank_name, account_type, balance, interest_rate, start_date, maturity_date) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    account.account_name, account.bank_name, account.account_type, 
    account.balance, account.interest_rate, account.start_date, account.maturity_date
  );
  return { id: result.lastID, ...account };
});

ipcMain.handle('get-bank-transactions', async (event, dateRange) => {
  return await db.all(
    `SELECT t.*, a.account_name, a.bank_name 
     FROM transactions t 
     JOIN organization_accounts a ON t.account_id = a.id 
     WHERE t.date >= ? AND t.date <= ? 
     ORDER BY t.date DESC`,
    dateRange.startDate, dateRange.endDate
  );
});

ipcMain.handle('add-bank-transaction', async (event, transaction) => {
  const result = await db.run(
    'INSERT INTO transactions (date, description, amount, transaction_type, account_id) VALUES (?, ?, ?, ?, ?)',
    transaction.date, transaction.description, transaction.amount, transaction.transaction_type, transaction.account_id
  );
  
  // Update account balance
  await db.run(
    'UPDATE organization_accounts SET balance = balance + ? WHERE id = ?',
    transaction.amount, transaction.account_id
  );
  
  return { id: result.lastID, ...transaction };
});

ipcMain.handle('get-dashboard-data', async () => {
  const totalMembers = await db.get('SELECT COUNT(*) as count FROM members');
  const totalCashBook = await db.get('SELECT SUM(amount) as total FROM cash_book');
  const totalActiveLoans = await db.get('SELECT COUNT(*) as count FROM loan_book WHERE is_active = 1');
  const totalLoanAmount = await db.get('SELECT SUM(total) as total FROM loan_book WHERE is_active = 1');
  const totalBankBalance = await db.get('SELECT SUM(balance) as total FROM organization_accounts');
  
  // Generate mock data for charts until we have real data
  const recentTransactions = [
    { month: 'Jan', income: 50000, expense: 30000 },
    { month: 'Feb', income: 60000, expense: 35000 },
    { month: 'Mar', income: 45000, expense: 25000 },
    { month: 'Apr', income: 70000, expense: 40000 },
    { month: 'May', income: 65000, expense: 38000 },
    { month: 'Jun', income: 80000, expense: 45000 }
  ];
  
  // Asset distribution data
  const assetDistribution = [
    { name: 'Cash In Hand', value: totalCashBook?.total || 0 },
    { name: 'Bank Deposits', value: totalBankBalance?.total || 0 },
    { name: 'Outstanding Loans', value: totalLoanAmount?.total || 0 }
  ];
  
  return {
    totalMembers: totalMembers.count,
    cashBook: {
      totalContributions: totalCashBook?.total || 0,
    },
    loans: {
      active: totalActiveLoans.count,
      amount: totalLoanAmount?.total || 0,
    },
    bankBalance: totalBankBalance?.total || 0,
    recentTransactions: recentTransactions,
    assetDistribution: assetDistribution
  };
});

ipcMain.handle('get-settings', async () => {
  return await db.all('SELECT * FROM settings');
});

ipcMain.handle('update-setting', async (event, setting) => {
  await db.run('UPDATE settings SET value = ? WHERE name = ?', setting.value, setting.name);
  return { success: true };
});

// MEMBER ASSET CALCULATION
ipcMain.handle('calculate-member-asset', async (event, memberId) => {
  return new Promise((resolve, reject) => {
    try {
      // First get member's cash book total
      db.get(
        `SELECT COALESCE(SUM(amount), 0) as cashTotal 
         FROM cash_book 
         WHERE member_id = ?`,
        [memberId],
        (err, cashResult) => {
          if (err) {
            reject(err);
            return;
          }

          // Then get member's dividend book total
          db.get(
            `SELECT COALESCE(SUM(total), 0) as dividendTotal 
             FROM dividend_book 
             WHERE member_id = ?`,
            [memberId],
            (err, dividendResult) => {
              if (err) {
                reject(err);
                return;
              }

              const cashTotal = cashResult ? cashResult.cashTotal : 0;
              const dividendTotal = dividendResult ? dividendResult.dividendTotal : 0;
              const totalAsset = cashTotal + dividendTotal;

              resolve({
                cashTotal: cashTotal,
                dividendTotal: dividendTotal,
                totalAsset: totalAsset
              });
            }
          );
        }
      );
    } catch (error) {
      reject(error);
    }
  });
});

ipcMain.handle('calculate-quarterly-profit', async (event, quarter, year) => {
  // Get loan interest for the quarter
  const loanInterestQuery = await db.get(
    'SELECT SUM(loan_interest) as total FROM loan_book WHERE strftime("%m", date) >= ? AND strftime("%m", date) <= ? AND strftime("%Y", date) = ?',
    quarter * 3 - 2, quarter * 3, year
  );
  
  // Get other income and expenses
  // This is simplified - in a real app you'd have more detailed calculations
  const fixedDepositInterest = await db.get(
    'SELECT SUM(amount) as total FROM transactions WHERE transaction_type = "fixed_deposit_interest" AND strftime("%m", date) >= ? AND strftime("%m", date) <= ? AND strftime("%Y", date) = ?',
    quarter * 3 - 2, quarter * 3, year
  );
  
  const savingsInterest = await db.get(
    'SELECT SUM(amount) as total FROM transactions WHERE transaction_type = "savings_interest" AND strftime("%m", date) >= ? AND strftime("%m", date) <= ? AND strftime("%Y", date) = ?',
    quarter * 3 - 2, quarter * 3, year
  );
  
  const expenses = await db.get(
    'SELECT SUM(amount) as total FROM transactions WHERE transaction_type = "expense" AND strftime("%m", date) >= ? AND strftime("%m", date) <= ? AND strftime("%Y", date) = ?',
    quarter * 3 - 2, quarter * 3, year
  );
  
  const otherIncome = await db.get(
    'SELECT SUM(amount) as total FROM transactions WHERE transaction_type = "other_income" AND strftime("%m", date) >= ? AND strftime("%m", date) <= ? AND strftime("%Y", date) = ?',
    quarter * 3 - 2, quarter * 3, year
  );
  
  // Calculate net profit
  const netProfit = (loanInterestQuery.total || 0) + 
                    (fixedDepositInterest.total || 0) + 
                    (savingsInterest.total || 0) + 
                    (otherIncome.total || 0) - 
                    (expenses.total || 0);
  
  return {
    loanInterest: loanInterestQuery.total || 0,
    fixedDepositInterest: fixedDepositInterest.total || 0,
    savingsInterest: savingsInterest.total || 0,
    expenses: expenses.total || 0,
    otherIncome: otherIncome.total || 0,
    netProfit: netProfit
  };
});

ipcMain.handle('get-quarterly-profit', async (event, params) => {
  const { startDate, endDate } = params;
  
  // Get loan interest for the period
  const loanInterest = await db.get(
    `SELECT SUM(loan_interest) as total 
     FROM loan_book 
     WHERE last_interest_paid_date >= ? AND last_interest_paid_date <= ?`,
    startDate, endDate
  );
  
  // Get penalties
  const penalties = await db.get(
    `SELECT SUM(amount) as total 
     FROM transactions 
     WHERE transaction_type = 'penalty' AND date >= ? AND date <= ?`,
    startDate, endDate
  );
  
  // Get service fees
  const serviceFees = await db.get(
    `SELECT SUM(amount) as total 
     FROM transactions 
     WHERE transaction_type = 'service_fee' AND date >= ? AND date <= ?`,
    startDate, endDate
  );
  
  // Get other income
  const otherIncome = await db.get(
    `SELECT SUM(amount) as total 
     FROM transactions 
     WHERE transaction_type = 'other_income' AND date >= ? AND date <= ?`,
    startDate, endDate
  );
  
  // Get operating costs
  const operatingCosts = await db.get(
    `SELECT SUM(amount) as total 
     FROM transactions 
     WHERE transaction_type = 'operating_cost' AND date >= ? AND date <= ?`,
    startDate, endDate
  );
  
  // Get bank fees
  const bankFees = await db.get(
    `SELECT SUM(amount) as total 
     FROM transactions 
     WHERE transaction_type = 'bank_fee' AND date >= ? AND date <= ?`,
    startDate, endDate
  );
  
  // Get other expenses
  const otherExpenses = await db.get(
    `SELECT SUM(amount) as total 
     FROM transactions 
     WHERE transaction_type = 'other_expense' AND date >= ? AND date <= ?`,
    startDate, endDate
  );
  
  // Calculate totals
  const totalIncome = (loanInterest.total || 0) + 
                      (penalties.total || 0) + 
                      (serviceFees.total || 0) + 
                      (otherIncome.total || 0);
                      
  const totalExpenses = (operatingCosts.total || 0) + 
                       (bankFees.total || 0) + 
                       (otherExpenses.total || 0);
                       
  const profit = totalIncome - totalExpenses;
  
  return {
    income: {
      loanInterest: loanInterest.total || 0,
      penalties: penalties.total || 0,
      serviceFees: serviceFees.total || 0,
      otherIncome: otherIncome.total || 0
    },
    expenses: {
      operatingCosts: operatingCosts.total || 0,
      bankFees: bankFees.total || 0,
      otherExpenses: otherExpenses.total || 0
    },
    summary: {
      totalIncome: totalIncome,
      totalExpenses: totalExpenses,
      profit: profit
    }
  };
});

// User management
ipcMain.handle('get-users', async () => {
  return await db.all('SELECT id, username, role, created_at, last_login FROM users');
});

ipcMain.handle('add-user', async (event, user) => {
  // In a real app, you'd hash the password
  const result = await db.run(
    'INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)',
    user.username, user.password, user.role || 'user', new Date().toISOString()
  );
  return { id: result.lastID, username: user.username, role: user.role || 'user' };
});

ipcMain.handle('update-user', async (event, user) => {
  if (user.password) {
    // Update with new password
    await db.run(
      'UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?',
      user.username, user.password, user.role, user.id
    );
  } else {
    // Update without changing password
    await db.run(
      'UPDATE users SET username = ?, role = ? WHERE id = ?',
      user.username, user.role, user.id
    );
  }
  return { success: true, id: user.id };
});

ipcMain.handle('delete-user', async (event, userId) => {
  await db.run('DELETE FROM users WHERE id = ?', userId);
  return { success: true };
});

ipcMain.handle('verify-user', async (event, credentials) => {
  const user = await db.get(
    'SELECT id, username, role FROM users WHERE username = ? AND password = ?',
    credentials.username, credentials.password
  );
  
  if (user) {
    // Update last login time
    await db.run(
      'UPDATE users SET last_login = ? WHERE id = ?',
      new Date().toISOString(), user.id
    );
    return { success: true, user };
  }
  return { success: false, message: 'Invalid username or password' };
});

ipcMain.handle('changePassword', async (event, userId, oldPassword, newPassword) => {
  // First verify the old password
  const user = await db.get(
    'SELECT id, username FROM users WHERE id = ? AND password = ?',
    userId, oldPassword
  );
  
  if (!user) {
    return { success: false, message: 'Current password is incorrect' };
  }
  
  // Update to the new password
  await db.run(
    'UPDATE users SET password = ? WHERE id = ?',
    newPassword, userId
  );
  
  return { success: true, message: 'Password changed successfully' };
});

// Data backup and restore
ipcMain.handle('backup-data', async (event, filePath) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Get all data from tables
    const members = await db.all('SELECT * FROM members');
    const cashBook = await db.all('SELECT * FROM cash_book');
    const loanBook = await db.all('SELECT * FROM loan_book');
    const dividendBook = await db.all('SELECT * FROM dividend_book');
    const accounts = await db.all('SELECT * FROM organization_accounts');
    const transactions = await db.all('SELECT * FROM transactions');
    const settings = await db.all('SELECT * FROM settings');
    const meetings = await db.all('SELECT * FROM meetings');
    
    const data = {
      members,
      cashBook,
      loanBook,
      dividendBook,
      accounts,
      transactions,
      settings,
      meetings,
      backupDate: new Date().toISOString()
    };
    
    // Write to file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    return { success: true, message: 'Backup created successfully' };
  } catch (error) {
    console.error('Backup error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('restore-data', async (event, filePath) => {
  const fs = require('fs');
  
  try {
    // Read backup file
    const backup = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Begin transaction
    await db.run('BEGIN TRANSACTION');
    
    // Clear existing data
    await db.run('DELETE FROM members');
    await db.run('DELETE FROM cash_book');
    await db.run('DELETE FROM loan_book');
    await db.run('DELETE FROM dividend_book');
    await db.run('DELETE FROM organization_accounts');
    await db.run('DELETE FROM transactions');
    await db.run('DELETE FROM settings');
    await db.run('DELETE FROM meetings');
    
    // Restore members
    for (const member of backup.members) {
      await db.run(
        'INSERT INTO members (id, member_id, name, address, contact, joined_date) VALUES (?, ?, ?, ?, ?, ?)',
        member.id, member.member_id, member.name, member.address, member.contact, member.joined_date
      );
    }
    
    // Restore cash book
    for (const entry of backup.cashBook) {
      await db.run(
        'INSERT INTO cash_book (id, member_id, date, description, amount) VALUES (?, ?, ?, ?, ?)',
        entry.id, entry.member_id, entry.date, entry.description, entry.amount
      );
    }
    
    // Restore loan book
    for (const loan of backup.loanBook) {
      await db.run(
        `INSERT INTO loan_book 
         (id, member_id, date, loan_type, amount_taken, amount_paid, loan_premium, loan_interest, 
          total, is_active, interest_rate, last_interest_paid_date) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        loan.id, loan.member_id, loan.date, loan.loan_type, loan.amount_taken, 
        loan.amount_paid, loan.loan_premium, loan.loan_interest, loan.total, 
        loan.is_active, loan.interest_rate, loan.last_interest_paid_date
      );
    }
    
    // Restore dividend book
    for (const entry of backup.dividendBook) {
      await db.run(
        `INSERT INTO dividend_book 
         (id, member_id, date, description, share_amount, annual_interest, 
          attending_bonus, deductibles, total, quarter, year) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        entry.id, entry.member_id, entry.date, entry.description, entry.share_amount, 
        entry.annual_interest, entry.attending_bonus, entry.deductibles, entry.total, 
        entry.quarter, entry.year
      );
    }
    
    // Restore accounts
    for (const account of backup.accounts) {
      await db.run(
        `INSERT INTO organization_accounts 
         (id, account_name, bank_name, account_type, balance, interest_rate, start_date, maturity_date) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        account.id, account.account_name, account.bank_name, account.account_type, 
        account.balance, account.interest_rate, account.start_date, account.maturity_date
      );
    }
    
    // Restore transactions
    for (const transaction of backup.transactions) {
      await db.run(
        'INSERT INTO transactions (id, date, description, amount, transaction_type, account_id) VALUES (?, ?, ?, ?, ?, ?)',
        transaction.id, transaction.date, transaction.description, transaction.amount, 
        transaction.transaction_type, transaction.account_id
      );
    }
    
    // Restore settings
    for (const setting of backup.settings) {
      await db.run(
        'INSERT INTO settings (id, name, value) VALUES (?, ?, ?)',
        setting.id, setting.name, setting.value
      );
    }
    
    // Restore meetings
    for (const meeting of backup.meetings) {
      await db.run(
        'INSERT INTO meetings (id, date, description, attendees) VALUES (?, ?, ?, ?)',
        meeting.id, meeting.date, meeting.description, meeting.attendees
      );
    }
    
    // Commit transaction
    await db.run('COMMIT');
    
    return { success: true, message: 'Data restored successfully' };
  } catch (error) {
    // Rollback in case of error
    await db.run('ROLLBACK');
    console.error('Restore error:', error);
    return { success: false, message: error.message };
  }
});

// Report Generation
ipcMain.handle('generate-report', async (event, reportType, params) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { dialog } = require('electron');
    
    console.log(`Generating ${reportType} report with params:`, params);
    
    // Show save dialog to get output location
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Report',
      defaultPath: `${reportType}-report.${params.format === 'pdf' ? 'pdf' : 'xlsx'}`,
      filters: [{ 
        name: params.format === 'pdf' ? 'PDF Documents' : 'Excel Spreadsheets', 
        extensions: [params.format === 'pdf' ? 'pdf' : 'xlsx'] 
      }]
    });
    
    if (canceled || !filePath) {
      return { success: false, message: 'Report generation cancelled' };
    }
    
    // Generate report data based on type
    let reportData = { reportType, generatedAt: new Date().toISOString() };
    
    switch (reportType) {
      case 'member-statement':
        // Get member data
        const member = await db.get('SELECT * FROM members WHERE id = ?', params.memberId);
        if (!member) {
          return { success: false, message: 'Member not found' };
        }
        
        // Get member transactions
        const transactions = await db.all(
          'SELECT * FROM transactions WHERE member_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC',
          params.memberId, params.startDate, params.endDate
        );
        
        reportData.member = member;
        reportData.transactions = transactions || [];
        reportData.title = `Member Statement - ${member.name}`;
        break;
        
      case 'cash-flow':
        // Get income and expense transactions
        const income = await db.all(
          "SELECT type, SUM(amount) as total FROM transactions WHERE type = 'income' AND date BETWEEN ? AND ? GROUP BY category",
          params.startDate, params.endDate
        );
        
        const expenses = await db.all(
          "SELECT type, SUM(amount) as total FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ? GROUP BY category",
          params.startDate, params.endDate
        );
        
        reportData.income = income || [];
        reportData.expenses = expenses || [];
        reportData.title = 'Cash Flow Report';
        break;
        
      case 'loan-summary':
        // Get active loans
        const loans = await db.all('SELECT * FROM loans WHERE status = "active"');
        
        // Get loan payments in the period
        const payments = await db.all(
          'SELECT * FROM loan_payments WHERE payment_date BETWEEN ? AND ?',
          params.startDate, params.endDate
        );
        
        reportData.loans = loans || [];
        reportData.payments = payments || [];
        reportData.title = 'Loan Summary Report';
        break;
        
      case 'quarterly-profit':
        // Get profit components
        const interest = await db.get(
          "SELECT SUM(amount) as total FROM transactions WHERE type = 'income' AND category = 'interest' AND date BETWEEN ? AND ?",
          params.startDate, params.endDate
        );
        
        const otherIncome = await db.get(
          "SELECT SUM(amount) as total FROM transactions WHERE type = 'income' AND category != 'interest' AND date BETWEEN ? AND ?",
          params.startDate, params.endDate
        );
        
        const expensesTotal = await db.get(
          "SELECT SUM(amount) as total FROM transactions WHERE type = 'expense' AND date BETWEEN ? AND ?",
          params.startDate, params.endDate
        );
        
        const totalIncome = (interest?.total || 0) + (otherIncome?.total || 0);
        const totalExpenses = expensesTotal?.total || 0;
        const netProfit = totalIncome - totalExpenses;
        
        reportData.profit = {
          interest: interest?.total || 0,
          otherIncome: otherIncome?.total || 0,
          expenses: totalExpenses,
          totalIncome,
          netProfit
        };
        reportData.title = 'Quarterly Profit Report';
        break;
        
      case 'balance-sheet':
        // Get assets
        const assets = await db.get(
          "SELECT SUM(CASE WHEN type = 'loan' THEN balance ELSE 0 END) as loans, " +
          "SUM(CASE WHEN type = 'bank' THEN balance ELSE 0 END) as bank " +
          "FROM accounts"
        );
        
        // Get liabilities
        const liabilities = await db.get(
          "SELECT SUM(amount) as total FROM liabilities"
        );
        
        // Get equity
        const equity = await db.get(
          "SELECT SUM(amount) as total FROM equity"
        );
        
        reportData.balanceSheet = {
          assets: {
            loans: assets?.loans || 0,
            bank: assets?.bank || 0,
            total: (assets?.loans || 0) + (assets?.bank || 0)
          },
          liabilities: liabilities?.total || 0,
          equity: equity?.total || 0
        };
        reportData.title = 'Balance Sheet Report';
        break;
        
      default:
        return { success: false, message: 'Invalid report type' };
    }
    
    // Add period to report data
    reportData.period = {
      startDate: params.startDate,
      endDate: params.endDate
    };
    
    // For demo purposes, just write the JSON to a file
    // In a real implementation, you would convert this to PDF or Excel
    fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
    
    console.log(`Report saved to ${filePath}`);
    
    return { 
      success: true, 
      message: `Report generated successfully and saved to ${filePath}`,
      filePath
    };
  } catch (error) {
    console.error('Error generating report:', error);
    return { success: false, message: error.message };
  }
});

// ORGANIZATION ASSETS CALCULATION
ipcMain.handle('calculate-org-assets', async (event) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Calculate total cash contributions
      const cashContributions = await db.get(
        `SELECT COALESCE(SUM(amount), 0) as total FROM cash_book`
      );
      
      // Calculate total bank balances
      const bankBalances = await db.get(
        `SELECT COALESCE(SUM(balance), 0) as total FROM organization_accounts`
      );
      
      // Calculate total outstanding loans
      const outstandingLoans = await db.get(
        `SELECT COALESCE(SUM(total), 0) as total FROM loan_book WHERE is_active = 1`
      );
      
      // Calculate total assets
      const totalAssets = (cashContributions.total || 0) + 
                          (bankBalances.total || 0) + 
                          (outstandingLoans.total || 0);
      
      resolve({
        cashContributions: cashContributions.total || 0,
        bankBalances: bankBalances.total || 0,
        outstandingLoans: outstandingLoans.total || 0,
        totalAssets: totalAssets
      });
    } catch (error) {
      console.error('Error calculating organization assets:', error);
      reject(error);
    }
  });
});

// PROPORTIONAL DIVIDEND CALCULATION
ipcMain.handle('calculate-proportional-dividends', async (event, { quarterlyProfit, dividendRate, quarter, year }) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Calculate the dividend pool from quarterly profit
      const dividendPool = quarterlyProfit * (dividendRate / 100);
      
      // Get all active members
      const activeMembers = await db.all('SELECT * FROM members WHERE status = "active"');
      
      // Calculate total organization assets directly
      const cashContributions = await db.get(
        `SELECT COALESCE(SUM(amount), 0) as total FROM cash_book`
      );
      
      const bankBalances = await db.get(
        `SELECT COALESCE(SUM(balance), 0) as total FROM organization_accounts`
      );
      
      const outstandingLoans = await db.get(
        `SELECT COALESCE(SUM(total), 0) as total FROM loan_book WHERE is_active = 1`
      );
      
      const totalOrgAssets = (cashContributions.total || 0) + 
                           (bankBalances.total || 0) + 
                           (outstandingLoans.total || 0);
      
      const orgAssets = {
        cashContributions: cashContributions.total || 0,
        bankBalances: bankBalances.total || 0,
        outstandingLoans: outstandingLoans.total || 0,
        totalAssets: totalOrgAssets
      };
      
      // Calculate dividend for each member based on their proportion of the total assets
      const dividends = await Promise.all(activeMembers.map(async (member) => {
        try {
          // Calculate member's total assets directly
          const cashResult = await db.get(
            `SELECT COALESCE(SUM(amount), 0) as cashTotal 
             FROM cash_book 
             WHERE member_id = ?`,
            [member.id]
          );
          
          const dividendResult = await db.get(
            `SELECT COALESCE(SUM(total), 0) as dividendTotal 
             FROM dividend_book 
             WHERE member_id = ?`,
            [member.id]
          );
          
          const cashTotal = cashResult ? cashResult.cashTotal : 0;
          const dividendTotal = dividendResult ? dividendResult.dividendTotal : 0;
          const memberAssets = cashTotal + dividendTotal;
          
          // Calculate proportion
          const proportion = orgAssets.totalAssets > 0 ? memberAssets / orgAssets.totalAssets : 0;
          
          // Calculate dividend amount based on proportion
          const dividendAmount = proportion * dividendPool;
          
          return {
            memberId: member.id,
            memberName: member.name,
            memberAssets: memberAssets,
            proportion: proportion,
            dividendAmount: dividendAmount
          };
        } catch (error) {
          console.error(`Error calculating dividend for member ${member.id}:`, error);
          return {
            memberId: member.id,
            memberName: member.name,
            memberAssets: 0,
            proportion: 0,
            dividendAmount: 0,
            error: error.message
          };
        }
      }));
      
      // Total calculated to verify
      const totalCalculatedDividend = dividends.reduce((sum, div) => sum + (div.dividendAmount || 0), 0);
      
      resolve({
        quarterlyProfit,
        dividendRate,
        dividendPool,
        totalOrganizationAssets: orgAssets.totalAssets,
        dividends,
        totalCalculatedDividend
      });
    } catch (error) {
      console.error('Error calculating proportional dividends:', error);
      reject(error);
    }
  });
});

// Loan Types handlers
ipcMain.handle('get-loan-types', async () => {
  return await db.all('SELECT * FROM loan_types ORDER BY name');
});

ipcMain.handle('add-loan-type', async (event, loanType) => {
  const result = await db.run(
    'INSERT INTO loan_types (name, interest_rate) VALUES (?, ?)',
    loanType.name, loanType.interestRate
  );
  return { id: result.lastID, ...loanType };
});

ipcMain.handle('delete-loan-type', async (event, id) => {
  // First check if any loans are using this loan type
  const loans = await db.all('SELECT COUNT(*) as count FROM loan_book WHERE loan_type = ?', id);
  if (loans[0].count > 0) {
    throw new Error('Cannot delete loan type that is in use');
  }
  
  await db.run('DELETE FROM loan_types WHERE id = ?', id);
  return { success: true };
}); 