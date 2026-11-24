/**
 * Certificates — MOCK implementation (see src/api/mock/db.ts).
 * Shapes and errors match the endpoints the backend will expose:
 *   GET/POST /certificates, POST /certificates/:id/revoke, GET /certificates/verify/:serial
 *   GET/PUT /certificates/settings
 */
import { fail, newId, nowIso, read, requirePermission, sessionActor, write } from './mock/db';
import type { Certificate, CertificatePayload, CertificateSettings, CertificateType, VerifyResult } from '../types/certificates';
import { loadBranding } from '../lib/branding';
import { addDays, isDateKey, todayKey } from '../utils/attendance';
import { notify } from './communication';

const READ = 'students.read';
const MANAGE = 'students.manage';
const TYPES: CertificateType[] = ['achievement', 'attendance', 'completion', 'conduct', 'participation'];

/** "Al Shorouk American School" => "ASAS" (serial prefix). */
const prefix = () => loadBranding().appName.split(/\s+/).map((w) => w[0]).filter((c) => /[A-Za-z]/.test(c ?? '')).join('').toUpperCase().slice(0, 4) || 'SCH';

export async function getCertificateSettings(): Promise<CertificateSettings> {
  requirePermission(READ);
  return read((db) => db.certificateSettings);
}

export async function updateCertificateSettings(next: CertificateSettings): Promise<CertificateSettings> {
  requirePermission(MANAGE);
  return write((db) => {
    if (!next.signerName?.trim() || !next.signerTitle?.trim()) fail(400, 'Enter the name and title of the person who signs');
    if (next.signerName.length > 60 || next.signerTitle.length > 60) fail(400, 'Signer name / title: 60 characters max');
    if (!isDateKey(next.cardsValidUntil) || next.cardsValidUntil < todayKey()) fail(400, 'ID cards must be valid until a future date');
    db.certificateSettings = { signerName: next.signerName.trim(), signerTitle: next.signerTitle.trim(), cardsValidUntil: next.cardsValidUntil };
    return db.certificateSettings;
  });
}

/** Admins: all (or one student's). Students / parents: their own (studentId required). */
export async function listCertificates(studentId?: string): Promise<Certificate[]> {
  const { role } = sessionActor();
  if (role === 'admin') requirePermission(READ);else
  if (!studentId) fail(403, 'You can only see your own certificates');
  return read((db) => db.certificates.
  filter((c) => !studentId || c.student._id === studentId && (role === 'admin' || !c.revoked)).
  sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

/**
 * Issues one certificate per student. Students who already have the same
 * certificate (same title and source) are skipped, not duplicated.
 */
export async function issueCertificates(payload: CertificatePayload): Promise<{issued: Certificate[];skipped: string[];}> {
  const actor = sessionActor();
  requirePermission(MANAGE);
  return write((db) => {
    if (!TYPES.includes(payload.type)) fail(400, 'Choose the certificate type');
    if (!payload.students?.length) fail(400, 'Choose at least one student');
    if (payload.students.length > 300) fail(400, 'Issue at most 300 certificates at once');
    const title = payload.title?.trim() ?? '';
    if (title.length < 3 || title.length > 80) fail(400, 'The title needs 3–80 characters');
    if ((payload.reason?.length ?? 0) > 160) fail(400, 'The citation is limited to 160 characters');
    if (!isDateKey(payload.issuedOn) || payload.issuedOn > addDays(todayKey(), 30)) fail(400, 'Choose a valid issue date');
    const year = payload.issuedOn.slice(0, 4);
    const issued: Certificate[] = [];
    const skipped: string[] = [];
    payload.students.forEach((student) => {
      const dup = db.certificates.find((c) => !c.revoked && c.student._id === student._id && c.title === title && (c.source?.id ?? '') === (payload.source?.id ?? ''));
      if (dup) return void skipped.push(`${student.name} already has it (${dup.serial})`);
      const seq = db.certificates.filter((c) => c.serial.includes(`-${year}-`)).length + 1;
      const cert: Certificate = {
        _id: newId(),
        serial: `${prefix()}-${year}-${String(seq).padStart(5, '0')}`,
        type: payload.type,
        student: { _id: student._id, name: student.name, ...(student.studentId ? { studentId: student.studentId } : {}) },
        title,
        reason: payload.reason?.trim() ?? '',
        issuedOn: payload.issuedOn,
        signer: { name: db.certificateSettings.signerName, title: db.certificateSettings.signerTitle },
        ...(payload.source ? { source: payload.source } : {}),
        issuedBy: actor.ref,
        createdAt: nowIso()
      };
      db.certificates.push(cert);
      issued.push(cert);
      notify(db, {
        to: [`student:${student._id}`, `parent-of:${student._id}`],
        kind: 'certificate',
        title: `New certificate: ${title}`,
        body: `${student.name}${cert.reason ? ` · ${cert.reason}` : ''}`,
        href: { student: '/student/certificates', parent: `/parent/children/${student._id}` }
      });
    });
    return { issued, skipped };
  });
}

export async function revokeCertificate(id: string, reason: string): Promise<Certificate> {
  requirePermission(MANAGE);
  return write((db) => {
    const cert = db.certificates.find((c) => c._id === id);
    if (!cert) fail(404, 'Certificate not found');
    if (cert.revoked) fail(409, 'Already revoked');
    if (!reason?.trim()) fail(400, 'Give a reason (shown on the verification page)');
    cert.revoked = { at: nowIso(), reason: reason.trim().slice(0, 160) };
    return cert;
  });
}

/** Public check of a printed serial (no sign-in). */
export function verifyCertificate(serial: string): Promise<VerifyResult> {
  return read((db) => {
    const code = serial.trim().toUpperCase();
    if (!/^[A-Z]{1,4}-\d{4}-\d{5}$/.test(code)) fail(400, 'Enter the code printed on the certificate, e.g. ASAS-2026-00012');
    const cert = db.certificates.find((c) => c.serial === code);
    if (!cert) fail(404, 'No certificate with this code was issued by the school');
    return {
      serial: cert.serial,
      status: cert.revoked ? 'revoked' : 'valid',
      studentName: cert.student.name,
      title: cert.title,
      issuedOn: cert.issuedOn,
      school: loadBranding().appName,
      ...(cert.revoked ? { revokedReason: cert.revoked.reason } : {})
    };
  });
}
