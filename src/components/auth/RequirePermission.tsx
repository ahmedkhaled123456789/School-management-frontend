import { Link, Outlet } from 'react-router-dom';
import { usePermissions } from '../../hooks/permissions';
import type { Permission } from '../../lib/permissions';
import { Button } from '../ui/Button';
import { UnauthorizedState } from '../ui/States';

/**
 * Guards admin-portal pages by permission. A UX affordance only:
 * the backend checks the same permission on every request.
 */
export function RequirePermission({ permission }: {permission: Permission;}) {
  const { can } = usePermissions();
  if (!can(permission)) {
    return (
      <UnauthorizedState
        message="Your role does not include access to this section. Ask a super admin if you need it."
        action={
        <Link to="/admin">
            <Button>Back to dashboard</Button>
          </Link>
        } />);


  }
  return <Outlet />;
}
