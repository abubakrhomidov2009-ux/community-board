'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useLocale, useTranslations } from 'next-intl';
import { useId, type ComponentType, type ReactNode, type RefObject } from 'react';
import { useForm, type FieldError, type UseFormRegisterReturn } from 'react-hook-form';
import { pillClass } from '@/components/shared/pill-button';
import { Link } from '@/i18n/navigation';
import { toApiError } from '@/lib/api/errors';
import { fadeIn, slideUp } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useLoginMutation, useRegisterMutation } from '../mutations';
import { loginSchema, registerSchema, type LoginValues, type RegisterValues } from '../schemas';

export type AuthMode = 'login' | 'register';

interface AuthSlipProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
  /** Called after a successful login or sign-up. */
  onSuccess: () => void;
  /** The dialog title element of the library that hosts the slip (it must be inside the dialog). */
  Title: ComponentType<{ id?: string; className?: string; children?: ReactNode }>;
  /** Gets the first input so the dialog can focus it. */
  firstInputRef: RefObject<HTMLInputElement | null>;
}

/** The log in / create account slip: pin on top, green strip, form, dashed line and the switch link. */
export function AuthSlip({
  mode,
  onModeChange,
  onClose,
  onSuccess,
  Title,
  firstInputRef,
}: AuthSlipProps) {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const isRegister = mode === 'register';

  return (
    <div className="relative box-border w-full rounded-[8px_8px_22px_22px] border border-border bg-paper text-ink">
      <span
        aria-hidden="true"
        className="pin-dot absolute -top-[11px] left-1/2 -ml-[11px] size-[22px] rounded-full border-4"
      />
      <div className="h-2 rounded-[7px_7px_0_0] bg-primary" />

      <div className="flex flex-col gap-4 p-[22px_26px_24px]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <Title className="m-0 font-display text-2xl font-bold leading-[1.15] tracking-[-0.6px]">
              {isRegister ? t('registerTitle') : t('loginTitle')}
            </Title>
            <p className="m-0 text-[15px] text-body-2">
              {isRegister ? t('registerSub') : t('loginSub')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tc('close')}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-soft text-ink transition-colors duration-150 hover:bg-border"
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            {isRegister ? (
              <RegisterForm onSuccess={onSuccess} onClose={onClose} firstInputRef={firstInputRef} />
            ) : (
              <LoginForm onSuccess={onSuccess} firstInputRef={firstInputRef} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => onModeChange(isRegister ? 'login' : 'register')}
        className="flex h-14 w-full items-center justify-center gap-1.5 rounded-b-[21px] border-0 border-t-[1.5px] border-dashed border-line bg-transparent text-sm font-semibold text-ink transition-colors duration-150 hover:bg-soft"
      >
        {isRegister ? t('switchToLoginText') : t('switchToRegisterText')}{' '}
        <span className="font-bold text-primary">
          {isRegister ? t('switchToLoginCta') : t('switchToRegisterCta')}
        </span>
      </button>
    </div>
  );
}

// ---------- forms ----------

function LoginForm({
  onSuccess,
  firstInputRef,
}: {
  onSuccess: () => void;
  firstInputRef: RefObject<HTMLInputElement | null>;
}) {
  const t = useTranslations('auth');
  const login = useLoginMutation();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { emailOrUsername: '', password: '' },
  });
  const { errors } = form.formState;

  async function submit(values: LoginValues) {
    try {
      await login.mutateAsync({
        emailOrUsername: values.emailOrUsername,
        password: values.password,
      });
      onSuccess();
    } catch {
      // The error is shown from login.error below.
    }
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(submit)}
      className="flex flex-col"
      aria-busy={login.isPending}
    >
      <Field
        id="auth-identifier"
        label={t('identifier')}
        error={errors.emailOrUsername}
        input={form.register('emailOrUsername')}
        inputRef={firstInputRef}
        placeholder={t('identifierPlaceholder')}
        autoComplete="username"
        emphasized
      />
      <Field
        id="auth-password"
        label={t('password')}
        error={errors.password}
        input={form.register('password')}
        type="password"
        autoComplete="current-password"
      />
      <FormError error={login.error} />
      <SubmitButton pending={login.isPending} label={t('submitLogin')} />
    </form>
  );
}

function RegisterForm({
  onSuccess,
  onClose,
  firstInputRef,
}: {
  onSuccess: () => void;
  onClose: () => void;
  firstInputRef: RefObject<HTMLInputElement | null>;
}) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const register = useRegisterMutation();
  const agreeId = useId();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', agree: false },
  });
  const { errors } = form.formState;

  async function submit(values: RegisterValues) {
    form.clearErrors('root');
    try {
      await register.mutateAsync({
        username: values.username,
        email: values.email,
        password: values.password,
        preferredLocale: locale.toUpperCase() as 'TG' | 'RU' | 'EN',
      });
      onSuccess();
    } catch (error) {
      // These two belong to a field, so they are shown under it.
      const { errorCode } = toApiError(error);
      if (errorCode === 'USERNAME_TAKEN') form.setError('username', { message: errorCode });
      if (errorCode === 'EMAIL_TAKEN') form.setError('email', { message: errorCode });
    }
  }

  const fieldError =
    register.error &&
    ['USERNAME_TAKEN', 'EMAIL_TAKEN'].includes(toApiError(register.error).errorCode);

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(submit)}
      className="flex flex-col"
      aria-busy={register.isPending}
    >
      <Field
        id="auth-username"
        label={t('username')}
        error={errors.username}
        input={form.register('username')}
        inputRef={firstInputRef}
        placeholder={t('usernamePlaceholder')}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
      />
      <Field
        id="auth-email"
        label={t('email')}
        error={errors.email}
        input={form.register('email')}
        type="email"
        placeholder={t('emailPlaceholder')}
        autoComplete="email"
        emphasized
      />
      <Field
        id="auth-new-password"
        label={t('password')}
        error={errors.password}
        input={form.register('password')}
        type="password"
        autoComplete="new-password"
        hint={t('passwordHint')}
      />
      <div className="flex flex-col pb-4">
        <label htmlFor={agreeId} className="flex items-center gap-2.5 text-sm text-body">
          <input
            id={agreeId}
            type="checkbox"
            {...form.register('agree')}
            aria-invalid={errors.agree ? true : undefined}
            aria-describedby={errors.agree ? `${agreeId}-msg` : undefined}
            className="m-0 size-5 shrink-0 accent-primary"
          />
          <span>
            {t.rich('agree', {
              rules: (chunks) => (
                <Link
                  href="/about#rules"
                  onClick={onClose}
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        <FieldMessage id={`${agreeId}-msg`} error={errors.agree} />
      </div>
      {!fieldError && <FormError error={register.error} />}
      <SubmitButton pending={register.isPending} label={t('submitRegister')} />
    </form>
  );
}

// ---------- parts ----------

function Field({
  id,
  label,
  error,
  input,
  inputRef,
  hint,
  emphasized,
  type = 'text',
  ...rest
}: {
  id: string;
  label: string;
  error?: FieldError;
  input: UseFormRegisterReturn;
  inputRef?: RefObject<HTMLInputElement | null>;
  hint?: string;
  emphasized?: boolean;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'>) {
  const { ref, ...inputProps } = input;
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mb-1.5 text-[13px] font-bold">
        {label}
      </label>
      <input
        id={id}
        type={type}
        {...inputProps}
        {...rest}
        ref={(element) => {
          ref(element);
          if (inputRef) inputRef.current = element;
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-msg`}
        className={cn(
          'box-border h-[50px] w-full rounded-[14px] border-[1.5px] bg-paper px-4 text-base text-ink placeholder:text-muted',
          'transition-colors duration-150 focus:border-ink focus:outline-none',
          error ? 'border-danger focus:border-danger' : emphasized ? 'border-ink' : 'border-line',
        )}
      />
      <FieldMessage id={`${id}-msg`} error={error} hint={hint} />
    </div>
  );
}

/** One line under every field (16px, like the gap in the design): the hint or the error slides in. */
function FieldMessage({ id, error, hint }: { id: string; error?: FieldError; hint?: string }) {
  const tv = useTranslations('validation');
  const te = useTranslations('errors');
  const code = error?.message;
  const text = code ? (te.has(code as never) ? te(code as never) : tv(code as never)) : null;
  return (
    <div id={id} className="min-h-4 pb-1 pt-1.5 text-[13px] leading-4" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        {text ? (
          <motion.p
            key="error"
            variants={slideUp}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            className="m-0 text-danger"
          >
            {text}
          </motion.p>
        ) : hint ? (
          <p key="hint" className="m-0 text-muted">
            {hint}
          </p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Problems that belong to the whole form (wrong password, blocked, too many tries, no connection). */
function FormError({ error }: { error: unknown }) {
  const te = useTranslations('errors');
  const code = error ? toApiError(error).errorCode : null;
  return (
    <AnimatePresence initial={false}>
      {code && (
        <motion.p
          key={code}
          role="alert"
          variants={slideUp}
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0 }}
          className="mb-4 mt-0 rounded-2xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {te.has(code as never) ? te(code as never) : te('UNKNOWN')}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/** The ink pill. While sending, the label becomes a skeleton bar (no spinner). */
function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  const t = useTranslations('auth');
  return (
    <button type="submit" disabled={pending} className={pillClass('ink', 'block')}>
      {pending ? (
        <>
          <span className="sr-only">{t('pending')}</span>
          <span
            aria-hidden="true"
            className="skeleton h-3.5 w-28 rounded-full"
            style={{ backgroundColor: 'color-mix(in srgb, var(--on-ink) 28%, transparent)' }}
          />
        </>
      ) : (
        <>
          {label}
          <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
        </>
      )}
    </button>
  );
}
