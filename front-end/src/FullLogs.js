import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Typography, Tooltip, Box
} from '@mui/material';

export default function FullLogs({ logs = [], getThreatChip }) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        All Security Logs
      </Typography>
      
      <TableContainer sx={{ maxHeight: '70vh' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Timestamp</TableCell>
              <TableCell>Source IP</TableCell>
              <TableCell>Destination IP</TableCell>
              <TableCell>Port Number</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Path</TableCell>
              <TableCell>Threat Type</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell>{log.id}</TableCell>
                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                {/* Source IP - LMS Backend */}
                <TableCell>
                  <Tooltip title="LMS Backend Server - Processes the request and queries the database">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <span>{log.source_ip || 'localhost'}</span>
                    </Box>
                  </Tooltip>
                </TableCell>
                {/* Destination IP */}
                <TableCell>
                  <Tooltip title="MySQL Database Server - Stores data">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <span>{log.dest_ip || 'localhost'}</span>
                    </Box>
                  </Tooltip>
                </TableCell>
                {/* Port Number - LMS Port */}
                <TableCell>
                  <Tooltip title="LMS Backend Server Port">
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#1976d2' }}>
                      {log.port_number || '8080'}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell>{log.request_method}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <Tooltip title={log.request_path || '-'}>
                    <span>{log.request_path || '-'}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {getThreatChip ? getThreatChip(log.threat_type || 'None') : (log.threat_type || 'None')}
                </TableCell>
                <TableCell>
                  <span style={{ 
                    color: log.action === 'BLOCKED' ? '#d32f2f' : '#2e7d32',
                    fontWeight: 500
                  }}>
                    {log.action}
                  </span>
                </TableCell>
                <TableCell sx={{ maxWidth: 200 }}>
                  <Tooltip title={log.details || '-'}>
                    <span>{log.details?.substring(0, 50) || '-'}</span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                  No logs available yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}