# PRP 1.3: Supabase Auth + Persistent Portfolios

**Phase:** Priority 1 - Quick Wins  
**Estimated Time:** 3-4 hours  
**Dependencies:** Phase 0 complete (Supabase setup with schema)  
**Outputs:** User authentication + persistent portfolios synced to database

> **Architectural Note:** Authentication is orthogonal to the unified `/api/data` endpoint (PRP-1.0). Auth middleware protects endpoints and enables user-specific features (portfolios, saved searches). All data endpoints should accept optional auth tokens and respect RLS policies.

---

## Goal

Replace localStorage-based portfolio with authenticated user accounts and database-backed persistent portfolios.

**Current state:** Portfolio saved to localStorage, lost on new device/browser clear  
**Target state:** Magic link email auth, portfolios persist across devices, ready for sharing

---

## Prerequisites

- Supabase project with schema from PRP 0.1 (portfolios, portfolio_properties tables exist)
- RLS policies already configured
- Working app with localStorage portfolio

---

## Supabase Dashboard Setup

### Step 1: Enable Email Auth

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Email** provider, ensure it's enabled
3. Under Email settings:
   - ✅ Enable "Confirm email" (optional, can disable for faster testing)
   - ✅ Enable "Magic Link" 
   - Set **Site URL**: `http://localhost:3000` (change for production)
   - Set **Redirect URLs**: Add `http://localhost:3000/auth/callback`

### Step 2: Customize Email Template (Optional)

1. Go to **Authentication** → **Email Templates**
2. Edit "Magic Link" template:

```html
<h2>NYC CRE Explorer Login</h2>
<p>Click the link below to sign in:</p>
<p><a href="{{ .ConfirmationURL }}">Sign in to NYC CRE Explorer</a></p>
<p>This link expires in 1 hour.</p>
```

### Step 3: Get Auth Settings

Note these from **Settings** → **API**:
- `SUPABASE_URL` (already have)
- `SUPABASE_ANON_KEY` (already have)

No additional keys needed - magic link auth uses the anon key.

---

## Backend Changes

### Step 4: Add Auth Middleware

**File:** `server.js`  
**Location:** After Supabase client setup, before routes

```javascript
// =============================================
// AUTH MIDDLEWARE
// =============================================

/**
 * Extract and verify Supabase auth token from request
 * Adds req.user if valid, null otherwise
 */
async function authMiddleware(req, res, next) {
  req.user = null;
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return next();
    }
    
    req.user = user;
  } catch (err) {
    console.error('Auth middleware error:', err);
  }
  
  next();
}

/**
 * Require authentication - returns 401 if not logged in
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Apply auth middleware to all routes
app.use(authMiddleware);
```

### Step 5: Add Auth Routes

**File:** `server.js`  
**Location:** Add after middleware, before other API routes

```javascript
// =============================================
// AUTH ROUTES
// =============================================

/**
 * POST /api/auth/login
 * Send magic link email
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${req.protocol}://${req.get('host')}/auth/callback`
      }
    });
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      message: 'Check your email for the login link' 
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/verify
 * Verify OTP token from magic link
 */
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { token_hash, type } = req.body;
    
    if (!token_hash) {
      return res.status(400).json({ error: 'Token required' });
    }
    
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type || 'magiclink'
    });
    
    if (error) throw error;
    
    res.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });
    
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      created_at: req.user.created_at
    }
  });
});

/**
 * POST /api/auth/logout
 * Sign out (client should also clear local tokens)
 */
app.post('/api/auth/logout', async (req, res) => {
  // Server-side sign out if we have a token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      // Ignore errors, client will clear tokens anyway
    }
  }
  
  res.json({ success: true });
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }
    
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });
    
    if (error) throw error;
    
    res.json({
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });
    
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(401).json({ error: 'Session expired, please login again' });
  }
});
```

### Step 6: Add Portfolio Routes

**File:** `server.js`  
**Location:** After auth routes

```javascript
// =============================================
// PORTFOLIO ROUTES (Authenticated)
// =============================================

/**
 * GET /api/portfolios
 * List user's portfolios
 */
app.get('/api/portfolios', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('portfolios')
      .select(`
        id,
        name,
        description,
        created_at,
        updated_at,
        portfolio_properties (
          bbl,
          notes,
          added_at
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Add property count to each portfolio
    const portfolios = data.map(p => ({
      ...p,
      propertyCount: p.portfolio_properties?.length || 0
    }));
    
    res.json({ portfolios });
    
  } catch (error) {
    console.error('List portfolios error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/portfolios
 * Create new portfolio
 */
app.post('/api/portfolios', requireAuth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const { data, error } = await supabase
      .from('portfolios')
      .insert({
        user_id: req.user.id,
        name: name || 'My Portfolio',
        description: description || null
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ portfolio: data });
    
  } catch (error) {
    console.error('Create portfolio error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/portfolios/:id
 * Get single portfolio with full property details
 */
app.get('/api/portfolios/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get portfolio
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();
    
    if (portfolioError) {
      if (portfolioError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Portfolio not found' });
      }
      throw portfolioError;
    }
    
    // Get portfolio properties with details
    const { data: portfolioProps } = await supabase
      .from('portfolio_properties')
      .select('bbl, notes, added_at')
      .eq('portfolio_id', id);
    
    if (!portfolioProps || portfolioProps.length === 0) {
      return res.json({
        ...portfolio,
        properties: []
      });
    }
    
    // Get full property details
    const bbls = portfolioProps.map(pp => pp.bbl);
    const { data: properties } = await supabase
      .from('properties')
      .select('*')
      .in('bbl', bbls);
    
    // Merge portfolio data with property details
    const propertiesWithNotes = (properties || []).map(prop => {
      const pp = portfolioProps.find(p => p.bbl === prop.bbl);
      return {
        ...prop,
        portfolioNotes: pp?.notes || null,
        addedAt: pp?.added_at || null
      };
    });
    
    res.json({
      ...portfolio,
      properties: propertiesWithNotes
    });
    
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/portfolios/:id
 * Update portfolio name/description
 */
app.put('/api/portfolios/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const { data, error } = await supabase
      .from('portfolios')
      .update({ name, description })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ portfolio: data });
    
  } catch (error) {
    console.error('Update portfolio error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/portfolios/:id
 * Delete portfolio
 */
app.delete('/api/portfolios/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Delete portfolio error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/portfolios/:id/properties
 * Add property to portfolio
 */
app.post('/api/portfolios/:id/properties', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { bbl, notes } = req.body;
    
    if (!bbl) {
      return res.status(400).json({ error: 'BBL required' });
    }
    
    // Verify portfolio belongs to user
    const { data: portfolio } = await supabase
      .from('portfolios')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();
    
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }
    
    // Add property (upsert to handle duplicates)
    const { data, error } = await supabase
      .from('portfolio_properties')
      .upsert({
        portfolio_id: id,
        bbl,
        notes: notes || null
      }, {
        onConflict: 'portfolio_id,bbl'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, property: data });
    
  } catch (error) {
    console.error('Add property error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/portfolios/:id/properties/:bbl
 * Update property notes
 */
app.put('/api/portfolios/:id/properties/:bbl', requireAuth, async (req, res) => {
  try {
    const { id, bbl } = req.params;
    const { notes } = req.body;
    
    const { data, error } = await supabase
      .from('portfolio_properties')
      .update({ notes })
      .eq('portfolio_id', id)
      .eq('bbl', bbl)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ success: true, property: data });
    
  } catch (error) {
    console.error('Update property notes error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/portfolios/:id/properties/:bbl
 * Remove property from portfolio
 */
app.delete('/api/portfolios/:id/properties/:bbl', requireAuth, async (req, res) => {
  try {
    const { id, bbl } = req.params;
    
    const { error } = await supabase
      .from('portfolio_properties')
      .delete()
      .eq('portfolio_id', id)
      .eq('bbl', bbl);
    
    if (error) throw error;
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Remove property error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Step 7: Add Auth Callback Route

**File:** `server.js`  
**Location:** Before the catch-all route

```javascript
// Auth callback page (serves HTML that handles the token)
app.get('/auth/callback', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Signing in...</title>
      <style>
        body { 
          font-family: system-ui, sans-serif; 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          height: 100vh; 
          margin: 0;
          background: #1a1a2e;
          color: #fff;
        }
        .container { text-align: center; }
        .spinner { 
          width: 40px; 
          height: 40px; 
          border: 3px solid #333; 
          border-top-color: #3b82f6; 
          border-radius: 50%; 
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <p>Signing you in...</p>
      </div>
      <script>
        // Extract token from URL hash
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const expires_at = params.get('expires_at');
        
        if (access_token) {
          // Store tokens
          localStorage.setItem('auth_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          localStorage.setItem('expires_at', expires_at);
          
          // Redirect to app
          window.location.href = '/';
        } else {
          // Check for error
          const error = params.get('error_description') || params.get('error');
          if (error) {
            document.querySelector('.container').innerHTML = 
              '<p style="color: #ef4444;">Login failed: ' + error + '</p>' +
              '<p><a href="/" style="color: #3b82f6;">Return to app</a></p>';
          } else {
            // Try URL query params (some flows use this)
            const urlParams = new URLSearchParams(window.location.search);
            const token_hash = urlParams.get('token_hash');
            const type = urlParams.get('type');
            
            if (token_hash) {
              // Verify with backend
              fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token_hash, type })
              })
              .then(r => r.json())
              .then(data => {
                if (data.session) {
                  localStorage.setItem('auth_token', data.session.access_token);
                  localStorage.setItem('refresh_token', data.session.refresh_token);
                  localStorage.setItem('expires_at', data.session.expires_at);
                  window.location.href = '/';
                } else {
                  throw new Error(data.error || 'Verification failed');
                }
              })
              .catch(err => {
                document.querySelector('.container').innerHTML = 
                  '<p style="color: #ef4444;">Login failed: ' + err.message + '</p>' +
                  '<p><a href="/" style="color: #3b82f6;">Return to app</a></p>';
              });
            } else {
              document.querySelector('.container').innerHTML = 
                '<p style="color: #ef4444;">No authentication token found</p>' +
                '<p><a href="/" style="color: #3b82f6;">Return to app</a></p>';
            }
          }
        }
      </script>
    </body>
    </html>
  `);
});
```

---

## Frontend Changes

### Step 8: Add Auth CSS

**File:** `public/index.html`  
**Location:** Inside `<style>` section

```css
/* ===== Auth UI ===== */
.auth-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.auth-user {
  font-size: 13px;
  color: var(--text-muted, #888);
}

.auth-user-email {
  color: var(--text-primary, #fff);
  font-weight: 500;
}

.auth-btn {
  padding: 8px 16px;
  background: var(--primary, #3b82f6);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.auth-btn:hover {
  background: #2563eb;
}

.auth-btn.secondary {
  background: var(--bg-light, #2a2a3e);
  border: 1px solid var(--border-color, #333);
}

.auth-btn.secondary:hover {
  background: var(--bg-hover, #3a3a4e);
}

/* Login Modal */
.login-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
}

.login-modal.open {
  opacity: 1;
  visibility: visible;
}

.login-modal-content {
  background: var(--bg-dark, #1a1a2e);
  border: 1px solid var(--border-color, #333);
  border-radius: 12px;
  padding: 32px;
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.login-modal-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text-primary, #fff);
}

.login-modal-subtitle {
  font-size: 14px;
  color: var(--text-muted, #888);
  margin: 0 0 24px 0;
}

.login-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-light, #2a2a3e);
  border: 1px solid var(--border-color, #333);
  border-radius: 8px;
  color: var(--text-primary, #fff);
  font-size: 14px;
  margin-bottom: 16px;
  box-sizing: border-box;
}

.login-input:focus {
  outline: none;
  border-color: var(--primary, #3b82f6);
}

.login-submit {
  width: 100%;
  padding: 12px;
  background: var(--primary, #3b82f6);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.login-submit:hover {
  background: #2563eb;
}

.login-submit:disabled {
  background: #555;
  cursor: not-allowed;
}

.login-message {
  margin-top: 16px;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
}

.login-message.success {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.login-message.error {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.login-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: var(--text-muted, #888);
  font-size: 24px;
  cursor: pointer;
}

/* Portfolio Sync Indicator */
.portfolio-sync {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted, #888);
  padding: 4px 8px;
  background: var(--bg-light, #2a2a3e);
  border-radius: 4px;
}

.portfolio-sync.synced {
  color: #22c55e;
}

.portfolio-sync-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
```

### Step 9: Add Auth HTML

**File:** `public/index.html`  
**Location:** In your header/nav area, add:

```html
<!-- Auth Container (add to your header) -->
<div id="auth-container" class="auth-container">
  <!-- Filled by JS -->
</div>

<!-- Login Modal -->
<div id="login-modal" class="login-modal">
  <div class="login-modal-content" style="position: relative;">
    <button class="login-close" onclick="closeLoginModal()">×</button>
    <h2 class="login-modal-title">Sign In</h2>
    <p class="login-modal-subtitle">Enter your email to receive a magic link</p>
    <form onsubmit="handleLogin(event)">
      <input 
        type="email" 
        id="login-email" 
        class="login-input" 
        placeholder="you@example.com"
        required
      />
      <button type="submit" class="login-submit" id="login-submit">
        Send Magic Link
      </button>
    </form>
    <div id="login-message"></div>
  </div>
</div>
```

### Step 10: Add Auth JavaScript

**File:** `public/index.html`  
**Location:** Inside `<script>` section

```javascript
// ===== Authentication =====

const auth = {
  user: null,
  token: null,
  
  init() {
    // Check for stored token
    const token = localStorage.getItem('auth_token');
    const expiresAt = localStorage.getItem('expires_at');
    
    if (token && expiresAt) {
      // Check if expired
      if (Date.now() < parseInt(expiresAt) * 1000) {
        this.token = token;
        this.loadUser();
      } else {
        // Try refresh
        this.refreshToken();
      }
    }
    
    this.renderAuthUI();
  },
  
  async loadUser() {
    try {
      const response = await this.fetch('/api/auth/me');
      const data = await response.json();
      
      if (data.user) {
        this.user = data.user;
        this.renderAuthUI();
        // Load portfolios after auth
        loadPortfolios();
      }
    } catch (err) {
      console.error('Load user error:', err);
      this.logout();
    }
  },
  
  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      this.logout();
      return;
    }
    
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      
      const data = await response.json();
      
      if (data.session) {
        localStorage.setItem('auth_token', data.session.access_token);
        localStorage.setItem('refresh_token', data.session.refresh_token);
        localStorage.setItem('expires_at', data.session.expires_at);
        this.token = data.session.access_token;
        this.loadUser();
      } else {
        this.logout();
      }
    } catch (err) {
      console.error('Refresh error:', err);
      this.logout();
    }
  },
  
  async login(email) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    return response.json();
  },
  
  logout() {
    this.user = null;
    this.token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expires_at');
    this.renderAuthUI();
    
    // Clear portfolio UI
    if (typeof renderLocalPortfolio === 'function') {
      renderLocalPortfolio();
    }
  },
  
  // Wrapper for authenticated fetch
  fetch(url, options = {}) {
    const headers = options.headers || {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return fetch(url, { ...options, headers });
  },
  
  renderAuthUI() {
    const container = document.getElementById('auth-container');
    if (!container) return;
    
    if (this.user) {
      container.innerHTML = `
        <span class="auth-user">
          <span class="auth-user-email">${this.user.email}</span>
        </span>
        <button class="auth-btn secondary" onclick="auth.logout()">Sign Out</button>
      `;
    } else {
      container.innerHTML = `
        <button class="auth-btn" onclick="openLoginModal()">Sign In</button>
      `;
    }
  },
  
  isLoggedIn() {
    return !!this.user;
  }
};

function openLoginModal() {
  document.getElementById('login-modal').classList.add('open');
  document.getElementById('login-email').focus();
}

function closeLoginModal() {
  document.getElementById('login-modal').classList.remove('open');
  document.getElementById('login-message').innerHTML = '';
  document.getElementById('login-email').value = '';
}

async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const submitBtn = document.getElementById('login-submit');
  const messageDiv = document.getElementById('login-message');
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';
  messageDiv.innerHTML = '';
  
  try {
    const result = await auth.login(email);
    
    if (result.success) {
      messageDiv.innerHTML = `
        <div class="login-message success">
          ✓ Check your email for the login link!
        </div>
      `;
      // Don't close modal - let user see the message
    } else {
      throw new Error(result.error || 'Login failed');
    }
  } catch (err) {
    messageDiv.innerHTML = `
      <div class="login-message error">
        ${err.message}
      </div>
    `;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Magic Link';
  }
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
  auth.init();
});
```

### Step 11: Add Portfolio Management JavaScript

**File:** `public/index.html`  
**Location:** Inside `<script>` section, after auth code

```javascript
// ===== Portfolio Management (Authenticated) =====

let userPortfolios = [];
let activePortfolioId = null;

async function loadPortfolios() {
  if (!auth.isLoggedIn()) {
    userPortfolios = [];
    renderPortfolioUI();
    return;
  }
  
  try {
    const response = await auth.fetch('/api/portfolios');
    const data = await response.json();
    
    userPortfolios = data.portfolios || [];
    
    // Auto-create default portfolio if none exist
    if (userPortfolios.length === 0) {
      await createPortfolio('My Portfolio');
    } else {
      activePortfolioId = userPortfolios[0].id;
    }
    
    renderPortfolioUI();
    
  } catch (err) {
    console.error('Load portfolios error:', err);
  }
}

async function createPortfolio(name) {
  try {
    const response = await auth.fetch('/api/portfolios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    const data = await response.json();
    
    if (data.portfolio) {
      userPortfolios.unshift(data.portfolio);
      activePortfolioId = data.portfolio.id;
      renderPortfolioUI();
    }
  } catch (err) {
    console.error('Create portfolio error:', err);
  }
}

async function addToPortfolio(bbl, notes = null) {
  if (!auth.isLoggedIn()) {
    openLoginModal();
    return;
  }
  
  if (!activePortfolioId) {
    await createPortfolio('My Portfolio');
  }
  
  try {
    const response = await auth.fetch(`/api/portfolios/${activePortfolioId}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bbl, notes })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Added to portfolio');
      loadPortfolios(); // Refresh
    }
  } catch (err) {
    console.error('Add to portfolio error:', err);
    showToast('Failed to add to portfolio', 'error');
  }
}

async function removeFromPortfolio(bbl) {
  if (!auth.isLoggedIn() || !activePortfolioId) return;
  
  try {
    await auth.fetch(`/api/portfolios/${activePortfolioId}/properties/${bbl}`, {
      method: 'DELETE'
    });
    
    showToast('Removed from portfolio');
    loadPortfolios();
  } catch (err) {
    console.error('Remove from portfolio error:', err);
  }
}

function isInPortfolio(bbl) {
  if (!activePortfolioId) return false;
  
  const portfolio = userPortfolios.find(p => p.id === activePortfolioId);
  if (!portfolio || !portfolio.portfolio_properties) return false;
  
  return portfolio.portfolio_properties.some(pp => pp.bbl === bbl);
}

function renderPortfolioUI() {
  // This should integrate with your existing portfolio tab
  // Adapt to your actual portfolio rendering code
  
  const portfolioTab = document.getElementById('portfolio-content');
  if (!portfolioTab) return;
  
  if (!auth.isLoggedIn()) {
    portfolioTab.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <p style="color: var(--text-muted); margin-bottom: 16px;">
          Sign in to save properties and access your portfolio across devices.
        </p>
        <button class="auth-btn" onclick="openLoginModal()">Sign In</button>
      </div>
    `;
    return;
  }
  
  const portfolio = userPortfolios.find(p => p.id === activePortfolioId);
  
  if (!portfolio || !portfolio.portfolio_properties?.length) {
    portfolioTab.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <p style="color: var(--text-muted);">
          Your portfolio is empty. Click "Add to Portfolio" on any property to get started.
        </p>
        <div class="portfolio-sync synced" style="justify-content: center; margin-top: 16px;">
          <span class="portfolio-sync-dot"></span>
          <span>Synced to cloud</span>
        </div>
      </div>
    `;
    return;
  }
  
  // Render portfolio properties
  // ... adapt this to your existing portfolio rendering code
}

// Simple toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'error' ? '#ef4444' : '#22c55e'};
    color: white;
    border-radius: 8px;
    font-size: 14px;
    z-index: 3000;
    animation: fadeIn 0.3s;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
```

### Step 12: Update "Add to Portfolio" Button

Find your existing "Add to Portfolio" button in property detail and update it:

```javascript
// In your property detail render function, update the portfolio button:
function renderPortfolioButton(bbl) {
  const inPortfolio = isInPortfolio(bbl);
  
  if (inPortfolio) {
    return `
      <button class="portfolio-btn in-portfolio" onclick="removeFromPortfolio('${bbl}')">
        ✓ In Portfolio
      </button>
    `;
  } else {
    return `
      <button class="portfolio-btn" onclick="addToPortfolio('${bbl}')">
        + Add to Portfolio
      </button>
    `;
  }
}
```

---

## Validation Checklist

### Supabase Setup
- [ ] Email auth provider enabled
- [ ] Magic Link enabled
- [ ] Site URL configured
- [ ] Redirect URL added

### Backend
- [ ] Server starts without errors
- [ ] `POST /api/auth/login` sends magic link email
- [ ] `GET /api/auth/me` returns user when logged in
- [ ] `GET /api/portfolios` requires auth (401 without token)
- [ ] `POST /api/portfolios` creates new portfolio
- [ ] `POST /api/portfolios/:id/properties` adds property
- [ ] `DELETE /api/portfolios/:id/properties/:bbl` removes property

### Frontend
- [ ] "Sign In" button appears when logged out
- [ ] Login modal opens and accepts email
- [ ] Magic link email received
- [ ] Clicking link signs user in
- [ ] User email shows in header when logged in
- [ ] "Sign Out" works
- [ ] Portfolio syncs to database
- [ ] Portfolio persists across page refresh
- [ ] "Add to Portfolio" prompts login if not authenticated

### Test Flow
1. Open app (not logged in)
2. Click "Sign In" → enter email → submit
3. Check email → click magic link
4. Should redirect back and show logged in
5. Add property to portfolio
6. Refresh page → portfolio still there
7. Open in incognito → sign in with same email → same portfolio
8. Sign out → portfolio shows "Sign in" prompt

---

## Troubleshooting

### Magic link not received
- Check spam folder
- Verify email provider enabled in Supabase
- Check Supabase logs for email errors

### Token not persisting
- Check localStorage in browser dev tools
- Verify callback URL matches Supabase config

### 401 on portfolio endpoints
- Check Authorization header being sent
- Verify token not expired
- Check RLS policies in Supabase

### Portfolio not loading
- Verify portfolio tables exist
- Check user_id matches auth.users
- Check RLS allows select for user

---

## Files Modified

| File | Changes |
|------|---------|
| `server.js` | Added auth middleware, auth routes, portfolio routes |
| `public/index.html` | Added auth CSS, HTML, and JavaScript |

---

## Security Notes

- Tokens stored in localStorage (acceptable for this use case)
- RLS policies ensure users only see their own portfolios
- Service key never exposed to frontend
- Magic link expires after 1 hour

---

## Next Steps

After this PRP is complete:
- **PRP 2.1**: Dashboard View (portfolio health, market activity)
- **PRP 2.2**: Map Heatmap Layer
