/// <reference types="chrome"/>
import { Token } from './types';

// Define a type for Chrome storage
interface ChromeStorage {
  local: {
    get: (keys: string[], callback: (result: any) => void) => void;
    set: (items: Record<string, any>, callback?: () => void) => void;
    remove: (keys: string[], callback?: () => void) => void;
  };
}

/**
 * Base API client that handles common functionality like authentication and request handling
 * Adapted from dashboard's BaseApiClient to use Chrome storage
 */
export class BaseApiClient {
  protected baseUrl: string;
  protected headers: HeadersInit;
  protected accessToken: string | null = null;
  protected refreshToken: string | null = null;
  protected tokenExpiry: number | null = null;
  protected refreshPromise: Promise<boolean> | null = null;
  protected static authErrorListeners: Array<() => void> = [];

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
    };
  }

  /**
   * Get the base URL of the API
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Register a listener for authentication errors
   */
  static onAuthError(callback: () => void): void {
    BaseApiClient.authErrorListeners.push(callback);
  }

  /**
   * Notify all auth error listeners
   */
  protected static notifyAuthError(): void {
    BaseApiClient.authErrorListeners.forEach(listener => listener());
  }

  /**
   * Set auth tokens and manage expiration
   * Adapted to use Chrome storage
   */
  setAuthTokens(token: Token): void {
    this.accessToken = token.access_token;
    this.refreshToken = token.refresh_token || null;

    // Calculate expiry timestamp
    if (token.expires_in) {
      this.tokenExpiry = Math.floor(Date.now() / 1000) + token.expires_in;
    }

    this.headers = {
      ...this.headers,
      'Authorization': `Bearer ${token.access_token}`
    };

    // Store tokens in Chrome storage for persistence
    const storage = this.getChromeStorage();
    if (storage) {
      storage.local.set({
        access_token: token.access_token,
        refresh_token: token.refresh_token || null,
        token_expiry: this.tokenExpiry,
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving tokens to storage:', chrome.runtime.lastError);
        } else {
          console.log('Tokens successfully saved to storage');
        }
      });
    }
  }

  /**
   * Initialize tokens from Chrome storage
   */
  async initAuthFromStorage(): Promise<boolean> {
    const storage = this.getChromeStorage();
    if (!storage) {
      return Promise.resolve(false);
    }
    
    return new Promise<boolean>((resolve) => {
      storage.local.get(
        ['access_token', 'refresh_token', 'token_expiry'],
        (result) => {
          if (result.access_token) {
            console.log('Retrieved token from storage:', result.access_token ? 'token-present' : 'no-token');
            this.accessToken = result.access_token;
            this.refreshToken = result.refresh_token;
            this.tokenExpiry = result.token_expiry;

            this.headers = {
              ...this.headers,
              'Authorization': `Bearer ${result.access_token}`
            };

            resolve(true);
          } else {
            console.log('No token found in storage');
            resolve(false);
          }
        }
      );
    });
  }

  /**
   * Clear auth tokens
   */
  clearAuthTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;

    // Create a new headers object without the Authorization header
    const newHeaders: HeadersInit = {};

    Object.entries(this.headers).forEach(([key, value]) => {
      if (key !== 'Authorization') {
        newHeaders[key] = value;
      }
    });

    this.headers = newHeaders;

    // Clear from Chrome storage
    const storage = this.getChromeStorage();
    if (storage) {
      storage.local.remove([
        'access_token',
        'refresh_token',
        'token_expiry',
      ]);
    }
  }

  /**
   * Check if token is expired or about to expire
   */
  protected isTokenExpired(bufferSeconds: number = 30): boolean {
    if (!this.tokenExpiry) return true;
    
    const currentTimestamp = Math.floor(Date.now() / 1000);
    // Validate that tokenExpiry is a reasonable timestamp
    if (this.tokenExpiry < currentTimestamp - 86400 * 30) return true; // Expired if more than 30 days old
    
    return currentTimestamp > (this.tokenExpiry - bufferSeconds);
  }

  /**
   * Refresh the access token using the refresh token
   */
  protected async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;
    
    // If already refreshing, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    this.refreshPromise = new Promise((resolve) => {
      fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: this.refreshToken })
      })
      .then(response => {
        if (!response.ok) {
          this.clearAuthTokens();
          resolve(false);
          return null;
        }
        return response.json();
      })
      .then(tokenData => {
        if (tokenData) {
          this.setAuthTokens(tokenData as Token);
          resolve(true);
        }
      })
      .catch(error => {
        console.error('Token refresh failed:', error);
        resolve(false);
      })
      .finally(() => {
        this.refreshPromise = null;
      });
    });
    
    return this.refreshPromise;
  }

  /**
   * Verify and rehydrate token from storage before making request
   * This ensures we always have the latest token from storage
   */
  protected async ensureTokenFromStorage(): Promise<boolean> {
    if (!this.accessToken) {
      console.log('No access token in memory, checking storage');
      return this.initAuthFromStorage();
    }
    return true;
  }

  /**
   * Helper method to handle API requests with automatic token refresh
   */
  protected async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Always check for token in storage before making a request
    await this.ensureTokenFromStorage();
    
    // Check if this is a public endpoint that doesn't require authentication
    const isPublicEndpoint = 
      endpoint.includes('/auth/token') || 
      endpoint.includes('/auth/register') ||
      endpoint.includes('/openapi.json') ||
      options.headers?.['skipAuthCheck'] === 'true';
    
    // Check for missing auth token when it should be present
    if (!this.accessToken && !isPublicEndpoint && endpoint !== '/openapi.json') {
      console.error('Authentication required: No accessToken available for request to', endpoint);
      // Notify listeners about missing authentication
      BaseApiClient.notifyAuthError();
      throw new Error('Authentication required: No access token');
    }
    
    // Check if token needs refreshing
    if (this.accessToken && this.isTokenExpired() && !isPublicEndpoint && endpoint !== '/openapi.json') {
      console.log('Token expired, attempting refresh');
      const refreshed = await this.refreshAccessToken();
      if (!refreshed && !options.headers?.['skipAuthRefresh']) {
        console.error('Authentication required: Token refresh failed');
        BaseApiClient.notifyAuthError();
        throw new Error('Authentication required: Token refresh failed');
      }
    }
    
    // Remove custom headers before sending the request
    const requestHeaders = { ...options.headers };
    delete requestHeaders['skipAuthCheck'];
    delete requestHeaders['skipAuthRefresh'];
    
    const url = `${this.baseUrl}${endpoint}`;
    console.log('Making API request to:', endpoint, 'with token:', this.accessToken ? 'present' : 'missing');
    
    try {
      // Determine whether to include credentials
      const credentials = options.credentials || (endpoint === '/openapi.json' ? 'omit' : 'include');
      
      let response = await fetch(url, {
        ...options,
        credentials,
        headers: {
          ...this.headers,
          ...requestHeaders
        }
      });

      // Specifically handle 401 Unauthorized errors
      if (response.status === 401) {
        // Try to refresh the token if we have a refresh token and haven't tried already
        if (this.refreshToken && !options.headers?.['skipAuthRefresh'] && !isPublicEndpoint) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            // Retry the request with new token
            response = await fetch(url, {
              ...options,
              headers: {
                ...options.headers,
                'Authorization': `Bearer ${this.accessToken}`,
                'skipAuthRefresh': 'true' // Prevent infinite refresh loops
              }
            });
            
            // If still getting 401 after refresh, notify auth error
            if (response.status === 401) {
              BaseApiClient.notifyAuthError();
              throw new Error('Authentication required3');
            }
          } else {
            // Token refresh failed
            BaseApiClient.notifyAuthError();
            throw new Error('Authentication required4');
          }
        } else if (!isPublicEndpoint) {
          // No refresh token or already tried refreshing
          BaseApiClient.notifyAuthError();
          throw new Error('Authentication required5');
        }
      }

      // Check for token about to expire header
      if (response.headers.get('X-Token-Expiring') === 'true') {
        // Refresh in background
        this.refreshAccessToken().catch(err => console.error('Background token refresh failed:', err));
      }

      // Handle other error responses
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        
        try {
          errorData = JSON.parse(errorText);
          console.log("API Error response:", errorData); // Log the full error response
        } catch (e) {
          errorData = { message: errorText || `API request failed with status ${response.status}` };
        }
        
        // Create a custom error with additional properties
        let errorMessage = "API request failed";
        
        // Check for the nested detail structure with message
        if (errorData.detail && typeof errorData.detail === 'object' && errorData.detail.message) {
          errorMessage = errorData.detail.message;
        } 
        // Check for direct detail string
        else if (errorData.detail && typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        }
        // Fall back to message property or status
        else if (errorData.message) {
          errorMessage = errorData.message;
        } else {
          errorMessage = `API request failed with status ${response.status}`;
        }
        
        const apiError = new Error(errorMessage) as Error & { 
          response?: { status: number; data: any }; 
          status?: number; 
        };
        
        // Attach the response data and status for better error handling
        apiError.response = {
          status: response.status,
          data: errorData
        };
        
        apiError.status = response.status;
        
        // Add a toString method to properly display the error
        apiError.toString = function() {
          return `API Error (${this.response?.status}): ${this.message}`;
        };
        
        throw apiError;
      }
        
      // For endpoints that don't return JSON, just return empty object
      if (response.headers.get('Content-Length') === '0') {
        return {} as T;
      }
      
      return await response.json() as T;
    } catch (error) {
      // If it's already our custom error, just rethrow it
      if (error instanceof Error && 'response' in error) {
        throw error;
      }
      
      // Handle fetch network errors
      if (error instanceof Error) {
        const networkError = error as Error & { response?: { status: number; data: any }; };
        networkError.response = {
          status: 0,
          data: { message: error.message }
        };
        networkError.toString = function() {
          return `Network Error: ${this.message}`;
        };
        throw networkError;
      }
      
      // Generic error handling
      const genericError = new Error('Network error occurred') as Error & { response?: { status: number; data: any }; };
      genericError.response = {
        status: 0,
        data: { message: 'Unknown network error' }
      };
      genericError.toString = function() {
        return `Network Error: ${this.message}`;
      };
      throw genericError;
    }
  }

  // Helper method to safely access chrome storage
  private getChromeStorage(): ChromeStorage | null {
    // Check if we're in a browser environment with chrome.storage
    if (typeof chrome !== 'undefined') {
      // Cast to any first to avoid TypeScript errors
      const chromeAny = chrome as any;
      if (chromeAny && chromeAny.storage) {
        return chromeAny.storage as ChromeStorage;
      }
    }
    return null;
  }
} 