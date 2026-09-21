import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './authSlice';

/**
 * Redux holds CLIENT state only (the authenticated session).
 * All server state stays in React Query.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;