"""
Emission Factor Comparison Engine
==================================
Given an activity type, returns a structured comparison across all available
sources with variance calculations and "why do these differ" annotations.

This is the core logic that powers the comparator tool.
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "normalized"


# ============================================================
# VARIANCE DIAGNOSIS RULES
# ============================================================
# Each rule tests conditions on a comparison and returns a plain-language
# explanation of WHY sources differ. Rules are evaluated in order;
# the first matching rule wins.

def _diagnose_variance(activity_id, sources):
    """Generate a plain-language explanation of why sources differ."""
    if len(sources) < 2:
        return None

    geo_scopes = set(s["geographic_scope"] for s in sources)
    has_us = any("US" in s["geographic_scope"] for s in sources)
    has_uk = any("UK" in s["geographic_scope"] for s in sources)
    has_global = any("Global" in s["geographic_scope"] for s in sources)

    notes = [s.get("methodology_notes", "") for s in sources]
    all_notes = " ".join(notes).lower()

    # Rule 0: HHV vs LHV (natural gas) — check first, specific rule
    if "natural_gas" in activity_id:
        if ("hhv" in all_notes or "lhv" in all_notes or "higher heating" in all_notes
            or "lower heating" in all_notes or "net cv" in all_notes or "net calorific" in all_notes
            or "gross" in all_notes):
            return (
                "Energy measurement basis. EPA uses Higher Heating Value (HHV/Gross CV), "
                "while DEFRA and IPCC use Lower Heating Value (LHV/Net CV). HHV includes "
                "the latent heat of water vapor in combustion products; LHV does not. "
                "The difference is ~10% for natural gas. Additionally, the IPCC factor "
                "(via GHG Protocol) is CO2-only while EPA/DEFRA include CH4/N2O."
            )

    # Rule 1: Radiative forcing difference (air travel)
    if "air_travel" in activity_id:
        has_rf = any("radiative forcing" in n.lower() and "include" in n.lower() and "not" not in n.lower() for n in notes)
        no_rf = any("not include radiative forcing" in n.lower() or "does not include" in n.lower() for n in notes)
        if has_rf and no_rf:
            values = [s["value_kg_co2e"] for s in sources]
            min_v, max_v = min(values), max(values)
            avg = sum(values) / len(values)
            var = ((max_v - min_v) / avg) * 100 if avg else 0
            if var > 20:
                return (
                    "Radiative forcing (RF) inclusion. DEFRA includes RF (accounting for "
                    "non-CO2 climate effects of aviation like contrails and NOx at altitude), "
                    "which roughly increases the climate impact by 50-90%. EPA and GHG Protocol "
                    "do not include RF. This is a genuine methodological choice, not an error."
                )
            else:
                return (
                    "Sources are close despite different methodologies. DEFRA includes radiative "
                    "forcing while EPA/GHG Protocol do not, but different distance category "
                    "definitions and base emission rates partially offset this, producing "
                    "coincidentally similar results."
                )
        # Check if distance category definitions differ
        if "300 miles" in all_notes and "3700 km" in all_notes:
            return (
                "Distance category definitions differ. EPA defines short-haul as <300 miles "
                "(~483 km), while DEFRA defines short-haul as up to 3700 km. These are not "
                "the same category, making direct comparison unreliable."
            )

    # Rule 2: Geographic scope difference
    if has_us and has_uk and len(geo_scopes) > 1:
        if "electricity" in activity_id:
            return (
                "Geographic grid mix. US electricity (eGRID2023) reflects a coal/gas-heavy "
                "grid averaging ~0.35 kg CO2e/kWh, while UK electricity reflects a grid that "
                "has rapidly decarbonized (offshore wind, nuclear) to ~0.18 kg CO2e/kWh. "
                "This is not a methodology difference — it's a real physical difference in "
                "how electricity is generated."
            )
        if "bus" in activity_id or "car" in activity_id or "vehicle" in activity_id:
            return (
                "Geographic fleet composition. US and UK vehicle fleets differ in average "
                "vehicle size, fuel efficiency standards, fuel mix, and public transit "
                "ridership patterns. US buses tend to show lower per-passenger-km emissions "
                "partly due to different occupancy assumptions."
            )
        if "rail" in activity_id:
            return (
                "Geographic infrastructure. UK rail is partially electrified with higher "
                "occupancy rates. US intercity rail (Amtrak) covers longer distances with "
                "lower occupancy, affecting per-passenger-km intensity."
            )
        return (
            f"Geographic scope. Sources cover different regions ({', '.join(sorted(geo_scopes))}), "
            "which have different energy mixes, infrastructure, and regulatory environments. "
            "Neither is wrong — they measure different things."
        )

    # Rule 3: HHV vs LHV (natural gas) — check before geographic scope
    if "natural_gas" in activity_id:
        if ("hhv" in all_notes or "lhv" in all_notes or "higher heating" in all_notes
            or "lower heating" in all_notes or "net cv" in all_notes or "gross" in all_notes):
            return (
                "Energy measurement basis. EPA uses Higher Heating Value (HHV/Gross CV), "
                "while DEFRA and IPCC use Lower Heating Value (LHV/Net CV). HHV includes "
                "the latent heat of water vapor in combustion products; LHV does not. "
                "The difference is ~10% for natural gas. Additionally, the IPCC factor "
                "(via GHG Protocol) is CO2-only while EPA includes CH4/N2O."
            )

    # Rule 4: Data vintage
    staleness = [s.get("staleness_flag", False) for s in sources]
    if any(staleness) and not all(staleness):
        stale_sources = [s["source_name"] for s, flag in zip(sources, staleness) if flag]
        return (
            f"Data vintage. {', '.join(stale_sources)} uses older underlying data. "
            "Emission factors change as energy grids evolve, vehicle fleets turn over, "
            "and measurement methodologies improve."
        )

    # Rule 5: Underlying source circularity
    underlying = [s.get("underlying_data_source", "") for s in sources if s.get("underlying_data_source")]
    if underlying:
        return (
            f"Source circularity. Some factors trace back to the same underlying source "
            f"({', '.join(set(underlying))}). Apparent agreement may reflect shared provenance "
            "rather than independent validation."
        )

    # Default
    return (
        "Methodology and scope differences. Sources use different measurement approaches, "
        "system boundaries, and geographic assumptions."
    )


def _variance_level(pct):
    """Classify variance into human-readable levels."""
    if pct is None:
        return "single_source"
    if pct < 5:
        return "low"
    if pct < 20:
        return "moderate"
    if pct < 50:
        return "high"
    return "very_high"


# ============================================================
# COMPARISON ENGINE
# ============================================================

def load_factors():
    """Load all normalized source factors (EPA, DEFRA, GHG Protocol)."""
    with open(DATA_DIR / "all_factors.json") as f:
        return json.load(f)


def load_country_factors():
    """Load country-specific factors (separate from source factors)."""
    path = DATA_DIR / "country_factors.json"
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return []


def get_activity_ids(factors=None):
    """Return sorted list of unique activity IDs."""
    if factors is None:
        factors = load_factors()
    return sorted(set(f["activity_id"] for f in factors))


def compare_activity(activity_id, factors=None):
    """
    Compare emission factors across sources for a given activity.

    Returns a structured comparison dict with:
    - activity metadata
    - per-source factors with original values
    - variance calculation
    - plain-language diagnosis of why sources differ
    - key insight row (the "PM thinking" line)
    """
    if factors is None:
        factors = load_factors()

    matching = [f for f in factors if f["activity_id"] == activity_id]
    if not matching:
        return None

    # Build source comparison
    sources = []
    for f in matching:
        source_entry = {
            "source_name": f["source"]["name"],
            "source_edition": f["source"]["edition"],
            "source_publisher": f["source"]["publisher"],
            "source_url": f["source"]["url"],
            "last_updated": f["source"]["last_updated"],
            "underlying_data_source": f["source"].get("underlying_data_source"),
            "value_kg_co2e": f["factor"]["value_kg_co2e"],
            "unit_denominator": f["factor"]["unit_denominator"],
            "co2_component": f["factor"].get("co2_component"),
            "ch4_component": f["factor"].get("ch4_component"),
            "n2o_component": f["factor"].get("n2o_component"),
            "original_value": f["original_value"]["value"],
            "original_unit": f["original_value"]["unit"],
            "original_notes": f["original_value"].get("notes", ""),
            "geographic_scope": f["geographic_scope"],
            "methodology_notes": f.get("methodology_notes", ""),
            "staleness_flag": f.get("staleness_flag", False),
        }
        sources.append(source_entry)

    # Calculate variance
    values = [s["value_kg_co2e"] for s in sources]
    if len(values) >= 2:
        min_v, max_v = min(values), max(values)
        avg = sum(values) / len(values)
        variance_pct = round(((max_v - min_v) / avg) * 100, 1) if avg > 0 else 0
    else:
        variance_pct = None
        min_v = max_v = values[0] if values else None

    # Diagnose variance
    diagnosis = _diagnose_variance(activity_id, sources)

    # Build key insight row
    variance_level = _variance_level(variance_pct)
    if variance_pct is not None and len(sources) >= 2:
        key_insight = (
            f"These {len(sources)} sources vary by {variance_pct}%. "
            f"{diagnosis}"
        )
    elif len(sources) == 1:
        key_insight = (
            f"Only one source covers this activity ({sources[0]['source_name']}). "
            "No cross-source comparison is possible, which is itself a finding — "
            "it means there is no independent validation available."
        )
    else:
        key_insight = None

    return {
        "activity_id": activity_id,
        "activity_name": matching[0]["activity_name"],
        "category": matching[0]["category"],
        "scope": matching[0]["scope"],
        "normalized_unit": f"kg CO2e per {matching[0]['factor']['unit_denominator']}",
        "sources": sources,
        "variance": {
            "percentage": variance_pct,
            "level": variance_level,
            "min_value": min_v,
            "max_value": max_v,
            "diagnosis": diagnosis,
        },
        "key_insight": key_insight,
    }


def compare_all(factors=None):
    """Compare all activities and return full comparison dataset."""
    if factors is None:
        factors = load_factors()

    activity_ids = get_activity_ids(factors)
    comparisons = {}
    for aid in activity_ids:
        comp = compare_activity(aid, factors)
        if comp:
            comparisons[aid] = comp

    return comparisons


# ============================================================
# COUNTRY COMPARISON ENGINE
# ============================================================

COUNTRY_NAMES = {
    "US": "United States",
    "CN": "China",
    "IN": "India",
    "DE": "Germany",
    "RU": "Russia",
    "GB": "United Kingdom",
}

COUNTRY_ACTIVITIES = [
    "electricity_grid",
    "natural_gas_stationary",
    "passenger_car_gasoline",
    "bus",
]


def _diagnose_country_variance(activity_id, countries, variance):
    """Generate a plain-language explanation of cross-country variance."""
    highest = variance["highest_country"]
    lowest = variance["lowest_country"]
    ratio = variance["ratio"]
    pct = variance["percentage"]

    stale_countries = [c["country_name"] for c in countries if c["staleness_flag"]]
    stale_note = ""
    if stale_countries:
        stale_note = (
            f" Data quality caveat: {', '.join(stale_countries)} "
            f"{'uses' if len(stale_countries) == 1 else 'use'} stale data (2+ years old), "
            "so these figures may not reflect current conditions."
        )

    if "electricity" in activity_id:
        return (
            f"These {len(countries)} countries vary by {pct}% in grid carbon intensity. "
            f"{highest} ({ratio}x {lowest}) reflects real differences in electricity generation mix: "
            "India's grid is ~75% coal, while Germany has exceeded 60% renewables. "
            "This is not a methodology difference — it's a physical difference in how electricity is generated. "
            "Implication: the same kWh of electricity has very different climate impact depending on where it's consumed. "
            "A company's Scope 2 emissions are heavily geography-dependent."
            + stale_note
        )

    if "natural_gas" in activity_id:
        return (
            f"All {len(countries)} countries show identical factors (0% variance) because the IPCC provides "
            "a single global default for natural gas. Unlike electricity or transport, natural gas composition "
            "is relatively uniform worldwide — the combustion chemistry doesn't vary by country. "
            "This is itself a key finding: some emission sources are genuinely geography-independent. "
            "The real country-level variation in natural gas emissions comes from upstream methane leakage rates "
            "(not captured here), which can vary 2-10x between countries."
        )

    if "bus" in activity_id:
        return (
            f"These {len(countries)} countries vary by {pct}% ({highest} is {ratio}x {lowest}). "
            "This variance is driven almost entirely by occupancy, not technology. "
            "Indian urban buses operate at extremely high occupancy (60-80+ passengers, often standing room), "
            "producing just 15 g CO2/passenger-km. US transit buses average ~25% capacity utilization, "
            "inflating per-passenger emissions to 110 g/km. Per vehicle-km, all countries' diesel buses "
            "emit comparably (~800-1200 g CO2/vkm). The per-passenger-km metric amplifies ridership differences."
            + stale_note
        )

    if "passenger_car" in activity_id:
        return (
            f"These {len(countries)} countries vary by {pct}% ({highest} is {ratio}x {lowest}). "
            "Variance is driven by three factors: (1) vehicle fleet composition — Indian/Chinese fleets "
            "are smaller and lighter than US/German fleets; (2) fuel efficiency standards — EU regulations "
            "are stricter than US; (3) occupancy assumptions — ranging from 1.4 (Germany) to 1.6 (India). "
            "China's rapid BEV/PHEV adoption (~35% of new sales in 2023) is also pulling fleet averages down. "
            "Caution: some values use new-sales averages while others use on-road fleet averages, "
            "which can differ by 20-40%."
            + stale_note
        )

    return (
        f"These {len(countries)} countries vary by {pct}%. "
        "Differences reflect local infrastructure, regulations, fleet composition, "
        "and energy mix."
        + stale_note
    )


def compare_by_country(activity_id, factors=None):
    """
    Compare emission factors for the same activity across countries.

    Groups factors by country_code and returns per-country values
    with cross-country variance calculation.
    """
    if factors is None:
        factors = load_factors()

    matching = [f for f in factors if f["activity_id"] == activity_id and f.get("country_code")]
    if not matching:
        return None

    # Group by country
    by_country = {}
    for f in matching:
        cc = f["country_code"]
        if cc not in by_country:
            by_country[cc] = []
        by_country[cc].append(f)

    if len(by_country) < 2:
        return None

    # Build country entries (take first factor per country)
    countries = []
    for cc, country_factors in sorted(by_country.items()):
        f = country_factors[0]  # primary factor for this country
        countries.append({
            "country_code": cc,
            "country_name": COUNTRY_NAMES.get(cc, cc),
            "value_kg_co2e": f["factor"]["value_kg_co2e"],
            "unit_denominator": f["factor"]["unit_denominator"],
            "source_name": f["source"]["name"],
            "source_edition": f["source"]["edition"],
            "geographic_scope": f["geographic_scope"],
            "methodology_notes": f.get("methodology_notes", ""),
            "staleness_flag": f.get("staleness_flag", False),
        })

    # Calculate cross-country variance
    values = [c["value_kg_co2e"] for c in countries]
    min_v, max_v = min(values), max(values)
    avg = sum(values) / len(values)
    variance_pct = round(((max_v - min_v) / avg) * 100, 1) if avg > 0 else 0

    # Find highest and lowest countries
    highest = max(countries, key=lambda c: c["value_kg_co2e"])
    lowest = min(countries, key=lambda c: c["value_kg_co2e"])
    ratio = round(highest["value_kg_co2e"] / lowest["value_kg_co2e"], 1) if lowest["value_kg_co2e"] > 0 else 0

    variance_info = {
        "percentage": variance_pct,
        "level": _variance_level(variance_pct),
        "min_value": min_v,
        "max_value": max_v,
        "highest_country": highest["country_name"],
        "lowest_country": lowest["country_name"],
        "ratio": ratio,
    }

    key_insight = _diagnose_country_variance(activity_id, countries, variance_info)

    return {
        "activity_id": activity_id,
        "activity_name": matching[0]["activity_name"],
        "category": matching[0]["category"],
        "normalized_unit": f"kg CO2e per {matching[0]['factor']['unit_denominator']}",
        "countries": countries,
        "variance": variance_info,
        "key_insight": key_insight,
    }


def compare_all_countries(factors=None):
    """Compare all country-enabled activities across countries."""
    if factors is None:
        factors = load_country_factors()

    comparisons = {}
    for aid in COUNTRY_ACTIVITIES:
        comp = compare_by_country(aid, factors)
        if comp:
            comparisons[aid] = comp

    return comparisons


def print_comparison(comp):
    """Pretty-print a single activity comparison."""
    if not comp:
        print("No data found.")
        return

    print(f"\n{'='*70}")
    print(f"  {comp['activity_name']}")
    print(f"  {comp['scope'].replace('_', ' ').title()} | {comp['category'].replace('_', ' ').title()}")
    print(f"{'='*70}")
    print(f"  Normalized unit: {comp['normalized_unit']}")
    print()

    # Source table
    print(f"  {'Source':<35} {'Value':>12} {'Geo':>12} {'Updated':>12} {'Stale':>6}")
    print(f"  {'-'*35} {'-'*12} {'-'*12} {'-'*12} {'-'*6}")
    for s in comp["sources"]:
        stale_mark = "  !!!" if s["staleness_flag"] else ""
        short_name = s["source_name"][:35]
        print(f"  {short_name:<35} {s['value_kg_co2e']:>12.6f} {s['geographic_scope'][:12]:>12} {s['last_updated']:>12}{stale_mark}")
        if s.get("underlying_data_source"):
            print(f"  {'':35}   (via {s['underlying_data_source']})")

    # Variance
    print()
    v = comp["variance"]
    if v["percentage"] is not None:
        level_emoji = {"low": "[LOW]", "moderate": "[MOD]", "high": "[HIGH]", "very_high": "[VERY HIGH]"}
        print(f"  Variance: {v['percentage']}% {level_emoji.get(v['level'], '')}")
        print(f"  Range: {v['min_value']:.6f} — {v['max_value']:.6f}")

    # Key insight
    print()
    print(f"  KEY INSIGHT:")
    # Word-wrap the insight
    insight = comp["key_insight"]
    words = insight.split()
    line = "  "
    for w in words:
        if len(line) + len(w) + 1 > 72:
            print(line)
            line = "  " + w
        else:
            line += " " + w if line.strip() else "  " + w
    if line.strip():
        print(line)
    print()


# ============================================================
# CLI
# ============================================================

def main():
    """Run comparison engine and output results."""
    factors = load_factors()
    comparisons = compare_all(factors)

    # Country comparisons (from separate country_factors.json)
    country_comparisons = compare_all_countries()

    # Write full comparison JSON (includes country comparisons)
    output = {
        "source_comparisons": comparisons,
        "country_comparisons": country_comparisons,
    }
    out_path = DATA_DIR / "full_comparison.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"Full comparison written to {out_path}")

    # Print summary of all activities with variance
    print(f"\n{'Activity':<45} {'Sources':>7} {'Variance':>10} {'Level':>12}")
    print("-" * 78)
    for aid, comp in sorted(comparisons.items(), key=lambda x: -(x[1]["variance"]["percentage"] or -1)):
        v = comp["variance"]
        var_str = f"{v['percentage']}%" if v["percentage"] is not None else "N/A"
        level = v["level"]
        print(f"{comp['activity_name']:<45} {len(comp['sources']):>7} {var_str:>10} {level:>12}")

    # Print detailed comparison for high-variance activities
    print("\n" + "=" * 70)
    print("  DETAILED COMPARISONS (activities with 2+ sources)")
    print("=" * 70)

    multi_source = {aid: comp for aid, comp in comparisons.items() if len(comp["sources"]) >= 2}
    for aid in sorted(multi_source, key=lambda x: -(multi_source[x]["variance"]["percentage"] or 0)):
        print_comparison(multi_source[aid])

    # Print country comparisons
    if country_comparisons:
        print("\n" + "=" * 70)
        print("  COUNTRY COMPARISONS")
        print("=" * 70)
        print(f"\n  {'Activity':<40} {'Countries':>9} {'Variance':>10} {'Highest':>12} {'Lowest':>12}")
        print("  " + "-" * 85)
        for aid, comp in sorted(country_comparisons.items(), key=lambda x: -x[1]["variance"]["percentage"]):
            v = comp["variance"]
            print(f"  {comp['activity_name']:<40} {len(comp['countries']):>9} {v['percentage']:>9}% {v['highest_country']:>12} {v['lowest_country']:>12}")

        for aid, comp in sorted(country_comparisons.items(), key=lambda x: -x[1]["variance"]["percentage"]):
            print(f"\n  {'─'*70}")
            print(f"  {comp['activity_name']} ({comp['normalized_unit']})")
            print(f"  Cross-country variance: {comp['variance']['percentage']}% | "
                  f"{comp['variance']['highest_country']} is {comp['variance']['ratio']}x {comp['variance']['lowest_country']}")
            print()
            for c in sorted(comp["countries"], key=lambda x: -x["value_kg_co2e"]):
                stale = " [STALE]" if c["staleness_flag"] else ""
                print(f"    {c['country_name']:<20} {c['value_kg_co2e']:>10.4f}  ({c['source_name'][:40]}){stale}")


if __name__ == "__main__":
    main()
