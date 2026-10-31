'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '@/features/auth/queries';
import {
  changePassword,
  removeAvatar,
  requestUniversityEmail,
  updateMe,
  uploadAvatar,
  verifyUniversityEmail,
  type User,
} from './api';

/** The new user from the server replaces the one in the cache: header and profile update at once. */
function useSaveUser() {
  const queryClient = useQueryClient();
  return (user: User) => {
    queryClient.setQueryData(authKeys.me, user);
    // The username is on every post and note: refresh what is on screen.
    void queryClient.invalidateQueries({ queryKey: ['posts'] });
    void queryClient.invalidateQueries({ queryKey: ['comments'] });
  };
}

export function useUpdateMe() {
  const save = useSaveUser();
  return useMutation({ mutationFn: updateMe, onSuccess: save });
}

export function useChangePassword() {
  const save = useSaveUser();
  return useMutation({ mutationFn: changePassword, onSuccess: save });
}

export function useUploadAvatar() {
  const save = useSaveUser();
  return useMutation({ mutationFn: uploadAvatar, onSuccess: save });
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeAvatar,
    onSuccess: () => {
      queryClient.setQueryData<User>(authKeys.me, (me) => (me ? { ...me, avatarUrl: null } : me));
    },
  });
}

export function useRequestUniversityEmail() {
  return useMutation({ mutationFn: requestUniversityEmail });
}

export function useVerifyUniversityEmail() {
  const save = useSaveUser();
  return useMutation({ mutationFn: verifyUniversityEmail, onSuccess: save });
}
