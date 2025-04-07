# Financial Organization Management System

A desktop application built with Electron and React for managing financial operations of a local organization, including member management, cash book, loan tracking, and dividend calculation.

## Features

- **Dashboard**: Overview of organization's financial status
- **Member Management**: Add, edit, and view members
- **Cash Book**: Track membership fees and contributions
- **Loan Management**: 
  - Member loans (9% interest)
  - Special loans (12% interest)
  - Business loans (12% interest)
  - Interest calculation per day
  - Payment tracking
- **Dividend Book**: Track profit distribution to members
- **Bank Account Management**: Monitor organization's bank accounts and fixed deposits
- **Reports**: Generate detailed financial reports for various aspects of the organization
- **Data Backup & Restore**: Secure your organization's data with backup and restore functionality
- **User Management**: Multiple user access with role-based permissions
- **Quarterly Profit Calculation**: Calculate and distribute organizational profits
- **Settings Management**: Configure application parameters including interest rates and financial quarters

## Technical Details

The application is built using:

- **Electron**: For desktop application framework
- **React**: For UI components and state management
- **SQLite**: For local database storage
- **Material UI**: For modern UI components
- **Chart.js**: For data visualization

## Development Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Run the application in development mode:
   ```
   npm start
   ```

3. Build the application for production:
   ```
   npm run build
   ```

## Database Structure

- **members**: Member information
- **cash_book**: Member contributions
- **loan_book**: Loan records and payments
- **dividend_book**: Profit distribution records
- **organization_accounts**: Organization bank accounts
- **transactions**: Financial transactions
- **settings**: Application settings
- **meetings**: Meeting records
- **users**: User authentication and permission records

## Reports

The system can generate various reports including:
- Cash Book reports
- Loan status reports
- Member transaction history
- Quarterly profit reports
- Dividend distribution reports
- Bank account transaction reports

Reports can be printed or exported to PDF and CSV formats.

## Loan Interest Calculation

Loan interest is calculated daily using the formula:
```
Daily Interest = (Annual Interest Rate / 365) * Outstanding Loan Amount
```

## Asset Calculation

Member's total asset is calculated as:
```
Total Asset = Total Cash Book Entry + Total Dividend Book Entry
```

## Data Backup & Restore

The application provides functionality to:
- Create backups of all organization data
- Restore from previously created backups
- Schedule automatic backups (configurable in settings)

## Screenshots

(Screenshots will be added later)

## License

ISC 