# PRP 0.1: Supabase Project Setup + Schema

**Phase:** 0 - Foundation  
**Estimated Time:** 20 minutes  
**Dependencies:** None  
**Outputs:** Supabase project with tables ready for data

---

## Goal

Set up a Supabase project with the complete database schema for NYC CRE Explorer. After this PRP, you'll have:
- A Supabase project with connection credentials
- All tables created (properties, sales, portfolios, alerts)
- Computed columns for FAR gap and unused SF
- Basic Row Level Security policies
- Local `.env` file configured

---

## Prerequisites

- Supabase account (free at supabase.com)
- Your nyc-cre-app project directory

---

## Step 1: Create Supabase Project

### 1.1 Sign Up / Login
1. Go to https://supabase.com
2. Sign in with GitHub (recommended) or email

### 1.2 Create New Project
1. Click "New Project"
2. Settings:
   - **Name:** `nyc-cre-explorer`
   - **Database Password:** Generate a strong one, save it somewhere safe
   - **Region:** `US East (N. Virginia)` - closest to NYC data sources
   - **Plan:** Free tier is fine to start

3. Click "Create new project"
4. Wait ~2 minutes for provisioning

### 1.3 Get Credentials
Once ready, go to **Settings → API** and copy:
- `Project URL` → This is your `SUPABASE_URL`
- `anon public` key → This is your `SUPABASE_ANON_KEY`
- `service_role` key → This is your `SUPABASE_SERVICE_KEY` (keep secret!)

---

## Step 2: Create Database Schema

### 2.1 Open SQL Editor
1. In Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click "New query"

### 2.2 Run Schema SQL
Copy and paste this entire block, then click "Run":

```sql
-- =============================================
-- NYC CRE Explorer Schema
-- Version: 1.0
-- =============================================

-- Enable PostGIS for geo queries (optional but useful)
create extension if not exists postgis;

-- =============================================
-- PROPERTIES TABLE (from PLUTO)
-- =============================================
create table properties (
  bbl text primary key,
  address text,
  borough int,
  block int,
  lot int,
  zipcode text,
  bldgclass text,
  bldgclass_desc text,
  ownername text,
  lotarea int,
  bldgarea int,
  numfloors numeric,
  yearbuilt int,
  zonedist1 text,
  builtfar numeric,
  commfar numeric,
  residfar numeric,
  assesstot bigint,
  lat numeric,
  lng numeric,
  
  -- Computed columns (PostgreSQL calculates these automatically)
  far_gap numeric generated always as (
    greatest(0, coalesce(commfar, residfar, 0) - coalesce(builtfar, 0))
  ) stored,
  
  unused_sf int generated always as (
    greatest(0, (coalesce(commfar, residfar, 0) - coalesce(builtfar, 0)) * lotarea)::int
  ) stored,
  
  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for common queries
create index idx_properties_bldgclass on properties(bldgclass);
create index idx_properties_zipcode on properties(zipcode);
create index idx_properties_ownername on properties(ownername);
create index idx_properties_far_gap on properties(far_gap desc);
create index idx_properties_yearbuilt on properties(yearbuilt);

-- =============================================
-- SALES TABLE
-- =============================================
create table sales (
  id uuid primary key default gen_random_uuid(),
  bbl text references properties(bbl) on delete cascade,
  sale_price bigint,
  sale_date date,
  gross_sf int,
  price_per_sf numeric,
  building_class text,
  buyer text,
  seller text,
  created_at timestamptz default now()
);

create index idx_sales_bbl on sales(bbl);
create index idx_sales_date on sales(sale_date desc);
create index idx_sales_price on sales(sale_price desc);

-- =============================================
-- VIOLATIONS TABLE (for Phase 2)
-- =============================================
create table violations (
  id uuid primary key default gen_random_uuid(),
  bbl text references properties(bbl) on delete cascade,
  violation_type text,
  violation_category text,
  issue_date date,
  disposition_date date,
  status text,
  description text,
  created_at timestamptz default now()
);

create index idx_violations_bbl on violations(bbl);
create index idx_violations_status on violations(status);

-- =============================================
-- PERMITS TABLE (for Phase 2)
-- =============================================
create table permits (
  id uuid primary key default gen_random_uuid(),
  bbl text references properties(bbl) on delete cascade,
  permit_type text,
  permit_status text,
  filing_date date,
  issue_date date,
  expire_date date,
  job_description text,
  estimated_cost bigint,
  created_at timestamptz default now()
);

create index idx_permits_bbl on permits(bbl);
create index idx_permits_filing_date on permits(filing_date desc);

-- =============================================
-- USER PORTFOLIOS (for Phase 5)
-- =============================================
create table portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text default 'My Portfolio',
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table portfolio_properties (
  portfolio_id uuid references portfolios(id) on delete cascade,
  bbl text references properties(bbl) on delete cascade,
  notes text,
  added_at timestamptz default now(),
  primary key (portfolio_id, bbl)
);

-- =============================================
-- SAVED SEARCHES / ALERTS (for Phase 5-6)
-- =============================================
create table saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}',
  alert_enabled boolean default false,
  alert_frequency text default 'daily', -- 'daily', 'weekly', 'instant'
  last_alert_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to relevant tables
create trigger properties_updated_at
  before update on properties
  for each row execute function update_updated_at();

create trigger portfolios_updated_at
  before update on portfolios
  for each row execute function update_updated_at();

create trigger saved_searches_updated_at
  before update on saved_searches
  for each row execute function update_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Properties: Public read, no direct writes (use service key)
alter table properties enable row level security;
create policy "Properties are viewable by everyone" 
  on properties for select using (true);

-- Sales: Public read
alter table sales enable row level security;
create policy "Sales are viewable by everyone" 
  on sales for select using (true);

-- Violations: Public read
alter table violations enable row level security;
create policy "Violations are viewable by everyone" 
  on violations for select using (true);

-- Permits: Public read
alter table permits enable row level security;
create policy "Permits are viewable by everyone" 
  on permits for select using (true);

-- Portfolios: Users can only see their own
alter table portfolios enable row level security;
create policy "Users can view own portfolios" 
  on portfolios for select using (auth.uid() = user_id);
create policy "Users can insert own portfolios" 
  on portfolios for insert with check (auth.uid() = user_id);
create policy "Users can update own portfolios" 
  on portfolios for update using (auth.uid() = user_id);
create policy "Users can delete own portfolios" 
  on portfolios for delete using (auth.uid() = user_id);

-- Portfolio Properties: Inherit from portfolio ownership
alter table portfolio_properties enable row level security;
create policy "Users can manage portfolio properties" 
  on portfolio_properties for all using (
    portfolio_id in (
      select id from portfolios where user_id = auth.uid()
    )
  );

-- Saved Searches: Users can only see their own
alter table saved_searches enable row level security;
create policy "Users can view own searches" 
  on saved_searches for select using (auth.uid() = user_id);
create policy "Users can insert own searches" 
  on saved_searches for insert with check (auth.uid() = user_id);
create policy "Users can update own searches" 
  on saved_searches for update using (auth.uid() = user_id);
create policy "Users can delete own searches" 
  on saved_searches for delete using (auth.uid() = user_id);

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- Properties with opportunity metrics
create view properties_with_metrics as
select 
  p.*,
  s.last_sale_price,
  s.last_sale_date,
  s.last_price_per_sf,
  case 
    when p.assesstot > 0 and s.last_sale_price > 0 
    then round(((s.last_sale_price::numeric / p.assesstot) - 1) * 100, 1)
    else null 
  end as sale_vs_assessed_pct,
  (select count(*) from violations v where v.bbl = p.bbl and v.status = 'OPEN') as open_violations,
  (select count(*) from permits pm where pm.bbl = p.bbl and pm.filing_date > now() - interval '1 year') as recent_permits
from properties p
left join lateral (
  select 
    sale_price as last_sale_price,
    sale_date as last_sale_date,
    price_per_sf as last_price_per_sf
  from sales 
  where bbl = p.bbl 
  order by sale_date desc 
  limit 1
) s on true;

-- =============================================
-- DONE
-- =============================================
-- Schema created successfully!
-- Next: Configure .env and run PRP 0.2 to migrate data fetcher
```

### 2.3 Verify Tables Created
1. Go to **Table Editor** in sidebar
2. You should see:
   - properties
   - sales
   - violations
   - permits
   - portfolios
   - portfolio_properties
   - saved_searches

---

## Step 3: Configure Local Environment

### 3.1 Create .env File
In your `nyc-cre-app` directory, create `.env`:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server Config
PORT=3000
NODE_ENV=development
```

Replace with your actual values from Step 1.3.

### 3.2 Add .env to .gitignore
Make sure `.env` is in your `.gitignore`:

```bash
echo ".env" >> .gitignore
```

### 3.3 Install Supabase Client
```bash
npm install @supabase/supabase-js dotenv
```

---

## Step 4: Test Connection

### 4.1 Create Test Script
Create `test-supabase.js`:

```javascript
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testConnection() {
  console.log('Testing Supabase connection...\n');
  
  // Test 1: Basic query
  const { data, error } = await supabase
    .from('properties')
    .select('bbl')
    .limit(1);
  
  if (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
  
  console.log('✅ Connected to Supabase');
  console.log('✅ Properties table accessible');
  console.log(`   Current row count: ${data.length} (expected 0 for new setup)`);
  
  // Test 2: Check computed columns exist
  const { data: cols, error: colError } = await supabase
    .from('properties')
    .select('far_gap, unused_sf')
    .limit(0);
  
  if (colError) {
    console.error('❌ Computed columns issue:', colError.message);
  } else {
    console.log('✅ Computed columns (far_gap, unused_sf) ready');
  }
  
  console.log('\n🎉 All tests passed! Ready for PRP 0.2');
}

testConnection();
```

### 4.2 Run Test
```bash
node test-supabase.js
```

Expected output:
```
Testing Supabase connection...

✅ Connected to Supabase
✅ Properties table accessible
   Current row count: 0 (expected 0 for new setup)
✅ Computed columns (far_gap, unused_sf) ready

🎉 All tests passed! Ready for PRP 0.2
```

---

## Validation Checklist

- [ ] Supabase project created
- [ ] All 7 tables visible in Table Editor
- [ ] `.env` file created with credentials
- [ ] `.env` added to `.gitignore`
- [ ] `@supabase/supabase-js` installed
- [ ] `test-supabase.js` passes all tests

---

## Troubleshooting

### "relation does not exist"
Schema didn't run. Go back to SQL Editor, paste schema, run again.

### "Invalid API key"
Check `.env` values match Supabase dashboard exactly. No extra spaces.

### "permission denied"
RLS is blocking. For testing, you can temporarily disable:
```sql
alter table properties disable row level security;
```
(Re-enable before production)

---

## Next Step

Once all validation checks pass, proceed to **PRP 0.2: Migrate Data Fetcher to Supabase**

---

## Files Created/Modified

| File | Action |
|------|--------|
| `.env` | Created |
| `.gitignore` | Modified (added .env) |
| `test-supabase.js` | Created |
| `package.json` | Modified (new dependencies) |

---

## Rollback

If needed, delete the Supabase project:
1. Settings → General → Delete Project
2. Remove `.env` and `test-supabase.js`
3. `npm uninstall @supabase/supabase-js dotenv`
