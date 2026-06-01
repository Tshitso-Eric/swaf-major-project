import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
} from '@mui/material';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getLiveTraffic } from './api';

export default function LiveTraffic() {

  const [trafficData, setTrafficData] = useState([]);

  // FETCH LIVE DATA (EVERY 3 SECONDS)
  useEffect(() => {

    const fetchTraffic = async () => {
      try {
        const data = await getLiveTraffic();
        setTrafficData(data.timeseries || []);
        } catch (err) {
        console.error("Traffic fetch error:", err);
      }
    };

    fetchTraffic();
    const interval = setInterval(fetchTraffic, 3000);

    return () => clearInterval(interval);

  }, []);

  return (
    <Box sx={{ p: 4 }}>

      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Live Traffic Monitor
      </Typography>

      {/* LIVE TRAFFIC GRAPH */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>

        <Typography variant="h6" sx={{ mb: 2 }}>
          Requests Over Time (Live)
        </Typography>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={trafficData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />

            <Line
              type="monotone"
              dataKey="requests"
              stroke="#1976d2"
              strokeWidth={3}
              name="Requests"
            />

            <Line
              type="monotone"
              dataKey="blocked"
              stroke="#d32f2f"
              strokeWidth={3}
              name="Blocked"
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}