import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import { createExam, getExam, getStudentExam, listExams, updateExam } from '../../api/exams';
import { queryKeys } from '../../lib/queryKeys';
import type { Exam, ExamPayload } from '../../types/exam';
import type { StudentQuestion } from '../../types/question';

export interface StudentExamPaper {
  exam: Exam;
  questions: StudentQuestion[];
}

/**
 * BACKEND REQUIRED — GET /api/v1/students/exam/:examID.
 * Wired up and ready; it currently rejects because the endpoint does not exist.
 * We never fall back to the teacher question endpoints, which expose correctAnswer.
 */
export function useStudentExam(examID?: string) {
  return useQuery<StudentExamPaper>({
    queryKey: ['studentExam', examID ?? ''],
    queryFn: ({ signal }) => getStudentExam(examID as string, signal),
    enabled: Boolean(examID),
    retry: false,
    staleTime: 0
  });
}

export function useExams() {
  return useQuery({
    queryKey: queryKeys.exams,
    queryFn: ({ signal }) => listExams(signal)
  });
}

export function useExam(id?: string) {
  return useQuery({
    queryKey: queryKeys.exam(id ?? ''),
    queryFn: ({ signal }) => getExam(id as string, signal),
    enabled: Boolean(id)
  });
}

export function useCreateExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ExamPayload) => createExam(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exams });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}

export function useUpdateExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: {id: string;payload: Partial<ExamPayload>;}) =>
    updateExam(id, payload),
    onSuccess: (_data, variables) => {
      toast.success('Exam updated.');
      queryClient.invalidateQueries({ queryKey: queryKeys.exams });
      queryClient.invalidateQueries({ queryKey: queryKeys.exam(variables.id) });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}