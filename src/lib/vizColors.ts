/** Chart colors (CSS variables in index.css, validated with the data-viz checks). */
export const SERIES = ['var(--viz-series-1)', 'var(--viz-series-2)', 'var(--viz-series-3)', 'var(--viz-series-4)'];

/** Reserved for real status meaning; always shown with a text label. */
export const STATUS = {
  good: 'var(--viz-good)',
  warning: 'var(--viz-warning)',
  serious: 'var(--viz-serious)',
  critical: 'var(--viz-critical)'
} as const;
