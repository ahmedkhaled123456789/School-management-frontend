import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, MessageSquarePlusIcon, MessagesSquareIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Select } from '../../components/ui/Select';
import { SkeletonText } from '../../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { Textarea } from '../../components/ui/Textarea';
import { AnnouncementList } from '../../components/communication/AnnouncementList';
import { ThreadView } from '../../components/communication/ThreadView';
import { useMarkThreadRead, useReplyThread, useSetThreadStatus, useStartThread, useStudentTeachers, useThreads, useViewer } from '../../hooks/communication';
import { usePermissions } from '../../hooks/permissions';
import { useTeacherWeek } from '../../hooks/sections';
import { useTeacherProfile } from '../../hooks/teachers';
import { PERMISSIONS } from '../../lib/permissions';
import type { Thread } from '../../types/communication';
import { cn } from '../../utils/cn';
import { sectionLabel } from '../../utils/timetable';

const ago = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

/**
 * Messages between teachers and parents (one conversation per student and
 * subject). Teacher / parent portals also get an Announcements tab; the
 * admin portal sees every conversation and can answer as the school office.
 */
export function InboxPage() {
  const { role, viewer, ready } = useViewer();
  const [params, setParams] = useSearchParams();
  const tab = role !== 'admin' && params.get('tab') === 'announcements' ? 'announcements' : 'messages';
  const selectedId = params.get('thread');
  const threads = useThreads(viewer, ready);
  const markRead = useMarkThreadRead(viewer);
  const reply = useReplyThread(viewer);
  const setStatus = useSetThreadStatus(viewer);
  const { can } = usePermissions();
  const [query, setQuery] = useState('');
  const [composing, setComposing] = useState(false);

  const me = role === 'teacher' ? 'teacher' : role === 'parent' ? 'parent' : 'office';
  const unreadOf = (t: Thread) => role === 'teacher' ? t.unread.teacher : role === 'parent' ? t.unread.parent : 0;
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (threads.data ?? []).filter((t) => !q || t.subject.toLowerCase().includes(q) || t.student.name.toLowerCase().includes(q) || t.teacher.name.toLowerCase().includes(q));
  }, [threads.data, query]);
  const selected = threads.data?.find((t) => t._id === selectedId);

  // opening a conversation marks it read
  useEffect(() => {
    if (selected && unreadOf(selected) > 0) markRead.mutate(selected._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?._id, selected?.messages.length]);

  const open = (id: string | null) => setParams(id ? { thread: id } : {}, { replace: false });
  const base = role === 'admin' ? 'Admin' : role === 'teacher' ? 'Teacher' : 'Parent';
  const canReply = role === 'teacher' || role === 'parent' || role === 'admin' && can(PERMISSIONS.STUDENTS_MANAGE);
  const canClose = role === 'teacher' || role === 'admin' && can(PERMISSIONS.STUDENTS_MANAGE);

  return (
    <>
      <PageHeader
        title={role === 'admin' ? 'Messages' : 'Messages & announcements'}
        description={role === 'admin' ? 'Every teacher–parent conversation. The school office can step in and reply.' : role === 'teacher' ? 'Talk with the parents of students you teach.' : "Talk with your children's teachers and read school announcements."}
        breadcrumbs={[{ label: base, to: `/${role}` }, { label: 'Messages' }]}
        actions={role !== 'admin' && tab === 'messages' ? <Button icon={<MessageSquarePlusIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setComposing(true)}>New message</Button> : undefined} />

      {role !== 'admin' &&
      <div role="tablist" aria-label="View" className="mb-4 inline-flex gap-1 rounded-xl bg-ink-100 p-1">
          {(['messages', 'announcements'] as const).map((t) =>
        <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setParams(t === 'announcements' ? { tab: t } : {})}
        className={cn('rounded-lg px-3.5 py-1.5 text-[13px] font-semibold', tab === t ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800')}>
              {t === 'messages' ? 'Messages' : 'Announcements'}
            </button>
        )}
        </div>
      }

      {tab === 'announcements' ?
      <AnnouncementList /> :
      threads.isError ?
      <Card><ErrorState error={threads.error} onRetry={() => threads.refetch()} /></Card> :

      <Card className="overflow-hidden">
          <div className="grid lg:grid-cols-[340px_1fr]">
            <div className={cn('border-ink-100 lg:border-e', selected && 'hidden lg:block')}>
              <div className="border-b border-ink-100 p-3"><SearchInput className="sm:w-full" value={query} onChange={setQuery} placeholder="Search conversations…" /></div>
              {!ready || threads.isLoading ?
            <div className="p-4"><SkeletonText lines={6} /></div> :
            list.length === 0 ?
            <EmptyState icon={<MessagesSquareIcon className="h-5 w-5" aria-hidden="true" />} title={query ? 'No match' : 'No conversations yet'} description={role === 'admin' ? 'Conversations appear when teachers and parents write to each other.' : 'Start one with “New message”.'} /> :

            <ul className="scrollbar-thin max-h-[60vh] divide-y divide-ink-100 overflow-y-auto">
                  {list.map((t) => {
                const unread = unreadOf(t);
                const last = t.messages[t.messages.length - 1];
                return (
                  <li key={t._id}>
                        <button type="button" onClick={() => open(t._id)} aria-current={t._id === selectedId ? 'true' : undefined}
                    className={cn('w-full px-4 py-3 text-start hover:bg-ink-50', t._id === selectedId && 'bg-primary-50/60')}>
                          <span className="flex items-center justify-between gap-2">
                            <span dir="auto" className={cn('truncate text-[13.5px] text-ink-900', unread ? 'font-extrabold' : 'font-semibold')}>{t.subject}</span>
                            <span className="shrink-0 text-[11.5px] text-ink-400">{ago(t.lastAt)}</span>
                          </span>
                          <span className="block truncate text-[12px] text-ink-500">{role === 'teacher' ? `Parents of ${t.student.name}` : role === 'parent' ? `${t.teacher.name} · ${t.student.name}` : `${t.teacher.name} ↔ parents of ${t.student.name}`}</span>
                          <span className="mt-0.5 flex items-center gap-2">
                            <span dir="auto" className="min-w-0 flex-1 truncate text-[12.5px] text-ink-600">{last?.from === me ? 'You: ' : ''}{last?.body}</span>
                            {t.status === 'closed' && <span className="text-[11px] font-semibold uppercase text-ink-400">Closed</span>}
                            {unread > 0 && <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-primary-600 px-1.5 text-[11px] font-bold text-white">{unread}<span className="sr-only"> unread</span></span>}
                          </span>
                        </button>
                      </li>);

              })}
                </ul>
            }
            </div>
            <div className={cn(!selected && 'hidden lg:block')}>
              {selected ?
            <>
                  <button type="button" onClick={() => open(null)} className="flex items-center gap-1.5 px-4 pt-3 text-[13px] font-semibold text-primary-600 lg:hidden"><ArrowLeftIcon className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />All conversations</button>
                  <ThreadView
                thread={selected}
                me={me}
                canReply={canReply}
                isSending={reply.isPending}
                onSend={(body) => reply.mutateAsync({ id: selected._id, body })}
                actions={canClose ?
                <Button size="sm" variant="ghost" isLoading={setStatus.isPending} onClick={() => setStatus.mutate({ id: selected._id, status: selected.status === 'open' ? 'closed' : 'open' })}>
                        {selected.status === 'open' ? 'Close conversation' : 'Reopen'}
                      </Button> : undefined} />
                </> :

            <div className="hidden h-full min-h-[420px] place-items-center text-[13.5px] text-ink-400 lg:grid">Choose a conversation</div>
            }
            </div>
          </div>
        </Card>
      }

      {composing && role === 'teacher' && <TeacherCompose onClose={() => setComposing(false)} onStarted={(id) => {setComposing(false);open(id);}} />}
      {composing && role === 'parent' && <ParentCompose onClose={() => setComposing(false)} onStarted={(id) => {setComposing(false);open(id);}} />}
    </>);

}

function ComposeFields({ subject, setSubject, body, setBody }: {subject: string;setSubject: (v: string) => void;body: string;setBody: (v: string) => void;}) {
  return (
    <>
      <Input id="msg-subject" label="Subject" required maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Homework in Mathematics" />
      <Textarea id="msg-body" label="Message" required rows={5} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
    </>);

}

function TeacherCompose({ onClose, onStarted }: {onClose: () => void;onStarted: (id: string) => void;}) {
  const { viewer } = useViewer();
  const profile = useTeacherProfile();
  const week = useTeacherWeek(profile.data?._id);
  const start = useStartThread(viewer);
  const [studentId, setStudentId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const students = useMemo(() => week.sections.flatMap((s) => s.students.map((st) => ({ ...st, section: sectionLabel(s) }))), [week.sections]);
  const student = students.find((s) => s._id === studentId);
  const valid = student && subject.trim().length >= 3 && body.trim();
  return (
    <Modal open onClose={onClose} title="New message to parents" size="md"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!valid} isLoading={start.isPending}
    onClick={() => student && profile.data && start.mutate({ student: { _id: student._id, name: student.name, studentId: student.studentId }, teacher: { _id: profile.data._id, name: profile.data.name }, subject, body }, { onSuccess: (t) => onStarted(t._id) })}>Send</Button></>}>
      <div className="space-y-3">
        <SearchableSelect id="msg-student" label="Student" value={studentId} onChange={setStudentId} isLoading={week.isLoading}
        emptyMessage="No students in your sections"
        options={students.map((s) => ({ value: s._id, label: s.name, description: s.section }))} hint="The parents of this student receive it." />
        <ComposeFields subject={subject} setSubject={setSubject} body={body} setBody={setBody} />
      </div>
    </Modal>);

}

function ParentCompose({ onClose, onStarted }: {onClose: () => void;onStarted: (id: string) => void;}) {
  const { viewer, children } = useViewer();
  const start = useStartThread(viewer);
  const [childId, setChildId] = useState(children[0]?._id ?? '');
  const teachers = useStudentTeachers(childId);
  const [teacherId, setTeacherId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const child = children.find((c) => c._id === childId);
  const teacher = teachers.data?.find((t) => t._id === teacherId);
  const valid = child && teacher && subject.trim().length >= 3 && body.trim();
  return (
    <Modal open onClose={onClose} title="New message to a teacher" size="md"
    footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!valid} isLoading={start.isPending}
    onClick={() => child && teacher && start.mutate({ student: { _id: child._id, name: child.name, studentId: child.studentId }, teacher: { _id: teacher._id, name: teacher.name }, subject, body }, { onSuccess: (t) => onStarted(t._id) })}>Send</Button></>}>
      <div className="space-y-3">
        {children.length > 1 &&
        <Select id="msg-child" label="About" value={childId} onChange={(e) => {setChildId(e.target.value);setTeacherId('');}} options={children.map((c) => ({ value: c._id, label: c.name }))} />
        }
        <Select id="msg-teacher" label="Teacher" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} placeholder={teachers.isLoading ? 'Loading…' : teachers.data?.length ? 'Choose a teacher' : 'No teachers yet (not placed in a section)'}
        options={(teachers.data ?? []).map((t) => ({ value: t._id, label: `${t.name}${t.homeroom ? ' (homeroom)' : ''}${t.subjects.length ? ` · ${t.subjects.join(', ')}` : ''}` }))} />
        <ComposeFields subject={subject} setSubject={setSubject} body={body} setBody={setBody} />
      </div>
    </Modal>);

}
