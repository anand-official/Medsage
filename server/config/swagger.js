'use strict';

const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const definition = {
    openapi: '3.0.3',
    info: {
        title: 'Cortex API',
        description:
            'Medical education AI backend for MBBS students. ' +
            'Powered by Gemini 2.5 Flash with RAG retrieval from Qdrant.',
        version: '2.0.0',
        contact: { name: 'MedSage.ai', url: 'https://medsage.ai' },
    },
    servers: [
        { url: 'https://api.medsage.ai', description: 'Production' },
        { url: 'http://localhost:3001',   description: 'Local development' },
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'Firebase JWT',
                description: 'Firebase ID token. Obtain via `firebase.auth().currentUser.getIdToken()`.',
            },
        },
        schemas: {
            // ── Shared primitives ──────────────────────────────────────────
            Error: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    error:   { type: 'string',  example: 'An unexpected error occurred.' },
                },
            },
            ValidationError: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    errors:  {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                msg:   { type: 'string' },
                                param: { type: 'string' },
                                location: { type: 'string' },
                            },
                        },
                    },
                },
            },
            // ── Trust / Confidence ─────────────────────────────────────────
            TrustMetadata: {
                type: 'object',
                properties: {
                    verified:           { type: 'boolean' },
                    verification_level: { type: 'string', example: 'SOURCE_VERIFIED' },
                    status_label:       { type: 'string', example: 'Verified' },
                    advisory:           { type: 'string' },
                    pipeline:           { type: 'string', example: 'full_rag' },
                    provider:           { type: 'string', example: 'gemini' },
                    confidence_tier:    { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
                    confidence_score:   { type: 'number', example: 0.87 },
                    citation_count:     { type: 'integer', example: 3 },
                    sourced_claims_count: { type: 'integer', example: 4 },
                    flags:              { type: 'array', items: { type: 'string' } },
                },
            },
            // ── Medical Query ──────────────────────────────────────────────
            MedicalQueryRequest: {
                type: 'object',
                required: ['message'],
                properties: {
                    message:     { type: 'string', maxLength: 2000, example: 'Explain nephrotic syndrome' },
                    mode:        { type: 'string', enum: ['exam', 'conceptual'], default: 'conceptual' },
                    syllabus:    { type: 'string', default: 'Indian MBBS', example: 'Indian MBBS' },
                    subject:     { type: 'string', example: 'Pathology' },
                    imageBase64: { type: 'string', description: 'data:image/jpeg;base64,... (max 5 MB, JPEG/PNG/WebP)' },
                    history: {
                        type: 'array',
                        maxItems: 20,
                        items: {
                            type: 'object',
                            properties: {
                                role:    { type: 'string', enum: ['user', 'ai'] },
                                content: { type: 'string', maxLength: 2000 },
                            },
                        },
                    },
                },
            },
            MedicalQueryResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                        type: 'object',
                        properties: {
                            type:              { type: 'string', enum: ['ANSWER', 'CLARIFICATION'] },
                            text:              { type: 'string' },
                            keyPoints:         { type: 'array', items: { type: 'string' } },
                            clinicalRelevance: { type: 'string' },
                            citations:         { type: 'array', items: { type: 'object' } },
                            confidence:        { type: 'object' },
                            trust:             { $ref: '#/components/schemas/TrustMetadata' },
                            flags:             { type: 'array', items: { type: 'string' } },
                            verified:          { type: 'boolean' },
                            log_id:            { type: 'string', description: 'MongoDB ObjectId for feedback submission' },
                            disclaimer:        { type: 'string' },
                            timestamp:         { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
            // ── Chat ──────────────────────────────────────────────────────
            ChatSession: {
                type: 'object',
                properties: {
                    session_id: { type: 'string' },
                    title:      { type: 'string' },
                    messages:   { type: 'array', items: { type: 'object' } },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' },
                },
            },
            Pagination: {
                type: 'object',
                properties: {
                    page:  { type: 'integer', example: 1 },
                    limit: { type: 'integer', example: 50 },
                    total: { type: 'integer', example: 120 },
                    pages: { type: 'integer', example: 3 },
                },
            },
        },
    },
    // Default security applied to all routes unless overridden
    security: [{ BearerAuth: [] }],
    tags: [
        { name: 'Medical',  description: 'AI-powered medical query pipeline' },
        { name: 'Chat',     description: 'Chat session persistence' },
        { name: 'Auth',     description: 'User profile management' },
        { name: 'Audit',    description: 'Feedback and admin review' },
        { name: 'Admin',    description: 'Server administration (admin only)' },
        { name: 'System',   description: 'Health check and metrics' },
    ],
};

const options = {
    definition,
    // Glob all route files for JSDoc @swagger comments
    apis: [
        path.join(__dirname, '../routes/*.js'),
        path.join(__dirname, '../index.js'),
    ],
};

module.exports = swaggerJsdoc(options);
