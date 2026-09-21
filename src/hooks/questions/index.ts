import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import {
  createQuestion,
  deleteQuestion,
  getQuestion,
  listQuestions,
  updateQuestion } from
'../../api/questions';
import { queryKeys } from '../../lib/queryKeys';
import type { Question, QuestionPayload } from '../../types/question';
import type { PaginatedResult } from '../../types/common';

/**
 * The backend exposes a flat question list, so we scope it to an exam client-side
 * using the exam's `questions` id array. Teacher/admin surfaces only.
 */
export function useQuestions(examID?: string, questionIDs?: string[]) {
  return useQuery({
    queryKey: queryKeys.questions(examID ?? ''),
    queryFn: async ({ signal }): Promise<PaginatedResult<Question>> => {
      const result = await listQuestions(signal);
      if (!questionIDs || questionIDs.length === 0) return result;
      const allowed = new Set(questionIDs);
      const items = result.items.filter((question) => allowed.has(question._id));
      return { ...result, items, results: items.length, total: items.length };
    },
    enabled: Boolean(examID)
  });
}

export function useQuestion(id?: string) {
  return useQuery({
    queryKey: queryKeys.question(id ?? ''),
    queryFn: ({ signal }) => getQuestion(id as string, signal),
    enabled: Boolean(id)
  });
}

export function useCreateQuestion(examID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: QuestionPayload) => createQuestion(examID, payload),
    onSuccess: () => {
      toast.success('Question added.');
      queryClient.invalidateQueries({ queryKey: queryKeys.questions(examID) });
      queryClient.invalidateQueries({ queryKey: queryKeys.exam(examID) });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useUpdateQuestion(examID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: {id: string;payload: QuestionPayload;}) =>
    updateQuestion(id, payload),
    onSuccess: (_data, variables) => {
      toast.success('Question updated.');
      queryClient.invalidateQueries({ queryKey: queryKeys.questions(examID) });
      queryClient.invalidateQueries({ queryKey: queryKeys.question(variables.id) });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

/*
 * BACKEND REQUIRED — DELETE /api/v1/questions/:id is not documented in the API
 * contract. The service function exists but this hook must stay unused until the
 * backend confirms the route.
 */
export function useDeleteQuestion(examID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteQuestion(id),
    onSuccess: () => {
      toast.success('Question removed.');
      queryClient.invalidateQueries({ queryKey: queryKeys.questions(examID) });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}