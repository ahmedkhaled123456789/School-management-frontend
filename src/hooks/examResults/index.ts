import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import { getExamResult, listExamResults, toggleResultPublish } from '../../api/examResults';
import { queryKeys } from '../../lib/queryKeys';

export function useExamResults() {
  return useQuery({
    queryKey: queryKeys.examResults,
    queryFn: ({ signal }) => listExamResults(signal)
  });
}

export function useExamResult(id?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.examResult(id ?? ''),
    queryFn: ({ signal }) => getExamResult(id as string, signal),
    enabled: Boolean(id) && enabled
  });
}

export function useToggleResultPublish() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, publish }: {id: string;publish: boolean;}) =>
    toggleResultPublish(id, { publish }),
    onSuccess: (_data, variables) => {
      toast.success(variables.publish ? 'Result published.' : 'Result unpublished.');
      queryClient.invalidateQueries({ queryKey: queryKeys.examResults });
      queryClient.invalidateQueries({ queryKey: queryKeys.examResult(variables.id) });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}