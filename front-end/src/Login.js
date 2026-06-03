import React, { useState } from 'react';
import { login } from './api';
import {
  Box, Paper, Typography, TextField, Button,
  Alert, CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import {
  Shield as ShieldIcon,
  Visibility, VisibilityOff,
  Person as PersonIcon, Lock as LockIcon,
} from '@mui/icons-material';

export default function Login({ onLogin }) {
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [showPw,   setShowPw]     = useState(false);
  const [error,    setError]      = useState('');
  const [loading,  setLoading]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      onLogin();
    } catch {
      setError('Invalid username or password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative background circles */}
      {[...Array(4)].map((_, i) => (
        <Box key={i} sx={{
          position: 'absolute',
          borderRadius: '50%',
          border: '1px solid rgba(59,130,246,0.15)',
          width: 200 + i * 150,
          height: 200 + i * 150,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />
      ))}

      <Paper elevation={24} sx={{
        p: { xs: 4, sm: 5 },
        width: '100%',
        maxWidth: 420,
        mx: 2,
        background: 'rgba(30,41,59,0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: 4,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            display: 'inline-flex',
            p: 2,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1d4ed8, #06b6d4)',
            mb: 2,
            boxShadow: '0 0 30px rgba(59,130,246,0.4)',
          }}>
            <ShieldIcon sx={{ fontSize: 40, color: 'white' }} />
          </Box>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 800, letterSpacing: '-0.5px' }}>
            SWAF
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
            Smart Web Application Firewall
          </Typography>
          <Box sx={{
            display: 'inline-block',
            mt: 1.5,
            px: 1.5, py: 0.3,
            borderRadius: 10,
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.3)',
          }}>
            <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600 }}>
              ● SYSTEM ONLINE
            </Typography>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth required autoFocus
            label="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon sx={{ color: '#64748b' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(100,116,139,0.5)' },
                '&:hover fieldset': { borderColor: '#3b82f6' },
                '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' },
            }}
          />

          <TextField
            fullWidth required
            label="Password"
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon sx={{ color: '#64748b' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPw(p => !p)} edge="end" sx={{ color: '#64748b' }}>
                    {showPw ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(100,116,139,0.5)' },
                '&:hover fieldset': { borderColor: '#3b82f6' },
                '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
              },
              '& .MuiInputLabel-root': { color: '#94a3b8' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' },
            }}
          />

          <Button
            type="submit" fullWidth variant="contained"
            disabled={loading}
            sx={{
              py: 1.5,
              background: 'linear-gradient(135deg, #1d4ed8, #06b6d4)',
              fontSize: '1rem',
              fontWeight: 700,
              borderRadius: 2,
              '&:hover': { background: 'linear-gradient(135deg, #1e40af, #0891b2)', transform: 'translateY(-1px)', boxShadow: '0 8px 25px rgba(59,130,246,0.4)' },
              '&:disabled': { background: 'rgba(59,130,246,0.3)' },
              transition: 'all 0.2s',
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="caption" sx={{ color: '#475569' }}>
            Protected by SWAF Security System
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
