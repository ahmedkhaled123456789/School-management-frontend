import React, { useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { QuestionCard } from '../../components/teacher/QuestionCard';
import { QuestionEditor } from '../../components/teacher/QuestionEditor';
import { useQuestions, useUpdateQuestion } from '../../hooks/questions';
import type { Question } from '../../types/question';

/** Scope used for the full question bank (no single exam). */
const BANK_SCOPE = 'all';

export function TeacherQuestions() {
  const query = useQuestions(BANK_SCOPE);
  const update = useUpdateQuestion(BANK_SCOPE);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Question | null>(null);

  const questions = useMemo(() => {
    const items = query.data?.items ?? [];
    if (!search.trim()) return items;
    const needle = search.trim().toLowerCase();
    return items.filter((item) => item.question.toLowerCase().includes(needle));
  }, [query.data, search]);

  return (
    <>
      <PageHeader
        title="Questions"
        description="Every question in the bank, with its correct answer highlighted. Students never receive this view."
        breadcrumbs={[{ label: 'Teacher', to: '/teacher' }, { label: 'Questions' }]} />
      

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search question text…" />
      </div>

      {query.isError ?
      <Card>
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </Card> :
      query.isLoading ?
      <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) =>
        <Skeleton key={index} className="h-40 w-full rounded-xl" />
        )}
        </div> :
      questions.length === 0 ?
      <Card>
          <EmptyState
          title={search ? 'No questions match your search' : 'No questions added yet'}
          description={
          search ?
          'Try different wording.' :
          'Questions are written inside an exam. Open an exam to add questions to it.'
          } />
        
        </Card> :

      <div className="space-y-4">
          {questions.map((question, index) =>
        <QuestionCard
          key={question._id}
          question={question}
          index={index + 1}
          onEdit={() => setEditing(question)} />

        )}
        </div>
      }

      <QuestionEditor
        open={Boolean(editing)}
        initial={editing}
        isSaving={update.isPending}
        onClose={() => setEditing(null)}
        onSubmit={(payload) =>
        update.mutateAsync({ id: editing?._id as string, payload })
        } />
      
    </>);

}