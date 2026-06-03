import React, { useState, useEffect, useContext } from 'react';
import {
  Box, Paper, TextField, Button, Switch, FormControlLabel,
  Typography, Alert, Card, CardContent, Divider, Grid, CircularProgress,
  Chip, useTheme,
} from '@mui/material';
import {
  Brightness4 as DarkIcon, Brightness7 as LightIcon,
  CheckCircle as CheckIcon, Error as ErrorIcon,
  Shield as ShieldIcon, Speed as SpeedIcon,
} from '@mui/icons-material';
import { getSettings, updateSettings, testConnection } from './api';
import { ThemeContext } from './App';

const SectionCard = ({ title, subtitle, children }) => {
  const theme = useTheme();
  return (
    <Card elevation={0} sx={{ border:`1px solid ${theme.palette.divider}`, mb:3 }}>
      <CardContent sx={{ p:3 }}>
        <Typography variant="h6" sx={{ fontWeight:700, mb:0.3 }}>{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary" sx={{ display:'block', mb:2 }}>{subtitle}</Typography>}
        <Divider sx={{ mb:3 }} />
        {children}
      </CardContent>
    </Card>
  );
};

export default function Settings() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { mode, toggleColorMode } = useContext(ThemeContext);

  const [settings,    setSettings]   = useState({
    target_app_url:'', waf_mode:'block', listening_port:5000,
    enable_logging:true, rate_limit_max_requests:100, rate_limit_window_seconds:60,
  });
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [message,    setMessage]    = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setSettings(await getSettings()); }
    catch { showMsg('error','Failed to load settings'); }
    finally { setLoading(false); }
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try { await updateSettings(settings); showMsg('success','Settings saved'); }
    catch { showMsg('error','Failed to save settings'); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTestResult({ status:'testing', message:'Testing connection…' });
    try {
      const r = await testConnection(settings.target_app_url);
      setTestResult(r);
      setTimeout(() => setTestResult(null), 5000);
    } catch { setTestResult({ status:'error', message:'Connection failed' }); }
  };

  if (loading) {
    return (
      <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {message && (
        <Alert severity={message.type} sx={{ mb:3, borderRadius:2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* Appearance */}
      <SectionCard title="Appearance" subtitle="Toggle between light and dark mode">
        <Box sx={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          p:2.5, borderRadius:2,
          bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
          border:`1px solid ${theme.palette.divider}`,
        }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:2 }}>
            {isDark
              ? <DarkIcon sx={{ fontSize:36, color:'#60a5fa' }} />
              : <LightIcon sx={{ fontSize:36, color:'#f59e0b' }} />
            }
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight:700 }}>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isDark ? 'Reduced eye strain in low-light environments' : 'Better readability in bright environments'}
              </Typography>
            </Box>
          </Box>
          <FormControlLabel
            control={<Switch checked={isDark} onChange={toggleColorMode} color="primary" />}
            label={isDark ? 'Enabled' : 'Disabled'}
          />
        </Box>
      </SectionCard>

      {/* Target app */}
      <SectionCard title="Protected Application" subtitle="Configure the web app this WAF is guarding">
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <TextField fullWidth label="Target Application URL"
              placeholder="https://your-app.onrender.com"
              value={settings.target_app_url}
              onChange={e => setSettings({...settings, target_app_url:e.target.value})}
              helperText="All clean traffic will be forwarded to this URL"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="WAF Listening Port"
              value={settings.listening_port} disabled
              helperText="Fixed at port 5000"
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display:'flex', gap:2 }}>
              <Button variant="outlined" onClick={handleTest}
                disabled={testResult?.status === 'testing'}>
                {testResult?.status === 'testing' ? 'Testing…' : 'Test Connection'}
              </Button>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? <><CircularProgress size={16} sx={{ mr:1 }} />Saving…</> : 'Save Settings'}
              </Button>
            </Box>
            {testResult && testResult.status !== 'testing' && (
              <Alert
                severity={testResult.status === 'success' ? 'success' : 'error'}
                icon={testResult.status === 'success' ? <CheckIcon /> : <ErrorIcon />}
                sx={{ mt:2, borderRadius:2 }}
              >
                {testResult.message}
              </Alert>
            )}
          </Grid>
        </Grid>
      </SectionCard>

      {/* WAF Mode */}
      <SectionCard title="WAF Mode" subtitle="Control how the WAF handles detected threats">
        <Grid container spacing={2}>
          {['block','monitor'].map(m => (
            <Grid item xs={12} sm={6} key={m}>
              <Box
                onClick={() => setSettings({...settings, waf_mode:m})}
                sx={{
                  p:2.5, borderRadius:2, cursor:'pointer',
                  border:`2px solid ${settings.waf_mode===m ? (m==='block'?'#ef4444':'#f59e0b') : theme.palette.divider}`,
                  bgcolor: settings.waf_mode===m
                    ? (m==='block' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)')
                    : 'transparent',
                  transition:'all 0.2s',
                }}
              >
                <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:0.5 }}>
                  <Typography sx={{ fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color: m==='block'?'#ef4444':'#f59e0b' }}>
                    {m === 'block' ? '🔴 Block Mode' : '🟡 Monitor Mode'}
                  </Typography>
                  {settings.waf_mode === m && <Chip label="Active" size="small" color={m==='block'?'error':'warning'} />}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {m === 'block'
                    ? 'Detected threats are blocked immediately and logged'
                    : 'All traffic is allowed through but threats are logged for review'}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </SectionCard>

      {/* Rate limiting */}
      <SectionCard title="Rate Limiting" subtitle="Protect against DDoS and brute-force attacks">
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="number" label="Max Requests"
              value={settings.rate_limit_max_requests || 100}
              onChange={e => setSettings({...settings, rate_limit_max_requests:+e.target.value})}
              helperText="Maximum requests allowed per IP"
              InputProps={{ endAdornment:<Typography variant="caption" color="text.secondary" sx={{ whiteSpace:'nowrap' }}>requests</Typography> }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="number" label="Time Window"
              value={settings.rate_limit_window_seconds || 60}
              onChange={e => setSettings({...settings, rate_limit_window_seconds:+e.target.value})}
              helperText="Sliding window duration"
              InputProps={{ endAdornment:<Typography variant="caption" color="text.secondary" sx={{ whiteSpace:'nowrap' }}>seconds</Typography> }}
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ p:2, borderRadius:2, bgcolor: isDark?'rgba(59,130,246,0.08)':'#eff6ff', border:'1px solid rgba(59,130,246,0.2)' }}>
              <Typography variant="body2" color="text.secondary">
                <strong style={{ color:'#3b82f6' }}>Current limit:</strong>{' '}
                {settings.rate_limit_max_requests || 100} requests per{' '}
                {settings.rate_limit_window_seconds || 60} seconds per IP address.
                Exceeding this returns HTTP 429.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </SectionCard>

      {/* Status summary */}
      <SectionCard title="System Status" subtitle="Current WAF operational state">
        <Grid container spacing={2}>
          {[
            { label:'WAF Status',       value:'Running',                   color:'#10b981' },
            { label:'Protected App',    value:settings.target_app_url||'Not set', color:'#3b82f6' },
            { label:'Mode',             value:(settings.waf_mode||'block').toUpperCase(), color: settings.waf_mode==='block'?'#ef4444':'#f59e0b' },
            { label:'Logging',          value:settings.enable_logging ? 'Enabled' : 'Disabled', color:'#8b5cf6' },
          ].map(s => (
            <Grid item xs={12} sm={6} md={3} key={s.label}>
              <Box sx={{ p:2, borderRadius:2, bgcolor: isDark?'rgba(255,255,255,0.03)':'#f8fafc',
                border:`1px solid ${theme.palette.divider}`, textAlign:'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  {s.label}
                </Typography>
                <Typography sx={{ mt:0.5, fontWeight:700, color:s.color, fontSize:'0.9rem' }}>{s.value}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </SectionCard>

      <Box sx={{ display:'flex', justifyContent:'flex-end' }}>
        <Button variant="contained" size="large" onClick={handleSave} disabled={saving}
          startIcon={<ShieldIcon />}
          sx={{ px:4 }}>
          {saving ? 'Saving…' : 'Save All Settings'}
        </Button>
      </Box>
    </Box>
  );
}
