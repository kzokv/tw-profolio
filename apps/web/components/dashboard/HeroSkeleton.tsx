"use client";

/**
 * Skeleton for the page hero/banner. One big line (title), two smaller lines (subtitle).
 * Preserves layout to avoid shift when real content loads.
 */
export function HeroSkeleton() {
  return (
    <div
      className="mb-6 rounded-2xl border border-line bg-surface px-5 py-4 shadow-card"
      aria-hidden="true"
      data-testid="hero-skeleton"
    >
      <div className="skeleton-line h-3 w-24 rounded" />
      <div className="skeleton-line skeleton-line--delay mt-2 h-8 w-48 rounded" />
      <div className="skeleton-line skeleton-line--delay mt-2 h-4 w-full max-w-md rounded" />
      <div className="skeleton-line skeleton-line--delay mt-2 h-4 w-3/4 max-w-sm rounded" />
    </div>
  );
}
