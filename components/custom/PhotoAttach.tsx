"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { MAX_PHOTOS, MAX_PHOTO_BYTES, ALLOWED_PHOTO_TYPES } from "@/lib/validation/photos";

type Attached = { file: File; previewUrl: string };

/** Attaches reference photos to the custom-order form. Files stay in the
 * native file input's FileList (rebuilt via DataTransfer on add/remove) so
 * they submit as part of the same FormData the Server Action already reads
 * — the actual upload to Vercel Blob happens server-side on submit. This
 * component only produces local object-URL previews for the live summary
 * panel. */
export function PhotoAttach({
  name,
  onValueChange,
}: {
  name: string;
  onValueChange?: (previewUrls: string[]) => void;
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
      if (next.length >= MAX_PHOTOS) {
        rejected = true;
        break;
      }
      if (!ALLOWED_PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES) {
        rejected = true;
        continue;
      }
      next.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    setAttached(next);
    syncInputFiles(next);
    onValueChange?.(next.map((a) => a.previewUrl));
    setError(rejected ? `Photos must be JPG, PNG, or WebP, up to 5MB — ${MAX_PHOTOS} max.` : undefined);
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
        accept={ALLOWED_PHOTO_TYPES.join(",")}
        multiple
        onChange={handleChange}
        className="hidden"
      />
      <div className="flex gap-2.5 flex-wrap items-center">
        {attached.map((a, i) => (
          <div key={a.previewUrl} className="relative w-14 h-14">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, next/image can't optimize it */}
            <img
              src={a.previewUrl}
              alt=""
              className="w-14 h-14 rounded-[10px] object-cover border-[1.5px] border-[oklch(0.75_0.03_20)] block"
            />
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label="Remove photo"
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full border-0 bg-primary text-card text-xs leading-none cursor-pointer flex items-center justify-center p-0"
            >
              ×
            </button>
          </div>
        ))}
        {attached.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Attach photos"
            className="w-14 h-14 rounded-[10px] border-[1.5px] border-dashed border-[oklch(0.75_0.03_20)] bg-card cursor-pointer text-xl text-[oklch(0.5_0.05_20)] [font-family:inherit]"
          >
            +
          </button>
        )}
      </div>
      <div className="text-xs text-[oklch(0.45_0.02_60)]">
        Optional — up to {MAX_PHOTOS} reference photos, JPG/PNG/WebP, 5MB each.
      </div>
      {error && <span className="text-[12.5px] text-[oklch(0.5_0.18_25)]">{error}</span>}
    </div>
  );
}
