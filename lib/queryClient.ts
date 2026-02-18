
// Fix: Importing QueryClient from @tanstack/react-query.
// QueryClient is the core class required to create a central state manager for TanStack Query.
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      // gcTime is used in TanStack Query v5 (replaces cacheTime)
      gcTime: 1000 * 60 * 60, // 1 hour
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
