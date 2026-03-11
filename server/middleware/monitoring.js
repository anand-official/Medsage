/**
 * Production Monitoring Middleware
 * 
 * Provides:
 * - GET /metrics — Prometheus-compatible metrics endpoint
 * - GET /health  — Detailed health check
 * - Automatic request/response telemetry collection
 * 
 * Metrics exported:
 *   medsage_requests_total          (counter, by route + status)
 *   medsage_request_duration_ms     (histogram, by route)
 *   medsage_llm_calls_total         (counter)
 *   medsage_citation_compliance     (gauge, rolling 100-req window)
 *   medsage_confidence_tier_total   (counter, by tier)
 *   medsage_rag_latency_ms          (histogram)
 *   medsage_errors_total            (counter, by type)
 */

const os = require('os');

// ─── In-memory metrics store ─────────────────────────────────────────────────

const metrics = {
    requestsTotal: {},          // { 'POST /api/medical 200': count }
    requestDurations: {},       // { 'POST /api/medical': [ms, ms, ...] }
    llmCallsTotal: 0,
    llmErrors: 0,
    citationWindow: [],         // rolling window of {compliant: bool} (last 100)
    confidenceTiers: { HIGH: 0, MEDIUM: 0, LOW: 0 },
    ragLatencies: [],
    errorsTotal: {},            // { 'SCHEMA_VALIDATION': count }
    startedAt: new Date().toISOString()
};

// ─── Metric updaters (called from pipeline services) ─────────────────────────

function recordRequest(route, statusCode, durationMs) {
    const key = `${route} ${statusCode}`;
    metrics.requestsTotal[key] = (metrics.requestsTotal[key] || 0) + 1;

    if (!metrics.requestDurations[route]) metrics.requestDurations[route] = [];
    metrics.requestDurations[route].push(durationMs);
    // Cap to avoid unbounded growth
    if (metrics.requestDurations[route].length > 500) {
        metrics.requestDurations[route] = metrics.requestDurations[route].slice(-500);
    }
}

function recordLLMCall(success = true) {
    metrics.llmCallsTotal++;
    if (!success) metrics.llmErrors++;
}

function recordCitationCompliance(isCompliant) {
    metrics.citationWindow.push(isCompliant);
    if (metrics.citationWindow.length > 100) metrics.citationWindow.shift();
}

function recordConfidenceTier(tier) {
    if (metrics.confidenceTiers[tier] !== undefined) {
        metrics.confidenceTiers[tier]++;
    }
}

function recordRAGLatency(ms) {
    metrics.ragLatencies.push(ms);
    if (metrics.ragLatencies.length > 500) {
        metrics.ragLatencies = metrics.ragLatencies.slice(-500);
    }
}

function recordError(type) {
    metrics.errorsTotal[type] = (metrics.errorsTotal[type] || 0) + 1;
}

// ─── Prometheus text format builder ───────────────────────────────────────────

function percentile(arr, p) {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
}

function mean(arr) {
    return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function buildPrometheusOutput() {
    const lines = [];
    const nl = (s = '') => lines.push(s);

    // HELP + TYPE declarations
    nl('# HELP medsage_requests_total Total HTTP requests by route and status');
    nl('# TYPE medsage_requests_total counter');
    for (const [label, count] of Object.entries(metrics.requestsTotal)) {
        const [method_path, status] = label.rsplit ? label.rsplit(' ', 1) : label.split(/ (?=\d{3}$)/);
        nl(`medsage_requests_total{route="${method_path || label}",status="${status || '0'}"} ${count}`);
    }

    nl();
    nl('# HELP medsage_request_duration_p95_ms P95 request latency in ms by route');
    nl('# TYPE medsage_request_duration_p95_ms gauge');
    for (const [route, durations] of Object.entries(metrics.requestDurations)) {
        nl(`medsage_request_duration_p95_ms{route="${route}"} ${percentile(durations, 95).toFixed(1)}`);
    }

    nl();
    nl('# HELP medsage_llm_calls_total Total LLM calls made');
    nl('# TYPE medsage_llm_calls_total counter');
    nl(`medsage_llm_calls_total ${metrics.llmCallsTotal}`);

    nl();
    nl('# HELP medsage_llm_errors_total Total LLM call failures');
    nl('# TYPE medsage_llm_errors_total counter');
    nl(`medsage_llm_errors_total ${metrics.llmErrors}`);

    nl();
    nl('# HELP medsage_citation_compliance_rate Citation compliance rate (rolling 100 requests)');
    nl('# TYPE medsage_citation_compliance_rate gauge');
    const compliantCount = metrics.citationWindow.filter(Boolean).length;
    const complianceRate = metrics.citationWindow.length
        ? (compliantCount / metrics.citationWindow.length) * 100
        : 0;
    nl(`medsage_citation_compliance_rate ${complianceRate.toFixed(2)}`);

    nl();
    nl('# HELP medsage_confidence_tier_total Response count by confidence tier');
    nl('# TYPE medsage_confidence_tier_total counter');
    for (const [tier, count] of Object.entries(metrics.confidenceTiers)) {
        nl(`medsage_confidence_tier_total{tier="${tier}"} ${count}`);
    }

    nl();
    nl('# HELP medsage_rag_latency_p95_ms P95 RAG retrieval latency in ms');
    nl('# TYPE medsage_rag_latency_p95_ms gauge');
    nl(`medsage_rag_latency_p95_ms ${percentile(metrics.ragLatencies, 95).toFixed(1)}`);
    nl(`medsage_rag_latency_mean_ms ${mean(metrics.ragLatencies).toFixed(1)}`);

    nl();
    nl('# HELP medsage_errors_total Error count by type');
    nl('# TYPE medsage_errors_total counter');
    for (const [type, count] of Object.entries(metrics.errorsTotal)) {
        nl(`medsage_errors_total{type="${type}"} ${count}`);
    }

    nl();
    nl(`# HELP process_uptime_seconds Server uptime`);
    nl(`# TYPE process_uptime_seconds gauge`);
    nl(`process_uptime_seconds ${process.uptime().toFixed(0)}`);

    return lines.join('\n');
}

// ─── Express middleware: auto-tracks all requests ─────────────────────────────

function requestTrackerMiddleware(req, res, next) {
    const start = Date.now();
    const route = `${req.method} ${req.path}`;

    res.on('finish', () => {
        const duration = Date.now() - start;
        recordRequest(route, res.statusCode, duration);
    });

    next();
}

// ─── Routes: /metrics and /health ────────────────────────────────────────────

function registerMonitoringRoutes(app) {
    // Prometheus scrape endpoint
    app.get('/metrics', (req, res) => {
        res.set('Content-Type', 'text/plain; version=0.0.4');
        res.send(buildPrometheusOutput());
    });

    // Detailed health check
    app.get('/health', (req, res) => {
        const compliantCount = metrics.citationWindow.filter(Boolean).length;
        const complianceRate = metrics.citationWindow.length
            ? ((compliantCount / metrics.citationWindow.length) * 100).toFixed(1)
            : 'N/A (no requests yet)';

        const uptimeHours = (process.uptime() / 3600).toFixed(2);

        res.json({
            status: 'ok',
            version: '2.0.0',
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            uptime_hours: parseFloat(uptimeHours),
            started_at: metrics.startedAt,
            system: {
                platform: os.platform(),
                node_version: process.version,
                memory_mb: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)
            },
            metrics: {
                total_requests: Object.values(metrics.requestsTotal).reduce((s, v) => s + v, 0),
                llm_calls: metrics.llmCallsTotal,
                llm_errors: metrics.llmErrors,
                citation_compliance: `${complianceRate}%`,
                confidence_tiers: metrics.confidenceTiers,
                rag_latency_p95_ms: percentile(metrics.ragLatencies, 95).toFixed(0),
                errors: metrics.errorsTotal
            }
        });
    });
}

module.exports = {
    requestTrackerMiddleware,
    registerMonitoringRoutes,
    recordRequest,
    recordLLMCall,
    recordCitationCompliance,
    recordConfidenceTier,
    recordRAGLatency,
    recordError,
    metrics
};
