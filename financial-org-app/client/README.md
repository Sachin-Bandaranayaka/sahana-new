# Sahana Welfare - Financial Management Application

A comprehensive desktop application for managing financial operations of the Sahana Welfare organization, built with React, Electron, and SQLite.

## Features

- **Member Management**: Add, edit, and manage organization members
- **Loan Management**: Track loans, payments, and calculate interest
- **Cash Book**: Record income and expenses with categorization
- **Dividends**: Calculate and distribute dividends to members
- **Bank Accounts**: Manage multiple bank accounts and transactions
- **Reports**: Generate financial reports in various formats
- **Settings**: Configure organization details and application preferences
- **Backup & Restore**: Safeguard your data with backup options

## Installation

### For Users

1. Download the latest installer from the releases section
2. Run the "Sahana Welfare Setup.exe" file
3. Follow the installation wizard instructions
4. Launch the application from the created desktop shortcut

### For Developers

1. Clone the repository
   ```
   git clone https://github.com/yourusername/sahana-welfare.git
   cd sahana-welfare/client
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Run in development mode
   ```
   npm run electron-dev
   ```

4. Build for production
   ```
   node package-app.js
   ```
   This will create installer files in the `dist` folder.

## Technology Stack

- **Frontend**: React, Material UI
- **Desktop Wrapper**: Electron
- **Database**: SQLite (file-based)
- **Charts**: Recharts
- **Build Tools**: Electron Builder

## Data Storage

The application stores all data in a SQLite database file located at:
- Windows: `%APPDATA%\sahana-welfare\sahana.db`

## Backup and Restore

1. Use the built-in backup feature in the Settings tab
2. Choose a location to save your backup file
3. To restore, select the backup file from the restore section

## Troubleshooting

- **Application won't start**: Check if you have administrative privileges
- **Data not saving**: Ensure you have write permissions to the AppData folder
- **UI appears broken**: Try reinstalling the application

## License

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## Support

For support, please contact:
- Email: support@sahanawelfare.lk
- Phone: 011-2345678
