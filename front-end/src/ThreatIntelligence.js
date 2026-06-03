import React, { useEffect, useState } from 'react';
import {
  Paper, Typography, Box, Table, TableBody, TableCell, TableHead, TableRow,
  Grid, Card, CardContent, LinearProgress, CircularProgress, Chip, useTheme,
} from '@mui/material';
import {
  Warning as WarningIcon, Security as SecurityIcon, Block as BlockIcon,
  Router as IPIcon,
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, Tooltip as RechartTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getThreatIntelligence } from './api';

const COLORS = ['#ef4444','#f59e0b','#8b5cf6','#06b6d4','#10b981','#f97316','#ec4899','#64748b'];

export default function ThreatIntelligence() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const r = await getThreatIntelligence();
        setData(r);
      } catch {}
      finally { setLoading(false); }
    };
    fetch();
    const iv = setInterval(fetch, 15000);
    return () => clearInterval(iv);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', height:'400px', flexDirection:'column', gap:2 }}>
        <CircularProgress size={56} thickness={4} />
        <Typography color="text.secondary">Loading threat intelligence…</Typography>
      </Box>
    );
  }

  if (!data) return null;

  const totalThreats = data.topThreats?.reduce((s, t) => s + t.value, 0) || 1;
  const threatRate   = data.stats?.total > 0
    ? ((data.stats.blocked / data.stats.total) * 100).toFixed(1) : 0;

  const actualThreats = (data.topThreats || []).filter(t => t.name !== 'None');
  const pieData       = actualThreats.slice(0, 6);

  return (
    <Box>
      {/* Stat cards */}
      <Grid container spacing={3} sx={{ mb:4 }}>
        {[
          { label:'Detection Rate',    value:`${threatRate}%`,  icon:<SecurityIcon />, color:'#3b82f6', sub:'of traffic was threats' },
          { label:'Threats Blocked',   value:data.stats?.blocked?.toLocaleString()||0, icon:<BlockIcon />, color:'#ef4444', sub:`of ${data.stats?.total?.toLocaleString()||0} total requests` },
          { label:'Unique Attack Types', value:actualThreats.length, icon:<WarningIcon />, color:'#f59e0b', sub:'different attack vectors' },
          { label:'Top Attacker IPs',  value:data.topIPs?.length || 0, icon:<IPIcon />, color:'#8b5cf6', sub:'distinct source IPs' },
        ].map(card => (
          <Grid item xs={12} sm={6} md={3} key={card.label}>
            <Card elevation={0} sx={{ border:`1px solid ${theme.palette.divider}`, borderTop:`3px solid ${card.color}` }}>
              <CardContent sx={{ p:3 }}>
                <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                    {card.label}
                  </Typography>
                  <Box sx={{ p:0.8, borderRadius:2, bgcolor:`${card.color}18` }}>
                    {React.cloneElement(card.icon, { sx:{ fontSize:20, color:card.color } })}
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight:800, color:card.color, lineHeight:1 }}>{card.value}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt:0.5, display:'block' }}>{card.sub}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mb:4 }}>
        {/* Pie chart */}
        <Grid item xs={12} md={5}>
          <Card elevation={0} sx={{ border:`1px solid ${theme.palette.divider}`, height:'100%' }}>
            <CardContent sx={{ p:3 }}>
              <Typography variant="h6" sx={{ mb:0.5 }}>Attack Distribution</Typography>
              <Typography variant="caption" color="text.secondary">Proportion by threat type</Typography>
              <Box sx={{ height:280, mt:2 }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={90} innerRadius={40}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RechartTooltip contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border:`1px solid ${theme.palette.divider}`, borderRadius:8,
                      }} />
                      <Legend formatter={v => <span style={{ color: theme.palette.text.secondary, fontSize:'0.8rem' }}>{v}</span>} />
                    </PieChart>
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

        {/* Top IPs */}
        <Grid item xs={12} md={7}>
          <Card elevation={0} sx={{ border:`1px solid ${theme.palette.divider}`, height:'100%' }}>
            <CardContent sx={{ p:3 }}>
              <Typography variant="h6" sx={{ mb:0.5 }}>Top Attacking IPs</Typography>
              <Typography variant="caption" color="text.secondary">Source IPs with most blocked requests</Typography>
              <Box sx={{ mt:3 }}>
                {data.topIPs?.length > 0 ? data.topIPs.map((ip, i) => (
                  <Box key={ip.source_ip} sx={{ mb:2 }}>
                    <Box sx={{ display:'flex', justifyContent:'space-between', mb:0.5 }}>
                      <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                        <Chip label={`#${i+1}`} size="small" sx={{ height:18, fontSize:'0.65rem', fontWeight:700 }} />
                        <Typography sx={{ fontFamily:'monospace', fontSize:'0.85rem', fontWeight:600 }}>{ip.source_ip}</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight:700, color:'#ef4444' }}>{ip.count} requests</Typography>
                    </Box>
                    <LinearProgress variant="determinate"
                      value={Math.min((ip.count / (data.topIPs[0].count || 1)) * 100, 100)}
                      sx={{ height:6, borderRadius:3, bgcolor:isDark?'rgba(239,68,68,0.1)':'#fee2e2',
                        '& .MuiLinearProgress-bar': { bgcolor:'#ef4444', borderRadius:3 } }} />
                  </Box>
                )) : (
                  <Typography color="text.secondary" variant="body2">No attacker IP data yet</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Threat table */}
      <Paper elevation={0} sx={{ border:`1px solid ${theme.palette.divider}` }}>
        <Box sx={{ p:3, borderBottom:`1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6">Threat Type Breakdown</Typography>
          <Typography variant="caption" color="text.secondary">All detected attack patterns with frequency</Typography>
        </Box>
        <Table>
          <TableHead>
            <TableRow>
              {['Threat Type','Count','Share','Bar'].map(h => (
                <TableCell key={h} sx={{ fontWeight:700, fontSize:'0.75rem', textTransform:'uppercase',
                  letterSpacing:'0.06em', bgcolor: isDark?'#1e293b':'#f8fafc' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {(data.topThreats || []).map((threat, i) => {
              const pct = ((threat.value / totalThreats) * 100).toFixed(1);
              const color = threat.name === 'None' ? '#10b981' : COLORS[i % COLORS.length];
              return (
                <TableRow key={i} hover>
                  <TableCell>
                    <Chip label={threat.name === 'None' ? 'Safe Traffic' : threat.name}
                      size="small" sx={{ bgcolor:`${color}18`, color, border:`1px solid ${color}40`, fontWeight:600 }} />
                  </TableCell>
                  <TableCell sx={{ fontWeight:700 }}>{threat.value.toLocaleString()}</TableCell>
                  <TableCell sx={{ fontFamily:'monospace', fontWeight:600 }}>{pct}%</TableCell>
                  <TableCell sx={{ width:160 }}>
                    <LinearProgress variant="determinate" value={parseFloat(pct)}
                      sx={{ height:6, borderRadius:3, bgcolor:`${color}15`,
                        '& .MuiLinearProgress-bar': { bgcolor:color, borderRadius:3 } }} />
                  </TableCell>
                </TableRow>
              );
            })}
            {(!data.topThreats || data.topThreats.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py:5, color:'text.secondary' }}>No threat data available</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
