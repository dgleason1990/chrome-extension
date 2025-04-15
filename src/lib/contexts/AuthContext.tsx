import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/api-client';
import { UserInDB, OAuthOptions } from '../api/types';

interface AuthContextType {
  user: UserInDB | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  startOAuthAuth: (provider: string, options?: OAuthOptions) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInDB | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored auth tokens when component mounts
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Initialize auth tokens from Chrome storage
        const tokensInitialized = await apiClient.initAuthFromStorage();

        if (tokensInitialized) {
          // Get user profile if tokens are initialized
          const userData = await apiClient.auth.getCurrentUser();
          setUser(userData);

          // Store user in Chrome storage
          chrome.storage.local.set({ user: userData });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear any partial auth state
        apiClient.clearAuthTokens();
        chrome.storage.local.remove(['user']);
      } finally {
        setIsLoading(false);
      }
    };

    // Load stored user data while initializing auth
    chrome.storage.local.get(['user'], (result) => {
      if (result.user) {
        setUser(result.user);
      }
      initAuth();
    });

    // Listen for OAuth success events
    const handleOAuthSuccess = () => {
      // Fetch user data after successful OAuth login
      apiClient.auth.getCurrentUser()
        .then(userData => {
          setUser(userData);
          chrome.storage.local.set({ user: userData });
        })
        .catch(error => {
          console.error('Error fetching user after OAuth login:', error);
        });
    };

    document.addEventListener('oauth-login-success', handleOAuthSuccess);

    return () => {
      document.removeEventListener('oauth-login-success', handleOAuthSuccess);
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      // Use the auth client for login
      const tokenResponse = await apiClient.auth.login(email, password);

      if (!tokenResponse.access_token) {
        throw new Error('No access token received from the server');
      }

      // Ensure the token is set in the API client
      apiClient.setAuthTokens(tokenResponse);

      // Get user details
      const userData = await apiClient.auth.getCurrentUser();

      if (!userData) {
        throw new Error('Failed to retrieve user data');
      }

      setUser(userData);

      // Store user in Chrome storage
      chrome.storage.local.set({ user: userData });
    } catch (error) {
      console.error('Login failed:', error);
      // Clear any partial authentication state
      apiClient.clearAuthTokens();
      chrome.storage.local.remove(['user']);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);

      // Get refresh token from storage
      const { refresh_token } = await new Promise<{ refresh_token?: string }>(
        (resolve) => {
          chrome.storage.local.get(['refresh_token'], resolve);
        }
      );

      // If we have a refresh token, revoke it to properly logout
      if (refresh_token) {
        try {
          await apiClient.auth.logout(refresh_token);
        } catch (error) {
          console.error('Error revoking refresh token:', error);
          // Continue with logout even if token revocation fails
        }
      }

      // Clear user state
      setUser(null);

      // Clear tokens
      apiClient.clearAuthTokens();

      // Clear user from Chrome storage
      chrome.storage.local.remove(['user']);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to start OAuth authentication
  const startOAuthAuth = (provider: string, options: OAuthOptions = {}) => {
    // Use the auth client's method
    apiClient.auth.startOAuthAuth(provider, options);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        startOAuthAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Export the context for use in our hook file
export { AuthContext }; 