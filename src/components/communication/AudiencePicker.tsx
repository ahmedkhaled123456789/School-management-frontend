import type { Audience, AudienceKind } from '../../types/communication';
import type { Ref } from '../../types/sections';
import { cn } from '../../utils/cn';

const LABEL: Record<AudienceKind, string> = {
  everyone: 'Everyone',
  staff: 'All staff',
  teachers: 'Teachers',
  parents: 'All parents',
  students: 'All students',
  levels: 'Class levels',
  sections: 'Sections'
};

interface Props {
  value: Audience;
  onChange: (a: Audience) => void;
  kinds: AudienceKind[];
  levels: Ref[];
  sections: Ref[];
  /** levels / sections: let the user include parents (events always include them) */
  parentsToggle?: boolean;
  error?: string;
}

/** Who it is for: a group, or specific class levels / sections. */
export function AudiencePicker({ value, onChange, kinds, levels, sections, parentsToggle, error }: Props) {
  const targeted = value.kind === 'levels' || value.kind === 'sections';
  const options = value.kind === 'levels' ? levels : sections;
  const selected = new Set((value.targets ?? []).map((t) => t._id));
  const toggle = (ref: Ref) => onChange({ ...value, targets: selected.has(ref._id) ? (value.targets ?? []).filter((t) => t._id !== ref._id) : [...(value.targets ?? []), ref] });

  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-semibold text-ink-700">Who is it for?</legend>
      <div role="radiogroup" className="flex flex-wrap gap-1.5">
        {kinds.map((k) =>
        <button key={k} type="button" role="radio" aria-checked={value.kind === k}
        onClick={() => onChange({ kind: k, ...(k === 'levels' || k === 'sections' ? { targets: [], parents: value.parents ?? true } : {}) })}
        className={cn('rounded-lg border px-3 py-1.5 text-[13px] font-semibold', value.kind === k ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-ink-200 text-ink-700 hover:bg-ink-50')}>
            {LABEL[k]}
          </button>
        )}
      </div>
      {targeted &&
      <div className="mt-2.5 rounded-lg border border-ink-200 p-3">
          {options.length === 0 ?
        <p className="text-[12.5px] text-ink-500">No {value.kind === 'levels' ? 'class levels with sections' : 'sections'} this year yet.</p> :

        <div className="flex flex-wrap gap-1.5" role="group" aria-label={LABEL[value.kind]}>
              {options.map((o) =>
          <label key={o._id} className={cn('flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-semibold', selected.has(o._id) ? 'border-primary-500 bg-primary-600 text-white' : 'border-ink-200 text-ink-700 hover:bg-ink-50')}>
                  <input type="checkbox" className="sr-only" checked={selected.has(o._id)} onChange={() => toggle(o)} />
                  {o.name}
                </label>
          )}
            </div>
        }
          {parentsToggle &&
        <label className="mt-3 flex items-center gap-2 text-[13px] text-ink-700">
              <input type="checkbox" checked={Boolean(value.parents)} onChange={(e) => onChange({ ...value, parents: e.target.checked })} className="h-4 w-4 rounded border-ink-300" />
              Also send to their parents
            </label>
        }
        </div>
      }
      {error && <p role="alert" className="mt-1.5 text-[12.5px] text-danger-600">{error}</p>}
    </fieldset>);

}
