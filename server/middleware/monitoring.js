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
const { GEMINI_MODEL } = require('../config');
const { verifyToken, isAdmin } = require('./auth');
const logger = require('../utils/logger');

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
    // Query expansion counters
    queryExpansionTotal: 0,          // requests where expansion generated alternatives
    queryExpansionQueriesTotal: 0,   // total queries run (including originals when expanded)
    queryExpansionAddedChunks: 0,    // total new chunks contributed by expansion
    // Time-stamped ring buffer for sliding-window error rate (alert system)
    // Each entry: { ts: number (epoch ms), isError: boolean }
    // Capped at 2000 entries (~33 req/s sustained for 1 min) to bound memory.
    requestWindow: [],
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

    // Feed the sliding-window buffer used by the alert system
    metrics.requestWindow.push({ ts: Date.now(), isError: statusCode >= 500 });
    if (metrics.requestWindow.length > 2000) metrics.requestWindow.shift();
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

/**
 * Records a query expansion event.
 * Only called when the expander produced ≥ 1 alternative (queriesCount > 1).
 * @param {number} queriesCount  - Total queries run (original + alternatives)
 * @param {number} addedChunks   - New chunks contributed by the alternatives
 */
function recordQueryExpansion(queriesCount, addedChunks) {
    if (queriesCount <= 1) return; // no expansion — nothing to record
    metrics.queryExpansionTotal++;
    metrics.queryExpansionQueriesTotal += queriesCount;
    metrics.queryExpansionAddedChunks  += (addedChunks || 0);
}

// ─── Alert system ────────────────────────────────────────────────────────────

const ALERT_WINDOW_MS      = 5 * 60 * 1000;  // 5-minute sliding window
const ALERT_ERROR_THRESHOLD = 0.10;           // 10% error rate
const ALERT_CHECK_INTERVAL  = 60 * 1000;      // check every 60 seconds
const ALERT_COOLDOWN_MS     = 5 * 60 * 1000;  // suppress repeat alerts for 5 min

let lastAlertAt = 0;

/**
 * Returns the current error rate (HTTP 5xx / total) over the last 5 minutes.
 * Entries older than the window are discarded in place.
 */
function computeWindowedErrorRate() {
    const cutoff = Date.now() - ALERT_WINDOW_MS;

    // Evict stale entries (window is chronologically ordered, so trim from front)
    let firstFresh = 0;
    while (firstFresh < metrics.requestWindow.length && metrics.requestWindow[firstFresh].ts < cutoff) {
        firstFresh++;
    }
    if (firstFresh > 0) metrics.requestWindow.splice(0, firstFresh);

    const total  = metrics.requestWindow.length;
    if (total === 0) return { total: 0, errors: 0, rate: 0 };

    const errors = metrics.requestWindow.filter(e => e.isError).length;
    return { total, errors, rate: errors / total };
}

/**
 * Sends a webhook POST to ALERT_WEBHOOK_URL (Slack-compatible payload).
 * Silently swallows network failures so the alert system never crashes the server.
 */
async function sendWebhookAlert(message) {
    const url = process.env.ALERT_WEBHOOK_URL;
    if (!url) return;

    try {
        const body = JSON.stringify({ text: message });
        // Use Node's built-in https — no extra dependency
        const { request } = await import('https');
        await new Promise((resolve, reject) => {
            const parsed = new URL(url);
            const req = request({
                hostname: parsed.hostname,
                path:     parsed.pathname + parsed.search,
                method:   'POST',
                headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
            }, (res) => {
                res.resume(); // drain so socket is released
                resolve();
            });
            req.on('error', reject);
            req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
            req.write(body);
            req.end();
        });
    } catch (err) {
        logger.error('[ALERT] Webhook delivery failed', { err: err.message });
    }
}

function runAlertCheck() {
    const { total, errors, rate } = computeWindowedErrorRate();
    if (total < 5) return; // not enough traffic to be meaningful

    if (rate <= ALERT_ERROR_THRESHOLD) return;

    const now = Date.now();
    if (now - lastAlertAt < ALERT_COOLDOWN_MS) return; // suppress during cooldown
    lastAlertAt = now;

    const pct     = (rate * 100).toFixed(1);
    const message =
        `🚨 *Cortex alert* — HTTP 5xx error rate is *${pct}%* ` +
        `(${errors}/${total} requests in the last 5 minutes). ` +
        `Threshold: ${ALERT_ERROR_THRESHOLD * 100}%.`;

    logger.error('[ALERT] Error rate threshold exceeded', { message, pct: (rate * 100).toFixed(1), errors, total });
    sendWebhookAlert(message); // fire-and-forget; errors are swallowed internally
}

// Start the recurring check. Unref so it doesn't keep the process alive during tests.
const _alertInterval = setInterval(runAlertCheck, ALERT_CHECK_INTERVAL);
if (_alertInterval.unref) _alertInterval.unref();

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
    nl('# HELP medsage_query_expansion_total Requests where query expansion generated alternatives');
    nl('# TYPE medsage_query_expansion_total counter');
    nl(`medsage_query_expansion_total ${metrics.queryExpansionTotal}`);

    nl();
    nl('# HELP medsage_query_expansion_queries_total Total queries run across all expansion calls');
    nl('# TYPE medsage_query_expansion_queries_total counter');
    nl(`medsage_query_expansion_queries_total ${metrics.queryExpansionQueriesTotal}`);

    nl();
    nl('# HELP medsage_query_expansion_added_chunks_total Extra unique chunks contributed by expansion');
    nl('# TYPE medsage_query_expansion_added_chunks_total counter');
    nl(`medsage_query_expansion_added_chunks_total ${metrics.queryExpansionAddedChunks}`);

    nl();
    nl(`# HELP process_uptime_seconds Server uptime`);
    nl(`# TYPE process_uptime_seconds gauge`);
    nl(`process_uptime_seconds ${process.uptime().toFixed(0)}`);

    return lines.join('\n');
}

// ─── Express middleware: auto-tracks all requests ─────────────────────────────

function requestTrackerMiddleware(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
        const routeKey = req.route?.path || req.path;
        const route = `${req.method} ${routeKey}`;
        const duration = Date.now() - start;
        recordRequest(route, res.statusCode, duration);
    });

    next();
}

// ─── Routes: /metrics and /health ────────────────────────────────────────────

// ─── Localhost-only guard (dev) ───────────────────────────────────────────────

function localhostOnly(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || '';
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
        return next();
    }
    return res.status(403).json({ success: false, error: 'Forbidden' });
}

// In development, restrict to localhost only.
// In production, require a verified admin token.
const monitoringGuard = process.env.NODE_ENV === 'production'
    ? [verifyToken, isAdmin]
    : [localhostOnly];

function registerMonitoringRoutes(app) {
    // Prometheus scrape endpoint
    app.get('/metrics', ...monitoringGuard, (req, res) => {
        res.set('Content-Type', 'text/plain; version=0.0.4');
        res.send(buildPrometheusOutput());
    });

    // Detailed health check
    app.get('/health', ...monitoringGuard, (req, res) => {
        const compliantCount = metrics.citationWindow.filter(Boolean).length;
        const complianceRate = metrics.citationWindow.length
            ? ((compliantCount / metrics.citationWindow.length) * 100).toFixed(1)
            : 'N/A (no requests yet)';

        const uptimeHours = (process.uptime() / 3600).toFixed(2);

        res.json({
            status: 'ok',
            version: '2.0.0',
            model: GEMINI_MODEL,
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
    recordQueryExpansion,
    metrics
};
