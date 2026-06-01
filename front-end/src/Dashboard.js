import React, { useEffect, useState, useContext } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  Typography,
  Alert,
  CircularProgress,
  Toolbar,
  Divider,
  Chip,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Traffic as TrafficIcon,
  List as LogsIcon,
  Gavel as RulesIcon,
  Security as ThreatIcon,
  Settings as SettingsIcon,
  Memory as ModelIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import DashboardHome from './DashboardHome';
import LiveTraffic from './LiveTraffic';
import FullLogs from './FullLogs';
import AdminLogs from './AdminLogs';
import Rules from './Rules';
import ThreatIntelligence from './ThreatIntelligence';
import Settings from './Settings';
import MLModelMonitor from './MLModelMonitor';

import { getLogs, getModelInfo } from './api';
import { ThemeContext } from './App';

const drawerWidth = 240;

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalRequests: 0,
    blocked: 0,
    allowed: 0,
    topThreats: [],
  });
  const [modelStats, setModelStats] = useState({
    accuracy: 0,
    predictions: 0,
    threatsDetected: 0,
    modelStatus: 'active'
  });

  const theme = useTheme();
  const { mode, toggleColorMode } = useContext(ThemeContext);

  const fetchData = async () => {
    try {
      if (!logs.length && !stats.totalRequests) {
        setLoading(true);
      }
      const data = await getLogs();
      const safeLogs = Array.isArray(data) ? data : [];
      setLogs(safeLogs);

      const total = safeLogs.length;
      const blockedCount = safeLogs.filter(log => log?.action === 'BLOCKED').length;
      const allowedCount = total - blockedCount;

      const threatCount = safeLogs.reduce((acc, log) => {
        if (log?.threat_type) {
          log.threat_type.split(',').forEach(t => {
            const key = t.trim();
            acc[key] = (acc[key] || 0) + 1;
          });
        }
        return acc;
      }, {});

      const topThreats = Object.entries(threatCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      setStats({ totalRequests: total, blocked: blockedCount, allowed: allowedCount, topThreats });
      
      // Fetch ML model stats from API
      try {
        const modelData = await getModelInfo();
        setModelStats(modelData);
      } catch (modelErr) {
        console.error('Failed to fetch model stats:', modelErr);
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to load data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 80000);
    return () => clearInterval(interval);
  }, []);

  const getThreatChip = (threat) => {
    if (!threat) return <Chip label="None" color="success" size="small" />;
    const type = threat.toLowerCase();
    let color = 'default';
    if (type.includes('sqli') || type.includes('xss') || type.includes('rfi')) color = 'error';
    if (type.includes('csrf') || type.includes('ddos')) color = 'warning';
    return <Chip label={threat} color={color} size="small" />;
  };

  const handleNavigation = (section) => {
    setActiveSection(section);
  };

  const menuItems = [
    { id: 'dashboard', text: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'logs',      text: 'Logs',      icon: <LogsIcon /> },
    { id: 'adminLogs', text: 'Admin Logs', icon: <LogsIcon/>},
    { id: 'rules',     text: 'Rules',     icon: <RulesIcon /> },
    { id: 'threats',   text: 'Threats',   icon: <ThreatIcon /> },
    { id: 'model',     text: ' Models', icon: <ModelIcon /> },
    { id: 'settings',  text: 'Settings',  icon: <SettingsIcon /> },
  ];

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      );
    }

    switch (activeSection) {
      case 'dashboard':
        return (
          <>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
              Dashboard Overview
            </Typography>
            <DashboardHome
              stats={stats}
              logs={logs}
              getThreatChip={getThreatChip}
              onNavigate={handleNavigation}
              modelStats={modelStats}
            />
          </>
        );

      case 'traffic':
        return (
          <>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
              Traffic Monitoring
            </Typography>
            <LiveTraffic logs={logs} getThreatChip={getThreatChip} />
          </>
        );

      case 'logs':
        return (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Security Logs
              </Typography>
              <Box>
                <IconButton aria-label="refresh logs" onClick={handleRefresh} disabled={refreshing} sx={{ mr: 1 }}>
                  <RefreshIcon />
                </IconButton>
                {refreshing && <CircularProgress size={20} />}
              </Box>
            </Box>
            <FullLogs logs={logs} getThreatChip={getThreatChip} />
          </>
        );

      case 'adminLogs':
        return (
          <>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
              Admin Logs
            </Typography>
            <AdminLogs/>
          </>
        );

      case 'rules':
        return (
          <>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
              Firewall Rules
            </Typography>
            <Rules />
          </>
        );

      case 'threats':
        return (
          <>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
              Threat Intelligence
            </Typography>
            <ThreatIntelligence />
          </>
        );

      case 'model':
        return <MLModelMonitor />;

      case 'settings':
        return (
          <>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
              Settings
            </Typography>
            <Settings />
          </>
        );

      default:
        return <Typography>Section not found</Typography>;
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: theme.palette.mode === 'light' ? '#5d4037' : '#2c2c2c',
            color: 'white',
          },
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
            SWAF
          </Typography>
          <IconButton onClick={toggleColorMode} sx={{ color: 'white' }}>
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Toolbar>
        <Divider sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                selected={activeSection === item.id}
                onClick={() => setActiveSection(item.id)}
                sx={{
                  '&.Mui-selected': { backgroundColor: 'rgba(25,118,210,0.25)' },
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                }}
              >
                <ListItemIcon sx={{ color: activeSection === item.id ? '#90caf9' : 'white' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 4, bgcolor: theme.palette.background.default }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <IconButton 
            onClick={handleRefresh} 
            disabled={refreshing}
            sx={{ 
              color: theme.palette.mode === 'light' ? '#5d4037' : '#90caf9',
              '&:hover': { backgroundColor: 'rgba(93, 64, 55, 0.1)' }
            }}
          >
            {refreshing ? <CircularProgress size={24} color="inherit" /> : <RefreshIcon />}
          </IconButton>
        </Toolbar>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {renderContent()}
      </Box>
    </Box>
  );
}