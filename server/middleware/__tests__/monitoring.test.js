'use strict';

/**
 * Tests for /healthz, /health, and /metrics endpoint security posture.
 *
 * Key invariants:
 *   - /healthz is public (no auth required), returns only safe liveness info
 *   - /healthz response does not expose provider names, env var names, or error messages
 *   - /health requires admin auth — returns 401 without a token
 *   - /metrics requires admin auth — returns 401 without a token
 */

const express = require('express');
const http    = require('http');

// ─── Shared mocks ────────────────────────────────────────────────────────────

jest.mock('../../config', () => ({
    IS_PROD:         false,
    NODE_ENV:        'test',
    PORT:            0,
    GEMINI_API_KEY:  'test-gemini-key',
    GEMINI_MODEL:    'gemini-test',
    ALLOWED_ORIGINS: [],
    DEVELOPMENT_ORIGINS: [],
}));

jest.mock('../../lib/supabaseAdmin', () => ({
    isSupabaseConfigured: jest.fn(() => true),
    getSupabaseAdmin: jest.fn(() => ({
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                limit: jest.fn(() => Promise.resolve({ error: null, count: 1 })),
            })),
        })),
    })),
}));

jest.mock('../../middleware/auth', () => ({
    verifyToken: jest.fn((req, res, next) => {
        if (!req.headers.authorization) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        req.user = { uid: 'admin-uid' };
        return next();
    }),
    isAdmin: jest.fn((req, res, next) => {
        if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
        return next();
    }),
}));

jest.mock('../../utils/logger', () => ({
    info:  jest.fn(),
    warn:  jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}));

// ─── Test helpers ─────────────────────────────────────────────────────────────

function buildTestApp() {
    // Minimal express app that mounts only monitoring routes and /healthz.
    // We avoid requiring server/index.js (which calls app.listen and loads
    // all routes) by directly building monitoring routes in isolation.
    const { registerMonitoringRoutes } = require('../monitoring');
    const config = require('../../config');
    const { isSupabaseConfigured, getSupabaseAdmin } = require('../../lib/supabaseAdmin');
    const { verifyToken, isAdmin } = require('../auth');

    const app = express();
    app.use(express.json());

    // /healthz — public, minimal (mirrors server/index.js implementation)
    const { localhostOnly } = require('../monitoring');
    app.get('/healthz', async (req, res) => {
        const llmOk = Boolean(config.GEMINI_API_KEY);
        let dbOk = false;

        if (isSupabaseConfigured()) {
            try {
                const db = getSupabaseAdmin();
                const result = await db
                    .from('user_profiles')
                    .select('uid', { head: true, count: 'exact' })
                    .limit(1);
                dbOk = !result.error;
            } catch (_) {
                // dbOk stays false
            }
        }

        const status = dbOk && llmOk ? 'ok' : 'degraded';
        res.status(status === 'ok' ? 200 : 503).json({
            status,
            service: 'cortex-api',
            uptime_s: Math.floor(process.uptime()),
            checks: {
                database: dbOk ? 'ok' : 'degraded',
                llm: llmOk ? 'ok' : 'degraded',
            },
        });
    });

    registerMonitoringRoutes(app);
    return app;
}

function startServer(app) {
    return new Promise((resolve) => {
        const server = http.createServer(app);
        server.listen(0, '127.0.0.1', () => resolve(server));
    });
}

function stopServer(server) {
    return new Promise((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
    );
}

async function get(server, path, headers = {}) {
    const port = server.address().port;
    return new Promise((resolve, reject) => {
        const opts = { hostname: '127.0.0.1', port, path, method: 'GET', headers };
        const req = http.request(opts, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
                catch { resolve({ status: res.statusCode, body }); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('/healthz — public liveness endpoint', () => {
    let server;

    beforeAll(async () => {
        const app = buildTestApp();
        server = await startServer(app);
    });

    afterAll(async () => {
        await stopServer(server);
    });

    test('returns 200 without any Authorization header', async () => {
        const { status } = await get(server, '/healthz');
        expect(status).toBe(200);
    });

    test('response contains status and service fields', async () => {
        const { body } = await get(server, '/healthz');
        expect(body).toHaveProperty('status', 'ok');
        expect(body).toHaveProperty('service', 'cortex-api');
        expect(body).toHaveProperty('uptime_s');
    });

    test('check values are only "ok" or "degraded" — no raw error messages', async () => {
        const { body } = await get(server, '/healthz');
        expect(body).toHaveProperty('checks');
        for (const value of Object.values(body.checks)) {
            expect(['ok', 'degraded']).toContain(value);
        }
    });

    test('response does not expose provider names (supabase, gemini, mongodb)', async () => {
        const { body } = await get(server, '/healthz');
        const raw = JSON.stringify(body).toLowerCase();
        expect(raw).not.toContain('supabase');
        expect(raw).not.toContain('gemini');
        expect(raw).not.toContain('mongodb');
    });

    test('response does not expose env var names', async () => {
        const { body } = await get(server, '/healthz');
        const raw = JSON.stringify(body);
        expect(raw).not.toMatch(/GEMINI_API_KEY|SUPABASE_URL|SUPABASE_SECRET/);
    });

    test('response does not expose heap, memory, or node version', async () => {
        const { body } = await get(server, '/healthz');
        const raw = JSON.stringify(body).toLowerCase();
        expect(raw).not.toContain('heap');
        expect(raw).not.toContain('memory');
        expect(raw).not.toContain('node_version');
    });

    test('returns 503 when database check fails', async () => {
        const { getSupabaseAdmin } = require('../../lib/supabaseAdmin');
        getSupabaseAdmin.mockReturnValueOnce({
            from: () => ({
                select: () => ({
                    limit: () => Promise.resolve({ error: new Error('connection refused'), count: null }),
                }),
            }),
        });
        const app = buildTestApp();
        const srv = await startServer(app);
        try {
            const { status, body } = await get(srv, '/healthz');
            expect(status).toBe(503);
            expect(body.status).toBe('degraded');
            expect(body.checks.database).toBe('degraded');
        } finally {
            await stopServer(srv);
        }
    });
});

// In production (NODE_ENV=production), monitoringGuard = [verifyToken, isAdmin].
// Re-require the monitoring module with NODE_ENV=production so the guard is exercised.

function buildProductionMonitoringApp() {
    const saved = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    jest.resetModules();

    // Re-apply mocks after resetModules
    jest.mock('../../config', () => ({
        IS_PROD:         true,
        NODE_ENV:        'production',
        PORT:            0,
        GEMINI_API_KEY:  'test-gemini-key',
        GEMINI_MODEL:    'gemini-test',
        ALLOWED_ORIGINS: [],
        DEVELOPMENT_ORIGINS: [],
    }));
    jest.mock('../../middleware/auth', () => ({
        verifyToken: jest.fn((req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }
            req.user = { uid: 'admin-uid' };
            return next();
        }),
        isAdmin: jest.fn((req, res, next) => {
            if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
            return next();
        }),
    }));
    jest.mock('../../utils/logger', () => ({
        info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
    }));

    const { registerMonitoringRoutes } = require('../monitoring');
    const app = express();
    app.use(express.json());
    registerMonitoringRoutes(app);

    process.env.NODE_ENV = saved;
    return app;
}

describe('/health — admin-only detailed diagnostics (production guard)', () => {
    let server;

    beforeAll(async () => {
        const app = buildProductionMonitoringApp();
        server = await startServer(app);
    });

    afterAll(async () => { await stopServer(server); });

    test('returns 401 without Authorization header', async () => {
        const { status } = await get(server, '/health');
        expect(status).toBe(401);
    });

    test('returns 200 with a valid admin token', async () => {
        const { status } = await get(server, '/health', { Authorization: 'Bearer valid-token' });
        expect(status).toBe(200);
    });
});

describe('/metrics — admin-only Prometheus endpoint (production guard)', () => {
    let server;

    beforeAll(async () => {
        const app = buildProductionMonitoringApp();
        server = await startServer(app);
    });

    afterAll(async () => { await stopServer(server); });

    test('returns 401 without Authorization header', async () => {
        const { status } = await get(server, '/metrics');
        expect(status).toBe(401);
    });

    test('returns 200 with a valid admin token', async () => {
        const { status } = await get(server, '/metrics', { Authorization: 'Bearer valid-token' });
        expect(status).toBe(200);
    });
});
