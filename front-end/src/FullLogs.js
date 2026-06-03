import React, { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Typography, Tooltip, Box, TextField, InputAdornment, Chip, Select,
  MenuItem, FormControl, InputLabel, TablePagination, useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';

export default function FullLogs({ logs = [], getThreatChip }) {
  const theme   = useTheme();
  const isDark  = theme.palette.mode === 'dark';

  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('ALL');
  const [page,    setPage]    = useState(0);
  const [rowsPerPage, setRows]= useState(25);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter(log => {
      const matchFilter = filter === 'ALL' || log.action === filter;
      const matchSearch = !q ||
        (log.source_ip || '').toLowerCase().includes(q) ||
        (log.request_path || '').toLowerCase().includes(q) ||
        (log.threat_type || '').toLowerCase().includes(q) ||
        (log.request_method || '').toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [logs, search, filter]);

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const blockedCount = logs.filter(l => l.action === 'BLOCKED').length;
  const allowedCount = logs.length - blockedCount;

  return (
    <Box>
      {/* Summary */}
      <Box sx={{ display:'flex', gap:2, mb:3, flexWrap:'wrap' }}>
        <Chip label={`${logs.length} Total`}     sx={{ fontWeight:700 }} />
        <Chip label={`${blockedCount} Blocked`}  color="error"   variant="outlined" sx={{ fontWeight:700 }} />
        <Chip label={`${allowedCount} Allowed`}  color="success" variant="outlined" sx={{ fontWeight:700 }} />
      </Box>

      {/* Filters */}
      <Box sx={{ display:'flex', gap:2, mb:3, flexWrap:'wrap' }}>
        <TextField
          placeholder="Search IP, path, threat type…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          size="small"
          sx={{ flex:1, minWidth:200 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color:'text.secondary' }} /></InputAdornment>
          }}
        />
        <FormControl size="small" sx={{ minWidth:140 }}>
          <InputLabel>Action</InputLabel>
          <Select value={filter} label="Action" onChange={e => { setFilter(e.target.value); setPage(0); }}
            startAdornment={<InputAdornment position="start"><FilterIcon sx={{ color:'text.secondary', fontSize:18 }} /></InputAdornment>}>
            <MenuItem value="ALL">All Actions</MenuItem>
            <MenuItem value="BLOCKED">Blocked</MenuItem>
            <MenuItem value="ALLOWED">Allowed</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Paper elevation={0} sx={{ border:`1px solid ${theme.palette.divider}` }}>
        <TableContainer sx={{ maxHeight:'60vh' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {['#','Time','Source IP','Method','Path','Threat','Action','Details'].map(h => (
                  <TableCell key={h} sx={{
                    fontWeight:700, fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.06em',
                    bgcolor: isDark ? '#1e293b' : '#f8fafc',
                  }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map(log => {
                const isBlocked = log.action === 'BLOCKED';
                return (
                  <TableRow key={log.id} hover sx={{
                    bgcolor: isBlocked
                      ? (isDark ? 'rgba(239,68,68,0.05)' : '#fff5f5')
                      : 'inherit',
                    '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc' },
                  }}>
                    <TableCell sx={{ color:'text.secondary', fontFamily:'monospace', fontSize:'0.75rem' }}>{log.id}</TableCell>
                    <TableCell sx={{ whiteSpace:'nowrap', fontSize:'0.8rem' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ fontFamily:'monospace', fontSize:'0.8rem', fontWeight:500 }}>
                      {log.source_ip || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip label={log.request_method || '—'} size="small" variant="outlined"
                        sx={{ fontFamily:'monospace', fontSize:'0.7rem', height:20 }} />
                    </TableCell>
                    <TableCell sx={{ maxWidth:200 }}>
                      <Tooltip title={log.request_path || '—'}>
                        <Typography sx={{ fontSize:'0.8rem', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:180 }}>
                          {log.request_path || '—'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {getThreatChip ? getThreatChip(log.threat_type) : (log.threat_type || '—')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.action}
                        size="small"
                        color={isBlocked ? 'error' : 'success'}
                        sx={{ fontWeight:700, fontSize:'0.7rem' }}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth:200 }}>
                      <Tooltip title={log.details || '—'}>
                        <Typography sx={{ fontSize:'0.75rem', color:'text.secondary', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:180 }}>
                          {log.details?.substring(0,60) || '—'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py:6, color:'text.secondary' }}>
                    {search || filter !== 'ALL' ? 'No matching logs found' : 'No logs available yet'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => { setRows(+e.target.value); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>
    </Box>
  );
}
