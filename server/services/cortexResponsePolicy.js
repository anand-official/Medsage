const PIPELINE_POLICIES = {
    greeting: {
        verified: true,
        verification_level: 'greeting',
        status_label: 'Greeting',
        advisory: 'This is a greeting response — no medical content was sourced.',
    },
    clarification: {
        verified: false,
        verification_level: 'clarification',
        status_label: 'Needs clarification',
        advisory: 'Cortex needs one more detail before it can ground the answer safely.',
    },
    off_topic_refusal: {
        verified: false,
        verification_level: 'guardrail',
        status_label: 'Medical scope guardrail',
        advisory: 'Cortex is scoped for medical education questions.',
    },
    full_rag: {
        verified: true,
        verification_level: 'verified',
        status_label: 'Verified with textbook citations',
        advisory: 'This answer was grounded in retrieved textbook chunks and citation-checked.',
    },
    direct_gemini: {
        verified: false,
        verification_level: 'unverified',
        status_label: 'Unverified direct answer',
        advisory: 'Cortex answered directly because topic confidence was not strong enough for trusted retrieval.',
    },
    direct_no_chunks: {
        verified: false,
        verification_level: 'degraded',
        status_label: 'Grounding unavailable',
        advisory: 'No sufficiently relevant textbook chunks were retrieved, so this answer was not citation-verified.',
    },
    fallback: {
        verified: false,
        verification_level: 'degraded',
        status_label: 'Fallback answer',
        advisory: 'Cortex had to fall back from the normal grounded flow. Verify this against textbooks.',
    },
    structured_fallback: {
        verified: false,
        verification_level: 'degraded',
        status_label: 'Structured fallback answer',
        advisory: 'The structured grounded response failed, so Cortex degraded to a plain-text answer.',
    },
    schema_failed: {
        verified: false,
        verification_level: 'degraded',
        status_label: 'Structure validation failed',
        advisory: 'The answer could not be validated against the structured citation contract.',
    },
    emergency_fallback: {
        verified: false,
        verification_level: 'degraded',
        status_label: 'Emergency fallback answer',
        advisory: 'Cortex encountered a pipeline failure and returned the safest fallback it could generate.',
    },
    vision: {
        verified: false,
        verification_level: 'unverified',
        status_label: 'Vision answer (unverified)',
        advisory: 'Vision responses are not citation-verified in the current Cortex pipeline.',
    },
    fast_draft: {
        verified: false,
        verification_level: 'unverified',
        status_label: 'Fast draft (unverified)',
        advisory: 'Fast Draft is optimized for speed and is not citation-verified. Use Verified mode for grounded answers.',
    },
};

function dedupeFlags(flags = []) {
    return [...new Set((flags || []).filter(Boolean))];
}

function buildTrustMetadata({
    pipeline,
    confidence = null,
    citationResult = null,
    citationCount = null,
    sourcedClaimsCount = null,
    flags = [],
    provider = 'gemini',
} = {}) {
    const policy = PIPELINE_POLICIES[pipeline] || PIPELINE_POLICIES.direct_gemini;
    const mergedFlags = dedupeFlags([
        ...(confidence?.flags || []),
        ...(flags || []),
        provider !== 'gemini' ? 'FALLBACK_LLM_USED' : null,
    ]);

    const derivedCitationCount = citationCount ?? citationResult?.citation_count ?? 0;
    const derivedSourcedClaimsCount = sourcedClaimsCount
        ?? citationResult?.claims?.filter((claim) => claim.is_sourced).length
        ?? 0;

    return {
        verified: policy.verified,
        verification_level: policy.verification_level,
        status_label: policy.status_label,
        advisory: policy.advisory,
        pipeline,
        provider,
        confidence_tier: confidence?.tier || null,
        confidence_label: confidence?.tier_label || null,
        confidence_score: confidence?.final_confidence ?? null,
        citation_count: derivedCitationCount,
        sourced_claims_count: derivedSourcedClaimsCount,
        flags: mergedFlags,
    };
}

function applyTrustMetadata(response, options = {}) {
    const pipeline = options.pipeline || response?.meta?.pipeline || 'direct_gemini';
    const trust = buildTrustMetadata({
        pipeline,
        confidence: options.confidence || response?.confidence || null,
        citationResult: options.citationResult || null,
        citationCount: options.citationCount ?? response?.meta?.citation_count ?? null,
        sourcedClaimsCount: options.sourcedClaimsCount ?? response?.meta?.sourced_claims_count ?? null,
        flags: options.flags || [],
        provider: options.provider || 'gemini',
    });

    return {
        ...response,
        trust,
        meta: {
            ...(response?.meta || {}),
            pipeline,
            trust,
        },
    };
}

module.exports = {
    applyTrustMetadata,
    buildTrustMetadata,
};
