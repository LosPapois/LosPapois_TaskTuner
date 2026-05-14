import { getFromStorage, STORAGE_KEYS } from './storage';

/**
 * Global fetch interceptor — imported once in index.tsx for its side-effect.
 *
 * Wraps `window.fetch` so that every request to a `/api/` URL automatically:
 *   1. Attaches the JWT stored under STORAGE_KEYS.AUTH_TOKEN as a Bearer token.
 *   2. Sets `X-Requested-With: XMLHttpRequest` so Spring's security layer can
 *      distinguish programmatic API calls from browser navigation.
 *   3. Sets `ngrok-skip-browser-warning: 1` to bypass the ngrok interstitial
 *      page during local tunnel development.
 *
 * Non-API requests (static assets, CDN, etc.) pass through unchanged.
 */
const originalFetch = window.fetch;

window.fetch = async (...args) => {
  let [resource, config] = args;
  
  if (typeof resource === 'string' && resource.includes('/api/')) {
    const token = getFromStorage<string>(STORAGE_KEYS.AUTH_TOKEN);
    config = config || {};
    
    const headers = new Headers(config.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Explicitly let Spring backend know this is an API call, not browser
    headers.set('X-Requested-With', 'XMLHttpRequest');
    // Skip ngrok browser warning interstitial when tunneling locally
    headers.set('ngrok-skip-browser-warning', '1');
    
    config.headers = headers;
  }
  
  return originalFetch(resource, config);
};
