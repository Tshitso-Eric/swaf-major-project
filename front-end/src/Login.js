// Login component
import React, { useState } from 'react';
import { login } from './api'; 
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Container,
  Alert,
  CircularProgress,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      onLogin(); // successful login → go to dashboard
    } catch (err) {
      setError('Invalid username or password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={6}
          sx={{
            padding: 5,
            borderRadius: 4,
            backgroundColor: '#fffaf0', // very light warm off-white / cream
            width: '100%',
            border: '1px solid #d7ccc8', // subtle light brown border
          }}
        >
          {/* Icon + Title */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LockOutlinedIcon
              sx={{
                fontSize: 48,
                color: '#1976d2', // Material blue
                backgroundColor: '#e3f2fd',
                borderRadius: '50%',
                padding: 1.5,
              }}
            />
            <Typography
              component="h1"
              variant="h5"
              sx={{
                mt: 1,
                color: '#5d4037', // nice medium-dark light-brown
                fontWeight: 600,
              }}
            >
              SWAF Login
            </Typography>
            <Typography variant="body2" sx={{ color: '#757575', mt: 0.5 }}>
              Smart Web Application Firewall
            </Typography>
          </Box>

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#a1887f', // light brown border
                  },
                  '&:hover fieldset': {
                    borderColor: '#8d6e63',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#1976d2', // blue on focus
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#5d4037',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#1976d2',
                },
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#a1887f',
                  },
                  '&:hover fieldset': {
                    borderColor: '#8d6e63',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#1976d2',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#5d4037',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#1976d2',
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 4,
                mb: 2,
                py: 1.5,
                backgroundColor: '#1976d2', // nice blue
                '&:hover': {
                  backgroundColor: '#1565c0',
                },
                fontWeight: 600,
                borderRadius: 2,
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Optional footer links */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" sx={{ color: '#757575' }}>
                Contact support • Forgot password?
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;