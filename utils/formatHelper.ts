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

/**
 * Coarse "how long ago" label for timestamps we show next to data the user
 * can refresh (saved location, sync state). Deliberately low-resolution —
 * the exact minute never matters, only whether it's current or old.
 */
export function formatRelativeTime(timestampMs: number): string {
  const elapsed = Date.now() - timestampMs;
  // Clock skew between the device and the server can put a fresh write a few
  // seconds in the future; "just now" is truer than a negative age.
  if (elapsed < 60_000) return 'just now';

  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;

  return 'over a month ago';
}
