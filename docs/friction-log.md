# Friction Log

Every problem, surprise, and judgment call encountered while building the emission factor dataset. These are the conversation starters for the Watershed meeting.

---

## Friction Point 1: GHG Protocol is not an independent source

**What happened:** Expected three independent databases to compare. Discovered that GHG Protocol's emission factor workbook is a compilation of IPCC, DEFRA, and EPA data — not original research.

**Why it matters:** A naive comparison showing "EPA, DEFRA, and GHG Protocol all agree" may actually just be showing the same underlying number cited three different ways. For air travel specifically, GHG Protocol's factors ARE DEFRA's factors.

**Watershed question:** "When you're providing emission factors to customers, do you ever run into the problem of apparent source agreement that's actually circular — like GHG Protocol citing DEFRA citing IPCC? How do you communicate that to customers who want 'multiple source validation'?"

---

## Friction Point 2: Unit chaos across sources

**What happened:** Every source uses different units for the same activity.

| Activity | EPA | DEFRA | GHG Protocol |
|----------|-----|-------|--------------|
| Electricity | **lb** CO2 / **MWh** | **kg** CO2e / **kWh** | **lb** CO2 / **MWh** |
| Air travel | kg CO2 / **passenger-mile** | kg CO2e / **passenger-km** | kg CO2e / **passenger-km** |
| Natural gas | kg CO2 / **mmBtu** | kg CO2e / **kWh** | kg CO2 / **TJ** |
| Vehicles | kg CO2 / **vehicle-mile** | kg CO2e / **km** | varies |

EPA uses imperial units (lbs, miles, mmBtu, short tons). DEFRA uses metric (kg, km, kWh, tonnes). GHG Protocol mixes both depending on which source it's pulling from.

**Why it matters:** Silent unit conversion errors are easy to make and hard to catch. Getting electricity wrong by a factor of 2.2 (lb→kg) or 1000 (MWh→kWh) could mean a 3-order-of-magnitude error in a report.

**Watershed question:** "Unit normalization seems like one of those invisible problems — if you get it wrong the numbers still look plausible. How do you validate that your conversion layer is correct? Is that something that's ever caught in customer audits?"

---

## Friction Point 3: CO2 vs CO2e — what's actually being reported

**What happened:** EPA reports CO2, CH4, and N2O as separate columns. DEFRA reports a pre-calculated CO2e total. GHG Protocol does both depending on the sheet.

For air travel:
- EPA: 0.129 kg **CO2** / passenger-mile (medium haul) — this is CO2 only, not CO2e
- DEFRA: 0.12786 kg **CO2e** / passenger-km — this includes CH4 and N2O

To make EPA comparable to DEFRA, you have to:
1. Convert EPA's CO2, CH4, and N2O to CO2e using GWP factors
2. Convert passenger-miles to passenger-km
3. Then compare

**Why it matters:** Reporting "CO2" when you mean "CO2e" (or vice versa) is a methodology error that affects every number downstream.

---

## Friction Point 4: Radiative forcing on air travel

**What happened:** DEFRA flat file air travel factors (e.g., long-haul = 0.15282 kg CO2e/pkm) include radiative forcing (RF). But the GHG Protocol workbook, which claims to source from DEFRA, shows much lower values (long-haul = ~0.08 kg CO2e/pkm) because it uses the "without RF" variant.

Radiative forcing accounts for non-CO2 climate effects of aviation (contrails, NOx at altitude). It roughly doubles the climate impact. Whether to include it is a genuine methodological choice, but neither source makes this obvious unless you read footnotes.

**Why it matters:** Two users both citing "DEFRA" could get numbers that differ by ~2x depending on which variant they use.

**Watershed question:** "Do you include radiative forcing in air travel factors? If a customer's auditor questions it, what's the standard response?"

---

## Friction Point 5: EPA electricity is hyper-regional, DEFRA is national

**What happened:** EPA provides 26 eGRID subregional factors for US electricity. The range is enormous:
- NYUP (Upstate NY): 241 lb CO2/MWh (hydro/nuclear heavy)
- HIOA (Hawaii Oahu): 1,489 lb CO2/MWh (oil-dependent)
- US Average: 772 lb CO2/MWh

DEFRA provides one number for UK electricity: 0.177 kg CO2e/kWh.

**Why it matters:** Using a US national average vs. the actual subregion can produce 2-6x differences for the same kWh of electricity. This is probably the single largest source of variance in most companies' Scope 2 calculations.

**Watershed question:** "When EPA revises eGRID data — which they did in January 2025 with eGRID2023 — what does that trigger internally? Do customer reports retroactively change, or is it forward-looking only?"

---

## Friction Point 6: EPA hotel stays — where are they?

**What happened:** Multiple secondary sources claim EPA publishes hotel stay emission factors (~21.6 lbs CO2e / room-night). But when I inspected the actual 2025 Excel file, I could not find a dedicated hotel stays row in Table 10 (Business Travel). The table shows vehicles, rail, bus, and air — but no hotels.

**Status:** Need to check if this factor is in a footnote, a separate EPA publication, or if secondary sources are wrong.

**Why it matters:** This is exactly the kind of thing that goes wrong in emissions work — a number gets cited in secondary sources, people use it, and nobody checks whether the primary source actually says what they think it says.

---

## Friction Point 7: Steel/aluminum — three different measurement approaches

**What happened:**
- EPA: Only offers spend-based factors (kg CO2e per dollar spent). No physical-unit factor for steel.
- DEFRA: Offers "steel cans" and "aluminium cans and foil" — specific product forms, not raw material. 2863.9 kg CO2e/tonne for steel cans.
- GHG Protocol: Has a separate legacy Iron & Steel Tool (.xls) from ~2008, not integrated into the main workbook.

**Why it matters:** If a company purchases steel for manufacturing, none of these sources gives a clean "kg CO2e per tonne of steel purchased" factor. DEFRA's factor is for steel cans specifically (includes forming). EPA's factor depends on how much you paid, not how much steel you bought.

**Watershed question:** "For materials like steel where public emission factor sources are fragmented, do you use lifecycle databases like ecoinvent? How do customers handle the cost difference between free public factors and paid databases?"

---

## Friction Point 8: Vintage mismatch — eGRID versions

**What happened:** EPA's January 2025 file uses eGRID2023 data. GHG Protocol's March 2024 file uses eGRID2022 data. These are different vintages of the same underlying dataset, and they produce different numbers for the same grid region.

Example (WECC California / CAMX):
- EPA eGRID2023: 436.655 lb CO2/MWh
- GHG Protocol eGRID2022: needs verification but will be different

**Why it matters:** Two reports calculated the same month using "EPA data" could produce different numbers depending on which edition they used. Auditability requires pinning to a specific vintage.

---

## Friction Point 9: Natural gas units are especially confusing

**What happened:** Natural gas emission factors come in at least 5 different unit bases:
- EPA: kg CO2 per mmBtu, also per scf (standard cubic foot)
- DEFRA: kg CO2e per kWh, per cubic metre, per tonne
- GHG Protocol: kg CO2 per TJ (terajoule)

Converting between these requires knowing the heat content of natural gas, which itself varies by source and is reported differently (HHV vs LHV / gross vs net calorific value).

EPA uses Higher Heating Value (HHV). IPCC/GHG Protocol uses Lower Heating Value (LHV). The difference is ~10%.

**Why it matters:** A 10% error from HHV/LHV confusion on natural gas could affect a company's entire Scope 1 calculation.

---

## Friction Point 10: DEFRA naming vs EPA naming

**What happened:** Matching activities across sources requires judgment calls:

| What we call it | EPA name | DEFRA name |
|----------------|----------|------------|
| Short-haul flight | "Air Travel - Short Haul (< 300 miles)" | "Short-haul, to/from UK" (up to 3700 km) |
| Long-haul flight | "Air Travel - Long Haul (≥ 2300 miles)" | "Long-haul, to/from UK" (over 3700 km) |
| Average car | "Passenger Car" | "Average car" (under Cars by size) |
| Hotel night | Not clearly found | "Hotel stay" |

The short-haul thresholds are different: EPA's short haul is <300 miles (~483 km). DEFRA doesn't have an equivalent — their shortest is "domestic" or "short-haul up to 3700 km" which in EPA terms covers both short AND medium haul.

**Why it matters:** There's no clean 1:1 mapping between EPA and DEFRA flight categories. Any comparison requires deciding which EPA categories to combine or which DEFRA category to split.

---

## Friction Point 11: DEFRA materials have hidden "Column Text" variants

**What happened during audit:** The DEFRA flat file has multiple `kg CO2e` rows per material, differentiated by a "Column Text" field (column 7) that isn't immediately visible:
- "Primary material production" = 2,864 kg CO2e/tonne (steel cans) — total embodied carbon
- "Closed-loop source" = 1,824 kg CO2e/tonne — nets out recycled content credit

Our initial extraction silently picked the closed-loop value. This was a 36% undercount for steel and a 89% undercount for aluminum.

**Why it matters:** The DEFRA flat file is designed for programmatic use, but its structure has hidden dimensions (Column Text, Level 4) that change the meaning of numbers dramatically. A naive lookup by (Scope, Level 1-3) hits the wrong row.

---

## Friction Point 12: GHG Protocol "Natural Gas" vs "Natural Gas Liquids"

**What happened during audit:** The GHG Protocol workbook's Stationary Combustion sheet has "Natural Gas Liquids" (row 8, 64,200 kg CO2/TJ) before "Natural gas" (row 44, 56,100 kg CO2/TJ). A text search for "natural gas" matched NGL first — a completely different fuel. This silently inflated our GHG Protocol natural gas factor by 14%.

**Why it matters:** NGL is a petroleum derivative. Natural gas is methane. They have different emission factors, different uses, and different reporting categories. This is exactly the kind of silent error that automated pipelines can introduce.

---

## Friction Point 13: Passenger car definitions diverge between same source's editions

**What happened during audit:** EPA Hub 2025 reports passenger car at 0.297 kg CO2/vehicle-mile. GHG Protocol (which claims to source from EPA) reports 0.175 kg CO2/vehicle-mile — a 51% difference. Both claim US data. This suggests either different fleet definitions (all cars vs. gasoline-only) or different data vintages.

**Why it matters:** Even when two databases cite the same upstream source, the actual numbers can diverge substantially. Version pinning matters.

---

## Summary: Top 3 Talking Points for Watershed

1. **The independence problem** — Three sources isn't three opinions if they're citing each other. The real question is how many truly independent measurement methodologies exist for a given activity.

2. **The unit/methodology problem** — CO2 vs CO2e, radiative forcing, HHV vs LHV, regional vs national. These silent assumptions can change a number by 2-10x, and most users never see them.

3. **The lifecycle question** — When EPA publishes a revision (like eGRID2023 in Jan 2025), that creates a cascade: every tool that cited the old version needs updating, every report needs re-evaluation. What does that event look like operationally?
