import { useQuery } from '@tanstack/react-query';
import * as api from '../../api/admissions';
import * as certs from '../../api/certificates';
import type { AdmissionSettings, ApplicationPayload, EntranceTest } from '../../types/admissions';
import type { CertificatePayload, CertificateSettings } from '../../types/certificates';
import type { Ref } from '../../types/sections';
import { ROOT, useMockMutation } from '../sections';

const keys = {
  publicInfo: [...ROOT, 'admissions', 'public'] as const,
  list: (year: string) => [...ROOT, 'admissions', 'list', year] as const,
  one: (id: string) => [...ROOT, 'admissions', 'one', id] as const,
  seats: (year: string) => [...ROOT, 'admissions', 'seats', year] as const,
  settings: [...ROOT, 'admissions', 'settings'] as const,
  certs: (studentId?: string) => [...ROOT, 'certificates', 'list', studentId ?? 'all'] as const,
  certSettings: [...ROOT, 'certificates', 'settings'] as const
};

/* -------------------------------- admissions ------------------------------- */

export const usePublicAdmissionInfo = () => useQuery({ queryKey: keys.publicInfo, queryFn: api.getPublicAdmissionInfo });
export const useApplyOnline = () => useMockMutation((p: ApplicationPayload) => api.applyOnline(p), null);
export const useCheckApplicationStatus = () =>
useMockMutation(({ reference, email }: {reference: string;email: string;}) => api.checkApplicationStatus(reference, email), null);

export const useApplications = (year: string) => useQuery({ queryKey: keys.list(year), queryFn: () => api.listApplications(year), enabled: Boolean(year) });
export const useApplication = (id?: string) => useQuery({ queryKey: keys.one(id ?? ''), queryFn: () => api.getApplication(id as string), enabled: Boolean(id), retry: false });
export const useSeats = (year: string) => useQuery({ queryKey: keys.seats(year), queryFn: () => api.listSeats(year), enabled: Boolean(year) });
export const useAdmissionSettings = () => useQuery({ queryKey: keys.settings, queryFn: api.getAdmissionSettings });

export const useAddApplication = () => useMockMutation((p: ApplicationPayload) => api.addApplication(p), (a) => `Application ${a.reference} added.`);
export const useScheduleTest = () =>
useMockMutation(({ id, test }: {id: string;test: EntranceTest;}) => api.scheduleTest(id, test), (a) => `Test scheduled for ${a.applicant.name}. The family was emailed.`);
export const useRecordScore = () =>
useMockMutation(({ id, score, notes }: {id: string;score: number;notes?: string;}) => api.recordScore(id, score, notes), (a) => `Score saved: ${a.score}/100.`);
export const useDecide = () =>
useMockMutation(
  ({ id, decision, note }: {id: string;decision: 'accepted' | 'waitlisted' | 'rejected';note?: string;}) => api.decide(id, decision, note),
  (a) => a.status === 'accepted' ? `${a.applicant.name} accepted. The family was emailed.` : a.status === 'waitlisted' ? `${a.applicant.name} is on the waiting list.` : `${a.applicant.name} was not accepted.`
);
export const useWithdrawApplication = () =>
useMockMutation(({ id, note }: {id: string;note: string;}) => api.withdrawApplication(id, note), 'Application withdrawn.');
export const useMarkEnrolled = () =>
useMockMutation(({ id, student, sectionId }: {id: string;student: Ref & {studentId?: string;};sectionId?: string;}) => api.markEnrolled(id, student, sectionId), null);
export const useUpdateAdmissionSettings = () => useMockMutation((s: AdmissionSettings) => api.updateAdmissionSettings(s), 'Admission settings saved.');
export const useGenerateAdmissionSample = () => useMockMutation(() => api.generateAdmissionSample(), (r) => `${r.created} sample applications added.`);

/* ------------------------------- certificates ------------------------------ */

export const useCertificates = (studentId?: string, enabled = true) =>
useQuery({ queryKey: keys.certs(studentId), queryFn: () => certs.listCertificates(studentId), enabled });
export const useCertificateSettings = () => useQuery({ queryKey: keys.certSettings, queryFn: certs.getCertificateSettings });
export const useUpdateCertificateSettings = () =>
useMockMutation((s: CertificateSettings) => certs.updateCertificateSettings(s), 'Certificate settings saved.');
export const useIssueCertificates = () =>
useMockMutation((p: CertificatePayload) => certs.issueCertificates(p), (r) => `${r.issued.length} certificate(s) issued${r.skipped.length ? `, ${r.skipped.length} skipped (already issued)` : ''}.`);
export const useRevokeCertificate = () =>
useMockMutation(({ id, reason }: {id: string;reason: string;}) => certs.revokeCertificate(id, reason), (c) => `${c.serial} revoked.`);
export const useVerifyCertificate = () => useMockMutation((serial: string) => certs.verifyCertificate(serial), null);
