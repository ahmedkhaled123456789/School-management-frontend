import React, { useEffect } from 'react';
import { UNAUTHORIZED_EVENT, tokenStore } from '../../api/client';
import { useAuth } from '../../hooks/auth';

/**
 * Central 401 handling: the API client fires UNAUTHORIZED_EVENT on any unauthorized
 * response, which clears the Redux session, wipes the query cache and redirects.
 */
export function SessionWatcher({ children }: {children: React.ReactNode;}) {
  const { signOut, isAuthenticated } = useAuth();

  useEffect(() => {
    const handler = () => {
      if (!isAuthenticated && !tokenStore.getToken()) return;
      signOut({ expired: true });
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handler);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
  }, [signOut, isAuthenticated]);

  return <>{children}</>;
}