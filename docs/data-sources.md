# Data Source Provenance

Every emission factor used in this tool traces back to one of these three sources. This document records exactly what was downloaded, from where, and what we found inside.

## Source 1: EPA GHG Emission Factors Hub

- **Publisher:** US Environmental Protection Agency
- **Edition:** January 2025 (last modified January 15, 2025)
- **Landing page:** https://www.epa.gov/climateleadership/ghg-emission-factors-hub
- **Downloaded from:** https://www.epa.gov/system/files/other-files/2025-01/ghg-emission-factors-hub-2025.xlsx
- **Download date:** 2026-03-22
- **File:** `data/raw/epa-ghg-emission-factors-hub-2025.xlsx` (991 KB)
- **Format:** Single-sheet Excel workbook, 591 rows × 28 cols
- **GWP values used:** IPCC AR5 (CH4=28, N2O=265)

### Structure
Single sheet named "Emission Factors Hub" with 12 tables:

| Table | Name | Rows | Key for us? |
|-------|------|------|-------------|
| 1 | Stationary Combustion | 12–100 | Yes — natural gas |
| 2 | Mobile Combustion CO2 | 101–123 | Yes — fuel-based vehicle EFs |
| 3 | Mobile Combustion CH4/N2O (Gasoline On-Road) | 124–245 | Supplementary |
| 4 | Mobile Combustion CH4/N2O (Diesel On-Road) | 246–286 | Supplementary |
| 5 | Mobile Combustion CH4/N2O (Non-Road) | 287–333 | No |
| 6 | Electricity | 334–406 | Yes — eGRID subregions |
| 7 | Steam and Heat | 407–418 | No |
| 8 | Upstream Transportation (Scope 3 Cat 4/9) | 419–431 | Yes — freight |
| 9 | Waste (Scope 3 Cat 5/12) | 432–500 | Maybe — landfill |
| 10 | Business Travel (Scope 3 Cat 6/7) | 501–520 | Yes — air travel, hotels, rail, vehicles |
| 11 | GWP values | 521–557 | Reference |
| 12 | GWP for blended refrigerants | 558–591 | No |

### Key Factors Found (with units as published)

**Natural Gas (Table 1, row 38):**
- CO2: 53.06 kg CO2 / mmBtu
- CH4: 1 g CH4 / mmBtu
- N2O: 0.1 g N2O / mmBtu
- Heat content: 0.001026 mmBtu / scf

**Electricity (Table 6, row 366):**
- US Average: 771.523 lb CO2 / MWh (total output)
- Plus CH4: 0.057 lb CH4/MWh, N2O: 0.008 lb N2O/MWh
- Source: EPA eGRID2023
- Also provides 26 subregional factors

**Air Travel (Table 10, rows 513-515):**
- Short haul (<300 mi): 0.207 kg CO2 / passenger-mile
- Medium haul (300–2300 mi): 0.129 kg CO2 / passenger-mile
- Long haul (≥2300 mi): 0.163 kg CO2 / passenger-mile
- Plus CH4 and N2O factors separately

**Passenger Vehicles (Table 10, rows 504-505):**
- Passenger car: 0.297 kg CO2 / vehicle-mile
- Light-duty truck: 0.394 kg CO2 / vehicle-mile

**Hotel Stays:** Not directly in Table 10 despite being listed in research. Need to verify — may be in a footnote or supplementary table. **[FRICTION POINT]**

**Steel/Aluminum:** Not covered in this file. Would need separate EPA Supply Chain factors (spend-based, different methodology).

---

## Source 2: UK DEFRA/DESNZ Conversion Factors

- **Publisher:** Department for Energy Security and Net Zero (DESNZ) — commonly called "DEFRA factors"
- **Edition:** 2025, Version 1
- **Landing page:** https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025
- **Downloaded from:**
  - Condensed: https://assets.publishing.service.gov.uk/media/6846a4e6d25e6f6afd4c0180/ghg-conversion-factors-2025-condensed-set.xlsx
  - Flat file: https://assets.publishing.service.gov.uk/media/6846b6ea57f3515d9611f0dd/ghg-conversion-factors-2025-flat-format.xlsx
- **Download date:** 2026-03-22
- **Files:**
  - `data/raw/defra-ghg-conversion-factors-2025-condensed.xlsx` (1.8 MB)
  - `data/raw/defra-ghg-conversion-factors-2025-flat.xlsx` (494 KB)
- **Format:** Flat file has 2 sheets; "Factors by Category" has 8,748 rows × 10 cols
- **Flat file columns:** ID, Scope, Level 1, Level 2, Level 3, Level 4, Column Text, UOM, GHG/Unit, GHG Conversion Factor 2025

### Structure (Flat File)
Each row is one factor. Multiple rows per activity cover different GHG breakdowns:
- `kg CO2e` = total CO2-equivalent (the one we want)
- `kg CO2e of CO2 per unit` = CO2 component only
- `kg CO2e of CH4 per unit` = CH4 component (in CO2e)
- `kg CO2e of N2O per unit` = N2O component (in CO2e)

### Key Factors Found (all in kg CO2e per unit shown)

**Natural Gas (Scope 1 > Fuels > Gaseous fuels):**
- Natural gas: 2.02903 kg CO2e / kWh? **[NEEDS VERIFICATION — unit says "kWh" in condensed but raw value 2603.3 implies per tonne]**
- Also available per cubic metre, per kWh

**Electricity (Scope 2 > UK electricity):**
- UK grid: 0.177 kg CO2e / kWh
- T&D losses: 0.01853 kg CO2e / kWh (Scope 3)

**Air Travel (Scope 3 > Business travel- air > Flights):**
- Domestic, to/from UK: 0.22928 kg CO2e / passenger-km
- Short-haul, to/from UK: 0.12786 kg CO2e / passenger-km
- Long-haul, to/from UK: 0.15282 kg CO2e / passenger-km
- International, to/from non-UK: 0.14253 kg CO2e / passenger-km

**Passenger Vehicles (Scope 1 > Passenger vehicles > Cars by size):**
- Small car: 0.1434 kg CO2e / km
- Medium car: 0.17174 kg CO2e / km
- Large car: 0.21007 kg CO2e / km
- Average car: 0.17304 kg CO2e / km

**Hotel Stays (Scope 3 > Hotel stay):**
- UK: 10.4 kg CO2e / room per night
- United States: 16.1 kg CO2e / room per night
- China: 53.5 kg CO2e / room per night
- 38+ countries covered with per-country factors

**Steel (Scope 3 > Material use > Metal):**
- Steel cans: 2863.9 kg CO2e / tonne (with recycled content offset: 1823.9)
- Aluminium cans and foil: 9115.9 kg CO2e / tonne (with recycled content offset: 995.1)

---

## Source 3: GHG Protocol Cross-Sector Tools

- **Publisher:** Greenhouse Gas Protocol (WRI/WBCSD)
- **Edition:** V2.0, last modified March 13, 2024
- **Landing page:** https://ghgprotocol.org/calculation-tools-and-guidance
- **Downloaded from:** https://ghgprotocol.org/sites/default/files/2024-05/Emission_Factors_for_Cross_Sector_Tools_V2.0_0.xlsx
- **Download date:** 2026-03-22
- **File:** `data/raw/ghg-protocol-emission-factors-v2.0.xlsx` (423 KB)
- **Format:** Multi-sheet workbook, 11 sheets

### CRITICAL PROVENANCE NOTE
GHG Protocol does NOT publish independent emission factors. This workbook is a compilation from:
- **IPCC** 2006 Guidelines — for stationary combustion factors
- **DEFRA** — for mobile combustion, air travel, and freight factors
- **EPA eGRID** — for US electricity factors (but using eGRID2022, not 2023)
- **IEA** — for international electricity (factors no longer hosted by GHG Protocol)

This means for some activities, "GHG Protocol" and "DEFRA" will show the same number. That's not agreement between independent sources — it's the same source cited twice. **This is a key friction point to discuss with Watershed.**

### Structure

| Sheet | Rows | Source |
|-------|------|--------|
| Stationary Combustion | 194 | IPCC 2006 |
| Mobile Combustion - Fuel Use | 101 | Multiple |
| Mobile Combustion - Distance | 240 | DEFRA, EPA |
| Electricity US | 385 | EPA eGRID2022 |
| Electricity CN, TW, BR, TH, UK | 68 | Country-specific |
| Mobile Combustion - Freight | 145 | DEFRA |
| Mobile Combustion - Public | 50 | DEFRA |
| Abbreviations and Conversions | 86 | — |
| Revision History | 9 | — |

### Key Factors Found

**Natural Gas (Stationary Combustion, Table 1):**
- CO2: 56,100 kg CO2 / TJ (IPCC default)
- Equivalent: ~2.0 kg CO2 / m³ at standard conditions

**Electricity US (eGRID2022 data — one year behind EPA's eGRID2023):**
- Subregional factors in lb CO2/MWh — same structure as EPA but older vintage

**Air Travel (Mobile Combustion - Public, from DEFRA):**
- UK Domestic: 0.12871 kg CO2e / passenger-km
- UK Short Haul: 0.0804 kg CO2e / passenger-km
- **[FRICTION: These are DEFRA numbers. Significantly lower than the DEFRA flat file values above because the flat file includes radiative forcing and these don't]**

**Hotel Stays:** Not covered. GHG Protocol does not provide hotel emission factors.

**Steel/Aluminum:** Not in the cross-sector workbook. Separate sector-specific tools exist but are legacy .xls files from ~2008.

---

## Source Comparison Quick Reference

| Activity | EPA Unit | DEFRA Unit | GHG Protocol Unit | Comparable? |
|----------|----------|------------|-------------------|-------------|
| Natural gas | kg CO2 / mmBtu | kg CO2e / kWh (or /tonne) | kg CO2 / TJ | Requires conversion |
| Electricity | lb CO2 / MWh | kg CO2e / kWh | lb CO2 / MWh | EPA↔GHG same unit; DEFRA different |
| Air travel | kg CO2 / passenger-mile | kg CO2e / passenger-km | kg CO2e / passenger-km | EPA uses miles; DEFRA/GHG use km |
| Vehicles | kg CO2 / vehicle-mile | kg CO2e / km | varies | Mile vs km |
| Hotel stays | lbs CO2e / room-night | kg CO2e / room-night | N/A | EPA in lbs; no GHG Protocol data |
| Steel | N/A (spend-based only) | kg CO2e / tonne | N/A (legacy tool) | Only DEFRA has usable physical-unit data |
