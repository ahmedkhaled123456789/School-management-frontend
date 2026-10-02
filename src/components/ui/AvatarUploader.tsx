import { useRef, useState } from 'react';
import { CameraIcon, Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from './Avatar';
import { DEFAULT_AVATAR, fileToAvatarDataUrl } from '../../utils/image';
import { cn } from '../../utils/cn';

interface AvatarUploaderProps {
  image?: string | null;
  name?: string;
  /** Receives a resized data URL, or '' to restore the default picture. */
  onChange: (image: string) => Promise<unknown>;
  isSaving?: boolean;
  size?: 'lg' | 'xl';
}

/** Profile picture with "change" and "use default" actions. */
export function AvatarUploader({
  image,
  name,
  onChange,
  isSaving = false,
  size = 'lg'
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isReading, setIsReading] = useState(false);
  const busy = isSaving || isReading;
  const isDefault = !image || image === DEFAULT_AVATAR;

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsReading(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      await onChange(dataUrl);
    } catch (error) {
      // API errors are toasted by the mutation hooks; this covers file errors.
      if (error instanceof Error && !('status' in error)) toast.error(error.message);
    } finally {
      setIsReading(false);
    }
  };

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="group relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-wait"
        aria-label="Change profile picture">

        <Avatar image={image} name={name} size={size} />
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-full bg-ink-900/45 text-white transition-opacity',
            busy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
          )}>

          {busy ?
          <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" /> :
          <CameraIcon className="h-4 w-4" aria-hidden="true" />
          }
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFile} />

      {!isDefault &&
      <button
        type="button"
        disabled={busy}
        onClick={() => onChange('').catch(() => undefined)}
        className="text-[11px] font-semibold text-ink-500 hover:text-danger-500 disabled:opacity-50">

          Use default
        </button>
      }
    </div>);

}
