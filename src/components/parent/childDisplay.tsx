import { Badge } from '../ui/Badge';
import type { ChildResult, ParentChild } from '../../types/parentPortal';

export function ChildStatusBadge({
  child


}: {child?: Pick<ParentChild, 'isSuspended' | 'isWithdrawn' | 'isGraduated'> | null;}) {
  if (child?.isWithdrawn) return <Badge tone="warn">Withdrawn</Badge>;
  if (child?.isSuspended) return <Badge tone="danger">Suspended</Badge>;
  if (child?.isGraduated) return <Badge tone="info">Graduated</Badge>;
  return <Badge tone="success">Active</Badge>;
}

export function ResultStatusBadge({ result }: {result: ChildResult;}) {
  return (
    <Badge tone={result.status === 'Pass' ? 'success' : 'danger'}>{result.status ?? '—'}</Badge>);

}
