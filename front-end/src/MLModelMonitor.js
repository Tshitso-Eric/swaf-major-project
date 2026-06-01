import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Memory as MemoryIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';
import { getModelInfo, getModelMetrics } from './api';

export default function MLModelMonitor() {
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [info, metricsData] = await Promise.all([getModelInfo(), getModelMetrics()]);
      setModelInfo(info);
      setMetrics(metricsData);
    } catch (err) {
      setError('Failed to load model data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
          Hybrid ML Model Monitor
        </Typography>
        <IconButton onClick={fetchData} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* 1. XGBoost Section */}
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SecurityIcon color="primary" /> Supervised: XGBoost Classifier
      </Typography>
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', bgcolor: '#f8f9fa' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Model Status</Typography>
              <Chip 
                label={modelInfo?.xgboost?.status || 'Inactive'} 
                color={modelInfo?.xgboost?.status === 'Active' ? 'success' : 'warning'}
                icon={<CheckIcon />}
                sx={{ mb: 2 }}
              />
              <Typography variant="body2"><strong>Last Trained:</strong> {modelInfo?.xgboost?.last_trained}</Typography>
              <Typography variant="body2"><strong>Type:</strong> Known Threat Classification</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            {[
              { label: 'Accuracy', value: metrics?.xgboost?.accuracy, color: '#4caf50' },
              { label: 'Precision', value: metrics?.xgboost?.precision, color: '#2196f3' },
              { label: 'Recall', value: metrics?.xgboost?.recall, color: '#ff9800' },
              { label: 'F1 Score', value: metrics?.xgboost?.f1_score, color: '#9c27b0' }
            ].map((m, i) => (
              <Grid item xs={6} sm={3} key={i}>
                <Paper sx={{ p: 2, textAlign: 'center', borderTop: `4px solid ${m.color}` }}>
                  <Typography variant="caption" color="text.secondary">{m.label}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {m.value ? `${(m.value * 100).toFixed(1)}%` : '—'}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 5 }} />

      {/* 2. Autoencoder Section */}
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <BugReportIcon color="secondary" /> Unsupervised: Autoencoder Anomaly Detection
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', bgcolor: '#fdfcfe' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Model Status</Typography>
              <Chip 
                label={modelInfo?.autoencoder?.status || 'Inactive'} 
                color={modelInfo?.autoencoder?.status === 'Active' ? 'secondary' : 'warning'}
                icon={<MemoryIcon />}
                sx={{ mb: 2 }}
              />
              <Typography variant="body2"><strong>Last Trained:</strong> {modelInfo?.autoencoder?.last_trained}</Typography>
              <Typography variant="body2"><strong>Type:</strong> Zero-Day / Anomaly Detection</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 3, bgcolor: '#fff' }}>
                <Typography variant="subtitle2" color="text.secondary">Mean Reconstruction Error (MSE)</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#673ab7' }}>
                  {metrics?.autoencoder?.mean_mse?.toFixed(6) || '—'}
                </Typography>
                <Typography variant="caption">The baseline error for "Normal" traffic</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 3, bgcolor: '#fff' }}>
                <Typography variant="subtitle2" color="text.secondary">Anomaly Threshold</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#f44336' }}>
                  {metrics?.autoencoder?.threshold || '—'}
                </Typography>
                <Typography variant="caption">MSE above this flags a potential attack</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      <Box sx={{ mt: 5 }}>
        <Alert severity="info">
          The WAF first uses <strong>Static Rules</strong>, then <strong>XGBoost</strong> for known patterns, 
          and finally <strong>Autoencoders</strong> to catch unknown anomalies.
        </Alert>
      </Box>
    </Box>
  );
}
