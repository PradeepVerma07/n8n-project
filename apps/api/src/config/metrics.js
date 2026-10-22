import client from 'prom-client';

export const register = new client.Registry();

// Enable standard Node.js & runtime metrics collection
client.collectDefaultMetrics({
  register,
  prefix: 'postpilot_',
});

// Custom HTTP Request Counter
export const httpRequestCounter = new client.Counter({
  name: 'postpilot_http_requests_total',
  help: 'Total number of HTTP requests received',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Custom HTTP Duration Histogram
export const httpRequestDuration = new client.Histogram({
  name: 'postpilot_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// Custom Publish Jobs Counter
export const publishJobsCounter = new client.Counter({
  name: 'postpilot_publish_jobs_total',
  help: 'Total social media publish operations attempted',
  labelNames: ['platform', 'status'],
  registers: [register],
});

// Custom Publish Latency Histogram
export const publishDurationHistogram = new client.Histogram({
  name: 'postpilot_publish_duration_seconds',
  help: 'Latency of social media network publish requests in seconds',
  labelNames: ['platform'],
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

/**
 * Express middleware to record HTTP metrics for Prometheus.
 */
export function metricsMiddleware(req, res, next) {
  // Skip metrics scraping endpoint itself to prevent skew
  if (req.path === '/metrics' || req.path === '/health' || req.path === '/ready') {
    return next();
  }

  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationSeconds = diff[0] + diff[1] / 1e9;
    const route = req.route ? req.route.path : req.path;
    const statusCode = String(res.statusCode);

    httpRequestCounter.inc({
      method: req.method,
      route,
      status_code: statusCode,
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: statusCode,
      },
      durationSeconds
    );
  });

  next();
}
