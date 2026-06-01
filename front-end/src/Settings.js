import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Typography,
  Alert,
  Card,
  CardContent,
  Divider,
  Grid,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from '@mui/icons-material';
import { getSettings, updateSettings, testConnection } from './api';
import { ThemeContext } from './App'; 

export default function Settings() {
  const [settings, setSettings] = useState({
    target_app_url: 'http://localhost:8080',
    waf_mode: 'block',
    listening_port: 5000,
    enable_logging: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [message, setMessage] = useState(null);
  
  // Get theme context from App
  const { mode, toggleColorMode } = useContext(ThemeContext);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSettings(settings);
      setMessage({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestResult({ status: 'testing', message: 'Testing connection...' });
      const result = await testConnection(settings.target_app_url);
      setTestResult(result);
      setTimeout(() => setTestResult(null), 5000);
    } catch (error) {
      setTestResult({ status: 'error', message: 'Connection failed' });
    }
  };

  const handleThemeToggle = () => {
    toggleColorMode(); // Use the toggle function from App
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      {/* Theme Configuration Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Appearance
            </Typography>
            <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
              <IconButton onClick={handleThemeToggle} color="inherit">
                {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>
          </Box>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper 
                sx={{ 
                  p: 3, 
                  bgcolor: mode === 'light' ? '#f5f5f5' : 'rgba(255, 255, 255, 0.05)',
                  transition: 'background-color 0.3s ease'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  {mode === 'light' ? (
                    <LightModeIcon sx={{ fontSize: 40, color: '#ff9800' }} />
                  ) : (
                    <DarkModeIcon sx={{ fontSize: 40, color: '#90caf9' }} />
                  )}
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {mode === 'light' ? 'Light Mode' : 'Dark Mode'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {mode === 'light' 
                        ? 'Light background with dark text for better readability in bright environments'
                        : 'Dark background with light text for reduced eye strain in low-light environments'}
                    </Typography>
                  </Box>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={mode === 'dark'}
                      onChange={handleThemeToggle}
                      color="primary"
                    />
                  }
                  label={`Enable ${mode === 'light' ? 'Dark' : 'Light'} Mode`}
                />
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Traffic & Listening Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Traffic & Listening
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Web Application URL to Protect"
                placeholder="http://localhost:8080"
                value={settings.target_app_url}
                onChange={(e) => setSettings({ ...settings, target_app_url: e.target.value })}
                helperText="http://localhost:8080"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="SWAF Listening Port"
                value={settings.listening_port}
                disabled
                helperText="SWAF runs on this port (fixed: 5000)"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleTestConnection}
                  disabled={testResult?.status === 'testing'}
                >
                  Test Connection
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </Box>
              
              {testResult && (
                <Alert 
                  severity={testResult.status === 'success' ? 'success' : 'error'} 
                  sx={{ mt: 2 }}
                >
                  {testResult.message}
                </Alert>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Status Information */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            Current Status
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: mode === 'light' ? '#f5f5f5' : 'rgba(255, 255, 255, 0.05)' }}>
                <Typography variant="caption" color="textSecondary">
                  SWAF Status
                </Typography>
                <Typography sx={{ mt: 1, color: '#2e7d32', fontWeight: 500 }}>
                  Running
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: mode === 'light' ? '#f5f5f5' : 'rgba(255, 255, 255, 0.05)' }}>
                <Typography variant="caption" color="textSecondary">
                  Protected App
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {settings.target_app_url}
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: mode === 'light' ? '#f5f5f5' : 'rgba(255, 255, 255, 0.05)' }}>
                <Typography variant="caption" color="textSecondary">
                  WAF Mode
                </Typography>
                <Typography sx={{ 
                  mt: 1, 
                  color: settings.waf_mode === 'block' ? '#d32f2f' : '#ed6c02', 
                  fontWeight: 500,
                  textTransform: 'uppercase'
                }}>
                  {settings.waf_mode}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}