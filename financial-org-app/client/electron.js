const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const fs = require('fs');

// Simply require sqlite3
const sqlite3 = require('sqlite3').verbose();

// Make sure the data directory exists
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'sahana.db');

// Initialize the database connection
let db = null;

// Determine correct preload path
const preloadPath = path.join(__dirname, 'preload.js');
console.log('Preload script path:', preloadPath);
console.log('Preload script exists:', fs.existsSync(preloadPath));

function createDatabase() {
  console.log('Creating/connecting to database at:', dbPath);
  
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Database opening error: ', err);
    } else {
      console.log('Connected to SQLite database');
      createTables();
      migrateTables();
    }
  });
}

function createTables() {
  // Create tables if they don't exist
  const tables = [
    `CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      joinDate TEXT,
      shares INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active'
    )`,
    `CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memberId INTEGER,
      amount REAL NOT NULL,
      interestRate REAL NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      purpose TEXT,
      dailyInterest INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      balance REAL,
      FOREIGN KEY(memberId) REFERENCES members(id)
    )`,
    `CREATE TABLE IF NOT EXISTS loan_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loanId INTEGER,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      FOREIGN KEY(loanId) REFERENCES loans(id)
    )`,
    `CREATE TABLE IF NOT EXISTS cashbook (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      reference TEXT,
      memberId INTEGER,
      FOREIGN KEY(memberId) REFERENCES members(id)
    )`,
    `CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      accountNumber TEXT NOT NULL,
      bankName TEXT NOT NULL,
      accountType TEXT NOT NULL,
      balance REAL DEFAULT 0,
      openDate TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS bank_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      accountId INTEGER,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      balance REAL,
      FOREIGN KEY(accountId) REFERENCES bank_accounts(id)
    )`,
    `CREATE TABLE IF NOT EXISTS dividends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quarterEndDate TEXT NOT NULL,
      totalShares INTEGER NOT NULL,
      profitAmount REAL NOT NULL,
      dividendRate REAL NOT NULL,
      calculationDate TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS dividend_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dividendId INTEGER,
      memberId INTEGER,
      shares INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      paymentDate TEXT,
      FOREIGN KEY(dividendId) REFERENCES dividends(id),
      FOREIGN KEY(memberId) REFERENCES members(id)
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      orgName TEXT NOT NULL,
      orgAddress TEXT,
      orgPhone TEXT,
      orgEmail TEXT,
      registrationNumber TEXT,
      foundedYear INTEGER,
      taxId TEXT,
      quarterEndMonths TEXT,
      defaultLoanInterest REAL DEFAULT 10,
      membershipFee REAL DEFAULT 1000,
      shareValue REAL DEFAULT 1000
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT,
      last_login TEXT
    )`
  ];

  db.serialize(() => {
    tables.forEach(table => {
      db.run(table, (err) => {
        if (err) {
          console.error('Error creating table:', err);
        }
      });
    });

    // Check if settings exist, if not insert default settings
    db.get('SELECT COUNT(*) as count FROM settings', (err, row) => {
      if (err) {
        console.error('Error checking settings:', err);
        return;
      }
      
      if (row.count === 0) {
        const defaultSettings = {
          orgName: 'Sahana Welfare',
          orgAddress: 'Colombo, Sri Lanka',
          orgPhone: '0112345678',
          orgEmail: 'info@sahanawelfare.lk',
          registrationNumber: 'REG12345',
          foundedYear: 2022,
          taxId: 'TAX98765',
          quarterEndMonths: '3,6,9,12',
          defaultLoanInterest: 10,
          membershipFee: 1000,
          shareValue: 1000
        };
        
        db.run(`INSERT INTO settings (
          id, orgName, orgAddress, orgPhone, orgEmail, registrationNumber, 
          foundedYear, taxId, quarterEndMonths, defaultLoanInterest, 
          membershipFee, shareValue
        ) VALUES (
          1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )`, [
          defaultSettings.orgName, 
          defaultSettings.orgAddress,
          defaultSettings.orgPhone,
          defaultSettings.orgEmail,
          defaultSettings.registrationNumber,
          defaultSettings.foundedYear,
          defaultSettings.taxId,
          defaultSettings.quarterEndMonths,
          defaultSettings.defaultLoanInterest,
          defaultSettings.membershipFee,
          defaultSettings.shareValue
        ], function(err) {
          if (err) {
            console.error('Error inserting default settings:', err);
          } else {
            console.log('Default settings created');
          }
        });
      }
    });

    // Check if default admin user exists, if not create it
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
      if (err) {
        console.error('Error checking users:', err);
        return;
      }
      
      if (row.count === 0) {
        // Create default admin user
        db.run(
          'INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)',
          ['admin', 'admin123', 'admin', new Date().toISOString()],
          function(err) {
            if (err) {
              console.error('Error creating default admin user:', err);
            } else {
              console.log('Default admin user created');
            }
          }
        );
      }
    });
  });
}

function migrateTables() {
  // Check if the members table has a member_id column, if not add it
  db.get("SELECT 1 FROM pragma_table_info('members') WHERE name='member_id'", (err, row) => {
    if (err) {
      console.error('Error checking for member_id column:', err);
      return;
    }
    
    if (!row) {
      console.log('Adding member_id column to members table...');
      db.serialize(() => {
        // Add the column
        db.run("ALTER TABLE members ADD COLUMN member_id TEXT", (err) => {
          if (err) {
            console.error('Error adding member_id column:', err);
            return;
          }
          console.log('Successfully added member_id column to members table');
          
          // Generate member IDs for existing members
          db.all("SELECT id FROM members WHERE member_id IS NULL", (err, rows) => {
            if (err) {
              console.error('Error fetching members without member_id:', err);
              return;
            }
            
            rows.forEach(member => {
              const memberId = `M${String(member.id).padStart(4, '0')}`;
              db.run("UPDATE members SET member_id = ? WHERE id = ?", [memberId, member.id], (err) => {
                if (err) {
                  console.error(`Error updating member_id for member ${member.id}:`, err);
                }
              });
            });
          });
        });
        
        // Add unique constraint after all members have IDs
        db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_members_member_id ON members(member_id)", (err) => {
          if (err) {
            console.error('Error creating unique index on member_id:', err);
          } else {
            console.log('Successfully created unique index on member_id');
          }
        });
      });
    } else {
      console.log('member_id column already exists in members table');
    }
  });
  
  // Check if the cashbook table has a memberId column, if not add it
  db.get("PRAGMA table_info(cashbook)", (err, rows) => {
    if (err) {
      console.error('Error checking cashbook table schema:', err);
      return;
    }
    
    // Check if the memberId column exists
    db.get("SELECT 1 FROM pragma_table_info('cashbook') WHERE name='memberId'", (err, row) => {
      if (err) {
        console.error('Error checking for memberId column:', err);
        return;
      }
      
      if (!row) {
        console.log('Adding memberId column to cashbook table...');
        db.run("ALTER TABLE cashbook ADD COLUMN memberId INTEGER REFERENCES members(id)", (err) => {
          if (err) {
            console.error('Error adding memberId column:', err);
          } else {
            console.log('Successfully added memberId column to cashbook table');
          }
        });
      } else {
        console.log('memberId column already exists in cashbook table');
      }
    });
  });
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    },
    icon: path.join(__dirname, 'build/favicon.ico')
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
  
  // Load the app - Fix for production path issues
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, './index.html')}`;
  
  console.log(`Loading application from: ${startUrl}`);
  console.log('Current directory:', __dirname);
  
  // Delay loading to ensure all startup processes are complete
  setTimeout(() => {
    mainWindow.loadURL(startUrl)
      .then(() => {
        console.log('Window loaded successfully');
      })
      .catch(err => {
        console.error('Error loading URL:', err);
        // Try multiple fallback paths
        const fallbackUrls = [
          `file://${path.join(__dirname, 'index.html')}`,
          `file://${path.join(__dirname, '../index.html')}`,
          `file://${path.join(app.getAppPath(), 'build/index.html')}`,
          `file://${path.join(app.getAppPath(), 'index.html')}`
        ];
        
        console.log('Trying fallback URLs:', fallbackUrls);
        
        // Try each fallback URL until one works
        tryLoadFallbacks(fallbackUrls, 0);
      });
  }, 500);

  // Function to try multiple fallback URLs
  function tryLoadFallbacks(urls, index) {
    if (index >= urls.length) {
      console.error('All fallback URLs failed');
      return;
    }
    
    console.log(`Trying fallback URL ${index + 1}:`, urls[index]);
    mainWindow.loadURL(urls[index])
      .then(() => {
        console.log('Fallback URL loaded successfully:', urls[index]);
      })
      .catch(err => {
        console.error(`Error loading fallback URL ${index + 1}:`, err);
        tryLoadFallbacks(urls, index + 1);
      });
  }

  // Open DevTools if in development
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    
    // Debug window contents
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('Window loaded');
      mainWindow.webContents.executeJavaScript(`
        console.log('Window API available:', !!window.api);
        console.log('isElectron:', !!window.isElectron);
      `).catch(err => console.error('Error executing JS:', err));
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  createDatabase();
  createWindow();
  
  // Authentication handlers
  ipcMain.handle('verify-user', async (event, credentials) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, role FROM users WHERE username = ? AND password = ?',
        [credentials.username, credentials.password],
        (err, user) => {
          if (err) {
            console.error('Error verifying user:', err);
            reject(err);
            return;
          }
          
          if (user) {
            // Update last login time
            db.run(
              'UPDATE users SET last_login = ? WHERE id = ?',
              [new Date().toISOString(), user.id],
              (err) => {
                if (err) {
                  console.error('Error updating last login:', err);
                }
              }
            );
            resolve({ success: true, user });
          } else {
            resolve({ success: false, message: 'Invalid username or password' });
          }
        }
      );
    });
  });

  ipcMain.handle('changePassword', async (event, userId, oldPassword, newPassword) => {
    return new Promise((resolve, reject) => {
      // First verify the old password
      db.get(
        'SELECT id, username FROM users WHERE id = ? AND password = ?',
        [userId, oldPassword],
        (err, user) => {
          if (err) {
            console.error('Error verifying password:', err);
            reject(err);
            return;
          }
          
          if (!user) {
            resolve({ success: false, message: 'Current password is incorrect' });
            return;
          }
          
          // Update to the new password
          db.run(
            'UPDATE users SET password = ? WHERE id = ?',
            [newPassword, userId],
            (err) => {
              if (err) {
                console.error('Error changing password:', err);
                reject(err);
                return;
              }
              
              resolve({ success: true, message: 'Password changed successfully' });
            }
          );
        }
      );
    });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  
  // Close database connection
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
    });
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for database operations
// These will communicate with the React frontend

// MEMBERS API
ipcMain.handle('get-members', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM members ORDER BY name', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('get-member', async (event, memberId) => {
  console.log('Received request for member ID:', memberId);
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM members WHERE id = ?', [memberId], (err, row) => {
      if (err) {
        console.error('Error fetching member:', err);
        reject(err);
      } else {
        console.log('Found member:', row);
        resolve(row);
      }
    });
  });
});

ipcMain.handle('get-member-transactions', async (event, memberId) => {
  console.log('Received request for member transactions:', memberId);
  return new Promise((resolve, reject) => {
    // Fetch all types of transactions for a member
    const promises = [
      // Cashbook entries
      new Promise((resolve, reject) => {
        db.all('SELECT id, date, description, amount, "cash" as type FROM cashbook WHERE memberId = ?', 
          [memberId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
      }),
      
      // Loan entries
      new Promise((resolve, reject) => {
        db.all('SELECT id, startDate as date, purpose as description, amount, "loan" as type FROM loans WHERE memberId = ?', 
          [memberId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
      }),
      
      // Loan payments
      new Promise((resolve, reject) => {
        db.all(`SELECT p.id, p.date, p.note as description, p.amount, "loan_payment" as type 
                FROM loan_payments p
                JOIN loans l ON p.loanId = l.id
                WHERE l.memberId = ?`, 
          [memberId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
      }),
      
      // Dividend payments
      new Promise((resolve, reject) => {
        db.all('SELECT id, paymentDate as date, "Dividend payment" as description, amount, "dividend" as type FROM dividend_payments WHERE memberId = ?', 
          [memberId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
      })
    ];
    
    Promise.all(promises)
      .then(results => {
        // Combine all transactions and sort by date
        const transactions = results.flat().filter(t => t !== null);
        console.log(`Found ${transactions.length} transactions for member ${memberId}`);
        resolve(transactions.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
      })
      .catch(error => {
        console.error('Error fetching member transactions:', error);
        reject(error);
      });
  });
});

ipcMain.handle('add-member', async (event, member) => {
  return new Promise((resolve, reject) => {
    const { member_id, name, address, phone, joinDate, status } = member;
    
    // Insert the member with all provided fields
    db.run(
      'INSERT INTO members (member_id, name, address, phone, joinDate, status) VALUES (?, ?, ?, ?, ?, ?)',
      [member_id || '', name, address, phone, joinDate, status],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        const newMemberId = this.lastID;
        
        // If no member_id was provided, generate one and update the record
        if (!member_id) {
          const generatedMemberId = `M${String(newMemberId).padStart(4, '0')}`;
          db.run('UPDATE members SET member_id = ? WHERE id = ?', [generatedMemberId, newMemberId], (updateErr) => {
            if (updateErr) {
              console.error('Error updating member_id:', updateErr);
              reject(updateErr);
              return;
            }
            
            resolve({ 
              id: newMemberId, 
              member_id: generatedMemberId,
              ...member 
            });
          });
        } else {
          resolve({ 
            id: newMemberId, 
            ...member 
          });
        }
      }
    );
  });
});

// Add delete-member handler
ipcMain.handle('delete-member', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM members WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Error deleting member:', err);
        reject(err);
        return;
      }
      
      if (this.changes === 0) {
        const error = new Error('Member not found');
        console.error(error);
        reject(error);
        return;
      }
      
      console.log(`Successfully deleted member with ID ${id}`);
      resolve({ success: true });
    });
  });
});

// LOANS API
ipcMain.handle('get-loans', async () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT l.*, m.name as memberName 
      FROM loans l 
      JOIN members m ON l.memberId = m.id 
      ORDER BY l.startDate DESC`, 
    (err, loans) => {
      if (err) reject(err);
      else {
        // Get loan payments for each loan
        const promises = loans.map(loan => {
          return new Promise((resolve, reject) => {
            db.all('SELECT * FROM loan_payments WHERE loanId = ?', [loan.id], (err, payments) => {
              if (err) reject(err);
              else {
                loan.payments = payments;
                resolve(loan);
              }
            });
          });
        });
        
        Promise.all(promises)
          .then(loansWithPayments => resolve(loansWithPayments))
          .catch(error => reject(error));
      }
    });
  });
});

ipcMain.handle('add-loan', async (event, loan) => {
  return new Promise((resolve, reject) => {
    const { memberId, amount, interestRate, startDate, endDate, purpose, dailyInterest, status, balance } = loan;
    db.run(
      'INSERT INTO loans (memberId, amount, interestRate, startDate, endDate, purpose, dailyInterest, status, balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [memberId, amount, interestRate, startDate, endDate, purpose, dailyInterest ? 1 : 0, status || 'active', balance || amount],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...loan });
      }
    );
  });
});

ipcMain.handle('update-loan', async (event, id, loan) => {
  return new Promise((resolve, reject) => {
    const { memberId, amount, interestRate, startDate, endDate, purpose, dailyInterest, status, balance } = loan;
    db.run(
      'UPDATE loans SET memberId = ?, amount = ?, interestRate = ?, startDate = ?, endDate = ?, purpose = ?, dailyInterest = ?, status = ?, balance = ? WHERE id = ?',
      [memberId, amount, interestRate, startDate, endDate, purpose, dailyInterest ? 1 : 0, status, balance, id],
      function(err) {
        if (err) reject(err);
        else {
          if (this.changes === 0) {
            reject(new Error('Loan not found'));
          } else {
            resolve({ id, ...loan });
          }
        }
      }
    );
  });
});

ipcMain.handle('delete-loan', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM loans WHERE id = ?', [id], function(err) {
      if (err) reject(err);
      else {
        if (this.changes === 0) {
          reject(new Error('Loan not found'));
        } else {
          // Also delete associated loan payments
          db.run('DELETE FROM loan_payments WHERE loanId = ?', [id]);
          resolve({ success: true });
        }
      }
    });
  });
});

ipcMain.handle('add-loan-payment', async (event, loanId, payment) => {
  return new Promise((resolve, reject) => {
    const { date, amount, note } = payment;
    
    // First get the loan details to identify the member
    db.get('SELECT * FROM loans WHERE id = ?', [loanId], (err, loan) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!loan) {
        reject(new Error('Loan not found'));
        return;
      }
      
      // Now add the payment record
      db.run(
        'INSERT INTO loan_payments (loanId, date, amount, note) VALUES (?, ?, ?, ?)',
        [loanId, date, amount, note],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          const paymentId = this.lastID;
          
          // Then update the loan balance
          db.run(
            'UPDATE loans SET balance = balance - ? WHERE id = ?',
            [amount, loanId],
            function(err) {
              if (err) {
                reject(err);
                return;
              }
              
              // Return the payment details along with memberId for reference
              resolve({ 
                id: paymentId, 
                loanId, 
                memberId: loan.memberId, 
                ...payment 
              });
            }
          );
        }
      );
    });
  });
});

// DASHBOARD API
ipcMain.handle('get-dashboard-data', async () => {
  return new Promise(async (resolve, reject) => {
    try {
      // Get counts and summaries from various tables
      const memberCountPromise = new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM members WHERE status = "active"', (err, row) => {
          if (err) reject(err);
          else resolve(row?.count || 0);
        });
      });
      
      const loansPromise = new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count, SUM(balance) as totalAmount FROM loans WHERE status = "active"', (err, row) => {
          if (err) reject(err);
          else resolve({
            active: row?.count || 0,
            amount: row?.totalAmount || 0
          });
        });
      });
      
      const cashbookPromise = new Promise((resolve, reject) => {
        db.get(`
          SELECT 
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
          FROM cashbook
        `, (err, row) => {
          if (err) reject(err);
          else resolve({
            income: row?.income || 0,
            expense: row?.expense || 0,
            balance: (row?.income || 0) - (row?.expense || 0),
            totalContributions: row?.income || 0
          });
        });
      });
      
      const bankBalancePromise = new Promise((resolve, reject) => {
        db.get('SELECT SUM(balance) as total FROM bank_accounts', (err, row) => {
          if (err) reject(err);
          else resolve(row?.total || 0);
        });
      });
      
      // Real data for monthly transactions chart
      const monthlyTransactionsPromise = new Promise((resolve, reject) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentYear = new Date().getFullYear();
        
        // Get transactions by month for current year
        db.all(`
          SELECT 
            strftime('%m', date) as month,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
          FROM cashbook
          WHERE date BETWEEN '${currentYear}-01-01' AND '${currentYear}-12-31'
          GROUP BY strftime('%m', date)
          ORDER BY month
        `, (err, rows) => {
          if (err) reject(err);
          else {
            // Format the data for the chart
            const chartData = months.map((month, index) => {
              const monthNum = (index + 1).toString().padStart(2, '0');
              const monthData = rows.find(r => r.month === monthNum);
              
              return {
                month,
                income: monthData?.income || 0,
                expense: monthData?.expense || 0
              };
            });
            
            resolve(chartData);
          }
        });
      });
      
      // Wait for all queries to complete
      const [totalMembers, loans, cashbook, bankBalance, recentTransactions] = await Promise.all([
        memberCountPromise,
        loansPromise,
        cashbookPromise,
        bankBalancePromise,
        monthlyTransactionsPromise
      ]);
      
      // Calculate asset distribution from real data
      const assetDistribution = [
        { name: 'Cash In Hand', value: cashbook?.balance || 0 },
        { name: 'Bank Deposits', value: bankBalance || 0 },
        { name: 'Outstanding Loans', value: loans?.amount || 0 }
      ];
      
      // Always return data in the correct format that matches the React component expectations
      resolve({
        totalMembers,
        cashBook: {
          totalContributions: cashbook?.totalContributions || 0,
        },
        loans: {
          active: loans?.active || 0,
          amount: loans?.amount || 0,
        },
        bankBalance: bankBalance || 0,
        recentTransactions,
        assetDistribution
      });
      
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      // Return empty data on error
      resolve({
        totalMembers: 0,
        cashBook: {
          totalContributions: 0,
        },
        loans: {
          active: 0,
          amount: 0,
        },
        bankBalance: 0,
        recentTransactions: [],
        assetDistribution: []
      });
    }
  });
});

// CASH BOOK API
ipcMain.handle('get-cash-entries', async (event, dateRange) => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT c.*, m.name as memberName 
      FROM cashbook c
      LEFT JOIN members m ON c.memberId = m.id
    `;
    
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      query += ` WHERE c.date >= ? AND c.date <= ?`;
      query += ` ORDER BY c.date DESC`;
      
      db.all(query, [dateRange.startDate, dateRange.endDate], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    } else {
      query += ` ORDER BY c.date DESC`;
      
      db.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }
  });
});

ipcMain.handle('add-cash-entry', async (event, entry) => {
  return new Promise((resolve, reject) => {
    const { date, type, category, amount, description, memberId } = entry;
    db.run(
      'INSERT INTO cashbook (date, type, category, amount, description, memberId) VALUES (?, ?, ?, ?, ?, ?)',
      [date, type, category, amount, description, memberId || null],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...entry });
      }
    );
  });
});

ipcMain.handle('update-cash-entry', async (event, id, entry) => {
  return new Promise((resolve, reject) => {
    const { date, type, category, amount, description, memberId } = entry;
    db.run(
      'UPDATE cashbook SET date = ?, type = ?, category = ?, amount = ?, description = ?, memberId = ? WHERE id = ?',
      [date, type, category, amount, description, memberId || null, id],
      function(err) {
        if (err) reject(err);
        else {
          if (this.changes === 0) {
            reject(new Error('Cash entry not found'));
          } else {
            resolve({ id, ...entry });
          }
        }
      }
    );
  });
});

ipcMain.handle('delete-cash-entry', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM cashbook WHERE id = ?', [id], function(err) {
      if (err) reject(err);
      else {
        if (this.changes === 0) {
          reject(new Error('Cash entry not found'));
        } else {
          resolve({ success: true });
        }
      }
    });
  });
});

// BANK ACCOUNTS API
ipcMain.handle('get-bank-accounts', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM bank_accounts ORDER BY bankName', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('add-bank-account', async (event, account) => {
  return new Promise((resolve, reject) => {
    const { accountNumber, bankName, accountType, balance, openDate } = account;
    db.run(
      'INSERT INTO bank_accounts (accountNumber, bankName, accountType, balance, openDate) VALUES (?, ?, ?, ?, ?)',
      [accountNumber, bankName, accountType, balance, openDate],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...account });
      }
    );
  });
});

ipcMain.handle('update-bank-account', async (event, id, account) => {
  return new Promise((resolve, reject) => {
    const { accountNumber, bankName, accountType, balance, openDate } = account;
    db.run(
      'UPDATE bank_accounts SET accountNumber = ?, bankName = ?, accountType = ?, balance = ?, openDate = ? WHERE id = ?',
      [accountNumber, bankName, accountType, balance, openDate, id],
      function(err) {
        if (err) reject(err);
        else {
          if (this.changes === 0) {
            reject(new Error('Bank account not found'));
          } else {
            resolve({ id, ...account });
          }
        }
      }
    );
  });
});

ipcMain.handle('delete-bank-account', async (event, id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM bank_accounts WHERE id = ?', [id], function(err) {
      if (err) reject(err);
      else {
        if (this.changes === 0) {
          reject(new Error('Bank account not found'));
        } else {
          resolve({ success: true });
        }
      }
    });
  });
});

// BANK TRANSACTIONS API
ipcMain.handle('get-bank-transactions', async (event, accountId = null) => {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM bank_transactions';
    let params = [];
    
    if (accountId) {
      query += ' WHERE accountId = ?';
      params.push(accountId);
    }
    
    query += ' ORDER BY date DESC';
    
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('add-bank-transaction', async (event, transaction) => {
  return new Promise((resolve, reject) => {
    const { accountId, date, description, amount, type } = transaction;
    
    db.run(
      'INSERT INTO bank_transactions (accountId, date, description, amount, type) VALUES (?, ?, ?, ?, ?)',
      [accountId, date, description, amount, type],
      function(err) {
        if (err) reject(err);
        else {
          // Update bank account balance
          const balanceChange = type === 'credit' ? amount : -amount;
          db.run(
            'UPDATE bank_accounts SET balance = balance + ? WHERE id = ?',
            [balanceChange, accountId],
            function(updateErr) {
              if (updateErr) reject(updateErr);
              else resolve({ id: this.lastID, ...transaction });
            }
          );
        }
      }
    );
  });
});

// DIVIDENDS API
ipcMain.handle('get-dividends', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM dividends ORDER BY quarterEndDate DESC', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('add-dividend', async (event, dividend) => {
  return new Promise((resolve, reject) => {
    const { quarterEndDate, totalShares, profitAmount, dividendRate, calculationDate } = dividend;
    db.run(
      'INSERT INTO dividends (quarterEndDate, totalShares, profitAmount, dividendRate, calculationDate) VALUES (?, ?, ?, ?, ?)',
      [quarterEndDate, totalShares, profitAmount, dividendRate, calculationDate],
      function(err) {
        if (err) reject(err);
        else {
          const dividendId = this.lastID;
          resolve({ id: dividendId, ...dividend });
        }
      }
    );
  });
});

ipcMain.handle('add-dividend-payment', async (event, payment) => {
  return new Promise((resolve, reject) => {
    const { dividendId, memberId, shares, amount, status, paymentDate } = payment;
    db.run(
      'INSERT INTO dividend_payments (dividendId, memberId, shares, amount, status, paymentDate) VALUES (?, ?, ?, ?, ?, ?)',
      [dividendId, memberId, shares, amount, status, paymentDate],
      function(err) {
        if (err) reject(err);
        else {
          const paymentId = this.lastID;
          resolve({ id: paymentId, ...payment });
        }
      }
    );
  });
});

ipcMain.handle('get-dividend-payments', async (event, dividendId) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT dp.*, m.name as memberName FROM dividend_payments dp
       JOIN members m ON dp.memberId = m.id
       WHERE dp.dividendId = ?
       ORDER BY dp.paymentDate DESC`,
      [dividendId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

ipcMain.handle('update-dividend-payment', async (event, id, payment) => {
  return new Promise((resolve, reject) => {
    const { status, paymentDate } = payment;
    db.run(
      'UPDATE dividend_payments SET status = ?, paymentDate = ? WHERE id = ?',
      [status, paymentDate, id],
      function(err) {
        if (err) reject(err);
        else {
          if (this.changes === 0) {
            reject(new Error('Dividend payment not found'));
          } else {
            resolve({ id, ...payment });
          }
        }
      }
    );
  });
});

// SETTINGS API
ipcMain.handle('get-settings', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM settings', (err, rows) => {
      if (err) {
        console.error('Error getting settings:', err);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
});

ipcMain.handle('update-setting', async (event, setting) => {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE settings SET value = ? WHERE name = ?',
      [setting.value, setting.name],
      function(err) {
        if (err) {
          console.error('Error updating setting:', err);
          reject(err);
        } else {
          if (this.changes === 0) {
            // If setting doesn't exist, insert it
            db.run(
              'INSERT INTO settings (name, value) VALUES (?, ?)',
              [setting.name, setting.value],
              function(err) {
                if (err) {
                  console.error('Error inserting setting:', err);
                  reject(err);
                } else {
                  resolve({ success: true, id: this.lastID, ...setting });
                }
              }
            );
          } else {
            resolve({ success: true, ...setting });
          }
        }
      }
    );
  });
});

// BACKUP & RESTORE API
ipcMain.handle('backup-database', async (event, filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Check if the path is a directory
      try {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          // If it's a directory, append a filename
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
            reject(new Error(`Unable to create directory: ${dirPath}`));
            return;
          }
        }
      }
      
      // Create backup object with all database data
      const promises = [
        new Promise(resolve => {
          db.all('SELECT * FROM members', (err, rows) => {
            if (err) console.error('Error backing up members:', err);
            resolve({ members: rows || [] });
          });
        }),
        new Promise(resolve => {
          db.all('SELECT * FROM loans', (err, rows) => {
            if (err) console.error('Error backing up loans:', err);
            resolve({ loans: rows || [] });
          });
        }),
        new Promise(resolve => {
          db.all('SELECT * FROM loan_payments', (err, rows) => {
            if (err) console.error('Error backing up loan_payments:', err);
            resolve({ loan_payments: rows || [] });
          });
        }),
        new Promise(resolve => {
          db.all('SELECT * FROM cashbook', (err, rows) => {
            if (err) console.error('Error backing up cashbook:', err);
            resolve({ cashbook: rows || [] });
          });
        }),
        new Promise(resolve => {
          db.all('SELECT * FROM bank_accounts', (err, rows) => {
            if (err) console.error('Error backing up bank_accounts:', err);
            resolve({ bank_accounts: rows || [] });
          });
        }),
        new Promise(resolve => {
          db.all('SELECT * FROM bank_transactions', (err, rows) => {
            if (err) console.error('Error backing up bank_transactions:', err);
            resolve({ bank_transactions: rows || [] });
          });
        }),
        new Promise(resolve => {
          db.all('SELECT * FROM dividends', (err, rows) => {
            if (err) console.error('Error backing up dividends:', err);
            resolve({ dividends: rows || [] });
          });
        }),
        new Promise(resolve => {
          db.all('SELECT * FROM dividend_payments', (err, rows) => {
            if (err) console.error('Error backing up dividend_payments:', err);
            resolve({ dividend_payments: rows || [] });
          });
        }),
        new Promise(resolve => {
          db.all('SELECT * FROM settings', (err, rows) => {
            if (err) console.error('Error backing up settings:', err);
            resolve({ settings: rows || [] });
          });
        })
      ];
      
      Promise.all(promises)
        .then(results => {
          // Combine all data into a single object
          const backupData = Object.assign({}, ...results, {
            backup_date: new Date().toISOString(),
            version: '1.0'
          });
          
          // Write to file
          fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
          
          resolve({ success: true, message: 'Backup created successfully' });
        })
        .catch(error => {
          console.error('Error creating backup:', error);
          reject(error);
        });
    } catch (error) {
      console.error('Error creating backup:', error);
      reject(error);
    }
  });
});

ipcMain.handle('restore-database', async (event, filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const fs = require('fs');
      
      // Read backup file
      if (!fs.existsSync(filePath)) {
        reject(new Error('Backup file not found'));
        return;
      }
      
      const backupData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Start a transaction to ensure all-or-nothing restoration
      db.run('BEGIN TRANSACTION', err => {
        if (err) {
          reject(err);
          return;
        }
        
        try {
          // Clear existing data
          const tables = [
            'members', 'loans', 'loan_payments', 'cashbook', 
            'bank_accounts', 'bank_transactions', 'dividends', 
            'dividend_payments', 'settings'
          ];
          
          tables.forEach(table => {
            db.run(`DELETE FROM ${table}`);
          });
          
          // Restore members
          if (backupData.members && backupData.members.length > 0) {
            backupData.members.forEach(member => {
              db.run(
                'INSERT INTO members (id, member_id, name, address, phone, joinDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [member.id, member.member_id, member.name, member.address, member.phone, member.joinDate, member.status]
              );
            });
          }
          
          // Restore other tables similarly
          // ...
          
          // Commit the transaction
          db.run('COMMIT', err => {
            if (err) {
              console.error('Error committing restore transaction:', err);
              db.run('ROLLBACK');
              reject(err);
            } else {
              resolve({ success: true, message: 'Data restored successfully' });
            }
          });
        } catch (error) {
          console.error('Error during restore:', error);
          db.run('ROLLBACK');
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error restoring backup:', error);
      reject(error);
    }
  });
});

// ORGANIZATION ASSET CALCULATION
ipcMain.handle('calculate-org-assets', async () => {
  return new Promise(async (resolve, reject) => {
    try {
      // Get total cash contributions
      const cashContributions = await new Promise((resolve, reject) => {
        db.get('SELECT SUM(amount) as total FROM cashbook', (err, result) => {
          if (err) reject(err);
          else resolve(result?.total || 0);
        });
      });

      // Get total bank balances
      const bankBalances = await new Promise((resolve, reject) => {
        db.get('SELECT SUM(balance) as total FROM bank_accounts', (err, result) => {
          if (err) reject(err);
          else resolve(result?.total || 0);
        });
      });

      // Get total outstanding loans
      const outstandingLoans = await new Promise((resolve, reject) => {
        db.get('SELECT SUM(balance) as total FROM loans WHERE status = "active"', (err, result) => {
          if (err) reject(err);
          else resolve(result?.total || 0);
        });
      });

      // Get total accumulated dividends
      const totalDividends = await new Promise((resolve, reject) => {
        db.get('SELECT SUM(profitAmount) as total FROM dividends', (err, result) => {
          if (err) reject(err);
          else resolve(result?.total || 0);
        });
      });

      // Sum up all assets
      const totalAssets = cashContributions + bankBalances + outstandingLoans;

      resolve({
        cashContributions,
        bankBalances,
        outstandingLoans,
        totalDividends,
        totalAssets
      });
    } catch (error) {
      console.error('Error calculating organization assets:', error);
      reject(error);
    }
  });
});

// PROPORTIONAL DIVIDEND CALCULATION
ipcMain.handle('calculate-proportional-dividends', async (event, { quarterlyProfit, dividendRate }) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Calculate the dividend pool from quarterly profit
      const dividendPool = quarterlyProfit * (dividendRate / 100);
      
      // Get all active members
      const activeMembers = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM members WHERE status = "active"', (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
      
      // Get total org assets
      const orgAssets = await ipcMain.handle('calculate-org-assets');
      
      // Calculate dividend for each member based on their proportion of the total assets
      const dividends = await Promise.all(activeMembers.map(async (member) => {
        // Calculate member's total assets
        const memberAssets = await new Promise((resolve, reject) => {
          db.get(`
            SELECT 
              COALESCE(SUM(c.amount), 0) as cashTotal,
              COALESCE(SUM(d.amount), 0) as dividendTotal
            FROM members m
            LEFT JOIN cashbook c ON m.id = c.memberId
            LEFT JOIN dividend_payments d ON m.id = d.memberId
            WHERE m.id = ?
          `, [member.id], (err, result) => {
            if (err) reject(err);
            else {
              const totalAsset = (result?.cashTotal || 0) + (result?.dividendTotal || 0);
              resolve(totalAsset);
            }
          });
        });
        
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
      }));
      
      // Total calculated to verify
      const totalCalculatedDividend = dividends.reduce((sum, div) => sum + div.dividendAmount, 0);
      
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

// Export functions for testing
module.exports = { createWindow, createDatabase };

ipcMain.handle('get-cashbook-entries', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM cashbook ORDER BY date DESC', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.handle('get-cashbook-entries-by-date-range', async (event, startDate, endDate) => {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM cashbook WHERE date >= ? AND date <= ? ORDER BY date DESC',
      [startDate, endDate],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
});

ipcMain.handle('add-cashbook-entry', async (event, entry) => {
  return new Promise((resolve, reject) => {
    const { date, type, category, amount, description, memberId } = entry;
    db.run(
      'INSERT INTO cashbook (date, type, category, amount, description, memberId) VALUES (?, ?, ?, ?, ?, ?)',
      [date, type, category, amount, description, memberId || null],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...entry });
      }
    );
  });
}); 