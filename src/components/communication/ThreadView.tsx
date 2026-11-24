import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LockIcon, SendIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Thread } from '../../types/communication';
import { cn } from '../../utils/cn';

interface Props {
  thread: Thread;
  /** which side the viewer is on (their bubbles go right) */
  me: 'teacher' | 'parent' | 'office';
  canReply: boolean;
  isSending?: boolean;
  onSend: (body: string) => Promise<unknown>;
  actions?: ReactNode;
}

const stamp = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** One conversation: bubbles, day order, and a composer (Ctrl+Enter sends). */
export function ThreadView({ thread, me, canReply, isSending, onSend, actions }: Props) {
  const [draft, setDraft] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  // braces: newer browsers return a Promise from scrollIntoView, and an effect must return nothing or a cleanup
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [thread.messages.length]);
  const send = () => {
    const text = draft.trim();
    if (!text || isSending) return;
    onSend(text).then(() => setDraft('')).catch(() => undefined);
  };

  return (
    <div className="flex h-full min-h-[420px] flex-col">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-ink-100 px-5 py-3">
        <div className="min-w-0">
          <p dir="auto" className="truncate text-[15px] font-bold text-ink-900">{thread.subject}</p>
          <p className="text-[12.5px] text-ink-500">About {thread.student.name} · {thread.teacher.name} and the parents</p>
        </div>
        {actions}
      </div>
      <div className="scrollbar-thin max-h-[52vh] flex-1 space-y-3 overflow-y-auto bg-ink-50/60 px-5 py-4" aria-live="polite">
        {thread.messages.map((m) => {
          const mine = m.from === me;
          return (
            <div key={m._id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
              <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed shadow-sm', mine ? 'rounded-ee-md bg-primary-600 text-white' : m.from === 'office' ? 'rounded-es-md border border-accent-100 bg-accent-50 text-ink-900' : 'rounded-es-md bg-white text-ink-900')}>
                <p dir="auto" className="whitespace-pre-line">{m.body}</p>
              </div>
              <p className="mt-0.5 px-1 text-[11px] text-ink-400">{mine ? 'You' : m.name} · {stamp(m.at)}</p>
            </div>);

        })}
        <div ref={bottom} />
      </div>
      {thread.status === 'closed' ?
      <p className="flex items-center gap-2 border-t border-ink-100 px-5 py-3 text-[13px] text-ink-500"><LockIcon className="h-4 w-4" aria-hidden="true" />This conversation is closed.</p> :
      canReply ?
      <form onSubmit={(e) => {e.preventDefault();send();}} className="flex items-end gap-2 border-t border-ink-100 px-4 py-3">
          <label className="sr-only" htmlFor={`reply-${thread._id}`}>Reply</label>
          <textarea
          id={`reply-${thread._id}`}
          rows={2}
          maxLength={2000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {e.preventDefault();send();}}}
          placeholder="Write a reply… (Ctrl+Enter to send)"
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-ink-200 px-3 py-2 text-[13.5px] focus:border-primary-500" />
          <Button type="submit" disabled={!draft.trim()} isLoading={isSending} icon={<SendIcon className="h-4 w-4" aria-hidden="true" />}>Send</Button>
        </form> :
      null}
    </div>);

}
