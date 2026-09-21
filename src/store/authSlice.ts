import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { tokenStore } from '../api/client';
import type { AuthUser, Session } from '../types/auth';
import type { Role } from '../types/common';

export interface AuthState {
  token: string | null;
  role: Role | null;
  user: AuthUser | null;
}

/** Rehydrate from the JWT the API client persisted, so a refresh keeps the session. */
function hydrateFromStorage(): AuthState {
  const token = tokenStore.getToken();
  const role = tokenStore.getRole();
  if (!token || !role) return { token: null, role: null, user: null };
  return { token, role, user: tokenStore.getUser<AuthUser>() ?? { _id: '', role } };
}

const authSlice = createSlice({
  name: 'auth',
  initialState: hydrateFromStorage(),
  reducers: {
    sessionEstablished(state, action: PayloadAction<Session>) {
      state.token = action.payload.token;
      state.role = action.payload.role;
      state.user = action.payload.user;
    },
    sessionCleared(state) {
      state.token = null;
      state.role = null;
      state.user = null;
    }
  }
});

export const { sessionEstablished, sessionCleared } = authSlice.actions;
export const authReducer = authSlice.reducer;