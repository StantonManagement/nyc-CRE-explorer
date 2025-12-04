# PRP 0.3: Migrate Server Routes to Supabase

**Phase:** 0 - Foundation  
**Estimated Time:** 1 hour  
**Dependencies:** PRP 0.2 complete (data in Supabase)  
**Outputs:** `server.js` queries Supabase instead of JSON file

---

## Goal

Update all API routes in `server.js` to:
- Query Supabase instead of loading JSON
- Take advantage of PostgreSQL filtering (faster, more flexible)
- Add new query parameters (FAR gap filter, owner search)
- Keep same API response format (backward compatible)

---

## Prerequisites

- PRP 0.2 complete (properties and sales in Supabase)
- At least 100+ properties in database

---

## Step 1: Backup Existing Server

```bash
cp server.js server.backup.js
```

---

## Step 2: Replace server.js

Replace entire `server.js` with:

```javascript
/**
 * NYC CRE Explorer - API Server
 * Queries Supabase for property data
 */

import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================
// SETUP
// =============================================

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// =============================================
// API ROUTES
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
      owner,
      minYear,
      maxYear,
      zipcode,
      limit = 100,
      offset = 0,
      sort = 'far_gap',
      order = 'desc'
    } = req.query;
    
    // Start query
    let query = supabase
      .from('properties')
      .select('*');
    
    // Apply filters
    if (bldgclass) {
      query = query.ilike('bldgclass', `${bldgclass}%`);
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
    
    // Sorting
    const validSorts = ['far_gap', 'assesstot', 'yearbuilt', 'bldgarea', 'lotarea'];
    const sortField = validSorts.includes(sort) ? sort : 'far_gap';
    const ascending = order === 'asc';
    
    query = query.order(sortField, { ascending, nullsFirst: false });
    
    // Pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({
      count: data.length,
      offset: parseInt(offset),
      properties: data
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
    
    // Get property
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('bbl', bbl)
      .single();
    
    if (propError) {
      if (propError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Property not found' });
      }
      throw propError;
    }
    
    // Get sales history
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .eq('bbl', bbl)
      .order('sale_date', { ascending: false });
    
    if (salesError) throw salesError;
    
    // Get violations (if table has data)
    const { data: violations } = await supabase
      .from('violations')
      .select('*')
      .eq('bbl', bbl)
      .order('issue_date', { ascending: false })
      .limit(10);
    
    // Get permits (if table has data)
    const { data: permits } = await supabase
      .from('permits')
      .select('*')
      .eq('bbl', bbl)
      .order('filing_date', { ascending: false })
      .limit(10);
    
    res.json({
      ...property,
      sales: sales || [],
      violations: violations || [],
      permits: permits || []
    });
    
  } catch (error) {
    console.error('Property detail error:', error);
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
 * GET /api/owners/:name
 * Returns all properties for an owner
 */
app.get('/api/owners/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .ilike('ownername', `%${name}%`)
      .order('assesstot', { ascending: false });
    
    if (error) throw error;
    
    // Group by exact owner name
    const byOwner = {};
    data.forEach(p => {
      const owner = p.ownername || 'Unknown';
      if (!byOwner[owner]) {
        byOwner[owner] = {
          name: owner,
          properties: [],
          totalAssessed: 0,
          totalSF: 0
        };
      }
      byOwner[owner].properties.push(p);
      byOwner[owner].totalAssessed += p.assesstot || 0;
      byOwner[owner].totalSF += p.bldgarea || 0;
    });
    
    res.json({
      searchTerm: name,
      matchCount: data.length,
      owners: Object.values(byOwner)
    });
    
  } catch (error) {
    console.error('Owner search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/opportunities
 * Returns properties ranked by investment opportunity signals
 */
app.get('/api/opportunities', async (req, res) => {
  try {
    const { limit = 25 } = req.query;
    
    // Get properties with high FAR gap
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .gt('far_gap', 1)
      .order('far_gap', { ascending: false })
      .limit(parseInt(limit));
    
    if (error) throw error;
    
    // Calculate opportunity score (simple version)
    const scored = data.map(p => {
      let score = 0;
      
      // FAR gap (0-40 points)
      score += Math.min(p.far_gap * 4, 40);
      
      // Age bonus (older = more opportunity) (0-20 points)
      const age = new Date().getFullYear() - (p.yearbuilt || 2000);
      score += Math.min(age / 5, 20);
      
      // Size bonus (larger lots = more potential) (0-20 points)
      score += Math.min((p.lotarea || 0) / 1000, 20);
      
      return {
        ...p,
        opportunityScore: Math.round(score)
      };
    });
    
    // Sort by score
    scored.sort((a, b) => b.opportunityScore - a.opportunityScore);
    
    res.json({
      count: scored.length,
      properties: scored
    });
    
  } catch (error) {
    console.error('Opportunities error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================
// HEALTH CHECK
// =============================================

app.get('/api/health', async (req, res) => {
  try {
    // Quick DB ping
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

// =============================================
// FALLBACK
// =============================================

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =============================================
// START
// =============================================

app.listen(PORT, () => {
  console.log(`
═══════════════════════════════════════════
  NYC CRE Explorer API
═══════════════════════════════════════════
  Server:    http://localhost:${PORT}
  Database:  Supabase (PostgreSQL)
  
  Endpoints:
    GET /api/stats
    GET /api/properties
    GET /api/properties/:bbl
    GET /api/sales
    GET /api/owners/:name
    GET /api/opportunities
    GET /api/health
═══════════════════════════════════════════
  `);
});
```

---

## Step 3: Test Routes

```bash
# Start server
node server.js

# In another terminal, test each endpoint:

# Health check
curl http://localhost:3000/api/health

# Stats
curl http://localhost:3000/api/stats

# Properties (basic)
curl http://localhost:3000/api/properties

# Properties with FAR gap filter
curl "http://localhost:3000/api/properties?minFarGap=2"

# Properties by building class
curl "http://localhost:3000/api/properties?bldgclass=O"

# Owner search
curl "http://localhost:3000/api/owners/LLC"

# Single property (use a real BBL from your data)
curl http://localhost:3000/api/properties/1008010001

# Sales
curl http://localhost:3000/api/sales?limit=10

# Opportunities
curl http://localhost:3000/api/opportunities
```

---

## Step 4: Verify Response Format

Each endpoint should return consistent JSON:

```javascript
// List endpoints
{
  "count": 25,
  "properties": [...]  // or "sales", "owners"
}

// Single item endpoints
{
  "bbl": "...",
  "address": "...",
  // ... all fields
}

// Error format
{
  "error": "Error message"
}
```

---

## Validation Checklist

- [ ] Server starts without errors
- [ ] `/api/health` returns `"status": "healthy"`
- [ ] `/api/stats` returns property counts
- [ ] `/api/properties` returns array of properties
- [ ] `/api/properties?minFarGap=2` filters correctly
- [ ] `/api/properties?bldgclass=O` filters correctly
- [ ] `/api/properties/:bbl` returns single property with sales
- [ ] `/api/sales` returns recent sales
- [ ] `/api/owners/:name` returns grouped results
- [ ] `/api/opportunities` returns scored properties
- [ ] Frontend loads at `http://localhost:3000`

---

## New API Features

| Endpoint | New Capability |
|----------|----------------|
| `/api/properties` | `minFarGap`, `owner`, `sort`, `order` params |
| `/api/properties/:bbl` | Includes sales, violations, permits |
| `/api/owners/:name` | New - owner portfolio lookup |
| `/api/opportunities` | New - ranked by opportunity score |

---

## Troubleshooting

### "relation does not exist"
Supabase tables not created. Re-run PRP 0.1 schema.

### Empty responses
Data not loaded. Re-run PRP 0.2 fetcher.

### CORS errors in browser
Add CORS middleware if needed:
```javascript
import cors from 'cors';
app.use(cors());
```

### Frontend not loading
Check that `public/index.html` exists and path is correct.

---

## Next Step

Proceed to **PRP 0.4: Update Frontend for New API**

---

## Files Created/Modified

| File | Action |
|------|--------|
| `server.js` | Replaced |
| `server.backup.js` | Created (backup) |

---

## Rollback

```bash
mv server.backup.js server.js
```
