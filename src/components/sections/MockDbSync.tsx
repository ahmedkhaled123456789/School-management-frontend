import { useMockDbSync } from '../../hooks/sections';

/** Refreshes mock-backed data when another tab changes it. Renders nothing. */
export function MockDbSync() {
  useMockDbSync();
  return null;
}
