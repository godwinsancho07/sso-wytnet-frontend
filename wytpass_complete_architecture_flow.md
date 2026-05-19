# WytPass SSO Identity Infrastructure — Chronological Flow Playbook

This playbook provides a step-by-step, chronological sequence of how users, developers, and administrators interact with **WytPass SSO**. It details every API endpoint route, JSON payload structure, database event, and token exchange.

---

## 1. Chronological Standard User Flow

This section details the lifecycle of a standard user, from their first registration to launching connected applications.

```mermaid
graph TD
    A[1.1 Register Account] -->|POST /auth/register| B[1.2 Verify Email]
    B -->|GET /auth/verify-email| C[1.3 Authentication / Login]
    C -->|POST /auth/login| D[1.4 Landing Page Experience]
    D -->|GET /clients/public| E[1.5 Select & Launch App]
    E -->|OIDC /oauth/authorize| F[1.6 Consent & Authorization Code]
    F -->|OIDC /oauth/token| G[1.7 Profile Management & Security]
```

### Step 1.1: Account Creation (Registration)
A new user registers for a WytPass account.

*   **Action**: User fills out the sign-up form on the frontend and clicks **Create Account**.
*   **HTTP Request**:
    ```http
    POST /v1/auth/register HTTP/1.1
    Host: api.wytnet.com
    Content-Type: application/json

    {
      "email": "user@domain.com",
      "password": "Password123!",
      "full_name": "John Doe"
    }
    ```
*   **Database Operations**:
    1. The system checks if `user@domain.com` already exists in the `USER` table.
    2. Hashes the password using `bcrypt` or `argon2`:
       $$\text{PasswordHash} = \text{HashPassword}(\text{"Password123!"})$$
    3. Inserts a new record into the `USER` table with `is_active = True` and `email_verified = False`.
    4. Generates a secure, cryptographically random activation token.
*   **SMTP Operation**: Sends an activation email containing a link:
    `https://wytnet.com/verify-email?token=activation_token_123`
*   **HTTP Response**:
    ```json
    {
      "id": "usr_9b1deb4d-3b7d-4b8c-9c5c-7d9d8e7f6g5h",
      "email": "user@domain.com",
      "full_name": "John Doe",
      "email_verified": false,
      "is_active": true,
      "created_at": "2026-05-19T11:30:00Z"
    }
    ```

---

### Step 1.2: Activation (Email Verification)
The user verifies their email address.

*   **Action**: User clicks the verification link in their email.
*   **HTTP Request**:
    ```http
    GET /v1/auth/verify-email?token=activation_token_123 HTTP/1.1
    Host: api.wytnet.com
    ```
*   **Database Operations**:
    1. Looks up the activation token.
    2. Sets `email_verified = True` in the matching `USER` record.
    3. Deletes the used activation token from the database.
*   **HTTP Response**:
    ```json
    {
      "status": "success",
      "message": "Email verified successfully. You can now log in."
    }
    ```

---

### Step 1.3: Authentication (Login & Sign-In)
The user logs into WytPass.

*   **Action**: User enters credentials and clicks **Log in**.
*   **HTTP Request**:
    ```http
    POST /v1/auth/login HTTP/1.1
    Host: api.wytnet.com
    Content-Type: application/json

    {
      "email": "user@domain.com",
      "password": "Password123!"
    }
    ```
*   **Database Verification**:
    1. Retrieves the user record for `user@domain.com`.
    2. Compares the hashed password:
       $$\text{VerifyPassword}(\text{"Password123!"}, \text{HashedPassword}) \stackrel{?}{=} \text{True}$$
*   **MFA Check Flow**:
    *   *If MFA is disabled*:
        *   Generates an Access Token and Refresh Token.
        *   Sets the **HTTP-only cookie** `access_token` and returns a JSON payload containing the bearer tokens.
    *   *If MFA is enabled*:
        *   Generates a temporary, short-lived `mfa_token`.
        *   **HTTP Response (MFA Intercept)**:
            ```json
            {
              "status": "mfa_required",
              "mfa_token": "temp_mfa_token_xyz"
            }
            ```
        *   User enters their 6-digit Authenticator code.
        *   **MFA Verification Request**:
            ```http
            POST /v1/auth/mfa/verify HTTP/1.1
            Host: api.wytnet.com
            Content-Type: application/json

            {
              "mfa_token": "temp_mfa_token_xyz",
              "totp_code": "584920"
            }
            ```
        *   The backend verifies the TOTP code against the registered secret. If valid, it issues the authentication cookies and response.
*   **Core Success HTTP Response**:
    ```json
    {
      "access_token": "eyJhbGciOiJSUzI1NiIs...",
      "refresh_token": "rt_8f7e6d5c...",
      "token_type": "bearer",
      "user": {
        "id": "usr_9b1deb4d...",
        "email": "user@domain.com",
        "full_name": "John Doe",
        "email_verified": true
      }
    }
    ```

---

### Step 1.4: Entering the Landing Page
After logging in, the user lands on the WytPass home dashboard.

*   **Action**: The frontend console loads `/explore` and makes a public API request to populate the list of connected applications.
*   **HTTP Request**:
    ```http
    GET /v1/clients/public HTTP/1.1
    Host: api.wytnet.com
    Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
    ```
*   **Database Query**: Finds all active applications registered on WytPass that are designated as public, excluding internal system tools:
    ```sql
    SELECT id, client_id, app_name, logo_url, redirect_uris, allowed_scopes, description 
    FROM oauth_client WHERE is_active = true;
    ```
*   **HTTP Response**:
    ```json
    [
      {
        "id": "cli_a8b7c6d5-e4f3-4a2b-1c0d-9e8f7a6b5c4d",
        "client_id": "client_Op_NU6V_ltuKC7OfnL4KGg",
        "app_name": "Vote Smart AI",
        "logo_url": "https://cdn.wytnet.com/logos/vote_smart.png",
        "redirect_uris": ["http://localhost:5173/callback"],
        "allowed_scopes": ["openid", "profile", "email"],
        "description": "Smart voting analyzer and reporting tool."
      }
    ]
    ```

---

### Step 1.5: Launching a Specific App (SSO Authorization)
The user selects a registered app from the landing page.

```mermaid
sequenceDiagram
    actor User as John Doe
    participant Client as Vote Smart AI (App)
    participant Portal as WytPass Portal
    participant Server as WytPass Backend
    database DB as PostgreSQL DB

    User->>Client: Clicks "Login with WytPass"
    Note over Client: Generates PKCE Verifier and Challenge
    Client->>Server: Redirects to /oauth/authorize with ClientID, Scope, and Challenge
    Note over Server: Validates Client ID, Redirect URIs, App Bans, and Credit Limits
    
    alt Needs User Consent
        Server-->>Portal: Redirects to /consent/authorize
        Portal->>User: Displays requested scopes consent screen
        User->>Portal: Clicks "Authorize Scopes"
        Portal->>Server: GET /oauth/authorize with consent approval
    end
    
    Server->>DB: Stores authorization code associated with User & Client ID
    Server-->>Client: 302 Redirect to redirect_uri?code=auth_code
```

*   **Action**: User clicks **Launch App** on the landing page for **Vote Smart AI**.
*   **Frontend Action**: The application generates a high-entropy string $V$ called the `code_verifier`, and hashes it to generate a `code_challenge` $C$:
    $$C = \text{Base64URL-Encode}(\text{SHA-256}(V))$$
*   **HTTP Request (SSO Init)**: Redirects the user's browser to WytPass's `/oauth/authorize` endpoint:
    ```http
    GET /oauth/authorize?response_type=code&client_id=client_Op_NU6V_ltuKC7OfnL4KGg&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fcallback&scope=openid+profile+email&code_challenge=8F9t_challenge_xyz&code_challenge_method=S256&state=portal_auth_state HTTP/1.1
    Host: api.wytnet.com
    Cookie: access_token=eyJhbGciOiJSUzI1NiIs...
    ```
*   **Backend Validations**:
    1. **Client Identity**: Resolves the client application by its ID and ensures the request's `redirect_uri` matches its registered redirect whitelist.
    2. **Ban Enforcement**: Checks the `AppBan` database table to ensure the user is not banned from this app:
       ```sql
       SELECT id FROM app_ban WHERE user_id = 'usr_9b1deb4d...' AND client_id = 'cli_a8b7c6d5...';
       ```
       *If banned*, redirects the user to `https://wytnet.com/banned?client_id=client_Op_NU6V_ltuKC7OfnL4KGg`.
    3. **Plan Credit Capacity**: Evaluates the developer's plan limits. If the developer is on a Free Plan and has exceeded their 2 unique user limit, redirects to `https://wytnet.com/banned?client_id=client_Op_NU6V_ltuKC7OfnL4KGg&reason=out_of_credits`.
    4. **Scope Consent Prompt**: If the user has not authorized this app before, redirects to WytPass's consent screen:
       `https://wytnet.com/consent/authorize?client_id=client_Op_NU6V_ltuKC7OfnL4KGg&scope=openid+profile+email...`
       *   The user reviews the scopes and clicks **Confirm Scopes**.
       *   Frontend redirects back to the backend with consent confirmed:
           `GET /oauth/authorize?response_type=code&client_id=...&confirm=true`
*   **Authorization Code Generation**: The backend generates a secure, short-lived 32-character authorization code (`code_5X8f...`), binds it to the user ID and PKCE code challenge, and redirects back to the client application:
    ```http
    HTTP/1.1 302 Found
    Location: http://localhost:5173/callback?code=code_5X8f_auth_code_xyz&state=portal_auth_state
    ```

---

### Step 1.6: Token Exchange Flow
The client application exchanges the authorization code for signed JWT tokens.

*   **Action**: The client application extracts the authorization code from the redirect URL and submits it directly to the WytPass token exchange endpoint.
*   **HTTP Request (Backchannel Exchange)**:
    ```http
    POST /oauth/token HTTP/1.1
    Host: api.wytnet.com
    Content-Type: application/x-www-form-urlencoded

    grant_type=authorization_code&code=code_5X8f_auth_code_xyz&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fcallback&client_id=client_Op_NU6V_ltuKC7OfnL4KGg&code_verifier=plain_text_pkce_verifier_v
    ```
*   **Backend Signature Validation & Exchange**:
    1. Consumes the authorization code in the database.
    2. Performs the **PKCE challenge validation**:
       $$\text{Base64URL-Encode}(\text{SHA-256}(\text{"plain\_text\_pkce\_verifier\_v"})) \stackrel{?}{=} \text{"8F9t\_challenge\_xyz"}$$
    3. Fetches the user profile from the database.
    4. Signs three tokens using its private RSA-256 certificate key:
        *   **Access Token**: To authenticate subsequent API requests.
        *   **OIDC ID Token**: A signed JWT containing user claims (`email`, `full_name`, `avatar_url`).
        *   **Refresh Token**: A long-lived token to request new access tokens.
*   **HTTP Response**:
    ```json
    {
      "access_token": "eyJhbGciOiJSUzI1NiIs...access_token_payload",
      "id_token": "eyJhbGciOiJSUzI1NiIs...id_token_payload",
      "refresh_token": "rt_48_character_token_string",
      "expires_in": 1800,
      "scope": "openid profile email"
    }
    ```

---

### Step 1.7: Post-Auth Profile & Revocation
The user manages their session security.

*   **Action**: The user opens their WytPass console profile page (`/profile`).
*   **HTTP Request**:
    ```http
    GET /v1/users/me/connected-apps HTTP/1.1
    Host: api.wytnet.com
    Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
    ```
*   **Database Query**: Finds all client apps this user has authorized:
    ```sql
    SELECT DISTINCT c.id, c.app_name, c.logo_url FROM oauth_client c 
    JOIN refresh_token r ON c.id = r.client_id 
    WHERE r.user_id = 'usr_9b1deb4d...' AND r.is_revoked = false;
    ```
*   **HTTP Response**: Returns a list of all active connected applications. The user can click **Revoke** for any application, which sends a request to revoke the app's refresh tokens and instantly terminate its access.

---

## 2. Chronological Developer Flow

This section details the developer journey, from program enrollment and application creation to managing capacity and billing.

```mermaid
graph TD
    A[2.1 Join Developer Program] -->|POST /plans/join-developer-program| B[2.2 Register Client App]
    B -->|POST /clients| C[2.3 Selective App User Banning]
    C -->|POST /clients/bans| D[2.4 App Credit Deductions]
    D -->|Credit Checks & Warnings| E[2.5 Razorpay Premium Upgrades]
    E -->|POST /plans/verify-razorpay-payment| F[Central Admin Controls]
```

### Step 2.1: Join Developer Program
A user signs up as a platform developer.

*   **Action**: User clicks **Join Developer Program** in their dashboard.
*   **HTTP Request**:
    ```http
    POST /v1/plans/join-developer-program HTTP/1.1
    Host: api.wytnet.com
    Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
    ```
*   **Database Operations**:
    1. Looks up the default `DEVELOPER` plan (Free plan with 2 user credits).
    2. Updates the user record, setting their `plan_id` to the Free plan ID.
    3. Finds or creates the `app_admin` role in the `ROLE` table.
    4. Inserts a record into the `USER_ROLE` table:
       ```sql
       INSERT INTO user_role (user_id, role_id) VALUES ('usr_9b1deb4d...', 'role_app_admin_id');
       ```
    5. Writes a ledger event to the `CreditLog` table.
*   **HTTP Response**:
    ```json
    {
      "status": "success",
      "message": "Welcome to the Developer Program!",
      "plan": "Free"
    }
    ```

---

### Step 2.2: Registering a Client Application
The developer registers a new client application.

*   **Action**: Developer fills out the app creation form and clicks **Create Application**.
*   **HTTP Request**:
    ```http
    POST /v1/clients HTTP/1.1
    Host: api.wytnet.com
    Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
    Content-Type: application/json

    {
      "app_name": "Madurai News Portal",
      "redirect_uris": [
        "https://madurainews.com/callback",
        "http://localhost:3000/callback"
      ],
      "allowed_scopes": ["openid", "profile", "email"],
      "require_pkce": true,
      "is_confidential": false
    }
    ```
*   **Database Operations**:
    1. Generates a secure, unique `client_id` string:
       `client_Op_NU6V_ltuKC7OfnL4KGg`
    2. Generates a secure random `client_secret` string.
    3. Hashes the secret using `bcrypt` to store it as `client_secret_hash` (used for confidential clients).
    4. Inserts the application details into the `OAUTH_CLIENT` table.
    5. Creates a record in the `CLIENT_ADMIN` table linking the user to the client app.
*   **HTTP Response**:
    ```json
    {
      "id": "cli_e3f2g1h0-i9j8...",
      "client_id": "client_Op_NU6V_ltuKC7OfnL4KGg",
      "client_secret": "wyt_secret_plain_text_secret_key_xyz",
      "app_name": "Madurai News Portal",
      "redirect_uris": ["https://madurainews.com/callback", "http://localhost:3000/callback"],
      "allowed_scopes": ["openid", "profile", "email"],
      "require_pkce": true,
      "is_confidential": false,
      "credits_used": 0
    }
    ```

---

### Step 2.3: Selective App User Banning
A developer blocks a compromised user from accessing their application.

*   **Action**: Developer goes to their app's user list in the dashboard and clicks **Ban** next to a user's email.
*   **HTTP Request**:
    ```http
    POST /v1/clients/cli_e3f2g1h0-i9j8.../bans HTTP/1.1
    Host: api.wytnet.com
    Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
    Content-Type: application/json

    {
      "user_id": "usr_compromised_member_uuid"
    }
    ```
*   **Database Operations**: Inserts a record into the `APP_BAN` table:
    ```sql
    INSERT INTO app_ban (user_id, client_id) VALUES ('usr_compromised_member_uuid', 'cli_e3f2g1h0-i9j8...');
    ```
*   **HTTP Response**:
    ```json
    {
      "status": "success",
      "message": "User has been banned from accessing Madurai News Portal."
    }
    ```

---

### Step 2.4: App Credit Deductions & Capacity Monitoring
WytPass enforces dynamic limit checks during SSO actions.

#### 1. Real-Time Credit Evaluation (`check_credits`)
When a user launches an application, the backend checks the client's credits capacity:
```python
# 1. Fetches the plan associated with the client (default to Free Plan if none exists).
# 2. Free Plan sets credits_limit = 2 (2 unique user capacity).
# 3. Queries the database to find all unique user IDs that have authenticated with this client app:
stmt = select(union_all(
    select(RefreshToken.user_id),
    select(AccessToken.user_id),
    select(AuthorizationCode.user_id)
).alias("all_auths"))
# 4. Compiles the unique set of user IDs in order of their first appearance:
ordered_authorized_users = ['usr_user_1', 'usr_user_2']

# 5. Evaluates access permissions:
if user_id in ['usr_user_1', 'usr_user_2']:
    return True # User already registered - access allowed
elif len(ordered_authorized_users) >= 2:
    return False # App is at capacity - block access for new users
else:
    return True # Room for new user - access allowed
```

#### 2. Deducting Credit for New Users (`deduct_credit`)
If a new user logs in and the app has remaining capacity:
1. Increments `credits_used` in the application record.
2. Writes a record to the `CreditLog` table:
   ```sql
   INSERT INTO credit_log (owner_id, client_id, app_name, target_user_email, event_type, credits_change) 
   VALUES ('usr_developer_id', 'client_Op_NU6V_ltuKC7OfnL4KGg', 'Madurai News Portal', 'new_user@domain.com', 'trust_login', -1);
   ```
3. Checks if usage has reached the **80% warning threshold**:
   $$\text{Threshold} = 2 \times 0.80 = 1.6 \implies 2 \text{ users}$$
4. If the threshold is reached, WytPass sends an automated warning email to the developer:
   *   **Recipient**: `developer@domain.com`
   *   **Subject**: *Credit Usage Warning: Madurai News Portal*
   *   **Body**: *"Your app has reached 100% of its logins limit on the Free Plan. Upgrade your plan to prevent service disruption."*

---

### Step 2.5: Upgrading using Razorpay Checkout
A developer upgrades their application or workspace to the **Unlimited** plan.

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant Portal as WytPass Console
    participant Backend as WytPass Backend
    participant Razorpay as Razorpay API

    Dev->>Portal: Clicks "Upgrade to Unlimited Plan (₹1)"
    Portal->>Backend: POST /plans/create-razorpay-order
    Backend->>Razorpay: Creates Order (100 paise)
    Razorpay-->>Backend: Returns order_id
    Backend-->>Portal: Returns order_id, amount, key_id
    Portal->>Dev: Opens Razorpay checkout widget
    Dev->>Portal: Enters payment details & clicks "Pay Now"
    Portal->>Backend: POST /plans/verify-razorpay-payment
    Note over Backend: Verifies signature using HMAC-SHA256
    Backend->>Backend: Upgrades application plan to Unlimited
    Backend-->>Portal: 200 OK (Upgrade Success)
```

#### 1. Initialize Razorpay Order
The developer initiates the upgrade transaction.
*   **Action**: Developer clicks **Upgrade Workspace to Unlimited (₹1)**.
*   **HTTP Request**:
    ```http
    POST /v1/plans/create-razorpay-order?plan_id=unlimited_plan_uuid HTTP/1.1
    Host: api.wytnet.com
    Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
    ```
*   **Backend Processing**:
    1. Looks up the Unlimited plan (price: ₹1.00).
    2. Converts the price to paise (₹1.00 = 100 paise).
    3. Calls the Razorpay API to create an order:
       ```python
       client.order.create(data={
           "amount": 100,
           "currency": "INR",
           "receipt": "receipt_developer_837482"
       })
       ```
*   **HTTP Response**:
    ```json
    {
      "order_id": "order_RZP9384729384",
      "amount": 100,
      "currency": "INR",
      "key_id": "rzp_test_public_key_123"
    }
    ```

#### 2. Process & Verify Payment
The checkout widget processes the payment and verifies the transaction.
*   **Action**: The frontend displays the Razorpay payment widget. The developer completes the payment, and the widget returns transaction parameters.
*   **HTTP Request (Payment Verification)**:
    ```http
    POST /v1/plans/verify-razorpay-payment HTTP/1.1
    Host: api.wytnet.com
    Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
    Content-Type: application/json

    {
      "plan_id": "unlimited_plan_uuid",
      "razorpay_order_id": "order_RZP9384729384",
      "razorpay_payment_id": "pay_RZP_payment_8392",
      "razorpay_signature": "cryptographic_hmac_signature_proof",
      "target_client_id": "cli_e3f2g1h0-i9j8..."
    }
    ```
*   **Signature Verification**: The backend validates the signature using its secret key:
    $$\text{ComputedSignature} = \text{HMAC-SHA256}(\text{"order\_RZP9384729384|pay\_RZP\_payment\_8392"}, \text{razorpay\_key\_secret})$$
    $$\text{ComputedSignature} \stackrel{?}{=} \text{"cryptographic\_hmac\_signature\_proof"}$$
*   **Upgrade Operations**:
    1. If upgrading a single app, sets `plan_id` to the Unlimited plan in the application record. If upgrading the entire account, sets the user's `plan_id` and updates all owned applications.
    2. Writes a ledger entry to the `CreditLog` table:
       ```sql
       INSERT INTO credit_log (owner_id, event_type, description, credits_change) 
       VALUES ('usr_developer_id', 'plan_upgrade', 'Upgraded Madurai News Portal to Unlimited (Paid ₹1.00)', 0);
       ```
    3. Writes a security log to the `AuditLog` table.
*   **HTTP Response**:
    ```json
    {
      "status": "success",
      "message": "Successfully upgraded to Unlimited Plan."
    }
    ```

---

## 3. central Platform Admin Controls

Administrators manage system governance, enforce user suspensions, and audit security events.

### Step 3.1: Global User Suspensions
An administrator suspends a user account.

*   **Action**: Administrator goes to the user directory in their dashboard and clicks **Deactivate**.
*   **HTTP Request**:
    ```http
    PATCH /v1/users/usr_9b1deb4d.../deactivate HTTP/1.1
    Host: api.wytnet.com
    Authorization: Bearer eyJhbGciOiJSUzI1NiIs_admin_token...
    ```
*   **Database Operations**: Updates the target user record, setting `is_active = False` in the `USER` table.
*   **HTTP Response**: Returns the updated user record. The suspended user is instantly blocked from authenticating or generating SSO tokens.

---

### Step 3.2: Central Force Logout
An administrator revokes all active sessions for a user.

*   **Action**: Administrator selects a compromised user profile and clicks **Force Logout**.
*   **HTTP Request**:
    ```http
    POST /v1/users/usr_9b1deb4d.../force-logout HTTP/1.1
    Host: api.wytnet.com
    Authorization: Bearer eyJhbGciOiJSUzI1NiIs_admin_token...
    ```
*   **Central Session Revocation**:
    1. Looks up the target user's active records in the `SESSION`, `REFRESH_TOKEN`, and `ACCESS_TOKEN` tables.
    2. Updates all matching records, setting `is_revoked = True` or `is_expired = True`.
    3. Writes a log of the action to the `AuditLog` table:
       ```sql
       INSERT INTO audit_log (user_id, event_type, ip_address, metadata) 
       VALUES ('usr_9b1deb4d...', 'user.force_logout', '192.168.1.1', '{"actor_id": "admin_uuid", "sessions_revoked": 4}');
       ```
*   **HTTP Response**:
    ```json
    {
      "force_logged_out": true,
      "sessions_revoked": 4,
      "refresh_tokens_revoked": 3,
      "access_tokens_revoked": 3
    }
    ```
