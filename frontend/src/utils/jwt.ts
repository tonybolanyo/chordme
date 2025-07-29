// JWT utility functions for token handling

export interface JWTPayload {
  exp?: number; // Expiration time
  iat?: number; // Issued at time
  sub?: string; // Subject (user ID)
  email?: string; // User email
  [key: string]: unknown;
}

/**
 * Decode a JWT token without verification (client-side only)
 * Note: This does not verify the token signature - only use for reading claims
 */
export const decodeJWT = (token: string): JWTPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decodedPayload = atob(paddedPayload);
    
    return JSON.parse(decodedPayload) as JWTPayload;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

/**
 * Check if a JWT token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    // If we can't decode the token or it has no expiration, consider it expired
    return true;
  }

  // JWT exp is in seconds, Date.now() is in milliseconds
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
};

/**
 * Get the expiration time of a JWT token as a Date object
 */
export const getTokenExpiration = (token: string): Date | null => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null;
  }

  // JWT exp is in seconds, Date constructor expects milliseconds
  return new Date(payload.exp * 1000);
};

/**
 * Check if a token will expire within the given number of seconds
 */
export const isTokenExpiringSoon = (token: string, secondsThreshold: number = 300): boolean => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return (payload.exp - currentTime) <= secondsThreshold;
};