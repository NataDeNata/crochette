import { z } from "zod";

/**
 * Rejects an embedded CR or LF. `.trim()` only strips the ends of a string —
 * a value like `"John\nBcc: attacker@evil.com"` passes it unchanged, and
 * every value validated here eventually reaches an outgoing email's subject
 * line or a `${name}` interpolated into one (lib/email/notifications.ts).
 * Resend's API may or may not strip a raw line break from a header field
 * itself; this rejects it before the application ever hands it over.
 */
export function singleLine<T extends z.ZodString>(schema: T) {
  return schema.refine((value) => !/[\r\n]/.test(value), "Please remove any line breaks.");
}
