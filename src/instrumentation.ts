export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logger } = await import('@/lib/server/logger');
    logger.info('Instrumentation registered', {
      runtime: process.env.NEXT_RUNTIME,
      nodeEnv: process.env.NODE_ENV,
    });

    // OpenTelemetry is opt-in: install the packages and set
    // OTEL_EXPORTER_OTLP_ENDPOINT to enable trace export.
    // We skip module resolution at build time to keep the deps optional.
    if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
      logger.info('OTEL_EXPORTER_OTLP_ENDPOINT detected — install @opentelemetry/sdk-node, @opentelemetry/exporter-trace-otlp-http, and @opentelemetry/resources to enable tracing', {
        endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      });
    }
  }
}
