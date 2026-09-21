/**
 * DUMMY DATA TRANSPORT — demo only.
 *
 * Speaks the exact documented API contract (same paths, same `{ status, message, data }`
 * envelope, same auth + validation rules) entirely in memory, so every screen can be
 * exercised before the Express server is available. Endpoints the real backend does not
 * implement (the student exam-questions route) 404 here too, so BACKEND REQUIRED gaps
 * stay honest.
 *
 * Switch it off by pointing the app at a real server:
 *   localStorage.setItem('sms.apiBaseUrl', 'http://localhost:2020/api/v1')
 * Nothing outside api/client.ts imports this file.
 */
import { ApiError } from '../lib/apiError';

type Json = Record<string, any>;

const LATENCY = 320;

const uid = (prefix: string) => `${prefix}${Math.random().toString(16).slice(2, 8)}`;

/* --------------------------------- seed ---------------------------------- */

const academicYears: Json[] = [
{ _id: 'ay1', name: '2024/2025', fromYear: '2024', toYear: '2025', isCurrent: false, students: [], teachers: [] },
{ _id: 'ay2', name: '2025/2026', fromYear: '2025', toYear: '2026', isCurrent: true, students: [], teachers: [] },
{ _id: 'ay3', name: '2026/2027', fromYear: '2026', toYear: '2027', isCurrent: false, students: [], teachers: [] }];


const academicTerms: Json[] = [
{ _id: 'at1', name: '1st Term', description: 'Opening term of the academic year.', duration: '3 months' },
{ _id: 'at2', name: '2nd Term', description: 'Middle term.', duration: '3 months' },
{ _id: 'at3', name: '3rd Term', description: 'Final term with end of year exams.', duration: '3 months' }];


const programs: Json[] = [
{ _id: 'pr1', name: 'General Science', code: 'GS-01', description: 'Physics, chemistry and biology pathway.', duration: '4 years', teachers: ['tc1', 'tc2'], students: [], subjects: ['sb1', 'sb2', 'sb3'] },
{ _id: 'pr2', name: 'Business Studies', code: 'BS-02', description: 'Accounting, economics and management.', duration: '4 years', teachers: ['tc3'], students: [], subjects: ['sb4'] },
{ _id: 'pr3', name: 'General Arts', code: 'GA-03', description: 'Literature, history and government.', duration: '4 years', teachers: ['tc4'], students: [], subjects: ['sb5'] },
{ _id: 'pr4', name: 'Visual Arts', code: 'VA-04', description: 'Design, sculpture and graphic communication.', duration: '4 years', teachers: [], students: [], subjects: ['sb6'] }];


const subjects: Json[] = [
{ _id: 'sb1', name: 'Mathematics', day: 'Monday', classes: 'Room 101', teacher: 'tc1', academicTerm: 'at1', duration: '3 months' },
{ _id: 'sb2', name: 'Physics', day: 'Tuesday', classes: 'Lab 2', teacher: 'tc2', academicTerm: 'at1', duration: '3 months' },
{ _id: 'sb3', name: 'Biology', day: 'Wednesday', classes: 'Lab 1', teacher: null, academicTerm: 'at2', duration: '3 months' },
{ _id: 'sb4', name: 'Accounting', day: 'Thursday', classes: 'Room 204', teacher: 'tc3', academicTerm: 'at1', duration: '3 months' },
{ _id: 'sb5', name: 'Literature', day: 'Friday', classes: 'Room 110', teacher: 'tc4', academicTerm: 'at2', duration: '3 months' },
{ _id: 'sb6', name: 'Graphic Design', day: 'Monday', classes: 'Studio A', teacher: null, academicTerm: 'at3', duration: '3 months' }];


const classLevels: Json[] = [
{ _id: 'cl1', name: 'Level 100', description: 'First year cohort.', students: ['x', 'x', 'x'], subjects: ['sb1', 'sb2'], teachers: ['tc1'] },
{ _id: 'cl2', name: 'Level 200', description: 'Second year cohort.', students: ['x', 'x'], subjects: ['sb1', 'sb3'], teachers: ['tc2'] },
{ _id: 'cl3', name: 'Level 300', description: 'Third year cohort.', students: ['x'], subjects: ['sb4'], teachers: ['tc3'] },
{ _id: 'cl4', name: 'Level 400', description: 'Final year cohort.', students: [], subjects: ['sb5'], teachers: ['tc4'] }];


const yearGroups: Json[] = [
{ _id: 'yg1', name: 'Class of 2026', academicYear: 'ay2' },
{ _id: 'yg2', name: 'Class of 2027', academicYear: 'ay3' }];


const admins: Json[] = [
{
  _id: 'ad1',
  name: 'Amina Sesay',
  email: 'admin@school.edu',
  password: 'password123',
  role: 'admin',
  phone: '08012345678',
  address: '12 Marina Road',
  schoolName: 'Al Maaref American School',
  city: 'Lagos',
  lauguage: 'English'
}];


const teachers: Json[] = [
{ _id: 'tc1', name: 'Dr. Ibrahim Kamara', email: 'teacher@school.edu', password: 'password123', teacherId: 'TEA1001', role: 'teacher', dateEmployed: '2021-09-01', isSuspended: false, isWithdrawn: false, applicationStatus: 'approved', program: 'pr1', classLevel: 'cl1', academicYear: 'ay2', subject: 'sb1', examsCreated: ['ex1', 'ex2'] },
{ _id: 'tc2', name: 'Mrs. Adaeze Nwosu', email: 'adaeze@school.edu', password: 'password123', teacherId: 'TEA1002', role: 'teacher', dateEmployed: '2022-01-10', isSuspended: false, isWithdrawn: false, applicationStatus: 'approved', program: 'pr1', classLevel: 'cl2', academicYear: 'ay2', subject: 'sb2', examsCreated: ['ex3'] },
{ _id: 'tc3', name: 'Mr. Kojo Boateng', email: 'kojo@school.edu', password: 'password123', teacherId: 'TEA1003', role: 'teacher', dateEmployed: '2020-04-18', isSuspended: false, isWithdrawn: false, applicationStatus: 'approved', program: 'pr2', classLevel: 'cl3', academicYear: 'ay2', subject: 'sb4', examsCreated: [] },
{ _id: 'tc4', name: 'Ms. Rania Haddad', email: 'rania@school.edu', password: 'password123', teacherId: 'TEA1004', role: 'teacher', dateEmployed: '2023-09-04', isSuspended: false, isWithdrawn: false, applicationStatus: 'pending', program: 'pr3', classLevel: 'cl4', academicYear: 'ay2', subject: 'sb5', examsCreated: [] },
{ _id: 'tc5', name: 'Mr. Felix Boadi', email: 'felix@school.edu', password: 'password123', teacherId: 'TEA1005', role: 'teacher', dateEmployed: '2024-02-12', isSuspended: true, isWithdrawn: false, applicationStatus: 'approved', program: null, classLevel: null, academicYear: null, subject: null, examsCreated: [] },
{ _id: 'tc6', name: 'Mrs. Hauwa Lawal', email: 'hauwa@school.edu', password: 'password123', teacherId: 'TEA1006', role: 'teacher', dateEmployed: '2024-09-01', isSuspended: false, isWithdrawn: false, applicationStatus: 'pending', program: null, classLevel: null, academicYear: null, subject: null, examsCreated: [] }];


const FIRST = ['Ahmed', 'Fatima', 'Kwame', 'Lena', 'Tunde', 'Mariam', 'Joseph', 'Nadia', 'Samuel', 'Grace', 'Idris', 'Chioma', 'Yusuf', 'Amara', 'Peter', 'Zainab', 'Kofi', 'Esther', 'Daniel', 'Halima', 'Musa', 'Ruth', 'Emeka', 'Sofia'];
const LAST = ['Bello', 'Okafor', 'Mensah', 'Diallo', 'Adeyemi', 'Kamara', 'Owusu', 'Njoku', 'Traore', 'Abiola'];

const students: Json[] = Array.from({ length: 24 }).map((_, index) => {
  const name = `${FIRST[index % FIRST.length]} ${LAST[index % LAST.length]}`;
  const level = classLevels[index % 4];
  return {
    _id: index === 0 ? 'st1' : uid('st'),
    name,
    email: index === 0 ? 'student@school.edu' : `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@school.edu`,
    password: 'password123',
    studentId: `STU${2001 + index}`,
    role: 'student',
    classLevels: [level.name],
    currentClassLevel: level.name,
    academicYear: 'ay2',
    program: programs[index % programs.length]._id,
    dateAdmitted: `2025-09-${String(index % 27 + 1).padStart(2, '0')}`,
    isGraduated: index % 11 === 0 && index !== 0,
    isWithdrawn: index === 17,
    isSuspended: index === 9,
    prefectName: index === 0 ? 'Head Prefect' : index % 7 === 0 ? 'Class Prefect' : '',
    examResults: []
  };
});

const exams: Json[] = [
{ _id: 'ex1', name: 'Mathematics Mid-Term Assessment', description: 'Covers algebra, geometry and trigonometry.', subject: 'sb1', program: 'pr1', academicTerm: 'at1', academicYear: 'ay2', classLevel: 'cl1', duration: '30 minutes', examDate: '2026-09-14', examTime: '09:00', examType: 'Mid-Term', examStatus: 'live', questions: ['q1', 'q2', 'q3', 'q4'], createdBy: 'tc1' },
{ _id: 'ex2', name: 'Mathematics End of Term', description: 'Full syllabus examination.', subject: 'sb1', program: 'pr1', academicTerm: 'at2', academicYear: 'ay2', classLevel: 'cl1', duration: '45 minutes', examDate: '2026-12-02', examTime: '11:00', examType: 'End of Term', examStatus: 'pending', questions: ['q5', 'q6'], createdBy: 'tc1' },
{ _id: 'ex3', name: 'Physics Theory Quiz', description: 'Mechanics and electricity theory paper.', subject: 'sb2', program: 'pr1', academicTerm: 'at1', academicYear: 'ay2', classLevel: 'cl2', duration: '20 minutes', examDate: '2026-10-08', examTime: '13:30', examType: 'Quiz', examStatus: 'live', questions: ['q7'], createdBy: 'tc2' }];


const questions: Json[] = [
{ _id: 'q1', question: 'What is the value of x in 2x + 6 = 18?', optionA: '4', optionB: '6', optionC: '9', optionD: '12', correctAnswer: '6', createdBy: 'tc1' },
{ _id: 'q2', question: 'The area of a circle with radius 7cm is closest to:', optionA: '154 cm²', optionB: '44 cm²', optionC: '22 cm²', optionD: '308 cm²', correctAnswer: '154 cm²', createdBy: 'tc1' },
{ _id: 'q3', question: 'Which of these is a prime number?', optionA: '21', optionB: '27', optionC: '29', optionD: '33', correctAnswer: '29', createdBy: 'tc1' },
{ _id: 'q4', question: 'sin(30°) equals:', optionA: '1', optionB: '0.5', optionC: '0.866', optionD: '0', correctAnswer: '0.5', createdBy: 'tc1' },
{ _id: 'q5', question: 'The derivative of x³ is:', optionA: '3x²', optionB: 'x²', optionC: '3x', optionD: 'x⁴/4', correctAnswer: '3x²', createdBy: 'tc1' },
{ _id: 'q6', question: 'log₁₀(1000) equals:', optionA: '2', optionB: '3', optionC: '10', optionD: '100', correctAnswer: '3', createdBy: 'tc1' },
{ _id: 'q7', question: 'The SI unit of force is:', optionA: 'Joule', optionB: 'Watt', optionC: 'Newton', optionD: 'Pascal', correctAnswer: 'Newton', createdBy: 'tc2' }];


const examResults: Json[] = [
{ _id: 'er1', studentID: 'STU2001', exam: 'ex1', grade: 82, score: 82, passMark: 50, status: 'Pass', remarks: 'Very Good', position: 2, subject: 'sb1', classLevel: 'cl1', academicTerm: 'at1', academicYear: 'ay2', isPublished: true, createdAt: '2026-09-15T10:00:00.000Z', answeredQuestions: [
  { question: 'What is the value of x in 2x + 6 = 18?', correctAnswer: '6', isCorrect: true },
  { question: 'The area of a circle with radius 7cm is closest to:', correctAnswer: '154 cm²', isCorrect: true },
  { question: 'Which of these is a prime number?', correctAnswer: '29', isCorrect: false },
  { question: 'sin(30°) equals:', correctAnswer: '0.5', isCorrect: true }]
},
{ _id: 'er2', studentID: 'STU2002', exam: 'ex1', grade: 45, score: 45, passMark: 50, status: 'Fail', remarks: 'Poor', position: 9, subject: 'sb1', classLevel: 'cl1', academicTerm: 'at1', academicYear: 'ay2', isPublished: true, createdAt: '2026-09-15T10:05:00.000Z', answeredQuestions: [] },
{ _id: 'er3', studentID: 'STU2003', exam: 'ex3', grade: 91, score: 91, passMark: 50, status: 'Pass', remarks: 'Excellent', position: 1, subject: 'sb2', classLevel: 'cl2', academicTerm: 'at1', academicYear: 'ay2', isPublished: false, createdAt: '2026-10-09T09:00:00.000Z', answeredQuestions: [] },
{ _id: 'er4', studentID: 'STU2005', exam: 'ex3', grade: 64, score: 64, passMark: 50, status: 'Pass', remarks: 'Good', position: 5, subject: 'sb2', classLevel: 'cl2', academicTerm: 'at1', academicYear: 'ay2', isPublished: false, createdAt: '2026-10-09T09:10:00.000Z', answeredQuestions: [] },
{ _id: 'er5', studentID: 'STU2004', exam: 'ex1', grade: 58, score: 58, passMark: 50, status: 'Pass', remarks: 'Fair', position: 7, subject: 'sb1', classLevel: 'cl1', academicTerm: 'at1', academicYear: 'ay2', isPublished: true, createdAt: '2026-09-15T10:12:00.000Z', answeredQuestions: [] }];


/* -------------------------------- helpers -------------------------------- */

const byId = (list: Json[], id: string) => list.find((item) => item._id === id);

/** Mirrors Mongoose `populate` so the UI receives `{ _id, name }` relations. */
function populate(value: any, list: Json[]) {
  if (!value || typeof value !== 'string') return value ?? undefined;
  const found = byId(list, value);
  return found ? { _id: found._id, name: found.name } : value;
}

const shapeStudent = (student: Json) => {
  const { password, ...rest } = student;
  return {
    ...rest,
    program: populate(student.program, programs),
    academicYear: populate(student.academicYear, academicYears)
  };
};

const shapeTeacher = (teacher: Json) => {
  const { password, ...rest } = teacher;
  return {
    ...rest,
    program: populate(teacher.program, programs),
    classLevel: populate(teacher.classLevel, classLevels),
    academicYear: populate(teacher.academicYear, academicYears),
    subject: populate(teacher.subject, subjects)
  };
};

const shapeSubject = (subject: Json) => ({
  ...subject,
  teacher: populate(subject.teacher, teachers),
  academicTerm: populate(subject.academicTerm, academicTerms)
});

const shapeYearGroup = (group: Json) => ({
  ...group,
  academicYear: populate(group.academicYear, academicYears)
});

const shapeExam = (exam: Json) => ({
  ...exam,
  subject: populate(exam.subject, subjects),
  program: populate(exam.program, programs),
  academicTerm: populate(exam.academicTerm, academicTerms),
  academicYear: populate(exam.academicYear, academicYears),
  classLevel: populate(exam.classLevel, classLevels)
});

const shapeResult = (result: Json) => ({
  ...result,
  exam: populate(result.exam, exams),
  subject: populate(result.subject, subjects),
  classLevel: populate(result.classLevel, classLevels),
  academicTerm: populate(result.academicTerm, academicTerms),
  academicYear: populate(result.academicYear, academicYears)
});

const ok = (data: any, message = 'Request successful', extra: Json = {}) => ({
  status: 'success',
  message,
  data,
  ...extra
});

function fail(message: string, status: number, kind: any): never {
  throw new ApiError(message, status, kind);
}

function auth(token: string | null, roles: string[]) {
  if (!token || !token.startsWith('demo.')) fail('Authentication required', 401, 'unauthorized');
  const [, role, id] = token.split('.');
  if (!roles.includes(role)) fail('You are not allowed to access this resource', 403, 'forbidden');
  return { role, id };
}

function paginate(list: Json[], search: URLSearchParams) {
  const page = Number(search.get('page') || 1);
  const limit = Number(search.get('limit') || 10);
  const name = (search.get('name') || '').toLowerCase();
  const filtered = name ?
  list.filter((item) => String(item.name).toLowerCase().includes(name)) :
  list;
  const start = (page - 1) * limit;
  const slice = filtered.slice(start, start + limit);
  return {
    slice,
    meta: {
      results: slice.length,
      total: filtered.length,
      ...(start + limit < filtered.length ? { next: { page: page + 1, limit } } : {}),
      ...(start > 0 ? { previous: { page: page - 1, limit } } : {})
    }
  };
}

function login(list: Json[], role: string, body: Json) {
  const user = list.find(
    (item) => item.email?.toLowerCase() === String(body?.email || '').toLowerCase()
  );
  if (!user || user.password !== body?.password) {
    fail('Invalid login credentials', 401, 'unauthorized');
  }
  return ok(
    {
      token: `demo.${role}.${user!._id}`,
      _id: user!._id,
      name: user!.name,
      email: user!.email,
      role
    },
    'Login successful'
  );
}

function updateRecord(list: Json[], id: string, body: Json, label: string) {
  const record = byId(list, id);
  if (!record) fail(`${label} not found`, 404, 'notFound');
  if (body?.name && list.some((item) => item.name === body.name && item._id !== id)) {
    fail(`A ${label.toLowerCase()} with this name already exists`, 400, 'validation');
  }
  Object.assign(record!, body);
  return record!;
}

/* -------------------------------- router --------------------------------- */

export async function mockRequest(
method: string,
fullPath: string,
body: any,
token: string | null)
: Promise<Json> {
  await new Promise((resolve) => setTimeout(resolve, LATENCY));

  const [path, queryString = ''] = fullPath.split('?');
  const search = new URLSearchParams(queryString);
  const segments = path.split('/').filter(Boolean);
  const [root, ...rest] = segments;

  /* auth */
  if (method === 'POST' && path === '/admins/login') return login(admins, 'admin', body);
  if (method === 'POST' && path === '/admins/register') {
    if (admins.some((item) => item.email === body.email)) {
      fail('Admin already exists', 400, 'validation');
    }
    const created = { _id: uid('ad'), role: 'admin', ...body };
    admins.push(created);
    const { password, ...safe } = created;
    return ok(safe, 'Admin registered successfully');
  }
  if (method === 'POST' && path === '/teachers/login') return login(teachers, 'teacher', body);
  if (method === 'POST' && path === '/students/login') return login(students, 'student', body);

  /* admins */
  if (root === 'admins') {
    const strip = ({ password, ...rest_ }: Json) => rest_;
    if (method === 'GET' && path === '/admins/profile') {
      const { id } = auth(token, ['admin']);
      const admin = byId(admins, id);
      if (!admin) fail('Admin not found', 404, 'notFound');
      return ok(strip(admin!), 'Admin profile fetched successfully');
    }
    if (method === 'GET' && rest.length === 0) {
      auth(token, ['admin']);
      return ok(admins.map(strip), 'Admins fetched successfully', {
        results: admins.length,
        total: admins.length
      });
    }
    if (method === 'PUT' && rest.length === 1) {
      const admin = byId(admins, rest[0]);
      if (!admin) fail('Admin not found', 404, 'notFound');
      if (body.email && admins.some((item) => item.email === body.email && item._id !== admin!._id)) {
        fail('This email is already taken', 400, 'validation');
      }
      Object.assign(admin!, body);
      return ok(strip(admin!), 'Admin updated successfully');
    }
    if (method === 'DELETE' && rest.length === 1) {
      const index = admins.findIndex((item) => item._id === rest[0]);
      if (index < 0) fail('Admin not found', 404, 'notFound');
      admins.splice(index, 1);
      return ok(null, 'Admin deleted successfully');
    }
  }

  /* students */
  if (root === 'students') {
    if (method === 'POST' && path === '/students/admins/register') {
      auth(token, ['admin']);
      if (students.some((item) => item.email === body.email)) {
        fail('A student with this email already exists', 400, 'validation');
      }
      const created = {
        _id: uid('st'),
        name: body.name,
        email: body.email,
        password: body.password,
        studentId: `STU${2001 + students.length}`,
        role: 'student',
        classLevels: [],
        currentClassLevel: '',
        academicYear: 'ay2',
        program: null,
        dateAdmitted: new Date().toISOString(),
        isGraduated: false,
        isWithdrawn: false,
        isSuspended: false,
        prefectName: '',
        examResults: []
      };
      students.unshift(created);
      return ok(shapeStudent(created), 'Student registered successfully');
    }
    if (method === 'GET' && path === '/students/admin') {
      auth(token, ['admin']);
      const { slice, meta } = paginate(students, search);
      return ok(slice.map(shapeStudent), 'Students fetched successfully', meta);
    }
    if (method === 'GET' && path === '/students/profile') {
      const { id } = auth(token, ['student']);
      const student = byId(students, id);
      if (!student) fail('Student not found', 404, 'notFound');
      return ok(shapeStudent(student!), 'Profile fetched successfully');
    }
    if (method === 'PUT' && path === '/students/update') {
      const { id } = auth(token, ['student']);
      const student = byId(students, id)!;
      if (body.email) student.email = body.email;
      if (body.password) student.password = body.password;
      return ok(shapeStudent(student), 'Profile updated successfully');
    }
    if (method === 'POST' && rest[0] === 'exam' && rest[2] === 'write') {
      const { id } = auth(token, ['student']);
      const exam = byId(exams, rest[1]);
      if (!exam) fail('Exam not found', 404, 'notFound');
      const student = byId(students, id)!;
      if (student.isSuspended) fail('Suspended students cannot sit an exam', 403, 'forbidden');
      if (student.isWithdrawn) fail('Withdrawn students cannot sit an exam', 403, 'forbidden');
      const paper = questions.filter((item) => exam!.questions.includes(item._id));
      const answers: string[] = body?.answers ?? [];
      if (answers.length !== paper.length) {
        fail('You have not answered all the questions', 400, 'validation');
      }
      if (examResults.some((item) => item.studentID === student.studentId && item.exam === exam!._id)) {
        fail('You have already taken this exam', 400, 'validation');
      }
      let correct = 0;
      const answered = paper.map((question, index) => {
        const isCorrect = question.correctAnswer === answers[index];
        if (isCorrect) correct += 1;
        return { question: question.question, correctAnswer: question.correctAnswer, isCorrect };
      });
      const grade = Math.round(correct / paper.length * 100);
      examResults.unshift({
        _id: uid('er'),
        studentID: student.studentId,
        exam: exam!._id,
        grade,
        score: grade,
        passMark: 50,
        status: grade >= 50 ? 'Pass' : 'Fail',
        remarks:
        grade >= 80 ? 'Excellent' : grade >= 70 ? 'Very Good' : grade >= 60 ? 'Good' : grade >= 50 ? 'Fair' : 'Poor',
        subject: exam!.subject,
        classLevel: exam!.classLevel,
        academicTerm: exam!.academicTerm,
        academicYear: exam!.academicYear,
        isPublished: false,
        answeredQuestions: answered,
        createdAt: new Date().toISOString()
      });
      return ok({ examName: exam!.name }, 'You have submitted your exam. Check later for the results');
    }
    /*
     * GET /students/exam/:examID — the shape the real backend still needs to expose.
     * Returns the exam plus its questions with `correctAnswer` stripped out, so the
     * student never receives the answers before submitting.
     */
    if (method === 'GET' && rest[0] === 'exam' && rest.length === 2) {
      const { id } = auth(token, ['student']);
      const exam = byId(exams, rest[1]);
      if (!exam) fail('Exam not found', 404, 'notFound');
      const student = byId(students, id)!;
      if (student.isSuspended) fail('Suspended students cannot sit an exam', 403, 'forbidden');
      if (student.isWithdrawn) fail('Withdrawn students cannot sit an exam', 403, 'forbidden');
      const paper = questions.
      filter((item) => exam!.questions.includes(item._id)).
      map(({ correctAnswer, createdBy, ...safe }) => safe);
      return ok({ exam: shapeExam(exam!), questions: paper }, 'Exam fetched successfully');
    }
    if (method === 'GET' && rest[1] === 'admin') {
      auth(token, ['admin']);
      const student = byId(students, rest[0]);
      if (!student) fail('Student not found', 404, 'notFound');
      return ok(shapeStudent(student!), 'Student fetched successfully');
    }
    if (method === 'DELETE' && rest[1] === 'admin') {
      const index = students.findIndex((item) => item._id === rest[0]);
      if (index < 0) fail('Student not found', 404, 'notFound');
      students.splice(index, 1);
      return ok(null, 'Student deleted successfully');
    }
    if (method === 'PUT' && rest[1] === 'update' && rest[2] === 'admin') {
      auth(token, ['admin']);
      const student = byId(students, rest[0]);
      if (!student) fail('Student not found', 404, 'notFound');
      if (body.email && students.some((item) => item.email === body.email && item._id !== student!._id)) {
        fail('This email is already taken', 400, 'validation');
      }
      const { classLevels: level, ...others } = body;
      Object.assign(student!, others);
      if (level) {
        student!.classLevels = Array.from(new Set([...(student!.classLevels || []), level]));
        student!.currentClassLevel = level;
      }
      return ok(shapeStudent(student!), 'Student updated successfully');
    }
  }

  /* teachers */
  if (root === 'teachers') {
    if (method === 'POST' && path === '/teachers/admins/register') {
      auth(token, ['admin']);
      if (teachers.some((item) => item.email === body.email)) {
        fail('A teacher with this email already exists', 400, 'validation');
      }
      const created = {
        _id: uid('tc'),
        name: body.name,
        email: body.email,
        password: body.password,
        teacherId: `TEA${1001 + teachers.length}`,
        role: 'teacher',
        dateEmployed: new Date().toISOString(),
        isSuspended: false,
        isWithdrawn: false,
        applicationStatus: 'pending',
        program: null,
        classLevel: null,
        academicYear: null,
        subject: null,
        examsCreated: []
      };
      teachers.unshift(created);
      return ok(shapeTeacher(created), 'Teacher registered successfully');
    }
    if (method === 'GET' && path === '/teachers/admin') {
      auth(token, ['admin']);
      const { slice, meta } = paginate(teachers, search);
      return ok(slice.map(shapeTeacher), 'Teachers fetched successfully', meta);
    }
    if (method === 'GET' && path === '/teachers/profile') {
      const { id } = auth(token, ['teacher']);
      const teacher = byId(teachers, id);
      if (!teacher) fail('Teacher not found', 404, 'notFound');
      return ok(shapeTeacher(teacher!), 'Profile fetched successfully');
    }
    if (method === 'GET' && rest[1] === 'admin') {
      auth(token, ['admin']);
      const teacher = byId(teachers, rest[0]);
      if (!teacher) fail('Teacher not found', 404, 'notFound');
      return ok(shapeTeacher(teacher!), 'Teacher fetched successfully');
    }
    if (method === 'PUT' && rest[1] === 'admin') {
      auth(token, ['admin']);
      const teacher = byId(teachers, rest[0]);
      if (!teacher) fail('Teacher not found', 404, 'notFound');
      Object.assign(teacher!, body);
      return ok(shapeTeacher(teacher!), 'Teacher assigned successfully');
    }
    if (method === 'DELETE' && rest[1] === 'admin') {
      const index = teachers.findIndex((item) => item._id === rest[0]);
      if (index < 0) fail('Teacher not found', 404, 'notFound');
      teachers.splice(index, 1);
      return ok(null, 'Teacher deleted successfully');
    }
    if (method === 'PUT' && rest[1] === 'update') {
      const { id } = auth(token, ['teacher']);
      const teacher = byId(teachers, id)!;
      if (body.email && teachers.some((item) => item.email === body.email && item._id !== id)) {
        fail('This email is already taken', 400, 'validation');
      }
      Object.assign(teacher, body);
      return ok(shapeTeacher(teacher), 'Profile updated successfully');
    }
  }

  /* generic CRUD collections */
  const collections: Record<
    string,
    {list: Json[];label: string;shape?: (item: Json) => Json;create: (body: Json) => Json;}> =
  {
    program: {
      list: programs,
      label: 'Program',
      create: (input) => ({
        _id: uid('pr'),
        name: input.name,
        description: input.description,
        code: `PRG-${programs.length + 1}`,
        duration: '4 years',
        teachers: [],
        students: [],
        subjects: []
      })
    },
    'class-Level': {
      list: classLevels,
      label: 'Class level',
      create: (input) => ({
        _id: uid('cl'),
        name: input.name,
        description: input.description,
        students: [],
        subjects: [],
        teachers: []
      })
    },
    academics: {
      list: academicYears,
      label: 'Academic year',
      create: (input) => ({
        _id: uid('ay'),
        name: input.name,
        fromYear: input.fromYear,
        toYear: input.toYear,
        isCurrent: false,
        students: [],
        teachers: []
      })
    },
    terms: {
      list: academicTerms,
      label: 'Academic term',
      create: (input) => ({
        _id: uid('at'),
        name: input.name,
        description: input.description,
        duration: input.duration || '3 months'
      })
    },
    'year-Groups': {
      list: yearGroups,
      label: 'Year group',
      shape: shapeYearGroup,
      create: (input) => ({ _id: uid('yg'), name: input.name, academicYear: input.academicYear })
    }
  };

  const collection = collections[root];
  if (collection) {
    const shape = collection.shape ?? ((item: Json) => item);
    if (method === 'GET' && rest.length === 0) {
      auth(token, ['admin', 'teacher', 'student']);
      return ok(collection.list.map(shape), 'Fetched successfully', {
        results: collection.list.length,
        total: collection.list.length
      });
    }
    if (method === 'POST' && rest.length === 0) {
      auth(token, ['admin']);
      if (collection.list.some((item) => item.name === body.name)) {
        fail(`This ${collection.label.toLowerCase()} already exists`, 400, 'validation');
      }
      const created = collection.create(body);
      collection.list.unshift(created);
      return ok(shape(created), `${collection.label} created successfully`);
    }
    if (method === 'GET' && rest.length === 1) {
      auth(token, ['admin', 'teacher', 'student']);
      const found = byId(collection.list, rest[0]);
      if (!found) fail(`${collection.label} not found`, 404, 'notFound');
      return ok(shape(found!), 'Fetched successfully');
    }
    if (method === 'PUT' && rest.length === 1) {
      auth(token, ['admin']);
      return ok(
        shape(updateRecord(collection.list, rest[0], body, collection.label)),
        `${collection.label} updated successfully`
      );
    }
    if (method === 'DELETE' && rest.length === 1) {
      auth(token, ['admin']);
      const index = collection.list.findIndex((item) => item._id === rest[0]);
      if (index < 0) fail(`${collection.label} not found`, 404, 'notFound');
      collection.list.splice(index, 1);
      return ok(null, `${collection.label} deleted successfully`);
    }
  }

  /* subjects */
  if (root === 'subjects') {
    if (method === 'GET' && rest.length === 0) {
      auth(token, ['admin', 'teacher', 'student']);
      return ok(subjects.map(shapeSubject), 'Subjects fetched successfully', {
        results: subjects.length,
        total: subjects.length
      });
    }
    /* POST /subjects — body: name, day, classes, teacher, academicTerm */
    if (method === 'POST' && rest.length === 0) {
      auth(token, ['admin']);
      if (subjects.some((item) => item.name === body.name)) {
        fail('This subject already exists', 400, 'validation');
      }
      const created = {
        _id: uid('sb'),
        name: body.name,
        day: body.day ?? '',
        classes: body.classes ?? '',
        teacher: body.teacher ?? null,
        academicTerm: body.academicTerm ?? null,
        duration: '3 months'
      };
      subjects.unshift(created);
      return ok(shapeSubject(created), 'Subject created successfully');
    }
    if (method === 'GET' && rest.length === 1) {
      auth(token, ['admin', 'teacher', 'student']);
      const found = byId(subjects, rest[0]);
      if (!found) fail('Subject not found', 404, 'notFound');
      return ok(shapeSubject(found!), 'Subject fetched successfully');
    }
    if (method === 'PUT' && rest.length === 1) {
      auth(token, ['admin']);
      return ok(shapeSubject(updateRecord(subjects, rest[0], body, 'Subject')), 'Subject updated successfully');
    }
    if (method === 'DELETE' && rest.length === 1) {
      auth(token, ['admin']);
      const index = subjects.findIndex((item) => item._id === rest[0]);
      if (index < 0) fail('Subject not found', 404, 'notFound');
      subjects.splice(index, 1);
      return ok(null, 'Subject deleted successfully');
    }
  }

  /* exams */
  if (root === 'exams') {
    if (method === 'GET' && rest.length === 0) {
      auth(token, ['admin', 'teacher', 'student']);
      return ok(exams.map(shapeExam), 'Exams fetched successfully', {
        results: exams.length,
        total: exams.length
      });
    }
    if (method === 'POST' && rest.length === 0) {
      const { id } = auth(token, ['teacher']);
      if (exams.some((item) => item.name === body.name)) {
        fail('An exam with this name already exists', 400, 'validation');
      }
      const created = { _id: uid('ex'), ...body, questions: [], createdBy: id, examStatus: 'pending' };
      exams.unshift(created);
      byId(teachers, id)?.examsCreated.push(created._id);
      return ok(shapeExam(created), 'Exam created successfully');
    }
    if (method === 'GET' && rest.length === 1) {
      auth(token, ['admin', 'teacher', 'student']);
      const found = byId(exams, rest[0]);
      if (!found) fail('Exam not found', 404, 'notFound');
      return ok(shapeExam(found!), 'Exam fetched successfully');
    }
    if (method === 'PUT' && rest.length === 1) {
      auth(token, ['teacher']);
      const exam = byId(exams, rest[0]);
      if (!exam) fail('Exam not found', 404, 'notFound');
      Object.assign(exam!, body);
      return ok(shapeExam(exam!), 'Exam updated successfully');
    }
  }

  /* questions */
  if (root === 'questions') {
    if (method === 'GET' && rest.length === 0) {
      auth(token, ['admin', 'teacher']);
      return ok(questions, 'Questions fetched successfully', {
        results: questions.length,
        total: questions.length
      });
    }
    if (method === 'POST' && rest.length === 1) {
      const { id } = auth(token, ['teacher']);
      const exam = byId(exams, rest[0]);
      if (!exam) fail('Exam not found', 404, 'notFound');
      if (questions.some((item) => item.question === body.question)) {
        fail('This question already exists', 400, 'validation');
      }
      const created = { _id: uid('q'), ...body, createdBy: id };
      questions.push(created);
      exam!.questions.push(created._id);
      return ok(created, 'Question created successfully');
    }
    if (method === 'GET' && rest.length === 1) {
      auth(token, ['admin', 'teacher']);
      const found = byId(questions, rest[0]);
      if (!found) fail('Question not found', 404, 'notFound');
      return ok(found, 'Question fetched successfully');
    }
    if (method === 'PUT' && rest.length === 1) {
      auth(token, ['teacher']);
      const question = byId(questions, rest[0]);
      if (!question) fail('Question not found', 404, 'notFound');
      Object.assign(question!, body);
      return ok(question, 'Question updated successfully');
    }
    if (method === 'DELETE' && rest.length === 1) {
      auth(token, ['teacher']);
      const index = questions.findIndex((item) => item._id === rest[0]);
      if (index < 0) fail('Question not found', 404, 'notFound');
      questions.splice(index, 1);
      return ok(null, 'Question deleted successfully');
    }
  }

  /* exam results */
  if (root === 'exam-results') {
    if (method === 'GET' && rest.length === 0) {
      const { role, id } = auth(token, ['admin', 'teacher', 'student']);
      const scoped =
      role === 'student' ?
      examResults.filter((item) => item.studentID === byId(students, id)?.studentId) :
      examResults;
      return ok(scoped.map(shapeResult), 'Exam results fetched successfully', {
        results: scoped.length,
        total: scoped.length
      });
    }
    if (method === 'GET' && rest[1] === 'checking') {
      auth(token, ['admin', 'teacher', 'student']);
      const found = byId(examResults, rest[0]);
      if (!found) fail('Exam result not found', 404, 'notFound');
      return ok(shapeResult(found!), 'Exam result fetched successfully');
    }
    if (method === 'PUT' && rest[1] === 'admin-toggle-publish') {
      auth(token, ['admin']);
      const found = byId(examResults, rest[0]);
      if (!found) fail('Exam result not found', 404, 'notFound');
      found!.isPublished = Boolean(body?.publish);
      return ok(shapeResult(found!), `Result ${found!.isPublished ? 'published' : 'unpublished'} successfully`);
    }
  }

  return fail(`Endpoint not found: ${method} ${path}`, 404, 'notFound');
}