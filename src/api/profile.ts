import { request, unwrap } from './client';

export interface ProfileImageUser {
  _id: string;
  name?: string;
  email?: string;
  image?: string;
}

/** PUT /profile/image — the signed-in user (any role) changes their picture; '' restores the default. */
export async function updateMyImage(image: string): Promise<ProfileImageUser> {
  return unwrap<ProfileImageUser>(
    await request('/profile/image', { method: 'PUT', body: { image } })
  );
}
