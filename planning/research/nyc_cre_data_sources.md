# NYC Commercial Real Estate Data: Platform Comparison & Source Classification

## Legend
- **R** = Reonomy
- **PS** = PropertyShark  
- **CS** = CoStar
- **Public** = Available from NYC/government open data sources
- **Private** = Proprietary, aggregated, or manually researched

---

## PROPERTY IDENTIFICATION

| Data Field | R | PS | CS | Source Type | Public Data Source |
|------------|---|----|----|-------------|-------------------|
| Address | ✓ | ✓ | ✓ | Public | DOF, DOB, PLUTO |
| Borough/Block/Lot (BBL) | ✓ | ✓ | ✓ | Public | DOF, PLUTO |
| Parcel ID | ✓ | ✓ | ✓ | Public | DOF |
| Building Class | ✓ | ✓ | ✓ | Public | DOF (RPAD) |
| Property Type / Asset Class | ✓ | ✓ | ✓ | Public | DOF, PLUTO |
| Tax Class | ✓ | ✓ | ✓ | Public | DOF |
| Legal Description | ✓ | ✓ | | Public | ACRIS, County Clerk |
| Census Tract | ✓ | | | Public | Census Bureau |
| Opportunity Zone Status | ✓ | | | Public | IRS / Treasury |
| Property Name | | | ✓ | Private | CoStar Research |
| CoStar Building Rating (1-5 Stars) | | | ✓ | Private | CoStar Proprietary |

---

## BUILDING & LOT CHARACTERISTICS

| Data Field | R | PS | CS | Source Type | Public Data Source |
|------------|---|----|----|-------------|-------------------|
| Building Size (SF) | ✓ | ✓ | ✓ | Public | DOF (RPAD), PLUTO |
| Gross Floor Area | ✓ | ✓ | ✓ | Public | DOF, PLUTO |
| Lot Size (SF / Acres) | ✓ | ✓ | ✓ | Public | PLUTO, DOF |
| Year Built | ✓ | ✓ | ✓ | Public | DOF (RPAD), PLUTO |
| Year Renovated | ✓ | | ✓ | Mixed | Public (permits) + Private research |
| Number of Stories | ✓ | ✓ | ✓ | Public | DOF (RPAD), PLUTO |
| Total Units | ✓ | ✓ | ✓ | Public | DOF (RPAD), PLUTO |
| Commercial/Residential Unit Breakdown | ✓ | ✓ | ✓ | Public | DOF (RPAD) |
| Typical Floor Plate Size | ✓ | | ✓ | Mixed | Private research + DOB filings |
| Parking Spaces / Ratio | | | ✓ | Private | CoStar field research |
| Indoor Features | | ✓ | ✓ | Private | Manual research |
| Outdoor Features | | ✓ | | Private | Manual research |
| Building Condition Rating | | | ✓ | Private | CoStar field research |
| Amenities List | | | ✓ | Private | CoStar research |
| Floor Plans | | | ✓ | Private | CoStar research |
| 3D Models (Matterport) | | | ✓ | Private | CoStar/Matterport |
| Building Photos | ✓ | ✓ | ✓ | Private | Platform photography |
| Satellite/Aerial Images | | | ✓ | Mixed | Public (some) + Private |

---

## ZONING & DEVELOPMENT

| Data Field | R | PS | CS | Source Type | Public Data Source |
|------------|---|----|----|-------------|-------------------|
| Zoning Code / District | ✓ | ✓ | ✓ | Public | DCP (PLUTO, ZoLa) |
| Land Use Code | ✓ | ✓ | ✓ | Public | DCP (PLUTO) |
| FAR (Current) | ✓ | ✓ | | Public | DCP (PLUTO) |
| Maximum Allowable FAR | | ✓ | | Public | DCP (ZoLa, Zoning Resolution) |
| Buildable SF (Unused FAR) | | ✓ | | Public | Calculated from PLUTO + Zoning |
| Air Rights Available | | ✓ | | Public | Calculated from PLUTO + Zoning |
| Conversion Feasibility Index | | ✓ | | Private | PropertyShark proprietary |
| Construction Pipeline | | ✓ | ✓ | Public | DOB (permits, filings) |

---

## LANDMARK & HISTORIC

| Data Field | R | PS | CS | Source Type | Public Data Source |
|------------|---|----|----|-------------|-------------------|
| Landmark Designation Status | | ✓ | | Public | LPC Database |
| Historic District Status | | ✓ | | Public | LPC Database |
| Landmark Designation Date | | ✓ | | Public | LPC Database |
| Landmark Type (Individual/Interior/Scenic) | | ✓ | | Public | LPC Database |

---

## OWNERSHIP DATA

| Data Field | R | PS | CS | Source Type | Public Data Source |
|------------|---|----|----|-------------|-------------------|
| Recorded Owner (LLC/Individual) | ✓ | ✓ | ✓ | Public | ACRIS, DOF |
| Owner Mailing Address | ✓ | ✓ | ✓ | Public | DOF (RPAD) |
| True Owner Behind LLC | ✓ | ✓ | ✓ | Mixed | Dept of State + Private research |
| Owner Phone Number | ✓ | ✓ | ✓ | Private | Aggregated/researched |
| Owner Email | ✓ | ✓ | ✓ | Private | Aggregated/researched |
| Ownership History / Prior Owners | ✓ | ✓ | ✓ | Public | ACRIS (deed chain) |
| Owner Portfolio (all properties) | ✓ | ✓ | ✓ | Mixed | Public records + entity matching |
| Time Held by Current Owner | ✓ | ✓ | | Public | ACRIS (calculated) |
| Corporate Structure / Ownership Tree | ✓ | | | Private | Reonomy AI/research |
| Building Management Records | | ✓ | | Mixed | DOB + Private research |
| Owner Type (REIT, PE, Private) | | | ✓ | Private | CoStar research |
| Fund Information | | | ✓ | Private | CoStar proprietary |
| Decision Maker Contacts | | | ✓ | Private | CoStar research |

---

## DOCUMENTS

| Data Field | R | PS | CS | Source Type | Public Data Source |
|------------|---|----|----|-------------|-------------------|
| Deeds | | ✓ | | Public | ACRIS |
| Titles | | ✓ | | Public | ACRIS |
| Mortgages / Loan Documents | ✓ | ✓ | | Public | ACRIS |
| Assignments | | ✓ | | Public | ACRIS |
| UCC Filings | | ✓ | | Public | Dept of State, ACRIS |
| Financial Statements (RPIE) | | ✓ | | Public | DOF (RPIE filings) |
| Plats | | ✓ | | Public | County Clerk |
| Easements | | ✓ | | Public | ACRIS |
| Internal Transfers | | ✓ | | Public | ACRIS |

---

## SALES HISTORY

| Data Field | R | PS | CS | Source Type | Public Data Source |
|------------|---|----|----|-------------|-------------------|
| Sale Date | ✓ | ✓ | ✓ | Public | ACRIS, DOF Rolling Sales |
| Sale Price | ✓ | ✓ | ✓ | Public | ACRIS, DOF Rolling Sales |
| Buyer / Seller Names | ✓ | ✓ | ✓ | Public | ACRIS |
| Transaction Type | ✓ | | ✓ | Public | ACRIS |
| Hold Period | ✓ | ✓ | ✓ | Public | Calculated from ACRIS |
| Sales Comps | ✓ | ✓ | ✓ | Public | DOF Rolling Sales + calculated |
| Asking Price | | | ✓ | Private | Listing data |
| Achieved Price vs Asking | | | ✓ | Private | CoStar research |
| Cap Rate | | | ✓ | Private | CoStar research/calculated |
| Price Per SF | ✓ | ✓ | ✓ | Public | Calculated from public data |
| Broker / Agent | | | ✓ | Private | CoStar research |
| Time on Market | | | ✓ | Private | CoStar tracking |
| Comprehensive Sale Notes | | | ✓ | Private | CoStar research |
| Estimated Property Value | | ✓ | | Mixed | Algorithm + public comps |

---

## MORTGAGE & DEBT DATA

| Data Field | R | PS | CS | Source Type | Public Data Source |
|------------|---|----|----|-------------|-------------------|
| Lender Name | ✓ | ✓ | ✓ | Public | ACRIS |
| Mortgage Amount | ✓ | ✓ | ✓ | Public | ACRIS |
| Origination Date | ✓ | ✓ | ✓ | Public | ACRIS |
| Maturity Date | ✓ | ✓ | ✓ | Mixed | ACRIS (if recorded) + Private |
| Loan Terms | ✓ | | | Mixed | ACRIS (partial) + Private |
| Lien Records | ✓ | ✓ | | Public | ACRIS |
| Pre-Foreclosure Status | ✓ | ✓ | | Public | Lis Pendens (County Clerk) |
| Foreclosure Stage | ✓ | ✓ | | Public | Court records |
| Auction Date | ✓ | ✓ | | Public | Court records |
| Operating Statements | | | ✓ | Private | CoStar research |
| Prior Loans History | ✓ | ✓ | ✓ | Public | ACRIS |

---

## TAX DATA

| Data Field | R | PS | CS | Source Type | Public Data Source |
|------------|---|----|----|-------------|-------------------|
| Market Value (DOF) | ✓ | ✓ | ✓ | Public | DOF (NOPV, RPAD) |
| Assessed Value | ✓ | ✓ | ✓ | Public | DOF (RPAD) |
| Net Assessed Value | | ✓ | | Public | DOF |
| Billable Value | | ✓ | | Public | DOF |
| Assessment Rate | | ✓ | | Public | DOF |
| Property Tax Amount (Current) | ✓ | ✓ | ✓ | Public | DOF |
| Tax History (Multi-Year) | ✓ | ✓ | | Public | DOF |
| Tax Per Square Foot | | ✓ | | Public | Calculated from DOF |
| Tax Exemptions | | ✓ | | Public | DOF |
| Tax Abatements | | ✓ | | Public | DOF |
| Year-Over-Year Tax Change | ✓ | | | Public | Calculated from DOF |

---

## FINANCIALS (Commercial)

| Data Field | R | PS | CS | Source Type | Public Data Source |
|------------|---|----|----|-------------|-------------------|
| Reported Income / Revenue | | ✓ | ✓ | Public | DOF (RPIE filings) |
| Reported Expenses | | ✓ | ✓ | Public | DOF (RPIE filings) |
| Net Operating Income (NOI) | | ✓ | ✓ | Mixed | RPIE + Private research |
| Rental Income | | ✓ | ✓ | Mixed | RPIE + Private research |
| Occupancy Rates | | ✓ | ✓ | Private | Research/aggregation |
| Cap Rate (DOF) | | ✓ | | Public | DOF assessment records |
| Rent Growth | | | ✓ | Private | CoStar tracking |
| Vacancy Projections | | | ✓ | Private | CoStar analytics |

---

## TENANTS & OCCUPANCY

| Data Field | R | PS | CS | Source Type | Public Data Source |
|------------|---|----|----|-------------|-------------------|
| Current Tenants (Business Names) | ✓ | ✓ | ✓ | Mixed | DOB (CO) + Private research |
| NAICS / SIC Codes | ✓ | | ✓ | Private | Business databases |
| Tenant Web Address | ✓ | | | Private | Aggregated |
| Owner-Occupied Status | ✓ | | | Mixed | DOF + calculated |
| Tenant Phone Numbers | | ✓ | ✓ | Private | Researched |
| Lease Start Date | | | ✓ | Private | CoStar research |
| Lease Expiration Date | | | ✓ | Private | CoStar research |
| Asking Rent | | | ✓ | Private | Listing data |
| Rent Achieved | | | ✓ | Private | CoStar research |
| Lease Terms / Concessions | | | ✓ | Private | CoStar research |
| Lease Comps | | | ✓ | Private | CoStar database |
| Pending Moves | | | ✓ | Private | CoStar research |
| Available Space (SF) | | | ✓ | Private | CoStar tracking |

---

## PERMITS & CONSTRUCTION

| Data Field | R | PS | CS | Source Type | Public Data Source |
|------------|---|----|----|-------------|-------------------|
| Building Permits (NB, ALT1, ALT2, ALT3) | | ✓ | | Public | DOB (BIS, DOB NOW) |
| Permit Type | | ✓ | | Public | DOB |
| Permit Status | | ✓ | | Public | DOB |
| Filing Representative | | ✓ | | Public | DOB |
| Certificate of Occupancy | | ✓ | | Public | DOB |
| Construction Pipeline | | ✓ | ✓ | Public | DOB |

---

## VIOLATIONS

| Data Field | R | PS | CS | Source Type | Public Data Source |
|------------|---|----|----|-------------|-------------------|
| DOB Violations | | ✓ | | Public | DOB (BIS) |
| OATH/ECB Summonses | | ✓ | | Public | DOB / OATH |
| HPD Violations | | ✓ | | Public | HPD |
| FDNY Fire Code Violations | | ✓ | | Public | FDNY |
| DEP Environmental Violations | | ✓ | | Public | DEP |
| Violation Class (I, II, III) | | ✓ | | Public | DOB / HPD |
| Resolution Status | | ✓ | | Public | Respective agency |

---

## FORECLOSURE DATA

| Data Field | R | PS | CS | Source Type | Public Data Source |
|------------|---|----|----|-------------|-------------------|
| Pre-Foreclosure Status | ✓ | ✓ | | Public | Lis Pendens (County Clerk) |
| Foreclosure Filings | ✓ | ✓ | | Public | Court records |
| REO Properties | | ✓ | | Public | Court records + ACRIS |
| Auction Results / Dates | ✓ | ✓ | | Public | Court records |
| Lis Pendens | | ✓ | | Public | County Clerk |

---

## ENVIRONMENTAL & RISK

| Data Field | R | PS | CS | Source Type | Public Data Source |
|------------|---|----|----|-------------|-------------------|
| FEMA Flood Zone | | ✓ | | Public | FEMA |
| Toxic Sites | | ✓ | | Public | EPA, DEC |
| Environmental Risk Maps | | ✓ | | Public | Various agencies |
| ENERGY STAR Score | | | ✓ | Public | EPA / NYC LL84 |
| Green Certifications (LEED) | | | ✓ | Mixed | USGBC + Private verification |

---

## MARKET & ANALYTICS

| Data Field | R | PS | CS | Source Type | Public Data Source |
|------------|---|----|----|-------------|-------------------|
| Market Demographics | ✓ | | ✓ | Public | Census Bureau, ACS |
| Population Data | | | ✓ | Public | Census Bureau |
| Household Income | | | ✓ | Public | Census Bureau, ACS |
| Traffic Patterns | | | ✓ | Mixed | DOT + Private |
| Points of Interest | | | ✓ | Private | CoStar research |
| Market/Submarket Analytics | | | ✓ | Private | CoStar proprietary |
| Rent Trajectories | | | ✓ | Private | CoStar proprietary |
| Vacancy Projections | | | ✓ | Private | CoStar proprietary |
| Supply/Demand Forecasts | | | ✓ | Private | CoStar proprietary |

---

## PREDICTIVE & PROPRIETARY

| Data Field | R | PS | CS | Source Type | Public Data Source |
|------------|---|----|----|-------------|-------------------|
| "Likelihood to Sell" Score | ✓ | | | Private | Reonomy AI |
| Property Condition Assessment | ✓ | | | Private | Reonomy AI |
| Conversion Feasibility Index | | ✓ | | Private | PropertyShark algorithm |
| Building Rating (1-5 Stars) | | | ✓ | Private | CoStar proprietary |
| Market Forecasts | | | ✓ | Private | CoStar analytics |

---

## SUMMARY: PUBLIC NYC DATA SOURCES FOR APP DEVELOPMENT

| Source | Data Available | API/Access |
|--------|---------------|------------|
| **ACRIS** | Deeds, mortgages, liens, assignments, UCC, sales | NYC Open Data API |
| **DOF (RPAD)** | Property characteristics, ownership, assessed values, taxes | NYC Open Data API |
| **DOF (Rolling Sales)** | Sales transactions | NYC Open Data API |
| **DOF (RPIE)** | Income & expenses for commercial properties | Request/FOIL |
| **PLUTO** | Zoning, FAR, land use, lot/building dimensions | NYC Open Data API |
| **DOB (BIS)** | Permits, violations, CO, complaints | NYC Open Data API |
| **HPD** | Housing violations, registrations | NYC Open Data API |
| **LPC** | Landmark status, historic districts | NYC Open Data API |
| **DCP (ZoLa)** | Zoning maps, special districts | Web / GIS |
| **FEMA** | Flood zones | FEMA API |
| **Census/ACS** | Demographics | Census API |
| **Dept of State** | LLC/Corp filings | Paid search |
| **Court Records** | Foreclosures, lis pendens | County Clerk |

---

## KEY TAKEAWAYS FOR APP DEVELOPMENT

### High-Value Public Data (Readily Available via API)
1. Property characteristics (BBL, address, building class, SF, units, year built)
2. Zoning & FAR (current and max allowable)
3. Tax data (assessed value, market value, tax amount, history)
4. Sales history (date, price, buyer/seller)
5. Mortgage data (lender, amount, origination date)
6. Permits & violations (DOB, HPD, FDNY)
7. Landmark status
8. Flood zones

### Requires Additional Processing/Calculation
1. Buildable SF / Air rights (FAR × Lot - Current Building)
2. Time held (current date - last deed date)
3. Price per SF (sale price ÷ building SF)
4. Tax per SF
5. Owner portfolio (entity matching across properties)

### Must Be Privately Sourced
1. True owner behind LLC (beyond Dept of State filings)
2. Owner contact info (phone, email)
3. Tenant information & lease terms
4. Current asking rents
5. Occupancy rates
6. Predictive analytics
7. Market forecasts
