const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const axios = require('axios');
const https = require('https');

let mainWindow;
let db;

// Backup scheduler variables
let backupScheduler = null;
let nextScheduledBackup = null;

// Function to get a specific setting from the database
async function getSetting(name, defaultValue = '') {
  try {
    const setting = await db.get('SELECT value FROM settings WHERE name = ?', name);
    return setting ? setting.value : defaultValue;
  } catch (error) {
    console.error(`Error getting setting ${name}:`, error);
    return defaultValue;
  }
}

// Function to load auto backup settings
async function loadAutoBackupSettings() {
  try {
    const autoBackupEnabled = await getSetting('auto_backup_enabled', 'false');
    const autoBackupFrequency = await getSetting('auto_backup_frequency', 'weekly');
    const autoBackupTime = await getSetting('auto_backup_time', '00:00');
    const autoBackupPath = await getSetting('auto_backup_path', '');
    
    return {
      enabled: autoBackupEnabled === 'true',
      frequency: autoBackupFrequency,
      time: autoBackupTime,
      path: autoBackupPath,
      lastBackup: await getSetting('last_auto_backup', '')
    };
  } catch (error) {
    console.error('Error loading auto backup settings:', error);
    return {
      enabled: false,
      frequency: 'weekly',
      time: '00:00',
      path: '',
      lastBackup: ''
    };
  }
}

// Function to calculate the next backup time based on settings
function calculateNextBackupTime(settings) {
  if (!settings.enabled || !settings.path) {
    console.log('Auto backup disabled or path not set');
    return null;
  }
  
  const now = new Date();
  const [hours, minutes] = settings.time.split(':').map(Number);
  
  // Create a date object for today at the specified time
  const scheduledTime = new Date(now);
  scheduledTime.setHours(hours, minutes, 0, 0);
  
  // If the time has already passed today, we need to schedule for the future
  if (scheduledTime <= now) {
    // For daily backups, schedule for tomorrow
    if (settings.frequency === 'daily') {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    // For weekly backups, schedule for next week
    else if (settings.frequency === 'weekly') {
      scheduledTime.setDate(scheduledTime.getDate() + 7);
    }
    // For monthly backups, schedule for next month
    else if (settings.frequency === 'monthly') {
      scheduledTime.setMonth(scheduledTime.getMonth() + 1);
    }
  } else {
    // If time hasn't passed today, but we're on a weekly/monthly schedule,
    // check if we need to schedule it further in the future
    
    // For weekly backups, if the last backup was less than a week ago, schedule for next week
    if (settings.frequency === 'weekly' && settings.lastBackup) {
      const lastBackup = new Date(settings.lastBackup);
      const daysSinceLastBackup = Math.floor((now - lastBackup) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastBackup < 7) {
        // Find the next backup date (lastBackup + 7 days)
        const nextBackupDate = new Date(lastBackup);
        nextBackupDate.setDate(nextBackupDate.getDate() + 7);
        // Set the correct time
        nextBackupDate.setHours(hours, minutes, 0, 0);
        
        // If this date is in the future, use it
        if (nextBackupDate > now) {
          return nextBackupDate;
        }
      }
    }
    
    // For monthly backups, if the last backup was less than a month ago, schedule for next month
    if (settings.frequency === 'monthly' && settings.lastBackup) {
      const lastBackup = new Date(settings.lastBackup);
      const daysSinceLastBackup = Math.floor((now - lastBackup) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastBackup < 28) {
        // Find the next backup date (lastBackup + 1 month)
        const nextBackupDate = new Date(lastBackup);
        nextBackupDate.setMonth(nextBackupDate.getMonth() + 1);
        // Set the correct time
        nextBackupDate.setHours(hours, minutes, 0, 0);
        
        // If this date is in the future, use it
        if (nextBackupDate > now) {
          return nextBackupDate;
        }
      }
    }
  }
  
  return scheduledTime;
}

// Function to perform the automatic backup
async function performAutomaticBackup() {
  try {
    console.log('Starting automatic backup process...');
    
    // Load settings
    const settings = await loadAutoBackupSettings();
    
    if (!settings.enabled || !settings.path) {
      console.log('Auto backup is disabled or path not set. Skipping automatic backup.');
      return { success: false, message: 'Auto backup is disabled or path not set' };
    }
    
    const fs = require('fs');
    const path = require('path');
    
    // Create the backup path if it doesn't exist
    let filePath = settings.path;
    try {
      // Check if the path is a directory
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        // If it's a directory, append a filename with date
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        filePath = path.join(filePath, `sahana_backup_${date}.json`);
      }
    } catch (err) {
      // Path doesn't exist, which is fine for a new file
      // Just make sure the directory exists
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        try {
          fs.mkdirSync(dirPath, { recursive: true });
        } catch (mkdirErr) {
          console.error('Error creating directory:', mkdirErr);
          return { success: false, error: `Unable to create directory: ${dirPath}` };
        }
      }
    }
    
    // Get all data from tables
    const members = await db.all('SELECT * FROM members');
    const cashBook = await db.all('SELECT * FROM cash_book');
    const loanBook = await db.all('SELECT * FROM loan_book');
    const dividendBook = await db.all('SELECT * FROM dividend_book');
    const accounts = await db.all('SELECT * FROM organization_accounts');
    const transactions = await db.all('SELECT * FROM transactions');
    const settingsData = await db.all('SELECT * FROM settings');
    const meetings = await db.all('SELECT * FROM meetings');
    
    const data = {
      members,
      cashBook,
      loanBook,
      dividendBook,
      accounts,
      transactions,
      settings: settingsData,
      meetings,
      backupDate: new Date().toISOString()
    };
    
    // Write to file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    // Update last backup time in settings
    await db.run('INSERT OR REPLACE INTO settings (name, value) VALUES (?, ?)', 
                ['last_auto_backup', new Date().toISOString()]);
    
    // Log success
    console.log(`Automatic backup completed successfully at ${filePath}`);
    
    // Schedule next backup
    scheduleNextBackup();
    
    return { success: true, message: 'Automatic backup created successfully', path: filePath };
  } catch (error) {
    console.error('Automatic backup error:', error);
    return { success: false, message: error.message };
  }
}

// Function to schedule the next backup
async function scheduleNextBackup() {
  try {
    // Clear existing scheduler if any
    if (backupScheduler) {
      clearTimeout(backupScheduler);
      backupScheduler = null;
    }
    
    // Load settings
    const settings = await loadAutoBackupSettings();
    
    if (!settings.enabled || !settings.path) {
      console.log('Auto backup is disabled or path not set. No backup scheduled.');
      nextScheduledBackup = null;
      return;
    }
    
    // Calculate next backup time
    const nextBackupTime = calculateNextBackupTime(settings);
    
    if (!nextBackupTime) {
      console.log('Could not determine next backup time. No backup scheduled.');
      nextScheduledBackup = null;
      return;
    }
    
    // Calculate milliseconds until next backup
    const now = new Date();
    const delay = nextBackupTime - now;
    
    // Log next backup time
    console.log(`Next automatic backup scheduled for: ${nextBackupTime.toLocaleString()}`);
    
    // Schedule the backup
    backupScheduler = setTimeout(performAutomaticBackup, delay);
    nextScheduledBackup = nextBackupTime;
  } catch (error) {
    console.error('Error scheduling next backup:', error);
  }
}

// Initialize auto backup when app is ready
app.on('ready', async () => {
  // Disable Chrome DevTools Autofill errors
  app.commandLine.appendSwitch('disable-features', 'BlockThirdPartyCookies,SpareRendererForSitePerProcess');
  
  try {
    await setupDatabase();
    createWindow();
    
    // Initialize automatic backup scheduler
    try {
      await scheduleNextBackup();
    } catch (error) {
      console.error('Error initializing backup scheduler:', error);
    }
  } catch (error) {
    console.error('Error during app startup:', error);
    app.quit();
  }
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
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  try {
    // First, ensure the settings table exists with the correct schema
    await db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        value TEXT
      )
    `);
    
    // Try INSERT OR REPLACE instead of UPDATE to handle both new and existing settings
    await db.run('INSERT OR REPLACE INTO settings (name, value) VALUES (?, ?)', 
                [setting.name, setting.value]);
    return { success: true };
  } catch (error) {
    console.error('Error updating setting:', error);
    return { success: false, error: error.message };
  }
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
// Enhanced backup function with schema validation
ipcMain.handle('backup-data', async (event, filePath) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Get database schema information
    const getTableSchema = async (tableName) => {
      try {
        const schema = await db.all(`PRAGMA table_info(${tableName})`);
        return schema.map(col => ({ name: col.name, type: col.type, notnull: col.notnull, pk: col.pk }));
      } catch (error) {
        return null; // Table doesn't exist
      }
    };

    // Get all available tables
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const tableNames = tables.map(t => t.name);

    const data = {
      metadata: {
        version: '2.0',
        backupDate: new Date().toISOString(),
        application: 'sahana-financial-org',
        schemaVersion: '1.0'
      },
      schemas: {},
      data: {}
    };

    // Backup each table with its schema
    for (const tableName of tableNames) {
      try {
        const schema = await getTableSchema(tableName);
        const tableData = await db.all(`SELECT * FROM ${tableName}`);
        
        data.schemas[tableName] = schema;
        data.data[tableName] = tableData;
        
        console.log(`Backed up table: ${tableName} (${tableData.length} records)`);
      } catch (error) {
        console.warn(`Failed to backup table ${tableName}:`, error.message);
      }
    }
    
    // Write to file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    return { 
      success: true, 
      message: `Backup created successfully with ${tableNames.length} tables`,
      tablesBackedUp: tableNames.length
    };
  } catch (error) {
    console.error('Backup error:', error);
    return { success: false, message: `Backup failed: ${error.message}` };
  }
});

// Enhanced restore function with schema validation and dynamic mapping
ipcMain.handle('restore-data', async (event, filePath) => {
  const fs = require('fs');
  
  try {
    // Read backup file
    const backupContent = fs.readFileSync(filePath, 'utf8');
    const backup = JSON.parse(backupContent);
    
    // Validate backup format
    if (!backup.metadata && !backup.members) {
      throw new Error('Invalid backup file format. This file may be corrupted or from an incompatible version.');
    }
    
    // Handle legacy backup format (version 1.0)
    let isLegacyFormat = !backup.metadata;
    let backupData, backupSchemas;
    
    if (isLegacyFormat) {
      console.log('Detected legacy backup format, converting...');
      backupData = {
        members: backup.members || [],
        cash_book: backup.cashBook || [],
        loan_book: backup.loanBook || [],
        dividend_book: backup.dividendBook || [],
        organization_accounts: backup.accounts || [],
        transactions: backup.transactions || [],
        settings: backup.settings || [],
        meetings: backup.meetings || []
      };
      backupSchemas = null;
    } else {
      backupData = backup.data;
      backupSchemas = backup.schemas;
    }
    
    // Get current database schema
    const getCurrentTableSchema = async (tableName) => {
      try {
        const schema = await db.all(`PRAGMA table_info(${tableName})`);
        return schema.map(col => ({ name: col.name, type: col.type, notnull: col.notnull, pk: col.pk }));
      } catch (error) {
        return null;
      }
    };
    
    // Get current tables
    const currentTables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const currentTableNames = currentTables.map(t => t.name);
    
    // Begin transaction
    await db.run('BEGIN TRANSACTION');
    
    let restoredTables = 0;
    let skippedTables = [];
    let warnings = [];
    
    // Process each table in backup
    for (const [tableName, tableData] of Object.entries(backupData)) {
      if (!Array.isArray(tableData) || tableData.length === 0) {
        console.log(`Skipping empty table: ${tableName}`);
        continue;
      }
      
      // Check if table exists in current database
      if (!currentTableNames.includes(tableName)) {
        console.warn(`Table ${tableName} does not exist in current database, skipping...`);
        skippedTables.push(tableName);
        continue;
      }
      
      try {
        // Get current table schema
        const currentSchema = await getCurrentTableSchema(tableName);
        const currentColumns = currentSchema.map(col => col.name);
        
        // Get backup table schema (if available)
        let backupColumns;
        if (backupSchemas && backupSchemas[tableName]) {
          backupColumns = backupSchemas[tableName].map(col => col.name);
        } else {
          // Infer from first record
          backupColumns = tableData.length > 0 ? Object.keys(tableData[0]) : [];
        }
        
        // Find common columns
        const commonColumns = currentColumns.filter(col => backupColumns.includes(col));
        
        if (commonColumns.length === 0) {
          console.warn(`No matching columns found for table ${tableName}, skipping...`);
          skippedTables.push(tableName);
          continue;
        }
        
        // Check for missing columns
        const missingInCurrent = backupColumns.filter(col => !currentColumns.includes(col));
        const missingInBackup = currentColumns.filter(col => !backupColumns.includes(col));
        
        if (missingInCurrent.length > 0) {
          warnings.push(`Table ${tableName}: Backup contains columns not in current schema: ${missingInCurrent.join(', ')}`);
        }
        if (missingInBackup.length > 0) {
          warnings.push(`Table ${tableName}: Current schema has columns not in backup: ${missingInBackup.join(', ')}`);
        }
        
        // Clear existing data
        await db.run(`DELETE FROM ${tableName}`);
        
        // Prepare insert statement with common columns
        const placeholders = commonColumns.map(() => '?').join(', ');
        const insertSQL = `INSERT INTO ${tableName} (${commonColumns.join(', ')}) VALUES (${placeholders})`;
        
        // Insert data
        let recordsInserted = 0;
        for (const record of tableData) {
          try {
            const values = commonColumns.map(col => record[col] !== undefined ? record[col] : null);
            await db.run(insertSQL, values);
            recordsInserted++;
          } catch (recordError) {
            console.warn(`Failed to insert record in ${tableName}:`, recordError.message);
            // Continue with next record instead of failing completely
          }
        }
        
        console.log(`Restored table ${tableName}: ${recordsInserted}/${tableData.length} records`);
        restoredTables++;
        
      } catch (tableError) {
        console.error(`Error restoring table ${tableName}:`, tableError.message);
        skippedTables.push(tableName);
      }
    }
    
    // Commit transaction
    await db.run('COMMIT');
    
    // Prepare result message
    let message = `Data restored successfully. ${restoredTables} tables restored.`;
    if (skippedTables.length > 0) {
      message += ` Skipped tables: ${skippedTables.join(', ')}.`;
    }
    if (warnings.length > 0) {
      message += ` Warnings: ${warnings.length} schema differences detected.`;
    }
    
    return { 
      success: true, 
      message,
      restoredTables,
      skippedTables,
      warnings,
      isLegacyFormat
    };
    
  } catch (error) {
    // Rollback in case of error
    try {
      await db.run('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError.message);
    }
    
    console.error('Restore error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Restore failed: ';
    if (error.message.includes('JSON')) {
      errorMessage += 'Invalid backup file format or corrupted file.';
    } else if (error.message.includes('SQLITE')) {
      errorMessage += 'Database error occurred during restore.';
    } else {
      errorMessage += error.message;
    }
    
    return { success: false, message: errorMessage, error: error.message };
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
      
      // Calculate total organization assets for the specified quarter
      // We need to use the organization's total assets at the end of the quarter
      // Format date as YYYY-MM-DD for SQLite
      const quarterEndMonth = quarter * 3;
      const quarterEndDate = `${year}-${String(quarterEndMonth).padStart(2, '0')}-${['31', '30', '30', '31'][quarter-1]}`;
      
      console.log(`Calculating assets as of: ${quarterEndDate}`);
      
      // Get cash contributions up to the end of the quarter
      const cashContributions = await db.get(
        `SELECT COALESCE(SUM(amount), 0) as total FROM cash_book 
         WHERE date <= ?`,
        [quarterEndDate]
      );
      
      const bankBalances = await db.get(
        `SELECT COALESCE(SUM(balance), 0) as total FROM organization_accounts 
         WHERE created_date <= ?`,
        [quarterEndDate]
      );
      
      const outstandingLoans = await db.get(
        `SELECT COALESCE(SUM(total), 0) as total FROM loan_book 
         WHERE date <= ? AND (closed_date IS NULL OR closed_date > ?)`,
        [quarterEndDate, quarterEndDate]
      );
      
      const totalOrgAssets = (cashContributions.total || 0) + 
                           (bankBalances.total || 0) + 
                           (outstandingLoans.total || 0);
      
      const orgAssets = {
        cashContributions: cashContributions.total || 0,
        bankBalances: bankBalances.total || 0,
        outstandingLoans: outstandingLoans.total || 0,
        totalAssets: totalOrgAssets,
        asOfDate: quarterEndDate
      };
      
      // Calculate dividend for each member based on their proportion of the total assets
      const dividends = await Promise.all(activeMembers.map(async (member) => {
        try {
          // Calculate member's total assets as of the end of the quarter
          const cashResult = await db.get(
            `SELECT COALESCE(SUM(amount), 0) as cashTotal 
             FROM cash_book 
             WHERE member_id = ? AND date <= ?`,
            [member.id, quarterEndDate]
          );
          
          const dividendResult = await db.get(
            `SELECT COALESCE(SUM(total), 0) as dividendTotal 
             FROM dividend_book 
             WHERE member_id = ? AND date <= ?`,
            [member.id, quarterEndDate]
          );
          
          const cashTotal = cashResult ? cashResult.cashTotal : 0;
          const dividendTotal = dividendResult ? dividendResult.dividendTotal : 0;
          const memberAssets = cashTotal + dividendTotal;
          
          // Calculate proportion
          const proportion = orgAssets.totalAssets > 0 ? memberAssets / orgAssets.totalAssets : 0;
          
          // Calculate dividend amount - this is one-fourth of the yearly profit times the proportion
          const dividendAmount = proportion * dividendPool;
          
          return {
            memberId: member.id,
            memberName: member.name,
            memberAssets: memberAssets,
            proportion: proportion,
            dividendAmount: dividendAmount,
            quarter: quarter,
            year: year
          };
        } catch (error) {
          console.error(`Error calculating dividend for member ${member.id}:`, error);
          return {
            memberId: member.id,
            memberName: member.name,
            memberAssets: 0,
            proportion: 0,
            dividendAmount: 0,
            quarter: quarter,
            year: year,
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
        asOfDate: quarterEndDate,
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

// CALCULATE QUARTERLY DIVIDENDS BY YEAR
ipcMain.handle('calculate-quarterly-dividends-by-year', async (event, { year, dividendRate }) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Get all active members
      const activeMembers = await db.all('SELECT * FROM members WHERE status = "active"');
      
      // Get quarterly profits for the year
      // In a real-world scenario, you would fetch this from your financial records
      // For demonstration, we'll simulate with available data or create estimates
      const quarterlyProfits = await Promise.all([1, 2, 3, 4].map(async (quarter) => {
        // Try to find existing profit records for this quarter
        const profit = await db.get(
          `SELECT COALESCE(SUM(profitAmount), 0) as profit 
           FROM dividends 
           WHERE year = ? AND quarter = ?`,
          [year, quarter]
        );
        
        // Return found profit or estimate
        return {
          quarter,
          profit: profit?.profit || 50000, // Default value if no data found
        };
      }));
      
      // Calculate dividends for each quarter
      const quarterlyDividends = await Promise.all(quarterlyProfits.map(async ({ quarter, profit }) => {
        // Calculate dividend pool
        const dividendPool = profit * (dividendRate / 100);
        
        // End date for this quarter
        const quarterEndMonth = quarter * 3;
        const quarterEndDate = `${year}-${String(quarterEndMonth).padStart(2, '0')}-${['31', '30', '30', '31'][quarter-1]}`;
        
        // Calculate organization's total assets at the end of this quarter
        const cashContributions = await db.get(
          `SELECT COALESCE(SUM(amount), 0) as total FROM cash_book 
           WHERE date <= ?`,
          [quarterEndDate]
        );
        
        const bankBalances = await db.get(
          `SELECT COALESCE(SUM(balance), 0) as total FROM organization_accounts 
           WHERE created_date <= ?`,
          [quarterEndDate]
        );
        
        const outstandingLoans = await db.get(
          `SELECT COALESCE(SUM(total), 0) as total FROM loan_book 
           WHERE date <= ? AND (closed_date IS NULL OR closed_date > ?)`,
          [quarterEndDate, quarterEndDate]
        );
        
        const totalOrgAssets = (cashContributions.total || 0) + 
                             (bankBalances.total || 0) + 
                             (outstandingLoans.total || 0);
        
        // Calculate each member's dividend for this quarter
        const memberDividends = await Promise.all(activeMembers.map(async (member) => {
          try {
            // Calculate member's assets at the end of this quarter
            const cashResult = await db.get(
              `SELECT COALESCE(SUM(amount), 0) as cashTotal 
               FROM cash_book 
               WHERE member_id = ? AND date <= ?`,
              [member.id, quarterEndDate]
            );
            
            const dividendResult = await db.get(
              `SELECT COALESCE(SUM(total), 0) as dividendTotal 
               FROM dividend_book 
               WHERE member_id = ? AND date <= ?`,
              [member.id, quarterEndDate]
            );
            
            const cashTotal = cashResult ? cashResult.cashTotal : 0;
            const dividendTotal = dividendResult ? dividendResult.dividendTotal : 0;
            const memberAssets = cashTotal + dividendTotal;
            
            // Calculate proportion
            const proportion = totalOrgAssets > 0 ? memberAssets / totalOrgAssets : 0;
            
            // Calculate dividend amount
            const dividendAmount = proportion * dividendPool;
            
            return {
              memberId: member.id,
              memberName: member.name,
              memberAssets,
              proportion,
              dividendAmount
            };
          } catch (error) {
            console.error(`Error calculating Q${quarter} dividend for member ${member.id}:`, error);
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
        
        return {
          quarter,
          profit,
          dividendPool,
          orgAssets: totalOrgAssets,
          asOfDate: quarterEndDate,
          memberDividends
        };
      }));
      
      // Now calculate the yearly totals for each member
      const yearlyDividends = activeMembers.map(member => {
        const memberQuarterlyDividends = quarterlyDividends.map(qd => {
          return qd.memberDividends.find(md => md.memberId === member.id) || {
            memberId: member.id,
            memberName: member.name,
            dividendAmount: 0,
            proportion: 0,
            memberAssets: 0
          };
        });
        
        const totalYearlyDividend = memberQuarterlyDividends.reduce(
          (sum, qd) => sum + qd.dividendAmount, 0
        );
        
        return {
          memberId: member.id,
          memberName: member.name,
          quarterlyDividends: memberQuarterlyDividends,
          totalYearlyDividend
        };
      });
      
      // Sort by total yearly dividend (highest first)
      yearlyDividends.sort((a, b) => b.totalYearlyDividend - a.totalYearlyDividend);
      
      resolve({
        year,
        dividendRate,
        quarterlyDividends,
        yearlyDividends,
        totalYearlyDividend: yearlyDividends.reduce((sum, yd) => sum + yd.totalYearlyDividend, 0)
      });
    } catch (error) {
      console.error('Error calculating quarterly dividends by year:', error);
      reject(error);
    }
  });
});

// SMS Services
ipcMain.handle('send-sms', async (event, phoneNumber, message) => {
  return await sendSMS(phoneNumber, message);
});

// Helper function to fix settings table structure
async function fixSettingsTable() {
  console.log('fixSettingsTable: Checking settings table structure...');
  try {
    // First verify the table structure
    const tableInfo = await db.all("PRAGMA table_info(settings)");
    console.log('fixSettingsTable: PRAGMA table_info(settings) result:', JSON.stringify(tableInfo));
    
    if (tableInfo.length === 0) {
      // Table doesn't exist, create it with correct structure
      console.log('fixSettingsTable: Settings table does not exist, creating it...');
      await db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          value TEXT
        );
      `);
      
      // Insert default SMS settings
      console.log('fixSettingsTable: Inserting default settings into new settings table.');
      await db.run("INSERT OR IGNORE INTO settings (name, value) VALUES ('sms_api_key', '')", []);
      await db.run("INSERT OR IGNORE INTO settings (name, value) VALUES ('sms_user_id', '')", []);
      await db.run("INSERT OR IGNORE INTO settings (name, value) VALUES ('sms_enabled', 'false')", []);
      await db.run("INSERT OR IGNORE INTO settings (name, value) VALUES ('sms_sender_id', 'FINANCIALORG')", []);
      
      console.log('fixSettingsTable: Settings table created with defaults.');
      return true;
    }
    
    const columns = tableInfo.map(col => col.name);
    
    // If value column doesn't exist, we need to fix the table
    if (!columns.includes('value')) {
      console.log('fixSettingsTable: Settings table missing value column, attempting to fix structure...');
      
      // Save existing settings with all their columns
      let existingSettings = [];
      try {
        const allColumns = columns.join(', ');
        console.log(`fixSettingsTable: Attempting to read existing settings with columns: ${allColumns}`);
        existingSettings = await db.all(`SELECT ${allColumns} FROM settings`);
        console.log(`fixSettingsTable: Found ${existingSettings.length} existing settings to migrate.`);
      } catch (error) {
        console.log('fixSettingsTable: Could not retrieve existing settings:', error.message);
        // Proceed even if we can't retrieve old settings
      }
      
      // Execute migrations in a transaction
      console.log('fixSettingsTable: Starting transaction to fix table.');
      await db.exec('BEGIN TRANSACTION');
      
      try {
        // Create a new table with correct structure
        console.log('fixSettingsTable: Creating settings_new table.');
        await db.exec(`
          CREATE TABLE IF NOT EXISTS settings_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            value TEXT
          );
        `);
        
        // Insert default SMS settings
        console.log('fixSettingsTable: Inserting default settings into settings_new.');
        await db.run("INSERT OR IGNORE INTO settings_new (name, value) VALUES ('sms_api_key', '')", []);
        await db.run("INSERT OR IGNORE INTO settings_new (name, value) VALUES ('sms_user_id', '')", []);
        await db.run("INSERT OR IGNORE INTO settings_new (name, value) VALUES ('sms_enabled', 'false')", []);
        await db.run("INSERT OR IGNORE INTO settings_new (name, value) VALUES ('sms_sender_id', 'FINANCIALORG')", []);
        
        // Try to migrate existing settings
        if (existingSettings.length > 0) {
          console.log(`fixSettingsTable: Migrating ${existingSettings.length} settings to settings_new...`);
          
          for (const setting of existingSettings) {
            const name = setting.name;
            let value = null;
            
            // Check if we have direct columns for the SMS settings
            if (name === 'sms_api_key' && columns.includes('sms_api_key')) {
              value = setting['sms_api_key'];
            } else if (name === 'sms_user_id' && columns.includes('sms_user_id')) {
              value = setting['sms_user_id'];
            } else if (name === 'sms_enabled' && columns.includes('sms_enabled')) {
              value = setting['sms_enabled'];
            } else if (name === 'sms_sender_id' && columns.includes('sms_sender_id')) {
              value = setting['sms_sender_id'];
            } else {
              // Find a value in any non-id, non-name column
              for (const key in setting) {
                if (key !== 'id' && key !== 'name' && setting[key] !== null) {
                  value = setting[key];
                  console.log(`fixSettingsTable: Migrating ${name} -> ${value} (from column ${key})`);
                  break;
                }
              }
            }
            
            if (name && value !== null) {
              await db.run('INSERT OR REPLACE INTO settings_new (name, value) VALUES (?, ?)', [name, value]);
              console.log(`fixSettingsTable: Migrated setting ${name} -> ${value}`);
            } else {
              console.log(`fixSettingsTable: Could not find value to migrate for setting name: ${name}`);
            }
          }
        }
        
        // Drop the old table and rename the new one
        console.log('fixSettingsTable: Dropping old settings table.');
        await db.exec(`DROP TABLE IF EXISTS settings;`);
        console.log('fixSettingsTable: Renaming settings_new to settings.');
        await db.exec(`ALTER TABLE settings_new RENAME TO settings;`);
        
        // Commit transaction
        console.log('fixSettingsTable: Committing transaction.');
        await db.exec('COMMIT');
        console.log('fixSettingsTable: Settings table fixed successfully.');
        return true;
      } catch (error) {
        // Rollback on error
        console.error('fixSettingsTable: Error during transaction, rolling back:', error);
        await db.exec('ROLLBACK');
        console.log('fixSettingsTable: Transaction rolled back.');
        return false;
      }
    } else {
      console.log('fixSettingsTable: Settings table already has value column. Structure is OK.');
    }
  } catch (dbError) {
    console.error('fixSettingsTable: Error accessing settings table info:', dbError);
    return false;
  }
  
  // Table already has correct structure or error occurred previously
  return true;
}

ipcMain.handle('get-sms-settings', async () => {
  console.log('get-sms-settings: Handler invoked.');
  try {
    // Check if sms_settings table exists
    const tableCheck = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='sms_settings'");
    
    if (!tableCheck) {
      // Create sms_settings table if it doesn't exist
      console.log('get-sms-settings: SMS settings table does not exist. Creating it...');
      await db.exec(`
        CREATE TABLE IF NOT EXISTS sms_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          value TEXT
        )
      `);
      
      // Insert default settings
      await db.run("INSERT OR IGNORE INTO sms_settings (name, value) VALUES ('sms_api_key', '')", []);
      await db.run("INSERT OR IGNORE INTO sms_settings (name, value) VALUES ('sms_user_id', '')", []);
      await db.run("INSERT OR IGNORE INTO sms_settings (name, value) VALUES ('sms_enabled', 'false')", []);
      await db.run("INSERT OR IGNORE INTO sms_settings (name, value) VALUES ('sms_sender_id', 'FINANCIALORG')", []);
      
      console.log('get-sms-settings: Default SMS settings inserted.');
    }
    
    // Get settings from the sms_settings table
    console.log('get-sms-settings: Fetching individual settings...');
    const apiKeySetting = await db.get('SELECT value FROM sms_settings WHERE name = ?', ['sms_api_key']);
    const userIdSetting = await db.get('SELECT value FROM sms_settings WHERE name = ?', ['sms_user_id']);
    const enabledSetting = await db.get('SELECT value FROM sms_settings WHERE name = ?', ['sms_enabled']);
    const senderIdSetting = await db.get('SELECT value FROM sms_settings WHERE name = ?', ['sms_sender_id']);
    
    console.log('get-sms-settings: Fetched settings from DB:', { apiKeySetting, userIdSetting, enabledSetting, senderIdSetting });
    
    const result = {
      apiKey: apiKeySetting ? apiKeySetting.value : '',
      userId: userIdSetting ? userIdSetting.value : '',
      enabled: enabledSetting ? enabledSetting.value === 'true' : false,
      senderId: senderIdSetting ? senderIdSetting.value : 'FINANCIALORG'
    };
    console.log('get-sms-settings: Returning settings object:', result);
    return result;
  } catch (error) {
    console.error('get-sms-settings: Error in handler:', error);
    // Return default values on error
    const defaultResult = {
      apiKey: '',
      userId: '',
      enabled: false,
      senderId: 'FINANCIALORG'
    };
    console.log('get-sms-settings: Returning default settings due to error.', defaultResult);
    return defaultResult;
  }
});

ipcMain.handle('update-sms-settings', async (event, settings) => {
  try {
    // Ensure sms_settings table exists
    await db.exec(`
      CREATE TABLE IF NOT EXISTS sms_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        value TEXT
      )
    `);
    
    // Update settings
    await db.run('INSERT OR REPLACE INTO sms_settings (name, value) VALUES (?, ?)', ['sms_api_key', settings.apiKey]);
    await db.run('INSERT OR REPLACE INTO sms_settings (name, value) VALUES (?, ?)', ['sms_user_id', settings.userId]);
    await db.run('INSERT OR REPLACE INTO sms_settings (name, value) VALUES (?, ?)', ['sms_enabled', settings.enabled ? 'true' : 'false']);
    await db.run('INSERT OR REPLACE INTO sms_settings (name, value) VALUES (?, ?)', ['sms_sender_id', settings.senderId]);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating SMS settings:', error);
    return { success: false, error: error.message };
  }
});

// SMS functionality with notify.lk API
async function sendSMS(phoneNumber, message) {
  try {
    // Get SMS settings from database using new getSMSSetting function
    const apiKey = await getSMSSetting('sms_api_key');
    const userId = await getSMSSetting('sms_user_id');
    const smsEnabled = await getSMSSetting('sms_enabled');
    const senderId = await getSMSSetting('sms_sender_id');
    
    // Check if SMS is enabled
    if (smsEnabled !== 'true' || !apiKey || !userId) {
      console.log('SMS is disabled or API credentials not set');
      return { success: false, error: 'SMS is disabled or API credentials not set' };
    }

    // Prepare the phone number (remove leading 0 and add country code if needed)
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    // Prepare the API request to notify.lk
    const params = new URLSearchParams();
    params.append('user_id', userId);
    params.append('api_key', apiKey);
    params.append('sender_id', senderId);
    params.append('to', formattedPhone);
    params.append('message', message);
    
    // Send the request
    const response = await axios.post('https://app.notify.lk/api/v1/send', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });
    
    // Log the SMS in database
    await db.run(
      'INSERT INTO sms_logs (phone_number, message, status, response_data) VALUES (?, ?, ?, ?)',
      formattedPhone, message, response.data.status, JSON.stringify(response.data)
    );
    
    return { 
      success: response.data.status === 'success',
      data: response.data
    };
    
  } catch (error) {
    console.error('Error sending SMS:', error);
    
    // Log the error
    try {
      await db.run(
        'INSERT INTO sms_logs (phone_number, message, status, response_data) VALUES (?, ?, ?, ?)',
        phoneNumber, message, 'error', JSON.stringify({ error: error.message })
      );
    } catch (dbError) {
      console.error('Error logging SMS error:', dbError);
    }
    
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Format phone number for the API - removes leading zeros and adds country code if needed
function formatPhoneNumber(phone) {
  // Clean the phone number - remove spaces, dashes, etc.
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with a zero, remove it
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // If doesn't start with country code, add Sri Lanka code (94)
  if (!cleaned.startsWith('94')) {
    cleaned = '94' + cleaned;
  }
  
  return cleaned;
}

// New helper function for SMS settings
async function getSMSSetting(name) {
  try {
    // Ensure sms_settings table exists
    const tableCheck = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='sms_settings'");
    
    if (!tableCheck) {
      // If table doesn't exist, return null
      console.log(`getSMSSetting: sms_settings table does not exist.`);
      return null;
    }
    
    // Query the setting from sms_settings table
    const setting = await db.get('SELECT value FROM sms_settings WHERE name = ?', name);
    return setting ? setting.value : null;
  } catch (error) {
    console.error(`Error getting SMS setting ${name}:`, error);
    return null;
  }
}

// Add endpoint to get next scheduled backup time
ipcMain.handle('get-next-scheduled-backup', async () => {
  try {
    if (!nextScheduledBackup) {
      return { scheduled: false };
    }
    
    return { 
      scheduled: true,
      timestamp: nextScheduledBackup.toISOString(),
      formattedDate: nextScheduledBackup.toLocaleString() 
    };
  } catch (error) {
    console.error('Error getting next scheduled backup time:', error);
    return { scheduled: false, error: error.message };
  }
});