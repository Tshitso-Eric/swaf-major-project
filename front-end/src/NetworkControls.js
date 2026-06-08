import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Button, CircularProgress,
  Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  useTheme,
} from '@mui/material';
import {
  Lock as LockIcon, LockOpen as LockOpenIcon,
  Http as HttpIcon, Https as HttpsIcon, Warning as WarningIcon,
} from '@mui/icons-material';
import { getPortStatus, blockPort, unblockPort } from './api';

const PORT_INFO = {
  80:  { label: 'HTTP',  icon: HttpIcon,  color: '#f59e0b', desc: 'Plain-text web traffic (port 80). Blocked via iptables DROP — stops all unencrypted HTTP access on this machine.' },
  443: { label: 'HTTPS', icon: HttpsIcon, color: '#3b82f6', desc: 'Encrypted web traffic (port 443). Blocked via iptables DROP — stops ALL HTTPS on this machine including all apps, not just eLoan.' },
};

function PortCard({ port, onToggle, loading }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const info   = PORT_INFO[port.port] || {};
  const Icon   = port.blocked ? LockIcon : LockOpenIcon;
  const ProtoIcon = info.icon || HttpIcon;
  const blocked = port.blocked;

  return (
    <Paper elevation={0} sx={{
      p: 3, border: `2px solid`,
      borderColor: blocked ? '#ef444480' : `${info.color}60`,
      borderRadius: 3,
      background: blocked
        ? (isDark ? 'rgba(239,68,68,0.07)' : 'rgba(239,68,68,0.04)')
        : (isDark ? 'rgba(255,255,255,0.03)' : '#fff'),
      transition: 'all 0.3s',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box sx={{
          p: 1.5, borderRadius: 2,
          bgcolor: blocked ? '#ef444420' : `${info.color}20`,
          display: 'flex',
        }}>
          <ProtoIcon sx={{ color: blocked ? '#ef4444' : info.color, fontSize: 28 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {info.label}
            <Typography component="span" sx={{ ml: 1, fontSize: '0.8rem', color: 'text.secondary', fontWeight: 400 }}>
              :{port.port}
            </Typography>
          </Typography>
          <Chip
            size="small"
            icon={<Icon sx={{ fontSize: '14px !important' }} />}
            label={blocked ? 'BLOCKED' : 'OPEN'}
            color={blocked ? 'error' : 'success'}
            sx={{ fontWeight: 700, fontSize: '0.7rem', mt: 0.5 }}
          />
        </Box>
      </Box>

      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5, lineHeight: 1.6 }}>
        {info.desc}
      </Typography>

      {port.port === 443 && blocked && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2, py: 0.5, fontSize: '0.8rem' }}>
          ALL HTTPS blocked via iptables. To manage SWAF, use an SSH tunnel:<br/>
          <code style={{fontSize:'0.75rem'}}>ssh -L 9443:127.0.0.1:443 ubuntu@132.145.20.178</code><br/>
          Then visit: <code style={{fontSize:'0.75rem'}}>https://localhost:9443</code>
        </Alert>
      )}

      <Button
        fullWidth
        variant={blocked ? 'outlined' : 'contained'}
        color={blocked ? 'success' : 'error'}
        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : (blocked ? <LockOpenIcon /> : <LockIcon />)}
        disabled={loading}
        onClick={() => onToggle(port.port, !blocked)}
        sx={{ fontWeight: 700 }}
      >
        {loading ? 'Applying…' : (blocked ? `Unblock Port ${port.port}` : `Block Port ${port.port}`)}
      </Button>
    </Paper>
  );
}

export default function NetworkControls() {
  const [ports,       setPorts]     = useState([]);
  const [loading,     setLoading]   = useState(true);
  const [toggling,    setToggling]  = useState(null);   // port number being toggled
  const [alert,       setAlert]     = useState(null);
  const [confirmPort, setConfirm]   = useState(null);   // port awaiting confirmation

  const fetch = async () => {
    try {
      setLoading(true);
      setPorts(await getPortStatus());
    } catch {
      setAlert({ type: 'error', msg: 'Failed to load port status' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const showAlert = (type, msg) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 4000);
  };

  // Ask for confirmation before toggling (especially for port 443)
  const handleToggleRequest = (port, shouldBlock) => {
    setConfirm({ port, shouldBlock });
  };

  const handleConfirm = async () => {
    const { port, shouldBlock } = confirmPort;
    setConfirm(null);
    setToggling(port);
    try {
      if (shouldBlock) {
        await blockPort(port);
        showAlert('success', `Port ${port} (${PORT_INFO[port]?.label}) is now BLOCKED`);
      } else {
        await unblockPort(port);
        showAlert('success', `Port ${port} (${PORT_INFO[port]?.label}) is now OPEN`);
      }
      await fetch();
    } catch (e) {
      showAlert('error', `Failed to ${shouldBlock ? 'block' : 'unblock'} port ${port}: ${e?.response?.data?.detail || e.message}`);
    } finally {
      setToggling(null);
    }
  };

  const pendingInfo = confirmPort ? PORT_INFO[confirmPort.port] : null;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          Network Port Controls
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Block or unblock HTTP/HTTPS ports at the firewall level (iptables) — affects all traffic, not just eLoan.
        </Typography>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 3 }} onClose={() => setAlert(null)}>
          {alert.msg}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {ports.map(port => (
            <Grid item xs={12} md={6} key={port.port}>
              <PortCard
                port={port}
                loading={toggling === port.port}
                onToggle={handleToggleRequest}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* How it works */}
      <Paper elevation={0} sx={{ mt: 4, p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>How it works</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
          • Blocking a port inserts an <code>iptables DROP</code> rule at the top of the INPUT chain on the Oracle Cloud server.<br />
          • The rule persists across SWAF restarts (stored in the database and re-applied on startup).<br />
          • Blocking HTTP (80) stops plain-text access — HTTPS still works.<br />
          • Blocking HTTPS (443) uses <strong>iptables DROP</strong> — stops ALL HTTPS on the entire machine (all apps, not just eLoan).<br />
          • When blocked, this dashboard becomes unreachable. Restore via SSH tunnel:<br />
          &nbsp;&nbsp;<code>ssh -L 9443:127.0.0.1:443 ubuntu@132.145.20.178</code> → visit <code>https://localhost:9443</code><br />
          • Or restore directly on the server: <code>sudo iptables -D INPUT -p tcp --dport 443 -j DROP</code>
        </Typography>
      </Paper>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmPort} onClose={() => setConfirm(null)}>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          {confirmPort?.shouldBlock ? 'Block' : 'Unblock'} Port {confirmPort?.port} ({pendingInfo?.label})?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmPort?.shouldBlock
              ? <>You are about to <strong>DROP all incoming traffic</strong> on port {confirmPort?.port} ({pendingInfo?.label}) using iptables. {confirmPort?.port === 443 ? <strong> This will take down the entire site including this dashboard.</strong> : ' HTTP traffic will be rejected.'}</>
              : <>This will <strong>re-open port {confirmPort?.port}</strong> ({pendingInfo?.label}) and allow traffic through again.</>
            }
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={confirmPort?.shouldBlock ? 'error' : 'success'}
            onClick={handleConfirm}
          >
            {confirmPort?.shouldBlock ? 'Yes, Block It' : 'Yes, Unblock It'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
