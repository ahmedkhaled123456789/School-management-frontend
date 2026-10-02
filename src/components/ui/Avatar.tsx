import { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';
import { DEFAULT_AVATAR, avatarSrc } from '../../utils/image';

const SIZES = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-14 w-14',
  xl: 'h-24 w-24'
} as const;

interface AvatarProps {
  image?: string | null;
  name?: string;
  size?: keyof typeof SIZES;
  className?: string;
}

/** User profile picture; falls back to the default picture if missing or broken. */
export function Avatar({ image, name, size = 'md', className }: AvatarProps) {
  const [src, setSrc] = useState(avatarSrc(image));

  useEffect(() => {
    setSrc(avatarSrc(image));
  }, [image]);

  return (
    <img
      src={src}
      alt={name ? `${name}'s profile picture` : 'Profile picture'}
      loading="lazy"
      onError={() => {
        if (src !== DEFAULT_AVATAR) setSrc(DEFAULT_AVATAR);
      }}
      className={cn(
        'shrink-0 rounded-full bg-ink-100 object-cover ring-2 ring-white',
        SIZES[size],
        className
      )} />);


}
