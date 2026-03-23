# Emission Factor Source Comparator

**[Live Site](https://vivfeng.github.io/emissions_sources/)**

An interactive tool that compares emission factors across multiple databases and countries, making methodology disagreements and their causes visible.

## What It Does

When calculating emissions from a business activity, multiple public databases publish emission factors that frequently disagree. This tool normalizes factors to a common unit (kg CO2e), calculates variance, and diagnoses *why* they differ: real physical differences, methodological choices, or data provenance issues.

### Two Comparison Views

- **By Source**: Compares the same activity across EPA, DEFRA, and GHG Protocol (8 activities with 2+ sources, 20 total)
- **By Country**: Compares the same activity across the top 5 emitting countries (US, China, India, Germany, Russia) for 4 key activities

## Key Findings

1. **Geography dominates.** Most variance comes from comparing US factors to UK factors, not from methodology disagreement.
2. **Source independence is an illusion.** GHG Protocol compiles from IPCC, DEFRA, and EPA. Apparent "three-source agreement" may actually be circular citation.
3. **Per-passenger metrics amplify occupancy.** Indian buses emit 15 g CO2/pkm vs US at 110 g, a 7x gap driven by ridership, not technology.
4. **Some factors are genuinely universal.** Natural gas shows 0% cross-country variance because combustion chemistry doesn't vary by country.

## Data Sources

| Source | Edition | Focus |
|--------|---------|-------|
| [EPA GHG Emission Factors Hub](https://www.epa.gov/climateleadership/ghg-emission-factors-hub) | January 2025 | US-focused |
| [UK DEFRA/DESNZ Conversion Factors](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025) | June 2025 | UK-focused |
| [GHG Protocol Cross-Sector Tools V2.0](https://ghgprotocol.org/calculation-tools-and-guidance) | May 2024 | Compiles from IPCC, EPA, DEFRA |
| [Ember Climate Global Electricity Review](https://ember-climate.org/data/) | 2025 | Country-level grid intensity |
| ICCT, UBA TREMOD, IPCC | Various | Country-level transport factors |

**Provenance note:** GHG Protocol does not publish independent emission factors. It compiles from IPCC, DEFRA, IEA, and EPA. This is itself a finding worth discussing.

## Project Structure

```
app/                  # Next.js frontend (static export for GitHub Pages)
data/
  raw/                # Original Excel files from each source (unmodified)
  normalized/         # Extracted and unit-normalized JSON
  country_specific/   # Country-level emission factors for top 5 emitters
scripts/
  compare.py          # Source-vs-source comparison engine
  compare_countries.py # Country-vs-country comparison engine
  normalize_*.py      # Per-source extraction and normalization
docs/
  friction-log.md     # Problems encountered during data extraction
  data-sources.md     # Detailed provenance for each source
```

## Scope Assumptions

- **Countries**: Limited to top 5 emitters (US, China, India, Germany, Russia)
- **Activities**: Country comparisons cover 4 high-impact categories (bus, electricity, passenger car, natural gas)
- **Data**: Uses publicly available sources only. IEA data (paid) would expand coverage significantly.

## Running Locally

```bash
cd app
npm install
npm run dev
```

## Status

Learning artifact, not a production tool.
