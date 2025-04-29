const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./sahana.db');

async function run() {
  try {
    // First ensure the settings table exists with correct schema
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          value TEXT
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Try to update a setting
    const setting = { name: 'test_setting', value: 'test_value' };
    
    await new Promise((resolve, reject) => {
      db.run('INSERT OR REPLACE INTO settings (name, value) VALUES (?, ?)',
        [setting.name, setting.value],
        function(err) {
          if (err) {
            console.error('Error updating setting:', err);
            reject(err);
          } else {
            console.log('Setting updated successfully');
            resolve();
          }
        }
      );
    });
    
    // Verify the setting was stored
    const row = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM settings WHERE name = ?', [setting.name], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    console.log('Retrieved setting:', row);
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    db.close();
  }
}

run(); 