import type { Role } from '../types/common';

export const loginPathForRole: Record<Role, string> = {
  admin: '/login/admin',
  teacher: '/login/teacher',
  student: '/login/student'
};

export const homePathForRole: Record<Role, string> = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/student'
};