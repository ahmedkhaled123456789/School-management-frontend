import type { ChildResult, ParentChild } from '../types/parentPortal';

/** The current class level is the last one in classLevels (populated with names). */
export function childClassLabel(child?: Pick<ParentChild, 'classLevels'> | null): string {
  const levels = child?.classLevels ?? [];
  return levels[levels.length - 1]?.name || '—';
}

/** "85%" from the stored grade (percentage); falls back to the raw score. */
export function resultGradeLabel(result: ChildResult): string {
  if (typeof result.grade === 'number') return `${result.grade}%`;
  if (typeof result.score === 'number') return String(result.score);
  return '—';
}
