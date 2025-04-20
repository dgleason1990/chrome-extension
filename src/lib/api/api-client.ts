import { BaseApiClient } from './base-client';
import { AuthClient } from './auth-client';
import { QueryClient } from './query-client';

// API base URL
// In production, use your deployed API endpoint
const baseUrl = process.env.NODE_ENV === 'production' 
  ? 'https://api.sql-buddy.com'  // Production server
  : 'http://127.0.0.1:8000';     // Development server

// Initialize base API client
const baseClient = new BaseApiClient(baseUrl);

// Create individual clients
const authClient = new AuthClient(baseUrl);
const queryClient = new QueryClient(baseUrl);

// Export the API client with all services
const apiClient = {
  auth: authClient,
  query: queryClient,

  // Re-export common methods from base client
  setAuthTokens: (token: any) => {
    baseClient.setAuthTokens(token);
    authClient.setAuthTokens(token);
    queryClient.setAuthTokens(token);
  },

  initAuthFromStorage: async () => {
    const baseFetched = await baseClient.initAuthFromStorage();
    const authFetched = await authClient.initAuthFromStorage();
    const queryFetched = await queryClient.initAuthFromStorage();
    return baseFetched && authFetched && queryFetched;
  },

  clearAuthTokens: () => {
    baseClient.clearAuthTokens();
    authClient.clearAuthTokens();
    queryClient.clearAuthTokens();
  },
};

export default apiClient; 