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
  Tab,
  Tabs,
  DialogContentText,
} from '@mui/material';
import { Edit as EditIcon, Refresh as RefreshIcon, Send as SendIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAssignments, getMembers, updateAssignment, triggerRotationUpdate, sendToSlack } from '@/services/api';
import { format, parseISO } from 'date-fns';
import { TaskAssignmentWithDetails, Member } from '@/types';
import { LogViewer } from "./components/LogViewer";

export default function Dashboard() {
  const [selectedTab, setSelectedTab] = useState(0);
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<TaskAssignmentWithDetails | null>(null);
  const [selectedMember, setSelectedMember] = useState<{ host: string; startDate: string; endDate: string; }>({
    host: '',
    startDate: '',
    endDate: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

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

  const handleUpdateRotation = () => {
    updateRotationMutation.mutate();
  };

  const getCurrentAssignments = () => {
    const today = new Date();
    return assignments.filter(assignment => {
      const startDate = new Date(assignment.startDate);
      const endDate = new Date(assignment.endDate);
      return today >= startDate && today <= endDate;
    });
  };

  const handleSendToSlack = async () => {
    setConfirmDialogOpen(false);
    try {
      await sendToSlack();
      setSnackbar({
        open: true,
        message: 'Successfully sent assignments to Slack',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error sending to Slack:', error);
      setSnackbar({
        open: true,
        message: 'Failed to send assignments to Slack',
        severity: 'error'
      });
    }
  };

  const handleConfirmSend = () => {
    setConfirmDialogOpen(true);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  // 获取当前的任务分配信息并格式化为 Slack 消息格式
  const getSlackMessagePreview = () => {
    // 按照 ID 排序，与 TeamRotator 保持一致
    const sortedAssignments = [...assignments].sort((a, b) => a.id - b.id);
    
    if (sortedAssignments.length === 0) {
      return null;
    }

    // 获取所有成员并按 ID 排序
    const allMembers = members.sort((a, b) => a.id - b.id);

    let message = '';
    for (const assignment of sortedAssignments) {
      message += `${assignment.taskName}: ${assignment.host}\n`;

      // 特殊处理 English word 任务
      if (assignment.taskName === "English word") {
        const currentMemberIndex = allMembers.findIndex(m => m.id === assignment.memberId);
        if (currentMemberIndex !== -1) {
          const nextOneMember = allMembers[(currentMemberIndex + 1) % allMembers.length];
          const nextTwoMember = allMembers[(currentMemberIndex + 2) % allMembers.length];

          message += `English word(Day + 1): ${nextOneMember.host}\n`;
          message += `English word(Day + 2): ${nextTwoMember.host}\n`;
        }
      }
    }

    return message;
  };

  return (
    <Box p={3}>
      <Box display="flex" flexDirection="column" gap={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4">
            Dashboard
          </Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleUpdateRotation}
              disabled={updateRotationMutation.isPending}
            >
              Update Rotation
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SendIcon />}
              onClick={handleConfirmSend}
            >
              Send to Slack
            </Button>
          </Box>
        </Box>

        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              transition: 'background-color 0.3s',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
              '&.Mui-selected': {
                color: 'primary.main',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'primary.main',
            },
          }}
        >
          <Tab label="Current Assignments" />
          <Tab label="History" />
          <Tab label="System Logs" />
        </Tabs>

        {selectedTab === 0 && (
          <>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Task</TableCell>
                    <TableCell>Assignee</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>End Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getCurrentAssignments().map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>{assignment.taskName}</TableCell>
                      <TableCell>{assignment.host}</TableCell>
                      <TableCell>{format(parseISO(assignment.startDate), 'yyyy-MM-dd')}</TableCell>
                      <TableCell>{format(parseISO(assignment.endDate), 'yyyy-MM-dd')}</TableCell>
                      <TableCell align="right">
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
                <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    select
                    label="Assignee"
                    value={selectedMember.host}
                    onChange={(e) => setSelectedMember({ ...selectedMember, host: e.target.value })}
                    fullWidth
                  >
                    {members.map((member) => (
                      <MenuItem key={member.id} value={member.host}>
                        {member.host}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Start Date"
                    type="date"
                    value={selectedMember.startDate}
                    onChange={(e) => setSelectedMember({ ...selectedMember, startDate: e.target.value })}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="End Date"
                    type="date"
                    value={selectedMember.endDate}
                    onChange={(e) => setSelectedMember({ ...selectedMember, endDate: e.target.value })}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseDialog}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" color="primary">
                  Save
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}

        {selectedTab === 1 && (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Task</TableCell>
                  <TableCell>Assignee</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>End Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>{assignment.taskName}</TableCell>
                    <TableCell>{assignment.host}</TableCell>
                    <TableCell>{format(parseISO(assignment.startDate), 'yyyy-MM-dd')}</TableCell>
                    <TableCell>{format(parseISO(assignment.endDate), 'yyyy-MM-dd')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {selectedTab === 2 && (
          <LogViewer />
        )}

        <Dialog
          open={confirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
        >
          <DialogTitle>Send to Slack</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to send the current assignments to Slack?
            </DialogContentText>
            <Box sx={{ mt: 2, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              {getSlackMessagePreview()}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendToSlack} variant="contained" color="primary">
              Send
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
} 