"use client";

import { useState } from "react";
import data from "./data.json";

type Source = {
  source_name: string;
  source_edition: string;
  source_publisher: string;
  source_url: string;
  last_updated: string;
  underlying_data_source: string | null;
  value_kg_co2e: number;
  unit_denominator: string;
  original_value: number;
  original_unit: string;
  original_notes: string;
  geographic_scope: string;
  methodology_notes: string;
  staleness_flag: boolean;
};

type Comparison = {
  activity_id: string;
  activity_name: string;
  category: string;
  scope: string;
  normalized_unit: string;
  sources: Source[];
  variance: {
    percentage: number | null;
    level: string;
    min_value: number | null;
    max_value: number | null;
    diagnosis: string | null;
  };
  key_insight: string;
};

type CountryEntry = {
  country_code: string;
  country_name: string;
  value_kg_co2e: number;
  unit_denominator: string;
  source_name: string;
  source_edition: string;
  geographic_scope: string;
  methodology_notes: string;
  staleness_flag: boolean;
};

type CountryComparison = {
  activity_id: string;
  activity_name: string;
  category: string;
  normalized_unit: string;
  countries: CountryEntry[];
  variance: {
    percentage: number;
    level: string;
    min_value: number;
    max_value: number;
    highest_country: string;
    lowest_country: string;
    ratio: number;
  };
};

// Handle both old flat format and new nested format
const rawData = data as Record<string, unknown>;
const hasNestedFormat = "source_comparisons" in rawData;
const comparisons = (hasNestedFormat ? rawData.source_comparisons : rawData) as Record<string, Comparison>;
const countryComparisons = (hasNestedFormat ? rawData.country_comparisons : {}) as Record<string, CountryComparison>;

// Group activities by category for the selector
const categories: Record<string, { id: string; name: string }[]> = {};
for (const [id, comp] of Object.entries(comparisons)) {
  const cat = comp.category;
  if (!categories[cat]) categories[cat] = [];
  categories[cat].push({ id, name: comp.activity_name });
}

// Only show activities with 2+ sources first, then single-source
const multiSource = Object.entries(comparisons)
  .filter(([, c]) => c.sources.length >= 2)
  .sort(
    (a, b) => (b[1].variance.percentage ?? -1) - (a[1].variance.percentage ?? -1)
  );
const singleSource = Object.entries(comparisons).filter(
  ([, c]) => c.sources.length < 2
);

const CATEGORY_LABELS: Record<string, string> = {
  stationary_combustion: "Stationary Combustion",
  electricity: "Electricity",
  air_travel: "Air Travel",
  ground_transport: "Ground Transport",
  freight: "Freight",
  accommodation: "Accommodation",
  materials: "Materials",
  waste: "Waste",
};

const SCOPE_LABELS: Record<string, string> = {
  scope_1: "Scope 1",
  scope_2: "Scope 2",
  scope_3: "Scope 3",
};

const COUNTRY_FLAGS: Record<string, string> = {
  US: "\u{1F1FA}\u{1F1F8}",
  CN: "\u{1F1E8}\u{1F1F3}",
  IN: "\u{1F1EE}\u{1F1F3}",
  DE: "\u{1F1E9}\u{1F1EA}",
  RU: "\u{1F1F7}\u{1F1FA}",
  GB: "\u{1F1EC}\u{1F1E7}",
};

function VarianceBadge({ level, pct }: { level: string; pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-400">Single source</span>;
  const colors: Record<string, string> = {
    low: "bg-green-100 text-green-800",
    moderate: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    very_high: "bg-red-100 text-red-800",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[level] || "bg-gray-100"}`}>
      {pct}% variance
    </span>
  );
}

function StaleFlag() {
  return (
    <span className="inline-flex items-center text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded" title="Underlying data may be outdated (2+ years)">
      Stale
    </span>
  );
}

function SourceCard({ source, maxVal }: { source: Source; maxVal: number }) {
  const barWidth = maxVal > 0 ? (source.value_kg_co2e / maxVal) * 100 : 0;
  const shortName = source.source_name.replace("UK Government GHG Conversion Factors", "DEFRA/DESNZ").replace("GHG Protocol Cross-Sector Emission Factors", "GHG Protocol");

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between mb-2">
        <div>
          <a
            href={source.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sm text-blue-700 hover:underline"
          >
            {shortName}
          </a>
          <div className="text-xs text-gray-500">
            Edition {source.source_edition} &middot; Updated {source.last_updated}
          </div>
          {source.underlying_data_source && (
            <div className="text-xs text-gray-400 italic">
              via {source.underlying_data_source}
            </div>
          )}
        </div>
        {source.staleness_flag && <StaleFlag />}
      </div>

      <div className="mt-3">
        <div className="text-2xl font-mono font-bold tabular-nums">
          {source.value_kg_co2e.toFixed(4)}
        </div>
        <div className="text-xs text-gray-500">kg CO2e / {source.unit_denominator}</div>
      </div>

      {/* Bar visualization */}
      <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Original value */}
      <div className="mt-3 text-xs text-gray-500 border-t pt-2">
        <span className="font-medium">Original:</span> {source.original_value}{" "}
        {source.original_unit}
      </div>

      {/* Geographic scope */}
      <div className="text-xs text-gray-500">
        <span className="font-medium">Geo:</span> {source.geographic_scope}
      </div>

      {/* Methodology note (truncated) */}
      {source.methodology_notes && (
        <details className="mt-2">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
            Methodology notes
          </summary>
          <p className="text-xs text-gray-500 mt-1">{source.methodology_notes}</p>
        </details>
      )}
    </div>
  );
}

function ComparisonView({ comp }: { comp: Comparison }) {
  const maxVal = Math.max(...comp.sources.map((s) => s.value_kg_co2e));

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold">{comp.activity_name}</h2>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          {SCOPE_LABELS[comp.scope] || comp.scope}
        </span>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          {CATEGORY_LABELS[comp.category] || comp.category}
        </span>
        <VarianceBadge level={comp.variance.level} pct={comp.variance.percentage} />
      </div>

      <div className="text-sm text-gray-600 mb-4">
        Normalized unit: <span className="font-mono">{comp.normalized_unit}</span>
      </div>

      {/* Source cards grid */}
      <div className={`grid gap-4 ${comp.sources.length === 1 ? "grid-cols-1 max-w-md" : comp.sources.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
        {comp.sources.map((source, i) => (
          <SourceCard key={i} source={source} maxVal={maxVal} />
        ))}
      </div>

      {/* Key Insight Row */}
      <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Key Insight
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{comp.key_insight}</p>
      </div>
    </div>
  );
}

function CountryBar({ country, maxVal }: { country: CountryEntry; maxVal: number }) {
  const barWidth = maxVal > 0 ? (country.value_kg_co2e / maxVal) * 100 : 0;
  const flag = COUNTRY_FLAGS[country.country_code] || "";

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-32 flex items-center gap-2 shrink-0">
        <span className="text-lg">{flag}</span>
        <span className="text-sm font-medium">{country.country_name}</span>
      </div>
      <div className="flex-1 flex items-center gap-3">
        <div className="flex-1 h-8 bg-gray-100 rounded overflow-hidden relative">
          <div
            className="h-full bg-emerald-500 rounded transition-all"
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <div className="w-24 text-right">
          <span className="font-mono font-bold text-sm tabular-nums">
            {country.value_kg_co2e.toFixed(4)}
          </span>
        </div>
      </div>
      <div className="w-6">
        {country.staleness_flag && <StaleFlag />}
      </div>
    </div>
  );
}

function CountryComparisonView({ comp }: { comp: CountryComparison }) {
  const maxVal = Math.max(...comp.countries.map((c) => c.value_kg_co2e));
  const sorted = [...comp.countries].sort((a, b) => b.value_kg_co2e - a.value_kg_co2e);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold">{comp.activity_name}</h2>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          {CATEGORY_LABELS[comp.category] || comp.category}
        </span>
        <VarianceBadge level={comp.variance.level} pct={comp.variance.percentage} />
      </div>

      <div className="text-sm text-gray-600 mb-4">
        {comp.normalized_unit} &middot; {comp.countries.length} countries &middot;{" "}
        {comp.variance.highest_country} is {comp.variance.ratio}x {comp.variance.lowest_country}
      </div>

      {/* Country bars */}
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        {sorted.map((country) => (
          <CountryBar key={country.country_code} country={country} maxVal={maxVal} />
        ))}
      </div>

      {/* Source attribution */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {sorted.map((country) => (
          <details key={country.country_code} className="border border-gray-200 rounded-lg p-3 bg-white">
            <summary className="text-sm cursor-pointer hover:text-gray-700">
              <span className="mr-1">{COUNTRY_FLAGS[country.country_code]}</span>
              {country.country_name} — {country.source_name}
              {country.staleness_flag && <span className="ml-2 text-xs text-amber-600">(stale data)</span>}
            </summary>
            <p className="text-xs text-gray-500 mt-2">{country.methodology_notes}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

type ViewMode = "sources" | "countries";

export default function Home() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showSingleSource, setShowSingleSource] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("sources");

  const selectedComp = selected ? comparisons[selected] : null;
  const selectedCountryComp = selected ? countryComparisons[selected] : null;
  const hasCountryData = Object.keys(countryComparisons).length > 0;

  const countryCompList = Object.entries(countryComparisons)
    .sort((a, b) => b[1].variance.percentage - a[1].variance.percentage);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold">Emission Factor Source Comparator</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Side-by-side comparison of emission factors from EPA, DEFRA, and GHG
            Protocol. Built as a learning artifact — not a product.
          </p>
          {/* View mode toggle */}
          {hasCountryData && !selected && (
            <div className="mt-4 flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
              <button
                onClick={() => setViewMode("sources")}
                className={`px-4 py-1.5 text-sm rounded-md transition-all ${viewMode === "sources" ? "bg-white shadow font-medium" : "text-gray-500 hover:text-gray-700"}`}
              >
                By Source
              </button>
              <button
                onClick={() => setViewMode("countries")}
                className={`px-4 py-1.5 text-sm rounded-md transition-all ${viewMode === "countries" ? "bg-white shadow font-medium" : "text-gray-500 hover:text-gray-700"}`}
              >
                By Country
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* COUNTRY VIEW */}
        {viewMode === "countries" && !selected && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-1">
                Country Comparison ({countryCompList.length} activities)
              </h2>
              <p className="text-sm text-gray-500">
                Same activity, different countries. Top 5 emitters: US, China, India, Germany, Russia.
                Scope narrowed to 4 activities where country-level public data exists.
              </p>
            </div>

            {/* Country activity selector */}
            <div className="grid gap-3 mb-8">
              {countryCompList.map(([id, comp]) => (
                <button
                  key={id}
                  onClick={() => { setSelected(id); setViewMode("countries"); }}
                  className="text-left border border-gray-200 rounded-lg p-4 bg-white hover:border-emerald-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{comp.activity_name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {comp.countries.length} countries &middot;{" "}
                        {comp.variance.highest_country} is {comp.variance.ratio}x {comp.variance.lowest_country} &middot;{" "}
                        {comp.normalized_unit}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <VarianceBadge
                        level={comp.variance.level}
                        pct={comp.variance.percentage}
                      />
                      <span className="text-gray-300">&rarr;</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Scope assumptions callout */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <div className="font-semibold mb-1">Scope Assumptions</div>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Countries:</strong> US, China, India, Germany (EU proxy), Russia — top 5 emitters</li>
                <li><strong>Activities:</strong> Narrowed to 4 (electricity, natural gas, passenger car, bus) where country-level public data exists</li>
                <li><strong>Not covered:</strong> Air travel (inherently global), hotels/materials/freight (data paywalled or unavailable)</li>
                <li><strong>Sources:</strong> Ember Climate (electricity), IPCC defaults (natural gas), ICCT/UBA/EPA (transport)</li>
                <li>Factors marked <span className="font-medium">Stale</span> use data 2+ years old. Russia data is especially limited post-2019.</li>
              </ul>
            </div>
          </>
        )}

        {/* SOURCE VIEW - Activity selector */}
        {viewMode === "sources" && !selected && (
          <>
            <h2 className="text-lg font-semibold mb-4">
              Select an activity to compare ({multiSource.length} with multiple sources)
            </h2>

            {/* Multi-source activities */}
            <div className="grid gap-3 mb-8">
              {multiSource.map(([id, comp]) => (
                <button
                  key={id}
                  onClick={() => { setSelected(id); setViewMode("sources"); }}
                  className="text-left border border-gray-200 rounded-lg p-4 bg-white hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{comp.activity_name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {comp.sources.length} sources &middot;{" "}
                        {SCOPE_LABELS[comp.scope]} &middot;{" "}
                        {comp.normalized_unit}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <VarianceBadge
                        level={comp.variance.level}
                        pct={comp.variance.percentage}
                      />
                      <span className="text-gray-300">&rarr;</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Single-source toggle */}
            <button
              onClick={() => setShowSingleSource(!showSingleSource)}
              className="text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              {showSingleSource ? "Hide" : "Show"} {singleSource.length}{" "}
              single-source activities
            </button>

            {showSingleSource && (
              <div className="grid gap-3">
                {singleSource.map(([id, comp]) => (
                  <button
                    key={id}
                    onClick={() => { setSelected(id); setViewMode("sources"); }}
                    className="text-left border border-gray-200 rounded-lg p-3 bg-white hover:border-blue-300 transition-all opacity-70"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">
                          {comp.activity_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {comp.sources[0]?.source_name.replace("UK Government GHG Conversion Factors", "DEFRA").replace("GHG Protocol Cross-Sector Emission Factors", "GHG Protocol")} only
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">No comparison available</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Detail view */}
        {selected && (
          <>
            <button
              onClick={() => setSelected(null)}
              className="text-sm text-blue-600 hover:underline mb-6 inline-block"
            >
              &larr; Back to all activities
            </button>

            {/* Show country comparison if in country mode and data exists */}
            {viewMode === "countries" && selectedCountryComp && (
              <CountryComparisonView comp={selectedCountryComp} />
            )}

            {/* Show source comparison */}
            {viewMode === "sources" && selectedComp && (
              <ComparisonView comp={selectedComp} />
            )}

            {/* Cross-link: if viewing sources, offer country view and vice versa */}
            {viewMode === "sources" && countryComparisons[selected] && (
              <button
                onClick={() => setViewMode("countries")}
                className="text-sm text-emerald-600 hover:underline mt-4 inline-block"
              >
                View this activity across countries &rarr;
              </button>
            )}
            {viewMode === "countries" && selectedComp && (
              <button
                onClick={() => setViewMode("sources")}
                className="text-sm text-blue-600 hover:underline mt-4 inline-block"
              >
                View source-by-source comparison &rarr;
              </button>
            )}
          </>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200 text-xs text-gray-400">
          <p>
            Data sourced from EPA GHG Emission Factors Hub (Jan 2025), UK
            DEFRA/DESNZ Conversion Factors (Jun 2025), GHG Protocol
            Cross-Sector Tools V2.0 (Mar 2024), Ember Global Electricity
            Review (2025), IPCC 2006 Guidelines, ICCT, and UBA TREMOD.
            All factors normalized to kg CO2e per common unit.
            This is a learning artifact, not a production tool.
          </p>
        </footer>
      </main>
    </div>
  );
}
