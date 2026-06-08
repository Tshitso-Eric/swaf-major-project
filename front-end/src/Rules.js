import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableContainer, TableHead, TableRow, TableCell, TableBody,
  Button, Switch, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Chip, Select, MenuItem, FormControl, InputLabel,
  InputAdornment, Tooltip, Alert, useTheme, TablePagination, Collapse,
  Grid, CircularProgress, Divider,
} from '@mui/material';
import {
  Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon,
  Search as SearchIcon, Shield as ShieldIcon, CheckCircle as CheckIcon,
  Error as ErrorIcon, Lock as LockIcon, LockOpen as LockOpenIcon,
  Http as HttpIcon, Https as HttpsIcon, Warning as WarningIcon,
} from '@mui/icons-material';
import { getRules, addRule, deleteRule, toggleRule, updateRule, getPortStatus, blockPort, unblockPort } from './api';

const THREAT_COLORS = {
  'SQL Injection':      '#ef4444',
  'XSS':               '#f59e0b',
  'Path Traversal':    '#8b5cf6',
  'Command Injection': '#f97316',
  'SSRF':              '#06b6d4',
  'XXE':               '#ec4899',
  'LFI':               '#a855f7',
  'RFI':               '#10b981',
  'Malicious Bot':     '#64748b',
  'Backend Unavailable': '#94a3b8',
  'CSRF':              '#e11d48',
  'Rate Limit':        '#0ea5e9',
};

const ThreatChip = ({ type }) => {
  const color = THREAT_COLORS[type] || '#6b7280';
  return (
    <Chip label={type || '—'} size="small"
      sx={{ bgcolor:`${color}18`, color, border:`1px solid ${color}40`, fontWeight:600, fontSize:'0.7rem' }} />
  );
};

const THREAT_TYPES = [
  'SQL Injection', 'XSS', 'Path Traversal', 'Command Injection',
  'SSRF', 'XXE', 'LFI', 'RFI', 'Malicious Bot', 'Backend Unavailable',
  'CSRF', 'Rate Limit',
];

const BLANK_RULE = { rule_name: '', pattern: '', threat_type: '', action: 'BLOCK' };

/* Validate a regex string — returns null if valid, error message if invalid */
function validateRegex(pattern) {
  if (!pattern) return null;
  try { new RegExp(pattern); return null; }
  catch (e) { return e.message; }
}

/* ── Reusable form inside Add/Edit dialogs ───────────────────────── */
function RuleForm({ value, onChange }) {
  const [testInput, setTestInput]   = useState('');
  const [customType, setCustomType] = useState('');
  const [showTest, setShowTest]     = useState(false);

  const isCustom    = value.threat_type === '__custom__';
  const regexError  = validateRegex(value.pattern);

  // test the pattern against the test string
  let testResult = null;
  if (showTest && testInput && value.pattern && !regexError) {
    try {
      testResult = new RegExp(value.pattern, 'i').test(testInput);
    } catch { testResult = null; }
  }

  const set = (field, val) => onChange({ ...value, [field]: val });

  return (
    <Box sx={{ pt: 1 }}>
      {/* Rule Name */}
      <TextField
        fullWidth autoFocus label="Rule Name" size="small" sx={{ mb: 2 }}
        value={value.rule_name}
        onChange={e => set('rule_name', e.target.value)}
        placeholder="e.g. SQL Injection - Union Select"
      />

      {/* Threat Type dropdown + optional custom input */}
      <FormControl fullWidth size="small" sx={{ mb: isCustom ? 1 : 2 }}>
        <InputLabel>Threat Type</InputLabel>
        <Select
          value={isCustom ? '__custom__' : (value.threat_type || '')}
          label="Threat Type"
          onChange={e => {
            if (e.target.value === '__custom__') {
              onChange({ ...value, threat_type: '__custom__' });
            } else {
              setCustomType('');
              set('threat_type', e.target.value);
            }
          }}
        >
          {THREAT_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          <MenuItem value="__custom__">✏️ Custom type…</MenuItem>
        </Select>
      </FormControl>
      <Collapse in={isCustom}>
        <TextField
          fullWidth size="small" sx={{ mb: 2 }} label="Custom Threat Type"
          value={customType}
          onChange={e => {
            setCustomType(e.target.value);
            set('threat_type', e.target.value);
          }}
          placeholder="e.g. LDAP Injection"
          autoFocus={isCustom}
        />
      </Collapse>

      {/* Pattern field with live validation */}
      <TextField
        fullWidth size="small" sx={{ mb: 0.5 }}
        label="Regex Pattern"
        value={value.pattern}
        onChange={e => set('pattern', e.target.value)}
        multiline rows={3}
        placeholder={'e.g. (?i)(union\\s+select|or\\s+1=1)'}
        error={!!regexError}
        helperText={
          regexError
            ? `⚠️ Invalid regex: ${regexError}`
            : value.pattern
              ? '✅ Valid regular expression'
              : 'Regular expression matched against URL, headers and body'
        }
        inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
        InputProps={{
          endAdornment: value.pattern && (
            <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 1 }}>
              {regexError
                ? <ErrorIcon color="error" fontSize="small" />
                : <CheckIcon color="success" fontSize="small" />}
            </InputAdornment>
          ),
        }}
      />

      {/* Live pattern tester */}
      <Button
        size="small" sx={{ mb: 2, mt: 0.5, fontSize: '0.75rem' }}
        onClick={() => setShowTest(p => !p)}
        disabled={!value.pattern || !!regexError}
      >
        {showTest ? 'Hide tester' : '🧪 Test pattern'}
      </Button>
      <Collapse in={showTest}>
        <Box sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <TextField
            fullWidth size="small" label="Test input string" sx={{ mb: 1 }}
            value={testInput}
            onChange={e => setTestInput(e.target.value)}
            placeholder="Paste a URL or payload to test against the pattern"
            inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.82rem' } }}
          />
          {testInput && testResult !== null && (
            <Chip
              size="small"
              label={testResult ? '🔴 MATCH — would be blocked' : '🟢 NO MATCH — would be allowed'}
              color={testResult ? 'error' : 'success'}
              sx={{ fontWeight: 700 }}
            />
          )}
        </Box>
      </Collapse>

      {/* Action */}
      <FormControl fullWidth size="small">
        <InputLabel>Action</InputLabel>
        <Select value={value.action} label="Action" onChange={e => set('action', e.target.value)}>
          <MenuItem value="BLOCK">🔴 BLOCK</MenuItem>
          <MenuItem value="LOG">🟡 LOG only</MenuItem>
          <MenuItem value="ALLOW">🟢 ALLOW</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}

/* ── Port Control Card ───────────────────────────────────────────────────── */
const PORT_META = {
  80:  { label: 'HTTP',  Icon: HttpIcon,  color: '#f59e0b', method: 'iptables' },
  443: { label: 'HTTPS', Icon: HttpsIcon, color: '#3b82f6', method: 'iptables' },
};

function PortCard({ port, toggling, onToggle }) {
  const theme   = useTheme();
  const isDark  = theme.palette.mode === 'dark';
  const meta    = PORT_META[port.port] || {};
  const blocked = port.blocked;
  const { Icon } = meta;

  return (
    <Paper elevation={0} sx={{
      p: 2.5,
      border: '2px solid',
      borderColor: blocked ? '#ef444460' : `${meta.color}50`,
      borderRadius: 2,
      background: blocked
        ? (isDark ? 'rgba(239,68,68,0.07)' : 'rgba(239,68,68,0.04)')
        : (isDark ? 'rgba(255,255,255,0.02)' : '#fafafa'),
      transition: 'all 0.25s',
      display: 'flex', alignItems: 'center', gap: 2,
    }}>
      <Box sx={{
        p: 1.2, borderRadius: 1.5,
        bgcolor: blocked ? '#ef444420' : `${meta.color}18`,
        display: 'flex', flexShrink: 0,
      }}>
        <Icon sx={{ color: blocked ? '#ef4444' : meta.color, fontSize: 26 }} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
            {meta.label}
            <Typography component="span" sx={{ ml: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
              :{port.port}
            </Typography>
          </Typography>
          <Chip
            size="small"
            icon={blocked ? <LockIcon sx={{ fontSize:'12px !important' }} /> : <LockOpenIcon sx={{ fontSize:'12px !important' }} />}
            label={blocked ? 'BLOCKED' : 'OPEN'}
            color={blocked ? 'error' : 'success'}
            sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }}
          />
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {port.port === 443
            ? (blocked ? 'All traffic blocked. Admin dashboard still reachable.' : 'Encrypted traffic allowed.')
            : (blocked ? 'All HTTP traffic dropped via iptables.' : 'Plain-text traffic allowed.')}
        </Typography>
        {port.port === 443 && blocked && (
          <Typography variant="caption" sx={{ color: '#3b82f6', display: 'block', mt: 0.3 }}>
            ℹ️ Admin paths (/login /api/) remain accessible.
          </Typography>
        )}
      </Box>

      <Button
        size="small"
        variant={blocked ? 'outlined' : 'contained'}
        color={blocked ? 'success' : 'error'}
        startIcon={toggling ? <CircularProgress size={13} color="inherit" /> : (blocked ? <LockOpenIcon /> : <LockIcon />)}
        disabled={toggling}
        onClick={() => onToggle(port.port, !blocked)}
        sx={{ fontWeight: 700, flexShrink: 0, fontSize: '0.78rem' }}
      >
        {toggling ? '…' : (blocked ? 'Unblock' : 'Block')}
      </Button>
    </Paper>
  );
}

export default function Rules() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [rules,       setRules]    = useState([]);
  const [search,      setSearch]   = useState('');
  const [addOpen,     setAddOpen]  = useState(false);
  const [editOpen,    setEditOpen] = useState(false);
  const [editingRule, setEditing]  = useState(null);
  const [alert,       setAlert]    = useState(null);
  const [page,        setPage]     = useState(0);
  const [rowsPerPage, setRows]     = useState(20);
  const [newRule,     setNewRule]  = useState(BLANK_RULE);

  // Port controls state
  const [ports,       setPorts]    = useState([]);
  const [toggling,    setToggling] = useState(null);
  const [confirmPort, setConfirm]  = useState(null);

  const fetchRules = async () => {
    try { setRules(await getRules()); } catch {}
  };

  const fetchPorts = async () => {
    try { setPorts(await getPortStatus()); } catch {}
  };

  useEffect(() => { fetchRules(); fetchPorts(); }, []);

  const handlePortToggle = (port, shouldBlock) => setConfirm({ port, shouldBlock });

  const handlePortConfirm = async () => {
    const { port, shouldBlock } = confirmPort;
    setConfirm(null);
    setToggling(port);
    try {
      shouldBlock ? await blockPort(port) : await unblockPort(port);
      showAlert('success', `Port ${port} ${shouldBlock ? 'BLOCKED' : 'UNBLOCKED'} successfully`);
      await fetchPorts();
    } catch {
      showAlert('error', `Failed to ${shouldBlock ? 'block' : 'unblock'} port ${port}`);
    } finally {
      setToggling(null);
    }
  };

  const showAlert = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleAdd = async () => {
    if (!newRule.rule_name || !newRule.pattern || validateRegex(newRule.pattern)) return;
    try {
      await addRule(newRule);
      setAddOpen(false);
      setNewRule(BLANK_RULE);
      await fetchRules();
      showAlert('success', 'Rule added successfully');
    } catch { showAlert('error', 'Failed to add rule'); }
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
    if (validateRegex(editingRule.pattern)) return;
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
      (r.rule_name   || '').toLowerCase().includes(q) ||
      (r.threat_type || '').toLowerCase().includes(q) ||
      (r.pattern     || '').toLowerCase().includes(q)
    );
  }, [rules, search]);

  const paginated    = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const enabledCount = rules.filter(r => r.enabled === 1).length;

  return (
    <Box>
      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.msg}
        </Alert>
      )}

      {/* ── Network Port Controls ── */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <ShieldIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Network Port Controls</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
            — Block HTTP/HTTPS at firewall level (affects all traffic)
          </Typography>
        </Box>
        <Grid container spacing={2}>
          {ports.length === 0
            ? [80, 443].map(p => (
                <Grid item xs={12} md={6} key={p}>
                  <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2, opacity: 0.5 }}>
                    <CircularProgress size={16} sx={{ mr: 1 }} /><Typography variant="caption">Loading port {p}…</Typography>
                  </Box>
                </Grid>
              ))
            : ports.map(port => (
                <Grid item xs={12} md={6} key={port.port}>
                  <PortCard port={port} toggling={toggling === port.port} onToggle={handlePortToggle} />
                </Grid>
              ))
          }
        </Grid>
      </Paper>

      <Divider sx={{ mb: 3 }} />

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Chip icon={<ShieldIcon />} label={`${rules.length} Total Rules`} sx={{ fontWeight: 700 }} />
        <Chip label={`${enabledCount} Active`}                color="success" variant="outlined" sx={{ fontWeight: 700 }} />
        <Chip label={`${rules.length - enabledCount} Disabled`} color="default" variant="outlined" sx={{ fontWeight: 700 }} />
      </Box>

      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search rules…" value={search} size="small"
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          sx={{ flex: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>
          }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          Add Rule
        </Button>
      </Box>

      {/* Table */}
      <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Rule Name', 'Threat Type', 'Pattern', 'Action', 'Active', 'Actions'].map(h => (
                  <TableCell key={h} sx={{
                    fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase',
                    letterSpacing: '0.06em', bgcolor: isDark ? '#1e293b' : '#f8fafc',
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
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{rule.rule_name}</TableCell>
                  <TableCell><ThreatChip type={rule.threat_type} /></TableCell>
                  <TableCell sx={{ maxWidth: 240 }}>
                    <Tooltip title={rule.pattern}>
                      <Typography sx={{
                        fontSize: '0.75rem', fontFamily: 'monospace',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220,
                      }}>
                        {rule.pattern}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip label={rule.action} size="small"
                      color={rule.action === 'BLOCK' ? 'error' : rule.action === 'LOG' ? 'warning' : 'success'}
                      sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                  </TableCell>
                  <TableCell>
                    <Switch checked={rule.enabled === 1} onChange={() => handleToggle(rule)} size="small" />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton size="small" color="primary"
                        onClick={() => { setEditing({ ...rule }); setEditOpen(true); }}>
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
                  <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>
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
      <Dialog open={addOpen} onClose={() => { setAddOpen(false); setNewRule(BLANK_RULE); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add WAF Rule</DialogTitle>
        <DialogContent>
          <RuleForm value={newRule} onChange={setNewRule} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setAddOpen(false); setNewRule(BLANK_RULE); }}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}
            disabled={!newRule.rule_name || !newRule.pattern || !!validateRegex(newRule.pattern)}>
            Add Rule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => { setEditOpen(false); setEditing(null); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Rule</DialogTitle>
        <DialogContent>
          {editingRule && <RuleForm value={editingRule} onChange={setEditing} />}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setEditOpen(false); setEditing(null); }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit}
            disabled={!editingRule?.rule_name || !editingRule?.pattern || !!validateRegex(editingRule?.pattern)}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Port confirm dialog */}
      <Dialog open={!!confirmPort} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" fontSize="small" />
          {confirmPort?.shouldBlock ? 'Block' : 'Unblock'} Port {confirmPort?.port} ({PORT_META[confirmPort?.port]?.label})?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {confirmPort?.shouldBlock
              ? confirmPort?.port === 443
                ? 'ALL HTTPS on this machine will be blocked via iptables — affects every app, not just eLoan. Dashboard becomes unreachable. Use SSH tunnel to restore: ssh -L 9443:127.0.0.1:443 ubuntu@132.145.20.178'
                : 'All HTTP traffic on port 80 will be dropped via iptables.'
              : `Port ${confirmPort?.port} will be reopened and traffic allowed again.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button variant="contained" color={confirmPort?.shouldBlock ? 'error' : 'success'} onClick={handlePortConfirm}>
            {confirmPort?.shouldBlock ? 'Yes, Block' : 'Yes, Unblock'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
