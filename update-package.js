const fs = require('fs');

const packageJson = {
  "name": "financial-org-app",
  "version": "1.0.0",
  "description": "Financial Organization Management System",
  "main": "main.js",
  "scripts": {
    "start": "concurrently \"cross-env BROWSER=none npm run react-start\" \"wait-on http://localhost:3000 && electron .\"",
    "react-start": "cd client && npm start",
    "react-build": "cd client && npm run build",
    "electron-rebuild": "electron-rebuild",
    "build": "npm run react-build && electron-builder",
    "postinstall": "electron-builder install-app-deps"
  },
  "keywords": ["electron", "react", "financial", "organization", "management"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "electron-is-dev": "^2.0.0",
    "sqlite3": "^5.1.7",
    "better-sqlite3": "^9.2.2",
    "sqlite": "^5.1.1"
  },
  "devDependencies": {
    "concurrently": "^9.1.2",
    "cross-env": "^7.0.3",
    "electron": "^30.0.6",
    "electron-builder": "^24.13.3",
    "electron-rebuild": "^3.2.9",
    "wait-on": "^8.0.3"
  }
};

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2)); 