import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCapIcon, ShieldCheckIcon, UsersIcon } from 'lucide-react';
import { ApiError } from '../api/client';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Logo } from '../components/ui/Logo';
import { useAuth, useLogin } from '../hooks/auth';
import { homePathForRole } from '../lib/routes';
import type { Role } from '../types/common';
import { cn } from '../utils/cn';
import { emailField, passwordField, type Errors } from '../utils/validation';

const BACKDROP = "/d74597ec-d7b0-43b2-85b3-78807e6ec9f3.jpg";


const ROLES: Array<{value: Role;label: string;icon: typeof ShieldCheckIcon;blurb: string;}> = [
{
  value: 'admin',
  label: 'Admin',
  icon: ShieldCheckIcon,
  blurb: 'Manage students, staff, academics and result publishing.'
},
{
  value: 'teacher',
  label: 'Teacher',
  icon: UsersIcon,
  blurb: 'Create exams, build question papers and track your classes.'
},
{
  value: 'student',
  label: 'Student',
  icon: GraduationCapIcon,
  blurb: 'Sit your exams and review published results.'
}];


interface FormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const { role: roleParam } = useParams<{role: string;}>();
  const navigate = useNavigate();
  const { session } = useAuth();

  const role: Role = ROLES.some((item) => item.value === roleParam) ?
  roleParam as Role :
  'admin';

  const [values, setValues] = useState<FormValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<Errors<FormValues>>({});
  const login = useLogin(role);

  useEffect(() => {
    setErrors({});
    login.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  if (session) {
    return <Navigate to={homePathForRole[session.role]} replace />;
  }

  const active = ROLES.find((item) => item.value === role) as (typeof ROLES)[number];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Errors<FormValues> = {
      email: emailField(values.email),
      password: passwordField(values.password)
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;
    login.mutate({ email: values.email.trim(), password: values.password });
  };

  const serverError =
  login.error instanceof ApiError ?
  login.error.message :
  login.error ?
  'Unable to sign in right now. Please try again.' :
  null;

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-primary-900 px-4 py-6">
      <img src={BACKDROP} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-primary-900/85" />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
          'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '56px 56px'
        }} />
      

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-pop">
        
        <div className="flex justify-center border-b border-ink-100 bg-primary-800 px-6 py-5">
          <Logo imageClassName="h-12" />
        </div>

        <div className="px-6 py-6 sm:px-7">
          <h1 className="text-center text-[20px] font-extrabold tracking-tight text-ink-900">
            Sign in to your workspace
          </h1>
          <p className="mt-1 text-center text-[13px] leading-relaxed text-ink-500">
            {active.blurb}
          </p>

          <div
            role="tablist"
            aria-label="Select account type"
            className="mt-5 grid grid-cols-3 gap-1 rounded-xl bg-ink-100 p-1">
            
            {ROLES.map((item) => {
              const isActive = item.value === role;
              return (
                <button
                  key={item.value}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  onClick={() => navigate(`/login/${item.value}`)}
                  className={cn(
                    'relative flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[13px] font-bold transition-colors',
                    isActive ? 'text-white' : 'text-ink-500 hover:text-ink-800'
                  )}>
                  
                  {isActive &&
                  <motion.span
                    layoutId="role-pill"
                    className="absolute inset-0 rounded-lg bg-primary-600"
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }} />

                  }
                  <item.icon className="relative h-3.5 w-3.5" aria-hidden="true" />
                  <span className="relative">{item.label}</span>
                </button>);

            })}
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-3.5">
            <Input
              id="email"
              label="Email address"
              type="email"
              autoComplete="username"
              required
              value={values.email}
              error={errors.email}
              placeholder="you@school.edu"
              onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))} />
            
            <Input
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={values.password}
              error={errors.password}
              placeholder="••••••••"
              onChange={(event) =>
              setValues((prev) => ({ ...prev, password: event.target.value }))
              } />
            

            {serverError &&
            <p
              role="alert"
              className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2.5 text-[13px] font-medium text-danger-600">
              
                {serverError}
              </p>
            }

            <Button type="submit" size="lg" fullWidth isLoading={login.isPending}>
              {login.isPending ? 'Signing in…' : `Sign in as ${active.label}`}
            </Button>
          </form>
        </div>

        <p className="border-t border-ink-100 bg-ink-50/70 px-6 py-3 text-center text-[12px] text-ink-400">
          Accounts are provisioned by your school administrator.
        </p>
      </motion.main>
    </div>);

}