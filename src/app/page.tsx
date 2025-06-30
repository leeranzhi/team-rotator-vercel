'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
} from '@mui/material';
import { Edit as EditIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAssignments, getMembers, updateAssignment, triggerRotationUpdate } from '@/services/api';
import { format, parseISO } from 'date-fns';
import { TaskAssignmentWithDetails, Member } from '@/types';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<TaskAssignmentWithDetails | null>(null);
  const [selectedMember, setSelectedMember] = useState<{
    host: string;
    startDate: string;
    endDate: string;
  }>({
    host: '',
    startDate: '',
    endDate: '',
  });
  const [error, setError] = useState<string | null>(null);

  const { data: assignments = [] } = useQuery<TaskAssignmentWithDetails[]>({
    queryKey: ['assignments'],
    queryFn: getAssignments,
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: getMembers,
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: (assignment: TaskAssignmentWithDetails) => updateAssignment(assignment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      handleCloseDialog();
    },
    onError: () => {
      setError('Failed to update assignment');
    },
  });

  const updateRotationMutation = useMutation({
    mutationFn: triggerRotationUpdate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: () => {
      setError('Failed to update rotation');
    },
  });

  const handleEditClick = (assignment: TaskAssignmentWithDetails) => {
    setSelectedAssignment(assignment);
    setSelectedMember({
      host: assignment.host,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
    });
    setEditDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditDialogOpen(false);
    setSelectedAssignment(null);
    setSelectedMember({
      host: '',
      startDate: '',
      endDate: '',
    });
  };

  const handleSave = async () => {
    if (!selectedAssignment) return;

    const selectedMemberData = members.find(m => m.host === selectedMember.host);
    if (!selectedMemberData) return;

    await updateAssignmentMutation.mutateAsync({
      ...selectedAssignment,
      memberId: selectedMemberData.id,
      startDate: selectedMember.startDate,
      endDate: selectedMember.endDate,
    });
  };

  const handleUpdateRotation = async () => {
    await updateRotationMutation.mutateAsync();
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={handleUpdateRotation}
          disabled={updateRotationMutation.isPending}
        >
          Update Rotation
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Task</TableCell>
              <TableCell>Assignee</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assignments.map((assignment) => (
              <TableRow key={assignment.id}>
                <TableCell>{assignment.taskName}</TableCell>
                <TableCell>{assignment.host}</TableCell>
                <TableCell>{format(parseISO(assignment.startDate), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{format(parseISO(assignment.endDate), 'yyyy-MM-dd')}</TableCell>
                <TableCell>
                  <Button
                    startIcon={<EditIcon />}
                    onClick={() => handleEditClick(assignment)}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={editDialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>Edit Assignment</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              select
              fullWidth
              label="Assignee"
              value={selectedMember.host}
              onChange={(e) => setSelectedMember({ ...selectedMember, host: e.target.value })}
              sx={{ mb: 2 }}
            >
              {members?.map((member) => (
                <MenuItem key={member.id} value={member.host}>
                  {member.host}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={selectedMember.startDate}
              onChange={(e) => setSelectedMember({ ...selectedMember, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={selectedMember.endDate}
              onChange={(e) => setSelectedMember({ ...selectedMember, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={updateAssignmentMutation.isPending}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
} 