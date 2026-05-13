/**
 * OAuth client helper — for use by frontend apps integrating with this SSO provider.
 * Stores PKCE verifier in cookies between the redirect away and the callback.
 */
import { createPKCEPair } from './pkce';
import { setCookie, getCookie, deleteCookie } from '../utils/cookies';

const PKCE_VERIFIER_KEY = 'pkce_verifier';
const STATE_KEY = 'oauth_state';

export interface OAuthClientConfig {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}

/**
 * Starts the sign-in flow by generating PKCE values and redirecting to the SSO provider.
 * Follows the standard "Authorization Code flow with PKCE".
 */
export async function startAuthorizationFlow(cfg: OAuthClientConfig): Promise<void> {
  const { verifier, challenge, state } = await createPKCEPair();
  
  // Store state and verifier in cookies (survives redirects better than sessionStorage)
  setCookie(PKCE_VERIFIER_KEY, verifier);
  setCookie(STATE_KEY, state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: cfg.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `${cfg.authorizationEndpoint}?${params}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

/**
 * Handles the callback from the SSO provider.
 * Exchanges the authorization code for tokens via the backend (recommended) or directly.
 */
export async function handleCallback(cfg: OAuthClientConfig): Promise<TokenResponse> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const storedState = getCookie(STATE_KEY);

  if (!code) {
    throw new Error('No authorization code received');
  }

  if (!state || state !== storedState) {
    throw new Error('Invalid state — possible CSRF attack');
  }

  const verifier = getCookie(PKCE_VERIFIER_KEY);
  if (!verifier) {
    throw new Error('Missing PKCE verifier');
  }

  // Clear cookies
  deleteCookie(STATE_KEY);
  deleteCookie(PKCE_VERIFIER_KEY);

  // In a production app, you should call YOUR OWN backend to perform this exchange.
  // This frontend implementation is for demonstration or public clients.
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri,
    client_id: cfg.clientId,
    code_verifier: verifier,
  });

  const resp = await fetch(cfg.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error_description || err.error || 'Token exchange failed');
  }
  
  return resp.json();
}

