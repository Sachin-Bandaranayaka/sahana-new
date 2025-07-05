import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  Button,
  Divider,
  Avatar,
  Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SettingsIcon from '@mui/icons-material/Settings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SavingsIcon from '@mui/icons-material/Savings';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import CalculateIcon from '@mui/icons-material/Calculate';
import MessageIcon from '@mui/icons-material/Message'; // New import

const drawerWidth = 240;

const Layout = ({ user, onLogout }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Check if we're in development mode
  const isDev = process.env.NODE_ENV === 'development';
  
  // Check if user is admin
  const isAdmin = user && user.role === 'admin';

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard (පුවරුව)', icon: <DashboardIcon />, path: '/' },
    { text: 'Members (සාමාජිකයින්)', icon: <PeopleIcon />, path: '/members' },
    { text: 'Cash Book (මුදල් පොත)', icon: <ReceiptIcon />, path: '/cashbook' },
    { text: 'Loans (ණය)', icon: <AttachMoneyIcon />, path: '/loans' },
    { text: 'Dividends (ලාභාංශ)', icon: <SavingsIcon />, path: '/dividends' },
    { text: 'Bank Accounts (බැංකු ගිණුම්)', icon: <AccountBalanceIcon />, path: '/accounts' },
    { text: 'Reports (වාර්තා)', icon: <AssessmentIcon />, path: '/reports' },
    { text: 'Messages (පණිවුඩ)', icon: <MessageIcon />, path: '/messages' }, // New item
    { text: 'Settings (සැකසුම්)', icon: <SettingsIcon />, path: '/settings' },
  ];

  // Add Interest Test Tool menu item for dev mode or admin users
  if (isDev || isAdmin) {
    menuItems.push({
      text: 'Interest Test Tool',
      icon: <CalculateIcon />,
      path: '/interest-test'
    });
  }

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Sahana Welfare (සහන සුභසාධක)
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              if (isMobile) setMobileOpen(false);
            }}
            sx={{
              backgroundColor: location.pathname === item.path ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem button onClick={handleLogout}>
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout (පිටවීම)" />
        </ListItem>
      </List>
      
      {/* Synapse Labs Branding */}
      <Box sx={{ position: 'absolute', bottom: 0, width: '100%', p: 2, textAlign: 'center' }}>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="caption" color="text.secondary">
          Powered by
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
          Synapse Labs
        </Typography>
      </Box>
    </div>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Sahana Welfare Management <Box component="span" sx={{ fontSize: '0.8em', fontStyle: 'italic', display: { xs: 'none', md: 'inline' } }}>(by Synapse Labs)</Box>
          </Typography>
          
          {/* User info and logout */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title={user ? user.username : ''}>
              <Avatar sx={{ bgcolor: theme.palette.secondary.main, mr: 1 }}>
                <PersonIcon />
              </Avatar>
            </Tooltip>
            <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
              {user ? user.username : ''}
            </Typography>
            <Button 
              color="inherit" 
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          marginTop: '64px',
          overflowY: 'auto',
          height: 'calc(100vh - 64px)',
          backgroundColor: '#f5f5f5',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Debug message - will show in case of routing issues */}
        <Box sx={{ display: 'none' }}>Debug: Content should appear below</Box>
        
        {/* Main content */}
        <Box sx={{ flexGrow: 1 }}>
          <Outlet />
        </Box>
        
        {/* Footer with Synapse Labs branding */}
        <Box 
          component="footer" 
          sx={{ 
            mt: 3, 
            py: 2, 
            textAlign: 'center',
            borderTop: '1px solid #e0e0e0'
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Developed by Synapse Labs. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;