import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Never retry auth/permission/validation failures — only transient ones.
        if (error instanceof ApiError) {
          if (['unauthorized', 'forbidden', 'notFound', 'validation'].includes(error.kind)) {
            return false;
          }
        }
        return failureCount < 2;
      }
    },
    mutations: {
      retry: false
    }
  }
});