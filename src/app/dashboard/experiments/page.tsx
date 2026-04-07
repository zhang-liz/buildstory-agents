import { supabase } from '@/lib/server/database';

export const dynamic = 'force-dynamic';

interface Experiment {
  id: string;
  story_id: string;
  section_key: string;
  persona: string;
  control_variant_hash: string;
  baseline_conversion_rate: number;
  best_conversion_rate: number;
  lift_pct: number;
  variants_tested: number;
  status: string;
  source: string;
  started_at: string;
  concluded_at: string | null;
}

async function getExperiments(): Promise<Experiment[]> {
  const { data, error } = await supabase
    .from('experiments')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(100);

  if (error) return [];
  return data ?? [];
}

async function getAggregateStats() {
  const { data: experiments } = await supabase
    .from('experiments')
    .select('source, status, lift_pct, variants_tested');

  if (!experiments || experiments.length === 0) {
    return {
      totalExperiments: 0,
      automated: 0,
      manual: 0,
      avgLift: 0,
      reductionPct: 0,
      totalVariants: 0,
    };
  }

  const automated = experiments.filter((e) => e.source === 'automated').length;
  const manual = experiments.filter((e) => e.source === 'manual').length;
  const concluded = experiments.filter((e) => e.status === 'concluded');
  const avgLift =
    concluded.length > 0
      ? concluded.reduce((sum, e) => sum + Number(e.lift_pct || 0), 0) / concluded.length
      : 0;
  const totalVariants = experiments.reduce((sum, e) => sum + (e.variants_tested || 0), 0);
  const reductionPct = automated + manual > 0 ? (automated / (automated + manual)) * 100 : 0;

  return {
    totalExperiments: experiments.length,
    automated,
    manual,
    avgLift,
    reductionPct,
    totalVariants,
  };
}

export default async function ExperimentsDashboard() {
  const [experiments, stats] = await Promise.all([getExperiments(), getAggregateStats()]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-2">Experiments Dashboard</h1>
      <p className="text-gray-400 mb-8">
        Multi-armed bandit experiment tracking and performance metrics
      </p>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        <StatCard label="Total Experiments" value={stats.totalExperiments} />
        <StatCard label="Automated" value={stats.automated} accent="emerald" />
        <StatCard label="Manual" value={stats.manual} accent="amber" />
        <StatCard label="Avg Lift" value={`${stats.avgLift.toFixed(1)}%`} accent="cyan" />
        <StatCard
          label="Automation Rate"
          value={`${stats.reductionPct.toFixed(0)}%`}
          accent="violet"
        />
        <StatCard label="Total Variants" value={stats.totalVariants} accent="rose" />
      </div>

      {/* Experiments Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Recent Experiments</h2>
        </div>
        {experiments.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No experiments recorded yet. Run the pipeline to create experiments.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Section</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Persona</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Baseline</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Best</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Lift</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Variants</th>
                  <th className="text-center px-4 py-3 text-gray-400 font-medium">Source</th>
                  <th className="text-center px-4 py-3 text-gray-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {experiments.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-xs">{exp.section_key}</td>
                    <td className="px-4 py-3">{exp.persona}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {(Number(exp.baseline_conversion_rate) * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {(Number(exp.best_conversion_rate) * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span
                        className={
                          Number(exp.lift_pct) > 0
                            ? 'text-emerald-400'
                            : Number(exp.lift_pct) < 0
                              ? 'text-red-400'
                              : 'text-gray-400'
                        }
                      >
                        {Number(exp.lift_pct) > 0 ? '+' : ''}
                        {Number(exp.lift_pct).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{exp.variants_tested}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          exp.source === 'automated'
                            ? 'bg-emerald-900/50 text-emerald-300'
                            : 'bg-amber-900/50 text-amber-300'
                        }`}
                      >
                        {exp.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          exp.status === 'running'
                            ? 'bg-blue-900/50 text-blue-300'
                            : exp.status === 'concluded'
                              ? 'bg-gray-700/50 text-gray-300'
                              : 'bg-red-900/50 text-red-300'
                        }`}
                      >
                        {exp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(exp.started_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
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
    amber: 'text-amber-400',
    cyan: 'text-cyan-400',
    violet: 'text-violet-400',
    rose: 'text-rose-400',
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
