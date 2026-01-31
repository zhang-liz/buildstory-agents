import 'server-only';

type MetricType = 'counter' | 'gauge' | 'histogram';

export interface MetricDefinition {
  name: string;
  help: string;
  type: MetricType;
  labelNames?: string[];
}

interface StoredMetric {
  name: string;
  help: string;
  type: MetricType;
  values: Map<string, number>;
  labelNames: string[];
  inc: (labels?: Record<string, string>, value?: number) => void;
  set: (labels: Record<string, string>, value: number) => void;
  get: (labels?: Record<string, string>) => number;
  reset: () => void;
}

class MetricsRegistry {
  private metrics: Map<string, StoredMetric> = new Map();
  private customMetrics: Map<string, Record<string, unknown>> = new Map();

  createMetric(metric: MetricDefinition) {
    if (this.metrics.has(metric.name)) {
      return this.metrics.get(metric.name);
    }

    const newMetric = {
      name: metric.name,
      help: metric.help,
      type: metric.type,
      values: new Map<string, number>(),
      labelNames: metric.labelNames || [],
      inc: (labels: Record<string, string> = {}, value = 1) => {
        const key = this.getLabelKey(labels);
        const current = newMetric.values.get(key) || 0;
        newMetric.values.set(key, current + value);
      },
      set: (labels: Record<string, string>, value: number) => {
        const key = this.getLabelKey(labels);
        newMetric.values.set(key, value);
      },
      get: (labels: Record<string, string> = {}) => {
        const key = this.getLabelKey(labels);
        return newMetric.values.get(key) || 0;
      },
      reset: () => {
        newMetric.values.clear();
      }
    };

    this.metrics.set(metric.name, newMetric);
    return newMetric;
  }

  recordMetric(name: string, data: Record<string, unknown>) {
    this.customMetrics.set(`${name}:${Date.now()}`, data);
  }

  private getLabelKey(labels: Record<string, string>): string {
    return Object.entries(labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
  }

  getMetrics() {
    return {
      metrics: Array.from(this.metrics.values()).map(metric => ({
        ...metric,
        values: Object.fromEntries(metric.values.entries())
      })),
      customMetrics: Object.fromEntries(this.customMetrics.entries())
    };
  }

  reset() {
    this.metrics.clear();
    this.customMetrics.clear();
  }
}

export const metrics = new MetricsRegistry();

export async function withMetrics<T>(
  agentType: string,
  operation: string,
  fn: () => Promise<T>,
  metadata: Record<string, unknown> = {}
): Promise<T> {
  const start = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - start;

    // Record successful operation
    metrics.recordMetric('agent_operation', {
      ...metadata,
      agent_type: agentType,
      operation,
      status: 'success',
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });

    // Record latency
    metrics.recordMetric('agent_metrics', {
      ...metadata,
      type: 'latency',
      agent_type: agentType,
      operation,
      value: duration,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error: unknown) {
    const duration = Date.now() - start;
    const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Record failed operation
    metrics.recordMetric('agent_operation', {
      ...metadata,
      agent_type: agentType,
      operation,
      status: 'error',
      error_type: errorType,
      error_message: errorMessage,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });

    // Record error
    metrics.recordMetric('agent_metrics', {
      ...metadata,
      type: 'error',
      agent_type: agentType,
      error_type: errorType,
      operation,
      value: 1,
      timestamp: new Date().toISOString()
    });

    throw error;
  }
}

// Define core metrics
export const BANDIT_SELECTIONS = metrics.createMetric({
  name: 'bandit_selections_total',
  help: 'Total number of bandit selections',
  type: 'counter',
  labelNames: ['experiment_id', 'variant_id']
});

export const CONVERSION_RATE = metrics.createMetric({
  name: 'conversion_rate',
  help: 'Current conversion rate',
  type: 'gauge',
  labelNames: ['experiment_id', 'variant_id']
});

export const AGENT_LATENCY = metrics.createMetric({
  name: 'agent_latency_seconds',
  help: 'Agent processing latency in seconds',
  type: 'histogram',
  labelNames: ['agent_type', 'operation']
});

export const ERROR_COUNT = metrics.createMetric({
  name: 'error_count',
  help: 'Number of errors by type',
  type: 'counter',
  labelNames: ['agent_type', 'error_type']
});
