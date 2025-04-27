import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Email as EmailIcon,
  AccountBox as AccountIcon
} from '@mui/icons-material';
import api from '../../services/api';
import smsService from '../../services/smsService';

const Members = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentMember, setCurrentMember] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    member_id: '',
    name: '',
    address: '',
    phone: '',
    joinDate: new Date().toISOString().split('T')[0],
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
        member_id: member.member_id,
        name: member.name,
        address: member.address,
        phone: member.phone || member.mobile,
        joinDate: member.joinDate,
        status: member.status
      });
    } else {
      setCurrentMember(null);
      setFormData({
        member_id: '',
        name: '',
        address: '',
        phone: '',
        joinDate: new Date().toISOString().split('T')[0],
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
    
    // Required fields
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.joinDate) errors.joinDate = 'Join date is required';
    
    // Format validations
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      errors.phone = 'Enter a valid 10-digit phone number';
    }
    
    // Member ID format validation (only if provided)
    if (formData.member_id && !/^[A-Z0-9]{3,10}$/.test(formData.member_id)) {
      errors.member_id = 'Member ID must be 3-10 characters of uppercase letters and numbers';
    }
    
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
        const response = await api.addMember(formData);
        
        // Send SMS notification for registration
        try {
          if (formData.phone) {
            const smsResult = await smsService.sendMemberRegistrationSMS(
              formData.phone,
              response.member_id || formData.member_id
            );
            
            console.log('Member registration SMS result:', smsResult);
          }
        } catch (smsError) {
          console.error('Error sending member registration SMS:', smsError);
        }
        
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

  const handleViewMemberAccount = (memberId) => {
    navigate(`/member-account/${memberId}`);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Members</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('add')}
        >
          Add Member
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Member ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Join Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : (
              members
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.member_id}</TableCell>
                    <TableCell>{member.name}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{member.phone}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{new Date(member.joinDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={member.status}
                        color={member.status === 'active' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenDialog('edit', member)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="primary"
                        onClick={() => handleViewMemberAccount(member.id)}
                      >
                        <AccountIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteMember(member.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={members.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Member Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Edit Member' : 'Add New Member'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Member ID"
                name="member_id"
                value={formData.member_id}
                onChange={handleInputChange}
                error={!!formErrors.member_id}
                helperText={formErrors.member_id || "Optional. If left blank, it will be auto-generated"}
                disabled={editMode}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                error={!!formErrors.name}
                helperText={formErrors.name}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                error={!!formErrors.phone}
                helperText={formErrors.phone}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Join Date"
                name="joinDate"
                type="date"
                value={formData.joinDate}
                onChange={handleInputChange}
                error={!!formErrors.joinDate}
                helperText={formErrors.joinDate}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editMode ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

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