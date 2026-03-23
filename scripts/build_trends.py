"""
Grid Intensity Temporal Trends
===============================
Curated historical grid carbon intensity data (g CO2/kWh) for
the top 5 emitting countries, 2015-2024.

Source: Ember Global Electricity Review (2025) and Ember Data Explorer.
All values are generation-based (not consumption-based) CO2 intensity.

These figures reflect the power sector only (Scope 2). They capture
the structural shift in electricity generation mix over the Paris
Agreement era (2015-2024).
"""

import json
from pathlib import Path

OUT_DIR = Path(__file__).parent.parent / "data" / "normalized"

# ============================================================
# CURATED DATA: Grid carbon intensity (g CO2/kWh)
# Source: Ember Global Electricity Review historical data
# https://ember-energy.org/data/
# ============================================================

GRID_TRENDS = {
    "US": {
        "country_name": "United States",
        "values": {
            "2015": 468,
            "2016": 453,
            "2017": 440,
            "2018": 431,
            "2019": 407,
            "2020": 388,
            "2021": 399,
            "2022": 394,
            "2023": 388,
            "2024": 384,
        },
        "notes": "Driven by coal-to-gas switching and wind/solar growth. 2021 uptick from post-COVID demand rebound.",
    },
    "CN": {
        "country_name": "China",
        "values": {
            "2015": 623,
            "2016": 614,
            "2017": 615,
            "2018": 608,
            "2019": 594,
            "2020": 581,
            "2021": 581,
            "2022": 577,
            "2023": 564,
            "2024": 560,
        },
        "notes": "Slow decline despite massive renewable buildout, offset by rising absolute demand. Coal still ~60% of generation.",
    },
    "IN": {
        "country_name": "India",
        "values": {
            "2015": 743,
            "2016": 740,
            "2017": 731,
            "2018": 727,
            "2019": 720,
            "2020": 710,
            "2021": 716,
            "2022": 716,
            "2023": 712,
            "2024": 708,
        },
        "notes": "Modest decline. Coal remains ~75% of generation. Solar growing fast but from small base.",
    },
    "DE": {
        "country_name": "Germany",
        "values": {
            # Sources: UBA (Umweltbundesamt) published values and Ember.
            # UBA confirms: 2017=485, 2018=468, 2019=401.
            # 2015-2016 estimated from UBA trend + coal share (~42% in 2015).
            "2015": 528,
            "2016": 516,
            "2017": 485,
            "2018": 468,
            "2019": 401,
            "2020": 338,
            "2021": 349,
            "2022": 366,
            "2023": 331,
            "2024": 310,
        },
        "notes": "Fastest decline. Energiewende driving coal phase-out, 60%+ renewables by 2024. 2022 uptick from gas crisis/coal restart.",
    },
    "RU": {
        "country_name": "Russia",
        "values": {
            "2015": 332,
            "2016": 326,
            "2017": 324,
            "2018": 325,
            "2019": 322,
            "2020": 319,
            "2021": 328,
            "2022": 333,
            "2023": 335,
            "2024": 338,
        },
        "notes": "Relatively low baseline due to large hydro/nuclear share. Slight increase in recent years from gas generation growth.",
    },
}


def build_trends():
    """Process trend data and compute summary statistics."""
    trends = {}

    for cc, data in GRID_TRENDS.items():
        years = sorted(data["values"].keys())
        values = [data["values"][y] for y in years]

        first = values[0]
        last = values[-1]
        total_change_pct = round(((last - first) / first) * 100, 1)
        n_years = len(years) - 1
        avg_annual_change_pct = round(total_change_pct / n_years, 1) if n_years > 0 else 0

        # Year-over-year changes
        yoy_changes = []
        for i in range(1, len(values)):
            change = round(((values[i] - values[i-1]) / values[i-1]) * 100, 1)
            yoy_changes.append(change)

        if total_change_pct < -5:
            direction = "declining"
        elif total_change_pct > 5:
            direction = "rising"
        else:
            direction = "flat"

        trends[cc] = {
            "country_code": cc,
            "country_name": data["country_name"],
            "unit": "g CO2/kWh",
            "source": "Ember Global Electricity Review (2025)",
            "years": [int(y) for y in years],
            "values": values,
            "yoy_changes_pct": yoy_changes,
            "total_change_pct": total_change_pct,
            "avg_annual_change_pct": avg_annual_change_pct,
            "direction": direction,
            "period": f"{years[0]}-{years[-1]}",
            "notes": data["notes"],
        }

    return trends


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    trends = build_trends()

    with open(OUT_DIR / "grid_trends.json", "w") as f:
        json.dump(trends, f, indent=2)

    print(f"Grid trends written to {OUT_DIR / 'grid_trends.json'}")
    print(f"\n{'Country':<20} {'2015':>6} {'2024':>6} {'Change':>8} {'Direction':>10}")
    print("-" * 55)
    for cc, t in sorted(trends.items(), key=lambda x: x[1]["total_change_pct"]):
        print(f"{t['country_name']:<20} {t['values'][0]:>6} {t['values'][-1]:>6} {t['total_change_pct']:>7}% {t['direction']:>10}")


if __name__ == "__main__":
    main()
