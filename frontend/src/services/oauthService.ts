/**
 * OAuth service for Google login
 */

export interface OAuthConfig {
  googleClientId: string;
  backendUrl: string;
}

class OAuthService {
  private config: OAuthConfig | null = null;

  initialize(config: OAuthConfig) {
    this.config = config;
  }

  /**
   * Get Google OAuth login URL
   * Frontend should redirect user to this URL
   */
  getGoogleLoginUrl(): string {
    if (!this.config) {
      throw new Error('OAuth service not initialized');
    }
    
    const params = new URLSearchParams({
      client_id: this.config.googleClientId,
      redirect_uri: `${this.config.backendUrl}/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Handle OAuth callback
   * Backend will redirect here after OAuth provider callback
   */
  handleOAuthCallback(): void {
    // Backend will set the auth_token cookie and redirect to /chat
    // This is handled server-side
  }

  /**
   * Check if user is already authenticated
   */
  isAuthenticated(): boolean {
    // Check if auth_token cookie exists
    return document.cookie.includes('auth_token');
  }

  /**
   * Get stored OAuth state from localStorage
   */
  getStoredOAuthState(): string | null {
    return localStorage.getItem('oauth_state');
  }

  /**
   * Store OAuth state in localStorage
   */
  storeOAuthState(state: string): void {
    localStorage.setItem('oauth_state', state);
  }

  /**
   * Clear OAuth state from localStorage
   */
  clearOAuthState(): void {
    localStorage.removeItem('oauth_state');
  }
}

export const oauthService = new OAuthService();
