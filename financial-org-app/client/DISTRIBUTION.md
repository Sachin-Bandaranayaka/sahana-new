# Packaging and Distribution Guide for Sahana Welfare Application

This document outlines the steps to package and distribute the Sahana Welfare application as a Windows desktop application.

## Prerequisites

- Node.js and npm installed
- Administrator access on Windows
- Git (optional, for version control)

## Building the Application

### 1. Install Dependencies

Make sure all dependencies are installed:

```bash
npm install
```

### 2. Test in Development Mode

Before packaging, test the application in development mode:

```bash
npm run electron-dev
```

This will start the React development server and launch Electron pointing to it.

### 3. Package the Application

Run the packaging script:

```bash
node package-app.js
```

Or manually:

```bash
npm run build
npm run dist
```

This will:
1. Build the React application into optimized static files
2. Package the application with Electron Builder
3. Create installer files in the `dist` folder

## Distribution Options

### Option 1: Installer (Recommended)

The `dist` folder will contain:
- `Sahana Welfare Setup x.x.x.exe` - Windows installer
- `sahana-welfare-x.x.x.exe` - Portable executable (optional, if configured)

This is the recommended method for distributing to end users. The installer will:
- Create start menu shortcuts
- Create a desktop shortcut
- Register the application
- Set up auto-updates (if configured)

### Option 2: Manual Installation

For more controlled environments, you can manually distribute:
1. The `dist/win-unpacked` folder (contains the entire application)
2. Instructions for users to run the `Sahana Welfare.exe` file within

## Auto-Updates (Future Enhancement)

To implement auto-updates:

1. Set up a server to host update files
2. Configure `electron-builder` in `package.json`:
```json
"build": {
  "publish": [
    {
      "provider": "generic",
      "url": "https://your-update-server.com/updates"
    }
  ]
}
```
3. Implement update checking in the application

## Database Considerations

The SQLite database is stored at:
- `%APPDATA%\sahana-welfare\sahana.db`

For a fresh installation:
- The database will be automatically created on first run
- Default settings will be inserted

For upgrades:
- The database is preserved between versions
- To reset to defaults, users can delete the database file or use the application's reset feature

## Troubleshooting Distribution

### Common Issues

1. **Missing Dependencies**
   - Error: "Cannot find module X"
   - Solution: Check that all dependencies are correctly listed in `package.json`

2. **Windows Smartscreen Warning**
   - Issue: Windows blocks the application
   - Solution: Consider purchasing a code signing certificate

3. **Installation Fails**
   - Check user permissions
   - Ensure no conflicting processes are running
   - Verify disk space availability

## Offline Installation Support

For environments without internet access:
1. Include all Node modules in the distribution
2. Package as a portable executable that requires no installation
3. Provide clear instructions for manual setup 