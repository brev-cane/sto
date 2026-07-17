/**
 * Compact count formatting for user-facing stats: 950 → "950",
 * 2140 → "2.1k", 12490 → "12k", 1500000 → "1.5M".
 */
export function formatCount(count: number): string {
  const compact = (value: number, suffix: string) => {
    const text =
      value >= 10
        ? String(Math.round(value))
        : (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, '');
    return `${text}${suffix}`;
  };
  // 999500+ would round to "1000k", so promote to the M suffix early
  if (count >= 999_500) return compact(count / 1_000_000, 'M');
  if (count >= 1_000) return compact(count / 1_000, 'k');
  return String(count);
}
