// financial-org-app\client\src\components\members\Members.js

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
  MenuItem,
  InputAdornment,
  TableSortLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  AccountBox as AccountIcon,
  Search as SearchIcon,
  Clear as ClearIcon
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
  
  // Search and Sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });
  
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

  // Search functionality
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page when searching
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setPage(0);
  };

  // Sorting functionality
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPage(0); // Reset to first page when sorting
  };

  // Filter and sort members
  const getFilteredAndSortedMembers = () => {
    let filteredMembers = [...members];

    // Apply search filter
    if (searchTerm) {
      filteredMembers = filteredMembers.filter(member =>
        member.member_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.status?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      filteredMembers.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filteredMembers;
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
        phone: member.phone,
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

  // const handleSubmit = async () => {
  //   if (!validateForm()) return;
    
  //   try {
  //     if (editMode && currentMember) {
  //       // Update existing member - Use window.api if using Electron IPC directly
  //       await window.api.updateMember(currentMember.id, formData);
  //       setSnackbar({
  //         open: true,
  //         message: 'Member updated successfully',
  //         severity: 'success'
  //       });
  //     } else {
  //       // Add new member
  //       const response = await api.addMember(formData);
        
  //       // Send SMS notification for registration
  //       try {
  //         if (formData.phone) {
  //           const smsResult = await smsService.sendMemberRegistrationSMS(
  //             formData.phone,
  //             response.member_id || formData.member_id
  //           );
            
  //           console.log('Member registration SMS result:', smsResult);
  //         }
  //       } catch (smsError) {
  //         console.error('Error sending member registration SMS:', smsError);
  //       }
        
  //       setSnackbar({
  //         open: true,
  //         message: 'Member added successfully',
  //         severity: 'success'
  //       });
  //     }
      
  //     // Refresh the members list after update
  //     fetchMembers();
  //     handleCloseDialog();
  //   } catch (error) {
  //     console.error("Error saving member:", error);
  //     setSnackbar({
  //       open: true,
  //       message: 'Failed to save member data',
  //       severity: 'error'
  //     });
  //   }
  // };


  const handleSubmit = async () => {
    console.log('handleSubmit called');
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }
    
    try {
      if (editMode && currentMember) {
        console.log('Attempting to update member with ID:', currentMember.id, 'and data:', formData);
        const result = await window.api.updateMember(currentMember.id, formData);
        console.log('Result from updateMember IPC call:', result);
        if (result.success) {
          setSnackbar({
            open: true,
            message: 'Member updated successfully',
            severity: 'success'
          });
          fetchMembers();
          handleCloseDialog();
        } else {
          console.error('Update failed with message:', result.message);
          throw new Error(result.message || 'Unknown error during update');
        }
      } else {
        // Add new member logic (if applicable)
        console.log('Attempting to add new member with data:', formData);
        const response = await api.addMember(formData);
        console.log('Result from addMember API call:', response);
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
        fetchMembers();
        handleCloseDialog();
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setSnackbar({
        open: true,
        message: `Failed to save member: ${error.message}`,
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

      {/* Search Bar */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search by Member ID, Name, Phone, or Status..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton
                  aria-label="clear search"
                  onClick={handleClearSearch}
                  edge="end"
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 400 }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === 'member_id'}
                  direction={sortConfig.key === 'member_id' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('member_id')}
                  sx={{
                    '& .MuiTableSortLabel-icon': {
                      opacity: 1,
                      color: 'primary.main'
                    },
                    '&:hover': {
                      color: 'primary.main'
                    },
                    '&.Mui-active': {
                      color: 'primary.main',
                      '& .MuiTableSortLabel-icon': {
                        opacity: 1,
                        color: 'primary.main'
                      }
                    }
                  }}
                >
                  Member ID
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === 'name'}
                  direction={sortConfig.key === 'name' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('name')}
                  sx={{
                    '& .MuiTableSortLabel-icon': {
                      opacity: 1,
                      color: 'primary.main'
                    },
                    '&:hover': {
                      color: 'primary.main'
                    },
                    '&.Mui-active': {
                      color: 'primary.main',
                      '& .MuiTableSortLabel-icon': {
                        opacity: 1,
                        color: 'primary.main'
                      }
                    }
                  }}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === 'joinDate'}
                  direction={sortConfig.key === 'joinDate' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('joinDate')}
                  sx={{
                    '& .MuiTableSortLabel-icon': {
                      opacity: 1,
                      color: 'primary.main'
                    },
                    '&:hover': {
                      color: 'primary.main'
                    },
                    '&.Mui-active': {
                      color: 'primary.main',
                      '& .MuiTableSortLabel-icon': {
                        opacity: 1,
                        color: 'primary.main'
                      }
                    }
                  }}
                >
                  Join Date
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === 'status'}
                  direction={sortConfig.key === 'status' ? sortConfig.direction : 'asc'}
                  onClick={() => handleSort('status')}
                  sx={{
                    '& .MuiTableSortLabel-icon': {
                      opacity: 1,
                      color: 'primary.main'
                    },
                    '&:hover': {
                      color: 'primary.main'
                    },
                    '&.Mui-active': {
                      color: 'primary.main',
                      '& .MuiTableSortLabel-icon': {
                        opacity: 1,
                        color: 'primary.main'
                      }
                    }
                  }}
                >
                  Status
                </TableSortLabel>
              </TableCell>
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
              getFilteredAndSortedMembers()
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
          count={getFilteredAndSortedMembers().length}
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