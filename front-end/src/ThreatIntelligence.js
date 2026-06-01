import React, { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Warning as WarningIcon,
  Security as SecurityIcon,
  Block as BlockIcon,
} from "@mui/icons-material";
import { getThreatIntelligence } from './api';

export default function ThreatIntelligence() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchThreatData = async () => {
      try {
        if (data === null) {
          setLoading(true);
        }
        
        const result = await getThreatIntelligence();
        setData(result);
        setError(null);
      } catch (err) {
        console.error("Error fetching threat intelligence:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchThreatData();
    
    const interval = setInterval(fetchThreatData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress size={60} />
        <Typography sx={{ ml: 2 }}>Loading threat intelligence data...</Typography>
      </Box>
    );
  }

  const totalThreats = data.topThreats?.reduce((sum, threat) => sum + threat.value, 0) || 0;
  const threatRate = data.stats?.total > 0 
    ? ((data.stats.blocked / data.stats.total) * 100).toFixed(1) 
    : 0;

  const getThreatColor = (threatType) => {
    const type = threatType?.toLowerCase() || '';
    if (type.includes('sqli') || type.includes('sql')) return '#d32f2f';
    if (type.includes('xss')) return '#f57c00';
    if (type.includes('rfi')) return '#7b1fa2';
    if (type.includes('csrf')) return '#0097a7';
    if (type.includes('ddos')) return '#c2185b';
    return '#757575';
  };

  

  const actualThreats = data.topThreats?.filter(t => t.name !== 'None') || [];

  return (
    <Box sx={{ p: 4 }}>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SecurityIcon sx={{ color: '#1976d2', mr: 1, fontSize: 20 }} />
                <Typography variant="caption" color="text.secondary">
                  Threat Detection Rate
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#1976d2' }}>
                {threatRate}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={parseFloat(threatRate)} 
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                of all requests were threats
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BlockIcon sx={{ color: '#d32f2f', mr: 1, fontSize: 20 }} />
                <Typography variant="caption" color="text.secondary">
                  Total Threats Blocked
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#d32f2f' }}>
                {data.stats?.blocked?.toLocaleString() || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                out of {data.stats?.total?.toLocaleString() || 0} total requests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WarningIcon sx={{ color: '#f57c00', mr: 1, fontSize: 20 }} />
                <Typography variant="caption" color="text.secondary">
                  Unique Threat Types
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700, color: '#f57c00' }}>
                {actualThreats.length}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                different attack vectors detected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Threat Types Distribution Table */}
      <Paper
        elevation={3}
        sx={{
          borderRadius: 3,
          overflow: "hidden"
        }}
      >
        <Box sx={{ p: 2.5, borderBottom: "1px solid #e0e0e0", backgroundColor: '#fafafa' }}>
          <Typography variant="h6" fontWeight="600">
            <WarningIcon sx={{ fontSize: 20, verticalAlign: 'middle', mr: 1, color: '#f57c00' }} />
            Threat Types Distribution
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Classification of detected attack patterns
          </Typography>
        </Box>

        <Box sx={{ overflow: "auto" }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 600 }}>Threat Type</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Count</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Percentage</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {data.topThreats && data.topThreats.map((threat, i) => (
                <TableRow key={i} hover sx={{ '&:hover': { backgroundColor: '#fafafa' } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <WarningIcon 
                        sx={{ 
                          fontSize: 18, 
                          color: threat.name === 'None' ? '#9e9e9e' : getThreatColor(threat.name), 
                          mr: 1.5 
                        }} 
                      />
                      <Typography 
                        sx={{ 
                          fontWeight: threat.name !== 'None' ? 500 : 400,
                          color: threat.name !== 'None' ? getThreatColor(threat.name) : '#5d4037'
                        }}
                      >
                        {threat.name === 'None' ? 'Safe Traffic' : threat.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontWeight: 600 }}>
                      {threat.value}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1.5 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={(threat.value / totalThreats) * 100} 
                        sx={{ 
                          width: 80, 
                          height: 6, 
                          borderRadius: 3,
                          backgroundColor: threat.name === 'None' ? '#e8f5e9' : '#ffebee',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: threat.name === 'None' ? '#4caf50' : getThreatColor(threat.name)
                          }
                        }}
                      />
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', minWidth: 45 }}>
                        {((threat.value / totalThreats) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {(!data.topThreats || data.topThreats.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      No threat data available yet
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* Summary Note */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Total requests analyzed: {data.stats?.total || 0} | 
          Blocked: {data.stats?.blocked || 0} | 
          Allowed: {data.stats?.allowed || 0}
        </Typography>
      </Box>
    </Box>
  );
}