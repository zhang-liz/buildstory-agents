'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface AnalyticsSnapshot {
  timestamp: string;
  storyId: string;
  totalEvents: number;
  uniquePersonas: string[];
  eventTypes: Record<string, number>;
  sectionEvents: Record<string, number>;
  conversionFunnel: {
    steps: Array<{ name: string; count: number; conversionRate?: number }>;
    insights: string[];
  };
  error?: string;
}

export default function StoryDashboard() {
  const params = useParams();
  const storyId = params.storyId as string;

  const [data, setData] = useState<AnalyticsSnapshot | null>(null);
  const [history, setHistory] = useState<AnalyticsSnapshot[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!storyId) return;

    const eventSource = new EventSource(`/api/analytics/stream?storyId=${storyId}`);

    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);

    eventSource.onmessage = (event) => {
      try {
        const snapshot: AnalyticsSnapshot = JSON.parse(event.data);
        if (snapshot.error) return;
        setData(snapshot);
        setHistory((prev) => [...prev.slice(-59), snapshot]);
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, [storyId]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Live Analytics</h1>
          <p className="text-gray-400 font-mono text-sm mt-1">{storyId}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}
          />
          <span className="text-sm text-gray-400">{connected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      {!data ? (
        <div className="text-center text-gray-500 py-20">
          {connected ? 'Waiting for data...' : 'Connecting...'}
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <MetricCard label="Total Events (5m)" value={data.totalEvents} />
            <MetricCard label="Personas Active" value={data.uniquePersonas.length} accent="violet" />
            <MetricCard
              label="CTA Clicks"
              value={data.eventTypes.ctaClick ?? 0}
              accent="emerald"
            />
            <MetricCard
              label="Page Views"
              value={data.eventTypes.view ?? 0}
              accent="cyan"
            />
          </div>

          {/* Conversion Funnel */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Conversion Funnel</h2>
            <div className="space-y-3">
              {data.conversionFunnel.steps.map((step, i) => (
                <div key={step.name} className="flex items-center gap-4">
                  <span className="w-32 text-sm text-gray-400">{step.name}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${
                          data.conversionFunnel.steps[0].count > 0
                            ? (step.count / data.conversionFunnel.steps[0].count) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-mono">{step.count}</span>
                  {step.conversionRate !== undefined && i > 0 && (
                    <span className="w-16 text-right text-xs text-gray-500">
                      {step.conversionRate.toFixed(1)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
            {data.conversionFunnel.insights.length > 0 && (
              <div className="mt-4 space-y-1">
                {data.conversionFunnel.insights.map((insight, i) => (
                  <p key={i} className="text-sm text-emerald-400">
                    {insight}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Event Breakdown & Section Events */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-semibold mb-4">Events by Type</h2>
              <div className="space-y-2">
                {Object.entries(data.eventTypes)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">{type}</span>
                      <span className="text-sm font-mono tabular-nums text-gray-400">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h2 className="text-lg font-semibold mb-4">Events by Section</h2>
              <div className="space-y-2">
                {Object.entries(data.sectionEvents)
                  .sort(([, a], [, b]) => b - a)
                  .map(([section, count]) => (
                    <div key={section} className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">{section}</span>
                      <span className="text-sm font-mono tabular-nums text-gray-400">{count}</span>
                    </div>
                  ))}
                {Object.keys(data.sectionEvents).length === 0 && (
                  <p className="text-sm text-gray-500">No section events yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Personas */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Active Personas</h2>
            <div className="flex flex-wrap gap-2">
              {data.uniquePersonas.map((persona) => (
                <span
                  key={persona}
                  className="px-3 py-1.5 bg-gray-800 rounded-full text-sm text-gray-300"
                >
                  {persona}
                </span>
              ))}
              {data.uniquePersonas.length === 0 && (
                <p className="text-sm text-gray-500">No active personas</p>
              )}
            </div>
          </div>

          {/* History sparkline (simple text-based) */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-4">Event Volume (last {history.length} updates)</h2>
            <div className="flex items-end gap-0.5 h-16">
              {history.map((h, i) => {
                const maxEvents = Math.max(...history.map((s) => s.totalEvents), 1);
                const height = (h.totalEvents / maxEvents) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-cyan-500/60 rounded-t transition-all duration-300"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${h.totalEvents} events at ${h.timestamp}`}
                  />
                );
              })}
            </div>
          </div>

          <p className="text-xs text-gray-600 mt-4">
            Last updated: {new Date(data.timestamp).toLocaleTimeString()}
          </p>
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent = 'gray',
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  const colorMap: Record<string, string> = {
    gray: 'text-white',
    emerald: 'text-emerald-400',
    cyan: 'text-cyan-400',
    violet: 'text-violet-400',
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${colorMap[accent] ?? 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}
