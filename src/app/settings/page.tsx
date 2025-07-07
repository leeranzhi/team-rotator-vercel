'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  Alert,
  Snackbar
} from '@mui/material';
import { getSystemConfigs, saveSystemConfig } from '@/services/api';

export default function Settings() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<number>(0);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const configs = await getSystemConfigs();
        const webhookConfig = configs.find(c => c.key === 'Slack:WebhookUrl');
        setWebhookUrl(webhookConfig?.value || '');
      } catch (err) {
        setError('Failed to load settings');
      }
    };

    fetchConfigs();
  }, [lastSaved]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await saveSystemConfig({
        key: 'Slack:WebhookUrl',
        value: webhookUrl,
        lastModified: new Date().toISOString(),
        modifiedBy: null
      });
      setShowSuccess(true);
      setLastSaved(Date.now());
    } catch (err) {
      setError('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <Typography variant="h6">Slack Integration</Typography>
            <TextField
              fullWidth
              label="Webhook URL"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              helperText="Enter your Slack webhook URL for notifications"
            />
            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>

      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
      >
        <Alert severity="success">
          Settings saved successfully
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={3000}
        onClose={() => setError(null)}
      >
        <Alert severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
} 