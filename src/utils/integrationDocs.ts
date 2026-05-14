
export function generateNextJsMarkdown(clientId: string, clientSecret: string, appName: string, redirectUris: string[] = []): string {
  const baseUrls = Array.from(new Set(redirectUris.map(uri => uri.split('/api/auth/callback/')[0] || uri)));
  const primaryUrl = baseUrls.find(u => u.startsWith('https')) || baseUrls[0] || 'http://localhost:3000';
  
  // Format the .env.local string
  const envNextAuthUrl = baseUrls.length > 1 
    ? baseUrls.map((u, i) => `# Option ${i+1}: ${u.startsWith('https') ? 'Production' : 'Development'}\nNEXTAUTH_URL=${u}`).join('\n')
    : `NEXTAUTH_URL=${primaryUrl}`;

  return `# Integrating WytPass SSO with Next.js

> Complete guide for Next.js applications using WytPass SSO as their identity provider.

This document walks you through registering an OAuth client, implementing the **Authorization Code flow with PKCE** using \`next-auth\`, verifying tokens, and handling logout.

---

## 1. What this SSO provides

| Capability | Endpoint | Notes |
|---|---|---|
| OIDC Discovery | \`GET /.well-known/openid-configuration\` | Auto-config |
| JWKS (public keys) | \`GET /.well-known/jwks.json\` | RS256, kid \`sso-key-1\` |
| Authorize | \`GET /oauth/authorize\` | Browser-redirect; user logs in here |
| Token | \`POST /oauth/token\` | Exchange code or refresh |
| UserInfo | \`GET /oauth/userinfo\` | OIDC standard |
| Revoke | \`POST /oauth/revoke\` | RFC 7009 |

**Token format:** RS256-signed JWT. Public key at \`/.well-known/jwks.json\`.
**Issuer (iss claim):** \`https://api.wytnet.com\`.

---

## 2. Register your app

A super_admin creates an OAuth client for your Next.js app via the SSO Admin Panel:

**Client Details:**
- **App Name:** \`${appName}\`
- **Redirect URIs:** 
${redirectUris.map(uri => `  - \`${uri}\``).join('\n') || '  - `http://localhost:3000/api/auth/callback/wytpass`'}
- **Allowed Scopes:** \`openid\`, \`profile\`, \`email\`, \`offline_access\`
- **Is Confidential:** \`true\` (for Next.js/NextAuth)
- **Require PKCE:** \`true\`

**You will receive:**
- \`client_id\` — \`${clientId}\`
- \`client_secret\` — \`${clientSecret || '<rotate-secret-to-get-new-value>'}\`

> [!IMPORTANT]
> The \`redirect_uri\` MUST match exactly. For NextAuth, the format is always \`/api/auth/callback/{provider_id}\`. In this guide, our provider ID is \`wytpass\`.

---

## 3. The Flow (NextAuth.js handles this)

\`\`\`mermaid
sequenceDiagram
    participant App as Your Next.js App
    participant SSO as WytPass SSO
    
    App->>SSO: GET /oauth/authorize?response_type=code&client_id=...&code_challenge=...
    Note over SSO: User logs in / consents
    SSO-->>App: 302 Redirect to /api/auth/callback/wytpass?code=AUTH_CODE
    App->>SSO: POST /oauth/token (code + code_verifier + client_secret)
    SSO-->>App: 200 OK (access_token, refresh_token, id_token)
\`\`\`

---

## 4. Next.js Integration (NextAuth v4)

This is the verified configuration for integrating with Next.js.

### 4.1 Dependencies
\`\`\`bash
npm install next-auth
\`\`\`

### 4.1.1 Local SSL (Required for HTTPS)
If you are using \`https\` for local development (recommended for WytPass), run:
\`\`\`bash
npx next dev --experimental-https
\`\`\`

### 4.2 Environment Variables (\`.env.local\`)
\`\`\`env
${envNextAuthUrl}
NEXTAUTH_SECRET=${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}
WYTPASS_CLIENT_ID=${clientId}
WYTPASS_CLIENT_SECRET=${clientSecret || '<rotate-secret-to-get-new-value>'}
WYTPASS_ISSUER=https://api.wytnet.com
\`\`\`

### 4.3 Route Handler (\`src/app/api/auth/[...nextauth]/route.ts\`)
\`\`\`typescript
import NextAuth from "next-auth";
import { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "wytpass",
      name: "WytPass",
      type: "oauth",
      issuer: "https://api.wytnet.com",
      wellKnown: "https://api.wytnet.com/.well-known/openid-configuration",
      authorization: { params: { scope: "openid profile email offline_access" } },
      clientId: process.env.WYTPASS_CLIENT_ID,
      clientSecret: process.env.WYTPASS_CLIENT_SECRET,
      client: {
        token_endpoint_auth_method: "client_secret_post",
      },
      idToken: true,
      checks: ["pkce", "state"],
      profile(profile: any) {
        return {
          id: profile.sub,
          name: profile.name || profile.nickname || profile.email,
          email: profile.email,
          image: profile.picture,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
\`\`\`

### 4.4 Triggering Sign-In
\`\`\`tsx
import { signIn } from \"next-auth/react\";

// Basic button
<button onClick={() => signIn('wytpass', { callbackUrl: '/dashboard' })}>
  Sign in with WytPass
</button>

// Recommended Premium Button
<WytPassButton onClick={() => signIn('wytpass', { callbackUrl: '/dashboard' })} />
\`\`\`

### 4.5 Standard WytPass Button (Recommended)
Use this official button format for a premium, consistent user experience across the platform.

\`\`\`tsx
const WytPassButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      backgroundColor: '#ffffff',
      color: '#1f2937',
      padding: '10px 24px',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      fontWeight: '600',
      fontSize: '15px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      fontFamily: 'inherit'
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.backgroundColor = '#f9fafb';
      e.currentTarget.style.borderColor = '#d1d5db';
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.backgroundColor = '#ffffff';
      e.currentTarget.style.borderColor = '#e5e7eb';
    }}
  >
    <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">
      <path d=\"M4 8L7 17\" stroke=\"#4285F4\" strokeWidth=\"3.5\" strokeLinecap=\"round\" strokeLinejoin=\"round\"/>
      <path d=\"M7 17L10 10\" stroke=\"#EA4335\" strokeWidth=\"3.5\" strokeLinecap=\"round\" strokeLinejoin=\"round\"/>
      <path d=\"M10 10L13 17\" stroke=\"#FBBC05\" strokeWidth=\"3.5\" strokeLinecap=\"round\" strokeLinejoin=\"round\"/>
      <path d=\"M13 17L16 8\" stroke=\"#34A853\" strokeWidth=\"3.5\" strokeLinecap=\"round\" strokeLinejoin=\"round\"/>
    </svg>
    <span>Sign in with WytPass</span>
  </button>
);
\`\`\`

---

## 5. Token claims you'll receive

### ID token (OIDC, RS256 JWT)
\`\`\`json
{
  "iss": "https://api.wytnet.com",
  "sub": "user-uuid",
  "aud": "${clientId}",
  "iat": 1700000000,
  "exp": 1700003600,
  "email": "user@example.com",
  "email_verified": true,
  "name": "Jane Doe",
  "picture": "https://...",
  "nonce": "your-nonce"
}
\`\`\`

---

## 6. Scopes

| Scope | Grants access to |
|---|---|
| \`openid\` | Required for OIDC. ID token issued. |
| \`profile\` | \`name\`, \`picture\` claims |
| \`email\`   | \`email\`, \`email_verified\` claims |
| \`offline_access\` | Required for Refresh tokens |

---

## 7. Security Checklist

- ✅ **Always use PKCE** — NextAuth handles this via \`checks: ["pkce"]\`.
- ✅ **Confidential Client** — Next.js is a server-side environment, so it uses the \`client_secret\` securely.
- ✅ **CSRF Protection** — NextAuth automatically handles state validation.
- ✅ **Environment Secrets** — Never commit \`WYTPASS_CLIENT_SECRET\` or \`NEXTAUTH_SECRET\` to version control.

---

## 8. Logout

### Local Sign-out
\`\`\`tsx
import { signOut } from "next-auth/react";

<button onClick={() => signOut()}>Sign Out</button>
\`\`\`

---

## 9. Useful Links

- **OIDC Discovery** → \`https://api.wytnet.com/.well-known/openid-configuration\`
- **JWKS** → \`https://api.wytnet.com/.well-known/jwks.json\`
- **NextAuth Documentation** → \`https://next-auth.js.org\`
`;
}

export function generateReactMarkdown(clientId: string, clientSecret: string, appName: string, redirectUris: string[] = []): string {
  const primaryRedirectUri = redirectUris[0] || 'http://localhost:5173/callback';
  
  return `# Integrating with the WytPass SSO Identity Provider

> Complete guide for client applications that want to use this SSO as their identity provider.

This document walks you through registering an OAuth client, implementing the **Authorization Code flow with PKCE**, verifying tokens, refreshing them, and handling logout.

---

## 1. What this SSO provides

| Capability | Endpoint | Notes |
|---|---|---|
| OIDC Discovery | \`GET /.well-known/openid-configuration\` | Auto-config |
| JWKS (public keys) | \`GET /.well-known/jwks.json\` | RS256, kid \`sso-key-1\` |
| Authorize | \`GET /oauth/authorize\` | Browser-redirect; user logs in here |
| Token | \`POST /oauth/token\` | Exchange code or refresh |
| UserInfo | \`GET /oauth/userinfo\` | OIDC standard |
| Revoke | \`POST /oauth/revoke\` | RFC 7009 |

**Token format:** RS256-signed JWT. Public key at \`/.well-known/jwks.json\`.
**Issuer (iss claim):** \`https://api.wytnet.com\`.

---

## 2. Register your app

A super_admin creates an OAuth client for your app via:

\`\`\`
POST /v1/clients
{
  "app_name": "${appName}",
  "redirect_uris": ["${primaryRedirectUri}"],
  "allowed_scopes": ["openid", "profile", "email"],
  "is_confidential": true,
  "require_pkce": true
}
\`\`\`

You'll receive:
- \`client_id\` — \`${clientId}\`
- \`client_secret\` — \`${clientSecret || '<rotate-secret-to-get-new-value>'}\`

> **Public clients** (SPAs, mobile apps) should set \`is_confidential: false\` and rely on PKCE only — no client secret.

---

## 3. The flow (Authorization Code with PKCE)

\`\`\`mermaid
sequenceDiagram
    participant App as Your App
    participant SSO as SSO Provider
    
    App->>SSO: GET /oauth/authorize?response_type=code&client_id=...&code_challenge=...
    Note over SSO: User logs in / consents
    SSO-->>App: 302 Redirect to /callback?code=AUTH_CODE
    App->>SSO: POST /oauth/token (code + code_verifier + client_secret)
    SSO-->>App: 200 OK (access_token, id_token)
\`\`\`

---

## 4. Implementation — JavaScript (browser SPA)

### 4.1 Start sign-in (frontend)

Use cookies for the state to ensure it survives redirects.

\`\`\`js
// Simple cookie helpers
const setCookie = (name, value) => {
  document.cookie = \`\${name}=\${value}; path=/; max-age=3600; SameSite=Lax\`;
};

async function signIn() {
  const { verifier, challenge } = await createPKCE();
  const state = crypto.randomUUID();

  setCookie('pkce_verifier', verifier);
  setCookie('oauth_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: '${clientId}',
    redirect_uri: '${primaryRedirectUri}',
    scope: 'openid profile email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  window.location.href = \`https://api.wytnet.com/oauth/authorize?\${params}\`;
}
\`\`\`

### 4.3 Standard WytPass Button (Recommended)
Use this official button format for a consistent user experience.

\`\`\`tsx
const WytPassButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      backgroundColor: '#ffffff',
      color: '#1f2937',
      padding: '10px 24px',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      fontWeight: '600',
      fontSize: '15px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      fontFamily: 'inherit'
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.backgroundColor = '#f9fafb';
      e.currentTarget.style.borderColor = '#d1d5db';
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.backgroundColor = '#ffffff';
      e.currentTarget.style.borderColor = '#e5e7eb';
    }}
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 8L7 17" stroke="#4285F4" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 17L10 10" stroke="#EA4335" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 10L13 17" stroke="#FBBC05" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 17L16 8" stroke="#34A853" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <span>Sign in with WytPass</span>
  </button>
);
\`\`\`

### 4.2 Handle the callback (frontend)

Call your **own backend** to perform the token exchange securely.

\`\`\`js
async function handleCallback() {
  const params = new URLSearchParams(window.location.search);
  const code  = params.get('code');
  const state = params.get('state');
  const storedState = getCookie('oauth_state');

  if (state !== storedState) {
    throw new Error('Invalid state — possible CSRF attack');
  }

  const verifier = getCookie('pkce_verifier');
  // Clear cookies
  deleteCookie('oauth_state');
  deleteCookie('pkce_verifier');

  const resp = await fetch('http://localhost:8000/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: verifier }),
  });
  
  const tokens = await resp.json();

  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('id_token',      tokens.id_token); // Use this for identity
  return tokens;
}
\`\`\`

---

## 5. Implementation — Backend (FastAPI Example)

### 5.1 Token Exchange
Your backend performs a server-to-server request to the SSO provider.

\`\`\`python
@app.post("/api/auth/token")
async def exchange_token(payload: TokenExchangePayload):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.wytnet.com/oauth/token",
            data={
                "grant_type": "authorization_code",
                "code": payload.code,
                "redirect_uri": "${primaryRedirectUri}",
                "client_id": "${clientId}",
                "client_secret": "YOUR_CLIENT_SECRET",
                "code_verifier": payload.code_verifier,
            }
        )
        return resp.json()
\`\`\`

---

## 6. Security checklist

- ✅ **Always use PKCE** — required for public clients, recommended for confidential
- ✅ **Always validate state** on the callback to prevent CSRF
- ✅ **Always verify JWT signature** on your backend with the JWKS public key
- ✅ **Verify iss and aud claims** on the ID token
- ✅ Rotate refresh tokens automatically
- ✅ Don't store tokens in localStorage if you can avoid it (httpOnly cookie is safer)
- ❌ Don't ship \`client_secret\` to a browser — use PKCE-only public client

---

## 7. Logout

### Local sign-out
Clear local tokens. The user is still logged in at the IdP.

### Single sign-out (everywhere)
Call \`POST /auth/logout/all\` with the user's bearer token.

### Revoke a single refresh token
\`\`\`
POST /oauth/revoke
{ "token": "<refresh_token>", "token_type_hint": "refresh_token" }
\`\`\`
`;
}

export function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

