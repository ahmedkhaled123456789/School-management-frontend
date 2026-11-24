import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, DownloadIcon, ImageIcon, RotateCcwIcon, Trash2Icon, UploadIcon } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Input } from '../../components/ui/Input';
import { Logo } from '../../components/ui/Logo';
import { PageHeader } from '../../components/ui/PageHeader';
import { useBranding } from '../../hooks/branding';
import {
  DEFAULT_BRANDING,
  DEFAULT_LOGIN_BACKGROUND,
  FONTS,
  PRESETS,
  normalizeBranding,
  previewRamp,
  type Branding,
  type Corners,
  type FontChoice,
  type SidebarStyle } from
'../../lib/branding';
import { isHex } from '../../lib/color';
import { cn } from '../../utils/cn';
import { readImageFile } from '../../utils/imageFile';

const same = (a: Branding, b: Branding) => JSON.stringify(a) === JSON.stringify(b);

/** Color input + hex text field kept in sync. */
function ColorField({ id, label, value, onChange, hint }: {id: string;label: string;value: string;onChange: (hex: string) => void;hint?: string;}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-semibold text-ink-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-ink-200 bg-white p-1" />

        <input
          id={id}
          value={text}
          onChange={(e) => {
            const next = e.target.value.trim();
            setText(next);
            const hex = next.startsWith('#') ? next : `#${next}`;
            if (isHex(hex)) onChange(hex.toLowerCase());
          }}
          aria-invalid={!isHex(text.startsWith('#') ? text : `#${text}`)}
          className="h-10 w-full rounded-lg border border-ink-200 px-3 font-mono text-sm uppercase focus:border-primary-500" />

      </div>
      {hint && <p className="text-[12.5px] text-ink-500">{hint}</p>}
    </div>);

}

function Ramp({ hex, anchor }: {hex: string;anchor: number;}) {
  const steps = useMemo(() => previewRamp(hex, anchor), [hex, anchor]);
  return (
    <div className="flex overflow-hidden rounded-lg border border-ink-200" aria-label="Generated shades">
      {steps.map((s) =>
      <span key={s.step} className="h-7 flex-1" style={{ background: s.hex }} title={`${s.step} · ${s.hex}`} />
      )}
    </div>);

}

/** Image picker with preview, replace and remove. */
function ImagePicker({ label, value, fallback, onChange, kind, previewClass }: {label: string;value: string;fallback: string;onChange: (dataUrl: string) => void;kind: 'logo' | 'background';previewClass: string;}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await readImageFile(file, kind === 'logo' ?
      { maxWidth: 480, maxHeight: 240, format: 'png', maxBytes: 350_000 } :
      { maxWidth: 1600, maxHeight: 1200, format: 'jpeg', maxBytes: 900_000 });
      onChange(dataUrl);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-semibold text-ink-700">{label}</p>
      <div className={cn('flex items-center justify-center overflow-hidden rounded-xl border border-ink-200', previewClass)}>
        <img src={value || fallback} alt="" className={kind === 'logo' ? 'max-h-20 max-w-[80%] object-contain' : 'h-full w-full object-cover'} />
      </div>
      <div className="flex flex-wrap gap-2">
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <Button size="sm" variant="secondary" isLoading={busy} icon={<UploadIcon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => input.current?.click()}>
          {value ? 'Replace' : 'Upload'}
        </Button>
        {value && <Button size="sm" variant="ghost" icon={<Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" />} onClick={() => onChange('')}>Use default</Button>}
      </div>
    </div>);

}

function Choice<T extends string>({ name, value, options, onChange }: {name: string;value: T;options: Array<{value: T;label: string;render: React.ReactNode;}>;onChange: (v: T) => void;}) {
  return (
    <div role="radiogroup" aria-label={name} className="grid grid-cols-3 gap-2">
      {options.map((o) =>
      <button
        key={o.value}
        type="button"
        role="radio"
        aria-checked={value === o.value}
        onClick={() => onChange(o.value)}
        className={cn('rounded-xl border p-2.5 text-start transition-colors', value === o.value ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-ink-200 hover:border-ink-300')}>

          {o.render}
          <span className="mt-2 flex items-center justify-between text-[12.5px] font-semibold text-ink-800">
            {o.label}
            {value === o.value && <CheckIcon className="h-3.5 w-3.5 text-primary-600" aria-hidden="true" />}
          </span>
        </button>
      )}
    </div>);

}

export function AdminBranding() {
  const { branding, saved, report, preview, save, revert } = useBranding();
  const [draft, setDraft] = useState<Branding>(branding);
  const [confirmReset, setConfirmReset] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const dirty = !same(draft, saved);

  // every change previews live across the whole app
  useEffect(() => {
    preview(draft);
  }, [draft, preview]);
  // leaving the page without saving: back to the saved branding
  useEffect(() => () => revert(), [revert]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event: BeforeUnloadEvent) => {event.preventDefault();};
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = <K extends keyof Branding,>(key: K, value: Branding[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const activePreset = PRESETS.find((p) => p.primary === draft.primary && p.accent === draft.accent)?.id;

  const onSave = () => {
    const clean = normalizeBranding({ ...draft, appName: draft.appName.trim() || DEFAULT_BRANDING.appName });
    if (save(clean)) {
      setDraft(clean);
      toast.success('Branding saved.');
    } else {
      toast.error('The browser storage is full. Use smaller images and try again.');
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'branding.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  const importJson = async (file?: File) => {
    if (!file) return;
    try {
      setDraft(normalizeBranding(JSON.parse(await file.text())));
      toast.success('Branding imported. Review it, then save.');
    } catch {
      toast.error('This file is not a valid branding export.');
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  };

  const sidebarSample = (style: SidebarStyle) => {
    const bg = style === 'brand' ? 'rgb(var(--primary-800))' : style === 'dark' ? '#0f1b2b' : '#ffffff';
    const line = style === 'light' ? '#d6dde5' : 'rgb(255 255 255 / 0.25)';
    return (
      <span className="flex h-14 overflow-hidden rounded-lg border border-ink-200">
        <span className="flex w-1/3 flex-col gap-1.5 p-1.5" style={{ background: bg }}>
          {[0, 1, 2].map((i) => <span key={i} className="h-1.5 rounded-full" style={{ background: i === 0 ? 'rgb(var(--accent-300))' : line }} />)}
        </span>
        <span className="flex-1 bg-canvas" />
      </span>);

  };
  const cornerSample = (c: Corners) =>
  <span className="flex h-14 items-center justify-center rounded-lg bg-ink-50">
      <span className="h-8 w-14 border-2 border-primary-600 bg-white" style={{ borderRadius: c === 'sharp' ? 4 : c === 'soft' ? 10 : 18 }} />
    </span>;


  return (
    <>
      <PageHeader
        title="Branding"
        description="Your school's logo, name, colors and look. Changes preview live across the whole app; nothing is kept until you save."
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'System' }, { label: 'Branding' }]}
        actions={
        <>
            <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={(e) => importJson(e.target.files?.[0])} />
            <Button variant="ghost" icon={<UploadIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => importRef.current?.click()}>Import</Button>
            <Button variant="ghost" icon={<DownloadIcon className="h-4 w-4" aria-hidden="true" />} onClick={exportJson}>Export</Button>
            <Button variant="secondary" icon={<RotateCcwIcon className="h-4 w-4" aria-hidden="true" />} onClick={() => setConfirmReset(true)}>Reset</Button>
          </>
        } />


      <div className="mb-5 rounded-xl border border-accent-100 bg-accent-50 px-4 py-2.5 text-[13px] text-accent-500">
        <strong>Preview feature.</strong> The branding is stored in this browser until it moves to the school settings on the server.
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader title="Identity" description="Shown in the sidebar, the sign-in page, printed documents and the browser tab." />
            <CardBody className="grid gap-5 md:grid-cols-2">
              <div className="space-y-4">
                <Input id="brand-name" label="School / app name" required dir="auto" maxLength={60} value={draft.appName} onChange={(e) => set('appName', e.target.value)} />
                <Input id="brand-tagline" label="Tagline" dir="auto" maxLength={60} value={draft.tagline} placeholder="e.g. Learning without limits" onChange={(e) => set('tagline', e.target.value)} />
              </div>
              <ImagePicker
                label="Logo"
                kind="logo"
                value={draft.logo}
                fallback="/logo.png"
                previewClass="h-28 bg-primary-800"
                onChange={(logo) => set('logo', logo)} />

            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Colors" description="Pick a theme or your own colors; every shade is generated from them." />
            <CardBody className="space-y-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PRESETS.map((p) =>
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={activePreset === p.id}
                  onClick={() => setDraft((d) => ({ ...d, primary: p.primary, accent: p.accent }))}
                  className={cn('rounded-xl border p-2.5 text-start transition-colors', activePreset === p.id ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-ink-200 hover:border-ink-300')}>

                    <span className="flex h-8 overflow-hidden rounded-lg">
                      <span className="flex-[3]" style={{ background: p.primary }} />
                      <span className="flex-1" style={{ background: p.accent }} />
                    </span>
                    <span className="mt-1.5 flex items-center justify-between text-[12.5px] font-semibold text-ink-800">
                      {p.name}{activePreset === p.id && <CheckIcon className="h-3.5 w-3.5 text-primary-600" aria-hidden="true" />}
                    </span>
                  </button>
                )}
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <ColorField id="brand-primary" label="Main color" value={draft.primary} onChange={(hex) => set('primary', hex)} hint="Buttons, links, the sidebar." />
                  <Ramp hex={draft.primary} anchor={600} />
                </div>
                <div className="space-y-2">
                  <ColorField id="brand-accent" label="Accent color" value={draft.accent} onChange={(hex) => set('accent', hex)} hint="Highlights: the active page marker, badges." />
                  <Ramp hex={draft.accent} anchor={300} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <Badge tone={report.buttonContrast >= 4.5 ? 'success' : 'warn'}>
                  {report.buttonContrast >= 4.5 ? 'Readable' : 'Low contrast'}
                </Badge>
                <span className="text-ink-600">White text on buttons: <strong className="font-mono">{report.buttonContrast}:1</strong> (4.5:1 needed)</span>
                {report.primaryAdjusted && <span className="text-ink-500">· the main color was darkened a little so text on buttons stays readable.</span>}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Layout & typography" />
            <CardBody className="space-y-5">
              <div>
                <p className="mb-2 text-[13px] font-semibold text-ink-700">Sidebar</p>
                <Choice<SidebarStyle> name="Sidebar style" value={draft.sidebar} onChange={(v) => set('sidebar', v)} options={[
                { value: 'brand', label: 'Brand color', render: sidebarSample('brand') },
                { value: 'dark', label: 'Dark', render: sidebarSample('dark') },
                { value: 'light', label: 'Light', render: sidebarSample('light') }]
                } />
              </div>
              <div>
                <p className="mb-2 text-[13px] font-semibold text-ink-700">Corners</p>
                <Choice<Corners> name="Corners" value={draft.corners} onChange={(v) => set('corners', v)} options={[
                { value: 'sharp', label: 'Sharp', render: cornerSample('sharp') },
                { value: 'soft', label: 'Soft', render: cornerSample('soft') },
                { value: 'round', label: 'Round', render: cornerSample('round') }]
                } />
              </div>
              <div>
                <p className="mb-2 text-[13px] font-semibold text-ink-700">Font</p>
                <div role="radiogroup" aria-label="Font" className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(FONTS) as FontChoice[]).map((font) =>
                  <button
                    key={font}
                    type="button"
                    role="radio"
                    aria-checked={draft.font === font}
                    onClick={() => set('font', font)}
                    className={cn('flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-start', draft.font === font ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-ink-200 hover:border-ink-300')}>

                      <span>
                        <span className="block text-[15px] font-bold text-ink-900" style={{ fontFamily: FONTS[font].family }}>Aa · أبجد · 123</span>
                        <span className="text-[12px] text-ink-500">{FONTS[font].label}{FONTS[font].note ? ` · ${FONTS[font].note}` : ''}</span>
                      </span>
                      {draft.font === font && <CheckIcon className="h-4 w-4 text-primary-600" aria-hidden="true" />}
                    </button>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Sign-in page" description="The photo behind the sign-in card (tinted with your main color)." />
            <CardBody>
              <ImagePicker
                label="Background photo"
                kind="background"
                value={draft.loginBackground}
                fallback={DEFAULT_LOGIN_BACKGROUND}
                previewClass="relative h-40 bg-ink-100"
                onChange={(bg) => set('loginBackground', bg)} />

            </CardBody>
          </Card>
        </div>

        {/* live sample of the main building blocks */}
        <div className="xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardHeader title="Preview" description="The whole app already shows your changes." />
            <CardBody className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-ink-200">
                <div className="sb flex items-center gap-3 px-4 py-3">
                  <Logo surface={draft.sidebar === 'light' ? 'light' : 'dark'} imageClassName="h-9" />
                  <span className="min-w-0">
                    <span dir="auto" className="block truncate text-[13px] font-bold">{draft.appName || DEFAULT_BRANDING.appName}</span>
                    <span dir="auto" className="sb-label block truncate text-[11px]">{draft.tagline}</span>
                  </span>
                </div>
                <div className="space-y-3 bg-canvas p-4">
                  <div className="rounded-xl border border-ink-200 bg-white p-3 shadow-card">
                    <p className="text-[13px] font-bold text-ink-900">Card title</p>
                    <p className="text-[12px] text-ink-500">Supporting text in the body.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm">Primary</Button>
                      <Button size="sm" variant="secondary">Secondary</Button>
                      <Button size="sm" variant="accent">Accent</Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="info">Info</Badge>
                    <Badge tone="accent">Accent</Badge>
                    <Badge tone="success">Paid</Badge>
                  </div>
                  <a className="text-[13px] font-semibold text-primary-600 underline" href="#preview" onClick={(e) => e.preventDefault()}>A link</a>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[12.5px] text-ink-500"><ImageIcon className="h-4 w-4" aria-hidden="true" />The browser tab shows your logo and name.</div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* sticky save bar while there are unsaved changes */}
      {dirty &&
      <div role="status" className="sticky bottom-4 z-20 mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white/95 px-4 py-3 shadow-pop backdrop-blur">
          <p className="text-[13.5px] font-semibold text-ink-800">You are previewing unsaved changes.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDraft(saved)}>Discard</Button>
            <Button onClick={onSave}>Save branding</Button>
          </div>
        </div>
      }

      <ConfirmDialog
        open={confirmReset}
        title="Reset the branding?"
        message="The original logo, name, colors and layout come back. Save afterwards to keep the reset."
        confirmLabel="Reset"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {setDraft(DEFAULT_BRANDING);setConfirmReset(false);}} />

    </>);

}
