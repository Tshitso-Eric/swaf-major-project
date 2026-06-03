import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, CircularProgress, TextField, InputAdornment, useTheme, TablePagination,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { getAdminLogs } from './api';

export default function AdminLogs() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [logs,    setLogs]   = useState([]);
  const [loading, setLoad]   = useState(true);
  const [search,  setSearch] = useState('');
  const [page,    setPage]   = useState(0);
  const [rpp,     setRpp]    = useState(20);

  useEffect(() => {
    (async () => {
      try { setLogs(await getAdminLogs()); }
      catch {}
      finally { setLoad(false); }
    })();
  }, []);

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    return !q ||
      (l.admin_username||'').toLowerCase().includes(q) ||
      (l.action||'').toLowerCase().includes(q) ||
      (l.ip||'').toLowerCase().includes(q);
  });

  const paginated = filtered.slice(page * rpp, page * rpp + rpp);

  return (
    <Box>
      <Box sx={{ display:'flex', gap:2, mb:3 }}>
        <Chip label={`${logs.length} Total Events`} sx={{ fontWeight:700 }} />
        <Chip label={`${logs.filter(l=>l.status==='SUCCESS').length} Successful`} color="success" variant="outlined" sx={{ fontWeight:700 }} />
        <Chip label={`${logs.filter(l=>l.status==='FAILED').length} Failed`} color="error" variant="outlined" sx={{ fontWeight:700 }} />
      </Box>

      <TextField
        placeholder="Search by admin, action, IP…"
        value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
        size="small" fullWidth sx={{ mb:3 }}
        InputProps={{ startAdornment:<InputAdornment position="start"><SearchIcon sx={{ color:'text.secondary' }} /></InputAdornment> }}
      />

      {loading ? (
        <Box sx={{ display:'flex', justifyContent:'center', py:8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper elevation={0} sx={{ border:`1px solid ${theme.palette.divider}` }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Timestamp','Admin User','Action','Status','IP Address','User Agent'].map(h => (
                  <TableCell key={h} sx={{
                    fontWeight:700, fontSize:'0.75rem', textTransform:'uppercase',
                    letterSpacing:'0.06em', bgcolor: isDark?'#1e293b':'#f8fafc',
                  }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map(log => (
                <TableRow key={log.id} hover sx={{
                  bgcolor: log.status === 'FAILED'
                    ? (isDark ? 'rgba(239,68,68,0.05)' : '#fff5f5') : 'inherit',
                }}>
                  <TableCell sx={{ fontSize:'0.8rem', whiteSpace:'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ fontWeight:700 }}>{log.admin_username}</TableCell>
                  <TableCell>
                    <Chip label={log.action} size="small" variant="outlined"
                      color={log.action==='LOGIN'?'primary':'default'}
                      sx={{ fontWeight:600, fontSize:'0.7rem' }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={log.status} size="small"
                      color={log.status==='SUCCESS'?'success':'error'}
                      sx={{ fontWeight:700, fontSize:'0.7rem' }} />
                  </TableCell>
                  <TableCell sx={{ fontFamily:'monospace', fontSize:'0.8rem' }}>{log.ip || '—'}</TableCell>
                  <TableCell sx={{ maxWidth:200 }}>
                    <Typography sx={{ fontSize:'0.75rem', color:'text.secondary', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:180 }}>
                      {log.user_agent || '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py:5, color:'text.secondary' }}>
                    {search ? 'No matching logs' : 'No admin activity logged yet'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination component="div" count={filtered.length} page={page} rowsPerPage={rpp}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={e => { setRpp(+e.target.value); setPage(0); }}
            rowsPerPageOptions={[10,20,50]} />
        </Paper>
      )}
    </Box>
  );
}
