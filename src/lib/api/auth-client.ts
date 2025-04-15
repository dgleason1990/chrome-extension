import { BaseApiClient } from './base-client';
import { Token, UserInDB, RegisterData, OAuthOptions } from './types';

/**
 * Authentication API client adapted for Chrome extension
 */
export class AuthClient extends BaseApiClient {
  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<Token> {
    const formData = new URLSearchParams();
    formData.append('username', email); // Backend still expects 'username' as the parameter name
    formData.append('password', password);
    
    return this.request<Token>('/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'skipAuthCheck': 'true'
      },
      body: formData
    });
  }

  /**
   * Refresh the access token using a refresh token
   */
  async refreshAccessTokenWithToken(refreshToken: string): Promise<Token> {
    return this.request<Token>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
      headers: {
        'skipAuthCheck': 'true' // Skip auth check for this specific request
      }
    });
  }

  /**
   * Logout by revoking a refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    return this.request<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken })
    });
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<UserInDB> {
    return this.request<UserInDB>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<UserInDB> {
    return this.request<UserInDB>('/auth/users/me');
  }

  /**
   * Start the OAuth login/signup flow
   * This uses chrome.identity for the Chrome extension environment
   * 
   * @param provider The OAuth provider to use ('google' or 'github')
   * @param options Options for the OAuth flow
   */
  startOAuthAuth(provider: string = 'google', options: OAuthOptions = {}): void {
    // Get the redirect URL specific to Chrome extension
    const callbackUrl = chrome.identity.getRedirectURL("oauth-callback");

    // Build the URL with query parameters
    const params = new URLSearchParams();

    if (options.organizationName) {
      params.append('organization_name', options.organizationName);
    }

    params.append('redirect_uri', callbackUrl);

    const authUrl = `${this.getBaseUrl()}/auth/login/${provider.toLowerCase()}?${params.toString()}`;

    // Launch the web auth flow for Chrome extension
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true,
      },
      async (redirectUrl) => {
        if (chrome.runtime.lastError || !redirectUrl) {
          console.error('OAuth authentication failed', chrome.runtime.lastError);
          return;
        }

        // Extract tokens from redirect URL
        const url = new URL(redirectUrl);
        const hashParams = new URLSearchParams(url.hash.substring(1));

        const tokenData = {
          access_token: hashParams.get('access_token'),
          refresh_token: hashParams.get('refresh_token'),
          expires_in: parseInt(hashParams.get('expires_in') || '3600', 10),
          token_type: 'bearer',
        };

        if (!tokenData.access_token) {
          console.error('No access token received from OAuth');
          return;
        }

        // Set the tokens in the API client
        this.setAuthTokens(tokenData as Token);

        // Dispatch a custom event to notify about successful authentication
        const authEvent = new CustomEvent('oauth-login-success');
        document.dispatchEvent(authEvent);
      }
    );
  }

  /**
   * Start the Google OAuth login/signup flow
   */
  startGoogleAuth(options: OAuthOptions = {}): void {
    return this.startOAuthAuth('google', options);
  }

  /**
   * Start the GitHub OAuth login/signup flow
   */
  startGitHubAuth(options: OAuthOptions = {}): void {
    return this.startOAuthAuth('github', options);
  }

  /**
   * Get linked accounts for the current user
   */
  async getLinkedAccounts(): Promise<{ providers: string[] }> {
    return this.request<{ providers: string[] }>('/auth/linked-accounts');
  }
} 