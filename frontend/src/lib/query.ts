import { QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from './api';
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
      refetchOnWindowFocus: true,
    },
  },
});
export function useAction<TInput, TOutput>(
  fn: (input: TInput) => Promise<TOutput>,
  message: string,
  onSuccess?: (data: TOutput) => void,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      void client.invalidateQueries();
      toast.success(message);
      onSuccess?.(data);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
