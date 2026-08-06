"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { MAX_PHOTOS, MAX_PHOTO_BYTES, ALLOWED_PHOTO_TYPES } from "@/lib/validation/photos";

type Attached = { file: File; previewUrl: string };

/** Attaches photos to a native form. Files stay in the native file input's
 * FileList (rebuilt via DataTransfer on add/remove) so they submit as part
 * of the same FormData the Server Action already reads — the actual upload
 * to Vercel Blob happens server-side on submit. This component only
 * produces local object-URL previews for the live summary panel.
 *
 * `maxPhotos`/`allowedTypes`/`maxBytes` default to the custom-order reference
 * photo limits so the existing caller (CustomOrderForm) is unaffected. */
export function PhotoAttach({
  name,
  onValueChange,
  maxPhotos = MAX_PHOTOS,
  allowedTypes = ALLOWED_PHOTO_TYPES,
  maxBytes = MAX_PHOTO_BYTES,
  helpText,
}: {
  name: string;
  onValueChange?: (previewUrls: string[]) => void;
  maxPhotos?: number;
  allowedTypes?: readonly string[];
  maxBytes?: number;
  helpText?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const attachedRef = useRef<Attached[]>([]);
  const [attached, setAttached] = useState<Attached[]>([]);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    attachedRef.current = attached;
  }, [attached]);

  useEffect(() => {
    return () => {
      attachedRef.current.forEach((a) => URL.revokeObjectURL(a.previewUrl));
    };
  }, []);

  function syncInputFiles(next: Attached[]) {
    const dt = new DataTransfer();
    next.forEach((a) => dt.items.add(a.file));
    if (inputRef.current) inputRef.current.files = dt.files;
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    if (incoming.length === 0) return;

    const next = [...attached];
    let rejected = false;

    for (const file of incoming) {
      if (next.length >= maxPhotos) {
        rejected = true;
        break;
      }
      if (!allowedTypes.includes(file.type) || file.size > maxBytes) {
        rejected = true;
        continue;
      }
      next.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    setAttached(next);
    syncInputFiles(next);
    onValueChange?.(next.map((a) => a.previewUrl));
    setError(rejected ? `Photos must be JPG, PNG, or WebP, up to ${Math.round(maxBytes / (1024 * 1024))}MB, ${maxPhotos} max.` : undefined);
  }

  function removeAt(index: number) {
    const removed = attached[index];
    URL.revokeObjectURL(removed.previewUrl);
    const next = attached.filter((_, i) => i !== index);
    setAttached(next);
    syncInputFiles(next);
    onValueChange?.(next.map((a) => a.previewUrl));
    setError(undefined);
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={allowedTypes.join(",")}
        multiple
        onChange={handleChange}
        className="hidden"
      />
      <div className="flex flex-wrap items-center gap-2.5">
        {attached.map((a, i) => (
          <div key={a.previewUrl} className="relative h-14 w-14">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, next/image can't optimize it */}
            <img
              src={a.previewUrl}
              alt=""
              className="block h-14 w-14 border-2 border-keyline object-cover"
            />
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label="Remove photo"
              className="absolute -right-2 -top-2 flex h-6 w-6 cursor-pointer items-center justify-center border-2 border-keyline bg-sheet p-0 text-keyline transition-colors duration-200 hover:bg-press-red hover:text-sheet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red"
            >
              <CrossMark />
            </button>
          </div>
        ))}
        {attached.length < maxPhotos && (
          // The slot the next reference goes in, drawn as an empty die: dashed
          // where a cut would be, so an unattached photo reads as a blank on
          // the sheet rather than as a disabled control.
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Attach photos"
            className="flex h-14 w-14 cursor-pointer items-center justify-center border-2 border-dashed border-keyline bg-sheet text-keyline [font-family:inherit] transition-colors duration-200 hover:bg-butter focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-press-red"
          >
            <PlusMark />
          </button>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        {helpText ?? `Optional. Up to ${maxPhotos} reference photos, JPG/PNG/WebP, 5MB each.`}
      </div>
      {error && <span className="text-[12.5px] text-destructive">{error}</span>}
    </div>
  );
}

/* Drawn at the keyline weight, replacing a `×` and a `+` set as text. */
function CrossMark() {
  return (
    <svg aria-hidden width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}

function PlusMark() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}
