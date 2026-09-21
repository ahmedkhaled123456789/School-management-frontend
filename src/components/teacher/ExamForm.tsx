import React, { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { useAcademicTerms } from '../../hooks/academicTerms';
import { useAcademicYears } from '../../hooks/academicYears';
import { useClassLevels } from '../../hooks/classes';
import { usePrograms } from '../../hooks/programs';
import { useSubjects } from '../../hooks/subjects';
import type { Exam, ExamPayload } from '../../types/exam';

export type ExamFormValues = Record<keyof ExamPayload, string>;

const EMPTY: ExamFormValues = {
  name: '',
  description: '',
  subject: '',
  program: '',
  academicTerm: '',
  academicYear: '',
  classLevel: '',
  duration: '',
  examDate: '',
  examTime: '',
  examType: ''
};

function toValues(exam?: Exam | null): ExamFormValues {
  if (!exam) return EMPTY;
  const asId = (value: unknown) => typeof value === 'string' ? value : '';
  return {
    name: exam.name ?? '',
    description: exam.description ?? '',
    subject: asId(exam.subject),
    program: asId(exam.program),
    academicTerm: asId(exam.academicTerm),
    academicYear: asId(exam.academicYear),
    classLevel: asId(exam.classLevel),
    duration: exam.duration ?? '',
    examDate: exam.examDate ? exam.examDate.slice(0, 10) : '',
    examTime: exam.examTime ?? '',
    examType: exam.examType ?? ''
  };
}

interface ExamFormProps {
  initial?: Exam | null;
  onSubmit: (payload: ExamPayload) => Promise<unknown> | void;
  isSaving: boolean;
  submitLabel: string;
  onCancel?: () => void;
}

export function ExamForm({ initial, onSubmit, isSaving, submitLabel, onCancel }: ExamFormProps) {
  const [values, setValues] = useState<ExamFormValues>(() => toValues(initial));
  const [errors, setErrors] = useState<Partial<ExamFormValues>>({});

  const subjects = useSubjects();
  const programs = usePrograms();
  const terms = useAcademicTerms();
  const years = useAcademicYears();
  const classLevels = useClassLevels();

  const options = useMemo(
    () => ({
      subjects: (subjects.data?.items ?? []).map((item) => ({ value: item._id, label: item.name })),
      programs: (programs.data?.items ?? []).map((item) => ({ value: item._id, label: item.name })),
      terms: (terms.data?.items ?? []).map((item) => ({ value: item._id, label: item.name })),
      years: (years.data?.items ?? []).map((item) => ({ value: item._id, label: item.name })),
      classLevels: (classLevels.data?.items ?? []).map((item) => ({
        value: item._id,
        label: item.name
      }))
    }),
    [subjects.data, programs.data, terms.data, years.data, classLevels.data]
  );

  const set = (key: keyof ExamFormValues) => (
  event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
  setValues((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Partial<ExamFormValues> = {};
    if (!values.name.trim()) nextErrors.name = 'Exam name is required.';
    if (!values.subject) nextErrors.subject = 'Select the subject being examined.';
    if (!values.program) nextErrors.program = 'Select the program.';
    if (!values.academicTerm) nextErrors.academicTerm = 'Select the academic term.';
    if (!values.academicYear) nextErrors.academicYear = 'Select the academic year.';
    if (!values.classLevel) nextErrors.classLevel = 'Select the class level.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit({
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      subject: values.subject,
      program: values.program,
      academicTerm: values.academicTerm,
      academicYear: values.academicYear,
      classLevel: values.classLevel,
      duration: values.duration.trim() || undefined,
      examDate: values.examDate || undefined,
      examTime: values.examTime || undefined,
      examType: values.examType.trim() || undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="exam-name"
          label="Exam name"
          required
          value={values.name}
          error={errors.name}
          placeholder="e.g. Physics Mid-Term"
          onChange={set('name')}
          className="sm:col-span-1" />
        
        <Input
          id="exam-type"
          label="Exam type"
          value={values.examType}
          placeholder="e.g. Quiz, Mid-term, Final"
          onChange={set('examType')} />
        
      </div>

      <Textarea
        id="exam-description"
        label="Description"
        rows={3}
        value={values.description}
        placeholder="What this paper covers…"
        onChange={set('description')} />
      

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="exam-subject"
          label="Subject"
          required
          options={options.subjects}
          value={values.subject}
          error={errors.subject}
          placeholder={subjects.isLoading ? 'Loading…' : 'Select subject'}
          onChange={set('subject')} />
        
        <Select
          id="exam-program"
          label="Program"
          required
          options={options.programs}
          value={values.program}
          error={errors.program}
          placeholder={programs.isLoading ? 'Loading…' : 'Select program'}
          onChange={set('program')} />
        
        <Select
          id="exam-term"
          label="Academic term"
          required
          options={options.terms}
          value={values.academicTerm}
          error={errors.academicTerm}
          placeholder={terms.isLoading ? 'Loading…' : 'Select term'}
          onChange={set('academicTerm')} />
        
        <Select
          id="exam-year"
          label="Academic year"
          required
          options={options.years}
          value={values.academicYear}
          error={errors.academicYear}
          placeholder={years.isLoading ? 'Loading…' : 'Select year'}
          onChange={set('academicYear')} />
        
        <Select
          id="exam-class"
          label="Class level"
          required
          options={options.classLevels}
          value={values.classLevel}
          error={errors.classLevel}
          placeholder={classLevels.isLoading ? 'Loading…' : 'Select class level'}
          onChange={set('classLevel')} />
        
        <Input
          id="exam-duration"
          label="Duration"
          value={values.duration}
          placeholder="e.g. 30 minutes"
          onChange={set('duration')} />
        
        <Input
          id="exam-date"
          label="Exam date"
          type="date"
          value={values.examDate}
          onChange={set('examDate')} />
        
        <Input
          id="exam-time"
          label="Exam time"
          type="time"
          value={values.examTime}
          onChange={set('examTime')} />
        
      </div>

      <div className="flex justify-end gap-2">
        {onCancel &&
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
        }
        <Button type="submit" isLoading={isSaving}>
          {submitLabel}
        </Button>
      </div>
    </form>);

}