# Google OAuth Setup Guide

## Steps to Create Google OAuth Credentials:

### 1. Go to Google Cloud Console
🔗 https://console.cloud.google.com/

### 2. Create or Select a Project
- Click "Select a project" (top left)
- Click "New Project"
- Name: "NextAuth POS System" (or any name)
- Click "Create"

### 3. Enable Google+ API
- Go to: APIs & Services → Library
- Search for: "Google+ API"
- Click "Enable"

### 4. Create OAuth Credentials
- Go to: APIs & Services → Credentials
- Click "+ CREATE CREDENTIALS"
- Select "OAuth client ID"

### 5. Configure OAuth Consent Screen (if first time)
- Click "CONFIGURE CONSENT SCREEN"
- Select "External"
- Fill in:
  - App name: "POS System"
  - User support email: your email
  - Developer contact: your email
- Click "Save and Continue"
- Skip Scopes (click "Save and Continue")
- Skip Test users (click "Save and Continue")
- Click "Back to Dashboard"

### 6. Create OAuth Client ID
- Go back to: Credentials → Create Credentials → OAuth client ID
- Application type: "Web application"
- Name: "NextAuth Client"
- Authorized JavaScript origins:
  ```
  http://localhost:3000
  http://localhost:3001
  https://your-production-domain.com
  ```
- Authorized redirect URIs:
  ```
  http://localhost:3000/api/auth/callback/google
  http://localhost:3001/api/auth/callback/google
  https://your-production-domain.com/api/auth/callback/google
  ```
- Click "Create"

### 7. Copy Credentials
You'll get:
- ✅ Client ID (looks like: 123456789-abcdefg.apps.googleusercontent.com)
- ✅ Client Secret (random string)

### 8. Add to .env.local
```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

---

## Important Notes:

- ✅ FREE forever (no costs)
- ✅ Unlimited users
- ✅ Works with NextAuth.js
- ✅ Does NOT count as Supabase MAU

---

## Troubleshooting:

If you get "redirect_uri_mismatch" error:
1. Check the redirect URI in Google Console matches exactly
2. Include both localhost:3000 and localhost:3001
3. No trailing slashes in URIs
