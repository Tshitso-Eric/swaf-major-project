import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  useTheme,
  LinearProgress,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Traffic as TrafficIcon,
  List as LogsIcon,
  Gavel as RulesIcon,
  Security as ThreatIcon,
  Settings as SettingsIcon,
  Memory as ModelIcon,
  TrendingUp as TrendingIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

export default function DashboardHome({ stats, logs, getThreatChip, onNavigate, modelStats }) {
  const theme = useTheme();

  const navigationCards = [
    {
      id: 'logs',
      title: 'Security Logs',
      value: stats.totalRequests,
      valueLabel: 'Total Logs',
      icon: <LogsIcon sx={{ fontSize: 40, color: '#388e3c' }} />,
      color: '#388e3c',
      bgColor: '#e8f5e9'
    },
    {
      id: 'adminLogs',
      title: 'Admin Logs',
      icon: <LogsIcon sx={{ fontSize: 40, color: '#7b1fa2' }} />,
      color: '#7b1fa2',
      bgColor: '#f3e5f5',
      description: 'Admin activity tracking',
      value: 'View',
      valueLabel: ''
    },
    {
      id: 'rules',
      title: 'Firewall Rules',
      value: 'Configure',
      icon: <RulesIcon sx={{ fontSize: 40, color: '#f57c00' }} />,
      color: '#f57c00',
      bgColor: '#fff3e0'
    },
    {
      id: 'threats',
      title: 'Threat Intelligence',
      value: stats.topThreats.length,
      valueLabel: 'Total Threat types',
      icon: <ThreatIcon sx={{ fontSize: 40, color: '#d32f2f' }} />,
      color: '#d32f2f',
      bgColor: '#ffebee'
    },
    {
      id: 'model',
      title: 'Models',
      value: modelStats?.accuracy ? `${(modelStats.accuracy * 100).toFixed(1)}%` : 'Active',
      icon: <ModelIcon sx={{ fontSize: 40, color: '#9c27b0' }} />,
      color: '#9c27b0',
      bgColor: '#f3e5f5'
    },
    {
      id: 'settings',
      title: 'Settings',
      value: 'Configure',
      icon: <SettingsIcon sx={{ fontSize: 40, color: '#607d8b' }} />,
      color: '#607d8b',
      bgColor: '#eceff1'
    }
  ];

  const handleCardClick = (sectionId) => {
    if (onNavigate) {
      onNavigate(sectionId);
    }
  };

  // Render the ML Model Card with additional stats
  const renderModelCard = (card) => (
    <Card 
      elevation={2}
      sx={{
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: card.bgColor,
        height: '100%',
        width: '100%',
        borderTop: `4px solid ${card.color}`,
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: 8,
        }
      }}
      onClick={() => handleCardClick(card.id)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ mr: 2 }}>
            {card.icon}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: card.color }}>
              {card.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {card.description}
            </Typography>
          </Box>
          <Tooltip title="ML Model Status">
            <Chip 
              size="small" 
              label={card.modelData?.modelStatus === 'active' ? 'Active' : 'Training'}
              color={card.modelData?.modelStatus === 'active' ? 'success' : 'warning'}
              sx={{ height: 24 }}
            />
          </Tooltip>
        </Box>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {card.valueLabel}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: card.color, mb: 1 }}>
            {card.value}
          </Typography>
          
          {/* Additional ML Model Stats */}
          {card.modelData && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Predictions
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {card.modelData?.predictions?.toLocaleString() || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Threats Detected
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#d32f2f' }}>
                    {card.modelData?.threatsDetected?.toLocaleString() || 0}
                  </Typography>
                </Grid>
              </Grid>
              
              {card.modelData?.accuracy && (
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Model Accuracy
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: card.color }}>
                      {(card.modelData.accuracy * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={card.modelData.accuracy * 100} 
                    sx={{ 
                      height: 6, 
                      borderRadius: 3,
                      backgroundColor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: card.color,
                        borderRadius: 3,
                      }
                    }}
                  />
                </Box>
              )}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  // Render regular cards
  const renderRegularCard = (card) => (
    <Card 
      elevation={2}
      sx={{
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: card.bgColor,
        height: '100%',
        width: '100%',
        borderTop: `4px solid ${card.color}`,
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: 8,
        }
      }}
      onClick={() => handleCardClick(card.id)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ mr: 2 }}>
            {card.icon}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: card.color }}>
              {card.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {card.description}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ mt: 1 }}>
          {card.valueLabel && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {card.valueLabel}
            </Typography>
          )}
          <Typography variant="h4" sx={{ fontWeight: 700, color: card.color }}>
            {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Grid container spacing={3}>
        {navigationCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={card.id}>
            {card.id === 'model' && card.modelData 
              ? renderModelCard(card) 
              : renderRegularCard(card)
            }
          </Grid>
        ))}
      </Grid>
    </>
  );
}