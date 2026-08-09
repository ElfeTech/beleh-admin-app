/** Convert token usage → credits (ceil). Returns null if mapping is unset. */
export function tokensToCreditsUsed(
  tokens: number | null | undefined,
  tokensPerCredit: number | null | undefined,
): number | null {
  if (tokens == null || Number.isNaN(tokens)) return null;
  if (tokensPerCredit == null || tokensPerCredit <= 0) return null;
  if (tokens <= 0) return 0;
  return Math.ceil(tokens / tokensPerCredit);
}

/**
 * Convert a token limit → credit limit (floor).
 * -1 stays unlimited. Returns null if mapping is unset.
 */
export function tokensToCreditsLimit(
  tokenLimit: number | null | undefined,
  tokensPerCredit: number | null | undefined,
): number | null {
  if (tokenLimit == null || Number.isNaN(tokenLimit)) return null;
  if (tokenLimit === -1) return -1;
  if (tokensPerCredit == null || tokensPerCredit <= 0) return null;
  return Math.floor(tokenLimit / tokensPerCredit);
}

export function formatCreditsLimit(limit: number | null | undefined): string {
  if (limit == null) return '—';
  if (limit === -1) return 'Unlimited';
  return new Intl.NumberFormat('en-US').format(limit);
}
