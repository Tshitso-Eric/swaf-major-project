import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { getRules, addRule as apiAddRule, deleteRule as apiDeleteRule, toggleRule as apiToggleRule, updateRule as apiUpdateRule } from './api';

export default function Rules() {

  const [rules, setRules] = useState([]);
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [newRule, setNewRule] = useState({
    rule_name: "",
    pattern: "",
    threat_type: "",
    action: "BLOCK",
    direction: "INBOUND"
  });

  const [editingRule, setEditingRule] = useState(null);

  // FETCH RULES

  const fetchRules = async () => {
    try {
      const data = await getRules();
      setRules(data);
    } catch (err) {
      console.error("Failed to fetch rules:", err);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  // ADD RULE

  const handleAddRule = async () => {
    try {
      await apiAddRule(newRule);
      setOpen(false);

      setNewRule({
        rule_name: "",
        pattern: "",
        threat_type: "",
        action: "BLOCK",
        direction: "INBOUND"
      });

      fetchRules();
    } catch (err) {
      console.error("Failed to add rule:", err);
    }
  };

  // DELETE RULE

  const handleDeleteRule = async (id) => {
    try {
      await apiDeleteRule(id);
      fetchRules();
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
  };

  // TOGGLE RULE

  const handleToggleRule = async (rule) => {
    try {
      await apiToggleRule(rule.id, rule.enabled ? 0 : 1);
      fetchRules();
    } catch (err) {
      console.error("Failed to toggle rule:", err);
    }
  };

  // EDIT RULE

  const handleOpenEdit = (rule) => {
    setEditingRule({ ...rule });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      await apiUpdateRule(editingRule.id, editingRule);
      setEditOpen(false);
      setEditingRule(null);
      fetchRules();
    } catch (err) {
      console.error("Failed to update rule:", err);
    }
  };

  // FILTER RULES
  const filteredRules =
    tab === 0
      ? rules.filter(r => (r.direction || "INBOUND") === "INBOUND")
      : rules.filter(r => r.direction === "OUTBOUND");

  return (

    <Paper sx={{ p: 4 }}>

      <Typography variant="h5" fontWeight="bold">
        WAF Rules Management
      </Typography>

      <Typography sx={{ mt: 1 }} color="text.secondary">
        Configure inbound and outbound firewall rules.
      </Typography>

      {/* TABS */}

      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        sx={{ mt: 3 }}
      >

        <Tab label="Inbound Rules" />
        <Tab label="Outbound Rules" />
      </Tabs>

      {/* ADD RULE BUTTON */}

      <Box sx={{ mt: 2, mb: 2 }}>
        <Button
          variant="contained"
          onClick={() => setOpen(true)}
        >
          Add Rule
        </Button>
      </Box>

      {/* RULES TABLE */}

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Rule Name</TableCell>
            <TableCell>Threat</TableCell>
            <TableCell>Pattern</TableCell>
            <TableCell>Action</TableCell>
            <TableCell>Enabled</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {filteredRules.map(rule => (

            <TableRow key={rule.id}>

              <TableCell>{rule.rule_name}</TableCell>
              <TableCell>{rule.threat_type}</TableCell>
              <TableCell sx={{ maxWidth: 300, wordBreak: "break-all" }}>
                {rule.pattern}
              </TableCell>
              <TableCell>{rule.action}</TableCell>
              <TableCell>
                <Switch
                  checked={rule.enabled === 1}
                  onChange={() => handleToggleRule(rule)}
                />
              </TableCell>
              <TableCell align="center">
                <IconButton
                  color="primary"
                  onClick={() => handleOpenEdit(rule)}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  color="error"
                  onClick={() => handleDeleteRule(rule.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}

        </TableBody>
      </Table>

      {/* ADD RULE DIALOG */}

      <Dialog open={open} onClose={() => setOpen(false)}>

        <DialogTitle>Add WAF Rule</DialogTitle>
        <DialogContent>
          <TextField
            label="Rule Name"
            fullWidth
            sx={{ mt: 2 }}
            value={newRule.rule_name}
            onChange={e =>
              setNewRule({ ...newRule, rule_name: e.target.value })
            }
          />

          <TextField
            label="Threat Type"
            fullWidth
            sx={{ mt: 2 }}
            value={newRule.threat_type}
            onChange={e =>
              setNewRule({ ...newRule, threat_type: e.target.value })
            }
          />

          <TextField
            label="Pattern (Regex)"
            fullWidth
            sx={{ mt: 2 }}
            value={newRule.pattern}
            onChange={e =>
              setNewRule({ ...newRule, pattern: e.target.value })
            }
          />

          <TextField
            label="Direction (INBOUND / OUTBOUND)"
            fullWidth
            sx={{ mt: 2 }}
            value={newRule.direction}
            onChange={e =>
              setNewRule({ ...newRule, direction: e.target.value })
            }
          />

        </DialogContent>
        <DialogActions>

          <Button onClick={() => setOpen(false)}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleAddRule}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* EDIT RULE DIALOG */}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>

        <DialogTitle>Edit WAF Rule</DialogTitle>
        <DialogContent>
          {editingRule && (
            <>
              <TextField
                label="Rule Name"
                fullWidth
                sx={{ mt: 2 }}
                value={editingRule.rule_name}
                onChange={e =>
                  setEditingRule({ ...editingRule, rule_name: e.target.value })
                }
              />

              <TextField
                label="Threat Type"
                fullWidth
                sx={{ mt: 2 }}
                value={editingRule.threat_type}
                onChange={e =>
                  setEditingRule({ ...editingRule, threat_type: e.target.value })
                }
              />

              <TextField
                label="Pattern (Regex)"
                fullWidth
                sx={{ mt: 2 }}
                value={editingRule.pattern}
                onChange={e =>
                  setEditingRule({ ...editingRule, pattern: e.target.value })
                }
              />

              <TextField
                label="Action"
                fullWidth
                sx={{ mt: 2 }}
                value={editingRule.action}
                onChange={e =>
                  setEditingRule({ ...editingRule, action: e.target.value })
                }
              />
            </>
          )}

        </DialogContent>
        <DialogActions>

          <Button onClick={() => setEditOpen(false)}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSaveEdit}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}