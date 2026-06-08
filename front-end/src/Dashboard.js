import React, { useEffect, useState, useContext } from 'react';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  CssBaseline, Typography, Alert, CircularProgress, Divider, Chip,
  IconButton, useTheme, AppBar, Toolbar, Avatar, Tooltip, Badge,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  List as LogsIcon,
  AdminPanelSettings as AdminIcon,
  Gavel as RulesIcon,
  Security as ThreatIcon,
  Settings as SettingsIcon,
  Memory as ModelIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Refresh as RefreshIcon,
  Shield as ShieldIcon,
  Logout as LogoutIcon,
  FiberManualRecord as LiveIcon,
} from '@mui/icons-material';

import DashboardHome from './DashboardHome';
import FullLogs from './FullLogs';
import AdminLogs from './AdminLogs';
import Rules from './Rules';
import ThreatIntelligence from './ThreatIntelligence';
import Settings from './Settings';
import MLModelMonitor from './MLModelMonitor';

import { getLogs, getModelInfo } from './api';
import { ThemeContext } from './App';

const DRAWER_WIDTH = 260;

const menuItems = [
  { id: 'dashboard', text: 'Overview',          icon: <DashboardIcon /> },
  { id: 'logs',      text: 'Security Logs',     icon: <LogsIcon />,    badge: true },
  { id: 'adminLogs', text: 'Admin Logs',        icon: <AdminIcon /> },
  { id: 'rules',     text: 'Firewall Rules',    icon: <RulesIcon /> },
  { id: 'threats',   text: 'Threat Intel',      icon: <ThreatIcon /> },
  { id: 'model',     text: 'ML Models',         icon: <ModelIcon /> },
  { id: 'settings',  text: 'Settings',          icon: <SettingsIcon /> },
];

export default function Dashboard({ onLogout }) {
  const [active,     setActive]    = useState('dashboard');
  const [logs,       setLogs]      = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [refreshing, setRefreshing]= useState(false);
  const [error,      setError]     = useState(null);
  const [stats,      setStats]     = useState({ totalRequests:0, blocked:0, allowed:0, topThreats:[] });
  const [modelStats, setModelStats]= useState({});
  const [lastUpdate, setLastUpdate]= useState(null);

  const theme = useTheme();
  const { mode, toggleColorMode } = useContext(ThemeContext);
  const isDark = mode === 'dark';

  const sidebarBg   = isDark ? '#0f172a' : '#1e3a5f';
  const sidebarText = 'rgba(255,255,255,0.85)';

  const fetchData = async (silent = false) => {
    try {
      if (!logs.length && !silent) setLoading(true);
      const data = await getLogs();
      const safeLogs = Array.isArray(data) ? data : [];
      setLogs(safeLogs);

      const total       = safeLogs.length;
      const blockedCount= safeLogs.filter(l => l?.action === 'BLOCKED').length;
      const threatCount = safeLogs.reduce((acc, l) => {
        if (l?.threat_type) {
          l.threat_type.split(',').forEach(t => {
            const k = t.trim();
            acc[k] = (acc[k] || 0) + 1;
          });
        }
        return acc;
      }, {});
      const topThreats = Object.entries(threatCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      setStats({ totalRequests: total, blocked: blockedCount, allowed: total - blockedCount, topThreats });
      setLastUpdate(new Date());

      try {
        const md = await getModelInfo();
        setModelStats(md);
      } catch {}

      setError(null);
    } catch (err) {
      setError('Failed to load data. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(() => fetchData(true), 15000); // silent background refresh
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => { setRefreshing(true); fetchData(false); };

  const getThreatChip = (threat) => {
    if (!threat || threat === 'None') return <Chip label="Safe" color="success" size="small" />;
    const t = threat.toLowerCase();
    let color = 'default';
    if (t.includes('sql') || t.includes('xss') || t.includes('lfi')) color = 'error';
    else if (t.includes('csrf') || t.includes('ssrf') || t.includes('xxe')) color = 'warning';
    else if (t.includes('bot') || t.includes('rate')) color = 'secondary';
    return <Chip label={threat} color={color} size="small" />;
  };

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh', flexDirection:'column', gap:2 }}>
          <CircularProgress size={56} thickness={4} />
          <Typography color="text.secondary">Loading security data…</Typography>
        </Box>
      );
    }
    switch (active) {
      case 'dashboard':  return <DashboardHome stats={stats} logs={logs} getThreatChip={getThreatChip} onNavigate={setActive} modelStats={modelStats} />;
      case 'logs':       return <FullLogs logs={logs} getThreatChip={getThreatChip} />;
      case 'adminLogs':  return <AdminLogs />;
      case 'rules':      return <Rules />;
      case 'threats':    return <ThreatIntelligence />;
      case 'model':      return <MLModelMonitor />;
      case 'settings':   return <Settings />;
      default:           return null;
    }
  };

  const pageTitle = menuItems.find(m => m.id === active)?.text || 'Dashboard';

  return (
    <Box sx={{ display:'flex', minHeight:'100vh' }}>
      <CssBaseline />

      {/* ── Sidebar ── */}
      <Drawer variant="permanent" sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: sidebarBg,
          color: sidebarText,
          border: 'none',
          backgroundImage: 'none',
        },
      }}>
        {/* Brand */}
        <Box sx={{ px: 3, py: 3, display:'flex', alignItems:'center', gap: 1.5 }}>
          <Box sx={{
            p: 1, borderRadius: 2,
            background: 'linear-gradient(135deg, #1d4ed8, #06b6d4)',
            display: 'flex',
          }}>
            <ShieldIcon sx={{ fontSize: 22, color:'white' }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight:800, fontSize:'1.1rem', color:'white', lineHeight:1.1 }}>SWAF</Typography>
            <Typography sx={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.45)', letterSpacing:'0.08em' }}>ADMIN DASHBOARD</Typography>
          </Box>
        </Box>

        {/* Live status */}
        <Box sx={{ mx:2, mb:2, px:2, py:1, borderRadius:2, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', display:'flex', alignItems:'center', gap:1 }}>
          <LiveIcon sx={{ fontSize:8, color:'#10b981', animation:'pulse 2s infinite' }} />
          <Typography variant="caption" sx={{ color:'#10b981', fontWeight:600 }}>LIVE PROTECTION ACTIVE</Typography>
        </Box>

        <Divider sx={{ borderColor:'rgba(255,255,255,0.07)', mx:2 }} />

        {/* Nav */}
        <List sx={{ px:1, mt:1, flex:1 }}>
          {menuItems.map(item => {
            const isActive = active === item.id;
            return (
              <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => setActive(item.id)}
                  sx={{
                    borderRadius: 2,
                    py: 1.2,
                    background: isActive ? 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(6,182,212,0.15))' : 'transparent',
                    border: isActive ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                    '&:hover': { background:'rgba(255,255,255,0.07)' },
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.5)', minWidth: 38 }}>
                    {item.badge && stats.blocked > 0
                      ? <Badge badgeContent={stats.blocked} color="error" max={99}>{item.icon}</Badge>
                      : item.icon
                    }
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 700 : 400,
                      color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {/* Bottom: stats summary */}
        <Box sx={{ m:2, p:2, borderRadius:2, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <Typography variant="caption" sx={{ color:'rgba(255,255,255,0.4)', display:'block', mb:1 }}>SESSION STATS</Typography>
          <Box sx={{ display:'flex', justifyContent:'space-between' }}>
            <Box sx={{ textAlign:'center' }}>
              <Typography sx={{ color:'#10b981', fontWeight:700, fontSize:'1rem' }}>{stats.allowed}</Typography>
              <Typography variant="caption" sx={{ color:'rgba(255,255,255,0.4)' }}>Allowed</Typography>
            </Box>
            <Box sx={{ textAlign:'center' }}>
              <Typography sx={{ color:'#ef4444', fontWeight:700, fontSize:'1rem' }}>{stats.blocked}</Typography>
              <Typography variant="caption" sx={{ color:'rgba(255,255,255,0.4)' }}>Blocked</Typography>
            </Box>
            <Box sx={{ textAlign:'center' }}>
              <Typography sx={{ color:'#60a5fa', fontWeight:700, fontSize:'1rem' }}>{stats.totalRequests}</Typography>
              <Typography variant="caption" sx={{ color:'rgba(255,255,255,0.4)' }}>Total</Typography>
            </Box>
          </Box>
        </Box>
      </Drawer>

      {/* ── Main ── */}
      <Box component="main" sx={{ flexGrow:1, display:'flex', flexDirection:'column', bgcolor:'background.default', minHeight:'100vh' }}>
        {/* Top AppBar */}
        <AppBar position="static" elevation={0} sx={{
          bgcolor: 'background.paper',
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundImage: 'none',
        }}>
          <Toolbar sx={{ gap:1 }}>
            <Box sx={{ flex:1 }}>
              <Typography variant="h6" sx={{ fontWeight:700, color:'text.primary' }}>
                {pageTitle}
              </Typography>
              {lastUpdate && (
                <Typography variant="caption" color="text.secondary">
                  Last updated {lastUpdate.toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg' })}
                </Typography>
              )}
            </Box>

            <Tooltip title="Refresh data">
              <IconButton onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
              <IconButton onClick={toggleColorMode}>
                {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Logout">
              <IconButton onClick={onLogout} color="error">
                <LogoutIcon />
              </IconButton>
            </Tooltip>

            <Avatar sx={{ width:34, height:34, bgcolor:'#1d4ed8', fontSize:'0.85rem', fontWeight:700 }}>A</Avatar>
          </Toolbar>
        </AppBar>

        {/* Content */}
        <Box sx={{ flex:1, p: { xs:2, sm:3, md:4 }, overflow:'auto' }}>
          {error && <Alert severity="error" sx={{ mb:3 }} onClose={() => setError(null)}>{error}</Alert>}
          {renderContent()}
        </Box>
      </Box>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </Box>
  );
}
