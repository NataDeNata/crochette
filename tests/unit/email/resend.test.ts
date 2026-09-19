import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `EMAIL_FROM` is resolved once at module-import time (like `SITE_URL` in
 * lib/site.ts), so each case sets the environment and then imports the module
 * fresh via `resetModules`. The Resend client is lazy, so importing the module
 * touches no network and needs no API key.
 */

const SANDBOX = "Yarns and Buttons <onboarding@resend.dev>";

afterEach(() => {
  delete process.env.EMAIL_FROM;
  vi.resetModules();
});

describe("EMAIL_FROM", () => {
  it("falls back to the Resend sandbox sender when unset", async () => {
    delete process.env.EMAIL_FROM;
    vi.resetModules();
    const { EMAIL_FROM } = await import("@/lib/email/resend");
    expect(EMAIL_FROM).toBe(SANDBOX);
  });

  it("uses the configured verified-domain sender when set", async () => {
    process.env.EMAIL_FROM = "Yarns and Buttons <hello@yarnsandbuttons.com>";
    vi.resetModules();
    const { EMAIL_FROM } = await import("@/lib/email/resend");
    expect(EMAIL_FROM).toBe("Yarns and Buttons <hello@yarnsandbuttons.com>");
  });

  it("trims surrounding whitespace and ignores a blank value", async () => {
    process.env.EMAIL_FROM = "   ";
    vi.resetModules();
    const { EMAIL_FROM } = await import("@/lib/email/resend");
    expect(EMAIL_FROM).toBe(SANDBOX);
  });
});
