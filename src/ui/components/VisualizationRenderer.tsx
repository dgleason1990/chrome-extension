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
  IconButton,
  Tooltip
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

// Import Chart.js - this automatically registers everything we need
import Chart from 'chart.js/auto';
import { ChartConfiguration } from 'chart.js';
import { createTheme } from '@mui/material/styles';

// Import date adapter directly - if there's an error, it will be caught at runtime
import 'chartjs-adapter-date-fns';

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

// Type definitions for Chart.js scales and adapters
interface DateAdapter {
  locale?: unknown;
}

interface ScaleAdapter {
  date?: DateAdapter;
}

interface ChartScale {
  type?: string;
  adapters?: ScaleAdapter;
  [key: string]: unknown;
}

interface ChartScales {
  [key: string]: ChartScale | ChartScale[];
}

interface VisualizationRendererProps {
  code: ChartConfiguration;
  data: Record<string, unknown>[];
}

const VisualizationRenderer: React.FC<VisualizationRendererProps> = ({ code, data }) => {
  const theme = useTheme();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Generate a unique ID that changes when code/data changes
  const [canvasId] = useState(() => `chart-canvas-${Math.random().toString(36).substring(2, 9)}`);
  // Key for canvas to force re-creation
  const [canvasKey, setCanvasKey] = useState<number>(0);

  // Force canvas recreation when data or code changes
  useEffect(() => {
    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }
    
    // Change the canvas key to force a complete DOM replacement
    setCanvasKey(prev => prev + 1);
  }, [code, data]);

  // Ensure all scales have proper adapters if they're time/date scales
  const ensureAdapters = (config: ChartConfiguration) => {
    const defaultAdapterOptions: DateAdapter = {};
    
    // Process all axes that might exist in the config
    const axes = ['x', 'y', 'r', 'z'];
    const scales = config.options?.scales || {} as ChartScales;
    
    // Helper function to process a single scale
    const processScale = (scale: unknown, scaleKey: string) => {
      // Handle array of scales
      if (Array.isArray(scale)) {
        scale.forEach((s, i) => processScale(s, `${scaleKey}${i}`));
        return;
      }
      
      // Skip if not an object
      if (!scale || typeof scale !== 'object') return;
      
      // Now we know it's an object - cast to our ChartScale type
      const scaleObj = scale as ChartScale;
      
      // For explicit time scales, ensure adapter is set
      if (scaleObj.type === 'time') {
        scaleObj.adapters = scaleObj.adapters || {};
        scaleObj.adapters.date = scaleObj.adapters.date || defaultAdapterOptions;
        return;
      }
      
      // For scales that might be auto-detected as time scales if they contain date strings
      // We'll add the adapter config preemptively
      const hasTimeData = true; // Always add adapter config to be safe
      if (hasTimeData) {
        scaleObj.adapters = scaleObj.adapters || {};
        scaleObj.adapters.date = scaleObj.adapters.date || defaultAdapterOptions;
      }
    };
    
    // Process all axes
    axes.forEach(axis => {
      const axisScales = scales[axis];
      if (axisScales) {
        processScale(axisScales, axis);
      }
    });
    
    // Process any named scales
    Object.keys(scales).forEach(key => {
      if (!axes.includes(key)) {
        processScale(scales[key], key);
      }
    });
    
    return config;
  };

  // Function to handle downloading the chart as an image
  const handleDownload = () => {
    if (!chartRef.current) return;
    
    try {
      // Get canvas data URL
      const dataUrl = chartRef.current.toDataURL('image/png', 1.0);
      
      // Create download link
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = `chart-visualization-${new Date().toISOString().slice(0, 10)}.png`;
      
      // Append to body, click and remove
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error('Error downloading chart:', err);
      setError('Failed to download chart visualization');
    }
  };

  // Chart creation effect - runs after canvas is re-created
  useEffect(() => {
    // Skip if there's no canvas ref yet
    if (!chartRef.current) return;

    try {
      // Use the chart configuration object directly
      const chartConfig = code;

      // Check if configuration uses time scales and needs adapter
      const hasTimeScale = (config: ChartConfiguration): boolean => {
        const scales = config.options?.scales || {};
        // Check all scales for 'time' type
        return Object.values(scales).some(scale => {
          if (!scale) return false;
          if (typeof scale !== 'object') return false;
          // Direct time type check
          if ((scale as ChartScale).type === 'time') return true;
          return false;
        });
      };

      // For time scales, test if the adapter is available
      const needsTimeAdapter = hasTimeScale(chartConfig);
      if (needsTimeAdapter) {
        // Test if the adapter is available by checking if Chart has the adapter method
        const adapterAvailable = !!(Chart as unknown as { _adapters?: unknown })._adapters;
        if (!adapterAvailable) {
          console.warn('Chart uses time scales but no adapter appears to be registered. Converting to category scale.');
          
          // Replace time scales with category scales as a fallback
          const scales = chartConfig.options?.scales || {};
          Object.keys(scales).forEach(key => {
            const scale = scales[key];
            if (scale && typeof scale === 'object') {
              const scaleObj = scale as ChartScale;
              if (scaleObj.type === 'time') {
                console.log(`Converting ${key} axis from time to category scale`);
                scaleObj.type = 'category';
              }
            }
          });
        }
      }

      // Allow DOM to fully update before creating chart
      const timer = setTimeout(() => {
        try {
          // Get a fresh context from the newly created canvas
          const ctx = chartRef.current?.getContext('2d');
          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }
          
          // Ensure responsive settings and scales have proper adapters
          const updatedConfig = ensureAdapters({
            ...chartConfig,
            options: {
              ...chartConfig.options,
              responsive: true,
              maintainAspectRatio: false
            }
          });
          
          console.log('Creating chart with config:', JSON.stringify(updatedConfig).substring(0, 200) + '...');
          
          // Create chart on the fresh canvas
          chartInstance.current = new Chart(ctx, updatedConfig);
          
          setError(null);
        } catch (chartError) {
          console.error('Error creating chart:', chartError);
          setError(chartError.message || 'Failed to create chart');
        }
      }, 100);
      
      // Clean up timer if component unmounts or re-renders
      return () => clearTimeout(timer);
    } catch (err) {
      console.error('Error creating chart visualization:', err);
      setError(err.message || 'Failed to create chart visualization');
      return undefined;
    }
  }, [canvasKey]); // Only depend on canvasKey so it runs after canvas recreation

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <div className="bg-red-100 p-4 rounded-md text-red-800">
        <h3 className="font-medium">Error rendering visualization</h3>
        <p>{error}</p>
        <p className="text-xs mt-2">Try refreshing the page or contact support if the issue persists.</p>
      </div>
    );
  }

  return (
    <div className="visualization-container" style={{ width: '100%', height: '100%' }}>
      <Card sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <Tooltip title="Download Visualization">
          <IconButton 
            onClick={handleDownload}
            sx={{ 
              position: 'absolute', 
              top: 8, 
              right: 8, 
              zIndex: 10,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.9)'
              }
            }}
            aria-label="download visualization"
          >
            <DownloadIcon />
          </IconButton>
        </Tooltip>
        <CardContent sx={{ 
          flex: 1, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: '8px',
          '&:last-child': { paddingBottom: '8px' },
          height: '80vh'
        }}>
          <canvas 
            key={canvasKey}
            id={canvasId}
            ref={chartRef} 
            style={{ width: '100%', height: '100%' }} 
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default VisualizationRenderer;
