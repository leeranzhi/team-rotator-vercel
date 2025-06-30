'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, createTask } from '@/services/api';
import { Task } from '@/types';

export default function Tasks() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: getTasks,
  });

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      handleClose();
    },
  });

  const handleOpen = (task?: Task) => {
    setEditingTask(task || { name: '', rotationRule: '' });
    setOpen(true);
  };

  const handleClose = () => {
    setEditingTask(null);
    setOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    if (!editingTask.id) {
      createMutation.mutate({
        name: editingTask.name!,
        rotationRule: editingTask.rotationRule!,
      });
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Tasks</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Task
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Rotation Rule</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks?.map((task) => (
              <TableRow key={task.id}>
                <TableCell>{task.name}</TableCell>
                <TableCell>{task.rotationRule}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpen(task)}>
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose}>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editingTask?.id ? 'Edit Task' : 'Add Task'}</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                autoFocus
                margin="dense"
                label="Name"
                fullWidth
                value={editingTask?.name || ''}
                onChange={(e) =>
                  setEditingTask((prev) => ({ ...prev!, name: e.target.value }))
                }
              />
              <FormControl fullWidth margin="dense">
                <InputLabel>Rotation Rule</InputLabel>
                <Select
                  value={editingTask?.rotationRule || ''}
                  onChange={(e) =>
                    setEditingTask((prev) => ({ ...prev!, rotationRule: e.target.value }))
                  }
                  label="Rotation Rule"
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly_monday">Weekly (Monday)</MenuItem>
                  <MenuItem value="biweekly_monday">Biweekly (Monday)</MenuItem>
                  <MenuItem value="weekly_friday">Weekly (Friday)</MenuItem>
                  <MenuItem value="biweekly_wednesday">Biweekly (Wednesday)</MenuItem>
                  <MenuItem value="biweekly_thursday">Biweekly (Thursday)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editingTask?.id ? 'Save' : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
} 