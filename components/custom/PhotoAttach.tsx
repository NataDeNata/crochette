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
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={ALLOWED_PHOTO_TYPES.join(",")}
        multiple
        onChange={handleChange}
        style={{ display: "none" }}
      />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {attached.map((a, i) => (
          <div key={a.previewUrl} style={{ position: "relative", width: 56, height: 56 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, next/image can't optimize it */}
            <img
              src={a.previewUrl}
              alt=""
              style={{
                width: 56,
                height: 56,
                borderRadius: 10,
                objectFit: "cover",
                border: "1.5px solid oklch(0.75 0.03 20)",
                display: "block",
              }}
            />
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label="Remove photo"
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: "none",
                background: "oklch(0.28 0.02 60)",
                color: "oklch(0.98 0.01 85)",
                fontSize: 12,
                lineHeight: 1,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
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
            style={{
              width: 56,
              height: 56,
              borderRadius: 10,
              border: "1.5px dashed oklch(0.75 0.03 20)",
              background: "oklch(0.98 0.01 85)",
              cursor: "pointer",
              fontSize: 20,
              color: "oklch(0.5 0.05 20)",
              fontFamily: "inherit",
            }}
          >
            +
          </button>
        )}
      </div>
      <div style={{ fontSize: 12, color: "oklch(0.45 0.02 60)" }}>
        Optional — up to {MAX_PHOTOS} reference photos, JPG/PNG/WebP, 5MB each.
      </div>
      {error && <span style={{ fontSize: 12.5, color: "oklch(0.5 0.18 25)" }}>{error}</span>}
    </div>
  );
}
