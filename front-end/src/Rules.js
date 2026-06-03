import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableContainer, TableHead, TableRow, TableCell, TableBody,
  Button, Switch, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Chip, Select, MenuItem, FormControl, InputLabel,
  InputAdornment, Tooltip, Alert, useTheme, TablePagination,
} from '@mui/material';
import {
  Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon,
  Search as SearchIcon, Shield as ShieldIcon,
} from '@mui/icons-material';
import { getRules, addRule, deleteRule, toggleRule, updateRule } from './api';

const THREAT_COLORS = {
  'SQL Injection':    '#ef4444',
  'XSS':             '#f59e0b',
  'Path Traversal':  '#8b5cf6',
  'Command Injection':'#f97316',
  'SSRF':            '#06b6d4',
  'XXE':             '#ec4899',
  'LFI':             '#a855f7',
  'Malicious Bot':   '#64748b',
};

const ThreatChip = ({ type }) => {
  const color = THREAT_COLORS[type] || '#6b7280';
  return (
    <Chip label={type || '—'} size="small"
      sx={{ bgcolor:`${color}18`, color, border:`1px solid ${color}40`, fontWeight:600, fontSize:'0.7rem' }} />
  );
};

const THREAT_TYPES = ['SQL Injection','XSS','Path Traversal','Command Injection','SSRF','XXE','LFI','Malicious Bot'];

export default function Rules() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [rules,      setRules]     = useState([]);
  const [search,     setSearch]    = useState('');
  const [addOpen,    setAddOpen]   = useState(false);
  const [editOpen,   setEditOpen]  = useState(false);
  const [editingRule,setEditing]   = useState(null);
  const [alert,      setAlert]     = useState(null);
  const [page,       setPage]      = useState(0);
  const [rowsPerPage,setRows]      = useState(20);
  const [newRule,    setNewRule]   = useState({ rule_name:'', pattern:'', threat_type:'', action:'BLOCK' });

  const fetchRules = async () => {
    try { setRules(await getRules()); } catch {}
  };

  useEffect(() => { fetchRules(); }, []);

  const showAlert = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleAdd = async () => {
    if (!newRule.rule_name || !newRule.pattern) return;
    try {
      await addRule(newRule);
      setAddOpen(false);
      setNewRule({ rule_name:'', pattern:'', threat_type:'', action:'BLOCK' });
      await fetchRules();
      showAlert('success', 'Rule added successfully');
    } catch (e) { showAlert('error', 'Failed to add rule'); }
  };

  const handleDelete = async (id) => {
    try { await deleteRule(id); await fetchRules(); showAlert('success', 'Rule deleted'); }
    catch { showAlert('error', 'Failed to delete rule'); }
  };

  const handleToggle = async (rule) => {
    try { await toggleRule(rule.id, rule.enabled ? 0 : 1); await fetchRules(); }
    catch {}
  };

  const handleSaveEdit = async () => {
    try {
      await updateRule(editingRule.id, editingRule);
      setEditOpen(false); setEditing(null);
      await fetchRules();
      showAlert('success', 'Rule updated');
    } catch { showAlert('error', 'Failed to update rule'); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rules.filter(r =>
      !q ||
      (r.rule_name || '').toLowerCase().includes(q) ||
      (r.threat_type || '').toLowerCase().includes(q) ||
      (r.pattern || '').toLowerCase().includes(q)
    );
  }, [rules, search]);

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const enabledCount  = rules.filter(r => r.enabled === 1).length;

  const RuleField = ({ label, value, onChange, multiline, helperText }) => (
    <TextField fullWidth label={label} value={value} onChange={e => onChange(e.target.value)}
      multiline={multiline} rows={multiline ? 3 : 1} helperText={helperText}
      sx={{ mb:2 }} size="small" />
  );

  const ActionSelect = ({ value, onChange }) => (
    <FormControl fullWidth size="small" sx={{ mb:2 }}>
      <InputLabel>Action</InputLabel>
      <Select value={value} label="Action" onChange={e => onChange(e.target.value)}>
        <MenuItem value="BLOCK">🔴 BLOCK</MenuItem>
        <MenuItem value="LOG">🟡 LOG</MenuItem>
        <MenuItem value="ALLOW">🟢 ALLOW</MenuItem>
      </Select>
    </FormControl>
  );

  const ThreatSelect = ({ value, onChange }) => (
    <FormControl fullWidth size="small" sx={{ mb:2 }}>
      <InputLabel>Threat Type</InputLabel>
      <Select value={value} label="Threat Type" onChange={e => onChange(e.target.value)}>
        {THREAT_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        <MenuItem value="">Custom…</MenuItem>
      </Select>
    </FormControl>
  );

  return (
    <Box>
      {alert && <Alert severity={alert.type} sx={{ mb:3 }} onClose={() => setAlert(null)}>{alert.msg}</Alert>}

      {/* Stats bar */}
      <Box sx={{ display:'flex', gap:2, mb:3, flexWrap:'wrap' }}>
        <Chip icon={<ShieldIcon />} label={`${rules.length} Total Rules`} sx={{ fontWeight:700 }} />
        <Chip label={`${enabledCount} Active`}              color="success" variant="outlined" sx={{ fontWeight:700 }} />
        <Chip label={`${rules.length - enabledCount} Disabled`} color="default" variant="outlined" sx={{ fontWeight:700 }} />
      </Box>

      {/* Toolbar */}
      <Box sx={{ display:'flex', gap:2, mb:3, flexWrap:'wrap' }}>
        <TextField
          placeholder="Search rules…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          size="small"
          sx={{ flex:1, minWidth:200 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color:'text.secondary' }} /></InputAdornment>
          }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          Add Rule
        </Button>
      </Box>

      <Paper elevation={0} sx={{ border:`1px solid ${theme.palette.divider}` }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Rule Name','Threat Type','Pattern','Action','Active','Actions'].map(h => (
                  <TableCell key={h} sx={{
                    fontWeight:700, fontSize:'0.75rem', textTransform:'uppercase',
                    letterSpacing:'0.06em', bgcolor: isDark ? '#1e293b' : '#f8fafc',
                  }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map(rule => (
                <TableRow key={rule.id} hover sx={{
                  opacity: rule.enabled ? 1 : 0.5,
                  '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' },
                }}>
                  <TableCell sx={{ fontWeight:600, fontSize:'0.85rem' }}>{rule.rule_name}</TableCell>
                  <TableCell><ThreatChip type={rule.threat_type} /></TableCell>
                  <TableCell sx={{ maxWidth:240 }}>
                    <Tooltip title={rule.pattern}>
                      <Typography sx={{ fontSize:'0.75rem', fontFamily:'monospace',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:220 }}>
                        {rule.pattern}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip label={rule.action} size="small"
                      color={rule.action==='BLOCK'?'error': rule.action==='LOG'?'warning':'success'}
                      sx={{ fontWeight:700, fontSize:'0.7rem' }} />
                  </TableCell>
                  <TableCell>
                    <Switch checked={rule.enabled === 1} onChange={() => handleToggle(rule)} size="small" />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton size="small" color="primary" onClick={() => { setEditing({...rule}); setEditOpen(true); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDelete(rule.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py:5, color:'text.secondary' }}>
                    {search ? 'No matching rules' : 'No rules configured'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div" count={filtered.length} page={page} rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => { setRows(+e.target.value); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </Paper>

      {/* Add Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight:700 }}>Add WAF Rule</DialogTitle>
        <DialogContent sx={{ pt:2 }}>
          <RuleField label="Rule Name" value={newRule.rule_name} onChange={v => setNewRule({...newRule, rule_name:v})} />
          <ThreatSelect value={newRule.threat_type} onChange={v => setNewRule({...newRule, threat_type:v})} />
          <RuleField label="Regex Pattern" value={newRule.pattern} onChange={v => setNewRule({...newRule, pattern:v})}
            multiline helperText="Regular expression to match against requests" />
          <ActionSelect value={newRule.action} onChange={v => setNewRule({...newRule, action:v})} />
        </DialogContent>
        <DialogActions sx={{ px:3, pb:3 }}>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}
            disabled={!newRule.rule_name || !newRule.pattern}>Add Rule</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => { setEditOpen(false); setEditing(null); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight:700 }}>Edit Rule</DialogTitle>
        <DialogContent sx={{ pt:2 }}>
          {editingRule && <>
            <RuleField label="Rule Name" value={editingRule.rule_name}
              onChange={v => setEditing({...editingRule, rule_name:v})} />
            <ThreatSelect value={editingRule.threat_type}
              onChange={v => setEditing({...editingRule, threat_type:v})} />
            <RuleField label="Regex Pattern" value={editingRule.pattern}
              onChange={v => setEditing({...editingRule, pattern:v})} multiline />
            <ActionSelect value={editingRule.action}
              onChange={v => setEditing({...editingRule, action:v})} />
          </>}
        </DialogContent>
        <DialogActions sx={{ px:3, pb:3 }}>
          <Button onClick={() => { setEditOpen(false); setEditing(null); }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
