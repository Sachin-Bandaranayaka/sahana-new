import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import Dashboard from './components/dashboard/Dashboard';
import Members from './components/members/Members';
import CashBook from './components/cashbook/CashBook';
import Loans from './components/loans/Loans';
import Dividends from './components/dividends/Dividends';
import Accounts from './components/accounts/Accounts';
import Reports from './components/reports/Reports';
import Settings from './components/settings/Settings';
import './index.css';

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Sahana Blue (සහන නිල් පාට)
    },
    secondary: {
      main: '#dc004e', // Accent Red (ලාංඡන රතු පාට)
    },
  },
  typography: {
    fontFamily: '"Roboto", "Noto Sans Sinhala", sans-serif',
  },
});

function App() {
  return (
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <HashRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="members" element={<Members />} />
              <Route path="cashbook" element={<CashBook />} />
              <Route path="loans" element={<Loans />} />
              <Route path="dividends" element={<Dividends />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </ThemeProvider>
    </React.StrictMode>
  );
}

export default App;
