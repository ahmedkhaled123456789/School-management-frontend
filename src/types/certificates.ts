import type { Ref } from './sections';

/** Certificates issued by the school (drawn on canvas, verified by code). MOCK API for now. */

export type CertificateType = 'achievement' | 'attendance' | 'completion' | 'conduct' | 'participation';

export interface Certificate {
  _id: string;
  /** "SAS-2026-00042": printed on the certificate and checked on /verify */
  serial: string;
  type: CertificateType;
  student: Ref & {studentId?: string;};
  title: string;
  /** "for outstanding results in Mathematics" */
  reason: string;
  issuedOn: string;
  signer: {name: string;title: string;};
  /** where it came from, e.g. an event's results */
  source?: {kind: 'event' | 'attendance' | 'manual';id?: string;label?: string;};
  issuedBy: Ref;
  revoked?: {at: string;reason: string;};
  createdAt: string;
}

export interface CertificatePayload {
  type: CertificateType;
  students: Array<Ref & {studentId?: string;}>;
  title: string;
  reason: string;
  issuedOn: string;
  source?: Certificate['source'];
}

export interface CertificateSettings {
  signerName: string;
  signerTitle: string;
  /** ID cards: valid until (YYYY-MM-DD) */
  cardsValidUntil: string;
}

/** What /verify shows (no personal data beyond the name). */
export interface VerifyResult {
  serial: string;
  status: 'valid' | 'revoked';
  studentName: string;
  title: string;
  issuedOn: string;
  school: string;
  revokedReason?: string;
}
