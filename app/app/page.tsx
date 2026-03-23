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

const comparisons = data as Record<string, Comparison>;

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
        <div className="text-xs text-gray-500">kg CO₂e / {source.unit_denominator}</div>
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

export default function Home() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showSingleSource, setShowSingleSource] = useState(false);

  const selectedComp = selected ? comparisons[selected] : null;

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
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Activity selector */}
        {!selected && (
          <>
            <h2 className="text-lg font-semibold mb-4">
              Select an activity to compare ({multiSource.length} with multiple sources)
            </h2>

            {/* Multi-source activities */}
            <div className="grid gap-3 mb-8">
              {multiSource.map(([id, comp]) => (
                <button
                  key={id}
                  onClick={() => setSelected(id)}
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
                    onClick={() => setSelected(id)}
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

        {/* Comparison detail view */}
        {selectedComp && (
          <>
            <button
              onClick={() => setSelected(null)}
              className="text-sm text-blue-600 hover:underline mb-6 inline-block"
            >
              &larr; Back to all activities
            </button>
            <ComparisonView comp={selectedComp} />
          </>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200 text-xs text-gray-400">
          <p>
            Data sourced from EPA GHG Emission Factors Hub (Jan 2025), UK
            DEFRA/DESNZ Conversion Factors (Jun 2025), and GHG Protocol
            Cross-Sector Tools V2.0 (Mar 2024). All factors normalized to kg
            CO₂e per common unit. This is a learning artifact, not a production
            tool.
          </p>
        </footer>
      </main>
    </div>
  );
}
