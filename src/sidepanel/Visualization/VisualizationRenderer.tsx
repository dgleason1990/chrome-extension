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
  useMediaQuery
} from '@mui/material';
import { Chart, registerables } from 'chart.js';
import { createTheme } from '@mui/material/styles';

// Register all Chart.js components
Chart.register(...registerables);

// Create a default theme to use in visualizations
const theme = createTheme({
  palette: {
    primary: {
      main: '#9b87f5',
    },
    secondary: {
      main: '#7E69AB',
    },
  },
});

interface VisualizationRendererProps {
  code: string;
  data: Record<string, unknown>[];
}

const VisualizationRenderer: React.FC<VisualizationRendererProps> = ({ code, data }) => {
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

      // Create available dependencies object that will be in scope for the evaluated code
      const dependencies = {
        React,
        useState,
        useEffect,
        useRef,
        useTheme,
        useMediaQuery,
        Chart,
        theme,
        chartRef,
        data,
        // MUI components
        Card, CardContent, Typography, Box, Paper,
        Grid, Button, TextField, List, ListItem, Divider
      };

      // Create a function that will execute the code to set up the chart
      const factory = new Function(
        ...Object.keys(dependencies),
        `
          const ctx = chartRef.current.getContext('2d');
          ${code}
          return chart;
        `
      );

      // Execute the factory with dependencies
      const chart = factory(...Object.values(dependencies));
      chartInstance.current = chart;
      setError(null);
    } catch (err) {
      console.error('Error evaluating chart code:', err);
      setError(err.message || 'Failed to create chart visualization');
    }
  }, [code, data, theme]);

  if (error) {
    return (
      <div className="bg-red-100 p-4 rounded-md text-red-800">
        <h3 className="font-medium">Error rendering visualization</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="visualization-container" style={{ width: '100%', height: '100%' }}>
      <Card sx={{ width: '100%', minHeight: '500px' }}>
        <CardContent sx={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <canvas ref={chartRef} style={{ width: '100%', height: '100%', maxHeight: '600px' }} />
        </CardContent>
      </Card>
    </div>
  );
};

export default VisualizationRenderer;
