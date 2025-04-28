import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Sms as SmsIcon
} from '@mui/icons-material';
import api from '../../services/api';
import OTPVerification from '../common/OTPVerification';
import otpService, { OTP_OPERATIONS } from '../../services/otpService';

const roles = [
  { value: 'admin', label: 'Administrator (Full Access)' },
  { value: 'manager', label: 'Manager (Limited Access)' },
  { value: 'user', label: 'Regular User (Basic Access)' }
];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [openOTPDialog, setOpenOTPDialog] = useState(false);
  const [pendingOperation, setPendingOperation] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  });
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Current user for checking permissions
  const currentUser = api.getCurrentUser();
  
  // OTP verification token
  const [otpToken, setOtpToken] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const fetchedUsers = await api.getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load users. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      role: 'user'
    });
    setFormErrors({});
    setOpenAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
  };

  const handleOpenEditDialog = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      confirmPassword: '',
      role: user.role
    });
    setFormErrors({});
    
    // If editing anything other than user's own account, require OTP
    if (currentUser && currentUser.id !== user.id) {
      setPendingOperation('edit');
      setOpenOTPDialog(true);
    } else {
      setOpenEditDialog(true);
    }
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setSelectedUser(null);
  };

  const handleOpenDeleteDialog = (user) => {
    setSelectedUser(user);
    
    // Always require OTP for deletions
    setPendingOperation('delete');
    setOpenOTPDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedUser(null);
  };

  const handleOpenResetDialog = (user) => {
    setSelectedUser(user);
    setFormData({
      ...formData,
      password: '',
      confirmPassword: ''
    });
    setFormErrors({});
    
    // Always require OTP for password resets
    setPendingOperation('reset');
    setOpenOTPDialog(true);
  };

  const handleCloseResetDialog = () => {
    setOpenResetDialog(false);
    setSelectedUser(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear the error for this field when the user starts typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (openAddDialog || openResetDialog || (openEditDialog && formData.password)) {
      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
      
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }
    
    return errors;
  };

  const handleAddUser = async () => {
    const errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      setLoading(true);
      
      const newUser = {
        username: formData.username,
        password: formData.password,
        role: formData.role,
        created_at: new Date().toISOString()
      };
      
      const result = await api.addUser(newUser);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: 'User added successfully',
          severity: 'success'
        });
        handleCloseAddDialog();
        fetchUsers();
      } else {
        setSnackbar({
          open: true,
          message: result.error || 'Failed to add user',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Failed to add user:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to add user',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    
    const errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      setLoading(true);
      
      const updatedUser = {
        id: selectedUser.id,
        username: formData.username,
        role: formData.role
      };
      
      if (formData.password) {
        updatedUser.password = formData.password;
      }
      
      // Check OTP verification for non-self edits
      if (currentUser && currentUser.id !== selectedUser.id && !otpService.isOperationVerified(otpToken)) {
        setSnackbar({
          open: true,
          message: 'OTP verification is required for this operation',
          severity: 'error'
        });
        setLoading(false);
        return;
      }
      
      const result = await api.updateUser(updatedUser);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: 'User updated successfully',
          severity: 'success'
        });
        handleCloseEditDialog();
        fetchUsers();
      } else {
        setSnackbar({
          open: true,
          message: result.error || 'Failed to update user',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update user',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setOtpToken(null); // Clear OTP token after operation
    }
  };
  
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      
      // Verify OTP token is valid for this operation
      if (!otpService.isOperationVerified(otpToken)) {
        setSnackbar({
          open: true,
          message: 'OTP verification is required for this operation',
          severity: 'error'
        });
        setLoading(false);
        return;
      }
      
      const result = await api.deleteUser(selectedUser.id);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: 'User deleted successfully',
          severity: 'success'
        });
        handleCloseDeleteDialog();
        fetchUsers();
      } else {
        setSnackbar({
          open: true,
          message: result.error || 'Failed to delete user',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to delete user',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setOtpToken(null); // Clear OTP token after operation
    }
  };
  
  const handleResetPassword = async () => {
    if (!selectedUser) return;
    
    const errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      setLoading(true);
      
      // Verify OTP token is valid for this operation
      if (!otpService.isOperationVerified(otpToken)) {
        setSnackbar({
          open: true,
          message: 'OTP verification is required for this operation',
          severity: 'error'
        });
        setLoading(false);
        return;
      }
      
      const updatedUser = {
        id: selectedUser.id,
        username: selectedUser.username,
        password: formData.password,
        role: selectedUser.role
      };
      
      const result = await api.updateUser(updatedUser);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: 'Password reset successfully',
          severity: 'success'
        });
        handleCloseResetDialog();
      } else {
        setSnackbar({
          open: true,
          message: result.error || 'Failed to reset password',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to reset password',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setOtpToken(null); // Clear OTP token after operation
    }
  };
  
  const handleOTPVerified = (token) => {
    // Store OTP token for verification
    setOtpToken(token);
    setOpenOTPDialog(false);
    
    // Open the appropriate dialog based on pending operation
    if (pendingOperation === 'edit') {
      setOpenEditDialog(true);
    } else if (pendingOperation === 'delete') {
      setOpenDeleteDialog(true);
    } else if (pendingOperation === 'reset') {
      setOpenResetDialog(true);
    }
    
    setPendingOperation(null);
  };
  
  const handleCloseOTPDialog = () => {
    setOpenOTPDialog(false);
    setPendingOperation(null);
    setSelectedUser(null);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return { color: 'error.main', bgcolor: 'error.light' };
      case 'manager':
        return { color: 'warning.main', bgcolor: 'warning.light' };
      default:
        return { color: 'info.main', bgcolor: 'info.light' };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          <PersonIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          User Management
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
        >
          Add User
        </Button>
      </Box>
      
      <Paper sx={{ width: '100%', mb: 2 }}>
        {loading && users.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Username</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Last Login</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>
                          <Box
                            component="span"
                            sx={{
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1,
                              ...getRoleBadgeClass(user.role)
                            }}
                          >
                            {user.role}
                          </Box>
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell>{formatDate(user.last_login)}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenEditDialog(user)}
                            title="Edit user"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="secondary"
                            onClick={() => handleOpenResetDialog(user)}
                            title="Reset password"
                          >
                            <LockIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleOpenDeleteDialog(user)}
                            title="Delete user"
                            disabled={user.username === 'admin'} // Prevent deleting the main admin
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No users found. Click "Add User" to create one.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={users.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Paper>
      
      {/* Add User Dialog */}
      <Dialog open={openAddDialog} onClose={handleCloseAddDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="username"
                label="Username"
                fullWidth
                value={formData.username}
                onChange={handleInputChange}
                error={!!formErrors.username}
                helperText={formErrors.username}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="password"
                label="Password"
                type="password"
                fullWidth
                value={formData.password}
                onChange={handleInputChange}
                error={!!formErrors.password}
                helperText={formErrors.password}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                fullWidth
                value={formData.confirmPassword}
                onChange={handleInputChange}
                error={!!formErrors.confirmPassword}
                helperText={formErrors.confirmPassword}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="role-select-label">Role</InputLabel>
                <Select
                  labelId="role-select-label"
                  name="role"
                  value={formData.role}
                  label="Role"
                  onChange={handleInputChange}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog}>Cancel</Button>
          <Button 
            onClick={handleAddUser} 
            color="primary" 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Add User'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="username"
                label="Username"
                fullWidth
                value={formData.username}
                onChange={handleInputChange}
                error={!!formErrors.username}
                helperText={formErrors.username}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="password"
                label="New Password (optional)"
                type="password"
                fullWidth
                value={formData.password}
                onChange={handleInputChange}
                error={!!formErrors.password}
                helperText={formErrors.password}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="confirmPassword"
                label="Confirm New Password"
                type="password"
                fullWidth
                value={formData.confirmPassword}
                onChange={handleInputChange}
                error={!!formErrors.confirmPassword}
                helperText={formErrors.confirmPassword}
                disabled={!formData.password}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="role-select-label">Role</InputLabel>
                <Select
                  labelId="role-select-label"
                  name="role"
                  value={formData.role}
                  label="Role"
                  onChange={handleInputChange}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.value} value={role.value}>
                      {role.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button 
            onClick={handleEditUser} 
            color="primary" 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Update User'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete User Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user <strong>{selectedUser?.username}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button 
            onClick={handleDeleteUser} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Reset Password Dialog */}
      <Dialog open={openResetDialog} onClose={handleCloseResetDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Reset password for user: <strong>{selectedUser?.username}</strong>
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="password"
                label="New Password"
                type="password"
                fullWidth
                value={formData.password}
                onChange={handleInputChange}
                error={!!formErrors.password}
                helperText={formErrors.password}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="confirmPassword"
                label="Confirm New Password"
                type="password"
                fullWidth
                value={formData.confirmPassword}
                onChange={handleInputChange}
                error={!!formErrors.confirmPassword}
                helperText={formErrors.confirmPassword}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResetDialog}>Cancel</Button>
          <Button 
            onClick={handleResetPassword} 
            color="warning" 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* OTP Verification Dialog */}
      <OTPVerification
        open={openOTPDialog}
        onClose={handleCloseOTPDialog}
        onVerify={handleOTPVerified}
        phoneNumber={currentUser?.phone || '0771234567'} // Use the admin's phone number
        operation={OTP_OPERATIONS.USER_EDIT}
        title="User Management Verification"
      />
      
      {/* Notification Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement; 