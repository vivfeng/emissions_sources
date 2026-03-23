# Emission Factor Source Comparator

A learning artifact that compares emission factors across EPA, DEFRA, and GHG Protocol for the same business activities, making the methodology choice visible.

## Purpose

When calculating emissions from a business activity, multiple public databases publish emission factors that frequently disagree. This tool surfaces that variance and the reasons behind it.

## Data Sources

| Source | Edition | Downloaded | File |
|--------|---------|------------|------|
| [EPA GHG Emission Factors Hub](https://www.epa.gov/climateleadership/ghg-emission-factors-hub) | January 2025 | 2026-03-22 | `data/raw/epa-ghg-emission-factors-hub-2025.xlsx` |
| [UK DEFRA/DESNZ Conversion Factors](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025) | June 2025 | 2026-03-22 | `data/raw/defra-ghg-conversion-factors-2025-condensed.xlsx` |
| [UK DEFRA/DESNZ Flat File](https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025) | June 2025 | 2026-03-22 | `data/raw/defra-ghg-conversion-factors-2025-flat.xlsx` |
| [GHG Protocol Cross-Sector Tools V2.0](https://ghgprotocol.org/calculation-tools-and-guidance) | May 2024 | 2026-03-22 | `data/raw/ghg-protocol-emission-factors-v2.0.xlsx` |

**Important provenance note:** GHG Protocol does not publish independent emission factors — it compiles from IPCC, DEFRA, IEA, and EPA. This is itself a finding worth discussing.

## Project Structure

```
data/
  raw/          # Original Excel files from each source (unmodified)
  normalized/   # Extracted and unit-normalized JSON data
docs/
  friction-log.md   # Problems encountered during data extraction
  data-sources.md   # Detailed provenance for each source
```

## Status

Work in progress — this is a learning artifact, not a production tool.
