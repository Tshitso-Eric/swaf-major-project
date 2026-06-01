import React, { useState, useMemo, createContext } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './Login';
import Dashboard from './Dashboard';
import AdminLogs from './AdminLogs';
import Settings from './Settings';

// Create context for theme
export const ThemeContext = createContext({
  toggleColorMode: () => {},
  mode: 'light'
});

//const App = () => {  

function App() {

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mode, setMode] = useState(() => {
    // Load saved theme preference from localStorage
    const savedMode = localStorage.getItem('themeMode');
    return savedMode || 'light';
  });

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('themeMode', newMode);
          return newMode;
        });
      },
      mode,
    }),
    [mode],
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/admin-logs" element={<AdminLogs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/" element={isLoggedIn ? <Dashboard /> : <Login onLogin={() => setIsLoggedIn(true)} />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export default App;