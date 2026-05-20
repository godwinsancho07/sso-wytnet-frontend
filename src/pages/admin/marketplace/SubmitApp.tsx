import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Plus, AlertCircle, Copy, Check, Terminal, ExternalLink, 
  Globe, Key, Lock, Mail, Server, RefreshCw, Send, CheckCircle2, 
  XCircle, ArrowRight, Play, Database, CreditCard, Layout, Eye, Settings, HelpCircle
} from 'lucide-react';
import saasApi from '@/services/saasApi';
import api from '@/services/api';

export default function SubmitApp() {
  const [apps, setApps] = useState<any[]>([]);
  const [activeApp, setActiveApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Tab/Step status overrides for developer sandbox simulation
  const [activeStep, setActiveStep] = useState(1);

  // Form State - Step 1: Submit App
  const [appName, setAppName] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [appCategory, setAppCategory] = useState('Utility');
  const [appDesc, setAppDesc] = useState('');
  const [appSupport, setAppSupport] = useState('');
  const [appPrivacy, setAppPrivacy] = useState('');
  const [appSSO, setAppSSO] = useState(false);
  const [appScreenshots, setAppScreenshots] = useState<string[]>(['', '']);

  // State - Step 3: Pick a Plan
  const [selectedPlan, setSelectedPlan] = useState('growth');

  // State - Payout details in Step 3
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  // State - Step 4: Sign Agreement
  const [agreedRevShare, setAgreedRevShare] = useState(false);
  const [agreedSecurity, setAgreedSecurity] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);

  // State - Step 5: Get Credentials
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // State - Step 6: Webhook Integration & Sandbox
  const [webhookUrl, setWebhookUrl] = useState('');
  const [sandboxUserId, setSandboxUserId] = useState('USR_123456');
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [integrationTab, setIntegrationTab] = useState<'backend' | 'frontend'>('backend');
  const [selectedBoilerplateFile, setSelectedBoilerplateFile] = useState<'fastapi' | 'express' | 'react_sso' | 'axios'>('fastapi');

  // State - Step 7: Submit for Publish
  const [adminNotes, setAdminNotes] = useState('');
  
  // State - Step 8: Live dashboard stats (fetched from API)
  const [stats, setStats] = useState({
    usersToday: 0,
    totalRevenue: 0,
    activeSubs: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);

  const loadLiveStats = async () => {
    setStatsLoading(true);
    try {
      const res = await saasApi.get('/api/v1/marketplace/developer/revenue');
      const d = res.data || {};
      setStats({
        usersToday: d.active_subs || 0,
        totalRevenue: parseFloat(d.gross || '0') * 83, // convert USD → INR approx
        activeSubs: d.active_subs || 0,
      });
    } catch {
      // keep zeroes
    } finally {
      setStatsLoading(false);
    }
  };

  const isProd = window.location.hostname.endsWith('wytsaas.com') || window.location.hostname.endsWith('wytnet.com');
  const ssoFrontendUrl = isProd ? 'https://wytnet.com' : 'http://localhost:3000';
  const ssoBackendUrl = isProd ? 'https://api.wytnet.com' : 'http://localhost:8000';
  const saasBackendUrl = isProd ? 'https://api.wytsaas.com' : 'http://localhost:8001';

  const loadPayoutDetails = async () => {
    try {
      const res = await saasApi.get('/api/v1/marketplace/developer/revenue');
      const details = res.data.payout_details;
      if (details) {
        setBankName(details.bank_name || '');
        setAccountNumber(details.account_number || '');
        setAccountHolder(details.account_holder || '');
        setIfscCode(details.ifsc_code || '');
        setUpiId(details.upi_id || '');
      }
    } catch (err) {
      console.error('Failed to load payout details:', err);
    }
  };

  const loadApps = async () => {
    try {
      setLoading(true);
      const res = await saasApi.get('/api/v1/marketplace/listings/my-apps');
      const data = Array.isArray(res.data) ? res.data : [];
      setApps(data);
      if (data.length > 0) {
        // If there's an active app, choose the first or select the last worked one
        const chosen = data[data.length - 1];
        await handleSelectApp(chosen);
      } else {
        setActiveApp(null);
        setActiveStep(1);
      }
      await loadPayoutDetails();
    } catch (err: any) {
      console.error('Failed to load apps:', err);
      setError('Failed to connect to the marketplace backend. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
  }, []);

  const handleSelectApp = async (app: any) => {
    try {
      const res = await saasApi.get(`/api/v1/marketplace/listings/${app.id}/status`);
      const details = res.data;
      setActiveApp(details);
      
      // Update form values if selecting another app
      setWebhookUrl(details.credentials?.webhook_url || '');
      
      // Load Webhook logs for step 6/8
      if (details.credentials) {
        const logsRes = await saasApi.get(`/api/v1/marketplace/listings/${app.id}/webhook-logs`);
        setWebhookLogs(logsRes.data || []);
      }

      // Map backend status to active developer UI Step (1-7)
      // "pending_review", "approved", "rejected", "integration_pending", "publish_pending", "live", "suspended"
      const status = details.app.status;
      if (status === 'pending_review' || status === 'rejected') {
        setActiveStep(2);
      } else if (status === 'approved') {
        if (!details.plan || !details.plan.agreement_signed) {
          setActiveStep(3); // Step 3: Sign Publisher Agreement (flat 80% split)
        } else {
          setActiveStep(4); // Step 4: Get Secure Credentials
        }
      } else if (status === 'integration_pending') {
        setActiveStep(5); // Step 5: Integrate WytSaaS SDK
      } else if (status === 'publish_pending') {
        setActiveStep(6); // Step 6: Submit for Publication
      } else if (status === 'live' || status === 'suspended') {
        setActiveStep(7); // Step 7: Live on Store (Dashboard)
        loadLiveStats(); // fetch real stats when on live dashboard
      }
    } catch (err) {
      console.error('Failed to select app details:', err);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadDocs = () => {
    const docContent = `# WytSaaS SDK & Integration Documentation

This document describes how to integrate the WytSaaS Marketplace subscription engine and WytPass SSO (Single Sign-On) authentication into your custom applications.

---

## 1. Authentication Credentials
Add these parameters to your backend/frontend \`.env\` environment configuration:

\`\`\`env
# Identification & API Credentials
WYTSAAS_APP_ID=${activeApp?.credentials?.app_key || 'APP_ID'}
WYTSAAS_API_KEY=${activeApp?.credentials?.api_key || 'API_KEY'}
WYTSAAS_WEBHOOK_SECRET=${activeApp?.credentials?.webhook_secret || 'WEBHOOK_SECRET'}
WYTSAAS_API_BASE=${saasBackendUrl}
\`\`\`

---

## 2. Backend Webhook Integration

### Python (FastAPI)
Create a route to handle signed POST webhook notifications from WytSaaS:

\`\`\`python
import os, hmac, hashlib, json
from fastapi import APIRouter, Request, HTTPException, Header
from typing import Optional

router = APIRouter()
WEBHOOK_SECRET = os.getenv("WYTSAAS_WEBHOOK_SECRET", "")

@router.post("/webhooks/wytsaas")
async def wytsaas_webhook(request: Request, x_wytsaas_signature: Optional[str] = Header(None)):
    payload = await request.body()
    
    # Calculate signature
    expected = hmac.new(WEBHOOK_SECRET.encode(), payload, hashlib.sha256).hexdigest()
    if x_wytsaas_signature and not hmac.compare_digest(expected, x_wytsaas_signature.removeprefix("sha256=")):
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = json.loads(payload)
    event = data.get("event")
    user_id = data.get("user_id")

    if event == "subscription.created":
        # TODO: Activate Premium Features for this user
        pass
    elif event == "subscription.cancelled":
        # TODO: Suspend Premium Features
        pass

    return {"status": "received"}
\`\`\`

### Node.js (Express)
\`\`\`javascript
const crypto = require("crypto");

app.post("/webhooks/wytsaas", express.raw({ type: "*/*" }), (req, res) => {
  const sig = req.headers["x-wytsaas-signature"] || "";
  const expected = "sha256=" + crypto.createHmac("sha256", process.env.WYTSAAS_WEBHOOK_SECRET).update(req.body).digest("hex");
  
  if (sig !== expected) return res.status(401).send("Bad signature");
  
  const { event, user_id } = JSON.parse(req.body);
  if (event === "subscription.created") {
    // grant access
  } else if (event === "subscription.cancelled") {
    // revoke access
  }
  res.json({ status: "received" });
});
\`\`\`

---

## 3. Frontend SSO Integration (WytPass)

### Option A: React + Custom SSO Callback
Redirection URL structure for PKCE OAuth auth flow:
\`\`\`javascript
const handleLogin = () => {
  const ssoUrl = "${ssoFrontendUrl}";
  const redirectUri = window.location.origin + "/callback";
  const params = new URLSearchParams({
    response_type: "code",
    client_id: "${activeApp?.credentials?.app_key || 'CLIENT_ID'}",
    redirect_uri: redirectUri,
    scope: "openid profile email",
    state: "random_state_string",
    code_challenge: "your_pkce_challenge",
    code_challenge_method: "S256"
  });
  window.location.href = \`\${ssoUrl}/consent/authorize?\${params}\`;
};
\`\`\`

### Option B: NextAuth.js Custom Provider (Next.js)
Define a custom OAuth provider inside your NextAuth configuration:

\`\`\`javascript
import NextAuth from "next-auth";

export const authOptions = {
  providers: [
    {
      id: "wytpass",
      name: "WytPass SSO",
      type: "oauth",
      authorization: {
        url: "${ssoFrontendUrl}/consent/authorize",
        params: { scope: "openid profile email" }
      },
      token: "${ssoBackendUrl}/oauth/token",
      userinfo: "${ssoBackendUrl}/oauth/userinfo",
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture
        }
      }
    }
  ]
};
export default NextAuth(authOptions);
\`\`\`

### Option C: Axios Authorization Interceptor
Automatically pass the verified Access Token bearer header to all API requests:

\`\`\`javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VITE_API_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = \`Bearer \${token}\`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
\`\`\`

---

## 4. Complete Boilerplate Files

### wytsaas_webhook.py (Complete FastAPI integration controller)
\`\`\`python
import os, hmac, hashlib, json
from fastapi import APIRouter, Request, HTTPException, Header, Depends

router = APIRouter(prefix="/webhooks", tags=["WytSaaS Webhook"])
WEBHOOK_SECRET = os.getenv("WYTSAAS_WEBHOOK_SECRET", "")

@router.post("/wytsaas")
async def handle_marketplace_webhook(
    request: Request,
    x_wytsaas_signature: str = Header(None)
):
    """
    Receives events from the WytSaaS Marketplace subscription engine.
    Verifies HMAC sha256 headers before updating user features.
    """
    payload = await request.body()
    if not x_wytsaas_signature:
        raise HTTPException(status_code=400, detail="Missing signature header")

    # Cryptographic signature validation
    expected_sig = hmac.new(WEBHOOK_SECRET.encode(), payload, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_sig, x_wytsaas_signature.removeprefix("sha256=")):
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = json.loads(payload)
    event_type = data.get("event")
    user_id = data.get("user_id")

    if event_type == "subscription.created":
        print(f"User {user_id} subscribed! Granting Premium features...")
        # db.query(User).filter(id=user_id).update({is_premium: True})
    elif event_type == "subscription.cancelled":
        print(f"User {user_id} cancelled. Revoking Premium features.")
        # db.query(User).filter(id=user_id).update({is_premium: False})

    return {"status": "received"}
\`\`\`

### wytsaas_webhook.js (Complete Node.js/Express integration controller)
\`\`\`javascript
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const WEBHOOK_SECRET = process.env.WYTSAAS_WEBHOOK_SECRET || '';

router.post('/wytsaas', express.raw({ type: '*/*' }), (req, res) => {
  const signature = req.headers['x-wytsaas-signature'] || '';
  if (!signature) return res.status(400).send('Missing signature header');

  const expected = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(req.body)
    .digest('hex');

  if (signature !== expected) return res.status(401).send('Signature verification failed');

  try {
    const payload = JSON.parse(req.body.toString());
    const { event, user_id } = payload;

    if (event === 'subscription.created') {
      console.log(\`User \${user_id} subscribed! Granting Premium features...\`);
    } else if (event === 'subscription.cancelled') {
      console.log(\`User \${user_id} cancelled. Revoking Premium features.\`);
    }
    return res.json({ status: 'received', event });
  } catch (err) {
    return res.status(400).send('Invalid JSON format');
  }
});

module.exports = router;
\`\`\`

### wytpass_sso.js (PKCE OAuth Frontend Setup)
\`\`\`javascript
export const generateVerifier = () => {
  const array = new Uint32Array(56);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
};

export const generateChallenge = async (verifier) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\\+/g, '-')
    .replace(/\\//g, '_')
    .replace(/=/g, '');
};

export const initiateLoginRedirect = async (clientId, ssoUrl, redirectUri) => {
  const verifier = generateVerifier();
  const challenge = await generateChallenge(verifier);
  const state = crypto.randomUUID();

  sessionStorage.setItem('pkce_verifier', verifier);
  sessionStorage.setItem('oauth_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    state: state,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  });

  window.location.href = \`\${ssoUrl}/consent/authorize?\${params}\`;
};
\`\`\`
`;

    const blob = new Blob([docContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeApp?.app?.title || 'wytnet'}_wytsaas_integration_guide.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file size must be less than 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const newScreenshots = [...appScreenshots];
        newScreenshots[index] = base64String;
        setAppScreenshots(newScreenshots);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit App Form - Step 1
  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appSSO) {
      setError('You must integrate and confirm WytPass SSO support before listing.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await saasApi.post('/api/v1/marketplace/listings/submit', {
        name: appName,
        url: appUrl,
        category: appCategory,
        description: appDesc,
        support_email: appSupport,
        privacy_policy_url: appPrivacy,
        screenshots: appScreenshots.filter(s => s !== ''),
        wytpass_integrated: appSSO
      });
      setSuccessMsg('Your SaaS Application listing details have been saved!');
      
      // Clean form
      setAppName('');
      setAppUrl('');
      setAppDesc('');
      setAppSupport('');
      setAppPrivacy('');
      setAppSSO(false);
      
      await loadApps();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit application details.');
    } finally {
      setLoading(false);
    }
  };

  // Simulate Admin Approving App - Step 2 (Developer simulation helper)
  const handleSimulateApproval = async () => {
    if (!activeApp) return;
    setError('');
    try {
      // Direct call to admin approve endpoint to fast-track state!
      await saasApi.post(`/api/v1/admin/marketplace/${activeApp.app.id}/approve`, {
        notes: "Automated simulation check passed"
      });
      setSuccessMsg('Simulator Triggered: Admin has Approved the App details!');
      await handleSelectApp(activeApp.app);
    } catch (err: any) {
      setError('Simulation trigger failed. Please check backend.');
    }
  };

  // Select Plan - Step 3
  const handleSelectPlan = async () => {
    if (!activeApp) return;
    setError('');
    try {
      await saasApi.post(`/api/v1/marketplace/listings/${activeApp.app.id}/select-plan`, {
        plan_id: selectedPlan
      });
      setSuccessMsg(`Plan "${selectedPlan.toUpperCase()}" selected successfully.`);
      await handleSelectApp(activeApp.app);
    } catch (err) {
      setError('Failed to select plan');
    }
  };

  // Sign Agreement - Step 3 (Saves selected app tier & signs terms)
  const handleSignAgreement = async () => {
    if (!activeApp) return;
    if (!agreedRevShare || !agreedSecurity || !agreedTerms) {
      setError('Please accept all legal agreement sections to proceed.');
      return;
    }

    // Validate payout details
    const hasBank = bankName.trim() && accountHolder.trim() && accountNumber.trim() && ifscCode.trim();
    const hasUpi = upiId.trim();
    if (!hasBank && !hasUpi) {
      setError('Please provide either your Bank Account details or a UPI ID to configure your payout settings.');
      return;
    }
    if (bankName.trim() || accountHolder.trim() || accountNumber.trim() || ifscCode.trim()) {
      if (!bankName.trim() || !accountHolder.trim() || !accountNumber.trim() || !ifscCode.trim()) {
        setError('If configuring a Bank Account, all fields (Bank Name, Holder Name, Account Number, IFSC) must be filled.');
        return;
      }
    }

    setError('');
    try {
      // 1. Save developer payment/payout details automatically
      await saasApi.post('/api/v1/marketplace/developer/payment-details', {
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_holder: accountHolder.trim(),
        ifsc_code: ifscCode.trim(),
        upi_id: upiId.trim()
      });

      // 2. Submit chosen end-user plan for the app
      await saasApi.post(`/api/v1/marketplace/listings/${activeApp.app.id}/select-plan`, {
        plan_id: selectedPlan
      });
      
      // 3. Sign publisher agreement
      await saasApi.post(`/api/v1/marketplace/listings/${activeApp.app.id}/sign-agreement`);
      setSuccessMsg('Agreement signed. Secure API keys and credentials have been issued.');
      await handleSelectApp(activeApp.app);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to complete signature handshake.');
    }
  };

  // Update Webhook Endpoint - Step 6
  const handleSaveWebhook = async () => {
    if (!activeApp) return;
    if (!webhookUrl) {
      setError('Please provide a valid webhook URL endpoint');
      return;
    }
    setError('');
    try {
      await saasApi.post(`/api/v1/marketplace/listings/${activeApp.app.id}/set-webhook`, {
        webhook_url: webhookUrl
      });
      setSuccessMsg('Webhook endpoint registered successfully.');
      await handleSelectApp(activeApp.app);
    } catch (err) {
      setError('Failed to update webhook URL.');
    }
  };

  // Trigger simulated purchase event - Step 6
  const handleFireTestPurchase = async () => {
    if (!activeApp) return;
    setTestingWebhook(true);
    setError('');
    try {
      await saasApi.post(`/api/v1/marketplace/listings/${activeApp.app.id}/simulate-webhook`);
      setSuccessMsg('Webhook payload signed and dispatched! Inspect results below.');
      
      // Reload logs after 1.5 seconds to capture transaction status
      setTimeout(async () => {
        const logsRes = await saasApi.get(`/api/v1/marketplace/listings/${activeApp.app.id}/webhook-logs`);
        setWebhookLogs(logsRes.data || []);
        setTestingWebhook(false);
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to dispatch simulation event.');
      setTestingWebhook(false);
    }
  };

  // Execute Sandbox Verification Lookup API - Step 6
  const handleExecuteSandboxVerify = async () => {
    if (!activeApp || !activeApp.credentials) return;
    setError('');
    try {
      const apiRes = await saasApi.get('/api/v1/marketplace/verify', {
        params: {
          app_id: activeApp.credentials.app_key,
          user_id: sandboxUserId
        },
        headers: {
          Authorization: `Bearer ${activeApp.credentials.api_key}`
        }
      });
      setSandboxResult(apiRes.data);
    } catch (err: any) {
      setSandboxResult({ error: err.response?.data?.detail || 'Verification request rejected (401 Unauthorized).' });
    }
  };

  // Submit for publish - Step 7
  const handleNotifyPublishReady = async () => {
    if (!activeApp) return;
    setError('');
    try {
      await saasApi.post(`/api/v1/marketplace/listings/${activeApp.app.id}/notify-ready`);
      setSuccessMsg('App marked as ready. Admin has been alerted for final verification.');
      await handleSelectApp(activeApp.app);
    } catch (err) {
      setError('Failed to submit publication notification.');
    }
  };

  // Fast track simulate published by Admin - Step 7 (Developer simulator helper)
  const handleSimulatePublish = async () => {
    if (!activeApp) return;
    setError('');
    try {
      await saasApi.post(`/api/v1/admin/marketplace/${activeApp.app.id}/publish`, {
        notes: "Sandbox publish validation complete"
      });
      setSuccessMsg('Simulator Triggered: Admin verified and published the app to marketplace!');
      await handleSelectApp(activeApp.app);
    } catch (err) {
      setError('Publish simulation failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-gray-100 p-8 font-sans selection:bg-blue-500 selection:text-white">
      {/* Upper Navigation Panel */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between border-b border-gray-800/80 pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/10">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                WytSaaS Developer Portal
                <span className="text-[10px] uppercase font-bold tracking-widest bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Marketplace</span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">List, monetize, and scale your applications with instant WytPass SSO integration</p>
            </div>
          </div>
        </div>

        {/* Workspace App Selection Dropdown */}
        <div className="flex items-center gap-3">
          {apps.length > 0 && (
            <div className="flex items-center gap-2 bg-[#121218] border border-gray-800 px-3 py-1.5 rounded-xl">
              <span className="text-xs text-gray-400">Workspace App:</span>
              <select
                value={activeApp ? activeApp.app.id : ''}
                onChange={(e) => {
                  const target = apps.find(a => a.id === e.target.value);
                  if (target) handleSelectApp(target);
                }}
                className="bg-transparent text-sm font-semibold text-white focus:outline-none border-none cursor-pointer"
              >
                {apps.map(a => (
                  <option key={a.id} value={a.id} className="bg-[#121218] text-white">
                    {a.name} ({a.status})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <button
            onClick={() => {
              setActiveApp(null);
              setActiveStep(1);
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-600/10"
          >
            <Plus className="w-3.5 h-3.5" />
            Submit New App
          </button>
        </div>
      </div>

      {/* Notifications Alert Container */}
      <div className="max-w-7xl mx-auto space-y-4 mb-6">
        {error && (
          <div className="bg-red-950/40 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
            <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Primary Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Steps Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-2 bg-[#101015]/80 border border-gray-800/80 p-5 rounded-2xl h-fit">
          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 px-1">Flow Progress Steps</span>
          
          {[
            { step: 1, title: 'Submit App', desc: 'App details & SSO confirm' },
            { step: 2, title: 'Under Review', desc: 'Awaiting admin screening' },
            { step: 3, title: 'Select Plan & Sign', desc: 'Set price & accept terms' },
            { step: 4, title: 'Get Credentials', desc: 'App keys & secrets' },
            { step: 5, title: 'Integrate WytSaaS', desc: 'Endpoints & API validation' },
            { step: 6, title: 'Submit for Publish', desc: 'Ready notifications' },
            { step: 7, title: 'Live on Store', desc: 'Sales & user insights' }
          ].map((item) => {
            const isCompleted = activeApp && (
              (item.step === 1 && activeApp.app) ||
              (item.step === 2 && activeApp.app.status !== 'pending_review' && activeApp.app.status !== 'rejected') ||
              (item.step === 3 && activeApp.plan?.agreement_signed) ||
              (item.step === 4 && activeApp.credentials) ||
              (item.step === 5 && activeApp.credentials?.webhook_url) ||
              (item.step === 6 && activeApp.app.status === 'live')
            );
            
            const isActive = activeStep === item.step;
            
            return (
              <button
                key={item.step}
                disabled={!activeApp && item.step > 1}
                onClick={() => setActiveStep(item.step)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left border ${
                  isActive 
                    ? 'bg-blue-600/10 border-blue-500/30 text-white' 
                    : isCompleted 
                    ? 'bg-emerald-950/5 border-emerald-900/10 text-gray-400 hover:bg-gray-800/20' 
                    : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <div className="mt-0.5">
                  {isCompleted ? (
                    <div className="w-5 h-5 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-emerald-400" />
                    </div>
                  ) : (
                    <div className={`w-5 h-5 rounded-full border text-[10px] font-bold flex items-center justify-center ${
                      isActive 
                        ? 'bg-blue-600 border-blue-400 text-white' 
                        : 'bg-gray-900 border-gray-800 text-gray-400'
                    }`}>
                      {item.step}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className={`text-xs font-semibold leading-tight ${isActive ? 'text-white' : 'text-gray-300'}`}>
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-none">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Active Step Form View */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* STEP 1: Submit App Form */}
          {activeStep === 1 && (
            <div className="bg-[#121218] border border-gray-800 p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Step 1: Submit Your Application</h3>
                <p className="text-xs text-gray-400 mt-1">Submit your SaaS application's identity parameters to initiate administrative reviews.</p>
              </div>

              <form onSubmit={handleCreateApp} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">App Name</label>
                    <input
                      type="text"
                      placeholder="e.g. WytCRM Pro"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">App Landing URL</label>
                    <input
                      type="url"
                      placeholder="https://acme-crm.com"
                      value={appUrl}
                      onChange={(e) => setAppUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Category</label>
                    <select
                      value={appCategory}
                      onChange={(e) => setAppCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Utility">Utility</option>
                      <option value="CRM & Sales">CRM & Sales</option>
                      <option value="Finance">Finance</option>
                      <option value="Productivity">Productivity</option>
                      <option value="Marketing">Marketing</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Support Contact Email</label>
                    <input
                      type="email"
                      placeholder="support@acme-crm.com"
                      value={appSupport}
                      onChange={(e) => setAppSupport(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">
                    Privacy Policy URL <span className="text-gray-600 normal-case font-normal">(optional)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://acme-crm.com/privacy"
                    value={appPrivacy}
                    onChange={(e) => setAppPrivacy(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Short Description</label>
                  <textarea
                    placeholder="Provide a engaging description of your app, key offerings and who it serves..."
                    value={appDesc}
                    onChange={(e) => setAppDesc(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                {/* Screenshots Upload */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">App Screenshots (Upload Images)</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[0, 1].map((index) => (
                      <div key={index} className="relative">
                        {appScreenshots[index] ? (
                          <div className="relative group w-full h-32 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-inner">
                            <img 
                              src={appScreenshots[index]} 
                              alt={`Screenshot ${index + 1}`} 
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <label className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2.5 py-1 rounded cursor-pointer transition-colors">
                                Change Image
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={(e) => handleFileChange(e, index)} 
                                  className="hidden" 
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newScreenshots = [...appScreenshots];
                                  newScreenshots[index] = '';
                                  setAppScreenshots(newScreenshots);
                                }}
                                className="bg-red-650 hover:bg-red-750 text-white text-[10px] font-bold px-2.5 py-1 rounded transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-32 border border-dashed border-gray-800 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-xl cursor-pointer transition-all group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <div className="p-2 bg-gray-900 rounded-lg group-hover:bg-blue-600/10 group-hover:text-blue-400 transition-colors mb-2 text-gray-400">
                                <Plus className="w-5 h-5" />
                              </div>
                              <p className="text-xs text-gray-450 font-semibold">Upload Screenshot {index + 1}</p>
                              <p className="text-[10px] text-gray-600 mt-1">PNG, JPG up to 5MB</p>
                            </div>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => handleFileChange(e, index)} 
                              className="hidden" 
                            />
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* SSO Handshake checkmark */}
                <div className="bg-[#181824] border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="confirmSSO"
                    checked={appSSO}
                    onChange={(e) => setAppSSO(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded accent-blue-500"
                  />
                  <label htmlFor="confirmSSO" className="text-xs text-gray-300 leading-normal cursor-pointer select-none">
                    <span className="font-bold text-white block">Integrate WytPass SSO Handshake</span>
                    I confirm this application registers and identifies incoming users via the unified WytPass OAuth v2 protocol, validating JWT RS256 token formats on all active routes.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {loading ? 'Registering app...' : 'Submit Application'}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: Under Review Queue */}
          {activeStep === 2 && activeApp && (
            <div className="bg-[#121218] border border-gray-800 p-6 rounded-2xl space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Step 2: Security & Identity Audit</h3>
                  <p className="text-xs text-gray-400 mt-1">Our platform team is auditing your listing parameters to verify safety compliance.</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-amber-400 text-xs font-bold animate-pulse">
                  Under Audit
                </div>
              </div>

              {/* Status checklist */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 space-y-3.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 block">Pending Verification Checklist</span>
                
                {[
                  { label: 'Application is active and accessible via URL', status: 'pending' },
                  { label: 'Description matches app features', status: 'pending' },
                  { label: 'Verified non-compromised screenshots', status: 'pending' },
                  { label: 'Support email is operational and reachable', status: 'pending' },
                  { label: 'Privacy Policy URL is present and compliant', status: 'pending' },
                  { label: 'Zero malicious or harmful packages detected', status: 'success' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-gray-300">
                    <span className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'success' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {item.label}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      item.status === 'success' 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : 'bg-amber-500/10 text-amber-400 animate-pulse'
                    }`}>
                      {item.status === 'success' ? 'Verified' : 'Auditing'}
                    </span>
                  </div>
                ))}
              </div>

              {activeApp.app.status === 'rejected' && (
                <div className="bg-red-950/40 border border-red-500/30 text-red-300 p-4 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-red-400 block">Rejection Feedback Received:</span>
                  <p>{activeApp.app.rejection_reason || 'Please correct details and resubmit.'}</p>
                </div>
              )}

              {/* Simulator box */}
              <div className="bg-[#181822] border border-blue-500/20 p-5 rounded-xl space-y-3">
                <span className="text-xs font-semibold text-blue-400 block">Developer Testing Sandbox</span>
                <p className="text-xs text-gray-400">
                  Don't want to wait? Use this interactive mock button to trigger an immediate automated administrative approval in the database!
                </p>
                <button
                  onClick={handleSimulateApproval}
                  className="bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Simulate: Admin Approved
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Sign Agreement */}
          {activeStep === 3 && activeApp && (
            <div className="bg-[#121218] border border-gray-800 p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Step 3: Select Plan & Sign Publisher Agreement</h3>
                <p className="text-xs text-gray-400 mt-1">Select the end-user subscription plan for your app and accept the revenue share terms.</p>
              </div>

              {/* Plan Selection Cards */}
              <div className="space-y-3">
                <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block">Select End-User Pricing Tier for your App</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'starter', name: 'Starter', price: '₹0', desc: 'Basic access & limits for new users' },
                    { id: 'growth', name: 'Growth', price: '₹1', desc: 'Standard usage tier (Recommended)' },
                    { id: 'pro', name: 'Pro', price: '₹2', desc: 'Premium usage with custom access' },
                  ].map((p) => {
                    const isChosen = selectedPlan === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlan(p.id)}
                        className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                          isChosen 
                            ? 'bg-blue-600/10 border-blue-500 text-white ring-1 ring-blue-500/20' 
                            : 'bg-gray-950/40 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold uppercase tracking-wider">{p.name}</span>
                          <span className="text-sm font-black">{p.price}<span className="text-[10px] font-normal text-gray-500">/mo</span></span>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-tight">{p.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payout Account Configuration */}
              <div className="space-y-4 border-t border-gray-800 pt-5">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    Payout Account Details
                  </h4>
                  <p className="text-[10px] text-gray-550 mt-0.5">Configure where you will receive your monthly revenue share payouts (80% split).</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Bank Account */}
                  <div className="bg-gray-950/30 border border-gray-800/85 rounded-xl p-4 space-y-3">
                    <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 block border-b border-gray-800/50 pb-1.5">Option A: Bank Transfer</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Bank Name</label>
                        <input
                          type="text"
                          placeholder="e.g. HDFC Bank"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">IFSC Code</label>
                        <input
                          type="text"
                          placeholder="e.g. HDFC0000245"
                          value={ifscCode}
                          onChange={(e) => setIfscCode(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-white font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-white font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Account Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 50100234567891"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-white font-semibold"
                      />
                    </div>
                  </div>

                  {/* Right Column: UPI */}
                  <div className="bg-gray-950/30 border border-gray-800/85 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-wider text-gray-400 block border-b border-gray-800/50 pb-1.5">Option B: UPI Transfer</span>
                      
                      <div className="mt-3">
                        <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">UPI ID / VPA</label>
                        <input
                          type="text"
                          placeholder="e.g. developer@upi"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-white font-semibold"
                        />
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-950/20 border border-blue-900/30 rounded-lg text-[10px] text-blue-300 leading-normal">
                      Monthly splits are routed automatically. You must provide either a valid UPI ID or complete bank details to activate payout capabilities.
                    </div>
                  </div>
                </div>
              </div>

              {/* Legal scrolling terms */}
              <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl text-xs text-gray-400 space-y-3 h-48 overflow-y-auto leading-relaxed">
                <span className="font-bold text-white block">WytSaaS Marketplace Publisher Agreement</span>
                <p>
                  1. Revenue Distribution: Payouts are dispatched at the close of each calendar month. The developer receives exactly <strong>80%</strong> of all end-user subscription revenue, net of standard billing transaction fees.
                </p>
                <p>
                  2. Billing Collection: WytPass collects payments directly from end-users on behalf of the application, and routes funds to our treasury first before distributing the developer share.
                </p>
                <p>
                  3. Single Sign-On (SSO): The publisher agrees to use WytPass SSO exclusively for handling end-user login sessions. Storing standalone passwords or bypassing the token verification is strictly prohibited and subject to immediate suspension.
                </p>
                <p>
                  4. Security Checks: Platform admins reserve the right to perform automated security scans, credential validation checks, and verify sandbox integration endpoints without prior notification to protect user security.
                </p>
                <p>
                  5. Termination: Publishers can remove their application listings at any time, but must honor existing active end-user billing cycles for up to 30 days to avoid disruption.
                </p>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="terms1"
                    checked={agreedRevShare}
                    onChange={(e) => setAgreedRevShare(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-blue-500 rounded"
                  />
                  <label htmlFor="terms1" className="text-xs text-gray-300 cursor-pointer">
                    I accept that WytPass processes all end-user transactions and pays me a flat 80% split of the subscription revenue.
                  </label>
                </div>

                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="terms2"
                    checked={agreedSecurity}
                    onChange={(e) => setAgreedSecurity(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-blue-500 rounded"
                  />
                  <label htmlFor="terms2" className="text-xs text-gray-300 cursor-pointer">
                    I confirm that WytPass SSO is active and gates all premium endpoints on my app.
                  </label>
                </div>

                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="terms3"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-blue-500 rounded"
                  />
                  <label htmlFor="terms3" className="text-xs text-gray-300 cursor-pointer">
                    I agree to the full terms and conditions stated in the publisher agreement above.
                  </label>
                </div>
              </div>

              <button
                onClick={handleSignAgreement}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Sign & Retrieve Credentials
              </button>
            </div>
          )}          {/* STEP 4: Get Credentials */}
          {activeStep === 4 && activeApp && activeApp.credentials && (
            <div className="bg-[#121218] border border-gray-800 p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Step 4: Get Secure API Credentials</h3>
                <p className="text-xs text-gray-400 mt-1">Copy these credentials to your app environment files. Treat keys as highly secret passwords.</p>
              </div>

              <div className="space-y-4">
                {/* App ID */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">App ID (Unique Identifier)</label>
                  <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 p-2.5 rounded-xl">
                    <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                    <code className="text-xs text-white select-all font-mono flex-1">{activeApp.credentials.app_key}</code>
                    <button
                      onClick={() => copyToClipboard(activeApp.credentials.app_key, 'app_id')}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {copiedKey === 'app_id' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* API Key */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">API Key (Secure Access Token)</label>
                  <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 p-2.5 rounded-xl">
                    <Key className="w-4 h-4 text-blue-400 shrink-0" />
                    <code className="text-xs text-white select-all font-mono flex-1">{activeApp.credentials.api_key}</code>
                    <button
                      onClick={() => copyToClipboard(activeApp.credentials.api_key, 'api_key')}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {copiedKey === 'api_key' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Webhook Secret */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Webhook Secret (HMAC Signature)</label>
                  <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 p-2.5 rounded-xl">
                    <Lock className="w-4 h-4 text-blue-400 shrink-0" />
                    <code className="text-xs text-white select-all font-mono flex-1">{activeApp.credentials.webhook_secret}</code>
                    <button
                      onClick={() => copyToClipboard(activeApp.credentials.webhook_secret, 'webhook_secret')}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {copiedKey === 'webhook_secret' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Help tip */}
              <div className="bg-[#181822]/80 border border-blue-500/10 p-4 rounded-xl text-xs text-gray-400 space-y-1.5">
                <span className="text-white font-bold flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  Integration Note
                </span>
                <p>
                  Store these values securely inside your `.env` configs. The API key must be sent as a `Bearer` token inside the `Authorization` header of all verification lookup requests.
                </p>
              </div>

              <button
                onClick={() => setActiveStep(5)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                Proceed to Integration Setup
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 5: Integrate WytSaaS */}
          {activeStep === 5 && activeApp && activeApp.credentials && (
            <div className="bg-[#121218] border border-gray-800 p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Step 5: Register Webhook Endpoint & Verify API</h3>
                <p className="text-xs text-gray-400 mt-1">Set up a webhook endpoint to listen to subscription updates, and test verification requests.</p>
              </div>

              {/* ── Integration Guide ─────────────────────────────────── */}
              <div className="bg-[#0e0e1a] border border-blue-500/20 rounded-xl p-5 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-sm font-bold text-white font-sans">Chronological Integration Steps</span>
                    <span className="text-[10px] bg-blue-600/20 border border-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">Flow Checklist</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownloadDocs}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                    >
                      <Database className="w-3 h-3" />
                      Download Integration Docs (.md)
                    </button>
                  </div>
                </div>

                <div className="space-y-6 text-xs text-gray-300">
                  {/* Step 1 — .env */}
                  <div className="space-y-2 border-l-2 border-blue-500/30 pl-4 relative">
                    <div className="absolute -left-[9px] top-0 bg-blue-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">1</div>
                    <span className="text-xs uppercase font-bold tracking-wider text-blue-400 block">
                      Step 1: Set Up Credentials (.env)
                    </span>
                    <p className="text-xs text-gray-400">Add the credentials below to your application's environment configuration file.</p>
                    <div className="relative mt-1">
                      <pre className="bg-[#070710] border border-gray-800 rounded-lg p-3 text-[11px] text-emerald-300 font-mono overflow-x-auto leading-relaxed">
{`# WytSaaS Marketplace Integration
WYTSAAS_APP_ID=${activeApp.credentials.app_key}
WYTSAAS_API_KEY=${activeApp.credentials.api_key}
WYTSAAS_WEBHOOK_SECRET=${activeApp.credentials.webhook_secret}
WYTSAAS_API_BASE=${saasBackendUrl}`}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(
                          `WYTSAAS_APP_ID=${activeApp.credentials.app_key}\nWYTSAAS_API_KEY=${activeApp.credentials.api_key}\nWYTSAAS_WEBHOOK_SECRET=${activeApp.credentials.webhook_secret}\nWYTSAAS_API_BASE=${saasBackendUrl}`,
                          'env_block'
                        )}
                        className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-[10px] px-2 py-1 rounded font-bold flex items-center gap-1 transition-all"
                      >
                        {copiedKey === 'env_block' ? <><Check className="w-3 h-3 text-emerald-400" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    </div>
                  </div>

                  {/* Step 2 — Download Docs Reminder */}
                  <div className="space-y-2 border-l-2 border-blue-500/30 pl-4 relative">
                    <div className="absolute -left-[9px] top-0 bg-blue-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">2</div>
                    <span className="text-xs uppercase font-bold tracking-wider text-blue-400 block">
                      Step 2: Generate & Download Full Integration Code
                    </span>
                    <p className="text-xs text-gray-400">
                      We've automatically generated dynamic code specific to your environment for integrating WytPass SSO and Webhooks. 
                      Click the <strong className="text-blue-400">Download Integration Docs (.md)</strong> button in the top right to download your complete step-by-step instructions.
                    </p>
                  </div>
                </div>

                {/* Step 3 — Register webhook URL below */}
                <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>After deploying the endpoint above, paste the full URL below and click <strong>Save Endpoint</strong>. WytSaaS will send a test ping to verify it's reachable.</span>
                </div>
              </div>
              {/* ── End Integration Guide ──────────────────────────────── */}



              {/* Webhook URL input */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Your Webhook Endpoint URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://your-api.com/webhooks/wytsaas"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs flex-1 text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <button
                      onClick={handleSaveWebhook}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 rounded-xl transition-all"
                    >
                      Save Endpoint
                    </button>
                  </div>
                </div>

                {/* Event types box */}
                <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 block">Dispatched Event Payloads</span>
                  <div className="grid grid-cols-2 gap-3 text-[10px] text-gray-400 font-mono">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      subscription.created
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      subscription.cancelled
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      subscription.expired
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      subscription.upgraded
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Sandbox & Simulation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-800/80">
                
                {/* Visual Verification Testing */}
                <div className="bg-[#181824] border border-gray-800 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <Database className="w-3.5 h-3.5 text-blue-400" />
                    Verify API Live Sandbox
                  </span>
                  <p className="text-[10px] text-gray-400 leading-normal">
                    Enter any WytPass User ID to simulate your application query to our GET `/api/v1/marketplace/verify` secure catalog lookup.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="User ID (e.g. USR_test_123)"
                      value={sandboxUserId}
                      onChange={(e) => setSandboxUserId(e.target.value)}
                      className="bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1 text-xs flex-1 text-white font-mono"
                    />
                    <button
                      onClick={handleExecuteSandboxVerify}
                      className="bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/35 text-blue-300 text-xs font-bold px-3 py-1 rounded-lg transition-all"
                    >
                      Query API
                    </button>
                  </div>

                  {sandboxResult && (
                    <pre className="bg-[#0b0b0f] border border-gray-800 p-2.5 rounded-lg text-[9px] text-emerald-400 overflow-x-auto font-mono max-h-24">
                      {JSON.stringify(sandboxResult, null, 2)}
                    </pre>
                  )}
                </div>

                {/* Webhook Sandbox simulation */}
                <div className="bg-[#181824] border border-gray-800 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <Play className="w-3.5 h-3.5 text-blue-400" />
                    Webhook Testbed Dispatcher
                  </span>
                  <p className="text-[10px] text-gray-400 leading-normal">
                    Trigger a mock purchase to send a signed HMAC-SHA256 post request containing `subscription.created` to your endpoint.
                  </p>
                  
                  <button
                    disabled={!activeApp.credentials.webhook_url || testingWebhook}
                    onClick={handleFireTestPurchase}
                    className="w-full bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600/25 disabled:opacity-40 text-blue-300 text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingWebhook ? 'animate-spin' : ''}`} />
                    {testingWebhook ? 'Firing webhook...' : 'Simulate Test Purchase'}
                  </button>
                </div>
              </div>

              {/* Webhook logs */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-white">Recent Sandbox Webhook Logs</span>
                <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800 overflow-hidden">
                  {webhookLogs.length > 0 ? (
                    webhookLogs.slice(0, 3).map((log, idx) => (
                      <div key={idx} className="p-3 text-[10px] flex items-center justify-between font-mono">
                        <div className="space-y-0.5">
                          <div className="text-white font-semibold flex items-center gap-1.5">
                            <span className="text-blue-400">{log.event_type}</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-400">user: {log.payload?.user_id}</span>
                          </div>
                          <span className="text-gray-500">Sent: {new Date(log.sent_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            log.response_status === 200 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            HTTP {log.response_status || '500'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-gray-500">
                      No webhook logs captured yet. Click "Simulate Test Purchase" to test.
                    </div>
                  )}
                </div>
              </div>

              <button
                disabled={!activeApp.credentials.webhook_url}
                onClick={() => setActiveStep(6)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                Proceed to Publish Submission
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 6: Submit for Publish */}
          {activeStep === 6 && activeApp && (
            <div className="bg-[#121218] border border-gray-800 p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Step 6: Final Review & Publishing</h3>
                <p className="text-xs text-gray-400 mt-1">Your integration details are verified. Notify administrators to publish your listing live.</p>
              </div>

              {/* Checklist details */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                <span className="text-xs font-bold text-white block">Marketplace Integrity Checklist</span>
                
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>App Details & Safety screening completed (Verified)</span>
                  </div>

                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Standard flat 80% payout revenue split configured</span>
                  </div>

                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Legal publisher agreement signed successfully</span>
                  </div>

                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Webhook endpoint registered: {activeApp.credentials?.webhook_url}</span>
                  </div>
                </div>
              </div>

              {/* Admin note */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Notes for the Reviewing Admin (optional)</label>
                <textarea
                  placeholder="Provide any testing instructions, sandbox credentials or specific configuration notes for the admin..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white focus:outline-none"
                />
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleNotifyPublishReady}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  Submit App for Final Publishing
                </button>

                {/* Simulator box */}
                <div className="bg-[#181822] border border-blue-500/20 p-5 rounded-xl space-y-3">
                  <span className="text-xs font-semibold text-blue-400 block">Developer Testing Sandbox</span>
                  <p className="text-xs text-gray-400">
                    Skip administrative queues by simulating immediate publishing through this mock action!
                  </p>
                  <button
                    onClick={handleSimulatePublish}
                    className="bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Simulate: Final Admin Published
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Live Store Dashboard */}
          {activeStep === 7 && activeApp && (
            <div className="space-y-6">
              {/* Dashboard Metrics Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Users Card */}
                <div className="bg-[#121218] border border-gray-800 p-5 rounded-2xl space-y-2 relative overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Active End-Users</span>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-white">
                      {statsLoading ? <span className="text-gray-600 animate-pulse">—</span> : stats.usersToday}
                    </h3>
                    <span className="text-xs text-gray-500 font-semibold">active subs</span>
                  </div>
                  <div className="absolute right-4 bottom-4 text-blue-500/10">
                    <Layout className="w-12 h-12" />
                  </div>
                </div>

                {/* Sales Card */}
                <div className="bg-[#121218] border border-gray-800 p-5 rounded-2xl space-y-2 relative overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Total Store Revenue</span>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-white">
                      {statsLoading ? <span className="text-gray-600 animate-pulse">—</span> : `₹${Math.round(stats.totalRevenue).toLocaleString()}`}
                    </h3>
                    <button onClick={loadLiveStats} title="Refresh" className="text-gray-600 hover:text-gray-400 transition-colors"><RefreshCw className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="absolute right-4 bottom-4 text-emerald-500/10">
                    <CreditCard className="w-12 h-12" />
                  </div>
                </div>

                {/* Subscriptions Card */}
                <div className="bg-[#121218] border border-gray-800 p-5 rounded-2xl space-y-2 relative overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Active Subscribers</span>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-white">
                      {statsLoading ? <span className="text-gray-600 animate-pulse">—</span> : stats.activeSubs}
                    </h3>
                    <span className="text-xs text-gray-500 font-semibold">paying users</span>
                  </div>
                  <div className="absolute right-4 bottom-4 text-blue-500/10">
                    <Database className="w-12 h-12" />
                  </div>
                </div>
              </div>

              {/* Main Panel App Details */}
              <div className="bg-[#121218] border border-gray-800 p-6 rounded-2xl space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      Listing Status: Active & Live on Store
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">Your application is public and users can buy pricing plans on the marketplace.</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <a
                      href={activeApp.app.url}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-gray-800 hover:bg-gray-700 border border-gray-750 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 text-gray-200 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Visit Website
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-800/80">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">App Metadata Summary</span>
                    <table className="w-full text-xs text-gray-400">
                      <tbody>
                        <tr className="border-b border-gray-800/50">
                          <td className="py-2 font-medium text-gray-500">Category:</td>
                          <td className="py-2 text-white font-semibold">{activeApp.app.category}</td>
                        </tr>
                        <tr className="border-b border-gray-800/50">
                          <td className="py-2 font-medium text-gray-500">Support contact:</td>
                          <td className="py-2 text-white font-mono">{activeApp.app.support_email}</td>
                        </tr>
                        <tr className="border-b border-gray-800/50">
                          <td className="py-2 font-medium text-gray-500">Your pricing plan:</td>
                          <td className="py-2 text-white uppercase font-bold">Standard Publisher (Flat 80% share)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">API Integration Details</span>
                    <table className="w-full text-xs text-gray-400">
                      <tbody>
                        <tr className="border-b border-gray-800/50">
                          <td className="py-2 font-medium text-gray-500">Webhook URL:</td>
                          <td className="py-2 text-white font-mono truncate max-w-xs">{activeApp.credentials?.webhook_url}</td>
                        </tr>
                        <tr className="border-b border-gray-800/50">
                          <td className="py-2 font-medium text-gray-500">SSO OAuth:</td>
                          <td className="py-2 text-emerald-400 font-semibold">Active (WytPass Authenticated)</td>
                        </tr>
                        <tr className="border-b border-gray-800/50">
                          <td className="py-2 font-medium text-gray-500">Verify SDK calls:</td>
                          <td className="py-2 text-white font-semibold">Standard HTTPS</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Simulator webhook dispatch block for Live Dashboard testing */}
                <div className="bg-[#181822] border border-blue-500/20 p-4 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">Simulator: Mock User Subscribe</span>
                    <p className="text-[10px] text-gray-400">
                      Dispatches a signed payment event to your webhook. Confirms your live platform handles new users perfectly!
                    </p>
                  </div>
                  <button
                    onClick={handleFireTestPurchase}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Simulate Purchase
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
