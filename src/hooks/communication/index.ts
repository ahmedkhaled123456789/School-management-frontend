import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '../../api/communication';
import type { AnnouncementPayload, CommSettings } from '../../types/communication';
import type { Role } from '../../types/common';
import { useAuth } from '../auth';
import { useMyChildren } from '../parentPortal';
import { ROOT, useMockMutation } from '../sections';
import { useStudentProfile } from '../students';
import { useTeacherProfile } from '../teachers';

const keys = {
  announcements: (v: api.Viewer) => [...ROOT, 'comm', 'announcements', v] as const,
  threads: (v: api.Viewer) => [...ROOT, 'comm', 'threads', v] as const,
  teachersOf: (id: string) => [...ROOT, 'comm', 'teachersOf', id] as const,
  notifications: (v: api.Viewer) => [...ROOT, 'comm', 'notifications', v] as const,
  outbox: [...ROOT, 'comm', 'outbox'] as const,
  settings: [...ROOT, 'comm', 'settings'] as const,
  targets: (year: string) => [...ROOT, 'comm', 'targets', year] as const
};

/**
 * Who is looking, as the mock server needs it: the teacher's id, the student
 * or the parent's children. (The real backend reads this from the token.)
 */
export function useViewer(): {role: Role | undefined;viewer: api.Viewer;ready: boolean;children: Array<{_id: string;name: string;studentId?: string;}>;} {
  const { session } = useAuth();
  const role = session?.role;
  const teacher = useTeacherProfile(role === 'teacher');
  const student = useStudentProfile(role === 'student');
  const kids = useMyChildren({}, role === 'parent');
  const children = useMemo(() => (kids.data?.items ?? []).map((c) => ({ _id: c._id, name: c.name, studentId: c.studentId })), [kids.data]);
  const viewer = useMemo<api.Viewer>(() => {
    if (role === 'teacher') return { teacherId: teacher.data?._id };
    if (role === 'student') return { studentIds: student.data ? [student.data._id] : [] };
    if (role === 'parent') return { studentIds: children.map((c) => c._id) };
    return {};
  }, [role, teacher.data, student.data, children]);
  const ready = role === 'admin' || role === 'teacher' && Boolean(teacher.data) || role === 'student' && Boolean(student.data) || role === 'parent' && Boolean(kids.data);
  return { role, viewer, ready, children };
}

/* ------------------------------- announcements ------------------------------ */

export const useAnnouncements = (viewer: api.Viewer, enabled = true) =>
useQuery({ queryKey: keys.announcements(viewer), queryFn: () => api.listAnnouncements(viewer), enabled });
export const useSaveAnnouncement = () =>
useMockMutation(({ payload, id }: {payload: AnnouncementPayload;id?: string;}) => api.saveAnnouncement(payload, id), (a) => `"${a.title}" ${a.createdAt === a.updatedAt ? 'posted' : 'updated'}.`);
export const useDeleteAnnouncement = () => useMockMutation((id: string) => api.deleteAnnouncement(id), 'Announcement deleted.');
export const useMarkAnnouncementRead = () => useMockMutation((id: string) => api.markAnnouncementRead(id), null);

/* --------------------------------- threads --------------------------------- */

export const useThreads = (viewer: api.Viewer, enabled = true) =>
useQuery({ queryKey: keys.threads(viewer), queryFn: () => api.listThreads(viewer), enabled });
export const useStudentTeachers = (studentId?: string) =>
useQuery({ queryKey: keys.teachersOf(studentId ?? ''), queryFn: () => api.listStudentTeachers(studentId as string), enabled: Boolean(studentId) });
export const useStartThread = (viewer: api.Viewer) =>
useMockMutation((p: api.StartThreadPayload) => api.startThread(p, viewer), 'Message sent.');
export const useReplyThread = (viewer: api.Viewer) =>
useMockMutation(({ id, body }: {id: string;body: string;}) => api.replyThread(id, body, viewer), null);
export const useMarkThreadRead = (viewer: api.Viewer) => useMockMutation((id: string) => api.markThreadRead(id, viewer), null);
export const useSetThreadStatus = (viewer: api.Viewer) =>
useMockMutation(({ id, status }: {id: string;status: 'open' | 'closed';}) => api.setThreadStatus(id, status, viewer), (t) => t.status === 'closed' ? 'Conversation closed.' : 'Conversation reopened.');

/* ------------------------------- notifications ------------------------------ */

export const useNotifications = (viewer: api.Viewer, enabled = true) =>
useQuery({ queryKey: keys.notifications(viewer), queryFn: () => api.listNotifications(viewer), enabled, refetchInterval: 60_000 });
export const useMarkNotificationsRead = (viewer: api.Viewer) =>
useMockMutation((ids: string[] | 'all') => api.markNotificationsRead(ids, viewer), null);

/* ---------------------------------- outbox --------------------------------- */

export const useOutbox = () => useQuery({ queryKey: keys.outbox, queryFn: api.listOutbox });
export const useCommSettings = () => useQuery({ queryKey: keys.settings, queryFn: api.getCommSettings });
export const useUpdateCommSettings = () => useMockMutation((s: CommSettings) => api.updateCommSettings(s), 'Settings saved.');
export const useAudienceTargets = (year: string) =>
useQuery({ queryKey: keys.targets(year), queryFn: () => api.listAudienceTargets(year), enabled: Boolean(year) });
