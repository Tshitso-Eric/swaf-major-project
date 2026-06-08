import React, { useState, useMemo, createContext } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './Login';
import Dashboard from './Dashboard';

export const ThemeContext = createContext({ toggleColorMode: () => {}, mode: 'light' });

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'dark');

  const colorMode = useMemo(() => ({
    toggleColorMode: () => {
      setMode(prev => {
        const next = prev === 'light' ? 'dark' : 'light';
        localStorage.setItem('themeMode', next);
        return next;
      });
    },
    mode,
  }), [mode]);

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: '#3b82f6', light: '#60a5fa', dark: '#1d4ed8' },
      secondary: { main: '#06b6d4', light: '#22d3ee', dark: '#0891b2' },
      error: { main: '#ef4444' },
      warning: { main: '#f59e0b' },
      success: { main: '#10b981' },
      background: {
        default: mode === 'light' ? '#f1f5f9' : '#0f172a',
        paper:   mode === 'light' ? '#ffffff'  : '#1e293b',
      },
    },
    typography: {
      fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCard:   { styleOverrides: { root: { borderRadius: 12, backgroundImage: 'none' } } },
      MuiPaper:  { styleOverrides: { root: { borderRadius: 12, backgroundImage: 'none' } } },
      MuiButton: { styleOverrides: { root: { borderRadius: 8, textTransform: 'none', fontWeight: 600 } } },
      MuiChip:   { styleOverrides: { root: { borderRadius: 6, fontWeight: 600 } } },
    },
  }), [mode]);

  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  };

  return (
    <ThemeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router basename="/swaf-admin">
          <Routes>
            <Route
              path="/"
              element={isLoggedIn
                ? <Dashboard onLogout={handleLogout} />
                : <Login onLogin={handleLogin} />}
            />
          </Routes>
        </Router>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export default App;
