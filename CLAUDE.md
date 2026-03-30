# Cortex / MedSage.ai — Project Reference for Claude

## Project Overview
Medical education AI assistant for MBBS students. Backend: Node.js/Express. Frontend: React. DB: MongoDB + Qdrant (vector). Auth: Firebase Admin. LLM: Gemini 2.5 Flash with fallback LLM.

---

## Architecture

### Backend Pipeline (server/)
1. **Guardrails** — greeting detection, off-topic rejection, empty query
2. **Topic Scoring** — `topicConfidenceScorer` classifies query into medical subject
3. **RAG Retrieval** — `ragService` fetches textbook chunks from Qdrant
4. **LLM Generation** — `cortexLlmClient` calls Gemini (with retry + fallback)
5. **Citation Verification** — `citationVerifier` links claims to source chunks
6. **Confidence Engine** — `confidenceEngine` computes confidence tier + flags
7. **Response Policy** — `cortexResponsePolicy` applies trust metadata

### Key Services
| File | Role |
|------|------|
| `server/services/cortexOrchestrator.js` | Main pipeline orchestration (698 lines) |
| `server/services/cortexLlmClient.js` | Gemini API calls, retry logic, fallback |
| `server/services/promptBuilder.js` | Prompt assembly with safe `_render()` |
| `server/services/cortexRequestUtils.js` | History sanitization, prompt helpers |
| `server/services/cortexResponsePolicy.js` | PIPELINE_POLICIES, trust metadata |
| `server/middleware/auth.js` | Firebase token verification, dev bypass |
| `server/middleware/monitoring.js` | In-memory metrics, `/metrics`, `/health` |

### Routes
| Route | Auth | Notes |
|-------|------|-------|
| `POST /api/medical/query` | verifyToken + uidQueryLimiter | Full RAG pipeline |
| `POST /api/medical/query/stream` | verifyToken only | Fast draft SSE — **missing uidQueryLimiter** |
| `GET/POST /api/chat/sessions` | verifyToken | MongoDB chat persistence |
| `POST /auth/user` | optionalAuth | User sync — **should be verifyToken** |
| `GET /metrics` | **NONE** | Prometheus metrics — **must be gated** |
| `GET /health` | **NONE** | Health check — **must be gated** |
| `GET /api/audit/admin/review` | verifyToken + isAdmin | Admin: env-var UID list |

### PIPELINE_POLICIES (cortexResponsePolicy.js)
`greeting`, `clarification`, `off_topic_refusal`, `full_rag`, `direct_gemini`, `direct_no_chunks`, `fallback`, `structured_fallback`, `schema_failed`, `emergency_fallback`, `vision`, `fast_draft`

---

## Security Audit Findings (2026-03-22)

### CRITICAL
- **`/metrics` and `/health` are public** — expose model name, Node version, heap memory, LLM error counts, RAG latency, citation compliance. Fix: add `verifyToken + isAdmin` or restrict to localhost.
- **`buildDirectPrompt` does raw `${question}` interpolation** — 5 of 7 pipeline paths (direct_gemini, direct_no_chunks, structured_fallback, schema_failed, emergency_fallback) and the entire streaming path embed the user question with zero sanitization. `_render()` in `promptBuilder.js` is safe but only used by the full RAG path. Fix: pass `question` through `sanitizeHistoryContent()` before any template interpolation.
- **Streaming guardrails are weaker than standard query** — `streamMedicalResponse` skips greeting check, topic confidence check, clarification logic, and retrieval quality check. A non-medical or dangerous question can pass straight to the LLM via the stream.

### HIGH
- **Streaming endpoint missing `uidQueryLimiter`** — `POST /query/stream` has no per-user rate limit. Only IP-based global limiter (10/min). Fix: add `uidQueryLimiter` to the streaming route middleware chain.
- **CORS allows all `*.vercel.app`** — `origin.endsWith('.vercel.app')` allows any Vercel deployment. Fix: explicit allowlist of your own deployment URLs only.
- **`visionLimiter` keyGenerator is always IP-based** — `req.user` is `undefined` at middleware level (verifyToken runs inside the route). Fix: move vision limiting inside the route after `verifyToken`.
- **`/auth/user` uses `optionalAuth`** — unauthenticated callers can trigger `syncUser`. Fix: use `verifyToken`.
- **`callVision` and `streamText` have no retry logic** — unlike `callText`/`callStructured`, a single Gemini failure = hard error. Fix: wrap in `_callWithRetry`.
- **`buildLearnerContext` called outside try-catch in streaming route** — MongoDB failure before SSE headers leaves client in unknown state. Fix: move inside try block, add `serverSelectionTimeoutMS`.
- **Chat session full-fetch returns up to 2MB** — 200 messages × 10,000 chars, no pagination. Fix: add `?page`/`?limit` params.
- **`buildLearnerContext` hits MongoDB on every request** — 2 queries per query/stream call, no caching. Fix: LRU cache per UID with 5-minute TTL.

### MEDIUM
- **Admin UID list is env-var only** — no hot revocation, no Firebase custom claims. Fix: use Firebase custom claims.
- **`normalizedQuestion` embedded in schema retry prompt without sanitization** — `cortexOrchestrator.js:262`.
- **`looksLikeFollowUp` treats all wh-questions as follow-ups** — "What stocks should I buy?" bypasses off-topic guard on fresh sessions. Fix: only apply when `history.length > 0`.
- **`req.ip` unreliable without `trust proxy` setting** — rate limiting degrades behind nginx/Cloudflare. Fix: `app.set('trust proxy', 1)`.
- **`requestTrackerMiddleware` uses `req.path`** — includes dynamic IDs (session IDs, etc.) creating unbounded metric keys. Fix: use `req.route?.path`.
- **`is_clarification_required: true` discards a real RAG answer** — when `sourcedClaimsCount < 1` on a full RAG result, the assembled answer is thrown away and replaced with a clarification prompt. Fix: return partial answer alongside clarification.
- **`confidence: 0.65` hardcoded for all vision responses** — `cortexOrchestrator.js:125`.
- **Query rewrite prompt embeds `normalizedQuestion` without sanitization** — `cortexOrchestrator.js:171`.

### LOW
- **Duplicate key bug kills `low_confidence` admin filter** — `audit.js:89`: `{ confidence: { $lt: 0.5 }, confidence: { $ne: null } }` — JS silently drops `$lt`. Fix: `{ confidence: { $lt: 0.5, $ne: null } }`.
- **`log_id` is a MongoDB ObjectId** — leaks server timestamp and machine ID. Fix: use `crypto.randomUUID()`.
- **Audit `save()` is fire-and-forget** — if it fails, client gets a `log_id` that doesn't exist; feedback submission returns 404 silently.
- **No MongoDB connection retry** — process continues on DB failure with no alerts or graceful shutdown.
- **Metrics reset on every restart** — in-memory only, no external sink. No alerting on high error rates.
- **`subjects_selected` not sliced in `buildLearnerContext`** — `weak_topics`/`strong_topics` capped at 5, but `subjects_selected` is not bounded at source (only at render in `buildLearnerContextBlock` at 6).
- **`morgan('combined')` logs full URLs** — risk if query params ever carry sensitive data.

---

## Code Conventions & Patterns

### Prompt Safety
- **Safe path**: `promptBuilder._render()` — sanitizes `{{...}}` patterns in values, single-pass substitution, validates key identifiers. Used only in full RAG path.
- **Unsafe path**: `buildDirectPrompt()` — raw string interpolation. All fallback pipelines use this. **Always sanitize `question` before passing here.**
- History sanitization: `sanitizeHistoryContent()` in `cortexRequestUtils.js` — strips `{{...}}`, `[DIRECTIVE]` patterns, HTML tags, control chars, truncates to 500 chars.

### Rate Limiting Layers
1. Global: 100 req / 15 min / IP (`index.js`)
2. AI endpoint: 10 req / 1 min / IP (`aiLimiter`, applied before verifyToken — IP only)
3. Per-user: 60 req / 1 min / UID (`uidQueryLimiter`, inside `/query` route — NOT on `/query/stream`)
4. Vision: 2 req / 1 min — intended UID-based but is IP-based due to middleware ordering

### Trust Metadata
Every response carries `trust` object with: `verified`, `verification_level`, `status_label`, `advisory`, `pipeline`, `provider`, `confidence_tier`, `confidence_score`, `citation_count`, `sourced_claims_count`, `flags`.

### Learner Context
Built from MongoDB (`UserProfile` + `StudyPlan`) per request. Fields: `mbbs_year`, `country`, `weak_topics` (max 5), `strong_topics` (max 5), `subjects_selected`, `days_until_exam`. Passed into prompts via `buildLearnerContextBlock()`.

### Streaming (SSE)
- Server: `POST /api/medical/query/stream` → SSE events: `start`, `data` (tokens), `done`, `error`
- Client: `streamMedicalQuery()` in `src/services/api.js` — buffers tokens in `tokenBuffer`; on error appends `\n\n… (stream interrupted)` before calling `onError`

---

## Top 3 Immediate Fixes
1. **Gate `/metrics` and `/health`** — add auth middleware
2. **Sanitize `question` in `buildDirectPrompt`** — run through `sanitizeHistoryContent()` before interpolation
3. **Add `uidQueryLimiter` to streaming route** — one line in `medical.js:229`

---

## Overall Audit Score: 5.5 / 10
Architecture is solid. Trust metadata, citation verification, and `_render()` safety are genuine strengths. Public metrics, raw question injection on fallback paths, and missing per-user rate limit on streaming are the blockers for production.

