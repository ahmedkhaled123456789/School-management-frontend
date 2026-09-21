import React from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/auth';
import { homePathForRole, loginPathForRole } from '../../lib/routes';
import type { Role } from '../../types/common';
import { Button } from '../ui/Button';
import { UnauthorizedState } from '../ui/States';

/**
 * Guards a route subtree. Frontend role checks are a UX affordance only —
 * the backend remains responsible for real authorization.
 */
export function ProtectedRoute({ allow }: {allow: Role;}) {
  const { session, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !session) {
    return <Navigate to={loginPathForRole[allow]} state={{ from: location.pathname }} replace />;
  }

  if (session.role !== allow) {
    return (
      <UnauthorizedState
        message={`This area is for ${allow} accounts. You are signed in as a ${session.role}.`}
        action={
        <Link to={homePathForRole[session.role]}>
            <Button>Go to my dashboard</Button>
          </Link>
        } />);


  }

  return <Outlet />;
}

export function RoleRedirect() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login/admin" replace />;
  return <Navigate to={homePathForRole[session.role]} replace />;
}

export function NotFoundPage() {
  const { session } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <p className="font-mono text-[13px] font-semibold uppercase tracking-widest text-primary-500">
        404
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-ink-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-500">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to={session ? homePathForRole[session.role] : '/login/admin'} className="mt-6">
        <Button>{session ? 'Back to dashboard' : 'Go to sign in'}</Button>
      </Link>
    </div>);

}