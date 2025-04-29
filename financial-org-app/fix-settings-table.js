const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

// Open the database
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Electron', 'sahana.db');
console.log(`Attempting to open database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  
  console.log('Connected to database');
  
  // Check if settings table exists and has the correct structure
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'", (err, row) => {
    if (err) {
      console.error('Error checking for settings table:', err);
      db.close();
      return;
    }
    
    // If settings table exists
    if (row) {
      // Check its structure
      db.all("PRAGMA table_info(settings)", (err, cols) => {
        if (err) {
          console.error('Error getting table info:', err);
          db.close();
          return;
        }
        
        console.log('Current settings table columns:', cols);
        
        // Check if value column exists
        const hasValueColumn = cols.some(col => col.name === 'value');
        
        if (!hasValueColumn) {
          console.log('Setting table exists but is missing the value column. Recreating table...');
          
          // Begin a transaction to fix the table
          db.run('BEGIN TRANSACTION', (err) => {
            if (err) {
              console.error('Error starting transaction:', err);
              db.close();
              return;
            }
            
            // Get existing data
            db.all('SELECT * FROM settings', (err, rows) => {
              if (err) {
                console.error('Error getting existing settings:', err);
                db.run('ROLLBACK');
                db.close();
                return;
              }
              
              console.log('Existing settings data:', rows);
              
              // Create a new temporary table with correct structure
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
                  db.close();
                  return;
                }
                
                // Try to migrate data if possible
                const insertPromises = rows.map(row => {
                  return new Promise((resolve, reject) => {
                    // Extract name and a value from the row
                    const name = row.name;
                    
                    // Try to find a suitable value in any of the columns
                    let value = null;
                    for (const key in row) {
                      if (key !== 'id' && key !== 'name' && row[key]) {
                        value = String(row[key]);
                        break;
                      }
                    }
                    
                    if (name && value) {
                      db.run('INSERT INTO settings_new (name, value) VALUES (?, ?)', [name, value], (err) => {
                        if (err) reject(err);
                        else resolve();
                      });
                    } else {
                      resolve(); // Skip if we can't extract meaningful data
                    }
                  });
                });
                
                // Execute all inserts
                Promise.all(insertPromises.map(p => p.catch(e => e)))
                  .then(results => {
                    // Check for errors
                    const errors = results.filter(r => r instanceof Error);
                    if (errors.length > 0) {
                      console.error('Errors during data migration:', errors);
                    }
                    
                    // Drop the old table and rename the new one
                    db.run('DROP TABLE settings', (err) => {
                      if (err) {
                        console.error('Error dropping old table:', err);
                        db.run('ROLLBACK');
                        db.close();
                        return;
                      }
                      
                      db.run('ALTER TABLE settings_new RENAME TO settings', (err) => {
                        if (err) {
                          console.error('Error renaming table:', err);
                          db.run('ROLLBACK');
                          db.close();
                          return;
                        }
                        
                        // Commit the transaction
                        db.run('COMMIT', (err) => {
                          if (err) {
                            console.error('Error committing transaction:', err);
                            db.run('ROLLBACK');
                          } else {
                            console.log('Settings table fixed successfully!');
                          }
                          
                          // Insert auto backup default settings
                          db.run(`
                            INSERT OR IGNORE INTO settings (name, value)
                            VALUES 
                              ('auto_backup_enabled', 'false'),
                              ('auto_backup_frequency', 'weekly'),
                              ('auto_backup_time', '00:00'),
                              ('auto_backup_path', '')
                          `, (err) => {
                            if (err) {
                              console.error('Error inserting default settings:', err);
                            } else {
                              console.log('Default auto backup settings inserted successfully');
                            }
                            db.close();
                          });
                        });
                      });
                    });
                  })
                  .catch(err => {
                    console.error('Error in promises:', err);
                    db.run('ROLLBACK');
                    db.close();
                  });
              });
            });
          });
        } else {
          console.log('Settings table exists and has the value column. No fixes needed.');
          
          // Ensure auto backup settings exist
          db.run(`
            INSERT OR IGNORE INTO settings (name, value)
            VALUES 
              ('auto_backup_enabled', 'false'),
              ('auto_backup_frequency', 'weekly'),
              ('auto_backup_time', '00:00'),
              ('auto_backup_path', '')
          `, (err) => {
            if (err) {
              console.error('Error inserting default settings:', err);
            } else {
              console.log('Default auto backup settings inserted successfully');
            }
            db.close();
          });
        }
      });
    } else {
      // Settings table doesn't exist, create it
      console.log('Settings table does not exist. Creating it...');
      
      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          value TEXT
        )
      `, (err) => {
        if (err) {
          console.error('Error creating settings table:', err);
          db.close();
          return;
        }
        
        // Insert default auto backup settings
        db.run(`
          INSERT INTO settings (name, value)
          VALUES 
            ('auto_backup_enabled', 'false'),
            ('auto_backup_frequency', 'weekly'),
            ('auto_backup_time', '00:00'),
            ('auto_backup_path', '')
        `, (err) => {
          if (err) {
            console.error('Error inserting default settings:', err);
          } else {
            console.log('Settings table created and default auto backup settings inserted successfully');
          }
          db.close();
        });
      });
    }
  });
}); 