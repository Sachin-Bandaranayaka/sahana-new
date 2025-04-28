import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/dashboard/Dashboard';
import Members from './components/members/Members';
import MemberAccount from './components/members/MemberAccount';
import CashBook from './components/cashbook/CashBook';
import Loans from './components/loans/Loans';
import Dividends from './components/dividends/Dividends';
import Accounts from './components/accounts/Accounts';
import Reports from './components/reports/Reports';
import Settings from './components/settings/Settings';
import InterestTestTool from './components/testing/InterestTestTool';
import api from './services/api';
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check if user is already logged in
    const currentUser = api.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);
  
  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };
  
  const handleLogout = () => {
    api.logout();
    setUser(null);
  };
  
  if (loading) {
    return null; // Or a loading spinner
  }
  
  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    
    return children;
  };

  return (
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <HashRouter>
          <Routes>
            <Route path="/login" element={!user ? <Login onLoginSuccess={handleLogin} /> : <Navigate to="/" replace />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Layout user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="members" element={<Members />} />
              <Route path="member-account/:memberId" element={<MemberAccount />} />
              <Route path="cashbook" element={<CashBook />} />
              <Route path="loans" element={<Loans />} />
              <Route path="dividends" element={<Dividends />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="interest-test" element={<InterestTestTool />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </ThemeProvider>
    </React.StrictMode>
  );
}

export default App;
