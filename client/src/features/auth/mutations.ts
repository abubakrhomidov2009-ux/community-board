'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@/i18n/navigation';
import { beginSignOut, clearSessionHint, setSessionHint } from '@/lib/session-hint';
import { login, logout, register, type User } from './api';
import { authKeys } from './queries';

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (user: User) => {
      setSessionHint();
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: register,
    onSuccess: (user: User) => {
      setSessionHint();
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

/** Logs out and goes back to About. The redirect lives here (not at the call site) because the page that asked is already gone by then. */
export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: logout,
    onMutate: beginSignOut,
    // Even if the request fails, this browser forgets the login.
    onSettled: () => {
      clearSessionHint();
      queryClient.clear();
      router.replace('/');
    },
  });
}
