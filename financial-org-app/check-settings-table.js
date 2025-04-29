const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

// Identify whether the settings table exists and check its structure
const db = new sqlite3.Database('./sahana.db');

// First check if the settings table exists
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'", (err, row) => {
  if (err) {
    console.error('Error checking for settings table:', err);
    db.close();
    return;
  }
  
  if (!row) {
    console.log('Settings table does not exist');
    db.close();
    return;
  }
  
  // If it exists, check the schema
  db.all("PRAGMA table_info(settings)", (err, rows) => {
    if (err) {
      console.error('Error getting settings table schema:', err);
      db.close();
      return;
    }
    
    console.log('Settings table schema:');
    console.log(rows);
    
    // Also check a sample of data in the table
    db.all("SELECT * FROM settings LIMIT 5", (err, data) => {
      if (err) {
        console.error('Error getting settings data:', err);
      } else {
        console.log('Sample settings data:');
        console.log(data);
      }
      db.close();
    });
  });
}); 