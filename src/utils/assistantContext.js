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

// Backend accepts up to 2000 chars per history item and 8000 chars total budget.
// Token budget of 2000 ≈ 8000 chars at 4 chars/token.
export function buildHistoryForRequest(messages, tokenBudget = 2000) {
  const turns = messages
    .filter((m) => m.role === 'user' || m.role === 'ai')
    .map((m) => {
      const raw = m.role === 'user' ? m.text : (m.response?.text || '');
      // Hard cap per item matches backend validation limit
      const content = raw.length > 2000 ? raw.slice(0, 2000) + '…' : raw;
      return {
        role: m.role,
        content,
        salience: scoreSalience(content),
        tokens: estimateTokenCount(content),
      };
    })
    .filter((m) => m.content.trim());

  if (turns.length === 0) return [];

  const selected = [];
  let usedTokens = 0;

  // Always include turns from newest → oldest until budget is full.
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const turn = turns[i];
    if (usedTokens + turn.tokens > tokenBudget) break;
    selected.push(turn);
    usedTokens += turn.tokens;
  }

  return selected
    .sort((a, b) => turns.indexOf(a) - turns.indexOf(b))
    .map(({ role, content }) => ({ role, content }));
}
