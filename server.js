/**
 * NYC CRE Explorer - API Server
 * Queries Supabase for property data
 */

import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

// ES module dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================
// SETUP
// =============================================

const app = express();
app.set('trust proxy', 1); // Trust Railway's proxy for HTTPS
const PORT = process.env.PORT || 3000;

// Validate required environment variables
console.log('Starting server...');
console.log('PORT:', process.env.PORT || '3000 (default)');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✓ Set' : '✗ Missing');
console.log('MAPBOX_ACCESS_TOKEN:', process.env.MAPBOX_ACCESS_TOKEN ? '✓ Set' : '✗ Missing (optional)');

if (!process.env.SUPABASE_URL) {
  console.error('ERROR: SUPABASE_URL environment variable is required');
  console.error('Please set SUPABASE_URL in your Railway environment variables');
  process.exit(1);
}

if (!process.env.SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_KEY environment variable is required');
  console.error('Please set SUPABASE_KEY in your Railway environment variables');
  process.exit(1);
}

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Disable caching for all API responses
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

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

// =============================================
// FILTER CONFIGURATION (Single Source of Truth)
// =============================================

const FILTER_CONFIG = {
  // Building Class Filters
  bldgclass: {
    office: {
      prefixes: ['O'],
      label: 'Office',
      description: 'Office buildings (O1-O9)'
    },
    retail: {
      prefixes: ['K'],
      label: 'Retail', 
      description: 'Store buildings (K1-K9)'
    },
    multifam: {
      prefixes: ['C', 'D', 'S', 'R'],
      label: 'Multifamily',
      description: 'Walk-ups, Elevator Apts, Mixed-Use, Condos'
    },
    industrial: {
      prefixes: ['E', 'F', 'G', 'L'],
      label: 'Industrial',
      description: 'Warehouses, Factories, Garages, Lofts'
    }
  },
  
  // Numeric Range Filters
  ranges: {
    minFarGap: { column: 'far_gap', operator: 'gte' },
    maxFarGap: { column: 'far_gap', operator: 'lte' },
    minYear: { column: 'yearbuilt', operator: 'gte' },
    maxYear: { column: 'yearbuilt', operator: 'lte' },
    minAssessed: { column: 'assesstot', operator: 'gte' },
    maxAssessed: { column: 'assesstot', operator: 'lte' },
    minDistress: { column: 'distress_score', operator: 'gte' }
  },
  
  // Text Search Filters
  search: {
    owner: { column: 'ownername', mode: 'ilike' },
    address: { column: 'address', mode: 'ilike' },
    zipcode: { column: 'zipcode', mode: 'eq' }
  },
  
  // Sort Options
  sort: {
    options: ['far_gap', 'assesstot', 'yearbuilt', 'bldgarea', 'lotarea', 'distress_score'],
    default: 'far_gap',
    defaultOrder: 'desc'
  }
};

// Helper: Check if property matches building class filter
function matchesBldgClass(bldgclass, filterValue) {
  if (!filterValue || filterValue === 'all') return true;
  const config = FILTER_CONFIG.bldgclass[filterValue];
  if (!config) return true;
  const prefix = (bldgclass || '').charAt(0).toUpperCase();
  return config.prefixes.includes(prefix);
}

// Helper: Build Supabase query for building class
function applyBldgClassFilter(query, filterValue) {
  console.log('[applyBldgClassFilter] Input:', filterValue);
  if (!filterValue || filterValue === 'all') {
    console.log('[applyBldgClassFilter] Returning all (no filter)');
    return query;
  }
  const config = FILTER_CONFIG.bldgclass[filterValue];
  console.log('[applyBldgClassFilter] Config found:', !!config, config);
  if (!config) {
    console.log('[applyBldgClassFilter] No config, returning unfiltered');
    return query;
  }
  
  // For single prefix, use ilike directly
  if (config.prefixes.length === 1) {
    console.log('[applyBldgClassFilter] Single prefix, using ilike:', config.prefixes[0]);
    return query.ilike('bldgclass', `${config.prefixes[0]}%`);
  }
  
  // For multiple prefixes, use or() with proper format
  const conditions = config.prefixes.map(p => `bldgclass.ilike.${p}%`).join(',');
  console.log('[applyBldgClassFilter] Multiple prefixes, using or():', conditions);
  return query.or(conditions);
}

// =============================================
// API ROUTES
// =============================================

// =============================================
// AUTH ROUTES
// =============================================

/**
 * POST /api/auth/login
 * Send magic link email
 */
app.post('/api/auth/login', async (req, res) => {
  console.log('[Login] Request received. Body:', req.body);
  try {
    const { email } = req.body;
    
    if (!email) {
      console.log('[Login] Missing email');
      return res.status(400).json({ error: 'Email required' });
    }
    
    console.log('[Login] Calling signInWithOtp for:', email);
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${req.protocol}://${req.get('host')}/auth/callback`
      }
    });
    
    if (error) {
      console.error('[Login] Supabase Error:', error);
      // Pass through the status code if available
      const status = error.status || 500;
      throw error;
    }
    
    console.log('[Login] Success');
    res.json({ 
      success: true, 
      message: 'Check your email for the login link' 
    });
    
  } catch (error) {
    console.error('[Login] Exception:', error);
    res.status(error.status || 500).json({ error: 'SERVER SAYS: ' + error.message });
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

// =============================================
// DASHBOARD ROUTES (PRP 2.1)
// =============================================

/**
 * GET /api/dashboard/portfolio-summary
 * Aggregated stats for user's portfolio
 */
app.get('/api/dashboard/portfolio-summary', requireAuth, async (req, res) => {
  try {
    // 1. Get user's portfolio properties
    const { data: portfolioProps } = await supabase
      .from('portfolio_properties')
      .select('bbl, portfolios!inner(user_id)')
      .eq('portfolios.user_id', req.user.id);
      
    if (!portfolioProps || portfolioProps.length === 0) {
      return res.json({
        propertyCount: 0,
        totalAssessed: 0,
        newViolations: 0,
        avgFarGap: 0
      });
    }
    
    const bbls = portfolioProps.map(p => p.bbl);
    
    // 2. Get Property Details
    const { data: properties } = await supabase
      .from('properties')
      .select('assesstot, far_gap, violations(status, issue_date)')
      .in('bbl', bbls);
      
    // 3. Aggregate
    const propertyCount = properties.length;
    const totalAssessed = properties.reduce((sum, p) => sum + (p.assesstot || 0), 0);
    const avgFarGap = propertyCount > 0 
      ? properties.reduce((sum, p) => sum + (p.far_gap || 0), 0) / propertyCount 
      : 0;
      
    // New Violations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let newViolations = 0;
    properties.forEach(p => {
      if (p.violations) {
        newViolations += p.violations.filter(v => 
          v.status === 'Open' && new Date(v.issue_date) > thirtyDaysAgo
        ).length;
      }
    });
    
    res.json({
      propertyCount,
      totalAssessed,
      newViolations,
      avgFarGap
    });
    
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/activity
 * Recent activity feed for watched properties
 */
app.get('/api/dashboard/activity', requireAuth, async (req, res) => {
  try {
    // 1. Get BBLs
    const { data: portfolioProps } = await supabase
      .from('portfolio_properties')
      .select('bbl, portfolios!inner(user_id)')
      .eq('portfolios.user_id', req.user.id);
      
    if (!portfolioProps || portfolioProps.length === 0) {
      return res.json({ activities: [] });
    }
    const bbls = portfolioProps.map(p => p.bbl);
    
    // 2. Fetch Sales
    const { data: sales } = await supabase
      .from('sales')
      .select('sale_date, sale_price, bbl, properties(address)')
      .in('bbl', bbls)
      .order('sale_date', { ascending: false })
      .limit(10);
      
    // 3. Fetch Violations
    const { data: violations } = await supabase
      .from('violations')
      .select('issue_date, description, violation_type, bbl, properties(address)')
      .in('bbl', bbls)
      .eq('status', 'Open')
      .order('issue_date', { ascending: false })
      .limit(10);
      
    // 4. Merge and Sort
    const activities = [];
    
    sales?.forEach(s => {
      activities.push({
        type: 'sale',
        date: s.sale_date,
        title: `Sale: ${s.properties?.address || s.bbl}`,
        description: `Sold for $${(s.sale_price || 0).toLocaleString()}`,
        bbl: s.bbl
      });
    });
    
    violations?.forEach(v => {
      activities.push({
        type: 'violation',
        date: v.issue_date,
        title: `${v.violation_type} Violation: ${v.properties?.address || v.bbl}`,
        description: v.description,
        bbl: v.bbl
      });
    });
    
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({ activities: activities.slice(0, 20) });
    
  } catch (error) {
    console.error('Dashboard activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/market-pulse
 * General market statistics
 */
app.get('/api/dashboard/market-pulse', async (req, res) => {
  try {
    // 1. Sales this month
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
    
    const { data: recentSales } = await supabase
      .from('sales')
      .select('sale_price, price_per_sf, properties(bldgclass)')
      .gte('sale_date', dateStr);
      
    const salesCount = recentSales?.length || 0;
    
    // 2. Avg $/SF by Class
    const sums = {};
    const counts = {};
    
    recentSales?.forEach(s => {
      if (s.price_per_sf && s.properties?.bldgclass) {
        const prefix = s.properties.bldgclass.charAt(0);
        sums[prefix] = (sums[prefix] || 0) + s.price_per_sf;
        counts[prefix] = (counts[prefix] || 0) + 1;
      }
    });
    
    const psfByClass = {};
    Object.keys(sums).forEach(k => {
      psfByClass[k] = Math.round(sums[k] / counts[k]);
    });
    
    // 3. Volume Trend (Mocked)
    const volumeTrend = "+5%"; 
    
    res.json({
      salesCount,
      psfByClass,
      volumeTrend
    });
    
  } catch (error) {
    console.error('Market pulse error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/heatmap
 * Returns weighted points for heatmap visualization
 * Query params:
 *   metric - opportunity | price | distress
 */
app.get('/api/heatmap', async (req, res) => {
  try {
    const { metric = 'opportunity' } = req.query;
    let points = [];
    
    if (metric === 'opportunity') {
      // Fetch all properties with FAR gap
      const { data, error } = await supabase
        .from('properties')
        .select('lat, lng, far_gap')
        .gt('far_gap', 0)
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .limit(10000); // Get as many as possible
        
      if (error) throw error;
      
      points = data.map(p => ({
        lat: p.lat,
        lng: p.lng,
        weight: Math.min(p.far_gap / 10, 1) // Normalize somewhat (cap at 10 FAR gap)
      }));
      
    } else if (metric === 'price') {
      // Fetch recent sales
      const { data, error } = await supabase
        .from('sales')
        .select('price_per_sf, properties!inner(lat, lng)')
        .gt('sale_date', '2022-01-01')
        .gt('price_per_sf', 0)
        .not('properties.lat', 'is', null)
        .limit(10000);
        
      if (error) throw error;
      
      points = data.map(s => ({
        lat: s.properties.lat,
        lng: s.properties.lng,
        weight: Math.min(s.price_per_sf / 2000, 1) // Cap at $2000/sf
      }));
      
    } else if (metric === 'distress') {
      // Fetch open violations
      // Ideally we'd use the computed distress score, but that's heavy.
      // We'll count open violations per property.
      const { data, error } = await supabase
        .from('violations')
        .select('properties!inner(lat, lng)')
        .eq('status', 'Open')
        .not('properties.lat', 'is', null)
        .limit(10000);
        
      if (error) throw error;
      
      // Aggregate by location (since multiple violations per property)
      const locMap = {};
      data.forEach(v => {
        const key = `${v.properties.lat},${v.properties.lng}`;
        if (!locMap[key]) {
          locMap[key] = { lat: v.properties.lat, lng: v.properties.lng, count: 0 };
        }
        locMap[key].count++;
      });
      
      points = Object.values(locMap).map(l => ({
        lat: l.lat,
        lng: l.lng,
        weight: Math.min(l.count / 10, 1) // Cap at 10 violations
      }));
    }
    
    res.json({ metric, points });
    
  } catch (error) {
    console.error('Heatmap error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// SAVED SEARCHES ROUTES (PRP 3.1)
// =============================================

/**
 * GET /api/searches
 * List user's saved searches
 */
app.get('/api/searches', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({ searches: data });
    
  } catch (error) {
    console.error('List searches error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/searches
 * Create saved search
 */
app.post('/api/searches', requireAuth, async (req, res) => {
  try {
    const { name, filters, alert_enabled, alert_frequency } = req.body;
    
    const { data, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: req.user.id,
        name,
        filters,
        alert_enabled: alert_enabled || false,
        alert_frequency: alert_frequency || 'daily'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ search: data });
    
  } catch (error) {
    console.error('Create search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/searches/:id
 * Update saved search
 */
app.put('/api/searches/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, filters, alert_enabled, alert_frequency } = req.body;
    
    const { data, error } = await supabase
      .from('saved_searches')
      .update({
        name,
        filters,
        alert_enabled,
        alert_frequency,
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ search: data });
    
  } catch (error) {
    console.error('Update search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/searches/:id
 * Delete saved search
 */
app.delete('/api/searches/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Delete search error:', error);
    res.status(500).json({ error: error.message });
  }
});

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

// =============================================
// ADMIN ROUTES
// =============================================

/**
 * POST /api/admin/seed
 * Re-fetch data from NYC Open Data APIs and seed the database
 * This runs the fetch_nyc_data.js script
 */
app.post('/api/admin/seed', async (req, res) => {
  console.log('[Admin] Seed request received');
  
  try {
    // Run the fetch script as a child process
    const result = await new Promise((resolve, reject) => {
      exec('node fetch_nyc_data.js', { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
          console.error('[Admin] Seed script error:', error);
          reject(error);
          return;
        }
        console.log('[Admin] Seed script output:', stdout);
        if (stderr) console.error('[Admin] Seed script stderr:', stderr);
        resolve(stdout);
      });
    });
    
    res.json({ 
      success: true, 
      message: 'Data refresh completed',
      output: result.substring(0, 500) // Truncate for response
    });
    
  } catch (error) {
    console.error('[Admin] Seed error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// =============================================
// DATA ROUTES
// =============================================

/**
 * GET /api/stats
 * Returns summary statistics
 */
app.get('/api/stats', async (req, res) => {
  try {
    // Get property count by building class
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('bbl, bldgclass, far_gap, assesstot');
    
    if (propError) throw propError;
    
    // Get sales count
    const { count: salesCount, error: salesError } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true });
    
    if (salesError) throw salesError;
    
    // Calculate stats
    const byClass = {};
    let totalAssessed = 0;
    let highFarGap = 0;
    
    properties.forEach(p => {
      const prefix = (p.bldgclass || 'X').charAt(0);
      byClass[prefix] = (byClass[prefix] || 0) + 1;
      totalAssessed += p.assesstot || 0;
      if (p.far_gap > 2) highFarGap++;
    });
    
    res.json({
      properties: properties.length,
      sales: salesCount || 0,
      byBuildingClass: byClass,
      totalAssessedValue: totalAssessed,
      highFarGapCount: highFarGap,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/data
 * 
 * THE unified endpoint. Returns everything the frontend needs to render.
 * Frontend should NEVER filter data - just render what this returns.
 * 
 * Query params:
 *   bldgclass    - Semantic filter: office|retail|multifam|industrial|all
 *   minFarGap    - Minimum FAR gap
 *   maxFarGap    - Maximum FAR gap  
 *   minYear      - Minimum year built
 *   maxYear      - Maximum year built
 *   owner        - Owner name search (partial)
 *   address      - Address search (partial)
 *   zipcode      - Exact zipcode match
 *   minDistress  - Minimum distress score
 *   sort         - Sort field
 *   order        - asc|desc
 *   limit        - Max properties (default 500)
 *   salesDays    - Sales from last N days (default 365)
 *   salesLimit   - Max sales (default 100)
 */
app.get('/api/data', async (req, res) => {
  try {
    const {
      bldgclass = 'all',
      minFarGap,
      maxFarGap,
      minYear,
      maxYear,
      owner,
      address,
      zipcode,
      minDistress,
      sort = FILTER_CONFIG.sort.default,
      order = FILTER_CONFIG.sort.defaultOrder,
      limit = 500,
      salesDays = 365,
      salesLimit = 100
    } = req.query;
    
    console.log('[/api/data] Request:', { bldgclass, minFarGap, minDistress, limit });
    
    // ─────────────────────────────────────────
    // 0. GET TOTAL COUNTS (Optimization)
    // ─────────────────────────────────────────
    // Get absolute total in DB
    const { count: totalInDatabase } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true });

    // Helper to apply SQL filters (reused for count)
    const applySqlFilters = (q) => {
      q = applyBldgClassFilter(q, bldgclass);
      if (minFarGap) q = q.gte('far_gap', parseFloat(minFarGap));
      if (maxFarGap) q = q.lte('far_gap', parseFloat(maxFarGap));
      if (minYear) q = q.gte('yearbuilt', parseInt(minYear));
      if (maxYear) q = q.lte('yearbuilt', parseInt(maxYear));
      if (owner) q = q.ilike('ownername', `%${owner}%`);
      if (address) q = q.ilike('address', `%${address}%`);
      if (zipcode) q = q.eq('zipcode', zipcode);
      return q;
    };

    // Get accurate filtered count (SQL only)
    // We do this separately to avoid the fetch limit cap
    let countQuery = supabase.from('properties').select('*', { count: 'exact', head: true });
    countQuery = applySqlFilters(countQuery);
    const { count: totalFilteredSQL } = await countQuery;

    // ─────────────────────────────────────────
    // 1. QUERY PROPERTIES
    // ─────────────────────────────────────────
    let propQuery = supabase
      .from('properties')
      .select('*, violations(violation_type, status)');
    
    // Apply filters
    propQuery = applySqlFilters(propQuery);
    
    // Fetch properties
    // Note: If filtering by distress (calculated field), we must fetch all matches first
    // If NOT filtering by distress, we could technically limit here, but we need 
    // the full set for accurate stats (e.g. avg PSF) anyway.
    // We'll stick to the 10k limit to catch everything for now.
    const fetchLimit = 10000; 
    propQuery = propQuery.limit(fetchLimit);
    
    const { data: rawProperties, error: propError } = await propQuery;
    if (propError) throw propError;
    
    console.log('[/api/data] Fetched', rawProperties.length, 'properties from database');
    
    // Calculate distress score and max_far on the fly for each property
    const enrichedProperties = rawProperties.map(p => {
      const openViolations = (p.violations || []).filter(v => v.status === 'Open');
      const hpdCount = openViolations.filter(v => v.violation_type === 'HPD').length;
      const dobCount = openViolations.filter(v => v.violation_type === 'DOB').length;
      
      const calculatedScore = Math.min(hpdCount, 20) + Math.min(dobCount * 5, 30);
      
      // Calculate Max FAR for display context
      const maxFar = Math.max(p.residfar || 0, p.commfar || 0, p.facilfar || 0);

      return {
        ...p,
        distress_score: calculatedScore,
        violation_count: openViolations.length,
        max_far: maxFar, // Explicitly send this to frontend
        violations: undefined // Remove from response to keep it clean
      };
    });
    
    // Apply distress filter after calculation
    let filteredProperties = enrichedProperties;
    if (minDistress) {
      filteredProperties = enrichedProperties.filter(p => p.distress_score >= parseInt(minDistress));
    }
    
    // Sorting
    const sortField = FILTER_CONFIG.sort.options.includes(sort) ? sort : FILTER_CONFIG.sort.default;
    const ascending = order === 'asc';
    
    filteredProperties.sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      return ascending ? aVal - bVal : bVal - aVal;
    });
    
    // Store total count before applying limit
    const totalFilteredCount = filteredProperties.length;
    
    // Apply limit after sorting
    const properties = minDistress ? filteredProperties : filteredProperties.slice(0, parseInt(limit));
    
    // ─────────────────────────────────────────
    // 2. QUERY SALES (matching same filters)
    // ─────────────────────────────────────────
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(salesDays));
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    
    let salesQuery = supabase
      .from('sales')
      .select(`
        *,
        properties!inner (
          address,
          bldgclass,
          ownername,
          zonedist1,
          far_gap
        )
      `)
      .gte('sale_date', cutoffStr)
      .order('sale_date', { ascending: false })
      .limit(parseInt(salesLimit));
    
    const { data: rawSales, error: salesError } = await salesQuery;
    if (salesError) throw salesError;
    
    // Filter sales by building class (applied to joined property)
    const sales = rawSales.filter(s => 
      matchesBldgClass(s.properties?.bldgclass, bldgclass)
    );
    
    // ─────────────────────────────────────────
    // 3. COMPUTE STATS
    // ─────────────────────────────────────────
    // If we filtered by distress (JS filter), we can only know the count of what we fetched.
    // Otherwise, use the accurate SQL count.
    const accurateTotalCount = minDistress ? filteredProperties.length : totalFilteredSQL;

    const stats = {
      propertyCount: properties.length, // Count of properties returned (limited)
      totalCount: accurateTotalCount,   // Total count matching filters
      totalInDatabase,                  // Absolute total in DB
      salesCount: sales.length,
      
      // By building class (of filtered results)
      byClass: properties.reduce((acc, p) => {
        const prefix = (p.bldgclass || 'X').charAt(0);
        acc[prefix] = (acc[prefix] || 0) + 1;
        return acc;
      }, {}),
      
      // Totals
      totalAssessed: properties.reduce((sum, p) => sum + (p.assesstot || 0), 0),
      totalSF: properties.reduce((sum, p) => sum + (p.bldgarea || 0), 0),
      
      // Opportunity metrics
      highFarGapCount: properties.filter(p => p.far_gap > 2).length,
      avgFarGap: properties.length > 0 
        ? properties.reduce((sum, p) => sum + (p.far_gap || 0), 0) / properties.length 
        : 0,
      
      // Sales metrics
      avgSalePrice: sales.length > 0
        ? sales.reduce((sum, s) => sum + (s.sale_price || 0), 0) / sales.length
        : 0,
      avgPricePerSF: sales.filter(s => s.price_per_sf).length > 0
        ? sales.filter(s => s.price_per_sf).reduce((sum, s) => sum + s.price_per_sf, 0) / sales.filter(s => s.price_per_sf).length
        : 0,
      
      // Active filters (echo back for UI state sync)
      activeFilters: {
        bldgclass,
        minFarGap: minFarGap || null,
        maxFarGap: maxFarGap || null,
        minYear: minYear || null,
        maxYear: maxYear || null,
        owner: owner || null,
        address: address || null,
        zipcode: zipcode || null,
        minDistress: minDistress || null,
        sort: sortField,
        order
      }
    };
    
    console.log(`[/api/data] Returning ${properties.length} properties, ${sales.length} sales`);
    
    // ─────────────────────────────────────────
    // 4. RETURN UNIFIED RESPONSE
    // ─────────────────────────────────────────
    res.json({
      properties,
      sales,
      stats,
      meta: {
        timestamp: new Date().toISOString(),
        filterConfig: FILTER_CONFIG.bldgclass // Send filter options for UI
      }
    });
    
  } catch (error) {
    console.error('Data endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/properties
 * Returns property list with filtering
 * 
 * Query params:
 *   bldgclass - Filter by building class prefix (O, K, D, E, R)
 *   minFarGap - Minimum FAR gap
 *   owner - Owner name search (partial match)
 *   minYear - Minimum year built
 *   maxYear - Maximum year built
 *   zipcode - Filter by zipcode
 *   limit - Max results (default 100)
 *   offset - Pagination offset
 *   sort - Sort field (far_gap, assesstot, yearbuilt)
 *   order - Sort order (asc, desc)
 */
app.get('/api/properties', async (req, res) => {
  try {
    const {
      bldgclass,
      minFarGap,
      minDistress,
      owner,
      minYear,
      maxYear,
      zipcode,
      limit = 50,
      offset = 0,
      sort = 'far_gap',
      order = 'desc'
    } = req.query;

    console.log('GET /api/properties params:', { minDistress, limit, bldgclass });
    
    // Start query - select properties with violations
    let query = supabase
      .from('properties')
      .select('*, violations(violation_type, status)');
    
    // Apply filters
    if (bldgclass) {
      if (bldgclass === 'multifam') {
        // Multifamily: Walk-up(C), Elevator(D), Mixed(S), Condo(R)
        query = query.or('bldgclass.ilike.C%,bldgclass.ilike.D%,bldgclass.ilike.S%,bldgclass.ilike.R%');
      } else if (bldgclass === 'industrial') {
        // Industrial: Warehouse(E), Factory(F), Garage(G), Loft(L)
        query = query.or('bldgclass.ilike.E%,bldgclass.ilike.F%,bldgclass.ilike.G%,bldgclass.ilike.L%');
      } else if (bldgclass === 'office') {
        query = query.ilike('bldgclass', 'O%');
      } else if (bldgclass === 'retail') {
        query = query.ilike('bldgclass', 'K%');
      } else {
        // Fallback
        query = query.ilike('bldgclass', `${bldgclass}%`);
      }
    }
    
    if (minFarGap) {
      query = query.gte('far_gap', parseFloat(minFarGap));
    }
    
    if (owner) {
      query = query.ilike('ownername', `%${owner}%`);
    }
    
    if (minYear) {
      query = query.gte('yearbuilt', parseInt(minYear));
    }
    
    if (maxYear) {
      query = query.lte('yearbuilt', parseInt(maxYear));
    }
    
    if (zipcode) {
      query = query.eq('zipcode', zipcode);
    }
    
    // Pagination - fetch more to ensure we have enough after filtering
    // If filtering by distress, we must scan ALL properties to find them, since we can't filter by computed score in DB
    const fetchLimit = minDistress ? 10000 : parseInt(limit);
    query = query.range(parseInt(offset), parseInt(offset) + fetchLimit - 1);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Debug: Check first property's violations
    if (data.length > 0) {
      console.log('Sample property violations:', data[0].bbl, data[0].violations);
    }
    
    // Calculate distress score on the fly for each property
    const enriched = data.map(p => {
      const openViolations = (p.violations || []).filter(v => v.status === 'Open');
      const hpdCount = openViolations.filter(v => v.violation_type === 'HPD').length;
      const dobCount = openViolations.filter(v => v.violation_type === 'DOB').length;
      
      const calculatedScore = Math.min(hpdCount, 20) + Math.min(dobCount * 5, 30);
      const maxFar = Math.max(p.residfar || 0, p.commfar || 0, p.facilfar || 0);
      
      return {
        ...p,
        distress_score: calculatedScore,
        violation_count: openViolations.length,
        max_far: maxFar,
        violations: undefined // Remove from response to keep it clean
      };
    });
    
    console.log(`Fetched ${data.length} properties, ${enriched.filter(p => p.distress_score > 0).length} with violations`);
    
    // Apply distress filter after calculation
    let filtered = enriched;
    if (minDistress) {
      filtered = enriched.filter(p => p.distress_score >= parseInt(minDistress));
    }
    
    // Sorting
    const validSorts = ['far_gap', 'assesstot', 'yearbuilt', 'bldgarea', 'lotarea', 'distress_score'];
    const sortField = validSorts.includes(sort) ? sort : 'far_gap';
    const ascending = order === 'asc';
    
    filtered.sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      return ascending ? aVal - bVal : bVal - aVal;
    });
    
    // When filtering by distress, return all matches; otherwise apply limit
    const final = minDistress ? filtered : filtered.slice(0, parseInt(limit));
    
    res.json({
      count: final.length,
      offset: parseInt(offset),
      properties: final
    });
    
  } catch (error) {
    console.error('Properties error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/properties/:bbl
 * Returns single property with sales history
 */
app.get('/api/properties/:bbl', async (req, res) => {
  try {
    const { bbl } = req.params;
    
    // Get property with violations
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('*, violations(violation_type, status)')
      .eq('bbl', bbl)
      .single();
    
    if (propError) throw propError;
    
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    // Calculate distress score on the fly
    const openViolations = (property.violations || []).filter(v => v.status === 'Open');
    const hpdCount = openViolations.filter(v => v.violation_type === 'HPD').length;
    const dobCount = openViolations.filter(v => v.violation_type === 'DOB').length;
    const calculatedScore = Math.min(hpdCount, 20) + Math.min(dobCount * 5, 30);
    const maxFar = Math.max(property.residfar || 0, property.commfar || 0, property.facilfar || 0);
    
    // Get sales history
    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .eq('bbl', bbl)
      .order('sale_date', { ascending: false });

    // Get permits
    const { data: permits } = await supabase
      .from('permits')
      .select('*')
      .eq('bbl', bbl)
      .order('issue_date', { ascending: false });

    res.json({
      ...property,
      distress_score: calculatedScore, // Override DB value with real-time calc
      violation_count: openViolations.length,
      max_far: maxFar, // Explicit return
      violations: openViolations, // Return full violations list
      sales: sales || [],
      permits: permits || []
    });
    
  } catch (error) {
    console.error('Property detail error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/properties/:bbl/comps
 * Returns comparable sales for a property
 */
app.get('/api/properties/:bbl/comps', async (req, res) => {
  console.log(`[Comps] Request received for BBL: ${req.params.bbl}`);
  try {
    const { bbl } = req.params;
    const { radius = 0.5, limit = 5 } = req.query;
    
    // 1. Get subject property
    const { data: subject, error: subError } = await supabase
      .from('properties')
      .select('*')
      .eq('bbl', bbl)
      .single();
      
    if (subError || !subject) throw new Error('Subject property not found');
    
    // 2. Define search criteria
    if (!subject.lat || !subject.lng) {
      return res.json({ subject, comps: [], marketStats: null, note: 'No coordinates for subject' });
    }

    const latBuffer = parseFloat(radius) / 69;
    const lngBuffer = parseFloat(radius) / 53;
    
    const minLat = subject.lat - latBuffer;
    const maxLat = subject.lat + latBuffer;
    const minLng = subject.lng - lngBuffer;
    const maxLng = subject.lng + lngBuffer;
    
    const minArea = (subject.bldgarea || 0) * 0.25;
    const maxArea = (subject.bldgarea || 0) * 2.5;
    
    // Define Class Groups
    const bldgClass = subject.bldgclass || '';
    const prefix = bldgClass.charAt(0);
    let allowedPrefixes = [];
    
    if (['A','B'].includes(prefix)) {
      allowedPrefixes = ['A','B'];
    } else if (['C','D','S','R'].includes(prefix)) {
      allowedPrefixes = ['C','D','S','R'];
    } else if (prefix === 'O') {
      allowedPrefixes = ['O'];
    } else if (prefix === 'K') {
      allowedPrefixes = ['K'];
    } else if (prefix === 'L') {
      allowedPrefixes = ['L'];
    } else if (['E','F','G'].includes(prefix)) {
      allowedPrefixes = ['E','F','G'];
    } else {
      allowedPrefixes = [prefix];
    }

    // 3. Query Sales
    const { data: candidates, error: candError } = await supabase
      .from('sales')
      .select(`
        *,
        properties!inner (
          address, bldgclass, bldgarea, lat, lng, yearbuilt
        )
      `)
      .gte('sale_date', '2022-01-01')
      .neq('bbl', bbl)
      .gt('sale_price', 100000)
      .order('sale_date', { ascending: false })
      .limit(200);
      
    if (candError) throw candError;

    // 4. Filter in JS
    const comps = candidates.filter(s => {
      const p = s.properties;
      if (!p) return false;
      const pClass = p.bldgclass ? p.bldgclass.charAt(0) : '';
      if (allowedPrefixes.length > 0 && !allowedPrefixes.includes(pClass)) return false;
      if (subject.bldgarea > 1000) {
         if (p.bldgarea < minArea || p.bldgarea > maxArea) return false;
      }
      if (p.lat < minLat || p.lat > maxLat) return false;
      if (p.lng < minLng || p.lng > maxLng) return false;
      return true;
    }).slice(0, parseInt(limit));

    // 5. Calculate price_per_sf on the fly if not in DB
    const enrichedComps = comps.map(c => {
      const bldgarea = c.properties.bldgarea || 0;
      const calculatedPSF = bldgarea > 0 && c.sale_price > 0 
        ? Math.round(c.sale_price / bldgarea)
        : null;
      
      return {
        bbl: c.bbl,
        address: c.properties.address,
        sale_date: c.sale_date,
        sale_price: c.sale_price,
        bldgarea: bldgarea,
        price_per_sf: c.price_per_sf || calculatedPSF, // Use DB value or calculate
        dist_miles: Math.sqrt(Math.pow((c.properties.lat - subject.lat) * 69, 2) + Math.pow((c.properties.lng - subject.lng) * 53, 2)).toFixed(2)
      };
    });
    
    // 6. Stats
    let avgPricePerSF = 0;
    let medianPricePerSF = 0;
    if (enrichedComps.length > 0) {
      const prices = enrichedComps.filter(c => c.price_per_sf > 0).map(c => c.price_per_sf);
      if (prices.length > 0) {
        avgPricePerSF = Math.round(prices.reduce((a,b) => a+b, 0) / prices.length);
        prices.sort((a,b) => a-b);
        const mid = Math.floor(prices.length / 2);
        medianPricePerSF = prices.length % 2 !== 0 ? prices[mid] : (prices[mid-1] + prices[mid]) / 2;
      }
    }

    res.json({
      subject: {
        bbl: subject.bbl,
        address: subject.address,
        bldgarea: subject.bldgarea,
        bldgclass: subject.bldgclass
      },
      comps: enrichedComps,
      marketStats: {
        avgPricePerSF,
        medianPricePerSF,
        count: enrichedComps.length
      }
    });
  } catch (error) {
    console.error('Comps error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sales
 * Returns recent sales with filtering
 * 
 * Query params:
 *   bldgclass - Building class filter
 *   minPrice - Minimum sale price
 *   maxPrice - Maximum sale price
 *   days - Sales from last N days
 *   limit - Max results (default 50)
 */
app.get('/api/sales', async (req, res) => {
  try {
    const {
      bldgclass,
      minPrice,
      maxPrice,
      days = 365,
      limit = 50
    } = req.query;
    
    // Calculate date cutoff
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    const cutoffStr = cutoff.toISOString().split('T')[0];
    
    let query = supabase
      .from('sales')
      .select(`
        *,
        properties (
          address,
          bldgclass,
          ownername,
          zonedist1
        )
      `)
      .gte('sale_date', cutoffStr)
      .order('sale_date', { ascending: false })
      .limit(parseInt(limit));
    
    if (minPrice) {
      query = query.gte('sale_price', parseInt(minPrice));
    }
    
    if (maxPrice) {
      query = query.lte('sale_price', parseInt(maxPrice));
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Filter by building class if specified (from joined property)
    let filtered = data;
    if (bldgclass) {
      filtered = data.filter(s => 
        s.properties?.bldgclass?.startsWith(bldgclass)
      );
    }
    
    res.json({
      count: filtered.length,
      sales: filtered
    });
    
  } catch (error) {
    console.error('Sales error:', error);
    res.status(500).json({ error: error.message });
  }
});


/**
 * GET /api/owners/distressed
 * Returns owners ranked by distress signals
 */
app.get('/api/owners/distressed', async (req, res) => {
  try {
    const { limit = 50, minScore = 20, minProperties = 1 } = req.query;
    
    // 1. Fetch all properties (lightweight)
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('bbl, ownername, assesstot, bldgclass');
      
    if (propError) throw propError;
    
    // 2. Fetch open violations
    const { data: violations, error: violError } = await supabase
      .from('violations')
      .select('bbl, violation_type, issue_date')
      .eq('status', 'Open');
      
    if (violError) throw violError;
    
    // 3. Group by Owner
    const ownersMap = {};
    const bblViolations = {};
    
    // Index violations by BBL
    violations.forEach(v => {
      if (!bblViolations[v.bbl]) bblViolations[v.bbl] = [];
      bblViolations[v.bbl].push(v);
    });
    
    // Aggregate properties to owners
    properties.forEach(p => {
      const name = p.ownername || 'Unknown Owner';
      if (!ownersMap[name]) {
        ownersMap[name] = {
          name,
          properties: [],
          totalAssessed: 0,
          totalViolations: 0,
          violationAges: [],
          propsWithViolations: 0
        };
      }
      
      const owner = ownersMap[name];
      owner.properties.push(p);
      owner.totalAssessed += (p.assesstot || 0);
      
      const propsViols = bblViolations[p.bbl] || [];
      if (propsViols.length > 0) {
        owner.totalViolations += propsViols.length;
        owner.propsWithViolations++;
        
        // Calculate ages (days)
        const now = new Date();
        propsViols.forEach(v => {
          if (v.issue_date) {
            const age = (now - new Date(v.issue_date)) / (1000 * 60 * 60 * 24);
            owner.violationAges.push(age);
          }
        });
      }
    });
    
    // 4. Calculate Scores
    const scoredOwners = Object.values(ownersMap).map(o => {
      let score = 0;
      
      const pctWithViolations = o.propsWithViolations / o.properties.length;
      const avgViolationAge = o.violationAges.length > 0 
          ? o.violationAges.reduce((a, b) => a + b, 0) / o.violationAges.length 
          : 0;
      
      // Filter by portfolio size early
      if (o.properties.length < parseInt(minProperties)) return null;
      
      // Metrics
      // 1. Base Score (Violations per property)
      // If > 1 violation per property on average, that's bad.
      const violationsPerProp = o.totalViolations / o.properties.length;
      score += Math.min(violationsPerProp * 10, 40);
      
      // 2. Portfolio Spread
      // If > 50% of portfolio has violations
      if (pctWithViolations > 0.5) {
        score += 20;
      }

      // 3. Chronic Issues (Max 20)
      // If avg violation is > 1 year old (365 days)
      score += Math.min((avgViolationAge / 365) * 10, 20);
      
      // 4. Single Asset Risk (Max 5)
      if (o.properties.length === 1 && o.totalViolations > 0) {
        score += 5;
      }
      
      // 5. Overwhelmed (Max 15)
      // If violations > properties * 5
      if (o.totalViolations > o.properties.length * 5) {
        score += 15;
      }
      
      return {
        name: o.name,
        propertyCount: o.properties.length,
        totalAssessed: o.totalAssessed,
        openViolations: o.totalViolations,
        pctWithViolations: Math.round(pctWithViolations * 100),
        avgViolationAgeDays: Math.round(avgViolationAge),
        distressScore: Math.round(score),
        entityType: detectEntityType(o.name),
        topIssues: determineIssues(o.totalViolations, avgViolationAge, pctWithViolations)
      };
    })
    .filter(Boolean) // Remove nulls
    .filter(o => o.distressScore >= parseInt(minScore));
    
    // 5. Sort and Limit
    scoredOwners.sort((a, b) => b.distressScore - a.distressScore);
    const finalOwners = scoredOwners.slice(0, parseInt(limit));
    
    res.json({
      count: scoredOwners.length,
      owners: finalOwners
    });
    
  } catch (error) {
    console.error('Distressed owners error:', error);
    res.status(500).json({ error: error.message });
  }
});

function determineIssues(viols, age, pct) {
  const issues = [];
  if (viols > 10) issues.push('Many Violations');
  if (age > 365) issues.push('Chronic Issues');
  if (pct > 0.5) issues.push('Portfolio Contamination');
  if (issues.length === 0 && viols > 0) issues.push('Minor Violations');
  return issues;
}

/**
 * GET /api/owners/:name

 * Returns all properties for an owner with portfolio analytics
 */
app.get('/api/owners/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    // 1. Fetch properties with full details
    const { data: properties, error } = await supabase
      .from('properties')
      .select('*')
      .ilike('ownername', `%${name}%`)
      .order('assesstot', { ascending: false });
    
    if (error) throw error;

    if (!properties || properties.length === 0) {
      return res.json({ searchTerm: name, matchCount: 0, owners: [] });
    }
    
    // 2. Fetch violations for these properties
    const bbls = properties.map(p => p.bbl);
    const { data: violations } = await supabase
      .from('violations')
      .select('bbl, status, violation_type')
      .in('bbl', bbls);
    
    // Count violations by BBL
    const violationsByBbl = {};
    (violations || []).forEach(v => {
      if (!violationsByBbl[v.bbl]) violationsByBbl[v.bbl] = { open: 0, total: 0 };
      violationsByBbl[v.bbl].total++;
      if (v.status === 'Open') {
        violationsByBbl[v.bbl].open++;
      }
    });
    
    // 3. Fetch sales to calculate holding period
    const { data: sales } = await supabase
      .from('sales')
      .select('bbl, sale_date, sale_price')
      .in('bbl', bbls)
      .order('sale_date', { ascending: false });

    // Map BBL -> Latest Sale
    const latestSales = {};
    (sales || []).forEach(s => {
      if (!latestSales[s.bbl]) latestSales[s.bbl] = s;
    });
    
    // 4. Group and Aggregate
    const byOwner = {};
    properties.forEach(p => {
      const owner = p.ownername || 'Unknown';
      if (!byOwner[owner]) {
        byOwner[owner] = {
          name: owner,
          entityType: detectEntityType(owner),
          properties: [],
          totalAssessed: 0,
          totalSF: 0,
          totalLotArea: 0,
          blocks: new Set(),
          holdingPeriods: [],
          totalOpenViolations: 0,
          totalViolations: 0
        };
      }
      
      const ownerData = byOwner[owner];
      
      // Add violation counts to property
      const viol = violationsByBbl[p.bbl];
      p.openViolations = viol ? viol.open : 0;
      p.totalViolations = viol ? viol.total : 0;
      
      ownerData.properties.push(p);
      ownerData.totalAssessed += p.assesstot || 0;
      ownerData.totalSF += p.bldgarea || 0;
      ownerData.totalLotArea += p.lotarea || 0;
      
      // Extract block from BBL (positions 1-6 for Manhattan)
      if (p.bbl && p.bbl.length >= 6) {
        ownerData.blocks.add(p.bbl.substring(1, 6));
      }
      
      // Holding period calculation
      const lastSale = latestSales[p.bbl];
      if (lastSale && lastSale.sale_date) {
        const years = (new Date() - new Date(lastSale.sale_date)) / (365.25 * 24 * 60 * 60 * 1000);
        ownerData.holdingPeriods.push(years);
      }
      
      // Violations
      if (viol) {
        ownerData.totalOpenViolations += viol.open;
        ownerData.totalViolations += viol.total;
      }
    });
    
    // 5. Calculate derived metrics for each owner
    const owners = Object.values(byOwner).map(owner => {
      const blockArray = Array.from(owner.blocks);
      
      // Concentration score: 1 = all on same block, 0 = spread across many blocks
      const concentrationScore = owner.properties.length > 1 
        ? 1 - Math.min(blockArray.length / owner.properties.length, 1)
        : 0;
      
      // Average holding period
      const avgHoldingPeriod = owner.holdingPeriods.length > 0
        ? owner.holdingPeriods.reduce((a, b) => a + b, 0) / owner.holdingPeriods.length
        : null;
      
      return {
        name: owner.name,
        entityType: owner.entityType,
        propertyCount: owner.properties.length,
        properties: owner.properties,
        totalAssessed: owner.totalAssessed,
        totalSF: owner.totalSF,
        totalLotArea: owner.totalLotArea,
        avgHoldingPeriod: avgHoldingPeriod ? Math.round(avgHoldingPeriod * 10) / 10 : null,
        totalOpenViolations: owner.totalOpenViolations,
        totalViolations: owner.totalViolations,
        concentrationScore: Math.round(concentrationScore * 100) / 100,
        blocks: blockArray
      };
    });
    
    // Sort by total assessed value
    owners.sort((a, b) => b.totalAssessed - a.totalAssessed);
    
    res.json({
      searchTerm: name,
      matchCount: properties.length,
      owners
    });
    
  } catch (error) {
    console.error('Owner search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Detect entity type from owner name
 */
function detectEntityType(name) {
  if (!name) return 'Unknown';
  const upper = name.toUpperCase();
  
  if (upper.includes(' LLC') || upper.includes(' L.L.C')) return 'LLC';
  if (upper.includes(' LP') || upper.includes(' L.P')) return 'LP';
  if (upper.includes(' INC') || upper.includes(' CORP')) return 'Corporation';
  if (upper.includes(' TRUST') || upper.includes(' TRUSTEES')) return 'Trust';
  if (upper.includes(' PARTNERS') || upper.includes(' PARTNERSHIP')) return 'Partnership';
  if (upper.includes(' ASSOC') || upper.includes(' ASSOCIATION')) return 'Association';
  if (upper.includes('CITY OF') || upper.includes('STATE OF') || upper.includes('USA ')) return 'Government';
  if (upper.includes(' CO ') || upper.includes(' COMPANY')) return 'Company';
  
  // If no patterns match, likely individual
  // Check for common individual name patterns (LASTNAME FIRSTNAME or similar)
  const words = name.trim().split(/\s+/);
  if (words.length <= 3 && !upper.includes(',')) {
    return 'Individual';
  }
  
  return 'Unknown';
}

/**
 * GET /api/opportunities
 * Returns properties ranked by investment opportunity signals
 */
app.get('/api/opportunities', async (req, res) => {
  try {
    const { limit = 25 } = req.query;
    
    // Get properties with high FAR gap
    const { data: properties, error } = await supabase
      .from('properties')
      .select('*')
      .gt('far_gap', 0.5) // Lowered threshold to catch more potential
      .order('far_gap', { ascending: false })
      .limit(parseInt(limit) * 2); // Fetch more to filter later
    
    if (error) throw error;
    
    // Get latest sales for these properties
    const bbls = properties.map(p => p.bbl);
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('bbl, sale_date, sale_price')
      .in('bbl', bbls)
      .order('sale_date', { ascending: false });
      
    if (salesError) throw salesError;
    
    // Map latest sale to property
    const latestSales = {};
    sales.forEach(s => {
      if (!latestSales[s.bbl]) { // First one is latest due to sort
        latestSales[s.bbl] = s;
      }
    });

    // Calculate refined opportunity score
    const scored = properties.map(p => {
      let score = 0;
      const sale = latestSales[p.bbl];
      
      // 1. FAR Gap (0-40 points)
      // Cap at 40. 1.0 FAR gap = 10pts, 4.0 FAR gap = 40pts
      score += Math.min((p.far_gap || 0) * 10, 40);
      
      // 2. Ownership Tenure (0-20 points)
      // Longer tenure = higher score (potential motivation to sell)
      let tenureYears = 0;
      if (sale && sale.sale_date) {
        const saleDate = new Date(sale.sale_date);
        const now = new Date();
        tenureYears = (now - saleDate) / (1000 * 60 * 60 * 24 * 365);
      } else {
        // Fallback to yearbuilt if no sale, but cap it (less reliable)
        // or assume long tenure if no recent sale found
        tenureYears = 10; 
      }
      score += Math.min(tenureYears * 1, 20);
      
      // 3. Assessment Value Ratio (0-20 points)
      // If Assessed Value is high relative to Last Sale, it might be a deal
      // NYC Class 4 Assessed is ~45% of market.
      // If (Assessed / Sale) > 0.45, it means Assessed > 45% of Sale, implying Sale was low.
      let valueRatio = 0;
      if (sale && sale.sale_price > 1000) { // Ignore nominal sales
        valueRatio = (p.assesstot || 0) / sale.sale_price;
        // Score: 0.45 ratio = 10 pts. 0.9 ratio = 20 pts.
        score += Math.min(valueRatio * 20, 20);
      }
      
      // 4. Building Class / Size Bonus (0-20 points)
      // Large lots get bonus
      score += Math.min((p.lotarea || 0) / 2000, 10);
      // Multifamily (D) gets bonus
      if (p.bldgclass && p.bldgclass.startsWith('D')) {
        score += 10;
      }

      return {
        ...p,
        tenure: Math.round(tenureYears * 10) / 10,
        lastSaleDate: sale ? sale.sale_date : null,
        lastSalePrice: sale ? sale.sale_price : null,
        assessmentRatio: valueRatio,
        opportunityScore: Math.round(score)
      };
    });
    
    // Sort by score
    scored.sort((a, b) => b.opportunityScore - a.opportunityScore);
    
    // Return requested limit
    const finalResults = scored.slice(0, parseInt(limit));
    
    res.json({
      count: finalResults.length,
      properties: finalResults
    });
    
  } catch (error) {
    console.error('Opportunities error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/properties/:bbl/comps
 * Returns comparable sales for a property
 */
app.get('/api/properties/:bbl/comps', async (req, res) => {
  console.log(`[Comps] Request received for BBL: ${req.params.bbl}`);
  try {
    const { bbl } = req.params;
    const { radius = 0.5, limit = 5 } = req.query;
    
    // 1. Get subject property
    const { data: subject, error: subError } = await supabase
      .from('properties')
      .select('*')
      .eq('bbl', bbl)
      .single();
      
    if (subError || !subject) throw new Error('Subject property not found');
    
    // 2. Define search criteria
    if (!subject.lat || !subject.lng) {
      return res.json({ subject, comps: [], marketStats: null, note: 'No coordinates for subject' });
    }

    const latBuffer = parseFloat(radius) / 69; // 1 deg lat = ~69 miles
    const lngBuffer = parseFloat(radius) / 53; // 1 deg lng = ~53 miles (at NYC lat)
    
    const minLat = subject.lat - latBuffer;
    const maxLat = subject.lat + latBuffer;
    const minLng = subject.lng - lngBuffer;
    const maxLng = subject.lng + lngBuffer;
    
    const minArea = (subject.bldgarea || 0) * 0.25; // Widened to 0.25x
    const maxArea = (subject.bldgarea || 0) * 2.5;  // Widened to 2.5x
    
    // Define Class Groups for better matching based on NYC Dept of Finance classifications
    const bldgClass = subject.bldgclass || '';
    const prefix = bldgClass.charAt(0);
    let allowedPrefixes = [];
    
    if (['A','B'].includes(prefix)) {
      // 1-2 Family Dwellings (Small Residential)
      allowedPrefixes = ['A','B'];
    } else if (['C','D','S','R'].includes(prefix)) {
      // Multifamily, Mixed-Use, Condos, Co-ops (Apartments)
      // Allows comparing Walk-ups (C), Elevator (D), Mixed (S), and Condos (R)
      allowedPrefixes = ['C','D','S','R'];
    } else if (prefix === 'O') {
      // Office Only
      allowedPrefixes = ['O'];
    } else if (prefix === 'K') {
      // Retail Only
      allowedPrefixes = ['K'];
    } else if (prefix === 'L') {
      // Lofts
      allowedPrefixes = ['L'];
    } else if (['E','F','G'].includes(prefix)) {
      // Industrial / Warehouse / Garage
      allowedPrefixes = ['E','F','G'];
    } else {
      // Fallback: strict match
      allowedPrefixes = [prefix];
    }

    // 3. Query Sales that match criteria
    const { data: candidates, error: candError } = await supabase
      .from('sales')
      .select(`
        *,
        properties!inner (
          address, bldgclass, bldgarea, lat, lng, yearbuilt
        )
      `)
      .gte('sale_date', '2022-01-01')
      .neq('bbl', bbl)
      .gt('sale_price', 100000)
      .order('sale_date', { ascending: false })
      .limit(200); // Fetch more candidates
      
    if (candError) throw candError;

    // 4. Filter in JS
    const comps = candidates.filter(s => {
      const p = s.properties;
      if (!p) return false;
      
      // Class Group Match
      const pClass = p.bldgclass ? p.bldgclass.charAt(0) : '';
      if (allowedPrefixes.length > 0 && !allowedPrefixes.includes(pClass)) return false;
      
      // Size match (skip if subject size is 0 or null)
      if (subject.bldgarea > 1000) {
         if (p.bldgarea < minArea || p.bldgarea > maxArea) return false;
      }
      
      // Location match (bounding box)
      if (p.lat < minLat || p.lat > maxLat) return false;
      if (p.lng < minLng || p.lng > maxLng) return false;
      
      return true;
    }).slice(0, parseInt(limit));

    // 5. Calculate Stats
    let avgPricePerSF = 0;
    let medianPricePerSF = 0;
    
    if (comps.length > 0) {
      const prices = comps
        .filter(c => c.price_per_sf > 0)
        .map(c => c.price_per_sf);
        
      if (prices.length > 0) {
        avgPricePerSF = Math.round(prices.reduce((a,b) => a+b, 0) / prices.length);
        prices.sort((a,b) => a-b);
        const mid = Math.floor(prices.length / 2);
        medianPricePerSF = prices.length % 2 !== 0 ? prices[mid] : (prices[mid-1] + prices[mid]) / 2;
      }
    }

    res.json({
      subject: {
        bbl: subject.bbl,
        address: subject.address,
        bldgarea: subject.bldgarea,
        bldgclass: subject.bldgclass
      },
      comps: comps.map(c => ({
        bbl: c.bbl,
        address: c.properties.address,
        sale_date: c.sale_date,
        sale_price: c.sale_price,
        bldgarea: c.properties.bldgarea,
        price_per_sf: c.price_per_sf,
        dist_miles: Math.sqrt(
          Math.pow((c.properties.lat - subject.lat) * 69, 2) + 
          Math.pow((c.properties.lng - subject.lng) * 53, 2)
        ).toFixed(2)
      })),
      marketStats: {
        avgPricePerSF,
        medianPricePerSF,
        count: comps.length
      }
    });
    
  } catch (error) {
    console.error('Comps error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// PORTFOLIO ROUTES (Authenticated)
// =============================================

/**
 * GET /api/portfolio
 * Get user's portfolio (BBLs only for now)
 */
app.get('/api/portfolio', requireAuth, async (req, res) => {
  try {
    // For now, return empty array - will be enhanced later
    // In future: query portfolio_properties table
    res.json({ bbls: [] });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/portfolio
 * Add property to portfolio
 */
app.post('/api/portfolio', requireAuth, async (req, res) => {
  try {
    const { bbl } = req.body;
    
    if (!bbl) {
      return res.status(400).json({ error: 'BBL required' });
    }
    
    // For now, just return success
    // In future: insert into portfolio_properties table
    res.json({ success: true, message: 'Property added to portfolio' });
    
  } catch (error) {
    console.error('Add to portfolio error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/portfolio/:bbl
 * Remove property from portfolio
 */
app.delete('/api/portfolio/:bbl', requireAuth, async (req, res) => {
  try {
    const { bbl } = req.params;
    
    // For now, just return success
    // In future: delete from portfolio_properties table
    res.json({ success: true, message: 'Property removed from portfolio' });
    
  } catch (error) {
    console.error('Remove from portfolio error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// DASHBOARD ROUTES
// =============================================

/**
 * POST /api/dashboard/summary
 * Get portfolio summary stats (accepts BBLs in body since no DB persistence yet)
 */
app.post('/api/dashboard/summary', async (req, res) => {
  try {
    const { bbls } = req.body;
    
    if (!bbls || !Array.isArray(bbls) || bbls.length === 0) {
      return res.json({
        propertyCount: 0,
        totalAssessed: 0,
        avgFarGap: 0,
        newViolations: 0
      });
    }
    
    // Get properties for these BBLs
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('bbl, assesstot, far_gap, distress_score')
      .in('bbl', bbls);
    
    if (propError) throw propError;
    
    // Get recent violations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: violations, error: violError } = await supabase
      .from('violations')
      .select('bbl')
      .in('bbl', bbls)
      .eq('status', 'Open')
      .gte('issue_date', sevenDaysAgo.toISOString().split('T')[0]);
    
    if (violError) throw violError;
    
    // Calculate stats
    const totalAssessed = properties.reduce((sum, p) => sum + (p.assesstot || 0), 0);
    const avgFarGap = properties.length > 0
      ? properties.reduce((sum, p) => sum + (p.far_gap || 0), 0) / properties.length
      : 0;
    
    res.json({
      propertyCount: properties.length,
      totalAssessed: totalAssessed,
      avgFarGap: avgFarGap.toFixed(2),
      newViolations: violations?.length || 0
    });
    
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/market-pulse
 * Get market-wide statistics
 */
app.get('/api/dashboard/market-pulse', async (req, res) => {
  try {
    // Sales this month
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentSales, error: salesError } = await supabase
      .from('sales')
      .select('sale_price, price_per_sf')
      .gte('sale_date', thirtyDaysAgo.toISOString().split('T')[0]);
    
    if (salesError) throw salesError;
    
    // Calculate avg price per SF
    const totalPriceSF = recentSales.reduce((sum, s) => sum + (s.price_per_sf || 0), 0);
    const avgPriceSF = recentSales.length > 0 ? Math.round(totalPriceSF / recentSales.length) : 0;
    
    res.json({
      salesThisMonth: recentSales.length,
      avgPriceSF: avgPriceSF,
      avgByClass: [], // Simplified for now
      totalVolume: recentSales.reduce((sum, s) => sum + (s.sale_price || 0), 0)
    });
    
  } catch (error) {
    console.error('Market pulse error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/dashboard/opportunities
 * Get top opportunities excluding portfolio BBLs
 */
app.post('/api/dashboard/opportunities', async (req, res) => {
  try {
    const { bbls } = req.body;
    const excludeBbls = bbls || [];
    
    let query = supabase
      .from('properties')
      .select('*')
      .gte('far_gap', 2)
      .order('far_gap', { ascending: false })
      .limit(5);
    
    if (excludeBbls.length > 0) {
      query = query.not('bbl', 'in', `(${excludeBbls.join(',')})`);
    }
    
    const { data: opportunities, error } = await query;
    
    if (error) throw error;
    
    res.json({ opportunities: opportunities || [] });
    
  } catch (error) {
    console.error('Dashboard opportunities error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// SAVED SEARCHES ROUTES
// =============================================

/**
 * GET /api/searches
 * Get user's saved searches
 */
app.get('/api/searches', requireAuth, async (req, res) => {
  try {
    const { data: searches, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({ searches: searches || [] });
    
  } catch (error) {
    console.error('Get searches error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/searches
 * Create saved search
 */
app.post('/api/searches', requireAuth, async (req, res) => {
  try {
    const { name, filters, alert_enabled, alert_frequency } = req.body;
    
    if (!name || !filters) {
      return res.status(400).json({ error: 'Name and filters required' });
    }
    
    const { data: search, error } = await supabase
      .from('saved_searches')
      .insert({
        user_id: req.user.id,
        name,
        filters,
        alert_enabled: alert_enabled || false,
        alert_frequency: alert_frequency || 'daily'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ search });
    
  } catch (error) {
    console.error('Create search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/searches/:id
 * Update saved search
 */
app.put('/api/searches/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, filters, alert_enabled, alert_frequency } = req.body;
    
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (filters !== undefined) updates.filters = filters;
    if (alert_enabled !== undefined) updates.alert_enabled = alert_enabled;
    if (alert_frequency !== undefined) updates.alert_frequency = alert_frequency;
    updates.updated_at = new Date().toISOString();
    
    const { data: search, error } = await supabase
      .from('saved_searches')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ search });
    
  } catch (error) {
    console.error('Update search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/searches/:id
 * Delete saved search
 */
app.delete('/api/searches/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Delete search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/searches/:id/run
 * Execute saved search and return matching properties
 */
app.get('/api/searches/:id/run', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the saved search
    const { data: search, error: searchError } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();
    
    if (searchError) throw searchError;
    
    // Apply filters from saved search
    const filters = search.filters || {};
    
    // Build query
    let query = supabase
      .from('properties')
      .select('*')
      .limit(200);
    
    // Apply filters (same logic as /api/data)
    if (filters.bldgclass && filters.bldgclass !== 'all') {
      const classConfig = FILTER_CONFIG.bldgclass[filters.bldgclass];
      if (classConfig) {
        const prefixes = classConfig.prefixes.map(p => `${p}%`);
        query = query.or(prefixes.map(p => `bldgclass.like.${p}`).join(','));
      }
    }
    
    if (filters.minFarGap) {
      query = query.gte('far_gap', parseFloat(filters.minFarGap));
    }
    
    if (filters.minDistress) {
      query = query.gte('distress_score', parseInt(filters.minDistress));
    }
    
    // Execute query
    const { data: properties, error: propError } = await query;
    
    if (propError) throw propError;
    
    res.json({
      search: search,
      properties: properties || [],
      count: properties?.length || 0
    });
    
  } catch (error) {
    console.error('Run search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/heatmap
 * Returns aggregated data for heatmap visualization
 * 
 * Query params:
 *   metric - one of: 'opportunity', 'price', 'distress'
 *   resolution - grid cell size in degrees (default 0.002)
 */
app.get('/api/heatmap', async (req, res) => {
  try {
    const { metric = 'opportunity', resolution = 0.002 } = req.query;
    const gridSize = parseFloat(resolution);
    
    let cells = [];
    let min = 0;
    let max = 100;
    
    if (metric === 'opportunity') {
      // Aggregate properties by FAR gap
      const { data, error } = await supabase
        .from('properties')
        .select('lat, lng, far_gap')
        .gt('far_gap', 0)
        .not('lat', 'is', null)
        .not('lng', 'is', null);
      
      if (error) throw error;
      
      // Grid aggregation in JS
      const grid = {};
      data.forEach(p => {
        const gridLat = Math.round(p.lat / gridSize) * gridSize;
        const gridLng = Math.round(p.lng / gridSize) * gridSize;
        const key = `${gridLat},${gridLng}`;
        
        if (!grid[key]) {
          grid[key] = { lat: gridLat, lng: gridLng, values: [], count: 0 };
        }
        grid[key].values.push(p.far_gap);
        grid[key].count++;
      });
      
      cells = Object.values(grid).map(cell => ({
        lat: cell.lat,
        lng: cell.lng,
        value: Math.round((cell.values.reduce((a, b) => a + b, 0) / cell.count) * 10), // Scale to 0-100
        count: cell.count
      }));
      
      max = Math.max(...cells.map(c => c.value), 100);
      
    } else if (metric === 'price') {
      // Aggregate sales by price per SF
      const { data, error } = await supabase
        .from('sales')
        .select(`
          sale_price,
          properties!inner (lat, lng, bldgarea)
        `)
        .gte('sale_date', '2022-01-01')
        .gt('sale_price', 100000);
      
      if (error) throw error;
      
      // Calculate price_per_sf and grid
      const grid = {};
      data.forEach(s => {
        if (!s.properties || !s.properties.lat || !s.properties.lng || !s.properties.bldgarea) return;
        
        const pricePerSF = s.sale_price / s.properties.bldgarea;
        if (pricePerSF <= 0 || pricePerSF > 10000) return; // Filter outliers
        
        const gridLat = Math.round(s.properties.lat / gridSize) * gridSize;
        const gridLng = Math.round(s.properties.lng / gridSize) * gridSize;
        const key = `${gridLat},${gridLng}`;
        
        if (!grid[key]) {
          grid[key] = { lat: gridLat, lng: gridLng, values: [], count: 0 };
        }
        grid[key].values.push(pricePerSF);
        grid[key].count++;
      });
      
      cells = Object.values(grid).map(cell => ({
        lat: cell.lat,
        lng: cell.lng,
        value: Math.round(cell.values.reduce((a, b) => a + b, 0) / cell.count),
        count: cell.count
      }));
      
      min = Math.min(...cells.map(c => c.value), 0);
      max = Math.max(...cells.map(c => c.value), 1000);
      
    } else if (metric === 'distress') {
      // Aggregate violations by location
      const { data, error } = await supabase
        .from('violations')
        .select(`
          bbl,
          properties!inner (lat, lng)
        `)
        .eq('status', 'Open');
      
      if (error) throw error;
      
      // Grid aggregation
      const grid = {};
      data.forEach(v => {
        if (!v.properties || !v.properties.lat || !v.properties.lng) return;
        
        const gridLat = Math.round(v.properties.lat / gridSize) * gridSize;
        const gridLng = Math.round(v.properties.lng / gridSize) * gridSize;
        const key = `${gridLat},${gridLng}`;
        
        if (!grid[key]) {
          grid[key] = { lat: gridLat, lng: gridLng, count: 0, bbls: new Set() };
        }
        grid[key].count++;
        grid[key].bbls.add(v.bbl);
      });
      
      cells = Object.values(grid).map(cell => ({
        lat: cell.lat,
        lng: cell.lng,
        value: cell.count,
        count: cell.bbls.size // Unique properties
      }));
      
      max = Math.max(...cells.map(c => c.value), 10);
      
    } else {
      return res.status(400).json({ error: 'Invalid metric. Use: opportunity, price, or distress' });
    }
    
    res.json({
      metric,
      cells,
      min,
      max,
      generated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Heatmap error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// NOTES ROUTES
// =============================================

/**
 * GET /api/notes
 * Get all notes for user
 */
app.get('/api/notes', requireAuth, async (req, res) => {
  try {
    const { data: notes, error } = await supabase
      .from('property_notes')
      .select('*')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({ notes: notes || [] });
    
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/notes/:bbl
 * Get note for specific property
 */
app.get('/api/notes/:bbl', requireAuth, async (req, res) => {
  try {
    const { bbl } = req.params;
    
    const { data: note, error } = await supabase
      .from('property_notes')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('bbl', bbl)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // Ignore "Row not found"
    
    res.json({ note: note || null });
    
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/notes
 * Create or update note
 */
app.post('/api/notes', requireAuth, async (req, res) => {
  try {
    const { bbl, content, tags } = req.body;
    
    if (!bbl) {
      return res.status(400).json({ error: 'BBL required' });
    }
    
    const { data: note, error } = await supabase
      .from('property_notes')
      .upsert({
        user_id: req.user.id,
        bbl,
        content,
        tags: tags || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,bbl' })
      .select()
      .single();
    
    if (error) throw error;
    
    // Log activity
    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      bbl,
      action: 'note',
      metadata: { snippet: content ? content.substring(0, 50) : 'Tags updated' }
    });
    
    res.json({ note });
    
  } catch (error) {
    console.error('Save note error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/notes/:bbl
 * Delete note
 */
app.delete('/api/notes/:bbl', requireAuth, async (req, res) => {
  try {
    const { bbl } = req.params;
    
    const { error } = await supabase
      .from('property_notes')
      .delete()
      .eq('user_id', req.user.id)
      .eq('bbl', bbl);
    
    if (error) throw error;
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// ACTIVITY LOG ROUTES
// =============================================

/**
 * GET /api/activity
 * Get user's activity log
 */
app.get('/api/activity', requireAuth, async (req, res) => {
  try {
    const { limit = 50, bbl, action } = req.query;
    
    let query = supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
      
    if (bbl) query = query.eq('bbl', bbl);
    if (action) query = query.eq('action', action);
    
    const { data: activities, error } = await query;
    
    if (error) throw error;
    
    res.json({ activities: activities || [] });
    
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/activity
 * Log an activity
 */
app.post('/api/activity', requireAuth, async (req, res) => {
  try {
    const { bbl, action, metadata } = req.body;
    
    if (!action) {
      return res.status(400).json({ error: 'Action required' });
    }
    
    const { error } = await supabase
      .from('activity_log')
      .insert({
        user_id: req.user.id,
        bbl: bbl || null,
        action,
        metadata: metadata || {}
      });
    
    if (error) throw error;
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Log activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ HEALTH CHECK ============

// Simple root route for Railway health checks (must be before catch-all)
app.get('/', (req, res) => {
  console.log('Health check requested at root');
  res.status(200).json({ 
    status: 'ok', 
    service: 'NYC CRE Explorer API',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const { error } = await supabase
      .from('properties')
      .select('bbl')
      .limit(1);
    
    if (error) throw error;
    
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

/**
 * GET /api/config
 * Returns public configuration
 */
app.get('/api/config', (req, res) => {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  console.log('Config requested. Serving token:', token ? token.substring(0, 15) + '...' : 'NONE');
  res.json({
    mapboxToken: token
  });
});

// =============================================
// FALLBACK
// =============================================

// Serve frontend for all non-API routes
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =============================================
// START
// =============================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
═══════════════════════════════════════════
  NYC CRE Explorer API
═══════════════════════════════════════════
  Server:    http://0.0.0.0:${PORT}
  Database:  Supabase (PostgreSQL)
  
  Endpoints:
    GET /api/stats
    GET /api/properties
    GET /api/properties/:bbl
    GET /api/properties/:bbl/comps
    GET /api/sales
    GET /api/owners/:name
    GET /api/opportunities
    GET /api/health
═══════════════════════════════════════════
  `);
  console.log('✓ Server is listening and ready to accept connections');
});

// Log server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Ensure server is actually listening
server.on('listening', () => {
  const addr = server.address();
  console.log(`✓ Server listening on ${addr.address}:${addr.port}`);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
