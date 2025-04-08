import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Grid,
  CircularProgress,
  IconButton,
  Chip,
  Snackbar,
  Alert,
  MenuItem
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import api from '../../services/api';

const Members = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentMember, setCurrentMember] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    address: '',
    joinDate: '',
    shares: 0,
    status: 'active'
  });
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const data = await api.getMembers();
      setMembers(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching members:", error);
      setLoading(false);
      setSnackbar({
        open: true,
        message: 'Failed to load members data',
        severity: 'error'
      });
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenDialog = (mode, member = null) => {
    setEditMode(mode === 'edit');
    setFormErrors({});
    
    if (mode === 'edit' && member) {
      setCurrentMember(member);
      setFormData({
        name: member.name,
        mobile: member.mobile || member.phone, // Handle both field names
        email: member.email,
        address: member.address,
        joinDate: member.joinDate,
        shares: member.shares,
        status: member.status
      });
    } else {
      setCurrentMember(null);
      setFormData({
        name: '',
        mobile: '',
        email: '',
        address: '',
        joinDate: new Date().toISOString().split('T')[0],
        shares: 0,
        status: 'active'
      });
    }
    
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear validation error when field is edited
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: undefined
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.mobile.trim()) errors.mobile = 'Mobile number is required';
    else if (!/^\d{10}$/.test(formData.mobile.replace(/\D/g, ''))) {
      errors.mobile = 'Enter a valid 10-digit mobile number';
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Enter a valid email address';
    }
    
    if (!formData.joinDate) errors.joinDate = 'Join date is required';
    
    if (formData.shares < 0) errors.shares = 'Shares cannot be negative';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      if (editMode && currentMember) {
        // Update existing member
        await api.updateMember(currentMember.id, formData);
        setSnackbar({
          open: true,
          message: 'Member updated successfully',
          severity: 'success'
        });
      } else {
        // Add new member
        await api.addMember(formData);
        setSnackbar({
          open: true,
          message: 'Member added successfully',
          severity: 'success'
        });
      }
      
      // Refresh the members list after update
      fetchMembers();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving member:", error);
      setSnackbar({
        open: true,
        message: 'Failed to save member data',
        severity: 'error'
      });
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      try {
        await api.deleteMember(memberId);
        setSnackbar({
          open: true,
          message: 'Member deleted successfully',
          severity: 'success'
        });
        // Refresh the members list after deletion
        fetchMembers();
      } catch (error) {
        console.error("Error deleting member:", error);
        setSnackbar({
          open: true,
          message: 'Failed to delete member',
          severity: 'error'
        });
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  return (
    <Box sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Members Management (සාමාජික කළමනාකරණය)
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('add')}
        >
          Add Member (සාමාජිකයෙකු එකතු කරන්න)
        </Button>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name (නම)</TableCell>
                  <TableCell>Contact (සම්බන්ධතා)</TableCell>
                  <TableCell>Join Date (එක්වූ දිනය)</TableCell>
                  <TableCell>Shares (කොටස්)</TableCell>
                  <TableCell>Status (තත්වය)</TableCell>
                  <TableCell align="right">Actions (ක්‍රියා)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((member) => (
                    <TableRow key={member.id} hover>
                      <TableCell>
                        <Typography variant="body1">{member.name}</Typography>
                        <Typography variant="body2" color="textSecondary">{member.address}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">{member.mobile}</Typography>
                          </Box>
                          {member.email && (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                              <Typography variant="body2">{member.email}</Typography>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{new Date(member.joinDate).toLocaleDateString()}</TableCell>
                      <TableCell>{member.shares}</TableCell>
                      <TableCell>
                        <Chip 
                          label={member.status === 'active' ? 'Active' : 'Inactive'} 
                          color={member.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleOpenDialog('edit', member)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          color="error" 
                          onClick={() => handleDeleteMember(member.id)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={members.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}

      {/* Add/Edit Member Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit Member (සාමාජිකයා සංස්කරණය කරන්න)' : 'Add New Member (නව සාමාජිකයෙකු එකතු කරන්න)'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="name"
                label="Full Name (සම්පූර්ණ නම)"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                required
                error={!!formErrors.name}
                helperText={formErrors.name}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="mobile"
                label="Mobile Number (ජංගම දුරකථන අංකය)"
                value={formData.mobile}
                onChange={handleInputChange}
                fullWidth
                required
                error={!!formErrors.mobile}
                helperText={formErrors.mobile}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="email"
                label="Email Address (විද්‍යුත් තැපෑල)"
                value={formData.email}
                onChange={handleInputChange}
                fullWidth
                error={!!formErrors.email}
                helperText={formErrors.email}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="joinDate"
                label="Join Date (එක්වූ දිනය)"
                type="date"
                value={formData.joinDate}
                onChange={handleInputChange}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                error={!!formErrors.joinDate}
                helperText={formErrors.joinDate}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="address"
                label="Address (ලිපිනය)"
                value={formData.address}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="shares"
                label="Shares Owned (හිමි කොටස්)"
                type="number"
                value={formData.shares}
                onChange={handleInputChange}
                fullWidth
                InputProps={{ inputProps: { min: 0 } }}
                error={!!formErrors.shares}
                helperText={formErrors.shares}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="status"
                select
                label="Status (තත්වය)"
                value={formData.status}
                onChange={handleInputChange}
                fullWidth
              >
                <MenuItem value="active">Active (ක්‍රියාකාරී)</MenuItem>
                <MenuItem value="inactive">Inactive (අක්‍රිය)</MenuItem>
                <MenuItem value="suspended">Suspended (අත්හිටුවා ඇත)</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel (අවලංගු කරන්න)
          </Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            {editMode ? 'Update (යාවත්කාලීන කරන්න)' : 'Add (එකතු කරන්න)'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Members; 