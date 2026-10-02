import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '../../api/client';
import { updateMyImage } from '../../api/profile';
import { queryKeys } from '../../lib/queryKeys';
import { useAuth } from '../auth';

/** Changes the signed-in user's picture and refreshes the session + profile caches. */
export function useUpdateMyImage() {
  const queryClient = useQueryClient();
  const { session, signIn } = useAuth();
  return useMutation({
    mutationFn: (image: string) => updateMyImage(image),
    onSuccess: (user) => {
      toast.success(user.image ? 'Profile picture updated.' : 'Profile picture removed.');
      if (session) signIn({ ...session, user: { ...session.user, image: user.image } });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminProfile });
      queryClient.invalidateQueries({ queryKey: queryKeys.teacherProfile });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentProfile });
    },
    onError: (error) => toast.error(errorMessage(error))
  });
}
