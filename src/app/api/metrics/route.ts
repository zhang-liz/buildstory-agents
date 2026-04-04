import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { metrics } = await import('@/lib/server/metrics');
  const data = metrics.getMetrics();

  // Build Prometheus-compatible text output
  const lines: string[] = [];

  for (const metric of data.metrics) {
    lines.push(`# HELP ${metric.name} ${metric.help}`);
    lines.push(`# TYPE ${metric.name} ${metric.type}`);

    const values = metric.values as Record<string, number>;
    for (const [labels, value] of Object.entries(values)) {
      const labelStr = labels ? `{${labels}}` : '';
      lines.push(`${metric.name}${labelStr} ${value}`);
    }
  }

  // Custom agent metrics as comments (informational)
  const customEntries = Object.entries(data.customMetrics);
  if (customEntries.length > 0) {
    lines.push('');
    lines.push('# Custom agent operation metrics (last 1000)');
    const recentEntries = customEntries.slice(-1000);
    for (const [key, entry] of recentEntries) {
      const record = entry as Record<string, unknown>;
      if (record.type === 'latency' && record.agent_type && record.operation) {
        lines.push(
          `agent_latency_ms{agent="${record.agent_type}",op="${record.operation}"} ${record.value}`
        );
      }
    }
  }

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
