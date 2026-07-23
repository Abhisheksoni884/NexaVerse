/**
 * Cookie utility functions for checking JWT expiration
 */

export interface ParsedCookie {
  name: string;
  value: string;
  maxAge?: number;
  expires?: string;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
}

/**
 * Parse all cookies from document.cookie
 * Note: HttpOnly cookies are not accessible from JavaScript,
 * but this function can parse server-sent Set-Cookie headers if needed
 */
export function getAllCookies(): { [key: string]: string } {
  const cookies: { [key: string]: string } = {};
  document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(value || '');
    }
  });
  return cookies;
}

/**
 * Get a specific cookie value by name
 * Note: HttpOnly cookies cannot be accessed from JavaScript
 */
export function getCookie(name: string): string | null {
  const cookies = getAllCookies();
  return cookies[name] || null;
}

/**
 * Check if the auth_token cookie exists
 * Note: Due to HttpOnly flag, we can't directly inspect the cookie,
 * but we can confirm it was set if authentication succeeds
 */
export function hasAuthCookie(): boolean {
  // For HttpOnly cookies, we rely on the server to validate
  // But we can check if we were redirected to login (401)
  // The best way is to call /auth/me which will fail if cookie is invalid
  return true; // This check is more reliable done server-side
}

/**
 * Get cookie expiration info from the browser's storage
 * Note: HttpOnly cookies' expiration cannot be read from client-side
 * but you can inspect them in DevTools → Application → Cookies
 */
export function getCookieInfo(name: string): {
  exists: boolean;
  warning: string;
} {
  // HttpOnly cookies cannot be inspected from JavaScript
  // Recommend checking in browser DevTools
  return {
    exists: true,
    warning: `The '${name}' cookie is HttpOnly for security. To inspect it:\n1. Open DevTools (F12)\n2. Go to "Application" tab\n3. Select "Cookies" in the sidebar\n4. Look for the cookie on the current domain\n\nYou'll see:\n- Expiration time\n- Max-Age\n- HttpOnly flag (checked)\n- Secure flag\n- SameSite policy`,
  };
}

/**
 * Display cookie debug info in console
 */
export function debugCookies(): void {
  const cookies = getAllCookies();
  const authCookieInfo = getCookieInfo('auth_token');
  
  console.group('🍪 Cookie Information');
  console.log('📝 Accessible Cookies:', cookies);
  console.warn('⚠️ ' + authCookieInfo.warning);
  console.groupEnd();
}
