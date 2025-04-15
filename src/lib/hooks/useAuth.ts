import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

/**
 * React hook for accessing auth context
 * 
 * This hook provides access to the authentication context, including
 * user information, authentication status, and auth methods.
 * 
 * @returns AuthContext values and methods
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 