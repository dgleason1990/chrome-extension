import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '../lib/contexts/AuthContext';
import { ThemeProvider } from '../ui/theme/ThemeProvider';
import SidePanel from './SidePanel';
import './styles/index.css';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Root element not found');
  }
  
  const root = createRoot(container);
  
  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <SidePanel />
        </AuthProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}); 