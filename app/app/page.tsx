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

type Uncertainty = {
  low: number;
  high: number;
  spread_pct: number;
  method: string;
  notes: string;
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
  uncertainty?: Uncertainty | null;
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

type TrendData = {
  country_code: string;
  country_name: string;
  unit: string;
  source: string;
  years: number[];
  values: number[];
  yoy_changes_pct: number[];
  total_change_pct: number;
  avg_annual_change_pct: number;
  direction: string;
  period: string;
  notes: string;
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
  key_insight: string;
  trends?: Record<string, TrendData>;
};

type SubregionEntry = {
  subregion_code: string;
  subregion_name: string;
  value_kg_co2e: number;
  unit_denominator: string;
  original_value: number;
  original_unit: string;
};

type SubregionComparison = {
  activity_id: string;
  activity_name: string;
  category: string;
  normalized_unit: string;
  source: string;
  subregions: SubregionEntry[];
  us_average: number | null;
  variance: {
    percentage: number;
    level: string;
    min_value: number;
    max_value: number;
    highest_subregion: string;
    lowest_subregion: string;
    ratio: number;
  };
  key_insight: string;
};

// Handle both old flat format and new nested format
const rawData = data as Record<string, unknown>;
const hasNestedFormat = "source_comparisons" in rawData;
const comparisons = (hasNestedFormat ? rawData.source_comparisons : rawData) as Record<string, Comparison>;
const countryComparisons = (hasNestedFormat ? rawData.country_comparisons : {}) as Record<string, CountryComparison>;
const subregionComparison = (rawData.subregion_comparison || null) as SubregionComparison | null;
const sourceGraph = (rawData.source_graph || null) as SourceGraph | null;

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

function UncertaintyBar({ uncertainty }: { uncertainty: Uncertainty }) {
  const methodLabel = uncertainty.method === "cross_source_spread" ? "Cross-source range" : "IPCC default estimate";
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Uncertainty Range</div>
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{methodLabel}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-gray-600 w-16 text-right">{uncertainty.low.toFixed(4)}</span>
        <div className="flex-1 h-3 bg-gray-200 rounded-full relative">
          <div
            className="absolute h-full bg-blue-200 rounded-full"
            style={{ left: "0%", width: "100%" }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-5 bg-blue-600 rounded-sm"
            style={{
              left: uncertainty.high > uncertainty.low
                ? `${((((uncertainty.low + uncertainty.high) / 2) - uncertainty.low) / (uncertainty.high - uncertainty.low)) * 100}%`
                : "50%",
            }}
            title="Point estimate (midpoint)"
          />
        </div>
        <span className="font-mono text-xs text-gray-600 w-16">{uncertainty.high.toFixed(4)}</span>
      </div>
      <p className="text-xs text-gray-400 mt-1.5">{uncertainty.notes}</p>
    </div>
  );
}

function TrendSparkline({ trend }: { trend: TrendData }) {
  const values = trend.values;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 200;
  const h = 48;
  const padding = 4;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (w - 2 * padding);
    const y = h - padding - ((v - min) / range) * (h - 2 * padding);
    return `${x},${y}`;
  }).join(" ");

  const dirColor = trend.direction === "declining" ? "text-green-600" : trend.direction === "rising" ? "text-red-600" : "text-gray-500";
  const strokeColor = trend.direction === "declining" ? "#16a34a" : trend.direction === "rising" ? "#dc2626" : "#6b7280";

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{COUNTRY_FLAGS[trend.country_code] || ""}</span>
          <span className="text-sm font-medium">{trend.country_name}</span>
        </div>
        <span className={`text-xs font-medium ${dirColor}`}>
          {trend.total_change_pct > 0 ? "+" : ""}{trend.total_change_pct}%
          <span className="text-gray-400 ml-1">({trend.period})</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <svg viewBox={`0 0 ${w} ${h}`} className="flex-1 h-12" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Start and end dots */}
          {values.length >= 2 && (
            <>
              <circle cx={padding} cy={h - padding - ((values[0] - min) / range) * (h - 2 * padding)} r="3" fill={strokeColor} />
              <circle cx={w - padding} cy={h - padding - ((values[values.length - 1] - min) / range) * (h - 2 * padding)} r="3" fill={strokeColor} />
            </>
          )}
        </svg>
        <div className="text-right shrink-0">
          <div className="text-xs text-gray-400">{values[0]}</div>
          <div className="font-mono text-sm font-bold">{values[values.length - 1]}</div>
          <div className="text-xs text-gray-400">g/kWh</div>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-1">{trend.notes}</p>
    </div>
  );
}

function SourceCard({ source, maxVal, uncertainty }: { source: Source; maxVal: number; uncertainty?: Uncertainty | null }) {
  const barWidth = maxVal > 0 ? (source.value_kg_co2e / maxVal) * 100 : 0;
  const shortName = source.source_name.replace("UK Government GHG Conversion Factors", "DEFRA/DESNZ").replace("GHG Protocol Cross-Sector Emission Factors", "GHG Protocol");

  // Compute uncertainty bar range relative to maxVal for overlay
  let uncLowPct = 0;
  let uncWidthPct = 0;
  if (uncertainty && maxVal > 0) {
    uncLowPct = (uncertainty.low / maxVal) * 100;
    uncWidthPct = ((uncertainty.high - uncertainty.low) / maxVal) * 100;
  }

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

      {/* Bar visualization with uncertainty overlay */}
      <div className="mt-2 h-3 bg-gray-100 rounded-full overflow-hidden relative">
        {uncertainty && (
          <div
            className="absolute h-full bg-blue-100 rounded-full"
            style={{ left: `${uncLowPct}%`, width: `${uncWidthPct}%` }}
          />
        )}
        <div
          className="h-full bg-blue-500 rounded-full transition-all relative z-10"
          style={{ width: `${barWidth}%` }}
        />
      </div>
      {uncertainty && (
        <div className="text-xs text-gray-400 mt-0.5">
          Range: {uncertainty.low.toFixed(4)} &mdash; {uncertainty.high.toFixed(4)}
        </div>
      )}

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
  const ei = (comp as Comparison & { effective_independence?: EffectiveIndependence }).effective_independence;
  const df = (comp as Comparison & { decision_framework?: DecisionFramework }).decision_framework;

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h2 className="text-xl font-bold">{comp.activity_name}</h2>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          {SCOPE_LABELS[comp.scope] || comp.scope}
        </span>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          {CATEGORY_LABELS[comp.category] || comp.category}
        </span>
        <VarianceBadge level={comp.variance.level} pct={comp.variance.percentage} />
        {ei && <IndependenceBadge ei={ei} />}
      </div>

      <div className="text-sm text-gray-600 mb-4">
        Normalized unit: <span className="font-mono">{comp.normalized_unit}</span>
      </div>

      {/* Source cards grid */}
      <div className={`grid gap-4 ${comp.sources.length === 1 ? "grid-cols-1 max-w-md" : comp.sources.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
        {comp.sources.map((source, i) => (
          <SourceCard key={i} source={source} maxVal={maxVal} uncertainty={comp.uncertainty} />
        ))}
      </div>

      {/* Uncertainty Range */}
      {comp.uncertainty && <UncertaintyBar uncertainty={comp.uncertainty} />}

      {/* Key Insight Row */}
      <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Key Insight
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{comp.key_insight}</p>
      </div>

      {/* Decision Framework */}
      {df && <DecisionFrameworkPanel framework={df} />}
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
  const trends = comp.trends;

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

      {/* Temporal Trends */}
      {trends && Object.keys(trends).length > 0 && (
        <div className="mt-6">
          <h3 className="text-base font-semibold mb-3">Grid Intensity Trends (2015&ndash;2024)</h3>
          <p className="text-xs text-gray-500 mb-3">
            Source: Ember Global Electricity Review. Generation-based CO2 intensity.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sorted.map((country) => {
              const trend = trends[country.country_code];
              if (!trend) return null;
              return <TrendSparkline key={country.country_code} trend={trend} />;
            })}
          </div>
          <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Trend Insight
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Germany has cut grid intensity by 34% since 2015, the fastest among the top 5 emitters.
              China&apos;s absolute renewable capacity is the world&apos;s largest, but rising demand keeps
              intensity declining slowly (~10%). Russia is the only country where grid intensity is rising.
              These trends mean that Scope 2 emission factors have a shelf life &mdash; using a factor
              from even 2-3 years ago can materially misstate a company&apos;s footprint.
            </p>
          </div>
        </div>
      )}

      {/* Key Insight */}
      {comp.key_insight && (
        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Key Insight
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{comp.key_insight}</p>
        </div>
      )}

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

function SubregionView({ comp }: { comp: SubregionComparison }) {
  const maxVal = Math.max(...comp.subregions.map((s) => s.value_kg_co2e));

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold">{comp.activity_name}</h2>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          {CATEGORY_LABELS[comp.category] || comp.category}
        </span>
        <VarianceBadge level={comp.variance.level} pct={comp.variance.percentage} />
      </div>

      <div className="text-sm text-gray-600 mb-2">
        {comp.normalized_unit} &middot; {comp.subregions.length} subregions &middot;{" "}
        {comp.variance.ratio}x spread
      </div>
      <div className="text-xs text-gray-400 mb-4">
        Source: {comp.source}
      </div>

      {/* Subregion bars */}
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        {comp.subregions.map((sr) => {
          const barWidth = maxVal > 0 ? (sr.value_kg_co2e / maxVal) * 100 : 0;
          const isAboveAvg = comp.us_average && sr.value_kg_co2e > comp.us_average;
          const avgPct = comp.us_average && maxVal > 0 ? (comp.us_average / maxVal) * 100 : 0;

          return (
            <div key={sr.subregion_code} className="flex items-center gap-3 py-1.5">
              <div className="w-40 shrink-0">
                <span className="text-xs font-mono font-medium">{sr.subregion_code}</span>
                <span className="text-xs text-gray-400 ml-1.5 hidden sm:inline">{sr.subregion_name}</span>
              </div>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden relative">
                  {/* US average reference line */}
                  {comp.us_average && (
                    <div
                      className="absolute top-0 h-full w-px bg-gray-400 z-10"
                      style={{ left: `${avgPct}%` }}
                      title={`US Average: ${comp.us_average.toFixed(4)}`}
                    />
                  )}
                  <div
                    className={`h-full rounded transition-all ${isAboveAvg ? "bg-orange-400" : "bg-teal-500"}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="font-mono text-xs w-16 text-right tabular-nums">
                  {sr.value_kg_co2e.toFixed(4)}
                </span>
              </div>
            </div>
          );
        })}
        {comp.us_average && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
            <div className="w-3 h-px bg-gray-400" /> US Average: {comp.us_average.toFixed(4)} kg CO2e/kWh
            &middot; <span className="text-teal-600">Below avg</span> / <span className="text-orange-500">Above avg</span>
          </div>
        )}
      </div>

      {/* Key Insight */}
      <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Key Insight
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{comp.key_insight}</p>
      </div>
    </div>
  );
}

type SourceGraphNode = {
  id: string;
  label: string;
  type: "primary" | "aggregator";
  publisher: string;
  edition: string;
  color: string;
};

type SourceGraphEdge = {
  from: string;
  to: string;
  activities: string[];
  label: string;
  count: number;
};

type SourceGraph = {
  nodes: SourceGraphNode[];
  edges: SourceGraphEdge[];
  summary: {
    total_activities: number;
    ghg_protocol_independent: number;
    ghg_protocol_compiled: number;
    narrative: string;
  };
};

type EffectiveIndependence = {
  listed_sources: number;
  effective_sources: number;
  independent_ids: string[];
  note: string;
};

type FrameworkRecommendation = {
  recommended_source: string | null;
  rationale: string;
};

type DecisionFramework = {
  csrd_eu: FrameworkRecommendation;
  sec_cdp_us: FrameworkRecommendation;
  global: FrameworkRecommendation;
  defensibility_note: string;
};

type ViewMode = "sources" | "countries" | "subnational" | "independence";

// ── Source Independence Graph ───────────────────────────────────

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  epa: { x: 120, y: 80 },
  defra: { x: 480, y: 80 },
  ipcc: { x: 300, y: 60 },
  ghg_protocol: { x: 300, y: 220 },
  ember: { x: 540, y: 200 },
  icct: { x: 60, y: 200 },
};

function ArrowMarker() {
  return (
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#7c3aed" opacity="0.7" />
      </marker>
    </defs>
  );
}

function GraphEdge({ edge, nodes }: { edge: SourceGraphEdge; nodes: SourceGraphNode[] }) {
  const fromNode = nodes.find((n) => n.id === edge.from);
  const toNode = nodes.find((n) => n.id === edge.to);
  if (!fromNode || !toNode) return null;

  const from = NODE_POSITIONS[edge.from];
  const to = NODE_POSITIONS[edge.to];
  if (!from || !to) return null;

  // Offset arrow start/end to not overlap circles
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const r = 28;
  const startX = from.x + (dx / dist) * r;
  const startY = from.y + (dy / dist) * r;
  const endX = to.x - (dx / dist) * (r + 10);
  const endY = to.y - (dy / dist) * (r + 10);

  // Control point for curve
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const perpX = -(endY - startY) * 0.15;
  const perpY = (endX - startX) * 0.15;

  const thickness = Math.max(1.5, Math.min(4, edge.count * 0.8));

  return (
    <g>
      <path
        d={`M ${startX} ${startY} Q ${midX + perpX} ${midY + perpY} ${endX} ${endY}`}
        fill="none"
        stroke="#7c3aed"
        strokeWidth={thickness}
        opacity={0.5}
        markerEnd="url(#arrowhead)"
      />
      <text
        x={midX + perpX * 0.6}
        y={midY + perpY * 0.6 - 6}
        textAnchor="middle"
        className="text-[9px] fill-purple-500 font-medium"
      >
        {edge.count} {edge.count === 1 ? "activity" : "activities"}
      </text>
    </g>
  );
}

function GraphNode({ node }: { node: SourceGraphNode }) {
  const pos = NODE_POSITIONS[node.id];
  if (!pos) return null;

  const isAggregator = node.type === "aggregator";
  const r = isAggregator ? 28 : 24;

  return (
    <g>
      <circle
        cx={pos.x}
        cy={pos.y}
        r={r}
        fill={isAggregator ? "#f3e8ff" : "#f0fdf4"}
        stroke={node.color}
        strokeWidth={isAggregator ? 2.5 : 1.5}
        strokeDasharray={isAggregator ? "4 2" : "none"}
      />
      <text
        x={pos.x}
        y={pos.y + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-[10px] font-bold"
        fill={node.color}
      >
        {node.label.length > 12 ? node.id.toUpperCase() : node.label}
      </text>
      <text
        x={pos.x}
        y={pos.y + r + 14}
        textAnchor="middle"
        className="text-[9px] fill-gray-400"
      >
        {node.label}
      </text>
      <text
        x={pos.x}
        y={pos.y + r + 26}
        textAnchor="middle"
        className="text-[8px] fill-gray-300"
      >
        {isAggregator ? "Aggregator" : "Primary source"}
      </text>
    </g>
  );
}

function SourceIndependenceView({
  graph,
  comparisons,
}: {
  graph: SourceGraph;
  comparisons: Record<string, Comparison>;
}) {
  const multiSourceComps = Object.entries(comparisons)
    .filter(([, c]) => c.sources.length >= 2)
    .sort((a, b) => {
      const aEff = (a[1] as Comparison & { effective_independence?: EffectiveIndependence }).effective_independence;
      const bEff = (b[1] as Comparison & { effective_independence?: EffectiveIndependence }).effective_independence;
      const aRatio = aEff ? aEff.effective_sources / aEff.listed_sources : 1;
      const bRatio = bEff ? bEff.effective_sources / bEff.listed_sources : 1;
      return aRatio - bRatio; // Worst independence first
    });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Source Independence Analysis</h2>
      <p className="text-sm text-gray-600 mb-6 max-w-2xl">
        How independent are emission factor sources from each other? When GHG Protocol cites DEFRA,
        and DEFRA cites IPCC, apparent &ldquo;multi-source agreement&rdquo; may be circular citation.
        This view maps the actual provenance relationships.
      </p>

      {/* SVG Graph */}
      <div className="border border-gray-200 rounded-lg bg-white p-4 mb-6">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Citation Graph</div>
        <svg viewBox="0 0 600 280" className="w-full max-w-2xl mx-auto" style={{ height: 280 }}>
          <ArrowMarker />
          {graph.edges.map((edge, i) => (
            <GraphEdge key={i} edge={edge} nodes={graph.nodes} />
          ))}
          {graph.nodes.map((node) => (
            <GraphNode key={node.id} node={node} />
          ))}
        </svg>
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-green-50 border border-green-600" />
            Primary source
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-purple-50 border-2 border-dashed border-purple-600" />
            Aggregator (compiles from others)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 bg-purple-400" />
            Citation link
          </span>
        </div>
      </div>

      {/* Key finding */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Key Finding</div>
        <p className="text-sm text-purple-900 leading-relaxed">{graph.summary.narrative}</p>
        <div className="mt-2 flex gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-700">{graph.summary.ghg_protocol_independent}</div>
            <div className="text-xs text-purple-500">independent GHG Protocol factors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-700">{graph.summary.ghg_protocol_compiled}</div>
            <div className="text-xs text-purple-500">compiled from other sources</div>
          </div>
        </div>
      </div>

      {/* Per-activity independence list */}
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Per-Activity Independence ({multiSourceComps.length} multi-source activities)
      </div>
      <div className="grid gap-2">
        {multiSourceComps.map(([id, comp]) => {
          const ei = (comp as Comparison & { effective_independence?: EffectiveIndependence }).effective_independence;
          if (!ei) return null;
          const ratio = ei.effective_sources / ei.listed_sources;
          const barColor = ratio >= 0.8 ? "bg-green-500" : ratio >= 0.5 ? "bg-yellow-500" : "bg-red-400";
          const bgColor = ratio >= 0.8 ? "border-green-200" : ratio >= 0.5 ? "border-yellow-200" : "border-red-200";

          return (
            <div key={id} className={`border ${bgColor} rounded-lg p-3 bg-white`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{comp.activity_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{ei.note}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <div className="text-right">
                    <div className="text-sm font-bold tabular-nums">
                      {ei.listed_sources} &rarr; {ei.effective_sources}
                    </div>
                    <div className="text-xs text-gray-400">listed &rarr; effective</div>
                  </div>
                  <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Independence Badge (for source view) ────────────────────────

function IndependenceBadge({ ei }: { ei: EffectiveIndependence }) {
  if (ei.listed_sources <= 1) return null;
  const ratio = ei.effective_sources / ei.listed_sources;
  const color = ratio >= 0.8 ? "bg-green-100 text-green-700" : ratio >= 0.5 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`} title={ei.note}>
      {ei.effective_sources} effective {ei.effective_sources === 1 ? "source" : "sources"}
    </span>
  );
}

// ── Decision Framework Panel ────────────────────────────────────

const FRAMEWORK_LABELS: Record<string, { name: string; abbr: string; color: string }> = {
  csrd_eu: { name: "CSRD / EU Reporting", abbr: "EU", color: "blue" },
  sec_cdp_us: { name: "SEC / CDP / US Reporting", abbr: "US", color: "indigo" },
  global: { name: "Global / Multi-jurisdiction", abbr: "Global", color: "gray" },
};

function DecisionFrameworkPanel({ framework }: { framework: DecisionFramework }) {
  const [open, setOpen] = useState(false);
  const entries = [
    { key: "csrd_eu", rec: framework.csrd_eu },
    { key: "sec_cdp_us", rec: framework.sec_cdp_us },
    { key: "global", rec: framework.global },
  ];

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-purple-700 hover:text-purple-900 font-medium"
      >
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        Which source should I use?
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          {entries.map(({ key, rec }) => {
            const label = FRAMEWORK_LABELS[key];
            const hasRec = rec.recommended_source !== null;
            return (
              <div
                key={key}
                className={`border rounded-lg p-3 ${hasRec ? "border-purple-200 bg-purple-50" : "border-gray-200 bg-gray-50"}`}
              >
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {label.name}
                </div>
                {hasRec ? (
                  <div className="text-sm font-bold text-purple-800 mb-1">{rec.recommended_source}</div>
                ) : (
                  <div className="text-sm font-medium text-gray-500 mb-1 italic">No single recommendation</div>
                )}
                <p className="text-xs text-gray-600 leading-relaxed">{rec.rationale}</p>
              </div>
            );
          })}
          {framework.defensibility_note && (
            <div className="md:col-span-3 text-xs text-gray-400 border-t border-gray-200 pt-2 mt-1">
              <span className="font-medium text-gray-500">Defensibility:</span> {framework.defensibility_note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showSingleSource, setShowSingleSource] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("sources");

  const selectedComp = selected ? comparisons[selected] : null;
  const selectedCountryComp = selected ? countryComparisons[selected] : null;
  const hasCountryData = Object.keys(countryComparisons).length > 0;
  const hasSubregionData = subregionComparison !== null;
  const hasSourceGraph = sourceGraph !== null;

  const countryCompList = Object.entries(countryComparisons)
    .sort((a, b) => b[1].variance.percentage - a[1].variance.percentage);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold">Emission Factor Source Comparator</h1>
          <p className="text-gray-500 mt-1 text-sm">
            How much do emission factor databases actually agree with each other?
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Introduction — show only on list views */}
        {!selected && viewMode !== "subnational" && viewMode !== "independence" && (
          <div className="mb-10 max-w-3xl">
            <h2 className="text-lg font-semibold mb-3">The Problem</h2>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              Companies measuring carbon emissions rely on published emission factor databases to
              convert activity data (kWh consumed, km traveled) into CO2e. But these databases
              often disagree, sometimes by over 90% for the same activity. If your bus travel
              footprint can vary 2-7x depending on which database you pick, how much can you trust
              the final number?
            </p>

            <h2 className="text-lg font-semibold mb-3">What This Tool Does</h2>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              This comparator normalizes emission factors from three major public databases to a
              common unit (kg CO2e), then calculates variance and diagnoses <em>why</em> they differ.
              It surfaces whether disagreement comes from real physical differences like grid mix and fleet composition,
              methodological choices like radiative forcing or HHV vs LHV, or data provenance issues like circular sourcing
              and stale data.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Data Sources</div>
                <ul className="text-sm text-gray-700 space-y-1.5">
                  <li><span className="font-medium">EPA</span> GHG Emission Factors Hub (Jan 2025), US-focused</li>
                  <li><span className="font-medium">DEFRA/DESNZ</span> Conversion Factors (Jun 2025), UK-focused</li>
                  <li><span className="font-medium">GHG Protocol</span> Cross-Sector Tools V2.0 (Mar 2024), compiles from IPCC, EPA, DEFRA</li>
                  <li><span className="font-medium">Ember Climate</span> Global Electricity Review (2025), country-level grid intensity</li>
                  <li><span className="font-medium">ICCT, UBA, IPCC</span> for country-level transport factors</li>
                </ul>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Features</div>
                <ul className="text-sm text-gray-700 space-y-1.5">
                  <li><span className="font-medium">{Object.keys(comparisons).length} activities</span> compared across sources ({multiSource.length} with 2+ sources)</li>
                  <li><span className="font-medium">5 countries</span> compared for 4 key activities</li>
                  <li><span className="font-medium">27 US subregions</span> showing {subregionComparison?.variance.ratio}x internal variation</li>
                  <li><span className="font-medium">Uncertainty ranges</span> on every factor (cross-source or IPCC default)</li>
                  <li><span className="font-medium">10-year trends</span> for grid carbon intensity (2015&ndash;2024)</li>
                </ul>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-3">What We Learn</h2>
            <div className="text-sm text-gray-700 leading-relaxed space-y-2 mb-6">
              <p>
                <span className="font-medium">1. Geography dominates.</span>{" "}Most variance comes from comparing
                US factors to UK factors, not from methodology disagreement. A US bus factor (0.04 kg/pkm)
                and a UK one (0.10 kg/pkm) aren&apos;t wrong. They measure different fleets with different occupancy.
              </p>
              <p>
                <span className="font-medium">2. Sub-national variation is massive.</span>{" "}Within the US alone,
                eGRID subregions vary by {subregionComparison?.variance.ratio}x. Using the national average
                can over- or under-estimate Scope 2 emissions by 2-3x.
              </p>
              <p>
                <span className="font-medium">3. Source independence is an illusion.</span>{" "}GHG Protocol compiles from
                IPCC, DEFRA, and EPA. Apparent &quot;three-source agreement&quot; may actually be circular citation.
              </p>
              <p>
                <span className="font-medium">4. Factors have a shelf life.</span>{" "}Germany&apos;s grid intensity
                fell 34% from 2015&ndash;2024. Using a 3-year-old factor materially misstates the footprint.
              </p>
            </div>
          </div>
        )}

        {/* View mode toggle */}
        {!selected && (
          <div className="mb-8 flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setViewMode("sources")}
              className={`px-4 py-1.5 text-sm rounded-md transition-all ${viewMode === "sources" ? "bg-white shadow font-medium" : "text-gray-500 hover:text-gray-700"}`}
            >
              By Source
            </button>
            {hasCountryData && (
              <button
                onClick={() => setViewMode("countries")}
                className={`px-4 py-1.5 text-sm rounded-md transition-all ${viewMode === "countries" ? "bg-white shadow font-medium" : "text-gray-500 hover:text-gray-700"}`}
              >
                By Country
              </button>
            )}
            {hasSubregionData && (
              <button
                onClick={() => setViewMode("subnational")}
                className={`px-4 py-1.5 text-sm rounded-md transition-all ${viewMode === "subnational" ? "bg-white shadow font-medium" : "text-gray-500 hover:text-gray-700"}`}
              >
                Sub-national
              </button>
            )}
            {hasSourceGraph && (
              <button
                onClick={() => setViewMode("independence")}
                className={`px-4 py-1.5 text-sm rounded-md transition-all ${viewMode === "independence" ? "bg-white shadow font-medium" : "text-gray-500 hover:text-gray-700"}`}
              >
                Source Independence
              </button>
            )}
          </div>
        )}

        {/* SOURCE INDEPENDENCE VIEW */}
        {viewMode === "independence" && !selected && sourceGraph && (
          <SourceIndependenceView graph={sourceGraph} comparisons={comparisons} />
        )}

        {/* SUB-NATIONAL VIEW */}
        {viewMode === "subnational" && !selected && subregionComparison && (
          <SubregionView comp={subregionComparison} />
        )}

        {/* COUNTRY VIEW */}
        {viewMode === "countries" && !selected && (
          <>
            <h2 className="text-lg font-semibold mb-4">
              Same activity, different countries ({countryCompList.length} activities)
            </h2>

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
          </>
        )}

        {/* SOURCE VIEW - Activity selector */}
        {viewMode === "sources" && !selected && (
          <>
            <h2 className="text-lg font-semibold mb-4">
              Same activity, different databases ({multiSource.length} with multiple sources)
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
          <p className="mt-3">
            Questions, suggestions, or want to contribute?{" "}
            <a
              href="https://www.linkedin.com/in/vivfeng"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Reach out on LinkedIn
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
