import type { BadgeTone } from '../components/ui/Badge';
import type { ApplicationPayload, ApplicationStatus } from '../types/admissions';

export const APPLICATION_STATUS: Record<ApplicationStatus, {label: string;tone: BadgeTone;family: string;}> = {
  new: { label: 'New', tone: 'info', family: 'Received — the school will contact you about the entrance test.' },
  test_scheduled: { label: 'Test scheduled', tone: 'accent', family: 'Entrance test scheduled.' },
  tested: { label: 'Tested', tone: 'neutral', family: 'Test done — a decision is being made.' },
  accepted: { label: 'Accepted', tone: 'success', family: 'Accepted! Please visit the school office to complete the enrolment.' },
  waitlisted: { label: 'Waiting list', tone: 'warn', family: 'On the waiting list — the school will contact you when a seat is free.' },
  rejected: { label: 'Not accepted', tone: 'danger', family: 'Not accepted this time.' },
  enrolled: { label: 'Enrolled', tone: 'success', family: 'Enrolled — welcome to the school!' },
  withdrawn: { label: 'Withdrawn', tone: 'neutral', family: 'Withdrawn.' }
};

/** Pipeline order for tabs and the progress bar. */
export const PIPELINE: ApplicationStatus[] = ['new', 'test_scheduled', 'tested', 'accepted', 'enrolled'];

export const emptyApplication = (): ApplicationPayload => ({
  classLevel: { _id: '', name: '' },
  applicant: { name: '', dateOfBirth: '', gender: 'Male', previousSchool: '' },
  guardian: { name: '', relation: '', phone: '', email: '' }
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s-]{7,20}$/;

/** The server's checks, shown under the fields before sending. */
export function applicationErrors(p: ApplicationPayload): Partial<Record<string, string>> {
  const age = p.applicant.dateOfBirth ? (Date.now() - new Date(p.applicant.dateOfBirth).getTime()) / (365.25 * 86_400_000) : NaN;
  return {
    name: p.applicant.name.trim().length < 3 ? "Enter the child's full name" : undefined,
    dateOfBirth: !p.applicant.dateOfBirth ? 'Enter the date of birth' : age < 3 || age > 20 ? 'Age must be 3–20' : undefined,
    classLevel: !p.classLevel._id ? 'Choose the class level' : undefined,
    guardianName: p.guardian.name.trim().length < 3 ? 'Enter your name' : undefined,
    relation: !p.guardian.relation.trim() ? 'e.g. Mother' : undefined,
    phone: !PHONE.test(p.guardian.phone.trim()) ? 'Enter a valid phone number' : undefined,
    email: !EMAIL.test(p.guardian.email.trim()) ? 'Enter a valid email' : undefined
  };
}

/** "Omar Hassan" => "omar.hassan" (suggested login on enrolment). */
export const loginFromName = (name: string) =>
name.toLowerCase().normalize('NFKD').replace(/[^a-z\s]/g, '').trim().split(/\s+/).slice(0, 2).join('.') || 'student';

/** A readable first password: two words + digits (shown once, the student changes it). */
export function generatePassword() {
  const words = ['Cedar', 'River', 'Falcon', 'Lotus', 'Palm', 'Sun', 'Star', 'Nile', 'Oasis', 'Pyramid'];
  const bytes = new Uint32Array(3);
  crypto.getRandomValues(bytes);
  return `${words[bytes[0] % words.length]}${words[bytes[1] % words.length]}${1000 + bytes[2] % 9000}!`;
}
