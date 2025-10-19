# Vercel OAuth Troubleshooting Guide

## Problem
After deploying to Vercel, Google OAuth redirects to `localhost:3000` instead of the production domain `https://full-system-20.vercel.app`.

## Debugging Steps

### 1. Check Console Logs
When you click "Sign in with Google" on your production site, check the browser console for these debug messages:
```
🔗 OAuth Debug Info:
- Redirect URL: [should be https://full-system-20.vercel.app/auth/callback]
- Current window origin: [should be https://full-system-20.vercel.app]
- Environment NEXT_PUBLIC_SITE_URL: [should be https://full-system-20.vercel.app]
```

### 2. Verify Vercel Environment Variables

#### Option A: Via Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project `full-system-20`
3. Go to **Settings** → **Environment Variables**
4. Ensure you have:
   ```
   NEXT_PUBLIC_SITE_URL = https://centerhyawbs.vercel.app
   NEXT_PUBLIC_SUPABASE_URL = https://hecedrbnbknohssgaoso.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = [your-anon-key]
   ```

#### Option B: Via Vercel CLI
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login and check environment variables
vercel login
vercel env ls
``````

### 3. Correct Google Cloud Console Configuration <sdgs>

#### Current Setup (might be incorrect):
- ❌ `http://localhost:3000/auth/v1/callback`
- ❌ `https://full-system-20.vercel.app/auth/v1/callback`

#### Correct Setup:
In Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs:

**Authorized JavaScript origins:**
```
http://localhost:3000
http://localhost:3001
http://localhost:3002
http://localhost:3003
https://full-system-20.vercel.app
```

**Authorized redirect URIs (Important!):**
```
https://hecedrbnbknohssgaoso.supabase.co/auth/v1/callback
```

⚠️ **Key Point**: The redirect URI should point to **Supabase**, not your app directly!

### 4. Supabase Configuration

In Supabase Dashboard → Authentication → URL Configuration:

**Site URL:**
```
https://full-system-20.vercel.app
```

**Redirect URLs:**
```
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
http://localhost:3002/auth/callback
http://localhost:3003/auth/callback
https://full-system-20.vercel.app/auth/callback
```

## Quick Fixes

### Fix 1: Redeploy with Correct Environment Variables
```bash
# In your project root
vercel env add NEXT_PUBLIC_SITE_URL
# Enter: https://full-system-20.vercel.app

# Redeploy
vercel --prod
```

### Fix 2: Force Environment Variable in Production
Add this to your `next.config.js`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://full-system-20.vercel.app',
  },
}

module.exports = nextConfig
```

### Fix 3: Alternative Direct Approach
If environment variables still don't work, create a production-specific auth file:

```typescript
// lib/utils/auth-urls-production.ts
export const getProductionBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    
    // Force production URL for Vercel
    if (origin.includes('vercel.app') || origin.includes('full-system-20')) {
      return 'https://full-system-20.vercel.app';
    }
    
    // Development
    if (origin.includes('localhost')) {
      return origin;
    }
    
    // Fallback
    return origin;
  }
  
  return 'https://full-system-20.vercel.app';
};
```

## Testing Checklist

### ✅ Before Testing:
- [ ] Environment variables set in Vercel
- [ ] Google Cloud Console configured correctly
- [ ] Supabase URLs configured correctly
- [ ] Latest deployment pushed to Vercel

### ✅ Test Flow:
1. Visit `https://full-system-20.vercel.app`
2. Open browser console
3. Click "Sign in with Google"
4. Check console logs for correct redirect URL
5. Complete Google login
6. Should redirect back to `https://full-system-20.vercel.app`

## Common Issues & Solutions

### Issue: Still redirecting to localhost
**Solution**: Clear browser cache and cookies, then test in incognito mode.

### Issue: "Invalid redirect URI" error
**Solution**: Double-check Google Cloud Console redirect URIs match exactly.

### Issue: Environment variable not updating
**Solution**: 
```bash
# Force rebuild and redeploy
vercel --force --prod
```

### Issue: Works locally but not in production
**Solution**: Use the debugging logs we added to compare local vs production behavior.

## Contact Support
If none of these solutions work, the debug logs will help identify the exact issue. Share the console output when reporting the problem.