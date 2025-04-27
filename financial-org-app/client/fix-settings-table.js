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
  console.log('Connected to the SQLite database.');
});

// Function to fix the settings table
async function fixSettingsTable() {
  return new Promise((resolve, reject) => {
    // Start a transaction
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        console.error('Error beginning transaction:', err);
        return reject(err);
      }

      console.log('Transaction started');

      // 1. First, create a backup of the current settings table if it exists
      db.run(`CREATE TABLE IF NOT EXISTS settings_backup AS SELECT * FROM settings`, (err) => {
        if (err) {
          console.error('Error creating settings backup:', err);
          db.run('ROLLBACK', () => reject(err));
          return;
        }

        console.log('Created settings_backup table');

        // 2. Create a new settings table with the proper structure
        db.run(`DROP TABLE IF EXISTS sms_settings`, (err) => {
          if (err) {
            console.error('Error dropping sms_settings table:', err);
            db.run('ROLLBACK', () => reject(err));
            return;
          }

          db.run(`CREATE TABLE IF NOT EXISTS sms_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            value TEXT
          )`, (err) => {
            if (err) {
              console.error('Error creating sms_settings table:', err);
              db.run('ROLLBACK', () => reject(err));
              return;
            }

            console.log('Created sms_settings table');

            // 3. Insert default SMS settings
            const smsSettings = [
              ['sms_api_key', ''],
              ['sms_user_id', ''],
              ['sms_enabled', 'false'],
              ['sms_sender_id', 'FINANCIALORG']
            ];

            let inserted = 0;
            smsSettings.forEach(([name, value]) => {
              db.run('INSERT INTO sms_settings (name, value) VALUES (?, ?)', [name, value], (err) => {
                if (err) {
                  console.error(`Error inserting default setting ${name}:`, err);
                  db.run('ROLLBACK', () => reject(err));
                  return;
                }

                inserted++;
                console.log(`Inserted setting: ${name} = ${value}`);

                if (inserted === smsSettings.length) {
                  // 4. Commit the transaction
                  db.run('COMMIT', (err) => {
                    if (err) {
                      console.error('Error committing transaction:', err);
                      db.run('ROLLBACK', () => reject(err));
                      return;
                    }

                    console.log('Transaction committed successfully');
                    resolve(true);
                  });
                }
              });
            });
          });
        });
      });
    });
  });
}

// Execute the fix
fixSettingsTable()
  .then(result => {
    console.log('Settings table fixed:', result);
    
    // Verify the table structure
    db.all(`PRAGMA table_info(sms_settings)`, [], (err, columns) => {
      if (err) {
        console.error('Error getting columns for sms_settings:', err);
        return;
      }
      
      console.log(`\nColumns in table sms_settings:`);
      columns.forEach(col => {
        console.log(`- ${col.name} (${col.type})`);
      });
      
      // Query the content
      db.all(`SELECT * FROM sms_settings`, [], (err, settings) => {
        if (err) {
          console.error('Error querying sms_settings table:', err);
          return;
        }
        
        console.log('\nsms_settings table content:');
        settings.forEach(setting => {
          console.log(setting);
        });
        
        // Close the database
        db.close();
      });
    });
  })
  .catch(err => {
    console.error('Error fixing settings table:', err);
    db.close();
  }); 