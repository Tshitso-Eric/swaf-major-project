import React from 'react';
import {
  Grid, Card, CardContent, Typography, Box, useTheme,
  LinearProgress, Chip, Divider,
} from '@mui/material';
import {
  Security as ThreatIcon,
  Gavel as RulesIcon,
  Settings as SettingsIcon,
  Memory as ModelIcon,
  Block as BlockIcon,
  CheckCircle as AllowIcon,
  BarChart as ChartIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

const StatCard = ({ label, value, sub, color, icon, onClick }) => {
  const theme = useTheme();
  return (
    <Card
      onClick={onClick}
      elevation={0}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        border: `1px solid ${theme.palette.divider}`,
        borderTop: `3px solid ${color}`,
        transition: 'all 0.2s',
        '&:hover': onClick ? { transform:'translateY(-3px)', boxShadow:6 } : {},
        height: '100%',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', mb:2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>
            {label}
          </Typography>
          <Box sx={{ p:0.8, borderRadius:2, bgcolor:`${color}18` }}>
            {React.cloneElement(icon, { sx:{ fontSize:20, color } })}
          </Box>
        </Box>
        <Typography variant="h3" sx={{ fontWeight:800, color, lineHeight:1 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary" sx={{ mt:0.5, display:'block' }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const NavCard = ({ id, title, description, icon, color, bgColor, onClick }) => {
  const theme = useTheme();
  return (
    <Card
      onClick={() => onClick(id)}
      elevation={0}
      sx={{
        cursor: 'pointer',
        border: `1px solid ${theme.palette.divider}`,
        transition: 'all 0.2s',
        height: '100%',
        '&:hover': { transform:'translateY(-4px)', boxShadow:8, borderColor: color },
      }}
    >
      <CardContent sx={{ p:3 }}>
        <Box sx={{
          display:'inline-flex', p:1.5, borderRadius:2,
          bgcolor: bgColor, mb:2,
        }}>
          {React.cloneElement(icon, { sx:{ fontSize:24, color } })}
        </Box>
        <Typography variant="h6" sx={{ fontWeight:700, mb:0.5 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">{description}</Typography>
        <Box sx={{ mt:2, display:'flex', alignItems:'center', gap:0.5 }}>
          <Typography variant="caption" sx={{ color, fontWeight:600 }}>Open →</Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default function DashboardHome({ stats, logs, getThreatChip, onNavigate, modelStats }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const blockRate = stats.totalRequests > 0
    ? ((stats.blocked / stats.totalRequests) * 100).toFixed(1)
    : 0;

  // Chart data — top threats (exclude "None")
  const chartData = (stats.topThreats || [])
    .filter(t => t.name !== 'None' && t.name !== 'Rate Limit')
    .slice(0, 6);

  const CHART_COLORS = ['#ef4444','#f59e0b','#8b5cf6','#06b6d4','#10b981','#f97316'];

  const navCards = [
    { id:'rules',     title:'Firewall Rules',     description:'Manage WAF regex patterns and block rules',           icon:<RulesIcon />,  color:'#f59e0b', bgColor: isDark?'rgba(245,158,11,0.1)':'#fffbeb' },
    { id:'threats',   title:'Threat Intelligence', description:'Analyze attack patterns and top attacker IPs',       icon:<ThreatIcon />, color:'#ef4444', bgColor: isDark?'rgba(239,68,68,0.1)':'#fef2f2' },
    { id:'model',     title:'ML Models',           description:'XGBoost classifier + autoencoder anomaly detection', icon:<ModelIcon />,  color:'#8b5cf6', bgColor: isDark?'rgba(139,92,246,0.1)':'#f5f3ff' },
    { id:'adminLogs', title:'Admin Logs',          description:'Track all admin actions and login history',          icon:<AdminIcon />,  color:'#06b6d4', bgColor: isDark?'rgba(6,182,212,0.1)':'#ecfeff' },
    { id:'settings',  title:'Settings',            description:'Configure WAF mode, target app, and rate limits',   icon:<SettingsIcon />, color:'#64748b', bgColor: isDark?'rgba(100,116,139,0.1)':'#f8fafc' },
  ];

  // Recent logs (last 5)
  const recentLogs = logs.slice(0, 5);

  return (
    <Box>
      {/* ── Top stat cards ── */}
      <Grid container spacing={3} sx={{ mb:4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Total Requests"
            value={stats.totalRequests}
            sub="All intercepted traffic"
            color="#3b82f6"
            icon={<ChartIcon />}
            onClick={() => onNavigate('logs')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Threats Blocked"
            value={stats.blocked}
            sub={`${blockRate}% block rate`}
            color="#ef4444"
            icon={<BlockIcon />}
            onClick={() => onNavigate('logs')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Requests Allowed"
            value={stats.allowed}
            sub="Safe traffic passed through"
            color="#10b981"
            icon={<AllowIcon />}
            onClick={() => onNavigate('logs')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Threat Types"
            value={stats.topThreats.filter(t => t.name !== 'None').length}
            sub="Unique attack vectors"
            color="#f59e0b"
            icon={<ThreatIcon />}
            onClick={() => onNavigate('threats')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb:4 }}>
        {/* ── Threat chart ── */}
        <Grid item xs={12} md={7}>
          <Card elevation={0} sx={{ border:`1px solid ${theme.palette.divider}`, height:'100%' }}>
            <CardContent sx={{ p:3 }}>
              <Typography variant="h6" sx={{ mb:0.5 }}>Top Threat Types</Typography>
              <Typography variant="caption" color="text.secondary">Attack distribution by category</Typography>
              <Box sx={{ mt:3, height: 220 }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize:11, fill: theme.palette.text.secondary }} />
                      <YAxis tick={{ fontSize:11, fill: theme.palette.text.secondary }} />
                      <RechartTooltip
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                        }}
                      />
                      <Bar dataKey="value" radius={[4,4,0,0]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
                    <Typography color="text.secondary">No threat data yet</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Block rate progress + model status ── */}
        <Grid item xs={12} md={5}>
          <Card elevation={0} sx={{ border:`1px solid ${theme.palette.divider}`, height:'100%' }}>
            <CardContent sx={{ p:3 }}>
              <Typography variant="h6" sx={{ mb:2 }}>Security Overview</Typography>

              <Box sx={{ mb:3 }}>
                <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.5 }}>
                  <Typography variant="body2" color="text.secondary">Block Rate</Typography>
                  <Typography variant="body2" sx={{ fontWeight:700, color:'#ef4444' }}>{blockRate}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={parseFloat(blockRate)}
                  sx={{ height:8, borderRadius:4, bgcolor:'rgba(239,68,68,0.1)',
                    '& .MuiLinearProgress-bar': { bgcolor:'#ef4444', borderRadius:4 } }} />
              </Box>

              <Box sx={{ mb:3 }}>
                <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.5 }}>
                  <Typography variant="body2" color="text.secondary">Safe Traffic</Typography>
                  <Typography variant="body2" sx={{ fontWeight:700, color:'#10b981' }}>
                    {stats.totalRequests > 0 ? (100 - parseFloat(blockRate)).toFixed(1) : 0}%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate"
                  value={stats.totalRequests > 0 ? 100 - parseFloat(blockRate) : 0}
                  sx={{ height:8, borderRadius:4, bgcolor:'rgba(16,185,129,0.1)',
                    '& .MuiLinearProgress-bar': { bgcolor:'#10b981', borderRadius:4 } }} />
              </Box>

              <Divider sx={{ my:2 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                ML Engine Status
              </Typography>
              <Box sx={{ mt:1.5, display:'flex', flexDirection:'column', gap:1 }}>
                <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <Typography variant="body2">XGBoost Classifier</Typography>
                  <Chip size="small" label={modelStats?.xgboost?.status || 'Loading…'}
                    color={modelStats?.xgboost?.status === 'Active' ? 'success' : 'warning'} />
                </Box>
                <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <Typography variant="body2">Autoencoder</Typography>
                  <Chip size="small" label={modelStats?.autoencoder?.status || 'Loading…'}
                    color={modelStats?.autoencoder?.status === 'Active' ? 'success' : 'warning'} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Recent logs ── */}
      <Card elevation={0} sx={{ border:`1px solid ${theme.palette.divider}`, mb:4 }}>
        <CardContent sx={{ p:3 }}>
          <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:2 }}>
            <Box>
              <Typography variant="h6">Recent Activity</Typography>
              <Typography variant="caption" color="text.secondary">Last 5 intercepted requests</Typography>
            </Box>
            <Chip label="View All" size="small" onClick={() => onNavigate('logs')} sx={{ cursor:'pointer' }} />
          </Box>
          {recentLogs.length === 0 ? (
            <Typography color="text.secondary" variant="body2">No logs yet</Typography>
          ) : (
            <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
              {recentLogs.map(log => (
                <Box key={log.id} sx={{
                  display:'flex', alignItems:'center', gap:2, p:1.5,
                  borderRadius:2, bgcolor: log.action==='BLOCKED'
                    ? (isDark?'rgba(239,68,68,0.07)':'#fff5f5')
                    : (isDark?'rgba(16,185,129,0.07)':'#f0fdf4'),
                  border:`1px solid ${log.action==='BLOCKED'?'rgba(239,68,68,0.15)':'rgba(16,185,129,0.15)'}`,
                }}>
                  <Chip
                    label={log.action}
                    size="small"
                    color={log.action==='BLOCKED'?'error':'success'}
                    sx={{ minWidth:72, fontWeight:700 }}
                  />
                  <Typography variant="body2" sx={{ flex:1, fontFamily:'monospace', fontSize:'0.8rem' }} noWrap>
                    {log.request_method} {log.request_path}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace:'nowrap' }}>
                    {log.source_ip}
                  </Typography>
                  {getThreatChip && getThreatChip(log.threat_type)}
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Quick nav cards ── */}
      <Typography variant="h6" sx={{ mb:2 }}>Quick Access</Typography>
      <Grid container spacing={3}>
        {navCards.map(card => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={card.id}>
            <NavCard {...card} onClick={onNavigate} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
