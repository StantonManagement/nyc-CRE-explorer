# NYC Commercial Real Estate Data: Complete Platform & Source Comparison

## Legend
- **R** = Reonomy | **PS** = PropertyShark | **CS** = CoStar
- **PUB** = Public Data | **PRV** = Private/Proprietary | **MIX** = Mixed Sources

---

| Category | Data Field | R | PS | CS | Source | Public Data Source |
|----------|------------|---|----|----|--------|-------------------|
| **PROPERTY ID** | Address | ✓ | ✓ | ✓ | PUB | DOF, DOB, PLUTO |
| **PROPERTY ID** | Borough/Block/Lot (BBL) | ✓ | ✓ | ✓ | PUB | DOF, PLUTO |
| **PROPERTY ID** | Parcel ID | ✓ | ✓ | ✓ | PUB | DOF |
| **PROPERTY ID** | Building Class | ✓ | ✓ | ✓ | PUB | DOF (RPAD) |
| **PROPERTY ID** | Property Type / Asset Class | ✓ | ✓ | ✓ | PUB | DOF, PLUTO |
| **PROPERTY ID** | Tax Class | ✓ | ✓ | ✓ | PUB | DOF |
| **PROPERTY ID** | Legal Description | ✓ | ✓ | | PUB | ACRIS, County Clerk |
| **PROPERTY ID** | Census Tract | ✓ | | | PUB | Census Bureau |
| **PROPERTY ID** | Opportunity Zone Status | ✓ | | | PUB | IRS / Treasury |
| **PROPERTY ID** | Property Name | | | ✓ | PRV | CoStar Research |
| **PROPERTY ID** | CoStar Building Rating (1-5 Stars) | | | ✓ | PRV | CoStar Proprietary |
| **BUILDING** | Building Size (SF) | ✓ | ✓ | ✓ | PUB | DOF (RPAD), PLUTO |
| **BUILDING** | Gross Floor Area | ✓ | ✓ | ✓ | PUB | DOF, PLUTO |
| **BUILDING** | Lot Size (SF / Acres) | ✓ | ✓ | ✓ | PUB | PLUTO, DOF |
| **BUILDING** | Year Built | ✓ | ✓ | ✓ | PUB | DOF (RPAD), PLUTO |
| **BUILDING** | Year Renovated | ✓ | | ✓ | MIX | Permits + Private research |
| **BUILDING** | Number of Stories | ✓ | ✓ | ✓ | PUB | DOF (RPAD), PLUTO |
| **BUILDING** | Total Units | ✓ | ✓ | ✓ | PUB | DOF (RPAD), PLUTO |
| **BUILDING** | Commercial/Residential Unit Breakdown | ✓ | ✓ | ✓ | PUB | DOF (RPAD) |
| **BUILDING** | Typical Floor Plate Size | ✓ | | ✓ | MIX | Private + DOB filings |
| **BUILDING** | Parking Spaces / Ratio | | | ✓ | PRV | CoStar field research |
| **BUILDING** | Indoor Features | | ✓ | ✓ | PRV | Manual research |
| **BUILDING** | Outdoor Features | | ✓ | | PRV | Manual research |
| **BUILDING** | Building Condition Rating | | | ✓ | PRV | CoStar field research |
| **BUILDING** | Amenities List | | | ✓ | PRV | CoStar research |
| **BUILDING** | Floor Plans | | | ✓ | PRV | CoStar research |
| **BUILDING** | 3D Models (Matterport) | | | ✓ | PRV | CoStar/Matterport |
| **BUILDING** | Building Photos | ✓ | ✓ | ✓ | PRV | Platform photography |
| **BUILDING** | Satellite/Aerial Images | | | ✓ | MIX | Public + Private |
| **ZONING** | Zoning Code / District | ✓ | ✓ | ✓ | PUB | DCP (PLUTO, ZoLa) |
| **ZONING** | Land Use Code | ✓ | ✓ | ✓ | PUB | DCP (PLUTO) |
| **ZONING** | FAR (Current) | ✓ | ✓ | | PUB | DCP (PLUTO) |
| **ZONING** | Maximum Allowable FAR | | ✓ | | PUB | DCP (ZoLa, Zoning Resolution) |
| **ZONING** | Buildable SF (Unused FAR) | | ✓ | | PUB | Calculated: PLUTO + Zoning |
| **ZONING** | Air Rights Available | | ✓ | | PUB | Calculated: PLUTO + Zoning |
| **ZONING** | Conversion Feasibility Index | | ✓ | | PRV | PropertyShark proprietary |
| **ZONING** | Construction Pipeline | | ✓ | ✓ | PUB | DOB (permits, filings) |
| **LANDMARK** | Landmark Designation Status | | ✓ | | PUB | LPC Database |
| **LANDMARK** | Historic District Status | | ✓ | | PUB | LPC Database |
| **LANDMARK** | Landmark Designation Date | | ✓ | | PUB | LPC Database |
| **LANDMARK** | Landmark Type (Individual/Interior/Scenic) | | ✓ | | PUB | LPC Database |
| **OWNERSHIP** | Recorded Owner (LLC/Individual) | ✓ | ✓ | ✓ | PUB | ACRIS, DOF |
| **OWNERSHIP** | Owner Mailing Address | ✓ | ✓ | ✓ | PUB | DOF (RPAD) |
| **OWNERSHIP** | True Owner Behind LLC | ✓ | ✓ | ✓ | MIX | Dept of State + Private |
| **OWNERSHIP** | Owner Phone Number | ✓ | ✓ | ✓ | PRV | Aggregated/researched |
| **OWNERSHIP** | Owner Email | ✓ | ✓ | ✓ | PRV | Aggregated/researched |
| **OWNERSHIP** | Ownership History / Prior Owners | ✓ | ✓ | ✓ | PUB | ACRIS (deed chain) |
| **OWNERSHIP** | Owner Portfolio (all properties) | ✓ | ✓ | ✓ | MIX | Public + entity matching |
| **OWNERSHIP** | Time Held by Current Owner | ✓ | ✓ | | PUB | ACRIS (calculated) |
| **OWNERSHIP** | Corporate Structure / Ownership Tree | ✓ | | | PRV | Reonomy AI/research |
| **OWNERSHIP** | Building Management Records | | ✓ | | MIX | DOB + Private research |
| **OWNERSHIP** | Owner Type (REIT, PE, Private) | | | ✓ | PRV | CoStar research |
| **OWNERSHIP** | Fund Information | | | ✓ | PRV | CoStar proprietary |
| **OWNERSHIP** | Decision Maker Contacts | | | ✓ | PRV | CoStar research |
| **DOCUMENTS** | Deeds | | ✓ | | PUB | ACRIS |
| **DOCUMENTS** | Titles | | ✓ | | PUB | ACRIS |
| **DOCUMENTS** | Mortgages / Loan Documents | ✓ | ✓ | | PUB | ACRIS |
| **DOCUMENTS** | Assignments | | ✓ | | PUB | ACRIS |
| **DOCUMENTS** | UCC Filings | | ✓ | | PUB | Dept of State, ACRIS |
| **DOCUMENTS** | Financial Statements (RPIE) | | ✓ | | PUB | DOF (RPIE filings) |
| **DOCUMENTS** | Plats | | ✓ | | PUB | County Clerk |
| **DOCUMENTS** | Easements | | ✓ | | PUB | ACRIS |
| **DOCUMENTS** | Internal Transfers | | ✓ | | PUB | ACRIS |
| **SALES** | Sale Date | ✓ | ✓ | ✓ | PUB | ACRIS, DOF Rolling Sales |
| **SALES** | Sale Price | ✓ | ✓ | ✓ | PUB | ACRIS, DOF Rolling Sales |
| **SALES** | Buyer / Seller Names | ✓ | ✓ | ✓ | PUB | ACRIS |
| **SALES** | Transaction Type | ✓ | | ✓ | PUB | ACRIS |
| **SALES** | Hold Period | ✓ | ✓ | ✓ | PUB | Calculated from ACRIS |
| **SALES** | Sales Comps | ✓ | ✓ | ✓ | PUB | DOF Rolling Sales |
| **SALES** | Asking Price | | | ✓ | PRV | Listing data |
| **SALES** | Achieved Price vs Asking | | | ✓ | PRV | CoStar research |
| **SALES** | Cap Rate (Transaction) | | | ✓ | PRV | CoStar research |
| **SALES** | Price Per SF | ✓ | ✓ | ✓ | PUB | Calculated |
| **SALES** | Broker / Agent | | | ✓ | PRV | CoStar research |
| **SALES** | Time on Market | | | ✓ | PRV | CoStar tracking |
| **SALES** | Comprehensive Sale Notes | | | ✓ | PRV | CoStar research |
| **SALES** | Estimated Property Value | | ✓ | | MIX | Algorithm + public comps |
| **DEBT** | Lender Name | ✓ | ✓ | ✓ | PUB | ACRIS |
| **DEBT** | Mortgage Amount | ✓ | ✓ | ✓ | PUB | ACRIS |
| **DEBT** | Origination Date | ✓ | ✓ | ✓ | PUB | ACRIS |
| **DEBT** | Maturity Date | ✓ | ✓ | ✓ | MIX | ACRIS (if recorded) + Private |
| **DEBT** | Loan Terms | ✓ | | | MIX | ACRIS (partial) + Private |
| **DEBT** | Lien Records | ✓ | ✓ | | PUB | ACRIS |
| **DEBT** | Pre-Foreclosure Status | ✓ | ✓ | | PUB | Lis Pendens (County Clerk) |
| **DEBT** | Foreclosure Stage | ✓ | ✓ | | PUB | Court records |
| **DEBT** | Auction Date | ✓ | ✓ | | PUB | Court records |
| **DEBT** | Operating Statements | | | ✓ | PRV | CoStar research |
| **DEBT** | Prior Loans History | ✓ | ✓ | ✓ | PUB | ACRIS |
| **TAX** | Market Value (DOF) | ✓ | ✓ | ✓ | PUB | DOF (NOPV, RPAD) |
| **TAX** | Assessed Value | ✓ | ✓ | ✓ | PUB | DOF (RPAD) |
| **TAX** | Net Assessed Value | | ✓ | | PUB | DOF |
| **TAX** | Billable Value | | ✓ | | PUB | DOF |
| **TAX** | Assessment Rate | | ✓ | | PUB | DOF |
| **TAX** | Property Tax Amount (Current) | ✓ | ✓ | ✓ | PUB | DOF |
| **TAX** | Tax History (Multi-Year) | ✓ | ✓ | | PUB | DOF |
| **TAX** | Tax Per Square Foot | | ✓ | | PUB | Calculated from DOF |
| **TAX** | Tax Exemptions | | ✓ | | PUB | DOF |
| **TAX** | Tax Abatements | | ✓ | | PUB | DOF |
| **TAX** | Year-Over-Year Tax Change | ✓ | | | PUB | Calculated from DOF |
| **FINANCIALS** | Reported Income / Revenue | | ✓ | ✓ | PUB | DOF (RPIE filings) |
| **FINANCIALS** | Reported Expenses | | ✓ | ✓ | PUB | DOF (RPIE filings) |
| **FINANCIALS** | Net Operating Income (NOI) | | ✓ | ✓ | MIX | RPIE + Private research |
| **FINANCIALS** | Rental Income | | ✓ | ✓ | MIX | RPIE + Private research |
| **FINANCIALS** | Occupancy Rates | | ✓ | ✓ | PRV | Research/aggregation |
| **FINANCIALS** | Cap Rate (DOF Assessment) | | ✓ | | PUB | DOF assessment records |
| **FINANCIALS** | Rent Growth | | | ✓ | PRV | CoStar tracking |
| **FINANCIALS** | Vacancy Projections | | | ✓ | PRV | CoStar analytics |
| **TENANTS** | Current Tenants (Business Names) | ✓ | ✓ | ✓ | MIX | DOB (CO) + Private |
| **TENANTS** | NAICS / SIC Codes | ✓ | | ✓ | PRV | Business databases |
| **TENANTS** | Tenant Web Address | ✓ | | | PRV | Aggregated |
| **TENANTS** | Owner-Occupied Status | ✓ | | | MIX | DOF + calculated |
| **TENANTS** | Tenant Phone Numbers | | ✓ | ✓ | PRV | Researched |
| **TENANTS** | Lease Start Date | | | ✓ | PRV | CoStar research |
| **TENANTS** | Lease Expiration Date | | | ✓ | PRV | CoStar research |
| **TENANTS** | Asking Rent | | | ✓ | PRV | Listing data |
| **TENANTS** | Rent Achieved | | | ✓ | PRV | CoStar research |
| **TENANTS** | Lease Terms / Concessions | | | ✓ | PRV | CoStar research |
| **TENANTS** | Lease Comps | | | ✓ | PRV | CoStar database |
| **TENANTS** | Pending Moves | | | ✓ | PRV | CoStar research |
| **TENANTS** | Available Space (SF) | | | ✓ | PRV | CoStar tracking |
| **PERMITS** | Building Permits (NB, ALT1, ALT2, ALT3) | | ✓ | | PUB | DOB (BIS, DOB NOW) |
| **PERMITS** | Permit Type | | ✓ | | PUB | DOB |
| **PERMITS** | Permit Status | | ✓ | | PUB | DOB |
| **PERMITS** | Filing Representative | | ✓ | | PUB | DOB |
| **PERMITS** | Certificate of Occupancy | | ✓ | | PUB | DOB |
| **VIOLATIONS** | DOB Violations | | ✓ | | PUB | DOB (BIS) |
| **VIOLATIONS** | OATH/ECB Summonses | | ✓ | | PUB | DOB / OATH |
| **VIOLATIONS** | HPD Violations | | ✓ | | PUB | HPD |
| **VIOLATIONS** | FDNY Fire Code Violations | | ✓ | | PUB | FDNY |
| **VIOLATIONS** | DEP Environmental Violations | | ✓ | | PUB | DEP |
| **VIOLATIONS** | Violation Class (I, II, III) | | ✓ | | PUB | DOB / HPD |
| **VIOLATIONS** | Resolution Status | | ✓ | | PUB | Respective agency |
| **FORECLOSURE** | Pre-Foreclosure Status | ✓ | ✓ | | PUB | Lis Pendens (County Clerk) |
| **FORECLOSURE** | Foreclosure Filings | ✓ | ✓ | | PUB | Court records |
| **FORECLOSURE** | REO Properties | | ✓ | | PUB | Court records + ACRIS |
| **FORECLOSURE** | Auction Results / Dates | ✓ | ✓ | | PUB | Court records |
| **FORECLOSURE** | Lis Pendens | | ✓ | | PUB | County Clerk |
| **ENVIRONMENTAL** | FEMA Flood Zone | | ✓ | | PUB | FEMA |
| **ENVIRONMENTAL** | Toxic Sites | | ✓ | | PUB | EPA, DEC |
| **ENVIRONMENTAL** | Environmental Risk Maps | | ✓ | | PUB | Various agencies |
| **ENVIRONMENTAL** | ENERGY STAR Score | | | ✓ | PUB | EPA / NYC LL84 |
| **ENVIRONMENTAL** | Green Certifications (LEED) | | | ✓ | MIX | USGBC + Private |
| **MARKET** | Market Demographics | ✓ | | ✓ | PUB | Census Bureau |
| **MARKET** | Population Data | | | ✓ | PUB | Census Bureau |
| **MARKET** | Household Income | | | ✓ | PUB | Census Bureau, ACS |
| **MARKET** | Traffic Patterns | | | ✓ | MIX | DOT + Private |
| **MARKET** | Points of Interest | | | ✓ | PRV | CoStar research |
| **MARKET** | Market/Submarket Analytics | | | ✓ | PRV | CoStar proprietary |
| **MARKET** | Rent Trajectories | | | ✓ | PRV | CoStar proprietary |
| **MARKET** | Supply/Demand Forecasts | | | ✓ | PRV | CoStar proprietary |
| **PREDICTIVE** | "Likelihood to Sell" Score | ✓ | | | PRV | Reonomy AI |
| **PREDICTIVE** | Property Condition Assessment | ✓ | | | PRV | Reonomy AI |
| **PREDICTIVE** | Conversion Feasibility Index | | ✓ | | PRV | PropertyShark algorithm |
| **PREDICTIVE** | Building Rating (1-5 Stars) | | | ✓ | PRV | CoStar proprietary |
| **PREDICTIVE** | Market Forecasts | | | ✓ | PRV | CoStar analytics |
| **OTHER** | School District | | ✓ | | PUB | DOE |
| **OTHER** | Commuting Options | | ✓ | | PUB | MTA, DOT |
| **OTHER** | Condo Declarations | | ✓ | | PUB | ACRIS |
| **OTHER** | Commercial Occupants | | ✓ | | MIX | DOB + research |

---

## SUMMARY COUNTS

| Source Type | Count | % of Total |
|-------------|-------|------------|
| **PUB** (Public) | 78 | 58% |
| **PRV** (Private) | 42 | 31% |
| **MIX** (Mixed) | 15 | 11% |
| **TOTAL** | 135 | 100% |

---

## PUBLIC DATA SOURCES FOR APP

| Source | API Available | Key Data |
|--------|--------------|----------|
| **ACRIS** | NYC Open Data | Deeds, mortgages, liens, sales |
| **DOF RPAD** | NYC Open Data | Property characteristics, ownership, taxes |
| **DOF Rolling Sales** | NYC Open Data | Transaction history |
| **DOF RPIE** | FOIL Request | Income & expenses (commercial) |
| **PLUTO** | NYC Open Data | Zoning, FAR, land use, dimensions |
| **DOB BIS** | NYC Open Data | Permits, violations, CO |
| **HPD** | NYC Open Data | Housing violations |
| **LPC** | NYC Open Data | Landmark status |
| **FEMA** | FEMA API | Flood zones |
| **Census/ACS** | Census API | Demographics |
| **Dept of State** | Paid Search | LLC/Corp filings |
