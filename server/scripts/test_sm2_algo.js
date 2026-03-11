/**
 * SM-2 Algorithm Unit Tests
 * Run: node scripts/test_sm2_algo.js
 */

const sm2Service = require('../services/sm2Service');

let passed = 0;
let failed = 0;

function assert(condition, label) {
    if (condition) {
        console.log(`  ✅ PASS — ${label}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL — ${label}`);
        failed++;
    }
}

console.log('\n======================================');
console.log('🧪 SM-2 Algorithm Unit Tests');
console.log('======================================\n');

// Test 1: New card, first perfect recall (quality=5)
{
    console.log('[Test 1] First review, perfect recall (q=5)');
    const base = { ease_factor: 2.5, interval_days: 0, repetitions: 0 };
    const r = sm2Service.applyReview(base, 5);
    assert(r.interval_days === 1, 'interval_days = 1 (first rep)');
    assert(r.repetitions === 1, 'repetitions = 1');
    assert(r.ease_factor > 2.5, `ease_factor increased (${r.ease_factor})`);
    assert(r.next_review > new Date(), 'next_review is in the future');
}

// Test 2: Second review, good recall (quality=4)
{
    console.log('\n[Test 2] Second review, good recall (q=4)');
    const base = { ease_factor: 2.6, interval_days: 1, repetitions: 1 };
    const r = sm2Service.applyReview(base, 4);
    assert(r.interval_days === 6, 'interval_days = 6 (second rep)');
    assert(r.repetitions === 2, 'repetitions = 2');
}

// Test 3: Third review, good recall — interval should grow by ease_factor
{
    console.log('\n[Test 3] Third review, good recall (q=4, ef=2.6)');
    const base = { ease_factor: 2.6, interval_days: 6, repetitions: 2 };
    const r = sm2Service.applyReview(base, 4);
    const expected = Math.round(6 * 2.6);
    assert(r.interval_days === expected, `interval_days = ${expected} (6 × 2.6)`);
    assert(r.repetitions === 3, 'repetitions = 3');
}

// Test 4: Failed recall (quality=1) — should reset
{
    console.log('\n[Test 4] Failed recall (q=1) — should reset');
    const base = { ease_factor: 2.5, interval_days: 15, repetitions: 5 };
    const r = sm2Service.applyReview(base, 1);
    assert(r.interval_days === 1, 'interval reset to 1');
    assert(r.repetitions === 0, 'repetitions reset to 0');
    assert(r.ease_factor >= 1.3, `ease_factor ≥ 1.3 floor (${r.ease_factor})`);
}

// Test 5: ease_factor never goes below 1.3
{
    console.log('\n[Test 5] ease_factor floor protection (q=0, ef=1.4)');
    const base = { ease_factor: 1.4, interval_days: 1, repetitions: 0 };
    const r = sm2Service.applyReview(base, 0);
    assert(r.ease_factor >= 1.3, `ease_factor floored at 1.3 (got ${r.ease_factor})`);
}

// Test 6: Border quality q=3 (minimum pass)
{
    console.log('\n[Test 6] Border pass (q=3)');
    const base = { ease_factor: 2.5, interval_days: 0, repetitions: 0 };
    const r = sm2Service.applyReview(base, 3);
    assert(r.repetitions === 1, 'repetitions incremented');
    assert(r.interval_days === 1, 'interval = 1 for first rep');
}

// Test 7: Invalid quality throws
{
    console.log('\n[Test 7] Invalid quality throws error');
    try {
        sm2Service.applyReview({ ease_factor: 2.5, interval_days: 0, repetitions: 0 }, 6);
        assert(false, 'should have thrown');
    } catch (e) {
        assert(e.message.includes('0–5'), `threw correctly: "${e.message}"`);
    }
}

// Summary
console.log(`\n======================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`======================================\n`);
if (failed > 0) process.exit(1);
