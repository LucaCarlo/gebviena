/**
 * Number formatting helpers — locale it-IT (separatore migliaia "." e decimali ",").
 *
 * formatNumber(1234)        → "1.234"
 * formatNumber(1234.5, 1)   → "1.234,5"
 * formatNumber(null)        → "—"
 */
export function formatNumber(
  n: number | null | undefined,
  decimals = 0,
  fallback = "—",
): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return fallback;
  return n.toLocaleString("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
