#!/usr/bin/env python3
"""Add source_graph, effective_independence, and decision_framework data to data.json."""

import json
import sys
from pathlib import Path

data_path = Path(__file__).parent.parent / "app" / "app" / "data.json"

with open(data_path) as f:
    data = json.load(f)

# ── 1. Source Graph ──────────────────────────────────────────────

# Build edges by scanning all underlying_data_source fields
ghgp_to_defra_activities = []
ghgp_to_epa_activities = []
ghgp_to_ipcc_activities = []

for activity_id, comp in data["source_comparisons"].items():
    for source in comp["sources"]:
        uds = source.get("underlying_data_source")
        if uds is None:
            continue
        if "DEFRA" in uds:
            ghgp_to_defra_activities.append(activity_id)
        elif "EPA" in uds:
            ghgp_to_epa_activities.append(activity_id)
        elif "IPCC" in uds:
            ghgp_to_ipcc_activities.append(activity_id)

data["source_graph"] = {
    "nodes": [
        {"id": "epa", "label": "EPA", "type": "primary", "publisher": "US Environmental Protection Agency", "edition": "2025", "color": "#2563eb"},
        {"id": "defra", "label": "DEFRA/DESNZ", "type": "primary", "publisher": "UK Dept for Energy Security & Net Zero", "edition": "2025", "color": "#059669"},
        {"id": "ghg_protocol", "label": "GHG Protocol", "type": "aggregator", "publisher": "WRI / WBCSD", "edition": "V2.0", "color": "#7c3aed"},
        {"id": "ipcc", "label": "IPCC", "type": "primary", "publisher": "Intergovernmental Panel on Climate Change", "edition": "2006 Guidelines", "color": "#d97706"},
        {"id": "ember", "label": "Ember Climate", "type": "primary", "publisher": "Ember", "edition": "2025", "color": "#dc2626"},
        {"id": "icct", "label": "ICCT", "type": "primary", "publisher": "International Council on Clean Transportation", "edition": "Various", "color": "#0891b2"},
    ],
    "edges": [
        {
            "from": "ghg_protocol",
            "to": "defra",
            "activities": sorted(set(ghgp_to_defra_activities)),
            "label": "compiles from DEFRA",
            "count": len(set(ghgp_to_defra_activities)),
        },
        {
            "from": "ghg_protocol",
            "to": "epa",
            "activities": sorted(set(ghgp_to_epa_activities)),
            "label": "compiles from EPA",
            "count": len(set(ghgp_to_epa_activities)),
        },
        {
            "from": "ghg_protocol",
            "to": "ipcc",
            "activities": sorted(set(ghgp_to_ipcc_activities)),
            "label": "compiles from IPCC",
            "count": len(set(ghgp_to_ipcc_activities)),
        },
    ],
    "summary": {
        "total_activities": len(data["source_comparisons"]),
        "ghg_protocol_independent": 0,
        "ghg_protocol_compiled": len(set(ghgp_to_defra_activities + ghgp_to_epa_activities + ghgp_to_ipcc_activities)),
        "narrative": "GHG Protocol provides no independently derived emission factors in its Cross-Sector Tools. Every factor traces back to EPA, DEFRA, or IPCC. Apparent 'three-source agreement' is circular citation.",
    },
}

# ── 2. Effective Independence per comparison ─────────────────────

SOURCE_ID_MAP = {
    "EPA GHG Emission Factors Hub": "epa",
    "UK Government GHG Conversion Factors": "defra",
    "GHG Protocol Cross-Sector Emission Factors": "ghg_protocol",
}

for activity_id, comp in data["source_comparisons"].items():
    sources = comp["sources"]
    listed = len(sources)

    if listed <= 1:
        comp["effective_independence"] = {
            "listed_sources": listed,
            "effective_sources": listed,
            "independent_ids": [SOURCE_ID_MAP.get(sources[0]["source_name"], "unknown")] if listed == 1 else [],
            "note": "Single source — no independent validation available." if listed == 1 else "No sources.",
        }
        continue

    # Determine which sources are truly independent
    independent = set()
    derived_from = {}
    for s in sources:
        sid = SOURCE_ID_MAP.get(s["source_name"], "other")
        uds = s.get("underlying_data_source")
        if uds:
            # This source derives from another
            if "DEFRA" in uds:
                derived_from[sid] = "defra"
            elif "EPA" in uds:
                derived_from[sid] = "epa"
            elif "IPCC" in uds:
                derived_from[sid] = "ipcc"
        else:
            independent.add(sid)

    # effective = independent sources + 0.5 for each derived source whose parent isn't already listed
    # (it still adds SOME value as a cross-check, but not full independence)
    effective = len(independent)
    for derived_id, parent_id in derived_from.items():
        if parent_id in independent:
            # Derived from an already-listed source — adds no independence
            pass
        else:
            # Derived from an unlisted source — counts as partial
            effective += 0.5

    # Build note
    derived_notes = []
    for derived_id, parent_id in derived_from.items():
        name_map = {"epa": "EPA", "defra": "DEFRA", "ghg_protocol": "GHG Protocol", "ipcc": "IPCC"}
        derived_notes.append(f"{name_map.get(derived_id, derived_id)} compiles from {name_map.get(parent_id, parent_id)}")

    if derived_notes:
        note = f"{'; '.join(derived_notes)}. Effective independence: {effective} of {listed} listed sources."
    else:
        note = f"All {listed} sources are independently derived."

    comp["effective_independence"] = {
        "listed_sources": listed,
        "effective_sources": effective,
        "independent_ids": sorted(independent),
        "note": note,
    }

# ── 3. Decision Framework per comparison ─────────────────────────

# Rules based on activity category, source availability, and methodology
FRAMEWORK_RULES = {
    "air_travel": {
        "csrd_eu": {
            "recommended_source": "DEFRA/DESNZ",
            "rationale": "EU-aligned publisher. Includes radiative forcing (RF), which CSRD and EU taxonomy guidance considers best practice for aviation Scope 3. Updated annually."
        },
        "sec_cdp_us": {
            "recommended_source": "EPA",
            "rationale": "US-specific factors recognized by SEC and CDP. Excludes RF — conservative approach aligned with US reporting norms."
        },
        "global": {
            "recommended_source": None,
            "rationale": "No single source covers all geographies. Use DEFRA for EU operations (includes RF), EPA for US operations (excludes RF). Document the choice and RF treatment explicitly."
        },
    },
    "electricity": {
        "csrd_eu": {
            "recommended_source": "Country-specific (Ember/IEA)",
            "rationale": "CSRD requires location-based Scope 2 using country or regional grid factors. Ember provides the most current annual data. National averages are acceptable; subregional is better."
        },
        "sec_cdp_us": {
            "recommended_source": "EPA eGRID (subregional)",
            "rationale": "EPA eGRID provides US subregional factors — more accurate than national average. SEC and CDP both accept eGRID as authoritative for US operations."
        },
        "global": {
            "recommended_source": "Country-specific (Ember/IEA)",
            "rationale": "Always use the most geographically specific grid factor available. National > continental > global. Update annually — grid factors have the shortest shelf life of any emission factor."
        },
    },
    "stationary_combustion": {
        "csrd_eu": {
            "recommended_source": "Any (low variance)",
            "rationale": "Natural gas combustion chemistry is universal. All sources agree within ~11%, driven by HHV vs LHV measurement basis. Use DEFRA (LHV) for consistency with EU energy reporting conventions."
        },
        "sec_cdp_us": {
            "recommended_source": "EPA",
            "rationale": "EPA uses HHV (Higher Heating Value), which aligns with US energy reporting conventions. The difference vs LHV is ~10% — not trivial but well-understood."
        },
        "global": {
            "recommended_source": "IPCC",
            "rationale": "IPCC provides globally accepted default factors. Be explicit about HHV vs LHV basis — this is the main source of apparent disagreement."
        },
    },
    "ground_transport": {
        "csrd_eu": {
            "recommended_source": "DEFRA/DESNZ",
            "rationale": "EU-aligned publisher with detailed UK/EU vehicle categories. For non-UK EU operations, consider country-specific factors where available."
        },
        "sec_cdp_us": {
            "recommended_source": "EPA",
            "rationale": "EPA factors reflect US fleet composition, fuel efficiency standards, and driving patterns. GHG Protocol values may use older EPA vintages — check data currency."
        },
        "global": {
            "recommended_source": None,
            "rationale": "Ground transport factors are highly geography-dependent (fleet composition, fuel mix, occupancy). Always match the factor's geographic scope to the reporting entity's operations."
        },
    },
    "freight": {
        "csrd_eu": {
            "recommended_source": "DEFRA/DESNZ",
            "rationale": "DEFRA provides granular freight categories (articulated vs rigid, laden vs average). EU reporting benefits from this specificity."
        },
        "sec_cdp_us": {
            "recommended_source": "EPA",
            "rationale": "EPA provides US-specific truck freight factors. Match to the specific vehicle type where possible."
        },
        "global": {
            "recommended_source": None,
            "rationale": "Freight factors vary significantly by vehicle type, load factor, and road conditions. Use the most specific factor available for each operation."
        },
    },
    "accommodation": {
        "csrd_eu": {
            "recommended_source": "DEFRA/DESNZ",
            "rationale": "DEFRA provides country-specific hotel stay factors. Only available source for this category in our dataset."
        },
        "sec_cdp_us": {
            "recommended_source": "DEFRA/DESNZ",
            "rationale": "EPA does not publish hotel accommodation factors. DEFRA provides US-specific values. No independent US validation available."
        },
        "global": {
            "recommended_source": "DEFRA/DESNZ",
            "rationale": "Only source with hotel accommodation factors. Flag as single-source with no independent validation."
        },
    },
    "materials": {
        "csrd_eu": {
            "recommended_source": "DEFRA/DESNZ",
            "rationale": "DEFRA provides embodied carbon factors for common materials. For CSRD, also consider ecoinvent or PEFCR product-specific factors."
        },
        "sec_cdp_us": {
            "recommended_source": "DEFRA/DESNZ",
            "rationale": "EPA does not publish materials embodied carbon factors. DEFRA is the most accessible public source."
        },
        "global": {
            "recommended_source": "DEFRA/DESNZ",
            "rationale": "Single-source coverage. For higher-stakes reporting, supplement with lifecycle databases (ecoinvent, GaBi)."
        },
    },
}

for activity_id, comp in data["source_comparisons"].items():
    category = comp["category"]
    rules = FRAMEWORK_RULES.get(category)

    if rules:
        # Build defensibility note from effective_independence
        ei = comp.get("effective_independence", {})
        defensibility = ei.get("note", "")

        comp["decision_framework"] = {
            "csrd_eu": rules["csrd_eu"],
            "sec_cdp_us": rules["sec_cdp_us"],
            "global": rules["global"],
            "defensibility_note": defensibility,
        }
    else:
        comp["decision_framework"] = {
            "csrd_eu": {"recommended_source": None, "rationale": "No framework-specific recommendation available for this category."},
            "sec_cdp_us": {"recommended_source": None, "rationale": "No framework-specific recommendation available for this category."},
            "global": {"recommended_source": None, "rationale": "No framework-specific recommendation available for this category."},
            "defensibility_note": comp.get("effective_independence", {}).get("note", ""),
        }

# ── Write back ───────────────────────────────────────────────────

with open(data_path, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Done. Added source_graph, effective_independence, and decision_framework to data.json")

# Print summary
print(f"\nSource graph edges:")
for edge in data["source_graph"]["edges"]:
    print(f"  {edge['from']} -> {edge['to']}: {edge['count']} activities ({edge['label']})")

print(f"\nEffective independence stats:")
multi = [(k, v) for k, v in data["source_comparisons"].items() if v["effective_independence"]["listed_sources"] >= 2]
for k, v in multi:
    ei = v["effective_independence"]
    print(f"  {v['activity_name']}: {ei['listed_sources']} listed -> {ei['effective_sources']} effective")
