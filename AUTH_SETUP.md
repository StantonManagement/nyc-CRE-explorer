# Supabase Auth Setup Guide

> **Status:** Auth backend is ready, but UI is **hidden by default**. The app works perfectly with localStorage-based portfolio. Enable auth only when you need multi-device sync or user accounts.

## ✅ What's Implemented

### Backend (Complete)
- ✅ Auth middleware that verifies JWT tokens
- ✅ `POST /api/auth/login` - Sends magic link email
- ✅ `GET /api/auth/me` - Returns current user
- ✅ `POST /api/auth/logout` - Signs out user
- ✅ Portfolio routes (stubs for future enhancement)

### Frontend (Complete but Hidden)
- ✅ Login button in sidebar header (hidden by default)
- ✅ Auth modal with email input
- ✅ Magic link flow handling
- ✅ Session persistence in localStorage
- ✅ User email display when logged in
- ✅ Sign out functionality

**To enable auth UI:** Remove `style="display: none;"` from the `#authContainer` div in `index.html` (line ~1098)

## 🔧 Supabase Dashboard Setup Required

To enable authentication, you need to configure Supabase:

### Step 1: Enable Email Auth

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `dquwrvrimxrxxcyenrwa`
3. Navigate to **Authentication** → **Providers**
4. Find **Email** provider and ensure it's **enabled**
5. Under Email settings:
   - ✅ Enable "Magic Link" 
   - ⚠️ **Disable** "Confirm email" (for faster testing, can enable later)
   - Set **Site URL**: `http://localhost:3000`
   - Add **Redirect URL**: `http://localhost:3000`

### Step 2: Configure Email Template (Optional)

1. Go to **Authentication** → **Email Templates**
2. Select "Magic Link" template
3. Customize the email (optional):

```html
<h2>NYC CRE Explorer - Sign In</h2>
<p>Click the link below to sign in:</p>
<p><a href="{{ .ConfirmationURL }}">Sign in to NYC CRE Explorer</a></p>
<p>This link expires in 1 hour.</p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

### Step 3: Test Email Delivery

Supabase uses their own email service for development. For production, you should:
1. Go to **Settings** → **Auth** → **SMTP Settings**
2. Configure your own SMTP server (SendGrid, AWS SES, etc.)

## 🚀 How to Use

### As a User:

1. **Sign In:**
   - Click "Sign In" button in the top-right of the sidebar
   - Enter your email address
   - Click "Send Magic Link"
   - Check your email for the magic link
   - Click the link to sign in

2. **Signed In State:**
   - Your email will appear in the header
   - "Sign Out" button available
   - Portfolio features will use your account (future enhancement)

3. **Sign Out:**
   - Click "Sign Out" button
   - Session cleared from localStorage

### As a Developer:

**Check Auth Status:**
```javascript
// In browser console
console.log(state.user);
console.log(state.accessToken);
```

**Make Authenticated Requests:**
```javascript
const response = await fetch('/api/portfolio', {
  headers: {
    'Authorization': `Bearer ${state.accessToken}`
  }
});
```

## 📋 Current Limitations

1. **Portfolio Not Persisted:** The portfolio routes are stubs. They return success but don't actually save to the database yet. This requires:
   - Creating `portfolios` and `portfolio_properties` tables in Supabase
   - Implementing the full CRUD operations
   - Updating frontend to sync with backend

2. **No Password Auth:** Only magic link authentication is implemented. To add password auth:
   - Enable password provider in Supabase
   - Add signup/login forms
   - Handle password reset flow

3. **No Social Auth:** To add Google/GitHub/etc:
   - Enable providers in Supabase Dashboard
   - Add OAuth buttons to auth modal
   - Handle OAuth callback

## 🔒 Security Notes

- ✅ JWT tokens stored in localStorage (acceptable for demo/dev)
- ✅ Tokens sent via Authorization header
- ✅ Backend validates tokens on protected routes
- ⚠️ For production: Consider httpOnly cookies for better security
- ⚠️ For production: Implement token refresh logic
- ⚠️ For production: Add rate limiting to auth endpoints

## 🎯 Next Steps

To fully complete PRP-1.3, you would need to:

1. **Create Database Tables:**
```sql
-- In Supabase SQL Editor
CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE portfolio_properties (
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
  bbl TEXT NOT NULL,
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (portfolio_id, bbl)
);

-- Enable RLS
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_properties ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own portfolios"
  ON portfolios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own portfolios"
  ON portfolios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Similar policies for portfolio_properties...
```

2. **Implement Portfolio Persistence:**
   - Update `/api/portfolio` routes to actually query/insert/delete
   - Add auto-portfolio creation on first login
   - Sync localStorage portfolio to database on login

3. **Add Token Refresh:**
   - Implement refresh token logic
   - Auto-refresh before expiry
   - Handle expired sessions gracefully

## ✅ Testing Checklist

- [ ] Click "Sign In" button opens modal
- [ ] Enter email and submit sends magic link
- [ ] Check email for magic link
- [ ] Click magic link redirects to app
- [ ] User email appears in header
- [ ] "Sign Out" button works
- [ ] Refresh page maintains session
- [ ] Clear localStorage and verify logged out state

## 🐛 Troubleshooting

**"Magic link not received":**
- Check Supabase Dashboard → Authentication → Users to see if user was created
- Check spam folder
- Verify email provider is enabled
- Check Supabase logs for errors

**"Token invalid" errors:**
- Clear localStorage: `localStorage.clear()`
- Check token expiry
- Verify SUPABASE_KEY in .env matches dashboard

**"CORS errors":**
- Verify Site URL in Supabase matches your localhost
- Check redirect URLs are configured

## 📚 Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Magic Link Guide](https://supabase.com/docs/guides/auth/auth-magic-link)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
