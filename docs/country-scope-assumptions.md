# Country-Specific Emission Factors: Scope & Assumptions

## Scope Narrowing

This extension adds country-specific emission factors for the **top 5 emitting countries** across **4 activities** where country-level public data exists. This is a deliberate scope reduction from the full 20 activities x all countries.

### Countries Selected (Top 5 Emitters)

| Code | Country | Why included |
|------|---------|-------------|
| US | United States | #2 emitter; best data availability (EPA, EIA) |
| CN | China | #1 emitter; limited English-language data |
| IN | India | #3 emitter; very limited transport data |
| DE | Germany | EU proxy, #1 EU emitter; excellent data (UBA/TREMOD) |
| RU | Russia | #4 emitter; worst data availability of the 5 |

### Activities Selected (4 of 20)

| Activity | Why included | Why others excluded |
|----------|-------------|-------------------|
| **Grid Electricity** | Ember publishes free country-level data for all 5 | — |
| **Natural Gas (Stationary)** | IPCC provides global default; chemistry is universal | — |
| **Passenger Car** | ICCT + national agencies publish fleet data | — |
| **Bus** | Motivating example from variance analysis | — |
| ~~Air Travel~~ | — | Inherently global; country-specific factors don't apply meaningfully |
| ~~Hotels~~ | — | Country-level data is DEFRA-only or paywalled (IEA/STR) |
| ~~Materials~~ | — | LCA databases (ecoinvent) are paywalled; no free cross-country data |
| ~~Freight~~ | — | Limited public data outside US/UK |

## Data Sources by Activity

### Grid Electricity
- **Source:** Ember Global Electricity Review 2025 (2024 data)
- **URL:** https://ember-energy.org/latest-insights/global-electricity-review-2025/
- **Methodology:** Generation-based intensity (g CO2/kWh), not consumption-based. Includes lifecycle CO2e. CC BY 4.0 license.
- **Germany note:** Ember doesn't break out Germany individually in 2025 review. Used Ember country profile (2023: 371 g/kWh) adjusted for 2024 renewables >60% per Fraunhofer ISE. Estimated at 364 g/kWh.

### Natural Gas (Stationary Combustion)
- **Source:** IPCC 2006 Guidelines, Vol 2, Ch 2, Table 2.2
- **URL:** https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_2_Ch2_Stationary_Combustion.pdf
- **Value:** 56,100 kg CO2/TJ (NCV basis) — single global default
- **Key assumption:** IPCC provides ONE global default for natural gas because composition is relatively uniform worldwide (range: 54,200–58,300 kg CO2/TJ). All 5 countries receive the same factor. This means natural gas shows 0% cross-country variance, which is itself a finding — it demonstrates that some emission sources are geography-independent.

### Passenger Car
| Country | Source | Value (g CO2/pkm) | Occupancy | Data quality |
|---------|--------|-------------------|-----------|-------------|
| US | EPA / U. Michigan CSS | 166 | 1.5 (US DOT 2019) | On-road fleet average, high quality |
| CN | ICCT | 103 | 1.5 (estimated) | New-sales certified + 20% real-world gap. CAUTION: new-sales weighted |
| IN | ICCT | 91 | 1.6 (estimated) | Certified MIDC + 20% gap. Smaller/lighter fleet. **STALE (FY2018-19)** |
| DE | UBA/TREMOD | 166 | 1.4 (German avg) | National model, transparent. Highest quality of the 5 |
| RU | IEA | 128 | 1.5 (estimated) | Derived from fuel consumption. **STALE (2019)**. No post-2022 data |

**Critical caveats:**
- Test cycle vs real-world: Certified values (NEDC, WLTP, MIDC) understate real-world emissions by 15-40%. We apply a 20% uplift to certified values.
- New car fleet vs on-road fleet: ICCT data is new-sales weighted; EPA is on-road fleet. The on-road fleet is older and dirtier.
- Occupancy varies: 1.4 (Germany) to 1.6 (India estimated). A ±0.1 change in occupancy shifts per-pkm by ~7%.

### Bus
| Country | Source | Value (g CO2/pkm) | Data quality |
|---------|--------|-------------------|-------------|
| US | CBO/EPA | 110 | National average, all bus types (transit + intercity). Transit-only would be ~268 due to low occupancy |
| CN | Academic study (Beijing) | 56 | **City-specific only** (Beijing). Not nationally representative |
| IN | WRI/Shakti Foundation | 15 | National calculated. Very low due to extremely high occupancy (60-80+ passengers). **STALE (2015)** |
| DE | UBA/TREMOD | 93 | National model. Scheduled bus average (diesel 96, electric 72, long-distance 31) |
| RU | IPCC regional default | 75 | **No Russia-specific data exists.** IPCC Eastern Europe/CIS default, derived from diesel bus fuel consumption + estimated occupancy |

**Critical caveats:**
- Bus variance is dominated by **occupancy**, not technology. India's 15 g/pkm vs US's 110 g/pkm reflects India's packed buses, not cleaner buses.
- Per vehicle-km, all countries' diesel buses emit comparably (~800-1200 g CO2/vkm). The per-passenger-km metric amplifies occupancy differences.
- China data is Beijing-only. Tier-2/3 cities may differ significantly.
- Russia has no published bus emission factor. The IPCC regional default is a rough estimate.

## Data Quality Flags

Factors are flagged as **stale** when underlying data is 2+ years old relative to publication:
- India passenger car: FY2018-19 data (7 years old)
- India bus: 2015 data (11 years old)
- Russia passenger car: 2019 data (7 years old)
- Russia bus: IPCC 2006 default (20 years old)

## What This Does NOT Cover

1. **Sub-national variation:** US has 26 eGRID subregions with 3x variation in grid intensity. China's provinces vary similarly. We use national averages only.
2. **Temporal trends:** Grid intensity is falling rapidly in some countries (Germany: -50% since 2010; China: -20% since 2015). Static factors miss this.
3. **Supplier-specific data:** All factors are fleet/grid averages, not operator-specific. A company using 100% renewable electricity has zero Scope 2 regardless of the grid average.
4. **Well-to-wheel vs tank-to-wheel:** Some factors include upstream fuel production emissions; others don't. We note this per-factor but don't harmonize.
