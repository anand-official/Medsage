export function estimateTokenCount(text = '') {
  return Math.ceil((text || '').length / 4);
}

export function scoreSalience(text = '') {
  const t = text.toLowerCase();
  let score = 0;
  if (t.includes('?')) score += 1;
  if (/\b(why|how|differentiate|compare|management|diagnosis|mechanism)\b/.test(t)) score += 2;
  if (/\b(diabetes|hypertension|cancer|inflammation|necrosis|drug|pathology|anatomy|physiology)\b/.test(t)) score += 2;
  if (t.length > 180) score += 1;
  return score;
}

function truncateForHistory(text = '', maxLength = 700) {
  const value = (text || '').trim();
  if (!value) return '';
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

function buildAiHistoryContent(message = {}) {
  const response = message.response || {};
  const segments = [];

  if (response.partial_answer) {
    segments.push(`Partial answer: ${truncateForHistory(response.partial_answer, 900)}`);
  } else if (response.text) {
    segments.push(truncateForHistory(response.text, 900));
  } else if (message.text) {
    segments.push(truncateForHistory(message.text, 900));
  }

  const claimTexts = Array.isArray(response.claims)
    ? response.claims
        .map((claim) => claim?.text || claim?.statement || '')
        .filter(Boolean)
        .slice(0, 3)
    : [];

  if (claimTexts.length > 0) {
    segments.push(`Key claims: ${claimTexts.map((text) => truncateForHistory(text, 220)).join(' | ')}`);
  } else if (Array.isArray(response.keyPoints) && response.keyPoints.length > 0) {
    segments.push(`Key points: ${response.keyPoints.slice(0, 4).map((text) => truncateForHistory(text, 180)).join(' | ')}`);
  }

  if (response.clinicalRelevance) {
    segments.push(`Clinical note: ${truncateForHistory(response.clinicalRelevance, 260)}`);
  }

  return segments.filter(Boolean).join('\n');
}

// Backend accepts up to 2000 chars per history item and 8000 chars total budget.
// Token budget of 2000 ≈ 8000 chars at 4 chars/token.
export function buildHistoryForRequest(messages, tokenBudget = 2000) {
  const turns = messages
    .filter((m) => m.role === 'user' || m.role === 'ai')
    .map((m) => {
      const raw = m.role === 'user' ? (m.text || '') : buildAiHistoryContent(m);
      // Hard cap per item matches backend validation limit
      const content = raw.length > 2000 ? raw.slice(0, 2000) + '…' : raw;
      return {
        role: m.role,
        content,
        salience: scoreSalience(content),
        tokens: estimateTokenCount(content),
        index: 0,
      };
    })
    .filter((m) => m.content.trim())
    .map((turn, index) => ({ ...turn, index }));

  if (turns.length === 0) return [];

  const selected = [];
  const selectedIndices = new Set();
  let usedTokens = 0;

  const anchorIndices = [];
  if (turns.length >= 1) anchorIndices.push(turns.length - 1);
  if (turns.length >= 2) anchorIndices.unshift(turns.length - 2);

  for (const idx of anchorIndices) {
    const turn = turns[idx];
    if (!turn || selectedIndices.has(idx)) continue;
    if (usedTokens + turn.tokens > tokenBudget && selected.length > 0) continue;
    selected.push(turn);
    selectedIndices.add(idx);
    usedTokens += turn.tokens;
  }

  const candidates = turns
    .filter((turn) => !selectedIndices.has(turn.index))
    .sort((a, b) => {
      if (b.salience !== a.salience) return b.salience - a.salience;
      return b.index - a.index;
    });

  for (const turn of candidates) {
    if (usedTokens + turn.tokens > tokenBudget) continue;
    selected.push(turn);
    selectedIndices.add(turn.index);
    usedTokens += turn.tokens;
  }

  return selected
    .sort((a, b) => a.index - b.index)
    .map(({ role, content }) => ({ role, content }));
}
