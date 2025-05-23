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
      endDate TEXT,
      purpose TEXT,
      dailyInterest INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      balance REAL,
      interest REAL DEFAULT 0,
      FOREIGN KEY(memberId) REFERENCES members(id)
    )`,
    `CREATE TABLE IF NOT EXISTS loan_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loanId INTEGER,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      interestAmount REAL,
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      value TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT,
      last_login TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS loan_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      interest_rate REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sms_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      value TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS sms_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT,
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
      response_data TEXT
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

    // Check settings table structure
    db.all("PRAGMA table_info(settings)", (err, cols) => {
      if (err) {
        console.error('Error checking settings table schema:', err);
        return;
      }
      
      // Check if value column exists
      if (cols.length > 0) {
        const hasValueColumn = cols.some(col => col.name === 'value');
        
        if (!hasValueColumn) {
          console.log('Settings table exists but missing value column. Fixing...');
          
          // Begin transaction to fix the table
          db.run('BEGIN TRANSACTION', (err) => {
            if (err) {
              console.error('Error starting transaction:', err);
              return;
            }
            
            // Create a new table with correct structure
            db.run(`
              CREATE TABLE settings_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE,
                value TEXT
              )
            `, (err) => {
              if (err) {
                console.error('Error creating new settings table:', err);
                db.run('ROLLBACK');
                return;
              }
              
              // Extract settings from old table
              db.all('SELECT * FROM settings', (err, rows) => {
                if (err) {
                  console.error('Error getting old settings:', err);
                  db.run('ROLLBACK');
                  return;
                }
                
                // Migration complete handler
                const finalizeMigration = () => {
                  // Drop old table and rename new one
                  db.run('DROP TABLE settings', (err) => {
                    if (err) {
                      console.error('Error dropping old table:', err);
                      db.run('ROLLBACK');
                      return;
                    }
                    
                    db.run('ALTER TABLE settings_new RENAME TO settings', (err) => {
                      if (err) {
                        console.error('Error renaming table:', err);
                        db.run('ROLLBACK');
                        return;
                      }
                      
                      db.run('COMMIT', (err) => {
                        if (err) {
                          console.error('Error committing transaction:', err);
                          db.run('ROLLBACK');
                        } else {
                          console.log('Settings table fixed successfully');
                          // After fixing, ensure we have default settings
                          checkDefaultSettings();
                        }
                      });
                    });
                  });
                };
                
                if (rows.length === 0) {
                  finalizeMigration();
                  return;
                }
                
                // Try to migrate data
                let migrated = 0;
                let expected = 0;
                
                // Count settings with extractable data
                for (const row of rows) {
                  // If it has a name field, we'll try to migrate it
                  if (row.name) expected++;
                }
                
                if (expected === 0) {
                  finalizeMigration();
                  return;
                }
                
                for (const row of rows) {
                  const name = row.name;
                  if (!name) continue;
                  
                  // Try to find a value from another column
                  let value = null;
                  for (const key in row) {
                    if (key !== 'id' && key !== 'name' && row[key]) {
                      value = String(row[key]);
                      break;
                    }
                  }
                  
                  if (value === null) {
                    migrated++;
                    if (migrated === expected) finalizeMigration();
                    continue;
                  }
                  
                  db.run('INSERT INTO settings_new (name, value) VALUES (?, ?)', [name, value], (err) => {
                    migrated++;
                    if (err) {
                      console.error(`Error migrating setting ${name}:`, err);
                    }
                    
                    if (migrated === expected) {
                      finalizeMigration();
                    }
                  });
                }
              });
            });
          });
        } else {
          // Settings table exists and has value column, just check defaults
          checkDefaultSettings();
        }
      } else {
        // Table doesn't exist or is empty, just check defaults
        checkDefaultSettings();
      }
    });
    
    function checkDefaultSettings() {
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
          
          // Insert default settings as name/value pairs
          const settingsInserts = [
            ['auto_backup_enabled', 'false'],
            ['auto_backup_frequency', 'weekly'],
            ['auto_backup_time', '00:00'],
            ['auto_backup_path', ''],
            ['orgName', defaultSettings.orgName],
            ['orgAddress', defaultSettings.orgAddress],
            ['orgPhone', defaultSettings.orgPhone],
            ['orgEmail', defaultSettings.orgEmail],
            ['registrationNumber', defaultSettings.registrationNumber],
            ['foundedYear', defaultSettings.foundedYear.toString()],
            ['taxId', defaultSettings.taxId],
            ['quarterEndMonths', defaultSettings.quarterEndMonths],
            ['defaultLoanInterest', defaultSettings.defaultLoanInterest.toString()],
            ['membershipFee', defaultSettings.membershipFee.toString()],
            ['shareValue', defaultSettings.shareValue.toString()]
          ];
          
          const insertStatement = db.prepare('INSERT OR IGNORE INTO settings (name, value) VALUES (?, ?)');
          
          for (const [name, value] of settingsInserts) {
            insertStatement.run(name, value, (err) => {
              if (err) {
                console.error(`Error inserting default setting ${name}:`, err);
              }
            });
          }
          
          insertStatement.finalize((err) => {
            if (err) {
              console.error('Error finalizing settings insertion:', err);
            } else {
              console.log('Default settings created');
            }
          });
        } else {
          // Ensure auto backup settings exist
          const autoBackupSettings = [
            ['auto_backup_enabled', 'false'],
            ['auto_backup_frequency', 'weekly'],
            ['auto_backup_time', '00:00'],
            ['auto_backup_path', '']
          ];
          
          const insertStatement = db.prepare('INSERT OR IGNORE INTO settings (name, value) VALUES (?, ?)');
          
          for (const [name, value] of autoBackupSettings) {
            insertStatement.run(name, value, (err) => {
              if (err) {
                console.error(`Error inserting auto backup setting ${name}:`, err);
              }
            });
          }
          
          insertStatement.finalize((err) => {
            if (err) {
              console.error('Error finalizing auto backup settings insertion:', err);
            }
          });
        }
      });
    }

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
  // Create tables if they don't exist
  const migrations = [
    // Add any missing columns for loan_payments table
    "PRAGMA table_info(loan_payments)",
    (columns) => {
      const columnNames = columns.map(col => col.name);
      
      if (!columnNames.includes('interestAmount')) {
        return "ALTER TABLE loan_payments ADD COLUMN interestAmount REAL DEFAULT 0";
      }
      return null;
    },
    
    // Add any missing columns for loans table
    "PRAGMA table_info(loans)",
    (columns) => {
      const columnNames = columns.map(col => col.name);
      
      if (!columnNames.includes('interest')) {
        return "ALTER TABLE loans ADD COLUMN interest REAL DEFAULT 0";
      }
      return null;
    }
  ];

  // Run migrations
  db.serialize(() => {
    for (let i = 0; i < migrations.length; i += 2) {
      const query = migrations[i];
      const migrationFn = migrations[i + 1];
      
      db.all(query, (err, results) => {
        if (err) {
          console.error(`Error in migration query ${query}:`, err);
          return;
        }
        
        const migrationQuery = migrationFn(results);
        if (migrationQuery) {
          console.log(`Running migration: ${migrationQuery}`);
          db.run(migrationQuery, (err) => {
            if (err) {
              console.error(`Error in migration: ${migrationQuery}`, err);
            } else {
              console.log(`Migration completed: ${migrationQuery}`);
            }
          });
        }
      });
    }
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
        db.all('SELECT id, date, description, amount, CASE WHEN category = "Member Fee" THEN "member_fee" ELSE "cash" END as type FROM cashbook WHERE memberId = ?', 
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
    
    // Handle optional endDate
    let query, params;
    if (endDate) {
      query = 'INSERT INTO loans (memberId, amount, interestRate, startDate, endDate, purpose, dailyInterest, status, balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
      params = [memberId, amount, interestRate, startDate, endDate, purpose, dailyInterest ? 1 : 0, status || 'active', balance || amount];
    } else {
      query = 'INSERT INTO loans (memberId, amount, interestRate, startDate, purpose, dailyInterest, status, balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
      params = [memberId, amount, interestRate, startDate, purpose, dailyInterest ? 1 : 0, status || 'active', balance || amount];
    }
    
    db.run(query, params, function(err) {
      if (err) {
        console.error('Error adding loan:', err);
        reject(err);
      } else {
        resolve({ id: this.lastID, ...loan });
      }
    });
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
    const { date, amount, note, premium_amount, interest_amount } = payment;
    
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
      
      // Now add the payment record with interest and principal information
      db.run(
        'INSERT INTO loan_payments (loanId, date, amount, note, interestAmount) VALUES (?, ?, ?, ?, ?)',
        [loanId, date, amount, note, interest_amount || 0],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          const paymentId = this.lastID;
          
          // Then update the loan balance (only reduce by principal amount) and record interest
          db.run(
            'UPDATE loans SET balance = balance - ?, interest = interest + ? WHERE id = ?',
            [premium_amount || 0, interest_amount || 0, loanId],
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
                premium_amount: premium_amount || 0,
                interest_amount: interest_amount || 0,
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
    // First, ensure the settings table exists with the correct schema
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        value TEXT
      )
    `, function(tableErr) {
      if (tableErr) {
        console.error('Error creating settings table:', tableErr);
        reject(tableErr);
        return;
      }
      
      // Try to update first
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
});

// BACKUP & RESTORE API
ipcMain.handle('backup-data', async (event, filePath) => {
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

ipcMain.handle('restore-data', async (event, filePath) => {
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

// CALCULATE MEMBER ASSET
ipcMain.handle('calculate-member-asset', async (event, memberId) => {
  return new Promise((resolve, reject) => {
    try {
      // First get member's cash book total
      db.get(
        `SELECT COALESCE(SUM(amount), 0) as cashTotal 
         FROM cashbook 
         WHERE memberId = ?`,
        [memberId],
        (err, cashResult) => {
          if (err) {
            reject(err);
            return;
          }

          // Then get member's dividend total
          db.get(
            `SELECT COALESCE(SUM(amount), 0) as dividendTotal 
             FROM dividend_payments 
             WHERE memberId = ?`,
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

// CALCULATE QUARTERLY DIVIDENDS BY YEAR
ipcMain.handle('calculate-quarterly-dividends-by-year', async (event, { year, dividendRate }) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Get all active members
      const activeMembers = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM members WHERE status = "active"', (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
      
      if (activeMembers.length === 0) {
        resolve({
          year,
          dividendRate,
          quarterlyDividends: [],
          yearlyDividends: [],
          totalYearlyDividend: 0
        });
        return;
      }
      
      // Calculate quarterly profits for the year
      const quarterlyProfits = [];
      for (let quarter = 1; quarter <= 4; quarter++) {
        // Define quarter start and end dates
        const quarterEndMonth = quarter * 3;
        const quarterEndDate = `${year}-${String(quarterEndMonth).padStart(2, '0')}-${['31', '30', '30', '31'][quarter-1]}`;
        
        // Get profit for this quarter based on date range rather than explicit quarter column
        const quarterStartDate = quarter > 1 
          ? `${year}-${String((quarter-1) * 3 + 1).padStart(2, '0')}-01`
          : `${year}-01-01`;
        
        const profit = await new Promise((resolve, reject) => {
          db.get(
            `SELECT COALESCE(SUM(profitAmount), 0) as total FROM dividends 
             WHERE quarterEndDate >= ? AND quarterEndDate <= ?`,
            [quarterStartDate, quarterEndDate],
            (err, result) => {
              if (err) reject(err);
              else resolve(result?.total || 0);
            }
          );
        });
        
        quarterlyProfits.push({ quarter, profit });
      }
      
      // For each quarter, calculate dividend distribution
      const quarterlyDividends = await Promise.all(quarterlyProfits.map(async ({ quarter, profit }) => {
        // Calculate dividend pool for this quarter
        const dividendPool = profit * (dividendRate / 100);
        
        // Get organization assets at the end of this quarter
        const quarterEndMonth = quarter * 3;
        const quarterEndDate = `${year}-${String(quarterEndMonth).padStart(2, '0')}-${['31', '30', '30', '31'][quarter-1]}`;
        
        // Get total org assets at quarter end
        const cashContributions = await new Promise((resolve, reject) => {
          db.get(
            `SELECT COALESCE(SUM(amount), 0) as total FROM cashbook WHERE date <= ?`,
            [quarterEndDate],
            (err, result) => {
              if (err) reject(err);
              else resolve(result?.total || 0);
            }
          );
        });
        
        const totalOrgAssets = cashContributions;
        
        // Calculate each member's dividend for this quarter
        const memberDividends = await Promise.all(activeMembers.map(async (member) => {
          try {
            // Calculate member's assets at the end of this quarter
            const cashResult = await new Promise((resolve, reject) => {
              db.get(
                `SELECT COALESCE(SUM(amount), 0) as cashTotal FROM cashbook 
                 WHERE memberId = ? AND date <= ?`,
                [member.id, quarterEndDate],
                (err, result) => {
                  if (err) reject(err);
                  else resolve(result || { cashTotal: 0 });
                }
              );
            });
            
            const dividendResult = await new Promise((resolve, reject) => {
              db.get(
                `SELECT COALESCE(SUM(amount), 0) as dividendTotal FROM dividend_payments 
                 WHERE memberId = ? AND paymentDate <= ?`,
                [member.id, quarterEndDate],
                (err, result) => {
                  if (err) reject(err);
                  else resolve(result || { dividendTotal: 0 });
                }
              );
            });
            
            const cashTotal = cashResult.cashTotal || 0;
            const dividendTotal = dividendResult.dividendTotal || 0;
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

// Report Generation
ipcMain.handle('generate-report', async (event, reportType, params) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { dialog } = require('electron');
    const XLSX = require('xlsx');
    const PDFDocument = require('pdfkit');
    
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
    let sheetData = [];
    let pdfTitle = '';
    
    switch (reportType) {
      case 'member-statement':
        // Get member data
        const member = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM members WHERE id = ?', [params.memberId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        
        if (!member) {
          return { success: false, message: 'Member not found' };
        }
        
        // Get member transactions
        const transactions = await new Promise((resolve, reject) => {
          db.all(
            'SELECT * FROM cashbook WHERE memberId = ? AND date BETWEEN ? AND ? ORDER BY date DESC',
            [params.memberId, params.startDate, params.endDate],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            }
          );
        });
        
        // Get member loans
        const loans = await new Promise((resolve, reject) => {
          db.all(
            'SELECT * FROM loans WHERE memberId = ? ORDER BY startDate DESC',
            [params.memberId],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            }
          );
        });
        
        reportData.member = member;
        reportData.transactions = transactions;
        reportData.loans = loans;
        pdfTitle = `Member Statement - ${member.name}`;
        
        // Format data for Excel
        sheetData = [
          ['Member Statement'],
          ['Member ID', member.member_id],
          ['Name', member.name],
          ['Join Date', member.joinDate],
          ['Status', member.status],
          [''],
          ['Transactions'],
          ['Date', 'Type', 'Category', 'Description', 'Amount']
        ];
        
        // Add transactions
        transactions.forEach(t => {
          sheetData.push([
            new Date(t.date).toLocaleDateString(),
            t.type,
            t.category || '',
            t.description || '',
            t.amount
          ]);
        });
        
        // Add loans section
        sheetData.push([''], ['Loans'], ['Start Date', 'Amount', 'Interest Rate', 'Balance', 'Purpose']);
        loans.forEach(loan => {
          sheetData.push([
            new Date(loan.startDate).toLocaleDateString(),
            loan.amount,
            loan.interestRate + '%',
            loan.balance,
            loan.purpose || ''
          ]);
        });
        break;
        
      case 'cash-flow':
        // Get income and expense transactions
        const cashflow = await new Promise((resolve, reject) => {
          db.all(
            'SELECT type, category, SUM(amount) as total FROM cashbook WHERE date BETWEEN ? AND ? GROUP BY type, category',
            [params.startDate, params.endDate],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            }
          );
        });
        
        reportData.cashflow = cashflow;
        pdfTitle = 'Cash Flow Report';
        
        // Format data for Excel
        sheetData = [
          ['Cash Flow Report'],
          [`Period: ${new Date(params.startDate).toLocaleDateString()} to ${new Date(params.endDate).toLocaleDateString()}`],
          [''],
          ['Type', 'Category', 'Total Amount']
        ];
        
        // Calculate totals
        let totalIncome = 0;
        let totalExpense = 0;
        
        // Add cashflow data
        cashflow.forEach(flow => {
          sheetData.push([flow.type, flow.category, flow.total]);
          if (flow.type === 'income') totalIncome += flow.total;
          else if (flow.type === 'expense') totalExpense += flow.total;
        });
        
        // Add summary row
        sheetData.push([''], ['Summary'], ['Total Income', totalIncome], ['Total Expense', totalExpense], ['Net Cash Flow', totalIncome - totalExpense]);
        
        break;
        
      case 'loan-summary':
        // Get active loans
        const activeLoans = await new Promise((resolve, reject) => {
          db.all(
            'SELECT l.*, m.name as memberName FROM loans l JOIN members m ON l.memberId = m.id WHERE l.status = "active"',
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            }
          );
        });
        
        // Get loan payments in the period
        const payments = await new Promise((resolve, reject) => {
          db.all(
            'SELECT lp.*, l.memberId, m.name as memberName FROM loan_payments lp JOIN loans l ON lp.loanId = l.id JOIN members m ON l.memberId = m.id WHERE lp.date BETWEEN ? AND ?',
            [params.startDate, params.endDate],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            }
          );
        });
        
        reportData.loans = activeLoans;
        reportData.payments = payments;
        pdfTitle = 'Loan Summary Report';
        
        // Format data for Excel
        sheetData = [
          ['Loan Summary Report'],
          [`Period: ${new Date(params.startDate).toLocaleDateString()} to ${new Date(params.endDate).toLocaleDateString()}`],
          [''],
          ['Active Loans'],
          ['Member', 'Start Date', 'Amount', 'Interest Rate', 'Balance', 'Purpose']
        ];
        
        // Add active loans
        activeLoans.forEach(loan => {
          sheetData.push([
            loan.memberName,
            new Date(loan.startDate).toLocaleDateString(),
            loan.amount,
            loan.interestRate + '%',
            loan.balance,
            loan.purpose || ''
          ]);
        });
        
        // Add payment section
        sheetData.push([''], ['Recent Payments'], ['Date', 'Member', 'Amount', 'Note']);
        payments.forEach(payment => {
          sheetData.push([
            new Date(payment.date).toLocaleDateString(),
            payment.memberName,
            payment.amount,
            payment.note || ''
          ]);
        });
        break;
        
      case 'quarterly-profit':
        // Get income totals
        const income = await new Promise((resolve, reject) => {
          db.get(
            'SELECT SUM(amount) as total FROM cashbook WHERE type = "income" AND date BETWEEN ? AND ?',
            [params.startDate, params.endDate],
            (err, row) => {
              if (err) reject(err);
              else resolve(row || { total: 0 });
            }
          );
        });
        
        // Get expense totals
        const expenses = await new Promise((resolve, reject) => {
          db.get(
            'SELECT SUM(amount) as total FROM cashbook WHERE type = "expense" AND date BETWEEN ? AND ?',
            [params.startDate, params.endDate],
            (err, row) => {
              if (err) reject(err);
              else resolve(row || { total: 0 });
            }
          );
        });
        
        // Calculate profit
        const incomeTotal = income.total || 0;
        const expenseTotal = expenses.total || 0;
        const profit = incomeTotal - expenseTotal;
        
        reportData.income = incomeTotal;
        reportData.expenses = expenseTotal;
        reportData.profit = profit;
        pdfTitle = 'Quarterly Profit Report';
        
        // Format data for Excel
        sheetData = [
          ['Quarterly Profit Report'],
          [`Period: ${new Date(params.startDate).toLocaleDateString()} to ${new Date(params.endDate).toLocaleDateString()}`],
          [''],
          ['Income', incomeTotal],
          ['Expenses', expenseTotal],
          ['Profit', profit],
          [''],
          ['Profit percentage', profit > 0 ? ((profit / incomeTotal) * 100).toFixed(2) + '%' : '0%']
        ];
        break;
        
      case 'balance-sheet':
        // Get assets
        const cashAssets = await new Promise((resolve, reject) => {
          db.get(
            'SELECT SUM(amount) as total FROM cashbook WHERE type = "income"',
            (err, row) => {
              if (err) reject(err);
              else resolve(row || { total: 0 });
            }
          );
        });
        
        const cashLiabilities = await new Promise((resolve, reject) => {
          db.get(
            'SELECT SUM(amount) as total FROM cashbook WHERE type = "expense"',
            (err, row) => {
              if (err) reject(err);
              else resolve(row || { total: 0 });
            }
          );
        });
        
        const loanAssets = await new Promise((resolve, reject) => {
          db.get(
            'SELECT SUM(balance) as total FROM loans WHERE status = "active"',
            (err, row) => {
              if (err) reject(err);
              else resolve(row || { total: 0 });
            }
          );
        });
        
        const bankBalances = await new Promise((resolve, reject) => {
          db.get(
            'SELECT SUM(balance) as total FROM bank_accounts',
            (err, row) => {
              if (err) reject(err);
              else resolve(row || { total: 0 });
            }
          );
        });
        
        const cashBalance = (cashAssets.total || 0) - (cashLiabilities.total || 0);
        const loanBalance = loanAssets.total || 0;
        const bankBalance = bankBalances.total || 0;
        const totalAssets = cashBalance + loanBalance + bankBalance;
        
        reportData.balanceSheet = {
          assets: {
            cash: cashBalance,
            loans: loanBalance,
            bank: bankBalance,
            total: totalAssets
          }
        };
        pdfTitle = 'Balance Sheet Report';
        
        // Format data for Excel
        sheetData = [
          ['Balance Sheet Report'],
          [`As of: ${new Date().toLocaleDateString()}`],
          [''],
          ['Assets'],
          ['Cash Balance', cashBalance],
          ['Outstanding Loans', loanBalance],
          ['Bank Deposits', bankBalance],
          ['Total Assets', totalAssets]
        ];
        break;
        
      default:
        return { success: false, message: 'Invalid report type' };
    }
    
    // Add period to report data
    reportData.period = {
      startDate: params.startDate,
      endDate: params.endDate
    };
    
    // Generate the file in requested format
    if (params.format === 'pdf') {
      // Create PDF file
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);
      
      // Add title
      doc.fontSize(16).text(pdfTitle, { align: 'center' });
      doc.moveDown();
      
      // Add period
      doc.fontSize(12).text(`Period: ${new Date(params.startDate).toLocaleDateString()} to ${new Date(params.endDate).toLocaleDateString()}`, { align: 'center' });
      doc.moveDown();
      
      // Add data from sheetData
      sheetData.forEach(row => {
        if (row.length === 0 || row[0] === '') {
          doc.moveDown();
        } else if (row.length === 1) {
          // Section header
          doc.fontSize(14).text(row[0]);
          doc.moveDown();
        } else {
          // Regular row
          const text = row.join(': ');
          doc.fontSize(10).text(text);
        }
      });
      
      // Finalize PDF
      doc.end();
      
      // Wait for the stream to finish
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });
      
    } else {
      // Create Excel file
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Add some styling
      ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 15 }];
      
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, filePath);
    }
    
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

// Export functions for testing
module.exports = { createWindow, createDatabase }; 

// SMS Services
ipcMain.handle('send-sms', async (event, phoneNumber, message) => {
  return new Promise((resolve, reject) => {
    // First ensure SMS tables exist
    ensureSMSTables(() => {
      // Function to query settings from sms_settings table
        db.get('SELECT value FROM sms_settings WHERE name = ?', ['sms_api_key'], (err, apiKeyRow) => {
          if (err) {
            console.error('Error getting SMS API key:', err);
            reject(err);
            return;
          }
          
          db.get('SELECT value FROM sms_settings WHERE name = ?', ['sms_user_id'], (err, userIdRow) => {
            if (err) {
              console.error('Error getting SMS user ID:', err);
              reject(err);
              return;
            }
            
            db.get('SELECT value FROM sms_settings WHERE name = ?', ['sms_enabled'], (err, enabledRow) => {
              if (err) {
                console.error('Error getting SMS enabled setting:', err);
                reject(err);
                return;
              }
              
              db.get('SELECT value FROM sms_settings WHERE name = ?', ['sms_sender_id'], (err, senderIdRow) => {
                if (err) {
                  console.error('Error getting SMS sender ID:', err);
                  reject(err);
                  return;
                }
                
                const apiKey = apiKeyRow ? apiKeyRow.value : '';
                const userId = userIdRow ? userIdRow.value : '';
                const enabled = enabledRow ? enabledRow.value === 'true' : false;
                const senderId = senderIdRow ? senderIdRow.value : 'FINANCIALORG';
                
                // Check if SMS is enabled
                if (!enabled || !apiKey || !userId) {
                  console.log('SMS is disabled or API credentials not set');
                  resolve({ success: false, error: 'SMS is disabled or API credentials not set' });
                  return;
                }
                
                // Format phone number
                let formattedPhone = phoneNumber.replace(/\D/g, '');
                if (formattedPhone.startsWith('0')) {
                  formattedPhone = formattedPhone.substring(1);
                }
                if (!formattedPhone.startsWith('94')) {
                  formattedPhone = '94' + formattedPhone;
                }
                
                // Send SMS using notify.lk API
                const axios = require('axios');
                const https = require('https');
                
                const params = new URLSearchParams();
                params.append('user_id', userId);
                params.append('api_key', apiKey);
                params.append('sender_id', senderId);
                params.append('to', formattedPhone);
                params.append('message', message);
                
                axios.post('https://app.notify.lk/api/v1/send', params, {
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                  },
                  httpsAgent: new https.Agent({
                    rejectUnauthorized: false
                  })
                })
                .then(response => {
                  // Log SMS in database
                  db.run(
                    'INSERT INTO sms_logs (phone_number, message, status, response_data) VALUES (?, ?, ?, ?)',
                    [formattedPhone, message, response.data.status, JSON.stringify(response.data)],
                    (err) => {
                      if (err) {
                        console.error('Error logging SMS:', err);
                      }
                      
                      resolve({ 
                        success: response.data.status === 'success',
                        data: response.data
                      });
                    }
                  );
                })
                .catch(error => {
                  console.error('Error sending SMS:', error);
                  
                  // Log the error
                  db.run(
                    'INSERT INTO sms_logs (phone_number, message, status, response_data) VALUES (?, ?, ?, ?)',
                    [formattedPhone, message, 'error', JSON.stringify({ error: error.message })],
                    (err) => {
                      if (err) {
                        console.error('Error logging SMS error:', err);
                      }
                      
                      resolve({ 
                        success: false, 
                        error: error.message 
                      });
                    }
                  );
                });
              });
            });
          });
        });
    });
  });
});

ipcMain.handle('get-sms-settings', async () => {
  return new Promise((resolve, reject) => {
    // First ensure SMS tables exist
    ensureSMSTables(() => {
      // Function to query settings from sms_settings table
        db.get('SELECT value FROM sms_settings WHERE name = ?', ['sms_api_key'], (err, apiKeyRow) => {
          if (err) {
            console.error('Error getting SMS API key:', err);
            reject(err);
            return;
          }
          
          db.get('SELECT value FROM sms_settings WHERE name = ?', ['sms_user_id'], (err, userIdRow) => {
            if (err) {
              console.error('Error getting SMS user ID:', err);
              reject(err);
              return;
            }
            
            db.get('SELECT value FROM sms_settings WHERE name = ?', ['sms_enabled'], (err, enabledRow) => {
              if (err) {
                console.error('Error getting SMS enabled setting:', err);
                reject(err);
                return;
              }
              
              db.get('SELECT value FROM sms_settings WHERE name = ?', ['sms_sender_id'], (err, senderIdRow) => {
                if (err) {
                  console.error('Error getting SMS sender ID:', err);
                  reject(err);
                  return;
                }
                
                const settings = {
                  apiKey: apiKeyRow ? apiKeyRow.value : '',
                  userId: userIdRow ? userIdRow.value : '',
                  enabled: enabledRow ? enabledRow.value === 'true' : false,
                  senderId: senderIdRow ? senderIdRow.value : 'FINANCIALORG'
                };
                
                resolve(settings);
              });
            });
          });
        });
    });
  });
});

ipcMain.handle('update-sms-settings', async (event, settings) => {
  return new Promise((resolve, reject) => {
    // First ensure SMS tables exist
    ensureSMSTables(() => {
      // Function to update settings in sms_settings table
        db.run('INSERT OR REPLACE INTO sms_settings (name, value) VALUES (?, ?)', 
               ['sms_api_key', settings.apiKey], (err) => {
          if (err) {
            console.error('Error updating SMS API key:', err);
            reject(err);
            return;
          }
          
          db.run('INSERT OR REPLACE INTO sms_settings (name, value) VALUES (?, ?)', 
                 ['sms_user_id', settings.userId], (err) => {
            if (err) {
              console.error('Error updating SMS user ID:', err);
              reject(err);
              return;
            }
            
            db.run('INSERT OR REPLACE INTO sms_settings (name, value) VALUES (?, ?)', 
                   ['sms_enabled', settings.enabled ? 'true' : 'false'], (err) => {
              if (err) {
                console.error('Error updating SMS enabled setting:', err);
                reject(err);
                return;
              }
              
              db.run('INSERT OR REPLACE INTO sms_settings (name, value) VALUES (?, ?)', 
                     ['sms_sender_id', settings.senderId], (err) => {
                if (err) {
                  console.error('Error updating SMS sender ID:', err);
                  reject(err);
                  return;
                }
                
                resolve({ success: true });
              });
            });
          });
        });
    });
  });
});

// Function to ensure SMS-related tables exist
const ensureSMSTables = (callback) => {
  db.serialize(() => {
    // Create sms_settings table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS sms_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      value TEXT
    )`, (err) => {
      if (err) {
        console.error('Error creating sms_settings table:', err);
        return;
      }
      
      // Create sms_logs table if it doesn't exist
      db.run(`CREATE TABLE IF NOT EXISTS sms_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT,
        sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
        response_data TEXT
      )`, (err) => {
        if (err) {
          console.error('Error creating sms_logs table:', err);
          return;
        }
        
        // Insert default settings if not present
        db.run("INSERT OR IGNORE INTO sms_settings (name, value) VALUES ('sms_api_key', '')", []);
        db.run("INSERT OR IGNORE INTO sms_settings (name, value) VALUES ('sms_user_id', '')", []);
        db.run("INSERT OR IGNORE INTO sms_settings (name, value) VALUES ('sms_enabled', 'false')", []);
        db.run("INSERT OR IGNORE INTO sms_settings (name, value) VALUES ('sms_sender_id', 'FINANCIALORG')", []);
        
        if (callback) callback();
      });
    });
  });
}; 

// LOAN TYPES API
ipcMain.handle('get-loan-types', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM loan_types ORDER BY name', (err, rows) => {
      if (err) {
        console.error('Error fetching loan types:', err);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
});

// Add handler for add-loan-type
ipcMain.handle('add-loan-type', async (event, loanType) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO loan_types (name, interest_rate) VALUES (?, ?)',
      [loanType.name, loanType.interestRate],
      function(err) {
        if (err) {
          console.error('Error adding loan type:', err);
          reject(err);
        } else {
          // Return the new loan type with the inserted ID
          resolve({ 
            id: this.lastID, 
            name: loanType.name, 
            interest_rate: loanType.interestRate 
          });
        }
      }
    );
  });
});

// Add handler for delete-loan-type
ipcMain.handle('delete-loan-type', async (event, id) => {
  return new Promise((resolve, reject) => {
    // Delete the loan type directly
    db.run('DELETE FROM loan_types WHERE id = ?', [id], (err) => {
      if (err) {
        console.error('Error deleting loan type:', err);
        reject(err);
      } else {
        resolve({ success: true });
      }
    });
  });
});

// Add handler for next scheduled backup - note this is a placeholder since
// the client doesn't actually have a scheduler implementation
ipcMain.handle('get-next-scheduled-backup', async () => {
  // Return a placeholder response since this is actually implemented in main.js
  return { 
    scheduled: false,
    message: 'Automatic scheduling not available in this environment'
  };
});
