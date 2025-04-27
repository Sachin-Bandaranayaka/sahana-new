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

// Get table info
db.all("SELECT * FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) {
    console.error('Error getting tables:', err);
    return;
  }
  
  console.log(`Tables in database (${tables.length}):`);
  
  tables.forEach(table => {
    console.log(`\nTable: ${table.name}`);
    console.log(`SQL: ${table.sql}`);
    
    // Get column info for each table
    db.all(`PRAGMA table_info(${table.name})`, [], (err, columns) => {
      if (err) {
        console.error(`Error getting columns for ${table.name}:`, err);
        return;
      }
      
      console.log(`\nColumns in table ${table.name}:`);
      columns.forEach(col => {
        console.log(`- ${col.name} (${col.type})`);
      });
      
      // If it's the settings table, query its content
      if (table.name === 'settings') {
        db.all(`SELECT * FROM settings`, [], (err, settings) => {
          if (err) {
            console.error('Error querying settings table:', err);
            return;
          }
          
          console.log('\nSettings table content:');
          settings.forEach(setting => {
            console.log(setting);
          });
          
          // If we're at the last table, close the database connection
          if (table.name === tables[tables.length - 1].name) {
            db.close();
          }
        });
      }
    });
  });
}); 