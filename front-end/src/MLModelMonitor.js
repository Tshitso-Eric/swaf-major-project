import React, { useState, useEffect } from 'react';
import {
  Typography, Grid, Card, CardContent, Box, LinearProgress, Chip,
  CircularProgress, IconButton, Divider, Alert, useTheme, Paper,
} from '@mui/material';
import {
  Memory as MemoryIcon, CheckCircle as CheckIcon, Refresh as RefreshIcon,
  Security as SecurityIcon, BugReport as BugIcon, Timeline as TimelineIcon,
} from '@mui/icons-material';
import { getModelInfo, getModelMetrics } from './api';

const MetricCard = ({ label, value, color }) => (
  <Paper elevation={0} sx={{
    p:2.5, textAlign:'center',
    border:'1px solid',
    borderColor: color + '40',
    borderTop: `3px solid ${color}`,
    borderRadius:2,
  }}>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>
      {label}
    </Typography>
    <Typography variant="h4" sx={{ fontWeight:800, color, mt:0.5 }}>
      {value != null ? `${(value * 100).toFixed(1)}%` : '—'}
    </Typography>
    {value != null && (
      <LinearProgress variant="determinate" value={value * 100}
        sx={{ mt:1, height:4, borderRadius:2,
          bgcolor: color + '20',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius:2 } }} />
    )}
  </Paper>
);

export default function MLModelMonitor() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [modelInfo, setModelInfo] = useState(null);
  const [metrics,   setMetrics]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [info, m] = await Promise.all([getModelInfo(), getModelMetrics()]);
      setModelInfo(info);
      setMetrics(m);
      setError(null);
    } catch (e) {
      setError('Failed to load model data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh', flexDirection:'column', gap:2 }}>
        <CircularProgress size={56} thickness={4} />
        <Typography color="text.secondary">Loading ML model data…</Typography>
      </Box>
    );
  }

  const xgbActive = modelInfo?.xgboost?.status === 'Active';
  const aeActive  = modelInfo?.autoencoder?.status === 'Active';

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb:3 }}>{error}</Alert>}

      {/* Header */}
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:4 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight:700 }}>Hybrid ML Detection Engine</Typography>
          <Typography variant="body2" color="text.secondary">
            3-layer defence: Static Rules → XGBoost → Autoencoder
          </Typography>
        </Box>
        <IconButton onClick={fetchData} color="primary" sx={{ border:`1px solid ${theme.palette.divider}` }}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Detection pipeline */}
      <Card elevation={0} sx={{ border:`1px solid ${theme.palette.divider}`, mb:4 }}>
        <CardContent sx={{ p:3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb:2, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:600 }}>
            Detection Pipeline
          </Typography>
          <Box sx={{ display:'flex', alignItems:'center', gap:1, flexWrap:'wrap' }}>
            {[
              { label:'1. Regex Rules', color:'#3b82f6',  active:true },
              { label:'2. XGBoost',     color:'#10b981',  active:xgbActive },
              { label:'3. Autoencoder', color:'#8b5cf6',  active:aeActive },
            ].map((step, i) => (
              <React.Fragment key={step.label}>
                <Box sx={{
                  px:2, py:1, borderRadius:8,
                  bgcolor: step.active ? `${step.color}18` : 'rgba(100,116,139,0.1)',
                  border:`1px solid ${step.active ? step.color + '40' : 'transparent'}`,
                  display:'flex', alignItems:'center', gap:1,
                }}>
                  {step.active
                    ? <CheckIcon sx={{ fontSize:16, color:step.color }} />
                    : <MemoryIcon sx={{ fontSize:16, color:'#64748b' }} />
                  }
                  <Typography variant="body2" sx={{ fontWeight:600, color: step.active ? step.color : 'text.secondary' }}>
                    {step.label}
                  </Typography>
                </Box>
                {i < 2 && <Typography color="text.secondary" sx={{ fontWeight:700 }}>→</Typography>}
              </React.Fragment>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* XGBoost section */}
      <Box sx={{ mb:1, display:'flex', alignItems:'center', gap:1 }}>
        <SecurityIcon sx={{ color:'#10b981' }} />
        <Typography variant="h6" sx={{ fontWeight:700 }}>XGBoost Classifier</Typography>
        <Chip
          label={modelInfo?.xgboost?.status || 'Unknown'}
          size="small"
          color={xgbActive ? 'success' : 'warning'}
          icon={<CheckIcon />}
        />
        <Typography variant="caption" color="text.secondary">Supervised — Known Threat Classification</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb:5 }}>
        <Grid item xs={12} md={3}>
          <Card elevation={0} sx={{
            border:`1px solid ${theme.palette.divider}`,
            borderLeft:`4px solid #10b981`,
            height:'100%',
          }}>
            <CardContent sx={{ p:3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight:600 }}>LAST TRAINED</Typography>
              <Typography variant="body1" sx={{ fontWeight:700, mt:0.5 }}>
                {modelInfo?.xgboost?.last_trained || '—'}
              </Typography>
              <Divider sx={{ my:2 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight:600 }}>ALGORITHM</Typography>
              <Typography variant="body2" sx={{ mt:0.5 }}>Gradient Boosted Trees</Typography>
              <Divider sx={{ my:2 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight:600 }}>DATASET</Typography>
              <Typography variant="body2" sx={{ mt:0.5 }}>UNSW-NB15</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={9}>
          <Grid container spacing={2}>
            {[
              { label:'Accuracy',  value:metrics?.xgboost?.accuracy,  color:'#10b981' },
              { label:'Precision', value:metrics?.xgboost?.precision, color:'#3b82f6' },
              { label:'Recall',    value:metrics?.xgboost?.recall,    color:'#f59e0b' },
              { label:'F1 Score',  value:metrics?.xgboost?.f1_score,  color:'#8b5cf6' },
            ].map(m => (
              <Grid item xs={6} sm={3} key={m.label}>
                <MetricCard {...m} />
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>

      <Divider sx={{ mb:4 }} />

      {/* Autoencoder section */}
      <Box sx={{ mb:2, display:'flex', alignItems:'center', gap:1 }}>
        <BugIcon sx={{ color:'#8b5cf6' }} />
        <Typography variant="h6" sx={{ fontWeight:700 }}>Autoencoder Anomaly Detector</Typography>
        <Chip
          label={modelInfo?.autoencoder?.status || 'Unknown'}
          size="small"
          color={aeActive ? 'secondary' : 'warning'}
          icon={<MemoryIcon />}
        />
        <Typography variant="caption" color="text.secondary">Unsupervised — Zero-Day Detection</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb:4 }}>
        <Grid item xs={12} md={3}>
          <Card elevation={0} sx={{
            border:`1px solid ${theme.palette.divider}`,
            borderLeft:`4px solid #8b5cf6`,
            height:'100%',
          }}>
            <CardContent sx={{ p:3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight:600 }}>LAST TRAINED</Typography>
              <Typography variant="body1" sx={{ fontWeight:700, mt:0.5 }}>
                {modelInfo?.autoencoder?.last_trained || '—'}
              </Typography>
              <Divider sx={{ my:2 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight:600 }}>ALGORITHM</Typography>
              <Typography variant="body2" sx={{ mt:0.5 }}>Neural Autoencoder</Typography>
              <Divider sx={{ my:2 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight:600 }}>USE CASE</Typography>
              <Typography variant="body2" sx={{ mt:0.5 }}>Unknown / zero-day threats</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={9}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Card elevation={0} sx={{ border:`1px solid ${theme.palette.divider}`, borderTop:'3px solid #8b5cf6', p:2.5 }}>
                <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:1 }}>
                  <TimelineIcon sx={{ color:'#8b5cf6', fontSize:20 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight:600, textTransform:'uppercase' }}>
                    Mean Reconstruction Error (MSE)
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight:800, color:'#8b5cf6' }}>
                  {metrics?.autoencoder?.mean_mse?.toFixed(6) || '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">Baseline error for normal traffic</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card elevation={0} sx={{ border:`1px solid ${theme.palette.divider}`, borderTop:'3px solid #ef4444', p:2.5 }}>
                <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:1 }}>
                  <SecurityIcon sx={{ color:'#ef4444', fontSize:20 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight:600, textTransform:'uppercase' }}>
                    Anomaly Threshold
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight:800, color:'#ef4444' }}>
                  {metrics?.autoencoder?.threshold ?? '5.0'}
                </Typography>
                <Typography variant="caption" color="text.secondary">MSE above this flags an attack</Typography>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ borderRadius:2 }}>
        <strong>How it works:</strong> Every request is first checked against <strong>41 static regex rules</strong>.
        If it passes, <strong>XGBoost</strong> classifies it against known attack patterns.
        Finally, the <strong>Autoencoder</strong> detects unusual behaviour that matches no known pattern (zero-day attacks).
      </Alert>
    </Box>
  );
}
