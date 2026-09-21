import { useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { login } from '../../api/auth';
import { errorMessage, tokenStore } from '../../api/client';
import { homePathForRole, loginPathForRole } from '../../lib/routes';
import { sessionCleared, sessionEstablished } from '../../store/authSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { LoginPayload, Session } from '../../types/auth';
import type { Role } from '../../types/common';

interface UseAuthResult {
  session: Session | null;
  role: Role | null;
  isAuthenticated: boolean;
  signIn: (session: Session) => void;
  signOut: (options?: {silent?: boolean;expired?: boolean;}) => void;
}

/** Reads the session from Redux and owns the side effects of signing in/out. */
export function useAuth(): UseAuthResult {
  const auth = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const session = useMemo<Session | null>(
    () =>
    auth.token && auth.role ?
    { token: auth.token, role: auth.role, user: auth.user ?? { _id: '', role: auth.role } } :
    null,
    [auth.token, auth.role, auth.user]
  );

  const signIn = useCallback(
    (next: Session) => {
      tokenStore.set(next.token, next.role, next.user);
      dispatch(sessionEstablished(next));
    },
    [dispatch]
  );

  const signOut = useCallback(
    (options?: {silent?: boolean;expired?: boolean;}) => {
      const previousRole = auth.role ?? tokenStore.getRole() ?? 'admin';
      tokenStore.clear();
      dispatch(sessionCleared());
      // Drop every cached server response so no protected data survives logout.
      queryClient.clear();
      if (!options?.silent) {
        toast[options?.expired ? 'error' : 'success'](
          options?.expired ?
          'Your session expired. Please sign in again.' :
          'You have been signed out.'
        );
      }
      navigate(loginPathForRole[previousRole], { replace: true });
    },
    [auth.role, dispatch, navigate, queryClient]
  );

  return {
    session,
    role: auth.role,
    isAuthenticated: Boolean(auth.token),
    signIn,
    signOut
  };
}

export function useLogin(role: Role) {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(role, payload),
    onSuccess: (data) => {
      if (!data.token) {
        toast.error('Login succeeded but no token was returned by the server.');
        return;
      }
      signIn({ token: data.token, role, user: data.user });
      toast.success(`Welcome back${data.user.name ? `, ${data.user.name}` : ''}.`);
      navigate(homePathForRole[role], { replace: true });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useLogout() {
  const { signOut } = useAuth();
  return signOut;
}