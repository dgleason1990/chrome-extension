import React, { useEffect, useState, useRef } from 'react';
import { useTheme, Theme } from '@mui/material/styles';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box,
  Paper,
  Grid,
  Button,
  TextField,
  List,
  ListItem,
  Divider,
  useMediaQuery,
  Alert
} from '@mui/material';
import { Chart, registerables, ChartType, ChartConfiguration } from 'chart.js';

// Register all Chart.js components
Chart.register(...registerables);

interface VisualizationRendererProps {
  code: string;
  data: Record<string, unknown>[];
}

// Define supported chart configurations
interface ChartConfig {
  type: ChartType;
  options: any;
  data: any;
}

export const VisualizationRenderer: React.FC<VisualizationRendererProps> = ({ code, data }) => {
  const theme = useTheme();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Clean up any existing chart instance
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }

      if (!chartRef.current) return;
      
      // Parse the code to extract chart configuration
      // This assumes the code is in a specific format like JSON or has markers
      let chartConfig: ChartConfig;
      
      try {
        // Attempt to parse the code as a JSON configuration object
        chartConfig = JSON.parse(code);
      } catch (parseError) {
        // If not valid JSON, fallback to a basic chart
        console.warn('Could not parse chart configuration, using default');
        chartConfig = {
          type: 'bar',
          data: {
            labels: data.map((d, i) => d.label || `Item ${i}`),
            datasets: [{
              label: 'Data',
              data: data.map(d => d.value || 0),
              backgroundColor: theme.palette.primary.main
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false
          }
        };
      }

      // Create chart with the configuration
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstance.current = new Chart(ctx, {
          type: chartConfig.type,
          data: chartConfig.data,
          options: {
            ...chartConfig.options,
            responsive: true,
            maintainAspectRatio: false
          }
        });
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Error creating chart visualization:', err);
      setError(err.message || 'Failed to create chart visualization');
    }
  }, [code, data, theme]);

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="subtitle2">Error rendering visualization</Typography>
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }

  return (
    <Box width="100%" height="100%">
      <Card sx={{ width: '100%', height: '100%', minHeight: 400 }}>
        <CardContent sx={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
          <canvas ref={chartRef} style={{ width: '100%', height: '100%', maxHeight: 600 }} />
        </CardContent>
      </Card>
    </Box>
  );
}; 