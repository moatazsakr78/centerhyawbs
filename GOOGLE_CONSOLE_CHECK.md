# ⚠️ IMPORTANT: Google Console Setup Check

## لازم تتأكد من الآتي في Google Cloud Console:

### 1. Go to:
🔗 https://console.cloud.google.com/apis/credentials

### 2. Find your OAuth Client ID:
- Client ID: 582109987155-a3th2nfk5451cpectolkep6cfsp0cipu.apps.googleusercontent.com

### 3. Click "Edit" (✏️ icon)

### 4. Check "Authorized redirect URIs" contains:
```
✅ http://localhost:3001/api/auth/callback/google
✅ http://localhost:3000/api/auth/callback/google
```

**⚠️ IMPORTANT:** لازم يكون `/api/auth/callback/google` (مش أي حاجة تانية!)

### 5. If missing, add them:
- Click "+ ADD URI"
- Add: `http://localhost:3001/api/auth/callback/google`
- Click "SAVE"

---

## Common Errors:

### Error: "redirect_uri_mismatch"
**Solution:**
- الـ redirect URI في Google Console لازم يكون **بالظبط** زي اللي NextAuth بيبعته
- Format: `http://localhost:3001/api/auth/callback/google`
- لا trailing slash: ❌ `.../google/`
- لا query params: ❌ `.../google?...`

### Error: "Access blocked: This app's request is invalid"
**Solution:**
- روح OAuth consent screen
- اضغط "Publish App" (لو test mode)
- أو add your email to test users

---

## After fixing:
- Restart dev server (Ctrl+C → npm run dev)
- Clear browser cache
- Try Google sign-in again
